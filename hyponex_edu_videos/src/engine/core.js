// 描画エンジンの基礎: 定数、補間、イージング、乱数
export const W = 1080;
export const H = 1920;
export const FPS = 30;

// 縦型SNS向けのレイアウト基準（上下のUIに隠れにくい位置）
export const LAYOUT = {
  headerY: 196,
  telopY: 410,
  stageTop: 540,
  groundY: 1250,
  subY: 1418,
  bandY: 1540,
  safeBottom: 1500,
};

export const C = {
  brand: '#009A44',
  brandDark: '#007A36',
  brandDeep: '#0B5A2C',
  brandLight: '#E4F4E8',
  yellowGreen: '#ACCC0A',
  heart: '#E30014',
  leaf: '#46B45A',
  leafLight: '#8FD16A',
  leafDark: '#2E8A45',
  wilt: '#B5A54A',
  wiltDark: '#8E7F36',
  orange: '#FF8A2A',
  orangeDeep: '#F0641E',
  red: '#E8412B',
  yellow: '#FFD23F',
  yellowSoft: '#FFF0A8',
  cream: '#FFF8E8',
  pink: '#FF8FB1',
  pinkSoft: '#FFE1EA',
  sky: '#CFEBFF',
  skyDeep: '#7CC6F2',
  water: '#4FB3EE',
  terracotta: '#E27D4C',
  terracottaDark: '#C3603A',
  soil: '#7A5236',
  soilDark: '#553725',
  soilLight: '#9A6C48',
  ink: '#43352C',
  text: '#1F3A2A',
  white: '#FFFFFF',
  gray: '#8E9A92',
  purple: '#8E5BD0',
  blue: '#3E8EDE',
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const TAU = Math.PI * 2;
export const deg = (d) => (d * Math.PI) / 180;

// t が start から dur 秒でどこまで進んだか (0..1)
export const prog = (t, start, dur) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / dur));

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const c4 = TAU / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// 出現: t0 から dur 秒でポンッと 0→1（オーバーシュートあり）
export const pop = (t, t0, dur = 0.45) => (t < t0 ? 0 : ease.outBack(prog(t, t0, dur), 2.2));
// フェード 0→1
export const fade = (t, t0, dur = 0.3) => ease.outQuad(prog(t, t0, dur));
// 表示区間: t0 で入り、t1 で出る
export function inOut(t, t0, t1, dIn = 0.3, dOut = 0.25) {
  if (t < t0 || t > t1 + dOut) return 0;
  const a = ease.outCubic(prog(t, t0, dIn));
  const b = 1 - ease.inQuad(prog(t, t1, dOut));
  return Math.min(a, b);
}

// キーフレーム補間 kf(t, [[時刻, 値, イージング], ...])
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1, e] = keys[i + 1];
    if (t <= t1) {
      const p = (t - t0) / (t1 - t0);
      const f = (e && ease[e]) || ease.inOutCubic;
      return lerp(v0, v1, f(p));
    }
  }
  return keys[keys.length - 1][1];
}

// 再現性のある乱数
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const r = a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}

export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// 瞬き: 数秒おきに一瞬目を閉じる (0=開, 1=閉)
export function blinkAt(t, seed = 0) {
  const period = 3.1 + (seed % 3) * 0.7;
  const p = (t + seed * 1.37) % period;
  if (p < 0.07) return p / 0.07;
  if (p < 0.14) return 1 - (p - 0.07) / 0.07;
  return 0;
}

// 口パク (0..1)
export function talkAt(t, on = true) {
  if (!on) return 0;
  const v = Math.abs(Math.sin(t * 11.5)) * 0.75 + Math.abs(Math.sin(t * 5.3 + 1)) * 0.25;
  return clamp(v);
}
