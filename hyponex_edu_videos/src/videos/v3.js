// #3 肥料の「元肥（もとごえ）」とは？
import {
  C, W, LAYOUT, clamp, lerp, ease, pop, inOut,
  char, telops, speech, label, stamp, card, productDrop, logoCard,
  onomatopoeia, twinkles, burst, glow, shout, richText, heart, drawImageH,
} from './common.js';
import { mixPose } from '../art/character.js';
import { drawPottedPlant, drawSeedling, drawSoilSection, drawPlant } from '../art/plants.js';
import { wateringCan, waterStream, bento, batteryIcon, scoop, granuleRain, trowel, calendarIcon, clockIcon } from '../art/props.js';
import { bgSoft, bgGarden } from '../art/scenery.js';
import { circle, paint, rr, sweat, checkMark, ellipse } from '../engine/draw.js';
import { FONT } from '../engine/text.js';

const FEET = LAYOUT.groundY + 12;

// 根が肥料の粒にふれている拡大図
function rootCloseup(ctx, x, y, r, k, lt) {
  if (k <= 0) return;
  const s = ease.outBack(clamp(k), 1.6);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  circle(ctx, 0, 12, r);
  ctx.fillStyle = 'rgba(0,60,30,0.18)';
  ctx.fill();
  circle(ctx, 0, 0, r);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#8C5E3E');
  g.addColorStop(1, '#5A3A26');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 30; i++) {
    circle(ctx, Math.sin(i * 7.1) * r * 0.9, Math.cos(i * 3.3) * r * 0.9, 6 + (i % 4) * 3);
    ctx.fill();
  }
  // 根
  const wig = Math.sin(lt * 2) * 6;
  ctx.beginPath();
  ctx.moveTo(-r - 20, -r * 0.5);
  ctx.bezierCurveTo(-r * 0.4, -r * 0.4, -r * 0.2, r * 0.1 + wig, r * 0.12, r * 0.12);
  ctx.strokeStyle = '#4A3428';
  ctx.lineWidth = 46;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = '#F4E3C3';
  ctx.lineWidth = 36;
  ctx.stroke();
  // 根の先の顔
  ctx.fillStyle = '#4A3428';
  circle(ctx, r * 0.02, r * 0.06, 4.5);
  ctx.fill();
  circle(ctx, r * 0.13, r * 0.02, 4.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.09, r * 0.1, 7, 0.1, Math.PI - 0.1);
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // 粒
  for (const [gx, gy, gr] of [[r * 0.29, r * 0.2, 36], [r * 0.12, r * 0.55, 30], [-r * 0.36, r * 0.5, 32], [r * 0.55, -r * 0.3, 28], [-r * 0.1, -r * 0.62, 26]]) {
    glow(ctx, gx, gy, gr * 2.2, '#FFF6B0', 0.55);
    circle(ctx, gx, gy, gr);
    paint(ctx, '#F7F7F2', '#7A6A5A', 4);
    circle(ctx, gx - gr * 0.3, gy - gr * 0.3, gr * 0.28);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.restore();
  circle(ctx, 0, 0, r);
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#4A3428';
  ctx.stroke();
  // 持ち手（虫めがね）
  ctx.save();
  ctx.rotate(0.8);
  rr(ctx, r + 6, -22, 150, 44, 22);
  paint(ctx, C.brand, '#4A3428', 5);
  ctx.restore();
  ctx.restore();
}

