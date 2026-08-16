import { estimateNarrationSeconds, toChars } from "./text";
import type { Scene, Script } from "./schema";

/**
 * シーンの尺を決める。
 *
 * `durationInSeconds` が台本にあればそれを使う。無ければ
 * 「読み上げにかかる時間」から自動で見積もる。台本を書く側が
 * 尺を意識しなくて済むようにするのが狙い。
 */
export const sceneSeconds = (scene: Scene): number => {
  if (scene.durationInSeconds) return scene.durationInSeconds;

  switch (scene.type) {
    case "title":
      return Math.max(
        2.4,
        estimateNarrationSeconds(scene.title + (scene.subtitle ?? ""), 7) + 0.8,
      );
    case "narration":
      return Math.max(2.0, estimateNarrationSeconds(scene.text));
    case "statement":
      return Math.max(2.2, estimateNarrationSeconds(scene.text, 4.5) + 0.5);
    case "bullets":
      // 1項目ずつ読む時間 + 全部出そろってからの余韻
      return (
        scene.items.reduce(
          (total, item) => total + estimateNarrationSeconds(item, 6, 0.25),
          0,
        ) +
        (scene.heading ? 1.0 : 0.4) +
        0.8
      );
    case "timeline":
      return scene.events.length * 1.15 + 1.4;
    case "compare":
      return (
        Math.max(
          estimateNarrationSeconds(scene.left.text, 6),
          estimateNarrationSeconds(scene.right.text, 6),
        ) +
        1.4
      );
    case "quote":
      return Math.max(3.0, estimateNarrationSeconds(scene.text, 4.5) + 1.2);
    case "stat":
      return 3.0;
    case "logo":
      return 3.2;
    case "credit":
      return Math.max(1.6, scene.names.length * 0.55 + 1.0);
    case "outro":
      return Math.max(3.0, estimateNarrationSeconds(scene.text, 5) + 1.2);
    default: {
      // 新しい scene type を足したときに TypeScript が漏れを教えてくれる
      const exhaustive: never = scene;
      void exhaustive;
      return 3;
    }
  }
};

/** ナレーションの後ろに置く「間」（秒）。言い終わった瞬間に切り替わると忙しない */
export const VOICE_TAIL_SECONDS = 0.45;

/**
 * タイムライン上でそのシーンが占める秒数。
 *
 * ナレーション音声があるカットは、その実測の長さが絶対になる。
 * 声が途中で切れるのが一番みっともないので、pace(全体テンポ)も掛けない。
 * 「絵を長く見せたい」ときのために durationInSeconds が長ければそちらを採る。
 */
export const timelineSeconds = (scene: Scene, pace: number): number => {
  if (scene.voiceSeconds !== undefined) {
    return Math.max(
      scene.voiceSeconds + VOICE_TAIL_SECONDS,
      scene.durationInSeconds ?? 0,
    );
  }

  // まだ音声を作っていないカット。読み上げにかかる時間で仮に見積もっておくと、
  // `npm run voice` を回す前のプレビューでも尺が大きくズレない
  if (scene.voiceText) {
    return Math.max(
      estimateNarrationSeconds(scene.voiceText) + VOICE_TAIL_SECONDS,
      sceneSeconds(scene),
    ) * pace;
  }

  return sceneSeconds(scene) * pace;
};

export type Timing = {
  scene: Scene;
  /** 開始フレーム（トランジションの重なりを考慮済み） */
  from: number;
  durationInFrames: number;
};

/**
 * トランジションで重なるフレーム数。
 * `cut` は重ならないので 0。
 */
export const transitionOverlap = (
  kind: Scene["transition"] | undefined,
  fps: number,
): number => {
  switch (kind) {
    case "cut":
      return 0;
    case "flash":
      return Math.round(fps * 0.12);
    case "fade":
      return Math.round(fps * 0.4);
    case "slide":
      return Math.round(fps * 0.3);
    case "zoom":
      return Math.round(fps * 0.35);
    default:
      return 0;
  }
};

/**
 * 台本全体をフレーム単位のタイムラインに変換する。
 * 動画全体の長さもここから決まる。
 */
export const buildTimeline = (
  script: Script,
  fps: number,
): { timings: Timing[]; totalFrames: number } => {
  const timings: Timing[] = [];
  let cursor = 0;

  script.scenes.forEach((scene, i) => {
    const durationInFrames = Math.max(
      1,
      Math.round(timelineSeconds(scene, script.pace) * fps),
    );
    timings.push({ scene, from: cursor, durationInFrames });

    const isLast = i === script.scenes.length - 1;
    const kind = scene.transition ?? script.transition;
    const overlap = isLast ? 0 : transitionOverlap(kind, fps);
    cursor += durationInFrames - overlap;
  });

  const last = timings[timings.length - 1];
  const totalFrames = last.from + last.durationInFrames;

  return { timings, totalFrames };
};
