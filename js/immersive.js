/* ============================================================
   immersive.js — cinematic interaction layer
   Handles page transitions, magnetic hover depth, ambient cursor
   response, and scroll-aware section lighting.
   ============================================================ */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createAmbientField() {
    if (reduceMotion) return;
    const field = document.createElement('div');
    field.className = 'ambient-field';
    field.setAttribute('aria-hidden', 'true');
    field.innerHTML = '<span class="ambient-field__node"></span><span class="ambient-field__node"></span><span class="ambient-field__node"></span>';
    document.body.prepend(field);

    const nodes = field.querySelectorAll('.ambient-field__node');
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;

    window.addEventListener('pointermove', function (event) {
      mx = (event.clientX / window.innerWidth - 0.5) * 2;
      my = (event.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    function loop() {
      tx += (mx - tx) * 0.055;
      ty += (my - ty) * 0.055;

      nodes.forEach(function (node, index) {
        const depth = (index + 1) * 14;
        node.style.setProperty('--ax', (tx * depth) + 'px');
        node.style.setProperty('--ay', (ty * depth * 0.7) + 'px');
      });

      requestAnimationFrame(loop);
    }

    loop();
  }

  function createPageTransition() {
    const transition = document.createElement('div');
    transition.className = 'page-transition';
    transition.setAttribute('aria-hidden', 'true');
    transition.innerHTML = [
      '<svg class="page-transition__mark" viewBox="0 0 100 80">',
      '<g fill="currentColor">',
      '<path d="M 5 55 L 28 22 L 38 32 L 55 8 L 88 55 Z" opacity=".72"/>',
      '<path d="M 38 55 L 55 8 L 70 28 L 88 55 Z"/>',
      '<path d="M 0 60 Q 24 66 50 63 Q 76 60 96 62" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".48"/>',
      '</g>',
      '</svg>',
    ].join('');
    document.body.appendChild(transition);

    if (!reduceMotion) {
      document.body.classList.add('is-arriving');
      window.setTimeout(function () {
        document.body.classList.remove('is-arriving');
      }, 950);
    }

    document.querySelectorAll('a[href]').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (link.target && link.target !== '_self') return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      link.addEventListener('click', function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (url.href === window.location.href) return;
        event.preventDefault();
        document.body.classList.add('is-leaving');
        window.setTimeout(function () {
          window.location.href = url.href;
        }, reduceMotion ? 0 : 520);
      });
    });
  }

  function initTiltAndGlow() {
    if (reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
    const cards = document.querySelectorAll('.service-card, .news-card, .ingredient, .mantra-card, .bio-fit-card, .offer-card, .funnel-offer, .proof-chip');

    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const tiltX = (0.5 - px) * 7;
        const tiltY = (py - 0.5) * 7;

        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        card.style.setProperty('--tilt-x', tiltX + 'deg');
        card.style.setProperty('--tilt-y', tiltY + 'deg');
      });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  function initMagneticLinks() {
    if (reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
    document.querySelectorAll('.btn, .social-link, .watch-tab, .nav-links a').forEach(function (el) {
      el.addEventListener('pointermove', function (event) {
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        el.style.transform = 'translate3d(' + (x * 0.12) + 'px,' + (y * 0.18) + 'px,0)';
      });

      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });
  }

  function initScrollLighting() {
    const sections = document.querySelectorAll('.section');
    if (!sections.length) return;
    let ticking = false;
    let activeSections = Array.from(sections);

    function updateSection(section) {
      const rect = section.getBoundingClientRect();
      const y = Math.max(0, Math.min(1, 1 - rect.top / window.innerHeight));
      section.style.setProperty('--spot-y', (20 + y * 58) + '%');
    }

    function updateVisibleSections() {
      activeSections.forEach(updateSection);
      ticking = false;
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateVisibleSections);
    }

    if ('IntersectionObserver' in window) {
      activeSections = [];
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('is-in-view', entry.isIntersecting);
          if (entry.isIntersecting) {
            if (activeSections.indexOf(entry.target) === -1) activeSections.push(entry.target);
          } else {
            activeSections = activeSections.filter(function (section) { return section !== entry.target; });
          }
        });
        requestUpdate();
      }, { threshold: 0.12 });
      sections.forEach(function (section) { observer.observe(section); });
    }

    window.addEventListener('pointermove', function (event) {
      const x = (event.clientX / window.innerWidth) * 100;
      document.documentElement.style.setProperty('--spot-x', x + '%');
    }, { passive: true });

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    document.addEventListener('lenisScroll', requestUpdate);
  }

  function initHeaderState() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    createAmbientField();
    createPageTransition();
    initTiltAndGlow();
    initMagneticLinks();
    initScrollLighting();
    initHeaderState();
  });
})();
