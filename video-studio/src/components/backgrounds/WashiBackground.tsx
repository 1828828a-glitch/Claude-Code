import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../../theme';
import { Vignette } from '../atoms/Vignette';
import { Particles } from '../atoms/Particles';

// 生成りの和紙背景。紙の粒状ノイズ+薄い罫線+ビネット。
export const WashiBackground: React.FC<{ dust?: boolean }> = ({ dust = true }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
    {/* 紙の繊維ノイズ */}
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <filter id="washi-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.30  0 0 0 0 0.25  0 0 0 0 0.17  0 0 0 0.055 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#washi-noise)" />
      {/* 大きめの色ムラ */}
      <filter id="washi-blotch">
        <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="2" seed="3" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.32  0 0 0 0.06 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#washi-blotch)" />
    </svg>
    {/* 薄い横罫線(帳面風) */}
    <AbsoluteFill
      style={{
        background:
          'repeating-linear-gradient(180deg, transparent 0px, transparent 53px, rgba(60,45,25,0.05) 53px, rgba(60,45,25,0.05) 54px)',
      }}
    />
    {dust ? <Particles count={16} color="#FFF8E8" opacity={0.5} maxSize={5} seed="washi" /> : null}
    <Vignette strength={0.22} color="55,40,20" />
  </AbsoluteFill>
);
