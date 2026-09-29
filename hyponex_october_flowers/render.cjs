// ヘッドレスChromiumでフレームを1枚ずつ描画し、ffmpegでMP4に書き出す。
// 使い方: node render.cjs [出力ファイル] [--subs] [--fps=30] [--from=秒] [--to=秒]
// ffmpeg は PATH か環境変数 FFMPEG で指定する。
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--')) || 'october_flowers.mp4';
const opt = k => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const subtitles = args.includes('--subs');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// file:// だとフォントやロゴの読み込みが制限されるので簡易サーバーを立てる
function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css', '.woff2': 'font/woff2' };
  const srv = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(buf);
    });
  });
  return new Promise(r => srv.listen(0, () => r(srv)));
}

(async () => {
  const srv = await serve(__dirname);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true });
  await page.goto(`http://localhost:${srv.address().port}/index.html`);
  await page.evaluate(async () => {
    await document.fonts.load('900 100px "Zen Maru Gothic"');
    await document.fonts.load('700 100px "Zen Maru Gothic"');
    await document.fonts.load('500 100px "Zen Maru Gothic"');
    await document.fonts.ready;
    const img = new Image(); img.src = 'logo.png'; await img.decode(); window.OctoberVideo.setLogo(img);
  });

  const { DURATION, FPS } = await page.evaluate(() => window.OctoberVideo);
  const fps = +(opt('fps') || FPS);
  const from = +(opt('from') || 0), to = +(opt('to') || DURATION);

  // BGMをOfflineAudioContextでWAV化
  const wavB64 = await page.evaluate(async ({ from, to }) => {
    const V = window.OctoberVideo, sr = 48000;
    const oc = new OfflineAudioContext(2, Math.ceil(sr * V.DURATION), sr);
    V.buildBGM(oc, oc.destination, V.DURATION, 0);
    const buf = await oc.startRendering();
    const s0 = Math.floor(from * sr), s1 = Math.min(buf.length, Math.floor(to * sr)), n = s1 - s0;
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab);
    const w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
    w(36, 'data'); dv.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) {
      dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[s0 + i])) * 32767, true);
      dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[s0 + i])) * 32767, true);
    }
    const bytes = new Uint8Array(ab); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }, { from, to });
  const wavPath = path.join(__dirname, 'bgm.wav');
  fs.writeFileSync(wavPath, Buffer.from(wavB64, 'base64'));
  console.log('BGM書き出し完了:', wavPath);

  const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', wavPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'pipe'] });
  let ffErr = ''; ff.stderr.on('data', d => { ffErr = (ffErr + d).slice(-4000); });

  const total = Math.round((to - from) * fps);
  for (let f = 0; f < total; f++) {
    const t = from + f / fps;
    const b64 = await page.evaluate(({ t, subtitles }) => {
      const cv = document.getElementById('cv');
      window.OctoberVideo.render(cv.getContext('2d'), t, { subtitles });
      return cv.toDataURL('image/jpeg', 0.95).split(',')[1];
    }, { t, subtitles });
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (fps * 5) === 0) process.stdout.write(`\r描画中 ${f}/${total}`);
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  await browser.close(); srv.close();
  if (code !== 0) { console.error(ffErr); process.exit(1); }
  console.log(`\n完成: ${out}`);
})();
