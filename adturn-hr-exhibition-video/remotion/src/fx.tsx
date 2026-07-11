import React from 'react';
import {interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, GRADIENT} from './theme';

// ── 文字単位のキネティックタイポ（ブラー＋スプリングで1文字ずつ立ち上がる） ──
export const KineticChars: React.FC<{
  text: string;
  delay: number;
  stagger?: number;
  style?: React.CSSProperties;
  gradientRange?: [number, number]; // このindex範囲の文字をグラデーションに
}> = ({text, delay, stagger = 2.2, style, gradientRange}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chars = Array.from(text);
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', ...style}}>
      {chars.map((ch, i) => {
        const d = delay + i * stagger;
        const s = spring({frame: frame - d, fps, config: {damping: 16, stiffness: 140, mass: 0.6}});
        const o = interpolate(frame - d, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const blur = interpolate(frame - d, [0, 10], [14, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const grad =
          gradientRange && i >= gradientRange[0] && i <= gradientRange[1]
            ? {
                background: GRADIENT,
                WebkitBackgroundClip: 'text' as const,
                backgroundClip: 'text' as const,
                color: 'transparent',
              }
            : {};
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              opacity: o,
              filter: `blur(${blur}px)`,
              transform: `translateY(${(1 - s) * 60}px) scale(${0.8 + 0.2 * s})`,
              ...grad,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ── 浮遊パーティクル（決定論的乱数・上方ドリフト・明滅・中心収束オプション） ──
export const Particles: React.FC<{
  count?: number;
  seed?: string;
  color?: string;
  maxSize?: number;
  baseOpacity?: number;
  pull?: number; // 0..1 中心への収束率
}> = ({count = 40, seed = 'p', color = 'rgba(139,92,246,0.55)', maxSize = 10, baseOpacity = 0.8, pull = 0}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      {Array.from({length: count}).map((_, i) => {
        const rx = random(`${seed}x${i}`);
        const ry = random(`${seed}y${i}`);
        const rs = random(`${seed}s${i}`);
        const rp = random(`${seed}p${i}`);
        const speed = 0.25 + rs * 0.55;
        const x0 = rx * width;
        const y0 = ((ry * height - frame * speed) % height + height) % height;
        const x = x0 + (width / 2 - x0) * pull;
        const y = y0 + (height / 2 - y0) * pull;
        const size = 3 + rs * maxSize;
        const tw = 0.45 + 0.55 * Math.sin(frame / (14 + rp * 20) + rp * 6.28);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              opacity: baseOpacity * tw,
              filter: 'blur(1px)',
            }}
          />
        );
      })}
    </div>
  );
};

// ── ニューラルネットワーク（ノード＋エッジ描画＋信号パルス走行） ──
export const NeuralNet: React.FC<{
  cx: number;
  cy: number;
  radius: number;
  nodes?: number;
  seed?: string;
  drawStart?: number; // エッジ描画開始フレーム
  drawDur?: number;
  stroke?: string;
  nodeColor?: string;
  opacity?: number;
}> = ({cx, cy, radius, nodes = 14, seed = 'nn', drawStart = 0, drawDur = 60, stroke = 'rgba(122,104,255,0.5)', nodeColor = '#8B5CF6', opacity = 1}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pts = Array.from({length: nodes}).map((_, i) => {
    const a = (i / nodes) * Math.PI * 2 + random(`${seed}a${i}`) * 0.9;
    const r = radius * (0.55 + random(`${seed}r${i}`) * 0.55);
    const wob = Math.sin(frame / 40 + i * 1.7) * 10;
    return {
      x: cx + Math.cos(a) * (r + wob),
      y: cy + Math.sin(a) * (r * 0.82 + wob),
    };
  });
  // 各ノードから近い2ノードへエッジ
  const edges: Array<[number, number]> = [];
  pts.forEach((p, i) => {
    const dists = pts
      .map((q, j) => ({j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2}))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    dists.forEach(({j}) => {
      if (!edges.some(([a, b]) => (a === j && b === i) || (a === i && b === j))) {
        edges.push([i, j]);
      }
    });
  });
  return (
    <svg
      style={{position: 'absolute', inset: 0, opacity}}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {edges.map(([a, b], k) => {
        const p = pts[a];
        const q = pts[b];
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        const prog = interpolate(frame, [drawStart + k * 2, drawStart + k * 2 + drawDur * 0.5], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        // 信号パルス（描画完了後にエッジ上を走る光点）
        const pt = ((frame * (0.008 + random(`${seed}v${k}`) * 0.01) + random(`${seed}o${k}`)) % 1);
        const px = p.x + (q.x - p.x) * pt;
        const py = p.y + (q.y - p.y) * pt;
        return (
          <g key={k}>
            <line
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={stroke}
              strokeWidth={2}
              strokeDasharray={len}
              strokeDashoffset={len * (1 - prog)}
            />
            {prog >= 1 && (
              <circle cx={px} cy={py} r={4} fill="#B9AFFF" opacity={0.9} />
            )}
          </g>
        );
      })}
      {pts.map((p, i) => {
        const o = interpolate(frame, [drawStart + i * 3, drawStart + i * 3 + 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const pulse = 1 + 0.25 * Math.sin(frame / 10 + i * 2.1);
        return <circle key={i} cx={p.x} cy={p.y} r={5 * pulse} fill={nodeColor} opacity={o * 0.9} />;
      })}
    </svg>
  );
};

// ── 3Dチルトイン（perspective + rotateYで飛び込むカード） ──
export const TiltIn: React.FC<{
  delay: number;
  dir?: 1 | -1;
  float?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({delay, dir = 1, float = true, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 17, stiffness: 90, mass: 0.9}});
  const o = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hover = float ? Math.sin((frame - delay) / 26) * 6 : 0;
  return (
    <div style={{perspective: 1200, ...style}}>
      <div
        style={{
          opacity: o,
          transform: `translateX(${dir * (1 - s) * 120}px) translateY(${hover}px) rotateY(${dir * (1 - s) * 28}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ── SVGチェックマークのストローク描画 ──
export const DrawCheck: React.FC<{delay: number; size?: number}> = ({delay, size = 44}) => {
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [delay, delay + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const len = 60;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: GRADIENT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 50 50">
        <polyline
          points="10,27 21,38 41,14"
          fill="none"
          stroke="#fff"
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - prog)}
        />
      </svg>
    </div>
  );
};

// ── 放射バースト（ロゴ登場の後光） ──
export const RadialBurst: React.FC<{delay: number; color?: string}> = ({delay, color = 'rgba(99,102,241,0.5)'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 22, stiffness: 60}});
  const o = interpolate(frame - delay, [0, 6, 30, 55], [0, 1, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {Array.from({length: 14}).map((_, i) => {
        const a = (i / 14) * 360;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 5,
              height: 150 + (i % 3) * 70,
              background: `linear-gradient(${color}, transparent)`,
              opacity: o,
              transform: `rotate(${a}deg) translateY(${-220 - s * 260}px)`,
              transformOrigin: 'center bottom',
              borderRadius: 4,
            }}
          />
        );
      })}
    </div>
  );
};

// ── シャインスイープ（テキストの上を光が走る） ──
export const ShineText: React.FC<{
  text: string;
  delay: number;
  period?: number;
  style?: React.CSSProperties;
}> = ({text, delay, period = 90, style}) => {
  const frame = useCurrentFrame();
  const t = frame < delay ? 0 : (((frame - delay) % period) / period) * 260 - 80;
  return (
    <div style={{position: 'relative', ...style}}>
      {text}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(105deg, transparent ${t - 14}%, rgba(255,255,255,0.85) ${t}%, transparent ${t + 14}%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          pointerEvents: 'none',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ── オドメーター（数字が回転しながらカウントアップ） ──
export const Odometer: React.FC<{
  value: number; // 連続値（例: 0→40の補間値）
  fontSize: number;
  color?: string;
  gradient?: boolean;
}> = ({value, fontSize, gradient}) => {
  const H = fontSize * 1.08;
  const digits = [Math.min(value / 10, 9.999), value % 10]; // 十の位・一の位
  const textStyle: React.CSSProperties = gradient
    ? {background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}
    : {color: COLORS.ink};
  return (
    <div style={{display: 'flex', overflow: 'hidden', height: H, alignItems: 'flex-start'}}>
      {digits.map((d, col) => (
        <div key={col} style={{position: 'relative', height: H, overflow: 'hidden'}}>
          <div style={{transform: `translateY(${-d * H}px)`}}>
            {Array.from({length: 11}).map((_, n) => (
              <div
                key={n}
                style={{
                  height: H,
                  lineHeight: `${H}px`,
                  fontSize,
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                  ...textStyle,
                }}
              >
                {n % 10}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── 戦略レポートの誌面モック（行が書き込まれていくアニメーション付き） ──
export const ReportDoc: React.FC<{
  delay: number;
  width: number;
  height: number;
  header?: string; // 左上の小見出し（例: 戦略レポート｜p.21）
  title?: string; // 中央の大きめタイトル（扇状カード用）
  lineCount?: number;
  seed?: string;
  glow?: boolean;
  fontSize?: number;
}> = ({delay, width, height, header, title, lineCount = 9, seed = 'doc', glow, fontSize = 26}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cardIn = spring({frame: frame - delay, fps, config: {damping: 16, stiffness: 110, mass: 0.8}});
  const bob = Math.sin((frame - delay) / 32) * 6;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 14,
        background: '#FFFFFF',
        padding: '26px 30px',
        boxShadow: glow
          ? '0 0 60px rgba(185,175,255,0.55), 0 0 140px rgba(99,102,241,0.35)'
          : '0 18px 50px rgba(11,16,32,0.16)',
        opacity: Math.min(cardIn * 1.3, 1),
        transform: `translateY(${(1 - cardIn) * 60 + bob}px) scale(${0.9 + cardIn * 0.1})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {header && (
        <>
          <div style={{fontSize, fontWeight: 900, color: COLORS.ink}}>{header}</div>
          <div style={{height: 8}} />
          <div style={{height: 3, background: COLORS.ink, opacity: 0.85}} />
          <div style={{height: 16}} />
        </>
      )}
      {title && (
        <>
          <div
            style={{
              fontSize: fontSize * 1.15,
              fontWeight: 900,
              color: COLORS.ink,
              textAlign: 'center',
              lineHeight: 1.35,
              whiteSpace: 'pre-line',
              minHeight: fontSize * 3.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {title}
          </div>
          <div style={{height: 10}} />
          <div style={{height: 6, borderRadius: 4, background: GRADIENT}} />
          <div style={{height: 18}} />
        </>
      )}
      {Array.from({length: lineCount}).map((_, i) => {
        const w = 50 + random(`${seed}w${i}`) * 45;
        const isBlue = i % 3 === 2; // 3行に1本だけ青（強調行）
        const lineIn = interpolate(frame, [delay + 10 + i * 4, delay + 22 + i * 4], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              height: height * 0.032,
              minHeight: 7,
              borderRadius: 5,
              marginBottom: height * 0.035,
              width: `${w}%`,
              background: isBlue ? GRADIENT : '#D3D7E3',
              transform: `scaleX(${lineIn})`,
              transformOrigin: 'left',
            }}
          />
        );
      })}
    </div>
  );
};

// ── グラデーションの下線スイープ ──
export const Underline: React.FC<{delay: number; width?: number | string}> = ({delay, width = '100%'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  return (
    <div
      style={{
        width,
        height: 10,
        borderRadius: 6,
        background: GRADIENT,
        transform: `scaleX(${s})`,
        transformOrigin: 'left',
      }}
    />
  );
};
