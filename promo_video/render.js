// Renders index.html frame by frame with headless Chromium and pipes the frames to ffmpeg.
//   FONTS_DIR=/path/to/fonts node render.js out.mp4            full render (silent video)
//   FONTS_DIR=/path/to/fonts node render.js --stills dir 30,90 only the listed frames, as JPEG
// FONTS_DIR holds the unpacked @fontsource packages: shippori-mincho-b1, zen-kaku-gothic-new, bodoni-moda.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 30, DURATION = 50, TOTAL = FPS * DURATION;
const FONTS = process.env.FONTS_DIR || path.join(__dirname, 'fonts');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' };

(async () => {
  const args = process.argv.slice(2);
  const stills = args[0] === '--stills';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.route('http://promo.local/**', route => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = p.startsWith('/fonts/') ? path.join(FONTS, p.slice(7)) : path.join(__dirname, p === '/' ? 'index.html' : p);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ body: fs.readFileSync(file), contentType: MIME[path.extname(file)] || 'application/octet-stream' });
  });
  await page.goto('http://promo.local/');
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });

  const grab = async i => Buffer.from((await page.evaluate(n => { renderFrame(n); return grab(); }, i)).split(',')[1], 'base64');

  if (stills) {
    const dir = args[1], want = new Set(args[2].split(',').map(Number)), last = Math.max(...want);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i <= last; i++) {
      if (want.has(i)) fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), await grab(i));
      else await page.evaluate(n => renderFrame(n), i);
    }
  } else {
    const out = args[0] || 'out.mp4';
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < TOTAL; i++) {
      const buf = await grab(i);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${TOTAL}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
