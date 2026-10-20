// 複数の動画で使い回すショット。lt はショット内の経過秒

// 吹き出し(人物のセリフ)
function speech(ctx, text, x, y, lt, t0, t1, o = {}) {
  if (NOTEXT) return;
  if (lt < t0 || lt > t1) return;
  const a = Math.min(seg(lt, t0, t0 + 0.15), 1 - seg(lt, t1 - 0.15, t1));
  const sc = lerp(0.8, 1, E.outBack(seg(lt, t0, t0 + 0.25)));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
  const size = o.size || 58;
  setFont(ctx, size, 'maru', 700);
  const lines = text.split('\n');
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 1.2;
  const h = lines.length * size * 1.35 + size * 0.8;
  ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  rr(ctx, -w / 2, -h / 2, w, h, h * 0.4); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
  const tx = o.tail ?? 0;
  ctx.beginPath(); ctx.moveTo(tx - 22, h / 2 - 4); ctx.lineTo(tx + 22, h / 2 - 4); ctx.lineTo(tx + (o.tailDir ?? 1) * 30, h / 2 + 40); ctx.fill();
  ctx.shadowColor = 'transparent';
  drawText(ctx, text, 0, 4, { size, style: 'plain', color: o.color || '#222' });
  ctx.restore();
}

// 前に回した指先(おにぎりやスマホを握っている感じを出す)
function fingersFront(ctx, x, y, s, rot = 0, n = 3) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  for (let i = 0; i < n; i++) {
    rr(ctx, -20, i * 44 - 20, 92, 40, 20); ctx.fillStyle = SKIN; ctx.fill();
    ctx.strokeStyle = 'rgba(201,143,120,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    fillEll(ctx, 56, i * 44, 10, 8, 'rgba(255,235,228,0.9)');
  }
  ctx.restore();
}

