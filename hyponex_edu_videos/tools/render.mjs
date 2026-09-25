// 動画の書き出し: Canvasで1フレームずつ描画 → ffmpeg(H.264) にパイプ、音声はJSで合成
// node tools/render.mjs [v1 v2 ...] [--preview] [--from=秒 --to=秒]
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { launch } from './browser.mjs';
import { renderSoundtrack, toWav } from '../src/audio/synth.js';
import { collectCues } from '../src/engine/stage.js';
import { VIDEOS } from '../src/videos/index.js';

const W = 1080, H = 1920, FPS = 30;
const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith('--'));
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const targets = ids.length ? ids : Object.keys(VIDEOS);
const OUT = path.join(ROOT, 'out');

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const require = createRequire(import.meta.url);
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    return 'ffmpeg';
  }
}

let sink = null; // 現在のffmpeg入力先
let nextFrame = 0;
const pending = new Map();
async function flush() {
  while (pending.has(nextFrame)) {
    const buf = pending.get(nextFrame);
    pending.delete(nextFrame);
    nextFrame++;
    if (!sink.write(buf)) await new Promise((r) => sink.once('drain', r));
  }
}
let flushing = Promise.resolve();
const { server, port } = await startServer({
  handlers: {
    'POST /frame': (req, res, url) => {
      const i = Number(url.searchParams.get('i'));
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', async () => {
        const buf = Buffer.concat(chunks);
        if (buf.length !== W * H * 4) {
          res.writeHead(400);
          return res.end('bad size');
        }
        pending.set(i, buf);
        flushing = flushing.then(flush);
        await flushing;
        res.writeHead(200);
        res.end('ok');
      });
    },
  },
});

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/player.html?render=1`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await fs.mkdir(path.join(OUT, 'audio'), { recursive: true });

for (const id of targets) {
  const video = VIDEOS[id];
  const info = await page.evaluate((v) => window.studio.info(v), id);
  if (info.warnings.length) console.log(`[${id}] 字幕が速い箇所:\n  ` + info.warnings.join('\n  '));
  const from = Math.round(Number(opt.from || 0) * FPS);
  const to = Math.min(info.frames, opt.to ? Math.round(Number(opt.to) * FPS) : info.frames);
  const partial = from > 0 || to < info.frames;
  const name = opt.preview || partial ? `${video.file}_preview` : video.file;

  // 音声
  const t0 = Date.now();
  const track = renderSoundtrack(video.duration, collectCues(video));
  const wavFile = path.join(OUT, 'audio', `${id}.wav`);
  await fs.writeFile(wavFile, toWav(track));
  console.log(`[${id}] 音声 ${video.duration}s (${Date.now() - t0}ms)`);

  // 映像
  const mp4 = path.join(OUT, `${name}.mp4`);
  const ff = spawn(ffmpegPath(), [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0',
    '-ss', String(from / FPS), '-t', String((to - from) / FPS), '-i', wavFile,
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', opt.preview ? 'veryfast' : 'slow', '-crf', opt.preview ? '26' : '18',
    '-profile:v', 'high', '-level:v', '4.2', '-g', String(FPS * 2),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-shortest', mp4,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  sink = ff.stdin;
  nextFrame = from;
  pending.clear();
  const done = new Promise((resolve, reject) => ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exit ${c}`)))));
  await page.evaluate((v) => window.studio.select(v), id);
  const started = Date.now();
  const CHUNK = 150;
  for (let f = from; f < to; f += CHUNK) {
    const end = Math.min(to, f + CHUNK);
    await page.evaluate(({ a, b, url }) => window.studio.pushFrames(a, b, url), { a: f, b: end, url: `http://127.0.0.1:${port}/frame` });
    const el = (Date.now() - started) / 1000;
    const fps = (end - from) / el;
    process.stdout.write(`\r[${id}] ${end - from}/${to - from} frames  ${fps.toFixed(1)} fps  残り ${((to - end) / fps).toFixed(0)}s   `);
  }
  ff.stdin.end();
  await done;
  const st = await fs.stat(mp4);
  console.log(`\n[${id}] 書き出し完了: ${path.relative(ROOT, mp4)} (${(st.size / 1e6).toFixed(1)} MB, ${((Date.now() - started) / 1000).toFixed(0)}s)`);
}

await browser.close();
server.close();
