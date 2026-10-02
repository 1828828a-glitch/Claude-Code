// やわらか版 (soft.html) 用の BGM を合成して bgm_soft.wav に書き出す。
// マリンバ風の音・ベル・パッド・シェイカーだけで組み、強いアタックは使わない。
//   node bgm_soft.cjs -> bgm_soft.wav
const fs = require('fs');
const path = require('path');

const SR = 44100, DUR = 58, N = SR * DUR;
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
// カルーセルで野菜が中央に止まる時刻 (13.4s + 1.22s*i) に 2 拍が一致するグリッド
const BEAT = 0.61, ORIGIN = 13.4;
const beatT = k => ORIGIN + k * BEAT;
const PROG = [
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 45, notes: [55, 57, 60, 64] }, // Am7
  { root: 46, notes: [53, 57, 58, 62] }, // B♭maj7
  { root: 48, notes: [52, 55, 57, 60] }, // C6
];
const chordAt = k => PROG[((Math.floor(k / 4) % 4) + 4) % 4];
const ARP = [0, 2, 1, 3, 2, 0, 3, 1];

for (let k = -23; beatT(k) < 56.5; k++) {
  const t = beatT(k), c = chordAt(k), kk = ((k % 4) + 4) % 4;
  if (t < -BEAT * 4) continue;
  if (kk === 0) { pad(Math.max(0, t), BEAT * 4, c.notes); bass(Math.max(0, t), BEAT * 3.8, c.root); }

  const groove = t >= 12.8 && t < 52.6;
  const intro = t >= 3.2 && t < 12.8;
  if (groove) {
    if (kk === 0 || kk === 2) softKick(t);
    shaker(t + BEAT / 2); shaker(t + BEAT / 4, 0.015, -0.25); shaker(t + BEAT * 3 / 4, 0.015, -0.25);
    marimba(t, c.notes[ARP[((k % 8) + 8) % 8]] + 12, 0.11, kk % 2 ? 0.3 : -0.3);
    if (kk === 3) marimba(t + BEAT / 2, c.notes[3] + 12, 0.07, 0.4);
  } else if (intro) {
    if (kk % 2 === 0) marimba(t, c.notes[ARP[((k % 8) + 8) % 8]] + 12, 0.08, -0.2);
    shaker(t + BEAT / 2, 0.02);
  }
}

// オープニング: 芽が伸びる / 葉が開く / ハート / ロゴ
for (let i = 0; i < 5; i++) marimba(0.5 + i * 0.2, [65, 67, 69, 72, 74][i], 0.1, -0.4 + i * 0.2);
bell(1.35, 81, 0.08); bell(1.5, 84, 0.07);
bell(2.05, 88, 0.09);
chime(3.0, 77, 0.06);

// メリットのカード
bell(6.6, 84, 0.07); bell(8.7, 86, 0.07);

// 野菜が中央に来るたびに一音 (F メジャー・ペンタトニック)
const PENTA = [0, 2, 4, 7, 9];
for (let i = 0; i < 20; i++) {
  const k = i % 10;
  bell(13.4 + i * 1.22, 84 + PENTA[k % 5] + 12 * Math.floor(k / 5) - 12, 0.06, 0.2);
}

// おさらい: ハイライト
chime(40.6, 79); chime(43.4, 81);

// 作業チェック
for (let i = 0; i < 4; i++) bell(46 + 0.7 + i * 0.7 + 0.75, 79 + [0, 2, 4, 7][i], 0.09, 0.4);

// シーン転換
for (const tb of [6, 13, 38, 46, 53]) swell(tb - 0.8, 0.9);

// ラスト
pad(53.4, 4.2, [53, 57, 60, 64, 67], 0.035);
bass(53.4, 4.2, 41, 0.12);
chime(53.8, 77, 0.07);
chime(55.4, 84, 0.06);

// ---------- master ----------
let peak = 0;
for (let j = 0; j < N; j++) {
  const t = j / SR;
  const fade = Math.min(1, t / 0.3) * Math.min(1, (DUR - t) / 2.0);
  L[j] = Math.tanh(L[j]) * fade; R[j] = Math.tanh(R[j]) * fade;
  peak = Math.max(peak, Math.abs(L[j]), Math.abs(R[j]));
}
const norm = 0.89 / peak;

const out = path.join(__dirname, 'bgm_soft.wav');
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
