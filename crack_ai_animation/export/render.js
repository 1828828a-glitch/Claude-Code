#!/usr/bin/env node
/*
  60秒アニメーションを1コマずつ撮影して MP4 に書き出すスクリプト（コマ落ちなし）

  使い方（crack_ai_animation フォルダで）:
    npm install
    npx playwright install chromium
    npm run export                       → crack_ai_update.mp4（1920×1080 / 30fps）
    node export/render.js --fps 60 --out final.mp4
    node export/render.js --from 38 --to 47 --out highlight.mp4   ← 一部だけ
    node export/render.js --frames frames                          ← ffmpeg が無いとき：PNG連番で保存

  必要なもの：Node.js 18+、ffmpeg（PATH に通すか --ffmpeg /path/to/ffmpeg か FFMPEG_PATH）
  仕組み：index.html?export=1 を開き、window.__ANIM__.renderAt(秒) で各コマを描いて撮影する。
          アニメーションは「時刻→画面」が一意に決まる作りなので、PCの速さに関係なく同じ映像になる。
*/
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('playwright が見つかりません。crack_ai_animation フォルダで `npm install` を実行してください。');
  process.exit(1);
}

// ---- 引数 ----
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const FPS = Number(opt('fps', 30));
const FROM = Number(opt('from', 0));
const TO = opt('to', null);
const OUT = path.resolve(opt('out', 'crack_ai_update.mp4'));
const FRAMES_DIR = opt('frames', null);
const FFMPEG = opt('ffmpeg', process.env.FFMPEG_PATH || 'ffmpeg');
const HTML = path.resolve(__dirname, '..', 'index.html');

function startFfmpeg() {
  const ff = spawn(FFMPEG, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
    '-movflags', '+faststart', OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    ff.on('error', err => reject(new Error(`ffmpeg を起動できません（${err.message}）。--frames で PNG 連番に書き出すこともできます。`)));
    ff.on('close', code => (code === 0 ? resolve() : reject(new Error('ffmpeg が失敗しました: code ' + code))));
  });
  return { ff, done };
}

(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  // Google Fonts は Node 側で取得して渡す（社内プロキシ等でブラウザが直接取れない環境の保険）
  await page.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
    try { await route.fulfill({ response: await route.fetch() }); } catch { await route.continue(); }
  });
  page.on('pageerror', e => console.error('[page]', e.message));
  await page.goto('file://' + HTML + '?export=1');
  await page.waitForFunction(() => window.__ANIM__ && window.__ANIM__.ready, null, { timeout: 60000 });

  const duration = await page.evaluate(() => window.__ANIM__.DURATION);
  const end = Math.min(TO === null ? duration : Number(TO), duration);
  const first = Math.round(FROM * FPS), last = Math.round(end * FPS);   // last は含まない（60秒×30fps＝1800コマ）
  const total = last - first;

  let ffmpeg = null;
  if (FRAMES_DIR) fs.mkdirSync(path.resolve(FRAMES_DIR), { recursive: true });
  else ffmpeg = startFfmpeg();

  const t0 = Date.now();
  for (let f = first; f < last; f++) {
    await page.evaluate(t => window.__ANIM__.renderAt(t), f / FPS);
    const png = await page.screenshot({ type: 'png' });
    if (FRAMES_DIR) {
      fs.writeFileSync(path.resolve(FRAMES_DIR, `frame_${String(f - first).padStart(5, '0')}.png`), png);
    } else if (!ffmpeg.ff.stdin.write(png)) {
      await new Promise(r => ffmpeg.ff.stdin.once('drain', r));
    }
    const n = f - first + 1;
    if (n % FPS === 0 || n === total) {
      const sec = (Date.now() - t0) / 1000;
      process.stdout.write(`\r${n}/${total} コマ（${(f / FPS).toFixed(1)}秒地点）経過 ${sec.toFixed(0)}s  `);
    }
  }
  process.stdout.write('\n');
  await browser.close();

  if (ffmpeg) {
    ffmpeg.ff.stdin.end();
    await ffmpeg.done;
    console.log('書き出し完了:', OUT);
  } else {
    console.log('PNG連番を保存しました:', path.resolve(FRAMES_DIR));
    console.log(`MP4化の例: ffmpeg -framerate ${FPS} -i ${FRAMES_DIR}/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 crack_ai_update.mp4`);
  }
})().catch(err => { console.error(err.message || err); process.exit(1); });
