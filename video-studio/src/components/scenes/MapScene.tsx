import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { mapScene } from '../../screenplay/types';
import { JAPAN_PATH, PLACES, project } from '../../assets/japanPath';
import { COLORS, SAFE, VIDEO } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress, fadeUp, EASE_IN_OUT } from '../../lib/timing';
import { AccentUnderline } from '../atoms/AccentUnderline';
import { Subtitle } from '../atoms/Subtitle';
import { Vignette } from '../atoms/Vignette';
import { interpolate } from 'remotion';

type PlaceRef = string | [number, number];

const resolvePlace = (ref: PlaceRef): [number, number] => {
  if (typeof ref === 'string') {
    const p = PLACES[ref];
    if (!p) throw new Error(`未知の地名キー: ${ref}(assets/japanPath.tsのPLACESに追加するか[lon,lat]で指定)`);
    return p;
  }
  return project(ref);
};

// 日本地図。対象地点を中心にゆっくり寄りながら、赤ハイライト+矢印+地名を出す。
export const MapScene: React.FC<z.infer<typeof mapScene>> = ({
  label,
  subLabel,
  target,
  highlights,
  zoom,
  mood,
  narration,
}) => {
  const frame = useCurrentFrame();
  const dark = mood === 'dark';
  const [tx, ty] = resolvePlace(target);

  // 地図コンテナ: 1000x1000のviewBoxをSCALE倍で敷き、注視点が画面右寄りに来るよう配置
  const MAP_SIZE = 1700;
  const k = MAP_SIZE / 1000;
  const anchorX = VIDEO.width * 0.66;
  const anchorY = VIDEO.height * 0.5;
  const left = anchorX - tx * k;
  const top = anchorY - ty * k;

  // ズーム(注視点を原点にスケールするので対象は画面に固定される)
  const z = interpolate(frame, [0, 150], [zoom * 0.92, zoom], {
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });
  const entranceP = progress(frame, 0, 18);

  const labelAnim = fadeUp(frame, 14, 16, 30);
  const arrowP = progress(frame, 30, 18);
  const hlP = progress(frame, 24, 20);
  const pulse = 1 + 0.06 * Math.sin((frame / 22) * Math.PI * 2);

  const seaColor = dark ? '#0E1218' : COLORS.sea;
  const landColor = dark ? COLORS.landDark : COLORS.land;

  // 矢印: ラベル札の右端から対象地点へ
  const labelPos = { x: SAFE + 40, y: VIDEO.height * 0.3 };
  const arrowStart = { x: labelPos.x + 400, y: labelPos.y + 116 };
  const arrowEnd = { x: anchorX - 24, y: anchorY - 18 };
  const midX = (arrowStart.x + arrowEnd.x) / 2;
  const midY = Math.min(arrowStart.y, arrowEnd.y) + 30;
  const arrowPath = `M ${arrowStart.x} ${arrowStart.y} Q ${midX} ${midY} ${arrowEnd.x} ${arrowEnd.y}`;

  return (
    <AbsoluteFill style={{ backgroundColor: seaColor }}>
      {/* 海の質感 */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <filter id="sea-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="21" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.5  0 0 0 0 0.6  0 0 0 0 0.75  0 0 0 0.06 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#sea-noise)" />
      </svg>
      {/* 地図本体(注視点固定ズーム) */}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: MAP_SIZE,
          height: MAP_SIZE,
          transform: `scale(${z})`,
          transformOrigin: `${tx * k}px ${ty * k}px`,
          opacity: entranceP,
        }}
      >
        <svg viewBox="0 0 1000 1000" style={{ width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id="hl-grad">
              <stop offset="0%" stopColor={COLORS.crimson} stopOpacity="0.95" />
              <stop offset="55%" stopColor={COLORS.crimson} stopOpacity="0.55" />
              <stop offset="100%" stopColor={COLORS.crimson} stopOpacity="0" />
            </radialGradient>
            <clipPath id="japan-clip">
              <path d={JAPAN_PATH} />
            </clipPath>
            <filter id="land-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.35" />
            </filter>
          </defs>
          <path
            d={JAPAN_PATH}
            fill={landColor}
            stroke={dark ? '#4C4438' : '#8C7E5E'}
            strokeWidth="1.2"
            filter="url(#land-shadow)"
          />
          {/* 赤ハイライト(陸地にクリップ) */}
          <g clipPath="url(#japan-clip)" opacity={hlP}>
            {highlights.map((h, i) => {
              const [hx, hy] = resolvePlace(h.place as PlaceRef);
              return (
                <circle
                  key={i}
                  cx={hx}
                  cy={hy}
                  r={h.radius * pulse}
                  fill="url(#hl-grad)"
                />
              );
            })}
          </g>
          {/* 対象地点のピン */}
          <circle
            cx={tx}
            cy={ty}
            r={7 / z}
            fill={COLORS.crimson}
            stroke="#FFF"
            strokeWidth={2.5 / z}
            opacity={arrowP}
          />
          <circle
            cx={tx}
            cy={ty}
            r={(10 + 14 * ((frame % 40) / 40)) / z}
            fill="none"
            stroke={COLORS.crimson}
            strokeWidth={2 / z}
            opacity={arrowP * (1 - (frame % 40) / 40)}
          />
        </svg>
      </div>
      {/* 地名ラベル */}
      <div style={{ position: 'absolute', left: labelPos.x, top: labelPos.y, ...labelAnim }}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 130,
            letterSpacing: '0.1em',
            color: dark ? COLORS.lightOnDark : '#F4EBD8',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {label}
        </div>
        <div style={{ marginTop: 8 }}>
          <AccentUnderline width={300} delay={22} thickness={7} align="left" />
        </div>
        {subLabel ? (
          <div
            style={{
              marginTop: 22,
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 36,
              letterSpacing: '0.08em',
              color: dark ? 'rgba(242,232,210,0.8)' : 'rgba(244,235,216,0.85)',
              ...fadeUp(frame, 30, 14, 16),
            }}
          >
            {subLabel}
          </div>
        ) : null}
      </div>
      {/* 矢印 */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <defs>
          <marker
            id="arrow-head"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.crimson} />
          </marker>
        </defs>
        <path
          d={arrowPath}
          fill="none"
          stroke={COLORS.crimson}
          strokeWidth="10"
          strokeLinecap="round"
          markerEnd="url(#arrow-head)"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - arrowP}
          style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))' }}
        />
      </svg>
      <Vignette strength={0.4} />
      {narration ? <Subtitle text={narration} mood="dark" /> : null}
    </AbsoluteFill>
  );
};
