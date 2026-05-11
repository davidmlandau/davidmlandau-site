/* ============================================================
   article.js — Render one multilingual article from DL_ARTICLES
   ============================================================ */

let ARTICLE_DATA = window.DL_ARTICLES || { articles: [] };

function articleEscape(value) {
  return String(value || '').replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function articleLang() {
  const htmlLang = document.documentElement.getAttribute('lang');
  if (['fr', 'en', 'nl'].includes(htmlLang)) return htmlLang;
  return window.getLang ? window.getLang() : 'fr';
}

function articleText(article, field, lang) {
  const value = article[field] || {};
  return value[lang] || value.fr || '';
}

function articleDate(date, lang) {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '';
  const locales = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-NL' };
  return parsed.toLocaleDateString(locales[lang] || 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function articleLabel(key, fallback) {
  return window.t ? (window.t(key) || fallback) : fallback;
}

function articleId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}

function renderBlock(block) {
  if (block.type === 'h2') return '<h2>' + articleEscape(block.text) + '</h2>';
  if (block.type === 'ul') {
    return '<ul>' + (block.items || []).map(function (item) {
      return '<li>' + articleEscape(item) + '</li>';
    }).join('') + '</ul>';
  }
  return '<p>' + articleEscape(block.text) + '</p>';
}

function renderArticle() {
  const mount = document.getElementById('articleMount');
  if (!mount) return;

  const id = articleId();
  const article = ARTICLE_DATA.articles.find(function (item) { return item.id === id; }) || ARTICLE_DATA.articles[0];
  const lang = articleLang();

  if (!article) {
    mount.innerHTML = '<p class="article-empty">' + articleEscape(articleLabel('article.empty', 'Article indisponible.')) + '</p>';
    return;
  }

  const title = articleText(article, 'title', lang);
  const excerpt = articleText(article, 'excerpt', lang);
  const category = articleText(article, 'category', lang);
  const body = article.body && (article.body[lang] || article.body.fr) ? (article.body[lang] || article.body.fr) : [];
  const linkedin = article.linkedinUrl
    ? '<a class="article-linkedin" href="' + articleEscape(article.linkedinUrl) + '" target="_blank" rel="noopener">' + articleEscape(articleLabel('article.linkedin', 'Voir sur LinkedIn')) + '</a>'
    : '<span class="article-linkedin is-muted">' + articleEscape(articleLabel('article.linkedin.pending', 'Publication LinkedIn à venir')) + '</span>';
  const languages = '<span class="article-languages">' + articleEscape(articleLabel('article.languages', 'Article disponible en FR · UK · NL')) + '</span>';
  const visual = window.dlArticleVisual ? window.dlArticleVisual(article.id, 'hero') : '';
  const contactHref = 'contact.html?subject=recipe&message=' +
    encodeURIComponent(articleLabel('article.cta.message', 'Je souhaite une lecture rapide sur un enjeu similaire à : ') + title) +
    '#diagnostic';
  const leadCta =
    '<aside class="article-lead">' +
      '<span>' + articleEscape(articleLabel('article.cta.eyebrow', 'ENJEU SIMILAIRE')) + '</span>' +
      '<h2>' + articleEscape(articleLabel('article.cta.title', 'Vous avez un sujet ingrédient, recette ou marché à clarifier ?')) + '</h2>' +
      '<p>' + articleEscape(articleLabel('article.cta.body', 'Envoyez-moi votre question. Je vous réponds avec une première lecture concrète et, si le sujet s’y prête, une proposition d’échange.')) + '</p>' +
      '<a class="btn" href="' + articleEscape(contactHref) + '">' + articleEscape(articleLabel('article.cta.button', 'Demander une lecture rapide')) + '</a>' +
    '</aside>';

  document.title = title + ' — David Landau';
  mount.innerHTML =
    '<header class="article-hero">' +
      '<div class="article-hero__copy">' +
        '<div class="article-meta">' + articleEscape(category) + ' · ' + articleEscape(articleDate(article.date, lang)) + '</div>' +
        '<h1>' + articleEscape(title) + '</h1>' +
        '<p>' + articleEscape(excerpt) + '</p>' +
        '<div class="article-actions">' + languages + linkedin + '</div>' +
      '</div>' +
      visual +
    '</header>' +
    '<div class="article-body">' + body.map(renderBlock).join('') + '</div>' +
    leadCta;
}

function initArticle() {
  document.addEventListener('langchange', renderArticle);
  renderArticle();
  requestAnimationFrame(renderArticle);
  window.setTimeout(renderArticle, 250);
}

window.addEventListener('load', initArticle);
