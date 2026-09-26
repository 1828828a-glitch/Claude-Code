#!/usr/bin/env node
/*
 * SPOON豊前 紹介動画 — MP4 書き出し
 *
 * index.html をヘッドレス Chromium で開き、1コマずつ PNG にして ffmpeg に流し込みます。
 * 音は同じページの Web Audio で合成した WAV を使うので、ブラウザ再生と同じ内容になります。
 *
 *   npm install
 *   npx playwright install chromium   （初回のみ）
 *   npm run render
 *
 * オプション
 *   --fps 30            フレームレート（60も可）
 *   --crf 18            画質（小さいほど高画質・大容量）
 *   --out dist/xxx.mp4  出力先
 *   --from 0 --to 60    一部分だけ書き出す
 *   --no-audio          無音で書き出す
 *   --stills 2,19.5     指定秒の静止画だけPNGで保存する
 *
 * ffmpeg は 環境変数 FFMPEG_PATH → ffmpeg-static → PATH 上の ffmpeg の順で探します。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const FPS = Number(arg('fps', 30));
const CRF = String(arg('crf', 18));
const FROM = Number(arg('from', 0));
const TO = Number(arg('to', 60));
const OUT = path.resolve(process.cwd(), String(arg('out', path.join(__dirname, 'dist', 'spoon-buzen-60s.mp4'))));
const NO_AUDIO = arg('no-audio', false) === true;
const STILLS = arg('stills', '');

function findFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require('ffmpeg-static'); } catch (e) { return 'ffmpeg'; }
}

(async () => {
  const { chromium } = require('playwright');
  const launch = { args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] };
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) launch.proxy = { server: proxy, bypass: 'localhost,127.0.0.1' };
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[page]', e.message));
  if (proxy) {
    // 社内プロキシの証明書をChromiumが知らない環境向けに、フォントの取得だけNode側（NODE_EXTRA_CA_CERTS を信頼）で行う
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async route => {
      try { await route.fulfill({ response: await route.fetch() }); } catch (e) { await route.abort(); }
    });
  }

  await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
  await page.waitForFunction(() => window.SV && window.SV.isReady && window.SV.isReady(), null, { timeout: 60000 });
  const fams = await page.evaluate(() => window.SV.loadedFamilies());
  console.log('fonts:', fams.join(', ') || '(なし)');
  const need = ['Zen Maru Gothic', 'Zen Kaku Gothic New', 'Fredoka'];
  if (!need.every(f => fams.includes(f))) {
    console.warn('! Google Fonts を読み込めていないため、代替フォントで書き出されます。ネット接続を確認してください。');
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  if (STILLS) {
    for (const s of String(STILLS).split(',')) {
      const tt = Number(s);
      const b64 = await page.evaluate(t => window.SV.frameDataURL(t), tt);
      const file = OUT.replace(/\.mp4$/i, '') + `-${tt.toFixed(2)}s.png`;
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      console.log('saved', path.relative(process.cwd(), file));
    }
    await browser.close();
    return;
  }

  let wav = null;
  if (!NO_AUDIO) {
    const b64 = await page.evaluate(async () => window.SV.exportWavBase64());
    wav = path.join(os.tmpdir(), `spoon-buzen-${process.pid}.wav`);
    fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  }

  const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-'];
  if (wav) ffArgs.push('-ss', String(FROM), '-t', String(TO - FROM), '-i', wav);
  ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', CRF, '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS));
  if (wav) ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ffArgs.push('-movflags', '+faststart', OUT);

  const proc = spawn(findFfmpeg(), ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    proc.on('error', reject);
    proc.on('exit', code => (code === 0 ? resolve() : reject(new Error('ffmpeg が終了コード ' + code + ' で止まりました'))));
  });

  const N = Math.round((TO - FROM) * FPS);
  const started = Date.now();
  for (let i = 0; i < N; i++) {
    const tt = FROM + i / FPS;
    const b64 = await page.evaluate(t => window.SV.frameDataURL(t), tt);
    if (!proc.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => proc.stdin.once('drain', r));
    if (i % FPS === 0 || i === N - 1) {
      process.stdout.write(`\r${i + 1}/${N} コマ  ${((Date.now() - started) / 1000).toFixed(0)}秒`);
    }
  }
  proc.stdin.end();
  await done;
  process.stdout.write('\n');
  if (wav) fs.unlinkSync(wav);
  await browser.close();
  console.log('saved', path.relative(process.cwd(), OUT));
})().catch(e => {
  console.error(e);
  process.exit(1);
});
