/*
 * SPOON豊前 夕食の紹介動画 — Instagramリール用（1080×1920、縦長）
 *
 * 秒数（SV.TL）と音は横長版と同じなので、BGMもナレーション台本もそのまま使えます。
 * リールでは上に「リール」の見出し、下にキャプションやボタンが重なるため、
 * 文字はおおむね上から260〜1500pxの範囲に置いています。
 * 画面の右下（いいね・コメントのボタンが並ぶ x 950〜、y 1000〜）にも文字を置きません。
 * dinner-reel.html から、js/dinner/scenes.js のあとに読み込みます。
 */
(function () {
  'use strict';
  const SV = window.SV;
  if (!SV.REEL) return;
  const { clamp, lerp, seg, E, fillRR, strokeRR, circle, ring, line } = SV.util;
  const C = SV.C, T = SV.COPY, text = SV.text, art = SV.art, D = SV.DC, K = SV.kit;
  const TL = K.TL;
  const W = SV.W, H = SV.H, CX = W / 2;
  const cream = D.cream;

  // '｜' で改行した複数行を、1行ずつ少し遅らせて出す
  function block(ctx, str, x, y, lh, o) {
    const ls = SV.lines(str).map(s => s.trim());
    return ls.map((ln, i) => text(ctx, o.rich ? SV.rich(ln, o.rich) : ln, x, y + i * lh,
      Object.assign({}, o, { t: o.t == null ? undefined : o.t - i * (o.lineDelay == null ? 0.15 : o.lineDelay) })));
  }

  /* ---------- 0–5 秒：夕方5時 ---------- */
  function sceneDusk(ctx, t) {
    if (t >= 5.0) return;
    art.fillSky(ctx, 0.62 * E.inOutC(seg(t, 0, 5)));
    const sy = lerp(1040, 1380, E.inOutC(seg(t, 0, 5)));
    const g = ctx.createRadialGradient(800, sy, 40, 800, sy, 280);
    g.addColorStop(0, 'rgba(255,190,110,0.55)');
    g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(520, sy - 280, 560, 560);
    circle(ctx, 800, sy, 80, '#FFB45C');
    const sink = E.inC(seg(t, 4.4, 5.0)) * 420;
    const base = 1330 + sink;
    ctx.save();
    ctx.translate(CX, base);
    ctx.scale(0.8, 0.8);
    ctx.translate(-960, -800);
    art.town(ctx, 800, TL.chime.map(ct => seg(t, ct + 0.05, ct + 0.35)));
    ctx.restore();
    ctx.fillStyle = D.sil;
    ctx.fillRect(0, base + 220, W, H);
    const out = seg(t, TL.s1.out, TL.s1.out + 0.4);
    SV.digits(ctx, T.s1.time, CX, 640, { size: 210, font: 'num', color: cream, t: t - TL.s1.time, st: 0.05, alpha: 1 - out });
    text(ctx, T.s1.label, CX, 800, { size: 76, font: 'head', color: cream, align: 'center', t: t - TL.s1.label, st: 0.045, clip: true, out: t - TL.s1.out });
  }

  /* ---------- 5–10 秒：家では／10–15 秒：職場では ---------- */
  function bubbleScene(ctx, t, s, eyebrow, lines, drawArt, tail) {
    const ex = E.inC(seg(t, s.out, s.out + 0.5));
    drawArt(ex);
    K.pill(ctx, eyebrow, CX, 300, seg(t, s.eyebrow, s.eyebrow + 0.45) * (1 - ex), cream, C.ink, 32);
    ctx.save();
    ctx.globalAlpha = 1 - ex;
    art.thought(ctx, 80, 372, 920, 330, tail[0], tail[1], seg(t, s.bubble, s.bubble + 0.45));
    ctx.restore();
    const out = t - s.out;
    text(ctx, lines[0], CX, 520, { size: 64, font: 'head', color: C.ink, align: 'center', t: t - s.l1, st: 0.035, clip: true, out });
    text(ctx, lines[1], CX, 628, { size: 54, font: 'headM', color: C.sub, align: 'center', t: t - s.l2, st: 0.045, clip: true, out });
  }
  function sceneHome(ctx, t) {
    const s = TL.s2;
    if (t < s.from || t >= 10.1) return;
    const rise = E.outQuart(seg(t, s.rise, s.rise + 0.7));
    bubbleScene(ctx, t, s, T.s2.eyebrow, T.s2.lines, ex => {
      ctx.save();
      ctx.translate(-ex * 200, 0);
      ctx.globalAlpha = 1 - ex;
      ctx.fillStyle = D.sil;
      ctx.fillRect(0, 1440 + (1 - rise) * 300, W, H);
      art.house(ctx, CX, 1440 + (1 - rise) * 520, 660, { interior: 'pot' });
      ctx.restore();
      ctx.globalAlpha = 1;
    }, [470, 960]);
  }
  function sceneOffice(ctx, t) {
    const s = TL.s3;
    if (t < s.from || t >= 15.1) return;
    const rise = E.outQuart(seg(t, s.rise, s.rise + 0.7));
    const mins = lerp(17 * 60, 18 * 60 + 30, E.inOutC(seg(t, s.clock[0], s.clock[1])));
    bubbleScene(ctx, t, s, T.s3.eyebrow, T.s3.lines, ex => {
      ctx.save();
      ctx.globalAlpha = clamp(rise * 2) * (1 - ex);
      art.office(ctx, 100 + (1 - rise) * 200 - ex * 200, 800, 880, { minutes: mins });
      ctx.restore();
      ctx.globalAlpha = 1;
    }, [600, 860]);
  }

  /* ---------- 15–20 秒：手が回らない日がある ---------- */
  function sceneHook(ctx, t) {
    const s = TL.s4;
    if (t < s.from || t >= 20.02) return;
    [['house', 430], ['office', 650]].forEach(([ic, x], i) => {
      const p = E.outBack(seg(t, s.icons + i * 0.12, s.icons + i * 0.12 + 0.45));
      if (p <= 0) return;
      circle(ctx, x, 598, 74 * p, 'rgba(251,244,230,0.14)');
      art.icon(ctx, ic, x, 600, 92 * p, cream, { cut: D.dusk });
    });
    text(ctx, T.s4.head[0], CX, 860, { size: 84, font: 'head', color: cream, align: 'center', t: t - s.l1, st: 0.04, clip: true });
    const runs = SV.rich(T.s4.head[1]).map(r => (r.mark ? { s: r.s, c: C.yellow } : r));
    const L = text(ctx, runs, CX, 988, { size: 84, font: 'head', color: cream, align: 'center', t: t - s.l2, st: 0.04, clip: true });
    const u = E.inOutC(seg(t, s.under, s.under + 0.55));
    if (u > 0) {
      const wEm = SV.textWidth(ctx, '手が回らない日', { size: 84, font: 'head' });
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const f = (i / 30) * u;
        const xx = L.x + 4 + wEm * f, yy = 1018 + Math.sin(f * 9) * 3;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.lineWidth = 7;
      ctx.strokeStyle = C.yellow;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  /* ---------- 20–22.7 秒：SPOON ---------- */
  function sceneBrand(ctx, t) {
    const s = TL.s5;
    if (t < s.hit || t >= 22.96) return;
    for (const [d, a] of [[0, 0.55], [0.14, 0.35], [0.28, 0.22]]) {
      const p = seg(t, s.hit + d, s.hit + d + 1.3);
      if (p <= 0 || p >= 1) continue;
      ctx.globalAlpha = a * (1 - p);
      ring(ctx, CX, 960, 90 + E.outC(p) * 1000, 44 * (1 - p) + 2, C.orangeSoft);
    }
    ctx.globalAlpha = 1;
    const out = t - s.textOut;
    text(ctx, T.s5.pre, CX, 840, { size: 80, font: 'head', color: C.ink, align: 'center', t: t - s.pre, st: 0.035, clip: true, out });
    K.wordmark(ctx, CX, 1080, { size: 200, areaK: 0.42, color: '#FFFFFF', areaColor: C.ink, t: t - s.word, out });
  }

  /* ---------- 22.9–25 秒：ご自宅にも、職場にも ---------- */
  const HUB = [CX, 860], DEST = [[250, 1250, 'house', 'home'], [830, 1250, 'office', 'work']];
  function sceneRoutes(ctx, t) {
    const s = TL.s5;
    if (t < 22.9 || t >= s.band + 0.4) return;
    text(ctx, T.s5.head, CX, 430, { size: 86, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.035, clip: true });
    DEST.forEach(([x, y, ic, key], i) => {
      const t0 = s.paths[i];
      const lp = E.inOutC(seg(t, t0, t0 + 0.45));
      const dx = x - HUB[0], dy = y - HUB[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const sx = HUB[0] + ux * 128, sy = HUB[1] + uy * 128, ex = x - ux * 112, ey = y - uy * 112;
      if (lp > 0) {
        ctx.setLineDash([14, 14]);
        line(ctx, sx, sy, lerp(sx, ex, lp), lerp(sy, ey, lp), 6, C.orange, 'butt');
        ctx.setLineDash([]);
      }
      if (lp >= 1) {
        for (let k = 0; k < 2; k++) {
          const f = ((t - t0 - 0.45) * 0.8 + k * 0.5) % 1;
          art.bentoSide(ctx, lerp(sx, ex, f), lerp(sy, ey, f) + 12, 44);
        }
      }
      const p = E.outBack(seg(t, t0 + 0.25, t0 + 0.7));
      if (p > 0) {
        circle(ctx, x, y, 100 * p, D.circle);
        art.icon(ctx, ic, x, y + 4, 124 * p, C.ink, { cut: D.circle });
        text(ctx, T.s5[key], x, y + 176, { size: 48, font: 'head', color: C.ink, align: 'center', t: t - t0 - 0.35, st: 0.04 });
      }
    });
    const hp = E.outBack(seg(t, s.hub, s.hub + 0.5));
    if (hp > 0) {
      circle(ctx, HUB[0], HUB[1], 116 * hp, C.orange);
      art.icon(ctx, 'shop', HUB[0], HUB[1] + 4, 140 * hp, '#FFFFFF', { cut: C.orange });
      text(ctx, T.s5.hub, HUB[0], HUB[1] - 150, { size: 38, font: 'headM', color: C.sub, align: 'center', t: t - s.hub - 0.2, st: 0.03 });
    }
  }

  /* ---------- 25–30 秒：おまかせ日替わり弁当 ---------- */
  function sceneHero(ctx, t) {
    const s = TL.s6;
    if (t < s.swap || t >= 30.0) return;
    const ex = E.inC(seg(t, s.heroOut, s.heroOut + 0.55));
    const prog = [];
    for (let i = 0; i < 8; i++) prog.push(seg(t, s.items + i * s.step, s.items + i * s.step + 0.4));
    const bin = E.outQuart(seg(t, s.box, s.box + 0.6));
    ctx.save();
    ctx.globalAlpha = clamp(bin * 2) * (1 - ex);
    art.bento(ctx, CX, 700 + (1 - bin) * 120 - ex * 120, 900, prog);
    ctx.restore();
    const out = t - s.heroOut;
    text(ctx, T.s6.hero.eyebrow, CX, 1086, { size: 52, font: 'headM', color: C.sub, align: 'center', t: t - s.eyebrow, st: 0.04, clip: true, out });
    text(ctx, T.s6.hero.name, CX, 1206, { size: 104, font: 'head', color: C.ink, align: 'center', t: t - s.name, st: 0.04, clip: true, out });
    K.scenePrice(ctx, T.s6.hero.price, CX, 1392, 190, { align: 'center', t: t - s.price, st: 0.06, d: 0.5, mode: 'pop', out });
    text(ctx, T.s6.hero.note, CX, 1462, { size: 28, font: 'textR', color: C.sub, align: 'center', t: t - s.note, mode: 'fade', st: 0.01, out });
  }

  /* ---------- 30–35 秒：定番のお弁当 ---------- */
  function sceneCards(ctx, t) {
    const s = TL.s6;
    if (t < 29.9 || t >= s.band + 0.4) return;
    text(ctx, T.s6.head, CX, 330, { size: 78, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.04, clip: true });
    T.s6.items.forEach((it, i) => {
      const t0 = s.cards[i];
      const p = seg(t, t0, t0 + 0.5);
      if (p <= 0) return;
      const top = 400 + i * 335;
      const dx = (1 - E.outQuart(p)) * 160;
      ctx.save();
      ctx.translate(dx, 0);
      ctx.globalAlpha = clamp(p * 3);
      fillRR(ctx, 100 + 6, top + 10, 880, 305, 28, 'rgba(43,37,34,0.10)');
      fillRR(ctx, 100, top, 880, 305, 28, '#FFFFFF');
      ctx.restore();
      ctx.globalAlpha = 1;
      art.menu(ctx, it.art, 298 + dx, top + 152, 350, seg(t, t0 + 0.1, t0 + 0.6));
      text(ctx, it.name, 518 + dx, top + 128, { size: 50, font: 'head', color: C.ink, t: t - t0 - 0.2, st: 0.03 });
      K.scenePrice(ctx, it.price, 514 + dx, top + 248, 104, { t: t - t0 - 0.3, st: 0.05, mode: 'pop' });
    });
    block(ctx, T.s6.more, CX, 1440, 46, { size: 30, font: 'textR', color: C.sub, align: 'center', t: t - s.more, mode: 'fade', st: 0.008, lineDelay: 0.2 });
  }

  /* ---------- 35–45 秒：注文と配達の時間（縦の時間軸） ---------- */
  const AX = { x: 330, y0: 560, ph: 92 };
  const hy = h => AX.y0 + (h - 9) * AX.ph;
  function sceneOrder(ctx, t) {
    const s = TL.s7;
    if (t < s.swap || t >= 44.9) return;
    const fade = 1 - E.inC(seg(t, s.out, s.out + 0.4));
    const out = t - s.out;
    block(ctx, T.s7.head, CX, 330, 108, { size: 86, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.03, clip: true, out,
      rich: { numColor: C.orange, numFont: 'numB', k: 1.06 } });
    const cur = 9 + 10 * clamp((t - s.cursor[0]) / (s.cursor[1] - s.cursor[0]));
    const ap = E.inOutC(seg(t, s.axis[0], s.axis[1]));
    ctx.globalAlpha = fade;
    if (ap > 0) line(ctx, AX.x, hy(9) - 30, AX.x, lerp(hy(9) - 30, hy(19) + 30, ap), 6, C.line);
    for (let h = 9; h <= 19; h++) {
      const p = seg(ap * 10 + 9, h, h + 0.6);
      if (p <= 0) continue;
      line(ctx, AX.x - 26, hy(h), AX.x - 12, hy(h), 3, C.tick);
      text(ctx, `{${h}}時`, AX.x - 40, hy(h) + 11, { size: 32, font: 'textR', color: C.sub, align: 'right', alpha: p * fade });
    }
    if (cur > 9) fillRR(ctx, AX.x - 15, hy(9), 30, hy(Math.min(cur, 12)) - hy(9), 15, C.orange);
    if (cur > 14) fillRR(ctx, AX.x - 15, hy(14), 30, hy(Math.min(cur, 17)) - hy(14), 15, C.yellow);
    if (cur > 17) {
      const ye = hy(Math.min(cur, 18));
      ctx.globalAlpha = 0.45 * fade;
      fillRR(ctx, AX.x - 15, hy(17) - 15, 30, ye - hy(17) + 15, 15, C.yellow);
      ctx.globalAlpha = fade;
      ctx.setLineDash([8, 7]);
      strokeRR(ctx, AX.x - 15, hy(17) - 15, 30, ye - hy(17) + 15, 15, '#E0A800', 2.5);
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    // 進む時刻のしるし（お届けの間は配達車）
    const bp = seg(t, K.hourAt(14), K.hourAt(17));
    if (t > s.cursor[0] && t < s.cursor[1] + 0.4) {
      const a = (1 - seg(t, s.cursor[1], s.cursor[1] + 0.4)) * fade;
      if (bp > 0 && bp < 1) art.icon(ctx, 'van', AX.x, hy(cur), 70, C.ink, { cut: C.yellow, alpha: a });
      else {
        ctx.globalAlpha = a;
        circle(ctx, AX.x, hy(cur), 16, C.ink);
        circle(ctx, AX.x, hy(cur), 7, '#FFFFFF');
        ctx.globalAlpha = 1;
      }
    }
    ['phone', 'fax'].forEach((ic, i) => {
      const p = seg(t, s.icons[i], s.icons[i] + 0.45);
      if (p <= 0) return;
      const x = 450 + i * 112, e = E.outBack(p);
      ctx.globalAlpha = fade;
      circle(ctx, x, 628, 48 * e, '#FFFFFF');
      ring(ctx, x, 628, 48 * e, 5, C.orange);
      art.icon(ctx, ic, x, 628, 60 * e, C.orange, { cut: '#FFFFFF', alpha: fade });
      ctx.globalAlpha = 1;
    });
    text(ctx, T.s7.order, 404, 736, { size: 42, font: 'head', color: C.ink, t: t - s.icons[0] - 0.2, st: 0.03, alpha: fade });
    const dp = seg(t, K.hourAt(12), K.hourAt(12) + 0.45);
    if (dp > 0) {
      ctx.globalAlpha = fade;
      ctx.setLineDash([6, 6]);
      line(ctx, AX.x + 18, hy(12), AX.x + 88, hy(12), 3, D.price, 'butt');
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      const lw = SV.textWidth(ctx, T.s7.deadline, { size: 32, font: 'text' }) + 56;
      const e = E.outBack(dp);
      ctx.save();
      ctx.translate(AX.x + 92 + lw / 2, hy(12));
      ctx.scale(e, e);
      ctx.globalAlpha = fade;
      fillRR(ctx, -lw / 2, -32, lw, 64, 32, D.price);
      text(ctx, T.s7.deadline, 0, 12, { size: 32, font: 'text', color: '#FFFFFF', align: 'center', alpha: fade });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    text(ctx, T.s7.band, 404, hy(15.5) + 14, { size: 46, font: 'head', color: C.ink, t: t - K.hourAt(14) - 0.1, st: 0.025, alpha: fade });
    text(ctx, T.s7.late, 404, hy(17.5) + 10, { size: 30, font: 'textR', color: C.sub, t: t - K.hourAt(17) - 0.2, mode: 'fade', st: 0.01, alpha: fade });
    const np = seg(t, K.hourAt(18.5), K.hourAt(18.5) + 0.45);
    if (np > 0) {
      const e = E.outBack(np);
      art.icon(ctx, 'bowl', 450, hy(18.6) - 14, 84 * e, C.ink, { cut: C.beige, alpha: fade });
      text(ctx, T.s7.dinner, 516, hy(18.6) + 2, { size: 44, font: 'head', color: C.ink, t: t - K.hourAt(18.5) - 0.1, st: 0.04, alpha: fade });
    }
  }

  /* ---------- 45–50 秒：宅配1個から無料 ---------- */
  function sceneFree(ctx, t) {
    const s = TL.s8;
    if (t < s.from || t >= 50.25) return;
    const fade = 1 - E.inC(seg(t, s.out, s.out + 0.4));
    const out = t - s.out;
    block(ctx, T.s8.head, CX, 420, 124, { size: 94, font: 'head', color: C.ink, align: 'center', t: t - s.head, st: 0.035, clip: true, out,
      mark: { p: seg(t, s.mark, s.mark + 0.5) }, rich: { numColor: C.orange, numFont: 'numB', k: 1.15 } });
    ctx.globalAlpha = fade;
    line(ctx, 70, 1090, 1010, 1090, 6, C.line);
    ctx.globalAlpha = 1;
    const vp = E.outQuart(seg(t, s.van[0], s.van[1]));
    if (vp > 0) art.van(ctx, lerp(-260, 290, vp), 1090, 340, { spin: vp * 30, alpha: fade });
    const bp = seg(t, s.bento, s.bento + 0.5);
    if (bp > 0) {
      const y = lerp(920, 1090, E.outBounce(bp));
      ctx.globalAlpha = clamp(bp * 4) * fade;
      art.bentoSide(ctx, 770, y, 220);
      ctx.globalAlpha = 1;
      const e = E.outBack(seg(t, s.bento + 0.25, s.bento + 0.65));
      if (e > 0) {
        ctx.globalAlpha = fade;
        circle(ctx, 884, 958, 46 * e, C.orange);
        ctx.globalAlpha = 1;
        SV.digits(ctx, '1', 884, 958 + 21 * e, { size: 60 * e, font: 'numB', color: C.ink, alpha: fade });
      }
    }
    const gp = seg(t, s.badge, s.badge + 0.5);
    if (gp > 0) {
      const e = E.outBack(gp);
      ctx.save();
      ctx.translate(CX, 1340);
      ctx.rotate(-0.1);
      ctx.scale(e, e);
      ctx.globalAlpha = fade;
      circle(ctx, 0, 0, 124, C.yellow);
      ring(ctx, 0, 0, 108, 4, C.ink);
      text(ctx, T.s8.badge, 0, 20, { size: 50, font: 'head', color: C.ink, align: 'center', alpha: fade });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- 50–55 秒：おいしいごはんで ---------- */
  function sceneNight(ctx, t) {
    const s = TL.s9;
    if (t < s.house - 0.05 || t >= 55.4) return;
    const ex = E.inC(seg(t, s.out, s.out + 0.6));
    const rise = E.outQuart(seg(t, s.house, s.house + 0.8));
    ctx.save();
    ctx.globalAlpha = 1 - ex;
    ctx.fillStyle = D.sil;
    ctx.fillRect(0, 1460 + (1 - rise) * 300, W, H);
    art.house(ctx, CX, 1460 + (1 - rise) * 520, 660, { interior: 'table', t });
    ctx.restore();
    ctx.globalAlpha = 1;
    T.s9.lines.forEach((ln, i) => {
      text(ctx, ln, CX, 560 + i * 120, { size: 86, font: 'head', color: cream, align: 'center', t: t - (i ? s.l2 : s.l1), st: 0.045, clip: true, out: t - s.out });
    });
  }

  /* ---------- 55–60 秒：エンドカード ---------- */
  function sceneEnd(ctx, t) {
    const s = TL.s10;
    if (t < s.from) return;
    block(ctx, T.s10.eyebrow, CX, 392, 46, { size: 32, font: 'text', color: D.creamSub, align: 'center', ls: 0.04, t: t - s.eyebrow, mode: 'fade', st: 0.012, lineDelay: 0.1 });
    K.wordmark(ctx, CX, 620, { size: 176, areaK: 0.44, color: C.orange, areaColor: cream, t: t - s.word });
    block(ctx, T.s10.head, CX, 790, 108, { size: 88, font: 'head', color: cream, align: 'center', t: t - s.head, st: 0.035, clip: true,
      rich: { numColor: C.yellow, numFont: 'numB', k: 1.08 } });
    K.contact(ctx, T.s10.tel[0], T.s10.tel[1], CX, 1060, E.outC(seg(t, s.tel, s.tel + 0.45)));
    K.contact(ctx, T.s10.fax[0], T.s10.fax[1], CX, 1186, E.outC(seg(t, s.fax, s.fax + 0.45)));
    block(ctx, T.s10.note, CX, 1300, 44, { size: 30, font: 'textR', color: D.creamSub, align: 'center', t: t - s.note, mode: 'fade', st: 0.008, lineDelay: 0.15 });
  }

  /* ---------- 1フレーム描画 ---------- */
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
      art.moon(ctx, 850, 330, 56, seg(t, 50.25, 50.9));
    }
    sceneDusk(ctx, t);
    sceneHome(ctx, t);
    sceneOffice(ctx, t);
    sceneHook(ctx, t);
    K.irisIn(ctx, t, TL.s4.iris);
    sceneBrand(ctx, t);
    K.wipeUp(ctx, t, TL.s5.wipe);
    sceneRoutes(ctx, t);
    sceneHero(ctx, t);
    sceneCards(ctx, t);
    sceneOrder(ctx, t);
    sceneFree(ctx, t);
    K.nightfall(ctx, t, TL.s9.night);
    sceneNight(ctx, t);
    sceneEnd(ctx, t);
    K.bandWipe(ctx, t, TL.s5.band);
    K.bandWipe(ctx, t, TL.s6.band);
    ctx.restore();
  }

  SV.render = render;
})();
