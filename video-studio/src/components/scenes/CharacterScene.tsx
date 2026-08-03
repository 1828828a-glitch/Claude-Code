import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { characterScene } from '../../screenplay/types';
import { WashiBackground } from '../backgrounds/WashiBackground';
import { DarkBackground } from '../backgrounds/DarkBackground';
import { COLORS, SAFE } from '../../theme';
import { FONT_DISPLAY, FONT_SANS } from '../../fonts';
import { progress, fadeUp } from '../../lib/timing';
import { Subtitle } from '../atoms/Subtitle';

// 人物のシルエット(画像なしフォールバック)。
// 二角帽+肩章の海軍士官の胸像。輪郭で「提督」と分かる造形にする。
const SilhouetteBust: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 400 480" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* 二角帽(バイコーン): 両端が横に張り出す三日月形 */}
      <path d="M96,120 Q200,38 304,120 Q200,88 96,120 Z" />
      <path d="M96,120 Q200,88 304,120 Q200,112 96,120 Z" opacity="0.92" />
      {/* 頭部(帽子の下に広めに) */}
      <path d="M146,112 C146,102 254,102 254,112 L254,182 C254,226 226,250 200,250 C174,250 146,226 146,182 Z" />
      {/* 首 */}
      <rect x="176" y="238" width="48" height="42" />
      {/* 肩・胴(高襟の軍服) */}
      <path d="M200,262 C130,268 84,300 68,352 C58,390 54,436 54,480 L346,480 C346,436 342,390 332,352 C316,300 270,268 200,262 Z" />
      {/* 肩章(エポーレット) */}
      <path d="M56,330 L132,306 L140,330 L64,356 Z" />
      <path d="M344,330 L268,306 L260,330 L336,356 Z" />
      <g opacity="0.9">
        <rect x="50" y="348" width="8" height="26" rx="4" />
        <rect x="62" y="352" width="8" height="26" rx="4" />
        <rect x="74" y="354" width="8" height="24" rx="4" />
        <rect x="342" y="348" width="8" height="26" rx="4" />
        <rect x="330" y="352" width="8" height="26" rx="4" />
        <rect x="318" y="354" width="8" height="24" rx="4" />
      </g>
      {/* 詰襟の合わせ目(生成りの細線) */}
      <path d="M198,268 L202,268 L204,360 L196,360 Z" fill={COLORS.paper} opacity="0.35" />
      {/* ボタン */}
      <g fill={COLORS.paper} opacity="0.45">
        <circle cx="174" cy="330" r="6" />
        <circle cx="226" cy="330" r="6" />
        <circle cx="170" cy="374" r="6" />
        <circle cx="230" cy="374" r="6" />
        <circle cx="166" cy="418" r="6" />
        <circle cx="234" cy="418" r="6" />
      </g>
    </g>
  </svg>
);

// 人物紹介。左に立ち絵(または墨シルエット)、右に名前+説明。
export const CharacterScene: React.FC<z.infer<typeof characterScene>> = ({
  name,
  image,
  countryLabel,
  flagEmoji,
  infoLines,
  mood,
  narration,
}) => {
  const frame = useCurrentFrame();
  const dark = mood === 'dark';
  const portraitP = progress(frame, 4, 20);
  const nameAnim = fadeUp(frame, 16, 18, 30);
  const flagAnim = fadeUp(frame, 8, 14, 16);
  const underlineP = progress(frame, 28, 14);
  const textColor = dark ? COLORS.lightOnDark : COLORS.ink;
  return (
    <AbsoluteFill>
      {dark ? <DarkBackground /> : <WashiBackground />}
      {/* 立ち絵の背後の放射光(集中線を薄く) */}
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from 0deg at 31% 52%, rgba(90,70,40,${
            dark ? 0.06 : 0.026
          }) 0deg 1.1deg, transparent 1.1deg 9deg)`,
          opacity: portraitP,
        }}
      />
      {/* 国ラベル */}
      {countryLabel ? (
        <div
          style={{
            position: 'absolute',
            top: SAFE - 30,
            left: SAFE,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontFamily: FONT_SANS,
            fontWeight: 700,
            fontSize: 40,
            color: textColor,
            ...flagAnim,
          }}
        >
          {flagEmoji ? <span style={{ fontSize: 48 }}>{flagEmoji}</span> : null}
          <span
            style={{
              backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              padding: '4px 20px',
              borderRadius: 4,
              letterSpacing: '0.15em',
            }}
          >
            {countryLabel}
          </span>
        </div>
      ) : null}
      {/* 立ち絵 */}
      <div
        style={{
          position: 'absolute',
          left: '12%',
          bottom: 0,
          width: 620,
          height: 850,
          opacity: portraitP,
          transform: `translateY(${(1 - portraitP) * 90}px)`,
          filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.35))',
          // シルエット時は下端を紙に溶かして字幕と干渉させない
          ...(image
            ? {}
            : {
                WebkitMaskImage:
                  'linear-gradient(180deg, black 78%, transparent 97%)',
                maskImage: 'linear-gradient(180deg, black 78%, transparent 97%)',
              }),
        }}
      >
        {image ? (
          <Img
            src={staticFile(`assets/${image}`)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom' }}
          />
        ) : (
          <SilhouetteBust color={dark ? '#0A0908' : COLORS.ink} />
        )}
      </div>
      {/* 名前ブロック */}
      <div
        style={{
          position: 'absolute',
          right: SAFE,
          top: '34%',
          textAlign: 'right',
          ...nameAnim,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 110,
            letterSpacing: '0.08em',
            color: textColor,
            textShadow: dark ? '0 0 40px rgba(217,180,91,0.25)' : 'none',
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 18,
            marginLeft: 'auto',
            width: 480,
            height: 5,
            backgroundColor: COLORS.gold,
            transform: `scaleX(${underlineP})`,
            transformOrigin: 'right center',
          }}
        />
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {infoLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 500,
                fontSize: 36,
                letterSpacing: '0.1em',
                color: dark ? 'rgba(242,232,210,0.85)' : COLORS.inkSoft,
                ...fadeUp(frame, 34 + i * 6, 14, 18),
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
      {narration ? <Subtitle text={narration} mood={mood} /> : null}
    </AbsoluteFill>
  );
};
