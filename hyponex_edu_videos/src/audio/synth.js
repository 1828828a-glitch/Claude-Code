// BGMと効果音をJavaScriptだけで合成する（ブラウザでもNodeでも動く）
export const SR = 48000;

function rngf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

class Bus {
  constructor(len) {
    this.L = new Float32Array(len);
    this.R = new Float32Array(len);
    this.len = len;
  }
  add(i, v, pan = 0) {
    if (i < 0 || i >= this.len) return;
    const l = Math.cos((pan + 1) * Math.PI / 4);
    const r = Math.sin((pan + 1) * Math.PI / 4);
    this.L[i] += v * l;
    this.R[i] += v * r;
  }
}

// ---- 楽器 ----
// カープラス・ストロング法の撥弦（ウクレレ風）
function pluck(bus, t0, freq, amp, dur = 1.3, pan = 0, seed = 1, bright = 0.5) {
  const r = rngf(seed);
  const N = Math.max(2, Math.round(SR / freq - 0.5));
  const buf = new Float32Array(N);
  let prev = 0, mean = 0;
  for (let i = 0; i < N; i++) {
    const w = r() * 2 - 1;
    prev += (w - prev) * (0.35 + bright * 0.5);
    buf[i] = prev;
    mean += prev;
  }
  mean /= N;
  for (let i = 0; i < N; i++) buf[i] -= mean;
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  const decay = 0.996;
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const a = buf[idx];
    const nxt = idx + 1 === N ? 0 : idx + 1;
    buf[idx] = 0.5 * (a + buf[nxt]) * decay;
    idx = nxt;
    const env = i < 40 ? i / 40 : 1;
    const tail = i > len - 2000 ? (len - i) / 2000 : 1;
    bus.add(start + i, a * amp * env * tail, pan);
  }
}

// マリンバ風（倍音の減衰）
function marimba(bus, t0, freq, amp, pan = 0) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(1.2 * SR);
  const parts = [[1, 1, 5.5], [3.93, 0.25, 14], [9.2, 0.08, 24]];
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let v = 0;
    for (const [m, a, d] of parts) v += Math.sin(2 * Math.PI * freq * m * tt) * a * Math.exp(-d * tt);
    const env = i < 60 ? i / 60 : 1;
    bus.add(start + i, v * amp * env, pan);
  }
}

// ベル（FM）
function bell(bus, t0, freq, amp, dur = 1.6, pan = 0, ratio = 3.5, index = 2.2) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const e = Math.exp(-3.2 * tt / dur * 2.2);
    const mod = Math.sin(2 * Math.PI * freq * ratio * tt) * index * Math.exp(-6 * tt);
    const v = Math.sin(2 * Math.PI * freq * tt + mod) * e;
    const env = i < 30 ? i / 30 : 1;
    bus.add(start + i, v * amp * env, pan);
  }
}

function bass(bus, t0, freq, amp, dur = 0.45) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const e = Math.exp(-4.5 * tt) * (i < 80 ? i / 80 : 1) * (i > len - 600 ? (len - i) / 600 : 1);
    const v = Math.sin(2 * Math.PI * freq * tt) * 0.8 + Math.sin(4 * Math.PI * freq * tt) * 0.18;
    bus.add(start + i, v * amp * e, 0);
  }
}

function kick(bus, t0, amp) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(0.32 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const f = 48 + 110 * Math.exp(-28 * tt);
    ph += (2 * Math.PI * f) / SR;
    bus.add(start + i, Math.sin(ph) * Math.exp(-9 * tt) * amp, 0);
  }
}

function noiseHit(bus, t0, amp, dur, hp = 0.9, pan = 0, seed = 3, decay = 30) {
  const r = rngf(seed);
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  let prev = 0, prevIn = 0;
  for (let i = 0; i < len; i++) {
    const w = r() * 2 - 1;
    // 1次ハイパス
    const y = hp * (prev + w - prevIn);
    prevIn = w;
    prev = y;
    const tt = i / SR;
    bus.add(start + i, y * Math.exp(-decay * tt) * amp, pan);
  }
}

function clap(bus, t0, amp) {
  for (let k = 0; k < 3; k++) noiseHit(bus, t0 + k * 0.009, amp * (k === 2 ? 1 : 0.6), 0.16, 0.8, 0, 11 + k, 26);
}

