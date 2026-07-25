// フォントと音源を public/ に配置する。
// フォント本体は intro_video/fonts/(fetch_fonts.sh で取得、git 管理外)から複製する。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fontSrc = path.resolve(root, '..', '..', 'fonts');
const fontDst = path.join(root, 'public', 'fonts');
fs.mkdirSync(fontDst, { recursive: true });

const fonts = ['NotoSansJP-Bold.ttf', 'Poppins-Bold.ttf', 'JetBrainsMono-Regular.ttf', 'JetBrainsMono-Bold.ttf'];
let missing = [];
for (const f of fonts) {
  const s = path.join(fontSrc, f);
  if (!fs.existsSync(s)) { missing.push(f); continue; }
  fs.copyFileSync(s, path.join(fontDst, f));
  console.log('font', f);
}
if (missing.length) {
  console.error('見つからないフォント:', missing.join(', '));
  console.error('先に intro_video/fetch_fonts.sh を実行してください');
  process.exit(1);
}
