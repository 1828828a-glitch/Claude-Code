import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../../theme';
import { Vignette } from '../atoms/Vignette';
import { Particles } from '../atoms/Particles';

// 闇シーン背景。墨の質感+中央の淡い光だまり+火の粉(オプション)。
export const DarkBackground: React.FC<{
  embers?: boolean;
  glow?: string; // 光だまりの色
}> = ({ embers = false, glow = 'rgba(120,90,40,0.20)' }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <filter id="dark-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="4" seed="9" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.14  0 0 0 0 0.11  0 0 0 0 0.07  0 0 0 0.5 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#dark-noise)" />
      <filter id="dark-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0.03 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#dark-grain)" />
    </svg>
    {/* 中央の光だまり */}
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 55% 45% at 50% 44%, ${glow}, transparent 70%)`,
      }}
    />
    {embers ? (
      <Particles count={26} color="#FF9A3C" opacity={0.7} maxSize={5} rise={1.1} seed="ember" />
    ) : (
      <Particles count={14} color="#D8C8A0" opacity={0.25} maxSize={4} seed="darkdust" />
    )}
    <Vignette strength={0.55} />
  </AbsoluteFill>
);
