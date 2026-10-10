/*
 * SPOON豊前 夕食の紹介動画 — 夕方の空、家、職場、夕食メニューのイラスト
 * 昼食版の js/art.js（アイコン・配達車・弁当など）に足す形で使います。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const { rr, fillRR, strokeRR, circle, ring, line, clamp, lerp, E, mix, mulberry32 } = SV.util;
  const C = SV.C, F = SV.F;
  const W = SV.W, H = SV.H;

  // 夕方〜夜の色。オレンジ・黄・ベージュは昼食版と共通
  const D = (SV.DC = {
    dusk: '#2C3152',
    duskLow: '#7E6286',
    sky0: '#5D6A9A',
    skyLow0: '#F2A66E',
    sil: '#232742',
    hill: '#323862',
    win: '#FFD27A',
    cream: '#FBF4E6',
    creamSub: '#CFC8DD',
    price: '#E2552F',
    wall: '#EFE2CB',
    roof: '#3A3F66',
    door: '#8A5A3A',
    circle: '#EFE7D2'
  });

  /* ---------- 空 ---------- */
  // k: 0 = 夕焼け、1 = 夜
  function sky(ctx, k, y0, y1) {
    const g = ctx.createLinearGradient(0, y0 || 0, 0, y1 || H);
    g.addColorStop(0, mix(D.sky0, D.dusk, k));
    g.addColorStop(1, mix(D.skyLow0, D.duskLow, k));
    return g;
  }
  function fillSky(ctx, k) {
    ctx.fillStyle = sky(ctx, k);
    ctx.fillRect(0, 0, W, H);
  }
  const STARS = (() => {
    const r = mulberry32(99), s = [];
    for (let i = 0; i < 80; i++) s.push([r() * W, r() * 620, 0.8 + r() * 1.9, r() * 6.28]);
    return s;
  })();
  function stars(ctx, t, a) {
    if (a <= 0) return;
    for (const [x, y, rad, ph] of STARS) {
      ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 2.1 + ph));
      circle(ctx, x, y, rad, '#FFF6DE');
    }
    ctx.globalAlpha = 1;
  }
  let moonCache = null;
  function moon(ctx, x, y, r, a) {
    if (a <= 0) return;
    if (!moonCache || moonCache.r !== r) {
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(r * 2 + 4);
      const g = c.getContext('2d'), m = r + 2;
      g.fillStyle = '#FFE6A8';
      g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(m + r * 0.46, m - r * 0.3, r * 0.86, 0, Math.PI * 2); g.fill();
      moonCache = { r, c };
    }
    const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3);
    glow.addColorStop(0, 'rgba(255,230,168,0.22)');
    glow.addColorStop(1, 'rgba(255,230,168,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.drawImage(moonCache.c, x - moonCache.c.width / 2, y - moonCache.c.height / 2);
    ctx.globalAlpha = 1;
  }
  function windowGlow(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,210,122,${0.38 * a})`);
    g.addColorStop(1, 'rgba(255,210,122,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* ---------- 夕方の町並み（冒頭） ---------- */
  // 建物ごとに、チャイムの音に合わせて窓の明かりがつく
  const TOWN = [
    { x: 90, w: 170, h: 118, kind: 'house' },
    { x: 290, w: 140, h: 96, kind: 'house' },
    { x: 470, w: 330, h: 150, kind: 'factory' },
    { x: 840, w: 150, h: 270, kind: 'office' },
    { x: 1030, w: 170, h: 112, kind: 'house' },
    { x: 1240, w: 210, h: 190, kind: 'apart' },
    { x: 1490, w: 160, h: 108, kind: 'house' },
    { x: 1690, w: 170, h: 130, kind: 'house' }
  ];
  function town(ctx, baseY, lights) {
    ctx.fillStyle = D.hill;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(0, baseY - 120);
    ctx.bezierCurveTo(260, baseY - 260, 560, baseY - 150, 860, baseY - 90);
    ctx.bezierCurveTo(1160, baseY - 230, 1520, baseY - 270, W, baseY - 110);
    ctx.lineTo(W, baseY);
    ctx.closePath();
    ctx.fill();
    TOWN.forEach((b, i) => {
      const L = lights[i] || 0;
      const top = baseY - b.h;
      ctx.fillStyle = D.sil;
      if (b.kind === 'house') {
        ctx.beginPath();
        ctx.moveTo(b.x, baseY); ctx.lineTo(b.x, top + b.h * 0.42);
        ctx.lineTo(b.x + b.w / 2, top); ctx.lineTo(b.x + b.w, top + b.h * 0.42); ctx.lineTo(b.x + b.w, baseY);
        ctx.closePath(); ctx.fill();
      } else if (b.kind === 'factory') {
        ctx.fillRect(b.x + b.w * 0.78, top - 60, 22, 80);
        ctx.beginPath();
        ctx.moveTo(b.x, baseY); ctx.lineTo(b.x, top + 30);
        const n = 4, tw = b.w / n;
        for (let k = 0; k < n; k++) { ctx.lineTo(b.x + k * tw, top); ctx.lineTo(b.x + (k + 1) * tw, top + 30); }
        ctx.lineTo(b.x + b.w, baseY); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(b.x, top, b.w, b.h);
      }
      if (L <= 0) return;
      const wins = [];
      if (b.kind === 'house') wins.push([b.x + b.w * 0.2, baseY - b.h * 0.45, b.w * 0.22, b.h * 0.2], [b.x + b.w * 0.58, baseY - b.h * 0.45, b.w * 0.22, b.h * 0.2]);
      else if (b.kind === 'factory') for (let k = 0; k < 4; k++) wins.push([b.x + 26 + k * 74, top + 54, 44, 26]);
      else for (let r = 0; r < (b.kind === 'office' ? 6 : 4); r++) for (let c = 0; c < 3; c++) {
        if ((r * 3 + c + i) % 3 === 0) continue;
        wins.push([b.x + 18 + c * (b.w - 36) / 3 + 4, top + 22 + r * 40, (b.w - 36) / 3 - 8, 20]);
      }
      ctx.globalAlpha = L;
      for (const [x, y, w, h] of wins) {
        windowGlow(ctx, x + w / 2, y + h / 2, 46, 1);
        ctx.fillStyle = D.win;
        ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = D.sil;
    ctx.fillRect(0, baseY, W, H - baseY);
  }

  /* ---------- 家 ---------- */
  // interior: 'pot'（空の鍋）か 'table'（夕食の並んだ食卓）
  function house(ctx, cx, baseY, w, o = {}) {
    const h = w * 0.62, rh = w * 0.3, left = cx - w / 2, top = baseY - h;
    ctx.fillStyle = 'rgba(10,12,30,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, baseY + 6, w * 0.6, 16, 0, 0, Math.PI * 2); ctx.fill();
    fillRR(ctx, left + w * 0.62, top - rh * 0.8, w * 0.08, rh * 0.6, 3, D.roof);
    fillRR(ctx, left, top, w, h, 4, D.wall);
    ctx.fillStyle = D.roof;
    ctx.beginPath();
    ctx.moveTo(left - w * 0.06, top + 8); ctx.lineTo(cx, top - rh); ctx.lineTo(left + w * 1.06, top + 8);
    ctx.closePath(); ctx.fill();
    line(ctx, left - w * 0.06, top + 8, cx, top - rh, 6, '#4C527E');
    line(ctx, cx, top - rh, left + w * 1.06, top + 8, 6, '#4C527E');
    // 屋根の小窓
    circle(ctx, cx, top - rh * 0.38, w * 0.055, D.win);
    // 大きな窓（中が見える）
    const wx = left + w * 0.08, wy = top + h * 0.2, ww = w * 0.5, wh = h * 0.5;
    windowGlow(ctx, wx + ww / 2, wy + wh / 2, ww * 0.9, 1);
    fillRR(ctx, wx, wy, ww, wh, 6, D.win);
    ctx.save();
    rr(ctx, wx, wy, ww, wh, 6);
    ctx.clip();
    if (o.interior === 'table') {
      // 食卓と弁当、湯気
      ctx.fillStyle = '#C98F4E';
      ctx.fillRect(wx, wy + wh * 0.66, ww, wh * 0.34);
      const bx = wx + ww * 0.5, by = wy + wh * 0.6;
      fillRR(ctx, bx - ww * 0.22, by - wh * 0.08, ww * 0.44, wh * 0.16, 6, C.ink);
      fillRR(ctx, bx - ww * 0.2, by - wh * 0.065, ww * 0.16, wh * 0.13, 3, '#F3E8E6');
      fillRR(ctx, bx - ww * 0.02, by - wh * 0.065, ww * 0.1, wh * 0.06, 2, '#D98A3A');
      fillRR(ctx, bx + ww * 0.1, by - wh * 0.065, ww * 0.08, wh * 0.06, 2, '#7DBE58');
      fillRR(ctx, bx - ww * 0.02, by + wh * 0.005, ww * 0.2, wh * 0.06, 2, '#F2C94C');
      const ph = o.t || 0;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineCap = 'round';
      for (const sx of [-0.08, 0.06]) {
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const yy = by - wh * 0.12 - i * wh * 0.035;
          const xx = bx + ww * sx + Math.sin(i * 0.7 + ph * 3 + sx * 20) * 5;
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      // ペンダントライト
      line(ctx, wx + ww * 0.5, wy, wx + ww * 0.5, wy + wh * 0.18, 3, '#8A6A3A');
      ctx.fillStyle = '#FFF1C9';
      ctx.beginPath(); ctx.arc(wx + ww * 0.5, wy + wh * 0.24, ww * 0.07, Math.PI, 0); ctx.fill();
    } else {
      // 台所のカウンターと空の鍋
      ctx.fillStyle = '#B98F52';
      ctx.fillRect(wx, wy + wh * 0.7, ww, wh * 0.3);
      const px = wx + ww * 0.42, py = wy + wh * 0.7;
      fillRR(ctx, px - ww * 0.16, py - wh * 0.26, ww * 0.32, wh * 0.26, 8, '#6B5845');
      fillRR(ctx, px - ww * 0.18, py - wh * 0.3, ww * 0.36, wh * 0.06, 4, '#5A4A3A');
      fillRR(ctx, px - ww * 0.03, py - wh * 0.36, ww * 0.06, wh * 0.07, 3, '#5A4A3A');
      fillRR(ctx, px + ww * 0.16, py - wh * 0.2, ww * 0.12, wh * 0.04, 2, '#5A4A3A');
      // 吊り戸棚
      fillRR(ctx, wx + ww * 0.62, wy + wh * 0.08, ww * 0.32, wh * 0.26, 4, '#E8B85E');
      line(ctx, wx + ww * 0.78, wy + wh * 0.08, wx + ww * 0.78, wy + wh * 0.34, 3, '#C9963F');
    }
    ctx.restore();
    strokeRR(ctx, wx, wy, ww, wh, 6, '#C9A86A', 8);
    // ドア
    const dx = left + w * 0.68, dw = w * 0.2, dh = h * 0.6;
    fillRR(ctx, dx, baseY - dh, dw, dh, 4, D.door);
    circle(ctx, dx + dw * 0.8, baseY - dh * 0.48, w * 0.012, '#F2C94C');
    fillRR(ctx, dx + dw * 0.2, baseY - dh * 0.88, dw * 0.6, dh * 0.22, 3, D.win);
  }

  /* ---------- 職場（夕方のオフィス） ---------- */
  // 800×600 の箱で設計。minutes は時計の時刻（0時からの分）
  const CITY = (() => {
    const r = mulberry32(5), b = [];
    let x = 40;
    while (x < 470) { const w = 30 + r() * 40, h = 40 + r() * 90; b.push([x, w, h, r()]); x += w + 6; }
    return b;
  })();
  function office(ctx, x, y, w, o = {}) {
    const k = w / 800;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    fillRR(ctx, 0, 0, 800, 600, 28, '#3B4170');
    // 窓と外の夕景
    ctx.save();
    rr(ctx, 40, 50, 430, 330, 10);
    ctx.clip();
    ctx.fillStyle = sky(ctx, 0.75, 50, 380);
    ctx.fillRect(40, 50, 430, 330);
    for (const [bx, bw, bh, s] of CITY) {
      ctx.fillStyle = '#2A2F52';
      ctx.fillRect(bx, 380 - bh, bw, bh);
      ctx.fillStyle = D.win;
      for (let wy = 380 - bh + 12; wy < 370; wy += 18) for (let wx = bx + 6; wx < bx + bw - 8; wx += 12) {
        if ((wx * 7 + wy * 3 + s * 100) % 5 < 2) ctx.fillRect(wx, wy, 6, 8);
      }
    }
    ctx.restore();
    strokeRR(ctx, 40, 50, 430, 330, 10, '#262A45', 12);
    line(ctx, 255, 50, 255, 380, 8, '#262A45', 'butt');
    line(ctx, 40, 215, 470, 215, 8, '#262A45', 'butt');
    // 壁の時計
    const cx = 640, cy = 175, R = 82;
    circle(ctx, cx, cy, R + 8, '#262A45');
    circle(ctx, cx, cy, R, D.cream);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = R - 10, r2 = R - (i % 3 === 0 ? 24 : 17);
      line(ctx, cx + Math.sin(a) * r1, cy - Math.cos(a) * r1, cx + Math.sin(a) * r2, cy - Math.cos(a) * r2, i % 3 === 0 ? 5 : 3, '#5B6390');
    }
    const mins = o.minutes == null ? 1020 : o.minutes;
    const ha = ((mins / 60) % 12) / 12 * Math.PI * 2, ma = (mins % 60) / 60 * Math.PI * 2;
    line(ctx, cx, cy, cx + Math.sin(ha) * R * 0.5, cy - Math.cos(ha) * R * 0.5, 9, C.ink);
    line(ctx, cx, cy, cx + Math.sin(ma) * R * 0.74, cy - Math.cos(ma) * R * 0.74, 6, C.ink);
    circle(ctx, cx, cy, 7, D.price);
    // 机
    ctx.fillStyle = '#8A6A4A';
    ctx.fillRect(0, 470, 800, 26);
    ctx.save();
    rr(ctx, 0, 0, 800, 600, 28);
    ctx.clip();
    ctx.fillStyle = '#6F543A';
    ctx.fillRect(0, 496, 800, 104);
    ctx.restore();
    // ノートパソコン
    ctx.fillStyle = '#C9CED8';
    ctx.beginPath(); ctx.moveTo(235, 470); ctx.lineTo(575, 470); ctx.lineTo(550, 452); ctx.lineTo(260, 452); ctx.closePath(); ctx.fill();
    fillRR(ctx, 275, 292, 260, 166, 10, '#D7DCE6');
    fillRR(ctx, 289, 306, 232, 138, 4, '#56648F');
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
      fillRR(ctx, 300 + c * 54, 318 + r * 20, 46, 12, 2, r === 0 ? '#8FA0CF' : (r * 4 + c) % 5 === 0 ? '#F2C94C' : '#7586B8');
    }
    // 書類の山
    for (let i = 0; i < 6; i++) fillRR(ctx, 600 + (i % 2 ? 6 : -4), 452 - i * 14, 140, 18, 3, i % 2 ? '#F4EEE2' : '#FFFFFF');
    fillRR(ctx, 622, 368, 100, 12, 3, '#F59423');
    // マグカップ
    fillRR(ctx, 120, 398, 62, 72, 12, C.orange);
    ctx.lineWidth = 9; ctx.strokeStyle = C.orange;
    ctx.beginPath(); ctx.arc(184, 432, 16, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.restore();
  }

  /* ---------- 考えごとの吹き出し ---------- */
  function thought(ctx, x, y, w, h, tx, ty, p) {
    if (p <= 0) return;
    const e = E.outBack(clamp(p));
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(e, e);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = clamp(p * 3);
    const sx = x + w * 0.12, sy = y + h * 0.86;
    [[0.32, 24], [0.6, 16], [0.84, 10]].forEach(([f, r]) => {
      circle(ctx, lerp(sx, tx, f) + 4, lerp(sy, ty, f) + 8, r, 'rgba(10,12,30,0.22)');
      circle(ctx, lerp(sx, tx, f), lerp(sy, ty, f), r, '#FFFFFF');
    });
    fillRR(ctx, x + 6, y + 10, w, h, h * 0.4, 'rgba(10,12,30,0.22)');
    fillRR(ctx, x, y, w, h, h * 0.4, '#FFFFFF');
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------- 夕食メニュー（真上から） ---------- */
  function blob(ctx, x, y, r, seed, color) {
    const rnd = mulberry32(seed), n = 11, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, q = r * (0.85 + rnd() * 0.24);
      pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]);
    }
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    ctx.beginPath();
    const m0 = mid(pts[0], pts[1]);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n], m = mid(p, pts[(i + 1) % n]);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  // 雑穀米
  function rice(ctx, x, y, w, h, seed) {
    fillRR(ctx, x, y, w, h, 12, '#EAD6D3');
    const r = mulberry32(seed);
    for (let i = 0; i < (w * h) / 160; i++) {
      const gx = x + 8 + r() * (w - 16), gy = y + 8 + r() * (h - 16), a = r() * Math.PI;
      ctx.fillStyle = r() < 0.18 ? '#5B3A47' : r() < 0.5 ? '#C59AA3' : '#F7EDEA';
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  function macaroni(ctx, x, y, r, seed) {
    blob(ctx, x, y, r, seed, '#F7E6B0');
    const q = mulberry32(seed + 3);
    for (let i = 0; i < 9; i++) {
      const mx = x + (q() * 2 - 1) * r * 0.6, my = y + (q() * 2 - 1) * r * 0.6;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(q() * Math.PI);
      fillRR(ctx, -9, -4, 18, 8, 4, '#EFCB6A');
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) circle(ctx, x + (q() * 2 - 1) * r * 0.6, y + (q() * 2 - 1) * r * 0.6, 3, i % 2 ? '#7DBE58' : '#EE8A2E');
  }
  function kabocha(ctx, x, y, s) {
    for (const [dx, dy, a] of [[-14, -6, -0.3], [14, 8, 0.4]]) {
      ctx.save(); ctx.translate(x + dx * s, y + dy * s); ctx.rotate(a);
      fillRR(ctx, -16 * s, -12 * s, 32 * s, 24 * s, 6 * s, '#F2A33A');
      fillRR(ctx, -16 * s, 8 * s, 32 * s, 5 * s, 2 * s, '#2F5D2F');
      ctx.restore();
    }
  }
  function pickles(ctx, x, y, s) {
    const q = mulberry32(17);
    blob(ctx, x, y, 18 * s, 41, '#8E3B78');
    for (let i = 0; i < 6; i++) circle(ctx, x + (q() * 2 - 1) * 10 * s, y + (q() * 2 - 1) * 10 * s, 3.5 * s, '#6A2A5A');
  }
  function lettuce(ctx, x, y, r) {
    blob(ctx, x, y, r, 61, '#7DBE58');
    blob(ctx, x - r * 0.15, y - r * 0.1, r * 0.7, 62, '#93CD6E');
  }
  function karaagePiece(ctx, x, y, r, seed) {
    blob(ctx, x, y, r, seed, '#C87A2C');
    blob(ctx, x - r * 0.18, y - r * 0.2, r * 0.55, seed + 1, '#DC9341');
    const q = mulberry32(seed * 7);
    for (let i = 0; i < 4; i++) circle(ctx, x + (q() * 2 - 1) * r * 0.5, y + (q() * 2 - 1) * r * 0.5, 2.5 + q() * 3, '#A65B1D');
  }
  function nanbanPiece(ctx, x, y, w, h, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    fillRR(ctx, -w / 2, -h / 2, w, h, h * 0.45, '#D99A45');
    fillRR(ctx, -w / 2 + 4, -h / 2 + 3, w * 0.6, h * 0.35, h * 0.2, '#E8B263');
    ctx.restore();
  }
  function boxFrame(ctx, x, y, w, h, comps) {
    fillRR(ctx, x + 6, y + 10, w, h, 22, 'rgba(43,37,34,0.14)');
    fillRR(ctx, x, y, w, h, 22, C.ink);
    for (const [cx, cy, cw, ch] of comps) fillRR(ctx, x + cx, y + cy, cw, ch, 12, '#3B332E');
  }
  // 420×280 の箱で設計。(x, y) は左上
  const MENU = {
    karaage(ctx, x, y) {
      boxFrame(ctx, x, y, 420, 280, [[14, 14, 136, 132], [162, 14, 244, 132], [14, 158, 276, 108], [302, 158, 104, 108]]);
      macaroni(ctx, x + 82, y + 80, 52, 71);
      lettuce(ctx, x + 300, y + 86, 48);
      [[214, 60, 34, 3], [270, 52, 32, 5], [330, 66, 32, 9], [244, 112, 33, 13], [304, 112, 31, 15]].forEach(([px, py, r, s]) => karaagePiece(ctx, x + px, y + py, r, s));
      rice(ctx, x + 22, y + 166, 260, 92, 81);
      kabocha(ctx, x + 340, y + 196, 1);
      pickles(ctx, x + 372, y + 240, 0.9);
    },
    nanban(ctx, x, y) {
      boxFrame(ctx, x, y, 420, 280, [[14, 14, 136, 132], [162, 14, 244, 132], [14, 158, 276, 108], [302, 158, 104, 108]]);
      macaroni(ctx, x + 82, y + 80, 52, 91);
      lettuce(ctx, x + 236, y + 96, 44);
      [[222, 58, 0.25], [282, 66, 0.12], [342, 74, -0.05], [300, 112, 0.1]].forEach(([px, py, rot]) => nanbanPiece(ctx, x + px, y + py, 74, 46, rot));
      ctx.lineWidth = 5; ctx.strokeStyle = '#A0522D'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 190, y + 50); ctx.bezierCurveTo(x + 250, y + 30, x + 300, y + 110, x + 380, y + 70); ctx.stroke();
      const q = mulberry32(27);
      for (const [px, py, r] of [[262, 70, 20], [318, 84, 22], [292, 120, 18], [360, 92, 17]]) {
        blob(ctx, x + px, y + py, r, 30 + px, '#FFF6DF');
        for (let i = 0; i < 4; i++) circle(ctx, x + px + (q() * 2 - 1) * r * 0.5, y + py + (q() * 2 - 1) * r * 0.5, 2.6, i % 2 ? '#8FBF5A' : '#F2C94C');
      }
      rice(ctx, x + 22, y + 166, 260, 92, 82);
      kabocha(ctx, x + 340, y + 196, 1);
      pickles(ctx, x + 372, y + 240, 0.9);
    },
    curry(ctx, x, y) {
      boxFrame(ctx, x, y, 420, 280, [[14, 14, 214, 252], [240, 196, 166, 70]]);
      rice(ctx, x + 22, y + 22, 198, 236, 83);
      const cx = x + 322, cy = y + 104;
      circle(ctx, cx + 4, cy + 8, 94, 'rgba(43,37,34,0.25)');
      circle(ctx, cx, cy, 94, '#1F1A18');
      circle(ctx, cx, cy, 80, '#7A4A22');
      blob(ctx, cx - 18, cy - 20, 44, 7, '#8E5A2C');
      const q = mulberry32(33);
      for (let i = 0; i < 6; i++) fillRR(ctx, cx - 50 + q() * 90, cy - 50 + q() * 90, 18, 16, 4, '#F2D58A');
      for (let i = 0; i < 5; i++) {
        const px = cx - 50 + q() * 90, py = cy - 50 + q() * 90;
        ctx.fillStyle = '#EE8A2E';
        ctx.beginPath(); ctx.moveTo(px, py - 9); ctx.lineTo(px + 10, py + 7); ctx.lineTo(px - 10, py + 7); ctx.closePath(); ctx.fill();
      }
      for (let i = 0; i < 5; i++) blob(ctx, cx - 45 + q() * 85, cy - 45 + q() * 85, 9, 50 + i, '#5A3418');
      macaroni(ctx, x + 323, y + 231, 30, 95);
    }
  };
  function menu(ctx, kind, cx, cy, w, p) {
    if (p <= 0) return;
    const k = (w / 420) * (0.2 + 0.8 * E.outBack(clamp(p)));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.globalAlpha *= clamp(p * 3);
    MENU[kind](ctx, -210, -140);
    ctx.restore();
  }

  /* ---------- アイコンの追加 ---------- */
  const IC = SV.art.ICONS;
  IC.fax = (ctx, col, cut) => {
    fillRR(ctx, -26, -46, 52, 40, 3, cut);
    strokeRR(ctx, -26, -46, 52, 40, 3, col, 4);
    for (const yy of [-36, -27, -18]) line(ctx, -16, yy, 16, yy, 3, col);
    fillRR(ctx, -44, -14, 88, 52, 10, col);
    fillRR(ctx, -32, -6, 30, 4, 2, cut);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fillRR(ctx, 6 + c * 11, 4 + r * 10, 7, 6, 1.5, cut);
    fillRR(ctx, -32, 6, 30, 20, 3, cut);
  };
  IC.house = (ctx, col, cut) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-46, -2); ctx.lineTo(0, -40); ctx.lineTo(46, -2); ctx.closePath(); ctx.fill();
    fillRR(ctx, -34, -8, 68, 46, 3, col);
    fillRR(ctx, -24, 2, 18, 16, 2, cut);
    fillRR(ctx, 6, 8, 16, 30, 2, cut);
    fillRR(ctx, 20, -34, 9, 18, 2, col);
  };
  IC.moon = (ctx, col, cut) => {
    circle(ctx, 0, 0, 38, col);
    circle(ctx, 18, -12, 33, cut);
  };

  Object.assign(SV.art, { D, sky, fillSky, stars, moon, town, house, office, thought, menu, windowGlow });
})();
