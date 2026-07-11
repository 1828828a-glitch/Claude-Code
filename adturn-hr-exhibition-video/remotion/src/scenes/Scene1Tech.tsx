import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {Pill, useRise} from '../helpers';
import {KineticChars, Particles} from '../fx';
import {HeadSplitScene} from './Head3D';

// S1 技術宣言（10.5s）: ニューラルネットが結線→巨大キネティックタイポ「脳を、AIに転写する。」
export const Scene1Tech: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  const line1 = useRise(14, 60);
  const badge = useRise(150, 40);

  const pulse = 1 + Math.sin(frame / 14) * 0.04;
  const ringIn = spring({frame: frame - 4, fps, config: {damping: 20, stiffness: 60}});

  // White circular wipe → S2
  const wipe = interpolate(frame, [281, 313], [0, Math.hypot(width, height) / 2 + 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: COLORS.ink, fontFamily: FONT, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <Particles count={40} seed="s1" color="rgba(139,92,246,0.45)" />
      {/* 3D VFX: 頭部がパカっと割れ、暗黙知の光がデジブレリングへ流れ込む */}
      <HeadSplitScene splitStart={50} splitDur={45} streamStart={75} ringAppear={65} />
      {/* タイトルの可読性を確保する下部スクリム */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(11,16,32,0.85) 0%, rgba(11,16,32,0.35) 32%, transparent 55%)',
          opacity: interpolate(frame, [150, 170], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexDirection: 'column',
          textAlign: 'center',
          paddingBottom: 90,
        }}
      >
        <div style={{fontSize: 56, fontWeight: 700, color: 'rgba(255,255,255,0.85)', ...line1}}>
          トップパフォーマーの
        </div>
        <div style={{height: 12}} />
        <KineticChars
          text="脳を、AIに転写する。"
          delay={158}
          stagger={2.2}
          gradientRange={[3, 7]}
          style={{fontSize: 120, fontWeight: 900, color: COLORS.white, lineHeight: 1.2}}
        />
        <div style={{height: 44}} />
        <div style={{display: 'flex', gap: 32, ...badge}}>
          <Pill delay={205} dark>
            オリジナルAIエンジン「デジブレ」
          </Pill>
          <Pill delay={217} dark style={{borderColor: 'transparent', background: GRADIENT, color: COLORS.white}}>
            世界初 ｜ 特許出願中
          </Pill>
        </div>
      </AbsoluteFill>
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
