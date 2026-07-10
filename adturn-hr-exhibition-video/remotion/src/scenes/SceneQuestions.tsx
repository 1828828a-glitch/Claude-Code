import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, GRADIENT} from '../theme';
import {GradientText, QuestionScene, useRise} from '../helpers';

// S4 Q1（8s）: ポジション×ターゲット統合版
export const Scene4Q1: React.FC = () => (
  <QuestionScene
    num="Q1"
    tag="POSITION"
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

const BURIED_WORDS = [
  {w: '定着率', x: 1300, y: 200, d: 0},
  {w: '技術力', x: 1560, y: 420, d: 14},
  {w: '歴史', x: 1240, y: 640, d: 28},
  {w: '福利厚生', x: 1520, y: 840, d: 42},
  {w: '外部評価', x: 1310, y: 980, d: 56},
];

// S5 Q2（9s）: 無自覚の魅力 + キラーフレーズ
export const Scene5Q2: React.FC = () => {
  const frame = useCurrentFrame();
  const killer = useRise(170, 50);
  return (
    <QuestionScene
      num="Q2"
      tag="HIDDEN ASSETS"
      lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
      sub="社内では当たり前すぎて、誰も武器だと気づいていない事実。"
      background={
        <AbsoluteFill>
          {BURIED_WORDS.map(({w, x, y, d}) => {
            const o = interpolate(frame, [20 + d, 50 + d, 130 + d, 170 + d], [0, 0.06, 0.06, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={w}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y - frame * 0.25,
                  fontSize: 84,
                  fontWeight: 900,
                  color: COLORS.ink,
                  opacity: o,
                }}
              >
                {w}
              </div>
            );
          })}
        </AbsoluteFill>
      }
      extra={
        <div
          style={{
            marginTop: 56,
            padding: '30px 56px',
            borderRadius: 24,
            background: 'rgba(67,83,255,0.06)',
            fontSize: 58,
            fontWeight: 900,
            color: COLORS.ink,
            ...killer,
          }}
        >
          魅力の<span style={{color: COLORS.grey}}>不足</span>ではなく、
          <GradientText>翻訳の不足。</GradientText>
        </div>
      }
    />
  );
};

// S6 Q3（7s）: クロージング
export const Scene6Q3: React.FC = () => (
  <QuestionScene
    num="Q3"
    tag="CLOSING"
    lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
    sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
  />
);

// Progress dots shared across question scenes (rendered in Video.tsx overlay)
export const QuestionProgress: React.FC<{active: number}> = ({active}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 70,
      left: 160,
      display: 'flex',
      gap: 20,
      alignItems: 'center',
    }}
  >
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          width: i === active ? 64 : 20,
          height: 20,
          borderRadius: 999,
          background: i === active ? GRADIENT : '#E5E7EB',
        }}
      />
    ))}
  </div>
);
