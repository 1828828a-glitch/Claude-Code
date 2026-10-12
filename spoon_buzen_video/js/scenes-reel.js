/*
 * SPOON豊前 紹介動画（昼食） — Instagramリール用（1080×1920、縦長）
 *
 * 秒数（SV.TL）と音は横長版と同じなので、BGMもナレーション台本もそのまま使えます。
 * リールでは上に「リール」の見出し、下にキャプションやボタンが重なるため、
 * 文字はおおむね上から260〜1500pxの範囲に置いています。
 * 画面の右下（いいね・コメントのボタンが並ぶ x 950〜、y 1000〜）にも文字を置きません。
 * reel.html から、js/scenes.js のあとに読み込みます。
 */
(function () {
  'use strict';
  const SV = window.SV;
  if (!SV.REEL) return;
  const { clamp, lerp, seg, E, mix, fillRR, circle, ring, line, bez, bezPath } = SV.util;
  const C = SV.C, T = SV.COPY, text = SV.text, art = SV.art, K = SV.kit;
  const TL = K.TL;
  const W = SV.W, H = SV.H, CX = W / 2;

  function block(ctx, str, x, y, lh, o) {
    const ls = SV.lines(str).map(s => s.trim());
    return ls.map((ln, i) => text(ctx, o.rich ? SV.rich(ln, o.rich) : SV.rich(ln), x, y + i * lh,
      Object.assign({}, o, { t: o.t == null ? undefined : o.t - i * (o.lineDelay == null ? 0.15 : o.lineDelay) })));
  }
  // 時計の下に並ぶ手順の行（アイコン＋言葉）。いちばん長い言葉に合わせて、まとまりごと中央に置く
  function listX(ctx, labels) {
    const w = Math.max(...labels.map(s => SV.textWidth(ctx, s, { size: 52, font: 'headM' })));
    return CX - (96 + 30 + w) / 2 + 48;
  }
  function stepRow(ctx, t, t0, x, y, ic, color, iconColor, q, phase) {
    const p = seg(t, t0, t0 + 0.4);
    if (p <= 0 || q >= 1) return;
    const e = E.outBack(p);
    ctx.globalAlpha = 1 - q;
    circle(ctx, x, y, 48 * e, color);
    art.icon(ctx, ic, x, y, 62 * e, iconColor, { cut: color, alpha: 1 - q, phase });
    ctx.globalAlpha = 1;
    return { p, e };
  }
  // 桁幅を固定した数字（SV.digits）の幅
  const digitsW = (str, size) => Array.from(str).reduce((s, ch) => s + (ch === ':' ? 0.3 : 0.6) * size, 0);

  const RING1 = { x: CX, y: 760, r: 340 };
  const RING = { x: CX, y: 650, r: 300, lw: 32 };

  /* ---------- 0–12.6 秒：12:00 → 12:35 ---------- */
  function sceneBefore(ctx, t) {
    if (t >= 12.6) return;
    const s1 = TL.s1, s2 = TL.s2;
    const mv = E.inOutC(seg(t, s1.move, s1.move + 0.8));
    const cx = CX, cy = lerp(RING1.y, RING.y, mv), r = lerp(RING1.r, RING.r, mv);
    const ex = E.inC(seg(t, s2.out, s2.out + 0.55));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 - 0.22 * ex, 1 - 0.22 * ex);
    ctx.translate(-cx, -cy);
    if (t < 4.6) {
      for (const ct of TL.chime) {
        const p = seg(t, ct, ct + 1.1);
        if (p <= 0 || p >= 1) continue;
        ctx.globalAlpha = (1 - p) * 0.5 * (1 - ex);
        ring(ctx, cx, cy, r + 28 + E.outC(p) * 160, 4 * (1 - p) + 1, C.greyMid);
      }
      ctx.globalAlpha = 1;
    }
    const m = clamp((t - s2.start) * s2.rate, 0, s2.total);
    const segs = [];
    s2.segs.forEach(([a, b], i) => { if (m > a) segs.push({ a, b: Math.min(m, b), color: C.lost[i] }); });
    art.clock(ctx, cx, cy, r, {
      alpha: 1 - ex, lw: RING.lw, draw: E.inOutC(seg(t, s1.ring, s1.ring + 1.2)), segs,
      head: t > s2.start && t < s2.hit + 0.25 ? m : null, headColor: C.lost[0]
    });
    const mins = Math.floor(m + 1e-6);
    const bump = 1 + 0.16 * Math.sin(Math.PI * seg(t, s2.hit, s2.hit + 0.45));
    const size = 160 * (r / 300) * bump;
    SV.digits(ctx, '12:' + String(mins).padStart(2, '0'), cx, cy + size * 0.36, {
      size, font: 'num', color: t >= s2.hit ? C.lostText : C.greyInk, t: t < 2 ? t - s1.digits : undefined, alpha: 1 - ex
    });
    ctx.restore();
    ctx.globalAlpha = 1;
    if (t < 3.9) text(ctx, T.s1.label, CX, 1262, { size: 76, font: 'head', color: C.greyInk, align: 'center', t: t - s1.label, st: 0.04, clip: true, out: t - s1.labelOut });

    // 見出しと同じ場所を使うので、横長版より早めに消す
    const lx = listX(ctx, T.s2.steps);
    s2.segs.forEach(([a, b, ic], i) => {
      const t0 = s2.start + a / s2.rate;
      const q = E.inC(clamp((t - s2.hit - i * 0.03) / 0.26));
      const active = m < b || (i === 3 && t < s2.hit);
      const y = 1062 + i * 112 - q * 40;
      const cc = active ? C.lost[i] : C.greyDone;
      if (!stepRow(ctx, t, t0, lx, y, ic, cc, '#fff', q)) return;
      text(ctx, T.s2.steps[i], lx + 78, y + 18, { size: 52, font: 'headM', color: active ? C.greyInk : '#8C959F', t: t - t0 - 0.05, st: 0.025, d: 0.4, alpha: 1 - q });
    });
    const hr = SV.rich(T.s2.head, { numColor: C.lostText, numFont: 'numB', k: 1.1 });
    text(ctx, hr, CX, 1150, { size: 82, font: 'head', color: C.greyInk, align: 'center', t: t - s2.head, st: 0.035, clip: true, out: t - s2.out, od: 0.4 });
    text(ctx, T.s2.sub, CX, 1262, { size: 46, font: 'text', color: C.greySub, align: 'center', t: t - s2.sub, st: 0.02, clip: true, out: t - s2.out - 0.05 });
  }

  /* ---------- 12.2–18.0 秒：会社側の悩み ---------- */
  function sceneCompany(ctx, t) {
    const s3 = TL.s3;
    if (t < s3.from || t >= 18.02) return;
    const ep = E.outBack(seg(t, s3.eyebrow, s3.eyebrow + 0.45));
    if (ep > 0) {
      const lw = SV.textWidth(ctx, T.s3.eyebrow, { size: 32, font: 'text' }) + 60;
      ctx.save();
      ctx.translate(CX, 300);
      ctx.scale(ep, ep);
      fillRR(ctx, -lw / 2, -32, lw, 64, 32, C.greyInk);
      text(ctx, T.s3.eyebrow, 0, 12, { size: 32, font: 'text', color: '#fff', align: 'center' });
      ctx.restore();
    }
    if (t < s3.h2) block(ctx, T.s3.h1, CX, 452, 112, { size: 90, font: 'head', color: C.greyInk, align: 'center', t: t - s3.h1, st: 0.04, clip: true, out: t - s3.h1out, od: 0.3 });
    block(ctx, T.s3.h2, CX, 452, 104, { size: 80, font: 'head', color: C.greyInk, align: 'center', t: t - s3.h2, st: 0.03, clip: true });
    // 「社員食堂」の枠と並ぶあいだは少し上に置き、枠が消えたら下の中央へ寄せて、空いた上に机を出す
    const fp = E.outQuart(seg(t, s3.factory, s3.factory + 0.8));
    const sl = E.inOutC(seg(t, 14.75, 15.35));
    ctx.save();
    ctx.globalAlpha = clamp(fp * 2);
    art.factory(ctx, lerp(330, CX, sl), lerp(1290, 1470, sl) + (1 - fp) * 420, 480, art.PAL.grey);
    ctx.restore();
    const ga = E.outC(seg(t, s3.ghost, s3.ghost + 0.5)) * (1 - E.inC(seg(t, 14.5, 14.95)));
    if (ga > 0) {
      art.canteenGhost(ctx, 790, 1290, 320, 270, T.s3.ghost, ga);
      const c1 = E.outC(seg(t, s3.cross, s3.cross + 0.22)), c2 = E.outC(seg(t, s3.cross + 0.14, s3.cross + 0.36));
      ctx.globalAlpha = ga;
      if (c1 > 0) line(ctx, 670, 1060, lerp(670, 910, c1), lerp(1060, 1250, c1), 16, C.lost[0]);
      if (c2 > 0) line(ctx, 910, 1060, lerp(910, 670, c2), lerp(1060, 1250, c2), 16, C.lost[0]);
      ctx.globalAlpha = 1;
    }
    const dp = E.outBack(seg(t, s3.desk, s3.desk + 0.5));
    if (dp > 0) {
      const shake = t > 16.6 ? Math.sin(t * 38) * 0.035 * (1 - seg(t, 17.3, 17.7)) : 0;
      art.icon(ctx, 'person', 430, 880, 190 * dp, C.greyInk);
      art.icon(ctx, 'clipboard', 620, 900, 170 * dp, '#7E8894', { rot: shake, cut: '#FFFFFF' });
    }
    const TAGPOS = [[250, 724, -0.1], [840, 706, 0.09], [872, 948, -0.07], [222, 1030, 0.05], [560, 664, -0.04]];
    s3.tags.forEach((tt, i) => {
      const p = seg(t, tt, tt + 0.45);
      if (p <= 0) return;
      const [x, y, rot] = TAGPOS[i];
      const jig = t > 16.6 ? Math.sin(t * 30 + i) * 0.03 : 0;
      art.tag(ctx, T.s3.tags[i], x, y, { rot: rot + jig, scale: E.outBack(p), alpha: clamp(p * 3), size: 36 });
    });
  }

  /* ---------- 18.0–21.7 秒：SPOON ---------- */
  function sceneBrand(ctx, t) {
    const s4 = TL.s4;
    if (t < s4.hit || t >= 21.66) return;
    for (const [d, a] of [[0, 0.55], [0.14, 0.35], [0.28, 0.22]]) {
      const p = seg(t, s4.hit + d, s4.hit + d + 1.3);
      if (p <= 0 || p >= 1) continue;
      ctx.globalAlpha = a * (1 - p);
      ring(ctx, CX, 960, 90 + E.outC(p) * 1000, 44 * (1 - p) + 2, C.orangeSoft);
    }
    ctx.globalAlpha = 1;
    const out = t - s4.textOut;
    text(ctx, T.s4.eyebrow, CX, 770, { size: 38, font: 'text', color: C.ink, align: 'center', ls: 0.12, t: t - s4.eyebrow, st: 0.02, clip: true, out });
    K.wordmark(ctx, CX, 1010, { size: 200, areaK: 0.42, color: '#FFFFFF', areaColor: C.ink, t: t - s4.word, out });
    block(ctx, T.s4.tagline, CX, 1190, 96, { size: 74, font: 'head', color: C.ink, align: 'center', t: t - s4.tag, st: 0.03, clip: true, out });
  }

  /* ---------- 21.7–26.3 秒：配達ルート ---------- */
  const ROAD = [[460, 830], [930, 900], [150, 1210], [490, 1340]];
  function sceneRoute(ctx, t) {
    const s4 = TL.s4;
    if (t < 21.66 || t >= s4.band + 0.4) return;
    block(ctx, T.s4.head, CX, 380, 106, { size: 86, font: 'head', color: C.ink, align: 'center', t: t - s4.head, st: 0.035, clip: true });
    const rp = E.inOutC(seg(t, s4.road, s4.road + 0.8));
    if (rp > 0) {
      bezPath(ctx, ROAD, rp, 80);
      ctx.lineWidth = 54; ctx.strokeStyle = '#EAE2CC'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      bezPath(ctx, ROAD, rp, 80);
      ctx.setLineDash([22, 20]); ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); ctx.setLineDash([]);
      ctx.lineCap = 'butt';
    }
    const sp = E.outBack(seg(t, s4.road - 0.15, s4.road + 0.4));
    if (sp > 0) {
      ctx.save(); ctx.translate(300, 860); ctx.scale(sp, sp); art.shop(ctx, 0, 0, 300); ctx.restore();
      text(ctx, T.s4.from, 300, 936, { size: 42, font: 'headM', color: C.ink, align: 'center', t: t - s4.road - 0.2, st: 0.025 });
    }
    const fp = E.outBack(seg(t, s4.road + 0.1, s4.road + 0.65));
    if (fp > 0) {
      // 工場と受け取りの台は一緒に出す
      ctx.save(); ctx.translate(750, 1380); ctx.scale(fp, fp);
      art.factory(ctx, 0, 0, 320, art.PAL.warm);
      fillRR(ctx, -150, -2, 150, 12, 6, C.ink);
      line(ctx, -138, 8, -138, 34, 6, C.ink);
      line(ctx, -12, 8, -12, 34, 6, C.ink);
      ctx.restore();
      text(ctx, T.s4.to, 750, 1456, { size: 42, font: 'headM', color: C.ink, align: 'center', t: t - s4.road - 0.35, st: 0.025 });
    }
    [[638, 0], [712, 0], [638, 1], [712, 1], [675, 2]].forEach(([bx, lv], i) => {
      const t0 = s4.stack + i * 0.1;
      const p = seg(t, t0, t0 + 0.4);
      if (p <= 0) return;
      const yEnd = 1378 - lv * 28;
      ctx.globalAlpha = clamp(p * 4);
      art.bentoSide(ctx, bx, lerp(yEnd - 140, yEnd, E.outBounce(p)), 66);
      ctx.globalAlpha = 1;
    });
    const vIn = seg(t, s4.van[0] - 0.35, s4.van[0]);
    if (vIn > 0) {
      const ve = E.inOutC(seg(t, s4.van[0], s4.van[1]));
      const pos = bez(ROAD[0], ROAD[1], ROAD[2], ROAD[3], ve);
      const ahead = bez(ROAD[0], ROAD[1], ROAD[2], ROAD[3], Math.min(1, ve + 0.02));
      const back = bez(ROAD[0], ROAD[1], ROAD[2], ROAD[3], Math.max(0, ve - 0.02));
      // 縦長の道は右→左→右と折り返すので、左へ進むあいだは車体を左向きにする。
      // 真下を向くあたりでは横幅を細くして、向きの切り替えを「振り向き」に見せる
      const th = Math.atan2(ahead[1] - back[1], ahead[0] - back[0]);
      const flip = Math.cos(th) < 0;
      let ang = flip ? th - Math.PI : th;
      if (ang < -Math.PI) ang += Math.PI * 2;
      const turn = E.outC(clamp(Math.abs(Math.cos(th)) * 4));
      const moving = ve > 0 && ve < 1;
      const bob = moving ? Math.sin(t * 34) * 1.6 : 0;
      art.van(ctx, pos[0], pos[1] + 14 + bob, 190 * E.outBack(vIn), {
        rot: ang * 0.5 * Math.sin(Math.PI * ve), flip, sx: lerp(0.15, 1, turn), spin: ve * 26, alpha: clamp(vIn * 3)
      });
    }
  }

  /* ---------- 26.3–32.3 秒：注文と配達の時間（縦の時間軸） ---------- */
  const NX = 350, NY = [640, 880, 1300], LX = NX + 92;
  function sceneOrder(ctx, t) {
    const s5 = TL.s5;
    if (t < s5.swap || t >= 32.35) return;
    const out = t - s5.out;
    const fade = 1 - E.inC(seg(t, s5.out, s5.out + 0.4));
    block(ctx, T.s5.head, CX, 360, 106, { size: 84, font: 'head', color: C.ink, align: 'center', t: t - s5.head, st: 0.03, clip: true, out,
      rich: { numColor: C.orange, numFont: 'numB', k: 1.1 } });
    const lp = E.inOutC(seg(t, s5.line, s5.line + 1.0));
    ctx.globalAlpha = fade;
    if (lp > 0) line(ctx, NX, 580, NX, lerp(580, 1370, lp), 8, C.line);
    const bp = E.inOutC(seg(t, s5.band[0], s5.band[1]));
    if (bp > 0) fillRR(ctx, NX - 20, NY[1], 40, (NY[2] - NY[1]) * bp, 20, C.yellow);
    ctx.globalAlpha = 1;
    if (bp > 0 && bp < 1) art.icon(ctx, 'van', NX, lerp(NY[1] + 60, NY[2] - 60, bp), 76, C.ink, { cut: C.yellow, alpha: fade });
    text(ctx, T.s5.band, LX, (NY[1] + NY[2]) / 2 + 14, { size: 42, font: 'headM', color: C.ink, t: t - s5.band[0] - 0.1, st: 0.02, alpha: fade });
    const icons = ['phone', 'clock', 'bento'];
    NY.forEach((y, i) => {
      const n = T.s5.nodes[i], t0 = s5.nodes[i];
      K.node(ctx, NX, y, icons[i], seg(t, t0, t0 + 0.45), fade);
      // 時刻は丸の左に右寄せ
      if (n.time) SV.digits(ctx, n.time, NX - 86 - digitsW(n.time, 72) / 2, y + 26, { size: 72, font: 'numB', color: C.ink, t: t - t0 - 0.05, st: 0.04, alpha: fade });
      text(ctx, n.title, LX, y + 16, { size: 48, font: 'head', color: C.ink, t: t - t0 - 0.1, st: 0.025, alpha: fade });
      if (n.cap) text(ctx, n.cap, LX + 2, y + 66, { size: 30, font: 'textR', color: C.sub, t: t - t0 - 0.2, st: 0.02, alpha: fade });
    });
    block(ctx, T.s5.note, CX, 1428, 44, { size: 30, font: 'textR', color: C.sub, align: 'center', t: t - s5.note, mode: 'fade', st: 0.008, alpha: fade });
  }

  /* ---------- 32.2–42.3 秒：中身 ---------- */
  const BENTO = { x: CX, y: 790, w: 880 };
  const STAT = [[100, 1192], [548, 1192], [100, 1394], [548, 1394]];
  function statCell(ctx, t, i, fade) {
    const s6 = TL.s6, st = T.s6.stats[i];
    const t0 = s6.stats[i];
    if (t < t0) return;
    const [x, y] = STAT[i];
    const tt = t - t0;
    if (st.badge) {
      const p = E.outBack(seg(t, t0, t0 + 0.5));
      art.icon(ctx, 'leaf', x + 38, y - 30, 76 * p, C.green, { cut: '#FFFFFF', alpha: fade });
      text(ctx, st.badge, x + 90, y, { size: 46, font: 'head', color: C.ink, t: tt - 0.1, st: 0.03, alpha: fade });
    } else {
      const v = i === 0 ? K.okazuProg(t).slice(1).filter(p => p >= 0.35).length
        : Math.round(st.num * E.outQuart(seg(t, s6.counts[i][0], s6.counts[i][1])));
      const ns = 100;
      const wFinal = SV.textWidth(ctx, String(st.num), { size: ns, font: 'numB' });
      const wNow = SV.textWidth(ctx, String(v), { size: ns, font: 'numB' });
      text(ctx, String(v), x + wFinal - wNow, y, { size: ns, font: 'numB', color: C.orange, t: tt, st: 0, d: 0.45, alpha: fade });
      text(ctx, st.unit, x + wFinal + 12, y, { size: 42, font: 'head', color: C.ink, t: tt - 0.12, st: 0.03, alpha: fade });
    }
    text(ctx, st.cap, x + 4, y + 48, { size: 30, font: 'textR', color: C.sub, t: tt - 0.25, mode: 'fade', st: 0.01, alpha: fade });
  }
  function sceneFood(ctx, t) {
    const s6 = TL.s6;
    if (t < s6.from || t >= s6.morph[1]) return;
    const out = t - s6.out;
    const fade = 1 - E.inC(seg(t, s6.out, s6.out + 0.35));
    block(ctx, T.s6.head, CX, 350, 106, { size: 86, font: 'head', color: C.ink, align: 'center', t: t - s6.head, st: 0.035, clip: true, out,
      mark: { p: seg(t, s6.mark, s6.mark + 0.6) } });
    const mp = E.inOutC(seg(t, s6.morph[0], s6.morph[1]));
    const boxIn = E.outQuart(seg(t, s6.box, s6.box + 0.6));
    if (mp <= 0) {
      ctx.save();
      ctx.globalAlpha = clamp(boxIn * 2);
      art.bento(ctx, BENTO.x, BENTO.y + (1 - boxIn) * 120, BENTO.w, K.okazuProg(t), { foodAlpha: 1 - E.inC(seg(t, s6.out - 0.15, s6.morph[0])) });
      ctx.restore();
    } else {
      const s = BENTO.w / 800, D2 = (RING.r + RING.lw / 2) * 2;
      const w = lerp(BENTO.w, D2, mp), h = lerp(480 * s, D2, mp);
      const cx = lerp(BENTO.x, RING.x, mp), cy = lerp(BENTO.y, RING.y, mp);
      fillRR(ctx, cx - w / 2, cy - h / 2, w, h, lerp(40 * s, D2 / 2, mp), C.ink);
    }
    [0, 1, 2, 3].forEach(i => statCell(ctx, t, i, fade));
  }

  /* ---------- 42.2–48.3 秒：昼休みが休みになる ---------- */
  function sceneRest(ctx, t) {
    const s7 = TL.s7;
    if (t < s7.from || t >= s7.band + 0.4) return;
    const { x: cx, y: cy, r, lw } = RING;
    const hp = E.outC(seg(t, s7.hollow[0], s7.hollow[1]));
    if (hp < 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + lw / 2, 0, Math.PI * 2);
      ctx.arc(cx, cy, (r - lw / 2) * hp, 0, Math.PI * 2, true);
      ctx.fillStyle = mix(C.ink, C.track, hp);
      ctx.fill();
    }
    let m = 0;
    const segs = [], colors = [C.orange, C.yellow, C.green];
    s7.segs.forEach(([a, b, t0, t1], i) => {
      const p = i === 2 ? E.inOutC(seg(t, t0, t1)) : seg(t, t0, t1);
      if (p <= 0) return;
      const mm = lerp(a, b, p);
      m = Math.max(m, mm);
      segs.push({ a, b: mm, color: colors[i] });
    });
    if (hp >= 1) art.clock(ctx, cx, cy, r, { lw, track: C.track, tickColor: C.tick, segs, head: m > 0 && m < 59.9 ? m : null, headColor: m > 25 ? C.green : m > 5 ? C.yellow : C.orange });
    else art.clock(ctx, cx, cy, r, { lw, track: 'rgba(0,0,0,0)', tickColor: C.tick, tickAlpha: hp, segs: [] });
    const mins = Math.floor(Math.min(m, 25) + 1e-6);
    const dFade = 1 - seg(t, 44.6, 44.9);
    if (dFade > 0) SV.digits(ctx, '12:' + String(mins).padStart(2, '0'), cx, cy + 56, { size: 156, font: 'num', color: C.ink, t: t - 42.35, st: 0.04, alpha: dFade });
    const cp = seg(t, 44.8, 45.25);
    if (cp > 0) art.icon(ctx, 'coffee', cx, cy + 6, 210 * E.outBack(cp), C.ink, { phase: t * 5, cut: C.beige });
    const icons = ['bento', 'bowl', 'coffee'];
    const lx = listX(ctx, T.s7.steps);
    s7.segs.forEach(([a, b, t0], i) => {
      const q = E.inC(clamp((t - s7.rowsOut - i * 0.07) / 0.4));
      const y = 1092 + i * 112 - q * 40;
      if (!stepRow(ctx, t, t0, lx, y, icons[i], colors[i], i === 1 ? C.ink : '#FFFFFF', q, t * 5)) return;
      text(ctx, T.s7.steps[i], lx + 78, y + 18, { size: 52, font: 'headM', color: C.ink, t: t - t0 - 0.05, st: 0.025, d: 0.4, alpha: 1 - q });
    });
    const mk = { p: seg(t, s7.mark, s7.mark + 0.6) };
    text(ctx, T.s7.head[0], CX, 1128, { size: 82, font: 'head', color: C.ink, align: 'center', t: t - s7.head, st: 0.04, clip: true });
    text(ctx, SV.rich(T.s7.head[1]), CX, 1242, { size: 82, font: 'head', color: C.ink, align: 'center', t: t - s7.head - 0.2, st: 0.04, clip: true, mark: mk });
    text(ctx, T.s7.sub, CX, 1350, { size: 42, font: 'text', color: C.sub, align: 'center', t: t - s7.sub, st: 0.02, clip: true });
  }

  /* ---------- 48.3–51.4 秒：小さく始める ---------- */
  const SY = [720, 985, 1250];
  function sceneSmall(ctx, t) {
    const s8 = TL.s8;
    if (t < s8.swap || t >= s8.out + 0.5) return;
    const out = t - s8.out;
    const fade = 1 - E.inC(seg(t, s8.out, s8.out + 0.4));
    block(ctx, T.s8.head, CX, 380, 106, { size: 84, font: 'head', color: C.ink, align: 'center', t: t - s8.head, st: 0.03, clip: true, out });
    // 丸と言葉のまとまりを中央に置く
    const R = 98, icons = ['pin', 'people3', 'repeat'];
    const tw = Math.max(...T.s8.steps.map(s => SV.textWidth(ctx, s, { size: 58, font: 'head' })));
    const sx = CX - (R * 2 + 52 + tw) / 2 + R;
    for (let i = 0; i < 2; i++) {
      const lp = E.inOutC(seg(t, s8.steps[i] + 0.2, s8.steps[i] + 0.7));
      if (lp <= 0) continue;
      ctx.globalAlpha = fade;
      ctx.setLineDash([14, 14]);
      line(ctx, sx, SY[i] + R + 16, sx, lerp(SY[i] + R + 16, SY[i + 1] - R - 16, lp), 6, C.orange, 'butt');
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    SY.forEach((y, i) => {
      const t0 = s8.steps[i];
      const p = seg(t, t0, t0 + 0.45);
      if (p <= 0) return;
      const e = E.outBack(p);
      ctx.globalAlpha = fade;
      circle(ctx, sx, y, R * e, '#FFFFFF');
      ring(ctx, sx, y, R * e, 8, C.orange);
      art.icon(ctx, icons[i], sx, y + 4, 112 * e, C.orange, { cut: '#FFFFFF', alpha: fade });
      circle(ctx, sx - 70 * e, y - 70 * e, 30 * e, C.orange);
      ctx.globalAlpha = 1;
      if (e > 0.5) SV.digits(ctx, String(i + 1), sx - 70 * e, y - 70 * e + 14, { size: 40, font: 'numB', color: C.ink, alpha: fade });
      text(ctx, T.s8.steps[i], sx + R + 52, y + 20, { size: 58, font: 'head', color: C.ink, t: t - t0 - 0.1, st: 0.03, alpha: fade });
    });
  }

  /* ---------- 51.3–54.0 秒：豊前でつくって、豊前へ ---------- */
  const HUB = [CX, 890];
  const SPOKES = [[220, 700, 'factory'], [220, 1110, 'clinic'], [860, 1110, 'warehouse'], [860, 700, 'office']];
  function sceneLocal(ctx, t) {
    const s8 = TL.s8;
    if (t < s8.head2 - 0.05 || t >= 54.03) return;
    block(ctx, T.s8.head2, CX, 360, 106, { size: 86, font: 'head', color: C.ink, align: 'center', t: t - s8.head2, st: 0.03, clip: true });
    SPOKES.forEach(([x, y, ic], i) => {
      const t0 = s8.spokes[i];
      const lp = E.inOutC(seg(t, t0, t0 + 0.45));
      if (lp > 0) {
        const dx = x - HUB[0], dy = y - HUB[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        const sx = HUB[0] + ux * 128, sy = HUB[1] + uy * 128, ex = x - ux * 84, ey = y - uy * 84;
        ctx.setLineDash([12, 12]);
        line(ctx, sx, sy, lerp(sx, ex, lp), lerp(sy, ey, lp), 5, C.orange, 'butt');
        ctx.setLineDash([]);
        if (lp >= 1) for (let k = 0; k < 2; k++) {
          const f = ((t - t0 - 0.45) * 0.9 + k * 0.5 + i * 0.13) % 1;
          circle(ctx, lerp(sx, ex, f), lerp(sy, ey, f), 7, C.orange);
        }
      }
      const p = seg(t, t0 + 0.3, t0 + 0.75);
      if (p > 0) {
        const e = E.outBack(p);
        circle(ctx, x, y, 74 * e, '#EFE7D2');
        art.icon(ctx, ic, x, y + 2, 94 * e, C.ink, { cut: '#EFE7D2' });
        text(ctx, T.s8.spokes[i], x, y + 128, { size: 38, font: 'headM', color: C.ink, align: 'center', t: t - t0 - 0.4, st: 0.03 });
      }
    });
    const hp = E.outBack(seg(t, s8.hub, s8.hub + 0.5));
    if (hp > 0) {
      circle(ctx, HUB[0], HUB[1], 116 * hp, C.orange);
      art.icon(ctx, 'shop', HUB[0], HUB[1] + 4, 140 * hp, '#FFFFFF', { cut: C.orange });
      text(ctx, T.s8.hub, HUB[0], HUB[1] + 176, { size: 42, font: 'head', color: C.ink, align: 'center', t: t - s8.hub - 0.2, st: 0.03 });
    }
    block(ctx, T.s8.caption, CX, 1392, 50, { size: 32, font: 'textR', color: C.sub, align: 'center', t: t - s8.caption, mode: 'fade', st: 0.01, lineDelay: 0.2 });
  }

  /* ---------- 54.0–60 秒：エンドカード ---------- */
  function sceneEnd(ctx, t) {
    const s9 = TL.s9;
    if (t < s9.from) return;
    text(ctx, T.s9.l1, CX, 420, { size: 94, font: 'head', color: C.ink, align: 'center', t: t - s9.l1, st: 0.04, clip: true });
    block(ctx, T.s9.l2, CX, 548, 120, { size: 94, font: 'head', color: C.ink, align: 'center', t: t - s9.l2, st: 0.04, clip: true, lineDelay: 0.25,
      mark: { p: seg(t, s9.mark, s9.mark + 0.6) } });
    text(ctx, T.s9.eyebrow, CX, 800, { size: 32, font: 'text', color: C.sub, align: 'center', ls: 0.1, t: t - s9.eyebrow, st: 0.015, mode: 'fade' });
    K.wordmark(ctx, CX, 940, { size: 150, areaK: 0.46, color: C.orange, areaColor: C.ink, t: t - s9.word });
    const cp = seg(t, s9.cta, s9.cta + 0.5);
    if (cp > 0) {
      const e = E.outBack(cp);
      const tw = SV.textWidth(ctx, T.s9.cta, { size: 44, font: 'head' });
      const bw = tw + 176, bh = 104;
      ctx.save();
      ctx.translate(CX, 1090);
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
    if (ia > 0) T.s9.contact.forEach((c, i) => text(ctx, c, CX, 1236 + i * 62, { size: 40, font: 'text', color: C.ink, align: 'center', alpha: ia }));
    text(ctx, T.s9.note, CX, 1392, { size: 30, font: 'textR', color: C.sub, align: 'center', t: t - s9.note, mode: 'fade', st: 0.006 });
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
    ctx.fillStyle = t < 18.02 ? C.grey : t < 21.66 ? C.orange : C.beige;
    ctx.fillRect(0, 0, W, H);
    sceneBefore(ctx, t);
    sceneCompany(ctx, t);
    K.irisIn(ctx, t, TL.s3.iris, C.orange);
    sceneBrand(ctx, t);
    K.wipeUp(ctx, t, TL.s4.wipe);
    sceneRoute(ctx, t);
    sceneOrder(ctx, t);
    sceneFood(ctx, t);
    sceneRest(ctx, t);
    sceneSmall(ctx, t);
    sceneLocal(ctx, t);
    sceneEnd(ctx, t);
    K.bandWipe(ctx, t, TL.s4.band);
    K.bandWipe(ctx, t, TL.s7.band);
    K.ringIris(ctx, t, TL.s8.iris);
    ctx.restore();
  }

  SV.render = render;
})();
