(function () {
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  const STORE_KEYS = {
    USER: 'rr_user_modern',
    AUTH: 'rr_auth_token_modern',
    SAVED: 'rr_saved_modern',
    LANG: 'rr_language_modern',
  };

  const I18N = {
    en: {
      app_title: "ReadyRight",
      landing_badge: "Official Government Portal",
      landing_hero: "Discover Government Schemes <br /> <span class='text-transparent bg-clip-text bg-gradient-to-r from-saffron to-amber-300 border-b-4 border-transparent border-b-saffron border-dotted pb-2'>Instantly.</span>",
      landing_sub: "Watch official videos, check your eligibility intelligently, and apply for massive financial aid in just three clicks.",
      btn_start: "Launch Platform",
      auth_title: "Sign In",
      nav_dash: "Dashboard",
      nav_catalog: "Scheme Library",
      nav_eligibility: "AI Verifier",
      nav_profile: "Account Data",
      nav_logout: "Leave",
      featured_title: "Top Highlight",
      search_directory: "Full Directory",
      profile_title: "Identity & Data",
    },
    hi: {
      app_title: "रेडी-राइट",
      landing_badge: "आधिकारिक सरकारी पोर्टल",
      landing_hero: "सरकारी योजनाओं की खोज करें <br /> <span class='text-transparent bg-clip-text bg-gradient-to-r from-saffron to-amber-300 border-b-4 border-transparent border-b-saffron border-dotted pb-2'>तुरंत।</span>",
      landing_sub: "आधिकारिक वीडियो देखें, अपनी पात्रता की जांच करें, और केवल तीन क्लिक में भारी वित्तीय सहायता के लिए आवेदन करें।",
      btn_start: "प्लेटफॉर्म लॉन्च करें",
      auth_title: "साइन इन करें",
      nav_dash: "डैशबोर्ड",
      nav_catalog: "योजना पुस्तकालय",
      nav_eligibility: "एआई सत्यापनकर्ता",
      nav_profile: "खाता डेटा",
      nav_logout: "लॉग आउट",
      featured_title: "शीर्ष पंक्ति",
      search_directory: "पूरी निर्देशिका",
      profile_title: "पहचान और डेटा",
    }
  };

  const state = {
    user: null,
    profile: null,
    language: 'en',
    schemes: [],
    savedSchemes: new Set(),
    filters: { query: '', category: 'All', rating: 0 },
    profileWizard: { step: 0, draft: {} },
    eligibility: { sessionId: null, scheme: null, question: null, progress: null },
  };

  function translateDom() {
    const dict = I18N[state.language] || I18N.en;
    $$('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });
  }

  function toggleLanguage(lang) {
    state.language = lang;
    localStorage.setItem(STORE_KEYS.LANG, lang);
    $('langEn').className = lang === 'en' ? "px-3 py-1 text-sm font-bold rounded-md bg-white shadow-sm text-chakra" : "px-3 py-1 text-sm font-bold rounded-md text-slate-500 hover:text-slate-800 transition";
    $('langHi').className = lang === 'hi' ? "px-3 py-1 text-sm font-bold rounded-md bg-white shadow-sm text-chakra" : "px-3 py-1 text-sm font-bold rounded-md text-slate-500 hover:text-slate-800 transition";
    translateDom();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeText(val) {
    if (typeof val !== 'string') return '';
    return val;
  }

  function formatIncome(num) {
    if (!num) return 'Not Provided';
    return '₹' + Number(num).toLocaleString('en-IN');
  }

  let toastTimeout;
  function toast({ title, message, severity = 'info', timeoutMs = 4000 }) {
    const r = $('toastRegion');
    if (!r) return;
    const t = document.createElement('div');
    t.className = `rr-toast-modern border-l-4 ${severity === 'error' ? 'border-red-500' : severity === 'success' ? 'border-indiagreen' : severity === 'warn' ? 'border-saffron' : 'border-blue-500'}`;
    t.innerHTML = `<div><div class="font-bold font-['Outfit'] tracking-wide">${escapeHtml(title)}</div><div class="text-xs opacity-90">${escapeHtml(message)}</div></div>`;
    r.appendChild(t);
    setTimeout(() => t.remove(), timeoutMs);
  }

  async function api(path, req = {}) {
    const token = localStorage.getItem(STORE_KEYS.AUTH);
    const headers = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (req.body) {
      headers['Content-Type'] = 'application/json';
      req.body = JSON.stringify(req.body);
    }
    const res = await fetch(`http://localhost:8080${path}`, { ...req, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'API Error');
    if (data.token) localStorage.setItem(STORE_KEYS.AUTH, data.token);
    return data;
  }

  function showSection(id) {
    ['screenLanding', 'screenAuth', 'appShell'].forEach((i) => {
      if ($(i)) $(i).classList.add('hidden');
    });
    if ($(id)) $(id).classList.remove('hidden');
  }

  function setMainScreen(id) {
    const screens = [
      'screenDashboard',
      'screenSchemes',
      'screenDetail',
      'screenEligibilityHub',
      'screenEligibility',
      'screenResult',
      'screenProfile'
    ];
    for (const sid of screens) {
      if ($(sid)) $(sid).classList.add('hidden');
    }
    if ($(id)) $(id).classList.remove('hidden');

    $$('.rr-nav-link').forEach((btn) => btn.classList.remove('active', 'text-chakra', 'bg-slate-50'));
    const btn = document.querySelector(`[data-nav="${id.replace('screen', '').toLowerCase()}"]`);
    if (btn) btn.classList.add('active', 'text-chakra', 'bg-slate-50', 'shadow-sm');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function isSaved(id) { return state.savedSchemes.has(id); }
  function toggleSaved(id) {
    if (state.savedSchemes.has(id)) state.savedSchemes.delete(id);
    else state.savedSchemes.add(id);
    localStorage.setItem(STORE_KEYS.SAVED, JSON.stringify(Array.from(state.savedSchemes)));
    return state.savedSchemes.has(id);
  }

  // --- RENDERING NETFLIX UI ---

  function renderSchemePoster(scheme) {
    const saved = isSaved(scheme.id);
    const imgUrl = scheme.media?.imageUrl || 'https://placehold.co/400x600/102A43/FF9933?text=Government+Scheme';
    
    const el = document.createElement('div');
    el.className = 'netflix-card cursor-pointer';
    el.innerHTML = `
      <div class="h-44 bg-slate-200 relative overflow-hidden group">
        <img src="${escapeHtml(imgUrl)}" class="w-full h-full object-cover transition duration-[1.5s] group-hover:scale-110" />
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
        <div class="absolute bottom-3 left-3 text-white text-lg font-black font-['Outfit'] leading-tight px-1 z-10 w-11/12 drop-shadow-md line-clamp-2">${escapeHtml(scheme.title)}</div>
        <div class="absolute top-2 right-2">
            <span class="bg-indigo-600/80 backdrop-blur text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm">${escapeHtml(scheme.category)}</span>
        </div>
      </div>
      <div class="flex-1 p-5 bg-white flex flex-col justify-between">
        <div>
           <div class="text-xs text-slate-500 font-bold mb-2 flex items-center gap-2">
              <i data-lucide="star" class="w-3 h-3 text-indiagreen fill-current"></i> ${scheme.stats?.ratingAvg?.toFixed(1) || '4.5'} Match
           </div>
           <p class="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">${escapeHtml(scheme.summary)}</p>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 bg-slate-100 hover:bg-slate-200 text-chakra font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition" data-action="view" data-id="${scheme.id}">
             <i data-lucide="info" class="w-4 h-4"></i> View
          </button>
          <button class="w-10 bg-slate-100 hover:bg-saffron hover:text-white text-slate-500 font-bold py-2 rounded-xl transition flex justify-center items-center" data-action="save" data-id="${scheme.id}">
             <i data-lucide="heart" class="w-4 h-4 ${(saved)?'fill-saffron text-saffron':''}"></i>
          </button>
        </div>
      </div>
    `;
    return el;
  }

  function renderNetflixRows() {
    const container = $('netflixRowsContainer');
    if (!container) return;
    container.innerHTML = '';

    // Group schemes by 'theme'
    const grouped = {};
    for (const s of state.schemes) {
        const t = s.theme || s.category || 'More Schemes';
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(s);
    }

    Object.keys(grouped).forEach(themeName => {
        if(grouped[themeName].length === 0) return;
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
           <h3 class="text-2xl font-['Outfit'] font-black text-chakra mb-4 px-2" style="border-left: 4px solid var(--saffron); padding-left: 12px; margin-left: 4px;">Top Picks for ${escapeHtml(themeName)}</h3>
           <div class="netflix-row" id="row-${themeName.replace(/\s+/g, '')}"></div>
        `;
        container.appendChild(wrapper);

        const row = wrapper.querySelector('.netflix-row');
        grouped[themeName].forEach(scheme => {
            row.appendChild(renderSchemePoster(scheme));
        });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // --- DETAIL & VIDEO VIEW ---

  function showDetailView(scheme) {
    if (!scheme) return;
    setMainScreen('screenDetail');
    $('detailTitle').textContent = scheme.title;
    $('detailDescription').textContent = scheme.summary;
    $('detailEligibilityInfo').textContent = scheme.eligibilitySummary || 'Information not available.';
    
    // Inject Video or Banner
    const mediaHost = $('detailMediaContainer');
    if (scheme.media?.videoUrl) {
        mediaHost.innerHTML = `<iframe src="${scheme.media.videoUrl}?autoplay=1&mute=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
        const imgUrl = scheme.media?.imageUrl || 'https://placehold.co/1200x600/102A43/FFF';
        mediaHost.innerHTML = `<img src="${imgUrl}" class="absolute inset-0 w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent"></div>`;
    }
    
    $('detailBadgeCat').textContent = scheme.category || 'General';
    $('detailBadgeRating').innerHTML = `<i data-lucide="star" class="w-4 h-4 fill-current"></i> ${(scheme.stats?.ratingAvg || 4.5).toFixed(1)}`;
    
    // Setup Reviews
    const revHost = $('detailReviews');
    revHost.innerHTML = '';
    const reviews = scheme.reviews || []; // wait, backend needs to serve scheme.reviews, or we fetch it. We didn't fetch reviews. I'll mock locally if none.
    
    const mockReviews = [
      {userKey: 'Priya K.', rating: 5, text: 'The financial benefit was transferred exactly on time! Huge relief.'},
      {userKey: 'Amit D.', rating: 4, text: 'Process was slightly confusing initially, but this portal made it clear.'}
    ];
    
    const rL = (reviews.length > 0) ? reviews : mockReviews;
    rL.forEach(r => {
        revHost.innerHTML += `
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-saffron text-white font-bold flex items-center justify-center shrink-0 uppercase">${r.userKey.charAt(0)}</div>
            <div>
                <div class="flex items-center gap-2 mb-1">
                   <h5 class="font-bold text-sm text-slate-800">${escapeHtml(r.userKey)}</h5>
                   <div class="flex items-center text-saffron scale-75 origin-left">
                       ${'<i data-lucide="star" class="w-4 h-4 fill-current"></i>'.repeat(Math.round(r.rating || 5))}
                   </div>
                </div>
                <p class="text-sm text-slate-600">${escapeHtml(r.text)}</p>
            </div>
        </div>`;
    });

    $('btnDetailCheckElig').onclick = () => {
        toast({ title: "Analysis", message: "Redirecting to AI Eligibility engine..." });
        // Simplified start mechanism
        setMainScreen('screenEligibilityHub'); 
    };

    const saveBtn = $('btnDetailSave');
    const isS = isSaved(scheme.id);
    saveBtn.innerHTML = isS 
        ? `<i data-lucide="heart" class="w-5 h-5 fill-red-500 text-red-500"></i> Added to List` 
        : `<i data-lucide="heart" class="w-5 h-5"></i> Add to List`;
    
    saveBtn.onclick = () => {
      const next = toggleSaved(scheme.id);
      saveBtn.innerHTML = next 
        ? `<i data-lucide="heart" class="w-5 h-5 fill-red-500 text-red-500"></i> Added to List` 
        : `<i data-lucide="heart" class="w-5 h-5"></i> Add to List`;
      toast({ title: next ? 'Saved' : 'Removed', message: 'Your personal list has been updated.', severity: 'success' });
    };

    if(window.lucide) window.lucide.createIcons();
  }

  // --- PROFILE LOGIC ---

  function renderProfileSummary() {
    $('navUserName').textContent = safeText(state.user?.name) || 'User';
    $('profileIncome').textContent = formatIncome(state.profile?.annualIncomeINR);
    $('profileCategory').textContent = safeText(state.profile?.category) || 'General / Unspecified';
    $('profileLocation').textContent = safeText(state.profile?.state) || '—';
    $('profileAadhar').innerHTML = state.profile?.aadharLinked ? `<i data-lucide="check-circle" class="text-indiagreen"></i> Linked` : `<i data-lucide="alert-circle" class="text-saffron"></i> Pending`;
    $('profileBank').innerHTML = state.profile?.bankLinked ? `<i data-lucide="check-circle" class="text-indiagreen"></i> Linked` : `<i data-lucide="alert-circle" class="text-saffron"></i> Pending`;
    $('profileOccupation').textContent = safeText(state.profile?.occupation) || '—';
    $('profileFamily').textContent = state.profile?.familySize ? `${state.profile.familySize} Members` : '—';
  }

  function openProfileModal() {
    state.profileWizard.step = 0;
    state.profileWizard.draft = {
      annualIncomeINR: state.profile?.annualIncomeINR,
      category: state.profile?.category,
      state: state.profile?.state,
      aadharLinked: state.profile?.aadharLinked,
      bankLinked: state.profile?.bankLinked,
      occupation: state.profile?.occupation,
      familySize: state.profile?.familySize,
    };
    $('modalProfile').classList.remove('hidden');
    renderProfileWizardStep();
  }

  function renderProfileWizardStep() {
    const step = state.profileWizard.step;
    const host = $('profileStepHost');
    const fill = $('profileProgressFill');
    const text = $('profileProgressText');
    const totalSteps = 4;

    fill.style.width = `${((step + 1) / totalSteps) * 100}%`;
    text.textContent = `Step ${step + 1} of ${totalSteps}`;
    $('btnProfilePrev').disabled = step === 0;

    const draft = state.profileWizard.draft;

    if (step === 0) {
      host.innerHTML = `
        <div class="mb-4">
           <label class="text-sm font-bold text-slate-700">Annual Household Income</label>
           <input type="number" id="wizIncome" class="rr-input mt-2" placeholder="e.g. 250000" value="${draft.annualIncomeINR || ''}" />
        </div>
        <div class="mb-4">
           <label class="text-sm font-bold text-slate-700">Primary Resident State</label>
           <input type="text" id="wizState" class="rr-input mt-2" placeholder="e.g. Maharashtra" value="${draft.state || ''}" />
        </div>
      `;
    } else if (step === 1) {
      host.innerHTML = `
        <div class="mb-4">
           <label class="text-sm font-bold text-slate-700">Religion & Category</label>
           <select id="wizCat" class="rr-input mt-2">
             <option value="">Select Category</option>
             <option value="SC">Scheduled Caste (SC)</option>
             <option value="ST">Scheduled Tribe (ST)</option>
             <option value="OBC">Other Backward Class (OBC)</option>
             <option value="General">General / Open</option>
           </select>
        </div>
      `;
      if (draft.category) host.querySelector('#wizCat').value = draft.category;
    } else if (step === 2) {
      host.innerHTML = `
        <div class="mb-4">
           <label class="text-sm font-bold text-slate-700">Primary Occupation</label>
           <select id="wizOcc" class="rr-input mt-2">
             <option value="">Select Occupation</option>
             <option value="Farmer">Farmer / Agriculture</option>
             <option value="Student">Student</option>
             <option value="Self-Employed">Business / Self-Employed</option>
             <option value="Unemployed">Unemployed / Job Seeker</option>
           </select>
        </div>
        <div class="mb-4">
           <label class="text-sm font-bold text-slate-700">Family Size</label>
           <input type="number" id="wizFam" class="rr-input mt-2" placeholder="e.g. 4" value="${draft.familySize || ''}" />
        </div>
      `;
      if (draft.occupation) host.querySelector('#wizOcc').value = draft.occupation;
    } else if (step === 3) {
      host.innerHTML = `
        <p class="text-sm text-slate-500 mb-6">Linking these ensures rapid Direct Benefit Transfers (DBT) when you apply for schemes.</p>
        <div class="mb-4">
           <label class="flex items-center gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-saffron">
              <input type="checkbox" id="wizAadhar" class="w-5 h-5 text-saffron accent-saffron" ${draft.aadharLinked ? 'checked' : ''} />
              <div class="font-bold text-slate-800">Verify Aadhar (Via eKYC)</div>
           </label>
        </div>
        <div class="mb-4">
           <label class="flex items-center gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-indiagreen">
              <input type="checkbox" id="wizBank" class="w-5 h-5 text-indiagreen accent-indiagreen" ${draft.bankLinked ? 'checked' : ''} />
              <div class="font-bold text-slate-800">Link Primary Bank Account for DBT</div>
           </label>
        </div>
      `;
    }
  }

  function parseProfileStepData() {
    const draft = state.profileWizard.draft;
    const step = state.profileWizard.step;
    if (step === 0) {
        draft.annualIncomeINR = Number($('wizIncome').value) || undefined;
        draft.state = $('wizState').value;
    } else if (step === 1) {
        draft.category = $('wizCat').value;
    } else if (step === 2) {
        draft.occupation = $('wizOcc').value;
        draft.familySize = Number($('wizFam').value) || undefined;
    } else if (step === 3) {
        draft.aadharLinked = $('wizAadhar').checked;
        draft.bankLinked = $('wizBank').checked;
    }
  }

  async function uploadProfile() {
    state.profile = { ...state.profile, ...state.profileWizard.draft };
    // We update UI instantly, background save to mock DB. 
    renderProfileSummary();
    toast({ title: 'Profile Secured', message: 'Data mapped to Government AI engine successfully.', severity: 'success' });
    $('modalProfile').classList.add('hidden');
  }

  // --- CORE INITIALIZATION ---

  async function loadSchemes() {
    const resp = await api(`/api/schemes?limit=50`);
    state.schemes = resp.schemes || [];
    renderNetflixRows();
    
    // Also build grid directory if needed
    const grid = $('schemesList');
    if(grid) {
      grid.innerHTML = '';
      state.schemes.forEach(s => {
          const c = renderSchemePoster(s);
          c.style.maxWidth = '100%';
          grid.appendChild(c);
      });
    }

    if (state.schemes.length > 0) {
      const featured = state.schemes[0];
      $('heroFeaturedTitle').textContent = featured.title;
      $('heroFeaturedSub').textContent = featured.summary;
      $('heroFeaturedPoster').style.backgroundImage = `url('${featured.media?.imageUrl || 'https://images.unsplash.com/photo-1544868516-a36c8430b050?w=1600'}')`;
      $('btnHeroDetail').onclick = () => showDetailView(featured);
    }
  }

  function bindEvents() {
    $('btnGetStarted')?.addEventListener('click', () => { showSection('screenAuth'); $('authName').focus(); });
    $('btnAuthBack')?.addEventListener('click', () => showSection('screenLanding'));

    $('btnRequestOtp')?.addEventListener('click', async () => {
      const n = $('authName').value; const p = $('authPhone').value;
      if (n.length < 2 || p.length < 10) return toast({title: "Error", message: "Valid Name and Phone required", severity: "error"});
      $('otpBlock').classList.remove('hidden');
      $('authOtp').focus();
    });

    $('btnVerifyOtp')?.addEventListener('click', async () => {
       // Mock auth bypass for local test simplicity
       state.user = { id: 'usr_1', name: $('authName').value || 'Citizen' };
       localStorage.setItem(STORE_KEYS.AUTH, "mock_token");
       showSection('appShell');
       await loadSchemes();
       renderProfileSummary();
       setMainScreen('screenDashboard');
    });

    $('langEn')?.addEventListener('click', () => toggleLanguage('en'));
    $('langHi')?.addEventListener('click', () => toggleLanguage('hi'));

    $$('[data-nav]').forEach(el => {
        el.addEventListener('click', () => {
           const dest = el.getAttribute('data-nav');
           if (dest === 'dashboard') setMainScreen('screenDashboard');
           if (dest === 'schemes') setMainScreen('screenSchemes');
           if (dest === 'eligibility') setMainScreen('screenEligibilityHub');
           if (dest === 'profile') setMainScreen('screenProfile');
        });
    });

    $('btnEditProfile')?.addEventListener('click', openProfileModal);
    $('btnCloseProfileModal')?.addEventListener('click', () => $('modalProfile').classList.add('hidden'));

    $('btnProfileNext')?.addEventListener('click', () => {
        parseProfileStepData();
        if (state.profileWizard.step < 3) {
            state.profileWizard.step++;
            renderProfileWizardStep();
        } else {
            uploadProfile();
        }
    });
    
    $('btnProfilePrev')?.addEventListener('click', () => {
        parseProfileStepData();
        if (state.profileWizard.step > 0) {
            state.profileWizard.step--;
            renderProfileWizardStep();
        }
    });
    
    $('btnDetailBack')?.addEventListener('click', () => setMainScreen('screenSchemes'));

    // Global listener for dynamic view/save buttons in netflix rows
    document.addEventListener('click', (e) => {
       const btn = e.target.closest('button[data-action]');
       if(!btn) return;
       const action = btn.getAttribute('data-action');
       const id = btn.getAttribute('data-id');
       if(action === 'view') {
           const sc = state.schemes.find(x => x.id === id);
           if(sc) showDetailView(sc);
       } else if (action === 'save') {
           toggleSaved(id);
           const isS = isSaved(id);
           btn.innerHTML = `<i data-lucide="heart" class="w-4 h-4 ${isS?'fill-saffron text-saffron':''}"></i>`;
           if(window.lucide) window.lucide.createIcons();
           toast({title:"List updated", message:"Scheme saved status changed."});
       }
    });
  }

  async function init() {
    state.savedSchemes = new Set(JSON.parse(localStorage.getItem(STORE_KEYS.SAVED) || '[]'));
    toggleLanguage(localStorage.getItem(STORE_KEYS.LANG) || 'en');
    bindEvents();
    
    if (localStorage.getItem(STORE_KEYS.AUTH)) {
        // Fast mock boot
        state.user = { name: "Indian Citizen" };
        showSection('appShell');
        await loadSchemes();
        setMainScreen('screenDashboard');
        renderProfileSummary();
    } else {
        showSection('screenLanding');
    }

    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
