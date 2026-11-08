/* ep02 — もしも部長だけ、重力が10倍だったら（30秒） */
EPISODES.push({
  id: 'ep02',
  no: 2,
  short: '重力10倍の部長',
  title: 'もしも部長だけ、重力が10倍だったら',
  lead: '一歩ごとに床がひび割れ、座れば椅子がつぶれ、落としたペンは2つ下の階へ。重力10倍の部長の1日を30秒で追います。',
  duration: 30,
  poster: 2.6,
  chapters: [
    { t: 0, name: '出社' }, { t: 4.5, name: '着席' }, { t: 9, name: '落とし物' },
    { t: 14, name: '重い話' }, { t: 19.5, name: '退勤' }, { t: 25, name: '帰り道' },
  ],
  build() {
    const BOSS = { suit: '#3b3f4a', tie: '#c0392b', hair: '#a9a9a9', mustache: '#6e6e6e', brows: true, skin: '#efc29a', pants: '#2b2f38', scale: 1.08 };
    const A_LOOK = { suit: '#2f62d6', tie: '#f2c230', hair: '#2a211b' };
    const MATES = [
      { suit: '#6f7782', tie: '#d24b4b', hair: '#4a3426', glasses: true },
      { suit: '#4c5560', tie: '#2fa59b', hair: '#1f1a17', long: true, shirt: '#f4f0e6' },
      { suit: '#8a8f98', tie: '#6a5acd', hair: '#5b3b25' },
    ];
    const SKY = ['#9fd3ef', '#e8f5fb'];
    const H = P.FLOOR_H;
    const scenes = [];
    const bump = (lt, times, h = 0.16) => times.reduce((m, ti) => { const d = lt - ti; return d >= 0 && d < 0.25 ? Math.max(m, Math.sin((d / 0.25) * Math.PI) * h) : m; }, 0);
    const feet = (c, dy = 0.3) => () => c.root.localToWorld(V3(0, dy, 0));
    const mug = (parent, x, z) => {
      const g = group(parent, [x, 0.82, z]);
      box(g, [0.18, 0.22, 0.18], [0, 0.11, 0], solid('#f4f1ea'));
      box(g, [0.14, 0.02, 0.14], [0, 0.215, 0], solid('#6b3e1f'), { cast: false });
      return g;
    };
    const floorG = (S, f) => group(S, [0, (f - 1) * H, 0]);
    const fall = (dy, g) => Math.sqrt((2 * dy) / g);

    /* 壊したものの数（時刻, 個数） */
    const STEPS = [0.9, 1.4, 1.9, 2.4, 2.9, 3.4];
    const SIT = 4.5, PEN = 9.0, MEET = 14.0, LEAVE = 19.5;
    const PEN_G = 26, PEN_Y0 = 21.25, PEN_DROP = 0.8;
    const penBreak = [PEN_DROP + fall(PEN_Y0 - 4 * H, PEN_G), PEN_DROP + fall(PEN_Y0 - 3 * H, PEN_G)];
    const penLand = PEN_DROP + fall(PEN_Y0 - (2 * H + 0.82), PEN_G);
    const BOSS_G = 40, BOSS_DROP = 1.4;
    const bossBreak = [0, 1, 2, 3].map((k) => BOSS_DROP + fall(k * H, BOSS_G));
    const bossLand = BOSS_DROP + fall(4 * H, BOSS_G);
    const SMASH = 2.22;
    const BREAKS = [
      ...STEPS.map((t) => [t, 1]),
      [SIT + 1.0, 1], [SIT + 1.6, 4],
      ...penBreak.map((t) => [PEN + t, 2]),
      [MEET + SMASH, 1],
      ...bossBreak.map((t) => [LEAVE + t, 2]), [LEAVE + bossLand, 1],
    ];
    const broken = (t) => BREAKS.reduce((n, [bt, k]) => (t >= bt ? n + k : n), 0);

    /* ===== 1. 出社（0〜4.5秒） ===== */
    let boss1;
    {
      const S = newScene({ sky: SKY });
      P.officeRoom(S, { doors: [-5], windows: [[-2, 2], [-1, 2], [-2, 3], [-1, 3], [3, 2], [4, 2], [3, 3], [4, 3]] });
      box(S, [1, 2, 0.2], [-4.5, 1, -7.2], solid('#2b3140'), { cast: false });
      box(S, [1.2, 0.15, 0.3], [-4.5, 2.05, -6.85], solid('#8592a0'));
      const door = group(S, [-4.95, 0, -6.1]);
      box(door, [0.9, 1.95, 0.1], [0.45, 0.98, 0], solid('#a8794a'));
      box(door, [0.08, 0.08, 0.14], [0.78, 1.0, 0], solid('#f2c230'));
      [0, 4].forEach((x) => { P.desk(S, x, -2.5); P.chair(S, x, -3.45); P.laptop(S, x, 0.82, -2.6); });
      const cups = [mug(S, 0.65, -2.25), mug(S, 4.65, -2.25)];
      P.plant(S, 8.2, -5.3, 0.9); P.shelf(S, 6.4, -5.7); P.plant(S, -8.6, -5.3);
      const staff = [addChar(S, A_LOOK, [0, 0, -3.45]), addChar(S, MATES[1], [4, 0, -3.45])];
      const boss = addChar(S, BOSS, [-4.5, 0, -6.6]);
      boss1 = boss;
      const cracks = [-6, -5, -4, -3, -2, -1].map((z, i) => P.crackDecal(S, -4.5, 0, z + 0.5, i * 1.3));
      scenes.push({
        id: 'arrive', start: 0, end: 4.5, scene: S,
        cam: camPath([3.6, 5.0, 9.4], [2.9, 4.4, 8.3], [-2.2, 1.0, -3.2], [-1.8, 1.0, -2.4], 36, 4.5),
        shake: (lt) => impact(lt, STEPS, 0.09, 12),
        update(lt) {
          door.rotation.y = -1.7 * ease.out(prog(lt, 0.2, 0.5));
          cracks.forEach((c, i) => { c.visible = lt >= STEPS[i]; });
          reset(boss);
          boss.root.position.z = lerp(-6.6, -1.0, prog(lt, 0.4, 3.4));
          if (lt > 0.4 && lt < 3.4) walk(boss, ((lt - 0.4) / 0.5) * Math.PI, 0.45);
          boss.root.position.y -= bump(lt, STEPS, 0.06);
          if (lt >= 3.4) {
            boss.root.rotation.y = 0.45 * ease.out(prog(lt, 3.4, 3.7));
            boss.armR.rotation.x = -1.35 * ease.out(prog(lt, 3.6, 3.8)); boss.armR.rotation.z = 0.45;
          }
          const hop = bump(lt, STEPS);
          staff.forEach((c, i) => {
            reset(c); sit(c); typing(c, lt + i);
            c.root.position.y += hop;
            if (lt > STEPS[1]) { c.setFace('shock'); c.head.rotation.y = -0.6; c.armL.rotation.x = c.armR.rotation.x = -0.6; }
          });
          cups.forEach((c) => { c.position.y = 0.82 + hop * 1.8; c.rotation.z = hop * 1.5; });
        },
      });
    }

    /* ===== 2. 着席（4.5〜9秒） ===== */
    let chairAt;
    {
      const S = newScene({ sky: SKY });
      const holes = [[-1, -4], [0, -4]];
      P.officeRoom(S, { holes });
      box(S, [2, 0.3, 1], [0, -2.25, -3.5], solid('#141822'), { cast: false });
      const brk = new P.Breakables(S, 5);
      holes.forEach(([x, z]) => {
        brk.add(blockMat('carpet'), [x + 0.5, -0.5, z + 0.5], 1.6);
        brk.add(blockMat('foundation'), [x + 0.5, -1.5, z + 0.5], 1.6, { bits: 3 });
      });
      P.desk(S, 0, -2.5); P.laptop(S, 0, 0.82, -2.6);
      box(S, [1.0, 0.32, 0.04], [0, 0.5, -1.99], faces(solid('#f2c230'), { front: P.glow(textTex('部長', { w: 128, h: 64, size: 40 })) }));
      const chair = P.chair(S, 0, -3.45, 0, '#5a2f2f');
      [-4, 4].forEach((x) => { P.desk(S, x, -2.5); P.chair(S, x, -3.45); P.laptop(S, x, 0.82, -2.6); });
      P.shelf(S, 6.4, -5.7); P.plant(S, -8.6, -5.3);
      const staff = [addChar(S, A_LOOK, [-4, 0, -3.45]), addChar(S, MATES[0], [4, 0, -3.45])];
      const boss = addChar(S, BOSS, [1.4, 0, -3.3], -0.3);
      const dust = P.dustPuff(S, 10, 9);
      chairAt = () => V3(0, 0.6, -3.45);
      scenes.push({
        id: 'sit', start: SIT, end: PEN, scene: S, boss,
        cam: camPath([3.4, 3.8, 7.2], [2.6, 3.2, 6.2], [0, 0.9, -2.9], [0, 0.8, -3.0], 36, 4.5),
        shake: (lt) => impact(lt, [1.0], 0.04) + impact(lt, [1.6], 0.12),
        update(lt) {
          brk.update(lt);
          dust.update(lt, 1.6, [0, 0, -3.45]);
          const squash = ease.out(prog(lt, 1.0, 1.08));
          chair.scale.set(1 + squash * 0.3, 1 - squash * 0.85, 1 + squash * 0.3);
          chair.position.y = -2 * ease.in(prog(lt, 1.6, 1.8));
          chair.visible = lt < 1.8;
          reset(boss);
          if (lt < 0.9) {
            const u = prog(lt, 0.5, 0.9);
            boss.root.position.set(lerp(1.4, 0, u), 0, lerp(-3.3, -3.45, u));
            boss.root.rotation.y = lerp(-0.3, 0, u);
            if (u > 0 && u < 1) walk(boss, lt * 14, 0.35);
          } else {
            boss.root.position.set(0, 0, -3.45);
            sit(boss);
            const drop1 = ease.out(prog(lt, 1.0, 1.08)) * 0.38;
            const drop2 = ease.in(prog(lt, 1.6, 1.78)) * 0.55;
            boss.root.position.y = -drop1 - drop2;
            if (lt > 2.0) { boss.armL.rotation.x = -2.35 + Math.sin(lt * 20) * 0.12; boss.armR.rotation.x = -2.35 + Math.sin(lt * 20 + 1.7) * 0.12; }
          }
          staff.forEach((c, i) => {
            reset(c); sit(c); typing(c, lt + i * 2);
            if (lt > 1.0) { c.setFace('shock'); c.head.rotation.y = i ? -0.8 : 0.8; c.armL.rotation.x = c.armR.rotation.x = -0.4; }
            c.root.position.y += bump(lt, [1.6], 0.18);
          });
        },
      });
    }

    /* ===== 3. 落とし物（9〜14秒）：ビルの断面、5階→3階 ===== */
    let boss3, mate3;
    const penPos = V3(0.95, PEN_Y0, 1.5);
    {
      const S = newScene({ sky: SKY });
      const cells = [[0, 4 * H - 1, 1], [0, 4 * H - 2, 1], [0, 3 * H - 1, 1], [0, 3 * H - 2, 1]];
      P.tower(S, { holes: cells });
      const brk = new P.Breakables(S, 11);
      cells.forEach(([x, y, z], i) => brk.add(blockMat(i % 2 ? 'foundation' : 'carpet'), [x + 0.5, y + 0.5, z + 0.5], penBreak[i < 2 ? 0 : 1], { bits: 4 }));
      const f5 = floorG(S, 5), f4 = floorG(S, 4), f3 = floorG(S, 3);
      P.desk(f5, 3.2, -2.0); P.laptop(f5, 3.2, 0.82, -2.1); P.plant(f5, -4.8, -2.4);
      boss3 = addChar(f5, BOSS, [0.5, 0, 0.9]);
      P.desk(f4, -3.2, -1.2); P.chair(f4, -3.2, -2.15); P.laptop(f4, -3.2, 0.82, -1.3);
      const mate4 = addChar(f4, MATES[0], [-3.2, 0, -2.15]);
      P.desk(f3, 0.6, 1.2); P.chair(f3, 0.6, 0.25); P.laptop(f3, -0.1, 0.82, 1.1);
      mate3 = addChar(f3, MATES[2], [0.6, 0, 0.25]);
      P.plant(f3, 4.2, -2.4);
      const pen = group(S);
      box(pen, [0.08, 0.44, 0.08], [0, 0, 0], solid('#1d2333'));
      box(pen, [0.09, 0.08, 0.09], [0, 0.2, 0], solid('#f2c230'));
      const yTop = 4 * H + 1.3, yLow = 2 * H + 1.2;
      scenes.push({
        id: 'pen', start: PEN, end: MEET, scene: S,
        cam: (lt) => {
          const u = ease.inOut(prog(lt, 0.95, 1.75)), w = ease.inOut(prog(lt, 2.3, 3.3));
          const ty = lerp(yTop, yLow, u);
          const near = [[3.4, ty + 1.9, 10.4], [0.4, ty, -0.6]], far = [[5.0, 3 * H + 3.0, 26], [0.4, 3 * H + 0.8, -0.4]];
          return { pos: lerp3(near[0], far[0], w), target: lerp3(near[1], far[1], w), fov: 38 };
        },
        shake: (lt) => impact(lt, [penLand], 0.03),
        update(lt) {
          brk.update(lt);
          P.followLight(S, 0, lerp(lerp(yTop, yLow, ease.inOut(prog(lt, 0.95, 1.75))), 3 * H, ease.inOut(prog(lt, 2.3, 3.3))), -1);
          reset(boss3);
          if (lt < 1.2) { boss3.armR.rotation.x = -1.4; boss3.armR.rotation.z = 0.12; }
          if (lt > PEN_DROP) { boss3.head.rotation.x = 0.5 * ease.out(prog(lt, PEN_DROP, PEN_DROP + 0.2)); }
          const d = lt - PEN_DROP;
          if (d < 0) pen.position.copy(penPos);
          else if (lt < penLand) pen.position.set(penPos.x, PEN_Y0 - 0.5 * PEN_G * d * d, penPos.z);
          else pen.position.set(penPos.x, 2 * H + 0.82 + 0.1, penPos.z);
          pen.rotation.set(lt >= penLand ? 0.18 : 0, 0, lt >= penLand ? 0.12 : 0);
          reset(mate4); sit(mate4); typing(mate4, lt);
          if (lt > penBreak[1] - 0.05) { mate4.setFace('shock'); mate4.head.rotation.y = 0.9; mate4.armL.rotation.x = mate4.armR.rotation.x = -0.3; }
          reset(mate3); sit(mate3); typing(mate3, lt + 1);
          if (lt > penLand) {
            mate3.setFace('shock');
            mate3.root.position.y += bump(lt, [penLand], 0.25);
            mate3.armL.rotation.x = mate3.armR.rotation.x = -0.5;
            if (lt > penLand + 0.6) { mate3.head.rotation.x = -0.55; mate3.armR.rotation.x = -2.7; mate3.setFace('normal'); }
          }
        },
      });
    }

    /* ===== 4. 重い話（14〜19.5秒） ===== */
    let boss4, mid4;
    {
      const S = newScene({ sky: SKY });
      P.officeRoom(S, { floor: 'plank', windows: [[3, 2], [4, 2], [3, 3], [4, 3], [6, 2], [7, 2], [6, 3], [7, 3]] });
      P.whiteboard(S, [0, 2.5, -5.92]);
      const wood = solid('#c99a62');
      const halfL = group(S, [-2.15, 0.82, -2.3]), halfR = group(S, [2.15, 0.82, -2.3]);
      box(halfL, [2.15, 0.1, 1.3], [1.075, -0.05, 0], wood);
      box(halfR, [2.15, 0.1, 1.3], [-1.075, -0.05, 0], wood);
      [[halfL, 1], [halfR, -1]].forEach(([h, s]) => {
        box(h, [0.42, 0.02, 0.3], [s * 0.7, 0.01, 0.2], solid('#ffffff'), { cast: false });
        box(h, [0.14, 0.18, 0.14], [s * 1.3, 0.09, 0.35], solid('#f4f1ea'));
      });
      [[-2.05, -2.85], [-2.05, -1.75], [2.05, -2.85], [2.05, -1.75]].forEach(([x, z]) => box(S, [0.1, 0.72, 0.1], [x, 0.36, z], solid('#8f6a42')));
      const xs = [-1.4, 0, 1.4];
      xs.forEach((x) => P.chair(S, x, -3.45, 0, '#2f62d6'));
      const staff = xs.map((x, i) => addChar(S, i === 1 ? A_LOOK : MATES[i], [x, 0, -3.45]));
      mid4 = staff[1];
      boss4 = addChar(S, BOSS, [-3.7, 0, -1.1], 0.8);
      const iron = solid('#5a5f68');
      const heavy = group(S);
      box(heavy, [2.0, 1.0, 1.0], [0, 0, 0], faces(iron, { front: P.glow(textTex('重い話', { w: 256, h: 128, size: 72, bg: '#5a5f68', fg: '#ffffff' })), top: solid('#6c727c') }));
      [[-0.85, 0.4], [0.85, 0.4], [-0.85, -0.4], [0.85, -0.4]].forEach(([x, y]) => box(heavy, [0.1, 0.1, 0.04], [x, y, 0.51], solid('#3a3e45'), { cast: false }));
      const dust = P.dustPuff(S, 10, 4);
      const crack = P.crackDecal(S, 0, 0, -2.3, 0.4); crack.scale.setScalar(2.2);
      scenes.push({
        id: 'meeting', start: MEET, end: LEAVE, scene: S,
        cam: camPath([3.6, 4.0, 8.6], [3.0, 3.6, 7.8], [-0.6, 1.4, -2.0], [-0.4, 1.3, -2.0], 36, 5.5),
        shake: (lt) => impact(lt, [SMASH], 0.16, 8),
        update(lt) {
          const fold = lt < SMASH ? 0 : 0.36 * ease.out(prog(lt, SMASH, SMASH + 0.14));
          halfL.rotation.z = -fold; halfR.rotation.z = fold;
          heavy.visible = lt >= 1.6;
          let hy = 3.7;
          if (lt >= 2.0 && lt < SMASH) { const u = (lt - 2.0) / (SMASH - 2.0); hy = lerp(3.7, 1.32, u * u); }
          else if (lt >= SMASH) hy = lerp(1.32, 0.5, ease.in(prog(lt, SMASH, SMASH + 0.14)));
          heavy.position.set(0, hy, -2.3);
          heavy.rotation.z = lt < 2.0 ? Math.sin(lt * 9) * 0.06 : 0;
          heavy.scale.setScalar(lt < 2.0 ? popScale(lt, 1.6, 0.25) : 1);
          crack.visible = lt >= SMASH + 0.12;
          dust.update(lt, SMASH + 0.1, [0, 0, -2.3], 0.9);
          reset(boss4);
          boss4.armL.rotation.x = boss4.armR.rotation.x = -1.25;
          boss4.armL.rotation.z = 0.55; boss4.armR.rotation.z = -0.55;
          if (lt < 1.9) { boss4.head.rotation.z = Math.sin(lt * 4) * 0.04; }
          staff.forEach((c, i) => {
            reset(c); sit(c);
            c.armL.rotation.x = c.armR.rotation.x = -1.0;
            c.head.rotation.y = -0.5;
            if (lt > 1.6) { c.head.rotation.y = 0; c.head.rotation.x = -0.35; c.setFace('shock'); }
            if (lt > SMASH) {
              c.head.rotation.x = 0;
              c.root.position.y += bump(lt, [SMASH], 0.3);
              c.root.rotation.x = -0.18;
              banzai(c, 0.6, Math.sin(lt * 12 + i) * 0.1);
            }
          });
        },
      });
    }

    /* ===== 5. 退勤（19.5〜25秒）：5階から1階まで床を抜けて帰る ===== */
    let boss5;
    {
      const S = newScene({ sky: ['#ffb27a', '#ffe0b0'], sunColor: '#ffd8b0' });
      const ys = [4 * H - 1, 4 * H - 2, 3 * H - 1, 3 * H - 2, 2 * H - 1, 2 * H - 2, H - 1, H - 2];
      const cells = ys.map((y) => [-3, y, 1]);
      P.tower(S, { holes: cells });
      const brk = new P.Breakables(S, 21);
      cells.forEach(([x, y, z], i) => brk.add(blockMat(i % 2 ? 'foundation' : 'carpet'), [x + 0.5, y + 0.5, z + 0.5], bossBreak[i >> 1], { bits: 5 }));
      const fl = [1, 2, 3, 4, 5].map((f) => floorG(S, f));
      const clock = P.wallClock(fl[4], [-0.4, 2.3, -2.93], 0.9);
      P.desk(fl[4], 2.4, -1.2); P.chair(fl[4], 2.4, -2.15); P.laptop(fl[4], 2.4, 0.82, -1.3);
      const a5 = addChar(fl[4], A_LOOK, [2.4, 0, -2.15]);
      const watchers = [[3, MATES[1]], [2, MATES[0]], [1, MATES[2]]].map(([f, look]) => {
        P.desk(fl[f], 2.0, -1.2); P.chair(fl[f], 2.0, -2.15); P.laptop(fl[f], 2.0, 0.82, -1.3);
        return { c: addChar(fl[f], look, [2.0, 0, -2.15]), f };
      });
      box(fl[0], [2.2, 1.0, 0.8], [2.6, 0.5, -1.4], solid('#b98a55'));
      box(fl[0], [2.0, 0.3, 0.06], [2.6, 0.75, -0.98], faces(solid('#1d2333'), { front: P.glow(textTex('受付', { w: 128, h: 48, size: 30, bg: '#1d2333', fg: '#f2c230' })) }));
      P.plant(fl[0], -5.0, -2.4); P.plant(fl[3], -5.0, -2.4, 0.8);
      const landCrack = P.crackDecal(S, -2.5, 0, 1.5, 0.7); landCrack.scale.setScalar(1.8);
      const dust = P.dustPuff(S, 12, 13);
      boss5 = addChar(S, BOSS, [-2.5, 4 * H, 1.5]);
      const bossY = (lt) => (lt < BOSS_DROP ? 4 * H : Math.max(0, 4 * H - 0.5 * BOSS_G * (lt - BOSS_DROP) ** 2));
      const bossX = (lt) => lerp(-2.5, 5.2, prog(lt, 3.0, 5.5));
      scenes.push({
        id: 'leave', start: LEAVE, end: 25.0, scene: S,
        cam: (lt) => {
          const ty = Math.max(1.3, bossY(lt) + 1.3), tx = lerp(-1.0, 1.6, ease.inOut(prog(lt, 2.8, 5.5)));
          return { pos: [tx + 4.2, ty + 1.9, 11.0], target: [tx, ty, -0.2], fov: 38 };
        },
        shake: (lt) => impact(lt, bossBreak, 0.06) + impact(lt, [bossLand], 0.2, 7),
        update(lt) {
          brk.update(lt);
          const y = bossY(lt);
          P.followLight(S, 0, Math.max(1.3, y + 1.3), -1);
          clock.set(17 + Math.min(1, (59 + ease.inOut(prog(lt, 0.2, 0.35))) / 60));
          landCrack.visible = lt >= bossLand;
          dust.update(lt, bossLand, [-2.5, 0, 1.5], 0.9);
          const b = boss5;
          reset(b);
          b.root.position.set(lt < 3.0 ? -2.5 : bossX(lt), y, 1.5);
          if (lt < BOSS_DROP) {
            if (lt > 0.5) { b.armR.rotation.z = 2.5 + Math.sin(lt * 12) * 0.25; b.setFace('happy'); }
          } else if (lt < bossLand) {
            banzai(b, 0.3, Math.sin(lt * 30) * 0.08);
          } else if (lt < 3.0) {
            b.root.position.y -= bump(lt, [bossLand], 0.12);
            if (lt > 2.6) { b.armR.rotation.x = -1.35; b.armR.rotation.z = 0.45; }
          } else {
            b.root.rotation.y = Math.PI / 2;
            walk(b, lt * 11, 0.4);
            b.setFace('happy');
          }
          reset(a5); sit(a5); typing(a5, lt);
          if (lt > BOSS_DROP) { a5.setFace('shock'); a5.head.rotation.y = -0.8; a5.armL.rotation.x = a5.armR.rotation.x = -0.4; }
          watchers.forEach(({ c, f }, i) => {
            reset(c); sit(c); typing(c, lt + i);
            const pass = bossBreak[4 - f];
            if (lt > pass - 0.05) { c.setFace('shock'); c.head.rotation.y = -0.85; c.root.position.y += bump(lt, [pass], 0.2); c.armL.rotation.x = c.armR.rotation.x = -0.4; }
          });
        },
      });
    }

    /* ===== 6. 帰り道（25〜30秒）：言葉だけは軽い ===== */
    let boss6;
    {
      const S = newScene({ sky: ['#5d6fc9', '#ffc08f'], sunColor: '#ffd2a8', sunI: 0.5, amb: 0.7, hemiSky: '#cfd6ff', hemiGround: '#8a7a70' });
      const B = new Blocks();
      B.fill('foundation', -14, -2, -4, 13, -2, 7);
      B.fill('stone', -14, -1, -3, 13, -1, 1);
      B.fill('asphalt', -14, -1, 2, 13, -1, 7);
      for (let x = -14; x <= 13; x++) for (let y = -1; y <= 12; y++) B.set(y === 3 || y === 8 ? 'wallBase' : 'brick', x, y, -4);
      [[-1, 0], [0, 0], [-1, 1], [0, 1], [-6, 4], [-5, 4], [-6, 5], [-5, 5], [4, 4], [5, 4], [4, 5], [5, 5]].forEach(([x, y]) => B.del(x, y, -4));
      B.build(S);
      box(S, [2, 2, 0.4], [0, 1, -4.7], solid('#2b3140'), { cast: false });
      box(S, [2, 2, 0.4], [-5, 5, -5.1], solid('#3a3346'), { cast: false });
      box(S, [2, 2, 0.4], [5, 5, -5.1], solid('#3a3346'), { cast: false });
      for (let x = -13; x <= 13; x += 3) box(S, [1.4, 0.03, 0.18], [x, 0.015, 4.5], solid('#f4f1ea'), { cast: false });
      const lamp = group(S, [5.6, 0, 0.4]);
      box(lamp, [0.16, 3.4, 0.16], [0, 1.7, 0], solid('#2b3140'));
      box(lamp, [0.7, 0.12, 0.16], [-0.28, 3.4, 0], solid('#2b3140'));
      box(lamp, [0.34, 0.2, 0.3], [-0.55, 3.3, 0], new T.MeshBasicMaterial({ color: '#ffe9a8' }), { cast: false });
      const peek = [addChar(S, MATES[1], [-5.0, 3.7, -4.45]), addChar(S, A_LOOK, [5.0, 3.7, -4.45])];
      boss6 = addChar(S, BOSS, [0, 0, -1.8], 0.15);
      const balloon = group(S);
      const white = solid('#ffffff', { emissive: '#9aa3b5' });
      [[0, 0, 4.9, 1.0], [-1.6, 0.45, 1.4, 0.8], [0.2, 0.55, 1.7, 0.8], [1.8, 0.35, 1.2, 0.7]].forEach(([x, y, w, h]) => box(balloon, [w, h, 0.5], [x, y, -0.05], white, { cast: false }));
      box(balloon, [4.6, 0.575, 0.04], [0, 0, 0.22], P.glow(textTex('まあ、なんとかなるっしょ！', { w: 1024, h: 128, size: 76, bg: '#ffffff', fg: '#1d2333' })), { cast: false });
      box(balloon, [0.03, 1.2, 0.03], [0.3, -1.1, 0], solid('#e9e4d8'), { cast: false });
      const sun = new T.Mesh(new T.BoxGeometry(3.4, 3.4, 0.4), new T.MeshBasicMaterial({ color: '#ffb36b', fog: false }));
      sun.position.set(-14, 13, -30); S.add(sun);
      scenes.push({
        id: 'home', start: 25.0, end: 30.01, scene: S,
        cam: camPath([4.4, 2.8, 11.2], [3.6, 5.2, 13.2], [0, 2.4, -1.6], [0, 5.3, -2.2], 38, 5),
        update(lt, t) {
          reset(boss6);
          boss6.setFace('happy');
          boss6.armR.rotation.z = 2.5 + Math.sin(t * 9) * 0.3;
          const rise = Math.pow(Math.max(0, lt - 0.9), 1.3) * 1.15;
          balloon.visible = lt >= 0.55;
          balloon.position.set(0.4 + Math.sin(lt * 1.8) * 0.35, 2.9 + rise, -1.6);
          balloon.rotation.z = Math.sin(lt * 1.8 + 1) * 0.08;
          balloon.scale.setScalar(popScale(lt, 0.55, 0.3));
          peek.forEach((c, i) => {
            reset(c); c.setFace('shock');
            c.head.rotation.x = -0.25 - 0.35 * prog(lt, 1.0, 4.0);
            c.head.rotation.y = i ? -0.5 : 0.5;
          });
        },
      });
    }

    /* ===== 重ね表示 ===== */
    const overlay = [
      { type: 'caption', t0: 0, t1: SIT, lines: [
        { text: 'もしも部長だけ、重力が10倍だったら', cls: 'title' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: STEPS[0], t1: 25.0, label: '部長が今日こわしたもの', value: broken, format: (n) => `${n}個`, done: (t) => t >= LEAVE + bossLand },
      ...[0, 2, 4].map((k, i) => ({ type: 'fx', t0: STEPS[k], t1: STEPS[k] + 0.6, text: 'ズシン', scene: 'arrive', anchor: feet(boss1), x: i % 2 ? 120 : -120, y: -20, rot: i % 2 ? 8 : -8, size: 50 })),
      { type: 'tag', t0: 3.4, t1: SIT, text: '体重72kg、体感720kg' },
      { type: 'caption', t0: SIT, t1: PEN, lines: [
        { text: '座った瞬間、', at: SIT + 0.1, cps: 18 },
        { text: '椅子が負ける', at: SIT + 1.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: SIT + 1.0, t1: SIT + 1.6, text: 'ペシャッ', scene: 'sit', anchor: () => chairAt(), x: 190, y: -40, rot: 7 },
      { type: 'fx', t0: SIT + 1.6, t1: SIT + 2.5, text: 'バキッ', scene: 'sit', anchor: () => chairAt(), x: -200, y: 30, rot: -8, shake: true },
      { type: 'tag', t0: SIT + 2.8, t1: PEN, text: '部長の椅子、本日3脚目' },
      { type: 'caption', t0: PEN, t1: MEET, lines: [
        { text: '落としたペンは、', at: PEN + 0.15, cps: 16 },
        { text: '2つ下の階で見つかる', at: PEN + 2.9, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: PEN + PEN_DROP + 0.05, t1: PEN + 1.05, text: 'あ。', scene: 'pen', anchor: headTop(boss3, 1.05) },
      { type: 'fx', t0: PEN + PEN_DROP + 0.1, t1: PEN + penBreak[1], text: 'ヒュッ', scene: 'pen', anchor: () => V3(penPos.x, 4 * H, penPos.z), x: 120, y: 30, rot: -6, size: 46 },
      { type: 'fx', t0: PEN + penLand, t1: PEN + penLand + 0.7, text: 'トスッ', scene: 'pen', anchor: () => V3(penPos.x, 2 * H + 1, penPos.z), x: 150, y: -30, rot: 6, size: 50 },
      { type: 'bubble', t0: PEN + penLand + 0.6, t1: MEET, text: '部長、ペン届きましたー', scene: 'pen', anchor: headTop(mate3) },
      { type: 'bubble', t0: MEET + 0.3, t1: MEET + 1.95, text: 'ちょっと、重い話がある', scene: 'meeting', anchor: headTop(boss4, 1.0) },
      { type: 'fx', t0: MEET + SMASH, t1: MEET + SMASH + 0.9, text: 'ドゴォッ', x: 660, y: 150, rot: -5, size: 66, shake: true },
      { type: 'bubble', t0: MEET + 3.0, t1: LEAVE, text: '物理的に重い…', scene: 'meeting', anchor: headTop(mid4) },
      { type: 'tag', t0: MEET + 3.6, t1: LEAVE, text: '議題：来期の予算' },
      { type: 'tag', t0: LEAVE + 0.35, t1: LEAVE + 1.4, text: '18:00 定時', scene: 'leave', anchor: () => V3(-0.4, 4 * H + 1.55, -2.9) },
      { type: 'bubble', t0: LEAVE + 0.5, t1: LEAVE + BOSS_DROP, text: 'じゃ、お先に', scene: 'leave', anchor: headTop(boss5, 1.0) },
      { type: 'fx', t0: LEAVE + BOSS_DROP + 0.05, t1: LEAVE + bossLand, text: 'ズドドドッ', x: 900, y: 200, rot: -7, size: 60, shake: true },
      { type: 'fx', t0: LEAVE + bossLand, t1: LEAVE + bossLand + 0.7, text: 'ズドン', scene: 'leave', anchor: feet(boss5, 0.2), x: 170, y: -10, rot: 6, size: 60 },
      { type: 'caption', t0: LEAVE, t1: 25.0, lines: [
        { text: '退勤だけは、', at: LEAVE + bossLand + 0.05, cps: 16 },
        { text: '誰よりも速い', at: LEAVE + bossLand + 0.7, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: LEAVE + 3.4, t1: 25.0, text: '5階から1階まで、1.0秒' },
      { type: 'caption', t0: 25.0, t1: 30.1, lines: [
        { text: 'それでも部長の言葉は、いつも軽い。', at: 25.2, cps: 15, cls: 'mark-soft' },
        { text: '重力10倍の部長', at: 26.8, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #02　おわり' },
    ];

    /* ===== 音 ===== */
    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({
      prog: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'G', 'Dm', 'Am', 'Dm', 'G', 'F', 'G', 'F', 'C'],
      shape: ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'D', 'A', 'B', 'D', 'C', 'A', 'C', 'D', null],
    });
    const add = (list) => audio.push(...list);
    [SIT, PEN, MEET, LEAVE, 25.0].forEach((c) => add(S_.whoosh(c - 0.2)));
    add(S_.door(0.25));
    STEPS.forEach((t) => { add(S_.stomp(t)); add(S_.crack(t + 0.03)); });
    add(S_.squash(SIT + 1.0));
    add(S_.smash(SIT + 1.6)); add(S_.crack(SIT + 1.62)); add(S_.dust(SIT + 1.65));
    add(S_.talk(PEN + PEN_DROP + 0.05, 2));
    add(S_.whistle(PEN + PEN_DROP, penLand - PEN_DROP));
    penBreak.forEach((t) => add(S_.crack(PEN + t)));
    add(S_.thud(PEN + penLand, 6));
    add(S_.talk(PEN + penLand + 0.6, 7));
    add(S_.talk(MEET + 0.3, 6));
    add(S_.pop(MEET + 1.6, 1));
    add(S_.whistle(MEET + 2.0, SMASH - 2.0));
    add(S_.smash(MEET + SMASH)); add(S_.dust(MEET + SMASH + 0.08));
    add(S_.talk(MEET + 3.0, 5));
    add(S_.chime(LEAVE + 0.3));
    add(S_.talk(LEAVE + 0.5, 4));
    add(S_.whistle(LEAVE + BOSS_DROP, bossLand - BOSS_DROP));
    bossBreak.forEach((t) => { add(S_.crack(LEAVE + t)); add(S_.stomp(LEAVE + t)); });
    add(S_.smash(LEAVE + bossLand)); add(S_.dust(LEAVE + bossLand + 0.05));
    for (let k = 0; k < 6; k++) add(S_.step(LEAVE + 3.0 + k * 0.28));
    add(S_.floaty(25.55));
    add(S_.pop(28.3, 3));

    return { scenes, overlay, audio, cuts: [SIT, PEN, MEET, LEAVE, 25.0] };
  },
});
