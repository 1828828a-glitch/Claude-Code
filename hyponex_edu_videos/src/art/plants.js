// 植物・鉢・土の描画
import { C, TAU, deg, lerp, clamp, mixColor, rng, ease } from '../engine/core.js';
import { circle, ellipse, paint, leaf, leafPath, rr, glow, sparkle, groundShadow } from '../engine/draw.js';

const INK = '#4A3428';

// 顔つきの植木鉢。y は鉢の底
export function drawPot(ctx, x, y, s, o = {}) {
  const { color = C.terracotta, dark = C.terracottaDark, face = null, t = 0, w = 210, h = 160, shadow = true } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (shadow) groundShadow(ctx, 0, 4, w * 0.62, 22, 0.22);
  const top = -h, rimH = 38;
  // 本体
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, top + rimH - 4);
  ctx.lineTo(w * 0.44, top + rimH - 4);
  ctx.lineTo(w * 0.35, 0);
  ctx.quadraticCurveTo(0, 8, -w * 0.35, 0);
  ctx.closePath();
  paint(ctx, color, INK, 6);
  // ふち
  rr(ctx, -w / 2, top, w, rimH, 12);
  paint(ctx, dark, INK, 6);
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, top + 10);
  ctx.lineTo(-w * 0.1, top + 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.stroke();
  if (face) potFace(ctx, face, 0, top + rimH + (h - rimH) * 0.45, t);
  ctx.restore();
}

export function potFace(ctx, face, cx, cy, t = 0) {
  const ex = 34;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // ほお
  ctx.fillStyle = 'rgba(255,120,120,0.45)';
  ellipse(ctx, -58, 16, 15, 9);
  ctx.fill();
  ellipse(ctx, 58, 16, 15, 9);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 6;
  const eyeDots = () => {
    for (const s of [-1, 1]) {
      ellipse(ctx, s * ex, -4, 7, 9.5);
      ctx.fill();
    }
  };
  switch (face) {
    case 'happy':
    case 'joy':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * ex - 11, 0);
        ctx.quadraticCurveTo(s * ex, -14, s * ex + 11, 0);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-15, 12);
      ctx.quadraticCurveTo(0, 14, 15, 12);
      ctx.quadraticCurveTo(12, 34, 0, 34);
      ctx.quadraticCurveTo(-12, 34, -15, 12);
      ctx.closePath();
      paint(ctx, '#9A3B3A', INK, 4);
      break;
    case 'sad':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * ex - 12, -2);
        ctx.quadraticCurveTo(s * ex, 8, s * ex + 12, -2);
        ctx.stroke();
        // 困り眉
        ctx.beginPath();
        ctx.moveTo(s * ex - s * 12, -26);
        ctx.lineTo(s * ex + s * 10, -18);
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.lineWidth = 6;
      }
      ctx.beginPath();
      ctx.moveTo(-12, 26);
      ctx.quadraticCurveTo(0, 16, 12, 26);
      ctx.stroke();
      break;
    case 'hungry': {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * ex - 12, -2);
        ctx.quadraticCurveTo(s * ex, 8, s * ex + 12, -2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * ex - s * 12, -26);
        ctx.lineTo(s * ex + s * 10, -18);
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.lineWidth = 6;
      }
      const o = 0.5 + 0.5 * Math.sin(t * 7);
      ellipse(ctx, 0, 24, 11, 7 + o * 5);
      paint(ctx, '#8C3A36', INK, 4);
      break;
    }
    case 'surprised':
      for (const s of [-1, 1]) {
        circle(ctx, s * ex, -4, 11);
        paint(ctx, '#FFFFFF', INK, 4);
        circle(ctx, s * ex, -3, 5);
        ctx.fillStyle = INK;
        ctx.fill();
      }
      ellipse(ctx, 0, 24, 9, 12);
      paint(ctx, '#8C3A36', INK, 4);
      break;
    case 'worried':
      eyeDots();
      ctx.beginPath();
      ctx.moveTo(-14, 24);
      ctx.quadraticCurveTo(-7, 17, 0, 24);
      ctx.quadraticCurveTo(7, 31, 14, 24);
      ctx.stroke();
      break;
    case 'sleepy':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * ex - 11, -2);
        ctx.lineTo(s * ex + 11, -2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-8, 24);
      ctx.lineTo(8, 24);
      ctx.stroke();
      break;
    default:
      eyeDots();
      ctx.fillStyle = '#FFFFFF';
      circle(ctx, -ex + 3, -8, 3);
      ctx.fill();
      circle(ctx, ex + 3, -8, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13, 18);
      ctx.quadraticCurveTo(0, 30, 13, 18);
      ctx.strokeStyle = INK;
      ctx.stroke();
  }
  ctx.restore();
}

