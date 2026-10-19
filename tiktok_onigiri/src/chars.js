// 人物。顔の中心を原点に、顔幅およそ 220 の単位系で描く
const SKIN = '#f8dcc8', SKIN_SH = '#ecbfa6', SKIN_LINE = '#c98f78';
const INK = '#2b201c';
const HAIRC = { mom: '#4a3328', teen: '#221e1d', adult: '#241f1e', friend1: '#3a3330', friend2: '#3b2b23' };

// シーンの光。side: 光の来る側(-1 左 / 1 右)、rim: 逆光の縁取りの色
const LIGHT = {};
function resetLight() { Object.assign(LIGHT, { side: -1, rim: '255,238,214', rimA: 0.6, shade: 1 }); }
function setLight(o) { Object.assign(LIGHT, o); }
resetLight();

function headPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-108, -30);
  ctx.bezierCurveTo(-110, 58, -62, 128, 0, 134);
  ctx.bezierCurveTo(62, 128, 110, 58, 108, -30);
  ctx.bezierCurveTo(108, -150, -108, -150, -108, -30);
  ctx.closePath();
}

// ---- 髪 ----
function hairFront(who) {
  const p = new Path2D();
  if (who === 'teen' || who === 'adult') {
    const short = who === 'adult';
    p.moveTo(-120, 14);
    p.bezierCurveTo(-138, -100, -78, -176, 2, -174);
    p.bezierCurveTo(84, -176, 140, -96, 120, 14);
    p.quadraticCurveTo(114, -6, 106, -26);
    const tips = short
      ? [[94, -40], [84, -66], [66, -40], [50, -72], [28, -46], [10, -76], [-12, -50], [-30, -78], [-50, -48], [-66, -72], [-84, -44], [-96, -62], [-108, -24]]
      : [[96, -14], [84, -50], [66, -10], [52, -54], [30, -12], [16, -58], [-6, -16], [-22, -56], [-42, -10], [-56, -52], [-76, -6], [-90, -44], [-108, -16]];
    let px = 106, py = -26;
    tips.forEach(([x, y], i) => {
      const down = i % 2 === 0;
      const cx = lerp(px, x, 0.55) + (down ? 4 : -4);
      const cy = down ? lerp(py, y, 0.25) : lerp(py, y, 0.85);
      p.quadraticCurveTo(cx, cy, x, y);
      px = x; py = y;
    });
    p.quadraticCurveTo(-114, -4, -120, 14);
    p.closePath();
  } else if (who === 'mom') {
    p.moveTo(-126, 96);
    p.bezierCurveTo(-146, -10, -128, -160, -14, -168);
    p.bezierCurveTo(96, -172, 146, -80, 128, 96);
    p.quadraticCurveTo(122, 40, 108, 6);
    p.bezierCurveTo(98, -24, 74, -40, 40, -44);
    p.bezierCurveTo(4, -48, -40, -60, -62, -96);
    p.bezierCurveTo(-74, -62, -92, -40, -104, 0);
    p.quadraticCurveTo(-112, 50, -126, 96);
    p.closePath();
  } else if (who === 'friend1') {
    p.moveTo(-112, -6);
    p.bezierCurveTo(-124, -110, -70, -160, 0, -160);
    p.bezierCurveTo(70, -160, 124, -110, 112, -6);
    p.quadraticCurveTo(100, -60, 60, -78);
    p.quadraticCurveTo(0, -92, -60, -78);
    p.quadraticCurveTo(-100, -60, -112, -6);
    p.closePath();
  } else if (who === 'friend2') {
    p.moveTo(-120, 30);
    p.bezierCurveTo(-136, -100, -76, -172, 0, -172);
    p.bezierCurveTo(76, -172, 136, -100, 120, 30);
    p.quadraticCurveTo(108, -20, 82, -42);
    p.quadraticCurveTo(30, -50, 4, -98);
    p.quadraticCurveTo(-26, -50, -82, -42);
    p.quadraticCurveTo(-108, -20, -120, 30);
    p.closePath();
  }
  return p;
}
function hairBackPath(who) {
  const p = new Path2D();
  if (who === 'mom') {
    p.moveTo(-138, -40);
    p.bezierCurveTo(-150, -170, 150, -170, 138, -40);
    p.bezierCurveTo(146, 40, 140, 110, 112, 138);
    p.quadraticCurveTo(90, 150, 72, 128);
    p.lineTo(-72, 128);
    p.quadraticCurveTo(-90, 150, -112, 138);
    p.bezierCurveTo(-140, 110, -146, 40, -138, -40);
  } else {
    p.ellipse(0, -62, 124, 110, 0, 0, TAU);
  }
  return p;
}
function shade(hex, k) {
  // 色を暗く(k<0)/明るく(k>0)
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const m = c.map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
function hairDetail(ctx, who, hf) {
  const base = HAIRC[who];
  ctx.save(); ctx.clip(hf);
  // 毛先側を少し暗く
  ctx.fillStyle = lg(ctx, 0, -170, 0, 60, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.28)']]);
  ctx.fillRect(-160, -200, 320, 320);
  // 影側
  ctx.fillStyle = lg(ctx, -LIGHT.side * 140, 0, LIGHT.side * 40, 0, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(-160, -200, 320, 320);
  // 毛の流れ(毛先へ向かう細い線を少しだけ)
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  const r = rng(who.length * 13);
  for (let i = 0; i < 9; i++) {
    const x1 = (r() - 0.5) * 200, y1 = -60 - r() * 30;
    ctx.beginPath(); ctx.moveTo(x1 * 0.35, -150); ctx.quadraticCurveTo(x1 * 0.8, -120, x1, y1); ctx.stroke();
  }
  // 天使の輪(頭の丸みに沿ったやわらかい光)
  ctx.filter = 'blur(2px)';
  ctx.strokeStyle = `rgba(255,255,255,${who === 'mom' ? 0.22 : 0.17})`; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.ellipse(0, -40, 104, 104, 0, Math.PI * 1.18, Math.PI * 1.62); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255,255,255,${who === 'mom' ? 0.3 : 0.24})`;
  ctx.beginPath(); ctx.ellipse(0, -40, 104, 104, 0, Math.PI * 1.25, Math.PI * 1.45); ctx.stroke();
  ctx.filter = 'none';
  ctx.restore();
  // 輪郭線
  ctx.strokeStyle = shade(base, -0.45); ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.stroke(hf);
}

// ---- 顔パーツ ----
function drawEye(ctx, cx, cy, side, ex, who) {
  const open = clamp(ex.eye ?? 1);
  const isMom = who === 'mom';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (open < 0.13) {
    ctx.strokeStyle = INK; ctx.lineWidth = 6;
    ctx.beginPath();
    if (ex.closed === 'happy') { ctx.moveTo(cx - 19, cy + 6); ctx.quadraticCurveTo(cx, cy - 15, cx + 19, cy + 6); }
    else { ctx.moveTo(cx - 20, cy + 2); ctx.quadraticCurveTo(cx, cy + 13, cx + 20, cy + 2); }
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + side * 20, cy + 2); ctx.lineTo(cx + side * 28, cy - 4); ctx.stroke();
    if (isMom) { ctx.beginPath(); ctx.moveTo(cx + side * 12, cy + 7); ctx.lineTo(cx + side * 16, cy + 14); ctx.stroke(); }
    return;
  }
  const rx = isMom ? 15 : 16, ry = isMom ? 19 : 21;
  const lx = (ex.look ? ex.look[0] : 0) * 5, ly = (ex.look ? ex.look[1] : 0) * 7;
  const lidY = cy - ry - 1 + (1 - open) * ry * 1.7;
  const wet = ex.tear || 0;
  ctx.save();
  ell(ctx, cx, cy, rx + 6, ry + 1); ctx.clip();
  ctx.beginPath(); ctx.rect(cx - 40, lidY, 80, 90); ctx.clip();
  fillEll(ctx, cx, cy, rx + 6, ry + 1, '#fffaf6');
  // 白目に落ちるまぶたの影
  ctx.fillStyle = lg(ctx, 0, lidY, 0, lidY + 16, [[0, 'rgba(170,120,105,0.45)'], [1, 'rgba(170,120,105,0)']]);
  ctx.fillRect(cx - 30, lidY, 60, 16);
  // 虹彩
  const ix = cx + lx, iy = cy + ly;
  ell(ctx, ix, iy, rx, ry);
  ctx.fillStyle = lg(ctx, 0, iy - ry, 0, iy + ry, [[0, '#22160f'], [0.45, '#4a2f22'], [0.8, '#8a5a3a'], [1, '#b98252']]);
  ctx.fill();
  ctx.save(); ell(ctx, ix, iy, rx, ry); ctx.clip();
  fillEll(ctx, ix, iy + ry * 0.62, rx * 0.8, ry * 0.42, 'rgba(232,170,110,0.5)');
  ctx.strokeStyle = 'rgba(30,18,12,0.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 5, iy + 2 + Math.sin(a) * 7); ctx.lineTo(ix + Math.cos(a) * rx, iy + 2 + Math.sin(a) * ry); ctx.stroke(); }
  ctx.fillStyle = lg(ctx, 0, iy - ry, 0, iy - ry + 14, [[0, 'rgba(15,8,5,0.6)'], [1, 'rgba(15,8,5,0)']]);
  ctx.fillRect(ix - rx, iy - ry, rx * 2, 14);
  ctx.restore();
  ctx.strokeStyle = '#1b110c'; ctx.lineWidth = 2.4; ell(ctx, ix, iy, rx, ry); ctx.stroke();
  fillEll(ctx, ix, iy + 2, 7, 10, '#120a07');
  // ハイライト
  fillEll(ctx, ix - 5, iy - 8, 6 + wet * 2, 6.5 + wet * 2, '#ffffff', -0.4);
  fillEll(ctx, ix + 6, iy + 8, 2.8 + wet * 1.5, 2.8 + wet * 1.5, 'rgba(255,255,255,0.92)');
  fillEll(ctx, ix + 7, iy - 11, 1.6, 1.6, 'rgba(255,255,255,0.85)');
  if (wet > 0) {
    ctx.globalAlpha = wet;
    fillEll(ctx, ix, cy + ry - 4, rx + 2, 6, 'rgba(190,230,255,0.85)');
    fillEll(ctx, ix + 3, iy - 1, 3, 3, '#fff');
    fillEll(ctx, ix - 7, iy + 6, 2, 2, '#fff');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 上まぶた(太さに強弱)
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx - side * 22, lidY + 9);
  ctx.quadraticCurveTo(cx, lidY - 7, cx + side * 23, lidY + 4);
  ctx.lineTo(cx + side * 26, lidY + 9);
  ctx.quadraticCurveTo(cx, lidY - 1, cx - side * 22, lidY + 9);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(cx + side * 22, lidY + 5); ctx.lineTo(cx + side * (isMom ? 31 : 28), lidY - (isMom ? 2 : 0)); ctx.stroke();
  // 二重のライン
  ctx.strokeStyle = 'rgba(160,100,85,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - side * 14, lidY - 6); ctx.quadraticCurveTo(cx + side * 4, lidY - 13, cx + side * 20, lidY - 6); ctx.stroke();
  // 下まつげ
  ctx.strokeStyle = 'rgba(80,50,40,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx + side * 4, cy + ry + 1); ctx.quadraticCurveTo(cx + side * 14, cy + ry, cx + side * 20, cy + ry - 5); ctx.stroke();
  if (wet > 0.05) {
    ctx.strokeStyle = `rgba(160,215,250,${wet * 0.9})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 16, cy + ry + 2); ctx.quadraticCurveTo(cx, cy + ry + 7, cx + 16, cy + ry + 2); ctx.stroke();
  }
}
function drawBrow(ctx, side, ex, who) {
  const b = ex.brow || 0, up = (ex.browUp || 0) * 14;
  const inner = -40 + 9 * b - up, outer = -42 - 4 * b - up;
  const col = who === 'mom' ? '#4a3328' : '#241e1c';
  const midY = Math.min(inner, outer) - 8 + Math.max(0, -b) * 4;
  ctx.fillStyle = col;
  const th = who === 'mom' ? 4.5 : 6.5;
  ctx.beginPath();
  ctx.moveTo(side * 22, inner - th * 0.6);
  ctx.quadraticCurveTo(side * 46, midY - th * 0.5, side * 72, outer + 4);
  ctx.quadraticCurveTo(side * 46, midY + th * 0.9, side * 22, inner + th * 0.7);
  ctx.closePath(); ctx.fill();
}
function drawMouth(ctx, ex, who) {
  const sm = ex.smile ?? 0.2, op = clamp(ex.open || 0);
  const y = 84;
  ctx.lineCap = 'round';
  if (op > 0.06) {
    const w = 16 + op * 6, h = 6 + op * 20;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.quadraticCurveTo(0, y - 4 + sm * 4, w, y);
    ctx.quadraticCurveTo(w * 0.9, y + h, 0, y + h * (1 + sm * 0.2));
    ctx.quadraticCurveTo(-w * 0.9, y + h, -w, y);
    ctx.fillStyle = '#6e2826'; ctx.fill();
    ctx.save(); ctx.clip();
    fillEll(ctx, 0, y + h * 1.05, w * 0.7, h * 0.45, '#d9746c');
    ctx.fillStyle = '#fff'; ctx.fillRect(-w * 0.7, y - 4, w * 1.4, 4 + op * 3);
    ctx.restore();
    ctx.strokeStyle = '#8a4636'; ctx.lineWidth = 3; ctx.stroke();
  } else {
    const w = who === 'mom' ? 15 : 17;
    ctx.strokeStyle = '#8a4636'; ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-w, y - sm * 3);
    ctx.quadraticCurveTo(0, y + sm * 13, w, y - sm * 3);
    ctx.stroke();
    // 下唇の影
    ctx.strokeStyle = 'rgba(200,120,105,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-7, y + 11 + sm * 4); ctx.quadraticCurveTo(0, y + 14 + sm * 4, 7, y + 11 + sm * 4); ctx.stroke();
  }
}
function drawFace(ctx, ex, who, t) {
  // 頬の赤み
  const bl = 0.35 + (ex.blush || 0) * 0.6;
  [-1, 1].forEach(s => {
    ctx.fillStyle = rg(ctx, s * 64, 54, 0, 30, [[0, `rgba(245,130,125,${bl * 0.55})`], [1, 'rgba(245,130,125,0)']]);
    ell(ctx, s * 64, 54, 32, 18); ctx.fill();
    if ((ex.blush || 0) > 0.5) {
      ctx.strokeStyle = `rgba(230,110,110,${(ex.blush - 0.5) * 0.9})`; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(s * 52 + k * 9 - 4, 46); ctx.lineTo(s * 52 + k * 9 - 10, 60); ctx.stroke(); }
    }
  });
  const e = { ...ex };
  const bk = blink(t, who.length + (ex.seed || 0));
  e.eye = (ex.eye ?? 1) * (1 - bk * (ex.noBlink ? 0 : 1));
  [-1, 1].forEach(s => { drawBrow(ctx, s, e, who); drawEye(ctx, s * 46, 16, s, e, who); });
  // 鼻(影側に小さな影)
  ctx.strokeStyle = SKIN_LINE; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(3, 44); ctx.quadraticCurveTo(-3, 52, 1, 56); ctx.stroke();
  fillEll(ctx, -LIGHT.side * 8, 56, 7, 4, 'rgba(200,130,110,0.35)');
  drawMouth(ctx, e, who);
  // 涙のしずく
  if (ex.drop > 0) {
    const s = ex.dropSide || 1;
    const p = clamp(ex.drop);
    const y0 = 40, y1 = 40 + 92 * E.out(p);
    ctx.strokeStyle = 'rgba(170,220,250,0.85)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(s * 38, y0); ctx.quadraticCurveTo(s * 46, (y0 + y1) / 2, s * 44, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 37, y0 + 6); ctx.quadraticCurveTo(s * 44, (y0 + y1) / 2, s * 42, y1 - 4); ctx.stroke();
    fillEll(ctx, s * 44, y1 + 4, 6, 8, 'rgba(185,228,255,0.95)');
    fillEll(ctx, s * 42, y1 + 1, 2, 3, '#fff');
  }
  if (ex.sweat > 0) {
    ctx.globalAlpha = clamp(ex.sweat);
    ctx.fillStyle = '#9fd3f5';
    ctx.beginPath(); ctx.moveTo(98, -70); ctx.quadraticCurveTo(118, -36, 106, -26); ctx.quadraticCurveTo(88, -30, 98, -70); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-104, -48); ctx.quadraticCurveTo(-90, -22, -100, -14); ctx.quadraticCurveTo(-114, -20, -104, -48); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; fillEll(ctx, 100, -40, 3, 5, 'rgba(255,255,255,0.8)');
    ctx.globalAlpha = 1;
  }
}

