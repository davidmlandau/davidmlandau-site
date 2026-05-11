/* ============================================================
   i18n.js — Trilingual (FR / EN / NL) with localStorage persistence
   ============================================================ */
(function () {
  const STORAGE_KEY = 'dl_lang';
  const DEFAULT_LANG = 'fr';
  const SUPPORTED = ['fr', 'en', 'nl'];
  let current = DEFAULT_LANG;
  let translations = null;

  async function loadTranslations() {
    try {
      const res = await fetch('data/translations.json?v=20260503-lead-engine', { cache: 'no-store' });
      translations = await res.json();
    } catch (e) {
      console.warn('i18n: translations.json indisponible', e);
    }
  }

  function detectLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.indexOf(stored) > -1) return stored;
    const browser = (navigator.language || 'fr').slice(0, 2);
    return SUPPORTED.indexOf(browser) > -1 ? browser : DEFAULT_LANG;
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    applyTranslations();
    updateSwitcher();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function t(key) {
    if (!translations || !translations[current]) return null;
    return translations[current][key] || (translations.fr ? translations.fr[key] : null);
  }
  window.t = t;
  window.getLang = function () { return current; };

  function applyTranslations() {
    if (!translations) return;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val == null) return;
      // For form placeholders, swap accordingly
      if (el.hasAttribute('data-i18n-attr')) {
        el.setAttribute(el.getAttribute('data-i18n-attr'), val);
      } else {
        el.textContent = val;
      }
    });
  }

  function updateSwitcher() {
    document.querySelectorAll('.lang-switcher button').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.lang === current);
    });
  }

  function initSwitcher() {
    document.querySelectorAll('.lang-switcher button').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.dataset.lang); });
    });
  }

  async function init() {
    await loadTranslations();
    current = detectLang();
    document.documentElement.setAttribute('lang', current);
    applyTranslations();
    initSwitcher();
    updateSwitcher();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
