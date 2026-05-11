/* ============================================================
   rss.js — Watch radar
   Uses rss2json to read external RSS feeds in the browser.
   Keeps a local feed configuration fallback so the tool also works
   when the site is opened directly with file:// during review.
   ============================================================ */

const API_BASE = 'https://api.rss2json.com/v1/api.json';
const ITEMS_PER_FEED = 6;
const CLIENT_KEYWORDS = {
  tech: ['precision fermentation', 'fermentation', 'extrusion', 'automation', 'automatisation', 'ai', 'ia', 'bioprocessing', 'food processing', 'ingredient production', 'smart packaging'],
  trends: ['flavor trend', 'flavour trend', 'taste trend', 'new flavor', 'nouveau gout', 'texture', 'sensory', 'blend', 'melange', 'pairing', 'limited edition'],
  aroma: ['regulation', 'reglementation', 'efsa', 'fda', 'fema gras', 'flavouring', 'arome', 'additive', 'additif', 'restriction', 'compliance'],
  ingredients: ['ingredient', 'clean label', 'novel food', 'alternative protein', 'fiber', 'fibre', 'texturant', 'sweetener', 'nutrition', 'supplier'],
  ma: ['acquisition', 'merger', 'fusion', 'cession', 'sale', 'vente', 'funding', 'levee de fonds', 'investment', 'private equity', 'm&a']
};
const FALLBACK_CONFIG = {
  categories: {
    tech: {
      label_fr: 'Technologies',
      label_en: 'Technology',
      label_nl: 'Technologie',
      intro_fr: 'Nouvelles technologies utilisees pour produire des ingredients et transformer les aliments : fermentation de precision, extrusion, automatisation, IA, bioprocedes et packaging intelligent.',
      intro_en: 'New technologies used to produce ingredients and transform food: precision fermentation, extrusion, automation, AI, bioprocessing and smart packaging.',
      intro_nl: 'Nieuwe technologieen voor ingredientenproductie en voedselverwerking: precisiefermentatie, extrusie, automatisering, AI, bioprocessen en slimme verpakking.',
      feeds: [
        { name: 'AgFunderNews', url: 'https://www.agfundernews.com/feed' },
        { name: 'Packaging Dive', url: 'https://www.packagingdive.com/feeds/news/' },
        { name: 'Google News - production technologies', url: 'https://news.google.com/rss/search?q=%28%22ingredient+production%22+OR+%22food+processing+technology%22+OR+%22precision+fermentation%22+OR+%22extrusion+technology%22+OR+%22bioprocessing%22%29+%28food+OR+ingredients%29&hl=fr&gl=FR&ceid=FR:fr' },
        { name: 'Google News - technologies agroalimentaires', url: 'https://news.google.com/rss/search?q=%28%22technologie+agroalimentaire%22+OR+%22transformation+alimentaire%22+OR+%22fermentation+de+precision%22+OR+%22ingredients+innovants%22%29&hl=fr&gl=FR&ceid=FR:fr' }
      ]
    },
    trends: {
      label_fr: 'Tendances',
      label_en: 'Trends',
      label_nl: 'Trends',
      intro_fr: 'Nouveaux gouts, odeurs, textures, associations et melanges qui montent dans les lancements produits, la presse et les conversations consommateurs.',
      intro_en: 'New tastes, aromas, textures, pairings and blends gaining visibility in launches, media and consumer conversations.',
      intro_nl: 'Nieuwe smaken, geuren, texturen, combinaties en blends die zichtbaar worden in productlanceringen, media en consumentengesprekken.',
      feeds: [
        { name: 'Food Business News', url: 'https://www.foodbusinessnews.net/rss/topic/261-food' },
        { name: 'Food Dive', url: 'https://www.fooddive.com/feeds/news/' },
        { name: 'Google News - flavor trends', url: 'https://news.google.com/rss/search?q=%28%22flavor+trend%22+OR+%22flavour+trend%22+OR+%22taste+trend%22+OR+%22new+flavor%22+OR+%22flavour+combination%22%29+food&hl=fr&gl=FR&ceid=FR:fr' },
        { name: 'Google News - gouts odeurs melanges', url: 'https://news.google.com/rss/search?q=%28%22nouveau+gout%22+OR+%22tendance+gout%22+OR+%22arome+tendance%22+OR+%22melange+saveurs%22%29+alimentaire&hl=fr&gl=FR&ceid=FR:fr' }
      ]
    },
    aroma: {
      label_fr: 'Aromatique',
      label_en: 'Flavour regulation',
      label_nl: 'Aromaregulering',
      intro_fr: 'Developpements en matiere de regulation des aromes, additifs, substances aromatisantes, evaluations EFSA/FDA et cadre europeen.',
      intro_en: 'Regulatory developments on flavours, additives, flavouring substances, EFSA/FDA assessments and the European framework.',
      intro_nl: 'Regelgevende ontwikkelingen rond aroma\'s, additieven, aromastoffen, EFSA/FDA-beoordelingen en Europees kader.',
      feeds: [
        { name: 'Food Safety - Regulatory', url: 'https://www.food-safety.com/rss/topic/296-regulatory' },
        { name: 'Google News - flavor regulation', url: 'https://news.google.com/rss/search?q=%28%22flavor+regulation%22+OR+%22flavour+regulation%22+OR+%22flavouring+substances%22+OR+%22EFSA+flavouring%22+OR+%22FEMA+GRAS%22%29+food&hl=fr&gl=FR&ceid=FR:fr' },
        { name: 'Google News - regulation aromes', url: 'https://news.google.com/rss/search?q=%28%22reglementation+aromes%22+OR+%22substances+aromatisantes%22+OR+%22additifs+alimentaires%22+OR+EFSA%29+arome&hl=fr&gl=FR&ceid=FR:fr' }
      ]
    },
    ingredients: {
      label_fr: 'Ingredients',
      label_en: 'Ingredients',
      label_nl: 'Ingredienten',
      intro_fr: 'Developpements mondiaux sur les ingredients : clean label, proteines alternatives, fibres, texturants, nutrition, fonctionnalite et nouveaux fournisseurs.',
      intro_en: 'Global ingredient developments: clean label, alternative proteins, fibres, texturants, nutrition, functionality and new suppliers.',
      intro_nl: 'Wereldwijde ingredientenontwikkelingen: clean label, alternatieve eiwitten, vezels, texturanten, voeding, functionaliteit en nieuwe leveranciers.',
      feeds: [
        { name: 'Food Business News - Ingredients', url: 'https://www.foodbusinessnews.net/rss/topic/335-ingredients' },
        { name: 'Food Dive', url: 'https://www.fooddive.com/feeds/news/' },
        { name: 'Google News - ingredient development', url: 'https://news.google.com/rss/search?q=%28%22food+ingredients%22+OR+%22ingredient+innovation%22+OR+%22novel+food+ingredient%22+OR+%22alternative+protein+ingredients%22%29&hl=fr&gl=FR&ceid=FR:fr' }
      ]
    },
    ma: {
      label_fr: 'M&A',
      label_en: 'M&A',
      label_nl: 'M&A',
      intro_fr: 'Acquisitions, ventes, fusions, levees de fonds et mouvements strategiques dans l\'alimentaire, les ingredients, les aromes et la nutrition.',
      intro_en: 'Acquisitions, divestments, mergers, funding rounds and strategic moves in food, ingredients, flavours and nutrition.',
      intro_nl: 'Overnames, verkopen, fusies, financieringsrondes en strategische bewegingen in food, ingredienten, aroma\'s en voeding.',
      feeds: [
        { name: 'Food Dive - Deals', url: 'https://www.fooddive.com/feeds/news/' },
        { name: 'AgFunderNews', url: 'https://www.agfundernews.com/feed' },
        { name: 'Google News - food M&A', url: 'https://news.google.com/rss/search?q=%28%22food+acquisition%22+OR+%22food+merger%22+OR+%22ingredients+acquisition%22+OR+%22flavor+acquisition%22+OR+%22fusion+acquisition+agroalimentaire%22%29&hl=fr&gl=FR&ceid=FR:fr' }
      ]
    }
  }
};

