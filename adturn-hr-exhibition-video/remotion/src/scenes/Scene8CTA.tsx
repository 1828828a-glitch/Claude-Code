import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, useRise} from '../helpers';

// S8 信頼の担保＋CTA（10s）: 「一般論は、一行もない。」→「貴社の答えは、もう出せます。」→ ブースへ
export const Scene8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Beat 1: 0-95 / Beat 2: 95-190 / Beat 3: 190-300
  const b1In = useRise(8, 60);
  const b1Out = interpolate(frame, [82, 96], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const b2In = useRise(100, 60);
  const b2SubIn = useRise(120, 30);
  const b2Out = interpolate(frame, [176, 190], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = spring({frame: frame - 196, fps, config: {damping: 18, stiffness: 70}});
  const pulse = 1 + Math.sin(frame / 12) * 0.05;
  const b3Text = useRise(214, 40);
  const b3Cta = useRise(232, 30);

  return (
    <AbsoluteFill style={{background: COLORS.ink, fontFamily: FONT, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      {/* Beat 1 */}
      {frame < 98 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: b1Out}}>
          <div style={{fontSize: 130, fontWeight: 900, color: COLORS.white, ...b1In}}>
            一般論は、<GradientText>一行もない。</GradientText>
          </div>
        </AbsoluteFill>
      )}
      {/* Beat 2 */}
      {frame >= 98 && frame < 192 && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            opacity: b2Out,
          }}
        >
          <div style={{fontSize: 116, fontWeight: 900, color: COLORS.white, ...b2In}}>
            貴社の「答え」は、<GradientText>もう出せます。</GradientText>
          </div>
          <div style={{height: 40}} />
          <div style={{fontSize: 48, fontWeight: 700, color: 'rgba(255,255,255,0.75)', ...b2SubIn}}>
            トップパフォーマーの脳を、あなたの武器に。
          </div>
        </AbsoluteFill>
      )}
      {/* Beat 3: final card */}
      {frame >= 192 && (
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
          <div
            style={{
              width: 190,
              height: 190,
              borderRadius: '50%',
              border: '44px solid transparent',
              background: `linear-gradient(${COLORS.ink}, ${COLORS.ink}) padding-box, ${GRADIENT} border-box`,
              transform: `scale(${glow * pulse})`,
              filter: `drop-shadow(0 0 60px rgba(99,102,241,0.55))`,
            }}
          />
          <div style={{height: 56}} />
          <div style={{fontSize: 92, fontWeight: 900, color: COLORS.white, ...b3Text}}>
            ADTURN <GradientText>for HR</GradientText>
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
