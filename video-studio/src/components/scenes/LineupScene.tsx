import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { lineupScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { COLORS, SAFE } from '../../theme';
import { FONT_DISPLAY } from '../../fonts';
import { progress } from '../../lib/timing';
import { Subtitle } from '../atoms/Subtitle';

// 黒船(外輪式蒸気フリゲート)の墨シルエット
const ShipIcon: React.FC<{ smokeP: number }> = ({ smokeP }) => (
  <svg viewBox="0 0 420 300" style={{ width: '100%', height: '100%' }}>
    <g fill={COLORS.ink}>
      {/* 煙(煙突の真上から左へ流れる) */}
      <g opacity={0.5 * smokeP} fill={COLORS.inkSoft}>
        <ellipse cx={160 - smokeP * 18} cy={96 - smokeP * 20} rx="17" ry="9" />
        <ellipse cx={140 - smokeP * 34} cy={82 - smokeP * 28} rx="12" ry="7" />
        <ellipse cx={262 - smokeP * 16} cy={90 - smokeP * 18} rx="16" ry="8" />
        <ellipse cx={244 - smokeP * 32} cy={76 - smokeP * 26} rx="11" ry="6" />
      </g>
      {/* マスト3本(中央が最も高い) */}
      <rect x="88" y="76" width="5" height="136" />
      <rect x="207" y="52" width="5" height="160" />
      <rect x="326" y="76" width="5" height="136" />
      {/* 帆桁(下段ほど長い) */}
      <rect x="58" y="96" width="65" height="4" />
      <rect x="66" y="128" width="49" height="4" />
      <rect x="170" y="76" width="79" height="4" />
      <rect x="180" y="112" width="59" height="4" />
      <rect x="296" y="96" width="65" height="4" />
      <rect x="304" y="128" width="49" height="4" />
      {/* 索具(ステー) */}
      <g stroke={COLORS.ink} strokeWidth="1.6" opacity="0.65">
        <line x1="90" y1="78" x2="20" y2="212" />
        <line x1="209" y1="54" x2="90" y2="78" />
        <line x1="209" y1="54" x2="328" y2="78" />
        <line x1="328" y1="78" x2="400" y2="212" />
      </g>
      {/* 煙突2本(やや太く、上端に縁) */}
      <rect x="146" y="104" width="20" height="108" />
      <rect x="142" y="100" width="28" height="8" />
      <rect x="250" y="98" width="20" height="114" />
      <rect x="246" y="94" width="28" height="8" />
      {/* 船体(バウスプリット付き) */}
      <path d="M20,212 L400,212 L386,240 C300,258 244,262 210,262 C176,262 120,258 34,240 Z" />
      <path d="M20,212 L-8,196 L24,204 Z" transform="translate(8,0)" />
      {/* 舷側の砲門 */}
      <g fill={COLORS.paper} opacity="0.35">
        <rect x="80" y="222" width="14" height="8" />
        <rect x="130" y="226" width="14" height="8" />
        <rect x="276" y="226" width="14" height="8" />
        <rect x="326" y="222" width="14" height="8" />
      </g>
      {/* 外輪 */}
      <circle cx="210" cy="216" r="40" />
      <circle cx="210" cy="216" r="27" fill={COLORS.paper} opacity="0.3" />
      <circle cx="210" cy="216" r="8" />
      {/* 旗 */}
      <path d="M212,52 L250,60 L212,70 Z" fill={COLORS.crimson} />
    </g>
  </svg>
);

// アイコンが1つずつ現れてカウントが増える(黒船◯隻)
export const LineupScene: React.FC<z.infer<typeof lineupScene>> = ({
  label,
  count,
  unit,
  narration,
}) => {
  const frame = useCurrentFrame();
  const labelP = progress(frame, 2, 14);
  const per = 10; // 1隻あたりの出現間隔(フレーム)
  const shown = Math.min(
    count,
    Math.max(0, Math.floor((frame - 14) / per) + 1)
  );
  const iconW = Math.min(430, 1500 / count);
  return (
    <AbsoluteFill>
      <WashiBackground />
      {/* 左上ラベル */}
      <div
        style={{
          position: 'absolute',
          top: SAFE - 20,
          left: SAFE,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 72,
          letterSpacing: '0.2em',
          color: COLORS.ink,
          opacity: labelP,
          transform: `translateX(${(1 - labelP) * -40}px)`,
        }}
      >
        {label}
      </div>
      {/* 船列 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '30%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 24,
        }}
      >
        {Array.from({ length: count }).map((_, i) => {
          const appeared = i < shown;
          const p = appeared ? progress(frame, 14 + i * per, 12) : 0;
          return (
            <div key={i} style={{ width: iconW, textAlign: 'center' }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '420/300',
                  opacity: p,
                  transform: `translateX(${(1 - p) * 120}px)`,
                }}
              >
                <ShipIcon smokeP={p} />
              </div>
            </div>
          );
        })}
      </div>
      {/* 基線とカウント */}
      <div style={{ position: 'absolute', left: '14%', right: '14%', top: '62%' }}>
        <div style={{ height: 3, backgroundColor: COLORS.ink, opacity: 0.7 }} />
        <div
          style={{
            marginTop: 30,
            textAlign: 'center',
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 120,
            color: COLORS.crimson,
            opacity: shown > 0 ? 1 : 0,
          }}
        >
          {shown}
          {unit ? (
            <span style={{ fontSize: 60, marginLeft: 10, color: COLORS.ink }}>{unit}</span>
          ) : null}
        </div>
      </div>
      {narration ? <Subtitle text={narration} mood="light" /> : null}
    </AbsoluteFill>
  );
};
