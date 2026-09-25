// 各動画で使う演出パーツ
import { C, W, H, LAYOUT, clamp, lerp, ease, prog, pop, fade, inOut, blinkAt, talkAt, rng, TAU } from '../engine/core.js';
import { rr, paint, circle, bubble, sparkle, twinkles, burst, glow, heart, drawImageH, groundShadow, checkMark, crossMark } from '../engine/draw.js';
import { richText, telopCard, shout, pill, measureRich, FONT, POP } from '../engine/text.js';
import { drawCharacter } from '../art/character.js';
import { podium, podiumFront, searchBar, tapHand, mark, snsButton } from '../art/props.js';

export { C, W, H, LAYOUT, clamp, lerp, ease, prog, pop, fade, inOut, rng, TAU };

// キャラクター（瞬き・口パク込み）
export function char(ctx, lt, o) {
  const talking = o.talking ? o.talking.some(([a, b]) => lt >= a && lt < b) : false;
  drawCharacter(ctx, {
    t: lt,
    blink: blinkAt(lt, o.seed || 0),
    talk: talkAt(lt, talking),
    ...o,
  });
}

// 見出しテロップ: [開始, 終了, テキスト, オプション] のリストから現在のものを出す
export function telops(ctx, lt, list, base = {}) {
  for (const [a, b, text, o = {}] of list) {
    const k = inOut(lt, a, b, 0.42, 0.2);
    if (k > 0) {
      const appear = lt < a + 0.5 ? clamp((lt - a) / 0.5) : 1;
      const leave = lt > b ? 1 - clamp((lt - b) / 0.2) : 1;
      telopCard(ctx, text, W / 2, o.y ?? LAYOUT.telopY, Math.min(appear, 1) * leave, { ...base, ...o });
    }
  }
}

