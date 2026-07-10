import React from "react";
import { ACCENT, FONT } from "./theme";

/* x を中心に据えた1行テキスト */
export const CenterText: React.FC<{
  x: number;
  top: number;
  size: number;
  weight?: number;
  color: string;
  opacity?: number;
  dy?: number;
  children: React.ReactNode;
}> = ({ x, top, size, weight = 700, color, opacity = 1, dy = 0, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top,
      transform: `translateX(-50%) translateY(${dy}px)`,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: weight,
      color,
      opacity,
      whiteSpace: "nowrap",
      lineHeight: 1.2,
    }}
  >
    {children}
  </div>
);

/* デジブレの丸ロゴ（リング） */
export const Ring: React.FC<{
  cx: number;
  cy: number;
  r: number; // 外半径
  lw: number;
  color?: string;
  opacity?: number;
  scale?: number;
}> = ({ cx, cy, r, lw, color = ACCENT, opacity = 1, scale = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: cx - r,
      top: cy - r,
      width: r * 2,
      height: r * 2,
      border: `${lw}px solid ${color}`,
      borderRadius: "50%",
      boxSizing: "border-box",
      opacity,
      transform: `scale(${scale})`,
    }}
  />
);

/* 特許出願中スタンプ */
export const Stamp: React.FC<{ cx: number; cy: number; k: number; eob: (k: number) => number }> = ({
  cx,
  cy,
  k,
  eob,
}) => {
  if (k <= 0) return null;
  const s = 1.6 - 0.6 * eob(k);
  const a = Math.min(1, k * 2);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - 150,
        top: cy - 46,
        width: 300,
        height: 92,
        border: `6px solid ${ACCENT}`,
        borderRadius: 14,
        boxSizing: "border-box",
        transform: `rotate(-4.6deg) scale(${s})`,
        opacity: a,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: 46,
        fontWeight: 900,
        color: ACCENT,
      }}
    >
      特許出願中
    </div>
  );
};
