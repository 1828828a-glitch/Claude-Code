import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT} from '../theme';
import {GradientText} from '../helpers';

// S3 問いの宣言（6s）: 「例えば、採用。」→「貴社は、この問いに即答できますか。」
export const Scene3Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const slam = spring({frame: frame - 6, fps, config: {damping: 16, stiffness: 130, mass: 0.9}});
  const shiftUp = spring({frame: frame - 80, fps, config: {damping: 200}});
  const line2In = interpolate(frame, [90, 108], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Giant faint "?" background
  const qOpacity = interpolate(frame, [70, 110], [0, 0.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.white,
        fontFamily: FONT,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          fontSize: 1300,
          fontWeight: 900,
          color: COLORS.blue,
          opacity: qOpacity,
          lineHeight: 1,
        }}
      >
        ?
      </div>
      <div style={{textAlign: 'center', transform: `translateY(${-shiftUp * 90}px)`}}>
        <div
          style={{
            fontSize: interpolate(shiftUp, [0, 1], [170, 120]),
            fontWeight: 900,
            color: COLORS.ink,
            opacity: frame < 6 ? 0 : 1,
            transform: `scale(${interpolate(slam, [0, 1], [1.6, 1])})`,
          }}
        >
          例えば、<GradientText>採用</GradientText>。
        </div>
        <div style={{height: 60}} />
        <div
          style={{
            fontSize: 66,
            fontWeight: 700,
            color: COLORS.inkSoft,
            opacity: line2In,
            transform: `translateY(${(1 - line2In) * 40}px)`,
          }}
        >
          貴社は、この問いに、即答できますか。
        </div>
      </div>
    </AbsoluteFill>
  );
};