// ---- BGM ----
// 明るいウクレレ＋マリンバ（F長調 108BPM）
export function bgm(bus, duration, opts = {}) {
  const { bpm = 108, gain = 1, seed = 5, startAt = 0 } = opts;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const chords = {
    F: [65, 69, 72, 77], C: [60, 64, 67, 72], Dm: [62, 65, 69, 74], Bb: [58, 62, 65, 70],
    Gm: [55, 62, 67, 70], Am: [57, 64, 69, 72], C7: [60, 64, 70, 72],
  };
  const roots = { F: 41, C: 36, Dm: 38, Bb: 34, Gm: 43, Am: 45, C7: 36 };
  const prog = ['F', 'C', 'Dm', 'Bb', 'Gm', 'C', 'F', 'C7'];
  // メロディ（8小節、拍単位: [拍位置, midi, 長さ]）
  const mel = [
    [0, 72, 1], [1, 74, 0.5], [1.5, 77, 1.5], [3, 76, 1],
    [4, 72, 1], [5, 74, 0.5], [5.5, 72, 0.5], [6, 67, 2],
    [8, 69, 1], [9, 72, 0.5], [9.5, 74, 1.5], [11, 72, 1],
    [12, 70, 1], [13, 69, 0.5], [13.5, 67, 0.5], [14, 65, 2],
    [16, 67, 1], [17, 70, 0.5], [17.5, 74, 1.5], [19, 72, 1],
    [20, 72, 1], [21, 76, 0.5], [21.5, 79, 1.5], [23, 77, 1],
    [24, 81, 1], [25, 79, 0.5], [25.5, 77, 0.5], [26, 76, 1], [27, 74, 1],
    [28, 72, 1.5], [29.5, 74, 0.5], [30, 76, 2],
  ];
  const strum = [[0, 1, 1], [1, 1, 0.8], [1.5, -1, 0.55], [2.5, -1, 0.6], [3, 1, 0.75], [3.5, -1, 0.5]];
  const r = rngf(seed);
  const nBars = Math.ceil((duration - startAt) / bar) + 1;
  for (let b = 0; b < nBars; b++) {
    const t0 = startAt + b * bar;
    const name = prog[b % prog.length];
    const notes = chords[name];
    // ウクレレ
    for (const [pos, dir, vel] of strum) {
      const ts = t0 + pos * beat;
      if (ts > duration) break;
      const order = dir > 0 ? notes : [...notes].reverse();
      order.forEach((n, k) => {
        pluck(bus.music, ts + k * 0.011 + r() * 0.004, midi(n), 0.12 * vel * gain, 1.1, (k - 1.5) * 0.25, Math.floor(r() * 1e6), 0.45);
      });
    }
    // ベース
    bass(bus.music, t0, midi(roots[name]), 0.34 * gain, beat * 1.6);
    bass(bus.music, t0 + beat * 2, midi(roots[name] + 7), 0.26 * gain, beat * 1.4);
    // リズム
    kick(bus.music, t0, 0.3 * gain);
    kick(bus.music, t0 + beat * 2, 0.24 * gain);
    clap(bus.music, t0 + beat, 0.06 * gain);
    clap(bus.music, t0 + beat * 3, 0.06 * gain);
    for (let k = 0; k < 8; k++) {
      noiseHit(bus.music, t0 + k * beat * 0.5, (k % 2 ? 0.025 : 0.04) * gain, 0.05, 0.97, 0.3, 100 + b * 8 + k, 60);
    }
    // メロディ（2周目以降に入る）
    if (b >= 2) {
      const phraseBar = (b - 2) % 8;
      for (const [pos, n] of mel) {
        if (pos >= phraseBar * 4 && pos < phraseBar * 4 + 4) {
          const ts = t0 + (pos - phraseBar * 4) * beat;
          if (ts < duration) marimba(bus.send, ts, midi(n), 0.13 * gain, 0.15);
        }
      }
    }
  }
}

