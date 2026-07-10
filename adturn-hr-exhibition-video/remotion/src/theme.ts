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

// Scene durations in frames (total 2485 ≈ 83s @30fps, paced to narration)
export const SCENES = {
  tech: 300, // S1 技術宣言 10s
  engine: 370, // S2 技術の中身 12.3s
  intro: 180, // S3 問いの宣言 6s
  q1: 240, // S4 Q1 8s
  q2: 270, // S5 Q2 9s
  q3: 240, // S6 Q3 8s
  answer: 455, // S7 答え 15.2s
  cta: 430, // S8 CTA 14.3s
};

export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);
