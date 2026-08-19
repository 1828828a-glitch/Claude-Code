import React from "react";
import { AbsoluteFill } from "remotion";
import { KineticText } from "../components/KineticText";
import { ProgressBar } from "../components/ProgressBar";
import { stagger } from "../lib/timing";
import { useFitFontSize, useSafeArea, useSized } from "../lib/layout";
import { useSceneDuration } from "../lib/sceneContext";
import { FONT_SANS } from "../theme/fonts";
import type { Palette } from "../theme/tokens";
import type { z } from "zod";
import type { progressSceneSchema } from "../lib/schema";

/**
 * ゲージを何本か並べて見せるシーン。
 *
 * 数字を1つ大きく出す stat と違い、こちらは「比較」が主役。
 * 複数の項目の差が、棒の長さで一目で分かる。
 */
export const ProgressScene: React.FC<{
  scene: z.infer<typeof progressSceneSchema>;
  palette: Palette;
}> = ({ scene, palette }) => {
  const s = useSized();
  const fit = useFitFontSize();
  const safe = useSafeArea();
  const budget = useSceneDuration();

  // 本数が増えたら1本ずつ細くして、画面からはみ出さないようにする
  const barHeight = Math.min(s(30), s(150) / scene.items.length);

  // 一番長いラベルに全部の幅を合わせる。棒の開始位置を揃えるため
  const longestLabel = scene.items.reduce(
    (max, item) => Math.max(max, Array.from(item.label).length),
    0,
  );
  const labelWidth = longestLabel * barHeight * 1.15;

  return (
    <AbsoluteFill
      style={{
        padding: `${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px`,
        justifyContent: "center",
      }}
    >
      {scene.heading ? (
        <div style={{ marginBottom: s(48) }}>
          <KineticText
            text={scene.heading}
            mode="riseUp"
            staggerFrames={1}
            budgetFrames={budget}
            style={{
              fontFamily: FONT_SANS,
              fontSize: fit(scene.heading, 56),
              fontWeight: 900,
              color: palette.fg,
              justifyContent: "flex-start",
            }}
          />
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: s(38) }}>
        {scene.items.map((item, i) => (
          <ProgressBar
            key={i}
            palette={palette}
            value={item.value}
            label={item.label}
            suffix={item.suffix ?? scene.suffix}
            delay={12 + stagger(i, 8)}
            height={barHeight}
            labelWidth={labelWidth}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
