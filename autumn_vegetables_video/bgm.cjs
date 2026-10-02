// 動画のタイムラインに同期したオリジナル BGM / 効果音を合成して WAV に書き出す。
// 外部音源は使わない（すべてコード内で生成）。
//   node bgm.cjs -> bgm.wav
const fs = require('fs');
const path = require('path');

const SR = 44100, DUR = 57, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const padL = new Float32Array(N), padR = new Float32Array(N); // キックでダッキングさせる層

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7;
const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };

function add(t0, len, fn, gain = 1, pan = 0, bufL = L, bufR = R) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    const v = fn(i / SR);
    bufL[j] += v * gl; bufR[j] += v * gr;
  }
}

// ---------- instruments ----------
const kickTimes = [];
function kick(t0, g = 0.9) {
  kickTimes.push(t0);
  let ph = 0;
  add(t0, 0.45, t => { ph += 2 * Math.PI * (45 + 90 * Math.exp(-t * 28)) / SR; return Math.sin(ph) * Math.exp(-t * 7); }, g);
}
function clap(t0, g = 0.32) {
  let prev = 0;
  add(t0, 0.25, t => { const n = noise(), v = n - prev; prev = n; return v * 0.5 * Math.exp(-t * 20) + Math.sin(2 * Math.PI * 190 * t) * 0.4 * Math.exp(-t * 35); }, g);
}
function hat(t0, g = 0.1, pan = 0.3) {
  let p1 = 0, p2 = 0;
  add(t0, 0.08, t => { const n = noise(), d1 = n - p1, d2 = d1 - p2; p1 = n; p2 = d1; return d2 * 0.4 * Math.exp(-t * 80); }, g, pan);
}
function pluck(t0, m, g = 0.16, pan = 0) {
  const f = mtof(m);
  add(t0, 0.7, t => (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t)) * Math.min(1, t * 300) * Math.exp(-t * 7), g, pan);
}
function bass(t0, len, m, g = 0.32) {
  const f = mtof(m);
  add(t0, len, t => (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * Math.min(1, t * 200) * Math.min(1, (len - t) * 30) * (0.6 + 0.4 * Math.exp(-t * 6)), g);
}
function pad(t0, len, notes, g = 0.07) {
  notes.forEach((m, k) => {
    for (const det of [-0.08, 0.08]) {
      const f = mtof(m + det); let lp = 0;
      add(t0, len + 0.5, t => {
        const ph = (f * t) % 1, tri = 4 * Math.abs(ph - 0.5) - 1;
        lp += 0.08 * (tri - lp);
        const env = Math.min(1, t / 0.25) * (t > len ? Math.exp(-(t - len) * 8) : 1);
        return lp * env;
      }, g, (k % 2 ? 0.35 : -0.35) * (det > 0 ? 1 : -1), padL, padR);
    }
  });
}
function whoosh(tb, g = 0.5, len = 0.9) {
  let lp = 0;
  const t0 = tb - 0.5;
  // 左→右へ横切るワイプに合わせてパンも左右に流す
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR, j = s0 + i;
    if (j < 0 || j >= N) continue;
    const x = t / len, env = Math.pow(Math.sin(Math.PI * Math.min(1, x * 1.15)), 2);
    const cut = 0.02 + 0.25 * env;
    lp += cut * (noise() - lp);
    const v = lp * env * g, pan = -1 + 2 * x;
    L[j] += v * Math.cos((pan + 1) * Math.PI / 4); R[j] += v * Math.sin((pan + 1) * Math.PI / 4);
  }
}
function pop(t0, m, g = 0.28) {
  const f = mtof(m); let ph = 0;
  add(t0, 0.35, t => { ph += 2 * Math.PI * f * (1 + 0.6 * Math.exp(-t * 45)) / SR; return Math.sin(ph) * Math.exp(-t * 12); }, g);
}
function impact(t0, g = 1) {
  kick(t0, 1.0 * g);
  let lp = 0;
  add(t0, 2.5, t => { lp += 0.15 * (noise() - lp); return lp * Math.exp(-t * 2.2); }, 0.9 * g);
  let ph = 0;
  add(t0, 2.0, t => { ph += 2 * Math.PI * 36 / SR; return Math.sin(ph) * Math.exp(-t * 1.6); }, 0.5 * g);
}
function tick(t0, m) {
  const f = mtof(m);
  add(t0, 0.06, t => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 70), 0.18);
}
function sparkle(t0, base) {
  [0, 4, 7, 12, 16, 19].forEach((d, i) => pluck(t0 + i * 0.05, base + d, 0.12, -0.6 + i * 0.24));
}

