/* ============================================================
   main.js — Lenis smooth scroll, nav, custom cursor, loader
   ============================================================ */

// ---------- Lenis (physics-based smooth scroll) ----------
let lenis;
function initLenis() {
  if (document.getElementById('contactForm')) {
    document.documentElement.classList.add('native-scroll');
    return;
  }
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({
    duration: 1.05,
    easing: function (t) { return 1 - Math.pow(1 - t, 3); },
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.35,
    lerp: 0.075,
  });

  // Lenis must be driven by one animation clock only; double RAF makes scroll feel uneven.
  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', function () {
      ScrollTrigger.update();
      document.dispatchEvent(new CustomEvent('lenisScroll'));
    });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    lenis.on('scroll', function () {
      document.dispatchEvent(new CustomEvent('lenisScroll'));
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  window.lenis = lenis;
}

// ---------- Loader ----------
function hideLoader() {
  const loader = document.querySelector('.loader');
  if (loader) {
    setTimeout(function () { loader.classList.add('is-hidden'); }, 600);
  }
}

// ---------- Navigation ----------
function initNav() {
  if (initNav.didRun) return;
  initNav.didRun = true;

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('is-open');
      links.classList.toggle('is-open');
    });
    // close on link click (mobile)
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        toggle.classList.remove('is-open');
        links.classList.remove('is-open');
      });
    });
  }

  // Highlight active link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('is-active');
    }
  });

  // Header state is consumed by the immersive CSS layer.
  const header = document.querySelector('.site-header');
  if (!header) return;
  function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  updateHeader();
  window.addEventListener('scroll', function () {
    updateHeader();
  }, { passive: true });
}

// ---------- Custom cursor ----------
function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  document.body.appendChild(cursor);

  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    cursor.classList.add('is-visible');
  });
  document.addEventListener('mouseleave', function () { cursor.classList.remove('is-visible'); });

  // Smooth follow
  function loop() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
    requestAnimationFrame(loop);
  }
  loop();

  // Hover state on links and buttons
  document.querySelectorAll('a, button, [role="button"]').forEach(function (el) {
    el.addEventListener('mouseenter', function () { cursor.classList.add('is-link'); });
    el.addEventListener('mouseleave', function () { cursor.classList.remove('is-link'); });
  });
}

// ---------- Service card cursor-reactive glow ----------
function initServiceCards() {
  document.querySelectorAll('.service-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  });
}

// ---------- Scroll progress bar ----------
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress__bar');
  if (!bar) return;
  function update() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + '%';
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

// ---------- Lead source prefill ----------
function initLeadPrefill() {
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) return;

  ['subject', 'email', 'company', 'sector', 'timeline', 'message'].forEach(function (name) {
    const value = params.get(name);
    const field = document.querySelector('[name="' + name + '"]');
    if (value && field) field.value = value;
  });
}

// ---------- Init ----------
window.addEventListener('load', function () {
  initLenis();
  initNav();
  initCursor();
  initServiceCards();
  initScrollProgress();
  initLeadPrefill();
  hideLoader();
});

// On DOM ready (before full load) we can already initialise nav for accessibility.
document.addEventListener('DOMContentLoaded', initNav);
