#!/usr/bin/env node
/**
 * 効果音を合成して public/sfx/ に書き出す。
 *
 * BGM と違って効果音は「シュッ」「ドン」程度の短い音なので、
 * 素材を探してライセンスを確認するより、その場で作った方が速くて安全。
 * 手持ちの音源を使いたい場合は public/sfx/ に置いて台本の sfx で差し替える。
 *
 * 乱数は固定シードなので、何度実行しても同じ波形になる（差分が出ない）。
 *
 * 使い方:
 *   node tools/make-sfx.mjs
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

/** 0..1 の位置を受け取り -1..1 の振幅を返す関数から WAV を作る */
const renderWav = (seconds, sample) => {
  const count = Math.round(RATE * seconds);
  const dataSize = count * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28); // byteRate
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);

  let peak = 0;
  const values = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const v = sample(i / RATE, i);
    values[i] = v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }

  // ピークを揃える。音ごとに音量がバラつくと台本側で調整しづらい
  const gain = peak > 0 ? 0.89 / peak : 0;
  for (let i = 0; i < count; i += 1) {
    buf.writeInt16LE(Math.round(values[i] * gain * 32767), 44 + i * 2);
  }
  return buf;
};

/** 頭とお尻をなだらかにする。切り口が「プツッ」と鳴るのを防ぐ */
const edgeFade = (t, seconds, fade = 0.004) =>
  Math.min(1, t / fade, (seconds - t) / fade);

/** 一次ローパス。カットオフを時間で動かせるようにしてある */
const makeLowpass = () => {
  let prev = 0;
  return (input, cutoffHz) => {
    const rc = 1 / (2 * Math.PI * Math.max(20, cutoffHz));
    const alpha = 1 / RATE / (rc + 1 / RATE);
    prev += alpha * (input - prev);
    return prev;
  };
};

const SOUNDS = {
  /** カットの繋ぎに置く風切り音 */
  whoosh: () => {
    const seconds = 0.42;
    const rand = makeRandom(1);
    const lp = makeLowpass();
    return renderWav(seconds, (t) => {
      const p = t / seconds;
      const noise = rand() * 2 - 1;
      // カットオフを上げてから下げると「シュッ」と通り過ぎる感じになる
      const cutoff = 400 + Math.sin(p * Math.PI) * 5200;
      const env = Math.sin(p * Math.PI) ** 1.6;
      return lp(noise, cutoff) * env * edgeFade(t, seconds);
    });
  },

  /** 決め所に置く低い衝撃音 */
  impact: () => {
    const seconds = 0.55;
    const rand = makeRandom(2);
    const lp = makeLowpass();
    let phase = 0;
    return renderWav(seconds, (t) => {
      const p = t / seconds;
      // 頭の一瞬だけノイズを混ぜると打撃感が出る
      const transient = (rand() * 2 - 1) * Math.exp(-t * 60) * 0.7;
      // ピッチを下げながら減衰させる
      const freq = 120 * Math.exp(-t * 6) + 42;
      phase += (2 * Math.PI * freq) / RATE;
      const body = Math.sin(phase) * Math.exp(-t * 7);
      return (lp(transient, 3000) + body) * (1 - p * 0.1) * edgeFade(t, seconds);
    });
  },

  /** 文字がポンと出るときの短い音 */
  pop: () => {
    const seconds = 0.16;
    let phase = 0;
    return renderWav(seconds, (t) => {
      const freq = 900 * Math.exp(-t * 12) + 320;
      phase += (2 * Math.PI * freq) / RATE;
      return Math.sin(phase) * Math.exp(-t * 26) * edgeFade(t, seconds, 0.002);
    });
  },

  /** 項目が1つずつ出るときの粒 */
  tick: () => {
    const seconds = 0.09;
    const rand = makeRandom(3);
    const lp = makeLowpass();
    return renderWav(seconds, (t) => {
      const noise = rand() * 2 - 1;
      return lp(noise, 4200) * Math.exp(-t * 90) * edgeFade(t, seconds, 0.002);
    });
  },

  /** 盛り上げ。次のカットに向けて上がっていく */
  riser: () => {
    const seconds = 1.1;
    const rand = makeRandom(4);
    const lp = makeLowpass();
    let phase = 0;
    return renderWav(seconds, (t) => {
      const p = t / seconds;
      const noise = rand() * 2 - 1;
      const cutoff = 300 + p * p * 7000;
      const freq = 180 + p * p * 900;
      phase += (2 * Math.PI * freq) / RATE;
      const tone = Math.sin(phase) * 0.35;
      return (lp(noise, cutoff) + tone) * (p ** 1.5) * edgeFade(t, seconds);
    });
  },

  /** 何かが確定したときの澄んだ音 */
  chime: () => {
    const seconds = 1.3;
    const partials = [
      { f: 880, a: 1.0, d: 3.2 },
      { f: 1320, a: 0.5, d: 4.5 },
      { f: 2640, a: 0.22, d: 6.5 },
    ];
    return renderWav(seconds, (t) => {
      let v = 0;
      for (const { f, a, d } of partials) {
        v += Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t * d);
      }
      return v * edgeFade(t, seconds);
    });
  },
};

const main = async () => {
  const dir = path.join("public", "sfx");
  await mkdir(dir, { recursive: true });

  for (const [name, make] of Object.entries(SOUNDS)) {
    const wav = make();
    const file = path.join(dir, `${name}.wav`);
    await writeFile(file, wav);
    const seconds = ((wav.length - 44) / 2 / RATE).toFixed(2);
    console.log(`- ${name}.wav  ${seconds}秒  ${Math.round(wav.length / 1024)}KB`);
  }

  console.log(`\n${Object.keys(SOUNDS).length}種類を ${dir} に書き出しました。`);
  console.log("台本では { \"sfx\": [{ \"at\": 0, \"name\": \"whoosh\" }] } のように使います。");
  console.log("手持ちの音源に差し替えたい場合は、同じ名前で上書きするか");
  console.log("台本トップレベルの sfx でパスを指定してください。");
};

main().catch((error) => {
  console.error(`エラー: ${error.stack ?? error.message}`);
  process.exit(1);
});
