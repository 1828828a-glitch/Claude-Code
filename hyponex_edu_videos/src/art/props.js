// 小物・アイコン類
import { C, TAU, deg, lerp, clamp, rng, ease, rgba } from '../engine/core.js';
import { circle, ellipse, paint, rr, leaf, leafPath, heart, dropShape, star, sparkle, glow, groundShadow } from '../engine/draw.js';
import { FONT, POP, richText } from '../engine/text.js';

const INK = '#4A3428';

// ジョウロ。原点は持ち手。angle で傾ける。戻り値は注ぎ口の先の位置（ワールド座標ではなくローカル）
export function wateringCan(ctx, x, y, s, angle = 0, o = {}) {
  const { color = '#39B7A5', dark = '#25897B' } = o;
  const lx = 236, ly = -10;
  const rose = [x + (Math.cos(angle) * lx - Math.sin(angle) * ly) * s, y + (Math.sin(angle) * lx + Math.cos(angle) * ly) * s];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  // 注ぎ口
  ctx.beginPath();
  ctx.moveTo(70, 70);
  ctx.lineTo(210, -10);
  ctx.lineTo(222, 8);
  ctx.lineTo(84, 104);
  ctx.closePath();
  paint(ctx, color, INK, 6);
  // ハス口
  ctx.save();
  ctx.translate(222, -2);
  ctx.rotate(-0.55);
  rr(ctx, -10, -26, 26, 52, 10);
  paint(ctx, dark, INK, 6);
  ctx.restore();
  // 胴
  rr(ctx, -110, 20, 190, 150, 40);
  paint(ctx, color, INK, 6);
  ctx.beginPath();
  ctx.moveTo(-86, 60);
  ctx.lineTo(-86, 130);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();
  // 取っ手
  ctx.beginPath();
  ctx.moveTo(-70, 26);
  ctx.bezierCurveTo(-60, -40, 40, -40, 50, 26);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.restore();
  return { rose, dir: angle - 0.2 };
}

// 水の流れ（しずくの放物線）。x,y は吹き出し口、dir は向き
export function waterStream(ctx, x, y, t, o = {}) {
  const { n = 22, dir = deg(35), speed = 520, spread = 0.28, gravity = 900, seed = 4, life = 0.55, alpha = 1, floorY = 1e9 } = o;
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) {
    const off = r();
    const a = dir + (r() - 0.5) * spread;
    const sp = speed * (0.85 + r() * 0.3);
    const lt = ((t + off * life) % life);
    const px = x + Math.cos(a) * sp * lt;
    const py = y + Math.sin(a) * sp * lt + 0.5 * gravity * lt * lt;
    if (py > floorY) continue;
    const vy = Math.sin(a) * sp + gravity * lt;
    const vx = Math.cos(a) * sp;
    const ang = Math.atan2(vy, vx);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang - Math.PI / 2);
    ellipse(ctx, 0, 0, 7, 15);
    ctx.fillStyle = 'rgba(92,186,245,0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// コップの水
