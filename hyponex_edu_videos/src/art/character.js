// キャラクター（全身・ちびキャラ）
//   staff    : 園芸スタッフのお姉さん（緑のエプロン、ボブヘア、葉っぱのヘアピン）
//   beginner : 園芸ビギナーさん（コーラルのパーカー、ポニーテール）
// 原点は足元中央。頭の中心は (0,-475)。
import { C, TAU, deg, lerp, clamp } from '../engine/core.js';
import { circle, ellipse, paint, leafPath, sweat, rr } from '../engine/draw.js';

const INK = '#4A3428';
const SKIN = '#FFE3CF';
const SKIN_SHADE = '#F7C9AE';
const BLUSH = 'rgba(255,128,140,0.5)';

export const LOOKS = {
  staff: {
    hair: '#8B5534', hairDark: '#5E3720', hairHi: '#B07650',
    shirt: '#FFFFFF', shirtShade: '#E6EEF0', sleeve: '#FFFFFF',
    apron: '#1E9E57', apronDark: '#137A40', pants: '#46505E', shoes: '#7B4A2B',
    style: 'bob',
  },
  beginner: {
    hair: '#4E3024', hairDark: '#301B13', hairHi: '#744A38',
    shirt: '#FF8C78', shirtShade: '#EE7462', sleeve: '#FF8C78',
    apron: null, pants: '#5C7FB8', shoes: '#FFFFFF',
    style: 'pony',
  },
};

const HEAD_Y = -475;
const SHOULDER = { x: 84, y: -340 };
const UPPER = 84;
const FORE = 78;

export const POSES = {
  idle: { L: [106, 98, 'fist'], R: [74, 82, 'fist'] },
  hips: { L: [140, 40, 'fist'], R: [40, 140, 'fist'] },
  explain: { L: [106, 98, 'fist'], R: [58, -78, 'up'] },
  pointR: { L: [106, 98, 'fist'], R: [-8, -18, 'point'] },
  pointUpR: { L: [106, 98, 'fist'], R: [-40, -62, 'point'] },
  pointL: { L: [188, 198, 'point'], R: [74, 82, 'fist'] },
  pointDownR: { L: [106, 98, 'fist'], R: [20, 40, 'point'] },
  wave: { L: [106, 98, 'fist'], R: [-25, -85, 'open'] },
  thumbs: { L: [106, 98, 'fist'], R: [62, -72, 'thumb'] },
  crossed: { L: [72, -6, 'hide'], R: [108, 186, 'hide'] },
  think: { L: [72, -6, 'hide'], R: [150, -68, 'fist'] },
  holdR: { L: [106, 98, 'fist'], R: [66, -38, 'hold'] },
  holdUpR: { L: [106, 98, 'fist'], R: [50, -84, 'hold'] },
  present: { L: [118, 150, 'open'], R: [36, -8, 'open'] },
  surprised: { L: [150, -112, 'open'], R: [30, -68, 'open'] },
  cheer: { L: [-130, -104, 'fist'], R: [-50, -76, 'fist'] },
  worry: { L: [118, 38, 'fist'], R: [62, 142, 'fist'] },
  water: { L: [106, 98, 'fist'], R: [8, 12, 'hold'] },
  snap: { L: [106, 98, 'fist'], R: [52, -64, 'snap'] },
  gentle: { L: [110, 60, 'open'], R: [70, 120, 'open'] },
};

function lerpAngle(a, b, t) {
  return a + (b - a) * t;
}

export function mixPose(p1, p2, t) {
  const A = typeof p1 === 'string' ? POSES[p1] : p1;
  const B = typeof p2 === 'string' ? POSES[p2] : p2;
  const side = (s) => [lerpAngle(A[s][0], B[s][0], t), lerpAngle(A[s][1], B[s][1], t), t < 0.5 ? A[s][2] : B[s][2]];
  return { L: side('L'), R: side('R') };
}

