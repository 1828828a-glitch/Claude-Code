import React from "react";
import { Composition } from "remotion";
import { DigibureExpo } from "./DigibureExpo";
import { QuestionsStandard } from "./questions/QuestionsStandard";
import { QuestionsBold } from "./questions/QuestionsBold";
import { Q_DURATION } from "./questions/timeline";
import { DURATION_S, FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DigibureExpo"
      component={DigibureExpo}
      durationInFrames={DURATION_S * FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    {/* 台本v3（問い連打型）パターン①: スタンダード洗練 */}
    <Composition
      id="QuestionsStandard"
      component={QuestionsStandard}
      durationInFrames={Q_DURATION * FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    {/* 台本v3（問い連打型）パターン②: 突飛・アイキャッチ */}
    <Composition
      id="QuestionsBold"
      component={QuestionsBold}
      durationInFrames={Q_DURATION * FPS}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);