// 5枚花びらの花
export function flower(ctx, x, y, r, o = {}) {
  const { color = C.pink, center = C.yellow, petals = 5, rot = 0, droop = 0, alpha = 1, lw = 5 } = o;
  if (r <= 0.5) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, 1 - droop * 0.45);
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    ellipse(ctx, r * 0.62, 0, r * 0.58, r * 0.42);
    paint(ctx, color, INK, lw);
    ctx.restore();
  }
  circle(ctx, 0, 0, r * 0.36);
  paint(ctx, center, INK, lw);
  circle(ctx, -r * 0.1, -r * 0.1, r * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  ctx.restore();
}

// パンジー風の花（苗用）
export function pansy(ctx, x, y, r, o = {}) {
  const { upper = '#7B4FC9', lower = '#FFD84A', rot = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const pet = (px, py, rx, ry, a, col) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ellipse(ctx, 0, 0, rx, ry);
    paint(ctx, col, INK, 4.5);
    ctx.restore();
  };
  pet(-r * 0.36, -r * 0.42, r * 0.46, r * 0.56, -0.35, upper);
  pet(r * 0.36, -r * 0.42, r * 0.46, r * 0.56, 0.35, upper);
  pet(-r * 0.52, r * 0.1, r * 0.46, r * 0.42, -0.2, lower);
  pet(r * 0.52, r * 0.1, r * 0.46, r * 0.42, 0.2, lower);
  pet(0, r * 0.42, r * 0.56, r * 0.46, 0, lower);
  // 中心の模様
  ctx.strokeStyle = '#5A2C8A';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.07, r * 0.08);
    ctx.lineTo(i * r * 0.2, r * 0.42);
    ctx.stroke();
  }
  circle(ctx, 0, 0, r * 0.14);
  paint(ctx, '#FFF3B0', INK, 3.5);
  ctx.restore();
}

function quadPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}
function quadTangent(p0, p1, p2, t) {
  return Math.atan2(2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]), 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]));
}

// 鉢植えの草花。y は土の表面。vitality: 0=しおれ 1=元気
export function drawPlant(ctx, x, y, s, o = {}) {
  const {
    vitality = 1, bloom = 1, t = 0, flowerColor = C.pink, height = 250, seed = 2,
    extraFlowers = 2, leafSize = 1, glowAmt = 0,
  } = o;
  const v = clamp(vitality);
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (glowAmt > 0) glow(ctx, 0, -height * 0.55, height * 0.95, '#FFF4A8', 0.65 * glowAmt);
  const sway = Math.sin(t * 1.6 + seed) * 0.035 * (0.3 + v);
  ctx.rotate(sway);
  const H = height * (0.74 + 0.26 * v);
  const bend = (1 - v) * 0.85;
  const p0 = [0, 0];
  const p2 = [bend * H * 0.5, -H * (1 - bend * 0.38)];
  const p1 = [bend * H * 0.12, -H * 0.8];
  const stemCol = mixColor('#9C9444', '#3E9B4C', v);
  const leafCol = mixColor(C.wilt, C.leaf, v);
  const leafCol2 = mixColor('#A69A45', C.leafLight, v);

  // 脇の花茎（右は 60°→-58°、左は -240°→-122° の範囲で補間して、しおれると下を向く）
  const sideTips = [];
  for (let i = 0; i < extraFlowers; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const f = 0.45 + r() * 0.2;
    const base = quadPoint(p0, p1, p2, f);
    const len = H * (0.35 + r() * 0.12);
    const spread = 32 + r() * 14;
    const upA = side > 0 ? -90 + spread : -90 - spread;
    const downA = side > 0 ? 62 : -242;
    const ang = deg(lerp(downA, upA, ease.inOutSine(v)));
    const tip = [base[0] + Math.cos(ang) * len, base[1] + Math.sin(ang) * len];
    const ctrl = [base[0] + Math.cos(ang) * len * 0.3, base[1] - len * 0.35 * v];
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    ctx.quadraticCurveTo(ctrl[0], ctrl[1], tip[0], tip[1]);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = stemCol;
    ctx.lineWidth = 7;
    ctx.stroke();
    sideTips.push({ tip, ang, side });
  }
  // 主茎
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 17;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = stemCol;
  ctx.lineWidth = 10;
  ctx.stroke();

  // 葉（しおれると外向きに垂れ下がる）
  const leafSpots = [0.16, 0.32, 0.48, 0.63, 0.77];
  leafSpots.forEach((f, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const pt = quadPoint(p0, p1, p2, f);
    const upA = side > 0 ? -28 : -152;
    const downA = side > 0 ? 34 : -214;
    const a = deg(lerp(downA, upA, ease.inOutSine(v))) + Math.sin(t * 2 + i) * 0.04 * v;
    const len = (84 - i * 6) * leafSize * (0.8 + 0.2 * v);
    ctx.save();
    ctx.translate(pt[0], pt[1]);
    ctx.rotate(a);
    leaf(ctx, len, len * 0.42, i % 2 ? leafCol : leafCol2, { curl: (1 - v) * 26 * side, lw: 5 });
    ctx.restore();
  });

  // 花
  const headA = quadTangent(p0, p1, p2, 1) + Math.PI / 2;
  const fr = 44 * bloom * (0.72 + 0.28 * v);
  const fcol = mixColor('#C9A7A0', flowerColor, v);
  flower(ctx, p2[0], p2[1], fr, { color: fcol, rot: headA * 0.9 + (1 - v) * 0.6, droop: 1 - v });
  sideTips.forEach((st, i) => {
    flower(ctx, st.tip[0], st.tip[1], fr * 0.72, { color: fcol, rot: (1 - v) * st.side * 1.1 + i, droop: (1 - v) * 0.8 });
  });
  ctx.restore();
  return { top: [x + p2[0] * s, y + p2[1] * s] };
}

