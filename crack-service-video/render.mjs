#!/usr/bin/env node
// index.html をヘッドレス Chromium で 1 コマずつ描き、ffmpeg で MP4 にする。
//
//   npm install playwright          # 初回のみ（npx playwright install chromium も）
//   node render.mjs                 # crack_service_video.mp4 と narration.srt を出力
//   node render.mjs --subs          # 字幕を焼き込む
//   node render.mjs --stills 0.5,11.8,24   # 指定秒の静止画だけを PNG で保存
//
// ffmpeg は PATH 上のもの、または環境変数 FFMPEG で指定したものを使う。

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const fps = Number(opt('fps', 30));
const subs = Boolean(opt('subs', false));
const out = path.resolve(here, String(opt('out', subs ? 'crack_service_video_subtitled.mp4' : 'crack_service_video.mp4')));
const crf = String(opt('crf', 18));
const stills = opt('stills', null);
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

async function loadChromium() {
  const require = createRequire(import.meta.url);
  for (const name of ['playwright', 'playwright-core']) {
    try { return require(name).chromium; } catch { /* 次を試す */ }
    try { return (await import(name)).chromium; } catch { /* 次を試す */ }
  }
  throw new Error('playwright が見つかりません。npm install playwright を実行してください。');
}

const srtTime = (s) => {
  const ms = Math.round(s * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
};

const chromium = await loadChromium();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[page error]', e.message));
// フォントは HTML に埋め込み済みなので、外部のフォント配信には取りに行かない
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(pathToFileURL(path.join(here, 'index.html')).href + '?render=1');
await page.waitForFunction(() => window.__crack && window.__crack.ready === true, null, { timeout: 60000 });
const info = await page.evaluate(() => ({ duration: window.__crack.duration, cues: window.__crack.cues }));

if (stills) {
  const dir = path.resolve(here, String(opt('dir', 'stills')));
  mkdirSync(dir, { recursive: true });
  for (const s of String(stills).split(',').map(Number)) {
    const url = await page.evaluate(([t, sb]) => window.__crack.grab(t, sb, 'image/png'), [s, subs]);
    const file = path.join(dir, `frame_${s.toFixed(2).padStart(5, '0')}.png`);
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file);
  }
  await browser.close();
  process.exit(0);
}

const srt = info.cues.map((c, i) => `${i + 1}\n${srtTime(c.s)} --> ${srtTime(c.e)}\n${c.text}\n`).join('\n');
writeFileSync(path.join(here, 'narration.srt'), srt, 'utf8');

const frames = Math.round(info.duration * fps);
const ff = spawn(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-r', String(fps), out,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((resolve, reject) => {
  ff.on('error', reject);
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
});

const started = Date.now();
for (let i = 0; i < frames; i++) {
  const url = await page.evaluate(([t, sb]) => window.__crack.grab(t, sb, 'image/jpeg', 0.96), [i / fps, subs]);
  const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % fps === 0) {
    const sec = (Date.now() - started) / 1000;
    process.stdout.write(`\r${i}/${frames} frames  ${sec.toFixed(0)}s`);
  }
}
ff.stdin.end();
await ffDone;
await browser.close();
console.log(`\n${out}`);
