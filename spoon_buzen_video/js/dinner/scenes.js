/*
 * SPOON豊前 夕食の紹介動画 — シーン構成（60秒、テンポ96・1小節2.5秒）
 *
 *  0.0– 5.0  夕方5時のチャイム。町に明かりがつく
 *  5.0–10.0  家では「今日の夕飯、何にしよう。買い物もまだ…」
 * 10.0–15.0  職場では「今日は仕事が長引きそう。夕食を買いに出る時間もない…」
 * 15.0–20.0  夕食のことまで、手が回らない日がある。
 * 20.0–25.0  そんな日の夕食に、SPOON。ご自宅にも、職場にも。
 * 25.0–35.0  おまかせ日替わり弁当 750円／唐揚げ弁当・チキン南蛮弁当・カレー
 * 35.0–45.0  当日12時までに電話・FAXで注文 → 14時〜17時にお届け
 * 45.0–50.0  宅配1個から無料
 * 50.0–55.0  おいしいごはんで、毎日をもっとたのしく。
 * 55.0–60.0  エンドカード（電話・FAX）
 *
 * TL の時刻は js/dinner/score.js の効果音でも使っています。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const { clamp, lerp, seg, E, fillRR, strokeRR, circle, ring, line } = SV.util;
  const C = SV.C, T = SV.COPY, text = SV.text, art = SV.art, D = SV.DC;
  const W = SV.W, H = SV.H;
  const BEAT = 0.625;

  const TL = (SV.TL = {
    chime: [0, 1, 2, 3, 4, 5, 6, 7].map(i => i * BEAT),
    s1: { time: 0.4, label: 1.4, out: 4.3 },
    s2: { from: 4.75, rise: 4.9, eyebrow: 5.3, bubble: 5.7, l1: 5.95, l2: 7.6, out: 9.55 },
    s3: { from: 9.6, rise: 9.95, eyebrow: 10.3, clock: [10.4, 14.4], bubble: 10.7, l1: 10.95, l2: 12.6, out: 14.55 },
    s4: { from: 14.6, icons: 15.0, l1: 15.3, l2: 15.85, under: 16.7, iris: 19.7 },
    s5: { hit: 20.0, pre: 20.15, word: 20.35, textOut: 22.05, wipe: 22.4, head: 22.95, hub: 23.05, paths: [23.35, 23.55], band: 24.6 },
    s6: { swap: 25.0, box: 25.1, items: 25.35, step: 0.12, eyebrow: 25.45, name: 25.65, price: 26.3, note: 27.0, heroOut: 29.3,
      head: 29.95, cards: [30.2, 30.55, 30.9], more: 32.1, band: 34.6 },
    s7: { swap: 35.0, head: 35.25, axis: [35.6, 36.3], cursor: [36.4, 42.4], icons: [36.55, 36.75], out: 44.35 },
    s8: { from: 44.75, head: 45.1, van: [45.45, 46.6], bento: 46.65, mark: 47.0, badge: 47.4, out: 49.3 },
    s9: { night: 49.7, house: 50.15, l1: 50.6, l2: 51.2, out: 54.55 },
    s10: { from: 54.8, eyebrow: 55.05, word: 55.3, head: 55.9, tel: 56.6, fax: 56.9, note: 57.5, chime: [56.25, 56.875, 57.5, 58.125] }
  });
  // 9時〜19時の時間軸。1時間が0.6秒で進む
  const hourAt = h => TL.s7.cursor[0] + (h - 9) * 0.6;

  const cream = D.cream;

  function pill(ctx, str, x, y, p, bg, fg, size) {
    const e = E.outBack(clamp(p));
    if (e <= 0) return;
    const lw = SV.textWidth(ctx, str, { size, font: 'text' }) + size * 1.9;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e, e);
    fillRR(ctx, -lw / 2, -size, lw, size * 2, size, bg);
    text(ctx, str, 0, size * 0.37, { size, font: 'text', color: fg, align: 'center' });
    ctx.restore();
  }
  function wordmark(ctx, cx, y, o) {
    const size = o.size;
    const wS = SV.textWidth(ctx, T.s5.brand, { size, font: 'numB', ls: 0.02 });
    const aSize = size * o.areaK;
    const wA = SV.textWidth(ctx, T.s5.area, { size: aSize, font: 'head' });
    const gap = size * 0.12;
    const x0 = cx - (wS + gap + wA) / 2;
    text(ctx, T.s5.brand, x0, y, { size, font: 'numB', color: o.color, ls: 0.02, t: o.t, st: 0.06, d: 0.55, mode: 'pop', out: o.out });
    text(ctx, T.s5.area, x0 + wS + gap, y, { size: aSize, font: 'head', color: o.areaColor, t: o.t == null ? undefined : o.t - 0.3, st: 0.08, d: 0.5, mode: 'pop', out: o.out });
  }
  // 吹き出しの中の2行
  function bubbleLines(ctx, t, lines, x, y0, t1, t2, out) {
    text(ctx, lines[0], x, y0, { size: 60, font: 'head', color: C.ink, align: 'center', t: t - t1, st: 0.035, clip: true, out });
    text(ctx, lines[1], x, y0 + 100, { size: 50, font: 'headM', color: C.sub, align: 'center', t: t - t2, st: 0.045, clip: true, out });
  }

  /* ================= 0–5 秒：夕方5時 ================= */
  function sceneDusk(ctx, t) {
    if (t >= 5.0) return;
    const k = 0.62 * E.inOutC(seg(t, 0, 5));
    art.fillSky(ctx, k);
    // 沈む夕日
    const sy = lerp(610, 860, E.inOutC(seg(t, 0, 5)));
    const g = ctx.createRadialGradient(1380, sy, 40, 1380, sy, 260);
    g.addColorStop(0, 'rgba(255,190,110,0.55)');
    g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(1120, sy - 260, 520, 520);
    circle(ctx, 1380, sy, 74, '#FFB45C');
    // 町並み。チャイムが鳴るたびに1軒ずつ明かりがつく
    const sink = E.inC(seg(t, 4.4, 5.0)) * 320;
    ctx.save();
    ctx.translate(0, sink);
    art.town(ctx, 800, TL.chime.map(ct => seg(t, ct + 0.05, ct + 0.35)));
    ctx.restore();
    SV.digits(ctx, T.s1.time, 960, 330, { size: 170, font: 'num', color: cream, t: t - TL.s1.time, st: 0.05, alpha: 1 - seg(t, TL.s1.out, TL.s1.out + 0.4) });
    text(ctx, T.s1.label, 960, 450, { size: 62, font: 'head', color: cream, align: 'center', t: t - TL.s1.label, st: 0.045, clip: true, out: t - TL.s1.out });
  }

  /* ================= 5–10 秒：家では ================= */
  function sceneHome(ctx, t) {
    const s = TL.s2;
    if (t < s.from || t >= 10.1) return;
    const ex = E.inC(seg(t, s.out, s.out + 0.5));
    const rise = E.outQuart(seg(t, s.rise, s.rise + 0.7));
    ctx.save();
    ctx.translate(-ex * 260, 0);
    ctx.globalAlpha = 1 - ex;
    ctx.fillStyle = D.sil;
    ctx.fillRect(0, 900 + (1 - rise) * 200, W, 200);
    art.house(ctx, 540, 900 + (1 - rise) * 420, 560, { interior: 'pot' });
    ctx.restore();
    ctx.globalAlpha = 1;
    pill(ctx, T.s2.eyebrow, 1380, 245, seg(t, s.eyebrow, s.eyebrow + 0.45) * (1 - ex), cream, C.ink, 30);
    ctx.save();
    ctx.globalAlpha = 1 - ex;
    art.thought(ctx, 980, 330, 800, 290, 700, 650, seg(t, s.bubble, s.bubble + 0.45));
    ctx.restore();
    bubbleLines(ctx, t, T.s2.lines, 1380, 452, s.l1, s.l2, t - s.out);
  }

  /* ================= 10–15 秒：職場では ================= */
  function sceneOffice(ctx, t) {
    const s = TL.s3;
    if (t < s.from || t >= 15.1) return;
    const ex = E.inC(seg(t, s.out, s.out + 0.5));
    const rise = E.outQuart(seg(t, s.rise, s.rise + 0.7));
    const mins = lerp(17 * 60, 18 * 60 + 30, E.inOutC(seg(t, s.clock[0], s.clock[1])));
    ctx.save();
    ctx.globalAlpha = clamp(rise * 2) * (1 - ex);
    art.office(ctx, 140 + (1 - rise) * 220 - ex * 220, 250, 800, { minutes: mins });
    ctx.restore();
    ctx.globalAlpha = 1;
    pill(ctx, T.s3.eyebrow, 1380, 245, seg(t, s.eyebrow, s.eyebrow + 0.45) * (1 - ex), cream, C.ink, 30);
    ctx.save();
    ctx.globalAlpha = 1 - ex;
    art.thought(ctx, 980, 330, 800, 290, 760, 560, seg(t, s.bubble, s.bubble + 0.45));
    ctx.restore();
    bubbleLines(ctx, t, T.s3.lines, 1380, 452, s.l1, s.l2, t - s.out);
  }

  /* ================= 15–20 秒：手が回らない日がある ================= */
  function sceneHook(ctx, t) {
    const s = TL.s4;
    if (t < s.from || t >= 20.02) return;
    [['house', 850], ['office', 1070]].forEach(([ic, x], i) => {
      const p = E.outBack(seg(t, s.icons + i * 0.12, s.icons + i * 0.12 + 0.45));
      if (p <= 0) return;
      circle(ctx, x, 268, 66 * p, 'rgba(251,244,230,0.14)');
      art.icon(ctx, ic, x, 270, 82 * p, cream, { cut: D.dusk });
    });
    text(ctx, T.s4.head[0], 960, 480, { size: 96, font: 'head', color: cream, align: 'center', t: t - s.l1, st: 0.04, clip: true });
    const runs = SV.rich(T.s4.head[1]).map(r => (r.mark ? { s: r.s, c: C.yellow } : r));
    const L = text(ctx, runs, 960, 630, { size: 112, font: 'head', color: cream, align: 'center', t: t - s.l2, st: 0.04, clip: true });
    // 「手が回らない日」の下に手書き風の線
    const u = E.inOutC(seg(t, s.under, s.under + 0.55));
    if (u > 0) {
      const wEm = SV.textWidth(ctx, '手が回らない日', { size: 112, font: 'head' });
      const x0 = L.x + 4, y0 = 668;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const f = (i / 30) * u;
        const xx = x0 + wEm * f, yy = y0 + Math.sin(f * 9) * 3;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.lineWidth = 8;
      ctx.strokeStyle = C.yellow;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  /* ================= 20–22.7 秒：SPOON ================= */
  function sceneBrand(ctx, t) {
    const s = TL.s5;
    if (t < s.hit || t >= 22.96) return;
    for (const [d, a] of [[0, 0.55], [0.14, 0.35], [0.28, 0.22]]) {
      const p = seg(t, s.hit + d, s.hit + d + 1.3);
      if (p <= 0 || p >= 1) continue;
      ctx.globalAlpha = a * (1 - p);
      ring(ctx, 960, 540, 90 + E.outC(p) * 950, 44 * (1 - p) + 2, C.orangeSoft);
    }
    ctx.globalAlpha = 1;
    const out = t - s.textOut;
    text(ctx, T.s5.pre, 960, 400, { size: 74, font: 'head', color: C.ink, align: 'center', t: t - s.pre, st: 0.035, clip: true, out });
    wordmark(ctx, 960, 650, { size: 236, areaK: 0.42, color: '#FFFFFF', areaColor: C.ink, t: t - s.word, out });
  }

  /* ================= 22.9–25 秒：ご自宅にも、職場にも ================= */
  const HUB = [960, 640], DEST = [[430, 640, 'house', 'home'], [1490, 640, 'office', 'work']];
  function sceneRoutes(ctx, t) {
    const s = TL.s5;
    if (t < 22.9 || t >= s.band + 0.4) return;
    text(ctx, T.s5.head, 960, 236, { size: 86, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.035, clip: true });
    DEST.forEach(([x, y, ic, key], i) => {
      const t0 = s.paths[i];
      const lp = E.inOutC(seg(t, t0, t0 + 0.45));
      const dir = Math.sign(x - HUB[0]);
      const sx = HUB[0] + dir * 128, ex = x - dir * 110;
      if (lp > 0) {
        ctx.setLineDash([14, 14]);
        line(ctx, sx, y, lerp(sx, ex, lp), y, 6, C.orange, 'butt');
        ctx.setLineDash([]);
      }
      if (lp >= 1) {
        for (let k = 0; k < 2; k++) {
          const f = ((t - t0 - 0.45) * 0.8 + k * 0.5) % 1;
          art.bentoSide(ctx, lerp(sx, ex, f), y + 12, 44);
        }
      }
      const p = E.outBack(seg(t, t0 + 0.25, t0 + 0.7));
      if (p > 0) {
        circle(ctx, x, y, 98 * p, D.circle);
        art.icon(ctx, ic, x, y + 4, 120 * p, C.ink, { cut: D.circle });
        text(ctx, T.s5[key], x, y + 170, { size: 44, font: 'head', color: C.ink, align: 'center', t: t - t0 - 0.35, st: 0.04 });
      }
    });
    const hp = E.outBack(seg(t, s.hub, s.hub + 0.5));
    if (hp > 0) {
      circle(ctx, HUB[0], HUB[1], 112 * hp, C.orange);
      art.icon(ctx, 'shop', HUB[0], HUB[1] + 4, 136 * hp, '#FFFFFF', { cut: C.orange });
      text(ctx, T.s5.hub, HUB[0], HUB[1] + 176, { size: 36, font: 'headM', color: C.sub, align: 'center', t: t - s.hub - 0.2, st: 0.03 });
    }
  }

  /* ================= 25–30 秒：おまかせ日替わり弁当 ================= */
  function scenePrice(ctx, str, x, y, size, o) {
    const runs = SV.rich(str, { numColor: D.price, numFont: 'numB', k: 1 });
    return text(ctx, runs.map(r => (r.f ? r : Object.assign({}, r, { k: 0.45, c: D.price }))), x, y, Object.assign({ size, font: 'head', color: D.price }, o));
  }
  function sceneHero(ctx, t) {
    const s = TL.s6;
    if (t < s.swap || t >= 30.0) return;
    const ex = E.inC(seg(t, s.heroOut, s.heroOut + 0.55));
    const prog = [];
    for (let i = 0; i < 8; i++) prog.push(seg(t, s.items + i * s.step, s.items + i * s.step + 0.4));
    const bin = E.outQuart(seg(t, s.box, s.box + 0.6));
    ctx.save();
    ctx.globalAlpha = clamp(bin * 2) * (1 - ex);
    art.bento(ctx, 560 - ex * 200, 600 + (1 - bin) * 120, 760, prog);
    ctx.restore();
    const out = t - s.heroOut;
    text(ctx, T.s6.hero.eyebrow, 1090, 392, { size: 48, font: 'headM', color: C.sub, t: t - s.eyebrow, st: 0.04, clip: true, out });
    text(ctx, T.s6.hero.name, 1086, 514, { size: 104, font: 'head', color: C.ink, t: t - s.name, st: 0.04, clip: true, out });
    scenePrice(ctx, T.s6.hero.price, 1080, 726, 200, { t: t - s.price, st: 0.06, d: 0.5, mode: 'pop', out });
    text(ctx, T.s6.hero.note, 1092, 812, { size: 28, font: 'textR', color: C.sub, t: t - s.note, mode: 'fade', st: 0.01, out });
  }

  /* ================= 30–35 秒：定番のお弁当 ================= */
  function sceneCards(ctx, t) {
    const s = TL.s6;
    if (t < 29.9 || t >= s.band + 0.4) return;
    text(ctx, T.s6.head, 960, 190, { size: 72, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.04, clip: true });
    [380, 960, 1540].forEach((x, i) => {
      const it = T.s6.items[i];
      const t0 = s.cards[i];
      const p = seg(t, t0, t0 + 0.5);
      if (p <= 0) return;
      const e = E.outBack(p);
      ctx.save();
      ctx.translate(x, 540);
      ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e);
      ctx.globalAlpha = clamp(p * 3);
      fillRR(ctx, -240 + 6, -290 + 10, 480, 580, 28, 'rgba(43,37,34,0.10)');
      fillRR(ctx, -240, -290, 480, 580, 28, '#FFFFFF');
      ctx.restore();
      ctx.globalAlpha = 1;
      art.menu(ctx, it.art, x, 410, 400, seg(t, t0 + 0.1, t0 + 0.6));
      text(ctx, it.name, x, 646, { size: 46, font: 'head', color: C.ink, align: 'center', t: t - t0 - 0.2, st: 0.03 });
      scenePrice(ctx, it.price, x, 764, 104, { align: 'center', t: t - t0 - 0.3, st: 0.05, mode: 'pop' });
    });
    text(ctx, T.s6.more, 960, 930, { size: 30, font: 'textR', color: C.sub, align: 'center', t: t - s.more, mode: 'fade', st: 0.008 });
  }

  /* ================= 35–45 秒：注文と配達の時間 ================= */
  const AX = { x0: 210, y: 620, ph: 150 };
  const hx = h => AX.x0 + (h - 9) * AX.ph;
  function sceneOrder(ctx, t) {
    const s = TL.s7;
    if (t < s.swap || t >= 44.9) return;
    const fade = 1 - E.inC(seg(t, s.out, s.out + 0.4));
    const out = t - s.out;
    const hr = SV.rich(T.s7.head, { numColor: C.orange, numFont: 'numB', k: 1.06 });
    text(ctx, hr, 960, 222, { size: 82, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.03, clip: true, out });
    const cur = 9 + 10 * clamp((t - s.cursor[0]) / (s.cursor[1] - s.cursor[0]));
    const ap = E.inOutC(seg(t, s.axis[0], s.axis[1]));
    ctx.globalAlpha = fade;
    if (ap > 0) line(ctx, hx(9) - 30, AX.y, lerp(hx(9) - 30, hx(19) + 30, ap), AX.y, 6, C.line);
    for (let h = 9; h <= 19; h++) {
      const p = seg(ap * 10 + 9, h, h + 0.6);
      if (p <= 0) continue;
      line(ctx, hx(h), AX.y + 12, hx(h), AX.y + 26, 3, C.tick);
      text(ctx, `{${h}}時`, hx(h), AX.y + 72, { size: 28, font: 'textR', color: C.sub, align: 'center', alpha: p * fade });
    }
    // 注文できる時間（〜12時）
    if (cur > 9) fillRR(ctx, hx(9), AX.y - 15, hx(Math.min(cur, 12)) - hx(9), 30, 15, C.orange);
    // 配達の時間（14〜17時）と、遅れる場合（〜18時）
    if (cur > 14) fillRR(ctx, hx(14), AX.y - 15, hx(Math.min(cur, 17)) - hx(14), 30, 15, C.yellow);
    if (cur > 17) {
      const xe = hx(Math.min(cur, 18));
      ctx.globalAlpha = 0.45 * fade;
      fillRR(ctx, hx(17) - 15, AX.y - 15, xe - hx(17) + 15, 30, 15, C.yellow);
      ctx.globalAlpha = fade;
      ctx.setLineDash([8, 7]);
      strokeRR(ctx, hx(17) - 15, AX.y - 15, xe - hx(17) + 15, 30, 15, '#E0A800', 2.5);
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    // 進む時刻のしるし
    if (t > s.cursor[0] && t < s.cursor[1] + 0.4) {
      const a = (1 - seg(t, s.cursor[1], s.cursor[1] + 0.4)) * fade;
      ctx.globalAlpha = a;
      circle(ctx, hx(cur), AX.y, 16, C.ink);
      circle(ctx, hx(cur), AX.y, 7, '#FFFFFF');
      ctx.globalAlpha = 1;
    }
    // 電話・FAX
    ['phone', 'fax'].forEach((ic, i) => {
      const p = seg(t, s.icons[i], s.icons[i] + 0.45);
      if (p <= 0) return;
      const x = 382 + i * 112, e = E.outBack(p);
      ctx.globalAlpha = fade;
      circle(ctx, x, 462, 50 * e, '#FFFFFF');
      ring(ctx, x, 462, 50 * e, 5, C.orange);
      art.icon(ctx, ic, x, 462, 62 * e, C.orange, { cut: '#FFFFFF', alpha: fade });
      ctx.globalAlpha = 1;
    });
    text(ctx, T.s7.order, 437, 568, { size: 38, font: 'head', color: C.ink, align: 'center', t: t - s.icons[0] - 0.2, st: 0.03, alpha: fade });
    // 12時 締切
    const dp = seg(t, hourAt(12), hourAt(12) + 0.45);
    if (dp > 0) {
      ctx.globalAlpha = fade;
      ctx.setLineDash([6, 6]);
      line(ctx, hx(12), AX.y + 18, hx(12), AX.y + 120, 3, D.price, 'butt');
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      const lw = SV.textWidth(ctx, T.s7.deadline, { size: 30, font: 'text' }) + 52;
      const e = E.outBack(dp);
      ctx.save();
      ctx.translate(hx(12), AX.y + 150);
      ctx.scale(e, e);
      ctx.globalAlpha = fade;
      fillRR(ctx, -lw / 2, -30, lw, 60, 30, D.price);
      text(ctx, T.s7.deadline, 0, 11, { size: 30, font: 'text', color: '#FFFFFF', align: 'center', alpha: fade });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // お届け
    const bp = seg(t, hourAt(14), hourAt(17));
    if (bp > 0 && bp < 1) art.icon(ctx, 'van', hx(cur), AX.y - 46, 72, C.ink, { cut: C.beige, alpha: fade });
    text(ctx, T.s7.band, (hx(14) + hx(17)) / 2, 568, { size: 40, font: 'head', color: C.ink, align: 'center', t: t - hourAt(14) - 0.1, st: 0.025, alpha: fade });
    text(ctx, T.s7.late, (hx(17) + hx(18)) / 2 + 10, AX.y + 150, { size: 26, font: 'textR', color: C.sub, align: 'center', t: t - hourAt(17) - 0.2, mode: 'fade', st: 0.01, alpha: fade });
    // 夕食
    const np = seg(t, hourAt(18.5), hourAt(18.5) + 0.45);
    if (np > 0) {
      const e = E.outBack(np);
      art.icon(ctx, 'bowl', hx(18.6), 466, 92 * e, C.ink, { cut: C.beige, alpha: fade });
      text(ctx, T.s7.dinner, hx(18.6), 568, { size: 38, font: 'head', color: C.ink, align: 'center', t: t - hourAt(18.5) - 0.1, st: 0.04, alpha: fade });
    }
  }

  /* ================= 45–50 秒：宅配1個から無料 ================= */
  function sceneFree(ctx, t) {
    const s = TL.s8;
    if (t < s.from || t >= 50.25) return;
    const fade = 1 - E.inC(seg(t, s.out, s.out + 0.4));
    const out = t - s.out;
    const runs = SV.rich(T.s8.head, { numColor: C.orange, numFont: 'numB', k: 1.15 });
    text(ctx, runs, 960, 250, { size: 86, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.035, clip: true, out, mark: { p: seg(t, s.mark, s.mark + 0.5) } });
    ctx.globalAlpha = fade;
    line(ctx, 120, 770, 1800, 770, 6, C.line);
    ctx.globalAlpha = 1;
    const vp = E.outQuart(seg(t, s.van[0], s.van[1]));
    if (vp > 0) art.van(ctx, lerp(-260, 700, vp), 770, 360, { spin: vp * 30, alpha: fade });
    const bp = seg(t, s.bento, s.bento + 0.5);
    if (bp > 0) {
      const y = lerp(600, 770, E.outBounce(bp));
      ctx.globalAlpha = clamp(bp * 4) * fade;
      art.bentoSide(ctx, 1110, y, 220);
      ctx.globalAlpha = 1;
      const e = E.outBack(seg(t, s.bento + 0.25, s.bento + 0.65));
      if (e > 0) {
        ctx.globalAlpha = fade;
        circle(ctx, 1222, 640, 46 * e, C.orange);
        ctx.globalAlpha = 1;
        SV.digits(ctx, '1', 1222, 640 + 21 * e, { size: 60 * e, font: 'numB', color: C.ink, alpha: fade });
      }
    }
    const gp = seg(t, s.badge, s.badge + 0.5);
    if (gp > 0) {
      const e = E.outBack(gp);
      ctx.save();
      ctx.translate(1530, 640);
      ctx.rotate(-0.12);
      ctx.scale(e, e);
      ctx.globalAlpha = fade;
      circle(ctx, 0, 0, 124, C.yellow);
      ring(ctx, 0, 0, 108, 4, C.ink);
      text(ctx, T.s8.badge, 0, 20, { size: 50, font: 'head', color: C.ink, align: 'center', alpha: fade });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /* ================= 50–55 秒：おいしいごはんで ================= */
  function sceneNight(ctx, t) {
    const s = TL.s9;
    if (t < s.house - 0.05 || t >= 55.4) return;
    const ex = E.inC(seg(t, s.out, s.out + 0.6));
    const rise = E.outQuart(seg(t, s.house, s.house + 0.8));
    ctx.save();
    ctx.globalAlpha = 1 - ex;
    ctx.fillStyle = D.sil;
    ctx.fillRect(0, 900 + (1 - rise) * 200, W, 200);
    art.house(ctx, 470, 900 + (1 - rise) * 420, 520, { interior: 'table', t });
    ctx.restore();
    ctx.globalAlpha = 1;
    T.s9.lines.forEach((ln, i) => {
      text(ctx, ln, 900, 470 + i * 122, { size: 84, font: 'head', color: cream, t: t - (i ? s.l2 : s.l1), st: 0.045, clip: true, out: t - s.out });
    });
  }

  /* ================= 55–60 秒：エンドカード ================= */
  function contact(ctx, label, num, x, y, a) {
    if (a <= 0) return 0;
    const lw = SV.textWidth(ctx, label, { size: 32, font: 'text' }) + 40;
    const nw = SV.textWidth(ctx, num, { size: 78, font: 'num' });
    const total = lw + 22 + nw;
    const x0 = x - total / 2;
    ctx.globalAlpha = a;
    fillRR(ctx, x0, y - 52, lw, 60, 10, cream);
    ctx.globalAlpha = 1;
    text(ctx, label, x0 + lw / 2, y - 10, { size: 32, font: 'text', color: D.dusk, align: 'center', alpha: a });
    text(ctx, num, x0 + lw + 22, y + 4, { size: 78, font: 'num', color: cream, alpha: a });
    return total;
  }
  function sceneEnd(ctx, t) {
    const s = TL.s10;
    if (t < s.from) return;
    text(ctx, T.s10.eyebrow, 960, 236, { size: 30, font: 'text', color: D.creamSub, align: 'center', ls: 0.06, t: t - s.eyebrow, mode: 'fade', st: 0.012 });
    wordmark(ctx, 960, 392, { size: 168, areaK: 0.44, color: C.orange, areaColor: cream, t: t - s.word });
    const hr = SV.rich(T.s10.head, { numColor: C.yellow, numFont: 'numB', k: 1.08 });
    text(ctx, hr, 960, 548, { size: 80, font: 'head', color: cream, align: 'center', t: t - s.head, st: 0.035, clip: true });
    contact(ctx, T.s10.tel[0], T.s10.tel[1], 960 - 420, 718, E.outC(seg(t, s.tel, s.tel + 0.45)));
    contact(ctx, T.s10.fax[0], T.s10.fax[1], 960 + 420, 718, E.outC(seg(t, s.fax, s.fax + 0.45)));
    text(ctx, T.s10.note, 960, 858, { size: 28, font: 'textR', color: D.creamSub, align: 'center', t: t - s.note, mode: 'fade', st: 0.008 });
  }

  /* ================= 画面の切り替え ================= */
  function irisIn(ctx, t, t0) {
    const p = seg(t, t0, t0 + 0.3);
    if (p <= 0 || t >= 20.02) return;
    circle(ctx, 960, 540, E.inC(p) * 1150, C.orange);
  }
  function wipeUp(ctx, t, t0) {
    const p = E.inOutQuart(seg(t, t0, t0 + 0.56));
    if (p <= 0 || p >= 1) return;
    const y = H - p * (H + 120), bulge = 90 * Math.sin(Math.PI * p);
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(0, y + bulge);
    ctx.quadraticCurveTo(W / 2, y - bulge, W, y + bulge);
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = C.beige;
    ctx.fill();
  }
  // 夜が上から降りてくる
  function nightfall(ctx, t, t0) {
    const p = E.inOutQuart(seg(t, t0, t0 + 0.55));
    if (p <= 0 || p >= 1) return;
    const y = p * (H + 120), bulge = 90 * Math.sin(Math.PI * p);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, y - bulge);
    ctx.quadraticCurveTo(W / 2, y + bulge, W, y - bulge);
    ctx.lineTo(W, 0); ctx.closePath();
    ctx.fillStyle = art.sky(ctx, 1);
    ctx.fill();
  }
  function bandWipe(ctx, t, t0) {
    const dur = 0.8, p = (t - t0) / dur;
    if (p <= 0 || p >= 1) return;
    const sk = 280;
    const edge = q => [lerp(-sk - 60, W + 60, E.inOutQuart(clamp(q * 2 - 1))), lerp(-sk - 40, W + 60, E.inOutQuart(clamp(q * 2)))];
    const draw = (tr, ld, color) => {
      if (ld <= tr) return;
      ctx.beginPath();
      ctx.moveTo(tr, H); ctx.lineTo(ld, H); ctx.lineTo(ld + sk, 0); ctx.lineTo(tr + sk, 0);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    draw(edge(p - 0.07)[0], edge(p + 0.07)[1], C.yellow);
    const [ot, ol] = edge(p);
    draw(ot, ol, C.orange);
  }
  function brandBug(ctx, t) {
    const a = seg(t, 23.4, 23.8) * (1 - seg(t, 49.2, 49.6));
    if (a <= 0) return;
    text(ctx, 'SPOON', 74, 96, { size: 38, font: 'numB', color: C.orange, alpha: a });
    const w = SV.textWidth(ctx, 'SPOON', { size: 38, font: 'numB' });
    text(ctx, '豊前', 74 + w + 8, 96, { size: 24, font: 'head', color: C.ink, alpha: a });
  }

  /* ================= 1フレーム描画 ================= */
  function render(ctx, t) {
    t = clamp(t, 0, SV.DURATION - 1e-4);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.setLineDash([]);
    if (t < 20.02) art.fillSky(ctx, lerp(0.62, 1, seg(t, 4.8, 15)));
    else if (t < 22.96) { ctx.fillStyle = C.orange; ctx.fillRect(0, 0, W, H); }
    else if (t < 50.25) { ctx.fillStyle = C.beige; ctx.fillRect(0, 0, W, H); }
    else art.fillSky(ctx, 1);
    if (t >= 4.8 && t < 20.02) art.stars(ctx, t, seg(t, 9, 15) * 0.8);
    if (t >= 50.25) {
      art.stars(ctx, t, 0.9 * seg(t, 50.25, 51.2));
      art.moon(ctx, 1640, 190, 56, seg(t, 50.25, 50.9));
    }

    sceneDusk(ctx, t);
    sceneHome(ctx, t);
    sceneOffice(ctx, t);
    sceneHook(ctx, t);
    irisIn(ctx, t, TL.s4.iris);
    sceneBrand(ctx, t);
    wipeUp(ctx, t, TL.s5.wipe);
    sceneRoutes(ctx, t);
    sceneHero(ctx, t);
    sceneCards(ctx, t);
    sceneOrder(ctx, t);
    sceneFree(ctx, t);
    nightfall(ctx, t, TL.s9.night);
    sceneNight(ctx, t);
    sceneEnd(ctx, t);
    brandBug(ctx, t);
    bandWipe(ctx, t, TL.s5.band);
    bandWipe(ctx, t, TL.s6.band);
    ctx.restore();
  }

  SV.render = render;
})();
