// ヘッドレスChromiumの起動（Playwright）
import fs from 'node:fs';
import { chromium } from 'playwright-core';

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return undefined; // Playwright 標準のブラウザを使う
}

export async function launch() {
  const executablePath = findChromium();
  const browser = await chromium.launch({
    executablePath,
    args: ['--disable-gpu', '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'],
  });
  return browser;
}
