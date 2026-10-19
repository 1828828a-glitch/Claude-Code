// 小道具。基本は中心(x,y)・倍率 s で描く
const RICE = '#fbfaf4', RICE_SH = '#e9e4d6', NORI = '#1d2620';

function onigiriPath(ctx, lop = 0) {
  // lop: いびつさ(手作り感) 0..1
  ctx.beginPath();
  ctx.moveTo(0 + lop * 14, -150 + lop * 10);
  ctx.bezierCurveTo(40 + lop * 10, -152, 150 + lop * 22, 40 - lop * 12, 156 - lop * 10, 96);
  ctx.bezierCurveTo(162, 150 + lop * 6, 120, 158, 0, 156 - lop * 6);
  ctx.bezierCurveTo(-120, 158, -168 + lop * 8, 150 - lop * 10, -150 + lop * 6, 92 + lop * 14);
  ctx.bezierCurveTo(-148, 40, -40 - lop * 10, -152, 0 + lop * 14, -150 + lop * 10);
  ctx.closePath();
}
function riceTexture(ctx, seed, n = 90) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * 300, y = -140 + r() * 290;
    ctx.fillStyle = r() < 0.5 ? 'rgba(220,214,196,0.55)' : 'rgba(255,255,255,0.9)';
    ell(ctx, x, y, 9 + r() * 4, 5 + r() * 2, r() * Math.PI); ctx.fill();
  }
}
// filling: sausage|ume|salmon, bite: 0..1 (かじった量), lop: いびつさ
function biteClip(ctx, by) {
  // かじり跡の下側だけを残す。円の和集合の下端をなぞる
  const circles = [[-120, 4], [-62, -6], [-2, 2], [58, -8], [116, 2]].map(([bx, dy]) => [bx, by - 40 + dy, 46]);
  ctx.beginPath();
  ctx.moveTo(-400, 400);
  for (let x = -400; x <= 400; x += 3) {
    let y = by - 40;
    for (const [cx, cy, r] of circles) { const dx = x - cx; if (Math.abs(dx) < r) y = Math.max(y, cy + Math.sqrt(r * r - dx * dx)); }
    ctx.lineTo(x, y);
  }
  ctx.lineTo(400, 400);
  ctx.closePath();
  ctx.clip();
}
function drawOnigiri(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const lop = o.lop || 0;
  const bite = o.bite || 0;
  const by = -150 + 150 * bite;
  ctx.save();
  if (bite > 0) biteClip(ctx, by);
  ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  onigiriPath(ctx, lop); ctx.fillStyle = RICE; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); onigiriPath(ctx, lop); ctx.clip();
  ctx.fillStyle = lg(ctx, -150, -150, 150, 150, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(200,190,170,0.35)']]);
  ctx.fillRect(-200, -200, 400, 400);
  riceTexture(ctx, (o.seed || 1) * 7);
  // 断面(かじった面は少し暗い)
  if (bite > 0) {
    ctx.fillStyle = 'rgba(214,206,186,0.55)';
    ctx.beginPath(); ctx.ellipse(0, by + 4, 160, 30, 0, 0, TAU); ctx.fill();
  }
  // 海苔
  if (o.nori !== false) {
    ctx.fillStyle = NORI;
    ctx.beginPath(); ctx.moveTo(-74, 40); ctx.lineTo(74, 40); ctx.lineTo(84, 170); ctx.lineTo(-84, 170); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,150,120,0.18)'; ctx.fillRect(-60, 48, 20, 120);
  }
  ctx.restore();
  ctx.restore();
  // 具は、かじり跡のすぐ下にのぞく
  if (bite > 0.25 && o.filling) {
    const k = clamp((bite - 0.25) / 0.3);
    const fy = by + 30;
    ctx.save(); onigiriPath(ctx, lop); ctx.clip();
    fillEll(ctx, 0, fy + 4, 62 * k, 44 * k, 'rgba(200,190,165,0.6)');
    if (o.filling === 'sausage') {
      fillEll(ctx, 0, fy, 48 * k, 36 * k, '#d42f3a');
      fillEll(ctx, 0, fy + 1, 39 * k, 28 * k, '#f3b8a8');
      fillEll(ctx, -10, fy - 6, 18 * k, 9 * k, 'rgba(255,230,222,0.85)');
    } else if (o.filling === 'ume') {
      ctx.fillStyle = '#9e1b3b';
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const a = (i / 14) * TAU, r2 = (32 + Math.sin(i * 2.7) * 6) * k; ctx.lineTo(Math.cos(a) * r2 * 1.25, fy + Math.sin(a) * r2 * 0.85); }
      ctx.fill();
      fillEll(ctx, -10, fy - 8, 12 * k, 6 * k, 'rgba(255,170,190,0.6)');
    } else if (o.filling === 'salmon') {
      const r = rng(5);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 3 ? '#f0895c' : '#f7ab84';
        ell(ctx, (r() - 0.5) * 80 * k, fy + (r() - 0.5) * 44 * k, 17 * k, 9 * k, r() * 3); ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

// 赤いウインナー
function drawSausage(ctx, x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(ctx, -70, -24, 140, 48, 24); ctx.fillStyle = '#d42f3a'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, -56, -16, 100, 10, 5); ctx.fill();
  ctx.fillStyle = '#b5222d'; fillEll(ctx, -66, 0, 6, 18, '#b5222d'); fillEll(ctx, 66, 0, 6, 18, '#b5222d');
  ctx.restore();
}

