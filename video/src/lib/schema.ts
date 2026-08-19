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
  /**
   * このカットの絵をどう描くか。`npm run assets` で画像を生成し、
   * 結果のパスが `image` に書き戻される。レンダリング時には使わない。
   */
  imagePrompt: z.string().optional(),
  /**
   * このカットに登場させるキャラクター。台本トップレベルの `characters` の
   * キーを書く。`npm run assets` がキャラシート画像を参照として渡すので、
   * 複数カットに出しても同じ姿になる。
   */
  characters: z.array(z.string()).optional(),
  /** 画面下に出すナレーションテロップ */
  telop: z.string().optional(),
  /**
   * このカットで読み上げるナレーション。`npm run voice` で音声を作り、
   * `voiceFile` と `voiceSeconds` が書き戻される。
   */
  voiceText: z.string().optional(),
  /** 生成された音声（public/ からの相対パス）。自動で埋まる */
  voiceFile: z.string().optional(),
  /**
   * 音声の実測の長さ（秒）。自動で埋まる。
   * これがあるカットは、文字数からの推定ではなくこの尺が使われる。
   */
  voiceSeconds: z.number().positive().optional(),
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

/** 地図に色を塗って見せる */
export const mapSceneSchema = z.object({
  type: z.literal("map"),
  heading: z.string().optional(),
  /** 地図データ（public/ からの相対パス）。`npm run map` で取得する */
  geo: z.string().default("maps/japan-prefectures.json"),
  /** 塗る地域名。台本に書いた順に色が乗っていく */
  highlight: z.array(z.string()).default([]),
  /** 地図と一緒に出すゲージ */
  progress: z
    .object({
      label: z.string().optional(),
      value: z.number(),
      suffix: z.string().optional(),
    })
    .optional(),
  /**
   * 画面に収める対象。
   * "all" は地図全体、"highlight" は塗る地域に寄る。
   * 日本は斜めに長いので、全体に合わせると本州が小さくなる。
   */
  focus: z.enum(["all", "highlight"]).default("all"),
  /** 寄り具合の微調整。1 より小さくすると引く */
  zoom: z.number().positive().default(1),
  /** 出典表記。地図データのライセンス上必要になることが多い */
  attribution: z.string().optional(),
  ...baseScene,
});

/** ゲージを並べて比較する */
export const progressSceneSchema = z.object({
  type: z.literal("progress"),
  heading: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        suffix: z.string().optional(),
      }),
    )
    .min(1),
  suffix: z.string().default("%"),
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
  mapSceneSchema,
  progressSceneSchema,
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
  /**
   * 全カットの画像に共通で効かせる画風の指定。
   * 1カットずつプロンプトを書くと絵柄がバラバラになるので、
   * 「何を描くか」は各シーンの imagePrompt、「どう描くか」はここ、と分ける。
   */
  imageStyle: z.string().optional(),
  /**
   * 繰り返し登場する人物。
   *
   * 1カットずつ独立に生成すると顔が毎回変わってしまうので、
   * 先に「キャラシート」を1枚作り、それを参照画像として各カットに渡す。
   * 解説動画で同じ人物が何度も出るなら、ここを使わないと成立しない。
   */
  characters: z
    .record(
      z.object({
        /** どんな人物か。キャラシートを作るときのプロンプト */
        prompt: z.string(),
        /** 生成されたキャラシート（public/ からの相対パス）。自動で埋まる */
        sheet: z.string().optional(),
      }),
    )
    .optional(),
  /** ナレーションの声。OpenAI の音声名（alloy, nova, onyx, sage, coral など） */
  voiceName: z.string().default("alloy"),
  /** 読み方の指示（落ち着いて、ドキュメンタリー調で、など） */
  voiceInstructions: z.string().optional(),
  /** 読み上げ速度。1 が標準 */
  voiceSpeed: z.number().min(0.25).max(4).default(1),

  /** BGM（public/ からの相対パス）。無ければ無音。動画より短ければループする */
  bgm: z.string().optional(),
  /** BGM の音量 0〜1 */
  bgmVolume: z.number().min(0).max(1).default(0.25),
  /**
   * ナレーションが流れている間の BGM の音量。
   * 声に被せたまま同じ音量で鳴らすと一気に素人っぽくなるので、既定で下げる。
   */
  bgmDuckVolume: z.number().min(0).max(1).default(0.07),
  scenes: z.array(sceneSchema).min(1),
});

export type Scene = z.infer<typeof sceneSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type SceneType = Scene["type"];
export type TransitionKind = z.infer<typeof transitionKindSchema>;
export type BackgroundKind = z.infer<typeof backgroundKindSchema>;
