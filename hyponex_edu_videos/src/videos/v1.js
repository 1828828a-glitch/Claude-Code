// #1 肥料とは？植物に肥料は必要なの？
import {
  C, W, LAYOUT, clamp, lerp, ease, prog, pop, fade, inOut,
  char, telops, checkBadge, speech, label, stamp, questionMarks, card,
  productDrop, endCard, onomatopoeia, sparkle, twinkles, burst, glow, shout, richText,
} from './common.js';
import { kf } from '../engine/core.js';
import { mixPose } from '../art/character.js';
import { drawPottedPlant, drawNPKPlant, drawPot } from '../art/plants.js';
import {
  wateringCan, waterStream, waterGlass, hamburgPlate, dropIcon, sunIcon, fertBowl,
  nutrientBadge, scoop, granuleRain, trowel, clockIcon,
} from '../art/props.js';
import { bgRoom, bgSoft, bgGarden } from '../art/scenery.js';
import { paint, circle, ellipse } from '../engine/draw.js';

const FEET = LAYOUT.groundY + 12;

const typing = (t0, n, step = 0.13) => Array.from({ length: n }, (_, i) => [t0 + i * step, 'type', 0.8]);

// 栄養素バッジと引き出し線
function nutrient(ctx, lt, t0, x, y, letter, name, sub, color, target, bounceFrom) {
  const k = pop(lt, t0, 0.5);
  if (k <= 0) return;
  const bounce = lt > bounceFrom ? Math.abs(Math.sin((lt - bounceFrom) * 5 + x)) * -16 * Math.exp(-(lt - bounceFrom) * 1.2) : 0;
  ctx.save();
  ctx.globalAlpha *= clamp(k);
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(lerp(x, target[0], clamp(k)), lerp(y, target[1], clamp(k)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.setLineDash([]);
  circle(ctx, target[0], target[1], 14 * clamp(k));
  paint(ctx, color, '#FFFFFF', 6);
  ctx.restore();
  nutrientBadge(ctx, x, y + bounce, 0.9 * k, letter, name, color, { sub });
}

export default {
  id: 'v1',
  episode: 1,
  title: '肥料とは？植物に肥料は必要なの？',
  file: '01_肥料とは_植物に肥料は必要なの',
  duration: 70,
  scenes: [
    // 1. フック（0-10秒）
    {
      start: 0,
      subs: [
        [0.4, 3.3, 'お水も日当たりも*バッチリ！*'],
        [3.4, 6.3, 'なのに植物が*元気ない…*'],
        [6.4, 9.7, 'そんなお悩み、ありませんか？'],
      ],
      cues: [[0.4, 'water', 1.0, 2.8], [1.0, 'pop'], [1.5, 'pop'], [3.5, 'question'], [3.72, 'question', 0.7], [3.94, 'question', 0.6], [6.5, 'boing', 0.8]],
      draw(ctx, lt) {
        bgRoom(ctx, lt, { floorY: LAYOUT.groundY });
        const v = kf(lt, [[0, 0.42], [3.3, 0.42], [4.4, 0.2, 'outCubic']]);
        drawPottedPlant(ctx, 812, FEET, 1.3, { vitality: v, face: lt < 3.5 ? 'neutral' : 'sad', t: lt, seed: 3 });
        const watering = lt < 3.2;
        const pk = clamp((lt - 3.2) / 0.45);
        const pose = watering ? 'water' : mixPose('water', 'idle', ease.inOutCubic(pk));
        const expr = lt < 3.4 ? 'smile' : lt < 6.4 ? 'worried' : 'sad';
        const S = 1.12;
        char(ctx, lt, {
          kind: 'beginner', x: 270, y: FEET, s: S, pose, expr, seed: 1,
          sweatDrop: lt > 3.6,
          holdR: (g, hx, hy) => {
            const ang = watering ? 0.46 + Math.sin(lt * 3) * 0.03 : lerp(0.46, 0.02, ease.inOutCubic(pk));
            const res = wateringCan(g, hx, hy, 0.74, ang);
            // 土の高さ（キャラクターのローカル座標）
            const soilY = (FEET - 160 * 1.3 - FEET) / S + 10;
            if (watering && lt > 0.3) waterStream(g, res.rose[0], res.rose[1], lt, { dir: 1.05, speed: 260, spread: 0.35, gravity: 1300, n: 28, floorY: soilY });
          },
        });
        // チェックバッジ
        const bOut = 1 - clamp((lt - 3.3) / 0.25);
        checkBadge(ctx, 290, LAYOUT.telopY, pop(lt, 1.0) * bOut, 'お水', (g, x, y) => dropIcon(g, x, y + 4, 30));
        checkBadge(ctx, 760, LAYOUT.telopY, pop(lt, 1.5) * bOut, '日当たり', (g, x, y) => sunIcon(g, x, y, 20, lt, { face: false }));
        telops(ctx, lt, [[3.5, 9.8, 'なんで*元気ない*の…？', { accent: C.red, size: 80 }]]);
        const hy = FEET - 475 * S;
        questionMarks(ctx, lt, 3.5, [[110, hy - 80, 100, -0.3], [450, hy - 150, 124, 0.2], [470, hy + 30, 84, 0.35]]);
      },
    },
    // 2. 原因（10-23.5秒）
    {
      start: 10,
      subs: [
        [0.4, 4.4, '実はそれ、植物が\n*「お腹ペコペコ」*なのかもしれません！'],
        [4.5, 8.7, 'お水は人間にとっての*「水分補給」*。'],
        [8.8, 13.2, '元気に育つための*「ご飯」*が\n足りていないんです。'],
      ],
      cues: [[0.45, 'pop'], [0.9, 'growl'], [2.9, 'growl', 0.7], [4.6, 'whoosh'], [4.9, 'pop'], [5.5, 'pop', 0.6], [8.9, 'pop'], [9.3, 'pop', 0.6], [9.7, 'stamp']],
      draw(ctx, lt) {
        bgSoft(ctx, lt, { top: '#FFF7EA', bottom: '#FFE3CC', pattern: 'dots', pc: 'rgba(255,140,60,0.09)', floor: 'wood' });
        const mk = ease.inOutCubic(clamp((lt - 4.5) / 0.6));
        const CY = 830;
        card(ctx, 285, CY, 440, 470, pop(lt, 4.8, 0.5), { title: 'お水', color: C.blue }, (g) => {
          waterGlass(g, 0, 128, 0.82, { t: lt });
          label(g, '＝ 水分補給', 0, 178, pop(lt, 5.4), { size: 44, bg: C.blue });
        });
        card(ctx, 795, CY, 440, 470, pop(lt, 8.9, 0.5), { title: 'ごはん', color: C.orangeDeep }, (g) => {
          hamburgPlate(g, 0, 40, 0.84, { t: lt });
          label(g, '＝ 元気のもと', 0, 178, pop(lt, 9.3), { size: 44, bg: C.orangeDeep });
        });
        stamp(ctx, '足りてない！', 850, 1000, clamp((lt - 9.7) / 0.28), { size: 56, rot: -0.12 });
        // 植物（はじめは大きく、あとで小さく手前に）
        const s = lerp(1.6, 0.72, mk);
        drawPottedPlant(ctx, 540, FEET, s, { vitality: 0.34, face: 'hungry', t: lt, seed: 3 });
        onomatopoeia(ctx, 'ぐぅ〜', lerp(830, 420, mk), lerp(760, 1120, mk), lt, 0.9, { size: lerp(96, 58, mk), rot: lerp(-0.12, 0.1, mk) });
        telops(ctx, lt, [
          [0.45, 4.4, '植物は*お腹ペコペコ*かも！？', { size: 78 }],
          [4.5, 8.7, 'お水 ＝ *水分補給*', { accent: C.blue, size: 80 }],
          [8.8, 13.4, '足りないのは*ごはん*！', { accent: C.orangeDeep, size: 80 }],
        ]);
      },
    },
    // 3. 解決策（23.5-44.5秒）
    {
      start: 23.5,
      subs: [
        [0.4, 4.5, '植物の美味しいご飯、\nそれが*「肥料」*です！'],
        [4.6, 8.6, '葉っぱを育てる*「チッソ」*、'],
        [8.7, 12.7, '花や実をつける*「リンサン」*、'],
        [12.8, 16.8, '根っこを元気にする*「カリウム」*という、'],
        [16.9, 20.8, '3つの大切な栄養が\n詰まっています。'],
      ],
      cues: [[0.5, 'pop'], [0.9, 'chime'], [1.1, 'sparkle'], [4.6, 'whoosh'], [5.0, 'pon'], [9.0, 'pon'], [13.1, 'pon'], [17.0, 'sparkle'], [17.2, 'ding']],
      draw(ctx, lt) {
        const phaseB = lt >= 4.6;
        bgSoft(ctx, lt, {
          top: '#F4FBEF', bottom: '#DDF1DF', pattern: phaseB ? 'leaves' : 'rays',
          pc: phaseB ? 'rgba(0,154,68,0.06)' : 'rgba(255,214,70,0.2)', floor: phaseB ? null : 'table', cy: 900,
        });
        if (!phaseB) {
          const k = pop(lt, 0.45, 0.55);
          glow(ctx, 540, 960, 440 * k, '#FFF3A0', 0.8);
          fertBowl(ctx, 540, FEET - 30, 1.7 * k, lt);
          label(ctx, '肥料', 540, FEET + 34, pop(lt, 1.1), { size: 58, bg: C.brand });
          twinkles(ctx, 540, 900, 380, lt, { n: 10, size: 38, color: '#FFFFFF', stroke: C.yellow, seed: 4 });
          burst(ctx, 540, 900, lt - 0.5, { r0: 240, r1: 420, n: 14, color: C.yellow, width: 16 });
          shout(ctx, '植物のごはん ＝ *肥料*！', W / 2, LAYOUT.telopY + 10, clamp((lt - 0.45) / 0.4), { size: 96, color: C.brandDeep, accent: C.orangeDeep });
          return;
        }
        const b = lt - 4.6;
        const all = lt > 16.9 ? 0.85 : 0;
        const pts = drawNPKPlant(ctx, 540, 1010, 0.9, {
          t: lt, grow: 0.75 + 0.25 * ease.outCubic(clamp(b / 1.2)),
          hiN: clamp(inOut(lt, 4.9, 8.6) + all), hiP: clamp(inOut(lt, 8.9, 12.7) + all), hiK: clamp(inOut(lt, 13.0, 16.8) + all),
          rootGrow: 0.55 + 0.45 * ease.outCubic(clamp((lt - 13.0) / 1.6)),
        });
        nutrient(ctx, lt, 4.9, 160, 590, 'N', 'チッソ', '葉っぱ', '#23A05A', [pts.leaf[0] - 120, pts.leaf[1] + 60], 16.9);
        nutrient(ctx, lt, 8.9, 920, 790, 'P', 'リンサン', '花・実', '#F0643C', [pts.flower[0] + 80, pts.flower[1] + 20], 16.9);
        nutrient(ctx, lt, 13.0, 160, 1060, 'K', 'カリウム', '根っこ', '#C98A12', [pts.root[0] - 60, pts.root[1] - 20], 16.9);
        telops(ctx, lt, [[4.7, 16.8, '肥料の*3大栄養素*', { size: 64, y: 330 }], [16.9, 21.2, '3つの栄養が*ギュッ*と！', { size: 66, y: 330 }]]);
        if (lt > 16.9) twinkles(ctx, 540, 840, 440, lt, { n: 12, size: 34, color: '#FFFFFF', stroke: C.yellow, seed: 8 });
      },
    },
    // 4. 商品紹介（44.5-58.5秒）
    {
      start: 44.5,
      subs: [
        [0.4, 4.3, '「でも、何をあげればいいの？」\nと迷ったら！'],
        [4.4, 9.4, '土に混ぜるだけで*長〜く効く*'],
        [9.5, 13.8, '*「マグァンプK」*がおすすめです。'],
      ],
      cues: [[0.6, 'question'], [1.0, 'boing', 0.6], [4.5, 'whoosh'], [4.95, 'stamp'], [5.4, 'shine'], [6.2, 'pour', 1, 1.6], [7.95, 'slide'], [9.6, 'pop'], [9.9, 'shine'], [10.2, 'sparkle']],
      draw(ctx, lt, env) {
        const B = lt >= 4.4;
        bgSoft(ctx, lt, { top: '#FFFBEF', bottom: '#FFF0D2', pattern: B ? 'rays' : 'dots', pc: B ? 'rgba(255,210,63,0.16)' : 'rgba(0,154,68,0.07)', floor: 'wood', cx: 540, cy: 860 });
        if (!B) {
          const S = 1.15;
          char(ctx, lt, { kind: 'beginner', x: 470, y: FEET, s: S, pose: 'think', expr: 'puzzled', seed: 2, headTilt: Math.sin(lt * 1.4) * 0.05 - 0.08 });
          speech(ctx, '何をあげれば\n*いいの？*', 770, 590, pop(lt, 0.5, 0.45), { tail: [-150, 120], size: 60 });
          const hy = FEET - 475 * S;
          questionMarks(ctx, lt, 0.8, [[230, hy - 40, 96, -0.3], [300, hy - 170, 76, 0.1]]);
          return;
        }
        const toCenter = ease.inOutCubic(clamp((lt - 9.5) / 0.7));
        const bx = lerp(310, 540, toCenter);
        const bh = lerp(560, 660, toCenter);
        // 右: 鉢に肥料をまく
        if (toCenter < 1) {
          ctx.save();
          ctx.globalAlpha *= 1 - toCenter;
          ctx.translate(toCenter * 320, 0);
          const px = 800, PS = 1.15;
          const soilY = FEET - 160 * PS + 12;
          ellipse(ctx, px, soilY, 96 * PS, 18 * PS);
          paint(ctx, '#7A5236', '#4A3428', 6);
          const landed = clamp((lt - 6.3) / 1.5);
          const mixed = clamp((lt - 8.0) / 1.2);
          for (let i = 0; i < 18 * landed; i++) {
            const gx = px + Math.sin(i * 12.9) * 80;
            const gy = soilY - 2 + Math.cos(i * 7.3) * 9;
            circle(ctx, gx, gy, 9 * (1 - mixed * 0.7));
            paint(ctx, '#F7F7F2', '#7A6A5A', 2.5);
          }
          drawPot(ctx, px, FEET, PS, { face: lt > 8.2 ? 'happy' : 'neutral', t: lt });
          const sk = clamp((lt - 5.8) / 0.4);
          if (lt < 8.0) {
            const tilt = lerp(-0.2, -1.1, ease.inOutCubic(clamp((lt - 6.1) / 0.4)));
            if (sk > 0) scoop(ctx, px + 40 + (1 - sk) * 600, 810, 1.1, tilt, { fill: 1 - clamp((lt - 6.3) / 1.4) });
            if (lt > 6.3 && lt < 7.9) granuleRain(ctx, px - 20, 850, lt, { width: 70, fall: soilY - 860, n: 20 });
          } else {
            trowel(ctx, px + 20, soilY - 40, 1.0, Math.sin((lt - 8.0) * 9) * 0.4);
          }
          if (lt > 6.3 && lt < 8.0) onomatopoeia(ctx, 'パラパラ…', px - 20, 700, lt, 6.4, { size: 58, color: C.brand, rot: -0.08 });
          if (lt > 8.0) onomatopoeia(ctx, 'まぜまぜ', px - 10, 860, lt, 8.05, { size: 58, color: C.orangeDeep, rot: -0.08 });
          ctx.restore();
        }
        productDrop(ctx, env.images.magamp, bx, 1170, bh, lt, 4.7, { podiumW: lerp(380, 460, toCenter), glowAmt: toCenter });
        if (lt > 9.5) {
          twinkles(ctx, bx, 860, 400, lt, { n: 10, size: 36, color: '#FFFFFF', stroke: C.yellow, seed: 12 });
          const k = pop(lt, 9.9, 0.5);
          if (k > 0) {
            ctx.save();
            ctx.translate(920, 700);
            ctx.scale(k, k);
            clockIcon(ctx, 0, 0, 60, lt);
            ctx.restore();
            label(ctx, '長〜く効く！', 880, 808, k, { size: 46, bg: C.brand, rot: 0.06 });
          }
        }
        telops(ctx, lt, [
          [4.5, 9.4, '土に*混ぜるだけ*！', { size: 80 }],
          [9.6, 14.2, 'おすすめは*マグァンプK*', { size: 74, accent: C.red }],
        ]);
      },
    },
    // 5. オチ（58.5-70秒）
    {
      start: 58.5,
      subs: [
        [0.4, 3.6, '植物にもしっかりご飯をあげて、'],
        [3.7, 6.7, '園芸をもっと楽しみましょう！'],
        [6.8, 11.5, '詳しくは*「ハイポネックス」*で検索！'],
      ],
      note: [0.8, 11.5, '※肥料のあげすぎには注意してね！'],
      cues: [[0.5, 'sparkle'], [0.8, 'chime'], [1.4, 'fanfare'], [6.9, 'whoosh'], ...typing(7.6, 7, 0.13), [8.75, 'tap'], [9.0, 'ding']],
      draw(ctx, lt, env) {
        bgGarden(ctx, lt, { flowers: clamp((lt - 0.4) / 1.4), floorY: LAYOUT.groundY });
        const v = lerp(0.45, 1, ease.outBack(clamp((lt - 0.5) / 1.2), 1.4));
        glow(ctx, 800, 960, 360 * clamp((lt - 0.4) / 0.6), '#FFF6B0', 0.6);
        drawPottedPlant(ctx, 800, FEET, 1.35, { vitality: clamp(v, 0, 1.05), face: 'happy', t: lt, seed: 3, bloom: 0.8 + 0.2 * v });
        const waveAng = Math.sin(lt * 8) * 14;
        const P = lt < 3.7 ? 'cheer' : { L: [106, 98, 'fist'], R: [-25, -85 + waveAng, 'open'] };
        char(ctx, lt, { kind: 'beginner', x: 280, y: FEET, s: 1.12, pose: P, expr: 'joy', seed: 3, bob: Math.abs(Math.sin(lt * 5)) * (lt < 3.7 ? 20 : 0) });
        twinkles(ctx, 800, 860, 320, lt, { n: 9, size: 32, color: '#FFFFFF', stroke: C.yellow, seed: 5 });
        telops(ctx, lt, [[0.5, 6.7, '植物にも*ごはん*を！', { size: 84 }]]);
        endCard(ctx, lt, 6.8, env.images, { y: 830 });
      },
    },
  ],
};