// ---- 効果音 ----
function tone(bus, t0, dur, fStart, fEnd, amp, o = {}) {
  const { type = 'sine', pan = 0, attack = 0.004, decay = 8, curve = 'exp', vib = 0, vibRate = 7 } = o;
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const p = tt / dur;
    let f = curve === 'exp' ? fStart * Math.pow(fEnd / fStart, p) : fStart + (fEnd - fStart) * p;
    if (vib) f *= 1 + Math.sin(2 * Math.PI * vibRate * tt) * vib;
    ph += (2 * Math.PI * f) / SR;
    let v;
    if (type === 'square') v = Math.sign(Math.sin(ph)) * 0.6 + Math.sin(ph) * 0.4;
    else if (type === 'saw') v = ((ph / (2 * Math.PI)) % 1) * 2 - 1;
    else if (type === 'tri') v = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else v = Math.sin(ph);
    const env = Math.min(1, tt / attack) * Math.exp(-decay * tt) * (i > len - 200 ? (len - i) / 200 : 1);
    bus.add(start + i, v * amp * env, pan);
  }
}

function filteredNoise(bus, t0, dur, amp, o = {}) {
  const { f0 = 400, f1 = 3000, q = 1.2, pan0 = 0, pan1 = 0, shape = (p) => Math.sin(Math.PI * p), seed = 7 } = o;
  const r = rngf(seed);
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  // 状態変数フィルタ（バンドパス）
  let low = 0, band = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const f = f0 * Math.pow(f1 / f0, p);
    const F = 2 * Math.sin((Math.PI * f) / SR);
    const x = r() * 2 - 1;
    low += F * band;
    const high = x - low - band / q;
    band += F * high;
    bus.add(start + i, band * amp * shape(p), pan0 + (pan1 - pan0) * p);
  }
}

