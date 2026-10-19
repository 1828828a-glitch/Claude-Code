// 共通ユーティリティ。描画はすべて t(秒) から決定的に計算する
const W = 1080, H = 1920, FPS = 30;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: t => t,
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outQuint: t => 1 - Math.pow(1 - t, 5),
};
// t が [a,b] を通過する間の 0→1 をイージング付きで返す
const tw = (t, a, b, ease = E.inOut) => ease(seg(t, a, b));

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.31), hash(i + 1 + seed * 57.31), u) * 2 - 1;
}
// 手持ちカメラの揺れ
function handheld(t, amp = 6, freq = 0.9, seed = 1) {
  return {
    x: (vnoise(t * freq, seed) + 0.5 * vnoise(t * freq * 2.3, seed + 3)) * amp,
    y: (vnoise(t * freq, seed + 11) + 0.5 * vnoise(t * freq * 2.1, seed + 5)) * amp,
    r: vnoise(t * freq * 0.6, seed + 21) * amp * 0.0012,
  };
}
// 自動まばたき。閉じ具合 0..1 を返す
function blink(t, seed = 0, every = 3.1) {
  const k = Math.floor((t + seed) / every);
  const off = hash(k + seed * 13) * (every - 0.4);
  const local = (t + seed) - k * every - off;
  if (local < 0 || local > 0.16) return 0;
  return Math.sin((local / 0.16) * Math.PI);
}

// カメラ。zoom は画面中心(cx,cy)基準、x,y はワールドの平行移動
function camera(ctx, c, fn) {
  ctx.save();
  const cx = c.cx ?? W / 2, cy = c.cy ?? H / 2;
  ctx.translate(cx, cy);
  if (c.rot) ctx.rotate(c.rot);
  const z = c.zoom ?? 1;
  ctx.scale(z, z);
  ctx.translate(-cx + (c.x || 0), -cy + (c.y || 0));
  fn();
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
function fillEll(ctx, x, y, rx, ry, color, rot = 0) { ell(ctx, x, y, rx, ry, rot); ctx.fillStyle = color; ctx.fill(); }
function lg(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function rg(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// ---- オフスクリーン ----
const _bufs = {};
function buf(name) {
  if (!_bufs[name]) { const c = document.createElement('canvas'); c.width = W; c.height = H; _bufs[name] = c; }
  const c = _bufs[name];
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1; x.filter = 'none'; x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, W, H);
  return [c, x];
}

// ---- テキスト ----
const FAM = {
  maru: '"ZenMaru"', klee: '"Klee"', yomogi: '"Yomogi"', kaku: '"ZenKaku"',
};
function setFont(ctx, size, font = 'maru', weight = 700) {
  ctx.font = `${weight} ${size}px ${FAM[font]}`;
}
// style: outline(TikTok標準) / box(背景付き) / soft(ナレーション) / plain
function drawText(ctx, str, x, y, o = {}) {
  const size = o.size || 64, font = o.font || 'maru', weight = o.weight || 700;
  const style = o.style || 'outline';
  const lines = String(str).split('\n');
  const lh = size * (o.lh || 1.38);
  setFont(ctx, size, font, weight);
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  const y0 = y - ((lines.length - 1) * lh) / 2;
  ctx.save();
  if (style === 'box') {
    const padX = size * 0.42, padY = size * 0.2;
    lines.forEach((ln, i) => {
      if (!ln) return;
      const w = ctx.measureText(ln).width;
      const lx = ctx.textAlign === 'center' ? x - w / 2 : ctx.textAlign === 'left' ? x : x - w;
      rr(ctx, lx - padX, y0 + i * lh - size / 2 - padY, w + padX * 2, size + padY * 2, size * 0.26);
      ctx.fillStyle = o.bg || '#ffffff';
      ctx.fill();
    });
    ctx.fillStyle = o.color || '#151515';
    lines.forEach((ln, i) => ctx.fillText(ln, x, y0 + i * lh + size * 0.04));
  } else if (style === 'outline') {
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = size * 0.05;
    ctx.strokeStyle = o.stroke || '#141414';
    ctx.lineWidth = o.strokeW || size * 0.2;
    lines.forEach((ln, i) => ctx.strokeText(ln, x, y0 + i * lh));
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = o.color || '#ffffff';
    lines.forEach((ln, i) => ctx.fillText(ln, x, y0 + i * lh));
  } else if (style === 'soft') {
    // ナレーション。明るい背景でも読めるよう、薄い縁とにじみを重ねる
    ctx.lineJoin = 'round';
    ctx.shadowColor = o.glow || 'rgba(30,18,10,0.85)'; ctx.shadowBlur = size * 0.6;
    ctx.strokeStyle = 'rgba(40,24,14,0.55)'; ctx.lineWidth = size * 0.16;
    lines.forEach((ln, i) => ctx.strokeText(ln, x, y0 + i * lh));
    ctx.shadowBlur = size * 0.12;
    ctx.fillStyle = o.color || '#ffffff';
    lines.forEach((ln, i) => ctx.fillText(ln, x, y0 + i * lh));
  } else {
    ctx.fillStyle = o.color || '#ffffff';
    lines.forEach((ln, i) => ctx.fillText(ln, x, y0 + i * lh));
  }
  ctx.restore();
}

// 字幕レイヤー。cap = {t0,t1,text,x,y,size,font,style,anim,color,bg,...}
function drawCaption(ctx, cap, t) {
  if (t < cap.t0 || t > cap.t1) return;
  const inD = cap.inD ?? 0.18, outD = cap.outD ?? 0.16;
  const pi = seg(t, cap.t0, cap.t0 + inD), po = 1 - seg(t, cap.t1 - outD, cap.t1);
  let a = Math.min(pi, po), sc = 1, dy = 0;
  let text = cap.text;
  const anim = cap.anim || 'pop';
  if (anim === 'pop') sc = lerp(0.82, 1, E.outBack(pi));
  if (anim === 'up') dy = (1 - E.out(pi)) * 30;
  if (anim === 'type') {
    const chars = [...cap.text];
    const n = Math.floor(seg(t, cap.t0, cap.t0 + (cap.typeD ?? chars.length * 0.07)) * chars.length + 0.0001);
    text = chars.slice(0, n).join('');
    a = po;
  }
  if (anim === 'cut') a = 1;
  ctx.save();
  ctx.globalAlpha = a * (cap.alpha ?? 1);
  ctx.translate(cap.x ?? W / 2, (cap.y ?? H * 0.42) + dy);
  ctx.scale(sc, sc);
  drawText(ctx, text, 0, 0, cap);
  ctx.restore();
}

// ---- 画面効果 ----
function vignette(ctx, s = 0.45, color = '0,0,0', inner = 0.32) {
  ctx.fillStyle = rg(ctx, W / 2, H * 0.48, H * inner, H * 0.78, [[0, `rgba(${color},0)`], [1, `rgba(${color},${s})`]]);
  ctx.fillRect(0, 0, W, H);
}
let _grain = null;
function grainTile() {
  if (_grain) return _grain;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); const id = x.createImageData(256, 256); const r = rng(42);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 200; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  x.putImageData(id, 0, 0); _grain = c; return c;
}
function grain(ctx, t, a = 0.05) {
  const g = grainTile(); const f = Math.floor(t * 12);
  const ox = Math.floor(hash(f) * 256), oy = Math.floor(hash(f + 9) * 256);
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-ox, -oy);
  const p = ctx.createPattern(g, 'repeat'); ctx.fillStyle = p; ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}
