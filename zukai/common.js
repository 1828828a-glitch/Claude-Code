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

// 文字が箱からあふれたら、収まるまで字を小さくする（PowerPoint の自動縮小と同じ考え方）。
// groups はセレクターの配列で、同じセレクターに当たる箱はいちばん縮めた倍率にそろえる。
// 7割まで縮めても収まらなければそのまま残し、check.js が崩れとして拾う。
function fitScript(groups) {
  if (!groups || !groups.length) return '';
  return `<script data-fit data-groups='${esc(JSON.stringify(groups))}'>
(() => {
  const GROUPS = ${JSON.stringify(groups)}, MIN = 0.7, STEP = 0.03;
  const fs = (n) => parseFloat(getComputedStyle(n).fontSize) || 16;
  const over = (el) => el.scrollWidth - el.clientWidth > 2 || el.scrollHeight - el.clientHeight > Math.max(2, 0.12 * fs(el));
  const texts = (el) => [el, ...el.querySelectorAll('*')].filter((n) => !n.closest('svg') && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()));
  const apply = (el, k) => {
    const list = texts(el);
    list.forEach((n) => { if (!n.dataset.fs) n.dataset.fs = fs(n); });
    list.forEach((n) => { n.style.fontSize = (n.dataset.fs * k) + 'px'; });
  };
  const need = (el) => {
    let k = 1;
    apply(el, 1);
    while (over(el) && k > MIN + 1e-9) { k = Math.round((k - STEP) * 100) / 100; apply(el, k); }
    return k;
  };
  const run = () => {
    for (const sel of GROUPS) {
      const els = [...document.querySelectorAll(sel)];
      if (!els.length) continue;
      const k = Math.min(...els.map(need));
      els.forEach((e) => apply(e, k));
    }
    document.documentElement.dataset.fitted = '1';
  };
  document.fonts.ready.then(() => requestAnimationFrame(run));
})();
</script>`;
}

// 自動縮小が終わるまで待つ（スクリプトがないページはすぐ返る）
const waitFitted = (p) => p.waitForFunction(() => !document.querySelector('script[data-fit]') || document.documentElement.dataset.fitted === '1', null, { timeout: 15000 });

// 日本語は文節で折り返し（auto-phrase）、行末に1〜2文字だけ残る折り返しを避ける（text-wrap: pretty）
function page(title, fontsUrl, css, body, fitGroups) {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsUrl}" rel="stylesheet">
<style>body{word-break:auto-phrase;text-wrap:pretty}${css}</style></head>
<body>${body}${fitScript(fitGroups)}</body></html>`;
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
      await waitFitted(p);
      await p.screenshot({ path: j.png, clip: { x: 0, y: 0, width: j.w, height: j.h } });
      await ctx.close();
      console.log('PNG:', path.relative(process.cwd(), j.png));
    }
  } finally {
    await browser.close();
  }
}

module.exports = { parseArgs, esc, rich, makeIll, page, exportPng, waitFitted };