function armPoints(side, a1, a2) {
  const sx = side === 'L' ? -SHOULDER.x : SHOULDER.x;
  const sy = SHOULDER.y;
  const r1 = deg(a1), r2 = deg(a2);
  const ex = sx + Math.cos(r1) * UPPER, ey = sy + Math.sin(r1) * UPPER;
  const hx = ex + Math.cos(r2) * FORE, hy = ey + Math.sin(r2) * FORE;
  return { sx, sy, ex, ey, hx, hy, r2 };
}

function drawHand(ctx, x, y, r2, kind, side) {
  const lw = 5;
  if (kind === 'hide') return;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'open') {
    ctx.rotate(r2 - Math.PI / 2);
    // 指
    for (let i = 0; i < 4; i++) {
      const fx = -13 + i * 8.7;
      ellipse(ctx, fx, 22, 5.6, 13, (fx / 60));
      paint(ctx, SKIN, INK, lw);
    }
    ellipse(ctx, 0, 6, 20, 19);
    paint(ctx, SKIN, INK, lw);
    ellipse(ctx, side === 'L' ? 19 : -19, 0, 6, 12, side === 'L' ? -0.7 : 0.7);
    paint(ctx, SKIN, INK, lw);
    for (let i = 0; i < 4; i++) {
      const fx = -13 + i * 8.7;
      ellipse(ctx, fx, 18, 3.2, 8);
      ctx.fillStyle = SKIN;
      ctx.fill();
    }
  } else {
    const fingerDir = kind === 'up' ? -Math.PI / 2 : kind === 'thumb' ? -Math.PI / 2 : r2;
    if (kind === 'point' || kind === 'up') {
      ctx.save();
      ctx.rotate(fingerDir);
      rr(ctx, 4, -7.5, 40, 15, 7.5);
      paint(ctx, SKIN, INK, lw);
      ctx.restore();
    }
    if (kind === 'thumb') {
      rr(ctx, -8, -46, 16, 36, 8);
      paint(ctx, SKIN, INK, lw);
    }
    circle(ctx, 0, 0, 21);
    paint(ctx, SKIN, INK, lw);
    if (kind === 'point' || kind === 'up') {
      ctx.save();
      ctx.rotate(fingerDir);
      ctx.fillStyle = SKIN;
      rr(ctx, 2, -5, 16, 10, 5);
      ctx.fill();
      ctx.restore();
    }
    if (kind === 'thumb') {
      ctx.fillStyle = SKIN;
      rr(ctx, -5.5, -24, 11, 16, 5);
      ctx.fill();
      // 指の線
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(8, 2);
      ctx.moveTo(-10, 10);
      ctx.lineTo(8, 10);
      ctx.strokeStyle = 'rgba(74,52,40,0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (kind === 'snap') {
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 - 0.9 + i * 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32 - 10);
        ctx.lineTo(Math.cos(a) * 52, Math.sin(a) * 52 - 10);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawArm(ctx, side, spec, look, hold) {
  const [a1, a2, hand] = spec;
  const p = armPoints(side, a1, a2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 輪郭
  ctx.strokeStyle = INK;
  ctx.lineWidth = 30 + 10;
  ctx.beginPath();
  ctx.moveTo(p.ex, p.ey);
  ctx.lineTo(p.hx, p.hy);
  ctx.stroke();
  ctx.lineWidth = 42 + 10;
  ctx.beginPath();
  ctx.moveTo(p.sx, p.sy);
  ctx.lineTo(p.ex, p.ey);
  ctx.stroke();
  // 塗り
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.moveTo(p.ex, p.ey);
  ctx.lineTo(p.hx, p.hy);
  ctx.stroke();
  ctx.strokeStyle = look.sleeve;
  ctx.lineWidth = 42;
  ctx.beginPath();
  ctx.moveTo(p.sx, p.sy);
  ctx.lineTo(p.ex, p.ey);
  ctx.stroke();
  // 袖口
  ctx.save();
  ctx.translate(p.ex, p.ey);
  ctx.rotate(deg(a1));
  ctx.fillStyle = look.shirtShade;
  ctx.fillRect(-9, -21, 9, 42);
  ctx.restore();
  if (hold) hold(ctx, p.hx, p.hy, p.r2, side);
  drawHand(ctx, p.hx, p.hy, p.r2, hand, side);
  return p;
}

function drawLegs(ctx, look, walk = 0) {
  const lw = 6;
  for (const sx of [-1, 1]) {
    const x = sx * 34;
    const sw = Math.sin(walk) * 8 * sx;
    rr(ctx, x - 24 + sw, -160, 48, 150, 20);
    paint(ctx, look.pants, INK, lw);
    // 靴
    ellipse(ctx, x + sx * 10 + sw, -12, 38, 20);
    paint(ctx, look.shoes, INK, lw);
    if (look.shoes === '#FFFFFF') {
      ctx.beginPath();
      ctx.moveTo(x + sx * 10 + sw - 28, -8);
      ctx.lineTo(x + sx * 10 + sw + 28, -8);
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  }
}

function torsoPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-60, -372);
  ctx.quadraticCurveTo(-100, -368, -104, -326);
  ctx.lineTo(-92, -150);
  ctx.quadraticCurveTo(-90, -120, -60, -118);
  ctx.lineTo(60, -118);
  ctx.quadraticCurveTo(90, -120, 92, -150);
  ctx.lineTo(104, -326);
  ctx.quadraticCurveTo(100, -368, 60, -372);
  ctx.closePath();
}

function drawTorso(ctx, look) {
  const lw = 6;
  torsoPath(ctx);
  paint(ctx, look.shirt, INK, lw);
  if (look.apron) {
    // エプロン
    ctx.beginPath();
    ctx.moveTo(-56, -318);
    ctx.lineTo(56, -318);
    ctx.quadraticCurveTo(60, -250, 78, -214);
    ctx.lineTo(94, -66);
    ctx.quadraticCurveTo(0, -52, -94, -66);
    ctx.lineTo(-78, -214);
    ctx.quadraticCurveTo(-60, -250, -56, -318);
    ctx.closePath();
    paint(ctx, look.apron, INK, lw);
    // 肩ひも
    ctx.beginPath();
    ctx.moveTo(-50, -318);
    ctx.lineTo(-38, -372);
    ctx.moveTo(50, -318);
    ctx.lineTo(38, -372);
    ctx.strokeStyle = look.apronDark;
    ctx.lineWidth = 12;
    ctx.stroke();
    // 腰ひも
    ctx.beginPath();
    ctx.moveTo(-84, -206);
    ctx.lineTo(84, -206);
    ctx.strokeStyle = look.apronDark;
    ctx.lineWidth = 9;
    ctx.stroke();
    // ポケット
    rr(ctx, -46, -170, 92, 70, 16);
    paint(ctx, look.apronDark, INK, 5);
    // 葉っぱのワッペン
    ctx.save();
    ctx.translate(-10, -128);
    ctx.rotate(-0.6);
    leafPath(ctx, 34, 13);
    paint(ctx, C.yellowGreen, '#FFFFFF', 4);
    ctx.restore();
    ctx.save();
    ctx.translate(-8, -128);
    ctx.rotate(-2.3);
    leafPath(ctx, 26, 10);
    paint(ctx, '#D8EE7A', '#FFFFFF', 4);
    ctx.restore();
    // えり
    ctx.beginPath();
    ctx.moveTo(-34, -374);
    ctx.lineTo(0, -338);
    ctx.lineTo(-10, -376);
    ctx.closePath();
    paint(ctx, '#FFFFFF', INK, 5);
    ctx.beginPath();
    ctx.moveTo(34, -374);
    ctx.lineTo(0, -338);
    ctx.lineTo(10, -376);
    ctx.closePath();
    paint(ctx, '#FFFFFF', INK, 5);
  } else {
    // パーカーのフードとポケット
    ctx.beginPath();
    ctx.moveTo(-62, -374);
    ctx.quadraticCurveTo(0, -318, 62, -374);
    ctx.strokeStyle = look.shirtShade;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, -348);
    ctx.lineTo(-18, -292);
    ctx.moveTo(14, -348);
    ctx.lineTo(18, -292);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-58, -200);
    ctx.lineTo(58, -200);
    ctx.lineTo(70, -140);
    ctx.lineTo(-70, -140);
    ctx.closePath();
    paint(ctx, look.shirtShade, INK, 5);
    // すそのリブ
    ctx.beginPath();
    ctx.moveTo(-90, -132);
    ctx.lineTo(90, -132);
    ctx.strokeStyle = look.shirtShade;
    ctx.lineWidth = 10;
    ctx.stroke();
  }
}

