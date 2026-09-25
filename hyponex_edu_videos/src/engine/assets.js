// フォントと画像の読み込み
import { FONT, POP, IMPACT } from './text.js';

// ソースコード中の文字をすべて集め、必要なフォントのサブセットを先読みする
const TEXT_SOURCES = [
  'src/engine/text.js',
  'src/engine/stage.js',
  'src/art/character.js',
  'src/art/plants.js',
  'src/art/props.js',
  'src/art/scenery.js',
  'src/videos/common.js',
  'src/videos/v1.js',
  'src/videos/v2.js',
  'src/videos/v3.js',
  'src/videos/v4.js',
];

export async function loadFonts(base = '') {
  let text = 'あいうえおアイウエオ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz！？「」『』、。…〜ー・＝＋％';
  for (const src of TEXT_SOURCES) {
    try {
      const r = await fetch(base + src);
      if (r.ok) text += await r.text();
    } catch (e) {
      /* 未作成のファイルは無視 */
    }
  }
  const uniq = [...new Set(text)].join('');
  const specs = [
    ['500', FONT], ['700', FONT], ['800', FONT], ['900', FONT],
    ['400', POP], ['400', IMPACT],
  ];
  await Promise.all(specs.map(([w, f]) => document.fonts.load(`${w} 40px ${f}`, uniq)));
  await document.fonts.ready;
}

export const IMAGE_FILES = {
  logo: 'assets/cutout/hyponex_logo.png',
  magamp: 'assets/cutout/magamp_k_chuutsubu.png',
  rikidusGranule: 'assets/cutout/rikidus_granule.png',
  rikidus: 'assets/cutout/rikidus_liquid.png',
  genki: 'assets/cutout/hyponex_genki.png',
};

export async function loadImages(base = '') {
  const out = {};
  await Promise.all(
    Object.entries(IMAGE_FILES).map(async ([k, src]) => {
      const img = new Image();
      img.src = base + src;
      await img.decode();
      out[k] = img;
    }),
  );
  return out;
}
