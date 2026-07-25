// styleframe を 1920x1080 / deviceScaleFactor 2 で撮る。
// Q2: 3D で使うテクスチャは表示サイズの 2 倍以上で栅格化する。
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const exe = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await page.goto('file://' + path.join(here, 'styleframe.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
for (const id of ['fa', 'fb', 'fc']) {
  await page.locator('#' + id).screenshot({ path: path.join(here, `${id}.png`) });
  console.log('shot', id);
}
await browser.close();
