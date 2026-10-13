// 使い方:
//   node render.js preview 3.5 20 46.8 ...   指定秒のフレームを frames/ に PNG で保存
//   node render.js video out.mp4 [fps] [workers]   全編を MP4 に書き出す
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const PAGE = 'file://' + path.resolve(__dirname, 'index.html');

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return page;
}

async function preview(times) {
  const browser = await chromium.launch();
  const page = await openPage(browser);
  fs.mkdirSync(path.join(__dirname, 'frames'), { recursive: true });
  for (const t of times) {
    await page.evaluate(t => window.seek(t), t);
    const f = path.join(__dirname, 'frames', `t${String(t).padStart(6, '0')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close();
}

async function renderSegment(from, to, fps, out) {
  // スクリーンショットはブラウザ本体のプロセスで詰まりやすいので、区間ごとにブラウザを分ける
  const browser = await chromium.launch();
  const page = await openPage(browser);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), out]);
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  // 区切り直後のフレームでも状態が正しくなるよう、先頭から順に一度通しておく
  for (let t = 0; t < from / fps; t += 0.5) await page.evaluate(t => window.seek(t), t);
  for (let f = from; f < to; f++) {
    await page.evaluate(t => window.seek(t), f / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % 300 === 0) console.log(`  ${out}: frame ${f}/${to}`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
}

async function video(out, fps = 30, workers = 4) {
  const browser = await chromium.launch();
  const probe = await openPage(browser);
  const dur = await probe.evaluate(() => window.DURATION);
  await browser.close();
  const total = Math.round(dur * fps);
  const per = Math.ceil(total / workers);
  const tmp = path.join(__dirname, 'frames');
  fs.mkdirSync(tmp, { recursive: true });
  const segs = [];
  for (let i = 0; i < workers; i++) {
    const a = i * per, b = Math.min(total, a + per);
    if (a < b) segs.push({ a, b, file: path.join(tmp, `seg${i}.mp4`) });
  }
  const t0 = Date.now();
  await Promise.all(segs.map(s => renderSegment(s.a, s.b, fps, s.file)));
  const list = path.join(tmp, 'segs.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s.file}'`).join('\n'));
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' })
    .on('close', c => c === 0 ? res() : rej(new Error('concat ' + c))));
  console.log(`done: ${out} (${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'preview') preview(args.map(Number)).catch(e => { console.error(e); process.exit(1); });
else if (mode === 'video') video(args[0] || 'video_noaudio.mp4', +(args[1] || 30), +(args[2] || 4)).catch(e => { console.error(e); process.exit(1); });
else console.log('usage: node render.js preview <sec...> | video <out.mp4> [fps] [workers]');
