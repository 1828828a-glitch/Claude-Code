import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {Pill, useRise} from '../helpers';
import {KineticChars, NeuralNet, Particles} from '../fx';

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
      <Particles count={45} seed="s1" color="rgba(139,92,246,0.5)" />
      {/* 脳内ネットワークが結線されていく */}
      <NeuralNet cx={width / 2} cy={height / 2 - 30} radius={470} drawStart={2} drawDur={70} />
      {/* デジブレの象徴＝グラデーションリング */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 760,
          height: 760,
          transform: `translate(-50%, -50%) scale(${ringIn * pulse})`,
          borderRadius: '50%',
          border: '40px solid transparent',
          background: `linear-gradient(${COLORS.ink}, ${COLORS.ink}) padding-box, ${GRADIENT} border-box`,
          opacity: 0.5,
          filter: 'blur(1px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1150,
          height: 1150,
          transform: `translate(-50%, -50%) scale(${ringIn * pulse})`,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(67,83,255,0.28) 0%, rgba(139,92,246,0.12) 45%, transparent 70%)',
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
        <div style={{fontSize: 72, fontWeight: 700, color: 'rgba(255,255,255,0.85)', ...line1}}>
          トップパフォーマーの
        </div>
        <div style={{height: 16}} />
        <KineticChars
          text="脳を、AIに転写する。"
          delay={26}
          stagger={2.6}
          gradientRange={[3, 7]}
          style={{fontSize: 150, fontWeight: 900, color: COLORS.white, lineHeight: 1.2}}
        />
        <div style={{height: 66}} />
        <div style={{display: 'flex', gap: 32, ...badge}}>
          <Pill delay={150} dark>
            オリジナルAIエンジン「デジブレ」
          </Pill>
          <Pill delay={162} dark style={{borderColor: 'transparent', background: GRADIENT, color: COLORS.white}}>
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
