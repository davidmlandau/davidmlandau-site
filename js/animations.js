/* ============================================================
   animations.js — GSAP ScrollTrigger orchestration
   Cinematic reveals : hero entry, scroll-driven parallax, stagger
   ============================================================ */

window.addEventListener('load', function () {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  // -------- Hero entry (line-by-line + word stagger) --------
  const heroLines = document.querySelectorAll('.hero-title .line .word');
  if (heroLines.length) {
    gsap.from(heroLines, {
      yPercent: 120,
      duration: 1.05,
      stagger: 0.06,
      ease: 'expo.out',
      delay: 0.25,
    });
  }

  gsap.from('.hero-content .eyebrow, .hero-subtitle, .hero-meta', {
    opacity: 0,
    y: 24,
    duration: 0.7,
    stagger: 0.08,
    ease: 'expo.out',
    delay: 0.7,
  });

  // -------- Section reveal helper --------
  function revealOnScroll(selector, opts) {
    document.querySelectorAll(selector).forEach(function (el) {
      gsap.from(el, Object.assign({
        scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none none' },
        opacity: 0,
        y: 60,
        duration: 0.85,
        ease: 'expo.out',
      }, opts || {}));
    });
  }

  revealOnScroll('.eyebrow:not(.hero-content .eyebrow)');
  revealOnScroll('h2:not(.hero-title)', { y: 80, duration: 0.9 });
  revealOnScroll('.lede, .manifesto__body, .about__body p, .section__head p', { duration: 1.05 });

  // -------- Stagger groups --------
  document.querySelectorAll('.services-grid, .news-grid, .about__stats, .feed-list, .offer-cards, .bio-snapshot, .funnel-proof, .funnel-offers').forEach(function (grid) {
    const items = grid.children;
    if (!items.length) return;
    gsap.from(items, {
      scrollTrigger: { trigger: grid, start: 'top 85%' },
      opacity: 0,
      y: 36,
      duration: 0.7,
      stagger: 0.06,
      ease: 'expo.out',
    });
  });

  // -------- Manifesto visual parallax --------
  document.querySelectorAll('.manifesto__visual').forEach(function (el) {
    gsap.fromTo(el, { y: 60 }, {
      y: -60,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  });

  // -------- About photo subtle parallax --------
  document.querySelectorAll('.about__photo').forEach(function (el) {
    gsap.fromTo(el, { y: 40 }, {
      y: -40,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  });

  // -------- Bio block paragraph stagger reveal --------
  document.querySelectorAll('.bio-block > p, .bio-block > .pull-quote-block, .bio-block > .bio-fit-card').forEach(function (el) {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 90%' },
      opacity: 0, y: 22, duration: 0.65, ease: 'expo.out',
    });
  });

  // -------- Portrait subtle scale-in --------
  document.querySelectorAll('.about-portrait').forEach(function (el) {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      opacity: 0, scale: 0.96, y: 28, duration: 0.85, ease: 'expo.out',
    });
  });

  // -------- Mantras stagger --------
  document.querySelectorAll('.mantras').forEach(function (grid) {
    gsap.from(grid.children, {
      scrollTrigger: { trigger: grid, start: 'top 86%' },
      opacity: 0, y: 36, duration: 0.7, stagger: 0.08, ease: 'expo.out',
    });
  });

  // -------- Ingredients reveal (cascade) --------
  document.querySelectorAll('.ingredients-grid').forEach(function (grid) {
    gsap.from(grid.children, {
      scrollTrigger: { trigger: grid, start: 'top 88%' },
      opacity: 0, y: 30, scale: 0.94, duration: 0.7, stagger: 0.07, ease: 'expo.out',
    });
  });

  // -------- Section background subtle parallax (immersion accrue) --------
  document.querySelectorAll('.section--blue-soft, .ingredients').forEach(function (sec) {
    gsap.fromTo(sec, { backgroundPosition: '50% 0%' }, {
      backgroundPosition: '50% 8%',
      ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  });

  // -------- Hero subtle scroll fade --------
  gsap.to('.hero-content', {
    opacity: 0.05,
    y: -80,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'bottom 90%', end: 'bottom top', scrub: 0.5 },
  });
});
