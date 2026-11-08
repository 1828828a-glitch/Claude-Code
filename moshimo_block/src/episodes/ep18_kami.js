/* ep18 — もしも残業した時間だけ、髪が伸びたら（30秒） */
EPISODES.push({
  id: 'ep18',
  no: 18,
  short: '残業で伸びる髪',
  title: 'もしも残業した時間だけ、髪が伸びたら',
  lead: '残業1時間で髪が1ブロック。木曜にはオフィスの床が髪だらけになり、金曜には窓から地面まで届く。週末の床屋は5時間がかり。',
  duration: 30,
  poster: 12.6,
  chapters: [
    { t: 0, name: '月曜' }, { t: 4.5, name: '火・水' }, { t: 9.5, name: '木曜' },
    { t: 15, name: '金曜' }, { t: 20.5, name: '床屋' }, { t: 25.5, name: '給料日' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const HAIR = '#2a211b', SEG = 0.3;
    const LEN = [[0, 0], [2.6, 1], [4.6, 2], [9.0, 22], [10.0, 22], [12.0, 60], [15.0, 60], [16.0, 75], [21.6, 75], [23.6, 0]];
    const len = (t) => {
      for (let i = LEN.length - 1; i >= 0; i--) if (t >= LEN[i][0]) { const nx = LEN[i + 1]; return nx ? lerp(LEN[i][1], nx[1], ease.inOut(prog(t, LEN[i][0], nx[0]))) : LEN[i][1]; }
      return 0;
    };
    const hairMat = new T.MeshLambertMaterial({ color: HAIR });

    /* ===== オフィス ===== */
    let A, BOSS, staff, slip;
    const SEAT = [-3, 0, -3.55];
    {
      const S = newScene({ sky: SKY_DAY });
      const winMat = blockMat('window').clone();
      P.officeRoom(S, { overrides: { window: winMat } });
      const { dir, hemi } = S.userData;
      const clock = P.wallClock(S, [1.6, 3.3, -5.9], 0.9);
      const desks = [[-3, -2.6, CAST.A], [0.6, -2.6, CAST.M1], [4.2, -2.6, CAST.M2], [-1.2, 1.0, CAST.M3], [2.4, 1.0, CAST.NEW]];
      staff = desks.map(([x, z, look]) => workstation(S, x, z, look));
      A = staff[0];
      BOSS = addChar(S, CAST.BOSS, [7.4, 0, 1.6], -1.0);
      slip = group(A.armR, [0.1, -0.66, 0.16]);
      box(slip, [0.8, 0.5, 0.02], [0, 0, 0], faces(solid('#ffffff'), { front: P.glow(textTex('残業代　0円', { w: 256, h: 128, size: 52, bg: '#ffffff', fg: '#d24b4b' })) }));
      const r = mulberry32(1818);
      const floorPath = [];
      let x = SEAT[0], z = SEAT[2] - 0.4, dx = 0.2, dz = -1;
      for (let i = 0; i < 260; i++) {
        const a = Math.atan2(dz, dx) + (r() - 0.5) * 0.9;
        dx = Math.cos(a); dz = Math.sin(a);
        let nx = x + dx * SEG, nz = z + dz * SEG;
        if (nx < -9.5 || nx > 8.5) { dx = -dx; nx = x + dx * SEG; }
        if (nz < -5.8 || nz > 2.8) { dz = -dz; nz = z + dz * SEG; }
        x = nx; z = nz; floorPath.push([x, 0.15, z]);
      }
      const N = 270, hair = new T.InstancedMesh(new T.BoxGeometry(0.34, 0.3, 0.34), hairMat, N);
      hair.castShadow = true; S.add(hair);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      const DAY = SKY_DAY, NIGHT = ['#121a3a', '#36406e'];
      const update = (lt, t) => {
        const cyc = t >= 4.5 && t < 9.5 ? (Math.sin((t - 4.5) * 2.5) + 1) / 2 : t >= 1.6 && t < 4.5 ? prog(t, 1.6, 2.6) : t >= 9.5 && t < 15 ? 0.85 : 0;
        repaintGradient(S.background, mixHex(DAY[0], NIGHT[0], cyc), mixHex(DAY[1], NIGHT[1], cyc));
        winMat.color.set(mixHex('#ffffff', '#3a4570', cyc));
        hemi.intensity = lerp(0.72, 0.42, cyc); dir.intensity = lerp(0.55, 0.2, cyc);
        clock.set(t < 4.5 ? 17 + t * 0.6 : t < 9.5 ? 17 + (t - 4.5) * 4 : t < 15 ? 23 : 9);
        const n = Math.floor(len(t) / SEG * 1.0);
        const back = A.head.localToWorld(V3(0, 0.1, -0.36));
        for (let i = 0; i < N; i++) {
          let p;
          if (i < 4) p = [back.x, back.y - i * 0.3, back.z - 0.05 * i];
          else p = floorPath[i - 4] || floorPath[floorPath.length - 1];
          ps.set(p[0], p[1], p[2]); sc.setScalar(i < n && t < 25.5 ? 1 : 0.0001);
          m4.compose(ps, q, sc); hair.setMatrixAt(i, m4);
        }
        hair.instanceMatrix.needsUpdate = true;
        staff.forEach((c, i) => {
          working(c, t, i, 14);
          if (i > 0 && cyc > 0.5 && t < 15) c.root.visible = false; else c.root.visible = true;
          if (i === 0) { c.setFace(t >= 4.5 && t < 15 ? 'sleepy' : 'normal'); }
          if (i > 0 && t >= 9.5 && t < 15) { c.setFace('shock'); c.head.rotation.x = 0.3; }
        });
        if (t >= 9.5 && t < 15) staff.forEach((c, i) => { c.root.visible = true; });
        slip.visible = t >= 25.5;
        if (t >= 25.5) { A.armR.rotation.x = -2.1; A.armL.rotation.x = -1.3; slip.rotation.set(2.0, 0, 0); A.setFace(t > 26.6 ? 'sleepy' : 'normal'); }
        reset(BOSS);
        BOSS.root.visible = (t < 1.6) || (t >= 9.5 && t < 15) || t >= 25.5;
        if (t < 1.6) { const u = prog(t, 0.2, 1.6); BOSS.root.position.set(lerp(5.0, 9.5, u), 0, 1.6); BOSS.root.rotation.y = Math.PI / 2; walk(BOSS, t * 12, 0.45); BOSS.setFace('happy'); }
        if (t >= 9.5 && t < 15) { BOSS.root.position.set(1.2, 0, -0.4); BOSS.root.rotation.y = -1.6; BOSS.setFace('shock'); }
        if (t >= 25.5) { BOSS.root.position.set(-0.8, 0, -1.2); BOSS.root.rotation.y = -2.2; BOSS.setFace('happy'); }
      };
      const cams = [
        [0, 4.5, camPath([1.4, 3.4, 4.6], [1.0, 3.2, 3.8], [-3.2, 1.3, -3.6], [-3.2, 1.3, -3.8], 40, 4.5)],
        [4.5, 9.5, camPath([3.6, 4.4, 6.4], [3.0, 4.2, 5.6], [-3.0, 0.8, -3.8], [-2.6, 0.8, -3.6], 42, 5)],
        [9.5, 15, camPath([6.4, 6.4, 11.4], [5.8, 6.0, 10.6], [-0.4, 0.4, -1.6], [-0.4, 0.4, -1.6], 44, 5.5)],
        [25.5, 30.01, camPath([-6.2, 3.0, 1.4], [-6.0, 2.8, 0.6], [-3.0, 1.5, -3.5], [-3.0, 1.6, -3.5], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    /* ===== 金曜：窓から地面まで ===== */
    let climber, rapA;
    {
      const S = newScene({ sky: ['#ffae7a', '#ffe2b8'], sunColor: '#ffd8b0', sunI: 0.55, amb: 0.72 });
      streetSet(S, { windows: [[1, 8], [-6, 4], [6, 4], [-6, 8], [6, 8]], sign: 'ブロック町IT', height: 13 });
      rapA = addChar(S, CAST.A, [2.0, 7.6, -4.5]);
      const N = 70, hair = new T.InstancedMesh(new T.BoxGeometry(0.34, 0.3, 0.34), hairMat, N);
      S.add(hair);
      const pts = [];
      for (let i = 0; i < 4; i++) pts.push([2.0, 9.2, -4.3 + i * 0.3]);
      for (let y = 9.0; y > 0.2; y -= 0.3) pts.push([2.0 + Math.sin(y * 0.7) * 0.1, y, -2.85]);
      for (let i = 0; i < 20; i++) pts.push([2.0 + i * 0.3, 0.15, -2.6 + Math.sin(i) * 0.2]);
      climber = addChar(S, CAST.M1, [2.0, 0, -2.4]);
      const coffee = group(climber.armL, [0, -0.66, 0.1]); box(coffee, [0.18, 0.24, 0.18], [0, 0, 0], solid('#f4f1ea'));
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      scenes.push({
        id: 'street', start: 15, end: 20.5, scene: S,
        cam: camPath([8.4, 4.2, 12.0], [7.6, 6.0, 11.0], [2.0, 3.4, -2.6], [2.0, 5.4, -2.8], 42, 5.5),
        update(lt, t) {
          const n = Math.floor(lerp(4, N, ease.out(prog(t, 15.2, 16.6))));
          pts.forEach((p, i) => { if (i >= N) return; ps.set(p[0], p[1], p[2]); sc.setScalar(i < n ? 1 : 0.0001); m4.compose(ps, q, sc); hair.setMatrixAt(i, m4); });
          hair.instanceMatrix.needsUpdate = true;
          reset(rapA); rapA.setFace('sleepy'); rapA.head.rotation.x = 0.3;
          reset(climber);
          const u = ease.inOut(prog(t, 16.8, 20.2));
          climber.root.position.set(2.0, lerp(0, 7.0, u), -2.4);
          climber.root.rotation.y = Math.PI;
          if (u > 0 && u < 1) { climber.armR.rotation.x = -3.0 + Math.sin(t * 9) * 0.3; climber.armL.rotation.x = -2.6; climber.legL.rotation.x = Math.sin(t * 9) * 0.5; climber.legR.rotation.x = -Math.sin(t * 9) * 0.5; }
          climber.setFace('happy');
        },
      });
    }

    /* ===== 床屋 ===== */
    let barberA;
    {
      const S = newScene({ sky: ['#9fd3ef', '#e8f5fb'] });
      P.officeRoom(S, { floor: 'plank', windows: [[2, 2], [3, 2], [2, 3], [3, 3]] });
      box(S, [3.4, 2.0, 0.06], [-2.0, 2.2, -5.95], new T.MeshBasicMaterial({ color: '#cfe8f5' }));
      const pole = group(S, [2.6, 0, -5.4]);
      box(pole, [0.3, 1.8, 0.3], [0, 0.9, 0], faces(solid('#ffffff'), {}));
      [0, 1, 2].forEach((i) => box(pole, [0.32, 0.18, 0.32], [0, 0.4 + i * 0.5, 0], solid(i % 2 ? '#2f62d6' : '#d24b4b')));
      const chairG = group(S, [-2.0, 0, -3.6]);
      box(chairG, [1.0, 0.5, 1.0], [0, 0.25, 0], solid('#2b3140'));
      box(chairG, [1.0, 0.16, 1.0], [0, 0.58, 0], solid('#d24b4b'));
      box(chairG, [1.0, 1.0, 0.16], [0, 1.1, -0.45], solid('#d24b4b'));
      barberA = addChar(S, CAST.A, [-2.0, 0.16, -3.55]);
      const barber = addChar(S, { suit: '#f4f1ea', tie: '#2fa59b', hair: '#5b3b25', shirt: '#ffffff' }, [-0.8, 0, -4.3], -Math.PI / 2 - 0.4);
      const scissors = group(barber.armR, [0, -0.66, 0.1]); box(scissors, [0.06, 0.06, 0.4], [0, 0, 0.1], solid('#9aa3ad'));
      const cape = box(S, [1.3, 0.9, 0.9], [-2.0, 0.9, -3.4], solid('#ffffff'), { cast: false });
      const r = mulberry32(1819);
      const M = 160, pile = new T.InstancedMesh(new T.BoxGeometry(0.34, 0.3, 0.34), hairMat, M);
      const pp = Array.from({ length: M }, () => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 3.2; return [-2.0 + Math.cos(a) * d, 0.15 + (1 - d / 3.4) * 1.6 * r(), -2.6 + Math.sin(a) * d * 0.7]; });
      S.add(pile);
      const longHair = new T.InstancedMesh(new T.BoxGeometry(0.34, 0.3, 0.34), hairMat, 30);
      S.add(longHair);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      scenes.push({
        id: 'barber', start: 20.5, end: 25.5, scene: S,
        cam: camPath([2.6, 3.0, 4.6], [2.2, 2.8, 3.8], [-1.6, 1.1, -3.0], [-1.6, 1.1, -3.0], 42, 5),
        update(lt, t) {
          const cut = prog(t, 21.6, 23.6);
          pp.forEach((p, i) => { ps.set(p[0], p[1] * Math.min(1, cut * 1.2), p[2]); sc.setScalar(i < cut * M ? 1 : 0.0001); m4.compose(ps, q, sc); pile.setMatrixAt(i, m4); });
          pile.instanceMatrix.needsUpdate = true;
          const left = Math.floor((1 - cut) * 30);
          for (let i = 0; i < 30; i++) { ps.set(-2.0 + (i > 10 ? (i - 10) * 0.3 : 0), i > 10 ? 0.15 : 1.6 - i * 0.14, -3.9 - (i > 10 ? 0 : 0)); sc.setScalar(i < left ? 1 : 0.0001); m4.compose(ps, q, sc); longHair.setMatrixAt(i, m4); }
          longHair.instanceMatrix.needsUpdate = true;
          reset(barberA); sit(barberA); barberA.setFace(t > 23.6 ? 'happy' : 'sleepy');
          reset(barber); barber.armR.rotation.x = -1.6 + Math.sin(t * 14) * 0.2; barber.armL.rotation.x = -1.2; barber.setFace('happy');
          if (t > 23.6) barber.root.rotation.y = -0.6;
        },
      });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも残業した時間だけ、髪が伸びたら', cls: 'title' },
        { text: 'ブロック町のIT企業、月曜の夜', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '社員Aの髪の長さ', value: (t) => Math.round(len(t) * 10) / 10, format: (v) => `${v.toFixed(1)}ブロック`, done: (t) => t >= 16 && t < 21.6 },
      { type: 'fx', t0: 2.6, t1: 3.4, text: 'ファサッ', x: 520, y: 300, rot: -6, size: 46 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '残業するほど、', at: 4.65, cps: 18 },
        { text: '髪が伸びる', at: 5.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: 5.5, t1: 7.4, text: '火曜 23:00' },
      { type: 'tag', t0: 7.4, t1: CUTS[1], text: '水曜 25:00' },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '木曜には、', at: 9.65, cps: 16 },
        { text: 'オフィスの床が髪だらけ', at: 10.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 12.4, t1: 14.9, text: 'Aくん、髪切ったら？', scene: 'office', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '金曜には、', at: 15.15, cps: 16 },
        { text: '窓から地面まで届く', at: 15.9, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 17.2, t1: 20.3, text: 'Aさん、コーヒーです', scene: 'street', anchor: headTop(climber) },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '週末の床屋は、', at: 20.65, cps: 18 },
        { text: '5時間がかり', at: 21.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.6, t1: 23.6, text: 'チョキチョキ', x: 860, y: 260, rot: -6, size: 52, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも残業代は、出ない。', at: 26.4, cps: 14, cls: 'mark-soft' },
        { text: '残業が髪に出る会社', at: 27.8, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.6, t1: 30.1, text: 'もしもブロック劇場 #18　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const snip = (t) => [AUDIO.tone(t, 2400, 0.04, { gain: 0.04 }), AUDIO.noise(t, 0.05, { filter: 'highpass', freq: 4000, gain: 0.05, decay: true })];
    const audio = AUDIO.music({ prog: ['Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'Em', 'F', 'G', 'C', 'Am', 'F', 'G', 'F', 'C'], arp: [2, 3, 4] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    add(S_.grow(2.6));
    for (let t = 4.8; t < 9.4; t += 0.8) add(S_.tick(t, 1));
    add(S_.grow(10.2)); add(S_.grow(15.2));
    for (let t = 21.6; t < 23.6; t += 0.12) add(snip(t));
    add(S_.jingle(23.7));
    add(S_.error(26.6));
    add(S_.pop(28.6, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
