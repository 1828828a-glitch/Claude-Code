/* render.cjs — dist/moshimo-block.html を1コマずつ撮って MP4 にする
 *
 * 使い方: node moshimo_block/render.cjs [出力先.mp4] [--ep ep02] [--fps 30] [--from 秒 --to 秒] [--frames 秒,秒,...]
 *   --ep で回を選ぶ（省略時は ep01）。--html で別に組み立てた HTML を使える
 *   --frames を付けると動画は作らず、その時刻の静止画（PNG）だけを書き出す（見た目の確認用）
 * 必要なもの: Playwright（Chromium 付き）と ffmpeg
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const ep = opt('--ep', 'ep01');
const out = path.resolve(args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || path.join(__dirname, 'dist', `${ep}.mp4`));
const fps = Number(opt('--fps', 30));
const frames = opt('--frames', null);

function run(cmd, argv, stdin) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'inherit'] });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    if (stdin) stdin(p.stdin);
  });
}

(async () => {
  const htmlPath = path.resolve(opt('--html', path.join(__dirname, 'dist', 'moshimo-block.html')));
  const body = fs.readFileSync(htmlPath, 'utf8');
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head><body>${body}</body></html>`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.addInitScript((id) => { window.__RENDER_MODE = true; window.__RENDER_EP = id; }, ep);
  const wrapper = path.join(path.dirname(htmlPath), `.render-${ep}-${process.pid}.html`);
  fs.writeFileSync(wrapper, html);
  await page.goto('file://' + wrapper, { waitUntil: 'networkidle' });
  fs.unlinkSync(wrapper);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const duration = await page.evaluate(() => window.__duration);
  const clip = { x: 0, y: 0, width: 1280, height: 720 };

  if (frames) {
    fs.mkdirSync(out, { recursive: true });
    for (const t of frames.split(',').map(Number)) {
      await page.evaluate((tt) => window.__seek(tt), t);
      const file = path.join(out, `t${t.toFixed(2).padStart(5, '0')}.png`);
      await page.screenshot({ path: file, clip });
      console.log('wrote', file);
    }
    await browser.close();
    return;
  }

  const t0 = Number(opt('--from', 0)), t1 = Math.min(Number(opt('--to', duration)), duration);
  const wav = out.replace(/\.mp4$/, '') + '.wav';
  const b64 = await page.evaluate(() => window.__renderAudio());
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  console.log('audio ready');

  const n = Math.round((t1 - t0) * fps);
  const started = Date.now();
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-ss', String(t0), '-t', String(t1 - t0), '-i', wav,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out,
  ], async (stdin) => {
    for (let i = 0; i < n; i++) {
      await page.evaluate((tt) => window.__seek(tt), t0 + i / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95, clip });
      if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${n} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
    stdin.end();
  });
  fs.unlinkSync(wav);
  await browser.close();
  console.log('wrote', out);
})().catch((e) => { console.error(e); process.exit(1); });