// 後ろ姿
function drawPersonBack(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
  const col = p.outfit === 'suit' ? '#2c3753' : p.outfit === 'gakuran' ? '#1f2433' : p.outfit === 'apron' ? '#c98d86' : (p.tee || '#8292a6');
  ctx.fillStyle = SKIN; ctx.fillRect(-40, 90, 80, 120);
  bodyPath(ctx, 1); ctx.fillStyle = col; ctx.fill();
  if (p.outfit === 'suit') { ctx.fillStyle = '#f5f6f8'; rr(ctx, -50, 168, 100, 30, 10); ctx.fill(); }
  if (p.outfit === 'apron') {
    ctx.strokeStyle = '#f4ecdc'; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(-70, 196); ctx.lineTo(60, 640); ctx.moveTo(70, 196); ctx.lineTo(-60, 640); ctx.stroke();
    ctx.fillStyle = '#f4ecdc'; ctx.fillRect(-230, 640, 460, 30);
    ell(ctx, -40, 660, 40, 26); ctx.fill(); ell(ctx, 40, 660, 40, 26); ctx.fill();
  }
  ctx.save(); ctx.translate(0, 120 + (p.nod || 0)); ctx.rotate(p.tilt || 0); ctx.translate(0, -120);
  [-1, 1].forEach(s => fillEll(ctx, s * 106, 12, 18, 26, SKIN));
  ell(ctx, 0, -10, 112, 140); ctx.fillStyle = SKIN; ctx.fill();
  ctx.fillStyle = HAIRC[p.who || 'adult'];
  if (p.who === 'mom') {
    ctx.beginPath(); ctx.moveTo(-138, -40); ctx.bezierCurveTo(-150, -176, 150, -176, 138, -40);
    ctx.bezierCurveTo(146, 50, 136, 120, 100, 140); ctx.quadraticCurveTo(0, 156, -100, 140); ctx.bezierCurveTo(-136, 120, -146, 50, -138, -40); ctx.fill();
    ctx.restore(); ctx.restore(); return;
  }
  ctx.beginPath(); ctx.moveTo(-118, 10); ctx.bezierCurveTo(-136, -110, -76, -176, 0, -174); ctx.bezierCurveTo(76, -176, 136, -110, 118, 10);
  ctx.quadraticCurveTo(100, 80, 40, 92); ctx.quadraticCurveTo(0, 80, -40, 92); ctx.quadraticCurveTo(-100, 80, -118, 10); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// 包みを胸の前で持つ腕(人物の座標系で描く)
function armsHoldBento(ctx, o = {}) {
  const sleeve = o.sleeve || '#c98d86', by = o.y ?? 470, bs = o.s ?? 1.05;
  [-1, 1].forEach(d => {
    ctx.save(); ctx.translate(d * 210, 700); ctx.rotate(d * -0.5);
    rr(ctx, -60, -280, 120, 420, 50); ctx.fillStyle = sleeve; ctx.fill();
    ctx.restore();
  });
  drawBento(ctx, 0, by, bs, { color: o.color });
  [-1, 1].forEach(d => {
    ctx.save(); ctx.translate(d * 150 * bs, by + 30 * bs);
    rr(ctx, -46, -40, 92, 110, 40); ctx.fillStyle = SKIN; ctx.fill();
    ctx.restore();
    fingersFront(ctx, d * 150 * bs - (d > 0 ? 70 : -20), by - 20 * bs, 0.9 * bs, d > 0 ? Math.PI : 0, 2);
  });
}

// ---- 実家の台所:高校生の息子が文句を言う ----
function shotTeenComplain(ctx, lt, o = {}) {
  const h = handheld(lt, 5, 0.8, 3);
  setLight({ side: -1, rim: '255,236,200', rimA: 0.59 });
  const k = o.talk || [0.1, 2.3];
  scene2d(ctx, { zoom: 1.0 + lt * 0.04, x: h.x, y: h.y, rot: h.r, dof: 6 }, c => bgHomeKitchen(c, lt), c => {
    drawPerson(c, { x: 580, y: 1120, s: 1.6, who: 'teen', outfit: 'gakuran', t: lt + 1,
      ex: { ...EX.annoyed, brow: 1, eye: 0.6, smile: -0.6, open: talk(lt, k[0], k[1], 0.5), look: [-0.8, 0.1], noBlink: true }, tilt: -0.05 });
  });
}

// ---- 母がうなずく(包みを持ったまま) ----
// k: [笑顔が消え始め, 目を伏せる, うなずき開始]
function shotMomNod(ctx, lt, o = {}) {
  const k = o.k || [0.15, 0.55, 0.85];
  const h = handheld(lt, 4, 0.7, 5);
  const fadeK = tw(lt, k[0], k[0] + 0.4), downK = tw(lt, k[1], k[1] + 0.4);
  const nodP = seg(lt, k[2], k[2] + 0.6);
  const nod = Math.sin(nodP * Math.PI) * 26 + tw(lt, k[2], k[2] + 0.9) * 8;
  let ex = mixEx(EX.smile, { smile: 0.05, brow: -0.5, eye: 0.85 }, fadeK);
  ex = mixEx(ex, { ...EX.sad, smile: 0.0 }, downK);
  if (o.forced && lt > k[2] + 0.8) ex = mixEx(ex, { ...EX.sad, smile: 0.35 }, tw(lt, k[2] + 0.8, k[2] + 1.2));
  ex.noBlink = lt > k[1];
  setLight({ side: -1, rim: '255,236,200', rimA: 0.59 });
  scene2d(ctx, { zoom: (o.zoom || 1.0) + lt * 0.03, x: h.x, y: h.y, rot: h.r, dof: 7 }, c => (o.bg || bgHomeKitchen)(c, lt), c => {
    drawPerson(c, { x: 540, y: o.y ?? 1060, s: o.s ?? 1.75, who: 'mom', outfit: 'apron', t: lt + 2, ex, nod, tilt: o.pov ? 0 : 0.03,
      afterHead: o.bento === false ? null : x => armsHoldBento(x, { y: 500, s: 1.0 }) });
  });
}

// ---- 居酒屋:おにぎりをかじると、ソーセージ ----
function shotIzakayaBite(ctx, lt, o = {}) {
  const tb = o.biteAt ?? 1.0;
  const h = handheld(lt, 4, 0.9, 7);
  // 口元へ運ぶ→戻すと断面
  const up = tw(lt, tb - 0.35, tb, E.in), down = tw(lt, tb + 0.12, tb + 0.55, E.out);
  const bitten = lt > tb + 0.05;
  const oy = lerp(1050, -300, up) + (bitten ? lerp(-300, 1000, down) - lerp(1050, -300, 1) : 0);
  const os = bitten ? lerp(2.6, 1.8, down) : lerp(1.6, 2.6, up);
  const zoomIn = tw(lt, tb + 0.6, tb + 2.6, E.sine);
  setLight({ side: 1, rim: '255,190,120', rimA: 0.63 });
  camera(ctx, { zoom: 1 + zoomIn * 0.32, x: h.x, y: h.y + zoomIn * 60, rot: h.r }, () => {
    bgIzakaya(ctx, lt, { blur: 14, tableY: 1500 });
    drawBeer(ctx, 860, 1560, 1.0, 0.55);
    drawPlate(ctx, 260, 1640, 190, 60, '#efe9df');
    const ox = 540;
    const sleeve = o.sleeve || '#f2f3f6';
    drawHand(ctx, ox + 120 * os / 1.8, oy + 260 * os / 1.8, 1.1 * os / 1.8, -0.35, { sleeve, curl: 0.6 });
    drawOnigiri(ctx, ox, oy, os, { bite: bitten ? 0.5 : 0, filling: 'sausage', seed: 6 });
    fingersFront(ctx, ox + 150 * os / 1.8, oy + 90 * os / 1.8, 0.95 * os / 1.8, Math.PI - 0.25, 3);
  });
  fgBokeh(ctx, lt, [[40, 1820, 170, '255,160,80', 0.15], [1080, 1480, 120, '255,200,120', 0.12], [990, 230, 90, '255,140,70', 0.14]]);
}

// ---- 吹きこぼれ ----
function shotPotBoil(ctx, lt) {
  setLight({ side: 1, rim: '215,232,255', rimA: 0.56 });
  const sh = lt > 0.3 ? handheld(lt * 6, 10, 1.5, 9) : { x: 0, y: 0, r: 0 };
  camera(ctx, { zoom: 1.05, x: sh.x, y: sh.y, rot: sh.r }, () => {
    bgApartment(ctx, lt);
    drawPerson(ctx, { x: 290, y: 980, s: 1.25, who: 'adult', outfit: 'tee', t: lt, ex: { ...EX.panic, open: 0.5 + 0.2 * Math.sin(lt * 20) }, tilt: 0.06 });
    drawPot(ctx, 680, 1400, 1.15, lerp(0.5, 1, tw(lt, 0, 0.6)), lt + 2);
  });
}

// ---- 目覚ましを止める ----
function shotAlarm(ctx, lt, o = {}) {
  const hit = o.hitAt ?? 0.45;
  const ring = lt < hit ? 1 : 0;
  setLight({ side: 1, rim: '210,228,255', rimA: 0.49 });
  camera(ctx, { zoom: 1.05, x: 0, y: 0 }, () => {
    bgBedroom(ctx, lt);
    // 寝ている人(枕に頭、布団をかぶる)
    ctx.save(); ctx.translate(760, 1150); ctx.rotate(-1.35);
    drawPerson(ctx, { x: 0, y: 0, s: 0.95, who: 'adult', outfit: 'tee', t: lt + 5, ex: lt < hit ? { ...EX.sleepy, eye: 0.05, brow: -0.6, smile: -0.3 } : { ...EX.sleepy, eye: 0.3 } });
    ctx.restore();
    ctx.fillStyle = '#7d8fb3';
    ctx.beginPath(); ctx.moveTo(380, 1210); ctx.bezierCurveTo(600, 1160, 900, 1240, W + 40, 1180); ctx.lineTo(W, H); ctx.lineTo(380, H); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; for (let i = 0; i < 5; i++) ctx.fillRect(380, 1300 + i * 120, 700, 36);
    // サイドテーブルと時計
    ctx.fillStyle = '#6b5544'; ctx.fillRect(60, 1330, 520, 600);
    drawAlarm(ctx, 320, 1130, 0.95, ring, lt * 1.0);
    // 叩く手
    const hp = tw(lt, hit - 0.2, hit, E.in), back = tw(lt, hit + 0.15, hit + 0.5);
    const hy = lerp(500, 900, hp) - back * 60;
    drawHand(ctx, lerp(700, 420, hp), hy, 1.0, Math.PI * 0.82, { sleeve: '#8292a6', curl: 0.1 });
  });
}

// ---- 目の前で電車のドアが閉まる ----
function shotTrainMiss(ctx, lt, o = {}) {
  const close = tw(lt, o.closeAt ?? 0.05, (o.closeAt ?? 0.05) + 0.5);
  const slump = tw(lt, 0.6, 1.0);
  camera(ctx, { zoom: 1.0 + lt * 0.04 }, () => {
    bgPlatform(ctx, lt, close);
    drawPersonBack(ctx, { x: 540, y: 1360 + slump * 20, s: 1.45, who: 'adult', outfit: 'suit', nod: slump * 30, tilt: slump * -0.06 });
  });
}

// ---- 毎日置いてあったお弁当(真上から) ----
function shotBentoDaily(ctx, lt, o = {}) {
  const per = o.per ?? 0.95;
  const n = Math.min(2, Math.floor(lt / per)), l = lt - n * per;
  const cols = [['#3d5a8a', 'rgba(255,255,255,0.85)'], ['#b8433b', 'rgba(255,240,220,0.8)'], ['#4f7a4e', 'rgba(255,255,255,0.8)']];
  const days = ['月曜', '火曜', '水曜'];
  bgTop(ctx, 'wood');
  ctx.fillStyle = '#dcc7a6'; rr(ctx, 180, 620, 720, 680, 30); ctx.fill();
  const inP = tw(l, 0, 0.35, E.out), outP = tw(l, 0.5, 0.85, E.in);
  const placed = l > 0.33;
  const by = 960;
  drawBento(ctx, 540, placed ? by : lerp(-200, by, inP), 1.3, { color: cols[n][0], dot: cols[n][1], rot: 0.05 * (n - 1) });
  // 母の手
  const hy = placed ? lerp(by - 120, -500, outP) : lerp(-320, by - 120, inP);
  drawHand(ctx, 560, hy - 200, 1.15, Math.PI, { sleeve: '#c98d86', curl: 0.35 });
  drawText(ctx, days[n], 150, 300, { size: 64, font: 'klee', weight: 600, style: 'plain', color: 'rgba(60,40,25,0.75)', align: 'left' });
}

// ---- 「いってらっしゃい」と弁当をひったくる手 ----
function shotGrabBento(ctx, lt, o = {}) {
  const g = o.grabAt ?? 1.2;
  const h = handheld(lt, 4, 0.8, 13);
  camera(ctx, { zoom: (o.tight ? 2.2 : 1.0) + lt * 0.02, x: h.x, y: h.y, cy: o.tight ? 1920 : undefined }, () => {
    withFilter(ctx, 'blur(3px)', c => bgHomeKitchen(c, lt, { rays: true }), 'dof');
    const after = tw(lt, g + 0.2, g + 0.8);
    const ex = mixEx({ ...EX.smile, open: talk(lt, 0.4, 1.1, 0.35) }, { smile: 0.2, eye: 0.8, look: [0.8, 0.2], brow: -0.3 }, after);
    drawPerson(ctx, { x: 470, y: o.tight ? 860 : 1000, s: 1.3, who: 'mom', outfit: 'apron', t: lt + 3, ex });
    ctx.fillStyle = '#c3976b'; ctx.fillRect(0, 1420, W, 40);
    ctx.fillStyle = '#e8d7bd'; ctx.fillRect(0, 1460, W, H - 1460);
    const reach = tw(lt, g - 0.35, g, E.out), away = tw(lt, g + 0.05, g + 0.3, E.in);
    const bx = 600 + away * 900;
    drawBento(ctx, bx, 1500 - away * 40, 1.2, { rot: away * 0.4 });
    const hx = lerp(1300, 700, reach) + away * 900;
    drawHand(ctx, hx, 1560, 1.25, -1.45, { sleeve: '#1f2433', curl: reach > 0.9 ? 0.7 : 0.2 });
  });
  speech(ctx, 'いってらっしゃい', 470, 560, lt, 0.35, o.speechEnd ?? 1.9, { size: 60, tail: -40, tailDir: -1 });
}

// ---- カバンに放り込まれる弁当 ----
function shotBagToss(ctx, lt) {
  const land = 0.45;
  const p = tw(lt, 0, land, E.in);
  const bounce = lt > land ? Math.abs(Math.sin((lt - land) * 14)) * Math.exp(-(lt - land) * 7) * 40 : 0;
  const sh = lt > land && lt < land + 0.2 ? (Math.random() - 0.5) * 0 : 0;
  camera(ctx, { zoom: 1.0 + (lt > land ? 0.02 * Math.exp(-(lt - land) * 8) : 0) }, () => {
    bgTop(ctx, 'wood');
    drawBagTop(ctx, 540, 1000, 1.25);
    drawBento(ctx, lerp(760, 600, p), lerp(240, 1040, p) - bounce, lerp(2.0, 1.15, p), { rot: lerp(-0.6, 0.55, p) });
  });
}

// ---- 梅・鮭・ソーセージ ----
function shotThreeFillings(ctx, lt, o = {}) {
  bgTop(ctx, 'cloth');
  const tm = o.times || [0.15, 0.75, 1.35];
  const items = [[290, 820, 'ume', '梅', tm[0]], [790, 820, 'salmon', '鮭', tm[1]], [540, 1330, 'sausage', 'ソーセージ', tm[2]]];
  items.forEach(([x, y, f, label, t0], i) => {
    const p = tw(lt, t0, t0 + 0.35, E.outBack);
    if (p <= 0) return;
    const s = (f === 'sausage' ? 1.12 : 0.95) * p;
    drawOnigiri(ctx, x, y, s, { bite: 0.5, filling: f, seed: i + 2 });
    ctx.save(); ctx.globalAlpha = clamp(p);
    drawText(ctx, label, x, y + 230 * (f === 'sausage' ? 1.1 : 1), { size: f === 'sausage' ? 62 : 56, font: 'maru', style: 'box', bg: f === 'sausage' ? '#d42f3a' : '#fff', color: f === 'sausage' ? '#fff' : '#3a2a20' });
    ctx.restore();
  });
}

// ---- 教室で友達に驚かれる ----
function shotClassroom(ctx, lt) {
  const h = handheld(lt, 4, 0.8, 17);
  const lean = tw(lt, 0.1, 0.4, E.outBack);
  setLight({ side: -1, rim: '255,244,214', rimA: 0.63 });
  camera(ctx, { zoom: 1.02, x: h.x, y: h.y }, () => {
    withFilter(ctx, 'blur(3px)', c => bgClassroom(c, lt), 'dof');
    drawPerson(ctx, { x: 230 + lean * 30, y: 1080, s: 1.05, who: 'friend1', outfit: 'gakuran', t: lt, ex: { ...EX.surprised, open: lt < 1.2 ? 0.7 : 0.3 }, tilt: 0.12 * lean });
    drawPerson(ctx, { x: 850 - lean * 30, y: 1080, s: 1.05, who: 'friend2', outfit: 'gakuran', t: lt + 1, glasses: true, ex: { ...EX.surprised, smile: 0.4, open: 0.4 }, tilt: -0.12 * lean });
    const emb = tw(lt, 0.7, 1.2);
    drawPerson(ctx, { x: 540, y: 1300, s: 1.3, who: 'teen', outfit: 'gakuran', t: lt + 2,
      ex: mixEx({ smile: 0.3, eye: 0.9 }, { blush: 1, smile: -0.25, brow: -0.6, eye: 0.7, look: [0, 0.7], sweat: 0.8 }, emb),
      afterHead: x => { drawHand(x, 230, 560, 0.8, -0.3, { sleeve: '#1f2433', curl: 0.6 }); drawOnigiri(x, 150, 330, 0.8, { bite: 0.5, filling: 'sausage', seed: 9, rot: -0.15 }); fingersFront(x, 190, 380, 0.7, Math.PI - 0.3, 3); } });
  });
  speech(ctx, 'え、ソーセージ！？', 300, 560, lt, 0.2, 1.4, { size: 58, tail: -60, tailDir: -1 });
}

// ---- 居酒屋で涙ぐむ ----
function shotIzakayaTear(ctx, lt, o = {}) {
  const tear = tw(lt, 0.5, 1.6), drop = seg(lt, 1.7, 3.2);
  setLight({ side: 1, rim: '255,175,105', rimA: 0.66 });
  const push = tw(lt, 0, 4, E.sine);
  scene2d(ctx, { zoom: 1.0 + push * 0.16, y: push * 40, bgDepth: 0.3 }, c => bgIzakaya(c, lt, { blur: 16, tableY: 1560 }), ctx => {
    const ex = { smile: lerp(0, -0.1, tear), brow: lerp(-0.2, -0.85, tear), eye: lerp(0.8, 0.72, tear), look: [0, lerp(0.7, 0.3, tear)], tear, drop: drop > 0 ? drop : 0, dropSide: -1, noBlink: lt > 1.4 };
    drawPerson(ctx, { x: 540, y: 1000, s: 1.8, who: 'adult', outfit: 'suit', t: lt + 4, ex,
      afterHead: x => { drawHand(x, 150, 640, 0.85, -0.3, { sleeve: '#f2f3f6', curl: 0.6 }); drawOnigiri(x, 40, 420, 0.8, { bite: 0.5, filling: 'sausage', seed: 6 }); fingersFront(x, 90, 470, 0.75, Math.PI - 0.3, 3); } });
  });
  fgBokeh(ctx, lt, [[-30, 1720, 190, '255,160,80', 0.14], [1100, 560, 150, '255,190,110', 0.12]]);
}

// ---- 手のひらでおにぎりを握る(真上から) ----
// 0-1.2: ご飯にソーセージをのせる / 1.2-3.4: 握る / 3.4-: できあがり
function shotMakeOnigiri(ctx, lt, o = {}) {
  const warm = o.warm ?? tw(lt, 0, 5);
  bgTop(ctx, 'counter', { color: mixColor('#e3e7ea', '#f1e7d8', warm) });
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(255,220,170,${0.25 * warm})`; ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W, 700); ctx.lineTo(0, 1600); ctx.lineTo(0, 600); ctx.fill();
  ctx.restore();
  const cx = 540, cy = 960;
  const sleeve = o.sleeve || '#8292a6';
  const done = lt > 3.5;
  if (done) {
    const p = tw(lt, 3.5, 3.9, E.out);
    drawPlate(ctx, cx, cy + 120, 360, 200, '#ffffff');
    drawOnigiri(ctx, cx, cy + lerp(-40, 0, p), 1.3, { lop: 0.85, seed: 12, nori: lt > 3.9, rot: -0.07 });
    steam(ctx, cx, cy - 100, lt, { n: 8, h: 380, w: 140, r: 40, a: 0.12, per: 2.6 });
    const hp = tw(lt, 3.5, 3.9, E.in);
    drawHand(ctx, lerp(260, -200, hp), lerp(1250, 1700, hp), 1.5, 0.75, { sleeve, curl: 0.5 });
    drawHand(ctx, lerp(820, 1300, hp), lerp(1250, 1700, hp), 1.5, -0.75, { sleeve, curl: 0.5, flip: true });
    return;
  }
  const closeP = tw(lt, 1.15, 1.5);
  const sq = lt > 1.5 ? Math.max(0, Math.sin((lt - 1.5) * Math.PI * 1.45)) : 0;
  // ご飯
  if (closeP < 0.6) {
    fillEll(ctx, cx, cy + 20, 210, 170, 'rgba(0,0,0,0.12)');
    fillEll(ctx, cx, cy, 200, 160, RICE);
    ctx.save(); ell(ctx, cx, cy, 200, 160); ctx.clip(); ctx.translate(cx, cy); riceTexture(ctx, 21, 140); ctx.restore();
    const sp = tw(lt, 0.25, 0.7, E.out);
    if (sp > 0) drawSausage(ctx, cx + 10, lerp(400, cy - 10, sp), 1.2, 0.2);
  }
  if (closeP > 0.3) {
    ctx.save(); ctx.globalAlpha = clamp((closeP - 0.3) / 0.3);
    drawOnigiri(ctx, cx, cy, 1.2 - sq * 0.04, { lop: 0.4 + closeP * 0.45, seed: 12, nori: false, rot: Math.sin(lt * 3) * 0.05 });
    ctx.restore();
  }
  steam(ctx, cx, cy - 40, lt, { n: 12, h: 460, w: 200, r: 46, a: 0.16 * (1 - closeP * 0.4), per: 2.2 });
  const gap = lerp(250, 150, closeP) - sq * 30;
  drawHand(ctx, cx - gap - 40, cy + 230, 1.45, lerp(0.8, 1.05, closeP), { sleeve, curl: 0.25 + closeP * 0.35 });
  drawHand(ctx, cx + gap + 40, cy + 230, 1.45, -lerp(0.8, 1.05, closeP), { sleeve, curl: 0.25 + closeP * 0.35, flip: true });
}

// ---- スマホに母からの通知 ----
function shotPhoneNotif(ctx, lt, o = {}) {
  const at = o.at ?? 0.5;
  const buzz = lt > at && lt < at + 0.35 ? Math.sin(lt * 120) * 5 : 0;
  const h = handheld(lt, 5, 0.7, 19);
  if (o.bg) o.bg(ctx, lt); else bgIzakaya(ctx, lt, { blur: 22, tableY: 1300 });
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
  const px = 540 + h.x + buzz, py = 980 + h.y;
  drawHand(ctx, px - 250, py + 760, 1.5, 0.2, { sleeve: o.sleeve || '#f2f3f6', curl: 0.7 });
  fullPhone(ctx, 1.7, h.r * 3, px, py, (c, w, hh) => {
    phoneWallpaper.time = o.time || '22:14';
    phoneWallpaper(c, w, hh);
    const p = tw(lt, at, at + 0.4, E.outBack);
    if (lt > at) notifBanner(c, w, lerp(-420, 640, p), o.from || '母', o.text || '元気にやってる？\n無理しないでね', clamp(p * 2), 1.35);
  });
  fingersFront(ctx, px + 400, py + 240, 1.3, Math.PI, 3);
}

// ---- チャット(打っては消して、送信) ----
// o = {name, base:[msgs], ops:[...], photoAt, readAt, time}
function shotChat(ctx, lt, o) {
  const st = typingState(lt, o.ops);
  const msgs = (o.base || []).map(m => ({ ...m }));
  if (o.photoAt !== undefined && lt > o.photoAt) msgs.push({ me: true, photo: true, time: o.time || '7:12', pop: tw(lt, o.photoAt, o.photoAt + 0.25, E.outBack), read: o.readAt !== undefined && lt > o.readAt });
  st.sent.forEach(s => { if (s.text) msgs.push({ me: true, text: s.text, time: o.time || '7:12', pop: tw(lt, s.at, s.at + 0.25, E.outBack), read: o.readAt !== undefined && lt > o.readAt }); });
  (o.replies || []).forEach(r => { if (lt > r.at) msgs.push({ me: false, text: r.text, photo: r.photo, time: r.time, pop: tw(lt, r.at, r.at + 0.25, E.outBack) }); });
  const typing = o.ops.some(op => op.type !== undefined && lt >= op.at - 0.4 && lt <= op.at + op.dur + 0.05) || (st.input.length > 0);
  const kbOn = lt > (o.kbFrom ?? 0.6) && (st.sending < 0 || lt < st.sending);
  const z = o.zoom ?? 1;
  camera(ctx, { zoom: z, cy: H * 0.75 }, () => {
    chatUI(ctx, W, H, { name: o.name || '母', avatar: o.avatar, date: o.date, msgs, input: st.input, keyboard: kbOn, keyHit: keyHitAt(lt, typing && kbOn && st.input.length > 0) }, lt);
  });
  if (o.thumb) {
    const k = keyHitAt(lt, typing && kbOn);
    if (k) drawHand(ctx, 300 + k[1] * 160, 1950 + k[0] * 60, 1.2, 0.35, { sleeve: o.sleeve || '#8292a6', curl: 0.8 });
  }
}
