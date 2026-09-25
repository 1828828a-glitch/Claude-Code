// 確認用: 指定した秒数の静止画を並べたコンタクトシートを作る
// node tools/stills.mjs v1 0.5,3,5 [出力先ディレクトリ]
import fs from 'node:fs/promises';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { launch } from './browser.mjs';

const [, , id = 'v1', timesArg = '', outDir = path.join(ROOT, 'out/stills')] = process.argv;
await fs.mkdir(outDir, { recursive: true });
const { server, port } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto(`http://127.0.0.1:${port}/player.html?render=1&video=${id}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const info = await page.evaluate((v) => window.studio.info(v), id);
if (info.warnings.length) console.log('字幕が速すぎる箇所:\n' + info.warnings.join('\n'));
let times = timesArg ? timesArg.split(',').map(Number) : [];
if (!times.length) for (let s = 0.5; s < info.duration; s += 2) times.push(s);
await page.evaluate((v) => window.studio.select(v), id);
const files = [];
for (const s of times) {
  const data = await page.evaluate((sec) => window.studio.snapshot(sec), s);
  const f = path.join(outDir, `${id}_${String(s.toFixed(2)).padStart(6, '0')}.png`);
  await fs.writeFile(f, Buffer.from(data.split(',')[1], 'base64'));
  files.push(f);
}
// コンタクトシート（ブラウザで縮小して並べる）
const cols = Math.min(6, files.length);
const sheet = await page.evaluate(async ({ times, cols, id }) => {
  const tw = 270, th = 480;
  const rows = Math.ceil(times.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * tw;
  c.height = rows * (th + 30);
  const g = c.getContext('2d');
  g.fillStyle = '#222';
  g.fillRect(0, 0, c.width, c.height);
  const src = document.getElementById('stage');
  for (let i = 0; i < times.length; i++) {
    window.studio.frameAt(times[i]);
    const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + 30);
    g.drawImage(src, x, y, tw, th);
    g.fillStyle = '#fff';
    g.font = '700 22px sans-serif';
    g.fillText(`${times[i].toFixed(1)}s`, x + 8, y + th + 22);
  }
  return c.toDataURL('image/png');
}, { times, cols, id });
const sheetFile = path.join(outDir, `${id}_sheet.png`);
await fs.writeFile(sheetFile, Buffer.from(sheet.split(',')[1], 'base64'));
console.log('sheet', sheetFile);
await browser.close();
server.close();
