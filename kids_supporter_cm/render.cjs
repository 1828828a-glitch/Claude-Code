// index.html を 1920x1080 / 30fps で1コマずつ撮影し、mp4 に書き出す。
// 使い方:
//   NODE_PATH=$(npm root -g) node render.cjs            … 本番（build/video.mp4, build/cues.json, build/key_*.jpg）
//   NODE_PATH=$(npm root -g) node render.cjs 1.5 9 21   … 指定秒の静止画だけ（build/still_*.png）
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 30, DUR = 30;
const dir = __dirname, out = path.join(dir, 'build');
fs.mkdirSync(out, { recursive: true });
const stills = process.argv.slice(2).map(Number);
// 絵コンテ用のキーフレーム（秒）
const KEYS = [1.9, 3.0, 6.7, 9.4, 11.0, 12.6, 14.3, 15.8, 19.9, 21.9, 24.8, 29.5];

(async () => {
  const launch = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.goto('file://' + path.join(dir, 'index.html') + '?render');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
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
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    path.join(out, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = FPS * DUR;
  const keyFrames = new Map(KEYS.map(k => [Math.round(k * FPS), k]));
  // 先に全シーンを一度通して、各トゥイーンの初期値を確定させる
  await page.evaluate(() => { window.__seek(30); window.__seek(0); });
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.__seek(t), f / FPS);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (keyFrames.has(f)) await stage.screenshot({ path: path.join(out, `key_${keyFrames.get(f).toFixed(1)}.jpg`), type: 'jpeg', quality: 82 });
    if (f % 90 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done');
})();
