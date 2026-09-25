// 図形・エフェクトの描画ヘルパー
import { C, TAU, clamp, lerp, ease, prog, rng, rgba } from './core.js';

export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU);
}

export function paint(ctx, fill, stroke, lw = 6) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// 座標変換つきで描く
export function at(ctx, x, y, s, rot, fn) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (s !== 1) ctx.scale(s, s);
  fn(ctx);
  ctx.restore();
}

// 地面の柔らかい影
export function groundShadow(ctx, x, y, rx, ry, alpha = 0.18) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(40,50,30,${alpha})`);
  g.addColorStop(0.6, `rgba(40,50,30,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(40,50,30,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  circle(ctx, x, y, rx);
  ctx.fill();
  ctx.restore();
}

// ふんわり光る円
export function glow(ctx, x, y, r, color = '#FFF6B0', alpha = 0.8) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.45, rgba(color, alpha * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.fill();
}

export function star(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// キラッと光る4本線の星
export function sparkle(ctx, x, y, size, rot = 0, color = '#FFFFFF', alpha = 1) {
  if (size <= 0.5 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  const s = size, k = size * 0.18;
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(k, -k, s, 0);
  ctx.quadraticCurveTo(k, k, 0, s);
  ctx.quadraticCurveTo(-k, k, -s, 0);
  ctx.quadraticCurveTo(-k, -k, 0, -s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// 瞬くキラキラ群
export function twinkles(ctx, cx, cy, radius, t, opts = {}) {
  const { n = 7, seed = 3, color = '#FFFFFF', size = 26, alpha = 1, stroke = null } = opts;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    const d = radius * (0.35 + r() * 0.65);
    const ph = r() * TAU;
    const sp = 2.2 + r() * 2.5;
    const k = Math.max(0, Math.sin(t * sp + ph));
    const sz = size * (0.5 + r() * 0.7) * k;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.9;
    if (stroke) sparkle(ctx, x, y, sz + 4, 0, stroke, alpha * k);
    sparkle(ctx, x, y, sz, 0, color, alpha);
  }
}

export function heart(ctx, x, y, size) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.1, y + s * 0.25, x - s * 0.55, y - s * 0.05, x - s * 0.5, y - s * 0.32);
  ctx.bezierCurveTo(x - s * 0.45, y - s * 0.62, x - s * 0.05, y - s * 0.62, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.05, y - s * 0.62, x + s * 0.45, y - s * 0.62, x + s * 0.5, y - s * 0.32);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.05, x + s * 0.1, y + s * 0.25, x, y + s * 0.35);
  ctx.closePath();
}

// しずく形（先端が上）
export function dropShape(ctx, x, y, size) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.bezierCurveTo(x + s * 0.25, y - s * 0.55, x + s * 0.62, y - s * 0.1, x + s * 0.62, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.62, y + s * 0.68, x + s * 0.32, y + s * 0.95, x, y + s * 0.95);
  ctx.bezierCurveTo(x - s * 0.32, y + s * 0.95, x - s * 0.62, y + s * 0.68, x - s * 0.62, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.62, y - s * 0.1, x - s * 0.25, y - s * 0.55, x, y - s);
  ctx.closePath();
}

// 葉っぱ（+x方向に伸びる）
export function leafPath(ctx, len, wid, curl = 0) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.25, -wid * 0.9 + curl * 0.3, len * 0.72, -wid * 0.75 + curl, len, curl);
  ctx.bezierCurveTo(len * 0.72, wid * 0.7 + curl, len * 0.25, wid * 0.85 + curl * 0.3, 0, 0);
  ctx.closePath();
}

