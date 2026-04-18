const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const { nanoid } = require('nanoid');
const { z } = require('zod');

const { getDb, updateDb } = require('./db');
const { evaluateEligibility } = require('./eligibility/engine');
const { buildQuestionList, ProfileSchema } = require('./eligibility/questionFlow');
const { computeTrust, ALLOWLIST_DOMAINS } = require('./trust');
const { generateNotification } = require('./notifications');
const { fetchDataGovInSchemes } = require('./integrations');

const PORT = Number(process.env.PORT || 8080);

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false, // keep simple for this prototype
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: 'readyright.sid',
  secret: process.env.SESSION_SECRET || 'readyright-dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 14,
  },
}));

// Minimal request id
app.use((req, res, next) => {
  req.id = nanoid(10);
  res.setHeader('x-request-id', req.id);
  next();
});

function getUserKey(req) {
  if (!req.session.userKey) req.session.userKey = nanoid(12);
  return req.session.userKey;
}

function pickLanguage(req) {
  const lang = String(req.query.lang || req.headers['x-lang'] || 'en');
  return lang;
}

function normalizeSchemeForList(scheme) {
  const trust = computeTrust({
    officialLink: scheme.source?.officialLink,
    suspicious: scheme.source?.suspicious,
    suspiciousReason: scheme.source?.suspiciousReason,
    verified: scheme.source?.verified,
    domains: scheme.source?.domains,
  });

  return {
    id: scheme.id,
    title: scheme.title,
    title_i18n: scheme.title_i18n,
    summary: scheme.summary,
    summary_i18n: scheme.summary_i18n,
    category: scheme.category,
    status: scheme.status,
    tags: scheme.tags,
    benefits: scheme.benefits,
    benefits_i18n: scheme.benefits_i18n,
    eligibilitySummary: scheme.eligibilitySummary,
    eligibilitySummary_i18n: scheme.eligibilitySummary_i18n,
    media: scheme.media,
    stats: scheme.stats,
    trust,
    rating: null,
  };
}

