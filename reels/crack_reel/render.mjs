// index.html を1フレームずつ撮影して、リール用の MP4 (1080x1920 / 30fps) を書き出す。
//   node render.mjs                 動画を書き出す（--workers 3 で並列数を変えられる）
//   node render.mjs --stills 3,12.5 指定した秒のフレームを PNG で保存する
//   node render.mjs --range 50,60   指定した区間だけ out/preview.mp4 に書き出す
//   --page mojicut.html を付けると文字カット版を書き出す（out/crack_reel_mojicut.mp4）
//   --page motion.html でモーショングラフィックス版（out/crack_reel_motion.mp4）
// out/bgm_chic.wav / out/bgm_<ページ名>.wav（music.py で作る）があれば音声として入れる
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const FPS = 30;
const clip = { x: 0, y: 0, width: 1080, height: 1920, scale: 1 };

const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const stillsArg = opt('--stills');
const pageFile = opt('--page') ?? 'index.html';
const baseName = pageFile === 'index.html' ? 'crack_reel' : `crack_reel_${path.basename(pageFile, '.html')}`;
const range = opt('--range')?.split(',').map(Number);
const workers = Number(opt('--workers') ?? Math.max(1, Math.min(3, os.cpus().length - 1)));

const executablePath = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;

async function openPage() {
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(pathToFileURL(path.join(here, pageFile)).href + '?render');
  await page.evaluate(() => window.__ready);
  // Playwright の screenshot は PNG だと遅いので CDP で直接撮る
  const cdp = await page.context().newCDPSession(page);
  const shoot = async () => Buffer.from((await cdp.send('Page.captureScreenshot',
    { format: 'png', clip, optimizeForSpeed: true })).data, 'base64');
  return { browser, page, shoot };
}

function encoder(file, extra = []) {
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-r', String(FPS), ...extra, file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`)))));
  const write = async buf => { if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); };
  return { write, end: () => { ff.stdin.end(); return done; } };
}

if (stillsArg) {
  const { browser, page, shoot } = await openPage();
  const sc = await page.evaluate(() => window.CUTS ?? null);
  if (sc) fs.writeFileSync(path.join(outDir, `${path.basename(pageFile, '.html')}_cuts.json`), JSON.stringify({ total: await page.evaluate(() => window.TOTAL), cuts: sc }));
  for (const s of stillsArg.split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), s);
    fs.writeFileSync(path.join(outDir, `still_${baseName}_${s.toFixed(2)}.png`), await shoot());
  }
  console.log(`stills saved (total ${(await page.evaluate(() => window.TOTAL)).toFixed(2)}s)`);
  await browser.close();
  process.exit(0);
}

const probe = await openPage();
const total = await probe.page.evaluate(() => window.TOTAL);
// 文字カット版はカットの時刻を書き出しておく（music.py が効果音の位置に使う）
const cuts = await probe.page.evaluate(() => window.CUTS ?? null);
if (cuts) fs.writeFileSync(path.join(outDir, `${path.basename(pageFile, '.html')}_cuts.json`), JSON.stringify({ total, cuts }));
await probe.browser.close();
const first = range ? Math.floor(range[0] * FPS) : 0;
const frames = Math.ceil((range ? range[1] : total) * FPS) - first;
const per = Math.ceil(frames / workers);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
const t0 = Date.now();
let doneFrames = 0;

// 区間ごとに別のブラウザで撮って、それぞれ H.264 にする
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const from = first + w * per, to = first + Math.min(frames, (w + 1) * per);
  const { browser, page, shoot } = await openPage();
  const enc = encoder(path.join(tmp, `seg${w}.mp4`));
  for (let f = from; f < to; f++) {
    await page.evaluate(([t, n]) => window.seek(t, n), [f / FPS, f]);
    await enc.write(await shoot());
    if (++doneFrames % 300 === 0) console.log(`frame ${doneFrames}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await enc.end();
  await browser.close();
}));

// つないで無音の音声トラックを足す
const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, Array.from({ length: workers }, (_, w) => `file '${path.join(tmp, `seg${w}.mp4`)}'`).join('\n'));
const mp4 = path.join(outDir, range ? `preview_${baseName}.mp4` : `${baseName}.mp4`);
// music.py の BGM があれば入れる。なければ無音
const bgm = path.join(outDir, pageFile === 'index.html' ? 'bgm_chic.wav' : `bgm_${path.basename(pageFile, '.html')}.wav`);
const audioIn = fs.existsSync(bgm)
  ? `${range ? `-ss ${range[0]} ` : ''}-i "${bgm}"`
  : '-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000';
execSync([
  'ffmpeg -y -loglevel error -f concat -safe 0', `-i "${list}"`, audioIn,
  '-map 0:v -map 1:a -shortest -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart', `"${mp4}"`,
].join(' '));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`done: ${mp4} (${total.toFixed(2)}s, ${frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
