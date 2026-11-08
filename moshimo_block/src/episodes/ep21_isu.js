/* ep21 — もしも会議で発言すると、椅子が浮いたら（30秒） */
EPISODES.push({
  id: 'ep21',
  no: 21,
  short: '浮く椅子',
  title: 'もしも会議で発言すると、椅子が浮いたら',
  lead: '話すと浮き、黙ると沈む会議室。話しつづける部長は天井まで、無口な社員Aは床に首まで。定時のあいさつで全員が飛んでいき、部長だけが残った。',
  duration: 30,
  poster: 12.0,
  chapters: [
    { t: 0, name: '会議' }, { t: 4.5, name: '浮く・沈む' }, { t: 9.5, name: '天井' },
    { t: 15, name: '社員A' }, { t: 20.5, name: '定時' }, { t: 25.5, name: '一番浮いている' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const BYE = 21.8;
    const bossH = (t) => (t < 4.5 ? 0.3 * prog(t, 2.0, 4.0) : t < 15 ? lerp(0.3, 4.0, ease.inOut(prog(t, 4.6, 13.0))) : 4.0 + Math.sin(t * 2) * 0.1);
    const aH = (t) => (t < 16.4 ? -1.15 * ease.inOut(prog(t, 4.6, 14.0)) : t < BYE ? lerp(-1.15, -0.5, ease.out(prog(t, 16.6, 17.2))) : -0.5 + 12 * ease.in(prog(t, BYE + 0.3, BYE + 1.6)));
    const mH = (i, t) => (t < BYE ? [0.4, 0.15, 0.6][i] * prog(t, 5.0 + i, 7.0 + i) + Math.sin(t * 2 + i) * 0.04 : 12 * ease.in(prog(t, BYE + 0.2 + i * 0.15, BYE + 1.4 + i * 0.15)));

    let A, BOSS, mates;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { floor: 'plank', windows: [[3, 2], [4, 2], [3, 3], [4, 3], [6, 2], [7, 2], [6, 3], [7, 3]] });
      P.whiteboard(S, [-2.2, 2.5, -5.92]);
      P.desk(S, 0, -1.6, { w: 5.0, d: 1.6, top: '#c99a62', panelColor: '#a87b48' });
      const seatAt = [[-1.8, -3.0], [0, -3.0], [1.8, -3.0], [-3.4, -1.6], [3.4, -1.6]];
      const rigs = seatAt.map(([x, z], i) => {
        const g = group(S);
        const rotY = i === 3 ? Math.PI / 2 : i === 4 ? -Math.PI / 2 : 0;
        P.chair(g, x, z, rotY, '#2f62d6');
        return { g, x, z, rotY };
      });
      const looks = [CAST.M1, CAST.A, CAST.M2, CAST.BOSS, CAST.M3];
      const people = rigs.map((r, i) => addChar(r.g, looks[i], [r.x, 0, r.z], r.rotY));
      A = people[1]; BOSS = people[3]; mates = [people[0], people[2], people[4]];
      const jets = rigs.map((r) => { const f = box(r.g, [0.3, 0.5, 0.3], [r.x, -0.2, r.z], new T.MeshBasicMaterial({ color: '#ffb347' }), { cast: false }); return f; });
      const update = (lt, t) => {
        const hs = [mH(0, t), aH(t), mH(1, t), bossH(t), mH(2, t)];
        rigs.forEach((r, i) => {
          r.g.position.y = hs[i];
          const c = people[i];
          reset(c); sit(c);
          c.armL.rotation.x = c.armR.rotation.x = -1.0;
          jets[i].visible = t >= BYE + 0.2 && t < 25.5 && i !== 3;
          jets[i].scale.y = 1 + Math.sin(t * 40 + i) * 0.3;
        });
        reset(BOSS); sit(BOSS);
        BOSS.armR.rotation.x = -1.3 + Math.sin(t * 9) * 0.4; BOSS.head.rotation.z = Math.sin(t * 7) * 0.05; BOSS.setFace('happy');
        A.setFace(t < 4.5 ? 'normal' : t < 16.4 ? 'sleepy' : 'shock');
        if (t >= 16.6 && t < BYE) A.setFace('happy');
        mates.forEach((c, i) => { if (t > 9.5 && t < BYE) { c.head.rotation.x = -0.5; c.setFace('shock'); } });
        if (t >= BYE) people.forEach((c, i) => { if (i !== 3) { c.setFace('happy'); banzai(c, 0.8, Math.sin(t * 12 + i) * 0.2); } });
        if (t >= 25.5) { BOSS.head.rotation.y = Math.sin(t * 1.5) * 0.5; }
      };
      const cams = [
        [0, 4.5, camPath([4.6, 3.8, 8.6], [4.0, 3.4, 7.8], [0, 1.2, -2.2], [0, 1.2, -2.2], 40, 4.5)],
        [4.5, 9.5, camPath([3.6, 3.0, 7.0], [3.0, 2.8, 6.2], [-0.4, 1.0, -2.4], [-0.4, 1.0, -2.4], 40, 5)],
        [9.5, 15, camPath([4.8, 4.2, 9.6], [4.2, 4.6, 9.0], [-0.8, 2.4, -2.0], [-1.2, 3.2, -2.0], 42, 5.5)],
        [15, 20.5, camPath([0.8, 3.0, -0.6], [0.6, 2.8, -1.0], [0, 0.1, -3.2], [0, 0.2, -3.2], 44, 5.5)],
        [20.5, 25.5, camPath([4.6, 4.0, 9.6], [4.0, 5.2, 9.0], [0, 1.6, -2.2], [0, 4.0, -2.2], 44, 5)],
        [25.5, 30.01, camPath([1.4, 4.4, 5.6], [0.8, 4.6, 5.0], [-3.2, 4.4, -1.6], [-3.2, 4.6, -1.6], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'room', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const RAMBLE = ['えー、まず', 'そもそも論として', '前にも言ったけど', '私が若いころは', 'つまりだね', '話を戻すと'];
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも会議で発言すると、椅子が浮いたら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の定例会議', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '部長の椅子の高さ', value: (t) => Math.round(bossH(t) * 10) / 10, format: (v) => `${v.toFixed(1)}ブロック`, done: (t) => t >= 13 },
      { type: 'bubble', t0: 2.0, t1: 4.4, text: 'では、始めようか', scene: 'room', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '発言すると浮き、', at: 4.65, cps: 18 },
        { text: '黙ると沈む', at: 5.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 5.2, t1: 6.6, text: '賛成です', scene: 'room', anchor: headTop(mates[0]) },
      { type: 'bubble', t0: 7.0, t1: 8.4, text: 'いいと思います', scene: 'room', anchor: headTop(mates[1]) },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '話しつづける部長は、', at: 9.65, cps: 18 },
        { text: '天井まで浮く', at: 10.6, cps: 16, cls: 'mark' },
      ] },
      ...RAMBLE.map((w, i) => ({ type: 'bubble', t0: 9.7 + i * 0.85, t1: 9.7 + (i + 1) * 0.85, text: w, scene: 'room', anchor: headTop(BOSS) })),
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '無口な社員Aは、', at: 15.15, cps: 18 },
        { text: '床に首まで', at: 15.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 15.3, t1: 16.4, text: 'Aくんはどう思う？', scene: 'room', anchor: () => headTop(A, 2.4)() },
      { type: 'bubble', t0: 16.6, t1: 18.6, text: '…いいと思います', scene: 'room', anchor: headTop(A) },
      { type: 'tag', t0: 18.8, t1: CUTS[3], text: '今日の発言：1回' },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '定時のあいさつで、', at: 20.65, cps: 18 },
        { text: '全員飛んで帰る', at: BYE + 0.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: BYE - 0.6, t1: BYE + 0.4, text: 'おつかれさまでした！', scene: 'room', anchor: headTop(mates[1]) },
      { type: 'fx', t0: BYE + 0.4, t1: BYE + 2.0, text: 'ビューン', x: 860, y: 220, rot: -8, size: 58, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも社内で一番浮いているのは、部長。', at: 25.75, cps: 18, cls: 'mark-soft small' },
        { text: '発言で椅子が浮く会議室', at: 27.6, cps: 20, cls: 'sub' },
      ] },
      { type: 'bubble', t0: 26.0, t1: 28.0, text: '…あれ、みんなは？', scene: 'room', anchor: headTop(BOSS) },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #21　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({ prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C', 'Dm', 'G', 'Em', 'Am', 'F', 'G', 'F', 'C'], arp: [8, 9] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    add(S_.floaty(4.8)); add(S_.floaty(9.8));
    add([AUDIO.tone(5.0, 300, 4.0, { type: 'sine', f2: 120, gain: 0.04 })]);
    add(S_.pop(16.6, 3));
    for (let i = 0; i < 4; i++) add(S_.whistle(BYE + 0.3 + i * 0.15, 0.9));
    add(S_.cheer(BYE + 0.4));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
