/* audio.js — ピコピコ音源。BGMも効果音もすべて「時刻つきの音符リスト」にして鳴らす */
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function hz(name) {
  if (typeof name === 'number') return name;
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  const semi = NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (+m[3] + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* 音符の作り方。tone は矩形波などの音程つき、noise は雑音系 */
const tone = (t, f, dur, o = {}) => Object.assign({ kind: 'tone', t, f: hz(f), dur, type: 'square', gain: 0.08 }, o, o.f2 ? { f2: hz(o.f2) } : {});
const noise = (t, dur, o = {}) => Object.assign({ kind: 'noise', t, dur, gain: 0.08, filter: 'bandpass', freq: 1200, q: 0.8 }, o);

/* ---------- 効果音 ---------- */
const SFX = {
  blip: (t) => [tone(t, 'A5', 0.035, { wave: 'pulse12', gain: 0.035 })],
  coin: (t) => [tone(t, 'B5', 0.08, { gain: 0.1 }), tone(t + 0.08, 'E6', 0.5, { gain: 0.1, decay: true })],
  coinSmall: (t) => [tone(t, 'E6', 0.05, { gain: 0.05 }), tone(t + 0.05, 'B6', 0.2, { gain: 0.05, decay: true })],
  pop: (t, p = 0) => [tone(t, 300 + p * 40, 0.09, { type: 'triangle', f2: 900 + p * 60, gain: 0.14, decay: true })],
  step: (t) => [noise(t, 0.05, { filter: 'lowpass', freq: 900, gain: 0.07, decay: true })],
  door: (t) => [noise(t, 0.25, { filter: 'bandpass', freq: 500, freq2: 300, q: 2, gain: 0.08 }), tone(t, 'C3', 0.18, { type: 'triangle', gain: 0.1, decay: true })],
  whoosh: (t) => [noise(t, 0.32, { filter: 'bandpass', freq: 600, freq2: 3200, q: 1.2, gain: 0.05 })],
  cheer: (t) => ['C5', 'E5', 'G5', 'C6', 'E6'].map((n, i) => tone(t + i * 0.05, n, 0.12, { wave: 'pulse25', gain: 0.06, decay: true })),
  talk: (t, n = 5) => Array.from({ length: n }, (_, i) => tone(t + i * 0.07, i % 2 ? 'D5' : 'G5', 0.045, { wave: 'pulse25', gain: 0.04 })),
  beep: (t) => [tone(t, 'A5', 0.14, { gain: 0.07 })],
  buzzer: (t) => [tone(t, 110, 0.6, { gain: 0.09 }), tone(t, 116, 0.6, { gain: 0.07 })],
  error: (t) => [tone(t, 'E5', 0.12, { gain: 0.08 }), tone(t + 0.14, 'Bb4', 0.12, { gain: 0.08 }), tone(t + 0.28, 'E4', 0.3, { gain: 0.08, decay: true })],
  thud: (t, p = 0) => [tone(t, 150 - p * 8, 0.16, { type: 'sine', f2: 45, gain: 0.3, decay: true }), noise(t, 0.08, { filter: 'lowpass', freq: 700, gain: 0.12, decay: true })],
  tick: (t, hi) => [tone(t, hi ? 'E7' : 'B6', 0.02, { gain: 0.04 })],
  chime: (t) => ['E5', 'C5', 'D5', 'G4'].map((n, i) => tone(t + i * 0.32, n, 0.9, { type: 'triangle', gain: 0.18, decay: true })),
  rotor: (t, dur) => [noise(t, dur, { filter: 'lowpass', freq: 420, gain: 0.16, am: 13, amDepth: 0.12, long: true, fade: 0.6 })],
  jingle: (t) => ['G4', 'C5', 'E5', 'G5', 'C6'].map((n, i) => tone(t + i * 0.09, n, i === 4 ? 0.6 : 0.1, { wave: 'pulse25', gain: 0.08, decay: i === 4 })),
  waves: (t, dur) => [noise(t, dur, { filter: 'lowpass', freq: 650, gain: 0.07, am: 0.33, amDepth: 0.06, long: true, fade: 1.2 })],
  sparkle: (t) => ['E6', 'G6', 'C7'].map((n, i) => tone(t + i * 0.06, n, 0.12, { wave: 'pulse12', gain: 0.035, decay: true })),
};

/* ---------- BGM（128BPM・16小節でちょうど30秒） ---------- */
const CHORD_TONES = { C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Dm: ['D', 'F', 'A'], Em: ['E', 'G', 'B'] };
function ladder(chord) {
  const names = CHORD_TONES[chord], out = [];
  let oct = 4, prev = -1;
  for (let i = 0; i < 8; i++) {
    const n = names[i % 3];
    const s = NOTE_BASE[n] + oct * 12;
    if (s <= prev) oct++;
    const v = NOTE_BASE[n] + oct * 12;
    out.push(n + oct); prev = v;
  }
  return out;
}
const MELODY = {
  A: [4, null, 5, 4, 3, null, 4, 5],
  B: [5, 4, 3, null, 2, 3, 4, null],
  C: [3, 3, 4, 5, 6, null, 5, null],
  D: [6, null, null, 5, 4, null, 3, null],
};
function music(o = {}) {
  const beat = 60 / 128, bar = beat * 4, e = beat / 2, ev = [];
  const prog = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G', 'F', 'G', 'F', 'C'];
  const shape = ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'C', 'A', 'B', 'D', 'C', 'A', 'C', 'D', null];
  prog.forEach((ch, b) => {
    const t0 = b * bar, lad = ladder(ch), root = CHORD_TONES[ch][0];
    const calm = b >= 14;
    if (b === 15) {
      ['C5', 'E5', 'G5', 'C6'].forEach((n) => ev.push(tone(t0, n, 1.8, { wave: 'pulse25', gain: 0.045, decay: true })));
      ev.push(tone(t0, 'C3', 1.8, { type: 'triangle', gain: 0.16, decay: true }));
      return;
    }
    const pat = MELODY[shape[b]];
    pat.forEach((idx, i) => {
      if (idx == null) return;
      if (calm && i % 2) return;
      ev.push(tone(t0 + i * e, lad[idx], calm ? e * 1.8 : e * 0.9, { wave: 'pulse25', gain: 0.045 }));
    });
    for (let i = 0; i < 8; i++) {
      if (calm && i % 2) continue;
      ev.push(tone(t0 + i * e, root + (i % 2 ? 3 : 2), e * 0.85, { type: 'triangle', gain: 0.13 }));
    }
    if (!calm) {
      [0, 2].forEach((k) => ev.push(tone(t0 + k * beat, 150, 0.16, { type: 'sine', f2: 42, gain: 0.22, decay: true })));
      [1, 3].forEach((k) => ev.push(noise(t0 + k * beat, 0.11, { filter: 'bandpass', freq: 2200, q: 0.7, gain: 0.07, decay: true })));
    }
    for (let i = 0; i < 8; i++) if (!calm || i % 4 === 2) ev.push(noise(t0 + i * e, 0.035, { filter: 'highpass', freq: 7000, gain: 0.025, decay: true }));
    if (b === 10 || b === 11) {
      for (let i = 0; i < 16; i++) ev.push(tone(t0 + i * e / 2, lad[3 + (i % 4)], e * 0.4, { wave: 'pulse12', gain: 0.025 }));
    }
  });
  return ev;
}

/* ---------- 再生 ---------- */
const WAVE_CACHE = new WeakMap();
function pulseWave(ctx, duty) {
  if (!WAVE_CACHE.has(ctx)) WAVE_CACHE.set(ctx, {});
  const c = WAVE_CACHE.get(ctx);
  if (!c[duty]) {
    const n = 48, real = new Float32Array(n), imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    c[duty] = ctx.createPeriodicWave(real, imag);
  }
  return c[duty];
}
function noiseBuffer(ctx) {
  if (ctx._noise) return ctx._noise;
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  const r = mulberry32(99);
  for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
  ctx._noise = buf;
  return buf;
}
function envelope(g, e, at, dur) {
  const peak = e.gain;
  g.gain.setValueAtTime(0.0001, at);
  if (e.decay) {
    g.gain.linearRampToValueAtTime(peak, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  } else {
    const fade = Math.min(e.fade || 0.02, dur / 2);
    g.gain.linearRampToValueAtTime(peak, at + Math.min(0.006, dur / 4) + (e.long ? Math.min(0.25, dur / 4) : 0));
    g.gain.setValueAtTime(peak, at + dur - fade);
    g.gain.linearRampToValueAtTime(0.0001, at + dur);
  }
}
function scheduleEvents(ctx, dest, events, fromT, base) {
  const nb = noiseBuffer(ctx);
  for (const e of events) {
    if (e.t + e.dur <= fromT) continue;
    let skip = 0;
    if (e.t < fromT) { if (!e.long) continue; skip = fromT - e.t; }
    const at = base + Math.max(0, e.t - fromT), dur = e.dur - skip;
    const g = ctx.createGain();
    envelope(g, e, at, dur);
    let src;
    if (e.kind === 'tone') {
      src = ctx.createOscillator();
      if (e.wave) src.setPeriodicWave(pulseWave(ctx, e.wave === 'pulse12' ? 0.125 : 0.25));
      else src.type = e.type;
      src.frequency.setValueAtTime(e.f, at);
      if (e.f2) src.frequency.exponentialRampToValueAtTime(e.f2, at + dur);
      src.connect(g);
    } else {
      src = ctx.createBufferSource();
      src.buffer = nb; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = e.filter; f.Q.value = e.q || 0.8;
      f.frequency.setValueAtTime(e.freq, at);
      if (e.freq2) f.frequency.exponentialRampToValueAtTime(e.freq2, at + dur);
      src.connect(f); f.connect(g);
    }
    if (e.am) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = e.am; depth.gain.value = e.amDepth || 0.05;
      lfo.connect(depth); depth.connect(g.gain);
      lfo.start(at); lfo.stop(at + dur + 0.02);
    }
    if (e.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = e.pan; g.connect(p); p.connect(dest);
    } else g.connect(dest);
    src.start(at, e.kind === 'noise' ? (e.t * 0.37) % 1.5 : 0);
    src.stop(at + dur + 0.03);
  }
}
function masterChain(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  return master;
}
function encodeWav(buf) {
  const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const dv = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, n * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { dv.setInt16(o, clamp(data[c][i], -1, 1) * 0x7fff, true); o += 2; }
  const bytes = new Uint8Array(dv.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
async function renderAudioWav(events, duration) {
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil(sr * duration), sr);
  scheduleEvents(ctx, masterChain(ctx), events, 0, 0);
  return encodeWav(await ctx.startRendering());
}

const AUDIO = { hz, tone, noise, SFX, music, scheduleEvents, masterChain, renderAudioWav };
