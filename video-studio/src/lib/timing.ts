import { Easing, interpolate } from 'remotion';

// 全シーン共通のイージング。CSSの ease-out ではなく
// expo系の強い減速を使うことで「海外編集」のキレを出す。
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

// delayフレーム後にdurフレームかけて0→1になる進行度
export const progress = (frame: number, delay: number, dur: number): number =>
  interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });

// フェード+下からスライドの定番エントランス
export const fadeUp = (
  frame: number,
  delay: number,
  dur = 18,
  distance = 40
): { opacity: number; transform: string } => {
  const p = progress(frame, delay, dur);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * distance}px)`,
  };
};

// インパクト系: 少し大きい状態から締まる
export const impactIn = (
  frame: number,
  delay: number,
  dur = 16
): { opacity: number; transform: string } => {
  const p = progress(frame, delay, dur);
  return {
    opacity: Math.min(1, p * 2),
    transform: `scale(${1.12 - 0.12 * p})`,
  };
};

// 終盤のフェードアウト(シーン内で使う場合)
export const fadeOutAtEnd = (
  frame: number,
  durationInFrames: number,
  fadeFrames = 10
): number =>
  interpolate(
    frame,
    [durationInFrames - fadeFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
