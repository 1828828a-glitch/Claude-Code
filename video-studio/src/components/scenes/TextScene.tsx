import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { textScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { DarkBackground } from '../backgrounds/DarkBackground';
import { COLORS, SAFE } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress } from '../../lib/timing';
import { AccentUnderline } from '../atoms/AccentUnderline';
import { Subtitle } from '../atoms/Subtitle';
import { RichText } from '../atoms/RichText';

// 1メッセージのテキスト画面。
// question: 和紙+朱下線 / impact: 闇+光る文字 / plain: 素直な提示
export const TextScene: React.FC<z.infer<typeof textScene>> = ({
  text,
  variant,
  cornerTag,
  embers,
  narration,
}) => {
  const frame = useCurrentFrame();
  const dark = variant === 'impact';
  // \n で明示改行できる。文字送りは行をまたいで連続する。
  const lines = text.split('\n');
  const totalChars = text.replace(/\n/g, '').length;
  const tagP = progress(frame, 2, 12);

  return (
    <AbsoluteFill>
      {dark ? <DarkBackground embers={embers} glow="rgba(140,60,30,0.22)" /> : <WashiBackground />}
      {/* 左上のタイムスタンプ札 */}
      {cornerTag ? (
        <div
          style={{
            position: 'absolute',
            top: SAFE - 30,
            left: SAFE,
            fontFamily: FONT_SANS,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: '0.12em',
            color: dark ? COLORS.lightOnDark : COLORS.paper,
            backgroundColor: dark ? 'rgba(20,16,12,0.85)' : COLORS.ink,
            borderLeft: `8px solid ${COLORS.crimson}`,
            padding: '8px 24px',
            opacity: tagP,
            transform: `translateX(${(1 - tagP) * -30}px)`,
          }}
        >
          {cornerTag}
        </div>
      ) : null}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: variant === 'plain' ? 88 : 108,
            letterSpacing: '0.08em',
            lineHeight: 1.5,
            textAlign: 'center',
            maxWidth: 1600,
            color: dark ? '#F6ECD8' : COLORS.ink,
            textShadow: dark
              ? '0 0 30px rgba(220,80,50,0.55), 0 0 90px rgba(200,60,40,0.35), 0 4px 16px rgba(0,0,0,0.8)'
              : '0 3px 0 rgba(80,60,30,0.12)',
          }}
        >
          {/* 一文字ずつ現れる */}
          {lines.map((line, li) => {
            const offset = lines.slice(0, li).reduce((a, l) => a + l.length, 0);
            return (
              <div key={li}>
                {line.split('').map((c, i) => {
                  const p = progress(frame, 6 + (offset + i) * 2.2, 14);
                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        opacity: p,
                        transform: `translateY(${(1 - p) * 26}px)`,
                        whiteSpace: 'pre',
                      }}
                    >
                      {c}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        {variant === 'question' ? (
          <AccentUnderline width={520} delay={10 + totalChars * 2.2} thickness={8} />
        ) : null}
      </AbsoluteFill>
      {/* questionは紙面と分離するためチップ型字幕(黒地)を使う */}
      {narration ? (
        <Subtitle text={narration} mood={dark || variant === 'question' ? 'dark' : 'light'} />
      ) : null}
    </AbsoluteFill>
  );
};
