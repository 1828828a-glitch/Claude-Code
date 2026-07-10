import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, Pill, useRise} from '../helpers';

// S1 技術宣言（10s）: ダーク背景に巨大タイポ「脳を、AIに転写する。」＋世界初・特許出願中
export const Scene1Tech: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  const line1 = useRise(12, 80);
  const line2 = useRise(28, 80);
  const badge = useRise(120, 40);

  // Pulsing gradient ring behind the type
  const pulse = 1 + Math.sin(frame / 14) * 0.04;
  const ringIn = spring({frame: frame - 4, fps, config: {damping: 20, stiffness: 60}});

  // White circular wipe at the end (frames 264-300)
  const wipe = interpolate(frame, [264, 298], [0, Math.hypot(width, height) / 2 + 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: COLORS.ink, fontFamily: FONT, overflow: 'hidden'}}>
      {/* faint grid for depth */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      {/* gradient ring (デジブレの象徴) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 780,
          height: 780,
          transform: `translate(-50%, -50%) scale(${ringIn * pulse})`,
          borderRadius: '50%',
          border: '44px solid transparent',
          background: `linear-gradient(${COLORS.ink}, ${COLORS.ink}) padding-box, ${GRADIENT} border-box`,
          opacity: 0.55,
          filter: 'blur(1px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1100,
          height: 1100,
          transform: `translate(-50%, -50%) scale(${ringIn * pulse})`,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(67,83,255,0.25) 0%, rgba(139,92,246,0.12) 45%, transparent 70%)',
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          textAlign: 'center',
        }}
      >
        <div style={{fontSize: 74, fontWeight: 700, color: 'rgba(255,255,255,0.85)', ...line1}}>
          トップパフォーマーの
        </div>
        <div style={{height: 18}} />
        <div style={{fontSize: 148, fontWeight: 900, color: COLORS.white, lineHeight: 1.2, ...line2}}>
          脳を、<GradientText>AIに転写</GradientText>する。
        </div>
        <div style={{height: 70}} />
        <div style={{display: 'flex', gap: 32, ...badge}}>
          <Pill delay={120} dark>
            オリジナルAIエンジン「デジブレ」
          </Pill>
          <Pill delay={132} dark style={{borderColor: 'transparent', background: GRADIENT, color: COLORS.white}}>
            世界初 ｜ 特許出願中
          </Pill>
        </div>
      </AbsoluteFill>
      {/* white circle wipe → S2 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: wipe * 2,
          height: wipe * 2,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: COLORS.white,
        }}
      />
    </AbsoluteFill>
  );
};
