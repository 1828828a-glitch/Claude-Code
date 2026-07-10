import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from './theme';

export const useRise = (delay: number, distance = 60) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200, stiffness: 120}});
  return {
    opacity: interpolate(frame - delay, [0, 12], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    transform: `translateY(${(1 - s) * distance}px)`,
  };
};

export const usePop = (delay: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 160, mass: 0.7}});
  return {
    opacity: frame < delay ? 0 : 1,
    transform: `scale(${s})`,
  };
};

export const FadeOutAll: React.FC<{from: number; duration?: number; children: React.ReactNode}> = ({
  from,
  duration = 15,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <div style={{opacity, width: '100%', height: '100%'}}>{children}</div>;
};

export const GradientText: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({
  children,
  style,
}) => (
  <span
    style={{
      background: GRADIENT,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

export const Pill: React.FC<{
  children: React.ReactNode;
  delay: number;
  dark?: boolean;
  style?: React.CSSProperties;
}> = ({children, delay, dark, style}) => {
  const anim = useRise(delay, 30);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 36px',
        borderRadius: 999,
        border: `3px solid ${dark ? 'rgba(255,255,255,0.35)' : 'rgba(67,83,255,0.4)'}`,
        color: dark ? COLORS.white : COLORS.blue,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: '0.06em',
        ...anim,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Question scene shared layout
export const QuestionScene: React.FC<{
  num: string;
  tag: string;
  lines: string[];
  sub: string;
  accentIndex?: number;
  total?: number;
  background?: React.ReactNode;
  extra?: React.ReactNode;
}> = ({num, tag, lines, sub, background, extra}) => {
  const frame = useCurrentFrame();
  const numAnim = useRise(4, 40);
  const subAnim = useRise(40, 30);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: COLORS.white,
        fontFamily: FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {background}
      {/* Giant outline question number */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: -60,
          fontSize: 560,
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: '3px rgba(67,83,255,0.14)',
          lineHeight: 1,
          ...numAnim,
        }}
      >
        {num}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 160px',
        }}
      >
        <Pill delay={8}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: GRADIENT,
              display: 'inline-block',
            }}
          />
          {num}｜{tag}
        </Pill>
        <div style={{height: 50}} />
        {lines.map((line, i) => {
          const anim = useRise(16 + i * 8, 70);
          const chars = interpolate(frame, [16 + i * 8, 16 + i * 8 + line.length * 1.2], [0, line.length], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                fontSize: 92,
                fontWeight: 900,
                color: COLORS.ink,
                lineHeight: 1.35,
                ...anim,
              }}
            >
              {line.slice(0, Math.ceil(chars))}
              <span style={{opacity: chars < line.length ? 1 : 0, color: COLORS.blue}}>|</span>
            </div>
          );
        })}
        <div style={{height: 44}} />
        <div
          style={{
            fontSize: 38,
            fontWeight: 500,
            color: COLORS.greyDark,
            borderLeft: `8px solid`,
            borderImage: `${GRADIENT} 1`,
            paddingLeft: 28,
            lineHeight: 1.6,
            ...subAnim,
          }}
        >
          {sub}
        </div>
        {extra}
      </div>
    </div>
  );
};
