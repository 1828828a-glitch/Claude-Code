// crack リール 3D版の書き出し。
// node reels/crack/3d/render3d.cjs              3本の動画とサムネイルを reels/crack/out3d に書き出す
// node reels/crack/3d/render3d.cjs --preview    確認用の静止画だけを書き出す
// node reels/crack/3d/render3d.cjs 02_omiyage   1本だけ
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out3d');
const FONT = '/usr/share/fonts/opentype/unifont/unifont_jp.otf';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.otf': 'font/otf' };
const SLUGS = ['01_teiji', '02_omiyage', '03_hanko'];
const FPS = 30;

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const file = u === '/font/uni.otf' ? FONT : path.join(ROOT, u);
      if (u !== '/font/uni.otf' && !file.startsWith(ROOT + path.sep)) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(file, (e, buf) => {
        if (e) { rsp.writeHead(404); return rsp.end(); }
        rsp.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); rsp.end(buf);
      });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

function py(code, ...args) { execFileSync('python3', ['-c', code, ...args], { cwd: ROOT, stdio: 'inherit' }); }
const PY_MARK = `
import numpy as np, sys
from PIL import Image
import make_reels as m
a = (m.logo_mask() * 255).astype(np.uint8)
img = Image.new("RGBA", (a.shape[1], a.shape[0]), (255, 255, 255, 0))
img.putalpha(Image.fromarray(a))
img.save(sys.argv[1])`;
// 音は2D版の部品を使い、ページが持つ時間割と効果音の表に合わせて並べ直す
const PY_WAV = `
import sys, json, wave
import numpy as np
import make_reels as m
info = json.loads(sys.argv[2])
total, hit, logo = info["total"], info["hit"], info["logo"]
m.G_BUT, m.G_SOL, m.G_END = hit, hit + 0.1, hit
out = m.bgm(total)
events = [(0.05, "pop"), (2.8, "pop"), (hit + 0.1, "crack"), (logo, "rumble"), (logo + 0.4, "jingle")] + [tuple(e) for e in info["sfx"]]
for t, k in events:
    s = m.sfx(k); st = int(t * m.SR); end = min(len(out), st + len(s))
    if st < len(out):
        out[st:end] += s[: end - st]
pcm = (np.clip(out, -1, 1) * 32000).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(m.SR); w.writeframes(pcm.tobytes())`;
const PY_SHEET = `
import sys
from PIL import Image
files = sys.argv[2:]
ims = [Image.open(f).resize((270, 480)) for f in files]
sheet = Image.new("RGB", (270 * 5, 480 * ((len(ims) + 4) // 5)))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % 5) * 270, (i // 5) * 480))
sheet.save(sys.argv[1])`;

const b64 = d => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const mark = path.join(ROOT, 'assets', 'logo_mark.png');
  if (!fs.existsSync(mark)) py(PY_MARK, mark);
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.error('[pageerror]', e));
  await page.goto(`http://127.0.0.1:${srv.address().port}/3d/index.html`);
  await page.waitForFunction(() => window.READY, null, { timeout: 120000 });
  if ((await page.evaluate(() => window.READY)) !== true) throw new Error('page init failed');

  const args = process.argv.slice(2);
  const only = args.filter(a => !a.startsWith('-'));
  const slugs = only.length ? only : SLUGS;
  if (args.includes('--preview')) {
    const pdir = path.join(OUT, 'preview'); fs.mkdirSync(pdir, { recursive: true });
    const times = (args.find(a => a.startsWith('--times=')) || '--times=1.5,3.8,5.2,8.8,11.5,14.4,18.2,21.0,23.4,25.8').slice(8).split(',').map(Number);
    for (const s of slugs) {
      const files = [];
      for (const t of times) {
        const f = path.join(pdir, `${s}_${t.toFixed(2)}.png`);
        fs.writeFileSync(f, b64(await page.evaluate(([s, t]) => window.renderFrame(s, t, 'png'), [s, t]))); files.push(f);
      }
      py(PY_SHEET, path.join(pdir, `${s}_sheet.png`), ...files);
      fs.writeFileSync(path.join(pdir, `${s}_thumb.png`), b64(await page.evaluate(s => window.renderThumb(s), s)));
      console.log('preview', s);
    }
  } else {
    for (const s of slugs) {
      const wav = path.join(OUT, s + '.wav'), mp4 = path.join(OUT, `crack3d_${s}.mp4`);
      const info = await page.evaluate(s => window.epInfo(s), s), TOTAL = info.total;
      py(PY_WAV, wav, JSON.stringify(info));
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise(r => ff.on('close', r));
      const N = Math.round(TOTAL * FPS), t0 = Date.now();
      for (let i = 0; i < N; i++) {
        const buf = b64(await page.evaluate(([s, t]) => window.renderFrame(s, t), [s, i / FPS]));
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (i % 120 === 0) console.log(s, i, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
      }
      ff.stdin.end();
      const code = await done;
      fs.unlinkSync(wav);
      if (code !== 0) throw new Error('ffmpeg failed: ' + mp4);
      fs.writeFileSync(path.join(OUT, `crack3d_${s}_thumb.png`), b64(await page.evaluate(s => window.renderThumb(s), s)));
      console.log('done', mp4);
    }
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
