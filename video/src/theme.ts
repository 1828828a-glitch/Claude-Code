import { fontFamily } from "./fonts";

/**
 * 使えるウェイトは 700（本文・テロップ）と 900（見出し）の 2 つ。
 * 絞ってあるのは、日本語フォントは 1 ウェイトで 1MB を超えるため。
 */
export const fonts = {
  sans: fontFamily,
};

/**
 * 紙を切って貼ったような画づくりのためのパレット。
 * 彩度を落とした土・草・紙の 3 系統に、差し色のオレンジを 1 色だけ足している。
 */
export const palette = {
  soil: "#4a3226",
  soilDark: "#33221a",
  soilDeep: "#281a13",
  grass: "#7c9c3f",
  grassDark: "#5f7a2e",
  paper: "#efe7d6",
  paperShade: "#ded3bc",
  tape: "#d9c9a8",
  ink: "#241c17",
  accent: "#e0572a",
  accentDark: "#b8411c",
  chalk: "#2b4a3d",
  chalkDark: "#1f382e",
  clay: "#7a3b20",
  clayDark: "#5e2c17",
  night: "#1e2233",
  nightDark: "#141827",
  gold: "#d9a441",
} as const;

/** 背景の種類。シーンのデータから名前で選ぶ。 */
export type BackdropKind = "soil" | "chalk" | "clay" | "night" | "paper";

export const backdrops: Record<
  BackdropKind,
  { top: string; bottom: string; text: string }
> = {
  soil: { top: palette.soil, bottom: palette.soilDeep, text: palette.paper },
  chalk: { top: palette.chalk, bottom: palette.chalkDark, text: palette.paper },
  clay: { top: palette.clay, bottom: palette.clayDark, text: palette.paper },
  night: { top: palette.night, bottom: palette.nightDark, text: palette.paper },
  paper: { top: palette.paper, bottom: palette.paperShade, text: palette.ink },
};

/** 1920x1080 / 30fps を基準にした寸法。 */
export const layout = {
  width: 1920,
  height: 1080,
  fps: 30,
  safe: 96,
  subtitleHeight: 132,
} as const;

/** 秒をフレーム数に。台本を秒で書けるようにするためのヘルパー。 */
export const sec = (seconds: number) => Math.round(seconds * layout.fps);