// 小さなチェック付きバッジ（例: お水 ✓）
export function checkBadge(ctx, x, y, k, text, icon, o = {}) {
  if (k <= 0) return;
  const { ok = true, size = 44 } = o;
  const s = ease.outBack(clamp(k), 2.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.font = `900 ${size}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const w = tw + 190, h = 96;
  rr(ctx, -w / 2, -h / 2 + 8, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,60,30,0.16)';
  ctx.fill();
  rr(ctx, -w / 2, -h / 2, w, h, h / 2);
  paint(ctx, '#FFFFFF', ok ? C.brand : C.red, 7);
  if (icon) icon(ctx, -w / 2 + 52, 0);
  ctx.fillStyle = C.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, -w / 2 + 96, 2);
  circle(ctx, w / 2 - 50, 0, 32);
  paint(ctx, ok ? C.brand : C.red, null);
  if (ok) checkMark(ctx, w / 2 - 50, 2, 34, '#FFFFFF', 9);
  else crossMark(ctx, w / 2 - 50, 0, 26, '#FFFFFF', 9);
  ctx.restore();
}

// 吹き出し（文字サイズに合わせて大きさを決める）
export function speech(ctx, text, x, y, k, o = {}) {
  if (k <= 0) return;
  const { size = 48, tail = null, color = C.text, fill = '#FFFFFF', stroke = '#4A3428', accent = C.orangeDeep } = o;
  const m = measureRich(ctx, text, { size, weight: 900, lineHeight: 1.3 });
  const w = m.width + 80, h = m.height + 56;
  const s = ease.outBack(clamp(k), 2.4);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  bubble(ctx, 0, 0, w, h, tail ? { x: tail[0], y: tail[1] } : null, { fill, stroke, lw: 6, r: 44 });
  richText(ctx, text, 0, 2, { size, weight: 900, color, accent, lineHeight: 1.3 });
  ctx.restore();
}

// ラベル（丸いピル）
export function label(ctx, text, x, y, k, o = {}) {
  if (k <= 0) return;
  const s = ease.outBack(clamp(k), 2.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(o.rot || 0);
  const { size = 44, bg = C.brand, color = '#FFFFFF' } = o;
  pill(ctx, text, 0, 0, { size, bg, color, stroke: '#FFFFFF', lw: 7, padX: 34 });
  ctx.restore();
}

// ハンコ風の文字
export function stamp(ctx, text, x, y, k, o = {}) {
  if (k <= 0) return;
  const { color = C.red, rot = -0.18, size = 64 } = o;
  const s = lerp(2.2, 1, ease.outCubic(clamp(k)));
  ctx.save();
  ctx.globalAlpha *= clamp(k * 3);
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.font = `900 ${size}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  rr(ctx, -tw / 2 - 30, -size * 0.8, tw + 60, size * 1.6, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 3);
  ctx.restore();
}

// 浮かぶハテナ
export function questionMarks(ctx, lt, t0, spots, o = {}) {
  const { ch = '？', color = C.orange } = o;
  spots.forEach(([x, y, size, rot], i) => {
    const k = pop(lt, t0 + i * 0.18, 0.4);
    if (k <= 0) return;
    const bob = Math.sin((lt - t0) * 3 + i) * 10;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(k, k);
    mark(ctx, ch, 0, 0, size, { color, rot: rot + Math.sin((lt - t0) * 2.4 + i) * 0.12 });
    ctx.restore();
  });
}

// カード（見出しつき）
export function card(ctx, x, y, w, h, k, o = {}, content = null) {
  if (k <= 0) return;
  const { title = '', color = C.brand, bg = '#FFFFFF', rot = 0 } = o;
  const s = ease.outBack(clamp(k), 1.8);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  rr(ctx, -w / 2, -h / 2 + 12, w, h, 36);
  ctx.fillStyle = 'rgba(0,60,30,0.16)';
  ctx.fill();
  rr(ctx, -w / 2, -h / 2, w, h, 36);
  paint(ctx, bg, color, 8);
  if (title) {
    ctx.save();
    rr(ctx, -w / 2, -h / 2, w, h, 36);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, 92);
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 50px ${FONT}`;
    ctx.fillText(title, 0, -h / 2 + 48);
  }
  if (content) content(ctx);
  ctx.restore();
}

// 台の上に商品写真を落とす（下端は台の手前で隠す）
export function productDrop(ctx, img, x, podiumY, h, lt, t0, o = {}) {
  const { podiumW = 360, sink = 26, glowAmt = 0, scale = 1, showPodium = true, t = lt, shine = true, top = C.brand, side = C.brandDark, podiumIn = null } = o;
  const k = clamp((lt - t0) / 0.55);
  // 台そのものもポンッと出す（podiumIn 秒から）
  const pk = podiumIn == null ? 1 : ease.outBack(clamp((lt - podiumIn) / 0.4), 2);
  const drawPodium = (front) => {
    if (!showPodium || pk <= 0) return;
    ctx.save();
    ctx.translate(x, podiumY);
    ctx.scale(pk, pk);
    ctx.translate(-x, -podiumY);
    if (front) podiumFront(ctx, x, podiumY, podiumW, { side });
    else podium(ctx, x, podiumY, podiumW, { top, side });
    ctx.restore();
  };
  drawPodium(false);
  if (lt < t0) {
    drawPodium(true);
    return;
  }
  const drop = (1 - ease.outBounce(k)) * -700;
  const sq = lt - t0 < 0.7 ? Math.sin(clamp((lt - t0 - 0.35) / 0.35) * Math.PI) * 0.06 : 0;
  if (glowAmt > 0) glow(ctx, x, podiumY - h * 0.5, h * 0.95, '#FFF4A8', 0.75 * glowAmt);
  ctx.save();
  ctx.translate(x, podiumY + sink + drop);
  ctx.scale(scale * (1 + sq), scale * (1 - sq));
  ctx.globalAlpha *= clamp(k * 4);
  drawImageH(ctx, img, 0, 0, h, { anchor: 'bottom' });
  ctx.restore();
  if (shine && k >= 1) {
    const tt = (lt - t0 - 0.6) % 2.4;
    if (tt > 0 && tt < 0.6) {
      // 光の帯が通る
      ctx.save();
      const w = (img.width / img.height) * h * scale;
      ctx.beginPath();
      ctx.rect(x - w / 2, podiumY + sink - h * scale, w, h * scale - sink);
      ctx.clip();
      const px = lerp(x - w, x + w, tt / 0.6);
      const g = ctx.createLinearGradient(px - 80, 0, px + 80, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.translate(px, podiumY);
      ctx.rotate(0.35);
      ctx.fillRect(-80, -1400, 160, 2800);
      ctx.restore();
    }
  }
  drawPodium(true);
}

// 写真をポンッと出す（台なし）
export function productPop(ctx, img, x, y, h, lt, t0, o = {}) {
  const { rot = 0, glowAmt = 0, shadow = true } = o;
  const k = pop(lt, t0, 0.5);
  if (k <= 0) return;
  if (glowAmt > 0) glow(ctx, x, y - h * 0.5, h * 0.9, '#FFF4A8', 0.7 * glowAmt);
  if (shadow) groundShadow(ctx, x, y + 6, h * 0.28 * k, 22 * k, 0.25);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(lt * 2) * 0.015);
  ctx.scale(k, k);
  drawImageH(ctx, img, 0, 0, h, { anchor: 'bottom' });
  ctx.restore();
}

// ロゴカード
export function logoCard(ctx, img, x, y, w, k) {
  if (k <= 0) return;
  const s = ease.outBack(clamp(k), 1.8);
  const h = (img.height / img.width) * w;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  rr(ctx, -w / 2 - 50, -h / 2 - 40 + 12, w + 100, h + 80, 40);
  ctx.fillStyle = 'rgba(0,60,30,0.16)';
  ctx.fill();
  rr(ctx, -w / 2 - 50, -h / 2 - 40, w + 100, h + 80, 40);
  paint(ctx, '#FFFFFF', null);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// エンドカード: ロゴ＋「ハイポネックス」で検索
export function endCard(ctx, lt, t0, images, o = {}) {
  const { y = 760, word = 'ハイポネックス' } = o;
  const k1 = clamp((lt - t0) / 0.5);
  if (k1 <= 0) return;
  // 背景を少し白く
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${0.55 * ease.outQuad(k1)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  logoCard(ctx, images.logo, W / 2, y - 190, 560, k1);
  const k2 = clamp((lt - t0 - 0.35) / 0.4);
  if (k2 > 0) {
    ctx.save();
    ctx.globalAlpha *= k2;
    ctx.translate(0, (1 - ease.outCubic(k2)) * 60);
    const typed = clamp((lt - t0 - 0.7) / 0.9);
    searchBar(ctx, W / 2, y + 30, 900, word, typed, { t: lt });
    ctx.restore();
    const tapT = lt - t0 - 1.9;
    if (tapT > 0) {
      const press = tapT < 0.25 ? tapT / 0.25 : clamp(1 - (tapT - 0.25) / 0.3);
      tapHand(ctx, W / 2 + 390, y + 70, 0.9, press);
    }
  }
}

// エンドカード: ロゴ＋チャンネル登録・いいね
export function endCardSNS(ctx, lt, t0, images, o = {}) {
  const { y = 700 } = o;
  const k1 = clamp((lt - t0) / 0.5);
  if (k1 <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${0.55 * ease.outQuad(k1)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  logoCard(ctx, images.logo, W / 2, y - 120, 560, k1);
  const uk = ease.outBack(clamp((lt - t0 - 0.3) / 0.5));
  if (uk <= 0) return;
  ctx.save();
  ctx.translate(0, (1 - uk) * 120);
  ctx.globalAlpha *= clamp(uk * 2);
  snsButton(ctx, 'subscribe', 420, y + 170, 1.0, { active: 0 });
  snsButton(ctx, 'like', 850, y + 170, 0.95, { active: lt > t0 + 1.9 ? 1 : 0 });
  ctx.restore();
  const tapAt = lt < t0 + 1.5 ? t0 + 1.0 : t0 + 1.9;
  const tx = lt < t0 + 1.5 ? 520 : 870;
  const press = clamp(1 - Math.abs(lt - tapAt) / 0.2);
  tapHand(ctx, tx, y + 240, 0.95, press);
  if (lt > t0 + 1.9) burst(ctx, 850, y + 170, lt - t0 - 1.9, { r0: 90, r1: 170, color: '#FF4F7B' });
}

// 「ぐぅ～」などの擬音
export function onomatopoeia(ctx, text, x, y, lt, t0, o = {}) {
  const { size = 72, color = C.orangeDeep, rot = -0.12, dur = 99 } = o;
  const k = pop(lt, t0, 0.35);
  if (k <= 0 || lt > t0 + dur) return;
  const wob = Math.sin((lt - t0) * 14) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + wob);
  ctx.scale(k, k);
  richText(ctx, text, 0, 0, { size, weight: 900, family: POP, color, strokes: [['#4A3428', size * 0.28], ['#FFFFFF', size * 0.16]] });
  ctx.restore();
}

export { sparkle, twinkles, burst, glow, heart, shout, richText, groundShadow, drawImageH };