export function waterGlass(ctx, x, y, s, o = {}) {
  const { level = 0.72, t = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 4, 110, 16, 0.2);
  const glass = () => {
    ctx.beginPath();
    ctx.moveTo(-82, -250);
    ctx.lineTo(82, -250);
    ctx.lineTo(64, -6);
    ctx.quadraticCurveTo(0, 6, -64, -6);
    ctx.closePath();
  };
  glass();
  ctx.fillStyle = 'rgba(230,246,255,0.8)';
  ctx.fill();
  ctx.save();
  glass();
  ctx.clip();
  const wy = -250 + (1 - level) * 244;
  ctx.beginPath();
  ctx.moveTo(-100, wy + Math.sin(t * 3) * 4);
  ctx.quadraticCurveTo(0, wy - 10 + Math.sin(t * 3 + 1) * 4, 100, wy + Math.sin(t * 3 + 2) * 4);
  ctx.lineTo(100, 20);
  ctx.lineTo(-100, 20);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, wy, 0, 0);
  g.addColorStop(0, '#9ED9FF');
  g.addColorStop(1, '#4FB0EE');
  ctx.fillStyle = g;
  ctx.fill();
  const r = rng(3);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 7; i++) {
    const bx = (r() - 0.5) * 90;
    const by = -20 - ((t * 60 + r() * 200) % 170);
    circle(ctx, bx, by, 4 + r() * 4);
    ctx.fill();
  }
  ctx.restore();
  glass();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-54, -220);
  ctx.lineTo(-42, -40);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function steam(ctx, x, y, t, n = 3, h = 110) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * 44;
    const ph = (t * 0.9 + i * 0.33) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const yy = y - ph * 30 - (k / 12) * h;
      const xx = x + ox + Math.sin(k * 0.8 + t * 4 + i) * 12;
      if (k === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ハンバーグのプレート
export function hamburgPlate(ctx, x, y, s, o = {}) {
  const { t = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 30, 250, 36, 0.22);
  ellipse(ctx, 0, 0, 230, 108);
  paint(ctx, '#FFFFFF', INK, 6);
  ellipse(ctx, 0, -4, 196, 86);
  ctx.strokeStyle = '#8EC5E8';
  ctx.lineWidth = 5;
  ctx.stroke();
  // 付け合わせ
  // にんじん
  ctx.save();
  ctx.translate(138, 22);
  ctx.rotate(0.3);
  ctx.beginPath();
  ctx.moveTo(-30, -18);
  ctx.quadraticCurveTo(10, -30, 40, 0);
  ctx.quadraticCurveTo(10, 26, -30, 18);
  ctx.closePath();
  paint(ctx, '#FF9A3C', INK, 5);
  ctx.restore();
  // ブロッコリー
  for (const [bx, by] of [[140, -34], [110, -54]]) {
    rr(ctx, bx - 8, by, 16, 34, 6);
    paint(ctx, '#9BCB6B', INK, 4);
    for (const [dx, dy, r] of [[-14, -2, 16], [12, -4, 16], [0, -16, 17]]) {
      circle(ctx, bx + dx, by + dy, r);
      paint(ctx, '#3FA052', INK, 4);
    }
  }
  // ポテト
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(-150 + i * 16, 10 + (i % 2) * 10);
    ctx.rotate(-0.6 + i * 0.25);
    rr(ctx, -9, -44, 18, 88, 6);
    paint(ctx, '#FFD35C', INK, 4);
    ctx.restore();
  }
  // ハンバーグ
  ellipse(ctx, -6, 8, 118, 64);
  paint(ctx, '#7A4128', INK, 6);
  ctx.beginPath();
  ctx.moveTo(-110, -6);
  ctx.bezierCurveTo(-90, -60, 70, -64, 106, -10);
  ctx.bezierCurveTo(110, 14, 80, 26, 60, 14);
  ctx.bezierCurveTo(40, 34, 0, 18, -20, 30);
  ctx.bezierCurveTo(-50, 40, -70, 18, -110, -6);
  ctx.closePath();
  paint(ctx, '#5A2412', null);
  ctx.beginPath();
  ctx.moveTo(-60, -34);
  ctx.quadraticCurveTo(-10, -50, 40, -40);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.stroke();
  // 目玉焼き
  ctx.beginPath();
  ctx.moveTo(-50, -30);
  ctx.bezierCurveTo(-70, -70, -10, -86, 20, -70);
  ctx.bezierCurveTo(60, -80, 70, -40, 44, -24);
  ctx.bezierCurveTo(20, -8, -30, -6, -50, -30);
  ctx.closePath();
  paint(ctx, '#FFFFFF', INK, 5);
  circle(ctx, 0, -46, 20);
  paint(ctx, '#FFB21E', INK, 5);
  circle(ctx, -6, -52, 6);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  steam(ctx, -10, -110, t, 3, 110);
  ctx.restore();
}

// 焼肉（網の上）
export function yakiniku(ctx, x, y, s, o = {}) {
  const { t = 0, sizzle = true } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 70, 230, 34, 0.22);
  // コンロ
  rr(ctx, -200, 20, 400, 60, 22);
  paint(ctx, '#5A5F66', INK, 6);
  ellipse(ctx, 0, 10, 210, 92);
  paint(ctx, '#3C4046', INK, 6);
  // 炭火
  ctx.save();
  ellipse(ctx, 0, 14, 180, 74);
  ctx.clip();
  const g = ctx.createRadialGradient(0, 30, 10, 0, 30, 190);
  g.addColorStop(0, '#FFB23C');
  g.addColorStop(0.5, '#E2542A');
  g.addColorStop(1, '#6A2A20');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -80, 400, 200);
  // 網
  ctx.strokeStyle = '#BFC5CC';
  ctx.lineWidth = 4;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 24, -90);
    ctx.lineTo(i * 24, 110);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-200, i * 18);
    ctx.lineTo(200, i * 18);
    ctx.stroke();
  }
  ctx.restore();
  // 肉
  const meats = [[-90, -8, -0.3], [10, -22, 0.15], [100, 4, 0.4], [-20, 34, -0.1]];
  meats.forEach(([mx, my, a], i) => {
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-62, -10);
    ctx.bezierCurveTo(-50, -38, 40, -40, 62, -16);
    ctx.bezierCurveTo(74, 6, 50, 32, 10, 30);
    ctx.bezierCurveTo(-30, 34, -72, 18, -62, -10);
    ctx.closePath();
    paint(ctx, i % 2 ? '#8E3B2A' : '#A2452F', INK, 5);
    ctx.strokeStyle = 'rgba(40,15,10,0.55)';
    ctx.lineWidth = 6;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(-40 + k * 30, -22);
      ctx.lineTo(-10 + k * 30, 22);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-40, -18);
    ctx.quadraticCurveTo(0, -30, 36, -20);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  });
  // ピーマン
  ctx.save();
  ctx.translate(150, -40);
  ctx.rotate(0.5);
  ellipse(ctx, 0, 0, 34, 20);
  paint(ctx, '#3DA14A', INK, 5);
  ctx.restore();
  if (sizzle) steam(ctx, 0, -60, t, 3, 120);
  ctx.restore();
}

