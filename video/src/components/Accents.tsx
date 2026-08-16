import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, springIn } from "../lib/timing";
import type { Palette } from "../theme/tokens";
import { FONT_DISPLAY } from "../theme/fonts";

/**
 * マーカーで引いた下線。左から伸びる。
 * 「ここが重要」を1カット内で示すのに一番安上がりで効く。
 */
export const Marker: React.FC<{
  color: string;
  delay?: number;
  height?: number;
  children: React.ReactNode;
}> = ({ color, delay = 0, height = 0.42, children }) => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [delay, delay + 12], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.expo,
  });

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: "0.02em",
          height: `${height}em`,
          width: `${width}%`,
          background: color,
          borderRadius: 2,
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
};

/**
 * 数字のカウントアップ。統計・年号の提示に使う。
 */
export const CountUp: React.FC<{
  to: number;
  from?: number;
  delay?: number;
  durationInFrames?: number;
  /** 3桁区切りを入れる */
  separator?: boolean;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({
  to,
  from = 0,
  delay = 0,
  durationInFrames = 30,
  separator = true,
  suffix = "",
  style,
}) => {
  const frame = useCurrentFrame();
  const value = interpolate(
    frame,
    [delay, delay + durationInFrames],
    [from, to],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.expo },
  );
  const rounded = Math.round(value);

  return (
    <span
      style={{
        fontFamily: FONT_DISPLAY,
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      {separator ? rounded.toLocaleString("ja-JP") : String(rounded)}
      {suffix}
    </span>
  );
};

/**
 * 画面全体の白（または任意色）フラッシュ。
 * カットの継ぎ目に 3〜4 フレーム挟むだけでテンポが上がる。
 */
export const Flash: React.FC<{
  at?: number;
  durationInFrames?: number;
  color?: string;
}> = ({ at = 0, durationInFrames = 4, color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [at, at + 1, at + durationInFrames],
    [0, 0.85, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  if (opacity <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{ background: color, opacity, pointerEvents: "none" }}
    />
  );
};

/**
 * 画面の縁に走る枠線。番組OPやショートの「締まり」を作る。
 */
export const FrameBorder: React.FC<{
  palette: Palette;
  delay?: number;
  inset?: number;
  thickness?: number;
}> = ({ palette, delay = 0, inset = 40, thickness = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn({ frame, fps, delay, preset: "snappy" });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset,
          border: `${thickness}px solid ${palette.accent}`,
          opacity: p,
          transform: `scale(${interpolate(p, [0, 1], [1.04, 1])})`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * ラベル（カテゴリ・話数などの小さいタグ）。
 */
export const Chip: React.FC<{
  label: string;
  palette: Palette;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ label, palette, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn({ frame, fps, delay, preset: "snappy" });

  return (
    <span
      style={{
        display: "inline-block",
        background: palette.accent,
        color: palette.bg,
        padding: "0.28em 0.9em",
        borderRadius: 999,
        fontWeight: 900,
        letterSpacing: "0.08em",
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
        ...style,
      }}
    >
      {label}
    </span>
  );
};
