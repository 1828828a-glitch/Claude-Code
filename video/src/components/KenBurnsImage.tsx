import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, handheld } from "../lib/timing";
import { useSceneDuration } from "../lib/sceneContext";

export type KenBurnsDirection =
  | "zoomIn"
  | "zoomOut"
  | "panLeft"
  | "panRight"
  | "panUp"
  | "panDown";

export type KenBurnsImageProps = {
  src: string;
  direction?: KenBurnsDirection;
  /** ズーム量。1.15 なら 15% 寄る */
  intensity?: number;
  /** 手ブレを足す。ドキュメンタリー風になる */
  shake?: boolean;
  /** 上に敷くオーバーレイ色（暗くして文字を読ませる） */
  overlay?: string;
  style?: React.CSSProperties;
};

/**
 * 静止画に動きをつける（Ken Burns 効果）。
 *
 * 解説系アニメは素材が静止画なので、これが入るかどうかで
 * 「動画っぽさ」が大きく変わる。
 */
export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  direction = "zoomIn",
  intensity = 1.18,
  shake = false,
  overlay,
  style,
}) => {
  const frame = useCurrentFrame();
  // このカットの尺いっぱいを使って動かす。Sequence の中でも
  // useVideoConfig() はコンポジション全体の長さを返してしまうため、
  // シーン側から配られた尺を優先する
  const composition = useVideoConfig().durationInFrames;
  const durationInFrames = useSceneDuration() ?? composition;

  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.inOut,
  });

  // pan 系も画面外が出ないよう、常に最低限は拡大しておく
  const baseScale = Math.max(intensity, 1.12);
  const pan = (baseScale - 1) * 50; // % 単位の移動可能量

  let scale = baseScale;
  let x = 0;
  let y = 0;

  switch (direction) {
    case "zoomIn":
      scale = interpolate(t, [0, 1], [1, intensity]);
      break;
    case "zoomOut":
      scale = interpolate(t, [0, 1], [intensity, 1]);
      break;
    case "panLeft":
      x = interpolate(t, [0, 1], [pan, -pan]);
      break;
    case "panRight":
      x = interpolate(t, [0, 1], [-pan, pan]);
      break;
    case "panUp":
      y = interpolate(t, [0, 1], [pan, -pan]);
      break;
    case "panDown":
      y = interpolate(t, [0, 1], [-pan, pan]);
      break;
  }

  const jitter = shake ? handheld(frame, 3) : { x: 0, y: 0, rotate: 0 };

  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x + jitter.x * 0.1}%, ${y + jitter.y * 0.1}%) scale(${scale}) rotate(${jitter.rotate}deg)`,
          willChange: "transform",
        }}
      />
      {overlay ? (
        <AbsoluteFill style={{ background: overlay }} />
      ) : null}
    </AbsoluteFill>
  );
};
