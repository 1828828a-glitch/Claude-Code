import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';

// 漂う塵・火の粉。seed固定で決定論的に動く。
export const Particles: React.FC<{
  count?: number;
  color?: string;
  maxSize?: number;
  opacity?: number;
  // 上昇速度(px/frame)。負にすると下降。
  rise?: number;
  seed?: string;
}> = ({ count = 24, color = '#FFFFFF', maxSize = 7, opacity = 0.5, rise = 0.7, seed = 'dust' }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        const r1 = random(`${seed}-x-${i}`);
        const r2 = random(`${seed}-y-${i}`);
        const r3 = random(`${seed}-s-${i}`);
        const r4 = random(`${seed}-p-${i}`);
        const size = 2 + r3 * maxSize;
        const drift = Math.sin((frame / 60 + r4 * 10) * Math.PI) * 30 * (0.3 + r3);
        const y = (((r2 * height - frame * rise * (0.4 + r3)) % height) + height) % height;
        const flicker = 0.5 + 0.5 * Math.sin((frame / 20 + r4 * 6) * Math.PI);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r1 * width + drift,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: opacity * (0.25 + 0.75 * flicker) * (0.4 + 0.6 * r3),
              filter: `blur(${size > 5 ? 2 : 1}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
