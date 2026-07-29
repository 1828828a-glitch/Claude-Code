import React from "react";
import { AbsoluteFill } from "remotion";
import { BackdropKind, backdrops, layout, palette } from "../theme";
import { Grain, Vignette } from "./Paper";
import { randRange } from "../anim";

/** 地面の草。地表線に沿ってばらつかせて生やす。 */
const Grass: React.FC<{ y: number; count?: number; seed?: number }> = ({
  y,
  count = 90,
  seed = 3,
}) => (
  <svg
    width={layout.width}
    height={layout.height}
    style={{ position: "absolute", inset: 0 }}
  >
    {Array.from({ length: count }).map((_, i) => {
      const x = (i / count) * layout.width + randRange(seed + i, -8, 8);
      const h = randRange(seed + i * 3, 14, 34);
      const lean = randRange(seed + i * 7, -7, 7);
      return (
        <path
          key={i}
          d={`M ${x} ${y} Q ${x + lean * 0.5} ${y - h * 0.6} ${x + lean} ${y - h}`}
          stroke={i % 4 === 0 ? palette.grassDark : palette.grass}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      );
    })}
  </svg>
);

export type BackdropProps = {
  kind?: BackdropKind;
  /** 地表の高さ（px）。指定すると地面の断面図になる。 */
  groundY?: number;
  grass?: boolean;
  /** 空（地表より上）の色。 */
  skyColor?: string;
  children?: React.ReactNode;
  grain?: number;
  vignette?: number;
};

/**
 * シーンの下地。ベタ塗り／地面の断面／黒板風などをここで切り替える。
 */
export const Backdrop: React.FC<BackdropProps> = ({
  kind = "soil",
  groundY,
  grass = true,
  skyColor = "#d8cdb4",
  children,
  grain = 0.16,
  vignette = 0.22,
}) => {
  const c = backdrops[kind];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.top} 0%, ${c.bottom} 100%)` }}>
      {groundY !== undefined ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              height: groundY,
              background: skyColor,
            }}
          />
          {/* 地表の境目。まっすぐ引かず、わずかに影を落として土の断面に見せる */}
          <div
            style={{
              position: "absolute",
              top: groundY,
              left: 0,
              right: 0,
              height: 14,
              background: `linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0))`,
            }}
          />
          {grass ? <Grass y={groundY + 2} /> : null}
        </>
      ) : null}
      {children}
      <Grain opacity={grain} />
      <Vignette strength={vignette} />
    </AbsoluteFill>
  );
};
