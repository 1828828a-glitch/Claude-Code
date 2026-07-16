// 絵の係: 背景（床・壁・家具）を1回だけオフスクリーンに描き、
// その上に動くもの（社員キャラ・吹き出し）だけを毎フレーム重ねる。
'use strict';
window.Sprites = (() => {
  let bg = null; // 背景キャンバス（1枚の絵として使い回す）

  function px(t) { return { x: t[0] * Layout.TILE, y: t[1] * Layout.TILE }; }

  function renderBackground() {
    const T = Layout.TILE;
    bg = document.createElement('canvas');
    bg.width = Layout.COLS * T; bg.height = Layout.ROWS * T;
    const c = bg.getContext('2d');
    c.imageSmoothingEnabled = false;

    // 廊下（ベース床）
    c.fillStyle = '#c9c2b4';
    c.fillRect(0, 0, bg.width, bg.height);
    for (let x = 0; x < Layout.COLS; x++) {
      for (let y = 0; y < Layout.ROWS; y++) {
        if ((x + y) % 2 === 0) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x * T, y * T, T, T); }
      }
    }

    // 部屋の床
    for (const r of Layout.data.rooms) {
      c.fillStyle = r.floor;
      c.fillRect(r.x * T, r.y * T, r.w * T, r.h * T);
      c.fillStyle = 'rgba(0,0,0,0.04)';
      for (let x = r.x; x < r.x + r.w; x++) {
        for (let y = r.y; y < r.y + r.h; y++) {
          if ((x + y) % 2 === 0) c.fillRect(x * T, y * T, T, T);
        }
      }
    }

    // 壁
    for (const w of Layout.data.walls) {
      const p = px([w.x, w.y]);
      c.fillStyle = '#6b6157';
      c.fillRect(p.x, p.y, w.w * T, w.h * T);
      c.fillStyle = '#87796b';
      c.fillRect(p.x, p.y, w.w * T, Math.min(10, w.h * T));
    }

    // 机（座席の1マス上に置く）
    for (const seat of Layout.data.desks) {
      const p = px([seat[0], seat[1] - 1]);
      c.fillStyle = '#8a6a48';
      c.fillRect(p.x + 2, p.y + 8, T - 4, T - 12);
      c.fillStyle = '#a8845c';
      c.fillRect(p.x + 2, p.y + 8, T - 4, 6);
      // モニター
      c.fillStyle = '#2f3640';
      c.fillRect(p.x + 9, p.y + 2, 14, 9);
      c.fillStyle = '#7fd4f0';
      c.fillRect(p.x + 11, p.y + 4, 10, 5);
      // 椅子
      const s = px(seat);
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(s.x + 8, s.y + 10, T - 16, T - 16);
    }

    // 会議室の長机
    {
      const p = px([24, 2]);
      c.fillStyle = '#7a5a3a';
      c.fillRect(p.x + 3, p.y + 6, 4 * T - 6, 2 * T - 12);
      c.fillStyle = '#976f47';
      c.fillRect(p.x + 3, p.y + 6, 4 * T - 6, 8);
    }

    // 社長室: 大きな机と窓
    {
      const p = px([2, 1]);
      c.fillStyle = '#5d4630';
      c.fillRect(p.x, p.y + 10, 3 * T, 18);
      c.fillStyle = '#1c2740'; // 夜景の窓
      for (let i = 0; i < 3; i++) c.fillRect((1 + i * 3) * T, 4, 2 * T, 14);
      c.fillStyle = '#ffd977';
      for (let i = 0; i < 12; i++) c.fillRect(40 + i * 22, 8, 3, 3);
    }

    // 休憩室: ソファ・自販機・観葉植物
    {
      const p = px([30, 20]);
      c.fillStyle = '#b04a4a';
      c.fillRect(p.x, p.y + 8, 4 * T, 18); // ソファ
      c.fillRect(px([35, 21]).x, px([35, 21]).y + 8, 4 * T, 18);
      const v = px([40, 19]);
      c.fillStyle = '#3a6ea5'; c.fillRect(v.x + 4, v.y + 2, 24, 30); // 自販機
      c.fillStyle = '#9fd0ff'; c.fillRect(v.x + 8, v.y + 6, 16, 10);
    }
    // 観葉植物（部屋の角）
    for (const t of [[0, 5], [41, 5], [0, 14], [41, 14], [29, 23], [13, 0], [21, 5]]) {
      const p = px(t);
      c.fillStyle = '#b0764a'; c.fillRect(p.x + 10, p.y + 20, 12, 8);
      c.fillStyle = '#3e7d3e'; c.fillRect(p.x + 8, p.y + 6, 16, 16);
    }

    // 部屋名ラベル
    c.font = 'bold 13px sans-serif';
    for (const r of Layout.data.rooms) {
      const p = px([r.x, r.y]);
      const label = r.name;
      const w = c.measureText(label).width + 10;
      c.fillStyle = 'rgba(40,36,30,0.75)';
      c.fillRect(p.x + 4, p.y + 4, w, 18);
      c.fillStyle = '#f5efe0';
      c.fillText(label, p.x + 9, p.y + 17);
    }
    return bg;
  }

  function drawBackground(ctx) {
    if (!bg) renderBackground();
    ctx.drawImage(bg, 0, 0);
  }

  // 社員キャラ（足元基準）。state に応じてポーズを変える。
  function drawAgent(ctx, a, now) {
    const x = Math.round(a.pos.x), y = Math.round(a.pos.y) + 10; // 足元を少し下げる
    const t = now / 1000 + a.animT;
    const walking = a.state === 'walk';
    const legSwing = walking ? Math.sin(t * 12) * 3 : 0;
    const breathe = Math.sin(t * 2) * 0.7;
    const typing = (a.state === 'work' || a.state === 'exec') ? Math.sin(t * 14) * 2 : 0;
    const shake = a.state === 'sweat' ? Math.sin(t * 30) * 1.5 : 0;
    const bowLean = a.state === 'bow' ? 4 : 0;

    ctx.save();
    ctx.translate(shake, 0);

    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x, y, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

    // 脚
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(x - 5, y - 9 + Math.max(0, legSwing), 4, 9 - Math.max(0, legSwing));
    ctx.fillRect(x + 1, y - 9 + Math.max(0, -legSwing), 4, 9 - Math.max(0, -legSwing));

    // 胴体
    ctx.fillStyle = a.body;
    ctx.fillRect(x - 7, y - 20 + bowLean + breathe, 14, 12 - bowLean);

    // 腕（タイピング中は上下に動く）
    ctx.fillStyle = a.body;
    ctx.fillRect(x - 9, y - 18 + typing + bowLean, 3, 8);
    ctx.fillRect(x + 6, y - 18 - typing + bowLean, 3, 8);

    // 頭
    ctx.fillStyle = '#f1c27d';
    ctx.fillRect(x - 6, y - 30 + bowLean * 1.5 + breathe, 12, 10);
    // 髪
    ctx.fillStyle = a.hair;
    ctx.fillRect(x - 6, y - 32 + bowLean * 1.5 + breathe, 12, 5);
    // 目
    ctx.fillStyle = '#2f2f2f';
    ctx.fillRect(x - 3, y - 26 + bowLean * 1.5 + breathe, 2, 2);
    ctx.fillRect(x + 2, y - 26 + bowLean * 1.5 + breathe, 2, 2);

    // 持ち物
    if (a.state === 'read') { ctx.fillStyle = '#f5f0dc'; ctx.fillRect(x - 5, y - 16, 10, 7); ctx.fillStyle = '#b04a4a'; ctx.fillRect(x - 5, y - 16, 10, 2); }
    if (a.state === 'break') { ctx.fillStyle = '#fff'; ctx.fillRect(x + 7, y - 16, 5, 6); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x + 8, y - 15, 3, 3); }
    if (a.state === 'sweat') { ctx.fillStyle = '#6db9f0'; ctx.fillRect(x + 8, y - 30, 3, 5); }

    // 頭上の絵文字（しるし）
    if (a.emoji) {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.emoji, x, y - 38);
      ctx.textAlign = 'left';
    }

    // 名前
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(40,36,30,0.8)';
    const nw = ctx.measureText(a.name).width + 6;
    ctx.fillRect(x - nw / 2, y + 4, nw, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText(a.name, x, y + 13);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawBubble(ctx, a, now) {
    if (!a.bubble || a.bubble.until < now) return;
    const text = a.bubble.text;
    ctx.font = '12px sans-serif';
    const w = Math.min(220, ctx.measureText(text).width + 14);
    const x = Math.round(Math.max(4, Math.min(a.pos.x - w / 2, Layout.COLS * Layout.TILE - w - 4)));
    const y = Math.round(a.pos.y) - 62;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#6b6157';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 20, 6);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.pos.x - 4, y + 20); ctx.lineTo(a.pos.x + 4, y + 20); ctx.lineTo(a.pos.x, y + 26);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f2a24';
    let t2 = text;
    while (ctx.measureText(t2).width > w - 14 && t2.length > 1) t2 = t2.slice(0, -2) + '…';
    ctx.fillText(t2, x + 7, y + 14);
  }

  return { renderBackground, drawBackground, drawAgent, drawBubble };
})();
