// index.html をフレーム単位で描画し、ffmpeg で MP4 (1920x1080 / 30fps / H.264) に書き出す。
// 使い方:
//   node render.cjs                 -> autumn_vegetables.mp4 (bgm.cjs の BGM 付き)
//   node render.cjs --stills 2,8,20 -> 指定秒の PNG を stills/ に出力
//   node render.cjs --page soft.html --bgm bgm_soft.cjs --out autumn_vegetables_soft.mp4  -> やわらか版
//   --narration narration_impact.wav を足すと、ナレーション中は BGM を下げて重ねる (narration.py で生成)
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const FONTS = {
  'DelaGothicOne.ttf': 'https://fonts.gstatic.com/s/delagothicone/v19/hESp6XxvMDRA-2eD0lXpDa6QkBAGRQ.ttf',
  'NotoSansJP-500.ttf': 'https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFCMj75s.ttf',
  'NotoSansJP-700.ttf': 'https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf',
  'NotoSansJP-900.ttf': 'https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFLgk75s.ttf',
  'ZenMaruGothic-500.ttf': 'https://fonts.gstatic.com/s/zenmarugothic/v20/o-0XIpIxzW5b-RxT-6A8jWAtCp-cGWtCPA.ttf',
  'ZenMaruGothic-700.ttf': 'https://fonts.gstatic.com/s/zenmarugothic/v20/o-0XIpIxzW5b-RxT-6A8jWAtCp-cUW1CPA.ttf',
  'ZenMaruGothic-900.ttf': 'https://fonts.gstatic.com/s/zenmarugothic/v20/o-0XIpIxzW5b-RxT-6A8jWAtCp-caW9CPA.ttf',
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
  const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
  const pageFile = opt('--page', 'index.html');
  const bgmFile = opt('--bgm', 'bgm.cjs');
  const narration = opt('--narration', null);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, pageFile) + '?render=1');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));

  if (stillsIdx >= 0) {
    const dir = path.join(__dirname, 'stills', path.basename(pageFile, '.html'));
    fs.mkdirSync(dir, { recursive: true });
    for (const s of args[stillsIdx + 1].split(',').map(Number)) {
      const b64 = await page.evaluate(t => window.frameJPEG(t), s);
      fs.writeFileSync(path.join(dir, `t${String(s).padStart(5, '0')}.jpg`), Buffer.from(b64, 'base64'));
    }
    await browser.close();
    return;
  }

  const out = path.join(__dirname, opt('--out', 'autumn_vegetables.mp4'));
  const silent = path.join(__dirname, 'video_only.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silent],
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

  require('./' + bgmFile);
  const bgmWav = path.join(__dirname, bgmFile.replace(/\.cjs$/, '.wav'));
  // ナレーションがあれば、話している間だけ BGM を下げてから重ね、SNS 向けに -14 LUFS へ揃える
  const audioArgs = narration
    ? ['-i', bgmWav, '-i', path.join(__dirname, narration), '-filter_complex',
      '[2:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.6,asplit[n1][n2];' +
      '[1:a][n1]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=350[b];' +
      '[b][n2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]',
      '-map', '0:v', '-map', '[a]']
    : ['-i', bgmWav, '-map', '0:v', '-map', '1:a'];
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, ...audioArgs,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out],
  { stdio: 'inherit' }).on('close', code => (code ? rej(new Error('mux failed')) : res())));
  fs.unlinkSync(silent);
  console.log('done:', out);
})();
