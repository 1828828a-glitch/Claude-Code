import React from "react";
import { palette } from "../theme";
import { randRange } from "../anim";

/**
 * 手でちぎった紙の縁を clip-path で作る。
 * seed から形を決めるので、同じ seed なら毎回まったく同じ形になる。
 */
const tornEdge = (seed: number, steps = 14, roughness = 1.4): string => {
  const points: string[] = [];
  // 上辺（左→右）
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    points.push(`${x.toFixed(2)}% ${randRange(seed + i, 0, roughness).toFixed(2)}%`);
  }
  // 右辺（上→下）
  for (let i = 1; i < 4; i++) {
    const y = (i / 4) * 100;
    points.push(`${(100 - randRange(seed + 40 + i, 0, roughness * 0.6)).toFixed(2)}% ${y.toFixed(2)}%`);
  }
  // 下辺（右→左）
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * 100;
    points.push(`${x.toFixed(2)}% ${(100 - randRange(seed + 80 + i, 0, roughness)).toFixed(2)}%`);
  }
  // 左辺（下→上）
  for (let i = 3; i >= 1; i--) {
    const y = (i / 4) * 100;
    points.push(`${randRange(seed + 120 + i, 0, roughness * 0.6).toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${points.join(", ")})`;
};

/** 紙に貼るマスキングテープ。 */
export const Tape: React.FC<{
  angle?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ angle = -18, width = 150, height = 46, style }) => (
  <div
    style={{
      position: "absolute",
      width,
      height,
      background: palette.tape,
      opacity: 0.92,
      transform: `rotate(${angle}deg)`,
      boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
      clipPath: tornEdge(7, 6, 5),
      ...style,
    }}
  />
);

export type PaperProps = {
  children?: React.ReactNode;
  /** 紙の色。省略時はクリーム色。 */
  color?: string;
  /** ちぎれ具合と形を決める種。カードごとに変えると同じ形が続かない。 */
  seed?: number;
  /** 紙の傾き（度）。 */
  angle?: number;
  padding?: string;
  style?: React.CSSProperties;
  shadow?: boolean;
};

/**
 * 切り貼りコラージュの基本パーツ。テロップ・見出し・注釈はすべてこの上に乗る。
 */
export const Paper: React.FC<PaperProps> = ({
  children,
  color = palette.paper,
  seed = 1,
  angle = 0,
  padding = "18px 40px",
  style,
  shadow = true,
}) => (
  <div
    style={{
      position: "relative",
      display: "inline-block",
      background: color,
      padding,
      clipPath: tornEdge(seed),
      transform: `rotate(${angle}deg)`,
      filter: shadow ? "drop-shadow(0 10px 18px rgba(0,0,0,0.28))" : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * 紙の質感（ざらつき）を画面全体に薄くかける。
 * 乗せるだけでフラットな色面が印刷物っぽくなる。
 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.16 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity,
      mixBlendMode: "multiply",
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='4'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='0.5'/></svg>\")",
    }}
  />
);

/** 画面の四隅をわずかに落として、中央に視線を集める。 */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.35 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);
