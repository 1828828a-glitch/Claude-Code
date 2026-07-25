// Stage 4 素材採集 — ターミナル素材の三件套を出す。
//
// video-shotcraft の assets/scripts/capture-template.mjs を本プロジェクト向けに書き直したもの
// (テンプレートは puppeteer 前提だが、この環境には playwright が入っているため差し替えた)。
//
// 産出:
//   1. 全体 2x 截图         terminal.png / terminal-plate.png(空窓 backplate)
//   2. per-element cutout   透明背景の窓 chrome
//   3. layout.json          各要素の bbox(打字カーソル位置・引爆原点・飛入目標位に使う)
//
// 映すテキストは実際に実行した出力のみ。実行結果をここで取り直して HTML に注入する。

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'remotion', 'public', 'textures');
const EXE = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

fs.mkdirSync(OUT, { recursive: true });

// --- 実出力を取り直す(捏造しないための唯一の情報源) -------------------
const realVersion = execSync('claude --version', { encoding: 'utf8' }).trim();
console.log('captured real output:', JSON.stringify(realVersion));

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({
  viewport: { width: 1400, height: 820 },
  deviceScaleFactor: 2, // Q2: 表示サイズの2倍で栅格化
});
await page.goto('file://' + path.join(here, 'terminal.html'));

// 実出力を注入(HTML 側のハードコード値が古くなっても実測値が勝つ)
await page.evaluate((v) => { document.getElementById('l2').textContent = v; }, realVersion);

await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

const term = page.locator('#term');
await term.screenshot({ path: path.join(OUT, 'terminal.png') });

// backplate: 本文を消した空窓
await page.evaluate(() => { document.querySelector('#term .body').style.visibility = 'hidden'; });
await term.screenshot({ path: path.join(OUT, 'terminal-plate.png') });
await page.evaluate(() => { document.querySelector('#term .body').style.visibility = 'visible'; });

// --- layout.json: 窓座標系での bbox ------------------------------------
const layout = await page.evaluate(() => {
  const root = document.getElementById('term').getBoundingClientRect();
  const rel = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x - root.x), y: Math.round(r.y - root.y),
      w: Math.round(r.width), h: Math.round(r.height),
    };
  };
  const out = { termW: Math.round(root.width), termH: Math.round(root.height), elements: {} };
  for (const id of ['l1', 'l2', 'l3', 'caret']) {
    const el = document.getElementById(id);
    if (el) out.elements[id] = rel(el);
  }
  out.elements.chrome = rel(document.querySelector('#term .chrome'));
  out.elements.body = rel(document.querySelector('#term .body'));
  // 打字対象のテキスト(実出力)。Remotion 側はこれを1文字ずつ出す
  out.lines = [
    { id: 'l1', prompt: '$ ', text: 'claude --version', kind: 'cmd' },
    { id: 'l2', prompt: '', text: document.getElementById('l2').textContent, kind: 'out' },
    { id: 'l3', prompt: '$ ', text: 'claude', kind: 'cmd' },
  ];
  return out;
});

fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(layout, null, 2));
await browser.close();

console.log('wrote', path.join(OUT, 'terminal.png'));
console.log('wrote', path.join(OUT, 'terminal-plate.png'));
console.log('wrote', path.join(OUT, 'layout.json'));
console.log('term size', layout.termW + 'x' + layout.termH, '/ caret', JSON.stringify(layout.elements.caret));
