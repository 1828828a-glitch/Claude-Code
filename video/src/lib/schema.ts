import { z } from "zod";

/**
 * 台本(script) のスキーマ。
 *
 * ここが「Claude に台本 JSON を書かせて動画にする」ときの契約になる。
 * 新しい演出を足すときは Scene を増やし、src/scenes/ に対応する
 * コンポーネントを追加して SceneRouter に登録する。
 */

export const paletteNameSchema = z.enum(["washi", "sumi", "neon", "pop"]);
export const formatNameSchema = z.enum(["landscape", "vertical", "square"]);

export const backgroundKindSchema = z.enum([
  "plain",
  "radial",
  "stripes",
  "grid",
  "burst",
  "washi",
]);

export const transitionKindSchema = z.enum([
  /** 硬いカット。テンポ重視 */
  "cut",
  /** 白フラッシュを挟むカット */
  "flash",
  /** クロスフェード */
  "fade",
  /** 横に払う */
  "slide",
  /** 中心から拡大 */
  "zoom",
]);

const baseScene = {
  /** 尺（秒）。省略時はテキスト量から自動計算する */
  durationInSeconds: z.number().positive().optional(),
  /** このシーンだけ背景を変えたいとき */
  background: backgroundKindSchema.optional(),
  /** 次のシーンへの繋ぎ方 */
  transition: transitionKindSchema.optional(),
  /** 画面に敷く画像（public/ からの相対パス、または URL） */
  image: z.string().optional(),
  /** 画面下に出すナレーションテロップ */
  telop: z.string().optional(),
};

/** 章タイトル・冒頭のタイトル */
export const titleSceneSchema = z.object({
  type: z.literal("title"),
  title: z.string(),
  subtitle: z.string().optional(),
  chip: z.string().optional(),
  ...baseScene,
});

/** 画像 + テロップの基本カット。解説動画の主成分 */
export const narrationSceneSchema = z.object({
  type: z.literal("narration"),
  text: z.string(),
  emphasis: z.array(z.string()).optional(),
  ...baseScene,
});

/** 全画面のキネティックタイポ。決め台詞用 */
export const statementSceneSchema = z.object({
  type: z.literal("statement"),
  text: z.string(),
  emphasis: z.array(z.string()).optional(),
  mode: z.enum(["riseUp", "pop", "typewriter", "focus", "wave", "slideIn"]).optional(),
  ...baseScene,
});

/** 箇条書きの順次表示 */
export const bulletsSceneSchema = z.object({
  type: z.literal("bullets"),
  heading: z.string().optional(),
  items: z.array(z.string()).min(1),
  ...baseScene,
});

/** 年表 */
export const timelineSceneSchema = z.object({
  type: z.literal("timeline"),
  heading: z.string().optional(),
  events: z
    .array(z.object({ year: z.string(), label: z.string() }))
    .min(1),
  ...baseScene,
});

/** 2つを並べて比較 */
export const compareSceneSchema = z.object({
  type: z.literal("compare"),
  heading: z.string().optional(),
  left: z.object({ label: z.string(), text: z.string() }),
  right: z.object({ label: z.string(), text: z.string() }),
  ...baseScene,
});

/** 引用・史料 */
export const quoteSceneSchema = z.object({
  type: z.literal("quote"),
  text: z.string(),
  source: z.string().optional(),
  ...baseScene,
});

/** 数字を見せる */
export const statSceneSchema = z.object({
  type: z.literal("stat"),
  value: z.number(),
  label: z.string(),
  suffix: z.string().optional(),
  ...baseScene,
});

/** 番組OP用のロゴカード */
export const logoSceneSchema = z.object({
  type: z.literal("logo"),
  title: z.string(),
  tagline: z.string().optional(),
  ...baseScene,
});

/** 番組OP用のクレジット（出演者・スタッフ） */
export const creditSceneSchema = z.object({
  type: z.literal("credit"),
  role: z.string(),
  names: z.array(z.string()).min(1),
  ...baseScene,
});

/** 締め・CTA */
export const outroSceneSchema = z.object({
  type: z.literal("outro"),
  text: z.string(),
  cta: z.string().optional(),
  ...baseScene,
});

export const sceneSchema = z.discriminatedUnion("type", [
  titleSceneSchema,
  narrationSceneSchema,
  statementSceneSchema,
  bulletsSceneSchema,
  timelineSceneSchema,
  compareSceneSchema,
  quoteSceneSchema,
  statSceneSchema,
  logoSceneSchema,
  creditSceneSchema,
  outroSceneSchema,
]);

export const scriptSchema = z.object({
  /** 動画のタイトル（ファイル名や管理用） */
  title: z.string(),
  format: formatNameSchema.default("landscape"),
  palette: paletteNameSchema.default("sumi"),
  /** 全体の既定背景 */
  background: backgroundKindSchema.default("plain"),
  /** 全体の既定トランジション */
  transition: transitionKindSchema.default("flash"),
  /**
   * 全体のテンポ。1 が標準、0.8 で 2 割速い。
   * 自動計算された尺すべてに掛かる。
   */
  pace: z.number().positive().default(1),
  /** BGM（public/ からの相対パス）。無ければ無音 */
  bgm: z.string().optional(),
  /** BGM の音量 0〜1 */
  bgmVolume: z.number().min(0).max(1).default(0.25),
  scenes: z.array(sceneSchema).min(1),
});

export type Scene = z.infer<typeof sceneSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type SceneType = Scene["type"];
export type TransitionKind = z.infer<typeof transitionKindSchema>;
export type BackgroundKind = z.infer<typeof backgroundKindSchema>;
