#!/usr/bin/env node
// 書き出した HTML を開いて、レイアウトの崩れを探す
// 縮小図（.mini）と、束の奥に隠れた資料（.behind）は見ない
//
//   node zukai/check.js zukai/out/workslop/html [ほかのフォルダや HTML ...]
//
// 見ているのは4つ。
//   overflow  高さや幅が決まっている箱から文字があふれている
//   outside   文字がスライドの外、または下端のクレジット欄にかかっている
//   overlap   別々に置いた文字のかたまり同士が重なっている
//   orphan    折り返しで1〜2文字だけが次の行に落ちている
// 問題がなければ終了コード 0、あれば 1。

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { waitFitted } = require('./common.js');

const ROOTS = '.sl, .cover, .dia, .slide';
// 大きさが決まっていて、中の文字があふれてはいけない箱
const FIXED = ['.cell', '.bbox', '.card', '.pill', '.badge', '.concl', '.scene', '.sheet .box', '.cover .lines span', '.chev span', '.hdr', '.bubble', '.callout', '.s1 .card', '.s2 .box', '.bar'].join(',');

function collect(args) {
  const files = [];
  for (const a of args) {
    const p = path.resolve(a);
    if (fs.statSync(p).isDirectory()) {
      for (const f of fs.readdirSync(p).sort()) if (f.endsWith('.html')) files.push(path.join(p, f));
    } else files.push(p);
  }
  return files;
}

// ブラウザの中で動かす検査。結果は [{kind, text, detail}]
function inspect({ ROOTS, FIXED }) {
  const out = [];
  const fontSize = (el) => parseFloat(getComputedStyle(el).fontSize) || 16;
  const label = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  const textRect = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0);
    if (!rects.length) return null;
    return rects.reduce((a, b) => ({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) }));
  };
  for (const root of document.querySelectorAll(ROOTS)) {
    if (root.parentElement.closest(ROOTS)) continue; // 縮小図の中のスライドは見ない
    const R = root.getBoundingClientRect();
    const footer = root.querySelector(':scope > .foot');
    const footTop = footer ? footer.getBoundingClientRect().top : R.bottom;

    // 自動縮小の対象になっている箱も、大きさが決まった箱として見る
    const fitGroups = JSON.parse(document.querySelector('script[data-fit]')?.dataset.groups || '[]');
    const fixedSel = [FIXED, ...fitGroups].join(',');
    for (const el of root.querySelectorAll(fixedSel)) {
      if (el.closest('.mini, .behind, .thumb')) continue;
      // 和文フォントは字面の上下に余白があり、行間を詰めると数px はみ出して数えられる。字の大きさの1割までは見逃す
      const tol = Math.max(2, 0.12 * fontSize(el));
      const dx = el.scrollWidth - el.clientWidth, dy = el.scrollHeight - el.clientHeight;
      if (dx > 2 || dy > tol) out.push({ kind: 'overflow', text: label(el), detail: `${dx > 2 ? `横に${dx}px ` : ''}${dy > tol ? `縦に${dy}px` : ''}`.trim() });
    }

    // イラストがスライドの外や下端のクレジット欄にはみ出していないか（縦長の画像を正方形の枠に入れたときなど）
    for (const el of root.querySelectorAll('.ill')) {
      if (el.closest('.mini, .behind, .thumb, .sheet, .s1')) continue;
      const q = (el.querySelector('img, svg') || el).getBoundingClientRect();
      if (q.width < 1) continue;
      if (q.left < R.left - 1 || q.right > R.right + 1 || q.top < R.top - 1 || q.bottom > footTop + 1) {
        out.push({ kind: 'outside', text: '（イラスト）', detail: `下端 ${Math.round(q.bottom - R.top)}px` });
      }
    }

    // 文字を持つ一番内側のかたまり（段落・項目・箱）を集める
    const blocks = [...root.querySelectorAll('p, li, span, b, i, u, strong, small, div')].filter((el) => {
      if (el.closest('.mini, .behind, svg, .ill, .foot')) return false;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
      return true;
    });
    const rects = [];
    for (const el of blocks) {
      const t = textRect(el);
      if (!t) continue;
      if (t.left < R.left - 1 || t.right > R.right + 1 || t.top < R.top - 1 || t.bottom > footTop + 1) {
        out.push({ kind: 'outside', text: label(el), detail: `下端 ${Math.round(t.bottom - R.top)}px / 右端 ${Math.round(t.right - R.left)}px` });
      }
      rects.push({ el, t, fs: fontSize(el) });

      // 行末の取り残し：前の行が幅いっぱいまで詰まっていて（自然な折り返し）、次の行が2文字ほどしかない
      const fsz = fontSize(el);
      const r = document.createRange();
      r.selectNodeContents(el);
      const lines = [];
      for (const q of r.getClientRects()) {
        if (q.width < 1) continue;
        const line = lines.find((L) => Math.abs(L.top - q.top) < fsz * 0.5);
        if (line) { line.left = Math.min(line.left, q.left); line.right = Math.max(line.right, q.right); }
        else lines.push({ top: q.top, left: q.left, right: q.right });
      }
      lines.sort((x, y) => x.top - y.top);
      const cs = getComputedStyle(el);
      const inner = el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      for (let k = 1; k < lines.length; k++) {
        const prev = lines[k - 1].right - lines[k - 1].left, cur = lines[k].right - lines[k].left;
        if (cur < fsz * 2.2 && prev > inner * 0.85) out.push({ kind: 'orphan', text: label(el), detail: `${Math.round(cur / fsz)}文字ほどが次の行へ` });
      }
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const ix = Math.min(a.t.right, b.t.right) - Math.max(a.t.left, b.t.left);
        const iy = Math.min(a.t.bottom, b.t.bottom) - Math.max(a.t.top, b.t.top);
        // 隣り合う行の字面の余白（字の大きさの2割まで）は重なりに数えない
        if (ix > 2 && iy > 0.2 * Math.max(a.fs, b.fs) + 1) out.push({ kind: 'overlap', text: `${label(a.el)} ／ ${label(b.el)}`, detail: `${Math.round(ix)}×${Math.round(iy)}px` });
      }
    }
  }
  return out;
}

async function checkFiles(files, browser) {
  const results = [];
  for (const f of files) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1440 } });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(f).href, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await waitFitted(p);
    results.push({ file: f, issues: await p.evaluate(inspect, { ROOTS, FIXED }) });
    await ctx.close();
  }
  return results;
}

module.exports = { checkFiles };

if (require.main === module) {
  (async () => {
    const files = collect(process.argv.slice(2));
    if (!files.length) {
      console.log('使い方: node zukai/check.js <HTML のフォルダまたはファイル> ...');
      process.exit(2);
    }
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const results = await checkFiles(files, browser);
    await browser.close();
    let bad = 0;
    for (const r of results) {
      const name = path.relative(process.cwd(), r.file);
      if (!r.issues.length) { console.log(`OK    ${name}`); continue; }
      bad++;
      console.log(`NG    ${name}`);
      for (const i of r.issues) console.log(`      ${i.kind.padEnd(8)} ${i.detail.padEnd(22)} ${i.text}`);
    }
    console.log(`${results.length} 枚中 ${bad} 枚に問題`);
    process.exit(bad ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
