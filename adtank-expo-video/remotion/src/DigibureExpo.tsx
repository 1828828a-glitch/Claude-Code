import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, BG, FPS } from "./theme";
import { S1Hook } from "./scenes/S1Hook";
import { S2Digibure } from "./scenes/S2Digibure";
import { S3Compare } from "./scenes/S3Compare";
import { S4Technology } from "./scenes/S4Technology";
import { S5Roster } from "./scenes/S5Roster";
import { S6Output } from "./scenes/S6Output";
import { S7CTA } from "./scenes/S7CTA";

/* シーン切替時刻（秒）— Canvas版と同一 */
const CUTS = [0, 7, 15.5, 24.5, 33, 42, 63, 72];
const SCENES = [S1Hook, S2Digibure, S3Compare, S4Technology, S5Roster, S6Output, S7CTA];

/* シーン内で1.0→1.015へ滲むズームドリフト（映像の「呼吸」） */
const ZoomDrift: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const f = useCurrentFrame();
  const k = f / durationInFrames;
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.015 * e})` }}>{children}</AbsoluteFill>
  );
};

export const DigibureExpo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* BGM（合成トラック・フェード込み）とナレーション（タイミング合成済み） */}
      <Audio src={staticFile("bgm.mp3")} volume={0.5} />
      <Audio src={staticFile("narration.mp3")} />
      {/* うっすらグリッドドット */}
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: "radial-gradient(#ecedf2 2px, transparent 2.5px)",
          backgroundSize: "120px 120px",
          backgroundPosition: "80px 80px",
        }}
      />
      {SCENES.map((Scene, i) => {
        const dur = Math.round((CUTS[i + 1] - CUTS[i]) * FPS);
        return (
          <Sequence key={i} from={Math.round(CUTS[i] * FPS)} durationInFrames={dur}>
            <ZoomDrift durationInFrames={dur}>
              <Scene />
            </ZoomDrift>
          </Sequence>
        );
      })}
      {/* 進行インジケータ */}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 8, background: "#e7e8ee" }} />
      <div
        style={{ position: "absolute", left: 0, bottom: 0, height: 8, background: ACCENT,
          width: `${(frame / durationInFrames) * 100}%` }}
      />
    </AbsoluteFill>
  );
};
