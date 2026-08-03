import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { yearScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { DarkBackground } from '../backgrounds/DarkBackground';
import { COLORS } from '../../theme';
import { FONT_DISPLAY, FONT_SERIF } from '../../fonts';
import { progress, fadeUp } from '../../lib/timing';
import { AccentUnderline } from '../atoms/AccentUnderline';
import { Subtitle } from '../atoms/Subtitle';

// 年号ドン出し。桁ごとに落ちてきて朱線が引かれる。
export const YearScene: React.FC<z.infer<typeof yearScene>> = ({
  year,
  suffix = '年',
  subLabel,
  mood,
  narration,
}) => {
  const frame = useCurrentFrame();
  const dark = mood === 'dark';
  const digits = year.split('');
  const subAnim = fadeUp(frame, 24, 14, 16);
  return (
    <AbsoluteFill>
      {dark ? <DarkBackground /> : <WashiBackground />}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          {digits.map((d, i) => {
            const p = progress(frame, 4 + i * 4, 14);
            return (
              <span
                key={i}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 300,
                  lineHeight: 1,
                  color: dark ? COLORS.goldBright : COLORS.ink,
                  textShadow: dark
                    ? '0 0 60px rgba(217,180,91,0.35), 0 4px 18px rgba(0,0,0,0.6)'
                    : '0 4px 0 rgba(80,60,30,0.15)',
                  display: 'inline-block',
                  opacity: p,
                  transform: `translateY(${(1 - p) * -70}px) scale(${1.15 - 0.15 * p})`,
                }}
              >
                {d}
              </span>
            );
          })}
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 110,
              marginLeft: 18,
              color: dark ? COLORS.lightOnDark : COLORS.ink,
              opacity: progress(frame, 4 + digits.length * 4, 12),
            }}
          >
            {suffix}
          </span>
        </div>
        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
          <AccentUnderline width={430} delay={18} thickness={7} />
          {subLabel ? (
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 600,
                fontSize: 52,
                letterSpacing: '0.35em',
                color: dark ? COLORS.lightOnDark : COLORS.crimson,
                ...subAnim,
              }}
            >
              {subLabel}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
      {narration ? <Subtitle text={narration} mood={mood} /> : null}
    </AbsoluteFill>
  );
};
