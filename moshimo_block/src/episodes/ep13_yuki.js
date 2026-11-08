/* ep13 — もしもメールを返さないと、机に雪が積もったら（30秒） */
EPISODES.push({
  id: 'ep13',
  no: 13,
  short: '未読メールの雪',
  title: 'もしもメールを返さないと、机に雪が積もったら',
  lead: '未読がたまると、その人の机にだけ雪が降る。部長の席は吹雪になり、社員は雪だるまを作りはじめる。定時1分前、部長は全部に返信した。',
  duration: 30,
  poster: 13.0,
  chapters: [
    { t: 0, name: '送信' }, { t: 4.5, name: '雪' }, { t: 9.5, name: '吹雪' },
    { t: 15, name: '雪だるま' }, { t: 20.5, name: '一斉返信' }, { t: 25.5, name: '春' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const BD = [4.6, -1.0], REPLY = 21.6, MELT = [21.9, 23.0];
    const mails = [];
    [[1.2, 0], [2.6, 1]].forEach(([t, s]) => mails.push({ t, s }));
    for (let i = 0; i < 10; i++) mails.push({ t: 5.0 + i * 0.4, s: i % 4 });
    for (let i = 0; i < 24; i++) mails.push({ t: 9.8 + i * 0.2, s: i % 4 });
    const unread = (t) => {
      const n = mails.filter((m) => m.t + 0.7 <= t).length;
      const base = t < 9.5 ? n : Math.round(lerp(n, 128, prog(t, 9.6, 14.6)));
      return t >= REPLY ? 0 : t >= 15 ? 128 : base;
    };
    const snowLevel = (t) => (t >= MELT[0] ? 1 - ease.in(prog(t, MELT[0], MELT[1])) : clamp((unread(t) - 2) / 80, 0, 1));

    let A, BOSS, mates;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      P.plant(S, -8.6, -5.3);
      const clock = P.wallClock(S, [0.4, 3.3, -5.9], 0.9);
      const desks = [[-4.2, -2.6, CAST.A], [-0.6, -2.6, CAST.M1], [-2.4, 0.8, CAST.M2], [1.2, 0.8, CAST.NEW]];
      const staffAll = desks.map(([x, z, look]) => workstation(S, x, z, look));
      A = staffAll[0]; mates = staffAll.slice(1);
      const bossDesk = group(S, [BD[0], 0, BD[1]]);
      P.desk(bossDesk, 0, 0, { top: '#8b5e34', panelColor: '#6b4a2b' }); P.laptop(bossDesk, 0, 0.82, -0.1);
      box(bossDesk, [1.0, 0.3, 0.04], [0, 0.5, 0.51], faces(solid('#f2c230'), { front: P.glow(textTex('部長', { w: 128, h: 64, size: 40 })) }));
      P.chair(S, BD[0], BD[1] - 0.95);
      BOSS = addChar(S, CAST.BOSS, [BD[0], 0, BD[1] - 0.95]);
      const plane = (c) => { const g = group(S); box(g, [0.5, 0.04, 0.3], [0, 0, 0], solid(c)); box(g, [0.06, 0.12, 0.3], [0, 0.06, 0], solid(c)); return g; };
      const planes = mails.map((m, i) => plane(i % 2 ? '#ffffff' : '#cfe8ff'));
      const r = mulberry32(1313);
      const MOUND = 180, mound = new T.InstancedMesh(new T.BoxGeometry(0.42, 0.42, 0.42), new T.MeshLambertMaterial({ color: '#ffffff', emissive: '#4a5566' }), MOUND);
      const mpts = Array.from({ length: MOUND }, (_, i) => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 1.6; const h = (1 - d / 1.7) * 2.6 * r(); return [BD[0] + Math.cos(a) * d * 1.2, 0.2 + h, BD[1] - 0.4 + Math.sin(a) * d * 0.9, i / MOUND]; });
      mpts.sort((a, b) => a[1] - b[1]);
      S.add(mound);
      const FL = 160, flakes = new T.InstancedMesh(new T.BoxGeometry(0.1, 0.1, 0.1), new T.MeshBasicMaterial({ color: '#ffffff' }), FL);
      const fpts = Array.from({ length: FL }, () => [(r() - 0.5) * 3.4, r() * 3.6, (r() - 0.5) * 2.6, r()]);
      S.add(flakes);
      const cloudMat = new T.MeshLambertMaterial({ color: '#c9d0da', emissive: '#4a5566' });
      const cl = group(S, [BD[0], 3.9, BD[1] - 0.4]);
      [[0, 0, 2.6, 0.6, 1.8], [-0.8, 0.3, 1.2, 0.5, 1.2], [0.7, 0.35, 1.4, 0.5, 1.2]].forEach(([x, y, w, h, d]) => box(cl, [w, h, d], [x, y, 0], cloudMat, { cast: false }));
      const snowman = group(S, [1.6, 0, 2.6]);
      const wht = solid('#ffffff', { emissive: '#4a5566' });
      const sm = [box(snowman, [1.0, 1.0, 1.0], [0, 0.5, 0], wht), box(snowman, [0.7, 0.7, 0.7], [0, 1.35, 0], wht), box(snowman, [0.08, 0.08, 0.3], [0, 1.38, 0.45], solid('#ff8a2e')), box(snowman, [0.5, 0.36, 0.5], [0, 1.88, 0], solid('#1d2333'))];
      box(snowman, [0.2, 0.06, 0.06], [-0.15, 1.2, 0.36], solid('#d24b4b'));
      const water = new T.Mesh(new T.BoxGeometry(19.6, 0.3, 9.6), new T.MeshLambertMaterial({ color: '#4f9fe8', transparent: true, opacity: 0.6 }));
      water.position.set(-0.4, 0, -1.2); S.add(water);
      const flowers = Array.from({ length: 22 }, (_, i) => { const g = group(S, [BD[0] + (r() - 0.5) * 3, 0, BD[1] - 0.4 + (r() - 0.5) * 2.4]); box(g, [0.06, 0.4, 0.06], [0, 0.2, 0], solid('#3f9b4b')); box(g, [0.2, 0.2, 0.2], [0, 0.45, 0], solid(['#ff8fb3', '#ffd23a', '#ffffff', '#d24b4b'][i % 4])); return g; });
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      const src = (s) => { const c = staffAll[s]; return c.head.localToWorld(V3(0, 0.2, 0.5)); };
      const update = (lt, t) => {
        clock.set(t < 20.5 ? 10 + t * 0.2 : 17 + Math.min(1, (58 + 2 * prog(t, 20.6, REPLY)) / 60));
        mails.forEach((m, i) => {
          const g = planes[i], u = prog(t, m.t, m.t + 0.7);
          g.visible = t >= m.t && t < m.t + 0.7;
          if (!g.visible) return;
          const a = src(m.s), b = V3(BD[0], 1.2, BD[1]);
          g.position.set(lerp(a.x, b.x, u), lerp(a.y, b.y, u) + Math.sin(u * Math.PI) * 1.2, lerp(a.z, b.z, u));
          g.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2, Math.sin(u * 8) * 0.2);
        });
        const lv = snowLevel(t);
        const visN = Math.floor(lv * MOUND);
        mpts.forEach((p, i) => {
          ps.set(p[0], Math.min(p[1], 0.2 + lv * 3), p[2]); sc.setScalar(i < visN ? 1 : 0.0001);
          m4.compose(ps, q, sc); mound.setMatrixAt(i, m4);
        });
        mound.instanceMatrix.needsUpdate = true;
        const storm = t >= 4.5 && t < MELT[0] ? (t < 9.5 ? 0.5 : 1) : 0;
        fpts.forEach((p, i) => {
          const y = 3.7 - ((t * (storm > 0.6 ? 2.6 : 1.2) + p[1]) % 3.6);
          const wind = storm > 0.6 ? Math.sin(t * 3 + p[3] * 6) * 0.8 : 0;
          ps.set(BD[0] + p[0] + wind, y, BD[1] - 0.4 + p[2]); sc.setScalar(storm && p[3] < storm ? 1 : 0.0001);
          m4.compose(ps, q, sc); flakes.setMatrixAt(i, m4);
        });
        flakes.instanceMatrix.needsUpdate = true;
        cl.visible = t >= 4.3 && t < MELT[1];
        cl.scale.setScalar((t < 9.5 ? 0.7 : 1.1) * popScale(t, 4.3, 0.3) * (t >= MELT[0] ? 1 - prog(t, MELT[0], MELT[1]) : 1) + 0.0001);
        cloudMat.color.set(t >= 9.5 ? '#9aa2b0' : '#dfe4ea');
        const smOn = t >= 15 && t < MELT[0];
        snowman.visible = t >= 15 && t < MELT[1];
        sm.forEach((m, i) => m.scale.setScalar(t < 15 ? 0.001 : popScale(t, 15.6 + i * 0.7, 0.3) * (t >= MELT[0] ? 1 - prog(t, MELT[0], MELT[1]) * 0.95 : 1)));
        const wl = t >= MELT[0] ? Math.sin(prog(t, MELT[0], 25.2) * Math.PI) : 0;
        water.visible = wl > 0.01; water.scale.y = Math.max(0.01, wl * 2); water.position.y = wl * 0.3;
        flowers.forEach((f, i) => { f.visible = t >= 25.5; f.scale.setScalar(popScale(t, 25.8 + i * 0.05, 0.3)); });
        reset(BOSS); sit(BOSS);
        if (t < 4.5) { typing(BOSS, t, 8, 0.05); BOSS.head.rotation.y = -0.5; BOSS.setFace('happy'); }
        else if (t < REPLY - 0.6) { BOSS.armL.rotation.x = BOSS.armR.rotation.x = -1.0; BOSS.setFace(t > 9.5 ? 'shock' : 'normal'); BOSS.body.rotation.z = t > 9.5 ? Math.sin(t * 40) * 0.03 : 0; BOSS.root.position.y = -Math.min(1, lv) * 0.0; }
        else if (t < MELT[0]) { typing(BOSS, t, 70, 0.4); BOSS.setFace('shock'); }
        else { BOSS.setFace('happy'); banzai(BOSS, 0.8, Math.sin(t * 10) * 0.1); }
        staffAll.forEach((c, i) => {
          working(c, t, i, 14);
          if (mails.some((m) => m.s === i && t >= m.t - 0.3 && t < m.t + 0.1)) { c.armR.rotation.x = -2.2; c.armR.rotation.z = 0.3; }
          if (t >= 15 && t < 20.5 && i > 0) {
            reset(c); c.root.position.set(1.6 + [-1.2, 1.2, 0][i - 1], 0, 2.6 + [0, 0, -1.1][i - 1]); c.root.rotation.y = [Math.PI / 2, -Math.PI / 2, 0][i - 1];
            c.setFace('happy'); c.armL.rotation.x = c.armR.rotation.x = -1.3 + Math.sin(t * 9 + i) * 0.3;
          }
          if (t >= MELT[0] && t < 25.5) { c.setFace('shock'); }
          if (t >= 25.5) { c.setFace('happy'); }
        });
      };
      const cams = [
        [0, 4.5, camPath([1.6, 4.6, 8.6], [1.2, 4.2, 7.8], [0, 1.2, -1.8], [0.2, 1.3, -1.8], 42, 4.5)],
        [4.5, 9.5, camPath([8.6, 4.0, 6.6], [8.0, 3.8, 5.8], [4.2, 1.6, -1.2], [4.2, 1.7, -1.2], 40, 5)],
        [9.5, 15, camPath([7.8, 3.6, 5.2], [7.2, 3.4, 4.6], [4.4, 1.6, -1.2], [4.4, 1.8, -1.2], 40, 5.5)],
        [15, 20.5, camPath([5.6, 3.0, 8.6], [5.0, 2.8, 7.8], [1.6, 1.2, 2.2], [1.6, 1.3, 2.2], 40, 5.5)],
        [20.5, 25.5, camPath([7.2, 5.2, 9.6], [6.6, 4.8, 8.8], [1.6, 1.0, -1.0], [1.6, 1.0, -1.0], 42, 5)],
        [25.5, 30.01, camPath([8.0, 3.2, 5.6], [7.4, 3.0, 4.8], [4.4, 1.2, -1.2], [4.4, 1.3, -1.2], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもメールを返さないと、机に雪が積もったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、午前10時', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.9, t1: 30.1, label: '部長の未読メール', value: unread, format: (n) => `${n}通`, done: (t) => t >= REPLY },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '返事をしないと、', at: 4.65, cps: 18 },
        { text: '机に雪が積もる', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '未読が100通をこえると、', at: 9.65, cps: 18 },
        { text: '部長の席だけ吹雪', at: 11.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 11.2, t1: 14.8, text: 'ビュオオオ', x: 900, y: 230, rot: -6, size: 52, shake: true },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '社員は、', at: 15.15, cps: 16 },
        { text: '雪だるまを作りはじめた', at: 15.7, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '定時1分前、部長が', at: 20.65, cps: 18 },
        { text: '全部に「了解」と返す', at: REPLY, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: REPLY - 0.4, t1: MELT[0], text: 'カタカタカタ', x: 820, y: 280, rot: 6, size: 46, shake: true },
      { type: 'fx', t0: MELT[0], t1: MELT[0] + 1.4, text: 'ザバーッ', x: 640, y: 420, rot: -5, size: 64, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも返事は、ぜんぶ「了解」。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '雪がとけて、部長の机は春', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #13　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const whoosh = (t) => [AUDIO.noise(t, 0.4, { filter: 'bandpass', freq: 1200, freq2: 2400, q: 2, gain: 0.04 })];
    const audio = AUDIO.music({ prog: ['Am', 'G', 'F', 'Em', 'Am', 'G', 'F', 'G', 'Dm', 'Am', 'Dm', 'Em', 'F', 'G', 'F', 'C'], arp: [8, 9, 10] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    mails.forEach((m, i) => { if (i < 8 || i % 3 === 0) add(whoosh(m.t)); });
    add([AUDIO.noise(9.6, 12.0, { filter: 'bandpass', freq: 700, q: 0.8, gain: 0.07, am: 0.6, amDepth: 0.04, long: true, fade: 0.6 })]);
    for (let i = 0; i < 3; i++) add(S_.pop(15.6 + i * 0.7, 2 + i));
    for (let t = REPLY - 0.6; t < MELT[0]; t += 0.05) add(S_.tick(t, 1));
    add(S_.jingle(MELT[0])); add(S_.smash(MELT[0] + 0.1));
    add(S_.sparkle(25.8)); add(S_.cheer(26.0));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
