import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { KineticText } from "../components/KineticText";
import { CountUp, Marker } from "../components/Accents";
import { EASE, springIn, stagger } from "../lib/timing";
import { useFitFontSize, useSafeArea, useSized } from "../lib/layout";
import { useSceneDuration } from "../lib/sceneContext";
import { FONT_DISPLAY, FONT_SANS, FONT_SERIF } from "../theme/fonts";
import type { Palette } from "../theme/tokens";
import type { z } from "zod";
import type {
  bulletsSceneSchema,
  timelineSceneSchema,
  compareSceneSchema,
  statSceneSchema,
} from "../lib/schema";

type P = { palette: Palette };

const useStage = () => {
  const safe = useSafeArea();
  return {
    padding: `${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px`,
    s: useSized(),
  };
};

/** 見出し（各データシーンで共通の体裁） */
const Heading: React.FC<P & { text: string; baseSize: number }> = ({
  text,
  palette,
  baseSize,
}) => {
  const size = useFitFontSize()(text, baseSize);
  const budget = useSceneDuration();
  return (
    <div style={{ marginBottom: size * 0.7 }}>
      <KineticText
        text={text}
        mode="riseUp"
        staggerFrames={1}
        budgetFrames={budget}
        style={{
          fontFamily: FONT_SANS,
          fontSize: size,
          fontWeight: 900,
          color: palette.fg,
          justifyContent: "flex-start",
        }}
      />
    </div>
  );
};

