import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { stepsScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { COLORS, SAFE } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress, fadeUp } from '../../lib/timing';
import { Subtitle } from '../atoms/Subtitle';

// 番号付き縦ステップ。上から順に積み上がる。
export const StepsScene: React.FC<z.infer<typeof stepsScene>> = ({
  heading,
  items,
  narration,
}) => {
  const frame = useCurrentFrame();
  const headAnim = fadeUp(frame, 2, 14, 24);
  const per = 8;
  const teal = '#2E6E6A';
  const rowH = Math.min(100, 580 / items.length + 6);
  return (
    <AbsoluteFill>
      <WashiBackground />
      {heading ? (
        <div
          style={{
            position: 'absolute',
            top: SAFE - 26,
            left: SAFE,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 62,
            letterSpacing: '0.08em',
            color: COLORS.ink,
            ...headAnim,
          }}
        >
          {heading}
          <div
            style={{
              marginTop: 12,
              width: 340,
              height: 6,
              backgroundColor: COLORS.crimson,
              borderRadius: 3,
              transform: `scaleX(${progress(frame, 12, 14)})`,
              transformOrigin: 'left center',
            }}
          />
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: 228,
          left: SAFE + 60,
          right: SAFE,
          display: 'flex',
          flexDirection: 'column',
          gap: Math.max(8, (660 - rowH * items.length) / items.length),
        }}
      >
        {items.map((it, i) => {
          const p = progress(frame, 10 + i * per, 12);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 30,
                height: rowH,
                opacity: p,
                transform: `translateY(${(1 - p) * 40}px)`,
              }}
            >
              {/* 番号 */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: teal,
                  color: '#F6F1E2',
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 0 rgba(30,50,45,0.3)',
                }}
              >
                {i + 1}
              </div>
              {/* タイトル */}
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 46,
                  letterSpacing: '0.08em',
                  color: COLORS.ink,
                  width: 400,
                  flexShrink: 0,
                }}
              >
                {it.title}
              </div>
              {/* 説明 */}
              {it.desc ? (
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 500,
                    fontSize: 30,
                    letterSpacing: '0.04em',
                    lineHeight: 1.4,
                    color: COLORS.inkSoft,
                    borderLeft: `4px solid ${COLORS.gold}`,
                    paddingLeft: 24,
                  }}
                >
                  {it.desc}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {narration ? <Subtitle text={narration} mood="light" /> : null}
    </AbsoluteFill>
  );
};
