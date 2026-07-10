/* Canvas版（../index.html）と同じデザイントークン・イージング */
export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION_S = 60;

export const INK = "#101014";
export const GREY = "#8b8f99";
export const ACCENT = "#5B67F2";
export const ACCENT2 = "#7d86f6";
export const BG = "#fafafc";
export const CARD = "#ffffff";

export const FONT = '"Noto Sans CJK JP","Noto Sans JP",sans-serif';

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const eoc = (k: number) => 1 - Math.pow(1 - k, 3); // easeOutCubic
export const eoq = (k: number) => 1 - Math.pow(1 - k, 5); // easeOutQuint
export const eio = (k: number) =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
export const eob = (k: number) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); // backOut
};

/* mulberry32（決定的な擬似乱数・Canvas版と同一） */
export function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
