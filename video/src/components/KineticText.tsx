import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { EASE, SPRING, stagger } from "../lib/timing";
import { toChunks } from "../lib/text";
import { spring } from "remotion";

export type KineticMode =
  /** 1文字ずつ下から突き上げる。最も汎用的 */
  | "riseUp"
  /** 拡大しながらポンと出る。強調ワード向け */
  | "pop"
  /** タイプライター。文字が順に「現れる」だけ */
  | "typewriter"
  /** ぼけから合焦。しっとりした導入に */
  | "focus"
  /** 波打つ。ポップな見出し */
  | "wave"
  /** 横からスライドイン。番組OPのクレジット向け */
  | "slideIn";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type KineticTextProps = {
  text: string;
  mode?: KineticMode;
  /** アニメーション開始フレーム */
  delay?: number;
  /** 文字間のずらし幅（フレーム） */
  staggerFrames?: number;
  /**
   * このシーンに残されたフレーム数。渡すと、その中で必ず全文字が
   * 出そろうように stagger とバネの長さを自動で詰める。
   * 短いカットで「最後の文字が出る前にシーンが終わる」のを防ぐ。
   */
  budgetFrames?: number;
  style?: React.CSSProperties;
  /** 1文字ごとに追加するスタイル（色替えなど） */
  charStyle?: (char: string, index: number) => React.CSSProperties;
};

/**
 * 文字単位で動くテキスト。いわゆるキネティックタイポグラフィ。
 *
 * 台本のテキストに `/` を入れると、その単位（文節）でまとめて動く。
 * 例: "もう/戻れない" → 「もう」「戻れない」の2ブロック
 */
export const KineticText: React.FC<KineticTextProps> = ({
  text,
  mode = "riseUp",
  delay = 0,
  staggerFrames = 3,
  budgetFrames,
  style,
  charStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = toChunks(text).filter((chunk) => chunk !== "");

  // 表示に使える尺が短いときは、ずらし幅とバネの長さを縮めて収める
  const visibleCount = chunks.filter((chunk) => chunk !== "\n").length || 1;
  const budget = budgetFrames === undefined ? undefined : budgetFrames - delay;
  const step =
    budget === undefined
      ? staggerFrames
      : clamp(Math.floor((budget * 0.55) / visibleCount), 1, staggerFrames);
  const springFrames =
    budget === undefined ? 24 : clamp(Math.round(budget * 0.45), 8, 24);

  let visibleIndex = 0;

  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        justifyContent: style?.textAlign === "left" ? "flex-start" : "center",
        alignItems: "baseline",
        ...style,
      }}
    >
      {chunks.map((chunk, i) => {
        // 1文字ずつ分割したときの改行は、flex の行送りとして扱う
        if (chunk === "\n") {
          return (
            <span
              key={`br-${i}`}
              style={{ flexBasis: "100%", height: 0 }}
              aria-hidden
            />
          );
        }

        // 改行は「間」を取らないので、遅延は表示される文字だけで数える
        const order = visibleIndex;
        visibleIndex += 1;

        const localDelay = delay + stagger(order, step);
        const t = frame - localDelay;

        const progress = spring({
          frame: t,
          fps,
          config: mode === "pop" ? SPRING.bouncy : SPRING.soft,
          durationInFrames: mode === "wave" ? undefined : springFrames,
        });

        const transform: string[] = [];
        let opacity = progress;
        let filter: string | undefined;

        if (mode === "riseUp") {
          transform.push(`translateY(${(1 - progress) * 0.9}em)`);
        } else if (mode === "pop") {
          transform.push(`scale(${interpolate(progress, [0, 1], [0.3, 1])})`);
        } else if (mode === "typewriter") {
          // フレーム進行に対して離散的に出す。半端な透明度を作らない
          opacity = t >= 0 ? 1 : 0;
        } else if (mode === "focus") {
          const blur = interpolate(progress, [0, 1], [14, 0]);
          filter = `blur(${blur}px)`;
          transform.push(`scale(${interpolate(progress, [0, 1], [1.12, 1])})`);
        } else if (mode === "wave") {
          const settled = interpolate(t, [0, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE.out,
          });
          opacity = settled;
          const bob = Math.sin((frame - localDelay) * 0.18) * 6 * settled;
          transform.push(`translateY(${(1 - settled) * 40 - bob}px)`);
        } else if (mode === "slideIn") {
          const dir = i % 2 === 0 ? -1 : 1;
          transform.push(`translateX(${(1 - progress) * 60 * dir}px)`);
        }

        return (
          <span
            key={`${chunk}-${i}`}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity,
              transform: transform.join(" ") || undefined,
              filter,
              willChange: "transform, opacity, filter",
              ...charStyle?.(chunk, i),
            }}
          >
            {chunk}
          </span>
        );
      })}
    </span>
  );
};
