/**
 * カラーパレットとレイアウトのトークン。
 *
 * テンプレートは必ずここのパレットを経由して色を決める。直接 hex を書かない
 * ことで「動画全体で色がバラつく」のを防ぐ。
 */

export type Palette = {
  /** 背景の基準色 */
  bg: string;
  /** 背景の奥側（グラデーションの終点） */
  bgDeep: string;
  /** 本文テキスト */
  fg: string;
  /** 弱いテキスト（補足・出典） */
  fgMuted: string;
  /** 主役のアクセント */
  accent: string;
  /** 副アクセント（対比・2色目） */
  accent2: string;
  /** 警告・強調のハイライト */
  highlight: string;
  /** テロップの縁取り */
  stroke: string;
};

export const PALETTES = {
  /** 和風・歴史解説向け（墨と朱と金） */
  washi: {
    bg: "#f4ece0",
    bgDeep: "#e3d5c0",
    fg: "#1c1a17",
    fgMuted: "#6b6157",
    accent: "#c8102e",
    accent2: "#1f4e5f",
    highlight: "#e8b53a",
    stroke: "#ffffff",
  },
  /** 墨黒ベースのシリアスな解説 */
  sumi: {
    bg: "#14161a",
    bgDeep: "#05060a",
    fg: "#f5f2ec",
    fgMuted: "#9aa0a8",
    accent: "#e2453c",
    accent2: "#4fb3c8",
    highlight: "#f2c14e",
    stroke: "#0a0b0e",
  },
  /** 番組OP・ネオン */
  neon: {
    bg: "#0a0a18",
    bgDeep: "#000006",
    fg: "#ffffff",
    fgMuted: "#8b8fa8",
    accent: "#00e5ff",
    accent2: "#ff2d9b",
    highlight: "#ffe600",
    stroke: "#000010",
  },
  /** ポップ・バラエティ・ショート動画 */
  pop: {
    bg: "#fffaf0",
    bgDeep: "#ffe7c2",
    fg: "#1a1a2e",
    fgMuted: "#6c6c86",
    accent: "#ff4d6d",
    accent2: "#3a86ff",
    highlight: "#ffd60a",
    stroke: "#ffffff",
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

export const getPalette = (name: PaletteName = "sumi"): Palette =>
  PALETTES[name] ?? PALETTES.sumi;

/** 動画サイズのプリセット */
export const FORMATS = {
  /** YouTube 等の横型 */
  landscape: { width: 1920, height: 1080 },
  /** TikTok / Shorts / Reels の縦型 */
  vertical: { width: 1080, height: 1920 },
  /** Instagram フィードの正方形 */
  square: { width: 1080, height: 1080 },
} as const;

export type FormatName = keyof typeof FORMATS;

export const FPS = 30;

/**
 * 縦型はスマホの UI（上部の時刻・下部のキャプション）に隠れるため、
 * 文字はこの内側に収める。
 */
export const SAFE_AREA = {
  landscape: { top: 60, bottom: 60, left: 120, right: 120 },
  vertical: { top: 220, bottom: 320, left: 72, right: 72 },
  square: { top: 80, bottom: 80, left: 80, right: 80 },
} as const;
