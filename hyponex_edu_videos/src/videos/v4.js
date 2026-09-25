// #4 肥料の袋にある「N-P-K」って何？
import {
  C, W, LAYOUT, clamp, lerp, ease, pop, inOut,
  char, telops, speech, label, stamp, questionMarks, productDrop, logoCard,
  onomatopoeia, twinkles, burst, glow, shout, richText, drawImageH,
} from './common.js';
import { drawNPKPlant } from '../art/plants.js';
import { drawSilhouette } from '../art/character.js';
import { shopPack, chalkboard, heroBadge, npkPanel, bulb, snsButton, tapHand, mark, sparkle } from '../art/props.js';
import { bgSoft, bgShop, bgClassroom, bgGarden } from '../art/scenery.js';
import { circle, paint, rr, arrow, glow as glowFx } from '../engine/draw.js';
import { FONT, POP } from '../engine/text.js';

const FEET = LAYOUT.groundY + 12;
const NCOL = '#23A05A', PCOL = '#F0643C', KCOL = '#C98A12';

// 頭のまわりをぐるぐる回るハテナ
function orbitMarks(ctx, cx, cy, rx, ry, lt, t0, n = 3) {
  for (let i = 0; i < n; i++) {
    const k = pop(lt, t0 + i * 0.15, 0.4);
    if (k <= 0) continue;
    const a = (lt - t0) * 2.2 + (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    mark(ctx, '？', 0, 0, 80 + (i % 2) * 20, { color: C.orange, rot: Math.sin(a) * 0.3 });
    ctx.restore();
  }
}

// チョーク風の文字
function chalk(ctx, text, x, y, size, color = '#FFFFFF', alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `400 ${size}px ${POP}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(255,255,255,0.35)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export default {
  id: 'v4',
  episode: 4,
  title: '肥料の袋にある「N-P-K」って何？',
  file: '04_肥料の袋にあるNPKって何',
  duration: 80.5,
  scenes: [
    // 1. 0-11.5秒: 謎の数字
    {
      start: 0,
      subs: [
        [0.3, 3.9, '肥料を買うとき、\n袋に書いてある'],
        [4.0, 7.4, '*「6-10-5」*みたいな\n謎の数字…'],
        [7.5, 11.3, 'これ、何の暗号？って\n困っていませんか？'],
      ],
      cues: [[0.4, 'whoosh', 0.7], [4.1, 'shine'], [4.4, 'question'], [4.6, 'question', 0.7], [7.6, 'slide'], [8.0, 'boing', 0.8]],
      draw(ctx, lt) {
        const zoom = ease.inOutCubic(clamp((lt - 0.2) / 3.0));
        const side = ease.inOutCubic(clamp((lt - 7.5) / 0.6));
        ctx.save();
        const zs = lerp(1, 1.12, zoom);
        ctx.translate(540, 1000);
        ctx.scale(zs, zs);
        ctx.translate(-540, -1000);
        bgShop(ctx, lt, { floorY: LAYOUT.groundY, dim: lerp(0, 0.28, zoom) });
        ctx.restore();
        // 手前の袋（アップ）
        const px = lerp(540, 700, side);
        const ps = lerp(0.75, 1.0, zoom) * lerp(1, 0.82, side);
        ctx.save();
        ctx.translate(px, FEET + 20);
        ctx.scale(ps, ps);
        ctx.rotate(-0.04);
        shopPack(ctx, 0, 0, 440, 620, { numbers: '', color: '#E86A5A', kind: 'bag' });
        const hk = clamp((lt - 4.0) / 0.4);
        if (hk > 0) glowFx(ctx, 0, -300, 280, '#FFF3A0', 0.8 * hk);
        ctx.fillStyle = '#4A3428';
        ctx.font = `900 ${Math.round(96 * (1 + 0.08 * hk * Math.sin(lt * 6)))}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('6-10-5', 0, -290);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 52px ${FONT}`;
        ctx.fillText('肥料', 0, -520);
        ctx.restore();
        if (lt > 4.1 && lt < 7.5) orbitMarks(ctx, px, FEET - 280, 300, 110, lt, 4.2, 3);
        // 腕を組んで首をかしげる
        const ck = ease.outBack(clamp((lt - 7.5) / 0.5), 1.4);
        if (lt > 7.5) {
          char(ctx, lt, { kind: 'staff', x: lerp(-300, 240, ck), y: FEET, s: 1.08, pose: 'crossed', expr: 'puzzled', seed: 1, headTilt: -0.14 + Math.sin(lt * 1.6) * 0.04 });
          orbitMarks(ctx, 240, FEET - 510 * 1.08, 170, 60, lt, 7.9, 3);
        }
        telops(ctx, lt, [
          [0.35, 3.95, '肥料の袋の*数字*…', { size: 78 }],
          [4.0, 11.6, '謎の数字…これって*暗号*！？', { size: 70, accent: C.red }],
        ]);
      },
    },
    // 2. 11.5-27.8秒: 三大栄養素＝お助けトリオ
    {
      start: 11.5,
      subs: [
        [0.3, 3.6, '実はこれ、\n植物の三大栄養素'],
        [3.7, 8.0, '*「チッソ・リンサン・カリ」*の\n割合なんです！'],
        [8.1, 11.4, '難しく聞こえますが、要するに'],
        [11.5, 16.0, '植物を育てる\n*「お助けトリオ」*なんですよ。'],
      ],
      cues: [[0.35, 'tap', 1.2], [0.5, 'ding'], [3.9, 'pop'], [4.5, 'pop'], [5.1, 'pop'], [8.3, 'boing', 0.6], [11.6, 'tada'], [12.0, 'sparkle']],
      draw(ctx, lt) {
        bgClassroom(ctx, lt);
        chalkboard(ctx, 540, 820, 920, 560);
        chalk(ctx, '三大栄養素', 470, 610, 64, '#FFFFFF', clamp((lt - 0.5) / 0.4));
        const xs = [230, 470, 710];
        const names = ['チッソ', 'リンサン', 'カリ'];
        const cols = [NCOL, PCOL, KCOL];
        const hero = ease.outBack(clamp((lt - 11.6) / 0.6), 1.6);
        ['N', 'P', 'K'].forEach((L, i) => {
          const k = pop(lt, 3.9 + i * 0.6, 0.5);
          if (k <= 0) return;
          const wig = lt > 8.1 && lt < 11.5 ? Math.sin((lt - 8.1) * 9 + i) * 0.1 : 0;
          const jump = lt > 11.6 ? Math.abs(Math.sin((lt - 11.6) * 5 + i)) * 20 * Math.exp(-(lt - 11.6) * 0.8) : 0;
          ctx.save();
          ctx.translate(xs[i], 800 - jump);
          ctx.rotate(wig);
          heroBadge(ctx, 0, 0, 0.95 * k, L, cols[i], lt, { cape: hero, face: hero });
          ctx.restore();
          chalk(ctx, names[i], xs[i], 930, 48, '#FFE066', clamp((lt - 4.1 - i * 0.6) / 0.3));
        });
        if (hero > 0) {
          chalk(ctx, 'お助けトリオ！', 470, 1030, 60, '#FFFFFF', clamp((lt - 11.9) / 0.4));
          twinkles(ctx, 470, 800, 400, lt, { n: 10, size: 30, color: '#FFFFFF', stroke: C.yellow, seed: 21 });
        }
        // ひらめいて指パチン
        const pose = lt < 1.2 ? 'snap' : lt < 11.5 ? 'explain' : 'thumbs';
        char(ctx, lt, { kind: 'staff', x: 940, y: FEET + 60, s: 0.8, pose, expr: lt < 1.2 ? 'surprised' : lt < 11.5 ? 'explain' : 'joy', seed: 2, talking: [[1.2, 11.2], [11.6, 15.8]] });
        const bk = pop(lt, 0.35, 0.4) * (1 - clamp((lt - 3.2) / 0.3));
        if (bk > 0) bulb(ctx, 940, FEET + 60 - 590 * 0.8 - 70, 0.8 * bk, lt);
        telops(ctx, lt, [
          [0.35, 11.4, '実はこれ…*三大栄養素*', { size: 74 }],
          [11.5, 16.4, '植物を育てる*お助けトリオ*', { size: 72 }],
        ]);
      },
    },
    // 3. 27.8-49.5秒: 上から順に 葉・花・根
    {
      start: 27.8,
      subs: [
        [0.3, 4.5, '覚え方は上から順に\n*「葉・花・根」*！'],
        [4.6, 9.2, '最初の数字は、\n葉っぱを青々と育てる成分。'],
        [9.3, 13.9, '真ん中は、お花や実を\nたくさんつける成分。'],
        [14.0, 19.2, '最後は、根っこを丈夫にして\n基礎を作る成分です！'],
      ],
      note: [4.6, 21.7, '※植物の種類や生育時期によって必要なバランスは異なります'],
      cues: [[0.8, 'pop'], [1.3, 'pop'], [1.8, 'pop'], [2.0, 'ding'], [4.7, 'whoosh'], [5.1, 'stamp'], [9.4, 'whoosh'], [9.8, 'stamp'], [14.1, 'whoosh'], [14.5, 'stamp'], [19.4, 'sparkle'], [19.6, 'chime']],
      draw(ctx, lt) {
        bgSoft(ctx, lt, { top: '#F4FBEF', bottom: '#DDF1DF', pattern: 'leaves', pc: 'rgba(0,154,68,0.06)' });
        const beat = lt < 4.6 ? 0 : lt < 9.3 ? 1 : lt < 14.0 ? 2 : lt < 19.3 ? 3 : 4;
        const on = (b) => (beat === b ? 1 : beat === 4 ? 0.85 : 0);
        // スポットライト（上から順番に）
        const pts0 = drawNPKPlant(ctx, 600, 1010, 0.9, { t: lt, hiN: on(1), hiP: on(2), hiK: on(3), rootGrow: 1, grow: 1 });
        const spot = [null, pts0.leaf, pts0.flower, pts0.root][beat];
        if (spot) {
          ctx.save();
          ctx.fillStyle = 'rgba(20,40,30,0.35)';
          ctx.beginPath();
          ctx.rect(0, 0, W, LAYOUT.bandY + 40);
          ctx.arc(spot[0], spot[1], 230, 0, Math.PI * 2, true);
          ctx.fill('evenodd');
          ctx.beginPath();
          ctx.arc(spot[0], spot[1], 230, 0, Math.PI * 2);
          ctx.clip();
          drawNPKPlant(ctx, 600, 1010, 0.9, { t: lt, hiN: on(1), hiP: on(2), hiK: on(3), rootGrow: 1, grow: 1 });
          ctx.restore();
          ctx.save();
          ctx.beginPath();
          ctx.arc(spot[0], spot[1], 230, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,246,190,0.9)';
          ctx.lineWidth = 8;
          ctx.stroke();
          ctx.restore();
        }
        // 左の「葉・花・根」
        const rows = [['葉', pts0.leaf[1] + 30, NCOL, 'N'], ['花', pts0.flower[1], PCOL, 'P'], ['根', pts0.root[1] - 20, KCOL, 'K']];
        rows.forEach(([ch, y, col, L], i) => {
          const k = pop(lt, 0.8 + i * 0.5, 0.4);
          if (k <= 0) return;
          const active = beat === i + 1 || beat === 4 || beat === 0;
          ctx.save();
          ctx.globalAlpha *= active ? 1 : 0.45;
          ctx.translate(150, y);
          ctx.scale(k, k);
          circle(ctx, 0, 0, 70);
          paint(ctx, col, '#FFFFFF', 10);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `900 76px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ch, 0, 4);
          ctx.restore();
          // 数字の順番
          const nk = pop(lt, [4.8, 9.5, 14.2][i], 0.4);
          if (nk > 0) {
            ctx.save();
            ctx.translate(150, y - 96);
            ctx.scale(nk, nk);
            rr(ctx, -70, -24, 140, 48, 24);
            paint(ctx, '#FFFFFF', col, 5);
            ctx.fillStyle = col;
            ctx.font = `900 30px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(['最初', '真ん中', '最後'][i], 0, 2);
            ctx.restore();
          }
          // N・P・K がパーツにくっつく
          const stick = clamp((lt - [5.0, 9.7, 14.4][i]) / 0.45);
          if (stick > 0) {
            const tx = [pts0.leaf[0] + 170, pts0.flower[0] + 200, pts0.root[0] + 200][i];
            const ty = [pts0.leaf[1] + 40, pts0.flower[1] + 70, pts0.root[1] - 10][i];
            const sx = lerp(150, tx, ease.outBack(stick, 1.6));
            const sy = lerp(y, ty, ease.outCubic(stick)) - Math.sin(stick * Math.PI) * 120;
            heroBadge(ctx, sx, sy, 0.62, L, col, lt, { cape: 0, face: 1 });
            if (stick >= 1 && lt - [5.0, 9.7, 14.4][i] < 0.8) burst(ctx, sx, sy, lt - [5.0, 9.7, 14.4][i] - 0.45, { r0: 60, r1: 120, color: col });
          }
        });
        if (beat === 4) twinkles(ctx, 600, 800, 420, lt, { n: 12, size: 32, color: '#FFFFFF', stroke: C.yellow, seed: 22 });
        telops(ctx, lt, [
          [0.35, 4.55, '上から順に*「葉・花・根」*！', { size: 72, y: 330 }],
          [4.6, 9.25, '最初の数字 ＝ *葉っぱ*', { size: 72, y: 330, accent: NCOL }],
          [9.3, 13.95, '真ん中 ＝ *花・実*', { size: 76, y: 330, accent: PCOL }],
          [14.0, 19.25, '最後 ＝ *根っこ*', { size: 76, y: 330, accent: KCOL }],
          [19.3, 22.0, '上から順に*「葉・花・根」*！', { size: 72, y: 330 }],
        ]);
      },
    },
    // 4. 49.5-67.2秒: ハイポネックス原液は真ん中が大きい
    {
      start: 49.5,
      subs: [
        [0.3, 4.6, '例えば、定番の\n*「ハイポネックス原液」*は'],
        [4.7, 8.2, '真ん中の数字が\n大きいですよね。'],
        [8.3, 12.8, 'つまり、綺麗なお花を\n次々と咲かせたい時に'],
        [12.9, 17.4, 'ピッタリのバランスなんです！'],
      ],
      cues: [[0.5, 'pon'], [0.8, 'shine'], [4.8, 'pop'], [5.4, 'ding'], [5.6, 'stamp', 0.6], [8.3, 'whoosh'], [8.7, 'sparkle'], [9.2, 'pop', 0.6], [9.6, 'pop', 0.6], [10.0, 'pop', 0.6], [12.9, 'chime'], [13.1, 'sparkle']],
      draw(ctx, lt, env) {
        const B = lt >= 8.3;
        if (!B) {
          bgSoft(ctx, lt, { top: '#FFFCF0', bottom: '#F0F8E6', pattern: 'rays', pc: 'rgba(255,210,63,0.14)', floor: 'wood', cy: 820 });
          const hk = pop(lt, 0.5, 0.5);
          const pointing = lt >= 4.8;
          const pose = { L: [132, -108, 'hold'], R: pointing ? [-28, -42, 'point'] : [74, 82, 'fist'] };
          char(ctx, lt, {
            kind: 'staff', x: 400, y: FEET, s: 1.12, pose, expr: pointing ? 'explain' : 'happy', seed: 3,
            talking: [[0.4, 4.4], [4.8, 8.0]],
            holdL: (g, hx, hy) => {
              if (hk <= 0) return;
              g.save();
              g.translate(hx + 4, hy + 30);
              g.scale(hk, hk);
              drawImageH(g, env.images.genki, 0, 0, 330, { anchor: 'center' });
              g.restore();
            },
          });
          if (hk > 0 && lt < 2.5) twinkles(ctx, 215, 860, 170, lt, { n: 6, size: 28, color: '#FFFFFF', stroke: C.yellow, seed: 23 });
          const pk = pop(lt, 4.8, 0.5);
          if (pk > 0) {
            npkPanel(ctx, 790, 640, 0.84 * pk, [6, 10, 5], { hi: 1, hiK: clamp((lt - 5.4) / 0.5) });
            if (lt > 5.6) label(ctx, '真ん中が大きい！', 800, 820, pop(lt, 5.6), { size: 46, bg: '#E8412B', rot: -0.04 });
          }
          telops(ctx, lt, [
            [0.35, 4.65, '定番の*「ハイポネックス原液」*', { size: 64 }],
            [4.7, 8.35, '*真ん中*の数字が大きい！', { size: 74, accent: '#E8412B' }],
          ]);
          return;
        }
        // お花畑
        bgGarden(ctx, lt, { flowers: clamp((lt - 8.4) / 1.4), floorY: LAYOUT.groundY });
        glow(ctx, 640, 900, 400, '#FFF6B0', 0.7);
        productDrop(ctx, env.images.genki, 640, 1150, 600, lt, 8.5, { podiumW: 360, glowAmt: 0.8, top: C.orangeDeep, side: '#C44E12', sink: 12 });
        // 周りに咲く花
        const fl = [[180, 720, C.pink], [950, 680, C.yellow], [120, 1000, '#B58CF0'], [990, 980, '#FF7A59'], [320, 560, '#FF9FC2']];
        fl.forEach(([fx, fy, col], i) => {
          const k = pop(lt, 9.2 + i * 0.35, 0.5);
          if (k <= 0) return;
          ctx.save();
          ctx.translate(fx, fy + Math.sin(lt * 2 + i) * 8);
          ctx.rotate(lt * 0.5 + i);
          ctx.scale(k, k);
          for (let p = 0; p < 5; p++) {
            ctx.save();
            ctx.rotate((p / 5) * Math.PI * 2);
            ctx.beginPath();
            ctx.ellipse(34, 0, 32, 22, 0, 0, Math.PI * 2);
            paint(ctx, col, '#4A3428', 5);
            ctx.restore();
          }
          circle(ctx, 0, 0, 20);
          paint(ctx, C.yellow, '#4A3428', 5);
          ctx.restore();
        });
        char(ctx, lt, { kind: 'staff', x: 250, y: FEET, s: 0.98, pose: 'present', expr: 'joy', seed: 4, talking: [[8.4, 12.6], [13.0, 17.2]] });
        twinkles(ctx, 640, 860, 360, lt, { n: 10, size: 30, color: '#FFFFFF', stroke: C.yellow, seed: 24 });
        telops(ctx, lt, [[8.35, 17.8, '真ん中が大きい＝*お花にピッタリ*', { size: 64, accent: '#E8412B' }]]);
      },
    },
    // 5. 67.2-80.5秒: お店でチェック
    {
      start: 67.2,
      subs: [
        [0.3, 4.3, 'これで肥料選びは\nもう迷いませんね！'],
        [4.4, 7.2, '次に園芸店に行ったら、'],
        [7.3, 12.6, 'パッケージの数字、\nぜひチェックしてみてください。'],
      ],
      cues: [[0.4, 'pop'], [0.8, 'ding'], [4.5, 'slide'], [7.4, 'whoosh'], [7.9, 'pop'], [8.2, 'sparkle'], [9.4, 'tap'], [9.6, 'chime']],
      draw(ctx, lt, env) {
        bgShop(ctx, lt, { floorY: LAYOUT.groundY, dim: 0.12 });
        // 自信満々に選ぶお客さん（シルエット）
        const sk = ease.outCubic(clamp((lt - 0.3) / 0.6));
        drawSilhouette(ctx, { kind: 'beginner', x: lerp(-200, 330, sk), y: FEET, s: 1.12, pose: 'pointUpR', expr: 'proud', t: lt, alpha: 0.92 }, '#2F4F3A');
        if (sk >= 1) {
          const k = pop(lt, 1.0, 0.4);
          if (k > 0) {
            ctx.save();
            ctx.translate(470, 620);
            ctx.scale(k, k);
            sparkle(ctx, 0, 0, 40, 0, '#FFFFFF');
            ctx.restore();
          }
        }
        char(ctx, lt, { kind: 'staff', x: 820, y: FEET, s: 1.05, pose: 'thumbs', expr: 'joy', seed: 5, talking: [[0.3, 4.1], [4.5, 7.0]] });
        telops(ctx, lt, [
          [0.35, 4.3, '肥料選びは*もう迷わない*！', { size: 72 }],
          [4.4, 7.35, '次に*園芸店*に行ったら…', { size: 74 }],
        ]);
        // 保存を促すエンドカード
        const ek = clamp((lt - 7.3) / 0.5);
        if (ek > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(255,255,255,${0.62 * ease.outQuad(ek)})`;
          ctx.fillRect(0, 0, W, 1920);
          ctx.restore();
          logoCard(ctx, env.images.logo, W / 2, 560, 480, ek);
          const bk = pop(lt, 7.9, 0.5);
          if (bk > 0) {
            const saved = lt > 9.4;
            ctx.save();
            ctx.translate(540, 900);
            ctx.scale(bk * (1 + (saved ? 0.08 * Math.exp(-(lt - 9.4) * 4) : 0)), bk * (1 + (saved ? 0.08 * Math.exp(-(lt - 9.4) * 4) : 0)));
            snsButton(ctx, 'save', 0, 0, 1.5, { active: saved ? 1 : 0 });
            ctx.restore();
            // キラキラの矢印
            const wig = Math.sin(lt * 7) * 16;
            arrow(ctx, 180 - wig, 900, 380 - wig, 900, { color: C.orangeDeep, width: 26, head: 54 });
            arrow(ctx, 900 + wig, 900, 700 + wig, 900, { color: C.orangeDeep, width: 26, head: 54 });
            twinkles(ctx, 540, 900, 260, lt, { n: 10, size: 30, color: '#FFFFFF', stroke: C.yellow, seed: 25 });
            const press = clamp(1 - Math.abs(lt - 9.4) / 0.2);
            if (lt > 8.8) tapHand(ctx, 590, 960, 1.0, press);
            if (lt > 9.4) burst(ctx, 540, 900, lt - 9.4, { r0: 130, r1: 230, color: C.yellow, width: 14 });
            richText(ctx, '保存して*お店でチェック*してね！', W / 2, 1110, { size: 56, weight: 900, color: C.text, accent: C.orangeDeep, strokes: [['#FFFFFF', 18]], alpha: clamp((lt - 8.1) / 0.4) });
          }
        }
      },
    },
  ],
};
