import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { flowCompareScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { COLORS } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress, fadeUp } from '../../lib/timing';
import { Subtitle } from '../atoms/Subtitle';

const Arrow: React.FC<{ p: number; accent?: boolean }> = ({ p, accent }) => (
  <svg width="46" height="30" viewBox="0 0 46 30" style={{ opacity: p, flexShrink: 0 }}>
    <path
      d="M2,15 L32,15 M24,5 L36,15 L24,25"
      stroke={accent ? COLORS.crimson : 'rgba(34,29,22,0.45)'}
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Row: React.FC<{
  label: string;
  steps: string[];
  accent: boolean;
  startFrame: number;
  frame: number;
}> = ({ label, steps, accent, startFrame, frame }) => {
  const labelP = progress(frame, startFrame, 12);
  const per = accent ? 8 : 5;
  // 長い行はフォントを自動縮小
  const totalChars = steps.reduce((a, s) => a + s.length, 0);
  const fontSize = Math.max(28, Math.min(42, (1450 - steps.length * 60 - (steps.length - 1) * 50) / totalChars));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 700,
          fontSize: 38,
          letterSpacing: '0.1em',
          color: COLORS.paper,
          backgroundColor: accent ? COLORS.crimson : COLORS.inkSoft,
          borderRadius: 8,
          padding: '8px 22px',
          flexShrink: 0,
          opacity: labelP,
          transform: `translateX(${(1 - labelP) * -30}px)`,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
        {steps.map((s, i) => {
          const p = progress(frame, startFrame + 6 + i * per, 10);
          return (
            <React.Fragment key={i}>
              {i > 0 ? <Arrow p={progress(frame, startFrame + 8 + i * per, 8)} accent={accent} /> : null}
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize,
                  letterSpacing: '0.02em',
                  color: accent ? COLORS.ink : 'rgba(34,29,22,0.55)',
                  backgroundColor: accent ? 'rgba(255,252,240,0.9)' : 'rgba(0,0,0,0.045)',
                  border: accent ? `3px solid ${COLORS.ink}` : '2.5px solid rgba(34,29,22,0.3)',
                  borderRadius: 12,
                  padding: '12px 20px',
                  whiteSpace: 'nowrap',
                  boxShadow: accent ? '0 5px 0 rgba(50,38,20,0.16)' : 'none',
                  display: 'inline-block',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 34}px)`,
                }}
              >
                {s}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// 旧フロー(グレー)→新フロー(アクセント)の比較。
export const FlowCompareScene: React.FC<z.infer<typeof flowCompareScene>> = ({
  heading,
  oldLabel,
  newLabel,
  oldSteps,
  newSteps,
  narration,
}) => {
  const frame = useCurrentFrame();
  const headAnim = fadeUp(frame, 2, 14, 22);
  const newStart = 14 + oldSteps.length * 5 + 14;
  return (
    <AbsoluteFill>
      <WashiBackground />
      {heading ? (
        <div
          style={{
            position: 'absolute',
            top: '14%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 64,
            letterSpacing: '0.08em',
            color: COLORS.ink,
            ...headAnim,
          }}
        >
          {heading}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: '34%',
          bottom: '24%',
          left: 90,
          right: 90,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
        }}
      >
        <Row label={oldLabel} steps={oldSteps} accent={false} startFrame={8} frame={frame} />
        {/* 区切りの点線 */}
        <div
          style={{
            borderTop: '3px dashed rgba(34,29,22,0.25)',
            opacity: progress(frame, newStart - 6, 10),
          }}
        />
        <Row label={newLabel} steps={newSteps} accent startFrame={newStart} frame={frame} />
      </div>
      {narration ? <Subtitle text={narration} mood="light" /> : null}
    </AbsoluteFill>
  );
};
