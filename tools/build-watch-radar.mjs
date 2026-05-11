#!/usr/bin/env node
/* ============================================================
   build-watch-radar.mjs
   Aggregates RSS feeds into a ranked JSON radar for watch.html.

   Usage:
     node site/tools/build-watch-radar.mjs
     node site/tools/build-watch-radar.mjs --dry-run

   Optional:
     RADAR_WEBHOOK_URL=https://... node site/tools/build-watch-radar.mjs
   ============================================================ */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const FEEDS_PATH = resolve(SITE_ROOT, 'data/feeds.json');
const OUTPUT_PATH = resolve(SITE_ROOT, 'data/watch-radar.json');
const DIGEST_PATH = resolve(SITE_ROOT, 'data/watch-digest.html');

const MAX_ITEMS_PER_CATEGORY = 36;
const DIGEST_PER_CATEGORY = 4;
const FETCH_TIMEOUT_MS = 12000;
const DRY_RUN = process.argv.includes('--dry-run');

const KEYWORDS = {
  tech: [
    'precision fermentation', 'fermentation de precision', 'bioprocess', 'bioprocessing',
    'extrusion', 'automation', 'automatisation', 'robotics', 'ai', 'ia',
    'food processing', 'transformation alimentaire', 'ingredient production',
    'upcycling', 'smart packaging', 'packaging intelligent'
  ],
  trends: [
    'flavor trend', 'flavour trend', 'taste trend', 'new flavor', 'new flavour',
    'nouveau gout', 'tendance gout', 'aroma trend', 'arome tendance',
    'texture', 'sensory', 'sensoriel', 'blend', 'melange', 'pairing',
    'limited edition', 'lancement'
  ],
  aroma: [
    'regulation', 'reglementation', 'efsa', 'fda', 'fema gras',
    'flavouring substance', 'flavoring substance', 'substance aromatisante',
    'additive', 'additif', 'ban', 'restriction', 'compliance', 'conformite'
  ],
  ingredients: [
    'ingredient', 'ingredients', 'clean label', 'novel food', 'alternative protein',
    'proteine alternative', 'fiber', 'fibre', 'texturant', 'sweetener',
    'edulcorant', 'stabilizer', 'stabilisant', 'nutrition', 'functionality',
    'supplier', 'fournisseur'
  ],
  ma: [
    'acquisition', 'merger', 'fusion', 'cession', 'divestment', 'sale',
    'vente', 'funding', 'levee de fonds', 'investment', 'investissement',
    'private equity', 'buyout', 'joint venture', 'm&a'
  ]
};

function nowIso() {
  return new Date().toISOString();
}