// 鉢植え一式（鉢＋土＋草花）。y は鉢の底
export function drawPottedPlant(ctx, x, y, s, o = {}) {
  const { face = null, t = 0, potColor, potDark, potW = 210, potH = 160 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 4, potW * 0.62, 22, 0.22);
  // 土
  ellipse(ctx, 0, -potH + 8, potW * 0.44, 18);
  paint(ctx, C.soil, INK, 6);
  const res = drawPlant(ctx, 0, -potH + 6, 1, o);
  drawPot(ctx, 0, 0, 1, { face, t, color: potColor, dark: potDark, w: potW, h: potH, shadow: false });
  ctx.restore();
  return res;
}

// ポリポットの苗（元肥の回）
export function drawSeedling(ctx, x, y, s, o = {}) {
  const { t = 0, vitality = 1 } = o;
  const v = clamp(vitality);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 4, 120, 18, 0.25);
  // 葉
  const leaves = [
    [-150, 1.0], [-120, 0.9], [-60, 0.95], [-30, 1.0], [-100, 0.8], [-80, 0.85],
  ];
  leaves.forEach(([a, k], i) => {
    const droop = (1 - v) * (a < -90 ? -60 : 60);
    ctx.save();
    ctx.translate(0, -150);
    ctx.rotate(deg(a + droop + Math.sin(t * 1.5 + i) * 2));
    leaf(ctx, 96 * k, 40 * k, i % 2 ? mixColor(C.wilt, C.leaf, v) : mixColor(C.wilt, C.leafLight, v), { lw: 5 });
    ctx.restore();
  });
  // 花
  const fl = [[-58, -250, 40, -0.2, '#7B4FC9'], [52, -262, 42, 0.2, '#E0567A'], [0, -300, 44, 0, '#7B4FC9'], [-10, -214, 34, 0.1, '#F2A93B']];
  fl.forEach(([fx, fy, r, rot, col], i) => {
    const d = (1 - v) * 70;
    ctx.beginPath();
    ctx.moveTo(0, -150);
    ctx.quadraticCurveTo(fx * 0.4, (fy - 150) / 2, fx + (fx > 0 ? d : -d) * 0.5, fy + d);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = C.leafDark;
    ctx.lineWidth = 5;
    ctx.stroke();
    pansy(ctx, fx + (fx > 0 ? d : -d) * 0.5, fy + d, r * (0.8 + 0.2 * v), { upper: col, rot: rot + Math.sin(t * 1.4 + i) * 0.05 + (1 - v) * (fx >= 0 ? 0.8 : -0.8) });
  });
  // ポリポット（黒）
  ctx.beginPath();
  ctx.moveTo(-104, -160);
  ctx.lineTo(104, -160);
  ctx.lineTo(84, 0);
  ctx.quadraticCurveTo(0, 6, -84, 0);
  ctx.closePath();
  paint(ctx, '#34373A', INK, 6);
  rr(ctx, -112, -172, 224, 26, 8);
  paint(ctx, '#45494D', INK, 6);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 36, -140);
    ctx.lineTo(i * 30, -12);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  ctx.restore();
}