/** 箇条書きの順次表示 */
export const BulletsScene: React.FC<
  P & { scene: z.infer<typeof bulletsSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headOffset = scene.heading ? 18 : 4;

  // 連番チップの分だけ幅が減るので 0.86。全項目で同じサイズに揃える
  const itemFontSize = Math.min(
    ...scene.items.map((item) => fit(item, 48, 0.86)),
  );

  return (
    <AbsoluteFill style={{ padding, justifyContent: "center" }}>
      {scene.heading ? (
        <Heading text={scene.heading} palette={palette} baseSize={56} />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: s(26) }}>
        {scene.items.map((item, i) => {
          const delay = headOffset + stagger(i, 12);
          const p = springIn({ frame, fps, delay, preset: "snappy" });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: s(24),
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: s(52),
                  height: s(52),
                  borderRadius: 12,
                  background: palette.accent,
                  color: palette.bg,
                  fontFamily: FONT_DISPLAY,
                  fontSize: s(30),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${interpolate(p, [0, 1], [0.4, 1])}) rotate(${interpolate(p, [0, 1], [-25, 0])}deg)`,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: itemFontSize,
                  fontWeight: 700,
                  color: palette.fg,
                  lineHeight: 1.45,
                  paddingTop: s(2),
                }}
              >
                <Marker color={`${palette.highlight}55`} delay={delay + 8}>
                  {item}
                </Marker>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 年表 */
export const TimelineScene: React.FC<
  P & { scene: z.infer<typeof timelineSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headOffset = scene.heading ? 16 : 4;
  const lastDelay = headOffset + stagger(scene.events.length - 1, 14);

  // 年号カラムとガターに幅を取られるぶんを引いて採寸する
  const labelFontSize = Math.min(
    ...scene.events.map((event) => fit(event.label, 42, 0.66)),
  );
  const yearFontSize = Math.min(
    ...scene.events.map((event) => fit(event.year, 46, 0.22)),
  );

  // 縦線は最後の項目が出るタイミングまでに伸びきる
  const lineHeight = interpolate(frame, [headOffset, lastDelay + 14], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.out,
  });

  return (
    <AbsoluteFill style={{ padding, justifyContent: "center" }}>
      {scene.heading ? (
        <Heading text={scene.heading} palette={palette} baseSize={52} />
      ) : null}

      <div style={{ position: "relative", paddingLeft: s(60) }}>
        <div
          style={{
            position: "absolute",
            left: s(19),
            top: s(14),
            width: s(4),
            height: `${lineHeight}%`,
            background: palette.accent,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: s(30) }}>
          {scene.events.map((event, i) => {
            const delay = headOffset + stagger(i, 14);
            const p = springIn({ frame, fps, delay, preset: "snappy" });

            return (
              <div
                key={i}
                style={{
                  // transform を持つ要素は絶対配置の基準になるので、
                  // 丸マーカーはこの行を基準に左のガター側へ出す
                  position: "relative",
                  display: "flex",
                  alignItems: "baseline",
                  gap: s(28),
                  opacity: p,
                  transform: `translateY(${interpolate(p, [0, 1], [22, 0])}px)`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -s(60),
                    top: s(6),
                    width: s(42),
                    height: s(42),
                    borderRadius: "50%",
                    border: `${s(5)}px solid ${palette.accent}`,
                    background: palette.bg,
                    boxSizing: "border-box",
                    transform: `scale(${interpolate(p, [0, 1], [0, 1])})`,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: yearFontSize,
                    color: palette.accent,
                    minWidth: s(180),
                    whiteSpace: "nowrap",
                    letterSpacing: "0.02em",
                  }}
                >
                  {event.year}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: labelFontSize,
                    fontWeight: 700,
                    color: palette.fg,
                    lineHeight: 1.4,
                  }}
                >
                  {event.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 左右2分割の比較 */
export const CompareScene: React.FC<
  P & { scene: z.infer<typeof compareSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const budget = useSceneDuration();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  // 横並びのときは片側が半分の幅しか使えない
  const columnRatio = isVertical ? 0.82 : 0.4;
  const bodyFontSize = Math.min(
    fit(scene.left.text, 38, columnRatio),
    fit(scene.right.text, 38, columnRatio),
  );
  const labelFontSize = Math.min(
    fit(scene.left.label, 40, columnRatio),
    fit(scene.right.label, 40, columnRatio),
  );

  const sides = [
    { data: scene.left, color: palette.accent, delay: 8, dir: -1 },
    { data: scene.right, color: palette.accent2, delay: 16, dir: 1 },
  ];

  return (
    <AbsoluteFill style={{ padding, justifyContent: "center" }}>
      {scene.heading ? (
        <div style={{ textAlign: "center", marginBottom: s(40) }}>
          <KineticText
            text={scene.heading}
            mode="riseUp"
            staggerFrames={1}
            budgetFrames={budget}
            style={{
              fontFamily: FONT_SANS,
              fontSize: s(54),
              fontWeight: 900,
              color: palette.fg,
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          gap: s(32),
          alignItems: "stretch",
        }}
      >
        {sides.map(({ data, color, delay, dir }, i) => {
          const p = springIn({ frame, fps, delay, preset: "snappy" });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                padding: s(36),
                borderRadius: s(18),
                background: `${color}18`,
                borderTop: `${s(8)}px solid ${color}`,
                opacity: p,
                transform: isVertical
                  ? `translateY(${interpolate(p, [0, 1], [40 * dir, 0])}px)`
                  : `translateX(${interpolate(p, [0, 1], [70 * dir, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: labelFontSize,
                  fontWeight: 900,
                  color,
                  marginBottom: s(18),
                }}
              >
                {data.label}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: bodyFontSize,
                  fontWeight: 500,
                  color: palette.fg,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {data.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 数字を1つ大きく見せる */
export const StatScene: React.FC<
  P & { scene: z.infer<typeof statSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn({ frame, fps, delay: 4, preset: "heavy" });

  const digits = `${scene.value.toLocaleString("ja-JP")}${scene.suffix ?? ""}`;

  return (
    <AbsoluteFill
      style={{
        padding,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <CountUp
        to={scene.value}
        delay={6}
        durationInFrames={36}
        suffix={scene.suffix}
        style={{
          fontSize: fit(digits, 280),
          color: palette.accent,
          lineHeight: 1,
          transform: `scale(${interpolate(p, [0, 1], [0.75, 1])})`,
          textShadow: `0 ${s(18)}px ${s(50)}px ${palette.accent}44`,
        }}
      />
      <div
        style={{
          marginTop: s(24),
          fontFamily: FONT_SERIF,
          fontSize: fit(scene.label, 52),
          fontWeight: 600,
          color: palette.fg,
          letterSpacing: "0.06em",
          textAlign: "center",
          opacity: interpolate(frame, [26, 42], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {scene.label}
      </div>
    </AbsoluteFill>
  );
};
