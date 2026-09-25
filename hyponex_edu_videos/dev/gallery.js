import { drawCharacter } from '../src/art/character.js';
import { C } from '../src/engine/core.js';

export function size(which) {
  if (which === 'chars') return { w: 2400, h: 1500 };
  if (which === 'poses') return { w: 2400, h: 1500 };
  if (which === 'plants') return { w: 2400, h: 1560 };
  if (which === 'props') return { w: 2400, h: 1640 };
  return { w: 1080, h: 1920 };
}

export function draw(which, ctx, images, t) {
  if (which === 'plants') return drawPlants(ctx, t);
  if (which === 'props') return drawProps(ctx, t, images);
  ctx.fillStyle = '#EAF6EC';
  ctx.fillRect(0, 0, 3000, 3000);
  if (which === 'chars') {
    const exprs = ['smile', 'happy', 'joy', 'worried', 'sad', 'surprised', 'shock', 'puzzled', 'explain', 'wink', 'gentle', 'proud'];
    exprs.forEach((e, i) => {
      const col = i % 6, row = Math.floor(i / 6);
      const kind = row === 0 ? 'staff' : 'beginner';
      drawCharacter(ctx, { x: 200 + col * 400, y: 700 + row * 720, s: 1, kind, expr: e, t: 0.3 });
      ctx.fillStyle = '#000'; ctx.font = '700 36px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(e, 200 + col * 400, 740 + row * 720);
    });
  }
  if (which === 'poses') {
    const poses = ['idle', 'explain', 'pointR', 'pointL', 'wave', 'thumbs', 'crossed', 'think', 'holdR', 'present', 'surprised', 'cheer'];
    poses.forEach((p, i) => {
      const col = i % 6, row = Math.floor(i / 6);
      drawCharacter(ctx, { x: 200 + col * 400, y: 700 + row * 720, s: 1, kind: i % 2 ? 'beginner' : 'staff', expr: 'smile', pose: p, t: 0.3 });
      ctx.fillStyle = '#000'; ctx.font = '700 36px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p, 200 + col * 400, 740 + row * 720);
    });
  }
}

import { drawPottedPlant, drawSeedling, drawNPKPlant, drawSoilSection, drawPot } from '../src/art/plants.js';
export function drawPlants(ctx, t) {
  ctx.fillStyle = '#FFF8E8';
  ctx.fillRect(0, 0, 3000, 3000);
  const faces = ['sad', 'hungry', 'neutral', 'happy'];
  [0.0, 0.35, 0.7, 1.0].forEach((v, i) => {
    drawPottedPlant(ctx, 200 + i * 360, 620, 1, { vitality: v, face: faces[i], t, seed: 2 + i });
  });
  drawSeedling(ctx, 1640, 620, 1.1, { t });
  drawSeedling(ctx, 2050, 620, 1.1, { t, vitality: 0.3 });
  const pts = drawNPKPlant(ctx, 450, 1150, 0.9, { t, hiN: 0, hiP: 1, hiK: 0 });
  drawSoilSection(ctx, 1300, 1250, 620, 360, { t, granules: 1, mix: 0.0, glowAmt: 0 });
  drawSoilSection(ctx, 2000, 1250, 620, 360, { t, granules: 1, mix: 1, glowAmt: 1 });
}

import * as P from '../src/art/props.js';
export function drawProps(ctx, t, images) {
  ctx.fillStyle = '#E8F4EC';
  ctx.fillRect(0, 0, 3000, 3000);
  P.wateringCan(ctx, 200, 200, 1, 0.3);
  P.waterStream(ctx, 420, 330, t, {});
  P.waterGlass(ctx, 700, 480, 1, { t });
  P.hamburgPlate(ctx, 1100, 380, 1, { t });
  P.yakiniku(ctx, 1650, 380, 1, { t });
  P.riceBowl(ctx, 2000, 500, 1);
  P.energyDrink(ctx, 2250, 520, 1, { shine: 1 });
  P.bento(ctx, 300, 1000, 1, { lid: 0 });
  P.bento(ctx, 850, 1000, 1, { lid: 1 });
  P.fertBag(ctx, 1300, 1000, 1, {});
  P.shopPack(ctx, 1550, 1000, 150, 220, { numbers: '6-10-5', color: '#E86A5A' });
  P.shopPack(ctx, 1730, 1000, 120, 240, { numbers: '8-8-8', kind: 'bottle', color: '#3E8EDE' });
  P.shopPack(ctx, 1900, 1000, 150, 180, { numbers: '10-10-10', kind: 'box', color: '#F2B632' });
  P.scoop(ctx, 2200, 900, 1, -0.4, { fill: 1 });
  P.trowel(ctx, 2250, 1150, 1, 0.4);
  P.podium(ctx, 300, 1400, 360);
  ctx.drawImage(images.magamp, 300 - 150, 1400 - 420, 300, 472);
  P.podiumFront(ctx, 300, 1400, 360);
  P.calendarIcon(ctx, 700, 1350, 1);
  P.sunIcon(ctx, 950, 1350, 60, t);
  P.dropIcon(ctx, 1150, 1350, 70);
  P.bulb(ctx, 1350, 1350, 1, t);
  P.searchBar(ctx, 1900, 1250, 760, 'ハイポネックス', 1, { t });
  P.tapHand(ctx, 2200, 1300, 1, 0.3);
  P.snsButton(ctx, 'like', 1650, 1420, 0.8, { active: 1 });
  P.snsButton(ctx, 'save', 1850, 1420, 0.8, { active: 0 });
  P.snsButton(ctx, 'subscribe', 2150, 1440, 0.8, {});
  P.mark(ctx, '？', 560, 1180, 110, { rot: -0.2 });
  P.nutrientBadge(ctx, 1500, 1540, 0.6, 'N', 'チッソ', '#2E9E4E');
  P.clockIcon(ctx, 1080, 1500, 60, t);
}
