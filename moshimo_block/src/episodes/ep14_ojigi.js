/* ep14 — もしも「すみません」と言うたびに、おじぎが深くなったら（30秒） */
EPISODES.push({
  id: 'ep14',
  no: 14,
  short: '深くなるおじぎ',
  title: 'もしも「すみません」と言うたびに、おじぎが深くなったら',
  lead: '15度、45度、90度。謝るたびにおじぎは深くなり、180度で頭が床に刺さり、360度でついに一回転。部長がサーバーを止めた日も、謝ったのは社員Aだった。',
  duration: 30,
  poster: 10.8,
  chapters: [
    { t: 0, name: '15度' }, { t: 4.5, name: '90度' }, { t: 9.5, name: '360度' },
    { t: 15, name: '転がる' }, { t: 20.5, name: 'サーバー停止' }, { t: 25.5, name: '部長は' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const STEPS = [[2.6, 15], [5.4, 45], [6.8, 90], [8.2, 135], [10.4, 180], [12.2, 270], [13.8, 360]];
    const ROLL = [15.4, 20.0], SORRY2 = 23.2;
    const angleAt = (t) => {
      let a = 0, prev = 0;
      STEPS.forEach(([s, v]) => { if (t >= s) { prev = a; a = v; } });
      const cur = STEPS.filter(([s]) => s <= t).pop();
      if (!cur) return 0;
      return lerp(prev, cur[1], ease.out(prog(t, cur[0], cur[0] + 0.3)));
    };
    const shown = (t) => {
      if (t >= ROLL[0] && t < 20.5) return 360 + Math.floor(((t - ROLL[0]) * 2.2)) * 360;
      if (t >= 20.5 && t < SORRY2) return 3240;
      if (t >= SORRY2) return 3240 + Math.round(45 * ease.out(prog(t, SORRY2, SORRY2 + 0.3)));
      return Math.round(angleAt(t));
    };
    const rad = (d) => (d * Math.PI) / 180;

    let A, BOSS, M1;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      const staff = [[0.4, -2.6, CAST.M2], [3.8, -2.6, CAST.NEW], [-3.2, -2.6, CAST.M3]].map(([x, z, look]) => workstation(S, x, z, look));
      const cp = copier(S, -7.4, -2.4, Math.PI / 2);
      M1 = addChar(S, CAST.M1, [-2.4, 0, 1.2], 1.2);
      A = addChar(S, CAST.A, [-1.0, 0, 1.0], -0.9);
      BOSS = addChar(S, CAST.BOSS, [5.2, 0, 0.4], -0.6);
      const rackMat = solid('#20242c');
      const LED = { green: new T.MeshBasicMaterial({ color: '#4cd964' }), red: new T.MeshBasicMaterial({ color: '#e8483b' }), dark: new T.MeshBasicMaterial({ color: '#5a1008' }) };
      const racks = [6.4, 7.6].map((x) => { const g = group(S, [x, 0, -4.8]); box(g, [1.0, 2.6, 1.0], [0, 1.3, 0], rackMat); return Array.from({ length: 6 }, (_, i) => box(g, [0.5, 0.06, 0.02], [0, 0.5 + i * 0.35, 0.51], new T.MeshBasicMaterial({ color: '#4cd964' }), { cast: false })); });
      const cable = box(S, [0.06, 0.04, 5.4], [6.2, 0.02, -2.0], solid('#1d2333'), { cast: false });
      const crack = P.crackDecal(S, -1.0, 0, 1.75, 0.3);
      const coffee = box(S, [0.6, 0.02, 0.4], [3.8, 0.84, -2.2], solid('#6b3e1f'), { cast: false });
      const update = (lt, t) => {
        crack.visible = t >= STEPS[4][0] && t < STEPS[6][0];
        coffee.visible = t >= STEPS[3][0] && t < 15;
        reset(A);
        if (t < ROLL[0]) {
          A.root.position.set(-1.0, 0, 1.0); A.root.rotation.y = -0.9;
          if (t >= 4.5) A.root.rotation.y = 0.15;
          const ang = angleAt(t);
          if (t >= STEPS[6][0]) {
            const u = prog(t, STEPS[6][0] - 0.05, STEPS[6][0] + 0.55);
            A.root.position.y = Math.sin(u * Math.PI) * 1.2;
            A.root.rotation.x = u * Math.PI * 2;
            A.setFace(u >= 1 ? 'happy' : 'shock');
          } else {
            bend(A, rad(ang));
            A.armL.rotation.x += 0.2; A.armR.rotation.x += 0.2;
            A.setFace(ang >= 180 ? 'shock' : 'sleepy');
            if (ang >= 180 && ang < 271) A.root.position.y = 0;
          }
        } else if (t < 20.5) {
          const u = t - ROLL[0];
          const path = [[-6.0, 1.6], [6.0, 1.6]];
          const k = (Math.sin(u * 1.1 - Math.PI / 2) + 1) / 2;
          const e = new T.Euler(u * 14, Math.PI / 2, 0);
          const off = V3(0, 0.8, 0).applyEuler(e);
          A.root.rotation.copy(e);
          A.root.position.set(lerp(path[0][0], path[1][0], k) - off.x, 0.62 - off.y, 1.6 - off.z);
          bend(A, 0.9);
          A.armL.rotation.x = A.armR.rotation.x = -1.2; A.legL.rotation.x = A.legR.rotation.x = -1.6;
          A.setFace('happy');
        } else {
          A.root.position.set(4.0, 0, 1.4); A.root.rotation.y = -0.6;
          const d = t >= SORRY2 ? 45 * ease.out(prog(t, SORRY2, SORRY2 + 0.3)) : 0;
          bend(A, rad(d)); A.setFace(t >= SORRY2 ? 'sleepy' : 'shock');
        }
        reset(M1);
        M1.root.visible = t < 4.5;
        if (t > 2.0) M1.setFace('shock');
        staff.forEach((c, i) => {
          working(c, t, i, 14);
          if (t >= ROLL[0] && t < 20.5) { reset(c); sit(c); c.setFace('happy'); c.armL.rotation.x = c.armR.rotation.x = -1.3 + Math.sin(t * 18 + i) * 0.3; c.armL.rotation.z = 0.3; c.armR.rotation.z = -0.3; }
          if (t >= 21.0 && t < 25.5) { c.setFace('shock'); c.head.rotation.y = -0.6; c.armL.rotation.x = c.armR.rotation.x = -0.4; }
          if (i === 1 && t >= STEPS[3][0] && t < 9.5) c.setFace('shock');
        });
        cp.scan(t, 6.4, 0.4);
        reset(BOSS);
        BOSS.root.visible = t >= 20.5;
        if (t < 21.2) { const u = prog(t, 20.5, 21.2); BOSS.root.position.set(lerp(4.0, 6.0, u), 0, lerp(1.8, -1.2, u)); BOSS.root.rotation.y = Math.PI * 0.85; walk(BOSS, t * 12, 0.45); }
        else {
          const fall = prog(t, 21.2, 21.4);
          BOSS.root.position.set(6.0, 0, -1.2); BOSS.root.rotation.y = -0.4;
          if (t < 22.0) { BOSS.root.rotation.x = -0.3 * Math.sin(fall * Math.PI); BOSS.setFace('shock'); }
          else BOSS.setFace('normal');
        }
        const down = t >= 21.3 && t < 30;
        racks.forEach((leds) => leds.forEach((m, i) => { m.material = down ? (Math.floor(t * 4 + i) % 2 ? LED.red : LED.dark) : LED.green; }));
        cable.visible = !down || Math.floor(t * 8) % 2 === 0;
      };
      const cams = [
        [0, 4.5, camPath([2.4, 3.2, 6.6], [2.0, 3.0, 5.8], [-1.6, 1.0, 1.0], [-1.4, 1.0, 1.0], 40, 4.5)],
        [4.5, 9.5, camPath([3.2, 2.6, 6.4], [2.8, 2.4, 5.6], [-0.8, 0.9, 0.8], [-0.8, 0.9, 0.8], 40, 5)],
        [9.5, 15, camPath([3.0, 2.2, 6.0], [2.6, 2.0, 5.2], [-0.8, 0.8, 0.9], [-0.8, 0.9, 0.9], 40, 5.5)],
        [15, 20.5, camPath([0.0, 4.6, 11.0], [0.0, 4.4, 10.4], [0, 1.0, -0.6], [0, 1.0, -0.6], 44, 5.5)],
        [20.5, 25.5, camPath([1.6, 3.8, 8.6], [1.2, 3.6, 7.8], [5.0, 1.2, -1.6], [5.0, 1.3, -1.6], 42, 5)],
        [25.5, 30.01, camPath([6.8, 2.6, 6.2], [6.4, 2.4, 5.4], [5.0, 1.1, -0.1], [5.0, 1.1, -0.1], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt), shake: (lt) => impact(lt + a, [STEPS[4][0], 21.3], 0.08) }));
    }

    const sorry = (t0, t1, text) => ({ type: 'bubble', t0, t1, text, scene: 'office', anchor: headTop(A, 0.9) });
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも「すみません」と言うたびに、おじぎが深くなったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 2.6, t1: 30.1, label: '社員Aのおじぎ', value: shown, format: (n) => `${n.toLocaleString('ja-JP')}度`, done: (t) => t >= STEPS[6][0] && t < 20.5 },
      sorry(2.1, 3.6, 'あ、すみません'),
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '謝るたびに、', at: 4.65, cps: 16 },
        { text: 'おじぎが深くなる', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      sorry(4.9, 5.9, '遅刻してすみません'),
      sorry(6.3, 7.3, 'コピー機つまらせてすみません'),
      sorry(7.7, 9.4, 'コーヒーこぼしてすみません！'),
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '180度で床に刺さり、', at: 10.5, cps: 18 },
        { text: '360度で一回転', at: STEPS[6][0], cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: STEPS[4][0], t1: STEPS[4][0] + 0.8, text: 'ズボッ', x: 760, y: 420, rot: 7, size: 56, shake: true },
      { type: 'fx', t0: STEPS[6][0] + 0.2, t1: STEPS[6][0] + 1.0, text: 'くるんっ', x: 760, y: 220, rot: -7, size: 56 },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '謝りすぎた社員Aは、', at: 15.15, cps: 18 },
        { text: '転がって移動する', at: 16.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 16.2, t1: 20.2, text: 'ゴロゴロゴロ', x: 900, y: 250, rot: -5, size: 50, shake: true },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '部長がサーバーを止めても、', at: 21.6, cps: 18 },
        { text: '謝るのは社員A', at: SORRY2 + 0.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.3, t1: 22.2, text: 'ブチッ', x: 860, y: 360, rot: 7, size: 54, shake: true },
      { type: 'bubble', t0: 22.2, t1: SORRY2, text: 'あ', scene: 'office', anchor: headTop(BOSS, 0.9) },
      sorry(SORRY2, 25.4, '部長のかわりに、すみません'),
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも部長のおじぎは、0度。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '謝るほどおじぎが深くなる会社', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'bubble', t0: 26.2, t1: 28.2, text: 'まあ、そういう日もある', scene: 'office', anchor: headTop(BOSS, 0.9) },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #14　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({ prog: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'Am', 'Em', 'F', 'G', 'Dm', 'G', 'F', 'C'], arp: [8, 9, 10] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    STEPS.forEach(([t], i) => add(i === 4 ? S_.stomp(t) : i === 6 ? S_.jingle(t) : S_.pop(t, i * 2)));
    for (let t = ROLL[0]; t < 20.3; t += 0.45) add(S_.step(t));
    add(S_.cheer(16.0));
    add(S_.error(21.3)); add(S_.buzzer(21.6));
    add(S_.pop(SORRY2, 2));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
