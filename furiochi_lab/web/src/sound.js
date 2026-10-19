// ━━━ 音（出囃子・めくり・拍子木・ハリセン・太鼓・鉦・拍手） ━━━
// どの音も Web Audio でその場で作るので、音声ファイルがなくても鳴る。web/sounds/ に同じ名前の音声（Audio Studio などで
// 作ったもの）を置いてビルドすると、そちらを優先する。読めなかったファイルは作った音に戻す。
// 鳴らすのは押す・送るといった操作のあとだけ。ページを開いただけでは鳴らさない（ブラウザも許さない）
const Sound = (() => {
  const PREF = "furiochi.sound";
  let on = true;
  try { on = localStorage.getItem(PREF) !== "0"; } catch (e) { /* 覚えられなくても鳴らせる */ }
  let ctx = null, out = null, noise = null;
  const files = {}, decoded = {}, cache = {};

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      // 重なっても割れないよう、出口に軽いコンプレッサーを挟む
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.2;
      out = ctx.createGain();
      out.gain.value = 0.8;
      out.connect(comp);
      comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      for (const name of Object.keys(files)) decode(name);
    }
    if (ctx.state !== "running" && typeof ctx.resume === "function") {
      const p = ctx.resume(); // 古い Safari は Promise を返さない
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
    return ctx;
  }
  function decode(name) {
    let bytes;
    try {
      const bin = atob(files[name]);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch (e) { return; }
    const ok = buf => { decoded[name] = buf; }, ng = () => { /* 読めない形式は作った音で鳴らす */ };
    try {
      const p = ctx.decodeAudioData(bytes.buffer, ok, ng);
      if (p && typeof p.catch === "function") p.catch(ng);
    } catch (e) { ng(); }
  }

  // ── 部品 ──
  // すぐ立ち上がり、decay 秒でほぼ無音まで指数的に消える音量の形
  function shape(g, t, peak, decay, attack) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  // 減衰する正弦波（木や金属の鳴り、太鼓の胴）。to を渡すと音程が下がっていく
  function partial(t, f, peak, decay, o = {}) {
    const osc = ctx.createOscillator(), g = ctx.createGain(), a = o.attack || 0.001;
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || decay));
    shape(g, t, peak, decay, a);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + a + decay + 0.02);
  }
  // フィルターを通したノイズ（打った瞬間、紙のこすれ、皮の響き）
  function burst(t, peak, decay, type, f, o = {}) {
    const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain(), a = o.attack || 0.001;
    src.buffer = noise; src.loop = true;
    flt.type = type; flt.Q.value = o.q ?? 0.8;
    flt.frequency.setValueAtTime(f, t);
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + a + decay);
    shape(g, t, peak, decay, a);
    src.connect(flt); flt.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.9); src.stop(t + a + decay + 0.02);
  }
  function playBuffer(b, t) {
    const src = ctx.createBufferSource();
    src.buffer = b; src.connect(out); src.start(t);
  }
  // バッファに直接書く音（拍手と三味線）で使うバンドパス。RBJ の式で、中心の高さで 0 dB
  function bandpass(f, q, sr) {
    const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    const b0 = al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return x => { const y = b0 * (x - x2) - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  }
  function normalize(buf, peak) {
    let max = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) max = Math.max(max, Math.abs(v));
    if (!max) return;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= peak / max; }
  }
  const panL = p => Math.cos(p * Math.PI / 2), panR = p => Math.sin(p * Math.PI / 2);

  // ── 鳴りもの ──
  // 拍子木：堅い木を打ち合わせた「チョン」。木の鳴りは倍音が整数倍に並ばない
  function hyoshigi(t, level = 1) {
    burst(t, 0.55 * level, 0.012, "highpass", 2600, { q: 0.7 });
    for (const [f, a, d] of [[1240, 0.5, 0.24], [1312, 0.32, 0.18], [2470, 0.26, 0.12], [3690, 0.16, 0.07], [5180, 0.09, 0.04]])
      partial(t, f, a * level, d);
  }
  // ハリセン：折り重なった紙が一度に当たる「スパーン」。中域の破裂が芯で、紙の端が少しずつ遅れてばらばらと鳴る
  function harisen(t) {
    burst(t, 2.2, 0.11, "bandpass", 1500, { q: 0.5 });
    burst(t, 1, 0.05, "bandpass", 3400, { q: 0.7 });
    burst(t, 0.5, 0.2, "lowpass", 1100, { q: 0.5, attack: 0.003 });
    partial(t, 170, 0.6, 0.08, { to: 90 });
    for (let i = 0; i < 9; i++)
      burst(t + 0.004 + Math.random() * 0.07, 0.1 + Math.random() * 0.15, 0.018, "bandpass", 2000 + Math.random() * 1600, { q: 1.2 });
  }
  // めくり：和紙がめくれる「パラッ」と、台に当たる「パタッ」。stage.js の flip が着地する 0.27 秒に合わせる
  function mekuri(t) {
    burst(t, 0.22, 0.22, "bandpass", 4200, { q: 1.1, to: 1500, attack: 0.05 });
    for (let i = 0; i < 6; i++)
      burst(t + 0.03 + Math.random() * 0.19, 0.07 + Math.random() * 0.08, 0.025, "bandpass", 2400 + Math.random() * 2400, { q: 1.4 });
    burst(t + 0.27, 0.4, 0.05, "lowpass", 650, { q: 0.7 });
    partial(t + 0.27, 230, 0.15, 0.05);
  }
  // 太鼓：皮の「ドン」。打った直後に音程が少し下がる
  function taiko(t, level = 1, ring = 0.7) {
    partial(t, 150, 0.9 * level, ring, { to: 64, glide: 0.14 });
    partial(t, 248, 0.22 * level, ring * 0.4, { to: 132, glide: 0.1 });
    burst(t, 0.55 * level, 0.07, "lowpass", 420, { q: 0.7 });
    burst(t, 0.12 * level, 0.014, "bandpass", 1900, { q: 1 });
  }
  function dodon(t, level = 1) { taiko(t, 0.62 * level, 0.25); taiko(t + 0.13, level); }
  // 太鼓の縁（ふち）を打つ「カッ」
  function fuchi(t, level = 1) {
    burst(t, 0.3 * level, 0.02, "bandpass", 2100, { q: 2 });
    partial(t, 930, 0.2 * level, 0.05);
  }
  // 鉦（当たり鉦）：小さな真鍮の「チン」。近い高さの鳴りが二つあって、かすかにうなる
  function kane(t, level = 1) {
    burst(t, 0.3 * level, 0.006, "highpass", 5000, { q: 0.7 });
    for (const [f, a, d] of [[1960, 0.28, 0.55], [1983, 0.18, 0.6], [2840, 0.2, 0.42], [4130, 0.14, 0.3], [5470, 0.08, 0.22], [7020, 0.05, 0.14]])
      partial(t, f, a * level, d);
  }
  // 30秒チャレンジの残り5秒を刻む小さな木の音
  function tick(t) {
    partial(t, 1850, 0.22, 0.035);
    burst(t, 0.1, 0.008, "highpass", 3200);
  }

  // 拍手：二十数人がそれぞれの速さでたたき、ばらばらにやめていく。一度作ったら使い回す
  function applauseBuffer() {
    if (cache.applause) return cache.applause;
    const sr = ctx.sampleRate, buf = ctx.createBuffer(2, Math.round(sr * 2.4), sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, len = Math.round(sr * 0.04);
    for (let p = 0; p < 24; p++) {
      const rate = 3.4 + Math.random() * 2.4, pan = Math.random(), f = 900 + Math.random() * 1500, q = 1 + Math.random() * 1.2;
      const end = 1 + Math.random() * 0.9, gl = panL(pan), gr = panR(pan);
      for (let t = Math.random() * 0.15; t < end; t += (0.85 + Math.random() * 0.3) / rate) {
        const bp = bandpass(f * (0.92 + Math.random() * 0.16), q, sr), tau = sr * (0.005 + Math.random() * 0.004);
        const amp = (0.55 + Math.random() * 0.45) * Math.min(1, t / 0.12 + 0.35), s0 = Math.round(t * sr);
        for (let i = 0; i < len && s0 + i < n; i++) {
          const x = (Math.random() * 2 - 1) * Math.exp(-i / tau) * Math.min(1, i / (sr * 0.0006));
          const y = (bp(x) * 2.2 + x * 0.35) * amp;
          L[s0 + i] += y * gl; R[s0 + i] += y * gr;
        }
      }
    }
    normalize(buf, 0.8);
    return (cache.applause = buf);
  }
  function applause(t) { playBuffer(applauseBuffer(), t); }

  // 三味線：Karplus-Strong（短いノイズを遅延線で回して弦の鳴りにする）。撥が皮を打つ「パチ」と、さわりのびりつきを足す
  function pluck(L, R, at, f, amp, pan) {
    const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / f)), line = new Float32Array(N);
    for (let i = 0; i < N; i++) line[i] = Math.random() * 2 - 1;
    const loss = Math.exp(-6.9 / (f * 0.9)); // 0.9 秒で -60 dB
    const s0 = Math.round(at * sr), len = Math.min(L.length - s0, Math.round(sr * 1.2));
    const bp = bandpass(2600, 1.4, sr), gl = panL(pan) * amp, gr = panR(pan) * amp, hitLen = sr * 0.03;
    let k = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[k];
      line[k] = loss * (0.7 * cur + 0.3 * line[(k + 1) % N]);
      k = (k + 1) % N;
      const hit = i < hitLen ? bp(Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.006)) * 0.9 : 0;
      const skin = Math.sin(2 * Math.PI * 190 * i / sr) * Math.exp(-i / (sr * 0.018)) * 0.35;
      const y = Math.tanh(cur * 1.8) * 0.75 + hit + skin;
      L[s0 + i] += y * gl; R[s0 + i] += y * gr;
    }
  }
  // 出囃子：都節（ミ・ファ・ラ・シ・ド）の三味線に太鼓と鉦を重ねた、3秒ほどの短い入り
  const E4 = 329.6, F4 = 349.2, A4 = 440, B4 = 493.9, C5 = 523.3, E5 = 659.3, EIGHTH = 0.15;
  const PHRASE = [ // [8分音符の位置, 弦, 強さ]
    [0, [E4, B4], 1], [1, [B4], 0.55], [2, [E5], 0.8], [4, [C5], 0.7], [5, [B4], 0.6], [6, [A4], 0.7], [7, [F4], 0.6],
    [8, [E4, B4], 1], [10, [E4], 0.5], [12, [E4, B4, E5], 1.1],
  ];
  function shamisenBuffer() {
    if (cache.shamisen) return cache.shamisen;
    const sr = ctx.sampleRate, buf = ctx.createBuffer(2, Math.round(sr * 3.2), sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    // 和音は撥が弦を順に払うので、低い弦から 12ms ずつずらす
    for (const [pos, notes, amp] of PHRASE)
      notes.forEach((f, i) => pluck(L, R, pos * EIGHTH + i * 0.012, f, amp / Math.sqrt(notes.length), 0.42 + i * 0.08));
    normalize(buf, 0.6);
    return (cache.shamisen = buf);
  }
  function debayashi(t) {
    playBuffer(shamisenBuffer(), t);
    const at = k => t + k * EIGHTH;
    taiko(at(0), 0.9); kane(at(0), 0.45);
    fuchi(at(4), 0.6); taiko(at(6), 0.5, 0.3);
    taiko(at(8), 0.85); fuchi(at(10), 0.5); taiko(at(11), 0.55, 0.25);
    taiko(at(12), 1); kane(at(12), 0.6);
  }

  const SYNTH = { debayashi, mekuri, hyoshigi, harisen, taiko, dodon, kane, tick, applause };
  function cue(name, t, ...args) {
    if (decoded[name]) playBuffer(decoded[name], t); else SYNTH[name](t, ...args);
  }
  function play(name, delay = 0) {
    if (!on || !(name in SYNTH)) return;
    const c = ensure();
    if (!c) return;
    try { cue(name, c.currentTime + 0.02 + delay); } catch (e) { /* 鳴らなくても練習は続けられる */ }
  }
  // 結果の締め。得点率が8割以上なら「ドドン」と拍手、5割以上なら「ドドン」、それ未満は太鼓ひとつ
  function score(r, delay = 0) {
    if (!on) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + 0.02 + delay;
    try {
      if (r >= 0.8) { cue("dodon", t); cue("applause", t + 0.22); }
      else if (r >= 0.5) cue("dodon", t);
      else cue("taiko", t, 0.6, 0.5);
    } catch (e) { /* 同上 */ }
  }
  // ビルドで埋め込んだ音声（名前 → base64）。知らない名前は使わない
  function load(map) {
    for (const [name, b64] of Object.entries(map || {})) {
      if (!(name in SYNTH) || typeof b64 !== "string") continue;
      files[name] = b64;
      if (ctx) decode(name);
    }
  }
  function set(v) {
    on = !!v;
    try { localStorage.setItem(PREF, on ? "1" : "0"); } catch (e) { /* 同上 */ }
    if (on) ensure();
  }
  // 最初の操作で音の出口を開けておく。講評の結果のように、押してから遅れて鳴る音も止められないように
  for (const ev of ["click", "keydown", "touchend"]) document.addEventListener(ev, () => { if (on) ensure(); }, true);

  return { play, score, load, set, enabled: () => on };
})();
