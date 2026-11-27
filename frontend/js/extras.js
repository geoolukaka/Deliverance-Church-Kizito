/* =========================================================
   DCI Kizito — extras: nav dropdown, group/newsletter pages, hero media,
   cookie consent, chatbot, social, human-check, animations.
   Loaded BEFORE script.js (so pages exist when the router starts).
   ========================================================= */
(function () {
  'use strict';
  const C = window.DIC_CONTENT;
  const q = (s, c) => (c || document).querySelector(s);
  const qa = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtDate = (d, o) => new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-KE', o || { day: 'numeric', month: 'short', year: 'numeric' });

  /* ---------- Social icons ---------- */
  const SOC = {
    facebook: ['Facebook', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8V6.5c0-.7.3-1 1-1h2V2h-3c-3 0-4.5 1.8-4.5 4.5V8H7v3.5h2.5V22H14V11.5h2.8L17.5 8H14z"/></svg>'],
    instagram: ['Instagram', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>'],
    youtube: ['YouTube', '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.200 0-7.800.4A2.500 2.500 0 0 0 2.400 7.200C2 8.800 2 12 2 12s0 3.200.4 4.800a2.500 2.500 0 0 0 1.800 1.800C5.800 19 12 19 12 19s6.200 0 7.800-.4a2.500 2.500 0 0 0 1.800-1.800c.4-1.600.4-4.800.4-4.800s0-3.200-.4-4.800zM10 15V9l5.200 3L10 15z"/></svg>'],
    tiktok: ['TikTok', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.500 3c.3 2.400 1.800 4 4 4.200v3.300a7.300 7.300 0 0 1-4-1.300v6.100a5.900 5.900 0 1 1-5.900-5.900h.6v3.400a2.600 2.600 0 1 0 2 2.500V3h3.300z"/></svg>'],
    whatsapp: ['WhatsApp', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.700-5.100A9 9 0 1 1 8.200 19.400L3 21z"/><path d="M9 8.500c0 3.500 3 6.500 6.500 6.500l1-1.800-2-1-1 1c-1-.5-2-1.500-2.500-2.500l1-1-1-2L9 8.500z"/></svg>'],
  };
  const socialHTML = () => Object.keys(SOC).filter((k) => C.social[k])
    .map((k) => `<a class="soc soc-${k}" href="${esc(C.social[k])}" target="_blank" rel="noopener noreferrer" aria-label="${SOC[k][0]}" title="${SOC[k][0]}">${SOC[k][1]}</a>`).join('');

  /* ---------- Static page patches (logo, footer) ---------- */
  const fs = q('#footer-social'); if (fs) fs.innerHTML = socialHTML();

  /* ---------- Groups dropdown (desktop + mobile) ---------- */
  const link = (p, n) => `<a href="#${p}" data-link>${esc(n)}</a>`;
  const nd = q('#nav-groups');
  if (nd) {
    nd.innerHTML = `<button class="dd-toggle" type="button" aria-expanded="false" aria-haspopup="true">Groups <span class="material-symbols-outlined">expand_more</span></button>
      <div class="dd-menu">${C.groups.map((g) => link(g.page, g.name)).join('')}
        <div class="dd-sub"><button class="dd-sub-toggle" type="button" aria-expanded="false">Fellowship Groups <span class="material-symbols-outlined">chevron_right</span></button>
          <div class="dd-sub-menu">${C.fellowships.map((f) => link(f.page, f.name)).join('')}</div></div>
        ${link('penniel-housing', 'Penniel Housing')}</div>`;
    const ddClose = () => { nd.classList.remove('open'); q('.dd-toggle', nd).setAttribute('aria-expanded', 'false'); qa('.dd-sub', nd).forEach((s) => s.classList.remove('open')); };
    nd.addEventListener('click', (e) => {
      if (e.target.closest('.dd-toggle')) { const o = nd.classList.toggle('open'); q('.dd-toggle', nd).setAttribute('aria-expanded', o); }
      const st = e.target.closest('.dd-sub-toggle'); if (st) { const o = st.parentElement.classList.toggle('open'); st.setAttribute('aria-expanded', o); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#nav-groups')) ddClose(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ddClose(); });
    window.addEventListener('hashchange', ddClose);
  }
  const md = q('#mobile-groups');
  if (md) md.innerHTML = `<details class="m-dd"><summary><span class="material-symbols-outlined">groups</span>Groups</summary>
      ${C.groups.map((g) => link(g.page, g.name)).join('')}
      <details class="m-dd m-sub"><summary>Fellowship Groups</summary>${C.fellowships.map((f) => link(f.page, f.name)).join('')}</details>
      ${link('penniel-housing', 'Penniel Housing')}</details>`;

  /* ---------- Group / fellowship pages ---------- */
  const ALL = C.groups.concat(C.fellowships);
  const S = {}; // per-page state
  const main = q('#main-content');
  const hero = (t, p) => `<section class="page-hero"><div class="page-hero-overlay"></div><div class="page-hero-content"><h1>${esc(t)}</h1><p>${esc(p || '')}</p></div></section>`;

  ALL.forEach((g) => {
    const d = new Date(); S[g.page] = { y: d.getFullYear(), m: d.getMonth(), events: [], posts: [], t: 0 };
    main.insertAdjacentHTML('beforeend', `<section class="page" id="page-${g.page}" data-title="${esc(g.name)}">${hero(g.name, g.tagline)}
      <section class="section container"><div class="gp-grid">
        <div class="gp-main">
          <div class="card gp-card"><h2 class="headline sm">About</h2><p>${esc(g.about)}</p>
            <p class="gp-meta"><span class="material-symbols-outlined">schedule</span>${esc(g.meets)}</p>
            ${g.area ? `<p class="gp-meta"><span class="material-symbols-outlined">location_on</span>${esc(g.area)}</p>` : ''}
            ${g.leader ? `<p class="gp-meta"><span class="material-symbols-outlined">person</span>Leader: ${esc(g.leader)}</p>` : ''}
            <a class="btn btn-secondary btn-sm" href="${esc(C.social.whatsapp)}" target="_blank" rel="noopener noreferrer">Join / ask on WhatsApp</a></div>
          <div class="card gp-card"><h2 class="headline sm">Updates &amp; Announcements</h2><div class="gp-posts" data-posts></div></div>
        </div>
        <aside class="gp-side">
          <div class="card gp-card"><h2 class="headline sm">Calendar</h2><div class="cal" data-cal></div></div>
          <div class="card gp-card"><h2 class="headline sm">Upcoming events</h2><div class="gp-events" data-events></div></div>
        </aside></div>
        <div class="card gp-card gp-manage is-hidden" data-manage><h2 class="headline sm">Manage this page</h2>
          <p class="hint">You are signed in as a leader for this page. Changes appear immediately.</p>
          <div class="gp-forms">
            <form data-form="event" class="gp-form" novalidate><h3>Add an event</h3>
              <div class="field"><label class="field-label">Title</label><input name="title" required></div>
              <div class="field"><label class="field-label">Date</label><input name="date" type="date" required></div>
              <div class="field"><label class="field-label">Time</label><input name="time" type="time"></div>
              <div class="field"><label class="field-label">Location</label><input name="location"></div>
              <button class="btn btn-primary btn-sm" type="submit">Add event</button></form>
            <form data-form="post" class="gp-form" novalidate><h3>Post an update</h3>
              <div class="field"><label class="field-label">Title</label><input name="title" required></div>
              <div class="field"><label class="field-label">Message</label><textarea name="body" rows="5" required></textarea></div>
              <button class="btn btn-primary btn-sm" type="submit">Post update</button></form>
          </div><div class="alert is-hidden" data-alert role="status"></div></div>
      </section></section>`);
  });

  main.insertAdjacentHTML('beforeend', `<section class="page" id="page-penniel-housing" data-title="Penniel Housing">${hero('Penniel Housing', 'A church project — coming soon')}
    <section class="section container narrow"><div class="card gp-card center soon"><span class="material-symbols-outlined soon-icon">home_work</span>
    <h2 class="headline sm">Details coming soon</h2><p>Penniel Housing is a DCI Kizito project. Full information on available plots and how to enquire will be published here shortly.</p>
    <button class="btn btn-primary" data-link data-target="#contact" type="button">Enquire about Penniel Housing</button></div></section></section>`);

  /* calendar */
  function drawCal(g) {
    const st = S[g.page], box = q(`#page-${g.page} [data-cal]`), y = st.y, m = st.m;
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), off = first.getDay(), now = new Date();
    const has = new Set(st.events.map((e) => String(e.date).slice(0, 10)));
    let cells = 'SMTWTFS'.split('').map((d) => `<b>${d}</b>`).join('') + '<i></i>'.repeat(off);
    for (let d = 1; d <= days; d++) {
      const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells += `<span class="${has.has(k) ? 'has' : ''}${now.getFullYear() === y && now.getMonth() === m && now.getDate() === d ? ' today' : ''}">${d}</span>`;
    }
    box.innerHTML = `<div class="cal-head"><button type="button" data-step="-1" aria-label="Previous month">&lsaquo;</button><strong>${first.toLocaleString('en-KE', { month: 'long', year: 'numeric' })}</strong><button type="button" data-step="1" aria-label="Next month">&rsaquo;</button></div><div class="cal-grid">${cells}</div>`;
  }
  const canManage = (g) => {
    try { if (!isLoggedIn()) return false; const u = getStoredUser() || {}; return u.role === 'admin' || u.role === 'pastor' || (u.role === 'leader' && u.groupSlug === g.slug); } catch (e) { return false; }
  };
  function drawGroup(g) {
    const st = S[g.page], root = q('#page-' + g.page), mg = canManage(g);
    drawCal(g);
    const today = new Date().toISOString().slice(0, 10);
    const ev = st.events.filter((e) => String(e.date).slice(0, 10) >= today).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    q('[data-events]', root).innerHTML = ev.length ? ev.map((e) => `<div class="gp-ev"><div class="gp-date"><strong>${fmtDate(e.date, { day: 'numeric' })}</strong><span>${fmtDate(e.date, { month: 'short' })}</span></div>
      <div><strong>${esc(e.title)}</strong><p class="small muted">${[e.time ? String(e.time).slice(0, 5) : '', e.location].filter(Boolean).map(esc).join(' · ')}</p></div>
      ${mg && e.id ? `<button class="gp-del" data-del="events" data-id="${e.id}" aria-label="Delete event" type="button">&times;</button>` : ''}</div>`).join('') : '<p class="muted">No upcoming events posted yet. Check back soon.</p>';
    q('[data-posts]', root).innerHTML = st.posts.length ? st.posts.map((p) => `<article class="gp-post"><h3>${esc(p.title)}</h3><p class="small muted">${p.date ? fmtDate(p.date) : ''}</p><p>${esc(p.body).replace(/\n/g, '<br>')}</p>
      ${mg && p.id ? `<button class="gp-del" data-del="posts" data-id="${p.id}" aria-label="Delete update" type="button">&times;</button>` : ''}</article>`).join('') : '<p class="muted">No updates yet.</p>';
    q('[data-manage]', root).classList.toggle('is-hidden', !mg);
  }
  async function loadGroup(g) {
    const st = S[g.page];
    if (Date.now() - st.t > 30000) {
      try {
        const d = await apiRequest('/groups/' + g.slug);
        st.events = (g.events || []).concat(d.events || []);
        st.posts = (d.posts || []).map((p) => ({ id: p.id, title: p.title, body: p.body, date: p.created_at })).concat(g.updates || []);
      } catch (e) { st.events = g.events || []; st.posts = g.updates || []; }
      st.t = Date.now();
    }
    drawGroup(g);
  }
  main.addEventListener('click', async (e) => {
    const page = e.target.closest('.page'); if (!page) return;
    const g = ALL.find((x) => 'page-' + x.page === page.id); if (!g) return;
    const step = e.target.closest('[data-step]');
    if (step) { const st = S[g.page]; st.m += Number(step.dataset.step); if (st.m < 0) { st.m = 11; st.y--; } if (st.m > 11) { st.m = 0; st.y++; } drawCal(g); return; }
    const del = e.target.closest('[data-del]');
    if (del && confirm('Delete this item?')) {
      try { await apiRequest(`/groups/${g.slug}/${del.dataset.del}/${del.dataset.id}`, { method: 'DELETE' }); S[g.page].t = 0; loadGroup(g); } catch (err) { showToast(err.message, 'error'); }
    }
  });
  main.addEventListener('submit', async (e) => {
    const f = e.target.closest('.gp-form'); if (!f) return; e.preventDefault();
    const g = ALL.find((x) => 'page-' + x.page === e.target.closest('.page').id), data = Object.fromEntries(new FormData(f));
    try {
      await apiRequest(`/groups/${g.slug}/${f.dataset.form === 'event' ? 'events' : 'posts'}`, { method: 'POST', body: JSON.stringify(data) });
      f.reset(); S[g.page].t = 0; await loadGroup(g); showToast('Saved.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  /* ---------- Newsletter & Articles page ---------- */
  main.insertAdjacentHTML('beforeend', `<section class="page" id="page-newsletter" data-title="Newsletter &amp; Articles">${hero('Newsletters & Articles', 'News, teachings and encouragement from DCI Kizito')}
    <section class="section container"><div class="np-bar"><div class="np-tabs" role="tablist"><button class="on" data-f="" type="button">All</button><button data-f="newsletter" type="button">Newsletters</button><button data-f="article" type="button">Articles</button></div>
    <input id="np-search" type="search" placeholder="Search posts…" aria-label="Search posts"></div>
    <div class="np-grid" id="np-grid"></div>
    <div class="card gp-card is-hidden" id="np-admin"><h2 class="headline sm">Publish a post</h2>
      <form id="np-form" class="gp-form" novalidate>
        <div class="field"><label class="field-label">Type</label><select name="type"><option value="newsletter">Newsletter</option><option value="article">Article</option></select></div>
        <div class="field"><label class="field-label">Title</label><input name="title" required></div>
        <div class="field"><label class="field-label">Short summary</label><input name="excerpt" maxlength="300"></div>
        <div class="field"><label class="field-label">Content</label><textarea name="body" rows="8" required></textarea></div>
        <button class="btn btn-primary" type="submit">Publish</button></form></div></section></section>
    <div class="reader is-hidden" id="reader" role="dialog" aria-modal="true" aria-label="Post"><div class="reader-card"><button class="reader-x" type="button" aria-label="Close">&times;</button><div id="reader-body"></div></div></div>`);
  const NP = { posts: [], f: '', s: '', t: 0 };
  function drawPosts() {
    const rows = NP.posts.filter((p) => (!NP.f || p.type === NP.f) && (!NP.s || (p.title + ' ' + (p.excerpt || '')).toLowerCase().includes(NP.s)));
    q('#np-grid').innerHTML = rows.length ? rows.map((p, i) => `<article class="np-card" data-i="${NP.posts.indexOf(p)}" tabindex="0"><span class="np-tag np-${p.type}">${p.type === 'newsletter' ? 'Newsletter' : 'Article'}</span>
      <h3>${esc(p.title)}</h3><p>${esc(p.excerpt || String(p.body).slice(0, 140) + '…')}</p><small>${fmtDate(p.date || p.published_at)} · ${esc(p.author || 'DCI Kizito')}</small></article>`).join('') : '<p class="muted">Nothing here yet — check back soon.</p>';
    let u = null; try { u = isLoggedIn() && getStoredUser(); } catch (e) { }
    q('#np-admin').classList.toggle('is-hidden', !(u && (u.role === 'admin' || u.role === 'pastor')));
    initReveal();
  }
  async function loadPosts() {
    if (Date.now() - NP.t > 30000) {
      try { const d = await apiRequest('/posts'); NP.posts = (d.posts || []).concat(C.articles.filter(() => !(d.posts || []).length)); }
      catch (e) { NP.posts = C.articles.slice(); }
      NP.t = Date.now();
    }
    drawPosts();
  }
  q('.np-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; qa('.np-tabs button').forEach((x) => x.classList.toggle('on', x === b)); NP.f = b.dataset.f; drawPosts(); });
  q('#np-search').addEventListener('input', (e) => { NP.s = e.target.value.trim().toLowerCase(); drawPosts(); });
  const openPost = (el) => { const p = NP.posts[el.dataset.i]; if (!p) return; q('#reader-body').innerHTML = `<span class="np-tag np-${p.type}">${esc(p.type)}</span><h2>${esc(p.title)}</h2><p class="small muted">${fmtDate(p.date || p.published_at)} · ${esc(p.author || 'DCI Kizito')}</p><div class="reader-text">${esc(p.body).replace(/\n/g, '<br>')}</div>`; q('#reader').classList.remove('is-hidden'); };
  q('#np-grid').addEventListener('click', (e) => { const c = e.target.closest('.np-card'); if (c) openPost(c); });
  q('#np-grid').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const c = e.target.closest('.np-card'); if (c) openPost(c); } });
  q('#reader').addEventListener('click', (e) => { if (e.target.id === 'reader' || e.target.closest('.reader-x')) q('#reader').classList.add('is-hidden'); });
  q('#np-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await apiRequest('/posts', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) }); e.target.reset(); NP.t = 0; await loadPosts(); showToast('Published.', 'success'); }
    catch (err) { showToast(err.message, 'error'); }
  });

  /* ---------- Floating buttons ---------- */
  document.body.insertAdjacentHTML('beforeend', `<a class="fab fab-wa" href="${esc(C.social.whatsapp)}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">${SOC.whatsapp[1]}</a>`);

  /* ---------- Cookie consent ---------- */
  const CK = 'dic_consent', CV = 1;
  const CATS = [
    ['necessary', 'Necessary', 'Needed for the site to work: keeping you signed in, the human-verification check, security and remembering your cookie choice. Always on.'],
    ['preferences', 'Preferences', 'Remember your choices such as display options so the site feels the way you left it.'],
    ['statistics', 'Statistics', 'Anonymous information about how pages are used, so we can improve the website.'],
    ['marketing', 'Marketing', 'Used to measure campaigns and show relevant content from our social media channels.'],
  ];
  const getC = () => { try { const c = JSON.parse(localStorage.getItem(CK)); return c && c.v === CV ? c : null; } catch (e) { return null; } };
  function applyC(c) {
    window.DIC = window.DIC || {}; window.DIC.consent = c;
    if (c && c.statistics && C.analytics.gaId && !window._gaLoaded) {
      window._gaLoaded = true; const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + C.analytics.gaId; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', C.analytics.gaId, { anonymize_ip: true });
    }
    if (!c || !c.statistics) { document.cookie.split(';').forEach((k) => { const n = k.split('=')[0].trim(); if (/^(_ga|_gid|_gat)/.test(n)) document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; }); }
  }
  function saveC(o) {
    const c = { v: CV, necessary: true, preferences: !!o.preferences, statistics: !!o.statistics, marketing: !!o.marketing, ts: new Date().toISOString() };
    try { localStorage.setItem(CK, JSON.stringify(c)); } catch (e) { }
    applyC(c); document.dispatchEvent(new CustomEvent('dic:consent', { detail: c })); return c;
  }
  document.body.insertAdjacentHTML('beforeend', `
    <div class="ck-banner is-hidden" id="ck-banner" role="dialog" aria-label="Cookie consent"><div><strong>We value your privacy</strong>
      <p>We use cookies to keep the site secure and working, and — with your permission — to remember preferences, understand usage and support our outreach. You can change your mind any time.</p></div>
      <div class="ck-actions"><button class="btn btn-secondary btn-sm" id="ck-necessary" type="button">Necessary only</button><button class="btn btn-secondary btn-sm" id="ck-custom" type="button">Customize</button><button class="btn btn-primary btn-sm" id="ck-all" type="button">Allow all</button></div></div>
    <button class="ck-fab" id="ck-fab" type="button" aria-label="Cookie settings" title="Cookie settings"><span class="material-symbols-outlined">cookie</span></button>
    <div class="ck-modal is-hidden" id="ck-modal" role="dialog" aria-modal="true" aria-labelledby="ck-title"><div class="ck-card">
      <div class="ck-head"><h2 id="ck-title">Cookie settings</h2><button class="reader-x" id="ck-x" type="button" aria-label="Close">&times;</button></div>
      <div class="ck-state"><span class="small muted">Your current state</span><strong id="ck-state"></strong></div>
      <div id="ck-cats"></div>
      <button class="ck-details" id="ck-details" type="button" aria-expanded="false">Show details</button>
      <div class="ck-foot"><button class="btn btn-secondary btn-sm" id="ck-withdraw" type="button">Withdraw your consent</button><button class="btn btn-secondary btn-sm" id="ck-allow2" type="button">Allow all</button><button class="btn btn-primary btn-sm" id="ck-save" type="button">Change your consent</button></div></div></div>`);
  const kb = q('#ck-banner'), km = q('#ck-modal');
  function stateText(c) {
    if (!c) return 'No choice made yet';
    const on = CATS.filter((x) => c[x[0]]).map((x) => x[1]);
    return (on.length === 4 ? 'All cookies allowed' : on.length === 1 ? 'Necessary only' : 'Allowed: ' + on.join(', ')) + ' · ' + fmtDate(c.ts);
  }
  function drawModal() {
    const c = getC() || { necessary: true };
    q('#ck-state').textContent = stateText(getC());
    q('#ck-cats').innerHTML = CATS.map((x) => `<div class="ck-cat"><div class="ck-row"><label for="ck-${x[0]}">${x[1]}</label>
      <input type="checkbox" role="switch" id="ck-${x[0]}" ${c[x[0]] || x[0] === 'necessary' ? 'checked' : ''} ${x[0] === 'necessary' ? 'disabled' : ''}></div><p class="ck-desc">${x[2]}</p></div>`).join('');
    q('#ck-save').textContent = getC() ? 'Change your consent' : 'Save my choices';
    q('#ck-withdraw').classList.toggle('is-hidden', !getC());
  }
  const openModal = () => { kb.classList.add('is-hidden'); drawModal(); km.classList.remove('is-hidden'); q('#ck-save').focus(); };
  const closeModal = () => { km.classList.add('is-hidden'); if (!getC()) kb.classList.remove('is-hidden'); };
  const all = { preferences: 1, statistics: 1, marketing: 1 };
  q('#ck-all').onclick = () => { saveC(all); kb.classList.add('is-hidden'); };
  q('#ck-necessary').onclick = () => { saveC({}); kb.classList.add('is-hidden'); };
  q('#ck-custom').onclick = openModal; q('#ck-fab').onclick = openModal; q('#ck-x').onclick = closeModal;
  q('#ck-allow2').onclick = () => { saveC(all); km.classList.add('is-hidden'); showToast('Cookie preferences saved.', 'success'); };
  q('#ck-save').onclick = () => { saveC({ preferences: q('#ck-preferences').checked, statistics: q('#ck-statistics').checked, marketing: q('#ck-marketing').checked }); km.classList.add('is-hidden'); showToast('Cookie preferences saved.', 'success'); };
  q('#ck-withdraw').onclick = () => { saveC({}); try { localStorage.removeItem(CK); } catch (e) { } window.DIC.consent = null; drawModal(); showToast('Consent withdrawn. Only necessary cookies are used.', 'success'); };
  q('#ck-details').onclick = (e) => { const o = km.classList.toggle('show-details'); e.target.textContent = o ? 'Hide details' : 'Show details'; e.target.setAttribute('aria-expanded', o); };
  km.addEventListener('click', (e) => { if (e.target === km) closeModal(); });
  document.addEventListener('click', (e) => { if (e.target.closest('#open-cookie-settings')) openModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { km.classList.add('is-hidden'); q('#reader').classList.add('is-hidden'); q('#bot').classList.remove('open'); } });
  const c0 = getC(); applyC(c0); if (!c0) setTimeout(() => kb.classList.remove('is-hidden'), 600);

  /* ---------- Chatbot ---------- */
  const BOT = [
    { k: /\b(hi|hello|hey|habari|jambo|good (morning|evening|afternoon))\b/, a: 'Hello and welcome to DCI Kizito! 👋 What would you like to find?', go: [['Give', '#give'], ['Events', '#events'], ['Sermons', '#sermons']] },
    { k: /giv|tith|offer|donat|m-?pesa|pay|seed/, a: 'You can give your tithe or offering securely with M-Pesa (in KES) on our Give page.', go: [['Go to Give', '#give']] },
    { k: /service|worship|sunday|time|schedule|when/, a: 'Our service times are on the Home page. For this month’s programme, see Events.', go: [['Service times', '#home'], ['Events', '#events']] },
    { k: /sermon|preach|message|watch|\blive\b|video/, a: 'You can watch and listen to recent sermons on the Sermons page.', go: [['Sermons', '#sermons']] },
    { k: /event|calendar|program/, a: 'Upcoming church events are listed on the Events page.', go: [['Events', '#events']] },
    { k: /news|article|blog|\bread\b/, a: 'Our newsletters and articles are on the Newsletter & Articles page.', go: [['Newsletters & Articles', '#newsletter']] },
    { k: /\bmen\b|men's|brother/, a: 'Here is the Men’s Group page.', go: [['Men’s Group', '#group-men']] },
    { k: /women|ladies|sister|mama/, a: 'Here is the Women’s Group page.', go: [['Women’s Group', '#group-women']] },
    { k: /youth|teen|young/, a: 'Here is the Youth & Teens page.', go: [['Youth & Teens', '#group-youth']] },
    { k: /penniel|land|plot|housing|property/, a: 'Penniel Housing is our church land project. Details are coming soon — you can enquire through Contact.', go: [['Penniel Housing', '#penniel-housing'], ['Contact us', '#contact']] },
    { k: /login|log in|sign in|account|register|sign up|member|dashboard/, a: 'You can sign in or create a member account here.', go: [['Member login', '#login'], ['Register', '#register']] },
    { k: /contact|location|locate|address|where|direction|get there|find you|map|parking|phone|call|email|reach|visit|pastor|prayer/, a: 'We’d love to hear from you. Use the Contact page or message us on WhatsApp.', go: [['Contact', '#contact']] },
    { k: /about|who|vision|mission|belie|history/, a: 'Learn about our story and mission on the About page.', go: [['About us', '#about']] },
    { k: /privacy|data|terms|legal/, a: 'Our legal pages are here.', go: [['Privacy Policy', '#privacy'], ['Terms', '#terms']] },
    { k: /cookie/, a: 'You can review or change your cookie choices at any time.', go: [['Cookie settings', 'cookies']] },
  ];
  document.body.insertAdjacentHTML('beforeend', `<button class="fab fab-bot" id="bot-fab" type="button" aria-label="Open chat assistant" aria-expanded="false"><span class="material-symbols-outlined">chat</span></button>
    <section class="bot" id="bot" aria-label="Website assistant"><header><img src="images/logo.jpg" alt=""><div><strong>DCI Assistant</strong><small>Ask me where to find things</small></div><button type="button" id="bot-x" aria-label="Close chat">&times;</button></header>
    <div class="bot-log" id="bot-log" aria-live="polite"></div>
    <div class="bot-chips" id="bot-chips"></div>
    <form class="bot-form" id="bot-form"><input id="bot-in" autocomplete="off" placeholder="Type e.g. “how do I give?”" aria-label="Your message"><button class="btn btn-primary btn-sm" type="submit" aria-label="Send"><span class="material-symbols-outlined">send</span></button></form></section>`);
  const bot = q('#bot'), log = q('#bot-log');
  const say = (html, me) => { const d = document.createElement('div'); d.className = 'msg ' + (me ? 'me' : 'from-bot'); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; };
  const goBtns = (go) => go ? '<div class="msg-go">' + go.map((g) => `<button type="button" data-go="${esc(g[1])}">${esc(g[0])}</button>`).join('') + '</div>' : '';
  function reply(t) {
    t = t.toLowerCase();
    const fm = /fellowship\s*(?:group)?\s*#?(\d{1,2})/.exec(t);
    if (fm && +fm[1] >= 1 && +fm[1] <= 20) return say(`Here is Fellowship Group ${+fm[1]}.` + goBtns([['Fellowship Group ' + +fm[1], '#fellowship-' + +fm[1]]]));
    if (/fellowship|cell|home group|small group/.test(t)) return say('We have up to 20 fellowship groups — pick yours from the <b>Groups ▸ Fellowship Groups</b> menu, or tell me the number (e.g. “fellowship 7”).' + goBtns([['Men', '#group-men'], ['Women', '#group-women'], ['Youth', '#group-youth']]));
    if (/group|ministr/.test(t)) return say('We have Men’s, Women’s, Youth & Teens, and Fellowship groups. Which one?' + goBtns([['Men’s', '#group-men'], ['Women’s', '#group-women'], ['Youth & Teens', '#group-youth'], ['Penniel Housing', '#penniel-housing']]));
    const hit = BOT.find((b) => b.k.test(t));
    if (hit) return say(esc(hit.a) + goBtns(hit.go));
    say('I’m not sure I understood that — try one of these, or chat with our team on WhatsApp.' + goBtns([['Give', '#give'], ['Events', '#events'], ['Contact', '#contact']]) + `<a class="msg-wa" href="${esc(C.social.whatsapp)}" target="_blank" rel="noopener noreferrer">Open WhatsApp</a>`);
  }
  const chips = ['How do I give?', 'Service times', 'Upcoming events', 'Groups', 'Newsletter', 'Contact'];
  q('#bot-chips').innerHTML = chips.map((c) => `<button type="button">${c}</button>`).join('');
  q('#bot-chips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { say(esc(b.textContent), 1); reply(b.textContent); } });
  const toggleBot = (o) => { const open = o === undefined ? !bot.classList.contains('open') : o; bot.classList.toggle('open', open); q('#bot-fab').setAttribute('aria-expanded', open); if (open && !log.children.length) { say('Peace be with you! 🙏 I’m the DCI Kizito assistant. I can point you to giving, events, sermons, groups and more.'); } if (open) q('#bot-in').focus(); };
  q('#bot-fab').onclick = () => toggleBot(); q('#bot-x').onclick = () => toggleBot(false);
  q('#bot-form').addEventListener('submit', (e) => { e.preventDefault(); const i = q('#bot-in'), v = i.value.trim(); if (!v) return; i.value = ''; say(esc(v), 1); setTimeout(() => reply(v), 350); });
  log.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    if (b.dataset.go === 'cookies') return openModal();
    navigateTo(b.dataset.go); if (innerWidth < 640) toggleBot(false);
  });

  /* ---------- "Verify you are human" (self-hosted proof-of-work) ---------- */
  const HC = { 'login-form': 1, 'register-form': 0, 'contact-form': 0, 'donation-form': 0 };
  const hcHTML = (big) => `<div class="hc${big ? ' hc-lg' : ''}" data-state="idle">${big ? '<div class="hc-head"><span class="material-symbols-outlined hc-icon">shield_person</span><div><h3>Verify you are human</h3><p>To keep our members safe, please complete this quick check before signing in.</p></div></div>' : ''}
    <label class="hc-box"><input type="checkbox" class="hc-cb"><span class="hc-text">I’m not a robot</span><span class="material-symbols-outlined hc-spin">sync</span><span class="material-symbols-outlined hc-ok">verified</span></label>
    <div class="hc-foot">Protected by DCI Shield</div><div class="hc-msg" role="status" aria-live="polite"></div></div>`;
  async function solve(ch) {
    const enc = new TextEncoder(), hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
    for (let s = 0; s <= ch.maxnumber; s += 256) {
      const hs = await Promise.all(Array.from({ length: Math.min(256, ch.maxnumber - s + 1) }, (_, i) => crypto.subtle.digest('SHA-256', enc.encode(ch.salt + (s + i))).then(hex)));
      const i = hs.indexOf(ch.challenge); if (i >= 0) return s + i;
    }
    throw new Error('unsolved');
  }
  // No backend configured yet (e.g. site just published on GitHub Pages): run the same puzzle locally so the box works.
  async function localChallenge() {
    const hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
    const salt = hex(crypto.getRandomValues(new Uint8Array(12))) + '?expires=' + (Date.now() + 300000), number = Math.floor(Math.random() * 60000);
    const challenge = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + number)));
    return { algorithm: 'SHA-256', challenge, salt, maxnumber: 60000, signature: 'local' };
  }
  function hcReset(w, msg) { w.dataset.state = 'idle'; w._token = null; clearTimeout(w._t); q('.hc-cb', w).checked = false; q('.hc-msg', w).textContent = msg || ''; }
  Object.keys(HC).forEach((id) => {
    const f = q('#' + id); if (!f) return;
    const b = q('button[type="submit"]', f) || f.lastElementChild;
    b.insertAdjacentHTML('beforebegin', hcHTML(HC[id]));
    const w = q('.hc', f), cb = q('.hc-cb', w), m = q('.hc-msg', w);
    cb.addEventListener('change', async () => {
      if (!cb.checked) return hcReset(w);
      if (!(window.crypto && crypto.subtle)) { cb.checked = false; m.textContent = 'Please open this site over HTTPS to use the security check.'; return; }
      w.dataset.state = 'busy'; m.textContent = 'Verifying…';
      try {
        const ch = CONFIG.API_BASE_URL ? await apiRequest('/captcha/challenge') : await localChallenge(), n = await solve(ch);
        w._token = btoa(JSON.stringify({ algorithm: ch.algorithm, challenge: ch.challenge, number: n, salt: ch.salt, signature: ch.signature }));
        w.dataset.state = 'ok'; m.textContent = 'Verified. You can continue.';
        w._t = setTimeout(() => hcReset(w, 'Verification expired — please tick the box again.'), 270000);
      } catch (e) { hcReset(w, (e && e.message && e.message !== 'unsolved') ? e.message : 'Could not verify right now. Please try again.'); }
    });
  });
  window.DICCaptcha = {
    consume(formId) {
      const w = q('#' + formId + ' .hc'); if (!w) return undefined;
      if (!w._token) { w.dataset.state = 'error'; throw new Error('Please tick “I’m not a robot” to continue.'); }
      const t = w._token; hcReset(w); return t;
    },
  };

  /* ---------- Animations ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.1 }) : null;
  function initReveal() {
    if (!io || reduceMotion) return;
    qa('.page.is-active .section > *, .page.is-active .info-card, .page.is-active .np-card, .page.is-active .gp-card').forEach((el, i) => {
      if (el.classList.contains('reveal')) return; el.classList.add('reveal'); el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el);
    });
  }
  const hdr = q('#site-header');
  addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 8), { passive: true });

  /* ---------- Route hook ---------- */
  function onRoute() {
    const id = (location.hash || '#home').slice(1), g = ALL.find((x) => x.page === id);
    if (g) loadGroup(g); if (id === 'newsletter') loadPosts();
    setTimeout(initReveal, 30);
  }
  addEventListener('hashchange', onRoute); addEventListener('load', onRoute);
})();
