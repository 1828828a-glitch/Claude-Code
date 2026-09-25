// テキスト描画: 強調(*...*)、ふりがな({漢字|かな})、改行(\n) に対応
import { C, clamp, lerp, ease, W, LAYOUT } from './core.js';
import { rr, paint } from './draw.js';

export const FONT = '"M PLUS Rounded 1c", sans-serif';
export const POP = '"Mochiy Pop One", "M PLUS Rounded 1c", sans-serif';
export const IMPACT = '"Dela Gothic One", "M PLUS Rounded 1c", sans-serif';

function parse(text) {
  const lines = [[]];
  let accent = false;
  let buf = '';
  const flush = () => {
    if (buf) lines[lines.length - 1].push({ text: buf, accent });
    buf = '';
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '*') {
      flush();
      accent = !accent;
    } else if (ch === '\n') {
      flush();
      lines.push([]);
    } else if (ch === '{') {
      flush();
      const end = text.indexOf('}', i);
      const [base, ruby] = text.slice(i + 1, end).split('|');
      lines[lines.length - 1].push({ text: base, ruby, accent });
      i = end;
    } else {
      buf += ch;
    }
  }
  flush();
  return lines;
}

function fontStr(weight, size, family) {
  return `${weight} ${Math.round(size * 10) / 10}px ${family}`;
}

export function measureRich(ctx, text, opts = {}) {
  const { size = 64, weight = 900, family = FONT, accentScale = 1, letterSpacing = 0, lineHeight = 1.25, rubyScale = 0.42 } = opts;
  const lines = parse(text);
  ctx.save();
  ctx.letterSpacing = `${letterSpacing}px`;
  let maxW = 0;
  const out = lines.map((runs) => {
    let w = 0;
    let hasRuby = false;
    const rs = runs.map((r) => {
      const sz = r.accent ? size * accentScale : size;
      ctx.font = fontStr(weight, sz, family);
      const rw = ctx.measureText(r.text).width;
      if (r.ruby) hasRuby = true;
      const o = { ...r, size: sz, w: rw, x: w };
      w += rw;
      return o;
    });
    maxW = Math.max(maxW, w);
    return { runs: rs, w, hasRuby };
  });
  ctx.restore();
  const lh = size * lineHeight;
  const rubyH = out.some((l) => l.hasRuby) ? size * rubyScale * 1.05 : 0;
  return { lines: out, width: maxW, height: lh * out.length + rubyH, lh, rubyH };
}

