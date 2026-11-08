/* ep26 — もしも社員証をかざすと、壁を通りぬけられたら（30秒） */
EPISODES.push({
  id: 'ep26',
  no: 26,
  short: '壁を通りぬける社員証',
  title: 'もしも社員証をかざすと、壁を通りぬけられたら',
  lead: '社員証をピッとかざせば、壁はするりと通りぬけられる。コピー機までも会議室までも一直線、帰りは席から直接外へ。社員証を忘れた部長は、壁にぶつかる。',
  duration: 30,
  poster: 12.6,
  chapters: [
    { t: 0, name: 'ピッ' }, { t: 4.5, name: '近道' }, { t: 9.5, name: '会議室' },
    { t: 15, name: '帰り道' }, { t: 20.5, name: '有給申請' }, { t: 25.5, name: '通らない' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const WALLS = [-3, 3];
    const CROSS = [2.4, 5.6, 7.4, 10.6, 16.6];
    const passed = (t) => CROSS.filter((c) => t >= c).length;
    const BONK = 12.2, REJECT = 23.6;

    let A, BOSS, mates, paper;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { wallH: 4 });
      const B = new Blocks();
      WALLS.forEach((x) => { for (let z = -6; z <= 1; z++) for (let y = 0; y <= 1; y++) B.set(y === 0 ? 'wallBase' : 'wall', x, y, z); });
      B.build(S);
      box(S, [0.06, 0.5, 1.4], [2.97, 1.5, -2.0], faces(solid('#1d2333'), { left: P.glow(textTex('会議室', { w: 128, h: 64, size: 36, bg: '#1d2333', fg: '#f2c230' })) }));
      const cp = copier(S, -7.2, -3.0, Math.PI / 2);
      P.desk(S, 6.2, -2.0, { w: 3.2, d: 1.6, top: '#c99a62', panelColor: '#a87b48' });
      mates = [CAST.M1, CAST.M2].map((look, i) => workstation(S, -0.8 + i * 2.6, -3.0, look));
      A = addChar(S, CAST.A, [0.4, 0, 0.6], -Math.PI / 2);
      const card = group(A.armR, [0, -0.66, 0.12]); box(card, [0.3, 0.2, 0.03], [0, 0, 0], faces(solid('#ffffff'), { front: solid('#2f62d6') }));
      BOSS = addChar(S, CAST.BOSS, [-0.6, 0, 1.6], Math.PI / 2);
      paper = group(A.armR, [0, -0.66, 0.16]); box(paper, [0.4, 0.5, 0.02], [0, 0, 0], faces(solid('#ffffff'), { front: P.glow(textTex('有給申請', { w: 128, h: 64, size: 30, bg: '#ffffff', fg: '#1d2333' })) }));
      const ripple = Array.from({ length: 16 }, () => box(S, [0.14, 0.14, 0.14], [0, -99, 0], new T.MeshBasicMaterial({ color: '#7fe3ff' }), { cast: false }));
      const crossing = [[2.4, -3, 0.6], [5.6, -3, -1.2], [7.4, -3, -1.2], [10.6, 3, 0.4]];
      const pathA = [
        [0, 0.4, 0.6], [2.6, -4.6, 0.6], [4.5, -5.6, -1.6],
        [5.4, -2.2, -1.2], [5.8, -3.8, -1.2], [7.2, -2.2, -1.2], [7.6, -0.6, -1.2], [9.5, -0.6, -1.2],
        [10.2, 2.4, 0.4], [11.0, 4.0, 0.4], [12.4, 5.2, -0.4], [15, 5.2, -0.4],
      ];
      const posAt = (t) => {
        for (let i = 0; i < pathA.length - 1; i++) {
          const [t0, x0, z0] = pathA[i], [t1, x1, z1] = pathA[i + 1];
          if (t >= t0 && t < t1) return { x: lerp(x0, x1, prog(t, t0, t1)), z: lerp(z0, z1, prog(t, t0, t1)), moving: x0 !== x1 || z0 !== z1, dir: Math.atan2(x1 - x0, z1 - z0) };
        }
        const l = pathA[pathA.length - 1]; return { x: l[1], z: l[2], moving: false, dir: 0 };
      };
      const update = (lt, t) => {
        reset(A);
        card.visible = t < 15 && CROSS.some((c) => t > c - 0.6 && t < c - 0.05);
        paper.visible = t >= 20.5;
        if (t < 15) {
          const p = posAt(t);
          A.root.position.set(p.x, 0, p.z); A.root.rotation.y = p.moving ? p.dir : -Math.PI / 2;
          if (p.moving) walk(A, t * 14, 0.6);
          if (card.visible) A.armR.rotation.x = -1.5;
          A.setFace(t > 12.0 ? 'happy' : 'normal');
          if (t > 4.5 && t < 5.4) { A.root.rotation.y = Math.PI / 2; A.armR.rotation.x = -1.4; }
          if (t >= 11.0) { A.root.position.set(5.6, 0, -0.6); A.root.rotation.y = -0.9; sit(A); A.root.position.y = 0; }
        } else if (t < 20.5) {
          A.root.visible = false;
        } else {
          const u = prog(t, 20.6, 22.6);
          A.root.position.set(lerp(-2.0, -0.6, u), 0, 2.6); A.root.rotation.y = Math.PI / 2;
          if (u < 1) walk(A, t * 14, 0.6);
          A.armR.rotation.x = t > 22.4 ? -1.5 : -0.4;
          if (t > REJECT) { A.setFace('shock'); paper.position.set(0, -0.66 - bump(t, [REJECT], 0.3), 0.16); A.root.position.x -= bump(t, [REJECT], 0.3); }
          if (t > 25.5) A.setFace('sleepy');
        }
        mates.forEach((c, i) => {
          working(c, t, i, 14);
          if (t >= 9.5 && t < 15) { reset(c); c.root.position.set(6.2 + (i ? 1.0 : -0.6), 0, -3.0); c.root.rotation.y = 0; sit(c); c.setFace('happy'); }
        });
        reset(BOSS);
        if (t < 9.5) { BOSS.root.visible = false; }
        else if (t < 15) {
          BOSS.root.visible = true;
          const u = prog(t, 9.8, BONK);
          BOSS.root.position.set(lerp(-1.0, 2.55, u) - (t > BONK ? bump(t, [BONK], 0.4) : 0), 0, 0.4); BOSS.root.rotation.y = Math.PI / 2;
          if (u < 1) walk(BOSS, t * 12, 0.45);
          if (t > BONK) { BOSS.setFace('shock'); BOSS.armR.rotation.x = -2.8; BOSS.armR.rotation.z = 0.4; }
        } else if (t < 20.5) { BOSS.root.visible = false; }
        else { BOSS.root.visible = true; BOSS.root.position.set(0.9, 0, 2.6); BOSS.root.rotation.y = -Math.PI / 2; BOSS.setFace(t > REJECT - 0.2 ? 'normal' : 'normal'); if (t > REJECT - 0.3 && t < REJECT + 0.3) BOSS.armR.rotation.x = -1.6; }
        ripple.forEach((m, i) => {
          const hit = crossing.find(([ct]) => t >= ct - 0.2 && t < ct + 0.5);
          m.visible = !!hit;
          if (!hit) return;
          const [ct, x, z] = hit, u = prog(t, ct - 0.2, ct + 0.5), a = (i / 16) * Math.PI * 2;
          m.position.set(x + (x < 0 ? 0.5 : 0.5) + 0.0, 1.0 + Math.sin(a) * (0.4 + u * 0.9), z + Math.cos(a) * (0.4 + u * 0.9));
          m.scale.setScalar(1 - u);
        });
        cp.scan(t, 4.6, 0.5);
      };
      const cams = [
        [0, 4.5, camPath([0.6, 5.4, 7.0], [0.2, 5.0, 6.4], [-2.6, 0.6, -0.4], [-2.8, 0.6, -0.4], 42, 4.5)],
        [4.5, 9.5, camPath([0.0, 7.4, 8.6], [0.6, 7.0, 8.2], [-2.6, 0.4, -1.8], [-0.4, 0.4, -1.6], 46, 5)],
        [9.5, 15, camPath([0.6, 5.2, 7.4], [1.0, 5.0, 6.8], [3.0, 0.8, -0.8], [3.6, 0.8, -1.0], 44, 5.5)],
        [20.5, 25.5, camPath([0.6, 2.6, 7.6], [0.4, 2.4, 7.0], [0.0, 1.1, 2.4], [0.1, 1.1, 2.4], 40, 5)],
        [25.5, 30.01, camPath([-1.4, 2.2, 6.6], [-1.6, 2.0, 6.0], [0.0, 1.1, 2.4], [0.0, 1.1, 2.4], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt), shake: (lt) => impact(lt + a, [BONK, REJECT], 0.06) }));
    }

    /* ===== 帰り道：席から直接外へ ===== */
    let A2;
    {
      const S = newScene({ sky: ['#ffae7a', '#ffe2b8'], sunColor: '#ffd8b0', sunI: 0.55, amb: 0.72 });
      streetSet(S, { windows: [[-7, 4], [5, 4]], sign: 'ブロック町IT', height: 9 });
      A2 = addChar(S, CAST.A, [3.0, 0, -5.0]);
      const ripple = Array.from({ length: 16 }, () => box(S, [0.16, 0.16, 0.16], [0, -99, 0], new T.MeshBasicMaterial({ color: '#7fe3ff' }), { cast: false }));
      scenes.push({
        id: 'street', start: 15, end: 20.5, scene: S,
        cam: camPath([7.6, 3.0, 9.6], [7.0, 2.8, 8.8], [2.6, 1.2, -2.4], [4.0, 1.2, -1.6], 42, 5.5),
        update(lt, t) {
          reset(A2);
          const u1 = prog(t, 15.6, 17.4), u2 = prog(t, 17.6, 20.4);
          A2.root.position.set(t < 17.6 ? 3.0 : lerp(3.0, 12, u2), 0, t < 17.6 ? lerp(-5.0, 0.2, u1) : 0.2);
          A2.root.rotation.y = t < 17.6 ? 0 : Math.PI / 2;
          if ((u1 > 0 && u1 < 1) || (u2 > 0 && u2 < 1)) walk(A2, t * 14, 0.6);
          A2.setFace('happy');
          ripple.forEach((m, i) => {
            const on = t >= 16.2 && t < 17.0, u = prog(t, 16.2, 17.0), a = (i / 16) * Math.PI * 2;
            m.visible = on; if (!on) return;
            m.position.set(3.0 + Math.cos(a) * (0.4 + u), 1.0 + Math.sin(a) * (0.4 + u), -3.0); m.scale.setScalar(1 - u);
          });
        },
      });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも社員証をかざすと、壁を通りぬけられたら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '今日通りぬけた壁', value: passed, format: (n) => `${n}枚`, done: (t) => t >= 16.6 && t < 20.5 },
      { type: 'fx', t0: CROSS[0] - 0.5, t1: CROSS[0], text: 'ピッ', x: 720, y: 340, rot: 6, size: 44 },
      { type: 'fx', t0: CROSS[0], t1: CROSS[0] + 0.8, text: 'スルッ', x: 520, y: 300, rot: -6, size: 50 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: 'コピー機までも、', at: 4.65, cps: 18 },
        { text: '壁をぬけて一直線', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '会議室にも一直線。でも部長は、', at: 9.65, cps: 20 },
        { text: '社員証を忘れた', at: BONK + 0.1, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: BONK, t1: BONK + 0.8, text: 'ゴンッ', scene: 'office', anchor: headTop(BOSS, 0.6), x: 120, y: 0, rot: 7, size: 56, shake: true },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '帰りは、', at: 15.15, cps: 16 },
        { text: '席から直接外へ', at: 15.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '翌日、社員Aは', at: 20.65, cps: 18 },
        { text: '有給申請を出した', at: 21.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 22.6, t1: REJECT, text: '来週、有給を…', scene: 'office', anchor: headTop(A) },
      { type: 'fx', t0: REJECT, t1: REJECT + 0.8, text: 'ペシッ', x: 620, y: 320, rot: -6, size: 52, shake: true },
      { type: 'bubble', t0: REJECT + 0.2, t1: 25.4, text: 'それは通らないねえ', scene: 'office', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: '壁は通れても、有給申請は通らない。', at: 25.75, cps: 16, cls: 'mark-soft' },
        { text: '社員証で壁を通りぬけられる会社', at: 27.6, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.4, t1: 30.1, text: 'もしもブロック劇場 #26　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const beep = (t) => [AUDIO.tone(t, 'E6', 0.08, { gain: 0.06 }), AUDIO.tone(t + 0.09, 'B6', 0.12, { gain: 0.06, decay: true })];
    const slip = (t) => [AUDIO.tone(t, 300, 0.5, { type: 'sine', f2: 1200, gain: 0.05 }), AUDIO.noise(t, 0.4, { filter: 'bandpass', freq: 2000, q: 2, gain: 0.03 })];
    const audio = AUDIO.music({ prog: ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'F', 'C'], arp: [6, 7] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    CROSS.forEach((t) => { add(beep(t - 0.5)); add(slip(t)); });
    add(S_.stomp(BONK)); add(S_.pop(REJECT, 0)); add(S_.buzzer(REJECT + 0.1));
    add(S_.pop(28.4, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
