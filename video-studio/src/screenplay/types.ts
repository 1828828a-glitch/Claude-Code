import { z } from 'zod';

// ============================================================
// 台本(screenplay)スキーマ
// Claudeはこのデータ構造だけを書く。映像品質はシーン実装が保証する。
// ============================================================

const base = {
  // ナレーション字幕。**で囲むとアクセント色で強調される。
  narration: z.string().optional(),
  // シーン尺(秒)。省略時はシーン種別のデフォルト+ナレーション長で自動決定。
  // ナレーション音声を使う場合は「音声の実尺+1秒程度」を明示指定すること。
  durationSec: z.number().min(1.5).max(20).optional(),
  // ナレーション音声ファイル(public/assets/ 配下の相対パス)。シーン頭から再生される。
  audio: z.string().optional(),
};

// 金屏風のタイトル画面
export const titleScene = z.object({
  type: z.literal('title'),
  series: z.string().optional(), // 例: 「1分でわかる日本史」
  title: z.string(), // 例: 「黒船来航」
  episode: z.string().optional(), // 例: 「第二回」
  tagline: z.string().optional(), // 例: 「歴史の流れが たった1分でつかめる!」
  ...base,
});

// 年号ドン出し
export const yearScene = z.object({
  type: z.literal('year'),
  year: z.string(), // 例: 「1853」
  suffix: z.string().optional(), // 例: 「年」
  subLabel: z.string().optional(), // 例: 「嘉永六年」
  mood: z.enum(['light', 'dark']).default('light'),
  ...base,
});

// 人物紹介。imageは public/assets/ 配下のファイル名(立ち絵の切り抜きPNG推奨)
export const characterScene = z.object({
  type: z.literal('character'),
  name: z.string(),
  image: z.string().optional(), // 省略時はシルエット表示
  countryLabel: z.string().optional(), // 例: 「アメリカ」
  flagEmoji: z.string().optional(), // 例: 「🇺🇸」
  infoLines: z.array(z.string()).default([]), // 例: [「アメリカ東インド艦隊 司令長官」, 「当時59歳」]
  mood: z.enum(['light', 'dark']).default('light'),
  ...base,
});

// アイコン整列+カウント(黒船◯隻など)。現状のiconは 'ship' のみ。
export const lineupScene = z.object({
  type: z.literal('lineup'),
  label: z.string(), // 例: 「黒船」
  icon: z.enum(['ship']).default('ship'),
  count: z.number().int().min(1).max(8),
  unit: z.string().optional(), // 例: 「隻」
  ...base,
});

// 日本地図。placeは assets/japanPath.ts のPLACESキーか [lon, lat]
const placeRef = z.union([z.string(), z.tuple([z.number(), z.number()])]);
export const mapScene = z.object({
  type: z.literal('map'),
  label: z.string(), // 例: 「浦賀」
  subLabel: z.string().optional(), // 例: 「現・神奈川県横須賀市」
  target: placeRef, // 矢印の指す地点
  highlights: z
    .array(z.object({ place: placeRef, radius: z.number().default(70) }))
    .default([]), // 赤く塗る範囲
  zoom: z.number().min(1).max(3).default(1.6), // 注視点へのズーム倍率
  mood: z.enum(['light', 'dark']).default('light'),
  ...base,
});

// 年表。マーカーがactiveIndexのイベントまで進む。
export const timelineScene = z.object({
  type: z.literal('timeline'),
  events: z
    .array(z.object({ year: z.string(), label: z.string() }))
    .min(2)
    .max(6),
  activeIndex: z.number().int().min(0),
  headline: z.string().optional(), // 中央の大年号。省略時はactiveイベントの年
  mood: z.enum(['light', 'dark']).default('dark'),
  ...base,
});

// 数値・進捗の提示(天下統一83%など)
export const statScene = z.object({
  type: z.literal('stat'),
  heading: z.string().optional(), // 例: 「天下統一まで**あと少し**」
  label: z.string(), // 例: 「天下統一」
  value: z.number(), // カウントアップ表示される数値
  valueSuffix: z.string().optional(), // 例: 「%」「年」
  barRatio: z.number().min(0).max(1).optional(), // バーの充填率。省略時はvalue/100
  mood: z.enum(['light', 'dark']).default('dark'),
  showJapanSilhouette: z.boolean().default(false),
  ...base,
});

