import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { formulaScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { COLORS } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress, fadeUp } from '../../lib/timing';
import { Subtitle } from '../atoms/Subtitle';

// 「A + B + C」式の型の提示。トークンが1つずつ弾んで現れる。
export const FormulaScene: React.FC<z.infer<typeof formulaScene>> = ({
  heading,
  tokens,
  separator,
  caption,
  narration,
}) => {
  const frame = useCurrentFrame();
  const headAnim = fadeUp(frame, 2, 14, 22);
  const per = 9; // トークンの出現間隔(フレーム)

  // 文字数に応じてフォントサイズを自動調整(はみ出し防止)
  const totalChars = tokens.reduce((a, t) => a + t.length, 0);
  const sepSpace = (tokens.length - 1) * 90;
  const fontSize = Math.max(38, Math.min(76, (1700 - sepSpace - tokens.length * 56) / totalChars));

  const capAnim = fadeUp(frame, 10 + tokens.length * per + 8, 14, 18);

  return (
    <AbsoluteFill>
      <WashiBackground />
      {heading ? (
        <div
          style={{
            position: 'absolute',
            top: '17%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT_SANS,
            fontWeight: 700,
            fontSize: 46,
            letterSpacing: '0.14em',
            color: COLORS.inkSoft,
            ...headAnim,
          }}
        >
          {heading}
        </div>
      ) : null}
      {/* 型本体 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          padding: '0 60px',
        }}
      >
        {tokens.map((t, i) => {
          const p = progress(frame, 10 + i * per, 12);
          const sepP = progress(frame, 10 + i * per - 4, 10);
          return (
            <React.Fragment key={i}>
              {i > 0 ? (
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    fontSize: fontSize * 0.85,
                    color: COLORS.crimson,
                    opacity: sepP,
                    transform: `scale(${0.5 + 0.5 * sepP})`,
                  }}
                >
                  {separator}
                </span>
              ) : null}
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize,
                  letterSpacing: '0.04em',
                  color: COLORS.ink,
                  backgroundColor: 'rgba(255,252,240,0.75)',
                  border: `3.5px solid ${COLORS.ink}`,
                  borderRadius: 18,
                  padding: '14px 26px',
                  boxShadow: '0 6px 0 rgba(50,38,20,0.18)',
                  display: 'inline-block',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 60}px) scale(${0.85 + 0.15 * p})`,
                }}
              >
                {t}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {caption ? (
        <div
          style={{
            position: 'absolute',
            top: '68%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 50,
            letterSpacing: '0.1em',
            color: COLORS.crimson,
            ...capAnim,
          }}
        >
          {caption}
        </div>
      ) : null}
      {narration ? <Subtitle text={narration} mood="light" /> : null}
    </AbsoluteFill>
  );
};
