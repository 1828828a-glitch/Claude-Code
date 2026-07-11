import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, usePop, useRise} from '../helpers';
import {DrawCheck, Particles, RadialBurst, ReportDoc, TiltIn} from '../fx';

const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
const REPORTS = [
  {t: 'ポジショニング\nマップ', rot: -8},
  {t: '無自覚資産の\n発掘', rot: -3},
  {t: 'ターゲット\nペルソナ', rot: 3},
  {t: 'トーク\nスクリプト', rot: 8},
];

// S7 答えの存在証明（15.3s）
// Beat 1: 「4つの問い、すべてに答えを。」チェックカード / Beat 2: ロゴ→扇状レポートカード
export const Scene7Answer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const beat1Out = interpolate(frame, [92, 108], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headAnim = useRise(4, 40);

  const logoIn = spring({frame: frame - 112, fps, config: {damping: 15, stiffness: 90, mass: 1}});
  const subAnim = useRise(140, 30);
  const lineAnim = useRise(228, 30);

  const checkPops = QUESTIONS.map((_, i) => usePop(20 + i * 13));

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

      {/* Beat 1: 4つの問いにチェック */}
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
            4つの問い、<GradientText>すべてに答え</GradientText>を。
          </div>
          <div style={{height: 70}} />
          <div style={{display: 'flex', gap: 40}}>
            {QUESTIONS.map((q, i) => (
              <div
                key={q}
                style={{
                  position: 'relative',
                  padding: '46px 44px',
                  borderRadius: 22,
                  background: COLORS.white,
                  border: '3px solid #23283C',
                  fontSize: 36,
                  fontWeight: 700,
                  color: COLORS.ink,
                  boxShadow: '0 16px 44px rgba(11,16,32,0.10)',
                  ...checkPops[i],
                }}
              >
                {q}
                <div style={{position: 'absolute', top: -22, right: -22}}>
                  <DrawCheck delay={28 + i * 13} size={52} />
                </div>
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* Beat 2: ロゴリビール → 扇状レポートカード */}
      {frame >= 105 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <RadialBurst delay={112} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 30,
              transform: `scale(${Math.min(logoIn, 1.04)})`,
              opacity: frame < 112 ? 0 : 1,
            }}
          >
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: '50%',
                border: '19px solid transparent',
                background: `linear-gradient(${COLORS.white}, ${COLORS.white}) padding-box, ${GRADIENT} border-box`,
                transform: `rotate(${frame * 1.2}deg)`,
                boxShadow: '0 14px 44px rgba(67,83,255,0.35)',
              }}
            />
            <div style={{display: 'flex', alignItems: 'baseline', fontSize: 104, fontWeight: 900, letterSpacing: '0.01em'}}>
              <span style={{color: COLORS.ink}}>ADTURN</span>
              <span style={{width: 28}} />
              <GradientText>for HR</GradientText>
            </div>
          </div>
          <div style={{height: 20}} />
          <div style={{fontSize: 38, fontWeight: 700, color: COLORS.inkSoft, ...subAnim}}>
            人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
          </div>
          <div style={{height: 48}} />
          {/* 扇状に並ぶレポートカード */}
          <div style={{display: 'flex', alignItems: 'flex-start'}}>
            {REPORTS.map((r, i) => (
              <div
                key={r.t}
                style={{
                  transform: `rotate(${r.rot}deg) translateY(${Math.abs(r.rot) * 4 + Math.sin(frame / 26 + i * 1.4) * 5}px)`,
                  margin: '0 -6px',
                  zIndex: i,
                }}
              >
                <ReportDoc
                  delay={166 + i * 11}
                  width={300}
                  height={330}
                  title={r.t}
                  lineCount={5}
                  seed={`rep${i}`}
                  fontSize={30}
                />
              </div>
            ))}
          </div>
          <div style={{height: 42}} />
          <div
            style={{
              fontSize: 33,
              fontWeight: 700,
              color: COLORS.greyDark,
              display: 'flex',
              gap: 22,
              ...lineAnim,
            }}
          >
            <span>市場ポジションの設計</span>
            <span style={{color: COLORS.grey}}>/</span>
            <span>眠れる魅力の発掘</span>
            <span style={{color: COLORS.grey}}>/</span>
            <span>狙うべき人材の特定</span>
            <span style={{color: COLORS.grey}}>/</span>
            <span>面接で使うトークスクリプト</span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
