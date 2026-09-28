#!/usr/bin/env node
// index.html をヘッドレス Chromium で 1 コマずつ描き、BGM と合わせて ffmpeg で MP4 にする。
//
//   npm install playwright          # 初回のみ（npx playwright install chromium も）
//   node render.mjs                 # crack_service_video.mp4、crack_bgm.mp3、narration.srt を出力
//   node render.mjs --subs          # 字幕を焼き込む
//   node render.mjs --no-bgm        # 無音で書き出す
//   node render.mjs --audio-only    # BGM（crack_bgm.mp3）だけを書き出す。--wav で WAV も残す
//   node render.mjs --srt-only      # 台本を直したあと、narration.srt だけを作り直す
//   node render.mjs --stills 0.5,11.8,24   # 指定秒の静止画だけを PNG で保存
//
// ffmpeg は PATH 上のもの、または環境変数 FFMPEG で指定したものを使う。

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import os from 'node:os';
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
const noBgm = Boolean(opt('no-bgm', false));
const audioOnly = Boolean(opt('audio-only', false));
const keepWav = Boolean(opt('wav', false));
const srtOnly = Boolean(opt('srt-only', false));
const out = path.resolve(here, String(opt('out', subs ? 'crack_service_video_subtitled.mp4' : 'crack_service_video.mp4')));
const crf = String(opt('crf', 20));
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
function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
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
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.error('[page]', m.text()); });
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
if (srtOnly) {
  console.log(path.join(here, 'narration.srt'));
  await browser.close();
  process.exit(0);
}

// BGM：ページ内の Web Audio で合成した WAV を受け取り、MP3 にも変換しておく
let wavPath = null;
if (!noBgm) {
  const b64 = await page.evaluate(() => window.__crack.bgmWav());
  wavPath = path.join(os.tmpdir(), `crack_bgm_${process.pid}.wav`);
  writeFileSync(wavPath, Buffer.from(b64, 'base64'));
  await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libmp3lame', '-b:a', '320k', path.join(here, 'crack_bgm.mp3')]);
  if (keepWav) copyFileSync(wavPath, path.join(here, 'crack_bgm.wav'));
  console.log(path.join(here, 'crack_bgm.mp3'));
}
if (audioOnly) {
  if (wavPath) rmSync(wavPath, { force: true });
  await browser.close();
  process.exit(0);
}

const frames = Math.round(info.duration * fps);
const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
if (wavPath) ffArgs.push('-i', wavPath);
ffArgs.push('-map', '0:v:0');
if (wavPath) ffArgs.push('-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k');
ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(fps), '-shortest', out);
const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((resolve, reject) => {
  ff.on('error', reject);
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
});

const started = Date.now();
for (let i = 0; i < frames; i++) {
  const url = await page.evaluate(([t, sb]) => window.__crack.grab(t, sb, 'image/jpeg', 0.96), [i / fps, subs]);
  const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % fps === 0) process.stdout.write(`\r${i}/${frames} frames  ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await ffDone;
await browser.close();
if (wavPath) rmSync(wavPath, { force: true });
console.log(`\n${out}`);
