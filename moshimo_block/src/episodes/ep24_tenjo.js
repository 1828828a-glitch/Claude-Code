/* ep24 — もしもオフィスの天井が、毎日どんどん下がってきたら（30秒） */
EPISODES.push({
  id: 'ep24',
  no: 24,
  short: '下がる天井',
  title: 'もしもオフィスの天井が、毎日どんどん下がってきたら',
  lead: '月曜は4ブロック、水曜は2ブロックで部長が頭をぶつけ、木曜ははって移動、金曜は寝そべって会議。週末の工事で天井は元どおりになったが。',
  duration: 30,
  poster: 17.2,
  chapters: [
    { t: 0, name: '月曜' }, { t: 4.5, name: '水曜' }, { t: 9.5, name: '木曜' },
    { t: 15, name: '金曜' }, { t: 20.5, name: '工事' }, { t: 25.5, name: '頭が上がらない' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const KEYS = [[0, 4], [2.6, 4], [3.4, 3], [4.8, 3], [5.6, 2.05], [9.6, 2.05], [10.4, 1.35], [15.1, 1.35], [15.9, 0.9], [21.0, 0.9], [23.6, 4.2]];
    const ceil = (t) => { for (let i = KEYS.length - 1; i >= 0; i--) if (t >= KEYS[i][0]) { const nx = KEYS[i + 1]; return nx ? lerp(KEYS[i][1], nx[1], ease.inOut(prog(t, KEYS[i][0], nx[0]))) : KEYS[i][1]; } return 4; };
    const BONK = 6.2;

    let A, BOSS, staff;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { wallH: 4 });
      const ceiling = group(S);
      box(ceiling, [20, 0.4, 10], [-0.5, 0.2, -1.5], solid('#d9dee3', { emissive: '#2a2f36' }));
      [[-6, -3], [0, -3], [6, -3], [-6, 0.5], [0, 0.5], [6, 0.5]].forEach(([x, z]) => box(ceiling, [2.0, 0.06, 0.5], [x, -0.03, z], new T.MeshBasicMaterial({ color: '#fffbe8' }), { cast: false }));
      const crack = P.crackDecal(S, 3.0, 0, 0.6, 0.4); crack.rotation.x = Math.PI / 2; crack.scale.setScalar(1.6);
      const deskSet = group(S), lowSet = group(S);
      const seats = [[-4, -2.6, CAST.A], [0, -2.6, CAST.M1], [4, -2.6, CAST.M2], [-2, 0.9, CAST.M3]];
      staff = seats.map(([x, z, look]) => { P.desk(deskSet, x, z); P.chair(deskSet, x, z - 0.95); P.laptop(deskSet, x, 0.82, z - 0.1); box(lowSet, [1.6, 0.4, 0.9], [x, 0.2, z], solid('#c99a62')); P.laptop(lowSet, x, 0.4, z - 0.1); return addChar(S, look, [x, 0, z - 0.95]); });
      A = staff[0];
      BOSS = addChar(S, CAST.BOSS, [3.0, 0, 0.6], -0.5);
      const jacks = [[-8, -5], [7, -5], [-8, 2], [7, 2]].map(([x, z]) => box(S, [0.4, 1, 0.4], [x, 0, z], solid('#f2c230')));
      const sign = box(S, [2.6, 0.6, 0.06], [-0.5, 0.5, 2.9], faces(solid('#f2c230'), { front: P.glow(textTex('工事中', { w: 256, h: 64, size: 40, bg: '#f2c230', fg: '#1d2333' })) }));
      const update = (lt, t) => {
        const h = ceil(t);
        ceiling.position.y = h;
        crack.position.y = h - 0.02;
        crack.visible = t >= BONK && t < 23.6;
        const low = t >= 9.5 && t < 15, lying = t >= 15 && t < 23.6;
        deskSet.visible = !low && !lying;
        lowSet.visible = low;
        const work = t >= 20.5 && t < 25.5;
        jacks.forEach((j) => { j.visible = work; j.scale.y = Math.max(0.01, h); j.position.y = h / 2; });
        sign.visible = work;
        staff.forEach((c, i) => {
          reset(c);
          if (low) {
            c.root.position.y = -0.2; sit(c); c.armL.rotation.x = c.armR.rotation.x = -0.9; c.head.rotation.x = 0.35; c.body.rotation.x = 0.2; c.setFace('sleepy');
            if (i === 0) {
              const u = prog(t, 11.0, 14.6);
              c.root.position.set(lerp(-4, 3.5, u), 0.32, lerp(-0.8, 1.6, u)); c.root.rotation.set(Math.PI / 2 * 0.95, Math.PI / 2, 0, 'YXZ');
              c.root.rotation.order = 'YXZ';
              c.armL.rotation.x = -2.6 + Math.sin(t * 10) * 0.5; c.armR.rotation.x = -2.6 - Math.sin(t * 10) * 0.5; c.legL.rotation.x = Math.sin(t * 10) * 0.4; c.legR.rotation.x = -Math.sin(t * 10) * 0.4; c.setFace('normal');
            }
          } else if (lying) {
            c.root.rotation.order = 'YXZ';
            c.root.position.set(seats[i][0], 0.2, seats[i][1] + 0.4); c.root.rotation.set(-Math.PI / 2, Math.PI / 2 * (i % 2 ? 1 : -1), 0);
            c.armL.rotation.x = c.armR.rotation.x = -1.2 + Math.sin(t * 14 + i) * 0.1; c.setFace(work ? 'shock' : 'sleepy');
            if (work) { c.root.position.y = 0.2; }
          } else {
            c.root.rotation.order = 'XYZ';
            sit(c); typing(c, t + i, 14, 0.1);
            if (t >= 4.5 && t < 9.5) { c.head.rotation.x = 0.25; }
            if (t >= 25.5) { reset(c); }
          }
          if (t >= 23.6 && t < 25.5) { reset(c); c.root.rotation.order = 'XYZ'; c.setFace('happy'); banzai(c, 1, Math.sin(t * 10 + i) * 0.15); c.root.position.y = Math.abs(Math.sin(t * 7 + i)) * 0.2; }
        });
        reset(BOSS);
        BOSS.root.rotation.order = 'XYZ';
        if (t < 4.5) { BOSS.root.position.set(3.0, 0, 0.6); BOSS.setFace('happy'); }
        else if (t < 9.5) { const u = prog(t, 4.8, BONK); BOSS.root.position.set(lerp(6.0, 3.0, u), 0, 0.6); BOSS.root.rotation.y = -1.2; if (u < 1) walk(BOSS, t * 12, 0.45); if (t >= BONK) { BOSS.setFace('shock'); BOSS.armR.rotation.x = -2.9; BOSS.armR.rotation.z = 0.4; BOSS.root.position.y = -bump(t, [BONK], 0.15); BOSS.body.rotation.x = 0.25; BOSS.head.rotation.x = 0.35; } }
        else if (t < 15) { BOSS.root.visible = false; }
        else if (t < 23.6) { BOSS.root.rotation.order = 'YXZ'; BOSS.root.position.set(2.0, 0.2, 1.2); BOSS.root.rotation.set(-Math.PI / 2, -Math.PI / 2, 0); BOSS.armR.rotation.x = -1.2 + Math.sin(t * 8) * 0.3; BOSS.setFace('happy'); }
        else if (t < 25.5) { BOSS.root.visible = false; }
        else { BOSS.root.position.set(-2.2, 0, -0.6); BOSS.root.rotation.y = -2.0; BOSS.setFace('happy'); }
        if (t >= 25.5) {
          reset(A); A.root.rotation.order = 'XYZ'; A.root.position.set(-3.2, 0, -1.6); A.root.rotation.y = 1.0;
          bend(A, 0.5 + Math.min(1, prog(t, 26.0, 26.4)) * 0.4); A.setFace('sleepy');
        }
      };
      const lowCam = (y0, y1, d) => camPath([5.6, y0, 9.6], [5.0, y1, 8.8], [0, Math.min(y0 - 1.2, 1.4), -1.6], [0, Math.min(y1 - 1.2, 1.4), -1.6], 42, d);
      scenes.push({ id: 'office', start: 0, end: 4.5, scene: S, update, cam: camPath([6.0, 3.4, 10.4], [5.4, 3.0, 9.6], [0, 1.4, -1.6], [0, 1.4, -1.6], 42, 4.5) });
      scenes.push({ id: 'office', start: 4.5, end: 9.5, scene: S, update, cam: camPath([6.8, 1.9, 6.4], [6.2, 1.8, 5.8], [2.6, 1.3, -0.2], [2.6, 1.3, -0.2], 42, 5), shake: (lt) => impact(lt + 4.5, [BONK], 0.08) });
      scenes.push({ id: 'office', start: 9.5, end: 15, scene: S, update, cam: camPath([4.6, 1.15, 7.4], [4.0, 1.1, 6.8], [0, 0.5, -1.0], [0.6, 0.5, -0.6], 44, 5.5) });
      scenes.push({ id: 'office', start: 15, end: 20.5, scene: S, update, cam: camPath([4.0, 0.75, 6.4], [3.6, 0.7, 5.8], [0, 0.25, -1.0], [0, 0.25, -1.0], 46, 5.5) });
      scenes.push({ id: 'office', start: 20.5, end: 25.5, scene: S, update, cam: (lt, t) => { const h = ceil(t); return { pos: [5.8, Math.max(0.75, h - 0.2) + 0.5, 10.4], target: [0, Math.max(0.3, h - 1.6), -1.4], fov: 46 }; } });
      scenes.push({ id: 'office', start: 25.5, end: 30.01, scene: S, update, cam: camPath([-7.0, 2.4, 1.8], [-6.6, 2.2, 1.2], [-2.7, 1.0, -1.1], [-2.7, 1.0, -1.1], 40, 4.5) });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもオフィスの天井が、毎日どんどん下がってきたら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜日', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '天井の高さ', value: (t) => Math.round(ceil(t) * 10) / 10, format: (v) => `${v.toFixed(1)}ブロック`, done: (t) => t >= 15.9 && t < 23.6 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '水曜日、', at: 4.65, cps: 16 },
        { text: '部長が頭をぶつける', at: BONK + 0.1, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: BONK, t1: BONK + 0.8, text: 'ゴンッ', scene: 'office', anchor: headTop(BOSS, 0.8), x: 120, y: -10, rot: 7, size: 54, shake: true },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '木曜日、', at: 9.65, cps: 16 },
        { text: 'はって移動する', at: 10.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '金曜日、', at: 15.15, cps: 16 },
        { text: '寝そべって会議', at: 16.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 16.6, t1: 19.6, text: 'では、横になったまま始めよう', scene: 'office', anchor: headTop(BOSS, 0.4) },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '週末の工事で、', at: 20.65, cps: 18 },
        { text: '天井は元どおり', at: 23.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.2, t1: 23.6, text: 'ウィーン', x: 880, y: 300, rot: -5, size: 50, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも社員Aは、部長に頭が上がらない。', at: 26.4, cps: 18, cls: 'mark-soft small' },
        { text: '天井が下がる会社', at: 28.0, cps: 20, cls: 'sub' },
      ] },
      { type: 'bubble', t0: 25.7, t1: 27.6, text: 'Aくん、来週もよろしく', scene: 'office', anchor: headTop(BOSS) },
      { type: 'badge', t0: 28.6, t1: 30.1, text: 'もしもブロック劇場 #24　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const lower = (t) => [AUDIO.noise(t, 0.8, { filter: 'lowpass', freq: 300, gain: 0.12, long: true, fade: 0.2 }), AUDIO.tone(t, 90, 0.8, { type: 'triangle', f2: 60, gain: 0.06 })];
    const audio = AUDIO.music({ prog: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'Am', 'F', 'G', 'Em', 'F', 'G', 'F', 'C'], arp: [11, 12] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    [2.6, 4.8, 9.6, 15.1].forEach((t) => add(lower(t)));
    add(S_.stomp(BONK)); add(S_.crack(BONK + 0.02));
    for (let t = 11.0; t < 14.6; t += 0.3) add(S_.step(t));
    add([AUDIO.tone(21.0, 120, 2.6, { wave: 'pulse25', f2: 480, gain: 0.04 })]);
    add(S_.cheer(23.8));
    add(S_.pop(28.6, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
