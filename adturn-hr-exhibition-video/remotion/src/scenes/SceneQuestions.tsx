import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, GRADIENT} from '../theme';
import {GradientText, QuestionScene, useRise} from '../helpers';

// S4 Q1（8.3s）: ポジション×ターゲット統合版（ライト・ベースレイアウト）
export const Scene4Q1: React.FC = () => (
  <QuestionScene
    num="Q1"
    tag="POSITION"
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

const BURIED_WORDS = [
  {w: '定着率', x: 1300, y: 260, d: 0},
  {w: '技術力', x: 1560, y: 460, d: 14},
  {w: '歴史', x: 1240, y: 660, d: 28},
  {w: '福利厚生', x: 1500, y: 850, d: 42},
  {w: '外部評価', x: 1290, y: 990, d: 56},
];

// S5 Q2（9.8s）: 無自覚の魅力 — 闇の中に魅力が眠るダークシーン
export const Scene5Q2: React.FC = () => {
  const frame = useCurrentFrame();
  const killer = useRise(170, 50);
  return (
    <QuestionScene
      dark
      num="Q2"
      tag="HIDDEN ASSETS"
      lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
      sub="社内では当たり前すぎて、誰も武器だと気づいていない事実。"
      background={
        <AbsoluteFill>
          {BURIED_WORDS.map(({w, x, y, d}) => {
            // 暗闇の中で明滅しながら浮かび上がる「埋蔵資産」
            const o = interpolate(frame, [20 + d, 60 + d, 200 + d, 250 + d], [0, 0.3, 0.3, 0.05], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const glow = 0.7 + 0.3 * Math.sin(frame / 16 + d);
            return (
              <div
                key={w}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y - frame * 0.2,
                  fontSize: 80,
                  fontWeight: 900,
                  color: '#B9AFFF',
                  opacity: o * glow,
                  textShadow: '0 0 40px rgba(139,92,246,0.9)',
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
            background: 'rgba(139,92,246,0.14)',
            border: '2px solid rgba(139,92,246,0.35)',
            fontSize: 58,
            fontWeight: 900,
            color: COLORS.white,
            boxShadow: '0 0 70px rgba(99,102,241,0.25)',
            ...killer,
          }}
        >
          魅力の<span style={{color: 'rgba(255,255,255,0.4)'}}>不足</span>ではなく、
          <GradientText>翻訳の不足。</GradientText>
        </div>
      }
    />
  );
};

// S6 Q3（8s）: クロージング — 面接の「空の吹き出し」モチーフ
export const Scene6Q3: React.FC = () => {
  const frame = useCurrentFrame();
  const bubbleIn = useRise(60, 50);
  return (
    <QuestionScene
      num="Q3"
      tag="CLOSING"
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
      background={
        <AbsoluteFill>
          {/* 右側: まだ言葉が入っていない、面接官の空の吹き出し */}
          <div
            style={{
              position: 'absolute',
              right: 150,
              top: 330,
              width: 460,
              height: 260,
              borderRadius: 48,
              borderBottomRightRadius: 10,
              border: '5px dashed rgba(67,83,255,0.4)',
              background: 'rgba(67,83,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: bubbleIn.opacity,
              transform: `${bubbleIn.transform} rotate(3deg)`,
            }}
          >
            <div style={{display: 'flex', gap: 26}}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: GRADIENT,
                    opacity: 0.35 + 0.65 * Math.max(0, Math.sin(frame / 7 - i * 1.05)),
                  }}
                />
              ))}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -58,
                right: 40,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.grey,
              }}
            >
              貴社の「一言」＝ ？
            </div>
          </div>
        </AbsoluteFill>
      }
    />
  );
};

// Progress dots shared across question scenes
export const QuestionProgress: React.FC<{active: number; dark?: boolean}> = ({active, dark}) => (
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
          background: i === active ? GRADIENT : dark ? 'rgba(255,255,255,0.22)' : '#E5E7EB',
        }}
      />
    ))}
  </div>
);
