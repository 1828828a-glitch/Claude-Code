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

// Scene durations in frames (total 2985 ≈ 99.5s @30fps, paced to natural-rate narration)
export const SCENES = {
  tech: 315, // S1 技術宣言 10.5s
  engine: 400, // S2 技術の中身 13.3s
  voice: 395, // S2.5 現場の声→それ解決できます 13.2s
  intro: 190, // S3 問いの宣言 6.3s
  q1: 250, // S4 Q1 8.3s
  q2: 295, // S5 Q2 9.8s
  q3: 240, // S6 Q3 8s
  answer: 460, // S7 答え 15.3s
  cta: 440, // S8 CTA 14.7s
};

export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);
