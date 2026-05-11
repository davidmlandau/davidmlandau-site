#!/usr/bin/env node
/* ============================================================
   export-site-pdf.mjs
   Renders the public site pages into one merged PDF.
   ============================================================ */

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');
const outDir = resolve(siteRoot, 'exports');
const tempDir = resolve(outDir, '.pdf-pages');
const finalPdf = resolve(outDir, 'david-landau-site-complet.pdf');

const articles = JSON.parse(await readFile(resolve(siteRoot, 'data/articles.json'), 'utf8')).articles;

const pages = [
  { title: 'Accueil', path: 'index.html' },
  { title: 'BIO', path: 'bio.html' },
  { title: 'Veille', path: 'watch.html' },
  { title: 'Actualités', path: 'news.html' },
  ...articles.map((article) => ({
    title: article.title.fr,
    path: 'article.html?id=' + encodeURIComponent(article.id)
  })),
  { title: 'Contact', path: 'contact.html' }
];

function fileUrl(pagePath) {
  const [file, query = ''] = pagePath.split('?');
  const url = pathToFileURL(resolve(siteRoot, file)).href;
  return query ? `${url}?${query}` : url;
}

function coverHtml() {
  return `<!doctype html>
  <html lang="fr">
  <head>
    <meta charset="utf-8">
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        color: #f8f3e7;
        background: radial-gradient(circle at 70% 25%, rgba(205,224,242,0.22), transparent 35%),
                    linear-gradient(135deg, #10151b, #263340);
        font-family: Manrope, Arial, sans-serif;
      }
      .cover { width: 100%; }
      .eyebrow { letter-spacing: .22em; font-size: 11px; text-transform: uppercase; color: rgba(248,243,231,.62); }
      h1 { font-size: 58px; line-height: .95; letter-spacing: -.04em; margin: 22px 0; max-width: 9ch; }
      p { color: rgba(248,243,231,.72); font-size: 15px; line-height: 1.7; max-width: 56ch; }
      .list { margin-top: 42px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; color: rgba(248,243,231,.7); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main class="cover">
      <div class="eyebrow">DAVID LANDAU · Site complet</div>
      <h1>Document de revue du site.</h1>
      <p>Export PDF des pages publiques actuelles : landing page, BIO, veille, actualités, articles et contact.</p>
      <div class="list">
        ${pages.map((page) => `<span>${page.title}</span>`).join('')}
      </div>
    </main>
  </body>
  </html>`;
}

const printCss = `
  @page { size: A4; margin: 10mm; }
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .loader, .scroll-progress, .custom-cursor, .cursor, .cursor-dot { display: none !important; }
  .site-header { position: static !important; transform: none !important; }
  .nav-toggle { display: none !important; }
  .food-visual *, .food-visual::before { animation: none !important; }
  a { text-decoration: none !important; }
`;

async function renderOne(browser, entry, index) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1600 },
    deviceScaleFactor: 1
  });

  if (entry.html) {
    await page.setContent(entry.html, { waitUntil: 'load' });
  } else {
    await page.goto(fileUrl(entry.path), { waitUntil: 'load' });
  }

  await page.addStyleTag({ content: printCss });
  await page.emulateMedia({ media: 'screen' });
  await page.waitForTimeout(800);

  const pdfPath = resolve(tempDir, `${String(index).padStart(2, '0')}-${entry.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false
  });
  await page.close();
  return pdfPath;
}

await mkdir(tempDir, { recursive: true });
await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const generated = [];

try {
  generated.push(await renderOne(browser, { title: 'Couverture', html: coverHtml() }, 0));
  for (let i = 0; i < pages.length; i += 1) {
    generated.push(await renderOne(browser, pages[i], i + 1));
  }
} finally {
  await browser.close();
}

const merged = await PDFDocument.create();
for (const pdfPath of generated) {
  const source = await PDFDocument.load(await readFile(pdfPath));
  const copied = await merged.copyPages(source, source.getPageIndices());
  copied.forEach((page) => merged.addPage(page));
}

await mkdir(outDir, { recursive: true });
await writeFile(finalPdf, await merged.save());
console.log(finalPdf);