function backHair(ctx, look, t) {
  const lw = 6;
  if (look.style === 'bob') {
    ctx.beginPath();
    ctx.moveTo(-122, -392);
    ctx.bezierCurveTo(-150, -520, -90, -592, 0, -592);
    ctx.bezierCurveTo(90, -592, 150, -520, 122, -392);
    ctx.quadraticCurveTo(128, -366, 106, -360);
    ctx.lineTo(-106, -360);
    ctx.quadraticCurveTo(-128, -366, -122, -392);
    ctx.closePath();
    paint(ctx, look.hair, INK, lw);
  } else {
    // ポニーテール（頭の右後ろで揺れる）
    const sw = Math.sin(t * 3.4) * 0.09;
    ctx.save();
    ctx.translate(62, -566);
    ctx.rotate(sw);
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.bezierCurveTo(90, -84, 150, 10, 116, 100);
    ctx.bezierCurveTo(104, 140, 90, 170, 104, 208);
    ctx.bezierCurveTo(58, 170, 76, 110, 64, 60);
    ctx.bezierCurveTo(56, 26, 30, 10, 0, 12);
    ctx.closePath();
    paint(ctx, look.hair, INK, lw);
    ctx.beginPath();
    ctx.moveTo(40, -30);
    ctx.bezierCurveTo(100, -40, 120, 30, 104, 90);
    ctx.strokeStyle = look.hairHi;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-118, -410);
    ctx.bezierCurveTo(-142, -526, -88, -590, 0, -590);
    ctx.bezierCurveTo(88, -590, 142, -526, 118, -410);
    ctx.quadraticCurveTo(104, -396, 92, -410);
    ctx.lineTo(-92, -410);
    ctx.quadraticCurveTo(-104, -396, -118, -410);
    ctx.closePath();
    paint(ctx, look.hair, INK, lw);
  }
}

