// build.js（図解）と deck.js（スライド資料）で使う部品

const path = require('path');
const { pathToFileURL } = require('url');
const { ILLUST } = require('./illust.js');

// node xxx.js [データ.json] [--out 出力先] [--no-png]
function parseArgs(argv, defaultData) {
  const args = argv.slice(2);
  const i = args.indexOf('--out');
  const positional = args.filter((a, k) => !a.startsWith('--') && !(k > 0 && args[k - 1] === '--out'));
  return {
    dataPath: path.resolve(positional[0] || defaultData),
    out: i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : null,
    png: !args.includes('--no-png'),
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// [[ ]] で囲んだところを強調色にし、改行を <br> にする
const rich = (s) => esc(s).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>').replace(/\n/g, '<br>');

// イラスト。illust.js にある名前ならその SVG、なければデータの JSON から見た画像パスとして扱う
function makeIll(dataPath) {
  return function ill(name, cls = '') {
    if (!name) return '';
    if (ILLUST[name]) return `<span class="ill ${cls}">${ILLUST[name]}</span>`;
    const src = /^(https?:|data:)/.test(name) ? name : pathToFileURL(path.resolve(path.dirname(dataPath), name)).href;
    return `<span class="ill ${cls}"><img src="${esc(src)}" alt=""></span>`;
  };
}

function page(title, fontsUrl, css, body) {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsUrl}" rel="stylesheet">
<style>${css}</style></head>
<body>${body}</body></html>`;
}

// jobs: [{ file, png, w, h, scale }] を順に撮る。Playwright がなければ何もしない
async function exportPng(jobs) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.log('Playwright が見つからないので PNG は作らない。HTML をブラウザで開いて確認できる');
    return;
  }
  const browser = await chromium.launch();
  try {
    for (const j of jobs) {
      const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.scale });
      const p = await ctx.newPage();
      await p.goto(pathToFileURL(j.file).href, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: j.png, clip: { x: 0, y: 0, width: j.w, height: j.h } });
      await ctx.close();
      console.log('PNG:', path.relative(process.cwd(), j.png));
    }
  } finally {
    await browser.close();
  }
}

module.exports = { parseArgs, esc, rich, makeIll, page, exportPng };
