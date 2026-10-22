// チューリップ編 (tulip.html) 用の BGM を合成して bgm_tulip.wav に書き出す。音色はやわらか版と同じ。
// マリンバ風の音・ベル・パッド・シェイカーだけで組み、強いアタックは使わない。
//   node bgm_tulip.cjs -> bgm_tulip.wav
const fs = require('fs');
const path = require('path');

const SR = 44100, DUR = 60, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 11;
const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };

function add(t0, len, fn, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    const v = fn(i / SR);
    L[j] += v * gl; R[j] += v * gr;
  }
}

// ---------- instruments ----------
function marimba(t0, m, g = 0.14, pan = 0) {
  const f = mtof(m);
  add(t0, 1.2, t => {
    const a = Math.min(1, t * 400);
    return a * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 4.5) + 0.35 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t * 20));
  }, g, pan);
}
function bell(t0, m, g = 0.1, pan = 0) {
  const f = mtof(m);
  add(t0, 3, t => {
    const a = Math.min(1, t * 300);
    return a * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 1.4) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 6));
  }, g, pan);
}
function pad(t0, len, notes, g = 0.028) {
  notes.forEach((m, k) => {
    for (const det of [-0.07, 0.07]) {
      const f = mtof(m + det); let lp = 0;
      add(t0, len + 0.8, t => {
        const ph = (f * t) % 1, tri = 4 * Math.abs(ph - 0.5) - 1;
        lp += 0.05 * (tri - lp);
        const env = Math.min(1, t / 0.6) * (t > len ? Math.exp(-(t - len) * 4) : 1);
        return lp * env;
      }, g, (k % 2 ? 0.4 : -0.4) * (det > 0 ? 1 : -1));
    }
  });
}
function shaker(t0, g = 0.035, pan = 0.25) {
  let p = 0;
  add(t0, 0.1, t => { const n = noise(), d = n - p; p = n; return d * Math.min(1, t * 120) * Math.exp(-t * 45); }, g, pan);
}
function softKick(t0, g = 0.3) {
  let ph = 0;
  add(t0, 0.4, t => { ph += 2 * Math.PI * (48 + 30 * Math.exp(-t * 20)) / SR; return Math.sin(ph) * Math.min(1, t * 200) * Math.exp(-t * 8); }, g);
}
function bass(t0, len, m, g = 0.11) {
  const f = mtof(m);
  add(t0, len, t => Math.sin(2 * Math.PI * f * t) * Math.min(1, t * 30) * Math.min(1, (len - t) * 10) * (0.7 + 0.3 * Math.exp(-t * 3)), g);
}
function chime(t0, base = 79, g = 0.08) {
  [0, 4, 7, 12].forEach((d, i) => bell(t0 + i * 0.09, base + d, g, -0.45 + i * 0.3));
}
function swell(t0, len = 0.8, g = 0.12) {
  // 丸いトランジションに合わせた、やわらかい風の音
  let lp = 0;
  add(t0, len, t => { const x = t / len; lp += 0.03 * (noise() - lp); return lp * Math.pow(Math.sin(Math.PI * x), 2); }, g);
}

// ---------- arrangement ----------
const BEAT = 0.61, ORIGIN = 0.4;
const beatT = k => ORIGIN + k * BEAT;
const PROG = [
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 45, notes: [55, 57, 60, 64] }, // Am7
  { root: 46, notes: [53, 57, 58, 62] }, // B♭maj7
  { root: 48, notes: [52, 55, 57, 60] }, // C6
];
const chordAt = k => PROG[((Math.floor(k / 4) % 4) + 4) % 4];
const ARP = [0, 2, 1, 3, 2, 0, 3, 1];

for (let k = 0; beatT(k) < 58.5; k++) {
  const t = beatT(k), c = chordAt(k), kk = k % 4;
  if (kk === 0) { pad(t, BEAT * 4, c.notes); bass(t, BEAT * 3.8, c.root); }
  const groove = t >= 5.2 && t < 53.6;
  const intro = t >= 2.4 && t < 5.2;
  if (groove) {
    if (kk === 0 || kk === 2) softKick(t);
    shaker(t + BEAT / 2); shaker(t + BEAT / 4, 0.015, -0.25); shaker(t + BEAT * 3 / 4, 0.015, -0.25);
    marimba(t, c.notes[ARP[k % 8]] + 12, 0.11, kk % 2 ? 0.3 : -0.3);
    if (kk === 3) marimba(t + BEAT / 2, c.notes[3] + 12, 0.07, 0.4);
  } else if (intro) {
    if (kk % 2 === 0) marimba(t, c.notes[ARP[k % 8]] + 12, 0.08, -0.2);
  }
}

// オープニング: 球根 / 芽が伸びる / 3 輪咲く / ロゴ
bell(0.25, 77, 0.07);
for (let i = 0; i < 6; i++) marimba(0.9 + i * 0.22, [65, 67, 69, 72, 74, 77][i], 0.09, -0.4 + i * 0.16);
bell(2.1, 84, 0.08); bell(3.05, 81, 0.07); bell(3.25, 88, 0.07);
chime(3.4, 77, 0.06);

// 植えどき: 地域カードが北から順に出る
[7.0, 8.4, 9.8, 11.2].forEach((t, i) => bell(t, [88, 86, 84, 81][i], 0.08, 0.3 - i * 0.2));
bell(12.8, 79, 0.06); bell(13.3, 81, 0.06);

// 球根の選び方: チェック
[16.3, 17.9, 19.5].forEach((t, i) => bell(t, 79 + [0, 4, 7][i], 0.09, 0.4));
chime(19.4, 84, 0.05);

// 植え方: 球根が土に落ちる / 水やり
[23.0, 23.25, 23.5, 25.6, 25.8, 26.0, 26.2].forEach((t, i) => marimba(t + 0.35, [57, 60, 64, 57, 60, 64, 67][i], 0.12, i < 3 ? -0.4 : 0.4));
chime(29.4, 84, 0.05);

// 向きのコツ: 球根が回って外を向く → 葉が広がる
for (let i = 0; i < 6; i++) marimba(34.0 + i * 0.12, 72 + [0, 2, 4, 7, 9, 12][i], 0.08, -0.5 + i * 0.2);
chime(35.8, 79, 0.06);

// 土の配合と寒さ
[40.9, 41.35, 41.8].forEach((t, i) => marimba(t, [60, 64, 67][i], 0.12));
bell(44.3, 88, 0.07);

// 春の開花
[48.6, 49.7, 50.8].forEach((t, i) => chime(t, [77, 79, 81][i], 0.06));

// シーン転換
for (const tb of [6, 15, 22, 33, 40, 47, 54]) swell(tb - 0.8, 0.9);

// ラスト
pad(54.0, 5.0, [53, 57, 60, 64, 67], 0.035);
bass(54.0, 5.0, 41, 0.12);
chime(54.4, 77, 0.07);
chime(56.4, 84, 0.06);

// ---------- master ----------
let peak = 0;
for (let j = 0; j < N; j++) {
  const t = j / SR;
  const fade = Math.min(1, t / 0.3) * Math.min(1, (DUR - t) / 2.0);
  L[j] = Math.tanh(L[j]) * fade; R[j] = Math.tanh(R[j]) * fade;
  peak = Math.max(peak, Math.abs(L[j]), Math.abs(R[j]));
}
const norm = 0.89 / peak;

const out = path.join(__dirname, 'bgm_tulip.wav');
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