// ---- 体 ----
function bodyPath(ctx, wide = 1) {
  ctx.beginPath();
  ctx.moveTo(-46, 180);
  ctx.bezierCurveTo(-120 * wide, 196, -196 * wide, 214, -222 * wide, 300);
  ctx.lineTo(-262 * wide, 1000);
  ctx.lineTo(262 * wide, 1000);
  ctx.lineTo(222 * wide, 300);
  ctx.bezierCurveTo(196 * wide, 214, 120 * wide, 196, 46, 180);
  ctx.closePath();
}
// 服の陰影と縁取り(体のパスを clip した状態で呼ぶ)
function clothShade(ctx, wide) {
  const sd = -LIGHT.side;
  ctx.fillStyle = lg(ctx, sd * 260 * wide, 0, -sd * 60, 0, [[0, 'rgba(0,0,0,0.32)'], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(-320, 150, 640, 900);
  ctx.fillStyle = lg(ctx, 0, 180, 0, 330, [[0, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(-320, 150, 640, 180);
  // 腕と胴の境目のしわ
  ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(d * 168 * wide, 330); ctx.quadraticCurveTo(d * 182 * wide, 600, d * 176 * wide, 1000); ctx.stroke(); });
}
function drawBody(ctx, p) {
  const o = p.outfit;
  // 首
  ctx.fillStyle = SKIN; ctx.fillRect(-38, 96, 76, 130);
  ctx.fillStyle = SKIN_SH;
  ctx.beginPath(); ctx.moveTo(-40, 96); ctx.quadraticCurveTo(0, 168, 40, 96); ctx.lineTo(40, 140); ctx.quadraticCurveTo(0, 176, -40, 140); ctx.fill();
  ctx.fillStyle = lg(ctx, -LIGHT.side * 38, 0, 0, 0, [[0, 'rgba(210,140,115,0.45)'], [1, 'rgba(210,140,115,0)']]); ctx.fillRect(-38, 96, 76, 130);
  let wide = 1;
  if (o === 'gakuran') {
    wide = 0.96;
    bodyPath(ctx, wide); ctx.fillStyle = '#1f2433'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ell(ctx, -150, 280, 90, 60); ctx.fill(); ell(ctx, 150, 280, 90, 60); ctx.fill();
    clothShade(ctx, wide);
    ctx.strokeStyle = '#141824'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 220); ctx.lineTo(0, 1000); ctx.stroke();
    [300, 410, 520, 630].forEach(y => { fillEll(ctx, 0, y, 11, 11, '#c9a24a'); fillEll(ctx, -3, y - 3, 4, 4, '#f3dc9a'); });
    ctx.restore();
    rr(ctx, -58, 160, 116, 64, 16); ctx.fillStyle = '#171b28'; ctx.fill();
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-50, 166); ctx.lineTo(50, 166); ctx.stroke();
  } else if (o === 'apron' || o === 'cardigan') {
    wide = 0.92;
    const top = o === 'apron' ? '#c98d86' : '#efe4d2';
    bodyPath(ctx, wide); ctx.fillStyle = top; ctx.fill();
    ctx.save(); ctx.clip();
    if (o === 'apron') {
      // ニットの編み目
      ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 3;
      for (let x = -260; x < 260; x += 18) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x, 1000); ctx.stroke(); }
      ctx.fillStyle = '#f4ecdc';
      ctx.beginPath(); ctx.moveTo(-118, 330); ctx.lineTo(118, 330); ctx.lineTo(150, 1000); ctx.lineTo(-150, 1000); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f4ecdc'; ctx.lineWidth = 22;
      ctx.beginPath(); ctx.moveTo(-104, 334); ctx.lineTo(-66, 196); ctx.moveTo(104, 334); ctx.lineTo(66, 196); ctx.stroke();
      ctx.strokeStyle = '#e2d5bd'; ctx.lineWidth = 3; rr(ctx, -60, 430, 120, 90, 10); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,130,100,0.25)'; ctx.lineWidth = 3;
      [[-60, 560, -80, 900], [40, 600, 70, 960]].forEach(([a, b, c2, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c2) / 2 + 10, (b + d) / 2, c2, d); ctx.stroke(); });
    } else {
      ctx.fillStyle = '#86977c';
      ctx.beginPath(); ctx.moveTo(-260, 260); ctx.lineTo(-40, 190); ctx.lineTo(-6, 560); ctx.lineTo(-30, 1000); ctx.lineTo(-280, 1000); ctx.fill();
      ctx.beginPath(); ctx.moveTo(260, 260); ctx.lineTo(40, 190); ctx.lineTo(6, 560); ctx.lineTo(30, 1000); ctx.lineTo(280, 1000); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-40, 190); ctx.lineTo(-6, 560); ctx.lineTo(-30, 1000); ctx.moveTo(40, 190); ctx.lineTo(6, 560); ctx.lineTo(30, 1000); ctx.stroke();
      [600, 700].forEach(y => fillEll(ctx, 16, y, 8, 8, '#e9e1cf'));
    }
    clothShade(ctx, wide);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(0, 186, 52, 22, 0, 0.1, Math.PI - 0.1); ctx.stroke();
  } else if (o === 'suit') {
    bodyPath(ctx, 1); ctx.fillStyle = '#2c3753'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#f5f6f8';
    ctx.beginPath(); ctx.moveTo(-70, 186); ctx.lineTo(70, 186); ctx.lineTo(0, 470); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, 186, 0, 300, [[0, 'rgba(120,130,150,0.35)'], [1, 'rgba(120,130,150,0)']]);
    ctx.beginPath(); ctx.moveTo(-70, 186); ctx.lineTo(70, 186); ctx.lineTo(0, 470); ctx.closePath(); ctx.fill();
    // ゆるめたネクタイ
    ctx.fillStyle = '#7d2a35';
    ctx.beginPath(); ctx.moveTo(-16, 238); ctx.lineTo(18, 236); ctx.lineTo(10, 268); ctx.lineTo(-8, 270); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, 268); ctx.lineTo(10, 266); ctx.lineTo(30, 470); ctx.lineTo(4, 500); ctx.lineTo(-18, 470); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-12, 300 + k * 32); ctx.lineTo(22, 284 + k * 32); ctx.stroke(); }
    ctx.fillStyle = '#e6e8ee';
    ctx.beginPath(); ctx.moveTo(-54, 184); ctx.lineTo(-10, 236); ctx.lineTo(-40, 262); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(54, 184); ctx.lineTo(16, 234); ctx.lineTo(46, 260); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#26304a';
    ctx.beginPath(); ctx.moveTo(-86, 196); ctx.lineTo(-4, 520); ctx.lineTo(-30, 1000); ctx.lineTo(-300, 1000); ctx.lineTo(-240, 260); ctx.fill();
    ctx.beginPath(); ctx.moveTo(86, 196); ctx.lineTo(4, 520); ctx.lineTo(30, 1000); ctx.lineTo(300, 1000); ctx.lineTo(240, 260); ctx.fill();
    ctx.strokeStyle = '#1d2539'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-86, 196); ctx.lineTo(-4, 520); ctx.moveTo(86, 196); ctx.lineTo(4, 520); ctx.stroke();
    clothShade(ctx, 1);
    ctx.restore();
  } else {
    // 部屋着のTシャツ
    wide = 0.98;
    bodyPath(ctx, wide); ctx.fillStyle = p.tee || '#8292a6'; ctx.fill();
    ctx.save(); ctx.clip(); clothShade(ctx, wide); ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(0, 182, 56, 30, 0, 0.05, Math.PI - 0.05); ctx.stroke();
  }
  // 輪郭と逆光
  bodyPath(ctx, wide);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; ctx.stroke();
  rimStroke(ctx, () => bodyPath(ctx, wide), 7, 240);
}
// 光の来る側の縁だけを明るく縁取る(内側に細く、光の側ほど強く)
function rimGrad(ctx, span = 150) {
  return lg(ctx, -LIGHT.side * 30, 0, LIGHT.side * span, 0, [[0, `rgba(${LIGHT.rim},0)`], [1, `rgba(${LIGHT.rim},${LIGHT.rimA})`]]);
}
function rimStroke(ctx, pathFn, wdt = 7, span = 150) {
  if (!LIGHT.rimA) return;
  ctx.save();
  pathFn(); ctx.clip();
  pathFn();
  ctx.strokeStyle = rimGrad(ctx, span); ctx.lineWidth = wdt;
  ctx.filter = 'blur(1px)'; ctx.stroke(); ctx.filter = 'none';
  ctx.restore();
}