function computeSchemeRating(db, schemeId) {
  const reviews = (db.reviews || []).filter((r) => r.schemeId === schemeId);
  if (reviews.length === 0) return { avg: null, count: 0 };
  const sum = reviews.reduce((a, r) => a + (r.rating || 0), 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

// ---- Static assets (UI) ----
const PUBLIC_ROOT = path.join(__dirname, '..');
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_ROOT, 'index.html')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(PUBLIC_ROOT, 'styles.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(PUBLIC_ROOT, 'script.js')));
app.get('/assets/:file', (req, res) => res.sendFile(path.join(PUBLIC_ROOT, 'assets', req.params.file)));

// ---- API ----
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- Auth (OTP demo) ----
// NOTE: This is a demo-friendly OTP flow. In production you'd use SMS + rate limiting.
app.get('/api/auth/me', (req, res) => {
  res.json({ ok: true, user: req.session.user || null });
});

app.post('/api/auth/request-otp', (req, res) => {
  const Body = z.object({
    name: z.string().min(2).max(80),
    phone: z.string().min(6).max(20),
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid request', details: parsed.error.flatten() });
  }

  const name = String(parsed.data.name).trim();
  const phone = String(parsed.data.phone).replace(/\s+/g, '').trim();

  // 6-digit OTP for demo
  const devOtp = String(Math.floor(100000 + Math.random() * 900000));
  req.session.pendingAuth = {
    name,
    phone,
    otp: devOtp,
    expiresAt: Date.now() + 1000 * 60 * 10,
  };

  res.json({ ok: true, sent: true, devOtp });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const Body = z.object({
    otp: z.string().min(4).max(10),
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid request', details: parsed.error.flatten() });
  }

  const pending = req.session.pendingAuth || null;
  if (!pending) return res.status(400).json({ ok: false, error: 'No pending OTP request' });
  if (Date.now() > Number(pending.expiresAt || 0)) return res.status(400).json({ ok: false, error: 'OTP expired. Request a new one.' });

  const otp = String(parsed.data.otp).trim();
  if (otp !== String(pending.otp)) return res.status(400).json({ ok: false, error: 'Invalid OTP' });

  // Establish signed-in user in session
  req.session.user = { name: pending.name, phone: pending.phone };
  req.session.pendingAuth = null;

  // Ensure the userKey exists for per-user profile/saved data
  getUserKey(req);

  res.json({ ok: true, user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.user = null;
  req.session.profile = null;
  req.session.pendingAuth = null;
  res.json({ ok: true });
});

app.get('/api/config', (req, res) => {
  res.json({
    ok: true,
    languages: [
      { code: 'en', label: 'English' },
      { code: 'hi', label: 'हिंदी' },
      { code: 'bn', label: 'বাংলা' },
      { code: 'bho', label: 'Bhojpuri' },
      { code: 'ta', label: 'தமிழ்' },
    ],
    categories: ['Welfare', 'Scholarship', 'Agriculture', 'Healthcare', 'Housing', 'Banking'],
    allowlistedDomains: ALLOWLIST_DOMAINS,
  });
});

app.get('/api/profile', async (req, res) => {
  const userKey = getUserKey(req);
  const db = await getDb();
  const persisted = db.profiles?.[userKey] || null;
  const sessionProfile = req.session.profile || null;
  res.json({ ok: true, profile: persisted || sessionProfile || {} });
});

app.put('/api/profile', async (req, res) => {
  const userKey = getUserKey(req);
  const parsed = ProfileSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid profile', details: parsed.error.flatten() });
  }

  const incoming = parsed.data;
  // Store consent in session always
  if (typeof incoming.consentToSave === 'boolean') {
    req.session.consentToSave = incoming.consentToSave;
  }

  // Always keep session copy
  req.session.profile = { ...(req.session.profile || {}), ...incoming };

  if (req.session.consentToSave) {
    await updateDb((db) => {
      if (!db.profiles) db.profiles = {};
      db.profiles[userKey] = { ...(db.profiles[userKey] || {}), ...incoming, consentToSave: true };
      db.meta.updatedAt = new Date().toISOString();
    });
  }

  res.json({ ok: true, profile: req.session.profile, saved: !!req.session.consentToSave });
});

app.get('/api/schemes', async (req, res) => {
  const db = await getDb();
  const query = String(req.query.query || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim();
  const status = String(req.query.status || '').trim();

  let items = db.schemes || [];

  if (category) items = items.filter((s) => String(s.category).toLowerCase() === category.toLowerCase());
  if (status) items = items.filter((s) => String(s.status).toLowerCase() === status.toLowerCase());

  if (query) {
    items = items.filter((s) => {
      const blob = `${s.title} ${s.summary} ${s.category} ${(s.tags || []).join(' ')}`.toLowerCase();
      return blob.includes(query);
    });
  }

  // Sort: recent activity then createdAt
  items = items.slice().sort((a, b) => {
    const av = (a.stats?.views || 0) + (a.stats?.starts || 0) * 2 + (a.stats?.completes || 0) * 3;
    const bv = (b.stats?.views || 0) + (b.stats?.starts || 0) * 2 + (b.stats?.completes || 0) * 3;
    if (bv !== av) return bv - av;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  const list = items.map((s) => {
    const item = normalizeSchemeForList(s);
    const rating = computeSchemeRating(db, s.id);
    return { ...item, rating };
  });

  res.json({ ok: true, schemes: list });
});

app.get('/api/schemes/trending', async (req, res) => {
  const db = await getDb();
  const items = (db.schemes || []).slice().sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0));
  const top = items.slice(0, 6).map((s) => {
    const item = normalizeSchemeForList(s);
    const rating = computeSchemeRating(db, s.id);
    return { ...item, rating };
  });
  res.json({ ok: true, schemes: top });
});

app.get('/api/schemes/recommended', async (req, res) => {
  const db = await getDb();
  const userKey = getUserKey(req);
  const profile = db.profiles?.[userKey] || req.session.profile || {};

  // Simple scoring based on category hints and rules.
  const scored = (db.schemes || []).map((s) => {
    let score = 0;
    if (profile.occupation === 'farmer' && s.category === 'Agriculture') score += 3;
    if (profile.ruralUrban === 'rural' && ['Agriculture', 'Welfare', 'Housing'].includes(s.category)) score += 2;
    if (profile.isBPL && s.category === 'Healthcare') score += 2;
    if (profile.occupation === 'student' && s.category === 'Scholarship') score += 3;
    score += (s.stats?.views || 0) * 0.01;
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const list = scored.slice(0, 6).map(({ s }) => {
    const item = normalizeSchemeForList(s);
    const rating = computeSchemeRating(db, s.id);
    return { ...item, rating };
  });

  res.json({ ok: true, schemes: list });
});

app.get('/api/schemes/:id', async (req, res) => {
  const db = await getDb();
  const scheme = (db.schemes || []).find((s) => s.id === req.params.id);
  if (!scheme) return res.status(404).json({ ok: false, error: 'Not found' });

  // Increment views (async fire and forget)
  updateDb((d) => {
    const s = (d.schemes || []).find((x) => x.id === req.params.id);
    if (s) {
      s.stats.views = (s.stats.views || 0) + 1;
      s.stats.lastViewedAt = new Date().toISOString();
      s.updatedAt = new Date().toISOString();
    }
  }).catch(() => {});

  const rating = computeSchemeRating(db, scheme.id);
  const trust = computeTrust({
    officialLink: scheme.source?.officialLink,
    suspicious: scheme.source?.suspicious,
    suspiciousReason: scheme.source?.suspiciousReason,
    verified: scheme.source?.verified,
    domains: scheme.source?.domains,
  });

  res.json({
    ok: true,
    scheme: {
      ...scheme,
      trust,
      rating,
    },
  });
});

app.get('/api/schemes/:id/reviews', async (req, res) => {
  const db = await getDb();
  const schemeId = req.params.id;
  const reviews = (db.reviews || []).filter((r) => r.schemeId === schemeId).slice(-50).reverse();
  res.json({ ok: true, reviews, rating: computeSchemeRating(db, schemeId) });
});

app.post('/api/schemes/:id/reviews', async (req, res) => {
  const schemeId = req.params.id;
  const Body = z.object({
    rating: z.number().min(1).max(5),
    text: z.string().min(2).max(800),
    helpful: z.boolean().optional(),
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid review', details: parsed.error.flatten() });
  }

  const userKey = getUserKey(req);
  const review = {
    id: nanoid(10),
    schemeId,
    userKey,
    rating: parsed.data.rating,
    text: parsed.data.text,
    createdAt: new Date().toISOString(),
  };

  await updateDb((db) => {
    if (!db.reviews) db.reviews = [];
    db.reviews.push(review);
    db.meta.updatedAt = new Date().toISOString();
  });

  const db = await getDb();
  res.json({ ok: true, review, rating: computeSchemeRating(db, schemeId) });
});

app.post('/api/schemes/:id/report', async (req, res) => {
  const schemeId = req.params.id;
  const Body = z.object({
    reason: z.string().min(2).max(500),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid report' });

  const userKey = getUserKey(req);
  const report = {
    id: nanoid(10),
    schemeId,
    userKey,
    reason: parsed.data.reason,
    createdAt: new Date().toISOString(),
  };

  await updateDb((db) => {
    if (!db.reports) db.reports = [];
    db.reports.push(report);

    const scheme = (db.schemes || []).find((s) => s.id === schemeId);
    if (scheme) {
      scheme.source.suspicious = true;
      scheme.source.suspiciousReason = 'Flagged by community reports';
      scheme.updatedAt = new Date().toISOString();
    }

    db.meta.updatedAt = new Date().toISOString();
  });

  res.json({ ok: true, report });
});

// Eligibility sessions
app.post('/api/eligibility/sessions', async (req, res) => {
  const Body = z.object({
    schemeId: z.string().min(1),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request' });

  const db = await getDb();
  const scheme = (db.schemes || []).find((s) => s.id === parsed.data.schemeId);
  if (!scheme) return res.status(404).json({ ok: false, error: 'Scheme not found' });

  const sessionId = nanoid(12);
  const userKey = getUserKey(req);
  const profile = db.profiles?.[userKey] || req.session.profile || {};
  const questions = buildQuestionList({ scheme });

  await updateDb((d) => {
    if (!d.eligibilitySessions) d.eligibilitySessions = {};
    d.eligibilitySessions[sessionId] = {
      id: sessionId,
      schemeId: scheme.id,
      userKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      index: 0,
      answers: {},
      questions,
      result: null,
    };

    const s = (d.schemes || []).find((x) => x.id === scheme.id);
    if (s) {
      s.stats.starts = (s.stats.starts || 0) + 1;
      s.updatedAt = new Date().toISOString();
    }

    d.meta.updatedAt = new Date().toISOString();
  });

  const first = questions[0] || null;
  res.json({ ok: true, sessionId, scheme: normalizeSchemeForList(scheme), question: first, profile });
});

app.post('/api/eligibility/sessions/:id/answer', async (req, res) => {
  const sessionId = req.params.id;
  const Body = z.object({
    answer: z.any(),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid answer' });

  const userKey = getUserKey(req);

  const db = await getDb();
  const sessionObj = db.eligibilitySessions?.[sessionId];
  if (!sessionObj) return res.status(404).json({ ok: false, error: 'Session not found' });
  if (sessionObj.userKey !== userKey) return res.status(403).json({ ok: false, error: 'Forbidden' });

  const scheme = (db.schemes || []).find((s) => s.id === sessionObj.schemeId);
  if (!scheme) return res.status(404).json({ ok: false, error: 'Scheme not found' });

  const currentQuestion = sessionObj.questions?.[sessionObj.index];
  if (!currentQuestion) return res.status(400).json({ ok: false, error: 'No active question' });

  // Normalize answer types
  let normalized = parsed.data.answer;
  if (currentQuestion.type === 'single' && currentQuestion.options) {
    // allow passing raw value
  }
  if (currentQuestion.type === 'text') {
    normalized = String(normalized || '').trim();
  }

  const updated = await updateDb((d) => {
    const s = d.eligibilitySessions?.[sessionId];
    if (!s) return;
    s.answers[currentQuestion.id] = normalized;
    s.index += 1;
    s.updatedAt = new Date().toISOString();

    // Keep last answers in session profile (for recommendations later)
    req.session.profile = { ...(req.session.profile || {}), [currentQuestion.id]: normalized };
  });

  const db2 = await getDb();
  const sessionNow = db2.eligibilitySessions?.[sessionId];

  const nextQuestion = sessionNow.questions?.[sessionNow.index] || null;

  if (nextQuestion) {
    return res.json({ ok: true, sessionId, question: nextQuestion, progress: { index: sessionNow.index, total: sessionNow.questions.length } });
  }

  // Evaluate
  const profile = { ...(db2.profiles?.[userKey] || {}), ...(req.session.profile || {}), ...(sessionNow.answers || {}) };
  const result = evaluateEligibility({ scheme, profile });

  await updateDb((d) => {
    const s = d.eligibilitySessions?.[sessionId];
    if (!s) return;
    s.result = result;
    s.updatedAt = new Date().toISOString();

    const schemeRow = (d.schemes || []).find((x) => x.id === scheme.id);
    if (schemeRow) {
      schemeRow.stats.completes = (schemeRow.stats.completes || 0) + 1;
      schemeRow.updatedAt = new Date().toISOString();
    }

    d.meta.updatedAt = new Date().toISOString();
  });

  res.json({
    ok: true,
    sessionId,
    done: true,
    result,
    checklist: {
      documents: scheme.documents || [],
      officialLink: scheme.source?.officialLink || null,
      steps: [
        'Confirm your details on the official portal',
        'Keep documents ready (photos/scans)',
        'Submit online / at CSC (Common Service Centre)',
        'Track application status regularly',
      ],
    },
  });
});

// Notifications
app.get('/api/notifications', async (req, res) => {
  const db = await getDb();
  const userKey = getUserKey(req);
  const profile = db.profiles?.[userKey] || req.session.profile || {};
  const schemes = (db.schemes || []).slice(0, 10);

  // Create a fresh notification each call (simulated real-time)
  const n = generateNotification({ profile, schemes });
  await updateDb((d) => {
    if (!d.notifications) d.notifications = [];
    d.notifications.push({ ...n, userKey });
    d.meta.updatedAt = new Date().toISOString();
  });

  const db2 = await getDb();
  const items = (db2.notifications || []).filter((x) => x.userKey === userKey).slice(-20).reverse();
  res.json({ ok: true, notifications: items });
});

// SSE stream for updates
app.get('/api/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userKey = getUserKey(req);

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('hello', { ok: true, userKey, time: new Date().toISOString() });

  const interval = setInterval(async () => {
    const db = await getDb();
    const profile = db.profiles?.[userKey] || req.session.profile || {};
    const schemes = (db.schemes || []).slice(0, 10);
    const n = generateNotification({ profile, schemes });
    send('notification', n);
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Optional integration status
app.get('/api/integrations/data-gov', async (req, res) => {
  const apiKey = process.env.DATA_GOV_IN_API_KEY || '';
  const result = await fetchDataGovInSchemes({ apiKey });
  res.json({ ok: true, integration: result });
});

// Error handler
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Request failed', req.id, err);
  res.status(500).json({ ok: false, error: 'Internal error', requestId: req.id });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ReadyRight server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(`Port ${PORT} is already in use. Stop the other process, or set PORT to a different value.`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.error('Server failed to start:', err);
  process.exit(1);
});
