// 背景
import { C, W, H, TAU, LAYOUT, lerp, clamp, rng, rgba, ease } from '../engine/core.js';
import { circle, ellipse, paint, rr, leafPath, glow, heart, star } from '../engine/draw.js';
import { shopPack } from './props.js';
import { flower } from './plants.js';
import { FONT } from '../engine/text.js';

const INK = '#4A3428';

function vgrad(ctx, top, bottom, y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

// やわらかい単色系の背景＋模様
export function bgSoft(ctx, t, o = {}) {
  const { top = '#FFF9EC', bottom = '#E7F5E9', pattern = 'dots', pc = 'rgba(0,154,68,0.07)', floor = null, floorY = LAYOUT.groundY } = o;
  ctx.fillStyle = vgrad(ctx, top, bottom);
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (pattern === 'dots') {
    ctx.fillStyle = pc;
    const step = 120;
    const off = (t * 18) % step;
    for (let y = -step; y < H + step; y += step) {
      for (let x = -step; x < W + step; x += step) {
        const odd = Math.round((y + step) / step) % 2;
        circle(ctx, x + off + (odd ? step / 2 : 0), y + off, 14);
        ctx.fill();
      }
    }
  } else if (pattern === 'stripes') {
    ctx.fillStyle = pc;
    const step = 140;
    const off = (t * 30) % (step * 2);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.5);
    for (let x = -2200 + off; x < 2200; x += step * 2) ctx.fillRect(x, -2200, step, 4400);
  } else if (pattern === 'leaves') {
    const r = rng(17);
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      const y = ((r() * H + t * (20 + r() * 20)) % (H + 200)) - 100;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * TAU + t * 0.3 * (r() - 0.5));
      leafPath(ctx, 70 + r() * 40, 28);
      ctx.fillStyle = pc;
      ctx.fill();
      ctx.restore();
    }
  } else if (pattern === 'rays') {
    const cx = o.cx ?? W / 2, cy = o.cy ?? 820;
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.12);
    ctx.fillStyle = pc;
    for (let i = 0; i < 18; i++) {
      ctx.rotate(TAU / 18);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(2400, -190);
      ctx.lineTo(2400, 190);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  if (floor) floorBand(ctx, floorY, floor);
}

