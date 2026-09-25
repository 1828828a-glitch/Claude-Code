// 動画1本分の進行: シーン切り替え、ヘッダー、字幕、場面転換
import { W, H, C, LAYOUT, clamp, ease, prog, lerp } from './core.js';
import { rr, paint, circle, leafPath } from './draw.js';
import { FONT, subtitle, richText } from './text.js';

const TRANS_OUT = 0.26;
const TRANS_IN = 0.34;

export function sceneAt(video, t) {
  const scenes = video.scenes;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const end = i < scenes.length - 1 ? scenes[i + 1].start : video.duration;
    if (t < end || i === scenes.length - 1) return { scene: s, index: i, end };
  }
  return { scene: scenes[0], index: 0, end: video.duration };
}

// 上部のヘッダー（ロゴ＋シリーズ名）
function header(ctx, video, images, t) {
  const k = 1;
  const y = LAYOUT.headerY;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.translate(0, (1 - k) * -30);
  // ロゴ
  const logo = images.logo;
  const lh = 58;
  const lw = (logo.width / logo.height) * lh;
  const px = 44;
  rr(ctx, px, y - 44, lw + 44, 88, 44);
  ctx.fillStyle = 'rgba(0,70,30,0.14)';
  ctx.fill();
  rr(ctx, px, y - 48, lw + 44, 88, 44);
  paint(ctx, '#FFFFFF', null);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(logo, px + 22, y - 4 - lh / 2, lw, lh);
  // シリーズ名
  const sx = px + lw + 64;
  ctx.font = `900 36px ${FONT}`;
  const label = '園芸の基本';
  const tw = ctx.measureText(label).width;
  const bw = tw + 118;
  rr(ctx, sx, y - 44, bw, 84, 42);
  paint(ctx, C.brand, '#FFFFFF', 6);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, sx + 28, y - 1);
  circle(ctx, sx + bw - 40, y - 2, 28);
  paint(ctx, C.yellow, '#FFFFFF', 4);
  ctx.fillStyle = C.brandDeep;
  ctx.textAlign = 'center';
  ctx.font = `900 34px ${FONT}`;
  ctx.fillText(String(video.episode), sx + bw - 40, y);
  ctx.restore();
}

// 場面転換: 葉っぱ色の円が角から広がって画面をおおい、中央から丸く開いて次の場面へ
function wipeIn(ctx, p, dir = 1) {
  if (p <= 0) return;
  const R = Math.hypot(W, H);
  const cx = dir > 0 ? W * 0.85 : W * 0.15;
  const cy = H * 0.72;
  const r1 = R * ease.inOutCubic(clamp(p * 1.12));
  const r2 = R * ease.inOutCubic(clamp(p * 1.12 - 0.12));
  ctx.save();
  circle(ctx, cx, cy, r1);
  ctx.fillStyle = C.yellowGreen;
  ctx.fill();
  circle(ctx, cx, cy, r2);
  ctx.fillStyle = C.brand;
  ctx.fill();
  ctx.restore();
}
function wipeOut(ctx, q) {
  // q: 0=全面おおう → 1=すべて見える
  if (q >= 1) return;
  const R = Math.hypot(W, H) * 0.6;
  const cx = W / 2, cy = H * 0.47;
  const hole = R * ease.outCubic(clamp(q));
  const ring = R * ease.outCubic(clamp(q * 1.25));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, Math.max(0, ring), 0, Math.PI * 2, true);
  ctx.fillStyle = C.brand;
  ctx.fill('evenodd');
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, ring), 0, Math.PI * 2);
  ctx.arc(cx, cy, Math.max(0, hole), 0, Math.PI * 2, true);
  ctx.fillStyle = C.yellowGreen;
  ctx.fill('evenodd');
  // 中央の葉っぱ
  if (q < 0.35) {
    const k = 1 - q / 0.35;
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.rotate(-0.6);
    leafPath(ctx, 120, 48);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }
  ctx.restore();
}

function activeSub(scene, lt) {
  if (!scene.subs) return null;
  for (const [s, e, text] of scene.subs) {
    if (lt >= s && lt < e) return { s, e, text };
  }
  return null;
}

