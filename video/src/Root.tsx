import React from "react";
import { Composition } from "remotion";
import { Storyboard, storyboardDuration } from "./components/Scene";
import { antsStoryboard } from "./storyboards/ants";
import { deepSeaStoryboard } from "./storyboards/deepsea";
import { layout } from "./theme";

const AntsVideo: React.FC = () => <Storyboard scenes={antsStoryboard} />;
const DeepSeaVideo: React.FC = () => <Storyboard scenes={deepSeaStoryboard} />;

/**
 * 作った動画をここに 1 行ずつ足していく。
 * 台本ファイルを増やして Composition を並べれば、Studio の左側に一覧で出る。
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Ants"
      component={AntsVideo}
      durationInFrames={storyboardDuration(antsStoryboard)}
      fps={layout.fps}
      width={layout.width}
      height={layout.height}
    />
    <Composition
      id="DeepSea"
      component={DeepSeaVideo}
      durationInFrames={storyboardDuration(deepSeaStoryboard)}
      fps={layout.fps}
      width={layout.width}
      height={layout.height}
    />
  </>
);