// 1メッセージのテキスト画面
export const textScene = z.object({
  type: z.literal('text'),
  text: z.string(), // 例: 「なぜ、裏切ったのか?」
  variant: z.enum(['question', 'impact', 'plain']).default('plain'),
  // question: 和紙+朱下線 / impact: 闇+光る文字 / plain: 素直な提示
  cornerTag: z.string().optional(), // 例: 「1582.6.2 未明」(左上のタイムスタンプ)
  embers: z.boolean().default(false), // impact時に火の粉を舞わせる
  ...base,
});

// ユーザー素材のフルスクリーン表示(Ken Burns)
export const imageScene = z.object({
  type: z.literal('image'),
  image: z.string(), // public/assets/ 配下のファイル名
  caption: z.string().optional(),
  panFrom: z.tuple([z.number(), z.number()]).default([0, 0]), // %単位のオフセット
  panTo: z.tuple([z.number(), z.number()]).default([0, 0]),
  zoomFrom: z.number().default(1.06),
  zoomTo: z.number().default(1.14),
  ...base,
});

// 「A + B + C」式の型の提示。トークンが1つずつポップインする。
export const formulaScene = z.object({
  type: z.literal('formula'),
  heading: z.string().optional(), // 上部の小見出し
  tokens: z.array(z.string()).min(2).max(6),
  separator: z.enum(['+', '/']).default('+'),
  caption: z.string().optional(), // 型の下の補足(例: 「否定だけでなく、代替案まで届ける」)
  ...base,
});

// 旧フローと新フローの比較。旧はグレーで先に、新がアクセント付きで後から流れる。
export const flowCompareScene = z.object({
  type: z.literal('flowCompare'),
  heading: z.string().optional(),
  oldLabel: z.string().default('旧'),
  newLabel: z.string().default('新'),
  oldSteps: z.array(z.string()).min(2).max(5),
  newSteps: z.array(z.string()).min(2).max(6),
  ...base,
});

// 番号付き縦ステップ(最大6)。上から順に積み上がる。
export const stepsScene = z.object({
  type: z.literal('steps'),
  heading: z.string().optional(),
  items: z
    .array(z.object({ title: z.string(), desc: z.string().optional() }))
    .min(2)
    .max(6),
  ...base,
});

// 締め・次回予告
export const outroScene = z.object({
  type: z.literal('outro'),
  heading: z.string().optional(), // 例: 「次回」
  title: z.string(), // 例: 「日米和親条約」
  note: z.string().optional(), // 例: 「お楽しみに」
  ...base,
});

export const sceneSchema = z.discriminatedUnion('type', [
  titleScene,
  yearScene,
  characterScene,
  lineupScene,
  mapScene,
  timelineScene,
  statScene,
  textScene,
  imageScene,
  formulaScene,
  flowCompareScene,
  stepsScene,
  outroScene,
]);

export const screenplaySchema = z.object({
  title: z.string(),
  scenes: z.array(sceneSchema).min(1),
  // BGM(public/assets/ 配下の相対パス)。全編ループ再生され、末尾でフェードアウトする。
  bgm: z
    .object({
      file: z.string(),
      volume: z.number().min(0).max(1).default(0.13),
    })
    .optional(),
});

// Scene はパース後(デフォルト補完済み)の型。コンポーネントはこちらを受け取る。
export type Scene = z.infer<typeof sceneSchema>;
// Screenplay は台本を書くときの型。デフォルト値のあるフィールドは省略できる。
export type Screenplay = z.input<typeof screenplaySchema>;

// ----- 尺の自動決定 -----
const DEFAULT_SEC: Record<Scene['type'], number> = {
  title: 4.5,
  year: 3.2,
  character: 5,
  lineup: 4.5,
  map: 6,
  timeline: 5,
  stat: 5,
  text: 4,
  image: 5,
  formula: 6,
  flowCompare: 7,
  steps: 8,
  outro: 4,
};

// ナレーションは1秒あたり約6.5文字で読める想定+余白0.8秒
export const sceneDurationSec = (scene: Scene): number => {
  if (scene.durationSec) return scene.durationSec;
  const base = DEFAULT_SEC[scene.type];
  if (!scene.narration) return base;
  const chars = scene.narration.replace(/\*\*/g, '').length;
  return Math.max(base, Math.min(20, chars / 6.5 + 0.8));
};
