import React from 'react';
import {random, useCurrentFrame} from 'remotion';

// ── 紙コラージュ風スタイルの部品集 ──
// 参考: 切り絵・雑誌コラージュ調（破れた紙・マスキングテープ・ハーフトーン・新聞紙）

export const PAPER = {
  cream: '#F2ECDD',
  white: '#FAF7EE',
  ink: '#221E18',
  red: '#D8442E',
  blue: '#2D6BB4',
  lightBlue: '#7FA8D9',
  green: '#2E8B6A',
  yellow: '#E9B62F',
  grey: '#B9B2A4',
};

// ストップモーション風の揺れ（4フレームごとにカクッと動く）
export const useWobble = (seed: string, amp = 1.2) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 4);
  const r = (random(`${seed}-${step}`) - 0.5) * 2;
  const r2 = (random(`${seed}b-${step}`) - 0.5) * 2;
  return {rot: r * amp, dx: r2 * amp, dy: (random(`${seed}c-${step}`) - 0.5) * 2 * amp};
};

// カクッと登場（数段階でスケールが飛ぶ＝コマ撮り感）
export const usePopSteps = (enter: number, seed = 'p') => {
  const frame = useCurrentFrame();
  if (frame < enter) return {opacity: 0, scale: 0};
  const t = frame - enter;
  const steps = [0.4, 0.75, 1.08, 0.96, 1];
  const idx = Math.min(Math.floor(t / 3), steps.length - 1);
  return {opacity: 1, scale: steps[idx]};
};

// 破れた紙の縁（ギザギザpolygonをシードから生成）
export const tornClip = (seed: string, jag = 14, roughness = 10): string => {
  const pts: string[] = [];
  const J = (i: number, axis: string) => (random(`${seed}${axis}${i}`) - 0.5) * 2 * roughness;
  for (let i = 0; i <= jag; i++) {
    pts.push(`${(i / jag) * 100}% ${Math.max(0, J(i, 't'))}px`);
  }
  for (let i = 0; i <= jag; i++) {
    pts.push(`calc(100% - ${Math.max(0, J(i, 'r'))}px) ${(i / jag) * 100}%`);
  }
  for (let i = jag; i >= 0; i--) {
    pts.push(`${(i / jag) * 100}% calc(100% - ${Math.max(0, J(i, 'b'))}px)`);
  }
  for (let i = jag; i >= 0; i--) {
    pts.push(`${Math.max(0, J(i, 'l'))}px ${(i / jag) * 100}%`);
  }
  return `polygon(${pts.join(', ')})`;
};

// 破れ紙パネル
export const TornPaper: React.FC<{
  seed?: string;
  color?: string;
  style?: React.CSSProperties;
  shadow?: boolean;
  children?: React.ReactNode;
  roughness?: number;
}> = ({seed = 'tp', color = PAPER.white, style, shadow = true, children, roughness = 9}) => (
  <div style={{filter: shadow ? 'drop-shadow(5px 7px 0 rgba(34,30,24,0.25))' : undefined, ...style}}>
    <div
      style={{
        clipPath: tornClip(seed, 16, roughness),
        background: color,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  </div>
);

// マスキングテープ
export const Tape: React.FC<{rot?: number; style?: React.CSSProperties; color?: string}> = ({
  rot = -4,
  style,
  color = 'rgba(255,252,235,0.65)',
}) => (
  <div
    style={{
      width: 150,
      height: 42,
      background: color,
      transform: `rotate(${rot}deg)`,
      clipPath:
        'polygon(4px 0%, 100% 3px, calc(100% - 6px) 100%, 0% calc(100% - 4px))',
      boxShadow: '0 2px 3px rgba(34,30,24,0.18)',
      ...style,
    }}
  />
);

// ハーフトーンドットのシート
export const Halftone: React.FC<{color?: string; size?: number; style?: React.CSSProperties}> = ({
  color = 'rgba(34,30,24,0.28)',
  size = 15,
  style,
}) => (
  <div
    style={{
      backgroundImage: `radial-gradient(circle, ${color} 32%, transparent 34%)`,
      backgroundSize: `${size}px ${size}px`,
      ...style,
    }}
  />
);

// 新聞紙テクスチャ（グレー行の疑似コラム）
export const Newspaper: React.FC<{style?: React.CSSProperties; seed?: string; cols?: number}> = ({
  style,
  seed = 'np',
  cols = 3,
}) => (
  <div style={{display: 'flex', gap: 14, padding: 18, background: '#EFE9D8', overflow: 'hidden', ...style}}>
    {Array.from({length: cols}).map((_, c) => (
      <div key={c} style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 6}}>
        {c === 0 && <div style={{height: 22, background: '#3A362D', marginBottom: 4}} />}
        {Array.from({length: 16}).map((_, i) => (
          <div
            key={i}
            style={{
              height: 5,
              width: `${62 + random(`${seed}${c}-${i}`) * 38}%`,
              background: 'rgba(58,54,45,0.4)',
            }}
          />
        ))}
      </div>
    ))}
  </div>
);

