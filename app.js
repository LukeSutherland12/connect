(function () {
  'use strict';

  // ---------- Content ----------
  const SERVICES = ['Transport', 'Crane', 'Consent', 'Site prep', 'Foundations', 'Power', 'Drainage', 'Inspections'];
  const NEXT = {
    Transport: 'book crane for the same day', Crane: 'confirm transport slot', Consent: 'geotech report',
    'Site prep': 'piles once consent issues', Foundations: 'pile inspection', Power: 'lines company application',
    Drainage: 'drainlayer + council inspection', Inspections: 'CCC application'
  };
  const ICON = { Transport: 'MOVE', Crane: 'CRN', Consent: 'BC', 'Site prep': 'SITE', Foundations: 'PILE', Power: 'PWR', Drainage: 'DRN', Inspections: 'CCC' };
  const TITLE = {
    Transport: 'Move the house', Crane: 'Book a crane', Consent: 'Building consent', 'Site prep': 'Site prep',
    Foundations: 'Foundations', Power: 'Power connection', Drainage: 'Drainage + septic', Inspections: 'Inspections + CCC'
  };
  const STAGES = [
    ['Floor', 'Bearers, joists, flooring, fixings'],
    ['Frame', 'Wall frames, trusses, bracing'],
    ['Roof + wrap', 'Roofing, flashings, building wrap'],
    ['Cladding + joinery', 'Cladding, windows, doors'],
    ['Linings', 'Insulation, GIB, stopping'],
    ['Fit-out', 'Kitchen, bathroom, trims, paint']
  ];
  const LIVE_MINUTES = 10; // how long a test transport/crane booking takes to "arrive"

  function optionsFor(service) {
    const d1 = dayLabel(3), d0 = dayLabel(1);
    if (service === 'Transport') return [
      { name: 'Standard move', when: d1 + ' · depart 5:00am', detail: 'Truck, permit, 1 pilot' },
      { name: 'Move + crane', when: d1 + ' · on site 7:30am', detail: 'Crane waiting on arrival, placed on piles' },
      { name: 'Priority', when: 'Earliest slot: ' + d0, detail: 'Next available truck and crane' }
    ];
    if (service === 'Crane') return [
      { name: 'Crane only', when: d1 + ' · on site 7:30am', detail: 'Placed on piles, operator + dogman' },
      { name: 'Priority crane', when: 'Earliest slot: ' + d0, detail: 'Next available crane' }
    ];
    if (service === 'Consent') return [
      { name: 'Full consent handling', when: 'Starts today', detail: 'We lodge, answer council RFIs and chase it' },
      { name: 'Lodge only', when: 'Starts today', detail: 'We lodge, you handle council questions' }
    ];
    return [
      { name: 'Standard', when: 'Next available · ' + d1, detail: 'Booked and confirmed by us' },
      { name: 'Priority', when: 'Earliest slot · ' + d0, detail: 'Next available crew' }
    ];
  }

  // ---------- Helpers ----------
  const $app = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function dayLabel(offset) {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' });
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  };
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const svg = {
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg>',
    right: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    box: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    truck: '<svg width="34" height="22" viewBox="0 0 34 22" fill="none" stroke="#111" stroke-width="1.8" stroke-linejoin="round"><path d="M1 4h22v12H1z"/><path d="M23 8h6l4 4v4h-10"/><circle cx="7" cy="18" r="2.5"/><circle cx="27" cy="18" r="2.5"/></svg>',
    tick: (c) => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + (c || '#15803D') + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    upload: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/></svg>',
    phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5"/></svg>',
    msg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    card: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>'
  };

  // ---------- Auth + data ----------
  const cfg = window.APP_CONFIG || {};
  const sb = (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const Auth = {
    shared: !!sb,
    async current() {
      if (sb) {
        const { data } = await sb.auth.getSession();
        const u = data.session && data.session.user;
        return u ? { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || u.email.split('@')[0] } : null;
      }
      const email = store.get('nc_session', null);
      const u = email && store.get('nc_users', {})[email];
      return u ? { id: u.id, email, name: u.name } : null;
    },
    async signUp(name, email, pw) {
      if (sb) {
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { name } } });
        if (error) throw error;
        if (!data.session) return { confirm: true };
        return { ok: true };
      }
      const users = store.get('nc_users', {});
      if (users[email]) throw new Error('An account with that email already exists. Sign in instead.');
      const salt = uid();
      users[email] = { id: uid(), name, salt, hash: await sha256(salt + pw) };
      store.set('nc_users', users);
      store.set('nc_session', email);
      return { ok: true };
    },
    async signIn(email, pw) {
      if (sb) {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        return;
      }
      const u = store.get('nc_users', {})[email];
      if (!u || u.hash !== await sha256(u.salt + pw)) throw new Error('Email or password is wrong.');
      store.set('nc_session', email);
    },
    async signOut() {
      if (sb) await sb.auth.signOut(); else store.del('nc_session');
    }
  };

  const freshState = () => ({ address: '', stage: 'Site prep', bookings: {}, plans: null, stages: STAGES.map(() => 'later'), deliveries: [] });

  const Data = {
    async load(user) {
      if (sb) {
        const { data, error } = await sb.from('app_state').select('data').eq('user_id', user.id).maybeSingle();
        if (error) console.warn('[NewCompany] load failed', error);
        return Object.assign(freshState(), (data && data.data) || {});
      }
      return Object.assign(freshState(), store.get('nc_state_' + user.id, {}));
    },
    async save(user, state) {
      if (sb) {
        const { error } = await sb.from('app_state').upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() });
        if (error) { console.warn('[NewCompany] save failed', error); toast('Could not save. Check your connection.'); }
        return;
      }
      store.set('nc_state_' + user.id, state);
    }
  };

  // ---------- App state ----------
  let user = null;
  let S = freshState();
  const ui = { picked: 'Transport', option: 0, query: '', tab: 0, slot: 0, menu: false };
  let tickTimer = null;

  async function commit() { await Data.save(user, S); render(); }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    $app.appendChild(t); setTimeout(() => t.remove(), 2800);
  }

  function serviceStatus(name) {
    const b = S.bookings[name];
    if (!b) return { text: 'Not booked', cls: '' };
    if (name === 'Transport' || name === 'Crane') {
      const p = progress(b);
      return p >= 1 ? { text: 'Done', cls: 'done' } : { text: 'Live', cls: 'live' };
    }
    if (name === 'Consent') return consentDay(b) >= 20 ? { text: 'Issued', cls: 'done' } : { text: 'In progress', cls: '' };
    return { text: 'Booked', cls: '' };
  }
  const progress = (b) => Math.min(1, (Date.now() - b.at) / (LIVE_MINUTES * 60000));
  const consentDay = (b) => Math.min(20, Math.floor((Date.now() - b.at) / 86400000));

  // ---------- Screens ----------
  const shell = (inner) => (Auth.shared ? '' : '<div class="banner">Test mode · accounts are saved on this device only</div>') + inner;

  function screenWelcome(mode) {
    const up = mode === 'signup';
    return shell(`
      <div class="hero">
        <div class="logo"><svg width="22" height="22" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#111"/><rect x="10" y="10" width="4" height="4" fill="#fff"/></svg></div>
        <h1 style="font-size:34px;line-height:1.05">New Company</h1>
        <div style="font-size:16px;color:#D4D4D4">They build the home. We handle the site.</div>
      </div>
      <form class="page" id="authForm" novalidate>
        <h2 class="display" style="font-size:24px;margin:0">${up ? 'Create your account' : 'Sign in'}</h2>
        ${up ? `<div class="field"><label class="label" for="name">Your name</label><input id="name" autocomplete="name" required></div>` : ''}
        <div class="field"><label class="label" for="email">Email</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="field"><label class="label" for="pw">Password</label><input id="pw" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="6" required></div>
        <div class="err" id="err" role="alert"></div>
        <button class="btn" type="submit">${up ? 'Create account' : 'Sign in'}</button>
        <button class="link" type="button" data-go="${up ? '#/signin' : '#/signup'}">${up ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
      </form>`);
  }

  function screenSetup() {
    return shell(`
      <form class="page" id="setupForm">
        ${S.address ? `<button class="round flat" type="button" data-go="#/home" aria-label="Back">${svg.back}</button>` : ''}
        <div style="display:flex;flex-direction:column;gap:6px">
          <h1 style="font-size:30px;line-height:1.1">${S.address ? 'Job details' : 'Hi ' + esc(user.name) + ', where is the site?'}</h1>
          <div class="sub" style="font-size:15px">We book everything around the build at this address.</div>
        </div>
        <div class="field"><label class="label" for="addr">Site address</label><input id="addr" value="${esc(S.address)}" placeholder="e.g. 136 McRoberts Road" required></div>
        <div class="field"><label class="label" for="stage">Current stage</label>
          <select id="stage">${SERVICES.map((s) => `<option${s === S.stage ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
        <div class="err" id="err" role="alert"></div>
        <button class="btn" type="submit" style="margin-top:auto">${S.address ? 'Save' : 'Continue'}</button>
      </form>`);
  }

  function mapSvg(h, extra) {
    return `<svg viewBox="0 0 390 ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="390" height="${h}" fill="#E8ECE4"/>
      <rect x="0" y="0" width="160" height="150" fill="#DCE3D4"/>
      <rect x="240" y="${h - 180}" width="150" height="180" fill="#DCE3D4"/>
      <path d="M0 ${Math.round(h * 0.6)} H390" stroke="#fff" stroke-width="14"/>
      <path d="M80 0 V${h}" stroke="#fff" stroke-width="10"/>
      <path d="M320 0 V${h}" stroke="#fff" stroke-width="10"/>
      ${extra || ''}
    </svg>`;
  }

  function screenHome() {
    const q = ui.query.trim().toLowerCase();
    const list = SERVICES.filter((s) => !q || s.toLowerCase().includes(q) || (TITLE[s] || '').toLowerCase().includes(q));
    if (!SERVICES.includes(ui.picked)) ui.picked = 'Transport';
    const pin = '<circle cx="220" cy="130" r="46" fill="#111" fill-opacity="0.08"/><rect x="208" y="118" width="24" height="24" fill="#111"/><rect x="216" y="126" width="8" height="8" fill="#fff"/>';
    return shell(`
      <div class="mapwrap">${mapSvg(300, pin)}
        <div class="topbar">
          <button class="round" data-act="menu" aria-label="Menu">${svg.menu}</button>
          <button class="pill" data-go="#/setup"><span style="width:10px;height:10px;background:#111;flex-shrink:0"></span><span class="t">${esc(S.address)} · Stage: ${esc(S.stage)}</span>${svg.chev}</button>
        </div>
      </div>
      <div class="sheet">
        <div class="grab"></div>
        <h1 style="font-size:26px">What does this job need?</h1>
        <div class="search">${svg.search}<label for="q" class="sr">Search services</label><input id="q" placeholder="Search: crane, consent, power…" value="${esc(ui.query)}" autocomplete="off"></div>
        <button class="feature" data-go="#/materials">
          <div class="ic">${svg.box}</div>
          <div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:700">Materials</span><span style="font-size:13px;color:#D4D4D4">${S.plans ? 'Your plan is priced by stage' : 'Upload your plan, get it priced by stage'}</span></div>
          ${svg.right}
        </button>
        <div class="grid4">${list.map((s) => `<button class="svc${s === ui.picked ? ' on' : ''}" data-pick="${esc(s)}" aria-pressed="${s === ui.picked}">${esc(s)}${S.bookings[s] ? ' ✓' : ''}</button>`).join('') || '<div class="sub" style="grid-column:1/-1">No service matches that.</div>'}</div>
        <div class="card"><div class="dot">${svg.clock}</div><div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><div style="font-size:14px;font-weight:600">Suggested next: ${esc(NEXT[ui.picked])}</div><div class="sub">Based on this job's stage</div></div></div>
        <button class="btn" data-act="choose" style="margin-top:auto">${S.bookings[ui.picked] ? 'View ' + esc(ui.picked.toLowerCase()) : 'Choose ' + esc(ui.picked.toLowerCase())}</button>
        <button class="link" data-go="#/activity">See everything on this job</button>
      </div>
      ${ui.menu ? screenMenu() : ''}`);
  }

  function screenMenu() {
    return `<div class="menu" data-act="closemenu"><nav class="panel" aria-label="Menu">
      <div style="font-family:Archivo;font-weight:800;font-size:22px">${esc(user.name)}</div>
      <div class="sub" style="margin-bottom:12px">${esc(user.email)}</div>
      <button class="item" data-go="#/home">Book a service</button>
      <button class="item" data-go="#/activity">Activity</button>
      <button class="item" data-go="#/materials">Materials</button>
      <button class="item" data-go="#/setup">Job details</button>
      <button class="item" data-act="reset">Reset my test data</button>
      <button class="item" data-act="signout">Sign out</button>
    </nav></div>`;
  }

  function screenOptions() {
    const svc = ui.picked;
    const opts = optionsFor(svc);
    if (ui.option >= opts.length) ui.option = 0;
    const route = '<path d="M80 270 V180 H320 V80" fill="none" stroke="#111" stroke-width="5" stroke-linejoin="round"/><circle cx="80" cy="270" r="9" fill="#111"/><circle cx="80" cy="270" r="3.5" fill="#fff"/><rect x="311" y="71" width="18" height="18" fill="#111"/><rect x="317" y="77" width="6" height="6" fill="#fff"/>';
    return shell(`
      <div class="mapwrap">${mapSvg(300, route)}
        <div class="topbar"><button class="round" data-go="#/home" aria-label="Back">${svg.back}</button></div>
      </div>
      <div class="sheet" style="gap:10px">
        <div class="grab"></div>
        <h1 style="font-size:22px;text-align:center">${esc(TITLE[svc])}</h1>
        <div class="sub" style="text-align:center;margin-top:-6px">${esc(S.address)}</div>
        ${opts.map((o, i) => `<button class="opt${i === ui.option ? ' on' : ''}" data-opt="${i}" aria-pressed="${i === ui.option}">
          <div class="thumb">${svg.truck}</div>
          <div style="flex-grow:1;display:flex;flex-direction:column;gap:2px;text-align:left"><span style="font-size:16px;font-weight:700">${esc(o.name)}</span><span class="sub">${esc(o.when)}</span><span class="sub">${esc(o.detail)}</span></div>
          <span style="font-size:16px;font-weight:700">[PRICE]</span></button>`).join('')}
        <div style="display:flex;align-items:center;gap:10px;padding:10px 4px;font-size:14px;border-top:1px solid #E5E5E5">${svg.card}<span style="font-weight:600">Paragon trade account</span><span class="sub" style="margin-left:auto;text-align:right">Permits + checks included</span></div>
        <button class="btn" data-act="book" style="margin-top:auto">Book ${esc(opts[ui.option].name.toLowerCase())}</button>
      </div>`);
  }

  function screenLive() {
    const svc = ui.picked === 'Crane' ? 'Crane' : 'Transport';
    const b = S.bookings[svc];
    if (!b) return screenNothing(svc);
    const p = progress(b);
    const left = Math.max(0, Math.ceil(LIVE_MINUTES * (1 - p)));
    const eta = b.at + LIVE_MINUTES * 60000;
    const tx = 80 + Math.round(p * 240);
    const truck = `<path d="M80 270 V180 H320 V80" fill="none" stroke="#9CA3AF" stroke-width="5" stroke-linejoin="round"/><rect x="311" y="71" width="18" height="18" fill="#111"/><rect x="317" y="77" width="6" height="6" fill="#fff"/><rect x="${tx - 20}" y="168" width="40" height="24" rx="4" fill="#111"/><rect x="${tx - 16}" y="172" width="22" height="16" fill="#fff"/>`;
    return shell(`
      <div class="mapwrap">${mapSvg(300, truck)}
        <div class="topbar"><button class="round" data-go="#/activity" aria-label="Back">${svg.back}</button></div>
      </div>
      <div class="sheet">
        <div class="grab"></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
          <h1 style="font-size:22px">${p >= 1 ? (svc === 'Crane' ? 'Crane on site' : 'House arrived') : (svc === 'Crane' ? 'Crane arriving ' : 'House arriving ') + fmtTime(eta)}</h1>
          <div style="font-size:14px;font-weight:600;white-space:nowrap">${p >= 1 ? 'Done' : left + ' min'}</div>
        </div>
        <div class="bar"><div style="width:${Math.round(p * 100)}%"></div></div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="dot" style="width:52px;height:52px;border-radius:26px">[AB]</div>
          <div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><div style="font-size:16px;font-weight:700">${svc === 'Crane' ? '[CRANE COMPANY]' : '[TRANSPORT COMPANY]'}</div><div class="sub">${esc(b.option)} · Driver [NAME]</div></div>
          <div style="padding:6px 10px;border-radius:8px;background:#EEE;font-size:13px;font-weight:700">[REGO]</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button class="btn ghost" style="height:48px;border-radius:24px;font-size:15px;gap:8px" data-act="call">${svg.phone}Call driver</button>
          <button class="btn ghost" style="height:48px;border-radius:24px;font-size:15px;gap:8px" data-act="share">${svg.share}Share</button>
        </div>
        <div class="rows">
          <div class="row"><span>Overdimension permit</span><span class="okc">Approved</span></div>
          <div class="row"><span>Booked</span><span>${fmtDate(b.at)} · ${fmtTime(b.at)}</span></div>
          <div class="row"><span>Site</span><span>${esc(S.address)}</span></div>
        </div>
        <button class="link" data-go="#/activity" style="margin-top:auto">See everything on this job</button>
      </div>`);
  }

  function screenConsent() {
    const b = S.bookings.Consent;
    if (!b) return screenNothing('Consent');
    const day = consentDay(b);
    const issued = day >= 20;
    return shell(`
      <div class="page">
        <button class="round flat" data-go="#/activity" aria-label="Back">${svg.back}</button>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div class="label">Building consent · ${esc(S.address)}</div>
          <h1 style="font-size:28px;line-height:1.1">${issued ? 'Consent issued' : 'With council · day ' + day + ' of 20'}</h1>
          <div class="sub" style="font-size:14px">${issued ? 'Ready to book piles' : 'Expected decision by ' + new Date(b.at + 20 * 86400000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</div>
        </div>
        <div class="days">${Array.from({ length: 20 }, (_, i) => `<div class="${i < day ? 'on' : ''}"></div>`).join('')}</div>
        <div class="card soft"><div class="dot" style="background:#111;color:#fff;width:48px;height:48px;border-radius:24px">[AB]</div>
          <div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><div style="font-size:15px;font-weight:700">[CONSENT MANAGER NAME]</div><div class="sub">Your consent handler · ${esc(b.option)}</div></div>
          <button class="round" style="width:44px;height:44px;box-shadow:none" data-act="message" aria-label="Message">${svg.msg}</button></div>
        <div class="rows" style="border-top:none">
          <div class="row" style="justify-content:flex-start;gap:14px">${svg.tick()}<span style="flex-grow:1">Consent job opened</span><span class="sub">${fmtDate(b.at)}</span></div>
          <div class="row" style="justify-content:flex-start;gap:14px">${day >= 1 ? svg.tick() : '<span style="width:20px;height:20px;border-radius:10px;border:2px solid #111;flex-shrink:0"></span>'}<span style="flex-grow:1">Plans, geotech and engineering lodged</span></div>
          <div class="row" style="justify-content:flex-start;gap:14px">${issued ? svg.tick() : '<span style="width:20px;height:20px;border-radius:10px;border:2px solid #111;flex-shrink:0"></span>'}<span style="flex-grow:1;font-weight:600">Consent issued, then we book the piles</span></div>
        </div>
        <div class="card" style="margin-top:auto;font-size:14px">You don't need to do anything. We'll ping you if council needs a decision from you.</div>
      </div>`);
  }

  function screenNothing(svc) {
    return shell(`<div class="page"><button class="round flat" data-go="#/home" aria-label="Back">${svg.back}</button>
      <h1 style="font-size:26px">${esc(svc)} isn't booked yet</h1><button class="btn" data-pick-go="${esc(svc)}">Book ${esc(svc.toLowerCase())}</button></div>`);
  }

  function screenActivity() {
    const tabs = ['This job', 'Bookings', 'Invoices'];
    const done = SERVICES.filter((s) => ['done'].includes(serviceStatus(s).cls)).length;
    let body = '';
    if (ui.tab === 0) {
      body = `<div class="label" style="padding:8px 0">${esc(S.address)} · ${done} of ${SERVICES.length} done</div>` +
        SERVICES.map((s) => {
          const st = serviceStatus(s); const b = S.bookings[s];
          return `<button class="act" data-row="${esc(s)}"><div class="ic">${ICON[s]}</div><div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">${esc(TITLE[s])}</span><span class="sub">${b ? esc(b.option) + ' · ' + fmtDate(b.at) : 'Tap to book'}</span></div><span class="status ${st.cls}">${st.text}</span></button>`;
        }).join('');
    } else if (ui.tab === 1) {
      const all = Object.entries(S.bookings).map(([k, v]) => ({ k, ...v }))
        .concat(S.deliveries.map((d) => ({ k: 'Materials · ' + d.stage, option: d.slot, at: d.at })))
        .sort((a, b) => b.at - a.at);
      body = all.length ? all.map((b) => `<div class="act" style="cursor:default"><div class="ic">${ICON[b.k] || 'MAT'}</div><div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">${esc(b.k)}</span><span class="sub">${esc(b.option)}</span></div><span class="sub">${fmtDate(b.at)} ${fmtTime(b.at)}</span></div>`).join('')
        : '<div class="sub" style="padding:16px 0">Nothing booked yet.</div>';
    } else {
      body = '<div class="sub" style="padding:16px 0">No invoices yet. Everything goes on your trade account.</div>';
    }
    return shell(`
      <div class="page" style="gap:12px">
        <div style="display:flex;align-items:center;gap:10px"><button class="round flat" data-go="#/home" aria-label="Back">${svg.back}</button><h1 style="font-size:30px">Activity</h1></div>
        <div class="tabs" role="tablist">${tabs.map((t, i) => `<button class="chipbtn${i === ui.tab ? ' on' : ''}" role="tab" aria-selected="${i === ui.tab}" data-tab="${i}">${t}</button>`).join('')}</div>
        <div style="display:flex;flex-direction:column;flex-grow:1">${body}</div>
        <button class="btn" data-go="#/home">Book something else</button>
      </div>`);
  }

  function screenUpload() {
    const p = S.plans;
    return shell(`
      <div class="page" style="gap:18px">
        <button class="round flat" data-go="#/home" aria-label="Back">${svg.back}</button>
        <div style="display:flex;flex-direction:column;gap:6px"><h1 style="font-size:30px;line-height:1.1">Upload your plans</h1>
          <div class="sub" style="font-size:15px">We price every material, split into build stages. You order each stage when you're ready.</div></div>
        <input type="file" id="planFile" class="sr" accept=".pdf,.dwg,image/*" multiple>
        ${!p ? `<label for="planFile" class="drop"><div class="ic">${svg.upload}</div><span style="font-size:17px;font-weight:700">Tap to upload plans</span><span class="sub">PDF, DWG or photos · as many pages as you like</span></label>`
        : `<div class="note" style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:16px">
            <div style="display:flex;align-items:center;gap:12px"><div style="width:44px;height:52px;border-radius:6px;background:#fff;border:1px solid #D4D4D4;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${esc(p.ext)}</div>
              <div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:700;overflow-wrap:anywhere">${esc(p.name)}</span><span class="sub">${p.count} file${p.count > 1 ? 's' : ''} · ${(p.size / 1048576).toFixed(1)} MB · ${fmtDate(p.at)}</span></div>${svg.tick()}</div>
            <div style="height:1px;background:#E5E5E5"></div>
            <div style="display:flex;gap:10px;align-items:center;font-size:14px">${svg.tick()}Plans received</div>
            <div style="display:flex;gap:10px;align-items:center;font-size:14px">${svg.tick()}Split into ${STAGES.length} stages</div>
            <label for="planFile" class="link" style="text-align:left;padding:0">Replace plans</label></div>`}
        <div class="field"><label class="label" for="deliverTo">Deliver to</label><input id="deliverTo" value="${esc(p && p.deliverTo || S.address)}"></div>
        <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">
          ${p ? '<button class="btn" data-go="#/materials/stages">See my price</button>' : '<button class="btn" disabled>Upload plans to get a price</button>'}
          <div class="sub" style="text-align:center">Price back within [TURNAROUND]</div>
        </div>
      </div>`);
  }

  function screenStages() {
    if (!S.plans) return screenUpload();
    return shell(`
      <div class="page" style="gap:12px">
        <button class="round flat" data-go="#/materials" aria-label="Back">${svg.back}</button>
        <div><div class="label">${esc(S.address)} · Materials</div><h1 style="font-size:28px">Priced by stage</h1></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 14px;border-radius:12px;background:#F5F5F5"><span class="sub" style="font-size:14px">Whole house</span><span class="display" style="font-size:22px">[TOTAL]</span></div>
        <div style="display:flex;flex-direction:column;flex-grow:1">
          ${STAGES.map((st, i) => {
            const s = S.stages[i];
            const right = s === 'delivered' ? '<span class="status done">Delivered</span>'
              : s === 'ready' ? `<button class="btn" style="height:44px;width:auto;padding:0 16px;border-radius:22px;font-size:14px" data-deliver="${i}">Deliver</button>`
              : '<span style="font-size:14px;font-weight:700">[PRICE]</span>';
            return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #E5E5E5"><div class="dot" style="width:32px;height:32px;font-size:14px">${i + 1}</div><div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:700">${esc(st[0])}</span><span class="sub">${esc(st[1])}</span></div>${right}</div>`;
          }).join('')}
        </div>
        <div class="sub" style="text-align:center">Prices held for [X] days · pay per stage on your trade account</div>
      </div>`);
  }

  function screenDeliver(i) {
    const stage = STAGES[i];
    if (!stage || !S.plans) return screenStages();
    const sent = S.stages[i] === 'delivered';
    const slots = [
      { name: 'Tomorrow morning', when: dayLabel(1) + ' · 7–9am, before the crew starts', price: 'Included' },
      { name: 'Pick a day', when: 'Choose a date and window', price: 'Included' },
      { name: 'Today', when: 'Next truck, ~3 hours', price: '+[FEE]' }
    ];
    const d = S.deliveries.find((x) => x.stage === stage[0]);
    const route = `<path d="M90 270 V180 H310 V80" fill="none" stroke="#111" stroke-width="5" stroke-linejoin="round"/><circle cx="90" cy="270" r="9" fill="#111"/><circle cx="90" cy="270" r="3.5" fill="#fff"/><rect x="301" y="71" width="18" height="18" fill="#111"/><rect x="307" y="77" width="6" height="6" fill="#fff"/>${sent ? '<rect x="160" y="168" width="40" height="24" rx="4" fill="#111"/>' : ''}`;
    return shell(`
      <div class="mapwrap">${mapSvg(300, route)}
        <div class="topbar"><button class="round" data-go="#/materials/stages" aria-label="Back">${svg.back}</button></div>
      </div>
      <div class="sheet" style="gap:12px">
        <div class="grab"></div>
        ${!sent ? `
          <h1 style="font-size:22px;text-align:center">Deliver stage ${i + 1} · ${esc(stage[0])}</h1>
          <div class="sub" style="text-align:center;margin-top:-6px">Everything for this stage, one drop · ${esc(S.plans.deliverTo || S.address)}</div>
          ${slots.map((o, k) => `<button class="opt${k === ui.slot ? ' on' : ''}" data-slot="${k}" aria-pressed="${k === ui.slot}"><div style="flex-grow:1;display:flex;flex-direction:column;gap:2px;text-align:left"><span style="font-size:16px;font-weight:700">${esc(o.name)}</span><span class="sub">${esc(o.when)}</span></div><span style="font-size:15px;font-weight:700">${esc(o.price)}</span></button>`).join('')}
          ${ui.slot === 1 ? `<div class="field"><label class="label" for="pickDay">Delivery day</label><input id="pickDay" type="date" min="${new Date().toISOString().slice(0, 10)}"></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:12px 4px 0;border-top:1px solid #E5E5E5;font-size:15px"><span>Stage ${i + 1} materials</span><span style="font-weight:700">[PRICE]</span></div>
          <button class="btn" data-send="${i}" style="margin-top:auto">Deliver ${esc(slots[ui.slot].name.toLowerCase())}</button>`
        : `
          <h1 style="font-size:22px">${esc(stage[0])} stage booked</h1>
          <div class="sub">${esc(d ? d.slot : '')}</div>
          <div class="bar"><div style="width:35%"></div></div>
          <div class="rows">
            <div class="row"><span>${esc(stage[1])}</span><span class="okc">Loaded</span></div>
            <div class="row"><span>Truck with HIAB</span><span style="font-weight:700">Scheduled</span></div>
          </div>
          <div class="note">Driver photographs the drop. Anything short gets credited automatically.</div>
          <button class="btn" data-go="#/materials/stages" style="margin-top:auto">Done</button>`}
      </div>`);
  }

  // ---------- Router ----------
  async function render() {
    clearInterval(tickTimer);
    const h = location.hash || '#/';
    if (!user) {
      $app.innerHTML = screenWelcome(h === '#/signin' ? 'signin' : 'signup');
      return;
    }
    if (!S.address && h !== '#/setup') { location.hash = '#/setup'; return; }
    let html;
    if (h === '#/setup') html = screenSetup();
    else if (h === '#/options') html = screenOptions();
    else if (h === '#/live') { html = screenLive(); tickTimer = setInterval(render, 5000); }
    else if (h === '#/consent') html = screenConsent();
    else if (h === '#/activity') html = screenActivity();
    else if (h === '#/materials') html = screenUpload();
    else if (h === '#/materials/stages') html = screenStages();
    else if (h.startsWith('#/materials/deliver/')) html = screenDeliver(Number(h.split('/').pop()));
    else html = screenHome();
    const focused = document.activeElement && document.activeElement.id;
    $app.innerHTML = html;
    if (focused === 'q') { const q = document.getElementById('q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  function openService(svc) {
    ui.picked = svc; ui.option = 0;
    if (!S.bookings[svc]) return go('#/options');
    if (svc === 'Transport' || svc === 'Crane') return go('#/live');
    if (svc === 'Consent') return go('#/consent');
    go('#/activity');
  }

  // ---------- Events ----------
  $app.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-go],[data-act],[data-pick],[data-pick-go],[data-opt],[data-tab],[data-row],[data-deliver],[data-slot],[data-send]');
    if (!t) return;
    const d = t.dataset;
    if (d.act === 'closemenu' && e.target !== t) return; // clicks inside the panel
    if (d.go) { ui.menu = false; return go(d.go); }
    if (d.pick) { ui.picked = d.pick; return render(); }
    if (d.pickGo) { ui.picked = d.pickGo; ui.option = 0; return go('#/options'); }
    if (d.opt) { ui.option = Number(d.opt); return render(); }
    if (d.tab) { ui.tab = Number(d.tab); return render(); }
    if (d.row) return openService(d.row);
    if (d.deliver) { ui.slot = 0; return go('#/materials/deliver/' + d.deliver); }
    if (d.slot) { ui.slot = Number(d.slot); return render(); }
    if (d.send) {
      const i = Number(d.send);
      let slot = ['Tomorrow morning · ' + dayLabel(1) + ' 7–9am', '', 'Today · next truck'][ui.slot];
      if (ui.slot === 1) {
        const v = document.getElementById('pickDay').value;
        if (!v) return toast('Pick a delivery day first.');
        slot = new Date(v + 'T00:00').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      S.stages[i] = 'delivered';
      if (i + 1 < STAGES.length && S.stages[i + 1] === 'later') S.stages[i + 1] = 'ready';
      S.deliveries.push({ stage: STAGES[i][0], slot, at: Date.now() });
      await commit();
      return toast(STAGES[i][0] + ' stage booked for delivery.');
    }
    switch (d.act) {
      case 'menu': ui.menu = true; return render();
      case 'closemenu': ui.menu = false; return render();
      case 'choose': return openService(ui.picked);
      case 'book': {
        const o = optionsFor(ui.picked)[ui.option];
        S.bookings[ui.picked] = { option: o.name, when: o.when, at: Date.now() };
        await commit();
        toast(TITLE[ui.picked] + ' booked.');
        return openService(ui.picked);
      }
      case 'call': return toast('Driver calling comes once transport partners are connected.');
      case 'message': return toast('Messaging comes once consent handlers are connected.');
      case 'share': {
        const text = 'Track the delivery to ' + S.address + ' on New Company';
        if (navigator.share) { try { await navigator.share({ title: 'New Company', text, url: location.href.split('#')[0] }); } catch (err) { /* cancelled */ } }
        else { try { await navigator.clipboard.writeText(location.href.split('#')[0]); toast('Link copied.'); } catch (err) { toast(text); } }
        return;
      }
      case 'reset': S = Object.assign(freshState(), { address: S.address, stage: S.stage }); ui.menu = false; await commit(); return toast('Test data cleared.');
      case 'signout': ui.menu = false; await Auth.signOut(); user = null; S = freshState(); return go('#/signin');
    }
  });

  $app.addEventListener('input', (e) => {
    if (e.target.id === 'q') { ui.query = e.target.value; render(); }
  });

  $app.addEventListener('change', async (e) => {
    if (e.target.id === 'planFile' && e.target.files.length) {
      const files = Array.from(e.target.files);
      const first = files[0];
      const deliverTo = (document.getElementById('deliverTo') || {}).value || S.address;
      S.plans = { name: first.name, ext: (first.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4), size: files.reduce((a, f) => a + f.size, 0), count: files.length, at: Date.now(), deliverTo };
      if (S.stages.every((s) => s === 'later')) S.stages[0] = 'ready';
      await commit();
      toast('Plans uploaded.');
    }
    if (e.target.id === 'deliverTo' && S.plans) { S.plans.deliverTo = e.target.value; await Data.save(user, S); }
  });

  $app.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('err');
    const btn = e.target.querySelector('button[type=submit]');
    if (e.target.id === 'authForm') {
      const nameEl = document.getElementById('name');
      const name = nameEl ? nameEl.value.trim() : '';
      const email = document.getElementById('email').value.trim().toLowerCase();
      const pw = document.getElementById('pw').value;
      if (nameEl && !name) return (err.textContent = 'Enter your name.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return (err.textContent = 'Enter a valid email.');
      if (pw.length < 6) return (err.textContent = 'Password needs at least 6 characters.');
      btn.disabled = true; err.textContent = '';
      try {
        if (nameEl) {
          const r = await Auth.signUp(name, email, pw);
          if (r.confirm) { btn.disabled = false; err.style.color = '#15803D'; err.textContent = 'Check your email to confirm your account, then sign in.'; return; }
        } else {
          await Auth.signIn(email, pw);
        }
        await boot();
      } catch (ex) {
        btn.disabled = false;
        err.textContent = ex.message || 'Something went wrong. Try again.';
      }
    }
    if (e.target.id === 'setupForm') {
      const addr = document.getElementById('addr').value.trim();
      if (!addr) return (err.textContent = 'Enter the site address.');
      S.address = addr; S.stage = document.getElementById('stage').value; ui.picked = S.stage;
      await Data.save(user, S);
      go('#/home');
    }
  });

  window.addEventListener('hashchange', render);

  async function boot() {
    user = await Auth.current();
    S = user ? await Data.load(user) : freshState();
    if (user && S.stage && SERVICES.includes(S.stage)) ui.picked = S.stage;
    if (user && ['#/', '', '#/signin', '#/signup'].includes(location.hash)) { location.hash = S.address ? '#/home' : '#/setup'; return; }
    render();
  }

  if (sb) sb.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_IN' && !user) boot(); });
  boot();
})();
