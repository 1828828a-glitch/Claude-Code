// 背景。どれも画面全体(1080x1920)を塗る

// 実家の台所。朝の暖かい光
function bgHomeKitchen(ctx, t, o = {}) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#f4e6d2'], [1, '#e9d6bd']]); ctx.fillRect(0, 0, W, H);
  // 窓
  const wx = 90, wy = 250, ww = 430, wh = 520;
  ctx.fillStyle = '#d9c2a0'; rr(ctx, wx - 24, wy - 24, ww + 48, wh + 48, 10); ctx.fill();
  ctx.fillStyle = lg(ctx, 0, wy, 0, wy + wh, [[0, '#cfe6f2'], [1, '#fff6df']]); ctx.fillRect(wx, wy, ww, wh);
  fillEll(ctx, wx + 120, wy + 420, 120, 60, 'rgba(160,200,150,0.7)');
  fillEll(ctx, wx + 330, wy + 450, 150, 70, 'rgba(140,185,135,0.7)');
  ctx.fillStyle = '#d9c2a0'; ctx.fillRect(wx + ww / 2 - 8, wy, 16, wh); ctx.fillRect(wx, wy + wh / 2 - 8, ww, 16);
  // カーテン
  ctx.fillStyle = '#f3e3a8';
  ctx.beginPath(); ctx.moveTo(wx - 50, wy - 50); ctx.lineTo(wx + 70, wy - 50); ctx.quadraticCurveTo(wx + 40, wy + 300, wx + 10, wy + wh + 60); ctx.lineTo(wx - 50, wy + wh + 60); ctx.fill();
  ctx.beginPath(); ctx.moveTo(wx + ww + 50, wy - 50); ctx.lineTo(wx + ww - 70, wy - 50); ctx.quadraticCurveTo(wx + ww - 40, wy + 300, wx + ww - 10, wy + wh + 60); ctx.lineTo(wx + ww + 50, wy + wh + 60); ctx.fill();
  // 吊り戸棚
  ctx.fillStyle = '#c99c6e'; rr(ctx, 600, 180, 480, 330, 8); ctx.fill();
  ctx.strokeStyle = '#a97f55'; ctx.lineWidth = 6; ctx.strokeRect(620, 200, 210, 290); ctx.strokeRect(850, 200, 210, 290);
  fillEll(ctx, 810, 440, 8, 8, '#8a6440'); fillEll(ctx, 870, 440, 8, 8, '#8a6440');
  // 壁掛け時計
  fillEll(ctx, 840, 680, 70, 70, '#fffaf0'); ctx.strokeStyle = '#a97f55'; ctx.lineWidth = 10; ell(ctx, 840, 680, 70, 70); ctx.stroke();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(840, 680); ctx.lineTo(840, 630); ctx.moveTo(840, 680); ctx.lineTo(875, 700); ctx.stroke();
  const sa = (Math.floor(t) / 60) * TAU;
  ctx.strokeStyle = '#c0453c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(840, 680); ctx.lineTo(840 + Math.sin(sa) * 58, 680 - Math.cos(sa) * 58); ctx.stroke();
  // 冷蔵庫
  ctx.fillStyle = '#f7f5f0'; rr(ctx, 860, 820, 260, 900, 16); ctx.fill();
  ctx.strokeStyle = '#ddd8cc'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(860, 1120); ctx.lineTo(1120, 1120); ctx.stroke();
  [['#e86f5a', 920, 900], ['#6fa8dc', 980, 960], ['#f2c14e', 940, 1010]].forEach(([c, x, y]) => fillEll(ctx, x, y, 16, 16, c));
  // カウンター
  ctx.fillStyle = '#b98a5e'; ctx.fillRect(0, 1240, W, 26);
  ctx.fillStyle = '#dcc3a0'; ctx.fillRect(0, 1266, W, H - 1266);
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 4;
  for (let x = 0; x < W; x += 270) { ctx.beginPath(); ctx.moveTo(x, 1290); ctx.lineTo(x, H); ctx.stroke(); }
  // 差し込む光
  if (o.rays !== false) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,236,190,0.22)';
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + ww, wy); ctx.lineTo(wx + ww + 600, H); ctx.lineTo(wx + 200, H); ctx.fill();
    ctx.restore();
  }
}