// ごはん茶碗
export function riceBowl(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 4, 100, 14, 0.2);
  ctx.beginPath();
  ctx.arc(0, -70, 70, -Math.PI, 0);
  ctx.bezierCurveTo(60, -100, -60, -100, -70, -70);
  paint(ctx, '#FFFFFF', INK, 6);
  for (let i = 0; i < 9; i++) {
    ellipse(ctx, -46 + (i % 5) * 23, -94 - Math.floor(i / 5) * 14, 11, 7, (i % 3) * 0.4);
    ctx.strokeStyle = 'rgba(160,160,160,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-74, -70);
  ctx.quadraticCurveTo(-70, 0, 0, 0);
  ctx.quadraticCurveTo(70, 0, 74, -70);
  ctx.closePath();
  paint(ctx, '#3A6FB8', INK, 6);
  ctx.beginPath();
  ctx.moveTo(-58, -48);
  ctx.quadraticCurveTo(0, -30, 58, -48);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

// 栄養ドリンク
export function energyDrink(ctx, x, y, s, o = {}) {
  const { rot = 0, shine = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  if (shine > 0) glow(ctx, 0, -110, 190, '#FFF1A0', 0.8 * shine);
  groundShadow(ctx, 0, 4, 70, 12, 0.2);
  // ビン
  ctx.beginPath();
  ctx.moveTo(-50, -150);
  ctx.quadraticCurveTo(-52, -176, -26, -186);
  ctx.lineTo(-24, -226);
  ctx.lineTo(24, -226);
  ctx.lineTo(26, -186);
  ctx.quadraticCurveTo(52, -176, 50, -150);
  ctx.lineTo(50, -12);
  ctx.quadraticCurveTo(50, 0, 38, 0);
  ctx.lineTo(-38, 0);
  ctx.quadraticCurveTo(-50, 0, -50, -12);
  ctx.closePath();
  const g = ctx.createLinearGradient(-50, 0, 50, 0);
  g.addColorStop(0, '#6E3410');
  g.addColorStop(0.35, '#A5561E');
  g.addColorStop(1, '#5A2A0C');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // キャップ
  rr(ctx, -30, -256, 60, 36, 8);
  paint(ctx, '#F2C23A', INK, 6);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 10, -252);
    ctx.lineTo(i * 10, -224);
    ctx.strokeStyle = 'rgba(120,80,0,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // ラベル
  rr(ctx, -50, -128, 100, 92, 6);
  paint(ctx, '#FFF4D6', INK, 5);
  rr(ctx, -50, -128, 100, 22, 4);
  ctx.fillStyle = '#E8412B';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -100);
  ctx.lineTo(-18, -70);
  ctx.lineTo(0, -70);
  ctx.lineTo(-10, -44);
  ctx.lineTo(20, -78);
  ctx.lineTo(2, -78);
  ctx.closePath();
  paint(ctx, '#FFB21E', INK, 4);
  // つや
  ctx.beginPath();
  ctx.moveTo(-34, -150);
  ctx.lineTo(-34, -20);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

// お弁当
export function bento(ctx, x, y, s, o = {}) {
  const { lid = 0, t = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 8, 260, 30, 0.22);
  // 箱
  rr(ctx, -230, -170, 460, 170, 30);
  paint(ctx, '#D8412F', INK, 7);
  rr(ctx, -212, -156, 424, 142, 20);
  paint(ctx, '#2D2A2A', null);
  // ごはん
  rr(ctx, -204, -150, 200, 130, 16);
  paint(ctx, '#FFFFFF', null);
  const r = rng(8);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  for (let i = 0; i < 16; i++) {
    ellipse(ctx, -190 + r() * 170, -140 + r() * 110, 3, 1.8, r() * 3);
    ctx.fill();
  }
  circle(ctx, -104, -86, 22);
  paint(ctx, '#E0354A', INK, 4);
  circle(ctx, -110, -92, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  // レタスの仕切り
  ctx.beginPath();
  ctx.moveTo(4, -150);
  for (let i = 0; i <= 8; i++) ctx.lineTo(4 + (i % 2 ? 10 : -6), -150 + i * 16);
  ctx.strokeStyle = '#6FC05A';
  ctx.lineWidth = 12;
  ctx.stroke();
  // 唐揚げ
  for (const [kx, ky] of [[54, -110], [100, -120], [74, -70]]) {
    ctx.beginPath();
    ctx.moveTo(kx - 30, ky);
    ctx.bezierCurveTo(kx - 34, ky - 30, kx + 20, ky - 34, kx + 30, ky - 8);
    ctx.bezierCurveTo(kx + 36, ky + 22, kx - 20, ky + 30, kx - 30, ky);
    ctx.closePath();
    paint(ctx, '#C9772E', INK, 4);
    circle(ctx, kx - 6, ky - 10, 7);
    ctx.fillStyle = 'rgba(255,220,150,0.7)';
    ctx.fill();
  }
  // 卵焼き
  for (let i = 0; i < 2; i++) {
    rr(ctx, 136 + i * 34, -150, 32, 62, 8);
    paint(ctx, '#FFD84A', INK, 4);
    ctx.beginPath();
    ctx.arc(152 + i * 34, -118, 9, 0, TAU * 0.8);
    ctx.strokeStyle = '#F0B020';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // ブロッコリー
  for (const [dx, dy, rr2] of [[-12, 0, 18], [12, -4, 17], [0, -16, 18]]) {
    circle(ctx, 176 + dx, -50 + dy, rr2);
    paint(ctx, '#3FA052', INK, 4);
  }
  // タコさんウインナー
  ctx.save();
  ctx.translate(112, -40);
  rr(ctx, -24, -20, 48, 34, 16);
  paint(ctx, '#EF5A4A', INK, 4);
  for (let i = 0; i < 4; i++) {
    rr(ctx, -22 + i * 12, 8, 9, 20, 4);
    paint(ctx, '#EF5A4A', INK, 3);
  }
  circle(ctx, -8, -6, 3);
  circle(ctx, 8, -6, 3);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  // ふろしきで包んだ状態（lid=0）→ ほどけて中身が見える（lid=1）
  if (lid < 1) {
    ctx.save();
    const ly = lerp(0, -260, ease.inCubic(lid));
    ctx.translate(0, ly);
    ctx.globalAlpha *= 1 - clamp(lid * 1.4 - 0.2);
    // 布
    ctx.beginPath();
    ctx.moveTo(-250, -40);
    ctx.quadraticCurveTo(-262, -188, -120, -190);
    ctx.lineTo(120, -190);
    ctx.quadraticCurveTo(262, -188, 250, -40);
    ctx.quadraticCurveTo(254, 16, 200, 16);
    ctx.lineTo(-200, 16);
    ctx.quadraticCurveTo(-254, 16, -250, -40);
    ctx.closePath();
    paint(ctx, '#2E9E57', INK, 7);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let yy = -200; yy < 30; yy += 44) {
      for (let xx = -260; xx < 270; xx += 52) {
        const off = (Math.round((yy + 200) / 44) % 2) * 26;
        circle(ctx, xx + off, yy, 7);
        ctx.fill();
      }
    }
    ctx.restore();
    // しわ
    ctx.strokeStyle = 'rgba(20,70,40,0.35)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 40, -176);
      ctx.quadraticCurveTo(sx * 110, -110, sx * 200, -60);
      ctx.stroke();
    }
    // 結び目
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * 36, -196);
      ctx.rotate(sx * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(sx * 70, -70, sx * 96, -18);
      ctx.quadraticCurveTo(sx * 60, 20, 0, 0);
      ctx.closePath();
      paint(ctx, '#2E9E57', INK, 6);
      ctx.restore();
    }
    ellipse(ctx, 0, -192, 34, 26);
    paint(ctx, '#26884A', INK, 6);
    ctx.restore();
  }
  ctx.restore();
}

