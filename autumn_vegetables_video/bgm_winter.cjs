// 冬に咲く花編 (winter.html) 用の BGM を合成して bgm_winter.wav に書き出す。音色はやわらか版と同じ。
// マリンバ風の音・ベル・パッド・シェイカーだけで組み、強いアタックは使わない。
//   node bgm_winter.cjs -> bgm_winter.wav
const fs = require('fs');
const path = require('path');

const SR = 44100, DUR = 57, N = SR * DUR;
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
const BEAT = 0.61, ORIGIN = 0.3; // 6.4s (1 つ目の花) が拍に乗る
const beatT = k => ORIGIN + k * BEAT;
const PROG = [
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 45, notes: [55, 57, 60, 64] }, // Am7
  { root: 46, notes: [53, 57, 58, 62] }, // B♭maj7
  { root: 48, notes: [52, 55, 57, 60] }, // C6
];
const chordAt = k => PROG[((Math.floor(k / 4) % 4) + 4) % 4];
const ARP = [0, 2, 1, 3, 2, 0, 3, 1];

for (let k = 0; beatT(k) < 55.5; k++) {
  const t = beatT(k), c = chordAt(k), kk = k % 4;
  if (kk === 0) { pad(t, BEAT * 4, c.notes); bass(t, BEAT * 3.8, c.root); }
  const groove = t >= 5.2 && t < 50.6;
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

// オープニング: 花が順に咲く / 23 のカウント / ロゴ
[0.3, 0.55, 0.8, 1.05].forEach((t, i) => bell(t, [79, 81, 84, 88][i], 0.07, -0.45 + i * 0.3));
for (let n = 1; n <= 23; n += 2) marimba(1.7 + 0.9 * (1 - Math.cbrt(1 - (n - 0.5) / 23)), 72 + (n % 10), 0.05);
chime(2.3, 81, 0.06); chime(3.2, 77, 0.06);

// カルーセル: 花が中央に止まるたびに一音 (F メジャー・ペンタトニック)
const PENTA = [0, 2, 4, 7, 9];
for (let i = 0; i < 23; i++) {
  const k = i % 10;
  bell(6.4 + i * 1.22, 84 + PENTA[k % 5] + 12 * Math.floor(k / 5) - 12, 0.06, 0.2);
}

// おさらい: タイルが並ぶ
for (let i = 0; i < 9; i++) marimba(35.3 + i * 0.08, 72 + [0, 2, 4, 7, 9, 12, 14, 16, 19][i], 0.05, -0.6 + i * 0.15);

// 3 つのコツ
[42.8, 45.0, 47.2].forEach((t, i) => bell(t, 79 + [0, 4, 7][i], 0.09, 0.4));

// シーン転換
for (const tb of [6, 35, 42, 51]) swell(tb - 0.8, 0.9);

// ラスト
pad(51.0, 5.0, [53, 57, 60, 64, 67], 0.035);
bass(51.0, 5.0, 41, 0.12);
chime(51.4, 77, 0.07);
chime(53.4, 84, 0.06);

// ---------- master ----------
let peak = 0;
for (let j = 0; j < N; j++) {
  const t = j / SR;
  const fade = Math.min(1, t / 0.3) * Math.min(1, (DUR - t) / 2.0);
  L[j] = Math.tanh(L[j]) * fade; R[j] = Math.tanh(R[j]) * fade;
  peak = Math.max(peak, Math.abs(L[j]), Math.abs(R[j]));
}
const norm = 0.89 / peak;

const out = path.join(__dirname, 'bgm_winter.wav');
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
