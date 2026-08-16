import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { textOutline } from "../lib/text";
import { EASE, springIn } from "../lib/timing";
import { FONT_SANS } from "../theme/fonts";
import type { Palette } from "../theme/tokens";

export type TelopProps = {
  text: string;
  palette: Palette;
  /** 画面のどこに置くか */
  position?: "bottom" | "center" | "top";
  fontSize?: number;
  fontFamily?: string;
  /** 縁取りの太さ。0 で縁なし */
  outlineWidth?: number;
  /** 帯を敷く（帯付きテロップ） */
  band?: boolean;
  delay?: number;
  /** 強調したい部分。text 内に含まれていればその範囲だけ色が変わる */
  emphasis?: string[];
  style?: React.CSSProperties;
};

/**
 * 日本語のテロップ（字幕）。
 *
 * 実写でもアニメでも読めるように、縁取り + 影を標準で入れている。
 * `emphasis` に単語を渡すとその部分だけアクセント色になる。
 */
export const Telop: React.FC<TelopProps> = ({
  text,
  palette,
  position = "bottom",
  fontSize = 64,
  fontFamily = FONT_SANS,
  outlineWidth = 6,
  band = false,
  delay = 0,
  emphasis = [],
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = springIn({ frame, fps, delay, preset: "snappy" });
  const slide = interpolate(progress, [0, 1], [24, 0]);

  const align: React.CSSProperties =
    position === "bottom"
      ? { bottom: "8%", top: "auto" }
      : position === "top"
        ? { top: "8%", bottom: "auto" }
        : { top: "50%", bottom: "auto", transform: "translateY(-50%)" };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 6%",
        ...align,
        ...style,
      }}
    >
      <div
        style={{
          opacity: progress,
          transform: `translateY(${slide}px)`,
          background: band ? palette.fg : undefined,
          color: band ? palette.bg : palette.fg,
          padding: band ? "0.3em 0.8em" : undefined,
          borderRadius: band ? 8 : undefined,
          fontFamily,
          fontSize,
          fontWeight: 900,
          lineHeight: 1.35,
          letterSpacing: "0.02em",
          textAlign: "center",
          textShadow: band
            ? undefined
            : `${textOutline(palette.stroke, outlineWidth)}, 0 6px 18px rgba(0,0,0,0.45)`,
          whiteSpace: "pre-wrap",
        }}
      >
        {splitEmphasis(text, emphasis).map((part, i) => (
          <span
            key={i}
            style={
              part.emphasized
                ? {
                    color: palette.highlight,
                    // 強調部だけ少し遅れて色が乗る
                    filter: `saturate(${interpolate(
                      frame,
                      [delay + 4, delay + 14],
                      [0.2, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: EASE.out,
                      },
                    )})`,
                  }
                : undefined
            }
          >
            {part.text}
          </span>
        ))}
      </div>
    </div>
  );
};

type Part = { text: string; emphasized: boolean };

/**
 * emphasis に指定された語で文字列を分割する。
 * 長い語から先に処理して、部分一致で短い語に食われないようにする。
 */
export const splitEmphasis = (text: string, emphasis: string[]): Part[] => {
  const words = emphasis.filter(Boolean).sort((a, b) => b.length - a.length);
  if (words.length === 0) return [{ text, emphasized: false }];

  let parts: Part[] = [{ text, emphasized: false }];

  for (const word of words) {
    const next: Part[] = [];
    for (const part of parts) {
      if (part.emphasized || !part.text.includes(word)) {
        next.push(part);
        continue;
      }
      const segments = part.text.split(word);
      segments.forEach((segment, i) => {
        if (segment) next.push({ text: segment, emphasized: false });
        if (i < segments.length - 1) next.push({ text: word, emphasized: true });
      });
    }
    parts = next;
  }

  return parts;
};
