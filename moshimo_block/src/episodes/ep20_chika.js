/* ep20 — もしもオフィスが、毎日どんどん沈んでいったら（30秒） */
EPISODES.push({
  id: 'ep20',
  no: 20,
  short: '沈むオフィス',
  title: 'もしもオフィスが、毎日どんどん沈んでいったら',
  lead: '月曜は1階、火曜は地下1階。木曜には窓の外に恐竜の化石、金曜は地底湖の魚、翌週はマグマで暖房いらず。それでも出社は9時。',
  duration: 30,
  poster: 12.6,
  chapters: [
    { t: 0, name: '月曜' }, { t: 4.5, name: '沈む' }, { t: 9.5, name: '化石' },
    { t: 15, name: '地底湖' }, { t: 20.5, name: 'マグマ' }, { t: 25.5, name: '通勤' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const FLOOR = 5;
    const DEPTH = [[0, 0], [4.8, 0], [6.2, 2], [9.6, 2], [10.6, 6], [15.1, 6], [16.0, 9], [20.6, 9], [21.6, 12]];
    const floors = (t) => { for (let i = DEPTH.length - 1; i >= 0; i--) if (t >= DEPTH[i][0]) { const nx = DEPTH[i + 1]; return nx ? lerp(DEPTH[i][1], nx[1], ease.inOut(prog(t, DEPTH[i][0], nx[0]))) : DEPTH[i][1]; } return 0; };
    const depth = (t) => floors(t) * FLOOR;

    let A, BOSS, staff;
    {
      const S = newScene({ sky: SKY_DAY });
      const office = group(S);
      const holes = [];
      [[-7, -6], [-2, -1], [3, 4]].forEach(([a, b]) => [2, 3].forEach((y) => { holes.push([a, y]); holes.push([b, y]); }));
      P.officeRoom(office, { windows: [], wallHoles: holes });
      [[-6, 3], [-1, 3], [4, 3]].forEach(([x]) => box(office, [2, 2, 0.04], [x, 3, -6.5], new T.MeshBasicMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.18 }), { cast: false }));
      const seats = [[-4, -2.6, CAST.A], [0, -2.6, CAST.M1], [4, -2.6, CAST.M2], [-2, 0.8, CAST.M3], [2, 0.8, CAST.NEW]];
      staff = seats.map(([x, z, look]) => workstation(office, x, z, look));
      A = staff[0];
      BOSS = addChar(office, CAST.BOSS, [7.2, 0, 1.4], -1.0);
      const hats = staff.map((c) => { const h = group(c.head, [0, 0.66, 0]); box(h, [0.74, 0.2, 0.74], [0, 0, 0], solid('#f2c230')); box(h, [0.2, 0.16, 0.08], [0, 0.0, 0.4], new T.MeshBasicMaterial({ color: '#fff7c0' }), { cast: false }); return h; });
      /* 窓の外の地層（オフィスの奥に縦長の壁） */
      const r = mulberry32(2020);
      const cells = [];
      for (let x = -12; x <= 10; x++) for (let y = -75; y <= 0; y++) cells.push([x, y]);
      const layer = (y) => (y > -2 ? '#4fb35a' : y > -14 ? '#8b5e34' : y > -24 ? '#7a6a5a' : y > -36 ? '#8a8f98' : y > -50 ? '#2f6fb0' : '#ff6a2e');
      const N = cells.length, wall = new T.InstancedMesh(UNIT, new T.MeshLambertMaterial({ color: '#ffffff' }), N);
      const tint = new T.Color(), m4 = new T.Matrix4();
      cells.forEach(([x, y], i) => {
        const base = layer(y), k = 1 + (r() - 0.5) * 0.18;
        tint.set(base); tint.multiplyScalar(k);
        if (y <= -50) tint.set(r() < 0.3 ? '#ffd23a' : '#ff6a2e');
        wall.setColorAt(i, tint);
        m4.makeTranslation(x + 0.5, y + 0.5, -9.5); wall.setMatrixAt(i, m4);
      });
      wall.instanceColor.needsUpdate = true;
      S.add(wall);
      const deco = group(S);
      const bone = new T.MeshBasicMaterial({ color: '#f4efe0' });
      [[0, 0, 4, 0.5], [-2.2, 0.8, 0.5, 1.6], [2.4, 0.6, 1.2, 0.5], [3.2, 1.0, 0.5, 0.9], [-1.0, -0.8, 0.3, 1.0], [1.0, -0.8, 0.3, 1.0], [-1.4, 0.5, 0.3, 0.8], [-0.6, 0.6, 0.3, 0.9], [0.2, 0.6, 0.3, 0.9], [1.0, 0.5, 0.3, 0.8]].forEach(([x, y, w, h]) => [-6, -1, 4].forEach((ox) => box(deco, [w * 0.6, h * 0.6, 0.3], [x * 0.6 + ox, -27 + y * 0.6, -8.4], bone)));
      const fishes = Array.from({ length: 7 }, (_, i) => { const g = group(S); box(g, [0.7, 0.35, 0.2], [0, 0, 0], solid(['#ff9f2e', '#f2c230', '#ff8fb3'][i % 3])); box(g, [0.25, 0.4, 0.1], [-0.45, 0, 0], solid('#d26f3c')); g.scale.setScalar(1.4); return { g, y: -43.2 + (i % 4) * 0.8, sp: 0.8 + (i % 3) * 0.4, ph: i * 2.7 }; });
      const worms = Array.from({ length: 5 }, (_, i) => { const g = group(S, [-8 + i * 4, -6 - (i % 3) * 2, -8.9]); for (let k = 0; k < 4; k++) box(g, [0.3, 0.3, 0.3], [k * 0.3, Math.sin(k) * 0.15, 0], solid('#ff9fb3')); return g; });
      const surface = new Blocks(); surface.fill('stone', -30, -1, -20, 30, -1, 12); surface.build(S, {}, { cast: false });
      const surfMesh = surface.meshes.stone;
      const { dir, hemi } = S.userData;
      const update = (lt, t) => {
        const d = depth(t);
        office.position.y = -d;
        surfMesh.visible = d < 1;
        P.followLight(S, 0, -d + 2, 0);
        const lava = prog(d, 50, 60);
        hemi.intensity = lerp(0.72, 0.6, prog(d, 0, 10)); dir.intensity = lerp(0.55, 0.3, prog(d, 0, 10)) + lava * 0.3;
        dir.color.set(mixHex('#ffffff', '#ff9a5a', lava));
        fishes.forEach((f, i) => { f.g.position.set(-10 + ((t * f.sp * 2 + f.ph) % 22), f.y + Math.sin(t * 2 + i) * 0.2, -8.7); });
        worms.forEach((w, i) => { w.rotation.z = Math.sin(t * 3 + i) * 0.3; });
        staff.forEach((c, i) => {
          working(c, t, i, 14);
          hats[i].visible = t >= 9.5 && t < 25.5;
          if (t >= 4.5 && t < 9.5 && t > 6.0) { c.setFace('shock'); c.head.rotation.x = -0.2; c.head.rotation.y = 0; }
          if (t >= 9.5 && t < 15) { c.head.rotation.y = 0; c.setFace('happy'); }
          if (t >= 15 && t < 20.5) { c.setFace('happy'); }
          if (t >= 20.5 && t < 25.5) { c.setFace('shades'); c.armR.rotation.x = -2.2 + Math.sin(t * 16 + i) * 0.35; c.armR.rotation.z = -0.4; }
        });
        reset(BOSS);
        BOSS.setFace(t >= 20.5 ? 'happy' : 'normal');
        if (t >= 9.5 && t < 15) { BOSS.root.position.set(-2.4, 0, -5.0); BOSS.root.rotation.y = Math.PI; }
        if (t >= 20.5) { BOSS.root.position.set(5.0, 0, -4.6); BOSS.root.rotation.y = Math.PI; BOSS.armR.rotation.x = -1.6; }
      };
      const cam = (p0, p1, q0, q1, fov, dur) => (lt, t) => { const c = camPath(p0, p1, q0, q1, fov, dur)(lt); const d = depth(t); return { pos: [c.pos[0], c.pos[1] - d, c.pos[2]], target: [c.target[0], c.target[1] - d, c.target[2]], fov }; };
      scenes.push({ id: 'office', start: 0, end: 4.5, scene: S, update, cam: cam([6.0, 5.4, 11.6], [5.4, 5.0, 10.8], [0, 1.6, -2.6], [0, 1.6, -2.6], 42, 4.5) });
      scenes.push({ id: 'office', start: 4.5, end: 9.5, scene: S, update, cam: cam([5.0, 4.4, 10.0], [4.4, 4.0, 9.2], [-0.4, 2.0, -4.0], [-0.4, 2.0, -4.0], 44, 5), shake: (lt) => (lt > 0.3 && lt < 1.8 ? 0.06 : 0) });
      scenes.push({ id: 'office', start: 9.5, end: 15, scene: S, update, cam: cam([2.0, 3.6, 6.8], [1.6, 3.4, 6.0], [-3.0, 2.4, -6.0], [-3.0, 2.4, -6.0], 44, 5.5), shake: (lt) => (lt > 0.1 && lt < 1.2 ? 0.06 : 0) });
      scenes.push({ id: 'office', start: 15, end: 20.5, scene: S, update, cam: cam([3.6, 3.4, 6.4], [3.0, 3.2, 5.6], [-1.0, 2.6, -6.0], [-1.0, 2.6, -6.0], 44, 5.5), shake: (lt) => (lt > 0.1 && lt < 1.0 ? 0.06 : 0) });
      scenes.push({ id: 'office', start: 20.5, end: 25.5, scene: S, update, cam: cam([5.6, 4.6, 10.4], [5.0, 4.2, 9.6], [0, 2.0, -3.2], [0, 2.0, -3.2], 44, 5), shake: (lt) => (lt > 0.1 && lt < 1.1 ? 0.06 : 0) });
    }

    /* ===== 通勤：地上から長いはしご ===== */
    let A2;
    {
      const S = newScene({ sky: ['#2a2f45', '#3a3346'], amb: 0.55, sunI: 0.35 });
      const shaft = new Blocks();
      for (let y = -60; y <= 0; y++) for (let x = -2; x <= 2; x++) { if (Math.abs(x) === 2) { shaft.set('foundation', x, y, -1); shaft.set('foundation', x, y, 1); } shaft.set(y > -14 ? 'facade' : 'foundation', x, y, -2); }
      shaft.build(S, {}, { cast: false });
      const ladder = group(S, [0, 0, -1.4]);
      [-0.35, 0.35].forEach((x) => box(ladder, [0.08, 62, 0.08], [x, -30, 0], solid('#c49a5a')));
      for (let y = 0; y > -60; y -= 0.5) box(ladder, [0.7, 0.06, 0.08], [0, y, 0], solid('#c49a5a'), { cast: false });
      const lamps = [-5, -15, -25, -35, -45, -55].map((y) => box(S, [0.3, 0.2, 0.2], [1.6, y, -1.8], new T.MeshBasicMaterial({ color: '#ffe9a8' }), { cast: false }));
      A2 = addChar(S, CAST.A, [0, 0, -1.1], Math.PI);
      const hat = group(A2.head, [0, 0.66, 0]); box(hat, [0.74, 0.2, 0.74], [0, 0, 0], solid('#f2c230'));
      scenes.push({
        id: 'shaft', start: 25.5, end: 30.01, scene: S,
        cam: (lt) => { const y = lerp(-2, -40, ease.inOut(prog(lt, 0.2, 4.4))); return { pos: [3.4, y + 1.4, 6.4], target: [0, y + 0.6, -1.2], fov: 44 }; },
        update(lt, t) {
          P.followLight(S, 0, lerp(-2, -40, ease.inOut(prog(lt, 0.2, 4.4))), 0);
          reset(A2);
          A2.root.position.set(0, lerp(-1.2, -39.6, ease.inOut(prog(lt, 0.2, 4.4))), -1.1);
          A2.armL.rotation.x = -2.8 + Math.sin(t * 10) * 0.3; A2.armR.rotation.x = -2.8 - Math.sin(t * 10) * 0.3;
          A2.legL.rotation.x = Math.sin(t * 10) * 0.4; A2.legR.rotation.x = -Math.sin(t * 10) * 0.4;
          A2.setFace('sleepy');
        },
      });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもオフィスが、毎日どんどん沈んでいったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の1階', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: 'オフィスの場所', value: (t) => Math.round(floors(t)), format: (n) => (n === 0 ? '1階' : `地下${n}階`), done: (t) => t >= 21.6 && t < 25.5 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '毎朝、', at: 4.65, cps: 16 },
        { text: '地面にめりこんでいく', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 4.9, t1: 6.4, text: 'ズズズズ', x: 900, y: 300, rot: -6, size: 54, shake: true },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '木曜には、', at: 9.65, cps: 16 },
        { text: '窓から恐竜の化石', at: 10.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 11.8, t1: 14.8, text: '地下6階、景色がいいね', scene: 'office', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '金曜には、', at: 15.15, cps: 16 },
        { text: '窓の外を魚が泳ぐ', at: 16.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '翌週には、', at: 20.65, cps: 16 },
        { text: 'マグマで暖房いらず', at: 21.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: 22.6, t1: CUTS[4], text: '室温 41℃' },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも出社は、9時のまま。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '通勤：はしごで2時間', at: 27.3, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #20　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const rumble = (t, d) => [AUDIO.noise(t, d, { filter: 'lowpass', freq: 200, gain: 0.2, long: true, fade: 0.3 })];
    const audio = AUDIO.music({ prog: ['C', 'Am', 'F', 'G', 'Am', 'Em', 'F', 'G', 'Dm', 'Am', 'Em', 'Am', 'Dm', 'Am', 'F', 'C'], arp: [8, 9, 12] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    [[4.8, 1.4], [9.6, 1.0], [15.1, 0.9], [20.6, 1.0]].forEach(([t, d]) => add(rumble(t, d)));
    add(S_.waves(15.2, 5.2));
    for (let t = 25.7; t < 29.8; t += 0.25) add(S_.step(t));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
