// 設計 spec (../DESIGN-SPEC.md) の Stage 1 トークン。
// 全ショットがこの一組を再利用する。二種混用は「拼盘」として読まれるので禁止。

export const C = {
  bg: '#141413',
  surface: '#201F1D',
  surfaceHi: '#262421',
  fg: '#faf9f5',
  muted: '#b0aea5',
  accent: '#d97757',
  accent2: '#6a9bcc',
  accent3: '#788c5d',
} as const;

export const F = {
  jp: '"NotoJP", sans-serif',
  latin: '"Poppins", sans-serif',
  mono: '"Mono", monospace',
} as const;

/**
 * 動效性格トークン。
 * プリセット「専業信頼(fintech/enterprise/B2B)」を基礎に、受众が非エンジニアなので
 * 「平静関懐」寄りへ +3f 調整した(spec Stage 1)。
 */
export const M = {
  /** 主時長 @30fps */
  dur: 24,
  /** 通常の入場 easing。過冲なし */
  easeIn: [0, 0, 0.2, 1] as const,
  /**
   * 落地隠喻のある動作専用。判例優先で y1 > 1 が必須。
   * 「専業信頼は弾まない」は淡入/推移類にのみ適用される。
   */
  easeLand: [0.3, 0, 0.25, 1.15] as const,
  /** 字標落定の hold(R1: 1秒) */
  holdBrand: 30,
  /** 批量動效収尾の静止(R2) */
  holdBatch: 15,
} as const;

/** 背景。全ショット共通の地。styleframe と同値。 */
export const BG_LAYERS = [
  'radial-gradient(1100px 780px at 78% 12%, rgba(217,119,87,.13), transparent 68%)',
  'radial-gradient(980px 700px at 10% 88%, rgba(106,155,204,.09), transparent 70%)',
  'linear-gradient(180deg, #1a1918 0%, #100f0e 100%)',
].join(',');

/**
 * 確定性擬似乱数(mulberry32)。
 * pipeline 阶段5 の鉄律: Math.random() / Date.now() は禁止。seed は index から派生させる。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