// 居酒屋。blur で背景ボケ
function bgIzakaya(ctx, t, o = {}) {
  const draw = (c) => {
    c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#3b2418'], [0.6, '#5a3825'], [1, '#2e1c13']]); c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 6;
    for (let x = 0; x < W; x += 120) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    // 短冊メニュー
    const menu = ['焼鳥', '枝豆', '唐揚げ', 'おにぎり', '冷奴', 'ポテサラ'];
    menu.forEach((m, i) => {
      const x = 90 + i * 168, y = 300;
      c.fillStyle = '#f2e6c9'; c.fillRect(x - 54, y, 108, 400);
      c.fillStyle = '#2a1a12'; c.font = '600 54px "Klee"'; c.textAlign = 'center'; c.textBaseline = 'middle';
      [...m].forEach((ch, k) => c.fillText(ch, x, y + 60 + k * 66));
      c.fillStyle = '#b5332b'; c.font = '600 30px "Klee"'; c.fillText(['380', '290', '480', '250', '280', '350'][i], x, y + 370);
    });
    // 提灯
    [[150, 160], [930, 140], [540, 120]].forEach(([x, y], i) => {
      c.fillStyle = rg(c, x, y, 0, 260, [[0, 'rgba(255,170,80,0.55)'], [1, 'rgba(255,140,60,0)']]); c.fillRect(x - 260, y - 260, 520, 520);
      c.fillStyle = '#d9473a'; ell(c, x, y, 70, 90); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
      for (let k = -3; k <= 3; k++) { c.beginPath(); c.ellipse(x, y + k * 22, 70 * Math.sqrt(1 - (k / 4) ** 2), 6, 0, 0, Math.PI); c.stroke(); }
      c.fillStyle = '#222'; c.fillRect(x - 40, y - 96, 80, 14); c.fillRect(x - 40, y + 84, 80, 14);
    });
    // 同僚のシルエット
    [[180, 1050, '#2c3753', 0.9], [880, 1080, '#3a3f4a', 1.0], [560, 980, '#4a4036', 0.75]].forEach(([x, y, col, s]) => {
      c.save(); c.translate(x, y); c.scale(s, s);
      c.fillStyle = col; c.beginPath(); c.moveTo(-200, 600); c.quadraticCurveTo(-190, 200, 0, 190); c.quadraticCurveTo(190, 200, 200, 600); c.fill();
      fillEll(c, 0, 80, 92, 108, '#e8c4aa');
      c.fillStyle = '#2a2220'; c.beginPath(); c.ellipse(0, 40, 98, 86, 0, Math.PI, TAU); c.fill();
      c.restore();
    });
    // ボケた灯り
    const r = rng(3);
    for (let i = 0; i < 16; i++) {
      const x = r() * W, y = r() * 900, rad = 30 + r() * 60;
      c.fillStyle = `rgba(255,${180 + r() * 50},${100 + r() * 60},${0.12 + r() * 0.12})`; ell(c, x, y, rad, rad); c.fill();
    }
  };
  const bl = o.blur ?? 10;
  if (bl > 0) { withFilter(ctx, `blur(${bl}px)`, draw, 'izk'); } else draw(ctx);
  // 手前のテーブル
  if (o.table !== false) {
    const ty = o.tableY ?? 1380;
    ctx.fillStyle = lg(ctx, 0, ty, 0, H, [[0, '#8a5a36'], [1, '#5e3b22']]); ctx.fillRect(0, ty, W, H - ty);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, ty + 30 + i * 70); ctx.bezierCurveTo(300, ty + 20 + i * 70, 700, ty + 50 + i * 70, W, ty + 30 + i * 70); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,200,120,0.15)'; ctx.fillRect(0, ty, W, 8);
  }
  ctx.fillStyle = 'rgba(255,150,60,0.08)'; ctx.fillRect(0, 0, W, H);
}

