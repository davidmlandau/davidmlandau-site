/* ============================================================
   news.js — Multilingual article cards + LinkedIn back-links
   Replace data/articles.json with final articles after translation.
   ============================================================ */

const NEWS_FALLBACK = window.DL_ARTICLES || { articles: [] };

let NEWS_DATA = null;

function newsEscape(value) {
  return String(value || '').replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function newsText(article, field, lang) {
  const value = article[field] || {};
  return value[lang] || value.fr || '';
}

function newsLang() {
  const htmlLang = document.documentElement.getAttribute('lang');
  if (['fr', 'en', 'nl'].includes(htmlLang)) return htmlLang;
  return window.getLang ? window.getLang() : 'fr';
}

function newsDate(date, lang) {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '';
  const locales = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-NL' };
  return parsed.toLocaleDateString(locales[lang] || 'fr-FR', { month: 'long', year: 'numeric' });
}

function newsLabel(key, fallback) {
  return window.t ? (window.t(key) || fallback) : fallback;
}

function renderNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid || !NEWS_DATA) return;
  const lang = newsLang();

  grid.innerHTML = NEWS_DATA.articles.map(function (article) {
    const title = newsText(article, 'title', lang);
    const excerpt = newsText(article, 'excerpt', lang);
    const category = newsText(article, 'category', lang);
    const meta = category + ' · ' + newsDate(article.date, lang);
    const href = article.url || 'article.html?id=' + encodeURIComponent(article.id);
    const label = newsLabel('news.read', "Lire l'analyse");
    const linkedinBadge = article.linkedinUrl
      ? '<span class="news-card__badge">LinkedIn</span>'
      : '<span class="news-card__badge is-muted">' + newsEscape(newsLabel('news.pending', 'Préparation LinkedIn')) + '</span>';
    const langBadge = '<span class="news-card__langs">' + newsEscape(newsLabel('news.languages', 'Disponible en FR · UK · NL')) + '</span>';
    const visual = window.dlArticleVisual ? window.dlArticleVisual(article.id, 'mini') : '';
    const action =
      '<a href="' + newsEscape(href) + '" class="news-card__read">' +
        '<span>' + newsEscape(label) + '</span>' +
        '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' +
      '</a>';

    return '' +
      '<article class="news-card" data-article-id="' + newsEscape(article.id) + '">' +
        visual +
        '<div class="news-card__cat">' + newsEscape(meta) + '</div>' +
        '<h3>' + newsEscape(title) + '</h3>' +
        '<p>' + newsEscape(excerpt) + '</p>' +
        langBadge +
        linkedinBadge +
        action +
      '</article>';
  }).join('');
}

async function loadNews() {
  if (window.DL_ARTICLES) {
    NEWS_DATA = window.DL_ARTICLES;
    return;
  }
  try {
    const response = await fetch('data/articles.json?v=20260503-article-dates', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    NEWS_DATA = await response.json();
  } catch (error) {
    console.warn('news: fallback data used', error.message);
    NEWS_DATA = NEWS_FALLBACK;
  }
}

async function initNews() {
  if (!document.getElementById('newsGrid')) return;
  document.addEventListener('langchange', renderNews);
  await loadNews();
  renderNews();
  requestAnimationFrame(renderNews);
  window.setTimeout(renderNews, 250);
}

window.addEventListener('load', initNews);