// 幾何コンフェッティ（三角・丸・ジグザグ・ビックリマーク）
export const Confetti: React.FC<{
  seed?: string;
  count?: number;
  colors?: string[];
  area?: {x: number; y: number; w: number; h: number};
  enterBase?: number;
}> = ({seed = 'cf', count = 14, colors = [PAPER.red, PAPER.blue, PAPER.yellow, PAPER.ink], area = {x: 0, y: 0, w: 1920, h: 1080}, enterBase = 6}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({length: count}).map((_, i) => {
        const kind = Math.floor(random(`${seed}k${i}`) * 4);
        const col = colors[Math.floor(random(`${seed}c${i}`) * colors.length)];
        const x = area.x + random(`${seed}x${i}`) * area.w;
        const y = area.y + random(`${seed}y${i}`) * area.h;
        const rot = (random(`${seed}r${i}`) - 0.5) * 70;
        const s = 0.7 + random(`${seed}s${i}`) * 1;
        const enter = enterBase + Math.floor(random(`${seed}e${i}`) * 20);
        if (frame < enter) return null;
        const step = Math.floor((frame - enter) / 5);
        const wob = (random(`${seed}w${i}-${step}`) - 0.5) * 6;
        const common: React.CSSProperties = {
          position: 'absolute',
          left: x,
          top: y,
          transform: `rotate(${rot + wob}deg) scale(${s})`,
          filter: 'drop-shadow(2px 3px 0 rgba(34,30,24,0.2))',
        };
        if (kind === 0) {
          return (
            <div
              key={i}
              style={{
                ...common,
                width: 0,
                height: 0,
                borderLeft: '22px solid transparent',
                borderRight: '22px solid transparent',
                borderBottom: `38px solid ${col}`,
              }}
            />
          );
        }
        if (kind === 1) {
          return <div key={i} style={{...common, width: 26, height: 26, borderRadius: '50%', background: col}} />;
        }
        if (kind === 2) {
          return (
            <svg key={i} width={70} height={26} style={common}>
              <polyline
                points="0,20 14,6 28,20 42,6 56,20 70,6"
                fill="none"
                stroke={col}
                strokeWidth={7}
                strokeLinecap="round"
              />
            </svg>
          );
        }
        return (
          <div key={i} style={{...common, fontSize: 46, fontWeight: 900, color: col}}>
            !!
          </div>
        );
      })}
    </>
  );
};