function textFromHtml(html) {
  return decodeEntities(String(html || ''))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTag(block, tagName) {
  const tag = tagName.replace(':', '\\:');
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  return match ? textFromHtml(match[1]) : '';
}

function extractAtomLink(block) {
  const match = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? decodeEntities(match[1]) : '';
}

function blocksFor(xml, tagName) {
  const re = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return xml.match(re) || [];
}

function parseFeed(xml, feed) {
  const blocks = blocksFor(xml, 'item').length ? blocksFor(xml, 'item') : blocksFor(xml, 'entry');

  return blocks.map((block) => {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAtomLink(block);
    const pubDate =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated') ||
      extractTag(block, 'dc:date');
    const description =
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content:encoded') ||
      extractTag(block, 'content');

    return {
      source: feed.name,
      feedUrl: feed.url,
      title,
      link,
      pubDate,
      description: description.slice(0, 420)
    };
  }).filter((item) => item.title && item.link);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'DavidLandauWatchRadar/1.0 (+https://davidmlandau.com)'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function canonicalUrl(link) {
  try {
    const url = new URL(link);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((param) => {
      url.searchParams.delete(param);
    });
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return link;
  }
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupe(items) {
  const seen = new Set();
  const unique = [];

  items.forEach((item) => {
    const titleKey = normalize(item.title).split(' ').slice(0, 12).join(' ');
    const linkKey = canonicalUrl(item.link);
    const key = linkKey || titleKey;
    if (seen.has(key) || seen.has(titleKey)) return;
    seen.add(key);
    seen.add(titleKey);
    unique.push(item);
  });

  return unique;
}

function daysOld(pubDate) {
  const timestamp = Date.parse(pubDate);
  if (Number.isNaN(timestamp)) return 30;
  return Math.max(0, (Date.now() - timestamp) / 86400000);
}

function scoreItem(categoryKey, item) {
  const text = normalize(`${item.title} ${item.description}`);
  const matchedKeywords = KEYWORDS[categoryKey].filter((keyword) => text.includes(normalize(keyword)));
  const age = daysOld(item.pubDate);
  let score = 36;

  matchedKeywords.forEach((keyword) => {
    const normalizedKeyword = normalize(keyword);
    score += normalize(item.title).includes(normalizedKeyword) ? 10 : 5;
  });

  if (age <= 2) score += 24;
  else if (age <= 7) score += 18;
  else if (age <= 14) score += 10;
  else if (age <= 30) score += 4;

  if (!/google news/i.test(item.source)) score += 4;
  if (/exclusive|launch|regulation|acquisition|merger|funding|innovation/i.test(`${item.title} ${item.description}`)) score += 6;

  return {
    ...item,
    category: categoryKey,
    score: Math.min(100, Math.round(score)),
    matchedKeywords: matchedKeywords.slice(0, 5),
    reason: buildReason(categoryKey, matchedKeywords, age)
  };
}

function buildReason(categoryKey, matchedKeywords, age) {
  const keywordPart = matchedKeywords.length
    ? `Signal detecte autour de ${matchedKeywords.slice(0, 3).join(', ')}.`
    : 'Signal recent repere dans les sources specialisees.';
  const recencyPart = age <= 7 ? ' Actualite chaude.' : ' A suivre dans la duree.';
  const categoryPart = {
    tech: ' Angle technologie.',
    trends: ' Angle tendances sensorielles.',
    aroma: ' Angle regulation aromatique.',
    ingredients: ' Angle ingredients.',
    ma: ' Angle operations strategiques.'
  }[categoryKey] || '';
  return `${keywordPart}${recencyPart}${categoryPart}`;
}

function categoryLabels(category) {
  return {
    label_fr: category.label_fr,
    label_en: category.label_en,
    label_nl: category.label_nl,
    intro_fr: category.intro_fr,
    intro_en: category.intro_en,
    intro_nl: category.intro_nl
  };
}

function buildDigest(categories) {
  return Object.keys(categories).flatMap((key) => {
    return categories[key].items.slice(0, DIGEST_PER_CATEGORY).map((item) => ({
      category: key,
      label_fr: categories[key].label_fr,
      title: item.title,
      source: item.source,
      link: item.link,
      pubDate: item.pubDate,
      score: item.score,
      reason: item.reason
    }));
  }).sort((a, b) => b.score - a.score).slice(0, 12);
}

function digestHtml(payload) {
  const generated = new Date(payload.generatedAt).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short'
  });
  const items = payload.digest.map((item) => {
    return `
      <article>
        <p><strong>${escapeHtml(item.label_fr)}</strong> · score ${item.score}</p>
        <h2><a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a></h2>
        <p>${escapeHtml(item.source)} · ${escapeHtml(item.reason)}</p>
      </article>
    `;
  }).join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Synthese Radar Veille</title>
  <style>
    body { font-family: Arial, sans-serif; color: #141a20; line-height: 1.55; max-width: 760px; margin: 0 auto; padding: 32px 18px; }
    article { border-top: 1px solid #d8dde2; padding: 18px 0; }
    h1, h2 { line-height: 1.15; }
    h2 { font-size: 20px; margin: 6px 0; }
    a { color: #1f4c68; }
    p { margin: 0 0 8px; }
  </style>
</head>
<body>
  <h1>Synthese Radar Veille</h1>
  <p>Generation automatique du ${escapeHtml(generated)}.</p>
  ${items || '<p>Aucun signal disponible pour cette generation.</p>'}
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

async function postDigest(payload) {
  const webhookUrl = process.env.RADAR_WEBHOOK_URL;
  if (!webhookUrl) return;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      generatedAt: payload.generatedAt,
      totals: payload.totals,
      digest: payload.digest
    })
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with HTTP ${response.status}`);
  }
}

async function main() {
  const feedConfig = JSON.parse(await readFile(FEEDS_PATH, 'utf8'));
  if (DRY_RUN) {
    const feedCount = Object.values(feedConfig.categories).reduce((sum, category) => sum + category.feeds.length, 0);
    console.log(`Radar config ok: ${Object.keys(feedConfig.categories).length} categories, ${feedCount} feeds.`);
    return;
  }

  const categories = {};
  const errors = [];

  for (const [key, category] of Object.entries(feedConfig.categories)) {
    const feedResults = await Promise.all(category.feeds.map(async (feed) => {
      try {
        const xml = await fetchText(feed.url);
        return parseFeed(xml, feed);
      } catch (error) {
        errors.push({ category: key, feed: feed.name, url: feed.url, error: error.message });
        return [];
      }
    }));

    const fetched = feedResults.flat();

    const items = dedupe(fetched)
      .map((item) => scoreItem(key, item))
      .sort((a, b) => b.score - a.score || Date.parse(b.pubDate) - Date.parse(a.pubDate))
      .slice(0, MAX_ITEMS_PER_CATEGORY);

    categories[key] = {
      ...categoryLabels(category),
      feeds: category.feeds.map((feed) => ({ name: feed.name, url: feed.url })),
      total: items.length,
      items
    };
  }

  const payload = {
    generatedAt: nowIso(),
    generatedBy: 'site/tools/build-watch-radar.mjs',
    totals: {
      categories: Object.keys(categories).length,
      items: Object.values(categories).reduce((sum, category) => sum + category.items.length, 0),
      errors: errors.length
    },
    categories,
    digest: buildDigest(categories),
    errors
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  await writeFile(DIGEST_PATH, digestHtml(payload));
  await postDigest(payload);

  console.log(`Radar generated: ${payload.totals.items} items, ${payload.digest.length} digest signals, ${errors.length} feed errors.`);
  if (errors.length) {
    errors.forEach((error) => console.warn(`- ${error.feed}: ${error.error}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