// N-P-K 解説用の植物（上から 葉・花と実・根）。groundY は地面の高さ
export function drawNPKPlant(ctx, x, groundY, s, o = {}) {
  const { t = 0, grow = 1, hiN = 0, hiP = 0, hiK = 0, soilW = 560, soilH = 300, rootGrow = 1, showSoil = true } = o;
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(s, s);
  // 土の断面
  if (showSoil) {
    rr(ctx, -soilW / 2, 0, soilW, soilH, 36);
    const g = ctx.createLinearGradient(0, 0, 0, soilH);
    g.addColorStop(0, '#8A5C3C');
    g.addColorStop(1, '#5E3D27');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    const rr2 = rng(5);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = 0; i < 70; i++) {
      circle(ctx, (rr2() - 0.5) * (soilW - 60), 20 + rr2() * (soilH - 40), 3 + rr2() * 5);
      ctx.fill();
    }
    // 地表の草
    ctx.beginPath();
    ctx.moveTo(-soilW / 2 + 20, 0);
    ctx.lineTo(soilW / 2 - 20, 0);
    ctx.strokeStyle = '#6FB54B';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // 根
  if (hiK > 0) glow(ctx, 0, 120, 250, '#FFE36B', 0.75 * hiK);
  const rg = clamp(rootGrow);
  const roots = [
    [[0, 0], [-10, 90], [-70, 200]], [[0, 0], [20, 110], [60, 230]], [[0, 0], [0, 120], [-8, 260]],
    [[-6, 60], [-80, 90], [-170, 150]], [[6, 70], [90, 100], [180, 170]], [[-40, 160], [-110, 190], [-150, 250]],
    [[30, 170], [100, 200], [130, 260]],
  ];
  roots.forEach((pts, i) => {
    const k = clamp(rg * 1.4 - i * 0.08);
    if (k <= 0) return;
    const end = quadPoint(pts[0], pts[1], pts[2], k);
    const mid = quadPoint(pts[0], pts[1], pts[2], k * 0.5);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(lerp(pts[0][0], pts[1][0], k), lerp(pts[0][1], pts[1][1], k), end[0], end[1]);
    ctx.strokeStyle = '#F4E3C3';
    ctx.lineWidth = i < 3 ? 12 : 8;
    ctx.lineCap = 'round';
    ctx.stroke();
    void mid;
  });
  // 茎
  const gH = 560 * ease.outCubic(clamp(grow));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-18, -gH * 0.5, 0, -gH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = '#3E9B4C';
  ctx.lineWidth = 14;
  ctx.stroke();
  // 中段: 花と実
  const midY = -gH * 0.52;
  if (hiP > 0) glow(ctx, 0, midY, 230, '#FFE36B', 0.8 * hiP);
  const pg = clamp((grow - 0.4) / 0.6);
  if (pg > 0) {
    for (const side of [-1, 1]) {
      const bx = side * 118 * pg, by = midY + 10;
      ctx.beginPath();
      ctx.moveTo(0, midY + 40);
      ctx.quadraticCurveTo(side * 60, midY - 10, bx, by);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.strokeStyle = '#3E9B4C';
      ctx.lineWidth = 8;
      ctx.stroke();
      if (side < 0) {
        flower(ctx, bx - 10, by - 12, 44 * pg * (1 + hiP * 0.15), { color: C.yellow, center: '#F29A2E' });
        flower(ctx, bx + 40, by - 58, 30 * pg, { color: C.yellow, center: '#F29A2E', rot: 0.4 });
      } else {
        // トマトの実
        for (const [tx, ty, tr] of [[bx, by + 34, 40], [bx + 44, by + 6, 30]]) {
          circle(ctx, tx, ty, tr * pg * (1 + hiP * 0.12));
          paint(ctx, '#EE4B36', INK, 6);
          circle(ctx, tx - tr * 0.3, ty - tr * 0.3, tr * 0.22 * pg);
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fill();
          ctx.save();
          ctx.translate(tx, ty - tr * pg * 0.9);
          for (let k = 0; k < 5; k++) {
            ctx.rotate(TAU / 5);
            leafPath(ctx, 16 * pg, 6 * pg);
            paint(ctx, '#3E9B4C', INK, 3);
          }
          ctx.restore();
        }
      }
    }
  }
  // 上段: 葉
  const topY = -gH;
  if (hiN > 0) glow(ctx, 0, topY + 30, 260, '#FFE36B', 0.8 * hiN);
  const lg = clamp((grow - 0.2) / 0.8);
  const crown = [[-150, 1.15], [-115, 1.05], [-65, 1.05], [-30, 1.15], [-92, 0.9], [-165, 0.95], [-15, 0.95]];
  crown.forEach(([a, k], i) => {
    ctx.save();
    ctx.translate(0, topY + 40 + (i > 3 ? -10 : 18));
    ctx.rotate(deg(a + Math.sin(t * 1.4 + i) * 3));
    const L = 150 * k * lg * (1 + hiN * 0.1);
    leaf(ctx, L, L * 0.42, i % 2 ? C.leaf : '#5CC064', { lw: 6 });
    ctx.restore();
  });
  // 下段の葉（小さめ）
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(0, -gH * 0.24);
    ctx.rotate(deg(side > 0 ? -20 : -160));
    leaf(ctx, 90 * lg, 36 * lg, C.leafDark, { lw: 5 });
    ctx.restore();
  }
  ctx.restore();
  return {
    leaf: [x, groundY + (topY + 10) * s],
    flower: [x, groundY + midY * s],
    root: [x, groundY + 150 * s],
  };
}

