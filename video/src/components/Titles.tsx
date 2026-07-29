import React from "react";
import { interpolate } from "remotion";
import { fonts, layout, palette } from "../theme";
import { Paper, Tape } from "./Paper";
import { useFade, usePop } from "../anim";

export type TitlePlacement = "top-left" | "top-center" | "top-right" | "center";

const placementStyle: Record<TitlePlacement, React.CSSProperties> = {
  "top-left": { top: layout.safe, left: layout.safe, alignItems: "flex-start" },
  "top-center": { top: layout.safe, left: 0, right: 0, alignItems: "center" },
  "top-right": { top: layout.safe, right: layout.safe, alignItems: "flex-end" },
  center: { top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" },
};

export type TapedTitleProps = {
  text: string;
  /** 見出しの下に付ける小さな帯（オレンジのシール）。 */
  sub?: string;
  placement?: TitlePlacement;
  delay?: number;
  /** 消える時刻（フレーム）。省略するとシーンの最後まで出しっぱなし。 */
  hideAt?: number;
  fontSize?: number;
  angle?: number;
  seed?: number;
};

/**
 * テープで貼った見出しカード。動画の「今なんの話か」を一目で伝える主役。
 */
export const TapedTitle: React.FC<TapedTitleProps> = ({
  text,
  sub,
  placement = "top-center",
  delay = 4,
  hideAt,
  fontSize = 88,
  angle = -1.6,
  seed = 11,
}) => {
  const pop = usePop(delay, 13);
  const fade = useFade(delay, 8, hideAt);
  const scale = interpolate(pop, [0, 1], [0.86, 1]);
  const lift = interpolate(pop, [0, 1], [26, 0]);

  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        ...placementStyle[placement],
        opacity: fade,
        transform: `translateY(${lift}px) scale(${scale})`,
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <Paper seed={seed} angle={angle} padding="14px 52px">
          <span
            style={{
              fontFamily: fonts.sans,
              fontWeight: 900,
              fontSize,
              color: palette.ink,
              letterSpacing: "0.02em",
              whiteSpace: "pre",
              lineHeight: 1.25,
            }}
          >
            {text}
          </span>
        </Paper>
        <Tape angle={-16} width={132} height={40} style={{ top: -20, left: -34 }} />
      </div>

      {sub ? <StickerLabel text={sub} delay={delay + 8} fontSize={Math.round(fontSize * 0.44)} /> : null}
    </div>
  );
};

export type StickerLabelProps = {
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  textColor?: string;
  angle?: number;
  seed?: number;
  style?: React.CSSProperties;
};

/**
 * 差し色のシール。補足の一言（「ビルなら地下6階」など）を置く。
 */
export const StickerLabel: React.FC<StickerLabelProps> = ({
  text,
  delay = 0,
  fontSize = 40,
  color = palette.accent,
  textColor = palette.paper,
  angle = -1.2,
  seed = 23,
  style,
}) => {
  const pop = usePop(delay, 11);
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  return (
    <div style={{ opacity: pop, transform: `scale(${scale})`, ...style }}>
      <Paper seed={seed} angle={angle} color={color} padding="10px 30px">
        <span
          style={{
            fontFamily: fonts.sans,
            fontWeight: 900,
            fontSize,
            color: textColor,
            whiteSpace: "pre",
          }}
        >
          {text}
        </span>
      </Paper>
    </div>
  );
};

/**
 * 画面下のナレーション帯。全カットに共通で置くことで、
 * 絵が切り替わっても «読むところ» が動かない。
 */
export const Subtitle: React.FC<{ text: string; delay?: number; accent?: string }> = ({
  text,
  delay = 6,
  accent = palette.accent,
}) => {
  const pop = usePop(delay, 15);
  const lift = interpolate(pop, [0, 1], [40, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: layout.safe,
        right: layout.safe,
        bottom: 54,
        display: "flex",
        justifyContent: "center",
        opacity: pop,
        transform: `translateY(${lift}px)`,
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
        <Paper seed={31} angle={-0.4} padding="0">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 16, alignSelf: "stretch", background: accent }} />
            <span
              style={{
                fontFamily: fonts.sans,
                fontWeight: 700,
                fontSize: 40,
                color: palette.ink,
                padding: "22px 44px",
                letterSpacing: "0.01em",
                whiteSpace: "pre",
              }}
            >
              {text}
            </span>
          </div>
        </Paper>
      </div>
    </div>
  );
};
