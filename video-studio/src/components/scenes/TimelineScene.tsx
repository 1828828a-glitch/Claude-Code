import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { timelineScene } from '../../screenplay/types';
import { DarkBackground } from '../backgrounds/DarkBackground';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { COLORS, VIDEO } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress, EASE_IN_OUT } from '../../lib/timing';
import { Subtitle } from '../atoms/Subtitle';

// 年表。大年号+下部のタイムラインを赤マーカーが進む。
export const TimelineScene: React.FC<z.infer<typeof timelineScene>> = ({
  events,
  activeIndex,
  headline,
  mood,
  narration,
}) => {
  const frame = useCurrentFrame();
  const dark = mood === 'dark';
  const n = events.length;
  const x0 = VIDEO.width * 0.14;
  const x1 = VIDEO.width * 0.86;
  const tickX = (i: number) => x0 + ((x1 - x0) * i) / (n - 1);
  const lineY = VIDEO.height * 0.68;

  // マーカーが最初のイベントからactiveIndexまで進む
  const travelP = interpolate(frame, [16, 58], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });
  const markerX = x0 + (tickX(activeIndex) - x0) * travelP;

  const bigYear = headline ?? `${events[Math.min(activeIndex, n - 1)].year}年`;
  const bigP = progress(frame, 6, 18);
  const lineP = progress(frame, 2, 20);

  const mainColor = dark ? COLORS.goldBright : COLORS.ink;
  const faint = dark ? 'rgba(242,232,210,0.55)' : 'rgba(34,29,22,0.55)';

  return (
    <AbsoluteFill>
      {dark ? <DarkBackground /> : <WashiBackground />}
      {/* 大年号 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '26%',
          textAlign: 'center',
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 210,
          color: mainColor,
          textShadow: dark
            ? '0 0 70px rgba(217,180,91,0.3), 0 6px 24px rgba(0,0,0,0.6)'
            : '0 4px 0 rgba(80,60,30,0.15)',
          opacity: bigP,
          transform: `scale(${1.1 - 0.1 * bigP})`,
        }}
      >
        {bigYear}
      </div>
      {/* タイムライン */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <line
          x1={x0}
          y1={lineY}
          x2={x0 + (x1 - x0) * lineP}
          y2={lineY}
          stroke={faint}
          strokeWidth="3"
        />
        {events.map((e, i) => {
          const p = progress(frame, 8 + i * 5, 12);
          const active = i === activeIndex && travelP > 0.95;
          return (
            <g key={i} opacity={p}>
              <line
                x1={tickX(i)}
                y1={lineY - 10}
                x2={tickX(i)}
                y2={lineY + 10}
                stroke={faint}
                strokeWidth="3"
              />
              <text
                x={tickX(i)}
                y={lineY - 30}
                textAnchor="middle"
                fill={active ? COLORS.goldBright : faint}
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 700,
                  fontSize: 34,
                  letterSpacing: '0.05em',
                }}
              >
                {e.year}
              </text>
              <text
                x={tickX(i)}
                y={lineY + 52}
                textAnchor="middle"
                fill={active ? (dark ? COLORS.lightOnDark : COLORS.ink) : faint}
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: active ? 700 : 500,
                  fontSize: 28,
                  letterSpacing: '0.04em',
                }}
              >
                {e.label}
              </text>
            </g>
          );
        })}
        {/* 現在位置マーカー */}
        <g opacity={progress(frame, 14, 10)}>
          <line
            x1={markerX}
            y1={lineY - 22}
            x2={markerX}
            y2={lineY + 22}
            stroke={COLORS.crimson}
            strokeWidth="6"
          />
          <circle cx={markerX} cy={lineY} r="11" fill={COLORS.crimson}>
          </circle>
          <circle
            cx={markerX}
            cy={lineY}
            r={14 + 10 * ((frame % 36) / 36)}
            fill="none"
            stroke={COLORS.crimson}
            strokeWidth="2.5"
            opacity={1 - (frame % 36) / 36}
          />
        </g>
      </svg>
      {narration ? <Subtitle text={narration} mood={mood} /> : null}
    </AbsoluteFill>
  );
};
