// ページ（index.html / reel.html）を1コマずつ撮影し、mp4 に書き出す。
// サイズ・長さ・キーフレームはページ側の window.STAGE から読む。
// 使い方:
//   NODE_PATH=$(npm root -g) node render.cjs reel.html            … 本番（build/<name>/video.mp4, cues.json, key_*.jpg）
//   NODE_PATH=$(npm root -g) node render.cjs reel.html 1.5 9 12   … 指定秒の静止画だけ（build/<name>/still_*.png）
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const args = process.argv.slice(2);
const pageFile = args[0] && args[0].endsWith('.html') ? args.shift() : 'index.html';
const stills = args.map(Number);

(async () => {
  const launch = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.goto('file://' + path.join(dir, pageFile) + '?render');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  const S = await page.evaluate(() => window.STAGE);
  await page.setViewportSize({ width: S.w, height: S.h });
  const out = path.join(dir, 'build', S.name);
  fs.mkdirSync(out, { recursive: true });
  const stage = await page.$('#stage');

  if (stills.length) {
    for (const t of stills) {
      await page.evaluate(t => window.__seek(t), t);
      await stage.screenshot({ path: path.join(out, `still_${t.toFixed(2)}.png`) });
    }
    await browser.close();
    return;
  }

  fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify(await page.evaluate(() => window.CUES), null, 1));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(S.fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    path.join(out, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(S.fps * S.dur);
  const keyFrames = new Map(S.keys.map(k => [Math.round(k * S.fps), k]));
  // 先に全体を一度通して、各トゥイーンの初期値を確定させる
  await page.evaluate(d => { window.__seek(d); window.__seek(0); }, S.dur);
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.__seek(t), f / S.fps);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (keyFrames.has(f)) await stage.screenshot({ path: path.join(out, `key_${keyFrames.get(f).toFixed(1)}.jpg`), type: 'jpeg', quality: 82 });
    if (f % 90 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  if (S.cover) {
    // 投稿用のカバー画像（カーソルなど見せたくない要素を消して撮る）
    await page.evaluate(c => { window.__seek(c.t); (c.hide || []).forEach(s => document.querySelector(s).style.visibility = 'hidden'); }, S.cover);
    await stage.screenshot({ path: path.join(out, 'cover.jpg'), type: 'jpeg', quality: 92 });
  }
  await browser.close();
  console.log('done', out);
})();
