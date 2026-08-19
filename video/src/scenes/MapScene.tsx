import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { KineticText } from "../components/KineticText";
import { ProgressBar } from "../components/ProgressBar";
import { EASE, stagger } from "../lib/timing";
import { featureToPath, fitProjection, type MapData } from "../lib/geo";
import { useFitFontSize, useSafeArea, useSized } from "../lib/layout";
import { useSceneDuration } from "../lib/sceneContext";
import { FONT_SANS } from "../theme/fonts";
import type { Palette } from "../theme/tokens";
import type { z } from "zod";
import type { mapSceneSchema } from "../lib/schema";

/**
 * 地図に色を塗って見せるシーン。
 *
 * 「どこが」「どれだけ」を言葉で説明せずに一目で分からせる部品。
 * 参考にした解説動画で一番効いていたのがこれだった。
 */
export const MapScene: React.FC<{
  scene: z.infer<typeof mapSceneSchema>;
  palette: Palette;
}> = ({ scene, palette }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = useSized();
  const fit = useFitFontSize();
  const safe = useSafeArea();
  const budget = useSceneDuration();

  const [data, setData] = useState<MapData | null>(null);
  const [handle] = useState(() => delayRender("地図データ読み込み中"));

  useEffect(() => {
    let cancelled = false;
    fetch(staticFile(scene.geo))
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${scene.geo}`);
        return res.json();
      })
      .then((json: MapData) => {
        if (cancelled) return;
        setData(json);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
    return () => {
      cancelled = true;
    };
  }, [handle, scene.geo]);

  const hasProgress = Boolean(scene.progress);
  const headingSpace = scene.heading ? s(120) : 0;
  const progressSpace = hasProgress ? s(140) : 0;

  const mapWidth = width - safe.left - safe.right;
  const mapHeight = height - safe.top - safe.bottom - headingSpace - progressSpace;

  const projected = useMemo(() => {
    if (!data) return null;

    // 寄る対象を決める。highlight 指定なら塗る地域だけに合わせる
    const names = new Set(scene.highlight);
    const fitTo =
      scene.focus === "highlight" && names.size > 0
        ? data.features.filter((f) => names.has(f.name))
        : data.features;

    const { project } = fitProjection(
      data.features,
      mapWidth * scene.zoom,
      mapHeight * scene.zoom,
      0,
      fitTo,
    );
    return data.features.map((feature) => ({
      name: feature.name,
      d: featureToPath(feature, project),
    }));
  }, [data, mapWidth, mapHeight, scene.focus, scene.zoom, scene.highlight]);

  // 塗る場所と、塗る順番。台本の並び順に1つずつ色が乗る
  const highlightOrder = useMemo(
    () => new Map(scene.highlight.map((name, i) => [name, i])),
    [scene.highlight],
  );

  if (!projected) return null;

  return (
    <AbsoluteFill
      style={{
        padding: `${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px`,
        justifyContent: "center",
      }}
    >
      {scene.heading ? (
        <div style={{ height: headingSpace, display: "flex", alignItems: "center" }}>
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

      <svg
        width={mapWidth}
        height={mapHeight}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        // 寄ったときに画面外へ出た地域は切り落とす
        style={{ overflow: "hidden" }}
      >
        {projected.map((feature) => {
          const order = highlightOrder.get(feature.name);
          const isHighlighted = order !== undefined;

          // 塗られる地域だけ、順番に色が乗っていく
          const lit = isHighlighted
            ? interpolate(
                frame,
                [10 + stagger(order, 3), 10 + stagger(order, 3) + 10],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: EASE.out,
                },
              )
            : 0;

          return (
            <path
              key={feature.name}
              d={feature.d}
              fill={isHighlighted ? palette.accent : `${palette.fg}1a`}
              fillOpacity={isHighlighted ? 0.25 + lit * 0.75 : 1}
              stroke={palette.bgDeep}
              strokeWidth={s(1.2)}
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {scene.progress ? (
        <div style={{ height: progressSpace, display: "flex", alignItems: "center" }}>
          <ProgressBar
            palette={palette}
            value={scene.progress.value}
            label={scene.progress.label}
            suffix={scene.progress.suffix}
            delay={16}
            height={s(26)}
          />
        </div>
      ) : null}

      {scene.attribution ? (
        <div
          style={{
            position: "absolute",
            right: safe.right,
            bottom: safe.bottom * 0.35,
            fontFamily: FONT_SANS,
            fontSize: s(18),
            color: palette.fgMuted,
            opacity: 0.85,
          }}
        >
          {scene.attribution}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
