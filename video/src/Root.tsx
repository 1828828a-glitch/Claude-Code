import React from "react";
import { Composition } from "remotion";
import { Storyboard, storyboardDuration } from "./components/Scene";
import { antsStoryboard } from "./storyboards/ants";
import { layout } from "./theme";

const AntsVideo: React.FC = () => <Storyboard scenes={antsStoryboard} />;

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
  </>
);