export const SE = {
  pop(bus, t, g = 1) {
    tone(bus.fx, t, 0.12, 1250, 420, 0.5 * g, { decay: 22 });
    noiseHit(bus.fx, t, 0.08 * g, 0.02, 0.9, 0, 5, 200);
  },
  pon(bus, t, g = 1) {
    tone(bus.fx, t, 0.1, 780, 1180, 0.4 * g, { decay: 18 });
    tone(bus.fx, t + 0.08, 0.16, 1180, 1580, 0.36 * g, { decay: 16 });
  },
  swipe(bus, t, g = 1) {
    filteredNoise(bus.fx, t, 0.42, 0.55 * g, { f0: 300, f1: 2600, q: 0.9, pan0: -0.6, pan1: 0.6, shape: (p) => Math.pow(Math.sin(Math.PI * p), 1.5) });
  },
  whoosh(bus, t, g = 1) {
    filteredNoise(bus.fx, t, 0.6, 0.7 * g, { f0: 200, f1: 1800, q: 0.8, pan0: 0.5, pan1: -0.5 });
  },
  sparkle(bus, t, g = 1) {
    const notes = [88, 91, 93, 96, 98, 100, 103, 105];
    const r = rngf(Math.floor(t * 1000));
    for (let i = 0; i < 9; i++) {
      const n = notes[Math.floor(r() * notes.length)];
      bell(bus.send, t + i * 0.055 + r() * 0.02, midi(n), 0.07 * g, 0.5, (r() - 0.5) * 1.4, 2, 0.6);
    }
  },
  shine(bus, t, g = 1) {
    tone(bus.send, t, 0.35, 1400, 3400, 0.16 * g, { decay: 4 });
    bell(bus.send, t + 0.18, midi(100), 0.12 * g, 1.0, 0.3, 2, 0.5);
    bell(bus.send, t + 0.24, midi(105), 0.08 * g, 1.0, -0.3, 2, 0.5);
  },
  chime(bus, t, g = 1) {
    bell(bus.send, t, midi(88), 0.3 * g, 1.4, -0.1, 3.5, 1.4);
    bell(bus.send, t + 0.22, midi(84), 0.3 * g, 1.8, 0.1, 3.5, 1.4);
  },
  buzzer(bus, t, g = 1) {
    for (const [s, d] of [[0, 0.32], [0.4, 0.5]]) {
      tone(bus.fx, t + s, d, 142, 138, 0.24 * g, { type: 'square', decay: 1.2, attack: 0.01 });
      tone(bus.fx, t + s, d, 147, 143, 0.18 * g, { type: 'saw', decay: 1.2, attack: 0.01 });
    }
  },
  impact(bus, t, g = 1) {
    tone(bus.fx, t, 0.9, 120, 38, 0.8 * g, { decay: 4.5 });
    noiseHit(bus.fx, t, 0.35 * g, 0.25, 0.35, 0, 21, 14);
    filteredNoise(bus.send, t, 0.5, 0.25 * g, { f0: 800, f1: 200, q: 0.7, shape: (p) => Math.exp(-5 * p) });
  },
  question(bus, t, g = 1) {
    tone(bus.fx, t, 0.36, 380, 920, 0.34 * g, { decay: 3, vib: 0.03, vibRate: 12 });
  },
  boing(bus, t, g = 1) {
    const start = Math.floor(t * SR), len = Math.floor(0.5 * SR);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const tt = i / SR;
      const f = 300 + 180 * Math.sin(2 * Math.PI * 9 * tt) * Math.exp(-5 * tt);
      ph += (2 * Math.PI * f) / SR;
      bus.fx.add(start + i, Math.sin(ph) * Math.exp(-5 * tt) * 0.4 * g, 0);
    }
  },
  growl(bus, t, g = 1) {
    const start = Math.floor(t * SR), len = Math.floor(1.0 * SR);
    const r = rngf(77);
    let ph = 0, lp = 0, wob = 0;
    for (let i = 0; i < len; i++) {
      const tt = i / SR;
      wob += (r() - 0.5) * 0.02;
      wob *= 0.999;
      const f = 62 + 18 * Math.sin(2 * Math.PI * 3.2 * tt) + wob * 40;
      ph += (2 * Math.PI * f) / SR;
      const saw = ((ph / (2 * Math.PI)) % 1) * 2 - 1;
      lp += (saw - lp) * 0.05;
      const env = Math.sin(Math.PI * tt / 1.0) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 7 * tt));
      bus.fx.add(start + i, lp * env * 0.9 * g, 0);
    }
  },
  type(bus, t, g = 1) {
    noiseHit(bus.fx, t, 0.22 * g, 0.03, 0.95, 0.2, Math.floor(t * 977), 140);
    tone(bus.fx, t, 0.03, 2400, 1800, 0.05 * g, { decay: 80 });
  },
  tap(bus, t, g = 1) {
    noiseHit(bus.fx, t, 0.25 * g, 0.03, 0.9, 0, 9, 120);
    tone(bus.fx, t, 0.09, 900, 500, 0.3 * g, { decay: 30 });
  },
  pour(bus, t, g = 1, dur = 1.1) {
    const r = rngf(55);
    const n = Math.floor(dur * 70);
    for (let i = 0; i < n; i++) {
      const tt = t + r() * dur;
      noiseHit(bus.fx, tt, (0.05 + r() * 0.06) * g, 0.015, 0.97, (r() - 0.5) * 0.8, 200 + i, 260);
      if (r() < 0.25) tone(bus.fx, tt, 0.03, 3000 + r() * 2000, 2000, 0.02 * g, { decay: 120 });
    }
  },
  water(bus, t, g = 1, dur = 1.6) {
    filteredNoise(bus.fx, t, dur, 0.22 * g, { f0: 1800, f1: 2400, q: 0.6, shape: (p) => Math.min(1, p * 8) * Math.min(1, (1 - p) * 5) * (0.8 + 0.2 * Math.sin(p * 60)) });
    for (let i = 0; i < 6; i++) tone(bus.fx, t + 0.15 + i * 0.22, 0.06, 500, 1100, 0.07 * g, { decay: 50 });
  },
  stamp(bus, t, g = 1) {
    tone(bus.fx, t, 0.3, 160, 60, 0.6 * g, { decay: 12 });
    noiseHit(bus.fx, t, 0.3 * g, 0.05, 0.7, 0, 13, 60);
  },
  ding(bus, t, g = 1) {
    bell(bus.send, t, midi(93), 0.22 * g, 1.2, 0, 3.5, 1.2);
  },
  fanfare(bus, t, g = 1) {
    const seq = [65, 69, 72, 77, 81];
    seq.forEach((n, i) => marimba(bus.send, t + i * 0.09, midi(n + 12), 0.2 * g, (i - 2) * 0.2));
    [77, 81, 84].forEach((n) => bell(bus.send, t + 0.5, midi(n), 0.08 * g, 1.6, 0, 2, 0.8));
  },
  tada(bus, t, g = 1) {
    [72, 76, 79, 84].forEach((n, i) => pluck(bus.fx, t + i * 0.012, midi(n), 0.2 * g, 1.4, (i - 1.5) * 0.3, 900 + i, 0.8));
    SE.sparkle(bus, t + 0.1, g * 0.8);
  },
  slide(bus, t, g = 1) {
    filteredNoise(bus.fx, t, 0.25, 0.35 * g, { f0: 900, f1: 3000, q: 1.2 });
  },
  drum(bus, t, g = 1) {
    for (let i = 0; i < 14; i++) noiseHit(bus.fx, t + i * 0.045, 0.12 * g * (0.5 + i / 28), 0.05, 0.6, 0, 300 + i, 45);
  },
  surprise(bus, t, g = 1) {
    tone(bus.fx, t, 0.22, 600, 1500, 0.3 * g, { decay: 5, type: 'tri' });
  },
};

