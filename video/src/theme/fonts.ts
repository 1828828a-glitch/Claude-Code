/**
 * フォント読み込み。
 *
 * Google Fonts の CDN からではなく、@fontsource のパッケージを
 * webpack でバンドルして読み込む。理由は2つ:
 *
 *  1. CJK を CDN から読むとサブセットが数百ファイルに分割されていて、
 *     レンダリング1回あたり数百リクエストが飛ぶ（遅い・不安定）。
 *  2. オフラインや社内プロキシ配下でもレンダリングが落ちない。
 *
 * @fontsource の `japanese` サブセットは1ウェイト1ファイル（約1MB）なので、
 * 必要なウェイトだけを import している。ウェイトを足すときは
 * 対応する CSS を import に追加すること。
 */
import "@fontsource/noto-sans-jp/japanese-400.css";
import "@fontsource/noto-sans-jp/japanese-700.css";
import "@fontsource/noto-sans-jp/japanese-900.css";
import "@fontsource/noto-sans-jp/latin-400.css";
import "@fontsource/noto-sans-jp/latin-700.css";
import "@fontsource/noto-sans-jp/latin-900.css";

import "@fontsource/noto-serif-jp/japanese-600.css";
import "@fontsource/noto-serif-jp/japanese-900.css";
import "@fontsource/noto-serif-jp/latin-600.css";
import "@fontsource/noto-serif-jp/latin-900.css";

import "@fontsource/anton/latin-400.css";

/** 本文・テロップ用のゴシック */
export const FONT_SANS = `"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;

/** 見出し・引用用の明朝（歴史/ドキュメンタリー系に効く） */
export const FONT_SERIF = `"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif`;

/** 欧文インパクト体（番組OP・数字の強調） */
export const FONT_DISPLAY = `"Anton", "Noto Sans JP", sans-serif`;

/**
 * プリロードすべき (weight, family) の組み合わせ。
 * FontPreloader がこの一覧を document.fonts.load に渡す。
 */
export const FONT_SPECS = [
  '400 100px "Noto Sans JP"',
  '700 100px "Noto Sans JP"',
  '900 100px "Noto Sans JP"',
  '600 100px "Noto Serif JP"',
  '900 100px "Noto Serif JP"',
  '400 100px "Anton"',
] as const;
