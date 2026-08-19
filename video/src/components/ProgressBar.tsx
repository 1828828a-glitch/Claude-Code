import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CountUp } from "./Accents";
import { EASE } from "../lib/timing";
import { FONT_SANS } from "../theme/fonts";
import type { Palette } from "../theme/tokens";

export type ProgressBarProps = {
  palette: Palette;
  /** 0〜100 */
  value: number;
  label?: string;
  suffix?: string;
  delay?: number;
  durationInFrames?: number;
  /** バーの高さ(px)。文字サイズもこれに追従する */
  height: number;
  width?: number | string;
  /**
   * ラベル欄の幅。複数本並べるとき、ここを揃えないと
   * 文字数の違いで棒の開始位置がバラつく。
   */
  labelWidth?: number | string;
};

/**
 * 左から伸びるゲージ。
 *
 * 「あと少しで天下統一」のような、数字だけでは伝わらない
 * 到達度を1カットで見せるための部品。バーの伸びと数字の
 * カウントアップを同じタイミングに揃えているのが肝で、
 * ここがズレると途端に安っぽく見える。
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  palette,
  value,
  label,
  suffix = "%",
  delay = 0,
  durationInFrames = 36,
  height,
  width = "100%",
  labelWidth,
}) => {
  const frame = useCurrentFrame();

  const filled = interpolate(
    frame,
    [delay, delay + durationInFrames],
    [0, Math.max(0, Math.min(100, value))],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.expo },
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: height, width }}>
      {label ? (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: height * 1.15,
            fontWeight: 700,
            color: palette.fg,
            whiteSpace: "nowrap",
            width: labelWidth,
            flexShrink: 0,
          }}
        >
          {label}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          height,
          borderRadius: height / 2,
          background: `${palette.fg}22`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${filled}%`,
            height: "100%",
            borderRadius: height / 2,
            background: `linear-gradient(90deg, ${palette.accent}, ${palette.highlight})`,
            // 先端を少し光らせて「伸びている」感じを出す
            boxShadow: `0 0 ${height}px ${palette.highlight}88`,
          }}
        />
      </div>

      <CountUp
        to={value}
        delay={delay}
        durationInFrames={durationInFrames}
        separator={false}
        suffix={suffix}
        style={{
          fontSize: height * 1.7,
          color: palette.highlight,
          minWidth: height * 4,
          textAlign: "right",
        }}
      />
    </div>
  );
};
