/*
 * SPOON豊前 夕食の紹介動画 — 音（BGMと効果音）
 * 音の部品は js/audio.js と共通。ここでは譜面だけを差し替えます。
 *
 * テンポ96（1拍0.625秒、1小節2.5秒、60秒でちょうど24小節）
 *  0〜5秒   終業のチャイム。昼食版と同じ鐘の旋律を、ゆっくり、やわらかく
 *  5〜20秒  イ短調で、少しさびしい夕方
 * 20〜50秒  ハ長調の王道進行（F→G→Em→Am）。昼食版と同じ進行をエレピで
 * 50〜55秒  太鼓を抜いて、夜の食卓
 * 55〜60秒  Cで着地し、チャイムの後半をもう一度
 */
(function () {
  'use strict';
  const SV = window.SV;

  SV.SCORE = function (A, S, nf) {
    const TL = SV.TL;
    const B = 0.625, BAR = 2.5, E8 = B / 2;
    const up = n => n.replace(/\d/, d => String(+d + 1));
    const chord = (t, notes, v, dur) => notes.forEach((n, i) => S.epiano(A, t + i * 0.012, nf(n), v, dur));

    // 0〜5秒：チャイム
    ['E5', 'C5', 'D5', 'G4', 'G4', 'D5', 'E5', 'C5'].forEach((n, i) => S.bell(A, TL.chime[i], nf(n), i === 7 ? 0.24 : 0.2, 3.6, 0.6));
    S.pad(A, 0, ['C3', 'G3', 'E4'].map(nf), 4.6, 0.05, 800, 0.45, 1.5);

    // 5〜20秒：夕方
    const PROB = [
      [5, ['A3', 'C4', 'E4', 'G4'], 'A2', 'E2'],
      [7.5, ['F3', 'A3', 'C4', 'E4'], 'F2', 'C3'],
      [10, ['D3', 'F3', 'A3', 'C4'], 'D2', 'A2'],
      [12.5, ['E3', 'A3', 'B3', 'D4'], 'E2', 'B2'],
      [15, ['A3', 'C4', 'E4', 'G4'], 'A2', 'E2'],
      [17.5, ['F3', 'A3', 'C4', 'E4'], 'F2', 'C3']
    ];
    for (const [bt, notes, root, fifth] of PROB) {
      S.pad(A, bt, notes.map(nf), BAR, 0.05, 900, 0.45, 0.4);
      chord(bt, notes, 0.07, 1.0);
      chord(bt + 3 * E8, notes.slice(1), 0.045, 0.45);
      S.bass(A, bt, nf(root), 1.0, 0.24);
      S.bass(A, bt + 2 * B, nf(fifth), 0.6, 0.18);
    }
    const s2 = TL.s2, s3 = TL.s3, s4 = TL.s4;
    S.pop(A, s2.eyebrow, nf('E6'), 0.06);
    S.pop(A, s2.bubble, nf('A5'), 0.08);
    S.pop(A, s3.eyebrow, nf('E6'), 0.06);
    S.pop(A, s3.bubble, nf('A5'), 0.08);
    for (let k = 0; k <= 12; k++) S.tick(A, s3.clock[0] + k * E8, k % 2 === 0, 0.045);
    S.pop(A, s4.icons, nf('C6'), 0.06);
    S.pop(A, s4.icons + 0.12, nf('E6'), 0.06);
    S.bell(A, s4.l2, nf('A4'), 0.06, 2.0, 0.5);
    S.riser(A, 18.4, 1.6, 0.14);

    // 20秒：SPOON
    const s5 = TL.s5;
    S.impact(A, s5.hit, 0.7);
    ['F5', 'A5', 'C6', 'F6'].forEach((n, i) => S.bell(A, s5.hit + i * 0.035, nf(n), 0.1, 2.4, 0.5));
    S.whoosh(A, s5.wipe - 0.05, 0.6, 0.11, 300, 2600);
    S.pop(A, s5.hub, nf('C6'), 0.08);
    s5.paths.forEach((tt, i) => S.pop(A, tt + 0.25, nf(i ? 'G6' : 'E6'), 0.07));
    S.whoosh(A, s5.band, 0.8, 0.12, 250, 3000);

    const s6 = TL.s6;
    const penta = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
    penta.forEach((n, i) => S.pop(A, s6.items + i * s6.step, nf(n), 0.07));
    S.bell(A, s6.price, nf('G5'), 0.1, 1.4, 0.4);
    S.bell(A, s6.price + 0.09, nf('C6'), 0.08, 1.4, 0.4);
    s6.cards.forEach((tt, i) => S.pop(A, tt, nf(['C6', 'E6', 'G6'][i]), 0.09));
    S.whoosh(A, s6.band, 0.8, 0.12, 250, 3000);

    const s7 = TL.s7;
    s7.icons.forEach((tt, i) => S.pop(A, tt, nf(i ? 'G6' : 'E6'), 0.08));
    for (let h = 9; h <= 19; h++) S.tick(A, s7.cursor[0] + (h - 9) * 0.6, h % 2 === 0, 0.03);
    S.pop(A, s7.cursor[0] + 3 * 0.6, nf('A5'), 0.09);
    S.whoosh(A, s7.cursor[0] + 5 * 0.6, 1.8, 0.04, 160, 600);
    S.pop(A, s7.cursor[0] + 9.5 * 0.6, nf('C6'), 0.08);

    const s8 = TL.s8;
    S.whoosh(A, s8.van[0], s8.van[1] - s8.van[0], 0.06, 160, 700);
    S.ding(A, s8.bento, 0.14);
    S.pop(A, s8.badge, nf('G6'), 0.09);

    const s9 = TL.s9;
    S.whoosh(A, s9.night, 0.55, 0.09, 3000, 300);
    ['E6', 'G6', 'C7', 'D7', 'G6', 'E7'].forEach((n, i) => S.glock(A, s9.l1 + i * 0.47, nf(n), 0.035));
    S.pop(A, TL.s10.word, nf('C6'), 0.07);

    // 20〜50秒：王道進行
    const PROG = [
      { pad: ['F3', 'A3', 'C4', 'E4'], root: 'F2', five: 'C3', hook: [[0, 'A4'], [2, 'C5'], [3, 'E5'], [6, 'C5']] },
      { pad: ['G3', 'B3', 'D4', 'E4'], root: 'G2', five: 'D3', hook: [[0, 'B4'], [2, 'D5'], [3, 'G5'], [6, 'D5']] },
      { pad: ['E3', 'G3', 'B3', 'D4'], root: 'E2', five: 'B2', hook: [[0, 'G4'], [2, 'B4'], [3, 'E5'], [6, 'B4']] },
      { pad: ['A3', 'C4', 'E4', 'G4'], root: 'A2', five: 'E3', hook: [[0, 'C5'], [2, 'E5'], [3, 'A5'], [5, 'G5'], [6, 'E5']] }
    ];
    for (let bar = 0; bar < 12; bar++) {
      const bt = 20 + bar * BAR;
      const ch = PROG[bar % 4];
      const light = bt < 25;
      S.pad(A, bt, ch.pad.map(nf), BAR, 0.045, 1400, 0.4, 0.3);
      chord(bt, ch.pad, 0.075, 0.9);
      chord(bt + 3 * E8, ch.pad.slice(1), 0.05, 0.3);
      chord(bt + 5 * E8, ch.pad.slice(1), 0.05, 0.5);
      [[0, ch.root, 0.5], [3, ch.root, 0.25], [4, ch.five, 0.5], [7, up(ch.root), 0.25]]
        .forEach(([pos, n, d]) => S.bass(A, bt + pos * E8, nf(n), d, 0.25));
      S.kick(A, bt, light ? 0.5 : 0.62);
      S.kick(A, bt + 2 * B, light ? 0.45 : 0.58);
      if (!light) {
        S.snare(A, bt + B, 0.08);
        S.snare(A, bt + 3 * B, 0.08);
        for (let k = 0; k < 4; k++) S.hat(A, bt + E8 + k * B, 0.04);
      }
      if (bt >= 30) for (let k = 0; k < 8; k++) S.shaker(A, bt + k * E8, k % 2 ? 0.018 : 0.028);
      for (const [pos, n] of ch.hook) {
        S.marimba(A, bt + pos * E8, nf(n), light ? 0.11 : 0.15);
        if (bt >= 30) S.glock(A, bt + pos * E8, nf(n) * 2, 0.03);
      }
    }

    // 50〜55秒：夜の食卓
    [[50, ['F3', 'A3', 'C4', 'E4'], 'F2'], [52.5, ['G3', 'B3', 'D4', 'E4'], 'G2']].forEach(([bt, notes, root]) => {
      S.pad(A, bt, notes.map(nf), BAR, 0.06, 1600, 0.5, 0.5);
      notes.forEach((n, i) => S.epiano(A, bt + i * E8, nf(up(n)), 0.06, 0.9));
      chord(bt + 2 * B, notes, 0.05, 1.0);
      S.bass(A, bt, nf(root), 2.2, 0.2);
    });

    // 55〜60秒：着地
    S.impact(A, 55, 0.45);
    S.pad(A, 55, ['C3', 'G3', 'D4', 'E4', 'G4'].map(nf), 4.6, 0.07, 1700, 0.5, 0.1);
    chord(55, ['C4', 'E4', 'G4', 'D5'], 0.07, 2.0);
    S.bass(A, 55, nf('C2'), 3.4, 0.28);
    ['G4', 'D5', 'E5', 'C5'].forEach((n, i) => S.bell(A, TL.s10.chime[i], nf(n), 0.18, 3.0, 0.6));
    for (let k = 0; k < 12; k++) S.shaker(A, 55 + k * E8, 0.02 * (1 - k / 12));
  };
})();
