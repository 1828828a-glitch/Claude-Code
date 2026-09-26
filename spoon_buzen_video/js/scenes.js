/*
 * SPOON豊前 紹介動画 — シーン構成（60秒）
 *
 *  0.0– 4.0  12:00 昼休みのチャイム
 *  4.0–12.5  買い出しで消えていく昼休み（〜12:35）
 * 12.2–18.0  会社側の悩み（食堂はつくれない／取りまとめの負担）
 * 18.0–21.7  SPOON 登場
 * 21.7–26.3  決めた受け取り場所に、まとめてお届け
 * 26.3–32.3  注文は当日9:30まで、9:30〜12:00頃に配達
 * 32.2–42.3  40品目以上・7種類のおかず・管理栄養士監修・1000種類以上
 * 42.2–48.3  昼休みが休みになる（12:35の場面と同じ時計で比べる）
 * 48.3–54.0  小さく始める／豊前でつくって豊前で働く人へ
 * 54.0–60.0  エンドカード
 *
 * TL の時刻は audio.js の効果音でも使っています。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const { clamp, lerp, seg, E, mix, alpha, fillRR, strokeRR, circle, ring, line, bez, bezPath } = SV.util;
  const C = SV.C, T = SV.COPY, text = SV.text, art = SV.art;
  const W = SV.W, H = SV.H;

  const TL = (SV.TL = {
    chime: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    s1: { ring: 0.12, digits: 0.3, label: 1.0, labelOut: 3.1, move: 3.3 },
    s2: { start: 4.0, rate: 6, total: 35, hit: 10.0, head: 10.3, sub: 10.9, out: 11.9,
      segs: [[0, 10, 'car'], [10, 14, 'parking'], [14, 26, 'queue'], [26, 35, 'uturn']] },
    s3: { from: 12.2, factory: 12.3, eyebrow: 12.45, h1: 12.6, ghost: 12.9, cross: 13.6, h1out: 14.8, h2: 15.05,
      desk: 15.1, tags: [15.5, 15.75, 16.0, 16.25, 16.5], iris: 17.72 },
    s4: { hit: 18.0, word: 18.12, eyebrow: 18.4, tag: 18.95, textOut: 20.85, wipe: 21.1,
      head: 21.75, road: 21.9, van: [22.45, 24.0], stack: 24.05, band: 25.95 },
    s5: { swap: 26.35, head: 26.45, line: 26.9, nodes: [27.2, 27.8, 29.7], band: [28.4, 29.6], note: 30.3, out: 31.85 },
    s6: { from: 32.25, head: 32.35, mark: 33.0, box: 32.6, rice: 33.25, okazu0: 33.55, step: 0.3,
      stats: [33.5, 35.8, 37.2, 38.4], counts: [null, [35.9, 36.9], null, [38.5, 39.7]], out: 41.55, morph: [41.7, 42.25] },
    s7: { from: 42.25, hollow: [42.25, 42.6], segs: [[0, 5, 42.65, 43.25], [5, 25, 43.25, 44.45], [25, 60, 44.55, 45.6]],
      rowsOut: 45.55, head: 45.85, sub: 46.5, mark: 46.65, band: 47.9 },
    s8: { swap: 48.3, head: 48.55, steps: [49.0, 49.4, 49.8], out: 50.9, head2: 51.35, hub: 51.5,
      spokes: [51.75, 51.95, 52.15, 52.35], caption: 52.5, iris: 53.72 },
    s9: { from: 54.02, l1: 54.25, l2: 54.65, mark: 55.35, eyebrow: 55.75, word: 55.95, cta: 56.6, info: 57.05, note: 57.25 }
  });

  const RING = { x: 600, y: 540, r: 280, lw: 30 };
  const RIGHT_X = 990;

  /* ================= 0–12.5 秒：12:00 → 12:35 ================= */
  function sceneBefore(ctx, t) {
    if (t >= 12.6) return;
    const s1 = TL.s1, s2 = TL.s2;
    const mv = E.inOutC(seg(t, s1.move, s1.move + 0.8));
    const cx = lerp(960, RING.x, mv), cy = lerp(500, RING.y, mv), r = lerp(300, RING.r, mv);
    const ex = E.inC(seg(t, s2.out, s2.out + 0.55));

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(cx, cy);
    ctx.scale(1 - 0.22 * ex, 1 - 0.22 * ex);
    ctx.translate(-cx, -cy);

    // チャイムの波紋
    if (t < 4.6) {
      for (const ct of TL.chime) {
        const p = seg(t, ct, ct + 1.1);
        if (p <= 0 || p >= 1) continue;
        ctx.globalAlpha = (1 - p) * 0.5 * (1 - ex);
        ring(ctx, cx, cy, r + 26 + E.outC(p) * 150, 4 * (1 - p) + 1, C.greyMid);
      }
      ctx.globalAlpha = 1;
    }

    const m = clamp((t - s2.start) * s2.rate, 0, s2.total);
    const segs = [];
    s2.segs.forEach(([a, b], i) => { if (m > a) segs.push({ a, b: Math.min(m, b), color: C.lost[i] }); });
    ctx.globalAlpha = 1;
    art.clock(ctx, cx, cy, r, {
      alpha: 1 - ex,
      lw: RING.lw,
      draw: E.inOutC(seg(t, s1.ring, s1.ring + 1.2)),
      segs,
      head: t > s2.start && t < s2.hit + 0.25 ? m : null,
      headColor: C.lost[0]
    });

    // 中央の時刻
    const mins = Math.floor(m + 1e-6);
    const hitP = seg(t, s2.hit, s2.hit + 0.45);
    const bump = 1 + 0.16 * Math.sin(Math.PI * hitP);
    const size = 150 * (r / 300) * bump;
    SV.digits(ctx, '12:' + String(mins).padStart(2, '0'), cx, cy + size * 0.36, {
      size, font: 'num', color: t >= s2.hit ? C.lostText : C.greyInk,
      t: t < 2 ? t - s1.digits : undefined, alpha: 1 - ex
    });
    ctx.restore();
    ctx.globalAlpha = 1;

    // 「昼休み、スタート。」
    if (t < 3.9) {
      text(ctx, T.s1.label, 960, 905, { size: 64, font: 'head', color: C.greyInk, align: 'center', t: t - s1.label, st: 0.04, clip: true, out: t - s1.labelOut });
    }

    // 右側：買い出しの手順
    const rowsOut = t - s2.hit;
    s2.segs.forEach(([a, b, ic], i) => {
      const t0 = s2.start + a / s2.rate;
      const p = seg(t, t0, t0 + 0.4);
      if (p <= 0) return;
      const q = E.inC(clamp((rowsOut - i * 0.07) / 0.4));
      if (q >= 1) return;
      const active = m < b || (i === 3 && t < s2.hit);
      const y = 330 + i * 124 - q * 40;
      const e = E.outBack(p);
      const cc = active ? C.lost[i] : C.greyDone;
      ctx.globalAlpha = 1 - q;
      circle(ctx, RIGHT_X + 46, y, 46 * e, cc);
      art.icon(ctx, ic, RIGHT_X + 46, y, 60 * e, '#fff', { cut: cc, alpha: 1 - q });
      ctx.globalAlpha = 1;
      text(ctx, T.s2.steps[i], RIGHT_X + 122, y + 18, {
        size: 50, font: 'headM', color: active ? C.greyInk : '#8C959F', t: t - t0 - 0.05, st: 0.025, d: 0.4, alpha: 1 - q
      });
    });

    // 「戻ったら、もう12:35。」
    const hr = SV.rich(T.s2.head, { numColor: C.lostText, numFont: 'numB', k: 1.1 });
    text(ctx, hr, RIGHT_X, 520, { size: 78, font: 'head', color: C.greyInk, t: t - s2.head, st: 0.035, clip: true, out: t - s2.out, od: 0.4 });
    text(ctx, T.s2.sub, RIGHT_X + 4, 612, { size: 44, font: 'text', color: C.greySub, t: t - s2.sub, st: 0.02, clip: true, out: t - s2.out - 0.05 });
  }

  /* ================= 12.2–18.0 秒：会社側の悩み ================= */
  function sceneCompany(ctx, t) {
    const s3 = TL.s3;
    if (t < s3.from || t >= 18.02) return;

    // 見出しの上のラベル
    const ep = E.outBack(seg(t, s3.eyebrow, s3.eyebrow + 0.45));
    if (ep > 0) {
      const lw = SV.textWidth(ctx, T.s3.eyebrow, { size: 30, font: 'text' }) + 56;
      ctx.save();
      ctx.translate(960, 238);
      ctx.scale(ep, ep);
      fillRR(ctx, -lw / 2, -30, lw, 60, 30, C.greyInk);
      text(ctx, T.s3.eyebrow, 0, 11, { size: 30, font: 'text', color: '#fff', align: 'center' });
      ctx.restore();
    }
    if (t < s3.h2) {
      text(ctx, T.s3.h1, 960, 400, { size: 86, font: 'head', color: C.greyInk, align: 'center', t: t - s3.h1, st: 0.04, clip: true, out: t - s3.h1out, od: 0.3 });
    }
    text(ctx, T.s3.h2, 960, 400, { size: 76, font: 'head', color: C.greyInk, align: 'center', t: t - s3.h2, st: 0.028, clip: true });

    // 工場
    const fp = E.outQuart(seg(t, s3.factory, s3.factory + 0.8));
    ctx.save();
    ctx.globalAlpha = clamp(fp * 2);
    art.factory(ctx, 600, 960 + (1 - fp) * 380, 560, art.PAL.grey);
    ctx.restore();

    // 社員食堂（点線）→ バツ → 消える
    const gIn = E.outC(seg(t, s3.ghost, s3.ghost + 0.5));
    const gOut = 1 - E.inC(seg(t, 14.5, 14.95));
    const ga = gIn * gOut;
    if (ga > 0) {
      art.canteenGhost(ctx, 1330, 950, 380, 300, T.s3.ghost, ga);
      const c1 = E.outC(seg(t, s3.cross, s3.cross + 0.22)), c2 = E.outC(seg(t, s3.cross + 0.14, s3.cross + 0.36));
      ctx.globalAlpha = ga;
      if (c1 > 0) line(ctx, 1210, 700, lerp(1210, 1450, c1), lerp(700, 900, c1), 18, C.lost[0]);
      if (c2 > 0) line(ctx, 1450, 700, lerp(1450, 1210, c2), lerp(700, 900, c2), 18, C.lost[0]);
      ctx.globalAlpha = 1;
    }

    // 総務担当者と、たまっていく用件
    const dp = E.outBack(seg(t, s3.desk, s3.desk + 0.5));
    if (dp > 0) {
      const shake = t > 16.6 ? Math.sin(t * 38) * 0.035 * (1 - seg(t, 17.3, 17.7)) : 0;
      art.icon(ctx, 'person', 1210, 790, 190 * dp, C.greyInk);
      art.icon(ctx, 'clipboard', 1400, 810, 170 * dp, '#7E8894', { rot: shake, cut: '#FFFFFF' });
    }
    const TAGPOS = [[1105, 600, -0.1], [1500, 585, 0.09], [1665, 740, -0.07], [1600, 905, 0.05], [1320, 548, -0.04]];
    s3.tags.forEach((tt, i) => {
      const p = seg(t, tt, tt + 0.45);
      if (p <= 0) return;
      const [x, y, rot] = TAGPOS[i];
      const jig = t > 16.6 ? Math.sin(t * 30 + i) * 0.03 : 0;
      art.tag(ctx, T.s3.tags[i], x, y, { rot: rot + jig, scale: E.outBack(p), alpha: clamp(p * 3), size: 34 });
    });
  }

  /* ================= 18.0–21.7 秒：SPOON 登場（オレンジ） ================= */
  function wordmark(ctx, cx, y, o) {
    const size = o.size;
    const wS = SV.textWidth(ctx, T.s4.brand, { size, font: 'numB', ls: 0.02 });
    const aSize = size * o.areaK;
    const wA = SV.textWidth(ctx, T.s4.area, { size: aSize, font: 'head' });
    const gap = size * 0.12;
    const x0 = cx - (wS + gap + wA) / 2;
    text(ctx, T.s4.brand, x0, y, { size, font: 'numB', color: o.color, ls: 0.02, t: o.t, st: 0.06, d: 0.55, mode: 'pop', out: o.out, alpha: o.alpha });
    text(ctx, T.s4.area, x0 + wS + gap, y, { size: aSize, font: 'head', color: o.areaColor, t: o.t == null ? undefined : o.t - 0.3, st: 0.08, d: 0.5, mode: 'pop', out: o.out, alpha: o.alpha });
  }
  function sceneBrand(ctx, t) {
    const s4 = TL.s4;
    if (t < s4.hit || t >= 21.66) return;
    for (const [d, a] of [[0, 0.55], [0.14, 0.35], [0.28, 0.22]]) {
      const p = seg(t, s4.hit + d, s4.hit + d + 1.3);
      if (p <= 0 || p >= 1) continue;
      ctx.globalAlpha = a * (1 - p);
      ring(ctx, 960, 540, 90 + E.outC(p) * 950, 44 * (1 - p) + 2, C.orangeSoft);
    }
    ctx.globalAlpha = 1;
    const out = t - s4.textOut;
    text(ctx, T.s4.eyebrow, 960, 372, { size: 38, font: 'text', color: C.ink, align: 'center', ls: 0.12, t: t - s4.eyebrow, st: 0.02, clip: true, out });
    wordmark(ctx, 960, 612, { size: 236, areaK: 0.42, color: '#FFFFFF', areaColor: C.ink, t: t - s4.word, out });
    text(ctx, T.s4.tagline, 960, 790, { size: 68, font: 'head', color: C.ink, align: 'center', t: t - s4.tag, st: 0.03, clip: true, out });
  }

  /* ================= 21.7–26.3 秒：配達ルート ================= */
  const ROAD = [[470, 790], [800, 600], [1010, 930], [1300, 800]];
  function sceneRoute(ctx, t) {
    const s4 = TL.s4;
    if (t < 21.66 || t >= s4.band + 0.4) return;
    text(ctx, T.s4.head, 960, 230, { size: 80, font: 'head', color: C.ink, align: 'center', t: t - s4.head, st: 0.035, clip: true });

    // 道
    const rp = E.inOutC(seg(t, s4.road, s4.road + 0.8));
    if (rp > 0) {
      // ベジェの後ろに受け取り場所までの直線をつなぐ
      const ext = seg(rp, 0.85, 1);
      const road = () => {
        bezPath(ctx, ROAD, Math.min(1, rp / 0.85), 80);
        if (ext > 0) ctx.lineTo(lerp(ROAD[3][0], 1440, ext), ROAD[3][1]);
      };
      road();
      ctx.lineWidth = 54; ctx.strokeStyle = '#EAE2CC'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      road();
      ctx.setLineDash([22, 20]); ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); ctx.setLineDash([]);
      ctx.lineCap = 'butt';
    }

    // お店（左）と職場（右）
    const sp = E.outBack(seg(t, s4.road - 0.15, s4.road + 0.4));
    if (sp > 0) {
      ctx.save(); ctx.translate(320, 820); ctx.scale(sp, sp); art.shop(ctx, 0, 0, 290); ctx.restore();
      text(ctx, T.s4.from, 320, 910, { size: 40, font: 'headM', color: C.ink, align: 'center', t: t - s4.road - 0.2, st: 0.025 });
    }
    const fp = E.outBack(seg(t, s4.road + 0.1, s4.road + 0.65));
    if (fp > 0) {
      ctx.save(); ctx.translate(1600, 820); ctx.scale(fp, fp); art.factory(ctx, 0, 0, 340, art.PAL.warm); ctx.restore();
      text(ctx, T.s4.to, 1600, 910, { size: 40, font: 'headM', color: C.ink, align: 'center', t: t - s4.road - 0.35, st: 0.025 });
      // 受け取り台
      fillRR(ctx, 1440, 818, 164, 12, 6, C.ink);
      line(ctx, 1454, 828, 1454, 858, 6, C.ink);
      line(ctx, 1590, 828, 1590, 858, 6, C.ink);
    }

    // まとめて到着した弁当
    const STACK = [[1484, 0], [1560, 0], [1484, 1], [1560, 1], [1522, 2]];
    STACK.forEach(([bx, lv], i) => {
      const t0 = s4.stack + i * 0.1;
      const p = seg(t, t0, t0 + 0.4);
      if (p <= 0) return;
      const yEnd = 818 - lv * 29;
      const y = lerp(yEnd - 140, yEnd, E.outBounce(p));
      ctx.globalAlpha = clamp(p * 4);
      art.bentoSide(ctx, bx, y, 70);
      ctx.globalAlpha = 1;
    });

    // 配達車
    const vIn = seg(t, s4.van[0] - 0.35, s4.van[0]);
    if (vIn > 0) {
      const vp = seg(t, s4.van[0], s4.van[1]);
      const ve = E.inOutC(vp);
      const pos = bez(ROAD[0], ROAD[1], ROAD[2], ROAD[3], ve);
      const ahead = bez(ROAD[0], ROAD[1], ROAD[2], ROAD[3], Math.min(1, ve + 0.02));
      const back = bez(ROAD[0], ROAD[1], ROAD[2], ROAD[3], Math.max(0, ve - 0.02));
      const ang = Math.atan2(ahead[1] - back[1], ahead[0] - back[0]) * 0.6 * Math.sin(Math.PI * ve);
      const moving = vp > 0 && vp < 1;
      const bob = moving ? Math.sin(t * 34) * 1.6 : 0;
      art.van(ctx, pos[0], pos[1] + 14 + bob, 200 * E.outBack(vIn), { rot: ang, spin: ve * 26, alpha: clamp(vIn * 3) });
    }
  }

  /* ================= 26.3–32.3 秒：注文と配達の時間 ================= */
  function node(ctx, x, y, ic, p, a) {
    if (p <= 0) return;
    const e = E.outBack(p);
    ctx.globalAlpha = a;
    circle(ctx, x, y, 66 * e, '#FFFFFF');
    ring(ctx, x, y, 66 * e, 7, C.orange);
    art.icon(ctx, ic, x, y, 74 * e, C.orange, { cut: '#FFFFFF', alpha: a });
    ctx.globalAlpha = 1;
  }
  function sceneOrder(ctx, t) {
    const s5 = TL.s5;
    if (t < s5.swap || t >= 32.35) return;
    const out = t - s5.out;
    const fade = 1 - E.inC(seg(t, s5.out, s5.out + 0.4));
    const hr = SV.rich(T.s5.head, { numColor: C.orange, numFont: 'numB', k: 1.1 });
    text(ctx, hr, 960, 232, { size: 74, font: 'head', color: C.ink, align: 'center', t: t - s5.head, st: 0.03, clip: true, out });

    const X0 = 230, X1 = 1700, Y = 600, XA = 400, XB = 880, XC = 1540;
    const lp = E.inOutC(seg(t, s5.line, s5.line + 1.0));
    ctx.globalAlpha = fade;
    if (lp > 0) line(ctx, X0, Y, lerp(X0, X1, lp), Y, 8, C.line);
    const bp = E.inOutC(seg(t, s5.band[0], s5.band[1]));
    if (bp > 0) fillRR(ctx, XB, Y - 20, (XC - XB) * bp, 40, 20, C.yellow);
    ctx.globalAlpha = 1;
    if (bp > 0 && bp < 1) art.icon(ctx, 'van', lerp(XB + 40, XC - 40, bp), Y - 52, 78, C.ink, { cut: C.beige, alpha: fade });
    text(ctx, T.s5.band, (XB + XC) / 2, Y + 76, { size: 36, font: 'headM', color: C.ink, align: 'center', t: t - s5.band[0] - 0.1, st: 0.02, alpha: fade });

    const icons = ['phone', 'clock', 'bento'];
    [XA, XB, XC].forEach((x, i) => {
      const n = T.s5.nodes[i];
      const t0 = s5.nodes[i];
      node(ctx, x, Y, icons[i], seg(t, t0, t0 + 0.45), fade);
      if (n.time) SV.digits(ctx, n.time, x, Y - 100, { size: 84, font: 'numB', color: C.ink, t: t - t0 - 0.05, st: 0.04, alpha: fade });
      text(ctx, n.title, x, Y + 160, { size: 42, font: 'head', color: C.ink, align: 'center', t: t - t0 - 0.1, st: 0.025, alpha: fade });
      if (n.cap) text(ctx, n.cap, x, Y + 206, { size: 28, font: 'textR', color: C.sub, align: 'center', t: t - t0 - 0.2, st: 0.02, alpha: fade });
    });
    text(ctx, T.s5.note, 960, 948, { size: 28, font: 'textR', color: C.sub, align: 'center', t: t - s5.note, mode: 'fade', st: 0.008, alpha: fade });
  }

  /* ================= 32.2–42.3 秒：中身 ================= */
  function okazuProg(t) {
    const s6 = TL.s6;
    const pr = [seg(t, s6.rice, s6.rice + 0.45)];
    for (let i = 0; i < 7; i++) pr.push(seg(t, s6.okazu0 + i * s6.step, s6.okazu0 + i * s6.step + 0.45));
    return pr;
  }
  const BENTO = { x: 540, y: 628, w: 780 };
  function statRow(ctx, t, i, x, y, fade) {
    const s6 = TL.s6, st = T.s6.stats[i];
    const t0 = s6.stats[i];
    if (t < t0) return;
    const tt = t - t0;
    if (st.badge) {
      const p = E.outBack(seg(t, t0, t0 + 0.5));
      art.icon(ctx, 'leaf', x + 46, y - 36, 92 * p, C.green, { cut: '#FFFFFF', alpha: fade });
      text(ctx, st.badge, x + 116, y, { size: 58, font: 'head', color: C.ink, t: tt - 0.1, st: 0.03, alpha: fade });
    } else {
      let v;
      if (i === 0) {
        v = okazuProg(t).slice(1).filter(p => p >= 0.35).length;
      } else {
        const [c0, c1] = s6.counts[i];
        v = Math.round(st.num * E.outQuart(seg(t, c0, c1)));
      }
      const numSize = 112;
      const wFinal = SV.textWidth(ctx, String(st.num), { size: numSize, font: 'numB' });
      const wNow = SV.textWidth(ctx, String(v), { size: numSize, font: 'numB' });
      text(ctx, String(v), x + wFinal - wNow, y, { size: numSize, font: 'numB', color: C.orange, t: tt, st: 0, d: 0.45, alpha: fade });
      text(ctx, st.unit, x + wFinal + 16, y, { size: 52, font: 'head', color: C.ink, t: tt - 0.12, st: 0.03, alpha: fade });
    }
    text(ctx, st.cap, x + 4, y + 50, { size: 28, font: 'textR', color: C.sub, t: tt - 0.25, mode: 'fade', st: 0.01, alpha: fade });
    const lp = E.outC(seg(t, t0 + 0.1, t0 + 0.7));
    if (i < 3 && lp > 0) {
      ctx.globalAlpha = fade;
      line(ctx, x, y + 84, x + 690 * lp, y + 84, 2, C.line, 'butt');
      ctx.globalAlpha = 1;
    }
  }
  function sceneFood(ctx, t) {
    const s6 = TL.s6;
    if (t < s6.from || t >= s6.morph[1]) return;
    const out = t - s6.out;
    const fade = 1 - E.inC(seg(t, s6.out, s6.out + 0.35));
    const hr = SV.rich(T.s6.head);
    text(ctx, hr, 960, 214, { size: 82, font: 'head', color: C.ink, align: 'center', t: t - s6.head, st: 0.035, clip: true, out, mark: { p: seg(t, s6.mark, s6.mark + 0.6) } });

    // 弁当 → 時計への変形
    const mp = E.inOutC(seg(t, s6.morph[0], s6.morph[1]));
    const boxIn = E.outQuart(seg(t, s6.box, s6.box + 0.6));
    if (mp <= 0) {
      ctx.save();
      ctx.globalAlpha = clamp(boxIn * 2);
      art.bento(ctx, BENTO.x, BENTO.y + (1 - boxIn) * 120, BENTO.w, okazuProg(t), { foodAlpha: 1 - E.inC(seg(t, s6.out - 0.15, s6.morph[0])) });
      ctx.restore();
    } else {
      const s = BENTO.w / 800;
      const w0 = BENTO.w, h0 = 480 * s;
      const D = (RING.r + RING.lw / 2) * 2;
      const w = lerp(w0, D, mp), h = lerp(h0, D, mp);
      const cx = lerp(BENTO.x, RING.x, mp), cy = lerp(BENTO.y, RING.y, mp);
      const rad = lerp(40 * s, D / 2, mp);
      fillRR(ctx, cx - w / 2, cy - h / 2, w, h, rad, C.ink);
    }

    const x = 1070;
    [0, 1, 2, 3].forEach(i => statRow(ctx, t, i, x, 408 + i * 162, fade));
  }

  /* ================= 42.2–48.3 秒：昼休みが休みになる ================= */
  function sceneRest(ctx, t) {
    const s7 = TL.s7;
    if (t < s7.from || t >= s7.band + 0.4) return;
    const { x: cx, y: cy, r, lw } = RING;
    const hp = E.outC(seg(t, s7.hollow[0], s7.hollow[1]));
    if (hp < 1) {
      const R = r + lw / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.arc(cx, cy, (r - lw / 2) * hp, 0, Math.PI * 2, true);
      ctx.fillStyle = mix(C.ink, C.track, hp);
      ctx.fill();
    }
    let m = 0;
    const segs = [];
    const colors = [C.orange, C.yellow, C.green];
    s7.segs.forEach(([a, b, t0, t1], i) => {
      const p = i === 2 ? E.inOutC(seg(t, t0, t1)) : seg(t, t0, t1);
      if (p <= 0) return;
      const mm = lerp(a, b, p);
      m = Math.max(m, mm);
      segs.push({ a, b: mm, color: colors[i] });
    });
    if (hp >= 1) {
      art.clock(ctx, cx, cy, r, { lw, track: C.track, tickColor: C.tick, segs, head: m > 0 && m < 59.9 ? m : null, headColor: m > 25 ? C.green : m > 5 ? C.yellow : C.orange });
    } else {
      art.clock(ctx, cx, cy, r, { lw, track: 'rgba(0,0,0,0)', tickColor: C.tick, tickAlpha: hp, segs: [] });
    }

    // 中央：12:00 → 12:25 → コーヒー
    const mins = Math.floor(Math.min(m, 25) + 1e-6);
    const dFade = 1 - seg(t, 44.6, 44.9);
    if (dFade > 0) {
      SV.digits(ctx, '12:' + String(mins).padStart(2, '0'), cx, cy + 50, {
        size: 140, font: 'num', color: C.ink, t: t - 42.35, st: 0.04, alpha: dFade
      });
    }
    const cp = seg(t, 44.8, 45.25);
    if (cp > 0) art.icon(ctx, 'coffee', cx, cy + 6, 190 * E.outBack(cp), C.ink, { phase: t * 5, cut: C.beige });

    // 右側：受け取る → 食べる → 休む
    const icons = ['bento', 'bowl', 'coffee'];
    s7.segs.forEach(([a, b, t0], i) => {
      const p = seg(t, t0, t0 + 0.4);
      if (p <= 0) return;
      const q = E.inC(clamp((t - s7.rowsOut - i * 0.07) / 0.4));
      if (q >= 1) return;
      const y = 400 + i * 124 - q * 40;
      const e = E.outBack(p);
      const cc = colors[i];
      const ic = i === 1 ? C.ink : '#FFFFFF';
      ctx.globalAlpha = 1 - q;
      circle(ctx, RIGHT_X + 46, y, 46 * e, cc);
      art.icon(ctx, icons[i], RIGHT_X + 46, y, 60 * e, ic, { cut: cc, alpha: 1 - q, phase: t * 5 });
      ctx.globalAlpha = 1;
      text(ctx, T.s7.steps[i], RIGHT_X + 122, y + 18, { size: 50, font: 'headM', color: C.ink, t: t - t0 - 0.05, st: 0.025, d: 0.4, alpha: 1 - q });
    });

    const mk = { p: seg(t, s7.mark, s7.mark + 0.6) };
    text(ctx, T.s7.head[0], RIGHT_X, 466, { size: 84, font: 'head', color: C.ink, t: t - s7.head, st: 0.04, clip: true });
    text(ctx, SV.rich(T.s7.head[1]), RIGHT_X, 580, { size: 84, font: 'head', color: C.ink, t: t - s7.head - 0.2, st: 0.04, clip: true, mark: mk });
    text(ctx, T.s7.sub, RIGHT_X + 4, 676, { size: 42, font: 'text', color: C.sub, t: t - s7.sub, st: 0.02, clip: true });
  }

  /* ================= 48.3–51.4 秒：小さく始める ================= */
  function sceneSmall(ctx, t) {
    const s8 = TL.s8;
    if (t < s8.swap || t >= s8.out + 0.5) return;
    const out = t - s8.out;
    const fade = 1 - E.inC(seg(t, s8.out, s8.out + 0.4));
    text(ctx, T.s8.head, 960, 300, { size: 78, font: 'head', color: C.ink, align: 'center', t: t - s8.head, st: 0.03, clip: true, out });
    const XS = [560, 960, 1360], Y = 600, R = 104;
    const icons = ['pin', 'people3', 'repeat'];
    for (let i = 0; i < 2; i++) {
      const lp = E.inOutC(seg(t, s8.steps[i] + 0.2, s8.steps[i] + 0.7));
      if (lp <= 0) continue;
      ctx.globalAlpha = fade;
      ctx.setLineDash([14, 14]);
      line(ctx, XS[i] + R + 18, Y, lerp(XS[i] + R + 18, XS[i + 1] - R - 18, lp), Y, 6, C.orange, 'butt');
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    XS.forEach((x, i) => {
      const t0 = s8.steps[i];
      const p = seg(t, t0, t0 + 0.45);
      if (p <= 0) return;
      const e = E.outBack(p);
      ctx.globalAlpha = fade;
      circle(ctx, x, Y, R * e, '#FFFFFF');
      ring(ctx, x, Y, R * e, 8, C.orange);
      art.icon(ctx, icons[i], x, Y + 4, 118 * e, C.orange, { cut: '#FFFFFF', alpha: fade });
      circle(ctx, x - 74 * e, Y - 74 * e, 30 * e, C.orange);
      ctx.globalAlpha = 1;
      if (e > 0.5) SV.digits(ctx, String(i + 1), x - 74 * e, Y - 74 * e + 14, { size: 40, font: 'numB', color: C.ink, alpha: fade });
      text(ctx, T.s8.steps[i], x, Y + 186, { size: 46, font: 'head', color: C.ink, align: 'center', t: t - t0 - 0.1, st: 0.03, alpha: fade });
    });
  }

  /* ================= 51.3–54.0 秒：豊前でつくって、豊前へ ================= */
  const SPOKES = [[430, 470, 'factory'], [560, 790, 'clinic'], [1360, 790, 'warehouse'], [1490, 470, 'office']];
  function sceneLocal(ctx, t) {
    const s8 = TL.s8;
    if (t < s8.head2 - 0.05 || t >= 54.03) return;
    text(ctx, T.s8.head2, 960, 226, { size: 78, font: 'head', color: C.ink, align: 'center', t: t - s8.head2, st: 0.03, clip: true });
    const HX = 960, HY = 600;
    SPOKES.forEach(([x, y, ic], i) => {
      const t0 = s8.spokes[i];
      const lp = E.inOutC(seg(t, t0, t0 + 0.45));
      if (lp > 0) {
        const dx = x - HX, dy = y - HY, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const sx = HX + ux * 126, sy = HY + uy * 126;
        const ex = x - ux * 84, ey = y - uy * 84;
        ctx.setLineDash([12, 12]);
        line(ctx, sx, sy, lerp(sx, ex, lp), lerp(sy, ey, lp), 5, C.orange, 'butt');
        ctx.setLineDash([]);
        if (lp >= 1) {
          for (let k = 0; k < 2; k++) {
            const f = ((t - t0 - 0.45) * 0.9 + k * 0.5 + i * 0.13) % 1;
            circle(ctx, lerp(sx, ex, f), lerp(sy, ey, f), 7, C.orange);
          }
        }
      }
      const p = seg(t, t0 + 0.3, t0 + 0.75);
      if (p > 0) {
        const e = E.outBack(p);
        circle(ctx, x, y, 72 * e, '#EFE7D2');
        art.icon(ctx, ic, x, y + 2, 92 * e, C.ink, { cut: '#EFE7D2' });
        text(ctx, T.s8.spokes[i], x, y + 126, { size: 36, font: 'headM', color: C.ink, align: 'center', t: t - t0 - 0.4, st: 0.03 });
      }
    });
    const hp = E.outBack(seg(t, s8.hub, s8.hub + 0.5));
    if (hp > 0) {
      circle(ctx, HX, HY, 116 * hp, C.orange);
      art.icon(ctx, 'shop', HX, HY + 4, 140 * hp, '#FFFFFF', { cut: C.orange });
      text(ctx, T.s8.hub, HX, HY + 172, { size: 40, font: 'head', color: C.ink, align: 'center', t: t - s8.hub - 0.2, st: 0.03 });
    }
    text(ctx, T.s8.caption, 960, 985, { size: 30, font: 'textR', color: C.sub, align: 'center', t: t - s8.caption, mode: 'fade', st: 0.01 });
  }

  /* ================= 54.0–60 秒：エンドカード ================= */
  function sceneEnd(ctx, t) {
    const s9 = TL.s9;
    if (t < s9.from) return;
    text(ctx, T.s9.l1, 960, 330, { size: 100, font: 'head', color: C.ink, align: 'center', t: t - s9.l1, st: 0.04, clip: true });
    text(ctx, SV.rich(T.s9.l2), 960, 468, { size: 100, font: 'head', color: C.ink, align: 'center', t: t - s9.l2, st: 0.04, clip: true, mark: { p: seg(t, s9.mark, s9.mark + 0.6) } });
    text(ctx, T.s9.eyebrow, 960, 598, { size: 30, font: 'text', color: C.sub, align: 'center', ls: 0.1, t: t - s9.eyebrow, st: 0.015, mode: 'fade' });
    wordmark(ctx, 960, 716, { size: 124, areaK: 0.46, color: C.orange, areaColor: C.ink, t: t - s9.word });

    const cp = seg(t, s9.cta, s9.cta + 0.5);
    if (cp > 0) {
      const e = E.outBack(cp);
      const tw = SV.textWidth(ctx, T.s9.cta, { size: 44, font: 'head' });
      const bw = tw + 176, bh = 100, by = 836;
      ctx.save();
      ctx.translate(960, by);
      ctx.scale(e, e);
      fillRR(ctx, -bw / 2 + 5, -bh / 2 + 8, bw, bh, bh / 2, 'rgba(43,37,34,0.14)');
      fillRR(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2, C.orange);
      text(ctx, T.s9.cta, -bw / 2 + 60, 16, { size: 44, font: 'head', color: C.ink });
      const ax = bw / 2 - 66;
      line(ctx, ax - 16, 0, ax + 14, 0, 7, C.ink);
      line(ctx, ax + 2, -13, ax + 15, 0, 7, C.ink);
      line(ctx, ax + 2, 13, ax + 15, 0, 7, C.ink);
      ctx.restore();
    }
    const ia = E.outC(seg(t, s9.info, s9.info + 0.5));
    if (ia > 0) {
      const [c1, c2] = T.s9.contact;
      const o = { size: 34, font: 'text' };
      const w1 = SV.textWidth(ctx, c1, o), w2 = SV.textWidth(ctx, c2, o), gap = 70;
      const x0 = 960 - (w1 + gap + w2) / 2;
      text(ctx, c1, x0, 962, { size: 34, font: 'text', color: C.ink, alpha: ia });
      ctx.globalAlpha = ia;
      line(ctx, x0 + w1 + gap / 2, 932, x0 + w1 + gap / 2, 968, 2, C.tick, 'butt');
      ctx.globalAlpha = 1;
      text(ctx, c2, x0 + w1 + gap, 962, { size: 34, font: 'text', color: C.ink, alpha: ia });
    }
    text(ctx, T.s9.note, 960, 1016, { size: 24, font: 'textR', color: C.sub, align: 'center', t: t - s9.note, mode: 'fade', st: 0.006 });
  }

  /* ================= 画面の切り替え ================= */
  function irisIn(ctx, t, t0, color) {
    const p = seg(t, t0, t0 + 0.3);
    if (p <= 0 || t >= 18.02) return;
    circle(ctx, 960, 540, E.inC(p) * 1150, color);
  }
  function wipeUp(ctx, t, t0) {
    const p = E.inOutQuart(seg(t, t0, t0 + 0.56));
    if (p <= 0 || p >= 1) return;
    const y = H - p * (H + 120);
    const bulge = 90 * Math.sin(Math.PI * p);
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, y + bulge);
    ctx.quadraticCurveTo(W / 2, y - bulge, W, y + bulge);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = C.beige;
    ctx.fill();
  }
  // 斜めの帯（オレンジと黄）で場面を切り替える。t0+0.4 で画面が完全に隠れる
  function bandWipe(ctx, t, t0) {
    const dur = 0.8;
    const p = (t - t0) / dur;
    if (p <= 0 || p >= 1) return;
    const sk = 280;
    const edge = q => {
      const lead = lerp(-sk - 40, W + 60, E.inOutQuart(clamp(q * 2)));
      const trail = lerp(-sk - 60, W + 60, E.inOutQuart(clamp(q * 2 - 1)));
      return [trail, lead];
    };
    const draw = (tr, ld, color) => {
      if (ld <= tr) return;
      ctx.beginPath();
      ctx.moveTo(tr, H); ctx.lineTo(ld, H); ctx.lineTo(ld + sk, 0); ctx.lineTo(tr + sk, 0);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    const [yt] = edge(p - 0.07), [, yl] = edge(p + 0.07);
    draw(yt, yl, C.yellow);
    const [ot, ol] = edge(p);
    draw(ot, ol, C.orange);
  }
  function ringIris(ctx, t, t0) {
    const a = seg(t, t0, t0 + 0.3), b = seg(t, t0 + 0.3, t0 + 0.8);
    if (a <= 0 || b >= 1) return;
    const R = Math.hypot(W, H) / 2 + 30;
    const rOut = E.inC(a) * R;
    const rIn = E.outQuart(b) * R;
    ctx.beginPath();
    ctx.arc(960, 540, rOut, 0, Math.PI * 2);
    if (rIn > 0) ctx.arc(960, 540, rIn, 0, Math.PI * 2, true);
    ctx.fillStyle = C.orange;
    ctx.fill();
    if (rIn > 0) ring(ctx, 960, 540, rIn + 8, 16 * (1 - b), C.yellow);
  }

  /* 左上のロゴ表示 */
  function brandBug(ctx, t) {
    const a = seg(t, 21.9, 22.3) * (1 - seg(t, 53.3, 53.6));
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
    ctx.fillStyle = t < 18.02 ? C.grey : t < 21.66 ? C.orange : C.beige;
    ctx.fillRect(0, 0, W, H);

    sceneBefore(ctx, t);
    sceneCompany(ctx, t);
    irisIn(ctx, t, TL.s3.iris, C.orange);
    sceneBrand(ctx, t);
    wipeUp(ctx, t, TL.s4.wipe);
    if (t < TL.s4.band + 0.4) sceneRoute(ctx, t);
    sceneOrder(ctx, t);
    sceneFood(ctx, t);
    if (t < TL.s7.band + 0.4) sceneRest(ctx, t);
    sceneSmall(ctx, t);
    sceneLocal(ctx, t);
    sceneEnd(ctx, t);
    brandBug(ctx, t);
    bandWipe(ctx, t, TL.s4.band);
    bandWipe(ctx, t, TL.s7.band);
    ringIris(ctx, t, TL.s8.iris);
    ctx.restore();
  }

  SV.render = render;
})();