// p = {x,y,s, who, outfit, ex, tilt, nod, t, turn}
function drawPerson(ctx, p) {
  const ex = p.ex || {};
  const t = p.t || 0;
  const breath = Math.sin(t * 1.7 + (p.who || '').length) * 2.4;
  ctx.save();
  ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
  if (p.flip) ctx.scale(-1, 1);
  // 壁に落ちるやわらかい影
  if (p.aura !== false) {
    const sd = -LIGHT.side;
    ctx.fillStyle = rg(ctx, sd * 70, 260, 60, 520, [[0, 'rgba(20,10,5,0.22)'], [1, 'rgba(20,10,5,0)']]);
    ctx.fillRect(-700, -400, 1400, 1400);
  }
  ctx.translate(0, breath);
  const head = () => {
    const idle = p.still ? 0 : 1;
    ctx.translate(vnoise(t * 0.35, 3) * 4 * idle, 120 + (p.nod || 0) - breath * 0.4); ctx.rotate((p.tilt || 0) + vnoise(t * 0.4, 7) * 0.018 * idle); ctx.translate(0, -120);
    if (p.turn) ctx.translate(p.turn * 10, 0);
  };
  ctx.save(); head();
  const hb = hairBackPath(p.who);
  ctx.fillStyle = shade(HAIRC[p.who], -0.25); ctx.fill(hb);
  ctx.restore();
  drawBody(ctx, p);
  if (p.beforeHead) p.beforeHead(ctx);
  ctx.save(); head();
  // 耳
  [-1, 1].forEach(s => { fillEll(ctx, s * 106, 12, 18, 26, SKIN); fillEll(ctx, s * 108, 14, 8, 14, SKIN_SH); });
  headPath(ctx); ctx.fillStyle = SKIN; ctx.fill();
  // 顔の陰影(影側にくっきりした影 + やわらかい落ち)
  const sd = -LIGHT.side;
  ctx.save(); headPath(ctx); ctx.clip();
  ctx.fillStyle = 'rgba(232,165,140,0.42)';
  ctx.beginPath();
  ctx.moveTo(sd * 120, -60); ctx.quadraticCurveTo(sd * 76, -10, sd * 84, 50); ctx.quadraticCurveTo(sd * 70, 104, sd * 18, 136); ctx.lineTo(sd * 140, 140); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lg(ctx, 0, 60, 0, 140, [[0, 'rgba(230,160,135,0)'], [1, 'rgba(230,160,135,0.3)']]); ctx.fillRect(-120, 60, 240, 80);
  ctx.restore();
  // 前髪の影
  const hf = hairFront(p.who);
  ctx.save(); headPath(ctx); ctx.clip(); ctx.translate(4, 14); ctx.fillStyle = 'rgba(214,150,125,0.5)'; ctx.fill(hf); ctx.restore();
  headPath(ctx); ctx.strokeStyle = 'rgba(190,120,100,0.75)'; ctx.lineWidth = 3; ctx.stroke();
  rimStroke(ctx, () => headPath(ctx), 5, 110);
  ctx.save(); ctx.translate(p.turn ? p.turn * 6 : 0, 0); drawFace(ctx, ex, p.who, t); ctx.restore();
  ctx.fillStyle = HAIRC[p.who]; ctx.fill(hf);
  hairDetail(ctx, p.who, hf);
  ctx.save(); ctx.clip(hf);
  ctx.strokeStyle = rimGrad(ctx, 130); ctx.globalAlpha = 0.75; ctx.lineWidth = 6; ctx.filter = 'blur(1px)'; ctx.stroke(hf); ctx.filter = 'none';
  ctx.restore();
  if (p.glasses) {
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 5;
    [-1, 1].forEach(s => { rr(ctx, s * 46 - 30, -8, 60, 46, 14); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-16, 10); ctx.lineTo(16, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(s * 46 - 18, 0); ctx.lineTo(s * 46 - 6, -2); ctx.stroke(); });
  }
  ctx.restore();
  if (p.afterHead) p.afterHead(ctx);
  ctx.restore();
}

