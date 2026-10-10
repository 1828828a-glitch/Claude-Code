/*
 * SPOON豊前 紹介動画 — アイコンとイラスト
 * すべてCanvasのパスで描いています（画像ファイルは使っていません）。
 * アイコンは 100×100 の格子で設計し、中心を原点にしています。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const { rr, fillRR, strokeRR, circle, ring, arc, line, clamp, E, mulberry32, mAng } = SV.util;
  const C = SV.C, F = SV.F;

  /* ---------- 人の形 ---------- */
  function human(ctx, px, py, k, col, outline, cut) {
    const head = () => { ctx.beginPath(); ctx.arc(px, py - 20 * k, 14 * k, 0, Math.PI * 2); };
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(px - 22 * k, py + 30 * k);
      ctx.lineTo(px - 22 * k, py + 8 * k);
      ctx.quadraticCurveTo(px - 22 * k, py - 2 * k, px - 10 * k, py - 2 * k);
      ctx.lineTo(px + 10 * k, py - 2 * k);
      ctx.quadraticCurveTo(px + 22 * k, py - 2 * k, px + 22 * k, py + 8 * k);
      ctx.lineTo(px + 22 * k, py + 30 * k);
      ctx.closePath();
    };
    if (outline) {
      ctx.lineWidth = outline;
      ctx.strokeStyle = cut;
      head(); ctx.stroke();
      body(); ctx.stroke();
    }
    ctx.fillStyle = col;
    head(); ctx.fill();
    body(); ctx.fill();
  }

  /* ---------- アイコン ---------- */
  const ICONS = {
    car(ctx, col, cut) {
      ctx.beginPath();
      ctx.moveTo(-46, 16); ctx.lineTo(-46, -1);
      ctx.quadraticCurveTo(-46, -10, -37, -11);
      ctx.lineTo(-26, -12); ctx.lineTo(-15, -29);
      ctx.quadraticCurveTo(-12, -33, -6, -33);
      ctx.lineTo(15, -33); ctx.quadraticCurveTo(21, -33, 24, -29);
      ctx.lineTo(34, -12); ctx.lineTo(39, -11);
      ctx.quadraticCurveTo(46, -10, 46, -1);
      ctx.lineTo(46, 16); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.fillStyle = cut;
      ctx.beginPath(); ctx.moveTo(-19, -13); ctx.lineTo(-11, -26); ctx.lineTo(2, -26); ctx.lineTo(2, -13); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, -13); ctx.lineTo(7, -26); ctx.lineTo(16, -26); ctx.lineTo(25, -13); ctx.closePath(); ctx.fill();
      for (const wx of [-25, 25]) { circle(ctx, wx, 17, 15, cut); circle(ctx, wx, 17, 11, col); circle(ctx, wx, 17, 4, cut); }
    },
    parking(ctx, col, cut) {
      fillRR(ctx, -34, -36, 68, 72, 16, col);
      ctx.fillStyle = cut;
      ctx.font = F.numB(60);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 1, 4);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },
    queue(ctx, col, cut) {
      human(ctx, -29, 4, 0.78, col);
      human(ctx, 29, 4, 0.78, col);
      human(ctx, 0, 10, 1, col, 8, cut);
    },
    uturn(ctx, col) {
      ctx.lineWidth = 12; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(26, 34); ctx.lineTo(26, -6); ctx.arc(2, -6, 24, 0, Math.PI, true); ctx.lineTo(-22, 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-38, 10); ctx.lineTo(-22, 30); ctx.lineTo(-6, 10); ctx.stroke();
    },
    bento(ctx, col, cut) {
      fillRR(ctx, -46, -32, 92, 64, 12, col);
      fillRR(ctx, -38, -24, 32, 48, 6, cut);
      fillRR(ctx, 0, -24, 38, 21, 5, cut);
      fillRR(ctx, 0, 3, 38, 21, 5, cut);
      circle(ctx, -22, 0, 6, col);
    },
    bowl(ctx, col, cut) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(-4, -2, 30, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-42, 2); ctx.lineTo(34, 2); ctx.quadraticCurveTo(32, 36, -4, 36); ctx.quadraticCurveTo(-40, 36, -42, 2); ctx.closePath(); ctx.fill();
      fillRR(ctx, -16, 36, 24, 8, 3, col);
      line(ctx, 10, -44, 46, -16, 6, col);
      line(ctx, 20, -48, 50, -26, 6, col);
      line(ctx, -40, -1, 32, -1, 4, cut, 'butt');
    },
    coffee(ctx, col, cut, o) {
      fillRR(ctx, -32, -10, 50, 46, 12, col);
      ctx.lineWidth = 8; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(20, 12, 12, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      fillRR(ctx, -42, 38, 72, 8, 4, col);
      const ph = o.phase || 0;
      ctx.lineWidth = 6; ctx.strokeStyle = col;
      for (const sx of [-18, 2]) {
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const yy = -18 - i * 2.6;
          const xx = sx + Math.sin(i * 0.6 + ph + sx * 0.1) * 5;
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
    },
    phone(ctx, col, cut) {
      fillRR(ctx, -26, -44, 52, 88, 12, col);
      fillRR(ctx, -19, -34, 38, 60, 5, cut);
      circle(ctx, 0, 35, 4, cut);
      ctx.lineWidth = 6; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-2, 5); ctx.lineTo(11, -12); ctx.stroke();
    },
    clock(ctx, col, cut) {
      circle(ctx, 0, 0, 42, col);
      circle(ctx, 0, 0, 33, cut);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        line(ctx, Math.cos(a) * 25, Math.sin(a) * 25, Math.cos(a) * 29, Math.sin(a) * 29, 4, col);
      }
      line(ctx, 0, 0, 0, 19, 6, col);
      line(ctx, 0, 0, -15, -4, 7, col);
      circle(ctx, 0, 0, 5, col);
    },
    pin(ctx, col, cut) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, 42);
      ctx.bezierCurveTo(-10, 26, -32, 6, -32, -12);
      ctx.arc(0, -12, 32, Math.PI, 0);
      ctx.bezierCurveTo(32, 6, 10, 26, 0, 42);
      ctx.closePath(); ctx.fill();
      circle(ctx, 0, -12, 12, cut);
    },
    people3(ctx, col, cut) {
      human(ctx, -28, 4, 0.8, col);
      human(ctx, 28, 4, 0.8, col);
      human(ctx, 0, 10, 1.02, col, 8, cut);
    },
    repeat(ctx, col, cut) {
      fillRR(ctx, -38, -32, 76, 72, 10, col);
      fillRR(ctx, -30, -14, 60, 46, 5, cut);
      fillRR(ctx, -24, -44, 9, 20, 4.5, col);
      fillRR(ctx, 15, -44, 9, 20, 4.5, col);
      ctx.lineWidth = 6; ctx.strokeStyle = col;
      const r = 12, cy = 9, a0 = -Math.PI * 0.3, a1 = Math.PI * 1.25;
      ctx.beginPath(); ctx.arc(0, cy, r, a0, a1); ctx.stroke();
      const px = Math.cos(a1) * r, py = cy + Math.sin(a1) * r;
      const dx = -Math.sin(a1), dy = Math.cos(a1);
      const nx = Math.cos(a1), ny = Math.sin(a1);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px + dx * 8, py + dy * 8);
      ctx.lineTo(px - dx * 3 + nx * 7, py - dy * 3 + ny * 7);
      ctx.lineTo(px - dx * 3 - nx * 7, py - dy * 3 - ny * 7);
      ctx.closePath(); ctx.fill();
    },
    leaf(ctx, col, cut) {
      circle(ctx, 0, 0, 44, col);
      ctx.fillStyle = cut;
      ctx.beginPath(); ctx.moveTo(-20, 22);
      ctx.bezierCurveTo(-24, -12, 2, -30, 26, -28);
      ctx.bezierCurveTo(26, -2, 8, 22, -20, 22);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(-15, 17); ctx.quadraticCurveTo(2, -2, 17, -19); ctx.stroke();
    },
    clipboard(ctx, col, cut) {
      fillRR(ctx, -34, -40, 68, 88, 9, col);
      fillRR(ctx, -26, -28, 52, 68, 4, cut);
      fillRR(ctx, -15, -48, 30, 16, 6, col);
      for (const [yy, w] of [[-14, 34], [0, 28], [14, 34], [28, 20]]) line(ctx, -17, yy, -17 + w, yy, 5, col);
    },
    person(ctx, col) {
      human(ctx, 0, 6, 1.3, col);
    },
    factory(ctx, col, cut) {
      ctx.fillStyle = col;
      fillRR(ctx, 24, -42, 11, 30, 2, col);
      ctx.beginPath();
      ctx.moveTo(-46, 36); ctx.lineTo(-46, -8);
      for (let i = 0; i < 3; i++) { const x0 = -46 + i * 30.67; ctx.lineTo(x0, -30); ctx.lineTo(x0 + 30.67, -8); }
      ctx.lineTo(46, 36); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      for (const wx of [-37, -14]) fillRR(ctx, wx, 2, 16, 12, 2, cut);
      fillRR(ctx, 12, 12, 24, 24, 2, cut);
    },
    clinic(ctx, col, cut) {
      fillRR(ctx, -40, -34, 80, 72, 7, col);
      fillRR(ctx, -7, -24, 14, 34, 2, cut);
      fillRR(ctx, -17, -14, 34, 14, 2, cut);
      fillRR(ctx, -9, 18, 18, 20, 2, cut);
    },
    warehouse(ctx, col, cut) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-46, 36); ctx.lineTo(-46, -8); ctx.lineTo(0, -36); ctx.lineTo(46, -8); ctx.lineTo(46, 36); ctx.closePath(); ctx.fill();
      fillRR(ctx, -26, 0, 52, 36, 2, cut);
      for (const yy of [9, 18, 27]) line(ctx, -26, yy, 26, yy, 3, col, 'butt');
    },
    office(ctx, col, cut) {
      fillRR(ctx, -28, -42, 56, 80, 6, col);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) fillRR(ctx, -19 + c * 14, -33 + r * 14, 9, 9, 1.5, cut);
      fillRR(ctx, -7, 22, 14, 16, 2, cut);
    },
    shop(ctx, col, cut) {
      fillRR(ctx, -40, -10, 80, 46, 4, col);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-48, -34); ctx.lineTo(48, -34); ctx.lineTo(48, -16);
      for (let i = 0; i < 6; i++) { const x1 = 48 - i * 16; ctx.arc(x1 - 8, -16, 8, 0, Math.PI); }
      ctx.closePath(); ctx.fill();
      for (const i of [1, 3, 5]) { ctx.fillStyle = cut; ctx.fillRect(-48 + i * 16, -34, 16, 18); }
      fillRR(ctx, -10, 8, 20, 28, 2, cut);
      fillRR(ctx, -33, 4, 16, 14, 2, cut);
      fillRR(ctx, 17, 4, 16, 14, 2, cut);
    },
    van(ctx, col, cut) {
      fillRR(ctx, -48, -26, 66, 44, 6, col);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(21, -18); ctx.lineTo(34, -18); ctx.quadraticCurveTo(40, -18, 43, -12); ctx.lineTo(48, 0); ctx.lineTo(48, 18); ctx.lineTo(21, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cut;
      ctx.beginPath(); ctx.moveTo(26, -12); ctx.lineTo(34, -12); ctx.lineTo(40, -1); ctx.lineTo(26, -1); ctx.closePath(); ctx.fill();
      for (const wx of [-30, 30]) { circle(ctx, wx, 20, 13, cut); circle(ctx, wx, 20, 9, col); circle(ctx, wx, 20, 3.5, cut); }
    }
  };

  function icon(ctx, name, x, y, s, color, o = {}) {
    const fn = ICONS[name];
    if (!fn || s <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s / 100, s / 100);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    fn(ctx, color, o.cut || '#fff', o);
    ctx.restore();
  }

  /* ---------- 時計のリング（60分の昼休み） ---------- */
  function clock(ctx, cx, cy, r, o = {}) {
    const lw = o.lw || 30;
    const d = o.draw == null ? 1 : o.draw;
    const A = o.alpha == null ? 1 : o.alpha;
    if (A <= 0) return;
    ctx.globalAlpha = A;
    if (d > 0) arc(ctx, cx, cy, r, mAng(0), mAng(60 * d), lw, o.track || C.greyTrack);
    const ta = o.tickAlpha == null ? 1 : o.tickAlpha;
    for (let i = 0; i < 12; i++) {
      const vis = clamp((d * 12 - i) * 1.5) * ta;
      if (vis <= 0) continue;
      const a = mAng(i * 5);
      const major = i % 3 === 0;
      const r1 = r - lw / 2 - 16, r2 = r1 - (major ? 22 : 12);
      ctx.globalAlpha = vis * A;
      line(ctx, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, major ? 6 : 4, o.tickColor || C.greyMid);
    }
    ctx.globalAlpha = A;
    for (const s of o.segs || []) {
      if (s.b <= s.a) continue;
      const gap = s.a > 0 ? 0.014 : 0;
      arc(ctx, cx, cy, r, mAng(s.a) + gap, mAng(s.b), lw, s.color);
    }
    if (o.head != null) {
      const a = mAng(o.head);
      const hx = cx + Math.cos(a) * r, hy = cy + Math.sin(a) * r;
      circle(ctx, hx, hy, lw * 0.66, '#fff');
      ring(ctx, hx, hy, lw * 0.66, 5, o.headColor || C.lost[0]);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- 工場（のこぎり屋根） ---------- */
  const PAL = {
    grey: { wall: '#B4BCC5', roof: '#7B8590', trim: '#9CA5AF', win: '#DDE5ED', door: '#8E98A3', doorLine: '#7B8590' },
    warm: { wall: '#FFFFFF', roof: '#4F5C69', trim: '#E4DCC9', win: '#CFE2EE', door: '#D5DCE2', doorLine: '#B8C2CB' }
  };
  function factory(ctx, cx, baseY, w, pal) {
    const h = w * 0.46, left = cx - w / 2, top = baseY - h;
    const teeth = 4, tw = w / teeth, rh = w * 0.13;
    ctx.fillStyle = 'rgba(40,36,30,0.08)';
    ctx.beginPath(); ctx.ellipse(cx, baseY + 4, w * 0.56, 14, 0, 0, Math.PI * 2); ctx.fill();
    fillRR(ctx, left + w * 0.8, top - rh - w * 0.15, w * 0.065, w * 0.22, 4, pal.roof);
    fillRR(ctx, left + w * 0.8 - 4, top - rh - w * 0.15, w * 0.065 + 8, 12, 4, pal.trim);
    ctx.fillStyle = pal.roof;
    for (let i = 0; i < teeth; i++) {
      const x0 = left + i * tw;
      ctx.beginPath(); ctx.moveTo(x0, top + 2); ctx.lineTo(x0, top - rh); ctx.lineTo(x0 + tw, top + 2); ctx.closePath(); ctx.fill();
    }
    fillRR(ctx, left, top, w, h, 4, pal.wall);
    ctx.fillStyle = pal.trim;
    ctx.fillRect(left, top, w, h * 0.08);
    const nw = 5, ww = w * 0.1, wh = h * 0.2, gap = (w - nw * ww) / (nw + 1);
    for (let i = 0; i < nw; i++) fillRR(ctx, left + gap + i * (ww + gap), top + h * 0.22, ww, wh, 3, pal.win);
    const dw = w * 0.22, dh = h * 0.42, dx = left + w * 0.62;
    fillRR(ctx, dx, baseY - dh, dw, dh, 3, pal.door);
    for (let k = 1; k < 6; k++) line(ctx, dx + 5, baseY - dh + (k * dh) / 6, dx + dw - 5, baseY - dh + (k * dh) / 6, 2, pal.doorLine, 'butt');
    fillRR(ctx, left + w * 0.18, baseY - h * 0.36, w * 0.09, h * 0.36, 3, pal.door);
  }

  /* ---------- お店（八屋） ---------- */
  function shop(ctx, cx, baseY, w) {
    const h = w * 0.62, left = cx - w / 2, top = baseY - h;
    ctx.fillStyle = 'rgba(40,36,30,0.08)';
    ctx.beginPath(); ctx.ellipse(cx, baseY + 4, w * 0.58, 14, 0, 0, Math.PI * 2); ctx.fill();
    fillRR(ctx, left, top, w, h, 6, '#FFFFFF');
    strokeRR(ctx, left, top, w, h, 6, '#E6DECB', 3);
    fillRR(ctx, left - 10, top - 14, w + 20, 22, 6, C.ink);
    const sw = w * 0.6, sh = h * 0.2;
    fillRR(ctx, cx - sw / 2, top + 18, sw, sh, 8, C.ink);
    ctx.fillStyle = C.orange;
    ctx.font = F.numB(sh * 0.72);
    ctx.textAlign = 'center';
    ctx.fillText('SPOON', cx, top + 18 + sh * 0.76);
    ctx.textAlign = 'left';
    const ay = top + sh + 34, ah = h * 0.13, n = 8, stw = (w + 16) / n;
    for (let i = 0; i < n; i++) {
      const col = i % 2 ? '#FFFFFF' : C.orange;
      const x0 = left - 8 + i * stw;
      ctx.fillStyle = col;
      ctx.fillRect(x0, ay, stw + 0.5, ah);
      ctx.beginPath(); ctx.arc(x0 + stw / 2, ay + ah, stw / 2, 0, Math.PI); ctx.fill();
    }
    strokeRR(ctx, left - 8, ay, w + 16, ah, 2, 'rgba(0,0,0,0)', 0.01);
    const wy = ay + ah + stw / 2 + 12, wh = baseY - wy - 10;
    fillRR(ctx, left + w * 0.07, wy, w * 0.3, wh, 4, '#FFE3A0');
    fillRR(ctx, left + w * 0.63, wy, w * 0.3, wh, 4, '#FFE3A0');
    fillRR(ctx, cx - w * 0.1, baseY - h * 0.42, w * 0.2, h * 0.42, 4, C.ink);
    fillRR(ctx, cx - w * 0.07, baseY - h * 0.38, w * 0.14, h * 0.18, 3, '#FFE3A0');
  }

  /* ---------- 配達車 ---------- */
  function wheel(ctx, x, y, r, spin) {
    circle(ctx, x, y, r, C.ink);
    circle(ctx, x, y, r * 0.48, '#D9D2C3');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    for (let i = 0; i < 3; i++) { ctx.rotate((Math.PI * 2) / 3); line(ctx, 0, 0, r * 0.42, 0, 3, C.ink); }
    ctx.restore();
  }
  function van(ctx, x, baseY, w, o = {}) {
    const k = w / 200;
    ctx.save();
    ctx.translate(x, baseY);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(k, k);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = 'rgba(40,36,30,0.12)';
    ctx.beginPath(); ctx.ellipse(0, 2, 104, 9, 0, 0, Math.PI * 2); ctx.fill();
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-100, -22); ctx.lineTo(-100, -88);
      ctx.quadraticCurveTo(-100, -96, -92, -96);
      ctx.lineTo(40, -96); ctx.quadraticCurveTo(52, -96, 58, -86);
      ctx.lineTo(82, -56); ctx.quadraticCurveTo(100, -53, 100, -38);
      ctx.lineTo(100, -22); ctx.closePath();
    };
    body();
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#DDD3BD'; ctx.stroke();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = C.orange; ctx.fillRect(-100, -44, 200, 10);
    ctx.fillStyle = C.yellow; ctx.fillRect(-100, -34, 200, 4);
    ctx.restore();
    ctx.fillStyle = '#CFE2EE';
    ctx.beginPath(); ctx.moveTo(44, -86); ctx.lineTo(56, -86); ctx.lineTo(76, -58); ctx.lineTo(44, -58); ctx.closePath(); ctx.fill();
    line(ctx, 36, -92, 36, -24, 3, '#E6DDC9', 'butt');
    ctx.fillStyle = C.orange;
    ctx.font = F.numB(30);
    ctx.fillText('SPOON', -86, -58);
    fillRR(ctx, -104, -26, 208, 10, 5, '#D8CFBA');
    fillRR(ctx, 90, -40, 10, 8, 3, C.yellow);
    const spin = o.spin || 0;
    wheel(ctx, -62, -12, 17, spin);
    wheel(ctx, 62, -12, 17, spin);
    ctx.restore();
  }

  /* ---------- 弁当（横から） ---------- */
  function bentoSide(ctx, x, bottom, w) {
    const h = w * 0.28;
    fillRR(ctx, x - w / 2, bottom - h, w, h, 5, C.ink);
    fillRR(ctx, x - w / 2 + 3, bottom - h - 6, w - 6, 9, 4, C.orange);
    fillRR(ctx, x - w * 0.18, bottom - h * 0.66, w * 0.36, h * 0.34, 2, '#FFFFFF');
  }

  /* ---------- 付箋・タグ ---------- */
  function tag(ctx, str, x, y, o = {}) {
    const size = o.size || 34;
    const tw = SV.textWidth(ctx, str, { size, font: 'text' });
    const pw = tw + size * 1.2, ph = size * 1.9;
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    const sc = o.scale == null ? 1 : o.scale;
    ctx.scale(sc, sc);
    ctx.globalAlpha = a;
    fillRR(ctx, -pw / 2 + 4, -ph / 2 + 7, pw, ph, ph / 2, 'rgba(44,50,58,0.12)');
    fillRR(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2, '#FFFFFF');
    strokeRR(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2, '#C4CBD3', 3);
    SV.text(ctx, str, 0, size * 0.36, { size, font: 'text', color: C.greyInk, align: 'center', alpha: a });
    ctx.restore();
  }

  /* ---------- 「社員食堂」の点線シルエット ---------- */
  function canteenGhost(ctx, cx, baseY, w, h, label, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.setLineDash([18, 14]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.greyMid;
    ctx.lineJoin = 'round';
    const left = cx - w / 2, top = baseY - h;
    ctx.beginPath();
    ctx.moveTo(left, baseY); ctx.lineTo(left, top + h * 0.3); ctx.lineTo(cx, top);
    ctx.lineTo(left + w, top + h * 0.3); ctx.lineTo(left + w, baseY); ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    SV.text(ctx, label, cx, baseY - h * 0.26, { size: 46, font: 'headM', color: C.greyMid, align: 'center', alpha: a });
  }

  /* ---------- 弁当（真上から）：ご飯とおかず7種 ---------- */
  function blob(ctx, x, y, r, seed, color) {
    const rnd = mulberry32(seed);
    const n = 12, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr_ = r * (0.86 + rnd() * 0.22);
      pts.push([x + Math.cos(a) * rr_, y + Math.sin(a) * rr_]);
    }
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    ctx.beginPath();
    const m0 = mid(pts[0], pts[1]);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n], m = mid(p, q);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  const RICE = (() => {
    const r = mulberry32(7), g = [];
    for (let i = 0; i < 70; i++) g.push([(r() * 2 - 1) * 100, (r() * 2 - 1) * 192, r() * Math.PI, 5 + r() * 3]);
    return g;
  })();
  const SESAME = (() => {
    const r = mulberry32(11), s = [];
    for (let i = 0; i < 16; i++) s.push([(r() * 2 - 1) * 88, (r() * 2 - 1) * 170, r() * Math.PI]);
    return s;
  })();
  const FOOD = {
    rice(ctx) {
      fillRR(ctx, -112, -206, 224, 412, 16, '#FFFDF6');
      ctx.fillStyle = '#EEE7D6';
      for (const [x, y, a, l] of RICE) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, 0, l, 2.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = C.ink;
      for (const [x, y, a] of SESAME) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      blob(ctx, 0, -10, 30, 41, '#D8453B');
      circle(ctx, -9, -20, 8, '#EE7E74');
    },
    karaage(ctx) {
      for (const [x, y, r, s] of [[-40, -34, 44, 3], [40, -28, 42, 5], [-2, 44, 46, 9]]) {
        blob(ctx, x, y, r, s, '#C87A2C');
        blob(ctx, x - r * 0.18, y - r * 0.2, r * 0.55, s + 1, '#DC9341');
        const rnd = mulberry32(s * 7);
        for (let i = 0; i < 5; i++) circle(ctx, x + (rnd() * 2 - 1) * r * 0.55, y + (rnd() * 2 - 1) * r * 0.55, 3 + rnd() * 4, '#A65B1D');
      }
    },
    tamago(ctx) {
      for (const yy of [-38, 38]) {
        fillRR(ctx, -60, yy - 32, 120, 64, 20, '#F6C745');
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#E6AE2E';
        for (const k of [-13, 0, 13]) { ctx.beginPath(); ctx.moveTo(-50, yy + k); ctx.quadraticCurveTo(0, yy + k - 6, 50, yy + k); ctx.stroke(); }
        fillRR(ctx, -46, yy - 26, 40, 9, 4.5, '#FBE08A');
      }
    },
    salmon(ctx) {
      ctx.save();
      ctx.rotate(-0.12);
      ctx.beginPath();
      ctx.moveTo(-54, -74); ctx.quadraticCurveTo(10, -92, 56, -62);
      ctx.lineTo(60, 66); ctx.quadraticCurveTo(0, 88, -58, 70); ctx.closePath();
      ctx.fillStyle = '#F28C6A'; ctx.fill();
      ctx.lineWidth = 12; ctx.strokeStyle = '#8E5A4A';
      ctx.beginPath(); ctx.moveTo(56, -60); ctx.lineTo(60, 64); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#FFD7C6';
      for (const k of [-40, -8, 24, 52]) { ctx.beginPath(); ctx.moveTo(-50, k); ctx.quadraticCurveTo(0, k - 18, 50, k + 4); ctx.stroke(); }
      ctx.globalAlpha *= 0.45;
      for (const k of [-30, 12]) line(ctx, -40, k + 30, -4, k - 10, 7, '#B24F33');
      ctx.restore();
    },
    broccoli(ctx) {
      for (const [x, y, s] of [[-26, -40, 1], [18, 6, 1.1], [-22, 52, 0.95]]) {
        fillRR(ctx, x - 7 * s, y + 8 * s, 14 * s, 26 * s, 5 * s, '#A9C97F');
        for (const [dx, dy, r] of [[-14, 0, 15], [14, 0, 15], [0, -12, 17], [-6, 10, 13], [8, 10, 13]]) circle(ctx, x + dx * s, y + dy * s, r * s, '#4F9A3A');
        for (const [dx, dy] of [[-10, -6], [6, -14], [12, 4], [-2, 6]]) circle(ctx, x + dx * s, y + dy * s, 3.5 * s, '#79BE57');
      }
    },
    carrot(ctx) {
      for (const [x, y, r] of [[-6, -50, 24], [16, 8, 26], [-12, 62, 23]]) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          circle(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.5, '#F08A24');
        }
        circle(ctx, x, y, r * 0.62, '#F08A24');
        circle(ctx, x, y, r * 0.3, '#F7B25B');
      }
    },
    potato(ctx) {
      blob(ctx, 0, 4, 54, 21, '#F2E0A6');
      blob(ctx, -6, -6, 36, 22, '#F8EBC0');
      const rnd = mulberry32(23);
      for (let i = 0; i < 9; i++) {
        const x = (rnd() * 2 - 1) * 34, y = (rnd() * 2 - 1) * 32;
        fillRR(ctx, x, y, 8, 8, 2, i % 3 === 0 ? '#F08A24' : '#79BE57');
      }
    },
    hijiki(ctx) {
      blob(ctx, 0, 0, 48, 31, '#3A2F2A');
      const rnd = mulberry32(37);
      for (let i = 0; i < 14; i++) {
        const x = (rnd() * 2 - 1) * 32, y = (rnd() * 2 - 1) * 32, a = rnd() * Math.PI;
        line(ctx, x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 14, 3, '#57483F');
      }
      for (let i = 0; i < 6; i++) fillRR(ctx, (rnd() * 2 - 1) * 28, (rnd() * 2 - 1) * 28, 9, 5, 2, '#F08A24');
      for (let i = 0; i < 5; i++) circle(ctx, (rnd() * 2 - 1) * 28, (rnd() * 2 - 1) * 28, 5, '#7DBB4F');
      for (let i = 0; i < 4; i++) fillRR(ctx, (rnd() * 2 - 1) * 26, (rnd() * 2 - 1) * 26, 10, 7, 2, '#E3C08E');
    }
  };
  function baran(ctx, x0, y0, y1) {
    ctx.beginPath();
    let i = 0;
    for (let y = y0; y <= y1; y += 12, i++) {
      const xx = x0 + (i % 2 ? 7 : -7);
      if (i === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#3FA35A';
    ctx.lineJoin = 'miter';
    ctx.stroke();
    ctx.lineJoin = 'round';
  }

  // prog: [ご飯, 唐揚げ, 卵焼き, 焼き鮭, ブロッコリー, にんじん, ポテトサラダ, ひじき] の出現度 0〜1
  function bento(ctx, cx, cy, w, prog, o = {}) {
    const s = w / 800;
    ctx.save();
    ctx.translate(cx - w / 2, cy - 240 * s);
    ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const fa = o.foodAlpha == null ? 1 : o.foodAlpha;
    fillRR(ctx, 10, 18, 800, 480, 40, 'rgba(43,37,34,0.13)');
    fillRR(ctx, 0, 0, 800, 480, 40, C.ink);
    const comp = [[20, 20, 250, 440], [284, 20, 320, 220], [618, 20, 162, 220], [284, 254, 210, 206], [508, 254, 136, 206], [658, 254, 122, 206]];
    for (const [x, y, w2, h2] of comp) fillRR(ctx, x, y, w2, h2, 20, '#3B332E');
    const P = (i, x, y, fn) => {
      const p = prog[i] || 0;
      if (p <= 0 || fa <= 0) return;
      const e = E.outBack(clamp(p));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(e, e);
      ctx.globalAlpha *= clamp(p * 3) * fa;
      fn(ctx);
      ctx.restore();
    };
    P(0, 145, 240, FOOD.rice);
    P(1, 364, 130, FOOD.karaage);
    P(1, 452, 130, c => baran(c, 0, -96, 96));
    P(2, 530, 130, FOOD.tamago);
    P(3, 699, 130, FOOD.salmon);
    P(4, 336, 357, FOOD.broccoli);
    P(4, 396, 357, c => baran(c, 0, -90, 90));
    P(5, 446, 357, FOOD.carrot);
    P(6, 576, 357, FOOD.potato);
    P(7, 719, 357, FOOD.hijiki);
    ctx.restore();
  }

  SV.art = { icon, ICONS, clock, factory, PAL, shop, van, bentoSide, tag, canteenGhost, bento };
})();
