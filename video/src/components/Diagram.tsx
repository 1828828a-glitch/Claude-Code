import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Easing } from "remotion";
import { fonts, layout, palette } from "../theme";
import { Pt, pointAt, samplePath, smoothPath } from "../path";
import { usePop } from "../anim";

/**
 * 巣穴のトンネル。制御点を並べるだけで、そこに線が «掘られていく»。
 */
export const Tunnel: React.FC<{
  points: Pt[];
  width?: number;
  color?: string;
  /** 掘り進む演出の開始フレームと長さ。0 を渡すと最初から全部見えている。 */
  delay?: number;
  duration?: number;
  tension?: number;
}> = ({ points, width = 34, color = palette.soilDeep, delay = 0, duration = 40, tension = 0.5 }) => {
  const frame = useCurrentFrame();
  const { total } = samplePath(points, tension);
  const progress =
    duration === 0
      ? 1
      : interpolate(frame, [delay, delay + duration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });

  return (
    <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
      <path
        d={smoothPath(points, tension)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={total}
        strokeDashoffset={total * (1 - progress)}
      />
    </svg>
  );
};

/** 巣の «部屋»。トンネルの節目に置くと、一気に巣らしくなる。 */
export const Chamber: React.FC<{
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  color?: string;
  delay?: number;
  children?: React.ReactNode;
}> = ({ x, y, rx = 90, ry = 48, color = palette.soilDeep, delay = 0, children }) => {
  const pop = usePop(delay, 14);
  return (
    <>
      <svg
        width={layout.width}
        height={layout.height}
        style={{ position: "absolute", inset: 0 }}
      >
        <ellipse cx={x} cy={y} rx={rx * pop} ry={ry * pop} fill={color} />
      </svg>
      {children ? (
        <div style={{ position: "absolute", left: x, top: y, opacity: pop }}>{children}</div>
      ) : null}
    </>
  );
};

/**
 * 深さのものさし。数字を添えるだけでスケール感が出る。
 */
export const Ruler: React.FC<{
  x: number;
  top: number;
  bottom: number;
  labels: string[];
  color?: string;
  delay?: number;
}> = ({ x, top, bottom, labels, color = palette.paper, delay = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {labels.map((label, i) => {
        const y = top + ((bottom - top) * i) / Math.max(1, labels.length - 1);
        const appear = interpolate(frame, [delay + i * 3, delay + i * 3 + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              display: "flex",
              alignItems: "center",
              gap: 16,
              opacity: appear,
              transform: `translateX(${(1 - appear) * -20}px) translateY(-50%)`,
            }}
          >
            <div style={{ width: i === 0 ? 56 : 40, height: 5, background: color, borderRadius: 3 }} />
            <span
              style={{
                fontFamily: fonts.sans,
                fontWeight: i === 0 ? 900 : 700,
                fontSize: i === 0 ? 40 : 34,
                color,
                opacity: i === 0 ? 1 : 0.85,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * 道しるべフェロモンの点線。手前から順に点が灯っていく。
 */
export const DotTrail: React.FC<{
  points: Pt[];
  count?: number;
  color?: string;
  radius?: number;
  delay?: number;
  duration?: number;
  tension?: number;
}> = ({ points, count = 34, color = palette.paper, radius = 7, delay = 0, duration = 45, tension = 0.5 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }).map((_, i) => {
        const t = i / (count - 1);
        const p = pointAt(points, t, tension);
        const lit = interpolate(progress, [t - 0.08, t], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return <circle key={i} cx={p.x} cy={p.y} r={radius * lit} fill={color} opacity={0.55 + lit * 0.45} />;
      })}
    </svg>
  );
};

/**
 * パスの上を進む «乗り物»。中身に何を入れてもよい（アリ・葉・人）。
 * t=0 が始点、t=1 が終点。進行方向に自動で傾く。
 */
export const Walker: React.FC<{
  points: Pt[];
  t: number;
  tension?: number;
  /** 進行方向に合わせて傾けるか。 */
  align?: boolean;
  children: React.ReactNode;
}> = ({ points, t, tension = 0.5, align = true, children }) => {
  const p = pointAt(points, t, tension);
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: 0,
        height: 0,
        transform: `rotate(${align ? p.angle : 0}deg)`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * 行列。パスの上を等間隔で歩き続け、端では薄くなって入れ替わる。
 * 全員が終点に着いて団子になる、という失敗を避けるためのもの。
 */
export const Marchers: React.FC<{
  points: Pt[];
  count: number;
  /** 1 匹がパスを渡りきるフレーム数。大きいほどゆっくり。 */
  periodInFrames: number;
  delay?: number;
  tension?: number;
  align?: boolean;
  /** i 番目に何を歩かせるか。 */
  render: (index: number) => React.ReactNode;
}> = ({ points, count, periodInFrames, delay = 0, tension = 0.5, align = false, render }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const raw = (frame - delay) / periodInFrames + i / count;
        const t = ((raw % 1) + 1) % 1;
        // 出入りをフェードさせると、端でのワープが «巣に入った» ように見える
        const opacity = Math.min(
          interpolate(t, [0, 0.06], [0, 1], { extrapolateRight: "clamp" }),
          interpolate(t, [0.9, 0.99], [1, 0], { extrapolateLeft: "clamp" }),
        );
        return (
          <Walker key={i} points={points} t={t} tension={tension} align={align}>
            <div style={{ opacity }}>{render(i)}</div>
          </Walker>
        );
      })}
    </>
  );
};

/** 画面座標に «中心» を合わせて置く。イラストの配置はこれで統一する。 */
export const At: React.FC<{
  x: number;
  y: number;
  angle?: number;
  scale?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ x, y, angle = 0, scale = 1, opacity = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`,
      opacity,
    }}
  >
    {children}
  </div>
);

/**
 * 光の玉（エサ・卵など）。フェロモンのカットで «目的地» を示す。
 */
export const Glow: React.FC<{ x: number; y: number; r?: number; color?: string; delay?: number }> = ({
  x,
  y,
  r = 18,
  color = palette.grass,
  delay = 0,
}) => {
  const pop = usePop(delay, 10);
  return (
    <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
      <circle cx={x} cy={y} r={r * 2.2 * pop} fill={color} opacity={0.18} />
      <circle cx={x} cy={y} r={r * pop} fill={color} />
    </svg>
  );
};