// 土の断面（プランター）。元肥の粒が根のまわりに混ざる様子
export function drawSoilSection(ctx, x, y, w, h, o = {}) {
  const { t = 0, granules = 0, mix = 0, rootGrow = 1, glowAmt = 0, plantV = 1, seed = 21, bloom = 1, plantGrow = 1, plantScale = 1.05 } = o;
  ctx.save();
  ctx.translate(x, y);
  // 植物（上）
  const top = -h / 2;
  if (plantGrow > 0) {
    ctx.save();
    ctx.translate(0, top + 6);
    const g = ease.outBack(clamp(plantGrow), 1.6);
    ctx.scale(g, g);
    drawPlant(ctx, 0, 0, plantScale, { vitality: plantV, bloom, t, flowerColor: C.pink, height: 250, extraFlowers: 2, seed: 4 });
    ctx.restore();
  }
  // 容器
  rr(ctx, -w / 2, top, w, h, 30);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, '#8C5E3E');
  g.addColorStop(1, '#5A3A26');
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, top, w, h);
  const r = rng(seed);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 90; i++) {
    circle(ctx, (r() - 0.5) * w, top + r() * h, 3 + r() * 6);
    ctx.fill();
  }
  // 根
  const rg = clamp(rootGrow) * (plantGrow > 0 ? 1 : 0);
  const roots = [
    [[0, top], [-20, top + 110], [-110, top + 250]], [[0, top], [30, top + 130], [120, top + 270]],
    [[0, top], [0, top + 150], [-10, top + 320]], [[-10, top + 70], [-110, top + 110], [-220, top + 170]],
    [[10, top + 80], [120, top + 120], [230, top + 190]], [[-50, top + 190], [-120, top + 230], [-170, top + 300]],
    [[40, top + 200], [110, top + 240], [150, top + 320]],
  ];
  roots.forEach((pts, i) => {
    const k = clamp(rg * 1.3 - i * 0.06);
    if (k <= 0) return;
    const end = quadPoint(pts[0], pts[1], pts[2], k);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(lerp(pts[0][0], pts[1][0], k), lerp(pts[0][1], pts[1][1], k), end[0], end[1]);
    ctx.strokeStyle = '#F4E3C3';
    ctx.lineWidth = i < 3 ? 12 : 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  });
  // 肥料の粒: 表面に乗った状態(mix=0) → 土全体に混ざった状態(mix=1)
  if (granules > 0) {
    const r2 = rng(seed + 9);
    const n = 46;
    for (let i = 0; i < n; i++) {
      const vis = clamp(granules * n - i);
      if (vis <= 0) continue;
      const sx = (r2() - 0.5) * (w - 90);
      const sy = top + 22 + r2() * 26;
      const mx = (r2() - 0.5) * (w - 80);
      const my = top + 40 + r2() * (h - 90);
      const e = ease.inOutCubic(clamp(mix * 1.2 - (i % 7) * 0.03));
      const gx = lerp(sx, mx, e);
      const gy = lerp(sy, my, e);
      const gr = 10 + (i % 3) * 2;
      if (glowAmt > 0) glow(ctx, gx, gy, gr * 3.2, '#FFF6B0', 0.5 * glowAmt * vis);
      circle(ctx, gx, gy, gr * vis);
      paint(ctx, '#F7F7F2', '#7A6A5A', 3);
      circle(ctx, gx - gr * 0.3, gy - gr * 0.3, gr * 0.3 * vis);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  }
  ctx.restore();
  rr(ctx, -w / 2, top, w, h, 30);
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // プランターのふち
  rr(ctx, -w / 2 - 14, top - 16, w + 28, 34, 14);
  paint(ctx, '#E8E1D2', INK, 6);
  ctx.restore();
}
