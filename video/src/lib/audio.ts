import { interpolate } from "remotion";
import type { Timing } from "./duration";

/**
 * BGM の音量カーブを作る。
 *
 * やっていることは3つ:
 *  1. 冒頭と末尾のフェード
 *  2. ナレーションが流れている間の音量下げ（ダッキング）
 *  3. その出入りを滑らかにする
 *
 * 声にBGMを同じ音量で被せると一気に素人っぽくなるので、
 * ダッキングは「あった方がいい」ではなく「無いと成立しない」処理。
 */
export type BgmVolumeOptions = {
  timings: Timing[];
  fps: number;
  totalFrames: number;
  /** 通常時の音量 */
  base: number;
  /** ナレーション中の音量 */
  duck: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  /** 声が始まる何秒前から下げ始めるか */
  leadSeconds?: number;
  /** 声が終わって何秒かけて戻すか */
  releaseSeconds?: number;
};

/** 重なった / 隣接した区間をひとつにまとめる */
const mergeRanges = (ranges: [number, number][]): [number, number][] => {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range] as [number, number]);
    }
  }
  return merged;
};

export const buildBgmVolume = ({
  timings,
  fps,
  totalFrames,
  base,
  duck,
  fadeInSeconds = 1.2,
  fadeOutSeconds = 1.5,
  leadSeconds = 0.35,
  releaseSeconds = 0.6,
}: BgmVolumeOptions): ((frame: number) => number) => {
  const frames: number[] = [];
  const values: number[] = [];

  // interpolate は frames が単調増加である必要がある。
  // 詰まった区間で順序が壊れないよう、必ずこの関数を通して積む
  const push = (frame: number, value: number) => {
    const clamped = Math.max(0, Math.min(totalFrames, Math.round(frame)));
    const lastFrame = frames[frames.length - 1];
    if (lastFrame === undefined) {
      frames.push(clamped);
      values.push(value);
      return;
    }
    if (clamped <= lastFrame) {
      // 同じ位置に来たら、より小さい方（＝声を優先して下げる方）を残す
      values[values.length - 1] = Math.min(values[values.length - 1], value);
      return;
    }
    frames.push(clamped);
    values.push(value);
  };

  const voiceRanges = mergeRanges(
    timings
      .filter(({ scene }) => scene.voiceSeconds !== undefined && scene.voiceFile)
      .map(({ scene, from }): [number, number] => [
        from,
        from + Math.round((scene.voiceSeconds as number) * fps),
      ]),
  );

  push(0, 0);
  push(fadeInSeconds * fps, base);

  for (const [start, end] of voiceRanges) {
    push(start - leadSeconds * fps, base);
    push(start, duck);
    push(end, duck);
    push(end + releaseSeconds * fps, base);
  }

  push(totalFrames - fadeOutSeconds * fps, base);
  push(totalFrames, 0);

  // 点が足りないと interpolate が落ちるので、その場合は定数として扱う
  if (frames.length < 2) return () => base;

  return (frame: number) =>
    interpolate(frame, frames, values, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
};
