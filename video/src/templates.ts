import { scriptSchema, type Script } from "./lib/schema";
import { FORMATS, type FormatName } from "./theme/tokens";

/**
 * テンプレート = 台本に対する「既定値のセット」。
 *
 * 台本 JSON 側で明示した値が常に優先される。テンプレートは
 * 「何も指定しなかったときにどんな見た目・テンポになるか」だけを決める。
 */
export const TEMPLATES = {
  /** 日本史・雑学などの解説アニメ（横型）。読ませるので少しゆっくり */
  historyExplainer: {
    format: "landscape",
    palette: "sumi",
    background: "washi",
    transition: "fade",
    pace: 1,
  },
  /** 架空のテレビ番組オープニング（横型）。短く強く */
  tvOpening: {
    format: "landscape",
    palette: "neon",
    background: "radial",
    transition: "flash",
    pace: 0.8,
    autoSfx: true,
  },
  /** テンポの速い縦型ショート。海外編集風 */
  fastCutShorts: {
    format: "vertical",
    palette: "pop",
    background: "burst",
    transition: "flash",
    pace: 0.72,
    autoSfx: true,
  },
} as const satisfies Record<string, Partial<Script>>;

export type TemplateName = keyof typeof TEMPLATES;

/**
 * テンプレートの既定値を台本にかぶせて検証する。
 *
 * 台本 JSON に書かれたキーは上書きしない（undefined のキーだけ埋める）。
 */
export const applyTemplate = (
  templateName: TemplateName,
  rawScript: unknown,
): Script => {
  const defaults = TEMPLATES[templateName];
  const input = (rawScript ?? {}) as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...input };
  for (const [key, value] of Object.entries(defaults)) {
    if (merged[key] === undefined) merged[key] = value;
  }

  return scriptSchema.parse(merged);
};

/** 解像度を取り出す */
export const dimensionsOf = (format: FormatName) => FORMATS[format];
