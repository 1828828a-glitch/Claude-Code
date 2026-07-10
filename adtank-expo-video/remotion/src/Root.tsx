import React from "react";
import { Composition } from "remotion";
import { DigibureExpo } from "./DigibureExpo";
import { DURATION_S, FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DigibureExpo"
    component={DigibureExpo}
    durationInFrames={DURATION_S * FPS}
    fps={FPS}
    width={W}
    height={H}
  />
);