let CONFIG = null;
let CURRENT_LANG = 'fr';
let RADAR_PAYLOAD = null;
let LIVE_RADAR_TIME = null;

async function fetchFeed(url) {
  const params = new URLSearchParams({ rss_url: url });
  try {
    const r = await fetch(API_BASE + '?' + params.toString());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (data.status !== 'ok') throw new Error(data.message || 'feed error');
    return (data.items || []).slice(0, ITEMS_PER_FEED).map(function (it) {
      return {
        source: data.feed && data.feed.title ? data.feed.title : '',
        title: it.title,
        link: it.link,
        pubDate: it.pubDate,
        description: stripHtml(it.description || '').slice(0, 240)
      };
    });
  } catch (e) {
    console.warn('feed error', url, e.message);
    return [];
  }
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function fmtDate(s, lang) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const locales = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-NL' };
  return d.toLocaleDateString(locales[lang] || 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(s, lang) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const locales = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-NL' };
  return d.toLocaleString(locales[lang] || 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter(function (item) {
    const key = normalizeText(item.title).split(' ').slice(0, 12).join(' ') || item.link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreLiveItem(categoryKey, item) {
  if (item.score) return item;
  const text = normalizeText(item.title + ' ' + item.description);
  const title = normalizeText(item.title);
  const matched = (CLIENT_KEYWORDS[categoryKey] || []).filter(function (keyword) {
    return text.includes(normalizeText(keyword));
  });
  const parsedDate = Date.parse(item.pubDate || '');
  const age = Number.isNaN(parsedDate) ? 30 : Math.max(0, (Date.now() - parsedDate) / 86400000);
  let score = 34;

  matched.forEach(function (keyword) {
    score += title.includes(normalizeText(keyword)) ? 10 : 5;
  });
  if (age <= 2) score += 24;
  else if (age <= 7) score += 18;
  else if (age <= 14) score += 10;
  else if (age <= 30) score += 4;

  return Object.assign({}, item, {
    score: Math.min(100, Math.round(score)),
    reason: matched.length
      ? 'Signal detecte autour de ' + matched.slice(0, 3).join(', ') + '.'
      : 'Signal recent repere dans les sources specialisees.'
  });
}

function getSearchQuery() {
  const search = document.getElementById('watchSearch');
  return search ? search.value.trim().toLowerCase() : '';
}

function matchesQuery(item, query) {
  if (!query) return true;
  return [item.source, item.title, item.description].join(' ').toLowerCase().includes(query);
}

function updateCount() {
  if (!CONFIG) return;
  const count = Object.keys(CONFIG.categories).reduce(function (total, key) {
    return total + (CONFIG.categories[key].items || []).length;
  }, 0);
  const el = document.getElementById('watch-count');
  if (el) el.textContent = String(count);
}

function buildLiveDigest() {
  if (!CONFIG || !CONFIG.categories) return [];
  return Object.keys(CONFIG.categories).flatMap(function (key) {
    const category = CONFIG.categories[key];
    return (category.items || []).slice(0, 3).map(function (item) {
      return {
        category: key,
        label_fr: category.label_fr,
        title: item.title,
        source: item.source,
        link: item.link,
        pubDate: item.pubDate,
        score: item.score,
        reason: item.reason
      };
    });
  }).sort(function (a, b) {
    return (b.score || 0) - (a.score || 0) || new Date(b.pubDate) - new Date(a.pubDate);
  }).slice(0, 6);
}

function renderBrief() {
  const brief = document.getElementById('watchBrief');
  const grid = document.getElementById('watchBriefGrid');
  const updated = document.getElementById('watchBriefUpdated');
  if (!brief || !grid) return;

  const digest = RADAR_PAYLOAD && RADAR_PAYLOAD.digest && RADAR_PAYLOAD.digest.length
    ? RADAR_PAYLOAD.digest
    : buildLiveDigest();
  if (!digest.length) return;

  brief.hidden = false;
  if (updated) {
    const label = window.t ? (window.t('watch.brief.updated') || 'Mis à jour') : 'Mis à jour';
    updated.textContent = label + ' · ' + fmtDateTime(RADAR_PAYLOAD ? RADAR_PAYLOAD.generatedAt : LIVE_RADAR_TIME, CURRENT_LANG);
  }

  grid.innerHTML = digest.slice(0, 6).map(function (it) {
    const categories = RADAR_PAYLOAD ? RADAR_PAYLOAD.categories : CONFIG.categories;
    const category = categories && categories[it.category] ? categories[it.category] : {};
    const label = category['label_' + CURRENT_LANG] || it.label_fr || it.category;
    return '' +
      '<article class="watch-brief-card">' +
        '<div class="watch-brief-card__meta">' +
          '<span>' + escapeHtml(label) + '</span>' +
          '<strong>' + escapeHtml(String(it.score || 0)) + '</strong>' +
        '</div>' +
        '<h3><a href="' + escapeHtml(it.link) + '" target="_blank" rel="noopener">' + escapeHtml(it.title) + '</a></h3>' +
        '<p>' + escapeHtml(it.reason || it.source || '') + '</p>' +
      '</article>';
  }).join('');
}

function renderItems(container, items, lang) {
  const query = getSearchQuery();
  const filtered = items.filter(function (item) { return matchesQuery(item, query); });

  if (!filtered.length) {
    container.innerHTML = '<div class="feed-empty">Aucun signal disponible pour ce filtre.</div>';
    return;
  }

  filtered.sort(function (a, b) {
    if (a.score || b.score) return (b.score || 0) - (a.score || 0) || new Date(b.pubDate) - new Date(a.pubDate);
    return new Date(b.pubDate) - new Date(a.pubDate);
  });
  container.innerHTML = filtered.map(function (it) {
    const desc = it.description + (it.description.length >= 240 ? '...' : '');
    const score = it.score ? '<span class="feed-score">Score ' + escapeHtml(String(it.score)) + '</span>' : '';
    const reason = it.reason ? '<p class="feed-reason">' + escapeHtml(it.reason) + '</p>' : '';
    return '' +
      '<article class="feed-item">' +
        '<div class="feed-meta">' +
          '<span class="source">' + escapeHtml(it.source) + '</span>' +
          '<span>' + fmtDate(it.pubDate, lang) + '</span>' +
          score +
        '</div>' +
        '<div>' +
          '<h3 class="feed-title"><a href="' + it.link + '" target="_blank" rel="noopener">' + escapeHtml(it.title) + '</a></h3>' +
          '<p class="feed-desc">' + escapeHtml(desc) + '</p>' +
          reason +
        '</div>' +
      '</article>';
  }).join('');
}

function renderCategory(catKey) {
  if (!CONFIG) return;
  const container = document.getElementById('feed-' + catKey);
  if (!container) return;
  renderItems(container, CONFIG.categories[catKey].items || [], CURRENT_LANG);
}

function renderAllCategories() {
  if (!CONFIG) return;
  Object.keys(CONFIG.categories).forEach(renderCategory);
}

async function loadCategory(catKey, catData, lang) {
  const container = document.getElementById('feed-' + catKey);
  if (!container) return;
  container.innerHTML = '<div class="feed-loading">Chargement des signaux...</div>';

  const all = [];
  await Promise.all(catData.feeds.map(function (f) {
    return fetchFeed(f.url).then(function (items) { all.push.apply(all, items); });
  }));

  catData.items = dedupeItems(all).map(function (item) {
    return scoreLiveItem(catKey, item);
  }).sort(function (a, b) {
    return (b.score || 0) - (a.score || 0) || new Date(b.pubDate) - new Date(a.pubDate);
  });
  updateCount();
  renderItems(container, catData.items, lang);
  renderBrief();
}

function buildPanes(lang) {
  if (!CONFIG) return;
  CURRENT_LANG = lang;
  const cats = CONFIG.categories;
  const tabsRoot = document.getElementById('watch-tabs');
  const contentRoot = document.getElementById('watch-content');
  if (!tabsRoot || !contentRoot) return;
  tabsRoot.innerHTML = '';
  contentRoot.innerHTML = '';

  Object.keys(cats).forEach(function (key, idx) {
    const cat = cats[key];
    const label = cat['label_' + lang] || cat.label_fr;
    const intro = cat['intro_' + lang] || cat.intro_fr;

    const tab = document.createElement('button');
    tab.className = 'watch-tab' + (idx === 0 ? ' is-active' : '');
    tab.dataset.cat = key;
    tab.type = 'button';
    tab.textContent = label;
    tab.addEventListener('click', function () {
      document.querySelectorAll('.watch-tab').forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      document.querySelectorAll('.watch-pane').forEach(function (p) { p.classList.remove('is-active'); });
      document.getElementById('pane-' + key).classList.add('is-active');
    });
    tabsRoot.appendChild(tab);

    const sources = cat.feeds.map(function (feed) {
      return '<span>' + escapeHtml(feed.name) + '</span>';
    }).join('');

    const pane = document.createElement('div');
    pane.className = 'watch-pane' + (idx === 0 ? ' is-active' : '');
    pane.id = 'pane-' + key;
    pane.innerHTML =
      '<p class="watch-intro">' + escapeHtml(intro) + '</p>' +
      '<div class="watch-sources">' + sources + '</div>' +
      '<div class="feed-list" id="feed-' + key + '"></div>';
    contentRoot.appendChild(pane);

    if (cat.items && cat.items.length) {
      updateCount();
      renderItems(document.getElementById('feed-' + key), cat.items, lang);
    } else {
      loadCategory(key, cat, lang);
    }
  });
}

async function loadConfig() {
  try {
    const r = await fetch('data/feeds.json?v=20260509-watch-radar', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    console.warn('feed config fallback', e.message);
    return FALLBACK_CONFIG;
  }
}

async function loadRadarData() {
  try {
    const r = await fetch('data/watch-radar.json?v=20260509-watch-radar', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (!data || !data.totals || !data.totals.items) return null;
    return data;
  } catch (e) {
    console.warn('watch radar fallback', e.message);
    return null;
  }
}

async function init() {
  if (!document.getElementById('watch-tabs')) return;
  const config = await loadConfig();
  RADAR_PAYLOAD = await loadRadarData();
  CONFIG = RADAR_PAYLOAD ? { categories: RADAR_PAYLOAD.categories } : config;
  CURRENT_LANG = window.getLang ? window.getLang() : 'fr';
  LIVE_RADAR_TIME = new Date().toISOString();
  renderBrief();
  buildPanes(CURRENT_LANG);

  const search = document.getElementById('watchSearch');
  if (search) {
    search.addEventListener('input', renderAllCategories);
  }

  document.addEventListener('langchange', function (e) {
    buildPanes(e.detail.lang);
    renderBrief();
  });
}

window.addEventListener('load', init);
