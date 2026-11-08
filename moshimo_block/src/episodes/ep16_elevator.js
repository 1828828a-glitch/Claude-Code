/* ep16 — もしもエレベーターが、横にも動けたら（30秒） */
EPISODES.push({
  id: 'ep16',
  no: 16,
  short: '横に動くエレベーター',
  title: 'もしもエレベーターが、横にも動けたら',
  lead: '1階で乗れば、そのまま3階の自分の席まで。昼はとなりのビルのラーメン屋へ、部長は3時に家まで直帰。定時には空でエレベーターが渋滞する。',
  duration: 30,
  poster: 12.4,
  chapters: [
    { t: 0, name: '出社' }, { t: 4.5, name: '席まで直通' }, { t: 9.5, name: 'ラーメン' },
    { t: 15, name: '直帰' }, { t: 20.5, name: '渋滞' }, { t: 25.5, name: '階段' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const H = P.FLOOR_H;
    const car = (parent, label = '→') => {
      const g = group(parent);
      const metal = solid('#c3c9d0'), dark = solid('#8a929c');
      box(g, [1.5, 0.1, 1.5], [0, 0.05, 0], dark); box(g, [1.5, 2.3, 0.08], [0, 1.15, -0.71], metal);
      [-1, 1].forEach((s) => box(g, [0.08, 2.3, 1.5], [s * 0.71, 1.15, 0], metal));
      box(g, [1.5, 0.12, 0.12], [0, 2.2, 0.72], metal);
      const doors = [-1, 1].map((s) => box(g, [0.7, 2.0, 0.06], [s * 0.36, 1.05, 0.77], dark));
      box(g, [0.6, 0.3, 0.04], [0, 2.18, 0.78], faces(solid('#1d2333'), { front: P.glow(textTex(label, { w: 128, h: 64, size: 44, bg: '#1d2333', fg: '#f2c230' })) }));
      box(g, [1.6, 0.1, 1.6], [0, 2.35, 0], dark);
      return { g, open(u) { doors.forEach((d, i) => { d.position.x = (i ? 1 : -1) * (0.36 + 0.66 * u); }); } };
    };
    const path = (pts, u) => {
      const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), f = u * n - k;
      return [lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f), lerp(pts[k][2], pts[k + 1][2], f)];
    };
    const dist = (t) => {
      let d = 0;
      if (t >= 5.0) d += 7.5 * prog(t, 5.0, 6.6);
      if (t >= 10.2) d += 9 * prog(t, 10.2, 12.4);
      if (t >= 15.6) d += 34 * prog(t, 15.6, 18.4);
      return Math.round(d * 10) / 10;
    };

    /* ===== ビルの中：1階から3階の席まで ===== */
    let A1;
    {
      const S = newScene({ sky: SKY_DAY });
      P.tower(S, { floors: 4 });
      const fl = [1, 2, 3, 4].map((f) => floorG(S, f));
      box(fl[0], [2.4, 1.0, 0.8], [2.4, 0.5, -1.6], solid('#b98a55'));
      P.plant(fl[0], 4.4, -2.4);
      const deskX = 2.6;
      const mates = [workstation(fl[2], -1.2, -1.4, CAST.M1), workstation(fl[2], 4.6, -1.4, CAST.M2)];
      P.desk(fl[2], deskX, -1.4); P.chair(fl[2], deskX, -2.35);
      workstation(fl[1], 1.0, -1.4, CAST.M3); workstation(fl[3], 1.0, -1.4, CAST.NEW);
      const el = car(S);
      A1 = addChar(S, CAST.A, [-1.0, 0, 1.4], -Math.PI / 2);
      const update = (lt, t) => {
        P.followLight(S, 0, t < 4.4 ? lerp(1, 2 * H, prog(t, 3.0, 4.4)) : 2 * H + 1, 0);
        let cp;
        if (t < 3.0) cp = [-4.6, 0, 0.2];
        else if (t < 4.4) cp = [-4.6, lerp(0, 2 * H, ease.inOut(prog(t, 3.0, 4.4))), 0.2];
        else cp = [lerp(-4.6, deskX + 0.4, ease.inOut(prog(t, 5.0, 6.6))), 2 * H, 0.2];
        el.g.position.set(cp[0], cp[1], cp[2]);
        el.open(t < 3.0 ? 1 - prog(t, 2.2, 2.6) : t < 6.6 ? 0 : prog(t, 6.7, 7.1));
        reset(A1);
        if (t < 2.2) { const u = prog(t, 0.3, 2.0); A1.root.position.set(lerp(-1.0, -4.6, u), 0, lerp(1.4, 0.2, u)); A1.root.rotation.y = -Math.PI / 2 - 0.3; if (u > 0 && u < 1) walk(A1, t * 14, 0.6); }
        else if (t < 7.2) { A1.root.position.set(cp[0], cp[1], cp[2]); A1.root.rotation.y = 0; A1.setFace(t > 5.0 ? 'happy' : 'normal'); }
        else { const u = prog(t, 7.2, 8.0); A1.root.position.set(deskX + 0.4 + (u * -0.4), 2 * H, lerp(0.2, -2.35, u)); if (u >= 1) { A1.root.rotation.y = 0; sit(A1); typing(A1, t); } else { A1.root.rotation.y = Math.PI; walk(A1, t * 14, 0.6); } }
        mates.forEach((c, i) => { working(c, t, i); if (t > 5.2) surprised(c, i ? -0.8 : 0.8, bump(t, [6.6], 0.15)); });
      };
      scenes.push({ id: 'tower', start: 0, end: 4.5, scene: S, update, cam: (lt, t) => { const y = lerp(1.6, 2 * H + 1.6, ease.inOut(prog(t, 3.0, 4.4))); return { pos: [2.4, y + 2.2, 11.6], target: [-1.6, y, -0.6], fov: 40 }; } });
      scenes.push({ id: 'tower', start: 4.5, end: 9.5, scene: S, update, cam: camPath([3.4, 2 * H + 3.6, 11.4], [3.0, 2 * H + 3.4, 10.6], [0.0, 2 * H + 1.2, -0.8], [0.6, 2 * H + 1.2, -0.8], 40, 5) });
    }

    /* ===== 街：ラーメン、直帰、渋滞、階段 ===== */
    let carA, bossCar, A2, BOSS;
    {
      const S = newScene({ sky: SKY_DAY, sun: [12, 30, 16], fog: ['#e8f5fb', 80, 200] });
      const winMat = blockMat('window').clone();
      const B = new Blocks();
      B.fill('stone', -30, -1, -10, 60, -1, 12);
      for (let x = -6; x <= 5; x++) for (let y = 0; y <= 19; y++) B.set(y % 5 === 2 && x % 3 === 0 ? 'window' : 'facade', x, y, 1);
      for (let z = -3; z <= 1; z++) for (let y = 0; y <= 19; y++) B.set(y % 5 === 2 && z === -1 ? 'window' : 'facade', 5, y, z);
      [[5, 10, -1], [5, 11, -1], [5, 15, -1], [5, 16, -1]].forEach(([x, y, z]) => B.del(x, y, z));
      for (let x = 13; x <= 20; x++) for (let y = 0; y <= 11; y++) B.set('brick', x, y, 1);
      for (let z = -4; z <= 1; z++) for (let y = 0; y <= 11; y++) B.set('brick', 13, y, z);
      [[13, 5, -1], [13, 6, -1]].forEach(([x, y, z]) => B.del(x, y, z));
      B.build(S, { window: winMat }, { cast: false });
      box(S, [3.6, 0.8, 0.1], [16.5, 8.5, 2.06], faces(solid('#d24b4b'), { front: P.glow(textTex('ラーメン', { w: 256, h: 64, size: 40, bg: '#d24b4b', fg: '#ffffff' })) }));
      const house = group(S, [40, 0, -1]);
      box(house, [4, 3, 4], [0, 1.5, 0], solid('#f4e6c8')); box(house, [4.6, 0.8, 4.6], [0, 3.4, 0], solid('#b5533c')); box(house, [3.0, 0.8, 3.0], [0, 4.2, 0], solid('#b5533c'));
      box(house, [1.0, 1.8, 0.06], [0, 0.9, 2.03], solid('#7a5232'));
      const stairs = group(S, [6.2, 0, 2.6]);
      for (let i = 0; i < 20; i++) box(stairs, [1.4, 0.5, 0.6], [(i % 8) * 0.6 - 2.1 + (Math.floor(i / 8) % 2 ? 0 : 0), 19.5 - i * 1.0, (Math.floor(i / 4) % 2) * 0.6], solid('#9aa3ad'));
      carA = car(S, '→');
      bossCar = car(S, '家');
      const jam = Array.from({ length: 9 }, (_, i) => car(S, ['→', '←', '↑'][i % 3]));
      A2 = addChar(S, CAST.A, [0, -99, 0]);
      const M = addChar(S, CAST.M2, [0, -99, 0]);
      BOSS = addChar(S, CAST.BOSS, [0, -99, 0]);
      const peek = [addChar(S, CAST.M1, [3.0, 13.6, 1.3]), addChar(S, CAST.NEW, [-3.0, 13.6, 1.3])];
      const moon = new T.Mesh(new T.BoxGeometry(2, 2, 0.4), new T.MeshBasicMaterial({ color: '#fff3c4' })); moon.position.set(22, 30, -20); S.add(moon);
      const { dir, hemi } = S.userData;
      const ramenPts = [[6.0, 10, -1], [9.5, 8.5, -1], [12.4, 5, -1]];
      const homePts = [[6.0, 15, -1], [18, 18, -1], [30, 10, 0], [40, 0, 2.2]];
      const update = (lt, t) => {
        P.followLight(S, t < 15 ? 8 : t < 20.5 ? 24 : 10, 10, 0);
        const night = prog(t, 20.6, 22.4);
        repaintGradient(S.background, mixHex(SKY_DAY[0], '#1c2450', night), mixHex(SKY_DAY[1], '#ff9a6a', night * 0.8));
        winMat.color.set(mixHex('#ffffff', '#ffd27a', night));
        dir.intensity = lerp(0.55, 0.2, night); hemi.intensity = lerp(0.72, 0.45, night);
        moon.visible = night > 0.5;
        const ru = ease.inOut(prog(t, 10.2, 12.4));
        const rp = t < 10.2 ? [5.2, 10, -1] : path(ramenPts, ru);
        carA.g.visible = t < 20.5;
        carA.g.position.set(rp[0], rp[1], rp[2]);
        carA.g.rotation.y = Math.PI / 2;
        carA.open(t > 12.5 ? prog(t, 12.5, 12.9) : 0);
        [A2, M].forEach((c, i) => {
          reset(c);
          c.root.visible = t >= 9.5 && t < 15;
          c.root.position.set(rp[0] + (t > 12.9 ? 1.2 + i * 0.4 : 0), rp[1], rp[2] + (i ? 0.35 : -0.35));
          c.root.rotation.y = Math.PI / 2;
          c.setFace('happy');
          if (t > 13.4) { c.armR.rotation.x = -1.6 + Math.sin(t * 10 + i) * 0.4; }
        });
        const hu = ease.inOut(prog(t, 15.6, 18.4));
        const hp = t < 15.6 ? [5.2, 15, -1] : path(homePts, hu);
        bossCar.g.visible = t >= 15 && t < 20.5;
        bossCar.g.position.set(hp[0], hp[1], hp[2]);
        bossCar.g.rotation.y = t < 18.4 ? Math.PI / 2 : 0;
        bossCar.open(t > 18.5 ? prog(t, 18.5, 18.9) : 0);
        reset(BOSS);
        BOSS.root.visible = t >= 15 && t < 20.5;
        BOSS.root.position.set(hp[0], hp[1], hp[2] + (t > 18.9 ? 1.0 : 0));
        BOSS.root.rotation.y = t > 18.9 ? 0 : Math.PI / 2;
        BOSS.setFace('happy');
        if (t > 18.9) BOSS.armR.rotation.z = 2.5 + Math.sin(t * 10) * 0.3;
        peek.forEach((c) => { reset(c); c.root.visible = t >= 15 && t < 20.5; c.setFace('shock'); c.head.rotation.y = 0.6; });
        jam.forEach((j, i) => {
          j.g.visible = t >= 20.5;
          const lane = i % 3, slot = Math.floor(i / 3);
          j.g.position.set(8 + slot * 2.6 + lane * 1.0, 6 + lane * 4 + Math.sin(t * 3 + i) * 0.08, -1 + lane * 0.4);
          j.g.rotation.y = Math.PI / 2;
          j.open(0);
        });
        if (t >= 20.5) {
          reset(A2);
          A2.root.visible = t >= 25.5;
          const u = prog(t, 25.6, 29.6);
          const step = Math.floor(u * 19);
          A2.root.position.set(6.2 + (step % 8) * 0.6 - 2.1, 19.6 - u * 19.4, 2.6 + (Math.floor(step / 4) % 2) * 0.6);
          A2.root.rotation.y = Math.floor(step / 8) % 2 ? -Math.PI / 2 : Math.PI / 2;
          walk(A2, t * 14, 0.6);
          A2.setFace('happy');
        }
      };
      scenes.push({ id: 'city', start: 9.5, end: 15, scene: S, update, cam: camPath([10, 10, 22], [10.5, 9.6, 21], [9.0, 7.0, -0.4], [10.0, 6.8, -0.4], 42, 5.5) });
      scenes.push({ id: 'city', start: 15, end: 20.5, scene: S, update, cam: (lt, t) => { const u = ease.inOut(prog(t, 15.4, 19.0)); return { pos: [lerp(14, 34, u), lerp(16, 10, u), lerp(26, 22, u)], target: [lerp(6, 38, u), lerp(14, 3, u), -0.6], fov: 44 }; } });
      scenes.push({ id: 'city', start: 20.5, end: 25.5, scene: S, update, cam: camPath([12, 11, 24], [13, 10.6, 23], [11, 9.0, -0.4], [11.5, 9.0, -0.4], 46, 5) });
      scenes.push({ id: 'city', start: 25.5, end: 30.01, scene: S, update, cam: (lt, t) => { const y = lerp(19, 2, prog(t, 25.6, 29.6)); return { pos: [14, y + 4, 18], target: [5.6, y + 0.6, 1.6], fov: 42 }; } });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもエレベーターが、横にも動けたら', cls: 'title' },
        { text: 'ブロック町のIT企業、朝9時', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 3.0, t1: CUTS[4], label: '今日の横移動', value: dist, format: (v) => `${v.toFixed(1)}ブロック`, done: (t) => t >= 18.4 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '横に動けば、', at: 4.65, cps: 16 },
        { text: '自分の席まで直通', at: 5.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '昼休みは、', at: 9.65, cps: 16 },
        { text: 'となりのビルのラーメン屋へ', at: 10.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 13.0, t1: 14.9, text: 'ラーメン2つ！', scene: 'city', anchor: headTop(A2) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '部長は、', at: 15.15, cps: 16 },
        { text: '3時に家まで直帰', at: 15.7, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 19.0, t1: 20.4, text: 'おつかれー', scene: 'city', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '定時になると、', at: 20.65, cps: 16 },
        { text: '空でエレベーター渋滞', at: 21.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.8, t1: 25.3, text: 'プップー', x: 900, y: 300, rot: -6, size: 54, shake: true },
      { type: 'tag', t0: 23.0, t1: CUTS[4], text: '渋滞 2時間待ち' },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも一番早いのは、階段。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: 'エレベーターが横にも動く会社', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #16　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const ding = (t) => [AUDIO.tone(t, 'E6', 0.4, { type: 'triangle', gain: 0.12, decay: true }), AUDIO.tone(t + 0.2, 'C6', 0.6, { type: 'triangle', gain: 0.12, decay: true })];
    const hum = (t, d) => [AUDIO.tone(t, 110, d, { type: 'triangle', gain: 0.05, f2: 140 })];
    const audio = AUDIO.music({ prog: ['C', 'G', 'F', 'G', 'C', 'G', 'F', 'G', 'Am', 'F', 'G', 'C', 'Am', 'Em', 'F', 'C'], arp: [6, 7] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    add(ding(2.4)); add(hum(3.0, 1.4)); add(hum(5.0, 1.6)); add(ding(6.7));
    add(hum(10.2, 2.2)); add(ding(12.5));
    add(hum(15.6, 2.8)); add(ding(18.5));
    for (let t = 21.8; t < 25.3; t += 0.6) add(S_.beep(t));
    for (let t = 25.6; t < 29.6; t += 0.21) add(S_.step(t));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