// ---------- arrangement ----------
// 野菜の切り替わり (12.3s + 1.22s*i) に 2 拍が一致するグリッド
const BEAT = 0.61, ORIGIN = 12.3;
const beatT = k => ORIGIN + k * BEAT;
// Fmaj7 - Dm7 - B♭maj7 - C
const PROG = [
  { root: 41, notes: [53, 57, 60, 64] },
  { root: 38, notes: [50, 53, 57, 60] },
  { root: 34, notes: [46, 50, 53, 57] },
  { root: 36, notes: [48, 52, 55, 60] },
];
const chordAt = k => PROG[((Math.floor(k / 4) % 4) + 4) % 4];

for (let k = -21; beatT(k) < 55.5; k++) {
  const t = beatT(k), c = chordAt(k);
  if (t < -BEAT * 4) continue;
  if ((k % 4 + 4) % 4 === 0) pad(Math.max(0, t), BEAT * 4, c.notes);

  const groove = t >= 12 && t < 51.9;
  const light = t >= 5.2 && t < 12;
  if (groove) {
    kick(t);
    if ((k % 2 + 2) % 2 === 1) clap(t);
    hat(t + BEAT / 2, 0.12); hat(t + BEAT / 4, 0.05, -0.3); hat(t + BEAT * 3 / 4, 0.05, -0.3);
    bass(t, BEAT * 0.45, c.root); bass(t + BEAT / 2, BEAT * 0.4, c.root + 12, 0.24);
    // アルペジオ
    const arp = [0, 1, 2, 3, 2, 1, 3, 2];
    for (let h = 0; h < 2; h++) {
      const m = c.notes[arp[(((k * 2 + h) % 8) + 8) % 8]] + 12;
      pluck(t + h * BEAT / 2, m, 0.09, h ? 0.4 : -0.4);
    }
  } else if (light) {
    if ((k % 2 + 2) % 2 === 0) kick(t, 0.7);
    hat(t + BEAT / 2, 0.08);
    bass(t, BEAT * 0.9, c.root, 0.26);
  }
}

// 冒頭: 円のポップ / 数字カウント / 20 のパンチ
impact(0.18, 0.8);
for (let n = 1; n <= 20; n++) {
  const p = 1 - Math.cbrt(1 - (n - 0.5) / 20);
  tick(0.5 + 0.9 * p, 72 + n);
}
impact(1.42, 0.9);
sparkle(1.45, 77);

// メリット切り替え
whoosh(8.6, 0.3);
// ワイプ前のスネアロール
for (let i = 0; i < 16; i++) clap(11.0 + i * 0.0625, 0.08 + i * 0.012);

// 野菜 20 品目のポップ (F メジャー・ペンタトニックで上昇)
const PENTA = [0, 2, 4, 7, 9];
for (let i = 0; i < 20; i++) {
  const k = i % 10;
  pop(12.3 + i * 1.22, 72 + PENTA[k % 5] + 12 * Math.floor(k / 5));
}

// おさらいグリッド: タイルの着地とハイライト
for (let i = 0; i < 20; i++) tick(37.55 + i * 0.035, 84 + (i % 5) * 2);
sparkle(39.6, 72); sparkle(42.3, 74);

// 作業カード
for (let i = 0; i < 4; i++) whoosh(45.75 + i * 0.45, 0.22, 0.5);

// ワイプ
for (const tb of [5, 12, 37, 45, 52]) whoosh(tb, 0.55);

// ラスト
impact(52.95, 1);
pad(52.95, 3.6, [53, 57, 60, 64, 69], 0.08);
sparkle(53.0, 77);
pluck(54.4, 77, 0.14); pluck(54.4, 81, 0.12); pluck(54.4, 84, 0.12);

// ---------- mix ----------
kickTimes.sort((a, b) => a - b);
let ki = 0, last = -10;
for (let j = 0; j < N; j++) {
  const t = j / SR;
  while (ki < kickTimes.length && kickTimes[ki] <= t) last = kickTimes[ki++];
  const duck = 1 - 0.55 * Math.exp(-(t - last) * 9);
  L[j] += padL[j] * duck; R[j] += padR[j] * duck;
}
let peak = 0;
for (let j = 0; j < N; j++) {
  const t = j / SR;
  const fade = Math.min(1, t / 0.02) * Math.min(1, (DUR - t) / 1.6);
  L[j] = Math.tanh(L[j] * 1.1) * fade; R[j] = Math.tanh(R[j] * 1.1) * fade;
  peak = Math.max(peak, Math.abs(L[j]), Math.abs(R[j]));
}
const norm = 0.89 / peak;

const out = path.join(__dirname, 'bgm.wav');
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let j = 0; j < N; j++) {
  buf.writeInt16LE(Math.round(L[j] * norm * 32767), 44 + j * 4);
  buf.writeInt16LE(Math.round(R[j] * norm * 32767), 46 + j * 4);
}
fs.writeFileSync(out, buf);
console.log('done:', out);