// 複数行リッチテキスト。y はブロックの中心
export function richText(ctx, text, x, y, opts = {}) {
  let {
    size = 64, weight = 900, family = FONT, color = C.text, accent = C.orange,
    accentScale = 1, align = 'center', lineHeight = 1.25, strokes = [], shadow = null,
    letterSpacing = 0, maxWidth = null, rubyScale = 0.42, rubyColor = null, alpha = 1,
    accentStrokes = null,
  } = opts;
  let m = measureRich(ctx, text, { size, weight, family, accentScale, letterSpacing, lineHeight, rubyScale });
  if (maxWidth && m.width > maxWidth) {
    const k = maxWidth / m.width;
    size *= k;
    letterSpacing *= k;
    strokes = strokes.map(([c, w]) => [c, w * k]);
    if (accentStrokes) accentStrokes = accentStrokes.map(([c, w]) => [c, w * k]);
    if (shadow) shadow = { ...shadow, dx: shadow.dx * k, dy: shadow.dy * k };
    m = measureRich(ctx, text, { size, weight, family, accentScale, letterSpacing, lineHeight, rubyScale });
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.letterSpacing = `${letterSpacing}px`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const top = y - m.height / 2 + m.rubyH;
  const items = [];
  m.lines.forEach((line, li) => {
    const ly = top + m.lh * li + m.lh / 2;
    let lx = x;
    if (align === 'center') lx = x - line.w / 2;
    else if (align === 'right') lx = x - line.w;
    line.runs.forEach((r) => items.push({ r, x: lx + r.x, y: ly }));
  });
  const rubySize = size * rubyScale;
  const passes = (dx, dy, strokeList, fillColor, isShadow) => {
    // 縁取り（外側から）
    const maxLayers = Math.max(strokeList.length, accentStrokes ? accentStrokes.length : 0);
    for (let si = 0; si < maxLayers; si++) {
      for (const it of items) {
        const list = it.r.accent && accentStrokes ? accentStrokes : strokeList;
        const s = list[si];
        if (!s) continue;
        const [sc, sw] = s;
        ctx.strokeStyle = isShadow ? fillColor : sc;
        ctx.lineWidth = sw;
        ctx.font = fontStr(weight, it.r.size, family);
        ctx.strokeText(it.r.text, it.x + dx, it.y + dy);
        if (it.r.ruby) {
          ctx.font = fontStr(Math.min(weight, 800), rubySize, family);
          ctx.lineWidth = sw * 0.6;
          ctx.textAlign = 'center';
          ctx.strokeText(it.r.ruby, it.x + it.r.w / 2 + dx, it.y - it.r.size * 0.62 - rubySize * 0.55 + dy);
          ctx.textAlign = 'left';
        }
      }
    }
    for (const it of items) {
      ctx.fillStyle = isShadow ? fillColor : it.r.accent ? accent : color;
      ctx.font = fontStr(weight, it.r.size, family);
      ctx.fillText(it.r.text, it.x + dx, it.y + dy);
      if (it.r.ruby) {
        ctx.font = fontStr(Math.min(weight, 800), rubySize, family);
        ctx.textAlign = 'center';
        ctx.fillStyle = isShadow ? fillColor : rubyColor || (it.r.accent ? accent : color);
        ctx.fillText(it.r.ruby, it.x + it.r.w / 2 + dx, it.y - it.r.size * 0.62 - rubySize * 0.55 + dy);
        ctx.textAlign = 'left';
      }
    }
  };
  if (shadow) passes(shadow.dx, shadow.dy, strokes, shadow.color, true);
  passes(0, 0, strokes, color, false);
  ctx.restore();
  return { width: m.width, height: m.height, size };
}

// 見出しテロップ（白いカード + 緑の縁）
export function telopCard(ctx, text, x, y, k, opts = {}) {
  if (k <= 0) return;
  const {
    size = 76, color = C.text, accent = C.orangeDeep, bg = '#FFFFFF', border = C.brand,
    tag = null, tagColor = C.brand, padX = 54, padY = 34, radius = 46, rot = 0,
    minWidth = 0, maxWidth = 940, accentScale = 1.12, lineHeight = 1.28, weight = 900,
    family = FONT, alpha = 1,
  } = opts;
  const m = measureRich(ctx, text, { size, weight, family, accentScale, lineHeight });
  let s = 1;
  if (m.width + padX * 2 > maxWidth) s = (maxWidth - padX * 2) / m.width;
  const w = Math.max(minWidth, m.width * s + padX * 2);
  const h = m.height * s + padY * 2;
  const sc = ease.outBack(clamp(k), 2.4) * 0.35 + 0.65 * clamp(k * 1.4);
  ctx.save();
  ctx.globalAlpha *= clamp(k * 3) * alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  // 影
  rr(ctx, -w / 2, -h / 2 + 14, w, h, radius);
  ctx.fillStyle = 'rgba(0,70,30,0.22)';
  ctx.fill();
  rr(ctx, -w / 2, -h / 2, w, h, radius);
  paint(ctx, bg, border, 10);
  if (tag) {
    ctx.font = `900 34px ${FONT}`;
    const tw = ctx.measureText(tag).width + 48;
    rr(ctx, -tw / 2, -h / 2 - 30, tw, 58, 29);
    paint(ctx, tagColor, '#FFFFFF', 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, 0, -h / 2 - 0.5);
  }
  richText(ctx, text, 0, tag ? 8 : 2, { size: size * s, weight, family, color, accent, accentScale, lineHeight });
  ctx.restore();
}

// 大きな叫びテロップ（白フチ + 濃いフチ + 影）
export function shout(ctx, text, x, y, k, opts = {}) {
  if (k <= 0) return;
  const {
    size = 120, color = C.red, inner = '#FFFFFF', outer = C.ink, family = FONT, weight = 900,
    rot = 0, accent = C.orangeDeep, lineHeight = 1.18, letterSpacing = 0, maxWidth = 980,
    shadowColor = 'rgba(0,0,0,0.25)', accentScale = 1.1,
  } = opts;
  const sc = lerp(1.9, 1, ease.outBack(clamp(k), 1.8));
  ctx.save();
  ctx.globalAlpha *= clamp(k * 4);
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  richText(ctx, text, 0, 0, {
    size, weight, family, color, accent, lineHeight, letterSpacing, maxWidth, accentScale,
    strokes: [[outer, size * 0.34], [inner, size * 0.2]],
    shadow: { color: shadowColor, dx: 0, dy: size * 0.09 },
  });
  ctx.restore();
}

// ナレーション字幕
export function subtitle(ctx, text, k, opts = {}) {
  if (k <= 0 || !text) return;
  const { y = LAYOUT.subY, size = 50, color = '#27352C', accent = C.brand, maxWidth = 960 } = opts;
  const m = measureRich(ctx, text, { size, weight: 800, lineHeight: 1.34 });
  let s = 1;
  const padX = 40, padY = 24;
  if (m.width + padX * 2 > maxWidth) s = (maxWidth - padX * 2) / m.width;
  const w = m.width * s + padX * 2;
  const h = m.height * s + padY * 2;
  const dy = (1 - ease.outCubic(clamp(k))) * 18;
  ctx.save();
  ctx.globalAlpha *= clamp(k);
  rr(ctx, W / 2 - w / 2, y - h / 2 + 8 + dy, w, h, 30);
  ctx.fillStyle = 'rgba(20,60,35,0.18)';
  ctx.fill();
  rr(ctx, W / 2 - w / 2, y - h / 2 + dy, w, h, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,154,68,0.35)';
  ctx.stroke();
  richText(ctx, text, W / 2, y + dy + 2, { size: size * s, weight: 800, color, accent, lineHeight: 1.34 });
  ctx.restore();
}

// 小さなラベル（丸いピル）
export function pill(ctx, text, x, y, opts = {}) {
  const { size = 38, color = '#FFFFFF', bg = C.brand, stroke = '#FFFFFF', lw = 6, padX = 28, h = null, weight = 900, family = FONT, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${family}`;
  const tw = ctx.measureText(text).width;
  const bh = h || size * 1.6;
  const bw = tw + padX * 2;
  rr(ctx, x - bw / 2, y - bh / 2, bw, bh, bh / 2);
  paint(ctx, bg, stroke, lw);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
  return { w: bw, h: bh };
}