function lightLeak(ctx, t, a = 0.35) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const x = W * (0.85 + 0.1 * Math.sin(t * 0.7)), y = H * (0.12 + 0.05 * Math.cos(t * 0.5));
  ctx.fillStyle = rg(ctx, x, y, 0, H * 0.6, [[0, `rgba(255,170,90,${a})`], [0.5, `rgba(255,120,60,${a * 0.35})`], [1, 'rgba(255,100,40,0)']]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
// シーンをバッファに描いてからフィルター付きで合成
function withFilter(ctx, filter, fn, name = 'fx') {
  const [c, x] = buf(name);
  fn(x);
  ctx.save(); ctx.filter = filter; ctx.drawImage(c, 0, 0); ctx.restore();
}
function fade(ctx, a, color = '#000') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// 涙で視界がにじむ表現
function tearBlur(ctx, amount, t, fn) {
  if (amount <= 0.001) { fn(ctx); return; }
  const [c, x] = buf('tear');
  fn(x);
  ctx.save();
  ctx.filter = `blur(${amount * 14}px) brightness(${1 + amount * 0.08})`;
  ctx.drawImage(c, 0, 0);
  ctx.filter = 'none';
  // 下側に水の膜
  ctx.globalAlpha = amount * 0.55;
  const wob = Math.sin(t * 2.2) * 8;
  ctx.fillStyle = lg(ctx, 0, H * 0.72 + wob, 0, H, [[0, 'rgba(200,230,255,0)'], [0.4, 'rgba(210,235,255,0.25)'], [1, 'rgba(230,245,255,0.5)']]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
