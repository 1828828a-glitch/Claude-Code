// 開発用: ページのcanvasをPNGに保存する
// node tools/shot.mjs <相対URL> <出力PNG>
import fs from 'node:fs/promises';
import { startServer } from './server.mjs';
import { launch } from './browser.mjs';

const [, , rel, out] = process.argv;
const { server, port } = await startServer();
const browser = await launch();
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/${rel}`);
await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
await fs.writeFile(out, Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
server.close();
console.log('saved', out);
