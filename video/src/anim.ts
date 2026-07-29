import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 紙を「ぱっ」と置いたときの跳ね。行き過ぎて戻るくらいが紙らしく見える。
 */
export const usePop = (delay = 0, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.6, stiffness: 140 } });
};

/** 0→1 のなめらかなフェード。end を渡すと終わり際に 1→0 まで戻す。 */
export const useFade = (delay = 0, duration = 12, holdUntil?: number) => {
  const frame = useCurrentFrame();
  const inValue = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  if (holdUntil === undefined) return inValue;
  const outValue = interpolate(frame, [holdUntil, holdUntil + duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  return Math.min(inValue, outValue);
};

/** 指定方向からスライドインする距離（px）。 */
export const useSlide = (delay = 0, distance = 80, damping = 14) => {
  const progress = usePop(delay, damping);
  return interpolate(progress, [0, 1], [distance, 0]);
};

/** 一定間隔で要素を順番に出すときの遅延フレーム。 */
export const stagger = (index: number, every = 4, offset = 0) => offset + index * every;

/**
 * ふわふわとした揺れ。乱数を使わず frame から決めるので、
 * 何度レンダリングしても同じ絵になる。
 */
export const useDrift = (speed = 1, amplitude = 6, phase = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;
  return Math.sin(t * Math.PI * 2 + phase) * amplitude;
};

/** 歩行の上下動。アリや人の足取りに使う。 */
export const useBob = (speed = 6, amplitude = 3, phase = 0) => useDrift(speed, amplitude, phase);

/** シーン全体をゆっくり寄せる（ケン・バーンズ）。単調な画に動きを足す。 */
export const useSlowZoom = (from = 1, to = 1.06, durationInFrames = 150) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, durationInFrames], [from, to], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
};

/** 数字を数え上げる。統計を見せるカット用。 */
export const useCountUp = (to: number, delay = 0, duration = 30) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [delay, delay + duration], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return Math.round(value);
};

/**
 * frame と seed から決まる擬似乱数。0〜1。
 * Math.random() と違ってレンダリングのたびに絵が変わらない。
 */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** seed から min〜max の値を作る。 */
export const randRange = (seed: number, min: number, max: number) =>
  min + rand(seed) * (max - min);