// 紙のギザギザ集中線バースト
export const PaperBurst: React.FC<{cx: number; cy: number; color?: string; n?: number; r0?: number; r1?: number}> = ({
  cx,
  cy,
  color = PAPER.white,
  n = 16,
  r0 = 240,
  r1 = 420,
}) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 4);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: n}).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + (random(`pb${i}-${step}`) - 0.5) * 0.04;
        const rr1 = r1 + (random(`pbr${i}-${step}`) - 0.5) * 40;
        const w = 0.10 + random(`pbw${i}`) * 0.08;
        const x0 = cx + Math.cos(a - w) * r0;
        const y0 = cy + Math.sin(a - w) * r0;
        const x1 = cx + Math.cos(a) * rr1;
        const y1 = cy + Math.sin(a) * rr1;
        const x2 = cx + Math.cos(a + w) * r0;
        const y2 = cy + Math.sin(a + w) * r0;
        return <polygon key={i} points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`} fill={color} opacity={0.95} />;
      })}
    </svg>
  );
};

// ギザギザの丸シール（チェックなど）
export const PaperSeal: React.FC<{
  size?: number;
  color?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({size = 190, color = PAPER.red, children, style}) => (
  <div style={{filter: 'drop-shadow(4px 6px 0 rgba(34,30,24,0.25))', width: size, height: size, ...style}}>
    <svg width={size} height={size} viewBox="-95 -95 190 190">
      <g fill={color}>
        {Array.from({length: 14}).map((_, i) => (
          <polygon key={i} points="0,-92 12,-70 -12,-70" transform={`rotate(${(i / 14) * 360})`} />
        ))}
        <circle r={74} />
      </g>
    </svg>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children ?? (
        <svg width={size * 0.5} height={size * 0.5} viewBox="-50 -50 100 100">
          <polyline points="-30,2 -8,24 34,-24" fill="none" stroke={PAPER.white} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  </div>
);

// 紙のリング（デジブレの輪の切り絵版）
export const PaperRing: React.FC<{size?: number; color?: string; seed?: string; style?: React.CSSProperties}> = ({
  size = 260,
  color = PAPER.blue,
  seed = 'ring',
  style,
}) => {
  const w = useWobble(seed, 1);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${size * 0.16}px solid ${color}`,
        transform: `rotate(${w.rot}deg)`,
        filter: 'drop-shadow(5px 7px 0 rgba(34,30,24,0.25))',
        ...style,
      }}
    />
  );
};

// 紙の吹き出し（しっぽ付き）
export const SpeechBubble: React.FC<{
  seed?: string;
  width: number;
  height: number;
  tail?: 'left' | 'right';
  color?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({seed = 'sb', width, height, tail = 'left', color = PAPER.white, style, children}) => (
  <div style={{position: 'relative', width, height: height + 34, ...style}}>
    <TornPaper seed={seed} color={color} roughness={8} style={{width, height}}>
      {children}
    </TornPaper>
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: tail === 'left' ? 60 : undefined,
        right: tail === 'right' ? 60 : undefined,
        width: 0,
        height: 0,
        borderLeft: '26px solid transparent',
        borderRight: '26px solid transparent',
        borderTop: `36px solid ${color}`,
        transform: `skewX(${tail === 'left' ? -18 : 18}deg)`,
        filter: 'drop-shadow(3px 4px 0 rgba(34,30,24,0.2))',
      }}
    />
  </div>
);

// 下部の字幕（参考動画準拠: 白文字＋影）
export const CollageSub: React.FC<{text: string; enter?: number}> = ({text, enter = 0}) => {
  const frame = useCurrentFrame();
  if (frame < enter) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 46,
        width: '100%',
        textAlign: 'center',
        fontSize: 37,
        fontWeight: 700,
        color: '#FFFFFF',
        textShadow: '2px 2px 0 rgba(34,30,24,0.85), -2px 2px 0 rgba(34,30,24,0.85), 2px -2px 0 rgba(34,30,24,0.85), -2px -2px 0 rgba(34,30,24,0.85)',
        lineHeight: 1.55,
        whiteSpace: 'pre-line',
      }}
    >
      {text}
    </div>
  );
};
