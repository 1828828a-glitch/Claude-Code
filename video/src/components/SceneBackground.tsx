import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { isLight } from "../lib/color";
import type { Palette } from "../theme/tokens";

export type BackgroundKind =
  /** 単色 + わずかなグラデーション */
  | "plain"
  /** 中心から広がる放射（集中線の下地） */
  | "radial"
  /** 斜めストライプがゆっくり流れる */
  | "stripes"
  /** 方眼。図解・データ系の下地 */
  | "grid"
  /** 集中線。ツッコミ・驚きの演出 */
  | "burst"
  /** 和紙のテクスチャ風 */
  | "washi";

export type SceneBackgroundProps = {
  palette: Palette;
  kind?: BackgroundKind;
  /** アニメーションの速度倍率 */
  speed?: number;
  /** フィルムグレインを乗せる */
  grain?: boolean;
  children?: React.ReactNode;
};

/**
 * シーンの下地。
 *
 * 単色べた塗りだと一気に「安っぽく」見えるので、
 * 微細なテクスチャか動きを必ず入れるのが基本方針。
 */
export const SceneBackground: React.FC<SceneBackgroundProps> = ({
  palette,
  kind = "plain",
  speed = 1,
  grain = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const t = frame * speed;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${palette.bg} 0%, ${palette.bgDeep} 100%)`,
        overflow: "hidden",
      }}
    >
      {kind === "radial" ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 45%, ${palette.accent}22 0%, transparent 60%)`,
            transform: `scale(${1 + Math.sin(t * 0.02) * 0.06})`,
          }}
        />
      ) : null}

      {kind === "stripes" ? (
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${palette.fg}0d 0px, ${palette.fg}0d 28px, transparent 28px, transparent 76px)`,
            backgroundPosition: `${(t * 1.4) % 152}px 0`,
          }}
        />
      ) : null}

      {kind === "grid" ? (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${palette.fg}12 1px, transparent 1px), linear-gradient(90deg, ${palette.fg}12 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
            backgroundPosition: `${(t * 0.3) % 80}px ${(t * 0.3) % 80}px`,
            maskImage: "radial-gradient(circle at 50% 50%, black 40%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 40%, transparent 85%)",
          }}
        />
      ) : null}

      {kind === "burst" ? <Burst palette={palette} frame={t} /> : null}

      {kind === "washi" ? (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(${palette.fgMuted}18 1px, transparent 1px), radial-gradient(${palette.fgMuted}12 1px, transparent 1px)`,
            backgroundSize: "7px 7px, 13px 13px",
            backgroundPosition: "0 0, 4px 6px",
            opacity: 0.9,
          }}
        />
      ) : null}

      {children}

      {/* 四隅を落として中央に視線を集める。明るい配色で濃くかけると
          全体がくすんで安っぽくなるので、背景の明るさで強さを変える */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${
            isLight(palette.bg) ? 0.12 : 0.38
          }) 100%)`,
          pointerEvents: "none",
        }}
      />

      {grain ? (
        <Grain frame={frame} opacity={isLight(palette.bg) ? 0.03 : 0.055} />
      ) : null}
    </AbsoluteFill>
  );
};

/** 集中線 */
const Burst: React.FC<{ palette: Palette; frame: number }> = ({
  palette,
  frame,
}) => {
  const rays = 48;
  const rotation = frame * 0.15;
  const scale = interpolate(frame % 60, [0, 60], [1, 1.15]);

  return (
    <AbsoluteFill
      style={{
        transform: `rotate(${rotation}deg) scale(${scale * 1.6})`,
        maskImage: "radial-gradient(circle, transparent 22%, black 55%)",
        WebkitMaskImage: "radial-gradient(circle, transparent 22%, black 55%)",
      }}
    >
      <svg viewBox="-100 -100 200 200" style={{ width: "100%", height: "100%" }}>
        {Array.from({ length: rays }).map((_, i) => {
          const a = (i / rays) * Math.PI * 2;
          const width = i % 3 === 0 ? 1.8 : 0.8;
          return (
            <line
              key={i}
              x1={Math.cos(a) * 18}
              y1={Math.sin(a) * 18}
              x2={Math.cos(a) * 140}
              y2={Math.sin(a) * 140}
              stroke={palette.fg}
              strokeWidth={width}
              opacity={0.18}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * フィルムグレイン。SVG の feTurbulence を使い、
 * フレームごとに seed を変えてざらつきを animate する。
 */
const Grain: React.FC<{ frame: number; opacity: number }> = ({
  frame,
  opacity,
}) => (
  <AbsoluteFill style={{ opacity, pointerEvents: "none", mixBlendMode: "overlay" }}>
    <svg style={{ width: "100%", height: "100%" }}>
      <filter id={`grain-${frame % 6}`}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves={3}
          seed={frame % 6}
        />
      </filter>
      <rect
        width="100%"
        height="100%"
        filter={`url(#grain-${frame % 6})`}
      />
    </svg>
  </AbsoluteFill>
);
