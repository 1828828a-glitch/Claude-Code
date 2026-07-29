import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, BackdropProps } from "./Backdrop";
import { Subtitle, TapedTitle, TapedTitleProps } from "./Titles";
import { layout, sec } from "../theme";

export type SceneSpec = {
  /** Studio のタイムラインに出る名前。 */
  id: string;
  /** このカットの長さ（秒）。台本は秒で書いた方が読みやすい。 */
  seconds: number;
  /** 下地。地面の断面にするなら groundY を渡す。 */
  backdrop?: BackdropProps;
  /** テープ留めの見出し。 */
  title?: Omit<TapedTitleProps, "hideAt"> & { hideAt?: number };
  /** 画面下のナレーション帯。 */
  subtitle?: string;
  /** このカットのイラスト。フレーム数を受け取って好きに描く。 */
  art?: (durationInFrames: number) => React.ReactNode;
};

const TRANSITION = 9;

/**
 * 1 カット分の画面。下地 → イラスト → 見出し → テロップの順に重ねる。
 * カットの前後は短くフェードして、紙をめくったようなつなぎになる。
 */
export const Scene: React.FC<{ spec: SceneSpec; durationInFrames: number }> = ({
  spec,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, TRANSITION], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - TRANSITION, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Backdrop {...spec.backdrop}>
        {spec.art ? spec.art(durationInFrames) : null}
      </Backdrop>
      {spec.title ? <TapedTitle {...spec.title} /> : null}
      {spec.subtitle ? <Subtitle text={spec.subtitle} /> : null}
    </AbsoluteFill>
  );
};

/**
 * 台本（カットの配列）を頭から順に並べて 1 本の動画にする。
 * カットの尻を少し重ねているので、切り替わりで黒が挟まらない。
 */
export const Storyboard: React.FC<{ scenes: SceneSpec[] }> = ({ scenes }) => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#141827" }}>
      {scenes.map((scene) => {
        const duration = sec(scene.seconds);
        const from = cursor;
        cursor += duration - TRANSITION;
        return (
          <Sequence key={scene.id} name={scene.id} from={from} durationInFrames={duration}>
            <Scene spec={scene} durationInFrames={duration} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** 台本全体の長さ（フレーム）。Composition の durationInFrames に渡す。 */
export const storyboardDuration = (scenes: SceneSpec[]): number =>
  scenes.reduce((total, scene, i) => total + sec(scene.seconds) - (i === 0 ? 0 : TRANSITION), 0);

export { layout };
