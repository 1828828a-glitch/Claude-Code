import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { titleScene } from '../../screenplay/types';
import { GoldScreenBackground } from '../backgrounds/GoldScreenBackground';
import { COLORS } from '../../theme';
import { FONT_DISPLAY, FONT_SERIF } from '../../fonts';
import { progress, fadeUp } from '../../lib/timing';

// 金屏風のタイトル画面。墨文字がドンと入る。
export const TitleScene: React.FC<z.infer<typeof titleScene>> = ({
  series,
  title,
  episode,
  tagline,
}) => {
  const frame = useCurrentFrame();
  const titleP = progress(frame, 6, 20);
  const blur = (1 - titleP) * 14;
  const seriesAnim = fadeUp(frame, 0, 16, 26);
  const tagAnim = fadeUp(frame, 26, 16, 22);
  const epAnim = fadeUp(frame, 36, 16, 18);
  const inkShadow =
    '0 3px 0 rgba(60,40,0,0.35), 0 10px 30px rgba(40,25,0,0.45)';
  return (
    <AbsoluteFill>
      <GoldScreenBackground />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 30,
        }}
      >
        {series ? (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 64,
              letterSpacing: '0.2em',
              color: COLORS.ink,
              textShadow: '0 2px 0 rgba(255,240,190,0.5)',
              ...seriesAnim,
            }}
          >
            {series}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 190,
            lineHeight: 1.1,
            letterSpacing: '0.06em',
            color: COLORS.ink,
            textShadow: inkShadow,
            opacity: titleP,
            filter: `blur(${blur}px)`,
            transform: `scale(${1.25 - 0.25 * titleP})`,
            textAlign: 'center',
            maxWidth: 1700,
            whiteSpace: 'pre-line',
          }}
        >
          {title}
        </div>
        {tagline ? (
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 600,
              fontSize: 42,
              letterSpacing: '0.12em',
              color: '#3D2E08',
              backgroundColor: 'rgba(255,244,205,0.55)',
              padding: '8px 36px',
              borderRadius: 4,
              ...tagAnim,
            }}
          >
            {tagline}
          </div>
        ) : null}
        {episode ? (
          <div
            style={{
              position: 'absolute',
              bottom: 90,
              fontFamily: FONT_SERIF,
              fontWeight: 600,
              fontSize: 44,
              letterSpacing: '0.3em',
              color: COLORS.ink,
              ...epAnim,
            }}
          >
            {episode}
          </div>
        ) : null}
      </AbsoluteFill>
      {/* 冒頭の白フラッシュで切り替えの勢いを出す */}
      <AbsoluteFill
        style={{
          backgroundColor: '#FFF6DC',
          opacity: interpolate(frame, [0, 8], [0.9, 0], {
            extrapolateRight: 'clamp',
          }),
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
