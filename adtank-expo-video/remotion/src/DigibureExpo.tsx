import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, BG, FPS } from "./theme";
import { S1Hook } from "./scenes/S1Hook";
import { S2Digibure } from "./scenes/S2Digibure";
import { S3Compare } from "./scenes/S3Compare";
import { S4Technology } from "./scenes/S4Technology";
import { S5Roster } from "./scenes/S5Roster";
import { S6Output } from "./scenes/S6Output";
import { S7CTA } from "./scenes/S7CTA";

/* シーン切替時刻（秒）— Canvas版と同一 */
const CUTS = [0, 7, 15.5, 24.5, 33, 42, 51.5, 60];
const SCENES = [S1Hook, S2Digibure, S3Compare, S4Technology, S5Roster, S6Output, S7CTA];

export const DigibureExpo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* うっすらグリッドドット */}
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: "radial-gradient(#ecedf2 2px, transparent 2.5px)",
          backgroundSize: "120px 120px",
          backgroundPosition: "80px 80px",
        }}
      />
      {SCENES.map((Scene, i) => (
        <Sequence
          key={i}
          from={Math.round(CUTS[i] * FPS)}
          durationInFrames={Math.round((CUTS[i + 1] - CUTS[i]) * FPS)}
        >
          <Scene />
        </Sequence>
      ))}
      {/* 進行インジケータ */}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 8, background: "#e7e8ee" }} />
      <div
        style={{ position: "absolute", left: 0, bottom: 0, height: 8, background: ACCENT,
          width: `${(frame / durationInFrames) * 100}%` }}
      />
    </AbsoluteFill>
  );
};
