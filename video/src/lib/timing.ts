/**
 * タイミングとイージングのプリセット。
 *
 * 「気持ちいいアニメーション」の正体はほぼイージングとディレイなので、
 * ここを共通化しておくとテンプレート間で質感が揃う。
 */
import { Easing, spring } from "remotion";

/** バネのプリセット。用途で選ぶだけにする */
export const SPRING = {
  /** ふわっと出す。テロップの標準 */
  soft: { damping: 200, mass: 0.6, stiffness: 100 },
  /** きびきび。UI パーツ向け */
  snappy: { damping: 30, mass: 0.4, stiffness: 220 },
  /** ぷるっと跳ねる。ポップな強調 */
  bouncy: { damping: 12, mass: 0.7, stiffness: 180 },
  /** 重く沈む。タイトルの着地 */
  heavy: { damping: 40, mass: 2.2, stiffness: 140 },
} as const;

export type SpringName = keyof typeof SPRING;

/** 0→1 のバネ進行度 */
export const springIn = ({
  frame,
  fps,
  delay = 0,
  preset = "soft",
  durationInFrames,
}: {
  frame: number;
  fps: number;
  delay?: number;
  preset?: SpringName;
  durationInFrames?: number;
}) =>
  spring({
    frame: frame - delay,
    fps,
    config: SPRING[preset],
    durationInFrames,
  });

/** 標準のイージング（外部から Easing を import させない） */
export const EASE = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  /** 行き過ぎて戻る。ロゴの着地に効く */
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  /** 一気に立ち上がって止まる。カット感を出す */
  expo: Easing.bezier(0.16, 1, 0.3, 1),
} as const;

export type EaseName = keyof typeof EASE;

/**
 * リストを順番に出すためのディレイ。
 * stagger(i) を delay に渡すだけで連鎖アニメーションになる。
 */
export const stagger = (index: number, framesBetween = 4) =>
  index * framesBetween;

/** 手ブレ風の微小な揺れ。決定的（frame から一意）なので再現性がある */
export const handheld = (frame: number, amplitude = 4, speed = 0.08) => ({
  x: Math.sin(frame * speed) * amplitude + Math.sin(frame * speed * 2.7) * amplitude * 0.3,
  y: Math.cos(frame * speed * 1.3) * amplitude + Math.cos(frame * speed * 3.1) * amplitude * 0.25,
  rotate: Math.sin(frame * speed * 0.7) * amplitude * 0.05,
});