// 肥料の袋（汎用。商品ではない）
export function fertBag(ctx, x, y, s, o = {}) {
  const { label = '肥料', color = '#E9D8B4', band = C.brand, numbers = null, rot = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-100, -250);
  ctx.lineTo(100, -250);
  ctx.lineTo(112, -20);
  ctx.quadraticCurveTo(112, 0, 90, 0);
  ctx.lineTo(-90, 0);
  ctx.quadraticCurveTo(-112, 0, -112, -20);
  ctx.closePath();
  paint(ctx, color, INK, 6);
  // 上部の折り返し
  ctx.beginPath();
  ctx.moveTo(-100, -250);
  for (let i = 0; i <= 10; i++) ctx.lineTo(-100 + i * 20, -250 + (i % 2 ? -10 : 0));
  ctx.lineTo(100, -226);
  ctx.lineTo(-100, -226);
  ctx.closePath();
  paint(ctx, '#D4BF94', INK, 5);
  rr(ctx, -84, -186, 168, 112, 16);
  paint(ctx, band, INK, 5);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 60px ${FONT}`;
  ctx.fillText(label, 0, -128);
  if (numbers) {
    ctx.fillStyle = INK;
    ctx.font = `900 40px ${FONT}`;
    ctx.fillText(numbers, 0, -40);
  } else {
    ctx.save();
    ctx.translate(-30, -44);
    ctx.rotate(-0.5);
    leafPath(ctx, 60, 22);
    paint(ctx, C.leaf, INK, 4);
    ctx.restore();
  }
  ctx.restore();
}

// 店頭の肥料パッケージ（汎用）
export function shopPack(ctx, x, y, w, h, o = {}) {
  const { color = '#4DB36B', numbers = '8-8-8', kind = 'bag', label = '' } = o;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'bottle') {
    rr(ctx, -w * 0.22, -h, w * 0.44, h * 0.14, 6);
    paint(ctx, '#FFFFFF', INK, 4);
    rr(ctx, -w / 2, -h * 0.88, w, h * 0.88, 16);
    paint(ctx, '#FFFFFF', INK, 4);
    rr(ctx, -w / 2 + 4, -h * 0.62, w - 8, h * 0.36, 6);
    ctx.fillStyle = color;
    ctx.fill();
  } else if (kind === 'box') {
    rr(ctx, -w / 2, -h, w, h, 8);
    paint(ctx, color, INK, 4);
    rr(ctx, -w / 2 + 8, -h * 0.66, w - 16, h * 0.34, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h);
    ctx.lineTo(w / 2, -h);
    ctx.lineTo(w / 2 + 6, -8);
    ctx.quadraticCurveTo(w / 2 + 6, 0, w / 2 - 6, 0);
    ctx.lineTo(-w / 2 + 6, 0);
    ctx.quadraticCurveTo(-w / 2 - 6, 0, -w / 2 - 6, -8);
    ctx.closePath();
    paint(ctx, color, INK, 4);
    rr(ctx, -w / 2 + 8, -h * 0.62, w - 16, h * 0.34, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fs = Math.min(w * 0.26, 36);
  ctx.font = `900 ${fs}px ${FONT}`;
  const mw = ctx.measureText(numbers).width;
  if (mw > w - 22) {
    fs *= (w - 22) / mw;
    ctx.font = `900 ${fs}px ${FONT}`;
  }
  ctx.fillText(numbers, 0, kind === 'bottle' ? -h * 0.44 : -h * 0.45);
  if (label) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${fs * 0.8}px ${FONT}`;
    ctx.fillText(label, 0, -h * 0.82);
  }
  ctx.restore();
}

