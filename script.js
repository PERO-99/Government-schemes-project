/* ReadyRight SPA client
   - Tailwind UI + strict user flow
   - Landing → OTP Login → Dashboard → Profile completion → Eligibility → Result
   - No voice assistant, no dummy buttons
*/

(() => {
  /** @type {{ user: null | { name: string, phone: string }, profile: any, schemes: any[], trending: any[], recommended: any[], filters: { query: string, category: string }, eligibility: { sessionId: string | null, scheme: any | null, question: any | null, progress: { index: number, total: number } }, profileWizard: { step: number, draft: any } }} */
  const state = {
    user: null,
    profile: {},

    lang: 'en',
    config: null,

    schemes: [],
    trending: [],
    recommended: [],

    carousel: {
      index: 0,
      timer: null,
      slides: [],
    },

    filters: {
      query: '',
      category: 'All',
      status: '',
      rating: 0,
    },

    savedSchemes: new Set(),

    eligibility: {
      sessionId: null,
      scheme: null,
      question: null,
      progress: { index: 0, total: 0 },
    },

    profileWizard: {
      step: 0,
      draft: {},
    },
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeText(v) {
    return String(v ?? '').trim();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function api(path, { method = 'GET', body } = {}) {
    const opts = { method, headers: {} };
    opts.headers['x-lang'] = state.lang;
    if (body !== undefined) {
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(path, opts);
    const ct = res.headers.get('content-type') || '';
    const payload = ct.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const msg = typeof payload === 'object' && payload && payload.error ? payload.error : `Request failed: ${res.status}`;
      const err = new Error(msg);
      // @ts-ignore
      err.details = payload;
      throw err;
    }

    if (typeof payload === 'object' && payload && payload.ok === false) {
      throw new Error(payload.error || 'Request failed');
    }

    return payload;
  }

  function toast({ title, message, severity = 'info', timeoutMs = 4500 }) {
    const region = $('toastRegion');
    if (!region) return;

    const el = document.createElement('div');
    el.className = `rr-toast ${severity}`;

    el.innerHTML = `
      <div class="rr-toast-title">${escapeHtml(title || 'ReadyRight')}</div>
      <div class="rr-toast-msg">${escapeHtml(message || '')}</div>
    `;

    region.appendChild(el);

    window.setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'opacity 160ms ease, transform 160ms ease';
      window.setTimeout(() => el.remove(), 200);
    }, timeoutMs);
  }

  function initLanguageFromStorage() {
    try {
      const stored = safeText(window.localStorage.getItem('rr.lang'));
      if (stored) state.lang = stored;
    } catch {
      // ignore
    }
  }

  function loadSavedSchemesFromStorage() {
    try {
      const raw = window.localStorage.getItem('rr.savedSchemes');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      state.savedSchemes = new Set(parsed.map((x) => safeText(x)).filter(Boolean));
    } catch {
      // ignore
    }
  }

  function persistSavedSchemes() {
    try {
      window.localStorage.setItem('rr.savedSchemes', JSON.stringify(Array.from(state.savedSchemes)));
    } catch {
      // ignore
    }
  }

  function isSaved(schemeId) {
    return state.savedSchemes.has(safeText(schemeId));
  }

  function toggleSaved(schemeId) {
    const id = safeText(schemeId);
    if (!id) return false;
    const next = !isSaved(id);
    if (next) state.savedSchemes.add(id);
    else state.savedSchemes.delete(id);
    persistSavedSchemes();
    return next;
  }

  function setLanguage(code) {
    const next = safeText(code) || 'en';
    state.lang = next;
    try {
      window.localStorage.setItem('rr.lang', next);
    } catch {
      // ignore
    }
  }

  function renderLanguageSelector() {
    const sel = $('navLanguage');
    if (!sel) return;

    const langs = (state.config?.languages || []).filter((l) => l && l.code);
    sel.innerHTML = '';

    for (const l of langs) {
      const opt = document.createElement('option');
      opt.value = safeText(l.code);
      opt.textContent = safeText(l.label) || safeText(l.code);
      sel.appendChild(opt);
    }

    sel.value = state.lang;

    sel.onchange = async () => {
      try {
        setLanguage(sel.value);
        await refreshDashboard();

        // If user is currently browsing schemes, refresh the list too
        if (!$('screenSchemes')?.classList.contains('hidden')) {
          await loadSchemes();
        }

        toast({ title: 'Language', message: 'Language updated.', severity: 'success', timeoutMs: 2200 });
      } catch (e) {
        toast({ title: 'Language', message: e.message || 'Could not update language', severity: 'error' });
      }
    };
  }

  async function loadConfig() {
    const resp = await api('/api/config');
    state.config = resp;
    renderLanguageSelector();
  }

  function showOnly(idsToShow) {
    const all = ['screenLanding', 'screenAuth', 'appShell'];
    for (const id of all) {
      const el = $(id);
      if (!el) continue;
      el.classList.toggle('hidden', !idsToShow.includes(id));
    }
  }

  function showShell() {
    showOnly(['appShell']);
  }

  function showAuth() {
    showOnly(['screenAuth']);
  }

  function showLanding() {
    showOnly(['screenLanding']);
  }

  function setMainScreen(screenId) {
    const screens = ['screenDashboard', 'screenSchemes', 'screenEligibilityHub', 'screenProfile', 'screenHelp', 'screenEligibility', 'screenResult', 'screenDetail'];
    for (const id of screens) {
      const el = $(id);
      if (!el) continue;
      el.classList.toggle('hidden', id !== screenId);
    }

    // Sidebar active state
    const navButtons = $$('[data-nav]');
    for (const b of navButtons) {
      const target = b.getAttribute('data-nav');
      const isActive = (screenId === 'screenDashboard' && target === 'dashboard')
        || (screenId === 'screenSchemes' && target === 'schemes')
        || (screenId === 'screenEligibilityHub' && target === 'eligibility')
        || (screenId === 'screenProfile' && target === 'profile')
        || (screenId === 'screenHelp' && target === 'help');
      b.classList.toggle('rr-nav-active', isActive);
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function normalizePhone(phoneRaw) {
    const digits = safeText(phoneRaw).replace(/\D+/g, '');
    if (digits.length === 10) return digits;
    if (digits.length > 10) return digits.slice(-10);
    return digits;
  }

  function formatIncome(income) {
    const n = Number(income);
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n >= 9999999) return 'Above ₹6,00,000';
    if (n <= 100000) return 'Up to ₹1,00,000';
    if (n <= 250000) return '₹1,00,001 - ₹2,50,000';
    if (n <= 600000) return '₹2,50,001 - ₹6,00,000';
    return `₹${n.toLocaleString('en-IN')}`;
  }

  function formatCategory(cat) {
    const v = safeText(cat).toLowerCase();
    if (!v) return '—';
    if (v === 'sc') return 'SC';
    if (v === 'st') return 'ST';
    if (v === 'obc') return 'OBC';
    if (v === 'general') return 'General';
    return cat;
  }

  function computeProfileCompletion(profile) {
    const keys = ['annualIncomeINR', 'category', 'state'];
    let have = 0;
    for (const k of keys) {
      if (profile && profile[k] !== undefined && profile[k] !== null && String(profile[k]).trim() !== '') have += 1;
    }
    return Math.round((have / keys.length) * 100);
  }

  function schemeImageUrl(scheme) {
    const url = scheme?.media?.imageUrl || '';
    return safeText(url) || null;
  }

  function schemeOfficialLink(scheme) {
    // Official link is intentionally shown on the Result screen (from checklist.officialLink).
    return null;
  }

  function badgeForTrust(trust) {
    const badge = safeText(trust?.badge).toLowerCase();
    if (badge === 'suspicious') return { label: 'Suspicious', className: 'bg-red-50 text-red-700' };
    if (badge === 'verified') return { label: 'Verified', className: 'bg-primary/10 text-primary' };
    if (badge === 'official') return { label: 'Official link', className: 'bg-primary/10 text-primary' };
    return { label: 'Unverified', className: 'bg-slate-100 text-slate-700' };
  }

  function statusBadge(status) {
    const s = safeText(status).toLowerCase();
    if (s === 'open' || s === 'active' || s === 'ongoing') return { label: 'Active', className: 'bg-indiaGreen/10 text-indiaGreen' };
    if (s === 'closed') return { label: 'Closed', className: 'bg-slate-100 text-slate-700' };
    return { label: safeText(status) || '—', className: 'bg-slate-100 text-slate-700' };
  }

  function ratingLabel(rating) {
    const avg = Number(rating?.avg);
    const count = Number(rating?.count);
    if (Number.isFinite(avg) && avg > 0) {
      const c = Number.isFinite(count) && count > 0 ? ` (${count})` : '';
      return `⭐ ${avg.toFixed(1)}${c}`;
    }
    return '⭐ New';
  }

  function starIcons(avg) {
    const n = Number(avg);
    const rating = Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
    const filled = Math.round(rating);
    const star = (isFilled) => `
      <svg viewBox="0 0 24 24" class="rr-star ${isFilled ? 'rr-star-filled' : 'rr-star-empty'}" fill="currentColor" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"></path>
      </svg>
    `;
    return `
      <div class="inline-flex items-center gap-0.5">
        ${[0, 1, 2, 3, 4].map((i) => star(i < filled)).join('')}
      </div>
    `;
  }

  function isSchemeStatusMatch(scheme, statusFilter) {
    const want = safeText(statusFilter).toLowerCase();
    if (!want) return true;

    const s = safeText(scheme?.status).toLowerCase();
    if (want === 'active') return ['active', 'open', 'ongoing', 'live'].includes(s);
    if (want === 'closed') return ['closed', 'expired', 'ended'].includes(s);
    return true;
  }

  function renderSchemeCard({ scheme, compact = false } = {}) {
    const img = schemeImageUrl(scheme);
    const trustB = badgeForTrust(scheme?.trust);
    const st = statusBadge(scheme?.status);
    const rating = ratingLabel(scheme?.rating);
    const avg = Number(scheme?.rating?.avg);
    const saved = isSaved(scheme?.id);

    const el = document.createElement('div');
    el.className = 'rr-glass-card overflow-hidden flex flex-col group min-w-[300px] snap-center shrink-0';

    el.innerHTML = `
      <div class="h-48 bg-slate-100 relative overflow-hidden">
        <img src="${img ? escapeHtml(img) : 'https://images.unsplash.com/photo-1541888081695-1f7c70ae33f0?w=800'}" onerror="this.src='https://via.placeholder.com/400x200'" alt="" class="h-full w-full object-cover transition duration-700 group-hover:scale-110" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-[#0f172a]/20 to-transparent pointer-events-none"></div>

        <div class="absolute top-3 left-3 flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white bg-blue-600/80 backdrop-blur-sm shadow-sm">${escapeHtml(safeText(scheme?.category) || 'General')}</span>
        </div>

        <button class="absolute top-3 right-3 bg-white/80 hover:bg-white backdrop-blur rounded-full p-2 text-slate-700 transition shadow hover:scale-110 rr-icon-btn" type="button" aria-label="Save" title="Save" data-action="save" data-scheme-id="${escapeHtml(scheme?.id)}">
          <svg viewBox="0 0 24 24" class="h-5 w-5 ${saved ? 'text-red-500' : 'text-slate-500'}" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
          </svg>
        </button>
        
        <div class="absolute bottom-3 right-3">
          <span class="inline-flex items-center gap-1 bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-md shadow-sm">
            <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            ${avg ? avg.toFixed(1) : '4.5'}
          </span>
        </div>
      </div>

      <div class="p-5 flex flex-col flex-1">
        <div class="text-lg font-bold tracking-tight text-slate-900 mb-2 line-clamp-1">${escapeHtml(safeText(scheme?.title) || 'Scheme')}</div>
        ${compact ? '' : `<div class="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">${escapeHtml(safeText(scheme?.summary) || '')}</div>`}

        <div class="mt-auto pt-4">
          <button class="w-full rr-btn-premium" data-action="elig" data-scheme-id="${escapeHtml(scheme?.id)}">Check Eligibility</button>
        </div>
      </div>
    `;

    el.querySelector('[data-action="elig"]')?.addEventListener('click', () => {
      showDetailView(scheme);
    });

    el.querySelector('[data-action="save"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = toggleSaved(scheme.id);
      const icon = el.querySelector('[data-action="save"] svg');
      if (icon) {
        icon.classList.toggle('text-primary', next);
        icon.classList.toggle('text-slate-700', !next);
        icon.setAttribute('fill', next ? 'currentColor' : 'none');
      }

      toast({
        title: next ? 'Saved' : 'Removed',
        message: next ? 'Added to saved schemes.' : 'Removed from saved schemes.',
        severity: next ? 'success' : 'info',
        timeoutMs: 2400,
      });
    });

    return el;
  }

  function renderDashboard() {
    $('dashName').textContent = safeText(state.user?.name) || '—';

    const trendingHost = $('trendingGrid');
    trendingHost.className = "flex overflow-x-auto pb-4 pt-2 gap-5 snap-x overflow-y-hidden";
    trendingHost.innerHTML = '';
    for (const s of (state.trending || [])) {
      trendingHost.appendChild(renderSchemeCard({ scheme: s, compact: false }));
    }

    const recHost = $('recommendedGrid');
    recHost.className = "flex overflow-x-auto pb-4 pt-2 gap-5 snap-x overflow-y-hidden";
    recHost.innerHTML = '';
    for (const s of (state.recommended || [])) {
      recHost.appendChild(renderSchemeCard({ scheme: s, compact: false }));
    }

    // Add hidden scrollbar styling to page securely
    const style = document.createElement('style');
    style.innerHTML = `
      #trendingGrid::-webkit-scrollbar, #recommendedGrid::-webkit-scrollbar { display: none; }
      #trendingGrid, #recommendedGrid { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function renderEligibilityHub() {
    const host = $('eligibilityHubGrid');
    if (!host) return;
    host.innerHTML = '';

    const byId = new Map((state.schemes || []).map((s) => [s.id, s]));
    const picks = [];

    for (const slide of state.carousel.slides || []) {
      const s = byId.get(slide.schemeId);
      if (s && !picks.some((x) => x.id === s.id)) picks.push(s);
    }

    for (const s of (state.trending || [])) {
      if (picks.length >= 6) break;
      if (!picks.some((x) => x.id === s.id)) picks.push(s);
    }

    for (const s of picks.slice(0, 6)) {
      host.appendChild(renderSchemeCard({ scheme: s }));
    }
  }

  function stopCarousel() {
    if (state.carousel.timer) {
      window.clearInterval(state.carousel.timer);
      state.carousel.timer = null;
    }
  }

  function startCarouselAuto() {
    stopCarousel();
    if (!state.carousel.slides || state.carousel.slides.length < 2) return;
    state.carousel.timer = window.setInterval(() => {
      setCarouselIndex(state.carousel.index + 1);
    }, 3500);
  }

  function setCarouselIndex(nextIndex) {
    const slides = state.carousel.slides || [];
    if (slides.length === 0) return;

    const idx = ((nextIndex % slides.length) + slides.length) % slides.length;
    state.carousel.index = idx;

    const track = $('carouselTrack');
    if (track) track.style.transform = `translateX(-${idx * 100}%)`;

    const s = slides[idx];
    const titleEl = $('carouselTitle');
    const descEl = $('carouselDesc');
    if (titleEl) titleEl.textContent = s.title;
    if (descEl) descEl.textContent = s.description;

    const cta = $('carouselCta');
    if (cta) cta.onclick = () => startEligibility(s.schemeId);

    const dots = $$('[data-dot-idx]', $('carouselDots') || document);
    for (const d of dots) {
      const di = Number(d.getAttribute('data-dot-idx'));
      d.classList.toggle('rr-dot-active', di === idx);
    }
  }

  function buildCarouselSlides(allSchemes) {
    const schemes = allSchemes || [];
    const want = [
      { key: 'awwas', alt: 'awas', title: 'PM Awas' },
      { key: 'ayushman', alt: 'pm-jay', title: 'Ayushman' },
      { key: 'pm kisan', alt: 'kisan', title: 'PM Kisan' },
      { key: 'nrega', alt: 'mgnrega', title: 'MGNREGA' },
      { key: 'jan dhan', alt: 'jandhan', title: 'Jan Dhan' },
    ];

    const picked = [];
    const used = new Set();
    for (const w of want) {
      const hit = schemes.find((s) => {
        const t = safeText(s?.title).toLowerCase();
        return t.includes(w.key) || t.includes(w.alt) || t.includes(w.title.toLowerCase());
      });
      if (hit && !used.has(hit.id)) {
        used.add(hit.id);
        picked.push(hit);
      }
    }

    for (const s of (state.trending || [])) {
      if (picked.length >= 5) break;
      if (!used.has(s.id)) {
        used.add(s.id);
        picked.push(s);
      }
    }

    return picked.slice(0, 5).map((s) => ({
      schemeId: s.id,
      imageUrl: schemeImageUrl(s) || '',
      title: safeText(s.title) || 'Scheme',
      description: safeText(s.summary) || 'Check eligibility step-by-step with official guidance.',
    }));
  }

  function renderCarousel() {
    const track = $('carouselTrack');
    const dotsHost = $('carouselDots');
    if (!track || !dotsHost) return;

    track.innerHTML = '';
    dotsHost.innerHTML = '';

    for (let i = 0; i < state.carousel.slides.length; i += 1) {
      const s = state.carousel.slides[i];

      const slide = document.createElement('div');
      slide.className = 'rr-carousel-slide';
      slide.innerHTML = s.imageUrl
        ? `<img src="${escapeHtml(s.imageUrl)}" alt="" loading="lazy" />`
        : `<div class="h-full w-full rr-landing-gradient"></div>`;
      track.appendChild(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'rr-dot';
      dot.setAttribute('data-dot-idx', String(i));
      dot.addEventListener('click', () => {
        setCarouselIndex(i);
        startCarouselAuto();
      });
      dotsHost.appendChild(dot);
    }

    const hero = $('heroCarousel');
    if (hero) {
      hero.onmouseenter = stopCarousel;
      hero.onmouseleave = startCarouselAuto;
    }

    const prev = $('carouselPrev');
    const next = $('carouselNext');
    if (prev) prev.onclick = () => { setCarouselIndex(state.carousel.index - 1); startCarouselAuto(); };
    if (next) next.onclick = () => { setCarouselIndex(state.carousel.index + 1); startCarouselAuto(); };

    setCarouselIndex(0);
    startCarouselAuto();
  }

  function renderSchemesList() {
    const host = $('schemesList');
    if (!host) return;
    host.innerHTML = '';

    const all = state.schemes || [];
    const searchLow = (state.filters.query || '').toLowerCase();

    const filtered = all.filter((s) => {
      const matchSearch = searchLow === '' || s.title.toLowerCase().includes(searchLow) || (s.summary || '').toLowerCase().includes(searchLow);
      const matchCat = state.filters.category === 'All' || s.category === state.filters.category;

      const r = s.rating?.avg || 4.5;
      const matchRating = r >= Number(state.filters.rating || 0);

      const matchStatus = isSchemeStatusMatch(s, state.filters.status);
      return matchSearch && matchCat && matchRating && matchStatus;
    });

    for (const s of filtered) {
      host.appendChild(renderSchemeCard({ scheme: s }));
    }

    const meta = $('schemesMeta');
    if (meta) {
      meta.textContent = filtered.length === all.length
        ? `${filtered.length} schemes found`
        : `${filtered.length} of ${all.length} schemes`;
    }

    renderCategoryButtons();
  }

  function renderCategoryButtons() {
    const host = $('categoryButtonsHost');
    if (!host) return;
    const cats = ['All', 'Jobs', 'Students', 'Education', 'Farmers', 'Healthcare', 'Women', 'Business', 'Welfare', 'Finance'];
    host.innerHTML = '';

    for (const cat of cats) {
      const active = state.filters.category === cat;
      const btn = document.createElement('button');
      btn.textContent = cat;
      if (active) {
        btn.className = "rr-chip active";
      } else {
        btn.className = "rr-chip";
      }
      btn.onclick = () => {
        state.filters.category = cat;
        renderSchemesList();
      };
      host.appendChild(btn);
    }
  }

  function showDetailView(scheme) {
    if (!scheme) return;
    setMainScreen('screenDetail');
    $('detailTitle').textContent = scheme.title;

    // Wipe previous video container if exists to prevent duplicates
    let vContainer = $('detailVideoContainer');
    if (!vContainer) {
      vContainer = document.createElement('div');
      vContainer.id = 'detailVideoContainer';
      // Insert right beneath the description text
      $('detailDescription').parentNode.appendChild(vContainer);
    }
    vContainer.innerHTML = '';

    $('detailDescription').textContent = scheme.summary;
    $('detailEligibilityInfo').textContent = scheme.eligibilitySummary || 'Information not available.';

    if (scheme.media && scheme.media.videoUrl) {
      vContainer.innerHTML = `
          <div class="mt-6 aspect-video w-full rounded-2xl overflow-hidden shadow-premium border border-slate-200">
             <iframe class="w-full h-full" src="${escapeHtml(scheme.media.videoUrl)}" title="${escapeHtml(scheme.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
       `;
    }

    const imgUrl = schemeImageUrl(scheme) || 'https://images.unsplash.com/photo-1541888081695-1f7c70ae33f0?w=800';
    const detailImg = $('detailImage');
    if (detailImg) detailImg.src = imgUrl;

    const catBadge = $('detailBadgeCat');
    if (catBadge) catBadge.textContent = scheme.category || 'General';

    const r = scheme.rating?.avg || 4.5;
    const rBadge = $('detailBadgeRating');
    if (rBadge) rBadge.innerHTML = `<i data-lucide="star" class="h-3 w-3 fill-current"></i> ${r.toFixed(1)}`;

    const docsHost = $('detailDocsList');
    if (docsHost) {
      docsHost.innerHTML = '';
      const docs = scheme.documents && scheme.documents.length ? scheme.documents : [{ name: 'Aadhaar Card' }, { name: 'Bank Account Details' }, { name: 'Income Certificate' }];
      docs.forEach(d => {
        docsHost.innerHTML += `<li class="flex items-start gap-2 text-sm text-slate-600"><i data-lucide="check-circle" class="h-4 w-4 text-green-500 mt-0.5"></i> ${escapeHtml(d.name)}</li>`;
      });
    }

    const checkBtn = $('btnDetailCheckElig');
    if (checkBtn) {
      checkBtn.onclick = () => {
        startEligibility(scheme.id).catch((e) => {
          console.error(e);
          toast({ title: 'Eligibility', message: e.message || 'Could not start eligibility', severity: 'error' });
        });
      };
    }

    const saveBtn = $('btnDetailSave');
    if (saveBtn) {
      const isS = isSaved(scheme.id);
      saveBtn.innerHTML = isS
        ? `<i data-lucide="heart" class="h-5 w-5 fill-red-500 text-red-500"></i> Saved`
        : `<i data-lucide="heart" class="h-5 w-5"></i> Save for later`;

      saveBtn.onclick = () => {
        const next = toggleSaved(scheme.id);
        saveBtn.innerHTML = next
          ? `<i data-lucide="heart" class="h-5 w-5 fill-red-500 text-red-500"></i> Saved`
          : `<i data-lucide="heart" class="h-5 w-5"></i> Save for later`;
        toast({
          title: next ? 'Saved' : 'Removed',
          message: next ? 'Added to saved schemes.' : 'Removed from saved schemes.',
          severity: next ? 'success' : 'info'
        });
      };
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  function renderProfileSummary() {
    $('navUserName').textContent = safeText(state.user?.name) || 'Profile';

    $('profileIncome').textContent = formatIncome(state.profile?.annualIncomeINR);
    $('profileCategory').textContent = formatCategory(state.profile?.category);
    $('profileLocation').textContent = safeText(state.profile?.state) || '—';
  }

  function openProfileModal() {
    state.profileWizard.step = 0;
    state.profileWizard.draft = {
      annualIncomeINR: state.profile?.annualIncomeINR,
      category: state.profile?.category,
      state: state.profile?.state,
      ruralUrban: state.profile?.ruralUrban,
      consentToSave: state.profile?.consentToSave === true,
    };

    $('modalProfile').classList.remove('hidden');
    renderProfileWizardStep();
  }

  function closeProfileModal() {
    $('modalProfile').classList.add('hidden');
  }

  function renderProfileWizardStep() {
    const step = state.profileWizard.step;
    const host = $('profileStepHost');

    const fill = $('profileProgressFill');
    const text = $('profileProgressText');

    const pct = step === 0 ? 33 : step === 1 ? 66 : 100;
    fill.style.width = `${pct}%`;
    text.textContent = `Step ${step + 1} of 3`;

    $('btnProfilePrev').disabled = step === 0;
    $('btnProfilePrev').style.opacity = step === 0 ? '0.6' : '1';

    if (step === 0) {
      host.innerHTML = `
        <div class="text-sm font-semibold text-slate-700">Income</div>
        <div class="mt-2">
          <select id="wizIncome" class="rr-input">
            <option value="">Select income range</option>
            <option value="100000">Up to ₹1,00,000</option>
            <option value="250000">₹1,00,001 - ₹2,50,000</option>
            <option value="600000">₹2,50,001 - ₹6,00,000</option>
            <option value="9999999">Above ₹6,00,000</option>
          </select>
        </div>
      `;
      const sel = host.querySelector('#wizIncome');
      sel.value = state.profileWizard.draft.annualIncomeINR ? String(state.profileWizard.draft.annualIncomeINR) : '';
      sel.addEventListener('change', () => {
        state.profileWizard.draft.annualIncomeINR = sel.value ? Number(sel.value) : undefined;
      });
      return;
    }

    if (step === 1) {
      host.innerHTML = `
        <div class="text-sm font-semibold text-slate-700">Category</div>
        <div class="mt-2">
          <select id="wizCategory" class="rr-input">
            <option value="">Select category</option>
            <option value="sc">SC</option>
            <option value="st">ST</option>
            <option value="obc">OBC</option>
            <option value="general">General</option>
          </select>
        </div>
      `;
      const sel = host.querySelector('#wizCategory');
      sel.value = safeText(state.profileWizard.draft.category);
      sel.addEventListener('change', () => {
        state.profileWizard.draft.category = sel.value || undefined;
      });
      return;
    }

    host.innerHTML = `
      <div class="text-sm font-semibold text-slate-700">Location</div>
      <div class="mt-2">
        <label class="text-xs font-semibold text-slate-500">State</label>
        <input id="wizState" class="rr-input mt-2" placeholder="e.g., Bihar" />
      </div>
      <div class="mt-4">
        <label class="text-xs font-semibold text-slate-500">Rural / Urban (optional)</label>
        <select id="wizRuralUrban" class="rr-input mt-2">
          <option value="">Select</option>
          <option value="rural">Rural</option>
          <option value="urban">Urban</option>
        </select>
      </div>
      <div class="mt-4">
        <label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input id="wizConsent" type="checkbox" class="h-4 w-4" />
          Save my profile on this device
        </label>
        <div class="mt-1 text-xs text-slate-500">You can use ReadyRight without saving.</div>
      </div>
    `;

    const st = host.querySelector('#wizState');
    const ru = host.querySelector('#wizRuralUrban');
    const consent = host.querySelector('#wizConsent');

    st.value = safeText(state.profileWizard.draft.state);
    ru.value = safeText(state.profileWizard.draft.ruralUrban);
    consent.checked = !!state.profileWizard.draft.consentToSave;

    st.addEventListener('input', () => (state.profileWizard.draft.state = st.value.trim() || undefined));
    ru.addEventListener('change', () => (state.profileWizard.draft.ruralUrban = ru.value || undefined));
    consent.addEventListener('change', () => (state.profileWizard.draft.consentToSave = consent.checked));
  }

  async function saveProfileDraft() {
    const payload = { ...state.profileWizard.draft };

    // remove empty fields
    for (const k of Object.keys(payload)) {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') delete payload[k];
    }

    const resp = await api('/api/profile', { method: 'PUT', body: payload });
    state.profile = resp.profile || {};
    renderProfileSummary();

    // Refresh recommendations to reflect profile changes
    await loadRecommended();

    toast({
      title: 'Profile updated',
      message: resp.saved ? 'Saved for future visits.' : 'Saved for this session.',
      severity: 'success',
    });
  }

  function renderEligibilityQuestion() {
    const q = state.eligibility.question;
    if (!q) return;

    $('eligSchemeTitle').textContent = safeText(state.eligibility.scheme?.title) || 'Eligibility';
    $('eligQuestionTitle').textContent = safeText(q.title) || 'Question';
    $('eligHelper').textContent = safeText(q.helper) || '';

    const idx = Number(state.eligibility.progress?.index || 0);
    const total = Number(state.eligibility.progress?.total || 0);
    const shownIndex = total ? Math.min(idx + 1, total) : idx + 1;

    $('eligProgressMeta').textContent = total ? `${shownIndex}/${total}` : `${shownIndex}`;
    $('eligProgressFill').style.width = total ? `${Math.round((shownIndex / total) * 100)}%` : '20%';

    const optionsHost = $('eligOptions');
    const textBlock = $('eligTextBlock');
    optionsHost.innerHTML = '';

    if (q.type === 'text') {
      optionsHost.classList.add('hidden');
      textBlock.classList.remove('hidden');
      $('eligTextInput').value = '';
      $('eligTextInput').placeholder = safeText(q.placeholder) || 'Type your answer';
      return;
    }

    optionsHost.classList.remove('hidden');
    textBlock.classList.add('hidden');

    for (const opt of q.options || []) {
      const b = document.createElement('button');
      b.className = 'rr-card rr-clickable p-4 text-left';
      b.type = 'button';
      b.innerHTML = `
        <div class="text-sm font-black">${escapeHtml(opt.label)}</div>
        <div class="mt-1 text-xs text-slate-500">Tap to continue</div>
      `;
      b.addEventListener('click', () => answerEligibility(opt.value));
      optionsHost.appendChild(b);
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function renderResult({ result, checklist } = {}) {
    const status = safeText(result?.status);

    let badge = { label: '—', className: 'bg-slate-100 text-slate-700' };
    if (status === 'ready') badge = { label: 'Ready', className: 'bg-indiaGreen/10 text-indiaGreen' };
    else if (status === 'needs_fix') badge = { label: 'Needs Fix', className: 'bg-saffron/10 text-saffron' };
    else if (status === 'not_eligible') badge = { label: 'Not Eligible', className: 'bg-red-50 text-red-700' };

    const badgeEl = $('resultBadge');
    badgeEl.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`;
    badgeEl.textContent = badge.label;

    $('resultTitle').textContent = safeText(state.eligibility.scheme?.title) || 'Result';

    const reasons = (result?.reasons || []).filter(Boolean);
    const missing = (result?.missingRequirements || []).filter(Boolean);

    $('resultExplanation').textContent = reasons[0] || (status === 'ready' ? 'You look eligible based on your answers.' : 'Review checklist and documents before applying.');

    const checklistEl = $('resultChecklist');
    checklistEl.innerHTML = '';

    const lines = [];
    for (const r of reasons.slice(0, 4)) lines.push(`✅ ${r}`);
    for (const m of missing.slice(0, 6)) lines.push(`⚠ ${m}`);
    if (lines.length === 0) lines.push('✅ No major issues detected.');

    for (const line of lines) {
      const li = document.createElement('li');
      li.textContent = line;
      checklistEl.appendChild(li);
    }

    const docsEl = $('resultDocs');
    docsEl.innerHTML = '';
    for (const d of (checklist?.documents || []).slice(0, 10)) {
      const name = typeof d === 'string' ? d : safeText(d?.name) || 'Document';
      const li = document.createElement('li');
      li.textContent = name;
      docsEl.appendChild(li);
    }

    const link = checklist?.officialLink || '#';
    const a = $('resultOfficialLink');
    a.href = link || '#';
    a.classList.toggle('opacity-60', !link);
    a.classList.toggle('pointer-events-none', !link);
  }

  async function startEligibility(schemeId) {
    const resp = await api('/api/eligibility/sessions', { method: 'POST', body: { schemeId } });

    state.eligibility.sessionId = resp.sessionId;
    state.eligibility.scheme = resp.scheme;
    state.eligibility.question = resp.question;
    state.eligibility.progress = resp.progress || { index: 0, total: 0 };

    setMainScreen('screenEligibility');
    renderEligibilityQuestion();

    toast({ title: 'Eligibility started', message: 'Answer a few questions to get a precise result.', severity: 'info' });
  }

  async function answerEligibility(answer) {
    const sessionId = state.eligibility.sessionId;
    if (!sessionId) throw new Error('No eligibility session');

    const resp = await api(`/api/eligibility/sessions/${sessionId}/answer`, { method: 'POST', body: { answer } });

    if (!resp.done) {
      state.eligibility.question = resp.question;
      state.eligibility.progress = resp.progress || state.eligibility.progress;
      renderEligibilityQuestion();
      return;
    }

    setMainScreen('screenResult');
    renderResult({ result: resp.result, checklist: resp.checklist });

    toast({ title: 'Result ready', message: 'Checklist and official link are available.', severity: 'success' });
  }

  async function loadProfile() {
    const resp = await api('/api/profile');
    state.profile = resp.profile || {};
    renderProfileSummary();

    const pct = computeProfileCompletion(state.profile);
    if (pct < 70) {
      toast({
        title: 'Complete your profile',
        message: 'Better recommendations and fewer rejections.',
        severity: 'warn',
        timeoutMs: 5500,
      });
    }
  }

  async function loadTrending() {
    const resp = await api('/api/schemes/trending');
    state.trending = resp.schemes || [];
  }

  async function loadRecommended() {
    const resp = await api('/api/schemes/recommended');
    state.recommended = resp.schemes || [];
  }

  async function loadSchemes() {
    const q = encodeURIComponent(state.filters.query || '');
    const rawCat = state.filters.category;
    const c = rawCat === 'All' ? '' : encodeURIComponent(rawCat || '');
    const resp = await api(`/api/schemes?query=${q}&category=${c}`);
    state.schemes = resp.schemes || [];
    renderSchemesList();
  }

  async function refreshDashboard() {
    await Promise.all([loadTrending(), loadRecommended()]);
    // Load a base scheme list so carousel/hub can use real scheme media
    await loadSchemes();

    state.carousel.slides = buildCarouselSlides(state.schemes);
    renderDashboard();
    renderCarousel();
    renderEligibilityHub();
  }

  async function bootstrapApp() {
    await loadProfile();
    await refreshDashboard();
    setMainScreen('screenDashboard');
  }

  function bindNav() {
    for (const btn of $$('[data-nav]')) {
      btn.addEventListener('click', async () => {
        const dest = btn.getAttribute('data-nav');
        if (dest === 'dashboard') {
          setMainScreen('screenDashboard');
          return;
        }
        if (dest === 'schemes') {
          setMainScreen('screenSchemes');
          await loadSchemes();
          return;
        }
        if (dest === 'eligibility') {
          setMainScreen('screenEligibilityHub');
          renderEligibilityHub();
          return;
        }
        if (dest === 'profile') {
          setMainScreen('screenProfile');
          return;
        }
        if (dest === 'help') {
          setMainScreen('screenHelp');
        }
      });
    }
  }

  function bindEvents() {
    // Landing → Auth
    $('btnGetStarted').addEventListener('click', () => {
      showAuth();
      $('authName').focus();
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    });

    $('btnAuthBack')?.addEventListener('click', () => {
      showLanding();
    });

    $('btnBackToLanding').addEventListener('click', () => {
      showLanding();
    });

    // OTP Login
    $('btnRequestOtp').addEventListener('click', async () => {
      try {
        const name = safeText($('authName').value);
        const phone = normalizePhone($('authPhone').value);

        if (name.length < 2) throw new Error('Please enter your name.');
        if (phone.length < 10) throw new Error('Please enter a valid phone number.');

        const resp = await api('/api/auth/request-otp', { method: 'POST', body: { name, phone } });

        $('otpBlock').classList.remove('hidden');
        $('authOtp').focus();

        toast({
          title: 'OTP sent',
          message: resp.devOtp ? `Demo OTP: ${resp.devOtp}` : 'OTP has been sent.',
          severity: 'success',
          timeoutMs: 7000,
        });
      } catch (e) {
        toast({ title: 'Login', message: e.message || 'OTP request failed', severity: 'error' });
      }
    });

    $('btnVerifyOtp').addEventListener('click', async () => {
      try {
        const otp = safeText($('authOtp').value);
        if (otp.length < 4) throw new Error('Enter the OTP.');

        const resp = await api('/api/auth/verify-otp', { method: 'POST', body: { otp } });
        state.user = resp.user;

        showShell();
        await bootstrapApp();

        toast({ title: 'Welcome', message: `Signed in as ${state.user.name}`, severity: 'success' });
      } catch (e) {
        toast({ title: 'Login', message: e.message || 'OTP verification failed', severity: 'error' });
      }
    });

    // Navbar actions
    $('btnLogout').addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      }
      state.user = null;
      showLanding();
      toast({ title: 'Logged out', message: 'You have been signed out.', severity: 'info' });
    });

    $('btnProfileMenu').addEventListener('click', () => {
      setMainScreen('screenProfile');
    });

    // Sidebar mobile toggle (simple)
    $('btnOpenSidebar').addEventListener('click', () => {
      const side = $('sidebar');
      side.classList.toggle('hidden');
    });

    // Dashboard search → Schemes
    $('dashSearch').addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      state.filters.query = safeText($('dashSearch').value);
      $('schemesSearch').value = state.filters.query;
      setMainScreen('screenSchemes');
      await loadSchemes();
    });

    $('dashSearch').addEventListener('input', () => {
      // Keep state only; fetch when user presses Enter
      state.filters.query = safeText($('dashSearch').value);
    });

    // Category quick filters
    for (const c of $$('.rr-category')) {
      c.addEventListener('click', async () => {
        const cat = c.getAttribute('data-category') || '';
        state.filters.category = cat;
        setMainScreen('screenSchemes');
        await loadSchemes();
      });
    }

    // Schemes filters
    let searchDebounce = null;
    $('schemesSearch').addEventListener('input', () => {
      state.filters.query = safeText($('schemesSearch').value);
      if (searchDebounce) window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(() => loadSchemes().catch(() => { }), 220);
    });

    const schemesRatingFilter = $('schemesRatingFilter');
    if (schemesRatingFilter) {
      schemesRatingFilter.addEventListener('change', () => {
        state.filters.rating = Number(schemesRatingFilter.value);
        renderSchemesList();
      });
    }

    const detailBackBtn = $('btnDetailBack');
    if (detailBackBtn) {
      detailBackBtn.addEventListener('click', () => {
        setMainScreen('screenSchemes');
        renderSchemesList();
      });
    }

    // Profile completion
    $('btnCompleteProfile').addEventListener('click', openProfileModal);
    $('btnEditProfile').addEventListener('click', openProfileModal);

    $('btnCloseProfileModal').addEventListener('click', closeProfileModal);
    $('modalProfile').addEventListener('click', (e) => {
      const modal = $('modalProfile');
      const backdrop = modal?.firstElementChild;
      if (e.target === modal || e.target === backdrop) closeProfileModal();
    });

    $('btnProfilePrev').addEventListener('click', () => {
      state.profileWizard.step = Math.max(0, state.profileWizard.step - 1);
      renderProfileWizardStep();
    });

    $('btnProfileNext').addEventListener('click', async () => {
      try {
        const step = state.profileWizard.step;
        if (step === 0 && !state.profileWizard.draft.annualIncomeINR) throw new Error('Select your income range.');
        if (step === 1 && !state.profileWizard.draft.category) throw new Error('Select your category.');

        if (step < 2) {
          state.profileWizard.step += 1;
          renderProfileWizardStep();
          return;
        }

        if (!safeText(state.profileWizard.draft.state)) throw new Error('Enter your state.');

        await saveProfileDraft();
        closeProfileModal();
      } catch (e) {
        toast({ title: 'Profile', message: e.message || 'Could not save profile', severity: 'error' });
      }
    });

    // Eligibility back
    $('btnBackFromEligibility').addEventListener('click', () => {
      if ($('screenEligibilityHub')) {
        setMainScreen('screenEligibilityHub');
        renderEligibilityHub();
        return;
      }
      setMainScreen('screenSchemes');
    });

    $('btnEligTextContinue').addEventListener('click', () => {
      answerEligibility(safeText($('eligTextInput').value)).catch((e) => {
        toast({ title: 'Eligibility', message: e.message || 'Could not submit answer', severity: 'error' });
      });
    });

    // Result buttons
    $('btnBackFromResult').addEventListener('click', () => {
      if ($('screenEligibilityHub')) {
        setMainScreen('screenEligibilityHub');
        renderEligibilityHub();
        return;
      }
      setMainScreen('screenSchemes');
    });

    $('btnResultGoHome').addEventListener('click', () => {
      setMainScreen('screenDashboard');
    });

    $('btnResultBrowse').addEventListener('click', async () => {
      setMainScreen('screenSchemes');
      await loadSchemes();
    });

    bindNav();
  }

  async function init() {
    bindEvents();

    loadSavedSchemesFromStorage();

    initLanguageFromStorage();

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    try {
      await loadConfig();
    } catch {
      // Non-blocking
    }

    try {
      const me = await api('/api/auth/me');
      state.user = me.user;

      if (state.user) {
        showShell();
        await bootstrapApp();
      } else {
        showLanding();
      }
    } catch (e) {
      console.error(e);
      showLanding();
      toast({ title: 'ReadyRight', message: 'Could not check login status.', severity: 'error' });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch((e) => {
      console.error(e);
      toast({ title: 'ReadyRight', message: 'App failed to start.', severity: 'error' });
    });
  });
})();
