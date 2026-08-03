import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { outroScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { COLORS } from '../../theme';
import { FONT_DISPLAY, FONT_SERIF } from '../../fonts';
import { fadeUp, progress } from '../../lib/timing';
import { Subtitle } from '../atoms/Subtitle';

// 締め・次回予告。静かに出して余韻を残す。
export const OutroScene: React.FC<z.infer<typeof outroScene>> = ({
  heading,
  title,
  note,
  narration,
}) => {
  const frame = useCurrentFrame();
  const headAnim = fadeUp(frame, 4, 16, 20);
  const titleAnim = fadeUp(frame, 16, 20, 34);
  const noteAnim = fadeUp(frame, 34, 16, 18);
  const lineP = progress(frame, 26, 16);
  return (
    <AbsoluteFill>
      <WashiBackground />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 34,
        }}
      >
        {heading ? (
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 600,
              fontSize: 54,
              letterSpacing: '0.5em',
              paddingLeft: '0.5em',
              color: COLORS.crimson,
              ...headAnim,
            }}
          >
            {heading}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 140,
            letterSpacing: '0.1em',
            color: COLORS.ink,
            textShadow: '0 4px 0 rgba(80,60,30,0.12)',
            textAlign: 'center',
            maxWidth: 1600,
            ...titleAnim,
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: 560,
            height: 4,
            backgroundColor: COLORS.gold,
            transform: `scaleX(${lineP})`,
          }}
        />
        {note ? (
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 500,
              fontSize: 40,
              letterSpacing: '0.2em',
              color: COLORS.inkSoft,
              ...noteAnim,
            }}
          >
            {note}
          </div>
        ) : null}
      </AbsoluteFill>
      {narration ? <Subtitle text={narration} mood="light" /> : null}
    </AbsoluteFill>
  );
};
