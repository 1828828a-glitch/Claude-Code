#!/usr/bin/env node
/**
 * BGM を合成して public/bgm/ に書き出す。
 *
 * 既製の楽曲はライセンス確認が必要なのでリポジトリに入れられない。
 * その代わり、効果音（make-sfx.mjs）と同じ「その場で計算して作る」方式で
 * 権利的にクリーンなループ曲を用意する。手持ちの曲を使いたい場合は
 * public/bgm/ に置いて台本の `bgm` で指定すれば、こちらは使われない。
 *
 * 乱数は固定シードなので、何度実行しても同じ波形になる（差分が出ない）。
 *
 * 使い方:
 *   node tools/make-bgm.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const RATE = 44100;

/** 線形合同法。Math.random と違って毎回同じ結果になる */
const makeRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

/** MIDI ノート番号 → 周波数 */
const noteHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/**
 * 1音を左右チャンネルに書き込む。
 *
 * ループの終わり際に鳴らした音の余韻は、バッファの先頭に折り返して
 * 書き込む（index % length）。これで曲をループさせても切れ目が出ない。
 */
const addNote = (channels, { at, freq, amp, pan, attack, decay, tail, partials }) => {
  const [left, right] = channels;
  const length = left.length;
  const start = Math.round(at * RATE);
  const count = Math.round(tail * RATE);
  const gainL = Math.SQRT1_2 * (1 - pan) * amp;
  const gainR = Math.SQRT1_2 * (1 + pan) * amp;

  for (let i = 0; i < count; i += 1) {
    const t = i / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-t * decay);
    if (env < 0.0005 && t > attack) break;

    let v = 0;
    for (const [ratio, a, extraDecay] of partials) {
      v += Math.sin(2 * Math.PI * freq * ratio * t) * a * Math.exp(-t * extraDecay);
    }
    const index = (start + i) % length;
    left[index] += v * env * gainL;
    right[index] += v * env * gainR;
  }
};

/** ピアノ寄りの柔らかい音色。高次倍音ほど速く消える */
const PIANO = [
  [1, 1.0, 0],
  [2, 0.34, 1.2],
  [3, 0.14, 2.4],
  [4.01, 0.05, 3.5],
];

/** パッド用。ほぼ純音に近い、こもった音 */
const PAD = [
  [1, 1.0, 0],
  [2, 0.12, 0.5],
];

/**
 * 曲の設計。
 * ヘ長調・58BPM・8小節ループ。maj7 中心の穏やかな進行で、
 * 最後を C7sus にして頭の Fmaj7 に自然に戻るようにしてある。
 */
const BPM = 58;
const BEAT = 60 / BPM;
const BARS = 8;
const SECONDS = BARS * 4 * BEAT;

// 各小節のコード（MIDI ノート番号、F3=53）
const CHORDS = [
  [53, 57, 60, 64], // Fmaj7
  [57, 60, 64, 67], // Am7
  [50, 53, 57, 60], // Dm7
  [58, 62, 65, 69], // Bbmaj7
  [53, 57, 60, 64], // Fmaj7
  [55, 58, 62, 65], // Gm7
  [58, 62, 65, 69], // Bbmaj7
  [55, 60, 62, 65], // C7sus
];

// 小節ごとのベース音（1オクターブ下）
const BASS = [41, 45, 38, 46, 41, 43, 46, 48];

const composeInto = (channels) => {
  const rand = makeRandom(7);

  for (let bar = 0; bar < BARS; bar += 1) {
    const chord = CHORDS[bar];
    const barAt = bar * 4 * BEAT;

    // ベース: 小節頭に1音、静かに長く
    addNote(channels, {
      at: barAt,
      freq: noteHz(BASS[bar]),
      amp: 0.16,
      pan: 0,
      attack: 0.02,
      decay: 0.55,
      tail: 4 * BEAT + 2,
      partials: PIANO,
    });

    // パッド: コード構成音を薄く敷く。左右に僅かにデチューンして広げる
    for (const [i, midi] of chord.entries()) {
      for (const [pan, detune] of [[-0.5, -0.6], [0.5, 0.6]]) {
        addNote(channels, {
          at: barAt + i * 0.03,
          freq: noteHz(midi) * 2 ** (detune / 1200),
          amp: 0.028,
          pan,
          attack: 1.4,
          decay: 0.32,
          tail: 4 * BEAT + 3,
          partials: PAD,
        });
      }
    }

    // アルペジオ: 8分音符でコードを上って戻る。ときどき休む
    const order = [0, 1, 2, 3, 2, 1, 3, 2];
    for (let step = 0; step < 8; step += 1) {
      if (rand() < 0.18 && step % 4 !== 0) continue; // 休符で呼吸を作る
      const midi = chord[order[step]] + 12;
      addNote(channels, {
        at: barAt + step * (BEAT / 2) + (rand() - 0.5) * 0.012,
        freq: noteHz(midi),
        amp: 0.075 + rand() * 0.03,
        pan: (order[step] - 1.5) * 0.22,
        attack: 0.008,
        decay: 1.9,
        tail: 3,
        partials: PIANO,
      });
    }

    // 2小節に1回、高音をひと粒（オルゴール風の彩り）
    if (bar % 2 === 1) {
      addNote(channels, {
        at: barAt + 2 * BEAT,
        freq: noteHz(chord[3] + 24),
        amp: 0.035,
        pan: 0.3,
        attack: 0.004,
        decay: 1.4,
        tail: 3,
        partials: PIANO,
      });
    }
  }
};

/** 単純なディレイで空間を作る。折り返し先もループ内なので継ぎ目に響きが残る */
const addEcho = (channels) => {
  const [left, right] = channels;
  const length = left.length;
  const taps = [
    { seconds: 0.31, gain: 0.26, cross: true },
    { seconds: 0.62, gain: 0.13, cross: false },
  ];
  const dryL = Float64Array.from(left);
  const dryR = Float64Array.from(right);

  for (const { seconds, gain, cross } of taps) {
    const offset = Math.round(seconds * RATE);
    for (let i = 0; i < length; i += 1) {
      const j = (i + offset) % length;
      left[j] += (cross ? dryR[i] : dryL[i]) * gain;
      right[j] += (cross ? dryL[i] : dryR[i]) * gain;
    }
  }
};

const renderWav = () => {
  const count = Math.round(SECONDS * RATE);
  const channels = [new Float64Array(count), new Float64Array(count)];

  composeInto(channels);
  addEcho(channels);

  let peak = 0;
  for (const channel of channels) {
    for (const v of channel) {
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
  }
  const gain = peak > 0 ? 0.72 / peak : 0;

  const dataSize = count * 2 * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(2, 22); // stereo
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 4, 28); // byteRate
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < count; i += 1) {
    buf.writeInt16LE(Math.round(channels[0][i] * gain * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(channels[1][i] * gain * 32767), 46 + i * 4);
  }
  return buf;
};

const main = async () => {
  const dir = path.join("public", "bgm");
  await mkdir(dir, { recursive: true });

  const wav = renderWav();
  const file = path.join(dir, "calm-piano.wav");
  await writeFile(file, wav);
  console.log(
    `- calm-piano.wav  ${SECONDS.toFixed(1)}秒ループ  ${Math.round(wav.length / 1024 / 1024 * 10) / 10}MB`,
  );
  console.log("\n台本のトップレベルに \"bgm\": \"bgm/calm-piano.wav\" と書くと流れます。");
  console.log("曲が動画より短くても自動でループし、ナレーション中は音量が下がります。");
};

main().catch((error) => {
  console.error(`エラー: ${error.stack ?? error.message}`);
  process.exit(1);
});