// 床・台
export function floorBand(ctx, y, kind = 'wood') {
  ctx.save();
  if (kind === 'wood') {
    ctx.fillStyle = vgrad(ctx, '#EBC592', '#D9A970', y, H);
    ctx.fillRect(0, y, W, H - y);
    ctx.strokeStyle = 'rgba(120,70,30,0.18)';
    ctx.lineWidth = 5;
    for (let yy = y + 90; yy < H; yy += 120) {
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(W, yy);
      ctx.stroke();
    }
    ctx.fillStyle = '#C9935A';
    ctx.fillRect(0, y, W, 16);
  } else if (kind === 'grass') {
    ctx.fillStyle = vgrad(ctx, '#9AD86B', '#63B64E', y, H);
    ctx.fillRect(0, y, W, H - y);
    const r = rng(9);
    ctx.strokeStyle = 'rgba(40,120,50,0.35)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const x = r() * W, yy = y + 30 + r() * (H - y - 40);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x - 8, yy - 22);
      ctx.moveTo(x + 10, yy);
      ctx.lineTo(x + 14, yy - 18);
      ctx.stroke();
    }
    ctx.fillStyle = '#7CC95A';
    ctx.beginPath();
    ctx.moveTo(0, y + 10);
    for (let x = 0; x <= W; x += 40) ctx.quadraticCurveTo(x + 20, y - 14, x + 40, y + 10);
    ctx.lineTo(W, y + 40);
    ctx.lineTo(0, y + 40);
    ctx.fill();
  } else if (kind === 'table') {
    ctx.fillStyle = '#F2D2A4';
    ctx.fillRect(0, y, W, 40);
    ctx.fillStyle = vgrad(ctx, '#D8A66C', '#B98552', y + 40, H);
    ctx.fillRect(0, y + 40, W, H - y - 40);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, y + 6, W, 8);
  } else if (kind === 'tile') {
    ctx.fillStyle = vgrad(ctx, '#EDE6DA', '#D9CFBF', y, H);
    ctx.fillRect(0, y, W, H - y);
    ctx.strokeStyle = 'rgba(120,100,70,0.18)';
    ctx.lineWidth = 4;
    for (let x = -200; x < W + 200; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (x - W / 2) * 0.6, H);
      ctx.stroke();
    }
    for (let yy = y + 70; yy < H; yy += 110) {
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(W, yy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// 室内（窓から日が差す）
export function bgRoom(ctx, t, o = {}) {
  const { floorY = LAYOUT.groundY } = o;
  ctx.fillStyle = vgrad(ctx, '#FFF4DF', '#FFE9C9');
  ctx.fillRect(0, 0, W, H);
  // 壁の模様
  ctx.fillStyle = 'rgba(230,180,120,0.12)';
  for (let x = 0; x < W; x += 90) ctx.fillRect(x, 0, 40, floorY);
  // 窓
  const wx = 600, ww = 400, wh = 500, wy = floorY - 700;
  rr(ctx, wx - 18, wy - 18, ww + 36, wh + 36, 20);
  paint(ctx, '#FFFFFF', INK, 6);
  rr(ctx, wx, wy, ww, wh, 10);
  ctx.fillStyle = vgrad(ctx, '#9FD8FF', '#DDF2FF', wy, wy + wh);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // 窓の外の太陽
  ctx.save();
  rr(ctx, wx, wy, ww, wh, 10);
  ctx.clip();
  glow(ctx, wx + ww - 90, wy + 110, 200, '#FFF6B0', 0.9);
  circle(ctx, wx + ww - 90, wy + 110, 56);
  ctx.fillStyle = '#FFE066';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ellipse(ctx, wx + 110 + Math.sin(t * 0.3) * 20, wy + 170, 80, 30);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(wx + ww / 2 - 8, wy, 16, wh);
  ctx.fillRect(wx, wy + wh / 2 - 8, ww, 16);
  // 差し込む光
  ctx.save();
  ctx.globalAlpha = 0.28 + Math.sin(t * 1.2) * 0.04;
  const g = ctx.createLinearGradient(wx, wy, wx - 380, floorY + 200);
  g.addColorStop(0, 'rgba(255,246,190,0.95)');
  g.addColorStop(1, 'rgba(255,246,190,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(wx, wy + 20);
  ctx.lineTo(wx + ww * 0.5, wy + wh);
  ctx.lineTo(wx - 200, floorY + 260);
  ctx.lineTo(wx - 560, floorY + 160);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // カーテン
  for (const [cx, dir] of [[wx - 40, -1], [wx + ww + 40, 1]]) {
    ctx.beginPath();
    ctx.moveTo(cx - 44, wy - 40);
    ctx.lineTo(cx + 44, wy - 40);
    ctx.quadraticCurveTo(cx + 30 * dir, wy + wh * 0.6, cx + 50 * dir, wy + wh + 40);
    ctx.lineTo(cx - 40 * dir, wy + wh + 40);
    ctx.quadraticCurveTo(cx - 20 * dir, wy + wh * 0.5, cx - 44, wy - 40);
    ctx.closePath();
    paint(ctx, '#FFC7B8', INK, 5);
  }
  floorBand(ctx, floorY, 'wood');
}

// 庭（エンディング用）
export function bgGarden(ctx, t, o = {}) {
  const { floorY = LAYOUT.groundY, flowers = 1 } = o;
  ctx.fillStyle = vgrad(ctx, '#8FD3FF', '#E9F8FF', 0, floorY);
  ctx.fillRect(0, 0, W, floorY + 10);
  // 太陽
  glow(ctx, 880, 700, 300, '#FFF6B0', 0.85);
  ctx.save();
  ctx.translate(880, 700);
  ctx.rotate(t * 0.2);
  ctx.fillStyle = 'rgba(255,240,150,0.35)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(420, -40);
    ctx.lineTo(420, 40);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  circle(ctx, 880, 700, 80);
  ctx.fillStyle = '#FFE066';
  ctx.fill();
  // 雲
  const clouds = [[180, 640, 1], [620, 560, 0.8], [360, 860, 0.7]];
  clouds.forEach(([cx, cy, s], i) => {
    const x = ((cx + t * (14 + i * 6)) % (W + 400)) - 200;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [dx, dy, r] of [[-60, 10, 50], [0, -12, 66], [66, 8, 50], [20, 22, 50]]) {
      circle(ctx, x + dx * s, cy + dy * s, r * s);
      ctx.fill();
    }
  });
  // 丘
  ctx.fillStyle = '#B8E58E';
  ctx.beginPath();
  ctx.moveTo(0, floorY - 150);
  ctx.quadraticCurveTo(300, floorY - 320, 620, floorY - 170);
  ctx.quadraticCurveTo(860, floorY - 60, W, floorY - 200);
  ctx.lineTo(W, floorY + 20);
  ctx.lineTo(0, floorY + 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9AD774';
  ctx.beginPath();
  ctx.moveTo(0, floorY - 60);
  ctx.quadraticCurveTo(420, floorY - 200, W, floorY - 80);
  ctx.lineTo(W, floorY + 20);
  ctx.lineTo(0, floorY + 20);
  ctx.closePath();
  ctx.fill();
  // 柵
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(74,52,40,0.5)';
  ctx.lineWidth = 3;
  for (let x = 10; x < W; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, floorY - 40);
    ctx.lineTo(x, floorY - 150);
    ctx.lineTo(x + 20, floorY - 170);
    ctx.lineTo(x + 40, floorY - 150);
    ctx.lineTo(x + 40, floorY - 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillRect(0, floorY - 130, W, 18);
  ctx.fillRect(0, floorY - 80, W, 18);
  floorBand(ctx, floorY, 'grass');
  // 花壇
  if (flowers > 0) {
    const r = rng(23);
    const cols = [C.pink, C.yellow, '#FF7A59', '#B58CF0', '#FFFFFF', '#FF9FC2'];
    for (let i = 0; i < 14; i++) {
      const x = 40 + i * 76 + r() * 20;
      const y = floorY - 40 + r() * 40;
      const k = clamp(flowers * 1.6 - (i % 5) * 0.12);
      ctx.beginPath();
      ctx.moveTo(x, y + 60);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#3E9B4C';
      ctx.lineWidth = 7;
      ctx.stroke();
      flower(ctx, x, y, 30 * k, { color: cols[i % cols.length], rot: Math.sin(t * 1.5 + i) * 0.1, lw: 4 });
    }
  }
}

// 園芸店の肥料コーナー
export function bgShop(ctx, t, o = {}) {
  const { floorY = 1360, dim = 0, packs = true } = o;
  ctx.fillStyle = vgrad(ctx, '#FFF7E8', '#FBE6C8', 0, floorY);
  ctx.fillRect(0, 0, W, floorY);
  // 看板
  rr(ctx, 250, 520, 580, 110, 24);
  paint(ctx, C.brand, INK, 6);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 64px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('肥料コーナー', 540, 577);
  // 棚
  const sx = 40, sw = W - 80;
  rr(ctx, sx, 660, sw, floorY - 640, 16);
  paint(ctx, '#E9D2AE', INK, 6);
  const shelves = [900, 1120, 1340];
  const r = rng(41);
  const nums = ['6-10-5', '8-8-8', '10-10-10', '3-10-10', '12-6-6', '5-10-5', '7-7-7', '4-8-4', '10-5-5', '6-6-6', '2-10-6', '8-12-8'];
  const cols = ['#E86A5A', '#3E8EDE', '#F2B632', '#58B86F', '#9C6AD6', '#F08A3C', '#4BB5A8', '#E85F8D'];
  let k = 0;
  shelves.forEach((sy, si) => {
    if (packs) {
      let x = sx + 60;
      while (x < sx + sw - 70) {
        const kinds = ['bag', 'bottle', 'box'];
        const kind = kinds[Math.floor(r() * 3)];
        const w = kind === 'bottle' ? 92 + r() * 20 : 120 + r() * 40;
        const h = kind === 'bottle' ? 170 + r() * 20 : 150 + r() * 36;
        if (x + w > sx + sw - 30) break;
        shopPack(ctx, x + w / 2, sy - 10, w, h, { kind, numbers: nums[k % nums.length], color: cols[k % cols.length] });
        x += w + 18;
        k++;
      }
    }
    rr(ctx, sx - 6, sy - 12, sw + 12, 34, 8);
    paint(ctx, '#C99A64', INK, 5);
    // 値札
    for (let px = sx + 100; px < sx + sw - 60; px += 250) {
      rr(ctx, px, sy + 4, 90, 36, 6);
      paint(ctx, '#FFFFFF', INK, 3);
      ctx.fillStyle = C.red;
      ctx.font = `900 22px ${FONT}`;
      ctx.fillText('¥', px + 45, sy + 23);
    }
    void si;
  });
  floorBand(ctx, floorY, 'tile');
  if (dim > 0) {
    ctx.fillStyle = `rgba(20,30,25,${dim})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// 黒板の背景
export function bgClassroom(ctx, t) {
  ctx.fillStyle = vgrad(ctx, '#F4EAD8', '#E9DAC0');
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(160,120,70,0.10)';
  for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 24, H);
  floorBand(ctx, LAYOUT.groundY + 40, 'wood');
}

// 警告（ちょっと待った！）
export function bgAlert(ctx, t, o = {}) {
  const { k = 1, tapes = [470, 1520] } = o;
  const g = ctx.createRadialGradient(W / 2, 820, 50, W / 2, 820, 1300);
  g.addColorStop(0, '#FFF3C4');
  g.addColorStop(1, '#FFB36B');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = k;
  // 注意テープ
  for (const y of tapes) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, W, 70);
    ctx.clip();
    ctx.fillStyle = '#FFD21F';
    ctx.fillRect(0, y, W, 70);
    ctx.fillStyle = '#2B2B2B';
    const off = (t * 80) % 90;
    for (let x = -100 + off; x < W + 100; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 45, y);
      ctx.lineTo(x + 5, y + 70);
      ctx.lineTo(x - 40, y + 70);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
