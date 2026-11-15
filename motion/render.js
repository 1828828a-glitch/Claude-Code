// index.html をヘッドレスのブラウザで開き、1コマずつ取り出して ffmpeg で mp4 にする。
// ffmpeg と、Playwright のブラウザが要る。初回は npm install と npx playwright install chromium を済ませておく。
// 使い方: node render.js [出力先.mp4] [--w 1920 --h 1080 --sub 8 --from 0 --to 600 --still 秒]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const outFile = args[0] && !args[0].startsWith('--') ? args[0] : 'out.mp4';
const W = Number(opt('w', 1920));
const H = Number(opt('h', 1080));
const SUB = Number(opt('sub', 8));
const STILL = opt('still', null);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' };

function serve(root) {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

(async () => {
  const server = await serve(__dirname);
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => { console.error('ページのエラー:', e.message); process.exitCode = 1; });
  await page.goto(`http://127.0.0.1:${port}/index.html?render=1&w=${W}&h=${H}&sub=${SUB}`);
  await page.waitForFunction('window.motionReady === true', null, { timeout: 60000 });
  const { fps, frames } = await page.evaluate('({ fps: window.motion.fps, frames: window.motion.frames })');
  const grab = async (f) => Buffer.from((await page.evaluate((n) => window.motion.frame(n), f)).split(',')[1], 'base64');

  if (STILL !== null) {
    // 確認用に、指定した秒の静止画を並べて出す
    for (const s of STILL.split(',')) {
      const name = outFile.replace(/\.\w+$/, '') + `_${s}s.jpg`;
      fs.writeFileSync(name, await grab(Math.round(Number(s) * fps)));
    }
  } else {
    const from = Number(opt('from', 0));
    const to = Number(opt('to', frames));
    const ff = spawn('ffmpeg', [
      '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', outFile,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((ok) => ff.on('close', ok));
    for (let f = from; f < to; f++) {
      if (!ff.stdin.write(await grab(f))) await new Promise((ok) => ff.stdin.once('drain', ok));
      if (f % 60 === 0) console.log(`${f} / ${to}`);
    }
    ff.stdin.end();
    const code = await done;
    if (code !== 0) process.exitCode = code;
    console.log(`書き出し: ${outFile}`);
  }
  await browser.close();
  server.close();
})();
