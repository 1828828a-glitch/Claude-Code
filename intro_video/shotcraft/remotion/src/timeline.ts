// 帧級タイムライン。設計 spec Stage 3 の分鏡表をそのまま写したもの。
//
// 全ショット境界はナレーションのセリフ開始フレームにアンカーしてある。
// SFX 钉帧表(sfx.ts)は必ずこの SHOTS の from を基準にした相対式で書く。
// 裸のフレーム番号を書くと、尺が動いたときに全表を打ち直すことになる。

export const FPS = 30;
export const TOTAL = 2065; // 68.84s。既存ナレーションの尺で確定

export type ShotId =
  | 'brandOpen'
  | 'titleCard1'
  | 'aiStream'
  | 'heroCard'
  | 'pillCycle'
  | 'cardFlip'
  | 'titleCard2'
  | 'terminal'
  | 'wordRelay'
  | 'docType'
  | 'risoHit'
  | 'outro';

export type Shot = {
  id: ShotId;
  from: number;
  dur: number;
  /** 使用した video-shotcraft のカード名(+ 変体) */
  card: string;
  /** 検収フレーム(spec の検収表と一致させる) */
  qa: [number, number];
};

export const SHOT_LIST: Shot[] = [
  { id: 'brandOpen', from: 0, dur: 133, card: 'brand-ink-open', qa: [100, 128] },
  { id: 'titleCard1', from: 133, dur: 85, card: 'paper-title-card', qa: [150, 205] },
  { id: 'aiStream', from: 218, dur: 182, card: 'ai-stream-response', qa: [300, 390] },
  { id: 'heroCard', from: 400, dur: 162, card: 'spotlight-hero-card', qa: [470, 550] },
  { id: 'pillCycle', from: 562, dur: 214, card: 'pill-slot-cycle', qa: [650, 745] },
  { id: 'cardFlip', from: 776, dur: 127, card: 'card-flip-reveal', qa: [830, 895] },
  { id: 'titleCard2', from: 903, dur: 66, card: 'paper-title-card', qa: [920, 960] },
  { id: 'terminal', from: 969, dur: 191, card: 'typewriter-moves / terminal-typewriter', qa: [1040, 1150] },
  { id: 'wordRelay', from: 1160, dur: 329, card: 'word-relay-filmstrip', qa: [1230, 1400] },
  { id: 'docType', from: 1489, dur: 171, card: 'document-typewriter-reveal', qa: [1560, 1650] },
  { id: 'risoHit', from: 1660, dur: 206, card: 'riso-print-hits / riso-misregistration-hit', qa: [1665, 1850] },
  { id: 'outro', from: 1866, dur: 199, card: 'outro-group-photo-launch', qa: [1900, 2050] },
];

/** id 引きの索引。SFX 表と各ショットが from を参照するのに使う。 */
export const SHOTS = Object.fromEntries(SHOT_LIST.map((s) => [s.id, s])) as Record<ShotId, Shot>;

/** ナレーションのセリフ開始フレーム(絶対)。字幕とキュー同期に使う。 */
export const CUES = {
  s1_name: 14,
  s1_what: 57,
  s1_promise: 133,
  s2_hello: 230,
  s2_whatami: 261,
  s2_born: 361,
  s2_top: 432,
  s3_three: 574,
  s3_read: 639,
  s3_think: 682,
  s3_make: 732,
  s3_examples: 776,
  s4_where: 915,
  s4_chat: 969,
  s4_code: 1017,
  s5_family: 1172,
  s5_opus: 1217,
  s5_sonnet: 1281,
  s5_haiku: 1339,
  s5_pick: 1392,
  s6_both: 1501,
  s6_good: 1560,
  s6_bad: 1660,
  s6_check: 1752,
  s7_hard: 1879,
  s7_you: 1943,
} as const;
