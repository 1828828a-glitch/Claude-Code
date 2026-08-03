import React from 'react';
import { AbsoluteFill } from 'remotion';

// 四隅を落として画面を締める。strength 0〜1。
export const Vignette: React.FC<{ strength?: number; color?: string }> = ({
  strength = 0.35,
  color = '0,0,0',
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse 75% 65% at 50% 46%, transparent 55%, rgba(${color},${strength}) 100%)`,
    }}
  />
);
