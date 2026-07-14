export const COLORS = {
  ink: '#0B1020',
  inkSoft: '#252B3F',
  white: '#FFFFFF',
  offWhite: '#F7F8FB',
  grey: '#9CA3AF',
  greyDark: '#6B7280',
  blue: '#4353FF',
  purple: '#8B5CF6',
};

export const GRADIENT = `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.purple} 100%)`;

export const FONT = "'Noto Sans CJK JP', 'Noto Sans JP', sans-serif";

export const FPS = 30;

// Scene durations in frames (total 2590 ≈ 86s @30fps, paced to natural-rate narration)
export const SCENES = {
  tech: 315, // S1 技術宣言 10.5s
  engine: 400, // S2 技術の中身 13.3s
  intro: 190, // S3 問いの宣言 6.3s
  q1: 250, // S4 Q1 8.3s
  q2: 295, // S5 Q2 9.8s
  q3: 240, // S6 Q3 8s
  answer: 460, // S7 答え 15.3s
  cta: 440, // S8 CTA 14.7s
};

// ラグジュアリー版専用タイムライン（total 4175 ≈ 139s）
// 構成: 人事編 → 一般論は一行もない → マーケティング編 → 共通エンディング（各文は一度だけ）
export const LUX_SCENES = {
  tech: 315, // L1 技術宣言 10.5s
  engine: 400, // L2 技術の中身 13.3s
  intro: 190, // L3 例えば、採用。6.3s
  q1: 250, // L4 Q1 8.3s
  q2: 295, // L5 Q2 9.8s
  q3: 240, // L6 Q3 8s
  answer: 460, // L7 答え 15.3s
  nogen: 130, // L8 一般論は、一行もない。4.3s
  mintro: 440, // M1 例えば、マーケティング。＋断言 14.7s
  mq1: 180, // M2 検索されたとき 6s
  mq2: 195, // M3 営業で伝わる強み 6.5s
  mq3: 180, // M4 見込み客 6s
  mscope: 520, // M5 診断範囲→優先順位→ロードマップ 17.3s
  cta: 380, // L9 もう出せます→エンドカード 12.7s
};

export const LUX_TOTAL_FRAMES = Object.values(LUX_SCENES).reduce((a, b) => a + b, 0);

// 3D版専用タイムライン（total 4775 ≈ 159s）
// マーケ編の締めに「アドターン for マーケティング」リビール、最後はデジブレで締めるフィナーレ
export const V3D_SCENES = {
  tech: 315,
  engine: 400,
  intro: 190,
  q1: 250,
  q2: 295,
  q3: 240,
  answer: 460,
  nogen: 130, // 一般論は、一行もない。
  mintro: 440, // 例えば、マーケティング。＋断言
  mq1: 180,
  mq2: 195,
  mq3: 180,
  mscope: 520, // 診断範囲→優先順位→ロードマップ
  mreveal: 200, // アドターン for マーケティング リビール
  finale: 780, // 2プロダクト→デジブレ転写→貴社専用カスタマイズ→デジブレ
};

export const V3D_TOTAL_FRAMES = Object.values(V3D_SCENES).reduce((a, b) => a + b, 0);

export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);
