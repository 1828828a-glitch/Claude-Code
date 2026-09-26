/*
 * SPOON豊前 紹介動画 — 音（BGMと効果音）
 * 音源ファイルは使わず、Web Audio API で60秒ぶんをまとめて合成します。
 * OfflineAudioContext で一度に書き出すので、ブラウザ再生とMP4で同じ音になります。
 *
 * 0〜4秒   学校や工場でおなじみの昼のチャイム（ウェストミンスターの鐘）
 * 4〜18秒  イ短調。時計の秒針のような刻み
 * 18〜54秒 ハ長調の王道進行（F→G→Em→Am）、テンポ120
 * 54〜60秒 Cで着地し、チャイムの後半をもう一度
 */
(function () {
  'use strict';
  const SV = window.SV;
  const SR = 44100;

  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nf(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    const n = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function setup(ctx, dur) {
    const rnd = SV.util.mulberry32(20260926);
    const noise = ctx.createBuffer(1, SR * 4, SR);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;

    const irLen = Math.floor(SR * 2.4);
    const ir = ctx.createBuffer(2, irLen, SR);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < irLen; i++) {
        lp += (rnd() * 2 - 1 - lp) * 0.45;
        const fadeIn = i < SR * 0.01 ? i / (SR * 0.01) : 1;
        d[i] = lp * Math.exp((-i / SR) * 2.6) * fadeIn;
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.9, 0);
    master.gain.setValueAtTime(0.9, dur - 1.2);
    master.gain.linearRampToValueAtTime(0, dur - 0.05);
    const bus = ctx.createGain();
    const revIn = ctx.createGain();
    const revOut = ctx.createGain();
    revOut.gain.value = 0.28;
    bus.connect(comp);
    revIn.connect(conv);
    conv.connect(revOut);
    revOut.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);
    return { ctx, bus, revIn, noise, rnd, queue: [], done: [] };
  }

  /* ---------- 楽器 ---------- */
  // until: この時刻を過ぎたら鳴り終わっているので、グラフから外してよい
  function out(A, node, send, until) {
    node.connect(A.bus);
    let g = null;
    if (send > 0) {
      g = A.ctx.createGain();
      g.gain.value = send;
      node.connect(g);
      g.connect(A.revIn);
    }
    A.done.push([until, node, g]);
  }
  function envExp(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function partial(A, t, f, amp, attack, decay, send, type) {
    const c = A.ctx;
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = f;
    const g = c.createGain();
    envExp(g, t, amp, attack, decay);
    o.connect(g);
    out(A, g, send, t + attack + decay + 0.1);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }
  function bell(A, t, f, v, dec, send) {
    dec = dec || 2.6;
    send = send == null ? 0.5 : send;
    partial(A, t, f, v, 0.004, dec, send);
    partial(A, t, f * 2.0, v * 0.32, 0.003, dec * 0.45, send);
    partial(A, t, f * 3.0, v * 0.12, 0.002, dec * 0.22, send);
    partial(A, t, f * 4.07, v * 0.1, 0.002, 0.35, send);
    partial(A, t, f * 5.2, v * 0.05, 0.001, 0.15, send);
  }
  function marimba(A, t, f, v, send) {
    const dec = 0.22 + 70 / f;
    send = send == null ? 0.22 : send;
    partial(A, t, f, v, 0.002, dec, send);
    partial(A, t, f * 3.93, v * 0.22, 0.001, dec * 0.16, send);
    partial(A, t, f * 9.2, v * 0.05, 0.001, 0.02, 0);
  }
  function glock(A, t, f, v) {
    partial(A, t, f, v, 0.002, 1.2, 0.35);
    partial(A, t, f * 2.76, v * 0.25, 0.001, 0.35, 0.35);
    partial(A, t, f * 5.4, v * 0.1, 0.001, 0.12, 0.35);
  }
  function bass(A, t, f, dur, v) {
    const c = A.ctx;
    const o1 = c.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = f;
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f;
    const half = c.createGain();
    half.gain.value = 0.5;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(1100, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + 0.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(v * 0.6, t + Math.max(0.02, dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.07);
    o1.connect(lp);
    o2.connect(half);
    half.connect(lp);
    lp.connect(g);
    out(A, g, 0, t + dur + 0.15);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  function pad(A, t, freqs, dur, v, cutoff, send, attack) {
    const c = A.ctx;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff || 1500;
    lp.Q.value = 0.4;
    const g = c.createGain();
    const per = v / (freqs.length * 2);
    const at = attack == null ? 0.35 : attack;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(per, t + at);
    g.gain.setValueAtTime(per, t + Math.max(at, dur - 0.05));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    lp.connect(g);
    out(A, g, send == null ? 0.4 : send, t + dur + 0.8);
    for (const f of freqs) {
      for (const det of [-6, 6]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.7);
      }
    }
  }
  function noiseHit(A, t, dur, v, type, freq, q, send, attack) {
    const c = A.ctx;
    attack = attack || 0.001;
    const s = c.createBufferSource();
    s.buffer = A.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    envExp(g, t, v, attack, dur);
    s.connect(f);
    f.connect(g);
    out(A, g, send, t + attack + dur + 0.1);
    s.start(t, A.rnd() * Math.max(0, 4 - dur - 0.3), dur + attack + 0.05);
  }
  function kick(A, t, v) {
    const c = A.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g);
    out(A, g, 0, t + 0.5);
    o.start(t);
    o.stop(t + 0.45);
    noiseHit(A, t, 0.012, v * 0.2, 'highpass', 2500, 0.7, 0);
  }
  function clap(A, t, v) {
    noiseHit(A, t, 0.03, v, 'bandpass', 1500, 0.9, 0.15);
    noiseHit(A, t + 0.011, 0.03, v * 0.8, 'bandpass', 1500, 0.9, 0.15);
    noiseHit(A, t + 0.022, 0.18, v * 0.9, 'bandpass', 1400, 0.8, 0.2);
  }
  function hat(A, t, v) { noiseHit(A, t, 0.045, v, 'highpass', 8000, 0.6, 0.05); }
  function shaker(A, t, v) { noiseHit(A, t, 0.06, v, 'bandpass', 6200, 1.1, 0.05, 0.012); }
  function snare(A, t, v) {
    noiseHit(A, t, 0.09, v, 'bandpass', 1900, 0.7, 0.12);
    partial(A, t, 190, v * 0.6, 0.001, 0.07, 0);
  }
  function tick(A, t, hi, v) {
    partial(A, t, hi ? 2200 : 1650, v, 0.001, 0.03, 0.05);
    noiseHit(A, t, 0.01, v * 0.45, 'highpass', 5000, 0.7, 0);
  }
  function pop(A, t, f, v) {
    const c = A.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.55, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const g = c.createGain();
    envExp(g, t, v, 0.004, 0.16);
    o.connect(g);
    out(A, g, 0.25, t + 0.3);
    o.start(t);
    o.stop(t + 0.22);
    partial(A, t + 0.004, f * 2, v * 0.15, 0.002, 0.08, 0.2);
  }
  function whoosh(A, t, dur, v, f0, f1) {
    const c = A.ctx;
    const s = c.createBufferSource();
    s.buffer = A.noise;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp);
    bp.connect(g);
    out(A, g, 0.25, t + dur + 0.1);
    s.start(t, A.rnd() * Math.max(0, 4 - dur - 0.3), dur + 0.05);
  }
  function riser(A, t, dur, v) {
    whoosh(A, t, dur, v, 250, 7000);
    const c = A.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(880, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + dur * 0.95);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    o.connect(g);
    out(A, g, 0.3, t + dur + 0.1);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function impact(A, t, v) {
    kick(A, t, v);
    partial(A, t, 55, v * 0.55, 0.005, 1.1, 0.1);
    noiseHit(A, t, 1.5, v * 0.16, 'highpass', 5000, 0.4, 0.35, 0.003);
  }
  function ding(A, t, v) {
    bell(A, t, nf('C6'), v, 1.4, 0.45);
    bell(A, t + 0.09, nf('E6'), v * 0.8, 1.4, 0.45);
  }

  /* ---------- 予約 ----------
   * score() では音をすぐには作らず、時刻つきで予約だけしておく。
   * 書き出し中に0.5秒ごとに一時停止して、1秒先までの音だけを作り、
   * 鳴り終わった音はつなぎを外す。全部を最初に作ると、まだ鳴らない音まで
   * 毎回処理されて、60秒の生成に何倍も時間がかかるため。 */
  const INSTR = { bell, marimba, glock, bass, pad, kick, clap, hat, shaker, snare, tick, pop, whoosh, riser, impact, ding };
  const S = {};
  Object.keys(INSTR).forEach(k => {
    S[k] = (A, t, ...rest) => { A.queue.push({ t, run: () => INSTR[k](A, t, ...rest) }); };
  });
  function renderScheduled(ctx, A, dur) {
    const q = A.queue.map((e, i) => Object.assign(e, { i })).sort((a, b) => a.t - b.t || a.i - b.i);
    let qi = 0;
    const STEP = 0.5, AHEAD = 1.0;
    const createUntil = until => { while (qi < q.length && q[qi].t < until) q[qi++].run(); };
    const prune = now => {
      A.done = A.done.filter(([until, node, send]) => {
        if (until > now) return true;
        node.disconnect();
        if (send) send.disconnect();
        return false;
      });
    };
    createUntil(AHEAD);
    for (let T = STEP; T < dur - 1e-6; T += STEP) {
      const at = T;
      ctx.suspend(at).then(() => {
        prune(at);
        createUntil(at + AHEAD);
        ctx.resume();
      });
    }
    return ctx.startRendering();
  }

  /* ---------- 譜面 ---------- */
  function score(A) {
    const TL = SV.TL;

    // 0–4 秒：昼のチャイム
    ['E5', 'C5', 'D5', 'G4', 'G4', 'D5', 'E5', 'C5'].forEach((n, i) => S.bell(A, TL.chime[i], nf(n), i === 7 ? 0.3 : 0.26, 3.2, 0.55));
    S.pad(A, 0, [nf('C3'), nf('G3'), nf('E4')], 3.6, 0.05, 900, 0.4, 1.2);

    // 4–18 秒：イ短調
    const PROB = [
      [4, ['A3', 'C4', 'E4'], 'A2'], [6, ['A3', 'C4', 'E4'], 'A2'], [8, ['F3', 'A3', 'C4'], 'F2'],
      [10, ['E3', 'G#3', 'B3', 'D4'], 'E2'], [12, ['A3', 'C4', 'E4'], 'A2'], [14, ['F3', 'A3', 'C4', 'E4'], 'F2'],
      [16, ['E3', 'A3', 'B3'], 'E2']
    ];
    for (const [bt, notes, root] of PROB) {
      S.pad(A, bt, notes.map(nf), bt === 16 ? 1.0 : 2.0, 0.06, 850, 0.4, 0.3);
      for (let b = 0; b < 4; b++) S.bass(A, bt + b * 0.5, nf(root), 0.24, b === 0 ? 0.3 : 0.2);
    }
    S.pad(A, 17, [nf('E3'), nf('G#3'), nf('B3')], 1.0, 0.06, 1200, 0.4, 0.2);

    const s2 = TL.s2;
    for (let k = 1; k <= s2.total; k++) S.tick(A, s2.start + k / s2.rate, k % 2 === 0, 0.06);
    for (let tt = 10.5; tt < 17.95; tt += 0.5) S.tick(A, tt, Math.round(tt * 2) % 2 === 0, 0.045);
    s2.segs.forEach(([a], i) => S.pop(A, s2.start + a / s2.rate + 0.02, nf(['A5', 'C6', 'D6', 'E6'][i]), 0.09));
    S.impact(A, s2.hit, 0.42);

    const s3 = TL.s3;
    S.kick(A, s3.factory, 0.22);
    S.pop(A, s3.eyebrow, nf('G5'), 0.07);
    S.whoosh(A, s3.cross - 0.05, 0.3, 0.08, 1500, 400);
    s3.tags.forEach((tt, i) => S.pop(A, tt, nf(['E5', 'G5', 'A5', 'C6', 'D6'][i]), 0.1));
    S.riser(A, 16.4, 1.6, 0.16);

    // 18 秒：SPOON
    const s4 = TL.s4;
    S.impact(A, s4.hit, 0.75);
    ['F5', 'A5', 'C6', 'F6'].forEach((n, i) => S.bell(A, s4.hit + i * 0.035, nf(n), 0.1, 2.4, 0.5));
    S.whoosh(A, s4.wipe - 0.05, 0.6, 0.12, 300, 2600);
    S.whoosh(A, s4.van[0], s4.van[1] - s4.van[0], 0.05, 160, 600);
    S.ding(A, s4.stack, 0.16);
    for (let i = 0; i < 5; i++) S.pop(A, s4.stack + i * 0.1 + 0.12, nf(['C6', 'D6', 'E6', 'G6', 'A6'][i]), 0.06);
    S.whoosh(A, s4.band, 0.8, 0.13, 250, 3000);

    const s5 = TL.s5;
    s5.nodes.forEach((tt, i) => S.pop(A, tt, nf(['C6', 'E6', 'G6'][i]), 0.1));

    const s6 = TL.s6;
    const penta = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
    S.pop(A, s6.rice, nf(penta[0]), 0.1);
    for (let i = 0; i < 7; i++) S.pop(A, s6.okazu0 + i * s6.step, nf(penta[i + 1]), 0.1);
    for (const ci of [1, 3]) {
      const [c0, c1] = s6.counts[ci];
      const n = 12;
      for (let k = 0; k < n; k++) S.tick(A, c0 + (c1 - c0) * (1 - Math.pow(1 - k / n, 2)), true, 0.025);
    }
    S.bell(A, s6.stats[2], nf('G6'), 0.08, 1.2, 0.5);
    S.whoosh(A, s6.morph[0] - 0.1, 0.55, 0.08, 2800, 400);

    const s7 = TL.s7;
    s7.segs.forEach(([, , t0], i) => S.pop(A, t0, nf(['C6', 'E6', 'G6'][i]), 0.08));
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => S.glock(A, 44.8 + i * 0.12, nf(n), 0.05));
    S.whoosh(A, s7.band, 0.8, 0.13, 250, 3000);

    const s8 = TL.s8;
    s8.steps.forEach((tt, i) => S.pop(A, tt, nf(['E6', 'G6', 'A6'][i]), 0.1));
    S.pop(A, s8.hub, nf('C6'), 0.09);
    s8.spokes.forEach((tt, i) => S.pop(A, tt + 0.3, nf(['C6', 'D6', 'E6', 'G6'][i]), 0.06));
    S.riser(A, 52.6, 1.1, 0.1);
    S.whoosh(A, s8.iris - 0.05, 0.45, 0.1, 400, 3500);

    S.pop(A, TL.s9.cta, nf('G6'), 0.1);

    // 18–54 秒：王道進行
    const PROG = [
      { pad: ['F3', 'A3', 'C4', 'E4'], root: 'F2', five: 'C3', hook: [[0, 'A4'], [2, 'C5'], [3, 'F5'], [5, 'E5'], [6, 'C5']] },
      { pad: ['G3', 'B3', 'D4'], root: 'G2', five: 'D3', hook: [[0, 'B4'], [2, 'D5'], [3, 'G5'], [5, 'F5'], [6, 'D5']] },
      { pad: ['E3', 'G3', 'B3', 'D4'], root: 'E2', five: 'B2', hook: [[0, 'G4'], [2, 'B4'], [3, 'E5'], [5, 'D5'], [6, 'B4']] },
      { pad: ['A3', 'C4', 'E4', 'G4'], root: 'A2', five: 'E3', hook: [[0, 'C5'], [2, 'E5'], [3, 'A5'], [5, 'G5'], [6, 'E5'], [7, 'C5']] }
    ];
    const E8 = 0.25;
    for (let bar = 0; bar < 18; bar++) {
      const bt = 18 + bar * 2;
      const ch = PROG[bar % 4];
      const rest = bt >= 42 && bt < 48;
      S.pad(A, bt, ch.pad.map(nf), 2.0, rest ? 0.042 : 0.055, rest ? 1300 : 1500, rest ? 0.5 : 0.4, rest ? 0.45 : 0.25);
      if (rest) {
        S.bass(A, bt, nf(ch.root), 1.5, 0.17);
        S.kick(A, bt, 0.42);
        S.shaker(A, bt + 1.0, 0.03);
      } else {
        const up = ch.root.replace(/\d/, d => String(+d + 1));
        [[0, ch.root, 0.4], [0.75, ch.root, 0.2], [1.0, ch.root, 0.4], [1.5, up, 0.2], [1.75, ch.five, 0.2]]
          .forEach(([o, n, d]) => S.bass(A, bt + o, nf(n), d, 0.26));
        S.kick(A, bt, 0.75);
        S.kick(A, bt + 1.0, 0.7);
        if (bar % 2 === 1 && bt !== 52) S.kick(A, bt + 1.75, 0.45);
        S.clap(A, bt + 0.5, 0.2);
        S.clap(A, bt + 1.5, 0.2);
        for (let k = 0; k < 4; k++) S.hat(A, bt + 0.25 + k * 0.5, 0.05);
        if (bt >= 26) for (let k = 0; k < 16; k++) S.shaker(A, bt + k * 0.125, k % 2 ? 0.02 : 0.032);
      }
      const hv = bt < 26 ? 0.15 : 0.19;
      for (const [pos, n] of ch.hook) {
        if (rest && pos !== 0 && pos !== 3) continue;
        if (bt === 52 && pos > 3) continue;
        S.marimba(A, bt + pos * E8, nf(n), rest ? 0.12 : hv);
        if (bt >= 26 && bt < 42 && (bar % 4 >= 2 || bt >= 34)) S.glock(A, bt + pos * E8, nf(n) * 2, 0.04);
      }
    }
    // 53–54 秒：駆け上がり
    ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'].forEach((n, i) => S.marimba(A, 53 + i * 0.125, nf(n), 0.14 + i * 0.01));
    for (let k = 0; k < 8; k++) S.snare(A, 53 + k * 0.125, 0.05 + k * 0.018);

    // 54–60 秒：着地
    S.impact(A, 54, 0.7);
    S.pad(A, 54, ['C3', 'G3', 'D4', 'E4', 'G4'].map(nf), 5.2, 0.075, 1800, 0.5, 0.08);
    S.bass(A, 54, nf('C2'), 3.5, 0.3);
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => S.marimba(A, 54 + i * 0.25, nf(n), 0.17));
    ['G4', 'D5', 'E5', 'C5'].forEach((n, i) => S.bell(A, 56 + i * 0.5, nf(n), 0.2, 3.0, 0.55));
    for (let k = 0; k < 16; k++) S.shaker(A, 54 + k * 0.25, 0.022 * (1 - k / 16));
  }

  /* ---------- 書き出し ---------- */
  let cached = null;
  SV.renderSoundtrack = function () {
    if (cached) return cached;
    cached = (async () => {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) throw new Error('OfflineAudioContext が使えません');
      const dur = SV.DURATION;
      const ctx = new OAC(2, SR * dur, SR);
      const A = setup(ctx, dur);
      score(A);
      const buf = await renderScheduled(ctx, A, dur);
      let peak = 0;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
      }
      if (peak > 0) {
        const g = 0.78 / peak; // -2.2 dBFS（ラウドネスがおよそ -14 LUFS になる）
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const d = buf.getChannelData(ch);
          for (let i = 0; i < d.length; i++) d[i] *= g;
        }
      }
      return buf;
    })();
    return cached;
  };

  SV.wavBytes = function (buf) {
    const nch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const size = 44 + len * nch * 2;
    const ab = new ArrayBuffer(size);
    const v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, size - 8, true); w(8, 'WAVE');
    w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nch, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * nch * 2, true); v.setUint16(32, nch * 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, len * nch * 2, true);
    const chs = [];
    for (let c = 0; c < nch; c++) chs.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < nch; c++) {
        const s = Math.max(-1, Math.min(1, chs[c][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return new Uint8Array(ab);
  };
  SV.wavBase64 = function (buf) {
    const bytes = SV.wavBytes(buf);
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  };
})();