// ---- リバーブ（シュレーダー型） ----
function reverb(inp, wet = 0.25, spread = 0) {
  const out = new Float32Array(inp.length);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => {
    const n = Math.floor(((d + spread) * SR) / 44100);
    return { d: n, buf: new Float32Array(n), i: 0, fb: 0.8, lp: 0 };
  });
  const aps = [225, 556, 441].map((d) => {
    const n = Math.floor(((d + spread) * SR) / 44100);
    return { d: n, buf: new Float32Array(n), i: 0 };
  });
  for (let n = 0; n < inp.length; n++) {
    let s = 0;
    const x = inp[n];
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.75 + c.lp * 0.25;
      c.buf[c.i] = x + c.lp * c.fb;
      c.i = c.i + 1 === c.d ? 0 : c.i + 1;
      s += y;
    }
    s /= combs.length;
    for (const a of aps) {
      const b = a.buf[a.i];
      const y = -s + b;
      a.buf[a.i] = s + b * 0.5;
      a.i = a.i + 1 === a.d ? 0 : a.i + 1;
      s = y;
    }
    out[n] = s * wet;
  }
  return out;
}

// 動画全体のサウンドトラック
export function renderSoundtrack(duration, cues, opts = {}) {
  const { music = 0.55, fx = 0.9, bgmOpts = {}, targetRms = 0.125 } = opts;
  const len = Math.ceil(duration * SR);
  const bus = { music: new Bus(len), fx: new Bus(len), send: new Bus(len) };
  bgm(bus, duration, bgmOpts);
  for (const c of cues) {
    const fn = SE[c.name];
    if (fn) fn(bus, Math.max(0, c.time), c.gain ?? 1, ...(c.args || []));
  }
  const revL = reverb(bus.send.L, 0.4, 0);
  const revR = reverb(bus.send.R, 0.4, 23);
  const L = new Float32Array(len), R = new Float32Array(len);
  const fadeIn = 0.3 * SR, fadeOut = 2.2 * SR;
  // SEが鳴っている間はBGMを少し下げる（ダッキング）
  let env = 0;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const lvl = Math.abs(bus.fx.L[i]) + Math.abs(bus.fx.R[i]);
    env = lvl > env ? env + (lvl - env) * 0.01 : env * 0.99993;
    const duck = 1 - Math.min(0.35, env * 0.9);
    let m = music * duck;
    if (i < fadeIn) m *= i / fadeIn;
    if (i > len - fadeOut) m *= (len - i) / fadeOut;
    L[i] = bus.music.L[i] * m + (bus.fx.L[i] + bus.send.L[i]) * fx + revL[i];
    R[i] = bus.music.R[i] * m + (bus.fx.R[i] + bus.send.R[i]) * fx + revR[i];
    sum += L[i] * L[i] + R[i] * R[i];
  }
  // 音量をそろえてからソフトリミッター
  const rms = Math.sqrt(sum / (len * 2)) || 1e-6;
  const gain = Math.min(4, targetRms / rms);
  const endFade = 0.08 * SR;
  for (let i = 0; i < len; i++) {
    let l = L[i] * gain, r = R[i] * gain;
    if (i > len - endFade) {
      const k = (len - i) / endFade;
      l *= k;
      r *= k;
    }
    L[i] = Math.tanh(l * 1.05) * 0.9;
    R[i] = Math.tanh(r * 1.05) * 0.9;
  }
  return { L, R, sampleRate: SR };
}

// WAV(16bit PCM)に変換
export function toWav({ L, R, sampleRate }) {
  const n = L.length;
  const buf = new ArrayBuffer(44 + n * 4);
  const dv = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  dv.setUint32(4, 36 + n * 4, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 2, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 4, true);
  dv.setUint16(32, 4, true);
  dv.setUint16(34, 16, true);
  str(36, 'data');
  dv.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    dv.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    dv.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true);
    o += 4;
  }
  return new Uint8Array(buf);
}
