// #2 活力剤とは？肥料との違いは？
import {
  C, W, LAYOUT, clamp, lerp, ease, pop, inOut,
  char, telops, speech, label, stamp, card, productPop, productDrop, logoCard, endCardSNS,
  onomatopoeia, twinkles, burst, glow, shout, richText,
} from './common.js';
import { kf } from '../engine/core.js';
import { mixPose } from '../art/character.js';
import { drawPottedPlant } from '../art/plants.js';
import {
  fertBag, yakiniku, riceBowl, energyDrink, vitalBottle, thoughtCloud, sunIcon, snsButton, tapHand, mark,
  granuleRain,
} from '../art/props.js';
import { bgSoft, bgAlert, bgGarden } from '../art/scenery.js';
import { focusLines, shakeOffset, crossMark, circle, paint, rr, arrow } from '../engine/draw.js';
import { IMPACT, FONT } from '../engine/text.js';

const FEET = LAYOUT.groundY + 12;

// 丸印（正解）
function okMark(ctx, x, y, r, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(k));
  ctx.strokeStyle = '#E8412B';
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}
function ngMark(ctx, x, y, s, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 3);
  const sc = lerp(1.8, 1, ease.outBack(clamp(k)));
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  crossMark(ctx, 0, 0, s, '#FFFFFF', s * 0.34);
  crossMark(ctx, 0, 0, s, '#E8412B', s * 0.2);
  ctx.restore();
}

