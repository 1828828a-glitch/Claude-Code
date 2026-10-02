// index.html をフレーム単位で描画し、ffmpeg で MP4 (1920x1080 / 30fps / H.264) に書き出す。
// 使い方:
//   node render.cjs                 -> autumn_vegetables.mp4
//   node render.cjs --stills 2,8,20 -> 指定秒の PNG を stills/ に出力
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const FONTS = {
  'DelaGothicOne.ttf': 'https://fonts.gstatic.com/s/delagothicone/v19/hESp6XxvMDRA-2eD0lXpDa6QkBAGRQ.ttf',
  'NotoSansJP-500.ttf': 'https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFCMj75s.ttf',
  'NotoSansJP-700.ttf': 'https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf',
  'NotoSansJP-900.ttf': 'https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFLgk75s.ttf',
};

// フォントは容量が大きいのでリポジトリに含めず、初回に Google Fonts から取得する
async function ensureFonts() {
  const dir = path.join(__dirname, 'fonts');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, url] of Object.entries(FONTS)) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`font download failed: ${url}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
}

(async () => {
  await ensureFonts();
  const args = process.argv.slice(2);
  const stillsIdx = args.indexOf('--stills');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));

  if (stillsIdx >= 0) {
    const dir = path.join(__dirname, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of args[stillsIdx + 1].split(',').map(Number)) {
      const b64 = await page.evaluate(t => window.frameJPEG(t), s);
      fs.writeFileSync(path.join(dir, `t${String(s).padStart(5, '0')}.jpg`), Buffer.from(b64, 'base64'));
    }
    await browser.close();
    return;
  }

  const out = path.join(__dirname, 'autumn_vegetables.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(DURATION * FPS);
  for (let f = 0; f < total; f++) {
    const b64 = await page.evaluate(t => window.frameJPEG(t), f / FPS);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) process.stdout.write(`frame ${f}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done:', out);
})();
