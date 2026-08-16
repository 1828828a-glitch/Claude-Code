import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { KineticText } from "../components/KineticText";
import { Marker, Chip } from "../components/Accents";
import { Telop } from "../components/Telop";
import { EASE, springIn, stagger } from "../lib/timing";
import { useFitFontSize, useSafeArea, useSized } from "../lib/layout";
import { useSceneDuration } from "../lib/sceneContext";
import { toLines } from "../lib/text";
import { FONT_DISPLAY, FONT_SANS, FONT_SERIF } from "../theme/fonts";
import type { Palette } from "../theme/tokens";
import type { z } from "zod";
import type {
  titleSceneSchema,
  statementSceneSchema,
  narrationSceneSchema,
  quoteSceneSchema,
  outroSceneSchema,
} from "../lib/schema";

type P = { palette: Palette };

const useStage = () => {
  const safe = useSafeArea();
  const s = useSized();
  return {
    padding: `${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px`,
    s,
  };
};

/** 冒頭・章タイトル */
export const TitleScene: React.FC<
  P & { scene: z.infer<typeof titleSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const budget = useSceneDuration();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const linePos = springIn({ frame, fps, delay: 6, preset: "heavy" });

  return (
    <AbsoluteFill
      style={{
        padding,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {scene.chip ? (
        <Chip
          label={scene.chip}
          palette={palette}
          style={{ fontSize: s(28), fontFamily: FONT_SANS, marginBottom: s(28) }}
        />
      ) : null}

      <KineticText
        text={scene.title}
        mode="riseUp"
        staggerFrames={2}
        budgetFrames={budget}
        style={{
          fontFamily: FONT_SERIF,
          fontSize: fit(scene.title, 120),
          fontWeight: 900,
          color: palette.fg,
          lineHeight: 1.15,
          letterSpacing: "0.02em",
        }}
      />

      <div
        style={{
          width: `${interpolate(linePos, [0, 1], [0, 26])}%`,
          height: s(6),
          background: palette.accent,
          margin: `${s(30)}px 0`,
        }}
      />

      {scene.subtitle ? (
        <KineticText
          text={scene.subtitle}
          mode="focus"
          delay={14}
          staggerFrames={1}
          budgetFrames={budget}
          style={{
            fontFamily: FONT_SANS,
            fontSize: fit(scene.subtitle, 40),
            fontWeight: 700,
            color: palette.fgMuted,
            letterSpacing: "0.1em",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** 決め台詞。全画面キネティックタイポ */
export const StatementScene: React.FC<
  P & { scene: z.infer<typeof statementSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const budget = useSceneDuration();
  const lines = toLines(scene.text);
  const emphasis = scene.emphasis ?? [];
  // 行ごとに縮めるとサイズが揃わないので、最も長い行に合わせて全行同じサイズにする
  const fontSize = fit(scene.text, 96);

  return (
    <AbsoluteFill
      style={{
        padding,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        flexDirection: "column",
        gap: s(14),
      }}
    >
      {lines.map((line, i) => (
        <KineticText
          key={i}
          text={line}
          mode={scene.mode ?? "riseUp"}
          delay={stagger(i, 8)}
          staggerFrames={2}
          budgetFrames={budget}
          style={{
            fontFamily: FONT_SANS,
            fontSize,
            fontWeight: 900,
            color: palette.fg,
            lineHeight: 1.25,
          }}
          charStyle={(char) =>
            emphasis.some((word) => word.includes(char))
              ? { color: palette.accent }
              : {}
          }
        />
      ))}
    </AbsoluteFill>
  );
};

/** 画像 + テロップの基本カット */
export const NarrationScene: React.FC<
  P & { scene: z.infer<typeof narrationSceneSchema> }
> = ({ scene, palette }) => {
  const s = useSized();
  const fit = useFitFontSize();

  // 画像がある場合、テロップは下に。無い場合は中央に大きく置く
  const hasImage = Boolean(scene.image);

  return (
    <AbsoluteFill>
      <Telop
        text={scene.text}
        palette={palette}
        position={hasImage ? "bottom" : "center"}
        fontSize={fit(scene.text, hasImage ? 58 : 76)}
        emphasis={scene.emphasis}
        outlineWidth={hasImage ? s(6) : 0}
        style={hasImage ? undefined : { padding: "0 12%" }}
      />
    </AbsoluteFill>
  );
};

/** 引用・史料 */
export const QuoteScene: React.FC<
  P & { scene: z.infer<typeof quoteSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const budget = useSceneDuration();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn({ frame, fps, delay: 4, preset: "soft" });

  return (
    <AbsoluteFill
      style={{
        padding,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontSize: s(160),
          color: palette.accent,
          lineHeight: 0.6,
          opacity: p * 0.5,
          marginBottom: s(20),
        }}
      >
        「
      </div>

      <KineticText
        text={scene.text}
        mode="typewriter"
        delay={8}
        staggerFrames={2}
        budgetFrames={budget}
        style={{
          fontFamily: FONT_SERIF,
          fontSize: fit(scene.text, 64, 0.8),
          fontWeight: 600,
          color: palette.fg,
          lineHeight: 1.7,
          textAlign: "center",
          maxWidth: "80%",
        }}
      />

      {scene.source ? (
        <div
          style={{
            marginTop: s(40),
            fontFamily: FONT_SANS,
            fontSize: s(30),
            color: palette.fgMuted,
            letterSpacing: "0.08em",
            opacity: interpolate(frame, [24, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE.out,
            }),
          }}
        >
          — {scene.source}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 締め・CTA */
export const OutroScene: React.FC<
  P & { scene: z.infer<typeof outroSceneSchema> }
> = ({ scene, palette }) => {
  const { padding, s } = useStage();
  const fit = useFitFontSize();
  const budget = useSceneDuration();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn({ frame, fps, delay: 18, preset: "bouncy" });

  return (
    <AbsoluteFill
      style={{
        padding,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        textAlign: "center",
      }}
    >
      <KineticText
        text={scene.text}
        mode="riseUp"
        staggerFrames={2}
        budgetFrames={budget}
        style={{
          fontFamily: FONT_SANS,
          fontSize: fit(scene.text, 80),
          fontWeight: 900,
          color: palette.fg,
          lineHeight: 1.3,
        }}
      />

      {scene.cta ? (
        <div
          style={{
            marginTop: s(52),
            padding: `${s(20)}px ${s(52)}px`,
            border: `${s(4)}px solid ${palette.accent}`,
            borderRadius: 999,
            fontFamily: FONT_DISPLAY,
            fontSize: s(44),
            fontWeight: 900,
            color: palette.accent,
            letterSpacing: "0.06em",
            opacity: p,
            transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
          }}
        >
          <Marker color={`${palette.accent}22`} delay={30}>
            {scene.cta}
          </Marker>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
