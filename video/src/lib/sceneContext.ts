import { createContext, useContext } from "react";

/**
 * 現在のシーンの尺（フレーム数）。
 *
 * Remotion の useVideoConfig() は Sequence の中でもコンポジション全体の
 * 長さを返すため、「このカットに何フレーム残っているか」は別途配る必要がある。
 * アニメーションを尺に収めるための予算として各シーンが参照する。
 */
export const SceneDurationContext = createContext<number | undefined>(undefined);

export const useSceneDuration = (): number | undefined =>
  useContext(SceneDurationContext);
