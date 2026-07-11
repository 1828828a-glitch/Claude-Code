import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT} from '../theme';
import {KineticChars, Particles, Underline} from '../fx';

// S3 問いの宣言（6.3s）: 「例えば、採用。」→「貴社は、この問いに即答できますか。」
export const Scene3Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const shiftUp = spring({frame: frame - 58, fps, config: {damping: 200}});
  const line2In = interpolate(frame, [64, 82], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const qOpacity = interpolate(frame, [46, 86], [0, 0.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const qDrift = Math.sin(frame / 45) * 24;

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
      <Particles count={16} seed="s3" color="rgba(67,83,255,0.15)" maxSize={7} />
      <div
        style={{
          position: 'absolute',
          fontSize: 1300,
          fontWeight: 900,
          color: COLORS.blue,
          opacity: qOpacity,
          lineHeight: 1,
          transform: `translateY(${qDrift}px)`,
        }}
      >
        ?
      </div>
      <div
        style={{
          textAlign: 'center',
          transform: `translateY(${-shiftUp * 90}px) scale(${1 - shiftUp * 0.22})`,
        }}
      >
        <KineticChars
          text="例えば、採用。"
          delay={8}
          stagger={3.2}
          gradientRange={[4, 5]}
          style={{fontSize: 170, fontWeight: 900, color: COLORS.ink, justifyContent: 'center'}}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: '58%',
          textAlign: 'center',
          opacity: line2In,
          transform: `translateY(${(1 - line2In) * 40}px)`,
        }}
      >
        <div style={{fontSize: 66, fontWeight: 700, color: COLORS.inkSoft}}>
          貴社は、この問いに、即答できますか。
        </div>
        <div style={{height: 24, display: 'flex', justifyContent: 'center'}}>
          <Underline delay={84} width={520} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