function frontHair(ctx, look) {
  const lw = 6;
  if (look.style === 'bob') {
    ctx.beginPath();
    ctx.moveTo(-118, -388);
    ctx.bezierCurveTo(-132, -470, -110, -566, 0, -574);
    ctx.bezierCurveTo(110, -566, 132, -470, 118, -388);
    ctx.quadraticCurveTo(104, -420, 100, -470);
    ctx.quadraticCurveTo(86, -500, 58, -506);
    ctx.quadraticCurveTo(40, -478, 18, -470);
    ctx.quadraticCurveTo(22, -496, 8, -514);
    ctx.quadraticCurveTo(-30, -486, -70, -482);
    ctx.quadraticCurveTo(-92, -478, -100, -458);
    ctx.quadraticCurveTo(-106, -420, -118, -388);
    ctx.closePath();
    paint(ctx, look.hair, INK, lw);
    // ツヤ
    ctx.beginPath();
    ctx.moveTo(-70, -548);
    ctx.quadraticCurveTo(-30, -566, 10, -562);
    ctx.strokeStyle = look.hairHi;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.stroke();
    // 葉っぱのヘアピン
    ctx.save();
    ctx.translate(70, -528);
    ctx.rotate(-0.35);
    leafPath(ctx, 46, 18);
    paint(ctx, C.yellowGreen, INK, 4);
    ctx.rotate(0.9);
    leafPath(ctx, 34, 14);
    paint(ctx, '#7CC36A', INK, 4);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(-114, -408);
    ctx.bezierCurveTo(-130, -490, -100, -576, 0, -580);
    ctx.bezierCurveTo(100, -576, 130, -490, 114, -408);
    ctx.quadraticCurveTo(104, -440, 100, -470);
    ctx.quadraticCurveTo(58, -472, 20, -494);
    ctx.quadraticCurveTo(-8, -508, -28, -534);
    ctx.quadraticCurveTo(-48, -502, -82, -488);
    ctx.quadraticCurveTo(-100, -474, -104, -444);
    ctx.quadraticCurveTo(-108, -422, -114, -408);
    ctx.closePath();
    paint(ctx, look.hair, INK, lw);
    ctx.beginPath();
    ctx.moveTo(-64, -552);
    ctx.quadraticCurveTo(-24, -570, 16, -566);
    ctx.strokeStyle = look.hairHi;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.stroke();
    // シュシュ
    ellipse(ctx, 70, -574, 22, 15, -0.5);
    paint(ctx, C.yellow, INK, 5);
    ctx.beginPath();
    ctx.moveTo(60, -584);
    ctx.lineTo(80, -564);
    ctx.strokeStyle = '#F2B822';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

// 眉（前髪の上に描いて表情を見せる）
function drawBrows(ctx, expr) {
  const e = EXPR[expr] || EXPR.smile;
  const eyeY = -466;
  const ex = 40;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const bx = s * ex, by = eyeY - 38 + (e.browY || 0);
    const tilt = (e.brow || 0) * s; // +: 困り眉（内側が上がる）
    ctx.beginPath();
    ctx.moveTo(bx - 14 * s, by - tilt * 8);
    ctx.quadraticCurveTo(bx, by - 6 - (e.browArch || 0), bx + 14 * s, by + tilt * 8);
    ctx.strokeStyle = 'rgba(255,232,214,0.4)';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = '#4A2C1C';
    ctx.lineWidth = 6;
    ctx.stroke();
  }
}

// 表情
function drawFace(ctx, expr, blink, talk, t) {
  const lw = 5;
  const e = EXPR[expr] || EXPR.smile;
  const eyeY = -466;
  const ex = 40;
  // ほお
  ellipse(ctx, -66, -432, 19, 11);
  ctx.fillStyle = e.blush || BLUSH;
  ctx.fill();
  ellipse(ctx, 66, -432, 19, 11);
  ctx.fill();
  // 目
  const closed = blink > 0.5 && !e.eyes.startsWith('happy');
  for (const s of [-1, 1]) {
    const x = s * ex;
    if (e.eyes === 'happy' || closed) {
      ctx.beginPath();
      if (closed && e.eyes !== 'happy') {
        ctx.moveTo(x - 13, eyeY + 2);
        ctx.quadraticCurveTo(x, eyeY + 8, x + 13, eyeY + 2);
      } else {
        ctx.moveTo(x - 14, eyeY + 6);
        ctx.quadraticCurveTo(x, eyeY - 14, x + 14, eyeY + 6);
      }
      ctx.strokeStyle = '#3A2A22';
      ctx.lineWidth = 6.5;
      ctx.stroke();
    } else if (e.eyes === 'wide') {
      ellipse(ctx, x, eyeY, 15, 19);
      paint(ctx, '#FFFFFF', '#3A2A22', 4.5);
      circle(ctx, x, eyeY + 2, 7.5);
      ctx.fillStyle = '#3A2A22';
      ctx.fill();
    } else if (e.eyes === 'wink' && s === 1) {
      ctx.beginPath();
      ctx.moveTo(x - 13, eyeY - 2);
      ctx.lineTo(x + 12, eyeY + 4);
      ctx.lineTo(x - 13, eyeY + 10);
      ctx.strokeStyle = '#3A2A22';
      ctx.lineWidth = 6;
      ctx.stroke();
    } else if (e.eyes === 'dizzy') {
      ctx.save();
      ctx.translate(x, eyeY);
      ctx.rotate(t * 6 * s);
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const a = i * 0.45, r = i * 0.38;
        if (i === 0) ctx.moveTo(0, 0);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.strokeStyle = '#3A2A22';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    } else {
      const ry = e.eyes === 'half' ? 11 : 18;
      ellipse(ctx, x, eyeY + (e.eyes === 'half' ? 4 : 0), 12.5, ry);
      ctx.fillStyle = '#3A2A22';
      ctx.fill();
      // 瞳のハイライト
      circle(ctx, x + 4, eyeY - 7 + (e.eyes === 'half' ? 5 : 0), 5.2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      circle(ctx, x - 4, eyeY + 7, 2.4);
      ctx.fill();
      if (e.eyes === 'half') {
        // まぶた
        ctx.beginPath();
        ctx.moveTo(x - 16, eyeY - 6);
        ctx.lineTo(x + 16, eyeY - 6);
        ctx.strokeStyle = '#3A2A22';
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      // まつげ
      ctx.beginPath();
      ctx.moveTo(x + s * 11, eyeY - 12);
      ctx.lineTo(x + s * 19, eyeY - 18);
      ctx.strokeStyle = '#3A2A22';
      ctx.lineWidth = 4.5;
      ctx.stroke();
    }
    if (e.sparkle) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#FFFFFF';
      circle(ctx, x - 5, eyeY - 4, 3);
      ctx.fill();
      ctx.restore();
    }
  }
  // 口
  const my = -420;
  const open = clamp((e.mouthOpen || 0) + talk * (e.talkable === false ? 0 : 0.8));
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#6B2F2A';
  ctx.lineCap = 'round';
  switch (e.mouth) {
    case 'o': {
      const r = 9 + open * 5;
      ellipse(ctx, 0, my + 4, r * 0.85, r * 1.1);
      paint(ctx, '#8C3A36', '#6B2F2A', 4);
      break;
    }
    case 'wavy': {
      ctx.beginPath();
      ctx.moveTo(-16, my + 4);
      ctx.quadraticCurveTo(-8, my - 4, 0, my + 4);
      ctx.quadraticCurveTo(8, my + 12, 16, my + 4);
      ctx.stroke();
      break;
    }
    case 'frown': {
      ctx.beginPath();
      ctx.moveTo(-14, my + 8);
      ctx.quadraticCurveTo(0, my - 4, 14, my + 8);
      ctx.stroke();
      break;
    }
    case 'flat': {
      ctx.beginPath();
      ctx.moveTo(-12, my + 4);
      ctx.lineTo(12, my + 2);
      ctx.stroke();
      break;
    }
    case 'side': {
      ctx.beginPath();
      ctx.moveTo(-6, my + 6);
      ctx.quadraticCurveTo(6, my, 18, my + 2);
      ctx.stroke();
      break;
    }
    default: {
      // smile / open
      if (open > 0.08) {
        const h = 6 + open * 20;
        const w = 17 + open * 3;
        ctx.beginPath();
        ctx.moveTo(-w, my - 2);
        ctx.quadraticCurveTo(0, my + 2, w, my - 2);
        ctx.quadraticCurveTo(w * 0.8, my + h, 0, my + h + 2);
        ctx.quadraticCurveTo(-w * 0.8, my + h, -w, my - 2);
        ctx.closePath();
        paint(ctx, '#9A3B3A', '#6B2F2A', 4);
        // 舌
        ctx.save();
        ctx.clip();
        ellipse(ctx, 0, my + h + 2, w * 0.62, h * 0.45);
        ctx.fillStyle = '#FF8C8C';
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.moveTo(-15, my - 2);
        ctx.quadraticCurveTo(0, my + 13, 15, my - 2);
        ctx.stroke();
      }
    }
  }
}

const EXPR = {
  smile: { eyes: 'open', mouth: 'smile', brow: 0 },
  talk: { eyes: 'open', mouth: 'smile', brow: 0 },
  happy: { eyes: 'happy', mouth: 'smile', mouthOpen: 0.7, brow: -0.2, browY: -4 },
  joy: { eyes: 'happy', mouth: 'smile', mouthOpen: 1, brow: -0.3, browY: -6, blush: 'rgba(255,110,130,0.65)' },
  worried: { eyes: 'open', mouth: 'wavy', brow: 1, browY: 2, talkable: false },
  sad: { eyes: 'half', mouth: 'frown', brow: 1, browY: 4, talkable: false },
  surprised: { eyes: 'wide', mouth: 'o', mouthOpen: 0.6, brow: 0, browY: -12, browArch: 4 },
  shock: { eyes: 'wide', mouth: 'o', mouthOpen: 1, brow: 0.6, browY: -14, browArch: 5 },
  puzzled: { eyes: 'open', mouth: 'side', brow: 0.5, browY: -2, talkable: false },
  explain: { eyes: 'open', mouth: 'smile', mouthOpen: 0.25, brow: -0.25, browY: -4 },
  wink: { eyes: 'wink', mouth: 'smile', mouthOpen: 0.5, brow: -0.2 },
  gentle: { eyes: 'happy', mouth: 'smile', mouthOpen: 0.2, brow: 0.35 },
  proud: { eyes: 'half', mouth: 'smile', mouthOpen: 0.3, brow: -0.6, browY: -2 },
  dizzy: { eyes: 'dizzy', mouth: 'wavy', brow: 1, talkable: false },
};

// キャラクター本体
export function drawCharacter(ctx, o) {
  const {
    x = 540, y = 1180, s = 1, kind = 'staff', expr = 'smile', pose = 'idle',
    t = 0, blink = 0, talk = 0, headTilt = 0, lean = 0, bob = 0, squash = 0,
    holdL = null, holdR = null, flip = false, sweatDrop = false, walk = 0, alpha = 1,
  } = o;
  const look = LOOKS[kind];
  const P = typeof pose === 'string' ? POSES[pose] : pose;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y - bob);
  ctx.rotate(lean);
  ctx.scale(s * (flip ? -1 : 1) * (1 + squash * 0.5), s * (1 - squash));
  // 呼吸
  const breathe = Math.sin(t * 2.4) * 3;
  drawLegs(ctx, look, walk);
  ctx.translate(0, breathe * 0.4);
  // 頭の角度
  ctx.save();
  ctx.translate(0, -372);
  ctx.rotate(headTilt);
  ctx.translate(0, 372);
  backHair(ctx, look, t);
  ctx.restore();
  drawTorso(ctx, look);
  ctx.save();
  ctx.translate(0, -372);
  ctx.rotate(headTilt);
  ctx.translate(0, 372 + breathe * 0.3);
  // 首
  rr(ctx, -20, -402, 40, 40, 12);
  paint(ctx, SKIN_SHADE, INK, 5);
  // 耳
  ellipse(ctx, -104, -458, 14, 20);
  paint(ctx, SKIN, INK, 5);
  ellipse(ctx, 104, -458, 14, 20);
  paint(ctx, SKIN, INK, 5);
  // 顔
  ctx.beginPath();
  ctx.ellipse(0, HEAD_Y, 106, 98, 0, 0, TAU);
  paint(ctx, SKIN, INK, 6);
  drawFace(ctx, expr, blink, talk, t);
  frontHair(ctx, look);
  drawBrows(ctx, expr);
  if (sweatDrop) sweat(ctx, 118, -500, 22, t);
  ctx.restore();
  drawArm(ctx, 'L', P.L, look, holdL);
  drawArm(ctx, 'R', P.R, look, holdR);
  ctx.restore();
}

// シルエット（1色で塗りつぶした人物）
let silCanvas = null;
export function drawSilhouette(ctx, o, color = '#2F4F3A') {
  if (!silCanvas) {
    silCanvas = document.createElement('canvas');
    silCanvas.width = 900;
    silCanvas.height = 1100;
  }
  const g = silCanvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 900, 1100);
  drawCharacter(g, { ...o, x: 450, y: 1000, s: 1.4 });
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, 900, 1100);
  g.globalCompositeOperation = 'source-over';
  const k = (o.s || 1) / 1.4;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.drawImage(silCanvas, o.x - 450 * k, o.y - 1000 * k, 900 * k, 1100 * k);
  ctx.restore();
}
