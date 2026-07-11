import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from './theme';
import {KineticChars, Particles, Underline} from './fx';

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

// Question scene shared layout（キネティックタイポ＋下線スイープ＋パララックス数字）
export const QuestionScene: React.FC<{
  num: string;
  tag: string;
  lines: string[];
  sub: string;
  dark?: boolean;
  background?: React.ReactNode;
  extra?: React.ReactNode;
}> = ({num, tag, lines, sub, dark, background, extra}) => {
  const frame = useCurrentFrame();
  const numAnim = useRise(4, 40);
  const subAnim = useRise(46, 30);
  const lineLens = lines.map((l) => Array.from(l).length);
  const underlineDelay = 22 + lineLens.reduce((a, b) => a + b, 0) * 1.5 + 8;
  const bg = dark ? COLORS.ink : COLORS.white;
  const inkColor = dark ? COLORS.white : COLORS.ink;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        fontFamily: FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {dark && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 1100px 700px at 30% 42%, rgba(139,92,246,0.14) 0%, transparent 70%)',
          }}
        />
      )}
      <Particles
        count={14}
        seed={`q${num}`}
        color={dark ? 'rgba(185,175,255,0.35)' : 'rgba(67,83,255,0.12)'}
        maxSize={7}
      />
      {background}
      {/* Giant outline question number with slow parallax drift */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: -60 + Math.sin(frame / 55) * 18,
          fontSize: 560,
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: dark ? '3px rgba(139,92,246,0.3)' : '3px rgba(67,83,255,0.14)',
          lineHeight: 1,
          ...numAnim,
        }}
      >
        {num}
      </div>
      {/* 右上のアクセント（回転するグラデーションリング） */}
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 110,
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '22px solid transparent',
          background: `linear-gradient(${bg}, ${bg}) padding-box, ${GRADIENT} border-box`,
          transform: `rotate(${frame}deg) scale(${0.9 + Math.sin(frame / 18) * 0.08})`,
          opacity: 0.75,
        }}
      />
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
        <Pill delay={8} dark={dark}>
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
        {lines.map((line, i) => (
          <KineticChars
            key={i}
            text={line}
            delay={22 + (i === 0 ? 0 : lineLens[0] * 1.5)}
            stagger={1.5}
            style={{fontSize: 92, fontWeight: 900, color: inkColor, lineHeight: 1.35}}
          />
        ))}
        <div style={{height: 26}} />
        <Underline delay={underlineDelay} width={430} />
        <div style={{height: 34}} />
        <div
          style={{
            fontSize: 38,
            fontWeight: 500,
            color: dark ? 'rgba(255,255,255,0.68)' : COLORS.greyDark,
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