// 計量スコップ
export function scoop(ctx, x, y, s, angle = 0, o = {}) {
  const { fill = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  rr(ctx, -150, -14, 110, 28, 12);
  paint(ctx, '#8FD16A', INK, 5);
  ctx.beginPath();
  ctx.moveTo(-44, -40);
  ctx.lineTo(60, -40);
  ctx.quadraticCurveTo(70, 34, 8, 40);
  ctx.quadraticCurveTo(-44, 40, -44, -40);
  ctx.closePath();
  paint(ctx, '#B8E27A', INK, 5);
  if (fill > 0) {
    for (let i = 0; i < 9 * fill; i++) {
      circle(ctx, -26 + (i % 5) * 16, -40 - Math.floor(i / 5) * 12, 9);
      paint(ctx, '#F7F7F2', '#7A6A5A', 2.5);
    }
  }
  ctx.restore();
}

// 移植ごて
export function trowel(ctx, x, y, s, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  rr(ctx, -16, -170, 32, 100, 14);
  paint(ctx, '#C98A4B', INK, 5);
  rr(ctx, -6, -76, 12, 30, 4);
  paint(ctx, '#9AA3AB', INK, 4);
  ctx.beginPath();
  ctx.moveTo(-36, -50);
  ctx.lineTo(36, -50);
  ctx.quadraticCurveTo(40, 20, 0, 70);
  ctx.quadraticCurveTo(-40, 20, -36, -50);
  ctx.closePath();
  paint(ctx, '#C9D1D8', INK, 5);
  ctx.beginPath();
  ctx.moveTo(-14, -34);
  ctx.lineTo(-10, 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

// 落ちてくる肥料の粒（パラパラ）
export function granuleRain(ctx, x, y, t, o = {}) {
  const { n = 26, width = 70, fall = 240, dur = 0.8, seed = 12, amount = 1 } = o;
  const r = rng(seed);
  for (let i = 0; i < n * amount; i++) {
    const off = r() * dur;
    const lt = (t + off) % dur;
    const p = lt / dur;
    const gx = x + (r() - 0.5) * width + (r() - 0.5) * 30 * p;
    const gy = y + fall * p * p;
    circle(ctx, gx, gy, 8 + r() * 3);
    paint(ctx, '#F7F7F2', '#7A6A5A', 2.5);
  }
}

// 商品を置く台
export function podium(ctx, x, y, w, o = {}) {
  const { top = C.brand, side = C.brandDark, h = 70 } = o;
  ctx.save();
  ctx.translate(x, y);
  groundShadow(ctx, 0, h + 10, w * 0.62, 30, 0.2);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, h);
  ctx.ellipse(0, h, w / 2, w * 0.13, 0, Math.PI, 0, true);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  paint(ctx, side, INK, 6);
  ellipse(ctx, 0, 0, w / 2, w * 0.13);
  paint(ctx, top, INK, 6);
  ellipse(ctx, 0, 0, w / 2 - 22, w * 0.13 - 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

// 台の前面だけ（商品の下端を隠すため、商品のあとに描く）
export function podiumFront(ctx, x, y, w, o = {}) {
  const { side = C.brandDark, h = 70, lip = 36 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, w * 0.13, 0, 0, Math.PI);
  ctx.lineTo(-w / 2, 0);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.restore();
  // 手前にせり出す帯
  ctx.beginPath();
  ctx.moveTo(-w / 2, -lip + 30);
  ctx.ellipse(0, -lip + 30, w / 2, w * 0.13, 0, Math.PI, 0, true);
  ctx.lineTo(w / 2, h);
  ctx.ellipse(0, h, w / 2, w * 0.13, 0, 0, Math.PI);
  ctx.closePath();
  paint(ctx, side, INK, 6);
  ctx.beginPath();
  ctx.ellipse(0, -lip + 30, w / 2, w * 0.13, 0, 0, Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

// カレンダー（約1年）
export function calendarIcon(ctx, x, y, s, o = {}) {
  const { text = '約1年', color = C.red } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  rr(ctx, -80, -70, 160, 150, 20);
  paint(ctx, '#FFFFFF', INK, 6);
  rr(ctx, -80, -70, 160, 46, 20);
  paint(ctx, color, INK, 6);
  for (const rx of [-40, 40]) {
    rr(ctx, rx - 7, -90, 14, 36, 7);
    paint(ctx, '#9AA3AB', INK, 4);
  }
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText(text, 0, 28);
  ctx.restore();
}

// 太陽アイコン
export function sunIcon(ctx, x, y, r, t = 0, o = {}) {
  const { face = true } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.4);
  for (let i = 0; i < 10; i++) {
    ctx.rotate(TAU / 10);
    rr(ctx, r * 1.12, -r * 0.1, r * 0.42, r * 0.2, r * 0.1);
    paint(ctx, '#FFB82E', INK, 4);
  }
  ctx.restore();
  circle(ctx, x, y, r);
  paint(ctx, '#FFD23F', INK, 5);
  if (face) {
    ctx.fillStyle = INK;
    circle(ctx, x - r * 0.32, y - r * 0.08, r * 0.1);
    ctx.fill();
    circle(ctx, x + r * 0.32, y - r * 0.08, r * 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + r * 0.1, r * 0.25, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

// 水滴アイコン
export function dropIcon(ctx, x, y, r) {
  dropShape(ctx, x, y, r);
  paint(ctx, '#5CB8F2', INK, 5);
  ellipse(ctx, x - r * 0.22, y + r * 0.25, r * 0.12, r * 0.22, 0.3);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

// 電球（ひらめき）
export function bulb(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  glow(ctx, 0, -10, 110, '#FFF3A0', 0.9);
  ctx.strokeStyle = '#FFC21E';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42;
    const k = 1 + Math.sin(t * 10 + i) * 0.08;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 64, Math.sin(a) * 64 - 10);
    ctx.lineTo(Math.cos(a) * 88 * k, Math.sin(a) * 88 * k - 10);
    ctx.stroke();
  }
  circle(ctx, 0, -12, 44);
  paint(ctx, '#FFE45C', INK, 5);
  rr(ctx, -22, 26, 44, 30, 8);
  paint(ctx, '#B9C1C8', INK, 5);
  ctx.beginPath();
  ctx.arc(-14, -24, 16, Math.PI * 1.1, Math.PI * 1.6);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

// 検索バー
export function searchBar(ctx, x, y, w, text, k = 1, o = {}) {
  const { cursor = true, t = 0, button = '検索' } = o;
  const h = 118;
  ctx.save();
  ctx.translate(x, y);
  rr(ctx, -w / 2, -h / 2 + 10, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,60,30,0.18)';
  ctx.fill();
  rr(ctx, -w / 2, -h / 2, w, h, h / 2);
  paint(ctx, '#FFFFFF', C.brand, 8);
  // 虫めがね
  circle(ctx, -w / 2 + 64, -6, 20);
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.gray;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 78, 8);
  ctx.lineTo(-w / 2 + 96, 26);
  ctx.stroke();
  // 文字
  ctx.font = `800 52px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  const shown = text.slice(0, Math.round(text.length * clamp(k)));
  ctx.fillText(shown, -w / 2 + 116, 2);
  if (cursor && Math.floor(t * 2.5) % 2 === 0) {
    const tw = ctx.measureText(shown).width;
    ctx.fillStyle = C.brand;
    ctx.fillRect(-w / 2 + 122 + tw, -28, 5, 58);
  }
  // ボタン
  rr(ctx, w / 2 - 176, -h / 2 + 14, 158, h - 28, (h - 28) / 2);
  paint(ctx, C.brand, null);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = `900 44px ${FONT}`;
  ctx.fillText(button, w / 2 - 97, 2);
  ctx.restore();
}

// タップする指カーソル
export function tapHand(ctx, x, y, s, press = 0) {
  ctx.save();
  ctx.translate(x, y + press * 10);
  ctx.scale(s * (1 - press * 0.08), s * (1 - press * 0.08));
  if (press > 0) {
    circle(ctx, 0, -40, 40 + press * 30);
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - press)})`;
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-10, -40);
  ctx.lineTo(-10, 40);
  ctx.quadraticCurveTo(-40, 10, -44, 40);
  ctx.quadraticCurveTo(-40, 70, -6, 104);
  ctx.lineTo(52, 104);
  ctx.quadraticCurveTo(70, 70, 66, 30);
  ctx.quadraticCurveTo(64, 10, 44, 10);
  ctx.quadraticCurveTo(40, -4, 24, 0);
  ctx.quadraticCurveTo(18, -8, 8, -2);
  ctx.lineTo(8, -40);
  ctx.quadraticCurveTo(-1, -54, -10, -40);
  ctx.closePath();
  paint(ctx, '#FFFFFF', INK, 6);
  ctx.restore();
}

// SNSボタン（いいね / チャンネル登録 / 保存）
export function snsButton(ctx, kind, x, y, s, o = {}) {
  const { active = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (kind === 'like') {
    circle(ctx, 0, 0, 78);
    paint(ctx, '#FFFFFF', INK, 6);
    heart(ctx, 0, 4, 92);
    paint(ctx, active > 0.5 ? '#FF4F7B' : '#FFFFFF', active > 0.5 ? INK : '#FF4F7B', 8);
  } else if (kind === 'save') {
    circle(ctx, 0, 0, 78);
    paint(ctx, '#FFFFFF', INK, 6);
    ctx.beginPath();
    ctx.moveTo(-30, -42);
    ctx.lineTo(30, -42);
    ctx.lineTo(30, 44);
    ctx.lineTo(0, 20);
    ctx.lineTo(-30, 44);
    ctx.closePath();
    paint(ctx, active > 0.5 ? '#FFB21E' : '#FFFFFF', INK, 7);
  } else if (kind === 'subscribe') {
    const w = 500, h = 120;
    rr(ctx, -w / 2, -h / 2 + 10, w, h, h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    paint(ctx, active > 0.5 ? '#9AA3AB' : '#E8412B', '#FFFFFF', 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 50px ${FONT}`;
    ctx.fillText(active > 0.5 ? '登録済み' : 'チャンネル登録', 36, 2);
    // ベル
    ctx.save();
    ctx.translate(-w / 2 + 62, 0);
    ctx.beginPath();
    ctx.moveTo(-20, 16);
    ctx.quadraticCurveTo(-18, -26, 0, -26);
    ctx.quadraticCurveTo(18, -26, 20, 16);
    ctx.closePath();
    paint(ctx, '#FFFFFF', null);
    circle(ctx, 0, 22, 6);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// 黒板
export function chalkboard(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  rr(ctx, -w / 2 - 26, -h / 2 - 26, w + 52, h + 52, 26);
  paint(ctx, '#B07A48', INK, 7);
  rr(ctx, -w / 2, -h / 2, w, h, 12);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#2F6B4E');
  g.addColorStop(1, '#245A41');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // チョークのかすれ
  const r = rng(31);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 30;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const yy = -h / 2 + r() * h;
    ctx.moveTo(-w / 2 + 20, yy);
    ctx.quadraticCurveTo(0, yy + (r() - 0.5) * 60, w / 2 - 20, yy + (r() - 0.5) * 40);
    ctx.stroke();
  }
  // チョーク置き
  rr(ctx, -w / 2 + 40, h / 2 + 4, w - 80, 22, 8);
  paint(ctx, '#8E5E34', INK, 5);
  rr(ctx, -w / 2 + 90, h / 2 - 6, 60, 14, 6);
  paint(ctx, '#FFFFFF', INK, 3);
  rr(ctx, -w / 2 + 170, h / 2 - 6, 60, 14, 6);
  paint(ctx, '#FFE066', INK, 3);
  ctx.restore();
}

// ハテナ・ビックリ記号
export function mark(ctx, ch, x, y, size, o = {}) {
  const { color = C.orange, rot = 0, alpha = 1 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  richText(ctx, ch, 0, 0, {
    size, weight: 900, color,
    strokes: [[INK, size * 0.3], ['#FFFFFF', size * 0.17]],
  });
  ctx.restore();
}

// 栄養素バッジ（N/P/K）
export function nutrientBadge(ctx, x, y, s, letter, name, color, o = {}) {
  const { sub = null } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  circle(ctx, 0, 6, 70);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fill();
  circle(ctx, 0, 0, 70);
  paint(ctx, color, '#FFFFFF', 10);
  circle(ctx, 0, 0, 70);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 84px ${FONT}`;
  ctx.fillText(letter, 0, 4);
  if (name) {
    richText(ctx, name, 0, 108, { size: 44, weight: 900, color: INK, strokes: [['#FFFFFF', 14]] });
  }
  if (sub) {
    richText(ctx, sub, 0, 160, { size: 36, weight: 800, color: color, strokes: [['#FFFFFF', 12]] });
  }
  ctx.restore();
}

// 時計（ゆっくり効く）
export function clockIcon(ctx, x, y, r, t = 0) {
  circle(ctx, x, y, r);
  paint(ctx, '#FFFFFF', INK, 6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
    ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  const a1 = t * 2 - Math.PI / 2, a2 = t * 0.2 - Math.PI / 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a1) * r * 0.7, y + Math.sin(a1) * r * 0.7);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
  ctx.lineWidth = 8;
  ctx.stroke();
}

export { sparkle, star, glow };

// 肥料を盛ったお茶碗（植物のごはん）
export function fertBowl(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 6, 150, 20, 0.22);
  // 山盛りの粒
  const r = rng(61);
  const cols = ['#F7F7F2', '#E8F6FF', '#EAF7DF', '#FFF6DA'];
  const pts = [];
  for (let i = 0; i < 80; i++) {
    const a = r() * Math.PI;
    const rad = Math.sqrt(r());
    const gx = Math.cos(a) * 118 * rad;
    const gy = -104 - Math.sin(a) * 86 * rad;
    pts.push([gx, gy, cols[i % cols.length]]);
  }
  pts.sort((p, q) => p[1] - q[1]);
  for (const [gx, gy, col] of pts) {
    circle(ctx, gx, gy, 14);
    paint(ctx, col, '#8A7A6A', 3);
    circle(ctx, gx - 4, gy - 4, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  // 茶碗
  ctx.beginPath();
  ctx.moveTo(-140, -104);
  ctx.quadraticCurveTo(-134, 0, 0, 0);
  ctx.quadraticCurveTo(134, 0, 140, -104);
  ctx.closePath();
  paint(ctx, '#E8573F', INK, 7);
  ctx.beginPath();
  ctx.moveTo(-112, -70);
  ctx.quadraticCurveTo(0, -46, 112, -70);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 7;
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    heart(ctx, i * 44, -34 + Math.abs(i) * -4, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  }
  rr(ctx, -46, -8, 92, 22, 8);
  paint(ctx, '#C84430', INK, 5);
  ctx.restore();
}

// 活力剤のボトル（汎用。商品ではない）
export function vitalBottle(ctx, x, y, s, o = {}) {
  const { label = '活力剤', color = '#2E8FD8' } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(ctx, 0, 4, 80, 12, 0.2);
  rr(ctx, -34, -300, 68, 50, 12);
  paint(ctx, color, INK, 6);
  ctx.beginPath();
  ctx.moveTo(-40, -250);
  ctx.lineTo(40, -250);
  ctx.quadraticCurveTo(76, -236, 76, -196);
  ctx.lineTo(76, -16);
  ctx.quadraticCurveTo(76, 0, 60, 0);
  ctx.lineTo(-60, 0);
  ctx.quadraticCurveTo(-76, 0, -76, -16);
  ctx.lineTo(-76, -196);
  ctx.quadraticCurveTo(-76, -236, -40, -250);
  ctx.closePath();
  paint(ctx, '#FFFFFF', INK, 6);
  rr(ctx, -76, -176, 152, 110, 6);
  paint(ctx, color, INK, 5);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 40px ${FONT}`;
  ctx.fillText(label, 0, -121);
  ctx.beginPath();
  ctx.moveTo(-54, -226);
  ctx.lineTo(-54, -190);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
}

// 考えごとの雲形吹き出し
export function thoughtCloud(ctx, x, y, w, h, k, tail = null) {
  if (k <= 0) return;
  const s = ease.outBack(clamp(k), 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const bumps = 12;
  const path = (ox, oy) => {
    ctx.beginPath();
    for (let i = 0; i <= bumps; i++) {
      const a = (i / bumps) * TAU;
      const px = Math.cos(a) * w / 2 + ox, py = Math.sin(a) * h / 2 + oy;
      if (i === 0) ctx.moveTo(px, py);
      else {
        const am = ((i - 0.5) / bumps) * TAU;
        const cx = Math.cos(am) * (w / 2) * 1.2 + ox, cy = Math.sin(am) * (h / 2) * 1.2 + oy;
        ctx.quadraticCurveTo(cx, cy, px, py);
      }
    }
    ctx.closePath();
  };
  path(0, 10);
  ctx.fillStyle = 'rgba(30,60,40,0.14)';
  ctx.fill();
  path(0, 0);
  paint(ctx, '#FFFFFF', INK, 6);
  if (tail) {
    const [tx, ty] = tail;
    for (let i = 0; i < 3; i++) {
      const p = 0.35 + i * 0.25;
      circle(ctx, tx * p, ty * p + h * 0.3 * (1 - p), 18 - i * 5);
      paint(ctx, '#FFFFFF', INK, 5);
    }
  }
  ctx.restore();
}

// 電池（スタミナ）アイコン
export function batteryIcon(ctx, x, y, s, level = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  rr(ctx, -80, -44, 150, 88, 16);
  paint(ctx, '#FFFFFF', INK, 7);
  rr(ctx, 74, -18, 16, 36, 6);
  paint(ctx, INK, null);
  const col = level < 0.25 ? '#E8412B' : level < 0.6 ? '#F2B632' : '#34B25A';
  const blink = level < 0.25 ? (Math.sin(t * 10) > 0 ? 1 : 0.3) : 1;
  ctx.globalAlpha *= blink;
  rr(ctx, -66, -30, Math.max(8, 122 * level), 60, 8);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.restore();
}

// N・P・K のヒーロー（お助けトリオ）
export function heroBadge(ctx, x, y, s, letter, color, t = 0, o = {}) {
  const { cape = 1, face = 1 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (cape > 0) {
    const flap = Math.sin(t * 6 + x) * 10;
    ctx.beginPath();
    ctx.moveTo(-60, -10);
    ctx.quadraticCurveTo(-90 - flap, 80, -70 - flap, 130);
    ctx.lineTo(70 + flap, 130);
    ctx.quadraticCurveTo(90 + flap, 80, 60, -10);
    ctx.closePath();
    ctx.globalAlpha *= cape;
    paint(ctx, '#E8412B', INK, 6);
    ctx.globalAlpha /= cape;
  }
  circle(ctx, 0, 0, 82);
  paint(ctx, color, '#FFFFFF', 10);
  circle(ctx, 0, 0, 82);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 92px ${FONT}`;
  ctx.fillText(letter, 0, face > 0 ? -12 : 4);
  if (face > 0) {
    ctx.globalAlpha *= face;
    ctx.fillStyle = INK;
    circle(ctx, -26, 40, 7);
    ctx.fill();
    circle(ctx, 26, 40, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 46, 12, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,150,0.6)';
    ellipse(ctx, -48, 52, 12, 7);
    ctx.fill();
    ellipse(ctx, 48, 52, 12, 7);
    ctx.fill();
  }
  ctx.restore();
}

// 「6-10-5」の数字パネル（真ん中を強調できる）
export function npkPanel(ctx, x, y, s, nums, o = {}) {
  const { hi = -1, hiK = 0, labels = ['N', 'P', 'K'], colors = ['#23A05A', '#F0643C', '#C98A12'], t = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  rr(ctx, -250, -120 + 12, 500, 250, 40);
  ctx.fillStyle = 'rgba(0,60,30,0.16)';
  ctx.fill();
  rr(ctx, -250, -120, 500, 250, 40);
  paint(ctx, '#FFFFFF', INK, 7);
  const xs = [-160, 0, 160];
  nums.forEach((n, i) => {
    const big = i === hi ? 1 + 0.18 * hiK : 1;
    ctx.save();
    ctx.translate(xs[i], 20);
    ctx.scale(big, big);
    ctx.fillStyle = i === hi && hiK > 0 ? '#E8412B' : INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 100px ${FONT}`;
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
    circle(ctx, xs[i], -78, 26);
    paint(ctx, colors[i], '#FFFFFF', 5);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 32px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], xs[i], -76);
    if (i < 2) {
      ctx.fillStyle = INK;
      ctx.font = `900 70px ${FONT}`;
      ctx.fillText('-', xs[i] + 80, 16);
    }
  });
  if (hi >= 0 && hiK > 0) {
    ctx.save();
    ctx.translate(xs[hi], 22);
    ctx.rotate(-0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 96 * (0.9 + 0.1 * hiK), 76, 0, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(hiK));
    ctx.strokeStyle = '#E8412B';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