// 画面下の帯（タイトル）
function bottomBand(ctx, video, t) {
  const y = LAYOUT.bandY;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, y + 30);
  for (let x = 0; x <= W; x += 90) {
    ctx.quadraticCurveTo(x + 45, y + 30 + (Math.floor(x / 90) % 2 ? 22 : -22), x + 90, y + 30);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, C.brand);
  g.addColorStop(1, C.brandDeep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.stroke();
  // 葉っぱ模様
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 9; i++) {
    ctx.save();
    ctx.translate(60 + i * 124, y + 150 + (i % 2) * 120);
    ctx.rotate(-0.7 + i * 0.4 + Math.sin(t * 0.8 + i) * 0.1);
    leafPath(ctx, 90, 36);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `800 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ハイポネックス 園芸の基本 #${video.episode}`, W / 2, y + 112);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 44px ${FONT}`;
  ctx.fillText(video.title, W / 2, y + 170);
  ctx.restore();
}

// 注意書き（字幕の上の小さな札）
function noteTag(ctx, text, k) {
  ctx.save();
  ctx.globalAlpha *= k;
  let fs = 32;
  ctx.font = `800 ${fs}px ${FONT}`;
  let tw = ctx.measureText(text).width;
  if (tw > 900) {
    fs = Math.floor(fs * 900 / tw);
    ctx.font = `800 ${fs}px ${FONT}`;
    tw = ctx.measureText(text).width;
  }
  const w = tw + 44, h = 54, y = LAYOUT.subY - 128;
  rr(ctx, W / 2 - w / 2, y - h / 2, w, h, h / 2);
  paint(ctx, '#FFF6D6', C.orangeDeep, 4);
  ctx.fillStyle = '#B23A12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, y + 1);
  ctx.restore();
}

export function renderVideo(ctx, video, t, images) {
  const { scene, index, end } = sceneAt(video, t);
  const lt = t - scene.start;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // ゆっくり寄っていくカメラ（止まった画面に見えないように）
  const dur = end - scene.start;
  const z = 1 + 0.028 * ease.inOutSine(clamp(lt / dur));
  ctx.translate(W / 2, 900);
  ctx.scale(z, z);
  ctx.translate(-W / 2, -900);
  scene.draw(ctx, lt, { t, images, video, dur });
  ctx.restore();
  bottomBand(ctx, video, t);

  // 字幕
  const sub = activeSub(scene, lt);
  if (sub) {
    const kIn = clamp((lt - sub.s) / 0.16);
    const kOut = clamp((sub.e - lt) / 0.12);
    subtitle(ctx, sub.text, Math.min(kIn, kOut));
  }
  // 注意書き（小さめテロップ）
  if (scene.note) {
    const [ns, ne, ntext] = scene.note;
    const k = clamp(Math.min((lt - ns) / 0.3, (ne - lt) / 0.3));
    if (k > 0) noteTag(ctx, ntext, k);
  }
  if (!video.noHeader) header(ctx, video, images, t);

  // 場面転換
  const isLast = index === video.scenes.length - 1;
  if (!isLast && t > end - TRANS_OUT) {
    wipeIn(ctx, (t - (end - TRANS_OUT)) / TRANS_OUT, index % 2 ? -1 : 1);
  }
  if (index > 0 && lt < TRANS_IN) {
    wipeOut(ctx, lt / TRANS_IN);
  }
}

// 効果音のタイミングを集める（場面転換の音も自動で入れる）
export function collectCues(video) {
  const cues = [];
  video.scenes.forEach((s, i) => {
    (s.cues || []).forEach(([time, name, gain = 1, ...args]) => cues.push({ time: s.start + time, name, gain, args }));
    if (i > 0) cues.push({ time: s.start - TRANS_OUT, name: 'swipe', gain: 0.7 });
  });
  return cues.sort((a, b) => a.time - b.time);
}

// 字幕の読みやすさチェック（1秒あたりの文字数）
export function checkSubs(video) {
  const warn = [];
  video.scenes.forEach((s) => {
    (s.subs || []).forEach(([a, b, text]) => {
      const n = text.replace(/[*\n{}|]/g, '').length;
      const cps = n / (b - a);
      if (cps > 7.5) warn.push(`${(s.start + a).toFixed(1)}s ${cps.toFixed(1)}字/秒: ${text.replace(/\n/g, '')}`);
    });
  });
  return warn;
}

export { lerp };