// 12か月のゲージ
function monthBar(ctx, x, y, w, k, lt) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 3);
  const h = 56;
  rr(ctx, x - w / 2, y - h / 2 + 8, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,60,30,0.16)';
  ctx.fill();
  rr(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  paint(ctx, '#FFFFFF', '#4A3428', 5);
  const fillW = (w - 16) * ease.inOutSine(clamp(k));
  rr(ctx, x - w / 2 + 8, y - h / 2 + 8, Math.max(h - 16, fillW), h - 16, (h - 16) / 2);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, C.yellowGreen);
  g.addColorStop(1, C.brand);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#4A3428';
  ctx.font = `900 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let m = 1; m <= 12; m += 1) {
    const px = x - w / 2 + 8 + ((w - 16) * m) / 12;
    if (m < 12) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(px - 1.5, y - h / 2 + 12, 3, h - 24);
    }
  }
  ctx.fillStyle = '#4A3428';
  ctx.fillText('植えつけ', x - w / 2 + 70, y + 58);
  ctx.fillText('約1年', x + w / 2 - 54, y + 58);
  ctx.restore();
}

export default {
  id: 'v3',
  episode: 3,
  title: '肥料の「元肥（もとごえ）」とは？',
  file: '03_肥料の元肥とは',
  duration: 66,
  scenes: [
    // 1. 0-8.5秒: フック
    {
      start: 0,
      subs: [
        [0.3, 2.6, '可愛いお花の苗！'],
        [2.7, 8.2, '買ってきてそのままの土で\n植えちゃってませんか？'],
      ],
      cues: [[0.35, 'pop'], [0.7, 'sparkle'], [2.8, 'slide'], [3.3, 'stamp'], [3.35, 'impact', 0.6]],
      draw(ctx, lt) {
        bgSoft(ctx, lt, { top: '#FFF3F6', bottom: '#FFE1EA', pattern: 'dots', pc: 'rgba(255,120,160,0.10)', floor: 'table' });
        const k = 1 + Math.sin(clamp(lt / 0.6) * Math.PI) * 0.04;
        glow(ctx, 540, 900, 420 * k, '#FFFFFF', 0.8);
        ctx.save();
        ctx.translate(540, FEET - 10);
        ctx.scale(k, k);
        drawSeedling(ctx, 0, 0, 1.95, { t: lt });
        ctx.restore();
        // ハート
        for (let i = 0; i < 5; i++) {
          const hk = pop(lt, 0.7 + i * 0.12, 0.4);
          if (hk <= 0) continue;
          const a = -2.6 + i * 0.55;
          const hx = 540 + Math.cos(a) * 420, hy = 800 + Math.sin(a) * 300 + Math.sin(lt * 3 + i) * 12;
          heart(ctx, hx, hy, 60 * hk);
          paint(ctx, '#FF7FA8', '#FFFFFF', 6);
        }
        label(ctx, '買ってきた苗', 300, 1130, pop(lt, 0.9), { size: 42, bg: '#FF7FA8', rot: -0.08 });
        // キャラクターが心配そうにのぞき込む
        const pk = ease.outBack(clamp((lt - 2.7) / 0.6), 1.3);
        if (lt > 2.7) {
          char(ctx, lt, {
            kind: 'staff', x: lerp(1750, 1060, pk), y: 1620, s: 1.75, lean: -0.36, pose: 'worry', expr: 'worried', seed: 1,
            headTilt: -0.1, sweatDrop: lt > 3.4,
          });
        }
        telops(ctx, lt, [[3.2, 8.4, 'そのまま*植えちゃって*\nませんか？', { size: 76, accent: C.red }]]);
        if (lt > 3.2) burst(ctx, 540, LAYOUT.telopY, lt - 3.25, { r0: 300, r1: 470, n: 16, color: C.yellow, width: 14 });
      },
    },
    // 2. 8.5-19.5秒: スタミナ切れにご注意
    {
      start: 8.5,
      subs: [
        [0.3, 4.3, 'とりあえずお水だけあげれば\nいっか…って、'],
        [4.4, 6.3, '*ちょっと待って！*'],
        [6.4, 10.8, 'それだと植物、途中で\n*スタミナ切れ*しちゃうかも。'],
      ],
      cues: [[0.4, 'water', 0.8, 3.2], [4.4, 'surprise'], [4.6, 'stamp'], [6.4, 'whoosh'], [6.8, 'pop'], [7.2, 'pop'], [8.2, 'boing', 0.7], [9.0, 'buzzer', 0.35]],
      draw(ctx, lt) {
        if (lt < 4.4) {
          bgSoft(ctx, lt, { top: '#F4FBF3', bottom: '#E3F2E4', pattern: 'dots', pc: 'rgba(0,154,68,0.06)', floor: 'wood' });
          drawPottedPlant(ctx, 800, FEET, 1.25, { vitality: 0.85, face: 'neutral', t: lt, seed: 2, flowerColor: '#B58CF0' });
          const S = 1.12;
          char(ctx, lt, {
            kind: 'beginner', x: 270, y: FEET, s: S, pose: 'water', expr: 'gentle', seed: 2,
            holdR: (g, hx, hy) => {
              const res = wateringCan(g, hx, hy, 0.74, 0.46 + Math.sin(lt * 3) * 0.03);
              const soilY = (FEET - 160 * 1.25 - FEET) / S + 10;
              waterStream(g, res.rose[0], res.rose[1], lt, { dir: 1.05, speed: 260, spread: 0.35, gravity: 1300, n: 26, floorY: soilY });
            },
          });
          onomatopoeia(ctx, '〜♪', 470, 640, lt, 0.8, { size: 70, color: C.brand, rot: 0.2 });
          telops(ctx, lt, [[0.35, 4.3, 'とりあえず*お水だけ*で…', { size: 76, accent: C.blue }]]);
          return;
        }
        if (lt < 6.4) {
          bgSoft(ctx, lt, { top: '#FFF7E6', bottom: '#FFE7C4', pattern: 'rays', pc: 'rgba(255,170,40,0.14)', floor: 'wood', cy: 900 });
          const jk = ease.outBack(clamp((lt - 4.4) / 0.45), 1.8);
          char(ctx, lt, { kind: 'staff', x: 540, y: FEET + (1 - jk) * 700, s: 1.15, pose: 'explain', expr: 'explain', seed: 3, talking: [[4.5, 6.2]] });
          shout(ctx, 'ちょっと待って！', W / 2, LAYOUT.telopY, clamp((lt - 4.45) / 0.3), { size: 116, color: C.orangeDeep });
          return;
        }
        bgSoft(ctx, lt, { top: '#F7F7F2', bottom: '#ECEBE2', pattern: 'dots', pc: 'rgba(90,90,70,0.06)', floor: 'wood' });
        const drop = ease.inOutCubic(clamp((lt - 7.6) / 1.8));
        drawPottedPlant(ctx, 290, FEET, 1.15, { vitality: lerp(0.85, 0.18, drop), face: drop > 0.4 ? 'sad' : 'neutral', t: lt, seed: 2, flowerColor: '#B58CF0' });
        drawPottedPlant(ctx, 790, FEET, 1.15, { vitality: 1, face: 'happy', t: lt, seed: 4, flowerColor: '#B58CF0' });
        if (drop > 0.3) {
          sweat(ctx, 400, 880, 30, lt);
          sweat(ctx, 190, 930, 24, lt + 0.5);
        }
        label(ctx, 'お水だけ', 290, 1180, pop(lt, 6.8), { size: 44, bg: '#8E9A92' });
        label(ctx, '栄養あり', 790, 1180, pop(lt, 7.2), { size: 44, bg: C.brand });
        const bk = pop(lt, 8.1, 0.4);
        if (bk > 0) {
          batteryIcon(ctx, 300, 660, 1.1 * bk, lerp(0.9, 0.12, clamp((lt - 8.1) / 1.2)), lt);
          batteryIcon(ctx, 790, 660, 1.1 * bk, 1, lt);
        }
        telops(ctx, lt, [[6.45, 11.2, '*スタミナ切れ*にご注意！', { size: 78, accent: C.red }]]);
      },
    },
    // 3. 19.5-35.5秒: 元肥＝植物のお弁当
    {
      start: 19.5,
      subs: [
        [0.3, 4.0, 'そこで必要なのが\n*「元肥（もとごえ）」*！'],
        [4.1, 7.4, '元肥は、植物が長く\n元気に育つための'],
        [7.5, 10.5, '*「お弁当」*みたいなものです。'],
        [10.6, 15.6, '植えつける前に、\n土に混ぜておく肥料のことなんですよ。'],
      ],
      cues: [[0.4, 'pop'], [0.7, 'chime'], [0.9, 'sparkle'], [4.2, 'whoosh'], [4.5, 'pop'], [7.7, 'pon'], [7.9, 'sparkle'], [10.7, 'whoosh'], [11.2, 'pour', 1, 1.2], [12.6, 'slide'], [13.4, 'slide'], [14.2, 'pop'], [14.5, 'sparkle', 0.7]],
      draw(ctx, lt) {
        if (lt < 4.1) {
          bgSoft(ctx, lt, { top: '#FFFCEF', bottom: '#F2F7E4', pattern: 'rays', pc: 'rgba(255,210,63,0.18)', cy: 980 });
          const k = pop(lt, 0.35, 0.55);
          ctx.save();
          ctx.translate(540, 1030);
          ctx.scale(k, k);
          drawSoilSection(ctx, 0, 0, 760, 380, { t: lt, granules: 1, mix: 1, glowAmt: 0.6 + 0.4 * Math.sin(lt * 4), plantGrow: 1 });
          ctx.restore();
          twinkles(ctx, 540, 1000, 380, lt, { n: 10, size: 32, color: '#FFFFFF', stroke: C.yellow, seed: 13 });
          shout(ctx, 'そこで*{元肥|もとごえ}*！', W / 2, LAYOUT.telopY + 20, clamp((lt - 0.4) / 0.35), { size: 112, color: C.brandDeep, accent: C.orangeDeep });
          return;
        }
        if (lt < 10.6) {
          bgSoft(ctx, lt, { top: '#FFF8EE', bottom: '#FFEBD6', pattern: 'dots', pc: 'rgba(216,65,47,0.07)', floor: 'table' });
          const bk = pop(lt, 4.4, 0.55);
          ctx.save();
          ctx.translate(400, FEET - 60);
          ctx.scale(bk, bk);
          bento(ctx, 0, 0, 1.45, { lid: ease.inOutCubic(clamp((lt - 7.6) / 0.6)), t: lt });
          ctx.restore();
          if (lt > 7.8) twinkles(ctx, 400, FEET - 200, 330, lt, { n: 9, size: 32, color: '#FFFFFF', stroke: C.yellow, seed: 14 });
          char(ctx, lt, { kind: 'staff', x: 900, y: FEET, s: 1.0, pose: 'present', expr: lt > 7.6 ? 'happy' : 'explain', seed: 4, flip: true, talking: [[4.2, 10.2]] });
          telops(ctx, lt, [[4.15, 10.6, '*{元肥|もとごえ}* ＝ 植物の*お弁当*', { size: 74 }]]);
          return;
        }
        // 植えつけ前に土に混ぜる
        bgSoft(ctx, lt, { top: '#F5FBF2', bottom: '#E2F2E3', pattern: 'leaves', pc: 'rgba(0,154,68,0.06)' });
        const gran = clamp((lt - 11.2) / 1.2);
        const mix = ease.inOutCubic(clamp((lt - 12.6) / 1.2));
        const grow = clamp((lt - 14.0) / 0.8);
        drawSoilSection(ctx, 540, 1040, 820, 400, { t: lt, granules: gran, mix, glowAmt: grow * 0.6, plantGrow: grow, rootGrow: grow });
        if (lt < 12.6) {
          const sk = ease.outCubic(clamp((lt - 10.8) / 0.4));
          if (sk > 0) scoop(ctx, 620 + (1 - sk) * 800, 700, 1.25, lerp(-0.2, -1.1, ease.inOutCubic(clamp((lt - 11.0) / 0.4))), { fill: 1 - gran });
          if (lt > 11.2) granuleRain(ctx, 540, 740, lt, { width: 180, fall: 90, n: 26, amount: 1 - clamp((lt - 12.3) / 0.3) });
        } else if (lt < 14.0) {
          trowel(ctx, 540 + Math.sin((lt - 12.6) * 7) * 200, 930, 1.3, Math.sin((lt - 12.6) * 7) * 0.5);
        }
        label(ctx, '① 土に混ぜる', 330, 650, pop(lt, 11.0), { size: 46, bg: C.orangeDeep, rot: -0.05 });
        label(ctx, '② 植えつけ', 760, 650, pop(lt, 14.1), { size: 46, bg: C.brand, rot: 0.05 });
        telops(ctx, lt, [[10.65, 16.0, '植えつける*前*に土に混ぜる', { size: 72 }]]);
      },
    },
    // 4. 35.5-52.5秒: マグァンプK 中粒
    {
      start: 35.5,
      subs: [
        [0.3, 4.3, '例えば、ハイポネックスの\n*「マグァンプK 中粒」*。'],
        [4.4, 7.6, 'これを土にサッと\n混ぜるだけで、'],
        [7.7, 12.0, '約1年間もじわじわ\n栄養が効き続けるんです。'],
        [12.1, 16.6, '根に直接触れても\n安心ですよ。'],
      ],
      cues: [[0.45, 'whoosh'], [0.95, 'stamp'], [1.3, 'shine'], [4.5, 'slide'], [5.0, 'pour', 1, 1.1], [6.3, 'slide'], [7.8, 'pop'], [8.1, 'sparkle', 0.8], [12.2, 'pop'], [12.9, 'chime']],
      draw(ctx, lt, env) {
        bgSoft(ctx, lt, { top: '#FFFBEF', bottom: '#FFF0D2', pattern: 'rays', pc: 'rgba(255,210,63,0.15)', floor: 'wood', cy: 860 });
        const side = ease.inOutCubic(clamp((lt - 4.4) / 0.6));
        const out = ease.inOutCubic(clamp((lt - 12.1) / 0.5));
        const bx = lerp(540, 290, side);
        const bh = lerp(680, 500, side);
        ctx.save();
        ctx.globalAlpha *= 1 - out * 0.85;
        productDrop(ctx, env.images.magamp, bx, 1170, bh, lt, 0.5, { podiumW: lerp(460, 360, side), glowAmt: 1 - side });
        ctx.restore();
        if (lt < 4.4) twinkles(ctx, 540, 820, 400, lt, { n: 10, size: 34, color: '#FFFFFF', stroke: C.yellow, seed: 15 });
        // 右: 混ぜる → じわじわ効く
        if (side > 0 && out < 1) {
          ctx.save();
          ctx.globalAlpha *= clamp(side * 2) * (1 - out);
          const gran = clamp((lt - 5.0) / 1.0);
          const mix = ease.inOutCubic(clamp((lt - 6.3) / 1.0));
          const pulse = lt > 7.7 ? 0.5 + 0.5 * Math.sin(lt * 3) : 0;
          drawSoilSection(ctx, 790, 1050, 470, 300, { t: lt, granules: gran, mix, glowAmt: pulse, plantGrow: 1, plantScale: 0.75, rootGrow: 1 });
          if (lt < 6.3) {
            const sk2 = ease.outCubic(clamp((lt - 4.5) / 0.35));
            scoop(ctx, 850 + (1 - sk2) * 600, 700, 1.0, lerp(-0.2, -1.1, ease.inOutCubic(clamp((lt - 4.8) / 0.4))), { fill: 1 - gran });
            if (lt > 5.0) granuleRain(ctx, 780, 740, lt, { width: 120, fall: 140, n: 20, amount: 1 - clamp((lt - 6.0) / 0.3) });
          } else if (lt < 7.6) {
            trowel(ctx, 790 + Math.sin((lt - 6.3) * 8) * 120, 930, 1.0, Math.sin((lt - 6.3) * 8) * 0.5);
          }
          const ck = pop(lt, 7.8, 0.5);
          if (ck > 0) calendarIcon(ctx, 900, 600, 1.0 * ck, { text: '約1年' });
          monthBar(ctx, 790, 1260, 440, clamp((lt - 8.0) / 3.5), lt);
          ctx.restore();
        }
        rootCloseup(ctx, 540, 870, 300, clamp((lt - 12.2) / 0.5), lt);
        if (lt > 12.9) {
          const k = pop(lt, 12.9, 0.45);
          ctx.save();
          ctx.translate(820, 640);
          ctx.scale(k, k);
          circle(ctx, 0, 0, 74);
          paint(ctx, C.brand, '#FFFFFF', 10);
          checkMark(ctx, 0, 4, 70, '#FFFFFF', 16);
          ctx.restore();
          label(ctx, '安心', 820, 750, k, { size: 50, bg: C.brand });
        }
        telops(ctx, lt, [
          [0.45, 4.35, '例えば…*マグァンプK 中粒*', { size: 70, accent: C.red }],
          [4.4, 7.65, '土に*混ぜるだけ*！', { size: 80 }],
          [7.7, 12.05, '*約1年*じわじわ効く！', { size: 80 }],
          [12.1, 17.0, '根に触れても*安心*', { size: 80, accent: C.brand }],
        ]);
      },
    },
    // 5. 52.5-66秒: エンディング
    {
      start: 52.5,
      subs: [
        [0.3, 3.8, '最初に*「お弁当」*を\n持たせてあげるだけで、'],
        [3.9, 7.4, 'あとはラクして\n綺麗なお花を楽しめます！'],
        [7.5, 10.4, 'ぜひ試してみてくださいね。'],
      ],
      cues: [[0.4, 'sparkle'], [0.7, 'fanfare'], [3.9, 'pop'], [10.5, 'whoosh'], [10.9, 'pon'], [11.2, 'sparkle', 0.7]],
      draw(ctx, lt, env) {
        bgGarden(ctx, lt, { flowers: clamp((lt - 0.3) / 1.2), floorY: LAYOUT.groundY });
        const g = ease.outBack(clamp((lt - 0.3) / 1.0), 1.4);
        ctx.save();
        ctx.translate(800, FEET);
        ctx.scale(g, g);
        drawSeedling(ctx, 0, 0, 1.25, { t: lt });
        ctx.restore();
        ctx.save();
        ctx.translate(560, FEET + 10);
        ctx.scale(g * 0.8, g * 0.8);
        drawSeedling(ctx, 0, 0, 1.0, { t: lt + 1 });
        ctx.restore();
        const waveAng = Math.sin(lt * 8) * 14;
        char(ctx, lt, { kind: 'staff', x: 260, y: FEET, s: 1.08, pose: { L: [106, 98, 'fist'], R: [-25, -85 + waveAng, 'open'] }, expr: 'joy', seed: 8, talking: [[0.3, 10.2]] });
        twinkles(ctx, 700, 880, 380, lt, { n: 10, size: 30, color: '#FFFFFF', stroke: C.yellow, seed: 16 });
        telops(ctx, lt, [[0.35, 10.5, '{元肥|もとごえ}で*ラクして綺麗に*', { size: 70 }]]);
        // エンドカード
        const ek = clamp((lt - 10.5) / 0.5);
        if (ek > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(255,255,255,${0.6 * ease.outQuad(ek)})`;
          ctx.fillRect(0, 0, W, 1920);
          ctx.restore();
          logoCard(ctx, env.images.logo, W / 2, 620, 560, ek);
          const pk = pop(lt, 10.9, 0.5);
          if (pk > 0) {
            ctx.save();
            ctx.translate(540, 1215);
            ctx.scale(pk, pk);
            drawImageH(ctx, env.images.magamp, 0, 0, 440, { anchor: 'bottom' });
            ctx.restore();
            label(ctx, '元肥に「マグァンプK」', 540, 1200, pk, { size: 46, bg: C.brand });
          }
        }
      },
    },
  ],
};