// ひとり暮らしの部屋のキッチン。tone: cool(朝の青) / warm
function bgApartment(ctx, t, o = {}) {
  const warm = o.warm || 0;
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, mixColor('#dfe4ea', '#f1e6d6', warm)], [1, mixColor('#cfd5dc', '#e6d8c4', warm)]]); ctx.fillRect(0, 0, W, H);
  // 小窓とブラインド
  ctx.fillStyle = '#bfc7d0'; rr(ctx, 560, 220, 420, 380, 8); ctx.fill();
  ctx.fillStyle = lg(ctx, 0, 240, 0, 580, [[0, mixColor('#cfe3f5', '#ffe2b8', warm)], [1, mixColor('#eef4f8', '#fff3dc', warm)]]); ctx.fillRect(580, 240, 380, 340);
  ctx.fillStyle = 'rgba(240,244,248,0.85)';
  for (let y = 250; y < 580; y += 34) ctx.fillRect(580, y, 380, 14);
  // 棚
  ctx.fillStyle = '#9aa4ae'; ctx.fillRect(60, 520, 380, 16);
  [[100, '#e7e2d8'], [170, '#f0c75e'], [240, '#e7e2d8'], [330, '#7fa7c9']].forEach(([x, c]) => { ctx.fillStyle = c; rr(ctx, x, 430, 54, 90, 8); ctx.fill(); });
  // カップ麺の山
  [[110, 380], [170, 380], [140, 320]].forEach(([x, y]) => { ctx.fillStyle = '#f5f2ea'; rr(ctx, x - 30, y, 60, 56, 6); ctx.fill(); ctx.fillStyle = '#d24a3c'; ctx.fillRect(x - 30, y + 18, 60, 14); });
  // 小さい冷蔵庫
  ctx.fillStyle = '#eceef0'; rr(ctx, 40, 1020, 300, 560, 14); ctx.fill();
  ctx.strokeStyle = '#c9ced4'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, 1200); ctx.lineTo(340, 1200); ctx.stroke();
  // シンク台
  ctx.fillStyle = '#b8c0c8'; ctx.fillRect(0, 1240, W, 24);
  ctx.fillStyle = '#e4e7ea'; ctx.fillRect(0, 1264, W, H - 1264);
  ctx.fillStyle = '#c9ced4'; rr(ctx, 420, 1180, 300, 70, 10); ctx.fill();
  ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(660, 1180); ctx.lineTo(660, 1090); ctx.quadraticCurveTo(660, 1060, 620, 1060); ctx.lineTo(600, 1060); ctx.stroke();
  // 光
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(${lerp(200, 255, warm)},${lerp(225, 220, warm)},${lerp(255, 170, warm)},0.18)`;
  ctx.beginPath(); ctx.moveTo(580, 240); ctx.lineTo(960, 240); ctx.lineTo(700, H); ctx.lineTo(80, H); ctx.fill();
  ctx.restore();
}
function mixColor(a, b, k) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], k)).toString(16).padStart(2, '0')).join('');
}

// 教室の昼休み
function bgClassroom(ctx, t) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#efe8d8'], [1, '#e2d8c2']]); ctx.fillRect(0, 0, W, H);
  // 窓
  for (let i = 0; i < 2; i++) {
    const x = 40 + i * 330;
    ctx.fillStyle = '#d6d0c2'; ctx.fillRect(x, 200, 300, 760);
    ctx.fillStyle = lg(ctx, 0, 210, 0, 950, [[0, '#9fcdee'], [1, '#dff0fa']]); ctx.fillRect(x + 14, 214, 272, 732);
    fillEll(ctx, x + 150, 880, 200, 120, '#7fb36a'); fillEll(ctx, x + 60, 860, 110, 90, '#6aa35a');
    fillEll(ctx, x + 200, 340, 70, 30, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = '#d6d0c2'; ctx.fillRect(x + 142, 200, 16, 760);
  }
  // 黒板
  ctx.fillStyle = '#8a6a48'; ctx.fillRect(720, 230, 400, 560);
  ctx.fillStyle = '#2f4d3c'; ctx.fillRect(740, 250, 380, 520);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4;
  ctx.font = '600 44px "Klee"'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'left'; ctx.fillText('昼休み', 790, 680);
  // 机
  ctx.fillStyle = '#c9a074'; ctx.fillRect(0, 1360, W, 30);
  ctx.fillStyle = '#d8b28a'; ctx.fillRect(0, 1390, W, H - 1390);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,245,210,0.25)';
  ctx.beginPath(); ctx.moveTo(40, 200); ctx.lineTo(700, 200); ctx.lineTo(1080, H); ctx.lineTo(300, H); ctx.fill();
  ctx.restore();
}

// 朝の寝室
function bgBedroom(ctx, t) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#5c6782'], [1, '#3d4660']]); ctx.fillRect(0, 0, W, H);
  // カーテンのすき間の光
  ctx.fillStyle = '#4a5370'; ctx.fillRect(560, 120, 480, 900);
  ctx.fillStyle = 'rgba(220,235,255,0.75)'; ctx.fillRect(780, 120, 36, 900);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(200,220,255,0.18)'; ctx.beginPath(); ctx.moveTo(780, 120); ctx.lineTo(816, 120); ctx.lineTo(600, H); ctx.lineTo(260, H); ctx.fill();
  ctx.restore();
  // 布団
  ctx.fillStyle = '#7d8fb3'; ctx.beginPath(); ctx.moveTo(0, 1150); ctx.bezierCurveTo(300, 1060, 700, 1120, W, 1080); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 6; i++) { ctx.fillRect(0, 1200 + i * 120, W, 40); }
  ctx.fillStyle = '#e9ecf2'; ctx.beginPath(); ellipseTo(ctx, 760, 1120, 280, 90); ctx.fill();
}
function ellipseTo(ctx, x, y, rx, ry) { ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }

// 駅のホーム。close: 0..1 でドアが閉まる
function bgPlatform(ctx, t, close = 0, o = {}) {
  ctx.fillStyle = '#d7dde3'; ctx.fillRect(0, 0, W, H);
  // 車体
  ctx.fillStyle = lg(ctx, 0, 140, 0, 1400, [[0, '#c7ced6'], [0.5, '#e6eaee'], [1, '#b6bec7']]); ctx.fillRect(0, 140, W, 1260);
  ctx.fillStyle = o.stripe || '#2f9e5b'; ctx.fillRect(0, 300, W, 40); ctx.fillRect(0, 1250, W, 30);
  // 窓
  [[-120, 420], [W - 60, 420]].forEach(([x, y]) => { ctx.fillStyle = '#5b6b7c'; rr(ctx, x - 100, y, 280, 360, 14); ctx.fill(); });
  // ドア
  const gap = lerp(300, 0, E.inOut(close));
  const dw = 280;
  [-1, 1].forEach(d => {
    const x = W / 2 + d * (gap / 2) + (d < 0 ? -dw : 0);
    ctx.fillStyle = '#dfe4e9'; ctx.fillRect(x, 380, dw, 1000);
    ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = 6; ctx.strokeRect(x, 380, dw, 1000);
    ctx.fillStyle = '#4e5d6d'; rr(ctx, x + 40, 450, dw - 80, 420, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 60, 470, 30, 380);
  });
  // 車内
  if (gap > 1) {
    ctx.fillStyle = '#f1e8d0'; ctx.fillRect(W / 2 - gap / 2, 380, gap, 1000);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(W / 2 - gap / 2, 380, gap, 1000);
  }
  // ホーム
  ctx.fillStyle = '#9aa1a8'; ctx.fillRect(0, 1400, W, H - 1400);
  ctx.fillStyle = '#e8c547'; ctx.fillRect(0, 1460, W, 60);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 10; x < W; x += 40) for (let y = 1470; y < 1515; y += 20) fillEll(ctx, x, y, 6, 6, 'rgba(0,0,0,0.12)');
}

// 玄関
function bgGenkan(ctx, t, o = {}) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#efe3d0'], [1, '#e2d2ba']]); ctx.fillRect(0, 0, W, H);
  // ドア
  ctx.fillStyle = '#8a5c3b'; rr(ctx, 300, 260, 480, 1180, 10); ctx.fill();
  ctx.strokeStyle = '#6e462b'; ctx.lineWidth = 8; ctx.strokeRect(340, 320, 400, 480); ctx.strokeRect(340, 860, 400, 520);
  ctx.fillStyle = '#d8c7a0'; rr(ctx, 380, 360, 320, 140, 8); ctx.fill();
  ctx.fillStyle = '#d4b04a'; rr(ctx, 690, 820, 26, 90, 10); ctx.fill();
  if (o.open) {
    ctx.fillStyle = '#fff8e6'; ctx.fillRect(300, 260, 480 * o.open, 1180);
  }
  // 土間と段差
  ctx.fillStyle = '#9b9a95'; ctx.fillRect(0, 1440, W, 200);
  ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, 1640, W, H - 1640);
  ctx.fillStyle = '#b08a60'; ctx.fillRect(0, 1640, W, 18);
  // 靴
  [[200, 1540, '#3a3a3a'], [880, 1560, '#c97a5a']].forEach(([x, y, c]) => { ctx.fillStyle = c; rr(ctx, x - 70, y - 20, 140, 46, 22); ctx.fill(); });
}

// 夜の台所(母のいま)
function bgNightKitchen(ctx, t, o = {}) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#2f3445'], [1, '#262a37']]); ctx.fillRect(0, 0, W, H);
  // 窓の外は夜
  ctx.fillStyle = '#1c2133'; rr(ctx, 90, 260, 420, 500, 8); ctx.fill();
  ctx.fillStyle = '#d9c896'; fillEll(ctx, 380, 380, 34, 34, 'rgba(240,230,190,0.85)');
  ctx.strokeStyle = '#3a4054'; ctx.lineWidth = 16; ctx.strokeRect(90, 260, 420, 500);
  // 吊り戸棚と冷蔵庫(暗い)
  ctx.fillStyle = '#4a3e36'; rr(ctx, 600, 180, 480, 330, 8); ctx.fill();
  ctx.fillStyle = '#4f5260'; rr(ctx, 860, 820, 260, 900, 16); ctx.fill();
  // ペンダントライト
  ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(540, 0); ctx.lineTo(540, 640); ctx.stroke();
  ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.moveTo(460, 700); ctx.lineTo(620, 700); ctx.lineTo(580, 630); ctx.lineTo(500, 630); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rg(ctx, 540, 900, 0, 900, [[0, 'rgba(255,200,120,0.45)'], [1, 'rgba(255,170,90,0)']]); ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // テーブル
  ctx.fillStyle = '#7a5134'; ctx.fillRect(0, 1260, W, 26);
  ctx.fillStyle = lg(ctx, 0, 1286, 0, H, [[0, '#8f6240'], [1, '#5e3e28']]); ctx.fillRect(0, 1286, W, H - 1286);
}

// 真上から見た台・布
function bgTop(ctx, kind = 'wood', o = {}) {
  if (kind === 'wood') {
    ctx.fillStyle = '#c8986a'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(i * 160, 0, 160, H);
      ctx.strokeStyle = 'rgba(90,50,20,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(i * 160, 0); ctx.lineTo(i * 160, H); ctx.stroke();
    }
    const r = rng(11);
    ctx.strokeStyle = 'rgba(110,65,30,0.12)'; ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const x = r() * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 20, H * 0.3, x - 20, H * 0.6, x + 10, H); ctx.stroke(); }
  } else if (kind === 'counter') {
    ctx.fillStyle = o.color || '#e7e9ec'; ctx.fillRect(0, 0, W, H);
    const r = rng(4);
    for (let i = 0; i < 300; i++) fillEll(ctx, r() * W, r() * H, 2 + r() * 3, 2 + r() * 3, 'rgba(120,130,140,0.12)');
  } else if (kind === 'cloth') {
    ctx.fillStyle = o.color || '#f2e9da'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = o.check || 'rgba(214,92,80,0.22)';
    for (let x = 0; x < W; x += 120) ctx.fillRect(x, 0, 60, H);
    for (let y = 0; y < H; y += 120) ctx.fillRect(0, y, W, 60);
  }
}
