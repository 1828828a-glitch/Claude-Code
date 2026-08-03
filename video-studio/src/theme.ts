// デザイントークン。全シーンはここから色・書体・余白を取る。
// 参照動画(歴史解説モーショングラフィックス)の画面設計に合わせて調整済み。
// シーン側で勝手な色指定をしないことが品質担保の前提。

export const COLORS = {
  // 和紙(生成り)ベース
  paper: '#EAE2CE',
  paperDeep: '#E0D6BE',
  // 墨
  ink: '#221D16',
  inkSoft: '#4A4136',
  // 朱(アクセント)
  crimson: '#B0352C',
  crimsonDeep: '#8E2A23',
  // 金
  gold: '#C9A45C',
  goldBright: '#E3C57C',
  // 闇シーン
  night: '#0F0D0B',
  nightSoft: '#1A1611',
  lightOnDark: '#F2E8D2',
  // 地図
  sea: '#2A3646',
  land: '#E6DCC4',
  landDark: '#3A342B',
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

// 画面端の安全マージン(px)。テキストはこの内側に置く。
export const SAFE = 96;

export type Mood = 'light' | 'dark' | 'gold';
