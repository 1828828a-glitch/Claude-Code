/* ep22 — もしも勤続年数で、机が豪華になったら（30秒） */
EPISODES.push({
  id: 'ep22',
  no: 22,
  short: '勤続年数と机',
  title: 'もしも勤続年数で、机が豪華になったら',
  lead: '新人はダンボール、社員Aはふつうの机、課長はモニター3枚、部長は水槽つき、社長の机はもはや城。いちばんいい席にいたのは、勤続2年の社長の犬だった。',
  duration: 30,
  poster: 16.8,
  chapters: [
    { t: 0, name: '新人' }, { t: 4.5, name: '課長' }, { t: 9.5, name: '部長' },
    { t: 15, name: '社長' }, { t: 20.5, name: '社長の犬' }, { t: 25.5, name: '一番いい席' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const X = { NEW: -14, A: -9, KACHO: -4, BUCHO: 2, CEO: 11, DOG: 18 };
    const years = (t) => (t < 2.4 ? 0 : t < 4.5 ? 5 : t < 9.5 ? 15 : t < 15 ? 25 : t < 20.5 ? 40 : t < 25.5 ? 2 : 5);

    let NEWB, A, KACHO, BUCHO, CEOc, dog;
    {
      const S = newScene({ sky: SKY_DAY });
      const B = new Blocks();
      B.fill('foundation', -18, -2, -6, 23, -2, 3);
      B.fill('carpet', -18, -1, -6, 23, -1, 3);
      for (let x = -18; x <= 23; x++) for (let y = -1; y <= 4; y++) B.set(y === 0 ? 'wallBase' : y > 1 && y < 4 && x % 4 === 0 ? 'window' : 'wall', x, y, -7);
      B.fill('gold', 6, -1, -6, 23, -1, -1);
      B.build(S);
      /* 新人：ダンボール */
      const card = group(S, [X.NEW, 0, -2.6]);
      box(card, [1.0, 0.7, 0.8], [0, 0.35, 0], solid('#c49a5a')); box(card, [1.02, 0.04, 0.82], [0, 0.7, 0], solid('#a8794a'));
      box(S, [0.4, 0.4, 0.4], [X.NEW, 0.2, -3.5], solid('#2f62d6'));
      NEWB = addChar(S, CAST.NEW, [X.NEW, -0.05, -3.5]);
      /* 社員A：ふつう */
      A = workstation(S, X.A, -2.6, CAST.A);
      /* 課長：モニター3枚 */
      P.desk(S, X.KACHO, -2.6, { w: 2.6 }); P.chair(S, X.KACHO, -3.55, 0, '#1d2333');
      [-0.9, 0, 0.9].forEach((dx, i) => P.monitor(S, X.KACHO + dx, 0.82, -2.95, 'code', 0));
      P.plant(S, X.KACHO + 1.8, -3.0, 0.8);
      KACHO = addChar(S, CAST.M1, [X.KACHO, 0, -3.55]);
      /* 部長：水槽とマッサージチェア */
      P.desk(S, X.BUCHO, -2.4, { w: 2.6, top: '#8b5e34', panelColor: '#6b4a2b' });
      const mchair = group(S, [X.BUCHO, 0, -3.6]);
      box(mchair, [1.2, 0.6, 1.1], [0, 0.3, 0], solid('#5a3a22')); box(mchair, [1.2, 1.6, 0.4], [0, 1.1, -0.45], solid('#5a3a22')); box(mchair, [0.3, 0.5, 1.0], [-0.55, 0.85, 0], solid('#6b4a2b')); box(mchair, [0.3, 0.5, 1.0], [0.55, 0.85, 0], solid('#6b4a2b'));
      const tank = new T.Mesh(new T.BoxGeometry(2.2, 1.3, 0.8), new T.MeshLambertMaterial({ color: '#7fc8f4', transparent: true, opacity: 0.45 }));
      tank.position.set(X.BUCHO + 2.8, 1.35, -5.4); S.add(tank);
      box(S, [2.3, 0.7, 0.9], [X.BUCHO + 2.8, 0.35, -5.4], solid('#2b3140'));
      const fish = [0, 1, 2].map((i) => box(S, [0.3, 0.18, 0.1], [0, -99, 0], solid(['#ff9f2e', '#f2c230', '#ff8fb3'][i]), { cast: false }));
      box(S, [0.8, 1.0, 0.7], [X.BUCHO - 2.0, 0.5, -3.4], faces(solid('#e8ecef'), { front: solid('#cfd6dd') }));
      BUCHO = addChar(S, CAST.BOSS, [X.BUCHO, 0.55, -3.55]);
      /* 社長：城 */
      const castle = group(S, [X.CEO, 0, -3.6]);
      const goldM = blockMat('gold');
      box(castle, [4.2, 0.5, 3.0], [0, 0.25, 0], goldM); box(castle, [3.2, 0.5, 2.4], [0, 0.75, -0.2], goldM);
      box(castle, [1.4, 0.5, 1.2], [0, 1.25, -0.5], solid('#a0222a')); box(castle, [1.6, 2.6, 0.3], [0, 2.3, -1.0], goldM);
      box(castle, [0.5, 0.5, 0.5], [0, 3.85, -1.0], solid('#ff3b6a', { emissive: '#601020' }));
      [-2.6, 2.6].forEach((x) => {
        for (let y = 0; y < 5; y++) box(castle, [1.0, 1.0, 1.0], [x, 0.5 + y, -1.4], blockMat('stone'));
        [-0.35, 0.35].forEach((dx) => box(castle, [0.3, 0.4, 1.0], [x + dx, 5.2, -1.4], blockMat('stone')));
        box(castle, [0.06, 1.0, 0.06], [x, 5.8, -1.4], solid('#2b3140')); box(castle, [0.6, 0.36, 0.04], [x + 0.3, 6.1, -1.4], solid('#d24b4b'));
      });
      const moat = new T.Mesh(new T.BoxGeometry(7.0, 0.1, 1.0), new T.MeshLambertMaterial({ color: '#3a8fd8', transparent: true, opacity: 0.8 }));
      moat.position.set(X.CEO, 0.05, -1.4); S.add(moat);
      box(S, [1.6, 0.14, 1.2], [X.CEO, 0.12, -1.4], solid('#8b5e34'));
      CEOc = addChar(S, CAST.CEO, [X.CEO, 1.5, -3.95]);
      /* 社長の犬 */
      const dogBed = group(S, [X.DOG, 0, -3.2]);
      box(dogBed, [2.4, 0.5, 1.8], [0, 0.25, 0], goldM); box(dogBed, [2.0, 0.4, 1.4], [0, 0.65, 0], solid('#d26fa0'));
      box(dogBed, [2.4, 1.4, 0.2], [0, 1.0, -0.8], solid('#a0222a'));
      [-1.1, 1.1].forEach((x) => box(dogBed, [0.3, 1.8, 0.3], [x, 0.9, -0.8], goldM));
      dog = group(S, [X.DOG, 0.85, -3.1]);
      const dc = solid('#e0b07a');
      box(dog, [0.9, 0.5, 0.5], [0, 0.35, 0], dc); box(dog, [0.5, 0.5, 0.5], [0.55, 0.6, 0], dc); box(dog, [0.2, 0.2, 0.2], [0.85, 0.55, 0], solid('#1d2333'));
      [[0.45, 0.2], [0.45, -0.2]].forEach(([x, z]) => box(dog, [0.14, 0.24, 0.14], [x + 0.2, 0.95, z], solid('#a8794a')));
      [[-0.3, 0.18], [-0.3, -0.18], [0.3, 0.18], [0.3, -0.18]].forEach(([x, z]) => box(dog, [0.14, 0.2, 0.14], [x, 0.05, z], dc));
      const tail = group(dog, [-0.45, 0.5, 0]); box(tail, [0.1, 0.4, 0.1], [0, 0.2, 0], dc);
      box(dog, [0.3, 0.2, 0.3], [0.55, 0.95, 0], solid('#f2c230', { emissive: '#5a4400' }));
      dog.rotation.y = -Math.PI / 2;
      const update = (lt, t) => {
        reset(NEWB); sit(NEWB); NEWB.root.position.y = -0.05; typing(NEWB, t, 14, 0.1); NEWB.armL.rotation.x = NEWB.armR.rotation.x = -0.8; NEWB.setFace(t > 25.5 ? 'sleepy' : 'happy');
        working(A, t, 1);
        if (t > 20.5) { A.head.rotation.y = -0.9; A.setFace(t > 25.5 ? 'sleepy' : 'shock'); }
        working(KACHO, t, 2, 22); KACHO.setFace('happy');
        reset(BUCHO); sit(BUCHO); BUCHO.root.position.y = 0.55;
        const vib = Math.sin(t * 60) * 0.03;
        mchair.position.x = X.BUCHO + vib; BUCHO.root.position.x = X.BUCHO + vib;
        BUCHO.setFace('happy'); BUCHO.head.rotation.x = -0.2; BUCHO.armL.rotation.x = BUCHO.armR.rotation.x = -0.6;
        fish.forEach((f, i) => f.position.set(X.BUCHO + 2.8 - 0.9 + ((t * (0.5 + i * 0.2) + i) % 1.8), 1.1 + i * 0.3, -5.3));
        reset(CEOc); sit(CEOc); CEOc.root.position.y = 1.5; CEOc.setFace('happy'); CEOc.armR.rotation.z = 0.3; CEOc.armL.rotation.x = CEOc.armR.rotation.x = -0.5;
        tail.rotation.x = Math.sin(t * 12) * 0.6;
        dog.position.y = 0.85 + Math.abs(Math.sin(t * 3)) * 0.04;
      };
      const pan = (x0, x1, d, y = 3.4, z = 7.2, fov = 40) => (lt) => { const u = ease.inOut(prog(lt, 0, d)); const x = lerp(x0, x1, u); return { pos: [x + 2.6, y, z], target: [x, 1.0, -3.0], fov }; };
      scenes.push({ id: 'office', start: 0, end: 4.5, scene: S, update, cam: pan(X.NEW + 0.6, X.A, 4.5, 3.0, 5.6) });
      scenes.push({ id: 'office', start: 4.5, end: 9.5, scene: S, update, cam: pan(X.A + 1.5, X.KACHO + 0.6, 5, 3.2, 6.4) });
      scenes.push({ id: 'office', start: 9.5, end: 15, scene: S, update, cam: pan(X.BUCHO + 0.2, X.BUCHO + 1.4, 5.5, 3.4, 6.8) });
      scenes.push({ id: 'office', start: 15, end: 20.5, scene: S, update, cam: (lt) => { const u = ease.inOut(prog(lt, 0, 5.5)); return { pos: [X.CEO + lerp(1.4, 3.0, u), lerp(2.6, 5.6, u), lerp(5.4, 9.6, u)], target: [X.CEO, lerp(1.8, 2.6, u), -3.0], fov: 44 }; } });
      scenes.push({ id: 'office', start: 20.5, end: 25.5, scene: S, update, cam: pan(X.DOG - 0.4, X.DOG + 0.2, 5, 2.4, 4.6, 40) });
      scenes.push({ id: 'office', start: 25.5, end: 30.01, scene: S, update, cam: (lt) => { const u = ease.inOut(prog(lt, 0.8, 2.6)); return { pos: [lerp(X.A + 2.2, X.DOG + 2.4, u), lerp(2.6, 2.6, u), lerp(4.8, 5.4, u)], target: [lerp(X.A, X.DOG, u), 1.1, -3.0], fov: 40 }; } });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも勤続年数で、机が豪華になったら', cls: 'title' },
        { text: 'ブロック町のIT企業、4月', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 0.6, t1: 30.1, label: '勤続年数', value: years, format: (n) => `${n}年`, done: (t) => t >= 15 && t < 20.5 },
      { type: 'tag', t0: 0.8, t1: 2.4, text: '新人（0年）：ダンボール' },
      { type: 'tag', t0: 2.4, t1: CUTS[0], text: '社員A（5年）：ふつうの机' },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '勤続年数が長いほど、', at: 4.65, cps: 18 },
        { text: '机が豪華になる', at: 5.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: 6.2, t1: CUTS[1], text: '課長（15年）：モニター3枚' },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '部長（25年）の席には、', at: 9.65, cps: 18 },
        { text: '水槽とマッサージチェア', at: 10.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 11.6, t1: 14.6, text: 'ブルブルブル', x: 860, y: 300, rot: 6, size: 46, shake: true },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '社長（40年）の机は、', at: 15.15, cps: 18 },
        { text: 'もはや城', at: 16.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '社長の犬（2年）は、', at: 20.65, cps: 18 },
        { text: 'ふかふかの特等席', at: 21.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 22.6, t1: 23.6, text: 'ワン', x: 780, y: 300, rot: 8, size: 50 },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも一番いい席は、社長の犬。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '勤続年数で机が豪華になる会社', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #22　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const woof = (t) => [AUDIO.tone(t, 520, 0.12, { wave: 'pulse25', f2: 300, gain: 0.08 }), AUDIO.tone(t + 0.16, 560, 0.12, { wave: 'pulse25', f2: 320, gain: 0.08 })];
    const audio = AUDIO.music({ prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'C', 'Em', 'F', 'G', 'C', 'G', 'F', 'C'], arp: [8, 9, 10, 11] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    [0.8, 2.4, 6.2].forEach((t) => add(S_.pop(t, 2)));
    add([AUDIO.noise(11.6, 3.0, { filter: 'lowpass', freq: 300, gain: 0.06, am: 30, amDepth: 0.05, long: true })]);
    add(S_.jingle(16.2)); add(S_.sparkle(16.6));
    add(woof(22.6)); add(woof(24.2));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
