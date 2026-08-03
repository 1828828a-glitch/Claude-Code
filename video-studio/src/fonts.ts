import { continueRender, delayRender, staticFile } from 'remotion';

// フォントは public/fonts/ にセルフホスト(JIS X 0208サブセット済みWOFF2)。
// ネットワーク非依存なので、どの環境でも同じレンダリング結果になる。

// 見出し: 太い明朝(筆致のあるディスプレイ書体)
export const FONT_DISPLAY = `'Shippori Mincho B1', 'Noto Serif JP', serif`;
// 本文・字幕: 明朝
export const FONT_SERIF = `'Noto Serif JP', serif`;
// 小ラベル・データ表示: ゴシック
export const FONT_SANS = `'Noto Sans JP', sans-serif`;

const FONT_FILES: Array<{ family: string; weight: string; file: string }> = [
  { family: 'Shippori Mincho B1', weight: '700', file: 'ShipporiMinchoB1-700.woff2' },
  { family: 'Shippori Mincho B1', weight: '800', file: 'ShipporiMinchoB1-800.woff2' },
  { family: 'Noto Serif JP', weight: '500', file: 'NotoSerifJP-500.woff2' },
  { family: 'Noto Serif JP', weight: '600', file: 'NotoSerifJP-600.woff2' },
  { family: 'Noto Sans JP', weight: '500', file: 'NotoSansJP-500.woff2' },
  { family: 'Noto Sans JP', weight: '700', file: 'NotoSansJP-700.woff2' },
];

if (typeof document !== 'undefined') {
  const handle = delayRender('loading self-hosted fonts');
  Promise.all(
    FONT_FILES.map(async ({ family, weight, file }) => {
      const font = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {
        weight,
      });
      await font.load();
      (document.fonts as unknown as { add: (f: FontFace) => void }).add(font);
    })
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      // フォントが読めない場合もレンダリングは止めない(フォールバック書体で続行)
      console.error('font load failed', err);
      continueRender(handle);
    });
}
