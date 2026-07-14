import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, useRise} from '../helpers';
import {KineticChars, Particles, ReportDoc} from '../fx';

// S9 CTA（12.7s）: もう出せます → エンドカード（「一般論は一行もない」はSceneNoGenへ分離）
// Beat 2: 0-225 もう出せます / Beat 3: 225-380 エンドカード
export const Scene8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const b2SubIn = useRise(58, 30);
  const b2Out = interpolate(frame, [209, 223], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = spring({frame: frame - 229, fps, config: {damping: 18, stiffness: 70}});
  const pulse = 1 + Math.sin(frame / 12) * 0.05;
  const b3Text = useRise(243, 40);
  const b3Cta = useRise(259, 30);
  const ctaPulse = 1 + Math.sin(frame / 10) * 0.03;

  // パーティクルがエンドカードに向かって中心に収束していく
  const pull = interpolate(frame, [130, 300], [0, 0.72], {
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
      <Particles count={55} seed="s8" color="rgba(139,92,246,0.55)" pull={pull} />
      {/* Beat 2 */}
      {frame < 225 && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            opacity: b2Out,
          }}
        >
          <KineticChars
            text="貴社の「答え」は、もう出せます。"
            delay={12}
            stagger={2.2}
            gradientRange={[9, 14]}
            style={{fontSize: 112, fontWeight: 900, color: COLORS.white}}
          />
          <div style={{height: 40}} />
          <div style={{fontSize: 48, fontWeight: 700, color: 'rgba(255,255,255,0.75)', ...b2SubIn}}>
            トップパフォーマーの脳を、あなたの武器に。
          </div>
        </AbsoluteFill>
      )}
      {/* Beat 3: エンドカード */}
      {frame >= 225 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <div
            style={{
              position: 'absolute',
              width: 900,
              height: 900,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(67,83,255,0.30) 0%, rgba(139,92,246,0.14) 45%, transparent 70%)',
              transform: `scale(${glow * pulse})`,
            }}
          />
          {/* リングの周りを回る衛星ドット */}
          {[0, 1, 2].map((i) => {
            const a = frame / 20 + (i * Math.PI * 2) / 3;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 'calc(50% - 205px)',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#B9AFFF',
                  opacity: glow * 0.9,
                  transform: `translate(calc(-50% + ${Math.cos(a) * 150}px), calc(-50% + ${Math.sin(a) * 150}px))`,
                  filter: 'blur(0.5px)',
                }}
              />
            );
          })}
          <div
            style={{
              width: 190,
              height: 190,
              borderRadius: '50%',
              border: '44px solid transparent',
              background: `linear-gradient(${COLORS.ink}, ${COLORS.ink}) padding-box, ${GRADIENT} border-box`,
              transform: `scale(${glow * pulse}) rotate(${frame}deg)`,
              filter: `drop-shadow(0 0 60px rgba(99,102,241,0.55))`,
            }}
          />
          <div style={{height: 56}} />
          <div style={{display: 'flex', alignItems: 'baseline', fontSize: 92, fontWeight: 900, ...b3Text}}>
            <span style={{color: COLORS.white}}>ADTURN</span>
            <span style={{width: 26}} />
            <GradientText>for HR</GradientText>
          </div>
          <div style={{height: 44}} />
          <div style={{display: 'flex', alignItems: 'center', gap: 34, ...b3Cta}}>
            <div
              style={{
                padding: '20px 52px',
                borderRadius: 999,
                background: GRADIENT,
                fontSize: 42,
                fontWeight: 900,
                color: COLORS.white,
                transform: `scale(${ctaPulse})`,
                boxShadow: '0 0 50px rgba(99,102,241,0.5)',
              }}
            >
              デモ実施中
            </div>
            <div style={{fontSize: 42, fontWeight: 700, color: 'rgba(255,255,255,0.9)'}}>
              ぜひブースでご体験ください
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 64,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.6)',
              ...b3Cta,
            }}
          >
            ADTANK GP
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
