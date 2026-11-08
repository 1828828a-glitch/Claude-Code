/* ep25 — もしも「お疲れさまです」と言うと、相手の疲れが移ってきたら（30秒） */
EPISODES.push({
  id: 'ep25',
  no: 25,
  short: 'お疲れさまの疲れ',
  title: 'もしも「お疲れさまです」と言うと、相手の疲れが移ってきたら',
  lead: '疲れは紫のブロックになって頭のまわりを回る。あいさつした人に移るので、礼儀正しい社員Aはみんなの疲れを集めてしまう。定時、部長の「お疲れ」で全部が部長へ。',
  duration: 30,
  poster: 13.6,
  chapters: [
    { t: 0, name: '朝' }, { t: 4.5, name: 'あいさつ' }, { t: 9.5, name: '疲れの雲' },
    { t: 15, name: 'それでも' }, { t: 20.5, name: '部長の「お疲れ」' }, { t: 25.5, name: '翌朝' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const GREET = [5.2, 6.4, 7.6, 8.8], BOSSBYE = 21.4, MORNING = 26.6;
    const cubes = [];
    const push = (n, owner, changes) => { for (let i = 0; i < n; i++) cubes.push({ base: owner, changes: changes.map(([t, o]) => [t + i * 0.012, o]) }); };
    push(3, 0, [[BOSSBYE, 5], [MORNING, 0]]);
    [1, 2, 3, 4].forEach((m, k) => push(10, m, [[GREET[k], 0], [BOSSBYE, 5], [MORNING, 0]]));
    for (let i = 0; i < 40; i++) cubes.push({ base: -1, changes: [[10.0 + i * 0.1, 0], [BOSSBYE + i * 0.012, 5], [MORNING + i * 0.012, 0]] });
    const ownerAt = (c, t) => { let o = c.base, pt = -99, prev = c.base; c.changes.forEach(([ct, no]) => { if (t >= ct) { prev = o; o = no; pt = ct; } }); return { o, prev, pt }; };
    const aFatigue = (t) => cubes.filter((c) => { const { o, pt } = ownerAt(c, t); return o === 0 && t >= pt + 0.6; }).length;

    let A, BOSS, people;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      const seats = [[-4, -2.6, CAST.A], [0, -2.6, CAST.M1], [4, -2.6, CAST.M2], [-2, 0.9, CAST.M3], [2, 0.9, CAST.NEW]];
      const staff = seats.map(([x, z, look]) => workstation(S, x, z, look));
      A = staff[0];
      BOSS = addChar(S, CAST.BOSS, [7.0, 0, 1.6], -1.2);
      people = [...staff, BOSS];
      const phone = group(A.armR, [0, -0.66, 0.12]); box(phone, [0.12, 0.3, 0.06], [0, 0, 0], solid('#1d2333'));
      const N = cubes.length, mesh = new T.InstancedMesh(new T.BoxGeometry(0.2, 0.2, 0.2), new T.MeshBasicMaterial({ color: '#9b59ff' }), N);
      const tint = new T.Color();
      cubes.forEach((c, i) => mesh.setColorAt(i, tint.set(i % 3 ? '#8a4dff' : '#c08bff')));
      mesh.instanceColor.needsUpdate = true;
      S.add(mesh);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      const orbit = (who, k, n, t) => {
        if (who < 0) return V3(-9.5, 1.5, -6);
        const head = people[who].head.localToWorld(V3(0, 0.3, 0));
        const ring = Math.floor(k / 12), a = (k % 12) / 12 * Math.PI * 2 + t * (1.4 + ring * 0.2) + ring;
        const r = 0.55 + ring * 0.28;
        return V3(head.x + Math.cos(a) * r, head.y + 0.2 + ring * 0.22 + Math.sin(t * 2 + k) * 0.05, head.z + Math.sin(a) * r);
      };
      const update = (lt, t) => {
        const fat = aFatigue(t);
        staff.forEach((c, i) => {
          working(c, t, i, 14);
          if (i > 0) { const got = t >= GREET[i - 1] + 0.6; c.setFace(got && t < 25.5 ? 'happy' : 'sleepy'); if (Math.abs(t - GREET[i - 1]) < 0.5) c.head.rotation.y = i % 2 ? 0.8 : -0.8; }
        });
        reset(A); sit(A);
        const droop = clamp(fat / 80, 0, 1);
        typing(A, t, 14 - droop * 10, 0.1);
        A.head.rotation.x = 0.15 + droop * 0.4; A.body.rotation.x = droop * 0.25;
        A.setFace(droop > 0.15 ? 'sleepy' : 'normal');
        if (GREET.some((g) => Math.abs(t - g) < 0.4) || Math.abs(t - MORNING) < 0.4) { A.armR.rotation.z = 2.4; A.setFace('happy'); }
        phone.visible = t >= 9.8 && t < 14.2;
        if (phone.visible) { A.armR.rotation.x = -2.6; A.armR.rotation.z = -0.5; }
        if (t >= BOSSBYE + 0.8 && t < 25.5) { A.head.rotation.x = 0; A.body.rotation.x = 0; A.setFace('happy'); banzai(A, 0.9, Math.sin(t * 10) * 0.15); }
        reset(BOSS);
        if (t < 20.5) { BOSS.root.position.set(7.0, 0, 1.6); BOSS.setFace('happy'); }
        else if (t < 25.5) {
          const u = prog(t, 20.6, BOSSBYE - 0.2);
          BOSS.root.position.set(lerp(7.0, -1.8, u), 0, lerp(1.6, -1.2, u)); BOSS.root.rotation.y = u < 1 ? -1.9 : -2.2;
          if (u < 1) walk(BOSS, t * 12, 0.45);
          if (t > BOSSBYE - 0.2 && t < BOSSBYE + 0.4) BOSS.armR.rotation.z = 2.4;
          if (t > BOSSBYE + 1.2) { BOSS.root.rotation.order = 'XYZ'; BOSS.root.rotation.x = -Math.PI / 2 * ease.out(prog(t, BOSSBYE + 1.2, BOSSBYE + 1.6)); BOSS.root.position.y = 0.2 * prog(t, BOSSBYE + 1.2, BOSSBYE + 1.6); BOSS.setFace('sleepy'); }
        } else {
          const u = prog(t, 25.6, MORNING - 0.3);
          BOSS.root.position.set(lerp(9.5, -1.8, u), 0, lerp(1.6, -1.2, u)); BOSS.root.rotation.y = -1.9;
          BOSS.setFace(t > MORNING + 0.6 ? 'happy' : 'sleepy'); if (u < 1) walk(BOSS, t * 10, 0.3);
          if (t > MORNING + 0.6) banzai(BOSS, 0.6);
        }
        if (t >= 25.5 && t > MORNING + 0.8) { A.head.rotation.x = 0.55; A.body.rotation.x = 0.3; A.setFace('sleepy'); A.armR.rotation.z = 0; }
        people.forEach((p) => p.root.updateMatrixWorld(true));
        const slots = {};
        cubes.forEach((c, i) => {
          const { o, prev, pt } = ownerAt(c, t);
          const key = o; slots[key] = (slots[key] || 0) + 1;
          const k = slots[key] - 1;
          const u = prog(t, pt, pt + 0.6);
          let p = orbit(o, k, 0, t);
          if (u < 1 && pt > 0) { const p0 = orbit(prev, k, 0, t); p = V3(lerp(p0.x, p.x, ease.inOut(u)), lerp(p0.y, p.y, ease.inOut(u)) + Math.sin(u * Math.PI) * 1.0, lerp(p0.z, p.z, ease.inOut(u))); }
          const vis = o >= 0 || false;
          ps.copy(p); sc.setScalar(vis ? 1 : 0.0001);
          m4.compose(ps, q, sc); mesh.setMatrixAt(i, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      const cams = [
        [0, 4.5, camPath([3.6, 4.6, 8.6], [3.0, 4.2, 7.8], [-0.4, 1.4, -2.4], [-0.4, 1.4, -2.4], 42, 4.5)],
        [4.5, 9.5, camPath([3.0, 4.4, 7.6], [2.4, 4.0, 6.8], [-1.4, 1.4, -2.6], [-1.6, 1.4, -2.8], 42, 5)],
        [9.5, 15, camPath([-6.6, 3.6, 2.0], [-6.2, 3.4, 1.4], [-4.0, 1.8, -3.4], [-4.0, 2.0, -3.4], 42, 5.5)],
        [15, 20.5, camPath([-7.0, 3.0, 1.0], [-6.6, 2.8, 0.4], [-4.0, 1.8, -3.4], [-4.0, 1.9, -3.4], 42, 5.5)],
        [20.5, 25.5, camPath([-7.4, 3.8, 2.6], [-7.0, 3.6, 2.0], [-2.6, 1.2, -2.0], [-2.6, 1.2, -2.0], 42, 5)],
        [25.5, 30.01, camPath([-7.4, 3.8, 2.6], [-7.0, 3.6, 2.0], [-2.6, 1.3, -2.0], [-2.6, 1.4, -2.0], 42, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const greet = (t, who) => ({ type: 'bubble', t0: t - 0.3, t1: t + 0.6, text: 'お疲れさまです', cls: 'small', scene: 'office', anchor: headTop(A) });
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも「お疲れさまです」と言うと、相手の疲れが移ってきたら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '社員Aの疲れ', value: aFatigue, format: (n) => `${n}ブロック`, done: (t) => aFatigue(t) >= 80 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: 'あいさつした人に、', at: 4.65, cps: 18 },
        { text: '疲れが移ってくる', at: 5.5, cps: 16, cls: 'mark' },
      ] },
      ...GREET.map((t) => greet(t)),
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '電話でも、', at: 9.65, cps: 16 },
        { text: '「お疲れさまです」', at: 10.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 10.0, t1: 14.0, text: 'お疲れさまです、ブロック町ITです', cls: 'small', scene: 'office', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '社員Aは、', at: 15.15, cps: 16 },
        { text: '疲れの雲になった', at: 15.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '定時、部長の「お疲れ」で、', at: 20.65, cps: 18 },
        { text: 'ぜんぶ部長へ', at: BOSSBYE + 0.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: BOSSBYE - 0.4, t1: BOSSBYE + 0.6, text: 'おう、お疲れ', scene: 'office', anchor: headTop(BOSS) },
      { type: 'fx', t0: BOSSBYE + 1.3, t1: BOSSBYE + 2.2, text: 'バタン', x: 640, y: 440, rot: -6, size: 54, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも翌朝、社員Aは先にあいさつする。', at: 27.4, cps: 20, cls: 'mark-soft small' },
        { text: 'あいさつで疲れが移る会社', at: 28.7, cps: 22, cls: 'sub' },
      ] },
      { type: 'bubble', t0: MORNING - 0.4, t1: MORNING + 0.6, text: 'お疲れさまです！', scene: 'office', anchor: headTop(A) },
      { type: 'badge', t0: 29.0, t1: 30.1, text: 'もしもブロック劇場 #25　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const swoosh = (t) => [AUDIO.tone(t, 300, 0.6, { type: 'sine', f2: 150, gain: 0.06 }), AUDIO.noise(t, 0.5, { filter: 'bandpass', freq: 800, freq2: 300, q: 1.2, gain: 0.04 })];
    const audio = AUDIO.music({ prog: ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'C', 'C'], arp: [10, 11] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    GREET.forEach((t) => add(swoosh(t + 0.1)));
    for (let t = 10.0; t < 14.0; t += 0.5) add(swoosh(t));
    add(swoosh(BOSSBYE + 0.1)); add(S_.sparkle(BOSSBYE + 0.7)); add(S_.thud(BOSSBYE + 1.4, 0));
    add(swoosh(MORNING + 0.1)); add(S_.squash(MORNING + 0.8));
    add(S_.pop(29.0, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