// 包んだお弁当
function drawBento(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const c = o.color || '#3d5a8a', dot = o.dot || 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
  rr(ctx, -150, -70, 300, 150, 26); ctx.fillStyle = c; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); rr(ctx, -150, -70, 300, 150, 26); ctx.clip();
  ctx.fillStyle = dot;
  for (let i = -6; i < 7; i++) for (let j = -3; j < 4; j++) fillEll(ctx, i * 26 + (j % 2) * 13, j * 26, 4.5, 4.5, dot);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-150, 30, 300, 60);
  ctx.restore();
  // 結び目
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(-20, -70); ctx.quadraticCurveTo(-80, -140, -96, -96); ctx.quadraticCurveTo(-70, -66, -20, -60); ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, -70); ctx.quadraticCurveTo(80, -140, 96, -96); ctx.quadraticCurveTo(70, -66, 20, -60); ctx.fill();
  rr(ctx, -26, -88, 52, 40, 14); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; rr(ctx, -26, -60, 52, 12, 6); ctx.fill();
  ctx.restore();
}

// 鍋と吹きこぼれ。boil: 0..1
function drawPot(ctx, x, y, s, boil, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // コンロ
  ctx.fillStyle = '#2d2f33'; rr(ctx, -260, 120, 520, 60, 16); ctx.fill();
  ctx.strokeStyle = '#555a61'; ctx.lineWidth = 8; ell(ctx, 0, 118, 170, 26); ctx.stroke();
  // 鍋本体
  ctx.fillStyle = lg(ctx, -190, 0, 190, 0, [[0, '#9aa3ad'], [0.35, '#e1e6eb'], [0.7, '#b7bec6'], [1, '#808892']]);
  rr(ctx, -190, -60, 380, 180, 30); ctx.fill();
  ctx.fillStyle = '#6c737c'; rr(ctx, -230, -40, 50, 22, 10); ctx.fill(); rr(ctx, 180, -40, 50, 22, 10); ctx.fill();
  ctx.fillStyle = '#c9ced4'; ell(ctx, 0, -60, 190, 30); ctx.fill();
  ctx.fillStyle = '#e8dcc0'; ell(ctx, 0, -58, 176, 24); ctx.fill();
  // 泡
  if (boil > 0) {
    const r = rng(9);
    for (let i = 0; i < 40; i++) {
      const bx = (r() - 0.5) * 380, ph = r() * TAU;
      const rise = boil * (40 + r() * 60);
      const by = -64 - rise + Math.sin(t * 9 + ph) * 6;
      const br = (14 + r() * 22) * clamp(boil * 1.4);
      fillEll(ctx, bx, by, br, br * 0.85, 'rgba(255,253,245,0.96)');
    }
    // こぼれる泡。縁からたれるしずく
    const spill = clamp((boil - 0.45) / 0.55);
    if (spill > 0) {
      ctx.fillStyle = 'rgba(255,253,245,0.97)';
      ell(ctx, 0, -66, 200 + spill * 14, 34); ctx.fill();
      [[-176, 0.9, 16], [-120, 0.55, 12], [-40, 0.35, 10], [70, 0.6, 13], [150, 1, 17]].forEach(([sx, k, wd], i) => {
        const len = spill * 150 * k + Math.sin(t * 3 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(sx - wd * 1.8, -64);
        ctx.quadraticCurveTo(sx - wd, -40, sx - wd * 0.8, -60 + len);
        ctx.arc(sx, -60 + len, wd * 0.9, Math.PI, 0, true);
        ctx.quadraticCurveTo(sx + wd, -40, sx + wd * 1.8, -64);
        ctx.fill();
      });
    }
  }
  ctx.restore();
  steam(ctx, x, y - (90 + boil * 60) * s, t, { n: 14, h: 520 * s, w: 300 * s, r: 50 * s, a: 0.22, per: 1.8 });
}

// ベル式の目覚まし時計
function drawAlarm(ctx, x, y, s, ring, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const sh = ring > 0 ? Math.sin(t * 70) * 0.08 * ring : 0;
  ctx.rotate(sh);
  ctx.fillStyle = '#c0453c';
  [-1, 1].forEach(d => { ctx.save(); ctx.rotate(d * 0.6); fillEll(ctx, 0, -175, 62, 40, '#c0453c'); ctx.restore(); });
  ctx.fillStyle = '#6d3a2c'; rr(ctx, -10, -200, 20, 40, 6); ctx.fill();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-90, 120); ctx.lineTo(-120, 175); ctx.moveTo(90, 120); ctx.lineTo(120, 175); ctx.stroke();
  fillEll(ctx, 0, 0, 160, 160, '#d9514a');
  fillEll(ctx, 0, 0, 132, 132, '#fbf6ec');
  ctx.fillStyle = '#333';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; fillEll(ctx, Math.cos(a) * 110, Math.sin(a) * 110, 7, 7, '#3a3a3a'); }
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-Math.PI / 2 + TAU * (6.5 / 12)) * 60, Math.sin(-Math.PI / 2 + TAU * (6.5 / 12)) * 60); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 94); ctx.stroke();
  fillEll(ctx, 0, 0, 12, 12, '#2a2a2a');
  if (ring > 0) {
    ctx.strokeStyle = `rgba(60,40,30,${ring * 0.7})`; ctx.lineWidth = 9;
    [-1, 1].forEach(d => {
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(d * 40, -190, 120 + k * 34, d > 0 ? -1.2 : Math.PI + 0.4, d > 0 ? -0.4 : Math.PI + 1.2); ctx.stroke(); }
    });
  }
  ctx.restore();
}