// 表情プリセット
const EX = {
  neutral: { smile: 0.1 },
  smile: { smile: 0.8, eye: 0.85 },
  bigSmile: { smile: 1, eye: 0.05, closed: 'happy', open: 0.3 },
  annoyed: { brow: 0.7, smile: -0.4, eye: 0.7, look: [-0.6, 0] },
  sad: { brow: -0.9, smile: -0.25, eye: 0.55, look: [0, 0.8] },
  sleepy: { eye: 0.28, brow: -0.2, smile: 0, noBlink: true },
  panic: { brow: -0.7, browUp: 0.8, open: 0.6, smile: -0.3, sweat: 1, eye: 1.05, noBlink: true },
  surprised: { browUp: 1, open: 0.7, smile: 0, eye: 1.05 },
};
function mixEx(a, b, k) {
  const out = { ...a, ...b };
  for (const key of ['smile', 'eye', 'brow', 'browUp', 'open', 'blush', 'tear', 'sweat']) {
    const va = a[key] ?? (key === 'eye' ? 1 : key === 'smile' ? 0.1 : 0);
    const vb = b[key] ?? (key === 'eye' ? 1 : key === 'smile' ? 0.1 : 0);
    out[key] = lerp(va, vb, k);
  }
  const la = a.look || [0, 0], lb = b.look || [0, 0];
  out.look = [lerp(la[0], lb[0], k), lerp(la[1], lb[1], k)];
  out.closed = k < 0.5 ? a.closed : b.closed;
  return out;
}
// 口パク
function talk(t, t0, t1, amt = 0.55) {
  if (t < t0 || t > t1) return 0;
  const v = Math.abs(Math.sin((t - t0) * 17)) * (0.6 + 0.4 * Math.sin((t - t0) * 5.3));
  return v * amt * Math.min(seg(t, t0, t0 + 0.06), 1 - seg(t, t1 - 0.06, t1));
}

