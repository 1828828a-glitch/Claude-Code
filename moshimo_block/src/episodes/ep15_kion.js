/* ep15 — もしもオフィスの気温が、部長の機嫌で変わったら（30秒） */
EPISODES.push({
  id: 'ep15',
  no: 15,
  short: '部長の機嫌と気温',
  title: 'もしもオフィスの気温が、部長の機嫌で変わったら',
  lead: '部長がごきげんなら南国、ふきげんなら氷点下。差し入れひとつで春が来て、晩ごはんがカレーだと聞けば砂漠になる。',
  duration: 30,
  poster: 7.6,
  chapters: [
    { t: 0, name: '朝' }, { t: 4.5, name: '南国' }, { t: 9.5, name: '氷点下' },
    { t: 15, name: '差し入れ' }, { t: 20.5, name: '砂漠' }, { t: 25.5, name: '給料日' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const KEYS = [[0, 22], [3.0, 25], [5.2, 38], [10.4, 22], [11.0, -15], [16.6, -15], [17.6, 22], [21.6, 22], [22.4, 50], [25.5, 22]];
    const temp = (t) => {
      for (let i = KEYS.length - 1; i >= 0; i--) {
        if (t >= KEYS[i][0]) { const nx = KEYS[i + 1]; return nx ? lerp(KEYS[i][1], nx[1], ease.inOut(prog(t, KEYS[i][0], nx[0]))) : KEYS[i][1]; }
      }
      return 22;
    };
    const hot = (t) => clamp((temp(t) - 26) / 20, 0, 1), cold = (t) => clamp((10 - temp(t)) / 20, 0, 1);
    const desert = (t) => (t >= 20.5 && t < 25.5 ? hot(t) : 0), tropic = (t) => (t < 9.5 ? hot(t) : 0);
    const ICE = 11.0, SNACK = 16.6, CALL = 21.6;

    let A, BOSS, staff;
    {
      const S = newScene({ sky: SKY_DAY });
      const winMat = blockMat('window').clone();
      P.officeRoom(S, { overrides: { window: winMat } });
      const { dir, hemi } = S.userData;
      const seats = [[-4, -2.6, CAST.A], [-0.5, -2.6, CAST.M1], [3, -2.6, CAST.M2], [-2.2, 0.8, CAST.M3], [1.2, 0.8, CAST.NEW]];
      staff = seats.map(([x, z, look]) => workstation(S, x, z, look));
      A = staff[0];
      const BD = [6.2, 0.9];
      const bd = group(S, [BD[0], 0, BD[1]]);
      P.desk(bd, 0, 0, { top: '#8b5e34', panelColor: '#6b4a2b' });
      box(bd, [1.0, 0.3, 0.04], [0, 0.5, 0.51], faces(solid('#f2c230'), { front: P.glow(textTex('部長', { w: 128, h: 64, size: 40 })) }));
      P.chair(S, BD[0], BD[1] - 0.95);
      BOSS = addChar(S, CAST.BOSS, [BD[0], 0, BD[1] - 0.95]);
      const phone = group(BOSS.armR, [0, -0.66, 0.12]); box(phone, [0.12, 0.3, 0.06], [0, 0, 0], solid('#1d2333'));
      const report = group(BOSS.armL, [0, -0.66, 0.16]); box(report, [0.5, 0.36, 0.02], [0, 0, 0], faces(solid('#ffffff'), { front: P.glow(textTex('売上↑', { w: 128, h: 64, size: 40, bg: '#ffffff', fg: '#d24b4b' })) }));
      const snack = group(A.armR, [0, -0.66, 0.16]); box(snack, [0.4, 0.2, 0.3], [0, 0, 0], solid('#6b3e1f')); box(snack, [0.42, 0.06, 0.32], [0, 0.04, 0], solid('#f2c230'));
      const slip = group(A.armR, [0.1, -0.66, 0.16]); box(slip, [0.6, 0.4, 0.02], [0, 0, 0], faces(solid('#ffffff'), { front: P.glow(textTex('給料明細', { w: 128, h: 64, size: 30, bg: '#ffffff', fg: '#1d2333' })) }));
      /* 床の上にのせる砂と氷 */
      const sand = new T.Mesh(new T.BoxGeometry(19.8, 0.06, 9.8), blockMat('sand').clone()); sand.position.set(-0.5, 0.03, -1.1); S.add(sand);
      sand.material.map = sand.material.map.clone(); sand.material.map.wrapS = sand.material.map.wrapT = T.RepeatWrapping; sand.material.map.repeat.set(20, 10); sand.material.map.needsUpdate = true;
      const ice = new T.Mesh(new T.BoxGeometry(19.8, 0.08, 9.8), new T.MeshLambertMaterial({ color: '#cfeeff', transparent: true, opacity: 0.75, emissive: '#3a6a8a' })); ice.position.set(-0.5, 0.04, -1.1); S.add(ice);
      const r = mulberry32(1515);
      const palm = (x, z, desertKind) => {
        const g = group(S, [x, 0, z]);
        if (desertKind) {
          const c = solid('#3f9b4b');
          box(g, [0.4, 1.8, 0.4], [0, 0.9, 0], c); box(g, [0.6, 0.25, 0.25], [0.35, 1.0, 0], c); box(g, [0.25, 0.6, 0.25], [0.6, 1.3, 0], c); box(g, [0.6, 0.25, 0.25], [-0.35, 1.3, 0], c); box(g, [0.25, 0.5, 0.25], [-0.6, 1.6, 0], c);
        } else {
          for (let i = 0; i < 6; i++) box(g, [0.3, 0.5, 0.3], [i * 0.06, 0.25 + i * 0.5, 0], solid(i % 2 ? '#8b5e34' : '#7a5232'));
          [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]].forEach(([dx, dz]) => box(g, [Math.abs(dx) > 0.5 ? 1.4 : 0.4, 0.14, Math.abs(dz) > 0.5 ? 1.4 : 0.4], [0.36 + dx * 0.7, 3.1 - 0.2, dz * 0.7], solid('#3f9b4b'), { rot: [dz * 0.3, 0, -dx * 0.3] }));
        }
        return g;
      };
      const palms = [[-8.4, -4.8], [8.2, -4.6], [-7.6, 2.2], [4.8, -4.8]].map(([x, z]) => palm(x, z, false));
      const cacti = [[-8.0, -4.6], [8.0, -4.2], [-7.2, 2.2], [0.8, -4.9]].map(([x, z]) => palm(x, z, true));
      const icicles = seats.map(([x, z]) => { const g = group(S, [x, 0.77, z + 0.45]); for (let i = 0; i < 6; i++) box(g, [0.08, 0.3 + (i % 3) * 0.1, 0.08], [-0.75 + i * 0.3, -0.18, 0], solid('#e9f7ff', { emissive: '#5a7a9a' }), { cast: false }); return g; });
      const iceMat = new T.MeshLambertMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.45, emissive: '#2a5a7a' });
      const cubes = staff.map(() => { const m = new T.Mesh(new T.BoxGeometry(1.1, 2.0, 1.1), iceMat); S.add(m); return m; });
      const flowers = Array.from({ length: 30 }, (_, i) => { const g = group(S, [-9 + r() * 17, 0, -5.5 + r() * 8]); box(g, [0.06, 0.4, 0.06], [0, 0.2, 0], solid('#3f9b4b')); box(g, [0.22, 0.22, 0.22], [0, 0.45, 0], solid(['#ff8fb3', '#ffd23a', '#ffffff', '#d24b4b'][i % 4])); return g; });
      const sun = new T.Mesh(new T.BoxGeometry(3, 3, 0.4), new T.MeshBasicMaterial({ color: '#ffd84a' })); sun.position.set(4, 9, -14); S.add(sun);
      const chill = Array.from({ length: 10 }, () => box(S, [0.1, 0.1, 0.1], [0, -99, 0], new T.MeshBasicMaterial({ color: '#ffffff' }), { cast: false }));
      const update = (lt, t) => {
        const h = hot(t), c = cold(t), d = desert(t), tr = tropic(t);
        const skyTop = c > 0 ? mixHex(SKY_DAY[0], '#9fb6d6', c) : mixHex(SKY_DAY[0], d > 0 ? '#ffb347' : '#3fc2ff', h);
        const skyBot = c > 0 ? mixHex(SKY_DAY[1], '#eef6ff', c) : mixHex(SKY_DAY[1], d > 0 ? '#ffe7a6' : '#c9f3ff', h);
        repaintGradient(S.background, skyTop, skyBot);
        winMat.color.set(c > 0 ? mixHex('#ffffff', '#e8f6ff', c) : mixHex('#ffffff', '#ffe2a0', h));
        dir.color.set(c > 0 ? mixHex('#ffffff', '#cfe4ff', c) : mixHex('#ffffff', '#ffd27a', h));
        dir.intensity = 0.55 + h * 0.35; hemi.intensity = 0.72 + h * 0.1;
        sand.visible = d > 0.05; ice.visible = c > 0.05; ice.material.opacity = 0.75 * c;
        palms.forEach((p, i) => { p.visible = tr > 0.05; p.scale.setScalar(Math.max(0.01, ease.back(clamp(tr * 1.6 - i * 0.1, 0, 1)))); });
        cacti.forEach((p, i) => { p.visible = d > 0.05; p.scale.setScalar(Math.max(0.01, ease.back(clamp(d * 1.6 - i * 0.1, 0, 1)))); });
        sun.visible = h > 0.3;
        icicles.forEach((g) => { g.visible = c > 0.05; g.scale.y = Math.max(0.01, c); });
        flowers.forEach((f, i) => { f.visible = t >= 17.6 && t < 20.5; f.scale.setScalar(popScale(t, 17.6 + i * 0.03, 0.3)); });
        staff.forEach((s, i) => {
          working(s, t, i, 14);
          const frozen = t >= ICE + 0.2 && t < 17.6;
          cubes[i].visible = frozen;
          cubes[i].position.set(s.root.position.x, 1.0, s.root.position.z);
          cubes[i].scale.setScalar(popScale(t, ICE + 0.2 + i * 0.06, 0.2));
          if (frozen) { reset(s); sit(s); s.setFace('shock'); s.armL.rotation.x = s.armR.rotation.x = -1.0; }
          if (tr > 0.5) { s.setFace('shades'); s.armR.rotation.x = -2.2 + Math.sin(t * 16 + i) * 0.4; s.armR.rotation.z = -0.4; }
          if (d > 0.4) { s.setFace('sleepy'); s.root.scale.set(1.1, 1 - d * 0.35, 1.1); s.head.rotation.x = 0.4; }
          if (t >= 17.6 && t < 20.5) s.setFace('happy');
        });
        reset(BOSS); sit(BOSS);
        phone.visible = t >= CALL - 0.3 && t < 25.5;
        report.visible = t >= 4.6 && t < 9.5;
        BOSS.armL.rotation.x = BOSS.armR.rotation.x = -1.0;
        if (t < 4.5) { BOSS.setFace('happy'); BOSS.head.rotation.z = Math.sin(t * 4) * 0.06; }
        else if (t < 9.5) { BOSS.setFace('happy'); BOSS.armL.rotation.x = -1.5; banzai(BOSS, t > 5.2 ? 0.5 : 0); }
        else if (t < SNACK) { BOSS.setFace(t > 10.4 ? 'angry' : 'normal'); if (t > 10.4) { BOSS.armL.rotation.z = -0.4; BOSS.armR.rotation.z = 0.4; BOSS.body.rotation.z = Math.sin(t * 30) * 0.02; } }
        else if (t < 20.5) { BOSS.setFace('happy'); BOSS.armR.rotation.x = -2.2; }
        else if (t < 25.5) { BOSS.setFace(t > CALL + 0.6 ? 'happy' : 'normal'); if (t > CALL - 0.3) { BOSS.armR.rotation.x = -2.6; BOSS.armR.rotation.z = -0.5; } if (t > CALL + 0.8) BOSS.armL.rotation.z = -2.4; }
        else { BOSS.setFace('normal'); typing(BOSS, t, 10, 0.06); }
        snack.visible = t >= 15 && t < SNACK + 0.2;
        slip.visible = t >= 25.5;
        if (t >= 15 && t < 20.5) {
          reset(A);
          const u = prog(t, 15.2, SNACK - 0.2);
          A.root.position.set(lerp(-4, 5.4, u), 0, lerp(-3.55, 1.9, u)); A.root.rotation.y = u < 1 ? Math.atan2(9.4, 5.45) : -1.8;
          if (u > 0 && u < 1) walk(A, t * 14, 0.6);
          A.armR.rotation.x = -1.5; A.setFace('happy');
        }
        if (t >= 25.5) {
          reset(A); sit(A); A.armR.rotation.x = -1.4; A.armL.rotation.x = -1.2; slip.rotation.set(1.4, 0, 0);
          A.setFace(t > 26.4 ? 'shock' : 'normal'); A.body.rotation.z = t > 26.4 ? Math.sin(t * 40) * 0.03 : 0;
        }
        chill.forEach((m, i) => {
          const on = t >= 26.4;
          const u = (t * 0.8 + i / 10) % 1, a = i * 0.63;
          m.visible = on;
          m.position.set(-4 + Math.cos(a + t) * 0.8, 2.6 - u * 2.2, -3.55 + Math.sin(a + t) * 0.6);
        });
      };
      const cams = [
        [0, 4.5, camPath([10.0, 3.6, 7.4], [9.4, 3.4, 6.6], [6.0, 1.2, -0.2], [6.0, 1.3, -0.2], 40, 4.5)],
        [4.5, 9.5, camPath([5.0, 5.4, 11.0], [4.4, 5.0, 10.2], [0.4, 1.6, -1.8], [0.4, 1.7, -1.8], 42, 5)],
        [9.5, 15, camPath([4.6, 4.8, 9.4], [4.0, 4.4, 8.6], [0.8, 1.2, -1.2], [0.8, 1.3, -1.2], 42, 5.5)],
        [15, 20.5, camPath([6.0, 4.4, 10.0], [5.4, 4.0, 9.2], [1.6, 1.2, -0.6], [1.6, 1.3, -0.6], 42, 5.5)],
        [20.5, 25.5, camPath([5.0, 5.4, 11.0], [4.4, 5.0, 10.2], [0.8, 1.4, -1.2], [0.8, 1.5, -1.2], 42, 5)],
        [25.5, 30.01, camPath([-6.6, 3.2, 1.2], [-6.4, 3.0, 0.4], [-4.0, 1.5, -3.4], [-4.0, 1.6, -3.4], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもオフィスの気温が、部長の機嫌で変わったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: 'オフィスの気温', value: (t) => Math.round(t >= 26.4 ? -5 : temp(t)), format: (n) => `${n}℃`, done: (t) => temp(t) >= 45 || temp(t) <= -10 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '部長がごきげんだと、', at: 4.65, cps: 18 },
        { text: 'オフィスが南国になる', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: 'ゴルフの結果を見た部長は、', at: 9.65, cps: 18 },
        { text: '全員をこおらせる', at: ICE + 0.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: ICE + 0.2, t1: ICE + 1.2, text: 'カチーン', x: 640, y: 220, rot: -5, size: 62, shake: true },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '社員Aの差し入れで、', at: 15.15, cps: 18 },
        { text: '春が来る', at: 17.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: SNACK - 0.2, t1: 17.6, text: '部長、ようかんです', scene: 'office', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '晩ごはんがカレーだと聞いて、', at: 20.65, cps: 18 },
        { text: 'オフィスが砂漠になる', at: 22.5, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: CALL, t1: 22.4, text: 'え、今日カレー！？', scene: 'office', anchor: headTop(BOSS) },
      { type: 'fx', t0: 22.6, t1: 25.2, text: 'とける〜', x: 860, y: 280, rot: 6, size: 52 },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも給料明細は、いつも寒い。', at: 26.5, cps: 14, cls: 'mark-soft' },
        { text: '部長の機嫌で気温が変わる会社', at: 27.9, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.6, t1: 30.1, text: 'もしもブロック劇場 #15　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({ prog: ['C', 'F', 'G', 'C', 'F', 'G', 'C', 'C', 'Am', 'Dm', 'Em', 'Am', 'F', 'G', 'F', 'C'], arp: [3, 4, 11, 12] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    add(S_.cheer(5.2)); add(S_.waves(5.2, 4.2));
    add(S_.buzzer(10.4)); add(S_.crack(ICE + 0.2)); add(S_.smash(ICE + 0.2));
    add([AUDIO.noise(ICE, 6.4, { filter: 'bandpass', freq: 600, q: 0.8, gain: 0.05, am: 0.5, amDepth: 0.03, long: true, fade: 0.6 })]);
    add(S_.sparkle(17.6)); add(S_.jingle(17.7));
    add(S_.beep(CALL - 0.4)); add(S_.beep(CALL - 0.2)); add(S_.cheer(22.4));
    add([AUDIO.noise(26.4, 3.6, { filter: 'bandpass', freq: 900, q: 1.0, gain: 0.05, long: true, fade: 0.5 })]);
    add(S_.pop(28.6, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