function drawBeer(ctx, x, y, s, level = 0.8) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -70, -150, 140, 260, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
  ctx.save(); rr(ctx, -70, -150, 140, 260, 18); ctx.clip();
  const top = 110 - 260 * level;
  ctx.fillStyle = lg(ctx, 0, top, 0, 110, [[0, '#f7c64a'], [1, '#e29a1c']]); ctx.fillRect(-70, top, 140, 300);
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(-70, top - 40, 140, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-52, -140, 16, 240);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(70, -90); ctx.quadraticCurveTo(140, -90, 132, 0); ctx.quadraticCurveTo(128, 60, 70, 60); ctx.stroke();
  ctx.restore();
}

// 平皿
function drawPlate(ctx, x, y, rx, ry, color = '#f3efe6') {
  fillEll(ctx, x, y + 10, rx, ry, 'rgba(0,0,0,0.18)');
  fillEll(ctx, x, y, rx, ry, color);
  fillEll(ctx, x, y - 2, rx * 0.78, ry * 0.72, 'rgba(0,0,0,0.05)');
}

// スマホ本体(画面描画は fn に任せる)
function drawPhone(ctx, x, y, s, rot, fn) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
  rr(ctx, -250, -520, 500, 1040, 64); ctx.fillStyle = '#16171a'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); rr(ctx, -232, -502, 464, 1004, 50); ctx.clip();
  ctx.translate(-232, -502);
  fn(ctx, 464, 1004);
  ctx.restore();
  rr(ctx, -60, -492, 120, 26, 13); ctx.fillStyle = '#0c0c0d'; ctx.fill();
  ctx.restore();
}

