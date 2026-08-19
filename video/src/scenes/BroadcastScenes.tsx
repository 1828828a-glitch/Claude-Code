import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { KineticText } from "../components/KineticText";
import { FrameBorder } from "../components/Accents";
import { EASE, springIn, stagger } from "../lib/timing";
import { useFitFontSize, useSafeArea, useSized } from "../lib/layout";
import { useSceneDuration } from "../lib/sceneContext";
import { FONT_DISPLAY, FONT_SANS } from "../theme/fonts";
import type { Palette } from "../theme/tokens";
import type { z } from "zod";
import type { logoSceneSchema, creditSceneSchema } from "../lib/schema";

type P = { palette: Palette };

/**
 * 番組タイトルのロゴカード。
 *
 * OP で一番目を引くカットなので、
 * ①光の走り ②文字の着地 ③枠線の締め の3層を重ねている。
 */
export const LogoScene: React.FC<
  P & { scene: z.infer<typeof logoSceneSchema> }
> = ({ scene, palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = useSized();
  const fit = useFitFontSize();
  const budget = useSceneDuration();
  const safe = useSafeArea();

  const land = springIn({ frame, fps, delay: 2, preset: "heavy" });

  // ロゴの上を光が左から右に走る
  const shinePos = interpolate(frame, [14, 36], [-40, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.expo,
  });

  return (
    <AbsoluteFill
      style={{
        padding: `${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `scale(${interpolate(land, [0, 1], [1.6, 1])})`,
          opacity: land,
        }}
      >
        {scene.logoImage ? (
          // 画像ロゴ。文字ロゴと同じ動き（拡大からの着地 + 光の走り）を共有する
          <Img
            src={staticFile(scene.logoImage)}
            style={{
              maxWidth: s(1100),
              maxHeight: s(560),
              objectFit: "contain",
              filter: `drop-shadow(0 0 ${s(50)}px ${palette.accent}55)`,
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: fit(scene.title, 170, 0.92),
              fontWeight: 900,
              color: palette.fg,
              letterSpacing: "0.04em",
              lineHeight: 1.05,
              textAlign: "center",
              // 台本の "\n" をそのまま改行として扱う
              whiteSpace: "pre-line",
              textShadow: `0 0 ${s(60)}px ${palette.accent}66`,
            }}
          >
            {scene.title}
          </div>
        )}

        {/* 光沢 */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(105deg, transparent ${shinePos - 12}%, ${palette.fg}cc ${shinePos}%, transparent ${shinePos + 12}%)`,
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }}
        />
      </div>

      {scene.tagline ? (
        <div style={{ marginTop: s(36) }}>
          <KineticText
            text={scene.tagline}
            mode="slideIn"
            delay={22}
            staggerFrames={1}
            budgetFrames={budget}
            style={{
              fontFamily: FONT_SANS,
              fontSize: s(38),
              fontWeight: 700,
              color: palette.accent,
              letterSpacing: "0.28em",
            }}
          />
        </div>
      ) : null}

      <FrameBorder palette={palette} delay={30} inset={s(56)} thickness={s(4)} />
    </AbsoluteFill>
  );
};

/**
 * 出演者・スタッフのクレジット。
 * 役割ラベル → 名前 の順に、素早くスライドインさせる。
 */
export const CreditScene: React.FC<
  P & { scene: z.infer<typeof creditSceneSchema> }
> = ({ scene, palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = useSized();
  const fit = useFitFontSize();
  const safe = useSafeArea();

  const rolePos = springIn({ frame, fps, delay: 0, preset: "snappy" });
  const nameFontSize = Math.min(...scene.names.map((n) => fit(n, 72)));

  return (
    <AbsoluteFill
      style={{
        padding: `${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px`,
        justifyContent: "center",
        alignItems: "flex-start",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: s(18),
          marginBottom: s(22),
          opacity: rolePos,
          transform: `translateX(${interpolate(rolePos, [0, 1], [-50, 0])}px)`,
        }}
      >
        <div
          style={{
            width: s(10),
            height: s(38),
            background: palette.accent,
            transform: "skewX(-12deg)",
          }}
        />
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: s(32),
            fontWeight: 700,
            color: palette.accent,
            letterSpacing: "0.24em",
          }}
        >
          {scene.role}
        </div>
      </div>

      {scene.names.map((name, i) => {
        const delay = 6 + stagger(i, 5);
        const p = springIn({ frame, fps, delay, preset: "snappy" });
        return (
          <div
            key={i}
            style={{
              fontFamily: FONT_SANS,
              fontSize: nameFontSize,
              fontWeight: 900,
              color: palette.fg,
              lineHeight: 1.35,
              opacity: p,
              transform: `translateX(${interpolate(p, [0, 1], [-70, 0])}px) skewX(${interpolate(p, [0, 1], [-10, 0])}deg)`,
            }}
          >
            {name}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
