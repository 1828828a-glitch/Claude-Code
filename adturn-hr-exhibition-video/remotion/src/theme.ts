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

// Scene durations in frames (total 2160 = 72s @30fps)
export const SCENES = {
  tech: 300, // S1 技術宣言 10s
  engine: 300, // S2 技術の中身 10s
  intro: 180, // S3 問いの宣言 6s
  q1: 240, // S4 Q1 8s
  q2: 270, // S5 Q2 9s
  q3: 210, // S6 Q3 7s
  answer: 360, // S7 答え 12s
  cta: 300, // S8 CTA 10s
};

export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);
