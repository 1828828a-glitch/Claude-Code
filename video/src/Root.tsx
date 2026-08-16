import React from "react";
import { Composition } from "remotion";
import { Storyboard } from "./Storyboard";
import { applyTemplate, dimensionsOf, type TemplateName } from "./templates";
import { buildTimeline } from "./lib/duration";
import { FPS } from "./theme/tokens";

import historyHonnoji from "./scripts/history-honnoji.json";
import openingMidnight from "./scripts/opening-midnight.json";
import shortsAiWork from "./scripts/shorts-ai-work.json";

export type VideoProps = {
  template: TemplateName;
  /** 台本 JSON。src/scripts/*.json の中身をそのまま渡す */
  script: unknown;
};

const VideoRoot: React.FC<VideoProps> = ({ template, script }) => (
  <Storyboard script={applyTemplate(template, script)} />
);

/**
 * 尺と解像度は台本から計算する。
 * 台本を書き換えれば動画の長さも自動で追従するので、
 * durationInFrames を手で直す必要はない。
 */
const calculateMetadata = ({ props }: { props: VideoProps }) => {
  const parsed = applyTemplate(props.template, props.script);
  const { totalFrames } = buildTimeline(parsed, FPS);
  const { width, height } = dimensionsOf(parsed.format);

  return { width, height, fps: FPS, durationInFrames: totalFrames };
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HistoryExplainer"
      component={VideoRoot}
      calculateMetadata={calculateMetadata}
      // calculateMetadata が上書きするが、Composition には初期値が必要
      durationInFrames={300}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        template: "historyExplainer" as TemplateName,
        script: historyHonnoji as unknown,
      }}
    />

    <Composition
      id="TVOpening"
      component={VideoRoot}
      calculateMetadata={calculateMetadata}
      durationInFrames={300}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        template: "tvOpening" as TemplateName,
        script: openingMidnight as unknown,
      }}
    />

    <Composition
      id="FastCutShorts"
      component={VideoRoot}
      calculateMetadata={calculateMetadata}
      durationInFrames={300}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        template: "fastCutShorts" as TemplateName,
        script: shortsAiWork as unknown,
      }}
    />
  </>
);
