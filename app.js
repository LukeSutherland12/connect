(function () {
  'use strict';

  // =====================================================================
  // Content
  // =====================================================================
  const SERVICES = [
    { k: 'Consent', title: 'Building consent', stage: 0, icon: 'BC' },
    { k: 'Site prep', title: 'Site prep', stage: 0, icon: 'SITE' },
    { k: 'Foundations', title: 'Foundations + piles', stage: 0, icon: 'PILE' },
    { k: 'Transport', title: 'Transport the house', stage: 1, icon: 'MOVE' },
    { k: 'Crane', title: 'Crane + set-down', stage: 1, icon: 'CRN' },
    { k: 'Roofing', title: 'Roofing', stage: 1, icon: 'ROOF' },
    { k: 'Power', title: 'Power connection', stage: 2, icon: 'PWR' },
    { k: 'Plumbing', title: 'Plumbing', stage: 2, icon: 'PLB' },
    { k: 'Drainage', title: 'Drainage + septic', stage: 2, icon: 'DRN' },
    { k: 'Flooring', title: 'Flooring install', stage: 3, icon: 'FLR' },
    { k: 'Painting', title: 'Painting', stage: 3, icon: 'PNT' },
    { k: 'Decks', title: 'Decks + steps', stage: 3, icon: 'DECK' },
    { k: 'Inspections', title: 'Final inspection + CCC', stage: 3, icon: 'CCC' }
  ];
  const SVC = Object.fromEntries(SERVICES.map((s) => [s.k, s]));
  const STAGES = ['Foundations & site prep', 'Delivery & set-down', 'Services connection', 'Finishing & handover'];
  const MAT = [
    ['Floor', 'Bearers, joists, flooring, fixings'],
    ['Frame', 'Wall frames, trusses, bracing'],
    ['Roof + wrap', 'Roofing, flashings, building wrap'],
    ['Cladding + joinery', 'Cladding, windows, doors'],
    ['Linings', 'Insulation, GIB, stopping'],
    ['Fit-out', 'Kitchen, bathroom, trims, paint']
  ];
  const WINDOWS = ['7–9am', '9–12pm', '12–3pm', '3–5pm'];
  const ROLES = ['Customer', 'Builder', 'Contractor', 'Supplier', 'Consent manager', 'Connect team'];
  const COLORS = ['#2563EB', '#EA580C', '#059669', '#9333EA', '#DB2777', '#0891B2', '#B45309', '#DC2626', '#4F46E5', '#4D7C0F', '#0F766E', '#BE185D', '#7C3AED', '#C2410C'];

  function optionsFor(k) {
    if (k === 'Transport') return [
      ['Standard move', 'Truck, permit, 1 pilot · depart 5:00am'],
      ['Move + crane', 'Crane waiting on arrival, placed on piles'],
      ['Priority', 'Next available truck and crane']
    ];
    if (k === 'Crane') return [['Crane + set-down', 'Placed on piles, operator + dogman'], ['Priority crane', 'Next available crane']];
    if (k === 'Consent') return [['Full consent handling', 'We lodge, answer council and chase it'], ['Lodge only', 'We lodge, you handle council questions']];
    return [['Standard', 'Next available crew'], ['Priority', 'Earliest possible slot']];
  }

  // =====================================================================
  // Helpers
  // =====================================================================
  const $app = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).slice(0, 18);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const today = () => iso();
  const addDays = (s, n) => { const d = s ? new Date(s + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const daysUntil = (s) => Math.round((new Date(s + 'T00:00') - new Date(today() + 'T00:00')) / 86400000);
  const mondayOf = (d) => { d = d ? new Date(d) : new Date(); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); };
  const fmtD = (s) => s ? new Date(s + 'T00:00').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const fmtTs = (ts) => new Date(ts).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
  const nzd = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 });
  const $ = (n) => nzd.format(Math.round(Number(n) || 0));
  const num = (v) => { const n = parseFloat(String(v || '').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
  const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const first = (n) => String(n || '').split(/\s+/)[0];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } }
  };
  async function sha256(t) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  const I = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    jobs: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    todo: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c2.8 0 5 2.2 5 5"/>',
    more: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    upload: '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>',
    truck: '<path d="M1 6h13v10H1z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="5.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
    star: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><path d="M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const ico = (n, size, color, sw) => `<svg width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="${color || 'currentColor'}" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
  const lockup = (light) => `<a href="#/" class="lockup${light ? ' light' : ''}" aria-label="Paragon Connect home"><img src="assets/${light ? 'logo.png' : 'logo-white.png'}" alt="Paragon Portables"><span class="rule"></span><span class="word">${ico('star', 15, '#ebbd06')}Connect</span><span class="by">Owned by Paragon Portables</span></a>`;

  // =====================================================================
  // Auth + storage
  // =====================================================================
  const cfg = window.APP_CONFIG || {};
  const sb = (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const SHARED = !!sb;

  const Auth = {
    async current() {
      if (sb) {
        const { data } = await sb.auth.getSession();
        const u = data.session && data.session.user;
        return u ? { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || u.email.split('@')[0] } : null;
      }
      const email = store.get('cx_session', null);
      const u = email && store.get('cx_users', {})[email];
      return u ? { id: u.id, email, name: u.name } : null;
    },
    async signUp(name, email, pw) {
      if (sb) {
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { name } } });
        if (error) throw error;
        return data.session ? {} : { confirm: true };
      }
      const users = store.get('cx_users', {});
      if (users[email]) throw new Error('That email already has an account. Sign in instead.');
      const salt = uid();
      users[email] = { id: uid(), name, salt, hash: await sha256(salt + pw) };
      store.set('cx_users', users); store.set('cx_session', email);
      return {};
    },
    async signIn(email, pw) {
      if (sb) { const { error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) throw error; return; }
      const u = store.get('cx_users', {})[email];
      if (!u || u.hash !== await sha256(u.salt + pw)) throw new Error('Email or password is wrong.');
      store.set('cx_session', email);
    },
    async signOut() { if (sb) await sb.auth.signOut(); else store.del('cx_session'); }
  };

  // Workspace: one shared record for the whole company (shared mode), or one per browser (test mode).
  const WS_KEY = 'cx_workspace';
  const Data = {
    async load() {
      if (sb) {
        const { data, error } = await sb.from('workspace').select('data').eq('id', 'main').maybeSingle();
        if (error) console.warn('[Connect] load', error);
        return (data && data.data) || null;
      }
      return store.get(WS_KEY, null);
    },
    async save(w) {
      if (sb) {
        const { error } = await sb.from('workspace').upsert({ id: 'main', data: w, updated_at: new Date().toISOString() });
        if (error) { console.warn('[Connect] save', error); toast('Could not save. Check your connection.'); }
        return;
      }
      if (!store.set(WS_KEY, w)) toast('This browser is out of storage space.');
    }
  };

  // Photos live apart from the workspace so it stays small.
  const Photos = {
    cache: {},
    _db: null,
    db() {
      if (this._db) return this._db;
      this._db = new Promise((res, rej) => {
        const r = indexedDB.open('connect-photos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('p');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      return this._db;
    },
    async put(id, data) {
      this.cache[id] = data;
      if (sb) { const { error } = await sb.from('photos').insert({ id, data }); if (error) throw error; return; }
      const db = await this.db();
      await new Promise((res, rej) => { const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(data, id); t.oncomplete = res; t.onerror = () => rej(t.error); });
    },
    async get(id) {
      if (this.cache[id]) return this.cache[id];
      let v = null;
      if (sb) { const { data } = await sb.from('photos').select('data').eq('id', id).maybeSingle(); v = data && data.data; }
      else {
        const db = await this.db();
        v = await new Promise((res) => { const r = db.transaction('p').objectStore('p').get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
      }
      if (v) this.cache[id] = v;
      return v;
    }
  };
  async function compress(file) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.78);
  }

  async function geocode(address) {
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=nz&q=' + encodeURIComponent(address));
      const j = await r.json();
      if (j && j[0]) return { lat: +j[0].lat, lng: +j[0].lon };
    } catch (e) { console.warn('[Connect] geocode', e); }
    return null;
  }

  // =====================================================================
  // State
  // =====================================================================
  let user = null;
  let W = null;
  const ui = { as: null, pick: null, opt: 0, todoFilter: 'all', roleFilter: 'All', q: '', photo: null, jobFilter: 'active', urgent: false, schedule: null };
  let mapInst = null;

  const blankWs = () => ({ v: 2, people: [], jobs: [], createdAt: Date.now() });
  async function commit(msg) { await Data.save(W); render(); if (msg) toast(msg); }
  const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

  const person = (id) => W.people.find((p) => p.id === id);
  const job = (id) => W.jobs.find((j) => j.id === id);
  const me = () => W.people.find((p) => p.email && user && p.email.toLowerCase() === user.email.toLowerCase());
  const viewer = () => (ui.as && person(ui.as)) || me();
  const isTeam = () => { const v = viewer(); return !v || v.role === 'Connect team'; };
  const teamLead = () => me() || W.people.find((p) => p.role === 'Connect team');
  const nextColor = () => COLORS[W.people.length % COLORS.length];

  function ensureMe() {
    if (!me()) W.people.unshift({ id: uid(), name: user.name, role: 'Connect team', company: 'Paragon Connect', phone: '', email: user.email, color: '#475569', notes: '' });
  }

  function involved(j, pid) {
    if (j.customerId === pid || j.builderId === pid) return true;
    return Object.values(j.services || {}).some((s) => s.personId === pid);
  }
  function visibleJobs() {
    if (isTeam()) return W.jobs;
    const v = viewer();
    return W.jobs.filter((j) => involved(j, v.id));
  }

  // ---------- job maths ----------
  function pct(j) {
    if (!j.scope.length) return 0;
    return Math.round((j.scope.filter((k) => j.services[k] && j.services[k].status === 'done').length / j.scope.length) * 100);
  }
  function stagePct(j, i) {
    const ks = j.scope.filter((k) => SVC[k].stage === i);
    if (!ks.length) return null;
    return Math.round((ks.filter((k) => j.services[k] && j.services[k].status === 'done').length / ks.length) * 100);
  }
  function svcState(j, k) {
    const s = j.services[k];
    if (!s) return { t: 'To book', c: '' };
    if (s.status === 'done') return { t: 'Done', c: 'ok' };
    if (s.date && s.date < today()) return { t: 'Confirm done', c: 'err' };
    if (s.date && s.date === today()) return { t: 'Today', c: 'mus' };
    return { t: 'Booked', c: 'dark' };
  }
  function nextStep(j) {
    for (const k of j.scope) {
      const s = j.services[k];
      if (!s) return 'Book ' + SVC[k].title.toLowerCase();
      if (s.status !== 'done') return SVC[k].title + (s.date ? ' · ' + fmtD(s.date) : '');
    }
    return 'Ready for handover';
  }
  function money(j) {
    const ex = j.extras || [];
    const approved = ex.filter((e) => e.status === 'approved').reduce((a, e) => a + e.amount, 0);
    const pending = ex.filter((e) => e.status === 'pending').reduce((a, e) => a + e.amount, 0);
    const total = (j.contract || 0) + approved;
    const paid = (j.payments || []).reduce((a, p) => a + p.amount, 0);
    const svcCost = Object.values(j.services).reduce((a, s) => a + (s.cost || 0), 0);
    const matCost = (j.deliveries || []).reduce((a, d) => a + (d.cost || 0), 0);
    const costs = svcCost + matCost;
    const earned = Math.round(total * pct(j) / 100);
    return { approved, pending, total, paid, owing: total - paid, costs, svcCost, matCost, margin: total - costs, dueNow: Math.max(0, earned - paid), earned };
  }

  // ---------- automatic to-dos ----------
  function autoTasks(j) {
    const out = [];
    const t = today(); const wk = mondayOf();
    const lead = teamLead();
    const cust = person(j.customerId);
    const add = (key, pid, text, due, kind) => {
      if (j.done[key]) return;
      out.push({ key, jobId: j.id, personId: pid || (lead && lead.id), text, due: due || null, kind, overdue: !!(due && due < t) });
    };
    const firstUnbooked = j.scope.find((k) => !j.services[k]);
    if (firstUnbooked) add('book:' + firstUnbooked, lead && lead.id, 'Book ' + SVC[firstUnbooked].title.toLowerCase(), null, 'book');
    j.scope.forEach((k) => {
      const s = j.services[k];
      if (!s || s.status === 'done') return;
      if (k === 'Consent') add('consent:' + wk, s.personId, 'Chase council on the building consent', null, 'consent');
      if (s.date && s.date < t) add('confirm:' + k + ':' + s.date, lead && lead.id, 'Confirm ' + SVC[k].title.toLowerCase() + ' is finished', s.date, 'confirm');
      else if (s.date && daysUntil(s.date) <= 7 && k !== 'Consent') add('onsite:' + k + ':' + s.date, s.personId, SVC[k].title + ' on site ' + fmtD(s.date), s.date, 'onsite');
    });
    (j.extras || []).filter((e) => e.status === 'pending').forEach((e) => add('extra:' + e.id, j.customerId, 'Approve extra: ' + e.desc + ' (' + $(e.amount) + ')', null, 'extra'));
    const m = money(j);
    if (m.dueNow > 0) add('pay:' + wk + ':' + m.dueNow, j.customerId, 'Pay ' + $(m.dueNow) + ' for work done to date', addDays(wk, 7), 'pay');
    (j.deliveries || []).filter((d) => d.status === 'scheduled').forEach((d) => {
      if (d.urgent) add('urgent:' + d.id, lead && lead.id, 'URGENT delivery: ' + d.items, d.date, 'urgent');
      if (daysUntil(d.date) <= 3) add('recv:' + d.id, j.builderId, 'Receive ' + (d.urgent ? 'urgent' : d.items.toLowerCase()) + ' delivery ' + fmtD(d.date) + ' ' + d.window, d.date, 'deliv');
    });
    const lastPhoto = (j.photos || []).reduce((a, p) => Math.max(a, p.at), 0);
    const started = Object.keys(j.services).length > 0;
    if (started && pct(j) < 100 && Date.now() - lastPhoto > 7 * 86400000) add('photos:' + wk, j.builderId, 'Upload this week\'s progress photos', null, 'photos');
    if (!j.plans) add('plans', j.customerId, 'Upload house plans for materials pricing', null, 'plans');
    const up = (j.updates || []).find((u) => u.weekOf === wk);
    if (up && !up.sent && cust) add('update:' + wk, lead && lead.id, 'Send weekly update to ' + cust.name, null, 'update');
    (j.tasks || []).filter((x) => !x.done).forEach((x) => out.push({ key: 'm:' + x.id, manual: x.id, jobId: j.id, personId: x.personId, text: x.text, due: x.due, kind: 'manual', overdue: !!(x.due && x.due < t) }));
    return out;
  }
  function allTasks() {
    const v = viewer();
    let list = visibleJobs().flatMap(autoTasks).concat((W.tasks || []).filter((x) => !x.done).map((x) => ({ key: 'g:' + x.id, gmanual: x.id, personId: x.personId, text: x.text, due: x.due, kind: 'manual', overdue: !!(x.due && x.due < today()) })));
    if (!isTeam()) list = list.filter((x) => x.personId === v.id);
    return list.sort((a, b) => (b.overdue - a.overdue) || ((a.due || '9') < (b.due || '9') ? -1 : (a.due || '9') > (b.due || '9') ? 1 : 0));
  }

  // ---------- weekly updates ----------
  function buildUpdate(j) {
    const cust = person(j.customerId);
    const m = money(j);
    const wk = mondayOf();
    const lastWk = addDays(wk, -7);
    const doneThisWeek = j.scope.filter((k) => { const s = j.services[k]; return s && s.status === 'done' && s.doneAt && iso(new Date(s.doneAt)) >= lastWk; });
    const coming = j.scope.filter((k) => { const s = j.services[k]; return s && s.status !== 'done' && s.date && daysUntil(s.date) >= 0 && daysUntil(s.date) <= 14; })
      .map((k) => '• ' + SVC[k].title + ' · ' + fmtD(j.services[k].date));
    const dels = (j.deliveries || []).filter((d) => d.status === 'scheduled' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14).map((d) => '• ' + d.items + ' delivery · ' + fmtD(d.date) + ' ' + d.window);
    const needs = autoTasks(j).filter((x) => x.personId === j.customerId).map((x) => '• ' + x.text);
    const lines = [
      'Hi ' + (cust ? first(cust.name) : 'there') + ',',
      '',
      'Here\'s this week on ' + j.address + '.',
      '',
      'PROGRESS: ' + pct(j) + '% complete',
      STAGES.map((s, i) => { const p = stagePct(j, i); return p == null ? null : '• ' + s + ': ' + p + '%'; }).filter(Boolean).join('\n'),
      '',
      'DONE THIS WEEK',
      doneThisWeek.length ? doneThisWeek.map((k) => '• ' + SVC[k].title).join('\n') : '• Work continuing on the current stage',
      '',
      'COMING UP (NEXT 2 WEEKS)',
      coming.concat(dels).join('\n') || '• We\'re booking the next steps and will confirm dates',
      '',
      'WHAT WE NEED FROM YOU',
      needs.join('\n') || '• Nothing right now',
      '',
      'MONEY',
      '• Contract: ' + $(j.contract) + (m.approved ? '\n• Extras approved: ' + $(m.approved) : '') + (m.pending ? '\n• Extras waiting for you: ' + $(m.pending) : ''),
      '• Paid so far: ' + $(m.paid),
      '• Still to pay: ' + $(m.owing),
      '',
      (j.photos || []).length ? 'Latest photos are in your Connect page.' : '',
      'Any questions, just reply.',
      '',
      (teamLead() ? teamLead().name : 'The Connect team') + '\nParagon Connect'
    ];
    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  function ensureUpdates() {
    const wk = mondayOf();
    let changed = false;
    W.jobs.forEach((j) => {
      j.updates = j.updates || [];
      if (pct(j) >= 100 || !j.customerId) return;
      if (!j.updates.some((u) => u.weekOf === wk)) {
        j.updates.unshift({ id: uid(), weekOf: wk, at: Date.now(), text: buildUpdate(j), sent: false });
        changed = true;
      }
    });
    return changed;
  }

  // =====================================================================
  // Example data
  // =====================================================================
  function loadExamples() {
    const P = (name, role, company, trades, extra) => {
      const p = Object.assign({ id: uid(), name, role, company, phone: '021 555 0' + String(100 + W.people.length).slice(-3), email: name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@example.com', color: nextColor(), notes: '', trades: trades || [], example: true }, extra || {});
      W.people.push(p); return p;
    };
    const c1 = P('Aroha Ngata', 'Customer', '');
    const c2 = P('Tom Harris', 'Customer', '');
    const c3 = P('Mei Chen', 'Customer', '');
    const c4 = P('Ravi Patel', 'Customer', '');
    const b1 = P('Mike Brown', 'Builder', 'Example Builders Ltd');
    const b2 = P('Sione Taufa', 'Builder', 'Example Homes');
    const tr = P('Dave Wilson', 'Contractor', 'Example Transport', ['Transport']);
    const cr = P('Kate Young', 'Contractor', 'Example Cranes', ['Crane']);
    const cs = P('Jo Morgan', 'Consent manager', 'Example Consents', ['Consent', 'Inspections']);
    const gw = P('Ben Clark', 'Contractor', 'Example Groundworks', ['Site prep', 'Foundations', 'Decks']);
    const el = P('Priya Shah', 'Contractor', 'Example Electrical', ['Power']);
    const pl = P('Liam Scott', 'Contractor', 'Example Plumbing + Drainage', ['Plumbing', 'Drainage']);
    const rf = P('Hemi Walker', 'Contractor', 'Example Roofing', ['Roofing']);
    const fl = P('Sarah King', 'Contractor', 'Example Flooring', ['Flooring']);
    const pt = P('Josh Reid', 'Contractor', 'Example Painters', ['Painting']);
    P('Carters Rangiora', 'Supplier', 'Materials supplier');
    const who = { Transport: tr, Crane: cr, Consent: cs, Inspections: cs, 'Site prep': gw, Foundations: gw, Decks: gw, Power: el, Plumbing: pl, Drainage: pl, Roofing: rf, Flooring: fl, Painting: pt };
    const all = SERVICES.map((s) => s.k);
    const mk = (name, address, lat, lng, cust, bld, contract, doneUpTo, bookedUpTo, startDaysAgo) => {
      const j = { id: uid(), name, address, lat, lng, customerId: cust.id, builderId: bld.id, contract, scope: all.slice(), services: {}, deliveries: [], extras: [], payments: [], photos: [], updates: [], tasks: [], done: {}, plans: null, createdAt: Date.now() - startDaysAgo * 86400000, example: true };
      all.forEach((k, i) => {
        if (i < doneUpTo) j.services[k] = { status: 'done', option: optionsFor(k)[0][0], date: addDays(null, -startDaysAgo + i * 4), personId: who[k].id, cost: Math.round(contract * 0.045 / 100) * 100, at: j.createdAt, doneAt: Date.now() - (doneUpTo - i) * 3 * 86400000 };
        else if (i < bookedUpTo) j.services[k] = { status: 'booked', option: optionsFor(k)[0][0], date: addDays(null, (i - doneUpTo) * 3 + 1), personId: who[k].id, cost: Math.round(contract * 0.045 / 100) * 100, at: Date.now() };
      });
      W.jobs.push(j); return j;
    };
    const j1 = mk('Ngata · 3 bed', '12 Mill Road, Ohoka', -43.3665, 172.5591, c1, b1, 96000, 8, 10, 60);
    const j2 = mk('Harris · 2 bed', '48 Main North Road, Woodend', -43.3197, 172.6648, c2, b2, 84000, 3, 6, 25);
    const j3 = mk('Chen · 3 bed', '5 Lowes Road, Rolleston', -43.5896, 172.3794, c3, b1, 102000, 12, 13, 95);
    const j4 = mk('Patel · 1 bed', '210 Tram Road, Swannanoa', -43.3755, 172.4911, c4, b2, 58000, 0, 1, 4);
    j1.plans = { name: 'ngata-plans.pdf', ext: 'PDF', size: 4200000, count: 1, at: Date.now() - 50 * 86400000 };
    j3.plans = { name: 'chen-plans.pdf', ext: 'PDF', size: 3900000, count: 1, at: Date.now() - 90 * 86400000 };
    j1.deliveries = [
      { id: uid(), items: 'Floor', date: addDays(null, -30), window: '7–9am', urgent: false, status: 'delivered', cost: 6400, at: Date.now() },
      { id: uid(), items: 'Frame', date: addDays(null, 2), window: '7–9am', urgent: false, status: 'scheduled', cost: 11800, at: Date.now() },
      { id: uid(), items: 'Roof + wrap', date: addDays(null, 9), window: '9–12pm', urgent: false, status: 'scheduled', cost: 7300, at: Date.now() }
    ];
    j2.deliveries = [{ id: uid(), items: 'Joist hangers + 2 boxes of 90mm nails', date: today(), window: 'ASAP', urgent: true, status: 'scheduled', cost: 240, at: Date.now() }];
    j1.extras = [
      { id: uid(), desc: 'Extra 6 m² of deck', amount: 3200, status: 'approved', at: Date.now() - 20 * 86400000 },
      { id: uid(), desc: 'Upgrade to heat pump-ready circuit', amount: 850, status: 'pending', at: Date.now() - 2 * 86400000 }
    ];
    j3.extras = [{ id: uid(), desc: 'Longer driveway culvert', amount: 1900, status: 'approved', at: Date.now() - 40 * 86400000 }];
    j1.payments = [{ id: uid(), amount: 30000, date: addDays(null, -58), note: 'Deposit' }, { id: uid(), amount: 25000, date: addDays(null, -20), note: 'Progress payment' }];
    j2.payments = [{ id: uid(), amount: 25000, date: addDays(null, -24), note: 'Deposit' }];
    j3.payments = [{ id: uid(), amount: 30000, date: addDays(null, -94), note: 'Deposit' }, { id: uid(), amount: 60000, date: addDays(null, -30), note: 'Progress payment' }];
    j4.payments = [{ id: uid(), amount: 15000, date: addDays(null, -3), note: 'Deposit' }];
    ensureUpdates();
  }

  // =====================================================================
  // Small view pieces
  // =====================================================================
  const av = (p, size) => p ? `<span class="av" style="width:${size || 36}px;height:${size || 36}px;background:${esc(p.color)};font-size:${Math.round((size || 36) * 0.36)}px" aria-hidden="true">${esc(initials(p.name))}</span>` : `<span class="av" style="width:${size || 36}px;height:${size || 36}px;background:#bbb">?</span>`;
  const bar = (p, big) => `<div class="bar${big ? ' big' : ''}${p >= 100 ? ' done' : ''}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
  const pill = (t, c) => `<span class="pill ${c || ''}">${esc(t)}</span>`;
  const shortDate = (s) => { const d = new Date(s + 'T00:00'); return `<b>${d.getDate()}</b><span>${d.toLocaleDateString('en-NZ', { month: 'short' })}</span>`; };
  const empty = (msg, action) => `<div class="empty">${msg}${action || ''}</div>`;

  function todoRow(x, showPerson) {
    const p = person(x.personId);
    const j = x.jobId && job(x.jobId);
    return `<div class="todo" style="--c:${esc(p ? p.color : '#999')}">
      <button class="tick" data-act="tick" data-key="${esc(x.key)}" data-job="${esc(x.jobId || '')}" aria-label="Mark done: ${esc(x.text)}"></button>
      <div class="grow">
        <div class="tx">${esc(x.text)}</div>
        <div class="meta">
          ${showPerson && p ? `<a href="#/person/${p.id}" style="color:${esc(p.color)};font-weight:600;text-decoration:none">${esc(p.name)}</a>` : ''}
          ${j ? `<a href="#/job/${j.id}">${esc(j.name)}</a>` : ''}
          ${x.due ? `<span>${x.overdue ? '' : 'Due '}${fmtD(x.due)}</span>` : ''}
          ${x.overdue ? pill('Overdue', 'err') : ''}
          ${x.kind === 'urgent' ? pill('Urgent', 'err') : ''}
        </div>
      </div>
    </div>`;
  }

  function jobRow(j) {
    const p = pct(j);
    const c = person(j.customerId);
    return `<a class="li" href="#/job/${j.id}">
      <div class="grow">
        <div class="row" style="gap:8px"><h3 class="ellip">${esc(j.name)}</h3>${j.example ? pill('Example') : ''}</div>
        <div class="sub ellip">${esc(j.address)}${c ? ' · ' + esc(c.name) : ''}</div>
        <div class="row" style="margin-top:8px;gap:10px"><div class="grow">${bar(p)}</div><span class="pct">${p}%</span></div>
        <div class="sub ellip" style="margin-top:4px">Next: ${esc(nextStep(j))}</div>
      </div>
    </a>`;
  }

  function upcoming(jobs, days) {
    const items = [];
    jobs.forEach((j) => {
      Object.entries(j.services).forEach(([k, s]) => { if (s.status !== 'done' && s.date && daysUntil(s.date) >= 0 && daysUntil(s.date) <= days) items.push({ date: s.date, title: SVC[k].title, j, p: person(s.personId), urgent: false }); });
      (j.deliveries || []).forEach((d) => { if (d.status === 'scheduled' && daysUntil(d.date) >= 0 && daysUntil(d.date) <= days) items.push({ date: d.date, title: (d.urgent ? 'Urgent: ' : 'Delivery: ') + d.items, j, sub: d.window, urgent: d.urgent }); });
    });
    return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.urgent - a.urgent));
  }
  function upcomingList(items) {
    if (!items.length) return empty('Nothing booked in this window.');
    return `<div class="list">${items.map((x) => `<a class="li" href="#/job/${x.j.id}">
      <div class="when${x.urgent ? ' urgent' : x.date === today() ? ' today' : ''}">${shortDate(x.date)}</div>
      <div class="grow"><div style="font-weight:600" class="ellip">${esc(x.title)}</div><div class="sub ellip">${esc(x.j.name)}${x.sub ? ' · ' + esc(x.sub) : ''}${x.p ? ' · ' + esc(x.p.company || x.p.name) : ''}</div></div>
      ${x.p ? av(x.p, 28) : ''}
    </a>`).join('')}</div>`;
  }

  // =====================================================================
  // Pages
  // =====================================================================
  function pageDashboard() {
    const jobs = visibleJobs();
    const active = jobs.filter((j) => pct(j) < 100);
    const tasks = allTasks();
    const overdue = tasks.filter((x) => x.overdue).length;
    const avg = active.length ? Math.round(active.reduce((a, j) => a + pct(j), 0) / active.length) : 0;
    const tot = jobs.reduce((a, j) => { const m = money(j); a.total += m.total; a.paid += m.paid; a.owing += m.owing; a.ex += m.approved; a.pend += m.pending; a.costs += m.costs; return a; }, { total: 0, paid: 0, owing: 0, ex: 0, pend: 0, costs: 0 });
    const v = viewer();
    const hr = new Date().getHours();
    const hello = (hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening') + ', ' + esc(first(v ? v.name : user.name));
    const unsent = isTeam() ? W.jobs.filter((j) => (j.updates || []).some((u) => u.weekOf === mondayOf() && !u.sent)).length : 0;

    if (!W.jobs.length) {
      return `<div class="pagehead"><div><h1>${hello}</h1><div class="sub">${fmtD(today())}</div></div></div>
        <div class="card">${empty('<div><h2 style="margin-bottom:6px">No jobs yet</h2>Add your first job, or load some example jobs to try everything out.</div>',
          '<div class="btns" style="justify-content:center"><a class="btn" href="#/jobs/new">' + ico('plus') + 'New job</a><button class="btn ghost" data-act="examples">Load example jobs</button></div>')}</div>`;
    }

    // group to-dos by person for the "who needs to do what" card
    const byPerson = {};
    tasks.forEach((x) => { (byPerson[x.personId] = byPerson[x.personId] || []).push(x); });
    const ppl = Object.keys(byPerson).map(person).filter(Boolean).sort((a, b) => byPerson[b.id].length - byPerson[a.id].length);

    return `
      <div class="pagehead">
        <div><h1>${hello}</h1><div class="sub">${fmtD(today())} · ${active.length} active job${active.length === 1 ? '' : 's'}</div></div>
        ${isTeam() ? `<a class="btn" href="#/jobs/new">${ico('plus')}New job</a>` : ''}
      </div>
      <div class="grid g4">
        <div class="kpi"><span class="l">Active jobs</span><span class="v">${active.length}</span><span class="s">${avg}% average complete</span></div>
        <div class="kpi"><span class="l">To-dos</span><span class="v">${tasks.length}</span><span class="s" style="${overdue ? 'color:var(--err);font-weight:600' : ''}">${overdue} overdue</span></div>
        <div class="kpi"><span class="l">${isTeam() ? 'Total job value' : 'Your job total'}</span><span class="v">${$(tot.total)}</span><span class="s">incl. ${$(tot.ex)} extras${tot.pend ? ' · ' + $(tot.pend) + ' waiting' : ''}</span></div>
        <div class="kpi"><span class="l">Still to be paid</span><span class="v">${$(tot.owing)}</span><span class="s">${$(tot.paid)} paid so far</span></div>
      </div>
      ${unsent ? `<a class="note row" href="#/updates" style="text-decoration:none">${ico('mail', 20)}<span class="grow"><b>${unsent} weekly customer update${unsent === 1 ? '' : 's'} ready to send</b> · written automatically this week</span><span class="more">Review</span></a>` : ''}
      <div class="grid g2 g21">
        <div class="card tight">
          <div class="card-h" style="padding:14px 16px"><h2>Jobs</h2><a href="#/jobs">All jobs</a></div>
          <div class="list" style="border-top:1px solid var(--line)">${active.slice(0, 6).map(jobRow).join('') || empty('No active jobs.')}</div>
        </div>
        <div class="card tight">
          <div class="card-h" style="padding:14px 16px"><h2>Who needs to do what</h2><a href="#/todo">All to-dos</a></div>
          <div class="list" style="border-top:1px solid var(--line)">
            ${ppl.length ? ppl.map((p) => {
              const xs = byPerson[p.id]; const od = xs.filter((x) => x.overdue).length;
              return `<a class="li" href="#/todo/${p.id}" style="border-left:5px solid ${esc(p.color)}">${av(p, 34)}<div class="grow"><div style="font-weight:600" class="ellip">${esc(p.name)}</div><div class="sub ellip">${esc(xs[0].text)}</div></div>${od ? pill(od + ' overdue', 'err') : ''}<span class="pill">${xs.length}</span></a>`;
            }).join('') : empty('Nothing to do. Nice.')}
          </div>
        </div>
      </div>
      <div class="card tight">
        <div class="card-h" style="padding:14px 16px"><h2>Next 14 days</h2><span class="sub">Bookings and deliveries</span></div>
        <div style="border-top:1px solid var(--line)">${upcomingList(upcoming(jobs, 14))}</div>
      </div>`;
  }

  function pageJobs() {
    const all = visibleJobs();
    const f = ui.jobFilter;
    const list = all.filter((j) => f === 'all' ? true : f === 'done' ? pct(j) >= 100 : pct(j) < 100)
      .filter((j) => !ui.q || (j.name + ' ' + j.address).toLowerCase().includes(ui.q.toLowerCase()));
    return `
      <div class="pagehead"><div><h1>Jobs</h1><div class="sub">${all.length} job${all.length === 1 ? '' : 's'}</div></div>
        <div class="btns"><a class="btn line" href="#/map">${ico('map')}Map</a>${isTeam() ? `<a class="btn" href="#/jobs/new">${ico('plus')}New job</a>` : ''}</div></div>
      <div class="row" style="flex-wrap:wrap">
        <div class="f grow" style="min-width:200px"><label class="sr" for="q">Search jobs</label><input id="q" data-bind="q" placeholder="Search by name or address" value="${esc(ui.q)}"></div>
        <div class="chips">${[['active', 'Active'], ['done', 'Complete'], ['all', 'All']].map(([k, l]) => `<button class="chip${f === k ? ' on' : ''}" data-act="jobfilter" data-v="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="card tight"><div class="list">${list.map(jobRow).join('') || empty(all.length ? 'No jobs match.' : 'No jobs yet.', isTeam() && !all.length ? '<div class="btns" style="justify-content:center"><a class="btn" href="#/jobs/new">New job</a><button class="btn ghost" data-act="examples">Load example jobs</button></div>' : '')}</div></div>`;
  }

  function pageJobForm(j) {
    const editing = !!j;
    j = j || { name: '', address: '', contract: 0, scope: SERVICES.map((s) => s.k), customerId: '', builderId: '' };
    const custs = W.people.filter((p) => p.role === 'Customer');
    const blds = W.people.filter((p) => p.role === 'Builder');
    return `
      <div><a class="crumb" href="${editing ? '#/job/' + j.id : '#/jobs'}">${ico('back', 16)}${editing ? esc(j.name) : 'Jobs'}</a><h1>${editing ? 'Edit job' : 'New job'}</h1></div>
      <form class="card form" data-form="job" data-id="${editing ? j.id : ''}" style="max-width:760px">
        <div class="frow">
          <div class="f"><label for="jn">Job name</label><input id="jn" name="name" value="${esc(j.name)}" placeholder="e.g. Smith · 3 bed" required></div>
          <div class="f"><label for="jc">Contract price (site works)</label><input id="jc" name="contract" inputmode="decimal" value="${j.contract ? esc(j.contract) : ''}" placeholder="$0"></div>
        </div>
        <div class="f"><label for="ja">Site address</label><input id="ja" name="address" value="${esc(j.address)}" placeholder="e.g. 12 Mill Road, Ohoka" required></div>
        <div class="frow">
          <div class="f"><label for="jcu">Customer</label><select id="jcu" name="customerId"><option value="">${custs.length ? 'Choose…' : 'Add a new customer below'}</option>${custs.map((p) => `<option value="${p.id}"${p.id === j.customerId ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="__new">+ New customer</option></select></div>
          <div class="f"><label for="jb">Builder</label><select id="jb" name="builderId"><option value="">None yet</option>${blds.map((p) => `<option value="${p.id}"${p.id === j.builderId ? ' selected' : ''}>${esc(p.name)}${p.company ? ' · ' + esc(p.company) : ''}</option>`).join('')}</select></div>
        </div>
        <fieldset id="newCust" style="border:1px solid var(--line);border-radius:12px;padding:12px;display:${custs.length && j.customerId !== '__new' ? 'none' : 'grid'};gap:10px">
          <legend class="label" style="padding:0 6px">New customer</legend>
          <div class="frow"><div class="f"><label for="ncn">Name</label><input id="ncn" name="cname"></div><div class="f"><label for="ncp">Phone</label><input id="ncp" name="cphone" type="tel"></div></div>
          <div class="f"><label for="nce">Email (for weekly updates)</label><input id="nce" name="cemail" type="email"></div>
        </fieldset>
        <div class="f"><span class="lab">What's included</span>
          <div class="checks">${SERVICES.map((s) => `<label class="check"><input type="checkbox" name="scope" value="${esc(s.k)}"${j.scope.includes(s.k) ? ' checked' : ''}>${esc(s.title)}</label>`).join('')}</div></div>
        <div class="err" id="err" role="alert"></div>
        <div class="btns"><button class="btn" type="submit">${editing ? 'Save job' : 'Create job'}</button>${editing ? `<button class="btn danger" type="button" data-act="deljob" data-id="${j.id}">Delete job</button>` : ''}</div>
      </form>`;
  }

  const JOB_TABS = [['', 'Progress'], ['book', 'Book'], ['materials', 'Materials'], ['photos', 'Photos'], ['money', 'Money'], ['updates', 'Updates'], ['people', 'People']];

  function pageJob(j, tab) {
    if (!j) return empty('That job doesn\'t exist.', '<a class="btn" href="#/jobs">Back to jobs</a>');
    const p = pct(j);
    const c = person(j.customerId);
    const tabs = JOB_TABS;
    let body = '';
    if (!tab) body = tabProgress(j);
    else if (tab === 'book') body = tabBook(j);
    else if (tab === 'materials') body = tabMaterials(j);
    else if (tab === 'photos') body = tabPhotos(j);
    else if (tab === 'money') body = tabMoney(j);
    else if (tab === 'updates') body = tabUpdates(j);
    else if (tab === 'people') body = tabPeople(j);
    return `
      <div>
        <a class="crumb" href="#/jobs">${ico('back', 16)}Jobs</a>
        <div class="pagehead">
          <div class="grow"><div class="row" style="gap:8px"><h1 class="ellip">${esc(j.name)}</h1>${j.example ? pill('Example') : ''}</div>
            <div class="sub">${esc(j.address)}${c ? ' · ' + esc(c.name) : ''} · <a href="#/map/${j.id}">Map</a></div></div>
          ${isTeam() ? `<a class="btn line sm" href="#/job/${j.id}/edit">Edit job</a>` : ''}
        </div>
        <div class="row" style="margin-top:12px;gap:12px"><div class="grow">${bar(p, true)}</div><span class="pct" style="font-size:22px">${p}%</span></div>
      </div>
      <nav class="tabs" aria-label="Job sections">${tabs.map(([k, l]) => `<a href="#/job/${j.id}${k ? '/' + k : ''}" class="${(tab || '') === k ? 'on' : ''}">${l}</a>`).join('')}</nav>
      ${body}`;
  }

  function tabProgress(j) {
    const tasks = autoTasks(j).filter((x) => isTeam() || x.personId === viewer().id);
    const photos = (j.photos || []).slice(-5).reverse();
    return `
      <div class="card"><div class="stages">${STAGES.map((s, i) => { const sp = stagePct(j, i); return sp == null ? '' : `<div class="stage"><span class="n">${esc(s)}</span>${bar(sp)}<span class="sub">${sp}%</span></div>`; }).join('')}</div></div>
      <div class="grid g2 g21">
        <div class="card tight">
          <div class="card-h" style="padding:14px 16px"><h2>Services</h2><a href="#/job/${j.id}/book">Book a service</a></div>
          <div class="list" style="border-top:1px solid var(--line)">
            ${j.scope.map((k) => {
              const s = j.services[k]; const st = svcState(j, k); const who = s && person(s.personId);
              const canDone = s && s.status !== 'done' && (isTeam() || (who && who.id === viewer().id));
              return `<div class="li">
                <div class="ic">${SVC[k].icon}</div>
                <div class="grow"><div style="font-weight:600" class="ellip">${esc(SVC[k].title)}</div>
                  <div class="sub ellip">${s ? esc(s.option) + (s.date ? ' · ' + fmtD(s.date) : '') + (who ? ' · ' + esc(who.company || who.name) : '') : 'Not booked yet'}</div></div>
                ${pill(st.t, st.c)}
                ${!s && isTeam() ? `<a class="btn sm ghost" href="#/job/${j.id}/book/${encodeURIComponent(k)}">Book</a>` : ''}
                ${canDone ? `<button class="btn sm" data-act="svcdone" data-job="${j.id}" data-k="${esc(k)}">Done</button>` : ''}
                ${s && s.status === 'done' && isTeam() ? `<button class="btn sm line" data-act="svcundo" data-job="${j.id}" data-k="${esc(k)}" aria-label="Undo ${esc(SVC[k].title)} done">Undo</button>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="card tight">
            <div class="card-h" style="padding:14px 16px"><h2>To-dos on this job</h2><span class="pill">${tasks.length}</span></div>
            <div style="border-top:1px solid var(--line)">${tasks.map((x) => todoRow(x, true)).join('') || empty('Nothing outstanding.')}</div>
            ${isTeam() ? `<form class="form" data-form="task" data-job="${j.id}" style="padding:12px 16px;border-top:1px solid var(--line);gap:8px">
              <div class="f"><label for="tt">Add a to-do</label><input id="tt" name="text" placeholder="e.g. Confirm colours with customer" required></div>
              <div class="frow"><div class="f"><label for="tp">For</label><select id="tp" name="personId">${jobPeople(j).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
              <div class="f"><label for="td">Due</label><input id="td" name="due" type="date"></div></div>
              <button class="btn sm" type="submit">Add to-do</button></form>` : ''}
          </div>
          <div class="card">
            <div class="card-h"><h2>Latest photos</h2><a href="#/job/${j.id}/photos">All photos</a></div>
            ${photos.length ? `<div class="photos" style="grid-template-columns:repeat(3,1fr)">${photos.slice(0, 3).map(photoThumb).join('')}</div>` : `<div class="sub">No photos yet.</div><a class="btn sm ghost" href="#/job/${j.id}/photos">${ico('camera', 16)}Add photos</a>`}
          </div>
        </div>
      </div>`;
  }

  function jobPeople(j) {
    const ids = [teamLead() && teamLead().id, j.customerId, j.builderId].concat(Object.values(j.services).map((s) => s.personId));
    const seen = new Set();
    return ids.filter((id) => id && !seen.has(id) && seen.add(id)).map(person).filter(Boolean);
  }

  function tabBook(j, preselect) {
    if (!isTeam()) return `<div class="card">${empty('Connect books every service for you. Ask us if you need something.')}</div>`;
    const pick = preselect || ui.pick;
    const sel = pick && SVC[pick];
    const opts = sel ? optionsFor(pick) : [];
    if (ui.opt >= opts.length) ui.opt = 0;
    const existing = sel && j.services[pick];
    const trades = sel ? W.people.filter((p) => (p.trades || []).includes(pick)) : [];
    const allContractors = W.people.filter((p) => ['Contractor', 'Consent manager', 'Supplier'].includes(p.role));
    const defaultP = existing ? existing.personId : (trades[0] && trades[0].id);
    const nextK = j.scope.find((k) => !j.services[k]);
    return `
      <div class="card">
        <div class="card-h"><h2>What does this job need?</h2>${nextK ? `<span class="sub">Suggested next: <b>${esc(SVC[nextK].title)}</b></span>` : ''}</div>
        <div class="svcs">${SERVICES.map((s) => { const st = svcState(j, s.k); return `<button class="svc${s.k === pick ? ' on' : ''}" data-act="pick" data-k="${esc(s.k)}" data-job="${j.id}" aria-pressed="${s.k === pick}">${esc(s.k)}<span class="s">${j.scope.includes(s.k) ? esc(st.t) : 'Not in scope'}</span></button>`; }).join('')}</div>
      </div>
      ${sel ? `
      <form class="card form" data-form="book" data-job="${j.id}" data-k="${esc(pick)}">
        <div class="card-h"><h2>${esc(sel.title)}</h2>${existing ? pill('Booked · ' + fmtD(existing.date), 'dark') : ''}</div>
        <div style="display:flex;flex-direction:column;gap:8px">${opts.map(([n, d], i) => `<button type="button" class="opt${i === ui.opt ? ' on' : ''}" data-act="opt" data-i="${i}" aria-pressed="${i === ui.opt}"><span class="ic">${ico('truck', 22)}</span><span class="grow"><b>${esc(n)}</b><br><span class="sub">${esc(d)}</span></span></button>`).join('')}</div>
        <div class="frow">
          <div class="f"><label for="bd">Date</label><input id="bd" name="date" type="date" required value="${esc(existing ? existing.date : addDays(null, 3))}"></div>
          <div class="f"><label for="bc">Our cost (optional)</label><input id="bc" name="cost" inputmode="decimal" placeholder="$0" value="${existing && existing.cost ? esc(existing.cost) : ''}"></div>
        </div>
        <div class="f"><label for="bp">Assigned to</label><select id="bp" name="personId"><option value="">Connect will assign</option>${allContractors.map((p) => `<option value="${p.id}"${p.id === defaultP ? ' selected' : ''}>${esc(p.company || p.name)} · ${esc(p.name)}${(p.trades || []).includes(pick) ? ' ✓' : ''}</option>`).join('')}</select>
          <span class="sub">${trades.length ? 'Matched from contractors who do ' + esc(pick.toLowerCase()) + '.' : 'No contractor is set up for ' + esc(pick.toLowerCase()) + ' yet. Add one in People.'}</span></div>
        <div class="btns"><button class="btn" type="submit">${existing ? 'Update booking' : 'Book ' + esc(opts[ui.opt][0].toLowerCase())}</button>${existing ? `<button class="btn danger" type="button" data-act="unbook" data-job="${j.id}" data-k="${esc(pick)}">Cancel booking</button>` : ''}</div>
      </form>` : ''}`;
  }

  function tabMaterials(j) {
    const ds = (j.deliveries || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const byStage = (name) => ds.find((d) => d.items === name && !d.urgent);
    const p = j.plans;
    const sched = ui.schedule;
    return `
      <div class="grid g2">
        <div class="card">
          <div class="card-h"><h2>Plans</h2>${p ? pill('Uploaded', 'ok') : pill('Needed', 'warn')}</div>
          <input type="file" id="planFile" class="sr" accept=".pdf,.dwg,image/*" multiple data-job="${j.id}">
          ${p ? `<div class="row"><span class="ic">${esc(p.ext)}</span><div class="grow"><div style="font-weight:600;overflow-wrap:anywhere">${esc(p.name)}</div><div class="sub">${p.count} file${p.count > 1 ? 's' : ''} · ${(p.size / 1048576).toFixed(1)} MB · ${fmtTs(p.at)}</div></div><label for="planFile" class="btn sm line">Replace</label></div>`
            : `<label for="planFile" class="drop">${ico('upload', 28)}<b>Upload house plans</b><span class="sub">PDF, DWG or photos. We price every material and split it into stages.</span></label>`}
        </div>
        <div class="card" style="background:#fff8e1;border-color:#f1d78a">
          <div class="card-h"><h2>Need something now?</h2>${pill('Urgent', 'err')}</div>
          ${ui.urgent ? `<form class="form" data-form="urgent" data-job="${j.id}">
            <div class="f"><label for="ui">What do you need?</label><input id="ui" name="items" placeholder="e.g. 2 boxes of 90mm nails, joist hangers" required></div>
            <div class="sub">Next available truck, usually within 3 hours. Urgent delivery fee [FEE].</div>
            <div class="btns"><button class="btn" type="submit">${ico('bolt', 18)}Send urgent delivery</button><button class="btn line" type="button" data-act="urgent" data-v="0">Cancel</button></div></form>`
          : `<div class="sub">Short on something on site? We send the next available truck.</div><button class="btn mustard block" data-act="urgent" data-v="1">${ico('bolt', 18)}Urgent delivery</button>`}
        </div>
      </div>
      <div class="card tight">
        <div class="card-h" style="padding:14px 16px"><h2>Deliveries by stage</h2><span class="sub">Pick a date for each one</span></div>
        <div class="list" style="border-top:1px solid var(--line)">
          ${MAT.map(([name, detail], i) => {
            const d = byStage(name);
            const open = sched === name;
            return `<div class="li" style="flex-wrap:wrap">
              <div class="when${d && d.status === 'scheduled' && d.date === today() ? ' today' : ''}">${d ? shortDate(d.date) : `<b>${i + 1}</b><span>stage</span>`}</div>
              <div class="grow" style="min-width:160px"><div style="font-weight:600">${esc(name)}</div><div class="sub">${esc(detail)}${d ? ' · ' + fmtD(d.date) + ' ' + esc(d.window) : ''}${d && d.cost && isTeam() ? ' · ' + $(d.cost) : ''}</div></div>
              ${!d ? (j.plans ? `<button class="btn sm" data-act="sched" data-v="${esc(name)}">Set date</button>` : `<span class="sub">Plans first</span>`)
                : d.status === 'delivered' ? pill('Delivered', 'ok')
                : `${pill('Scheduled', 'dark')}<button class="btn sm line" data-act="sched" data-v="${esc(name)}">Change</button>${isTeam() || viewer().id === j.builderId ? `<button class="btn sm" data-act="delivered" data-job="${j.id}" data-id="${d.id}">Delivered</button>` : ''}`}
              ${open ? `<form class="form" data-form="sched" data-job="${j.id}" data-v="${esc(name)}" style="flex-basis:100%;gap:10px;margin-top:8px">
                <div class="frow"><div class="f"><label for="sd">Delivery date</label><input id="sd" name="date" type="date" min="${today()}" value="${esc(d ? d.date : addDays(null, 1))}" required></div>
                <div class="f"><label for="sw">Window</label><select id="sw" name="window">${WINDOWS.map((w) => `<option${d && d.window === w ? ' selected' : ''}>${w}</option>`).join('')}</select></div></div>
                ${isTeam() ? `<div class="f"><label for="sc">Our cost (optional)</label><input id="sc" name="cost" inputmode="decimal" placeholder="$0" value="${d && d.cost ? esc(d.cost) : ''}"></div>` : ''}
                <div class="btns"><button class="btn sm" type="submit">Save delivery</button><button class="btn sm line" type="button" data-act="sched" data-v="">Cancel</button></div></form>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
      ${ds.filter((d) => d.urgent).length ? `<div class="card tight"><div class="card-h" style="padding:14px 16px"><h2>Urgent deliveries</h2></div><div class="list" style="border-top:1px solid var(--line)">
        ${ds.filter((d) => d.urgent).reverse().map((d) => `<div class="li"><div class="when urgent">${shortDate(d.date)}</div><div class="grow"><div style="font-weight:600">${esc(d.items)}</div><div class="sub">${esc(d.window)} · requested ${fmtTs(d.at)}</div></div>${d.status === 'delivered' ? pill('Delivered', 'ok') : `${pill('On the way', 'err')}${isTeam() || viewer().id === j.builderId ? `<button class="btn sm" data-act="delivered" data-job="${j.id}" data-id="${d.id}">Delivered</button>` : ''}`}</div>`).join('')}
      </div></div>` : ''}`;
  }

  const photoThumb = (ph) => { const by = person(ph.personId); return `<button data-act="photo" data-id="${ph.id}" aria-label="Open photo${ph.caption ? ': ' + esc(ph.caption) : ''}"><img data-photo="${ph.id}" alt="${esc(ph.caption || 'Site photo')}"><span class="cap">${esc(ph.caption || fmtTs(ph.at))}${by ? ' · ' + esc(first(by.name)) : ''}</span></button>`; };

  function tabPhotos(j) {
    const ps = (j.photos || []).slice().reverse();
    const groups = {};
    ps.forEach((p) => { const k = mondayOf(new Date(p.at)); (groups[k] = groups[k] || []).push(p); });
    return `
      <form class="card form" data-form="photos" data-job="${j.id}">
        <div class="card-h"><h2>Add photos</h2><span class="sub">${ps.length} photo${ps.length === 1 ? '' : 's'}</span></div>
        <input type="file" id="photoFile" name="files" class="sr" accept="image/*" multiple>
        <label for="photoFile" class="drop" id="photoDrop">${ico('camera', 28)}<b>Take or choose photos</b><span class="sub" id="photoCount">Shows on the job and in the customer's weekly update</span></label>
        <div class="frow"><div class="f"><label for="pc">Caption (optional)</label><input id="pc" name="caption" placeholder="e.g. Piles poured"></div>
        <div class="f"><label for="ps">Stage</label><select id="ps" name="stage">${STAGES.map((s) => `<option>${esc(s)}</option>`).join('')}</select></div></div>
        <button class="btn" type="submit">${ico('upload', 18)}Upload</button>
      </form>
      ${Object.keys(groups).length ? Object.entries(groups).map(([wk, list]) => `<div class="card"><h3>Week of ${fmtD(wk)}</h3><div class="photos">${list.map(photoThumb).join('')}</div></div>`).join('') : ''}`;
  }

  function tabMoney(j) {
    const m = money(j);
    const team = isTeam();
    const isCust = viewer() && viewer().id === j.customerId;
    return `
      <div class="grid g2">
        <div class="card money">
          <div class="card-h"><h2>${team ? 'Customer price' : 'Your job'}</h2>${m.owing <= 0 && m.total ? pill('Paid in full', 'ok') : ''}</div>
          <div>
            <div class="mrow"><span>Contract price</span><b>${$(j.contract)}</b></div>
            <div class="mrow"><span>Extras approved</span><b>${m.approved ? '+ ' + $(m.approved) : $(0)}</b></div>
            <div class="mrow total"><span>Total</span><b>${$(m.total)}</b></div>
            <div class="mrow"><span>Paid so far</span><b style="color:var(--ok)">${$(m.paid)}</b></div>
            <div class="mrow total"><span>Still to pay</span><b>${$(m.owing)}</b></div>
          </div>
          ${m.dueNow > 0 ? `<div class="note"><b>${$(m.dueNow)} due now</b> for work done to date (${pct(j)}% complete).</div>` : ''}
          ${m.pending ? `<div class="sub">${$(m.pending)} of extras waiting for approval.</div>` : ''}
        </div>
        ${team ? `<div class="card money">
          <div class="card-h"><h2>Our side</h2><span class="sub">Only the Connect team sees this</span></div>
          <div>
            <div class="mrow"><span>Services booked</span><b>${$(m.svcCost)}</b></div>
            <div class="mrow"><span>Materials</span><b>${$(m.matCost)}</b></div>
            <div class="mrow total"><span>Our costs</span><b>${$(m.costs)}</b></div>
            <div class="mrow total"><span>Margin</span><b style="color:${m.margin >= 0 ? 'var(--ok)' : 'var(--err)'}">${$(m.margin)}${m.total ? ' · ' + Math.round(m.margin / m.total * 100) + '%' : ''}</b></div>
          </div>
        </div>` : ''}
      </div>
      <div class="grid g2">
        <div class="card tight">
          <div class="card-h" style="padding:14px 16px"><h2>Extras</h2><span class="sub">Anything added after the contract</span></div>
          <div class="list" style="border-top:1px solid var(--line)">
            ${(j.extras || []).length ? j.extras.slice().reverse().map((e) => `<div class="li"><div class="grow"><div style="font-weight:600">${esc(e.desc)}</div><div class="sub">${fmtTs(e.at)}</div></div><b>${$(e.amount)}</b>
              ${e.status === 'pending' ? ((isCust || team) ? `<button class="btn sm" data-act="extra" data-job="${j.id}" data-id="${e.id}" data-v="approved">Approve</button><button class="btn sm line" data-act="extra" data-job="${j.id}" data-id="${e.id}" data-v="declined">Decline</button>` : pill('Waiting', 'warn'))
                : pill(e.status === 'approved' ? 'Approved' : 'Declined', e.status === 'approved' ? 'ok' : 'err')}</div>`).join('') : empty('No extras.')}
          </div>
          ${team ? `<form class="form" data-form="extra" data-job="${j.id}" style="padding:12px 16px;border-top:1px solid var(--line);gap:8px">
            <div class="frow"><div class="f"><label for="ed">Add an extra</label><input id="ed" name="desc" placeholder="What's extra" required></div><div class="f"><label for="ea">Amount</label><input id="ea" name="amount" inputmode="decimal" placeholder="$0" required></div></div>
            <button class="btn sm" type="submit">Send to customer for approval</button></form>` : ''}
        </div>
        <div class="card tight">
          <div class="card-h" style="padding:14px 16px"><h2>Payments</h2><span class="sub">${$(m.paid)} received</span></div>
          <div class="list" style="border-top:1px solid var(--line)">
            ${(j.payments || []).length ? j.payments.slice().reverse().map((p) => `<div class="li"><div class="grow"><div style="font-weight:600">${esc(p.note || 'Payment')}</div><div class="sub">${fmtD(p.date)}</div></div><b style="color:var(--ok)">${$(p.amount)}</b></div>`).join('') : empty('No payments yet.')}
          </div>
          ${team ? `<form class="form" data-form="payment" data-job="${j.id}" style="padding:12px 16px;border-top:1px solid var(--line);gap:8px">
            <div class="frow"><div class="f"><label for="pa">Record a payment</label><input id="pa" name="amount" inputmode="decimal" placeholder="$0" required></div><div class="f"><label for="pd">Date</label><input id="pd" name="date" type="date" value="${today()}"></div></div>
            <div class="f"><label for="pn" class="sr">Note</label><input id="pn" name="note" placeholder="Note, e.g. Progress payment 2"></div>
            <button class="btn sm" type="submit">Record payment</button></form>` : ''}
        </div>
      </div>`;
  }

  function tabUpdates(j) {
    const cust = person(j.customerId);
    const ups = j.updates || [];
    const team = isTeam();
    return `
      <div class="note">Every Monday Connect writes a progress update for each active job: progress, what was done, what's coming, what the customer needs to do, and money.</div>
      ${team ? `<div class="btns"><button class="btn line sm" data-act="regen" data-job="${j.id}">Rewrite this week's update</button></div>` : ''}
      ${ups.length ? ups.map((u) => `<div class="card">
        <div class="card-h"><h2>Week of ${fmtD(u.weekOf)}</h2>${u.sent ? pill('Sent ' + fmtTs(u.sentAt || u.at), 'ok') : pill('Ready to send', 'warn')}</div>
        <div class="update">${esc(u.text)}</div>
        ${team ? `<div class="btns">
          ${cust && cust.email ? `<a class="btn sm" href="mailto:${encodeURIComponent(cust.email)}?subject=${encodeURIComponent('Weekly update: ' + j.address)}&body=${encodeURIComponent(u.text)}" data-act="sent" data-job="${j.id}" data-id="${u.id}">${ico('mail', 16)}Email to ${esc(first(cust.name))}</a>` : `<span class="sub">Add an email for the customer to send this.</span>`}
          <button class="btn sm line" data-act="copy" data-job="${j.id}" data-id="${u.id}">${ico('copy', 16)}Copy</button>
          ${!u.sent ? `<button class="btn sm line" data-act="sent" data-job="${j.id}" data-id="${u.id}">Mark sent</button>` : ''}
        </div>` : ''}
      </div>`).join('') : `<div class="card">${empty(j.customerId ? 'The first update is written next Monday.' : 'Add a customer to this job to start weekly updates.')}</div>`}`;
  }

  function tabPeople(j) {
    const rows = [['Customer', person(j.customerId)], ['Builder', person(j.builderId)]]
      .concat(j.scope.filter((k) => j.services[k] && j.services[k].personId).map((k) => [SVC[k].title, person(j.services[k].personId)]));
    return `<div class="card tight"><div class="list">
      ${rows.map(([label, p]) => p ? `<a class="li" href="#/person/${p.id}" style="border-left:5px solid ${esc(p.color)}">${av(p, 40)}<div class="grow"><div class="label">${esc(label)}</div><div style="font-weight:600" class="ellip">${esc(p.name)}</div><div class="sub ellip">${esc(p.company || p.role)}${p.phone ? ' · ' + esc(p.phone) : ''}</div></div></a>`
        : `<div class="li">${av(null, 40)}<div class="grow"><div class="label">${esc(label)}</div><div class="sub">Not set${isTeam() ? ' · <a href="#/job/' + j.id + '/edit">set it</a>' : ''}</div></div></div>`).join('')}
    </div></div>`;
  }

  function pageMap(focusId) {
    const jobs = visibleJobs();
    const missing = jobs.filter((j) => j.lat == null);
    return `
      <div class="pagehead"><div><h1>Job map</h1><div class="sub">Every job, with how complete it is</div></div>
        <div class="chips"><span class="chip"><span class="sw" style="background:#9a5b00"></span>Under 40%</span><span class="chip"><span class="sw" style="background:#ebbd06"></span>40–99%</span><span class="chip"><span class="sw" style="background:#2f6b45"></span>Complete</span></div></div>
      <div id="map" class="map" data-focus="${esc(focusId || '')}" aria-label="Map of jobs"></div>
      ${missing.length ? `<div class="note">Couldn't place ${missing.map((j) => `<a href="#/job/${j.id}/edit">${esc(j.name)}</a>`).join(', ')} on the map. Check the address.</div>` : ''}
      <div class="card tight"><div class="list">${jobs.map(jobRow).join('') || empty('No jobs yet.')}</div></div>`;
  }
  const pinColor = (p) => (p >= 100 ? '#2f6b45' : p >= 40 ? '#ebbd06' : '#9a5b00');
  function mountMap() {
    const el = document.getElementById('map');
    if (!el || !window.L) return;
    const jobs = visibleJobs().filter((j) => j.lat != null);
    mapInst = L.map(el, { scrollWheelZoom: true }).setView([-43.45, 172.5], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(mapInst);
    const markers = jobs.map((j) => {
      const p = pct(j);
      const icon = L.divIcon({ className: '', html: `<div class="mpin" style="--c:${pinColor(p)}">${p}%</div>`, iconSize: [46, 46], iconAnchor: [23, 23] });
      const m = L.marker([j.lat, j.lng], { icon, title: j.name + ' · ' + p + '%' }).addTo(mapInst);
      m.bindPopup(`<b>${esc(j.name)}</b><br><span style="color:#5a5a5a;font-size:12px">${esc(j.address)}</span><div style="margin:8px 0">${bar(p)}</div><div style="font-size:12px">${p}% · Next: ${esc(nextStep(j))}</div><div style="margin-top:8px"><a href="#/job/${j.id}" style="font-weight:600">Open job →</a></div>`);
      m._jid = j.id; return m;
    });
    const focus = el.dataset.focus && markers.find((m) => m._jid === el.dataset.focus);
    if (focus) { mapInst.setView(focus.getLatLng(), 14); focus.openPopup(); }
    else if (markers.length) mapInst.fitBounds(L.featureGroup(markers).getBounds().pad(0.25), { maxZoom: 13 });
  }

  function pageTodo(pid) {
    const tasks = allTasks();
    const f = pid || ui.todoFilter;
    const ppl = [...new Set(tasks.map((x) => x.personId))].map(person).filter(Boolean);
    const shown = f === 'all' ? tasks : tasks.filter((x) => x.personId === f);
    const groups = {};
    shown.forEach((x) => { (groups[x.personId] = groups[x.personId] || []).push(x); });
    return `
      <div class="pagehead"><div><h1>To-do</h1><div class="sub">Made automatically from every job, put against each person</div></div></div>
      <div class="chips"><a class="chip${f === 'all' ? ' on' : ''}" href="#/todo">Everyone · ${tasks.length}</a>${ppl.map((p) => `<a class="chip${f === p.id ? ' on' : ''}" href="#/todo/${p.id}"><span class="sw" style="background:${esc(p.color)}"></span>${esc(first(p.name))} · ${tasks.filter((x) => x.personId === p.id).length}</a>`).join('')}</div>
      ${Object.keys(groups).length ? Object.entries(groups).map(([id, xs]) => {
        const p = person(id);
        return `<div class="card tight" style="--c:${esc(p ? p.color : '#999')}">
          <a class="phead" href="#/person/${esc(id)}" style="text-decoration:none">${av(p, 34)}<div class="grow"><div style="font-weight:700">${esc(p ? p.name : 'Unassigned')}</div><div class="sub">${esc(p ? (p.company || p.role) : '')}</div></div><span class="pill">${xs.length}</span></a>
          ${xs.map((x) => todoRow(x, false)).join('')}
        </div>`;
      }).join('') : `<div class="card">${empty('All done. Nothing waiting on anyone.')}</div>`}
      ${isTeam() ? `<form class="card form" data-form="gtask" style="max-width:760px">
        <h2>Add a to-do</h2>
        <div class="f"><label for="gt">What needs doing</label><input id="gt" name="text" required></div>
        <div class="frow"><div class="f"><label for="gp">For</label><select id="gp" name="personId">${W.people.map((p) => `<option value="${p.id}"${p.id === f ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
        <div class="f"><label for="gj">Job (optional)</label><select id="gj" name="jobId"><option value="">No job</option>${W.jobs.map((j) => `<option value="${j.id}">${esc(j.name)}</option>`).join('')}</select></div></div>
        <div class="f" style="max-width:240px"><label for="gd">Due (optional)</label><input id="gd" name="due" type="date"></div>
        <button class="btn" type="submit">Add to-do</button></form>` : ''}`;
  }

  function pageUpdates() {
    const wk = mondayOf();
    const rows = W.jobs.filter((j) => j.customerId).map((j) => ({ j, u: (j.updates || []).find((u) => u.weekOf === wk) }));
    return `<div class="pagehead"><div><h1>Weekly updates</h1><div class="sub">Week of ${fmtD(wk)} · written automatically every Monday</div></div></div>
      <div class="card tight"><div class="list">${rows.map(({ j, u }) => { const c = person(j.customerId); return `<a class="li" href="#/job/${j.id}/updates">${av(c, 36)}<div class="grow"><div style="font-weight:600">${esc(c ? c.name : '')}</div><div class="sub ellip">${esc(j.name)} · ${pct(j)}%</div></div>${!u ? pill('Complete job', '') : u.sent ? pill('Sent', 'ok') : pill('Ready to send', 'warn')}</a>`; }).join('') || empty('No jobs with customers yet.')}</div></div>`;
  }

  function pagePeople() {
    const roles = ['All'].concat(ROLES);
    const f = ui.roleFilter;
    const tasks = allTasks();
    const list = W.people.filter((p) => (f === 'All' || p.role === f) && (!ui.q || (p.name + ' ' + (p.company || '')).toLowerCase().includes(ui.q.toLowerCase())))
      .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
    return `
      <div class="pagehead"><div><h1>People</h1><div class="sub">${W.people.length} contacts · each person has their own colour</div></div>${isTeam() ? `<a class="btn" href="#/people/new">${ico('plus')}Add person</a>` : ''}</div>
      <div class="f"><label class="sr" for="q">Search people</label><input id="q" data-bind="q" placeholder="Search by name or company" value="${esc(ui.q)}"></div>
      <div class="chips">${roles.map((r) => `<button class="chip${f === r ? ' on' : ''}" data-act="role" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <div class="card tight"><div class="list">${list.map((p) => {
        const n = tasks.filter((x) => x.personId === p.id).length;
        const jobsN = W.jobs.filter((j) => involved(j, p.id)).length;
        return `<a class="li" href="#/person/${p.id}" style="border-left:5px solid ${esc(p.color)}">${av(p, 42)}<div class="grow"><div style="font-weight:600" class="ellip">${esc(p.name)}</div><div class="sub ellip">${esc(p.role)}${p.company ? ' · ' + esc(p.company) : ''}${jobsN ? ' · ' + jobsN + ' job' + (jobsN > 1 ? 's' : '') : ''}</div></div>${n ? `<span class="pill">${n} to-do${n > 1 ? 's' : ''}</span>` : ''}</a>`;
      }).join('') || empty('No one here yet.')}</div></div>`;
  }

  function pagePerson(p) {
    if (!p) return empty('That person doesn\'t exist.', '<a class="btn" href="#/people">Back to people</a>');
    const tasks = allTasks().filter((x) => x.personId === p.id);
    const jobs = W.jobs.filter((j) => involved(j, p.id));
    const tel = (p.phone || '').replace(/[^0-9+]/g, '');
    return `
      <div><a class="crumb" href="#/people">${ico('back', 16)}People</a></div>
      <div class="card" style="border-top:6px solid ${esc(p.color)}">
        <div class="row" style="gap:16px;align-items:flex-start">${av(p, 64)}
          <div class="grow"><h1 style="font-size:24px">${esc(p.name)}</h1><div class="sub">${esc(p.role)}${p.company ? ' · ' + esc(p.company) : ''}</div>
            ${(p.trades || []).length ? `<div class="chips" style="margin-top:8px">${p.trades.map((t) => pill(t)).join('')}</div>` : ''}</div>
          ${isTeam() ? `<a class="btn sm line" href="#/person/${p.id}/edit">Edit</a>` : ''}
        </div>
        <div class="btns">
          ${tel ? `<a class="btn" href="tel:${esc(tel)}">${ico('phone', 18)}Call</a><a class="btn ghost" href="sms:${esc(tel)}">${ico('msg', 18)}Text</a>` : ''}
          ${p.email ? `<a class="btn ghost" href="mailto:${esc(p.email)}">${ico('mail', 18)}Email</a>` : ''}
        </div>
        <div class="money"><div class="mrow"><span class="sub">Phone</span><span>${esc(p.phone) || '—'}</span></div><div class="mrow"><span class="sub">Email</span><span style="overflow-wrap:anywhere">${esc(p.email) || '—'}</span></div>${p.notes ? `<div class="mrow"><span class="sub">Notes</span><span style="white-space:pre-wrap;text-align:right">${esc(p.notes)}</span></div>` : ''}</div>
      </div>
      <div class="grid g2">
        <div class="card tight" style="--c:${esc(p.color)}"><div class="card-h" style="padding:14px 16px"><h2>Their to-dos</h2><span class="pill">${tasks.length}</span></div>
          <div style="border-top:1px solid var(--line)">${tasks.map((x) => todoRow(x, false)).join('') || empty('Nothing waiting on ' + esc(first(p.name)) + '.')}</div></div>
        <div class="card tight"><div class="card-h" style="padding:14px 16px"><h2>Jobs</h2><span class="pill">${jobs.length}</span></div>
          <div class="list" style="border-top:1px solid var(--line)">${jobs.map(jobRow).join('') || empty('Not on any jobs yet.')}</div></div>
      </div>
      ${isTeam() && !ui.as && p.role !== 'Connect team' ? `<button class="btn line" data-act="viewas" data-v="${p.id}" style="align-self:flex-start">See Connect the way ${esc(first(p.name))} sees it</button>` : ''}`;
  }

  function pagePersonForm(p) {
    const editing = !!p;
    p = p || { name: '', role: 'Contractor', company: '', phone: '', email: '', notes: '', trades: [], color: nextColor() };
    return `
      <div><a class="crumb" href="${editing ? '#/person/' + p.id : '#/people'}">${ico('back', 16)}${editing ? esc(p.name) : 'People'}</a><h1>${editing ? 'Edit contact' : 'Add person'}</h1></div>
      <form class="card form" data-form="person" data-id="${editing ? p.id : ''}" style="max-width:760px">
        <div class="frow"><div class="f"><label for="pn">Name</label><input id="pn" name="name" value="${esc(p.name)}" required></div>
          <div class="f"><label for="pr">Role</label><select id="pr" name="role">${ROLES.map((r) => `<option${r === p.role ? ' selected' : ''}>${r}</option>`).join('')}</select></div></div>
        <div class="f"><label for="pco">Company</label><input id="pco" name="company" value="${esc(p.company)}"></div>
        <div class="frow"><div class="f"><label for="pph">Phone</label><input id="pph" name="phone" type="tel" value="${esc(p.phone)}"></div>
          <div class="f"><label for="pem">Email</label><input id="pem" name="email" type="email" value="${esc(p.email)}"></div></div>
        <div class="f"><span class="lab">Does these services (contractors get matched automatically)</span>
          <div class="checks">${SERVICES.map((s) => `<label class="check"><input type="checkbox" name="trades" value="${esc(s.k)}"${(p.trades || []).includes(s.k) ? ' checked' : ''}>${esc(s.k)}</label>`).join('')}</div></div>
        <div class="f"><span class="lab">Colour</span><div class="chips">${COLORS.map((c) => `<label class="chip" style="padding:0 10px"><input type="radio" name="color" value="${c}"${c === p.color ? ' checked' : ''} style="accent-color:${c}"><span class="sw" style="background:${c};width:18px;height:18px;border-radius:9px"></span><span class="sr">${c}</span></label>`).join('')}</div></div>
        <div class="f"><label for="pno">Notes</label><textarea id="pno" name="notes">${esc(p.notes)}</textarea></div>
        <div class="err" id="err" role="alert"></div>
        <div class="btns"><button class="btn" type="submit">${editing ? 'Save' : 'Add person'}</button>${editing && p.email !== user.email ? `<button class="btn danger" type="button" data-act="delperson" data-id="${p.id}">Remove</button>` : ''}</div>
      </form>`;
  }

  function pageMore() {
    const v = viewer();
    return `
      <h1>Account</h1>
      <div class="card">
        <div class="row">${av(me(), 48)}<div class="grow"><div style="font-weight:700">${esc(user.name)}</div><div class="sub">${esc(user.email)}</div></div></div>
        <div class="sub">${SHARED ? 'Shared accounts are on. Everyone on the team sees the same jobs.' : 'Test mode: accounts and jobs are saved in this browser only.'}</div>
      </div>
      ${me() && me().role === 'Connect team' ? `<div class="card form">
        <h2>View as someone else</h2>
        <div class="sub">See exactly what a customer, builder or contractor sees: only their jobs and their to-dos.</div>
        <div class="f"><label for="va">Viewing as</label><select id="va" data-act-change="viewas"><option value="">Me (Connect team)</option>${W.people.filter((p) => p.role !== 'Connect team').map((p) => `<option value="${p.id}"${v && v.id === p.id ? ' selected' : ''}>${esc(p.name)} · ${esc(p.role)}</option>`).join('')}</select></div>
      </div>` : ''}
      <div class="card">
        <h2>Test data</h2>
        <div class="btns"><button class="btn ghost" data-act="examples">Load example jobs</button><button class="btn danger" data-act="clearall">Clear all jobs and people</button></div>
      </div>
      <button class="btn line" data-act="signout" style="align-self:flex-start">Sign out</button>`;
  }

  function pageAuth(mode) {
    const up = mode === 'signup';
    return `<div class="auth">
      <div class="hero">${lockup()}<div class="tag">They build the home.<br><em>We handle the site.</em></div><div style="color:#bdbdbd;font-size:14px">Every job, booking, delivery, photo and dollar in one place.</div></div>
      <form class="form" id="authForm" novalidate>
        ${!SHARED ? '<div class="banner" style="border-radius:10px">Test mode · accounts are saved in this browser only</div>' : ''}
        <h1 style="font-size:26px">${up ? 'Create your account' : 'Sign in'}</h1>
        ${up ? '<div class="f"><label for="name">Your name</label><input id="name" autocomplete="name" required></div>' : ''}
        <div class="f"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="f"><label for="pw">Password</label><input id="pw" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="6" required></div>
        <div class="err" id="err" role="alert"></div>
        <button class="btn block" type="submit">${up ? 'Create account' : 'Sign in'}</button>
        <a href="${up ? '#/signin' : '#/signup'}" style="text-align:center;font-size:14px;font-weight:600">${up ? 'Already have an account? Sign in' : 'New here? Create an account'}</a>
      </form></div>`;
  }

  // =====================================================================
  // Shell + router
  // =====================================================================
  const NAV = [['', 'home', 'Dashboard'], ['jobs', 'jobs', 'Jobs'], ['map', 'map', 'Map'], ['todo', 'todo', 'To-do'], ['people', 'people', 'People']];

  function shell(section, inner) {
    const tasks = allTasks();
    const od = tasks.filter((x) => x.overdue).length;
    const v = viewer();
    const asBar = ui.as && v ? `<div class="banner" style="background:${esc(v.color)};color:#fff">Viewing as ${esc(v.name)} (${esc(v.role)}) · <button data-act="viewas" data-v="" style="background:none;border:0;color:#fff;text-decoration:underline;font-weight:600;cursor:pointer">Back to me</button></div>` : '';
    const navLink = (cls) => NAV.map(([k, ic, l]) => `<a href="#/${k}" class="${section === k ? 'on' : ''}"${section === k ? ' aria-current="page"' : ''}>${ico(ic, cls === 'side' ? 20 : 22)}<span>${l}</span>${k === 'todo' && od ? `<span class="badge">${od}</span>` : ''}</a>`).join('');
    return `<div class="layout">
      <aside class="side">${lockup()}<nav aria-label="Main">${navLink('side')}${isTeam() ? `<a href="#/updates" class="${section === 'updates' ? 'on' : ''}">${ico('mail', 20)}<span>Weekly updates</span></a>` : ''}</nav>
        <div class="foot"><a href="#/more" class="row" style="color:#fff;text-decoration:none;gap:10px">${av(v || me(), 32)}<span class="grow"><span style="display:block;font-weight:600" class="ellip">${esc(v ? v.name : user.name)}</span><span style="font-size:12px;color:#bdbdbd">${esc(v ? v.role : '')}</span></span></a></div></aside>
      <div class="main">
        <header class="top">${lockup()}<a href="#/more" aria-label="Account">${av(v || me(), 34)}</a></header>
        ${!SHARED ? '<div class="banner">Test mode · saved in this browser only</div>' : ''}${asBar}
        <main class="content" id="content">${inner}</main>
      </div>
      <nav class="tabbar" aria-label="Main">${navLink('tab')}</nav>
    </div>
    ${ui.photo ? lightbox() : ''}`;
  }

  function lightbox() {
    let ph = null, jb = null;
    W.jobs.forEach((j) => (j.photos || []).forEach((p) => { if (p.id === ui.photo) { ph = p; jb = j; } }));
    if (!ph) return '';
    const by = person(ph.personId);
    return `<div class="lightbox" role="dialog" aria-label="Photo" data-act="closephoto">
      <img data-photo="${ph.id}" alt="${esc(ph.caption || 'Site photo')}">
      <div style="text-align:center"><b>${esc(ph.caption || 'Site photo')}</b><div style="font-size:13px;color:#ccc">${esc(jb.name)} · ${esc(ph.stage || '')} · ${fmtTs(ph.at)}${by ? ' · ' + esc(by.name) : ''}</div></div>
      <button class="btn line" data-act="closephoto">${ico('x', 18)}Close</button></div>`;
  }

  async function render() {
    if (mapInst) { mapInst.remove(); mapInst = null; }
    const h = location.hash || '#/';
    if (!user) { $app.innerHTML = pageAuth(h === '#/signin' ? 'signin' : 'signup'); return; }
    const parts = h.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const [a, b, c, d] = parts;
    let section = a || '';
    let html;
    if (!a) html = pageDashboard();
    else if (a === 'jobs' && b === 'new') { html = isTeam() ? pageJobForm(null) : pageJobs(); section = 'jobs'; }
    else if (a === 'jobs') html = pageJobs();
    else if (a === 'job' && c === 'edit') { html = pageJobForm(job(b)); section = 'jobs'; }
    else if (a === 'job' && c === 'book' && d) { ui.pick = d; html = pageJob(job(b), 'book'); section = 'jobs'; }
    else if (a === 'job') { html = pageJob(job(b), c || ''); section = 'jobs'; }
    else if (a === 'map') html = pageMap(b);
    else if (a === 'todo') html = pageTodo(b);
    else if (a === 'updates') html = pageUpdates();
    else if (a === 'people' && b === 'new') { html = pagePersonForm(null); section = 'people'; }
    else if (a === 'people') html = pagePeople();
    else if (a === 'person' && c === 'edit') { html = pagePersonForm(person(b)); section = 'people'; }
    else if (a === 'person') { html = pagePerson(person(b)); section = 'people'; }
    else if (a === 'more') html = pageMore();
    else html = pageDashboard();
    const f = document.activeElement;
    const fid = f && f.id; const caret = f && f.selectionStart;
    $app.innerHTML = shell(section, html);
    if (fid === 'q') { const el = document.getElementById('q'); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) { /* n/a */ } } }
    if (a === 'map') mountMap();
    document.querySelectorAll('img[data-photo]').forEach(async (img) => { const v = await Photos.get(img.dataset.photo); if (v) img.src = v; });
  }

  // =====================================================================
  // Actions
  // =====================================================================
  function markTask(key, jobId) {
    if (key.startsWith('g:')) { const t = (W.tasks || []).find((x) => x.id === key.slice(2)); if (t) t.done = Date.now(); return; }
    const j = job(jobId); if (!j) return;
    if (key.startsWith('m:')) { const t = j.tasks.find((x) => x.id === key.slice(2)); if (t) t.done = Date.now(); return; }
    if (key.startsWith('update:')) { const u = j.updates.find((x) => x.weekOf === key.slice(7)); if (u) { u.sent = true; u.sentAt = Date.now(); } }
    j.done[key] = Date.now();
  }

  $app.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const dd = t.dataset;
    const j = dd.job && job(dd.job);
    switch (dd.act) {
      case 'closephoto': if (e.target === t || t.tagName === 'BUTTON') { ui.photo = null; render(); } return;
      case 'photo': ui.photo = dd.id; return render();
      case 'jobfilter': ui.jobFilter = dd.v; return render();
      case 'role': ui.roleFilter = dd.v; return render();
      case 'pick': ui.pick = dd.k; ui.opt = 0; return go('#/job/' + dd.job + '/book/' + encodeURIComponent(dd.k));
      case 'opt': ui.opt = Number(dd.i); return render();
      case 'urgent': ui.urgent = dd.v === '1'; return render();
      case 'sched': ui.schedule = dd.v || null; return render();
      case 'tick': markTask(dd.key, dd.job); return commit('Done.');
      case 'svcdone': j.services[dd.k].status = 'done'; j.services[dd.k].doneAt = Date.now(); return commit(SVC[dd.k].title + ' marked done.');
      case 'svcundo': j.services[dd.k].status = 'booked'; delete j.services[dd.k].doneAt; return commit();
      case 'unbook': delete j.services[dd.k]; return commit(SVC[dd.k].title + ' booking cancelled.');
      case 'delivered': { const d = j.deliveries.find((x) => x.id === dd.id); d.status = 'delivered'; d.deliveredAt = Date.now(); return commit('Marked delivered.'); }
      case 'extra': { const x = j.extras.find((y) => y.id === dd.id); x.status = dd.v; x.decidedAt = Date.now(); return commit(dd.v === 'approved' ? 'Extra approved.' : 'Extra declined.'); }
      case 'sent': { const u = j.updates.find((x) => x.id === dd.id); u.sent = true; u.sentAt = Date.now(); j.done['update:' + u.weekOf] = Date.now(); await Data.save(W); if (t.tagName !== 'A') render(); else setTimeout(render, 300); return; }
      case 'copy': { const u = j.updates.find((x) => x.id === dd.id); try { await navigator.clipboard.writeText(u.text); toast('Update copied.'); } catch (err) { toast('Couldn\'t copy. Select the text instead.'); } return; }
      case 'regen': { const wk = mondayOf(); j.updates = j.updates.filter((u) => u.weekOf !== wk); j.updates.unshift({ id: uid(), weekOf: wk, at: Date.now(), text: buildUpdate(j), sent: false }); delete j.done['update:' + wk]; return commit('Update rewritten.'); }
      case 'examples': ensureMe(); loadExamples(); return commit('Example jobs loaded.');
      case 'clearall': { const m = me(); W.jobs = []; W.people = m ? [m] : []; W.tasks = []; ui.as = null; return commit('Cleared.'); }
      case 'deljob': W.jobs = W.jobs.filter((x) => x.id !== dd.id); await Data.save(W); toast('Job deleted.'); return go('#/jobs');
      case 'delperson': W.people = W.people.filter((x) => x.id !== dd.id); await Data.save(W); toast('Removed.'); return go('#/people');
      case 'viewas': ui.as = dd.v || null; toast(ui.as ? 'Viewing as ' + person(ui.as).name : 'Back to your view'); return go('#/');
      case 'signout': await Auth.signOut(); user = null; W = null; ui.as = null; return go('#/signin');
    }
  });

  $app.addEventListener('input', (e) => {
    if (e.target.dataset.bind === 'q') { ui.q = e.target.value; render(); }
  });

  $app.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'va') { ui.as = el.value || null; return go('#/'); }
    if (el.id === 'jcu') { const fs = document.getElementById('newCust'); if (fs) fs.style.display = el.value === '__new' || !el.value ? 'grid' : 'none'; }
    if (el.id === 'photoFile') { const n = el.files.length; document.getElementById('photoCount').textContent = n ? n + ' photo' + (n > 1 ? 's' : '') + ' ready. Press Upload.' : ''; }
    if (el.id === 'planFile' && el.files.length) {
      const j = job(el.dataset.job); const files = Array.from(el.files);
      j.plans = { name: files[0].name, ext: (files[0].name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4), size: files.reduce((a, f) => a + f.size, 0), count: files.length, at: Date.now() };
      return commit('Plans uploaded.');
    }
  });

  $app.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const g = (k) => String(fd.get(k) || '').trim();
    const err = form.querySelector('#err');
    const btn = form.querySelector('button[type=submit]');

    if (form.id === 'authForm') {
      const nameEl = document.getElementById('name');
      const name = nameEl ? nameEl.value.trim() : '';
      const email = document.getElementById('email').value.trim().toLowerCase();
      const pw = document.getElementById('pw').value;
      if (nameEl && !name) return (err.textContent = 'Enter your name.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return (err.textContent = 'Enter a valid email.');
      if (pw.length < 6) return (err.textContent = 'Password needs at least 6 characters.');
      btn.disabled = true; err.textContent = '';
      try {
        if (nameEl) { const r = await Auth.signUp(name, email, pw); if (r.confirm) { btn.disabled = false; err.style.color = 'var(--ok)'; err.textContent = 'Check your email to confirm, then sign in.'; return; } }
        else await Auth.signIn(email, pw);
        await boot();
      } catch (ex) { btn.disabled = false; err.textContent = ex.message || 'Something went wrong.'; }
      return;
    }

    const kind = form.dataset.form;
    const j = form.dataset.job && job(form.dataset.job);

    if (kind === 'job') {
      const name = g('name'), address = g('address');
      if (!name || !address) return (err.textContent = 'Add a job name and site address.');
      let customerId = g('customerId');
      if (customerId === '__new' || !customerId) {
        if (g('cname')) { const p = { id: uid(), name: g('cname'), role: 'Customer', company: '', phone: g('cphone'), email: g('cemail'), color: nextColor(), notes: '', trades: [] }; W.people.push(p); customerId = p.id; }
        else customerId = '';
      }
      const scope = SERVICES.map((s) => s.k).filter((k) => fd.getAll('scope').includes(k));
      let jb = form.dataset.id && job(form.dataset.id);
      const moved = !jb || jb.address !== address;
      if (!jb) { jb = { id: uid(), services: {}, deliveries: [], extras: [], payments: [], photos: [], updates: [], tasks: [], done: {}, plans: null, createdAt: Date.now() }; W.jobs.push(jb); }
      Object.assign(jb, { name, address, contract: num(g('contract')), customerId, builderId: g('builderId'), scope });
      btn.disabled = true;
      if (moved) { btn.textContent = 'Finding it on the map…'; const ll = await geocode(address); jb.lat = ll ? ll.lat : null; jb.lng = ll ? ll.lng : null; }
      ensureUpdates();
      await Data.save(W);
      toast(form.dataset.id ? 'Job saved.' : 'Job created.' + (jb.lat == null ? ' Couldn\'t place it on the map.' : ''));
      return go('#/job/' + jb.id);
    }
    if (kind === 'book') {
      const k = form.dataset.k; const o = optionsFor(k)[ui.opt];
      const prev = j.services[k];
      j.services[k] = { status: prev && prev.status === 'done' ? 'done' : 'booked', option: o[0], date: g('date'), personId: g('personId'), cost: num(g('cost')), at: Date.now(), doneAt: prev && prev.doneAt };
      if (!j.scope.includes(k)) j.scope = SERVICES.map((s) => s.k).filter((x) => x === k || j.scope.includes(x));
      await Data.save(W); toast(SVC[k].title + ' booked for ' + fmtD(g('date')) + '.');
      ui.pick = null; return go('#/job/' + j.id);
    }
    if (kind === 'sched') {
      const name = form.dataset.v;
      let d = j.deliveries.find((x) => x.items === name && !x.urgent);
      if (!d) { d = { id: uid(), items: name, urgent: false, status: 'scheduled', at: Date.now() }; j.deliveries.push(d); }
      Object.assign(d, { date: g('date'), window: g('window'), cost: fd.has('cost') ? num(g('cost')) : (d.cost || 0) });
      ui.schedule = null; return commit(name + ' delivery set for ' + fmtD(d.date) + '.');
    }
    if (kind === 'urgent') {
      j.deliveries.push({ id: uid(), items: g('items'), date: today(), window: 'ASAP', urgent: true, status: 'scheduled', cost: 0, at: Date.now() });
      ui.urgent = false; return commit('Urgent delivery sent. Connect has been told.');
    }
    if (kind === 'photos') {
      const files = Array.from(document.getElementById('photoFile').files || []);
      if (!files.length) return toast('Choose some photos first.');
      btn.disabled = true; btn.textContent = 'Uploading…';
      const v = viewer();
      let ok = 0;
      for (const f of files) {
        try { const id = uid(); await Photos.put(id, await compress(f)); j.photos.push({ id, at: Date.now(), caption: g('caption'), stage: g('stage'), personId: v ? v.id : null }); ok++; }
        catch (ex) { console.warn('[Connect] photo', ex); }
      }
      return commit(ok + ' photo' + (ok === 1 ? '' : 's') + ' uploaded.' + (ok < files.length ? ' Some couldn\'t be read.' : ''));
    }
    if (kind === 'extra') { j.extras.push({ id: uid(), desc: g('desc'), amount: num(g('amount')), status: 'pending', at: Date.now() }); return commit('Extra sent to the customer to approve.'); }
    if (kind === 'payment') { j.payments.push({ id: uid(), amount: num(g('amount')), date: g('date') || today(), note: g('note') }); return commit('Payment recorded.'); }
    if (kind === 'task') { j.tasks.push({ id: uid(), text: g('text'), personId: g('personId'), due: g('due') || null, at: Date.now() }); return commit('To-do added.'); }
    if (kind === 'gtask') {
      const jid = g('jobId');
      const t = { id: uid(), text: g('text'), personId: g('personId'), due: g('due') || null, at: Date.now() };
      if (jid) job(jid).tasks.push(t); else (W.tasks = W.tasks || []).push(t);
      return commit('To-do added.');
    }
    if (kind === 'person') {
      if (!g('name')) return (err.textContent = 'Add a name.');
      let p = form.dataset.id && person(form.dataset.id);
      if (!p) { p = { id: uid() }; W.people.push(p); }
      Object.assign(p, { name: g('name'), role: g('role'), company: g('company'), phone: g('phone'), email: g('email'), notes: g('notes'), trades: fd.getAll('trades'), color: g('color') || p.color || nextColor() });
      await Data.save(W); toast('Saved.');
      return go('#/person/' + p.id);
    }
  });

  window.addEventListener('hashchange', () => { ui.q = ''; ui.urgent = false; ui.schedule = null; render(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.photo) { ui.photo = null; render(); } });

  async function boot() {
    user = await Auth.current();
    if (user) {
      W = (await Data.load()) || blankWs();
      W.jobs = W.jobs || []; W.people = W.people || [];
      W.jobs.forEach((j) => { ['deliveries', 'extras', 'payments', 'photos', 'updates', 'tasks'].forEach((k) => { j[k] = j[k] || []; }); j.done = j.done || {}; j.services = j.services || {}; j.scope = j.scope || SERVICES.map((s) => s.k); });
      const hadMe = !!me();
      ensureMe();
      if (ensureUpdates() || !hadMe) await Data.save(W);
      if (['#/signin', '#/signup'].includes(location.hash)) { location.hash = '#/'; return; }
    }
    render();
  }
  if (sb) sb.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_IN' && !user) boot(); });
  boot();
})();