// 炊飯器
function drawRiceCooker(ctx, x, y, s, open, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -220, -40, 440, 260, 70); ctx.fillStyle = '#f2f1ee'; ctx.fill();
  ctx.fillStyle = '#d9d7d1'; rr(ctx, -220, 150, 440, 70, 40); ctx.fill();
  rr(ctx, -70, 40, 140, 70, 14); ctx.fillStyle = '#4a5560'; ctx.fill();
  ctx.fillStyle = '#9fe0c0'; ctx.font = '700 30px "ZenKaku"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('保温', 0, 76);
  // 内釜とご飯
  fillEll(ctx, 0, -40, 200, 46, '#c9c6bf');
  fillEll(ctx, 0, -36, 176, 36, '#fbfaf4');
  ctx.save(); ell(ctx, 0, -36, 176, 36); ctx.clip(); ctx.translate(0, -36); ctx.scale(1, 0.25); riceTexture(ctx, 3, 120); ctx.restore();
  // ふた
  ctx.save(); ctx.translate(0, -60); ctx.rotate(-open * 1.25);
  ctx.translate(0, 0);
  rr(ctx, -220, -120, 440, 120, 60); ctx.fillStyle = '#f7f6f3'; ctx.fill();
  ctx.fillStyle = '#e1dfd9'; rr(ctx, -200, -20, 400, 22, 10); ctx.fill();
  ctx.restore();
  ctx.restore();
  if (open > 0.3) steam(ctx, x, y - 90 * s, t, { n: 12, h: 520 * s, w: 260 * s, r: 48 * s, a: 0.15 * (open - 0.3) / 0.7, per: 2.2 });
}

// 通学カバンの中(上から)
function drawBagTop(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -380, -300, 760, 600, 40); ctx.fillStyle = '#2a2f3b'; ctx.fill();
  rr(ctx, -340, -260, 680, 520, 30); ctx.fillStyle = '#14171e'; ctx.fill();
  // 教科書とプリント
  ctx.save(); ctx.rotate(-0.08);
  rr(ctx, -300, -200, 260, 360, 10); ctx.fillStyle = '#4f7cb0'; ctx.fill();
  rr(ctx, -40, -230, 300, 380, 10); ctx.fillStyle = '#d6c27a'; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.rotate(0.15); ctx.fillStyle = '#f4f1ea'; ctx.fillRect(-120, 40, 360, 230);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-100, 70 + i * 30); ctx.lineTo(210, 70 + i * 30); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

// 赤ウインナーのパック
function drawSausagePack(ctx, x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
  rr(ctx, -220, -130, 440, 260, 30); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  for (let i = 0; i < 5; i++) drawSausage(ctx, -150 + i * 75, 10, 0.9, Math.PI / 2 + (i % 2 ? 0.08 : -0.06));
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, -200, -120, 120, 240, 20); ctx.fill();
  rr(ctx, -150, -112, 300, 64, 14); ctx.fillStyle = '#e8483c'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 40px "ZenMaru"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('赤ウインナー', 0, -80);
  ctx.restore();
}

// 湯のみ(t は湯気の時間)
function drawTeacup(ctx, x, y, s, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  fillEll(ctx, 0, 70, 90, 20, 'rgba(0,0,0,0.25)');
  ctx.beginPath(); ctx.moveTo(-80, -60); ctx.lineTo(80, -60); ctx.lineTo(64, 70); ctx.quadraticCurveTo(0, 84, -64, 70); ctx.closePath();
  ctx.fillStyle = '#5f7a8c'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-60, -50, 24, 110);
  fillEll(ctx, 0, -60, 80, 16, '#4b6271'); fillEll(ctx, 0, -58, 70, 12, '#9c8a4c');
  ctx.restore();
  steam(ctx, x, y - 70 * s, t, { n: 7, h: 260 * s, w: 60 * s, r: 22 * s, a: 0.14, per: 3.2 });
}

// ふたを開けた弁当箱(おにぎり3つ)。fillings を指定
function drawBentoOpen(ctx, x, y, s, fillings, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  rr(ctx, -330, -230, 660, 460, 40); ctx.fillStyle = o.box || '#3d5a8a'; ctx.fill();
  ctx.shadowColor = 'transparent';
  rr(ctx, -306, -206, 612, 412, 30); ctx.fillStyle = o.inner || '#c9b494'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, -306, -206, 612, 60, 30); ctx.fill();
  fillings.forEach((f, i) => {
    const cx = -200 + i * 200;
    if (f) drawOnigiri(ctx, cx, 10, 0.58, { bite: 0, filling: f, seed: 30 + i, lop: o.lop ? o.lop * (0.5 + 0.5 * hash(i)) : 0, rot: (hash(i + 4) - 0.5) * 0.2 });
    else { ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 6; ctx.setLineDash([16, 14]); rr(ctx, cx - 80, -80, 160, 180, 30); ctx.stroke(); ctx.setLineDash([]); }
  });
  ctx.restore();
}
