import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS } from '../../theme';
import { progress } from '../../lib/timing';

// 朱色の下線が左から引かれるアニメーション。見出しの定番装飾。
export const AccentUnderline: React.FC<{
  width: number;
  delay?: number;
  thickness?: number;
  color?: string;
  align?: 'left' | 'center';
}> = ({ width, delay = 12, thickness = 6, color = COLORS.crimson, align = 'center' }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, delay, 14);
  return (
    <div
      style={{
        width,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: `scaleX(${p})`,
        transformOrigin: align === 'left' ? 'left center' : 'center center',
        boxShadow: `0 1px 3px rgba(0,0,0,0.25)`,
      }}
    />
  );
};
