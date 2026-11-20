const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const FPS = +process.env.FPS || 24, only = process.env.ONLY; // ONLY="t1,t2,..." -> stills
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()); });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction('window.READY === true', null, { timeout: 60000 });
  const total = await p.evaluate('TOTAL');
  fs.writeFileSync('timeline.json', JSON.stringify({ total, starts: await p.evaluate('STARTS') }));
  if (only) {
    for (const ts of only.split(',')) {
      const T = +ts; const st = Math.max(0, T - 1.5); // warm up particles
      for (let t = st; t < T; t += 1 / FPS) await p.evaluate(([t, d]) => renderFrame(t, d), [t, 1 / FPS]);
      await p.evaluate(([t, d]) => renderFrame(t, d), [T, 1 / FPS]);
      await p.screenshot({ path: `still_${ts}.jpg`, quality: 80, type: 'jpeg' });
    }
    await b.close(); return;
  }
  const n = Math.round(total * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', 'video.mp4']);
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await p.evaluate(([t, d]) => renderFrame(t, d), [f / FPS, 1 / FPS]);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) console.log(f, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done');
})();
