/* =========================================================
   DCI Kizito — motion layer (own code, vanilla JS)
   Hero slider (photos + video, swipe, arrows, autoplay), transparent
   header over the hero, scroll-reveal variants, parallax page headers,
   groups carousel, flip verse card, logo loader, back-to-top.
   ========================================================= */
(function () {
  'use strict';
  const C = window.DIC_CONTENT, H = C.hero;
  const q = (s, c) => (c || document).querySelector(s), qa = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saver = navigator.connection && navigator.connection.saveData;
  const ms = (n) => `<span class="material-symbols-outlined" aria-hidden="true">${n}</span>`;

  /* ---------- Logo loader ---------- */
  document.body.insertAdjacentHTML('afterbegin', '<div class="loader" id="loader" aria-hidden="true"><img src="images/logo.jpg" alt=""><span></span></div>');
  const hideLoader = () => { const l = q('#loader'); if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 700); } };
  addEventListener('load', () => setTimeout(hideLoader, 350)); setTimeout(hideLoader, 4000);

  /* ---------- Hero slider ---------- */
  const hero = q('.hero'), slides = H.slides || [], n = slides.length;
  if (hero && n) {
    qa('.hero-content,.hero-overlay', hero).forEach((e) => { e.style.display = 'none'; });
    hero.classList.add('hs');
    const wrap = document.createElement('div'); wrap.className = 'hs-wrap'; wrap.setAttribute('aria-roledescription', 'carousel'); wrap.setAttribute('aria-label', 'Featured');
    wrap.innerHTML = slides.map((s, i) => {
      const acts = (s.cta || [['Watch Live', '#sermons'], ['Plan a Visit', '#contact']]).map((c, j) =>
        `<button type="button" class="btn ${j ? 'btn-secondary btn-on-dark' : 'btn-primary'}" data-link data-target="${esc(c[1])}">${esc(c[0])}</button>`).join('');
      return `<div class="hs-slide${i === 0 ? ' on' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}">
        <div class="hs-bg g${i % 3}" ${s.img ? `style="background-image:url('${esc(s.img)}')"` : ''}></div>
        ${s.video ? `<video class="hs-video" muted loop playsinline preload="none" data-src="${esc(s.video)}" ${s.poster ? `poster="${esc(s.poster)}"` : ''} aria-hidden="true"></video>` : ''}
        <div class="hs-shade"></div>
        <div class="hs-content">${s.kicker ? `<span class="hs-kicker">${esc(s.kicker)}</span>` : ''}
          <${i ? 'h2' : 'h1'} class="hs-title">${esc(s.title)}</${i ? 'h2' : 'h1'}>
          <p class="hs-text">${esc(s.text || '')}</p>${s.ref ? `<p class="hs-ref">${esc(s.ref)}</p>` : ''}
          <div class="hs-actions">${acts}</div></div></div>`;
    }).join('');
    hero.prepend(wrap);
    hero.insertAdjacentHTML('beforeend', `
      ${n > 1 ? `<button class="hs-arrow hs-prev" type="button" aria-label="Previous slide">${ms('chevron_left')}</button><button class="hs-arrow hs-next" type="button" aria-label="Next slide">${ms('chevron_right')}</button>
      <div class="hs-ctrl"><button class="hs-pp" type="button" aria-label="Pause slideshow">${ms('pause')}</button><div class="hs-dots">${slides.map((_, i) => `<button type="button" aria-label="Go to slide ${i + 1}" class="${i ? '' : 'on'}"></button>`).join('')}</div></div>
      <div class="hs-progress"><span></span></div>` : ''}
      <div class="hs-chip">${ms('event')}${esc(H.month)} · ${esc(H.theme)}</div>
      <svg class="hs-wave" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path class="w1" d="M0,55 C140,95 330,5 500,45 C670,85 860,15 1000,55 L1000,100 L0,100Z"/><path class="w2" d="M0,70 C160,35 340,95 520,62 C700,30 860,85 1000,66 L1000,100 L0,100Z"/></svg>`);
    const els = qa('.hs-slide', wrap), dots = qa('.hs-dots button', hero), bar = q('.hs-progress span', hero);
    let cur = 0, t = null, userPaused = false, hover = false;
    const media = (el, on) => { const v = q('video', el); if (!v) return; if (on && !RM && !saver) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => { }); } else v.pause(); };
    const sched = () => {
      clearTimeout(t); if (bar) { bar.classList.remove('run'); void bar.offsetWidth; }
      if (n < 2 || RM || userPaused || hover || document.hidden) return;
      if (bar) bar.classList.add('run'); t = setTimeout(() => go(cur + 1), 7500);
    };
    function go(i) {
      i = (i + n) % n; if (i === cur) return;
      const p = els[cur]; p.classList.remove('on'); p.classList.add('leaving'); setTimeout(() => p.classList.remove('leaving'), 1300);
      media(p, false); els[i].classList.add('on'); media(els[i], true);
      dots.forEach((d, k) => d.classList.toggle('on', k === i)); cur = i; sched();
    }
    media(els[0], true); sched();
    hero.addEventListener('click', (e) => {
      if (e.target.closest('.hs-prev')) go(cur - 1);
      else if (e.target.closest('.hs-next')) go(cur + 1);
      const d = e.target.closest('.hs-dots button'); if (d) go(dots.indexOf(d));
      if (e.target.closest('.hs-pp')) { userPaused = !userPaused; const b = q('.hs-pp', hero); b.innerHTML = ms(userPaused ? 'play_arrow' : 'pause'); b.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow'); sched(); }
    });
    hero.addEventListener('mouseenter', () => { hover = true; sched(); }); hero.addEventListener('mouseleave', () => { hover = false; sched(); });
    hero.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(cur - 1); if (e.key === 'ArrowRight') go(cur + 1); });
    document.addEventListener('visibilitychange', sched);
    let x0 = null; hero.addEventListener('pointerdown', (e) => { if (!e.target.closest('button,a')) x0 = e.clientX; });
    hero.addEventListener('pointerup', (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 50) go(cur + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  }

  /* ---------- Groups carousel + verse flip card (home) ---------- */
  const band = q('#page-home .cta-band');
  if (band) {
    const cards = C.groups.map((g) => ({ p: g.page, n: g.name, t: g.tagline, i: g.icon }))
      .concat([{ p: 'fellowship-1', n: 'Fellowship Groups', t: '20 neighbourhood fellowships meeting in homes.', i: 'diversity_2' }, { p: 'penniel-housing', n: 'Penniel Housing', t: 'Our church land project — coming soon.', i: 'home_work' }]);
    const V = C.themeVerse;
    band.insertAdjacentHTML('beforebegin', `
      <section class="section container groups-home"><h2 class="headline center">Find Your Place</h2><p class="center muted">Groups and fellowships where you can belong, grow and serve.</p>
        <div class="gc"><button class="gc-nav gc-prev" type="button" aria-label="Previous">${ms('chevron_left')}</button>
        <div class="gc-track" tabindex="0">${cards.map((c, i) => `<a class="gc-card g${i % 3}" href="#${c.p}" data-link>${ms(c.i)}<h3>${esc(c.n)}</h3><p>${esc(c.t)}</p><span class="gc-more">Visit page ${ms('arrow_forward')}</span></a>`).join('')}</div>
        <button class="gc-nav gc-next" type="button" aria-label="Next">${ms('chevron_right')}</button></div></section>
      <section class="section container"><div class="flip" tabindex="0" role="button" aria-label="Flip the card to read this month’s verse"><div class="flip-in">
        <div class="flip-f">${ms('auto_stories')}<h3>${esc(H.month)}</h3><p>Verse of the Month</p><small>Tap or hover to read</small></div>
        <div class="flip-b"><p class="flip-verse">“${esc(V.text)}”</p><strong>${esc(V.ref)}</strong></div></div></div></section>`);
    const tr = q('.gc-track');
    q('.groups-home').addEventListener('click', (e) => { const b = e.target.closest('.gc-nav'); if (b) tr.scrollBy({ left: (b.classList.contains('gc-next') ? 1 : -1) * tr.clientWidth * 0.8, behavior: RM ? 'auto' : 'smooth' }); });
    const fl = q('.flip'); fl.addEventListener('click', () => fl.classList.toggle('on')); fl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fl.classList.toggle('on'); } });
  }

  /* ---------- Header: transparent over the hero, solid after scrolling ---------- */
  const hdr = q('#site-header');
  const syncHeader = () => {
    const home = !location.hash || location.hash === '#home';
    document.body.classList.toggle('is-home', home);
    hdr.classList.toggle('over-hero', home && scrollY < 40);
  };

  /* ---------- Scroll reveal variants, parallax, back-to-top ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rv-in'); io.unobserve(e.target); } }), { threshold: 0.12 }) : null;
  function variants() {
    if (!io || RM) return;
    qa('.page.is-active .two-col > .col, .page.is-active .gc, .page.is-active .flip, .page.is-active .portrait-card, .page.is-active .gp-card').forEach((el) => {
      if (el.dataset.rv) return;
      const col = el.parentElement && el.parentElement.classList.contains('two-col');
      el.dataset.rv = col ? (el === el.parentElement.firstElementChild ? 'l' : 'r') : (el.matches('.flip,.portrait-card') ? 'z' : 'u');
      el.classList.add('rv'); io.observe(el);
    });
  }
  const btt = document.createElement('button'); btt.className = 'btt'; btt.type = 'button'; btt.setAttribute('aria-label', 'Back to top'); btt.innerHTML = ms('arrow_upward');
  document.body.appendChild(btt); btt.onclick = () => scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
  let tick = false;
  addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      tick = false; syncHeader(); btt.classList.toggle('show', scrollY > 700);
      if (!RM) qa('.page.is-active .page-hero').forEach((h) => { h.style.backgroundPositionY = `0, ${Math.min(scrollY * 0.3, 120)}px, 0`; });
    });
  }, { passive: true });
  const route = () => { syncHeader(); setTimeout(variants, 60); };
  addEventListener('hashchange', route); addEventListener('load', route); route();
})();
