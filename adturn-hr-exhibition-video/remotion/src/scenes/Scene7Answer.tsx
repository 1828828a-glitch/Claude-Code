import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, usePop, useRise} from '../helpers';
import {DrawCheck, Particles, RadialBurst, TiltIn} from '../fx';

const QUESTIONS = ['Q1 ポジション', 'Q2 無自覚の魅力', 'Q3 クロージング'];
const DELIVERABLES = [
  {n: '01', t: '市場ポジションの設計'},
  {n: '02', t: '眠れる魅力の発掘'},
  {n: '03', t: '狙うべき人材の特定'},
  {n: '04', t: '面接トークスクリプト'},
];

// S7 答えの存在証明（15.3s）: チェック描画 → ロゴ後光リビール → 3D納品物カード
export const Scene7Answer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const beat1Out = interpolate(frame, [92, 108], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headAnim = useRise(4, 40);

  const logoIn = spring({frame: frame - 112, fps, config: {damping: 15, stiffness: 90, mass: 1}});
  const subAnim = useRise(140, 40);

  const checkPops = QUESTIONS.map((_, i) => usePop(24 + i * 16));

  return (
    <AbsoluteFill style={{background: COLORS.white, fontFamily: FONT, overflow: 'hidden'}}>
      {/* 光のウォッシュ背景＋浮遊オーブで奥行きを出す */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 1400px 900px at 50% 30%, rgba(139,92,246,0.10) 0%, rgba(67,83,255,0.04) 45%, transparent 75%)',
        }}
      />
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: i === 0 ? -180 + Math.sin(frame / 70) * 30 : 1500 + Math.cos(frame / 80) * 40,
            top: i === 0 ? 620 + Math.cos(frame / 60) * 40 : -140 + Math.sin(frame / 75) * 30,
            width: 560,
            height: 560,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${i === 0 ? '67,83,255' : '139,92,246'},0.16) 0%, transparent 70%)`,
            filter: 'blur(10px)',
          }}
        />
      ))}
      <Particles count={20} seed="s7" color="rgba(139,92,246,0.16)" maxSize={8} />
      {/* Beat 1: 3つの問いへのチェック */}
      {frame < 110 && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            opacity: beat1Out,
          }}
        >
          <div style={{fontSize: 84, fontWeight: 900, color: COLORS.ink, ...headAnim}}>
            そのすべての「答え」を、出力する。
          </div>
          <div style={{height: 70}} />
          <div style={{display: 'flex', gap: 44}}>
            {QUESTIONS.map((q, i) => (
              <div
                key={q}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '26px 44px',
                  borderRadius: 999,
                  background: COLORS.offWhite,
                  border: '2px solid #E5E7EB',
                  fontSize: 38,
                  fontWeight: 700,
                  color: COLORS.inkSoft,
                  ...checkPops[i],
                }}
              >
                <DrawCheck delay={30 + i * 16} />
                {q}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* Beat 2: ロゴリビール＋納品物 */}
      {frame >= 105 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <RadialBurst delay={112} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 36,
              transform: `scale(${logoIn})`,
              opacity: frame < 112 ? 0 : 1,
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                border: '26px solid transparent',
                background: `linear-gradient(${COLORS.white}, ${COLORS.white}) padding-box, ${GRADIENT} border-box`,
                transform: `rotate(${frame * 1.2}deg)`,
                boxShadow: '0 18px 60px rgba(67,83,255,0.35)',
              }}
            />
            <div style={{display: 'flex', alignItems: 'baseline', fontSize: 150, fontWeight: 900, letterSpacing: '0.01em'}}>
              <span style={{color: COLORS.ink}}>ADTURN</span>
              <span style={{width: 40}} />
              <GradientText>for HR</GradientText>
            </div>
          </div>
          <div style={{height: 34}} />
          <div style={{fontSize: 44, fontWeight: 700, color: COLORS.inkSoft, ...subAnim}}>
            人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
          </div>
          <div style={{height: 70}} />
          <div style={{display: 'flex', gap: 36}}>
            {DELIVERABLES.map((d, i) => (
              <TiltIn key={d.n} delay={168 + i * 12} dir={i < 2 ? -1 : 1}>
                <div
                  style={{
                    width: 380,
                    padding: '40px 36px',
                    borderRadius: 28,
                    background: COLORS.white,
                    border: '2px solid #E9EBF5',
                    boxShadow: '0 20px 60px rgba(11,16,32,0.08)',
                  }}
                >
                  <GradientText style={{fontSize: 54, fontWeight: 900}}>{d.n}</GradientText>
                  <div style={{height: 14}} />
                  <div style={{fontSize: 37, fontWeight: 700, color: COLORS.ink, lineHeight: 1.4}}>
                    {d.t}
                  </div>
                </div>
              </TiltIn>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
