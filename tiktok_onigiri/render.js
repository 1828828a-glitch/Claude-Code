// 使い方: node render.js <video> [--still t1,t2,...] [--out dir]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const v = args[0];
  const stillIdx = args.indexOf('--still');
  const stills = stillIdx >= 0 ? args[stillIdx + 1].split(',').map(Number) : null;
  const outIdx = args.indexOf('--out');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(__dirname, 'src', 'player.html') + '?v=' + v);
  await page.waitForFunction(() => window.READY !== undefined, null, { timeout: 30000 });
  if ((await page.evaluate(() => window.READY)) !== true) throw new Error('video script failed');
  const meta = await page.evaluate(() => ({ duration: VIDEO.duration, audio: VIDEO.audio || [], duck: VIDEO.duck || [], shotlist: VIDEO.shotlist || null }));
  if (meta.shotlist) fs.writeFileSync(path.join(outDir, `${v}_shotlist.json`), JSON.stringify(meta.shotlist, null, 1));
  // --storyboard: 各カットの中ほどの静止画を書き出す(絵コンテ用)
  const sbIdx = args.indexOf('--storyboard');
  if (sbIdx >= 0 && meta.shotlist) {
    const dir = args[sbIdx + 1]; fs.mkdirSync(dir, { recursive: true });
    for (const r of meta.shotlist) {
      const t = r.t0 + r.sec * (r.sbAt ?? 0.6);
      const url = await page.evaluate(t => frameAt(t, 'image/jpeg', 0.88), t);
      fs.writeFileSync(path.join(dir, `${r.id}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    console.log('storyboard', meta.shotlist.length, 'frames');
    await browser.close();
    return;
  }
  if (stills) {
    for (const t of stills) {
      const url = await page.evaluate(t => frameAt(t, 'image/png'), t);
      const f = path.join(outDir, `${v}_${String(t).replace('.', '_')}.png`);
      fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
      console.log('wrote', f);
    }
    await browser.close();
    return;
  }
  fs.writeFileSync(path.join(outDir, `${v}_cues.json`), JSON.stringify(meta, null, 1));
  const n = Math.round(meta.duration * 30);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'animation',
    path.join(outDir, `${v}_video.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate(t => frameAt(t), i / 30);
    const b = Buffer.from(url.split(',')[1], 'base64');
    if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`${v}: ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`${v}: done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch(e => { console.error(e); process.exit(1); });