export default {
  id: 'v2',
  episode: 2,
  title: '活力剤とは？肥料との違いは？',
  file: '02_活力剤とは_肥料との違いは',
  duration: 62,
  scenes: [
    // 1. 0-7秒: 弱った植物に肥料はNG！？
    {
      start: 0,
      subs: [
        [0.3, 4.4, '植物が元気ない！\nとりあえず肥料をあげよう…'],
        [4.5, 6.8, 'って、*ちょっと待った！*'],
      ],
      cues: [[0.4, 'pop'], [2.3, 'slide'], [4.5, 'buzzer', 0.9], [4.55, 'impact', 0.7], [5.5, 'stamp']],
      draw(ctx, lt) {
        const alert = lt >= 4.5;
        const [sx, sy] = shakeOffset(lt, 4.5, 0.6, 22);
        ctx.save();
        ctx.translate(sx, sy);
        if (alert) {
          bgAlert(ctx, lt, { tapes: [1182] });
          focusLines(ctx, 540, 900, lt, { inner: 420, color: 'rgba(200,60,20,0.18)', n: 60 });
        } else {
          bgSoft(ctx, lt, { top: '#F2F4EE', bottom: '#E4E8DD', pattern: 'dots', pc: 'rgba(80,90,70,0.07)', floor: 'wood' });
        }
        if (alert) {
          // 床
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(0, LAYOUT.groundY, W, 400);
        }
        drawPottedPlant(ctx, 470, FEET, 1.45, { vitality: 0.18, face: alert ? 'surprised' : 'sad', t: lt, seed: 5 });
        // 肥料の袋が近づいて、傾く
        const enter = ease.outCubic(clamp((lt - 1.2) / 1.0));
        const tilt = ease.inOutCubic(clamp((lt - 2.3) / 1.2));
        const away = ease.inCubic(clamp((lt - 4.7) / 0.6));
        const bx = lerp(1300, 850, enter) + away * 500;
        const by = lerp(840, 800, tilt) - away * 200;
        fertBag(ctx, bx, by, 1.05, { rot: lerp(0, -1.9, tilt) + away * 1.2 });
        if (lt > 3.5 && lt < 4.6) granuleRain(ctx, 650, 850, lt, { width: 50, fall: 150, n: 10, amount: clamp((lt - 3.5) / 0.4) });
        ngMark(ctx, 640, 820, 260, clamp((lt - 4.55) / 0.3));
        telops(ctx, lt, [[0.35, 4.4, '元気がないから…*肥料*を！', { size: 72, accent: C.brand }]]);
        shout(ctx, 'ちょっと待った！', W / 2, LAYOUT.telopY - 10, clamp((lt - 4.5) / 0.3), { size: 118, color: '#E8412B', rot: -0.05 });
        label(ctx, '弱った植物に肥料はNG！？', W / 2, 1150, pop(lt, 5.5), { size: 50, bg: '#E8412B' });
        ctx.restore();
      },
    },
    // 2. 7-15.8秒: トドメ！ 肥料と活力剤は別モノ
    {
      start: 7.0,
      subs: [
        [0.3, 4.4, 'それ、植物に*トドメ*を\n刺してるかもしれません！'],
        [4.5, 8.6, '実は*「肥料」*と*「活力剤」*って、\n全然違うんです。'],
      ],
      cues: [[0.4, 'surprise'], [1.0, 'impact'], [1.05, 'stamp', 0.6], [4.5, 'whoosh'], [4.9, 'pop'], [5.4, 'pop'], [5.9, 'ding']],
      draw(ctx, lt) {
        const B = lt >= 4.5;
        const [sx, sy] = shakeOffset(lt, 1.0, 0.5, 20);
        ctx.save();
        ctx.translate(sx, sy);
        bgSoft(ctx, lt, { top: B ? '#F2FAF3' : '#FFF1EC', bottom: B ? '#DDF0E1' : '#FFD9CC', pattern: B ? 'dots' : 'rays', pc: B ? 'rgba(0,154,68,0.07)' : 'rgba(232,65,43,0.10)', floor: 'wood', cy: 820 });
        if (!B) {
          focusLines(ctx, 700, 800, lt, { inner: 380, color: 'rgba(120,30,20,0.16)', n: 56, alpha: clamp((lt - 1.0) / 0.2) });
          char(ctx, lt, { kind: 'staff', x: 300, y: FEET, s: 1.12, pose: 'surprised', expr: 'shock', seed: 4, sweatDrop: true });
          // 「トドメ」の文字
          const k = clamp((lt - 1.0) / 0.25);
          if (k > 0) {
            ctx.save();
            ctx.translate(760, 820);
            ctx.rotate(-0.08);
            const sc = lerp(2.4, 1, ease.outBack(k, 1.4));
            ctx.scale(sc, sc);
            ctx.globalAlpha *= clamp(k * 3);
            richText(ctx, 'トドメ', 0, 0, {
              size: 190, weight: 400, family: IMPACT, color: '#E8412B',
              strokes: [['#3A2A22', 60], ['#FFFFFF', 34]], shadow: { color: 'rgba(0,0,0,0.25)', dx: 0, dy: 16 }, lineHeight: 1,
            });
            ctx.restore();
          }
          telops(ctx, lt, [[0.35, 4.4, '植物に*トドメ*を刺してるかも！？', { size: 70, accent: C.red }]]);
        } else {
          char(ctx, lt, { kind: 'staff', x: 540, y: FEET, s: 1.05, pose: 'explain', expr: 'explain', seed: 4, talking: [[4.6, 8.4]] });
          // 肥料 ≠ 活力剤
          label(ctx, '肥料', 230, 760, pop(lt, 4.9), { size: 64, bg: C.orangeDeep });
          label(ctx, '活力剤', 850, 760, pop(lt, 5.4), { size: 64, bg: C.blue });
          const k = pop(lt, 5.9, 0.4);
          if (k > 0) {
            ctx.save();
            ctx.translate(540, 560);
            ctx.scale(k, k);
            richText(ctx, '≠', 0, 0, { size: 150, color: '#E8412B', strokes: [['#FFFFFF', 34]] });
            ctx.restore();
          }
          telops(ctx, lt, [[4.55, 8.8, '肥料と活力剤は*「別モノ」*！', { size: 72, accent: C.red }]]);
        }
        ctx.restore();
      },
    },
    // 3. 15.8-24.3秒: 肥料 ＝ 焼肉
    {
      start: 15.8,
      subs: [
        [0.3, 3.6, '人間に例えると、\n肥料は*「焼肉」*！'],
        [3.7, 8.3, '元気な時に、もっと大きく\n成長するためのごはんです。'],
      ],
      cues: [[0.4, 'pop'], [0.8, 'pop', 0.6], [1.5, 'pon'], [1.6, 'sparkle', 0.7], [3.9, 'pop']],
      draw(ctx, lt) {
        bgSoft(ctx, lt, { top: '#FFF8EC', bottom: '#FFE9CF', pattern: 'dots', pc: 'rgba(240,100,30,0.08)', floor: 'wood' });
        card(ctx, 330, 850, 560, 640, pop(lt, 0.4, 0.5), { title: '肥料', color: C.orangeDeep }, (g) => {
          const m = ease.inOutCubic(clamp((lt - 1.4) / 0.4));
          if (m < 1) {
            g.save();
            g.globalAlpha *= 1 - m;
            fertBag(g, 0, 140, 1.0 * (1 - m * 0.4), {});
            g.restore();
          }
          if (m > 0) {
            yakiniku(g, -10, 0, 0.95 * ease.outBack(m), { t: lt });
            riceBowl(g, 150, 150, 0.55 * ease.outBack(m));
          }
          label(g, '＝ 焼肉', 0, 200, pop(lt, 1.6), { size: 56, bg: C.orangeDeep });
          label(g, '元気なときのごはん', 0, 272, pop(lt, 3.9), { size: 38, bg: '#FFFFFF', color: C.orangeDeep });
        });
        card(ctx, 870, 900, 340, 440, pop(lt, 0.8, 0.5), { title: '活力剤', color: C.blue, bg: '#F1F4F6' }, (g) => {
          g.save();
          g.globalAlpha *= 0.45;
          vitalBottle(g, 0, 170, 0.8, {});
          g.restore();
          mark(g, '？', 0, 40, 110, { color: C.blue });
        });
        telops(ctx, lt, [[0.35, 8.5, '肥料 ＝ *焼肉*', { size: 86 }]]);
        twinkles(ctx, 330, 780, 240, lt, { n: 6, size: 26, color: '#FFFFFF', stroke: C.yellow, seed: 3 });
      },
    },
    // 4. 24.3-34.6秒: 活力剤 ＝ 栄養ドリンク
    {
      start: 24.3,
      subs: [
        [0.3, 3.6, '一方、活力剤は\n*「栄養ドリンク」*！'],
        [3.7, 7.0, '夏バテや植え替えで\n弱っている時、'],
        [7.1, 10.3, '回復をサポートする\nサプリメントなんです。'],
      ],
      cues: [[0.4, 'pop'], [1.2, 'pon'], [1.3, 'sparkle', 0.7], [3.8, 'whoosh'], [4.2, 'pop'], [4.8, 'pop'], [7.2, 'shine'], [7.4, 'sparkle'], [8.2, 'chime']],
      draw(ctx, lt) {
        const B = lt >= 3.7;
        bgSoft(ctx, lt, { top: '#EEF7FF', bottom: '#D8ECFA', pattern: B ? 'leaves' : 'dots', pc: 'rgba(62,142,222,0.08)', floor: 'wood' });
        if (!B) {
          card(ctx, 540, 830, 560, 600, 1, { title: '活力剤', color: C.blue }, (g) => {
            const m = ease.inOutCubic(clamp((lt - 1.1) / 0.4));
            if (m < 1) {
              g.save();
              g.globalAlpha *= 1 - m;
              vitalBottle(g, 0, 190, 1.0, {});
              g.restore();
            }
            if (m > 0) energyDrink(g, 0, 200, 1.35 * ease.outBack(m), { shine: 1 });
          });
          label(ctx, '＝ 栄養ドリンク', 540, 1170, pop(lt, 1.3), { size: 54, bg: C.blue });
          telops(ctx, lt, [[0.35, 3.7, '活力剤 ＝ *栄養ドリンク*', { size: 76, accent: C.blue }]]);
          return;
        }
        const b = lt - 3.7;
        const rec = ease.inOutCubic(clamp((lt - 7.3) / 1.6));
        const v = lerp(0.16, 0.8, rec);
        if (rec > 0) glow(ctx, 480, 920, 360, '#FFF6B0', 0.7 * rec);
        drawPottedPlant(ctx, 470, FEET, 1.45, { vitality: v, face: rec > 0.6 ? 'happy' : 'sad', t: lt, seed: 6 });
        // 栄養ドリンクが近づいて、しずくを注ぐ
        const dk = ease.outBack(clamp((lt - 6.9) / 0.5));
        if (dk > 0) {
          const pour = ease.inOutCubic(clamp((lt - 7.2) / 0.4)) * (1 - ease.inOutCubic(clamp((lt - 9.2) / 0.4)));
          energyDrink(ctx, 820, 700, 0.95 * dk, { rot: -pour * 1.9 });
          if (pour > 0.8) {
            for (let i = 0; i < 5; i++) {
              const p = ((lt * 1.6 + i / 5) % 1);
              circle(ctx, lerp(700, 560, p), lerp(690, 980, p * p), 12);
              paint(ctx, '#FFD84A', '#B98A12', 3);
            }
          }
        }
        if (rec > 0) twinkles(ctx, 470, 900, 300, lt, { n: 10, size: 34, color: '#FFFFFF', stroke: C.yellow, seed: 6 });
        // こんな時に
        const tagK1 = pop(lt, 4.2), tagK2 = pop(lt, 4.8);
        label(ctx, '夏バテ', 190, 640, tagK1 * (1 - rec * 0.6), { size: 48, bg: C.orangeDeep, rot: -0.08 });
        if (tagK1 > 0) sunIcon(ctx, 110, 560, 34 * tagK1, lt);
        label(ctx, '植え替え', 250, 760, tagK2 * (1 - rec * 0.6), { size: 48, bg: '#8A5A3B', rot: 0.05 });
        telops(ctx, lt, [
          [3.75, 7.0, '弱っているときに…', { size: 76 }],
          [7.1, 10.5, '弱っているときの*サプリ*', { size: 76, accent: C.blue }],
        ]);
      },
    },
    // 5. 34.6-45.2秒: 胃腸炎のときに焼肉はムリ
    {
      start: 34.6,
      subs: [
        [0.3, 4.4, '胃腸炎のときに、\n焼肉は食べられないですよね？'],
        [4.5, 6.2, '植物も同じ。'],
        [6.3, 10.4, '元気がないときは、\nまず*活力剤*をあげましょう！'],
      ],
      cues: [[0.4, 'pop'], [1.2, 'buzzer', 0.5], [4.5, 'slide'], [4.9, 'buzzer', 0.4], [6.4, 'slide'], [6.9, 'chime'], [7.2, 'pop']],
      draw(ctx, lt) {
        bgSoft(ctx, lt, { top: '#F4FBF4', bottom: '#E1F2E3', pattern: 'dots', pc: 'rgba(0,154,68,0.06)', floor: 'wood' });
        const S = 1.1;
        const pose = lt < 6.3 ? 'explain' : 'gentle';
        char(ctx, lt, { kind: 'staff', x: 800, y: FEET, s: S, pose, expr: lt < 6.3 ? 'gentle' : 'happy', seed: 5, talking: [[0.4, 4.2], [4.6, 6.0], [6.4, 10.0]], headTilt: -0.06 });
        // 雲形の吹き出しの中身が変わる
        const cx = 360, cy = 760;
        thoughtCloud(ctx, cx, cy, 560, 460, pop(lt, 0.35, 0.5), [340, 160]);
        const inner = (t0, t1) => clamp(Math.min((lt - t0) / 0.3, (t1 - lt) / 0.25));
        const a = inner(0.5, 4.4);
        if (a > 0) {
          ctx.save();
          ctx.globalAlpha *= a;
          yakiniku(ctx, cx, cy + 10, 0.8, { t: lt });
          ngMark(ctx, cx, cy, 200, clamp((lt - 1.2) / 0.3));
          richText(ctx, 'おなかが痛いときは\nムリ…', cx, cy - 150, { size: 34, weight: 900, color: '#8A2F20', strokes: [['#FFFFFF', 12]] });
          ctx.restore();
        }
        const bK = inner(4.6, 6.2);
        if (bK > 0) {
          ctx.save();
          ctx.globalAlpha *= bK;
          drawPottedPlant(ctx, cx - 90, cy + 170, 0.8, { vitality: 0.15, face: 'sad', t: lt, seed: 7 });
          fertBag(ctx, cx + 130, cy + 150, 0.6, {});
          ngMark(ctx, cx + 130, cy + 60, 150, clamp((lt - 4.9) / 0.3));
          ctx.restore();
        }
        const cK = inner(6.4, 10.6);
        if (cK > 0) {
          ctx.save();
          ctx.globalAlpha *= cK;
          drawPottedPlant(ctx, cx - 90, cy + 170, 0.8, { vitality: lerp(0.15, 0.7, ease.inOutCubic(clamp((lt - 7.3) / 1.2))), face: lt > 7.8 ? 'happy' : 'sad', t: lt, seed: 7 });
          energyDrink(ctx, cx + 130, cy + 170, 0.7, { shine: 1 });
          okMark(ctx, cx + 130, cy + 70, 110, clamp((lt - 6.9) / 0.4));
          ctx.restore();
        }
        // 納得の「！」
        const ek = pop(lt, 6.9, 0.4);
        if (ek > 0) {
          ctx.save();
          ctx.translate(960, FEET - 600 * S);
          ctx.scale(ek, ek);
          mark(ctx, '！', 0, 0, 130, { color: '#E8412B', rot: 0.15 });
          ctx.restore();
        }
        telops(ctx, lt, [
          [0.35, 6.2, '胃腸炎のときに*焼肉*はムリ！', { size: 72, accent: C.red }],
          [6.3, 10.6, '元気がない時は*「活力剤」*', { size: 74, accent: C.blue }],
        ]);
      },
    },
    // 6. 45.2-55.8秒: 商品紹介
    {
      start: 45.2,
      subs: [
        [0.3, 3.9, '元気な時には\n*「ハイポネックス原液」*、'],
        [4.0, 8.0, '弱っている時や毎日のケアには\n*「リキダス」*。'],
        [8.1, 10.4, '上手に使い分けてくださいね！'],
      ],
      cues: [[0.5, 'pon'], [0.7, 'shine'], [1.4, 'pop'], [4.1, 'pon'], [4.3, 'shine'], [5.0, 'pop'], [8.2, 'sparkle'], [8.4, 'pop']],
      draw(ctx, lt, env) {
        bgSoft(ctx, lt, { top: '#FFFCF2', bottom: '#F3F8E8', pattern: 'rays', pc: 'rgba(255,210,63,0.14)', floor: 'wood', cy: 820 });
        const both = lt >= 8.1;
        const onL = lt < 4.0 || both;
        const onR = lt >= 4.0;
        productDrop(ctx, env.images.genki, 290, 1150, 560, lt, 0.4, { podiumW: 330, glowAmt: onL ? (both ? 0.5 : 1) : 0.2, top: C.orangeDeep, side: '#C44E12', sink: 12, podiumIn: 0.2 });
        productDrop(ctx, env.images.rikidus, 790, 1150, 560, lt, 4.0, { podiumW: 330, glowAmt: onR ? (both ? 0.5 : 1) : 0, top: C.blue, side: '#2C6FB0', sink: 12, podiumIn: 3.8 });
        label(ctx, '肥料', 290, 560, pop(lt, 1.4), { size: 56, bg: C.orangeDeep });
        label(ctx, '元気なときに', 290, 1236, pop(lt, 1.8), { size: 36, bg: '#FFFFFF', color: C.orangeDeep });
        label(ctx, '活力剤', 790, 560, pop(lt, 5.0), { size: 56, bg: C.blue });
        label(ctx, '弱ったとき・毎日のケアに', 790, 1236, pop(lt, 5.4), { size: 32, bg: '#FFFFFF', color: C.blue });
        if (both) {
          const k = pop(lt, 8.3, 0.45);
          if (k > 0) {
            ctx.save();
            ctx.translate(540, 860);
            ctx.scale(k, k);
            arrow(ctx, -70, -34, 70, -34, { color: C.orangeDeep, width: 22, head: 44 });
            arrow(ctx, 70, 34, -70, 34, { color: C.blue, width: 22, head: 44 });
            ctx.restore();
          }
          twinkles(ctx, 540, 860, 460, lt, { n: 12, size: 30, color: '#FFFFFF', stroke: C.yellow, seed: 10 });
        }
        telops(ctx, lt, [
          [0.35, 3.95, '肥料は*「ハイポネックス原液」*', { size: 64 }],
          [4.0, 8.05, '活力剤は*「リキダス」*', { size: 72, accent: C.blue }],
          [8.1, 10.6, '上手に*使い分け*！', { size: 80 }],
        ]);
      },
    },
    // 7. 55.8-62秒: エンディング
    {
      start: 55.8,
      subs: [
        [0.3, 3.4, '正しいごはんで、\n植物をもっと元気に！'],
        [3.5, 6.0, '園芸の基本、\nまた紹介しますね！'],
      ],
      cues: [[0.4, 'fanfare'], [0.6, 'sparkle'], [2.5, 'whoosh'], [2.9, 'pop'], [3.5, 'tap'], [3.7, 'ding'], [4.4, 'tap'], [4.6, 'pon']],
      draw(ctx, lt, env) {
        bgGarden(ctx, lt, { flowers: 1, floorY: LAYOUT.groundY });
        drawPottedPlant(ctx, 820, FEET, 1.2, { vitality: 1, face: 'happy', t: lt, seed: 3 });
        const waveAng = Math.sin(lt * 8) * 14;
        char(ctx, lt, { kind: 'staff', x: 330, y: FEET, s: 1.08, pose: { L: [106, 98, 'fist'], R: [-25, -85 + waveAng, 'open'] }, expr: 'joy', seed: 7, talking: [[0.3, 5.8]] });
        twinkles(ctx, 540, 800, 460, lt, { n: 10, size: 30, color: '#FFFFFF', stroke: C.yellow, seed: 9 });
        telops(ctx, lt, [[0.35, 2.7, 'ハイポネックスで\n*楽しい園芸ライフ*を！', { size: 64 }]]);
        endCardSNS(ctx, lt, 2.5, env.images, { y: 720 });
      },
    },
  ],
};
