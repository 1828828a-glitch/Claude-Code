import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, useRise} from '../helpers';
import {KineticChars, Odometer, Particles, TiltIn} from '../fx';

const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];

// S2 技術の中身（13.3s）: オドメーターで約40名 → 3Dカードで「料理そのもの」対比
export const Scene2Engine: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Beat 1: 0-240 counter + orbit / Beat 2: 240-400 recipe comparison
  const beat1Opacity = interpolate(frame, [225, 243], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const count = interpolate(frame, [15, 85], [0, 40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const headAnim = useRise(6, 50);
  const tailAnim = useRise(34, 40);
  const noteAnim = useRise(54, 30);
  const orbitIn = spring({frame: frame - 10, fps, config: {damping: 200}});

  return (
    <AbsoluteFill style={{background: COLORS.white, fontFamily: FONT, overflow: 'hidden'}}>
      <Particles count={18} seed="s2" color="rgba(67,83,255,0.18)" maxSize={7} />
      {/* Beat 1 */}
      <AbsoluteFill style={{opacity: beat1Opacity}}>
        <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 140px'}}>
          <div style={{flex: 1.1}}>
            <div style={{fontSize: 56, fontWeight: 700, color: COLORS.inkSoft, ...headAnim}}>
              各領域のトップパフォーマー
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 10}}>
              <span style={{fontSize: 100, fontWeight: 900, color: COLORS.ink}}>約</span>
              <Odometer value={count} fontSize={280} gradient />
              <span style={{fontSize: 100, fontWeight: 900, color: COLORS.ink}}>名</span>
            </div>
            <div style={{fontSize: 74, fontWeight: 900, color: COLORS.ink, ...tailAnim}}>
              の脳を、<GradientText>コピー済み。</GradientText>
            </div>
            <div style={{height: 30}} />
            <div style={{fontSize: 34, color: COLORS.greyDark, fontWeight: 500, ...noteAnim}}>
              脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。
            </div>
          </div>
          {/* 中心のデジブレ円＋周回ラベル */}
          <div style={{flex: 1, position: 'relative', height: '100%'}}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 310,
                height: 310,
                transform: `translate(-50%, -50%) scale(${orbitIn})`,
                borderRadius: '50%',
                border: '52px solid transparent',
                background: `linear-gradient(${COLORS.white}, ${COLORS.white}) padding-box, ${GRADIENT} border-box`,
                boxShadow: '0 30px 90px rgba(67,83,255,0.25)',
              }}
            />
            {/* 破線の軌道リング（回転） */}
            <svg
              style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(${frame / 3}deg)`}}
              width={880}
              height={740}
              viewBox="0 0 880 740"
            >
              <ellipse
                cx={440}
                cy={370}
                rx={370}
                ry={305}
                fill="none"
                stroke="rgba(67,83,255,0.25)"
                strokeWidth={2.5}
                strokeDasharray="4 18"
              />
            </svg>
            {DOMAINS.map((d, i) => {
              const angle = (i / DOMAINS.length) * Math.PI * 2 + frame / 200;
              const x = Math.cos(angle) * 370;
              const y = Math.sin(angle) * 305;
              const inAnim = interpolate(frame, [20 + i * 6, 38 + i * 6], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div
                  key={d}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${inAnim})`,
                    padding: '16px 34px',
                    borderRadius: 999,
                    background: COLORS.white,
                    border: '2px solid rgba(67,83,255,0.25)',
                    boxShadow: '0 12px 40px rgba(11,16,32,0.10)',
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.inkSoft,
                    opacity: inAnim,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Beat 2: レシピではなく料理そのもの（3Dチルトカード） */}
      {frame >= 240 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <KineticChars
            text="レシピではなく、料理そのものを出力。"
            delay={247}
            stagger={1.6}
            gradientRange={[8, 13]}
            style={{fontSize: 96, fontWeight: 900, color: COLORS.ink}}
          />
          <div style={{height: 70}} />
          <div style={{display: 'flex', gap: 60}}>
            <TiltIn delay={266} dir={-1}>
              <div
                style={{
                  width: 660,
                  padding: '50px 54px',
                  borderRadius: 32,
                  background: COLORS.offWhite,
                  border: '2px solid #E5E7EB',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '26px solid transparent',
                      borderRight: '26px solid transparent',
                      borderBottom: `44px solid ${COLORS.grey}`,
                    }}
                  />
                  <span style={{fontSize: 42, fontWeight: 700, color: COLORS.grey}}>既存のAIツール</span>
                </div>
                <div style={{height: 26}} />
                <div style={{fontSize: 33, color: COLORS.greyDark, lineHeight: 1.7, fontWeight: 500}}>
                  一般的な回答を出力し、
                  <br />
                  業務を「補助」する。
                </div>
              </div>
            </TiltIn>
            <TiltIn delay={278} dir={1}>
              <div
                style={{
                  width: 700,
                  padding: '50px 54px',
                  borderRadius: 32,
                  background: `linear-gradient(${COLORS.white}, ${COLORS.white}) padding-box, ${GRADIENT} border-box`,
                  border: '3px solid transparent',
                  boxShadow: '0 24px 70px rgba(67,83,255,0.18)',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      border: '13px solid transparent',
                      background: `linear-gradient(${COLORS.white}, ${COLORS.white}) padding-box, ${GRADIENT} border-box`,
                    }}
                  />
                  <GradientText style={{fontSize: 42, fontWeight: 900}}>デジブレ</GradientText>
                </div>
                <div style={{height: 26}} />
                <div style={{fontSize: 32, color: COLORS.ink, lineHeight: 1.7, fontWeight: 700, whiteSpace: 'nowrap'}}>
                  提案書・分析・戦略「そのもの」を
                  <br />
                  トップパフォーマー品質で出力。
                </div>
              </div>
            </TiltIn>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
