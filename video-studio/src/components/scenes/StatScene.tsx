import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { statScene } from '../../screenplay/types';
import { DarkBackground } from '../backgrounds/DarkBackground';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { JAPAN_PATH } from '../../assets/japanPath';
import { COLORS, SAFE, VIDEO } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress, fadeUp, EASE_OUT } from '../../lib/timing';
import { RichText } from '../atoms/RichText';
import { Subtitle } from '../atoms/Subtitle';

// 数値提示。ラベル+カウントアップ+進捗バー(+日本シルエット)。
export const StatScene: React.FC<z.infer<typeof statScene>> = ({
  heading,
  label,
  value,
  valueSuffix,
  barRatio,
  mood,
  showJapanSilhouette,
  narration,
}) => {
  const frame = useCurrentFrame();
  const dark = mood === 'dark';
  const countP = interpolate(frame, [14, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const shown = Math.round(value * countP);
  const ratio = barRatio ?? Math.min(1, value / 100);
  const barP = interpolate(frame, [18, 66], [0, ratio], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const headAnim = fadeUp(frame, 4, 18, 30);
  const rowAnim = fadeUp(frame, 12, 16, 24);
  const mainColor = dark ? COLORS.lightOnDark : COLORS.ink;

  return (
    <AbsoluteFill>
      {dark ? <DarkBackground /> : <WashiBackground />}
      {/* 日本シルエット(右側・赤ハイライト) */}
      {showJapanSilhouette ? (
        <div
          style={{
            position: 'absolute',
            right: -160,
            top: -60,
            width: 1150,
            height: 1150,
            opacity: 0.9 * progress(frame, 8, 24),
          }}
        >
          <svg viewBox="140 300 720 500" style={{ width: '100%', height: '100%' }}>
            <defs>
              <radialGradient id="stat-hl">
                <stop offset="0%" stopColor={COLORS.crimson} stopOpacity="0.9" />
                <stop offset="100%" stopColor={COLORS.crimson} stopOpacity="0" />
              </radialGradient>
              <clipPath id="stat-clip">
                <path d={JAPAN_PATH} />
              </clipPath>
            </defs>
            <path
              d={JAPAN_PATH}
              fill={dark ? '#2E2921' : '#D8CDB2'}
              stroke={dark ? '#57503F' : '#9B8D6C'}
              strokeWidth="1.5"
            />
            <g clipPath="url(#stat-clip)">
              <circle cx="665" cy="505" r={200 * progress(frame, 20, 40)} fill="url(#stat-hl)" />
            </g>
          </svg>
        </div>
      ) : null}
      {/* 見出し */}
      {heading ? (
        <div
          style={{
            position: 'absolute',
            left: SAFE,
            top: SAFE + 10,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.35,
            letterSpacing: '0.06em',
            color: mainColor,
            textShadow: dark ? '0 4px 18px rgba(0,0,0,0.7)' : 'none',
            maxWidth: 900,
            whiteSpace: 'pre-line',
            ...headAnim,
          }}
        >
          <RichText text={heading} mood={mood} />
        </div>
      ) : null}
      {/* ラベル+数値+バー */}
      <div
        style={{
          position: 'absolute',
          left: SAFE,
          bottom: 250,
          width: VIDEO.width * 0.52,
          ...rowAnim,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 40 }}>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 44,
              letterSpacing: '0.14em',
              color: mainColor,
              border: `2px solid ${dark ? 'rgba(242,232,210,0.6)' : COLORS.ink}`,
              padding: '8px 26px',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 130,
              color: dark ? COLORS.goldBright : COLORS.crimson,
              textShadow: dark ? '0 0 50px rgba(217,180,91,0.35)' : 'none',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {shown}
            {valueSuffix ? (
              <span style={{ fontSize: 64, marginLeft: 6, color: mainColor }}>{valueSuffix}</span>
            ) : null}
          </div>
        </div>
        {/* バー */}
        <div
          style={{
            marginTop: 26,
            height: 16,
            borderRadius: 8,
            backgroundColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${barP * 100}%`,
              height: '100%',
              borderRadius: 8,
              background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldBright})`,
              boxShadow: '0 0 18px rgba(217,180,91,0.6)',
            }}
          />
        </div>
      </div>
      {narration ? <Subtitle text={narration} mood={mood} /> : null}
    </AbsoluteFill>
  );
};