// ---- 手 ----
// 手のひら側を下に、指先が上を向く手。x,y=手首、rot=回転
function drawHand(ctx, x, y, s, rot, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * (o.flip ? -1 : 1), s);
  const sleeve = o.sleeve || '#8292a6';
  const line = 'rgba(190,125,105,0.7)';
  // 前腕と袖
  if (!o.noArm) {
    ctx.fillStyle = SKIN; rr(ctx, -46, 0, 92, 520, 40); ctx.fill();
    ctx.fillStyle = lg(ctx, -46, 0, 46, 0, [[0, 'rgba(220,150,125,0.4)'], [0.5, 'rgba(220,150,125,0)']]); rr(ctx, -46, 0, 92, 520, 40); ctx.fill();
    ctx.fillStyle = sleeve; rr(ctx, -64, 120, 128, 700, 34); ctx.fill();
    ctx.fillStyle = lg(ctx, -64, 0, 64, 0, [[0, 'rgba(0,0,0,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(255,255,255,0.08)']]); rr(ctx, -64, 120, 128, 700, 34); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-64, 120, 128, 16);
  }
  const curl = o.curl ?? 0.3;
  // 手のひら
  ctx.fillStyle = SKIN;
  rr(ctx, -62, -128, 124, 150, 52); ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.stroke();
  // 指
  const fingers = [[-44, 70], [-15, 84], [15, 80], [43, 64]];
  fingers.forEach(([fx, len]) => {
    const L = len * (1 - curl * 0.55);
    rr(ctx, fx - 15, -108 - L, 30, L + 30, 15); ctx.fillStyle = SKIN; ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(201,143,120,0.55)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx - 8, -108 - L * 0.45); ctx.lineTo(fx + 8, -108 - L * 0.45); ctx.stroke();
    rr(ctx, fx - 9, -104 - L, 18, 16, 7); ctx.fillStyle = 'rgba(255,228,220,0.95)'; ctx.fill();
  });
  // 親指
  ctx.save(); ctx.translate(-58, -40); ctx.rotate(-0.9 + (o.thumb ?? 0));
  rr(ctx, -16, -86, 34, 100, 17); ctx.fillStyle = SKIN; ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 2.5; ctx.stroke();
  rr(ctx, -8, -82, 18, 16, 7); ctx.fillStyle = 'rgba(255,228,220,0.95)'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(214,150,125,0.25)'; ell(ctx, 0, -40, 50, 40); ctx.fill();
  ctx.restore();
}
