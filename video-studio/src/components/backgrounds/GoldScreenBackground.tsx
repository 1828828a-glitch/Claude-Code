import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Vignette } from '../atoms/Vignette';
import { Particles } from '../atoms/Particles';

// 金屏風背景。縦のパネル分割+金のグラデ+雲霞パターン+光のスイープ。
export const GoldScreenBackground: React.FC<{ panels?: number }> = ({ panels = 6 }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();
  const panelW = width / panels;
  // 光のスイープが左から右へゆっくり流れる
  const sweepX = interpolate(frame, [0, Math.max(durationInFrames, 90)], [-500, width + 500]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#8A6A1F' }}>
      {/* 金地のベースグラデ */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 42%, #E5C568 0%, #CFA83F 45%, #A47E22 80%, #7C5D15 100%)',
        }}
      />
      {/* 金箔のムラ */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <filter id="gold-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="11" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.03  0 0 0 0.10 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#gold-noise)" />
        {/* 雲霞(うんか)模様 */}
        <filter id="gold-cloud">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.015" numOctaves="3" seed="5" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.95  0 0 0 0 0.82  0 0 0 0 0.45  0 0 0 0.12 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#gold-cloud)" />
      </svg>
      {/* 屏風の折り目(パネル境界の陰影) */}
      {Array.from({ length: panels - 1 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: panelW * (i + 1) - 2,
            width: 4,
            background:
              i % 2 === 0
                ? 'linear-gradient(90deg, transparent, rgba(60,40,0,0.45), rgba(255,235,170,0.25), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,235,170,0.25), rgba(60,40,0,0.45), transparent)',
          }}
        />
      ))}
      {/* パネルごとの明暗(折れによる受光差) */}
      {Array.from({ length: panels }).map((_, i) => (
        <div
          key={`p-${i}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: panelW * i,
            width: panelW,
            background:
              i % 2 === 0
                ? 'linear-gradient(90deg, rgba(80,55,5,0.12), transparent 55%)'
                : 'linear-gradient(270deg, rgba(80,55,5,0.12), transparent 55%)',
          }}
        />
      ))}
      {/* 光のスイープ */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          bottom: -200,
          left: sweepX,
          width: 420,
          background:
            'linear-gradient(100deg, transparent, rgba(255,244,200,0.28) 50%, transparent)',
          transform: 'skewX(-12deg)',
        }}
      />
      <Particles count={20} color="#FFE9A8" opacity={0.55} maxSize={6} seed="gold" />
      <Vignette strength={0.5} color="40,24,0" />
    </AbsoluteFill>
  );
};
