// みらキャン リール：src/reel.html?id=… を1コマずつ撮って、無音の MP4 にする。
// 使い方:
//   NODE_PATH=$(npm root -g) node render.cjs R01 R02        … 指定したリールを書き出す（all で R01〜R09）
//   NODE_PATH=$(npm root -g) node render.cjs --stills R01 1.5 4.2 … 指定秒の静止画だけ（build/ に置く）
// 書き出すもの（out/）：MP4、カバーPNG（1枚目と同じデザイン）、確認用の静止画（0秒・中盤・最後）
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const OUT = path.join(dir, 'out'), BUILD = path.join(dir, 'build');
const ALL = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09'];

// reels.json を画面側から読めるようにする（文言の差し替えはここから）
function writeData() {
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'spec', 'reels.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'src', 'reels_data.js'), '// spec/reels.json から自動で作る。直接書き換えない\nwindow.REELS_DATA = ' + JSON.stringify(data, null, 1) + ';\n');
}

async function open(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error(`[${id}] pageerror:`, e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[${id}] console:`, m.text()); });
  await page.goto('file://' + path.join(dir, 'src', 'reel.html') + `?render&id=${id}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  return page;
}

async function renderOne(browser, id) {
  const page = await open(browser, id);
  const S = await page.evaluate(() => window.STAGE);
  const stage = await page.$('#stage');
  // 安全領域のチェック（各カットの終わり近く）
  const issues = [];
  for (const t of S.checks) for (const v of await page.evaluate(t => window.__safeCheck(t), t)) issues.push(`${t}秒 ${v}`);
  console.log(`[${id}] 安全領域: ${issues.length ? 'はみ出しあり\n  ' + issues.join('\n  ') : 'OK'}`);

  const ymd = S.date.replace(/-/g, '');
  const base = `${id}_${ymd}_${S.file}${S.suffix}`;
  const total = Math.round(S.fps * S.dur);
  const stillAt = new Map([[0, '00.0'], [Math.round(total / 2), (S.dur / 2).toFixed(1).padStart(4, '0')], [total - 1, ((total - 1) / S.fps).toFixed(1).padStart(4, '0')]]);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(S.fps), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(S.fps), '-movflags', '+faststart',
    path.join(OUT, base + '.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  await page.evaluate(d => { window.__seek(d); window.__seek(0); }, S.dur);
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.__seek(t), f / S.fps);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (stillAt.has(f)) fs.writeFileSync(path.join(OUT, `${id}_確認_${stillAt.get(f)}秒.png`), buf);
    if (f % 150 === 0) console.log(`[${id}] ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  // カバー：1枚目のカットが出そろったところ
  await page.evaluate(t => window.__seek(t), S.cover);
  await stage.screenshot({ path: path.join(OUT, `${id}_cover.png`), type: 'png' });
  fs.writeFileSync(path.join(BUILD, `${id}_cues.json`), JSON.stringify(await page.evaluate(() => window.STAGE), null, 1));
  await page.close();
  console.log(`[${id}] done → out/${base}.mp4`);
  return issues.length;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(BUILD, { recursive: true });
  writeData();
  const args = process.argv.slice(2);
  // 書体もライブラリも手元にあるので、ネットにはつながない
  const browser = await chromium.launch();
  if (args[0] === '--stills') {
    const id = args[1];
    const page = await open(browser, id);
    const stage = await page.$('#stage');
    for (const t of args.slice(2).map(Number)) {
      await page.evaluate(t => window.__seek(t), t);
      await stage.screenshot({ path: path.join(BUILD, `${id}_still_${t.toFixed(2)}.png`) });
    }
    const S = await page.evaluate(() => window.STAGE);
    for (const t of S.checks) for (const v of await page.evaluate(t => window.__safeCheck(t), t)) console.log(`[${id}] ${t}秒 ${v}`);
    await browser.close();
    return;
  }
  const ids = args.length === 0 || args[0] === 'all' ? ALL : args;
  let bad = 0;
  for (const id of ids) bad += await renderOne(browser, id);
  await browser.close();
  if (bad) process.exitCode = 2;
})();
