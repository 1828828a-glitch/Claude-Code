/**
 * 日本語テキストを扱うためのユーティリティ。
 *
 * 欧文と違い日本語は単語の区切りが空白ではないので、
 * 「1文字ずつ」か「明示的な区切り記号」で分割するのが基本になる。
 */

/**
 * サロゲートペア（絵文字など）を壊さずに1文字ずつ分割する。
 * String.prototype.split("") は絵文字を破壊するので使わない。
 */
export const toChars = (text: string): string[] => Array.from(text);

/**
 * 文節ごとに分割する。台本側で「私は/こう/思う」のように `/` を入れると
 * その単位で改行・アニメーションできる。`/` が無ければ1文字ずつ。
 */
export const toChunks = (text: string): string[] => {
  if (text.includes("/")) {
    return text.split("/").filter((chunk) => chunk.length > 0);
  }
  return toChars(text);
};

/** 明示的な改行 `\n` で行に割る */
export const toLines = (text: string): string[] => text.split("\n");

/**
 * 縁取り（袋文字）のテキストシャドウを作る。
 * WebKit の -webkit-text-stroke は内側に食い込んで細く見えるので、
 * 8方向の影を重ねる方が日本語テロップでは読みやすい。
 */
export const textOutline = (color: string, width: number): string => {
  const offsets: [number, number][] = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];
  return offsets
    .map(([x, y]) => `${x * width}px ${y * width}px 0 ${color}`)
    .join(", ");
};

/** ASCII と半角カナは全角のおよそ 0.55 文字分の幅 */
const isHalfWidth = (char: string) => /[ -~｡-ﾟ]/.test(char);

/** 1行の幅を「全角何文字分か（em）」で見積もる */
const lineWidthInEm = (line: string): number =>
  toChars(line).reduce((width, char) => width + (isHalfWidth(char) ? 0.55 : 1), 0);

/**
 * 複数行テキストの中で最も長い行の幅（em）。
 * これに fontSize を掛ければ必要な描画幅が出るので、
 * 逆算すれば「はみ出さない最大の fontSize」が求まる。
 */
export const maxLineWidthInEm = (text: string): number =>
  toLines(text).reduce((max, line) => Math.max(max, lineWidthInEm(line)), 0);

/**
 * 文字数から読み上げ時間をざっくり見積もる（秒）。
 * 日本語のナレーションは 1 分あたり 300〜350 文字が目安なので、
 * 5.5 文字/秒 で計算し、前後の間を足す。
 */
export const estimateNarrationSeconds = (
  text: string,
  charsPerSecond = 5.5,
  paddingSeconds = 0.6,
): number => {
  const chars = toChars(text.replace(/\s/g, "")).length;
  return chars / charsPerSecond + paddingSeconds;
};
