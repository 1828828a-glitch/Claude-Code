import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, useRise} from '../helpers';

const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];

// S2 技術の中身（10s）: 約40名カウントアップ → 「レシピではなく、料理そのものを出力」
export const Scene2Engine: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Beat 1: 0-165 counter + orbit / Beat 2: 165-300 recipe comparison
  const beat1Opacity = interpolate(frame, [150, 168], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const count = Math.round(
    interpolate(frame, [15, 80], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
  );

  const headAnim = useRise(6, 50);
  const orbitIn = spring({frame: frame - 10, fps, config: {damping: 200}});

  const b2Head = useRise(172, 60);
  const b2Left = useRise(190, 50);
  const b2Right = useRise(202, 50);

  return (
    <AbsoluteFill style={{background: COLORS.white, fontFamily: FONT, overflow: 'hidden'}}>
      {/* Beat 1 */}
      <AbsoluteFill style={{opacity: beat1Opacity}}>
        <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 140px'}}>
          <div style={{flex: 1.1}}>
            <div style={{fontSize: 56, fontWeight: 700, color: COLORS.inkSoft, ...headAnim}}>
              各領域のトップパフォーマー
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
              <span style={{fontSize: 100, fontWeight: 900, color: COLORS.ink}}>約</span>
              <GradientText style={{fontSize: 300, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums'}}>
                {count}
              </GradientText>
              <span style={{fontSize: 100, fontWeight: 900, color: COLORS.ink}}>名</span>
            </div>
            <div style={{fontSize: 74, fontWeight: 900, color: COLORS.ink, ...useRise(30, 40)}}>
              の脳を、<GradientText>コピー済み。</GradientText>
            </div>
            <div style={{height: 30}} />
            <div style={{fontSize: 34, color: COLORS.greyDark, fontWeight: 500, ...useRise(50, 30)}}>
              脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。
            </div>
          </div>
          {/* Orbiting domain labels around gradient circle */}
          <div style={{flex: 1, position: 'relative', height: '100%'}}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 300,
                height: 300,
                transform: `translate(-50%, -50%) scale(${orbitIn})`,
                borderRadius: '50%',
                border: '54px solid transparent',
                background: `linear-gradient(${COLORS.white}, ${COLORS.white}) padding-box, ${GRADIENT} border-box`,
              }}
            />
            {DOMAINS.map((d, i) => {
              const angle = (i / DOMAINS.length) * Math.PI * 2 + frame / 220;
              const rx = 360;
              const ry = 300;
              const x = Math.cos(angle) * rx;
              const y = Math.sin(angle) * ry;
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

      {/* Beat 2: レシピではなく料理そのもの */}
      {frame >= 165 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <div style={{fontSize: 96, fontWeight: 900, color: COLORS.ink, ...b2Head}}>
            レシピではなく、<GradientText>料理そのもの</GradientText>を出力。
          </div>
          <div style={{height: 70}} />
          <div style={{display: 'flex', gap: 60}}>
            <div
              style={{
                width: 640,
                padding: '50px 54px',
                borderRadius: 32,
                background: COLORS.offWhite,
                border: '2px solid #E5E7EB',
                ...b2Left,
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
                {/* grey triangle */}
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
            <div
              style={{
                width: 700,
                padding: '50px 54px',
                borderRadius: 32,
                background: `linear-gradient(${COLORS.white}, ${COLORS.white}) padding-box, ${GRADIENT} border-box`,
                border: '3px solid transparent',
                boxShadow: '0 24px 70px rgba(67,83,255,0.18)',
                ...b2Right,
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
                {/* gradient circle */}
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
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
