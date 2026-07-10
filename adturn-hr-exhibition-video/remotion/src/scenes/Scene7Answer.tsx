import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, usePop, useRise} from '../helpers';

const QUESTIONS = ['Q1 ポジション', 'Q2 無自覚の魅力', 'Q3 クロージング'];
const DELIVERABLES = [
  {n: '01', t: '市場ポジションの設計'},
  {n: '02', t: '眠れる魅力の発掘'},
  {n: '03', t: '狙うべき人材の特定'},
  {n: '04', t: '面接トークスクリプト'},
];

// S7 答えの存在証明（12s）: チェック点灯 → ADTURN for HR 登場 → 4つの納品物
export const Scene7Answer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Beat 1: 0-105 checkmarks / Beat 2: 105-360 brand reveal
  const beat1Out = interpolate(frame, [92, 108], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headAnim = useRise(4, 40);

  const logoIn = spring({frame: frame - 112, fps, config: {damping: 15, stiffness: 90, mass: 1}});
  const subAnim = useRise(138, 40);

  // Hooks must run unconditionally on every frame — hoisted out of the conditional beats
  const checkPops = QUESTIONS.map((_, i) => usePop(26 + i * 18));
  const cardAnims = DELIVERABLES.map((_, i) => useRise(162 + i * 12, 60));

  return (
    <AbsoluteFill style={{background: COLORS.white, fontFamily: FONT, overflow: 'hidden'}}>
      {/* Beat 1 */}
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
            {QUESTIONS.map((q, i) => {
              const pop = checkPops[i];
              return (
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
                    ...pop,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: GRADIENT,
                      color: COLORS.white,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </div>
                  {q}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* Beat 2: brand + deliverables */}
      {frame >= 105 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
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
              }}
            />
            <div style={{fontSize: 150, fontWeight: 900, color: COLORS.ink, letterSpacing: '0.01em'}}>
              ADTURN <GradientText>for HR</GradientText>
            </div>
          </div>
          <div style={{height: 34}} />
          <div style={{fontSize: 44, fontWeight: 700, color: COLORS.inkSoft, ...subAnim}}>
            人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
          </div>
          <div style={{height: 70}} />
          <div style={{display: 'flex', gap: 36}}>
            {DELIVERABLES.map((d, i) => {
              const anim = cardAnims[i];
              return (
                <div
                  key={d.n}
                  style={{
                    width: 380,
                    padding: '40px 36px',
                    borderRadius: 28,
                    background: COLORS.white,
                    border: '2px solid #E9EBF5',
                    boxShadow: '0 20px 60px rgba(11,16,32,0.08)',
                    ...anim,
                  }}
                >
                  <GradientText style={{fontSize: 54, fontWeight: 900}}>{d.n}</GradientText>
                  <div style={{height: 14}} />
                  <div style={{fontSize: 37, fontWeight: 700, color: COLORS.ink, lineHeight: 1.4}}>
                    {d.t}
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