export function leaf(ctx, len, wid, fill, opts = {}) {
  const { curl = 0, vein = true, outline = C.ink, lw = 5 } = opts;
  leafPath(ctx, len, wid, curl);
  paint(ctx, fill, outline, lw);
  if (vein) {
    ctx.beginPath();
    ctx.moveTo(len * 0.08, curl * 0.02);
    ctx.quadraticCurveTo(len * 0.55, curl * 0.55, len * 0.86, curl * 0.9);
    ctx.lineWidth = Math.max(2, lw * 0.55);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// 吹き出し
export function bubble(ctx, x, y, w, h, tail, opts = {}) {
  const { fill = '#FFFFFF', stroke = C.ink, lw = 6, r = 40, shadow = true } = opts;
  const draw = (ox, oy) => {
    ctx.beginPath();
    const rad = Math.min(r, h / 2);
    const L = x - w / 2 + ox, T = y - h / 2 + oy, R = x + w / 2 + ox, B = y + h / 2 + oy;
    ctx.moveTo(L + rad, T);
    ctx.arcTo(R, T, R, B, rad);
    ctx.arcTo(R, B, L, B, rad);
    if (tail) {
      // 下辺から尻尾を出す
      const tx = clamp(tail.x, L + rad + 30, R - rad - 30) + ox;
      ctx.lineTo(tx + 26, B);
      ctx.lineTo(tail.x + ox, tail.y + oy);
      ctx.lineTo(tx - 26, B);
    }
    ctx.arcTo(L, B, L, T, rad);
    ctx.arcTo(L, T, R, T, rad);
    ctx.closePath();
  };
  if (shadow) {
    draw(0, 10);
    ctx.fillStyle = 'rgba(30,60,40,0.16)';
    ctx.fill();
  }
  draw(0, 0);
  paint(ctx, fill, stroke, lw);
}

// 矢印（太め、先端三角）
export function arrow(ctx, x1, y1, x2, y2, opts = {}) {
  const { color = C.orange, width = 22, head = 46, outline = C.white, olw = 8 } = opts;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(a);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0, -width / 2);
    ctx.lineTo(len - head, -width / 2);
    ctx.lineTo(len - head, -head * 0.62);
    ctx.lineTo(len, 0);
    ctx.lineTo(len - head, head * 0.62);
    ctx.lineTo(len - head, width / 2);
    ctx.lineTo(0, width / 2);
    ctx.closePath();
  };
  path();
  ctx.lineJoin = 'round';
  if (outline) {
    ctx.lineWidth = olw * 2;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// 放射状のポップ線（出現時のアクセント）
export function burst(ctx, x, y, t, opts = {}) {
  const { n = 10, r0 = 60, r1 = 140, color = C.yellow, width = 9, rot = 0, dur = 0.5 } = opts;
  if (t <= 0 || t >= dur) return;
  const p = t / dur;
  const e = ease.outCubic(p);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = width * (1 - p * 0.7);
  ctx.globalAlpha *= 1 - ease.inQuad(p);
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const ra = lerp(r0, r1, e * 0.6);
    const rb = lerp(r0, r1, e);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * ra, y + Math.sin(a) * ra);
    ctx.lineTo(x + Math.cos(a) * rb, y + Math.sin(a) * rb);
    ctx.stroke();
  }
  ctx.restore();
}

// 集中線（マンガ風の強調）
export function focusLines(ctx, cx, cy, t, opts = {}) {
  const { n = 70, inner = 330, outer = 1500, color = 'rgba(40,40,40,0.9)', seed = 7, alpha = 1 } = opts;
  const r = rng(seed + Math.floor(t * 12));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.05;
    const w = 0.006 + r() * 0.012;
    const rin = inner * (0.85 + r() * 0.5);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rin, cy + Math.sin(a) * rin);
    ctx.lineTo(cx + Math.cos(a - w) * outer, cy + Math.sin(a - w) * outer);
    ctx.lineTo(cx + Math.cos(a + w) * outer, cy + Math.sin(a + w) * outer);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function checkMark(ctx, x, y, s, color = C.brand, lw = 14) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.lineTo(x - s * 0.12, y + s * 0.38);
  ctx.lineTo(x + s * 0.55, y - s * 0.42);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function crossMark(ctx, x, y, s, color = C.red, lw = 16) {
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y - s / 2);
  ctx.lineTo(x + s / 2, y + s / 2);
  ctx.moveTo(x + s / 2, y - s / 2);
  ctx.lineTo(x - s / 2, y + s / 2);
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}

// 汗
export function sweat(ctx, x, y, s, t = 0) {
  const dy = (t % 1.2) * 18;
  ctx.save();
  ctx.globalAlpha *= 1 - clamp(((t % 1.2) - 0.8) / 0.4);
  dropShape(ctx, x, y + dy, s);
  paint(ctx, '#BFE7FF', '#5AA9D8', 4);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.2, y + dy + s * 0.25, s * 0.12, s * 0.2, 0.3, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.restore();
}

// 紙吹雪
export function confetti(ctx, t, opts = {}) {
  const { n = 60, seed = 11, x0 = 0, x1 = 1080, y0 = -80, fall = 520, colors = [C.yellow, C.pink, C.brand, C.orange, C.skyDeep, C.yellowGreen] } = opts;
  if (t < 0) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const delay = r() * 1.6;
    const lt = t - delay;
    const x = lerp(x0, x1, r()) + Math.sin(lt * (1.5 + r() * 2) + r() * 6) * 30;
    const vy = fall * (0.6 + r() * 0.6);
    const col = colors[Math.floor(r() * colors.length)];
    const rot0 = r() * TAU, spin = (r() - 0.5) * 10;
    const sz = 12 + r() * 12;
    if (lt < 0) continue;
    const y = y0 + vy * lt;
    if (y > 2000) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot0 + spin * lt);
    ctx.scale(1, Math.cos(lt * 6 + i));
    ctx.fillStyle = col;
    ctx.fillRect(-sz / 2, -sz * 0.3, sz, sz * 0.6);
    ctx.restore();
  }
}

// 画像を中心基準で描く（高さ指定）
export function drawImageH(ctx, img, x, y, h, opts = {}) {
  if (!img) return;
  const { anchor = 'center', alpha = 1 } = opts;
  const w = (img.width / img.height) * h;
  let ox = -w / 2, oy = -h / 2;
  if (anchor === 'bottom') oy = -h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x + ox, y + oy, w, h);
  ctx.restore();
  return { w, h };
}

// 画面の揺れ
export function shakeOffset(t, t0, dur = 0.5, amp = 18) {
  const p = (t - t0) / dur;
  if (p < 0 || p > 1) return [0, 0];
  const k = (1 - p) * amp;
  return [Math.sin(t * 90) * k, Math.cos(t * 77) * k * 0.6];
}
