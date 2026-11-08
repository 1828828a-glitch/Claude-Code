/* ep23 — もしも「了解です」と言うたびに、小さくなったら（30秒） */
EPISODES.push({
  id: 'ep23',
  no: 23,
  short: '了解で縮む',
  title: 'もしも「了解です」と言うたびに、小さくなったら',
  lead: '頼まれるたびに「了解です」。そのたびに社員Aは小さくなり、キーボードの上で仕事をし、マウスに乗って移動する。部長は虫めがねで社員Aを探す。',
  duration: 30,
  poster: 12.6,
  chapters: [
    { t: 0, name: '了解です' }, { t: 4.5, name: '縮む' }, { t: 9.5, name: 'キーボード' },
    { t: 15, name: 'マウス' }, { t: 20.5, name: '虫めがね' }, { t: 25.5, name: 'それでも' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const OK = [2.6, 5.4, 6.4, 7.4, 8.4, 26.8];
    const scaleAt = (t) => { let s = 1; OK.forEach((o, i) => { if (t >= o) s = lerp(s, s * (i === OK.length - 1 ? 0.4 : 0.6), ease.out(prog(t, o, o + 0.25))); }); return s; };
    const DESK = [-1.0, -2.6], TOP = 0.86;

    let A, BOSS, M1, M2;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      P.desk(S, DESK[0], DESK[1], { w: 2.4 }); P.chair(S, DESK[0], DESK[1] - 0.95);
      const kb = group(S, [DESK[0], 0.82, DESK[1] + 0.1]);
      box(kb, [1.0, 0.05, 0.36], [0, 0.025, 0], solid('#2b3140'));
      const keys = []; for (let i = 0; i < 12; i++) keys.push(box(kb, [0.12, 0.04, 0.1], [-0.42 + (i % 6) * 0.17, 0.06, -0.08 + Math.floor(i / 6) * 0.16], solid('#e8ecef'), { cast: false }));
      P.monitor(S, DESK[0], 0.82, DESK[1] - 0.3, 'code', 0);
      const mouse = group(S, [DESK[0] + 0.8, 0.82, DESK[1] + 0.15]);
      box(mouse, [0.16, 0.08, 0.24], [0, 0.04, 0], solid('#e8ecef')); box(mouse, [0.04, 0.02, 0.06], [0, 0.09, 0.06], solid('#9aa3ad'));
      const mug = group(S, [DESK[0] - 0.9, 0.82, DESK[1] + 0.2]); box(mug, [0.2, 0.24, 0.2], [0, 0.12, 0], solid('#f4f1ea'));
      M1 = workstation(S, 3.2, -2.6, CAST.M1); M2 = workstation(S, -5.0, -2.6, CAST.M2);
      A = addChar(S, CAST.A, [DESK[0], 0, DESK[1] - 0.95]);
      BOSS = addChar(S, CAST.BOSS, [1.6, 0, -0.6], -0.6);
      const glass = group(BOSS.armR, [0, -0.66, 0.2]);
      box(glass, [0.06, 0.4, 0.06], [0, -0.1, 0], solid('#6b4a2b'));
      [[0, 0.32, 0.5, 0.06], [0, -0.0, 0.5, 0.06], [-0.22, 0.16, 0.06, 0.38], [0.22, 0.16, 0.06, 0.38]].forEach(([x, y, w, h]) => box(glass, [w, h, 0.06], [x, y + 0.2, 0], solid('#2b3140')));
      box(glass, [0.4, 0.3, 0.02], [0, 0.36, 0], new T.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: 0.35 }), { cast: false });
      const update = (lt, t) => {
        const s = scaleAt(t);
        reset(A);
        A.root.scale.setScalar(s);
        if (t < 9.5) {
          if (s >= 0.5) { sit(A); typing(A, t); A.root.position.set(DESK[0], 0, DESK[1] - 0.95); }
          else { A.root.position.set(DESK[0] - 0.3, TOP, DESK[1] + 0.2); A.root.rotation.y = 0.2; A.setFace('shock'); }
        }
        else if (t < 15) {
          const k = Math.floor((t - 9.5) * 4) % 12;
          A.root.position.set(DESK[0] - 0.42 + (k % 6) * 0.17, TOP + 0.05 + Math.abs(Math.sin(t * 12.5)) * 0.08, DESK[1] + 0.02 + Math.floor(k / 6) * 0.16);
          A.root.rotation.y = 0.3; A.setFace('happy'); banzai(A, 0.4);
          keys.forEach((m, i) => { m.position.y = i === k ? 0.035 : 0.06; });
        } else if (t < 20.5) {
          const u = prog(t, 15.4, 19.8);
          const mx = DESK[0] + 0.8 + Math.sin(u * Math.PI * 2) * 0.9, mz = DESK[1] + 0.15 + (1 - Math.cos(u * Math.PI * 2)) * 0.25;
          mouse.position.set(mx, 0.82, mz); mouse.rotation.y = Math.cos(u * Math.PI * 2) * 1.2;
          A.root.position.set(mx, 0.94, mz); A.root.rotation.y = mouse.rotation.y; sit(A); A.armL.rotation.x = A.armR.rotation.x = -1.4; A.setFace('happy');
        } else {
          mouse.position.set(DESK[0] + 0.8, 0.82, DESK[1] + 0.15); mouse.rotation.y = 0;
          A.root.position.set(DESK[0] + 0.1, TOP, DESK[1] + 0.32); A.root.rotation.y = 0.2;
          A.setFace(t > 25.5 ? 'happy' : 'normal');
          if (t > 26.6 && t < 27.4) { A.armR.rotation.x = -2.8; }
        }
        [M1, M2].forEach((c, i) => { working(c, t, i, 14); if (t > 4.6 && t < 9.0 && Math.abs(t - [5.2, 6.2][i]) < 0.6) { c.head.rotation.y = i ? 0.9 : -0.9; c.armR.rotation.x = -2.0; } });
        reset(BOSS);
        glass.visible = t >= 20.5 && t < 25.5;
        if (t < 4.5) { BOSS.root.position.set(1.0, 0, -1.0); BOSS.root.rotation.y = -1.8; BOSS.armR.rotation.x = t > 1.4 && t < 2.6 ? -1.6 : 0; }
        else if (t < 20.5) { BOSS.root.position.set(1.4, 0, -0.4); BOSS.root.rotation.y = -1.4; BOSS.armR.rotation.x = Math.abs(t - 8.0) < 0.5 ? -1.6 : 0; }
        else if (t < 25.5) {
          const u = (t - 20.5) / 5;
          BOSS.root.position.set(DESK[0] + 0.8 - Math.sin(u * 5) * 0.8, 0, DESK[1] + 1.3); BOSS.root.rotation.y = Math.PI + Math.sin(u * 5) * 0.4;
          BOSS.armR.rotation.x = -1.8; BOSS.head.rotation.x = 0.5; BOSS.body.rotation.x = 0.3;
          BOSS.setFace(t > 24.2 ? 'shock' : 'normal');
        } else { BOSS.root.position.set(DESK[0] + 2.4, 0, DESK[1] + 0.6); BOSS.root.rotation.y = -Math.PI / 2 - 0.3; BOSS.head.rotation.x = 0.5; BOSS.armR.rotation.x = t > 26.0 && t < 26.8 ? -1.6 : 0; }
      };
      const cams = [
        [0, 4.5, camPath([-3.4, 2.6, 1.4], [-3.0, 2.4, 0.8], [-0.6, 1.0, -2.8], [-0.6, 1.0, -2.8], 40, 4.5)],
        [4.5, 9.5, camPath([1.6, 2.2, 0.8], [1.2, 1.9, 0.2], [-1.0, 0.9, -2.8], [-1.0, 0.9, -2.6], 40, 5)],
        [9.5, 15, camPath([0.0, 1.5, -1.2], [-0.2, 1.4, -1.5], [-1.0, 0.86, -2.5], [-1.0, 0.86, -2.5], 38, 5.5)],
        [15, 20.5, camPath([1.2, 1.7, -0.6], [1.0, 1.6, -0.9], [-0.4, 0.86, -2.4], [-0.2, 0.86, -2.4], 40, 5.5)],
        [20.5, 25.5, camPath([-3.6, 2.6, 0.6], [-3.2, 2.4, 0.2], [-0.4, 1.1, -2.2], [-0.4, 1.0, -2.2], 42, 5)],
        [25.5, 30.01, camPath([-2.2, 1.5, -0.8], [-1.9, 1.35, -1.2], [-0.9, 0.9, -2.3], [-0.9, 0.88, -2.3], 36, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const ok = (t, i) => ({ type: 'bubble', t0: t, t1: t + 0.8, text: '了解です', cls: 'small', scene: 'office', anchor: headTop(A, 1.0) });
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも「了解です」と言うたびに、小さくなったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '社員Aの身長', value: (t) => Math.round(1.74 * scaleAt(t) * 100) / 100, format: (v) => `${v.toFixed(2)}ブロック`, done: (t) => t >= 26.8 },
      { type: 'bubble', t0: 1.4, t1: 2.5, text: 'Aくん、これお願い', scene: 'office', anchor: headTop(BOSS) },
      ...OK.slice(0, 5).map((t, i) => ok(t, i)),
      { type: 'fx', t0: OK[0] + 0.1, t1: OK[0] + 0.8, text: 'シュン', x: 820, y: 320, rot: 6, size: 46 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '了解するたびに、', at: 4.65, cps: 18 },
        { text: '小さくなる', at: 5.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '社員Aは、', at: 9.65, cps: 16 },
        { text: 'キーボードの上で仕事', at: 10.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 10.6, t1: 14.6, text: 'カタッ　カタッ', x: 880, y: 300, rot: -5, size: 46 },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '移動は、', at: 15.15, cps: 16 },
        { text: 'マウスに乗って', at: 15.7, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '部長は、', at: 20.65, cps: 16 },
        { text: '虫めがねで探す', at: 21.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 21.6, t1: 24.0, text: 'Aくん、どこ？', scene: 'office', anchor: headTop(BOSS) },
      { type: 'bubble', t0: 26.0, t1: 26.8, text: 'Aくん、これも', scene: 'office', anchor: headTop(BOSS) },
      { type: 'bubble', t0: OK[5], t1: OK[5] + 1.0, text: '了解です', cls: 'small', scene: 'office', anchor: headTop(A, 1.0) },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも返事は、「了解です」。', at: 27.6, cps: 16, cls: 'mark-soft' },
        { text: '了解するたびに小さくなる会社', at: 28.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.9, t1: 30.1, text: 'もしもブロック劇場 #23　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const shrink = (t) => [AUDIO.tone(t, 900, 0.3, { wave: 'pulse25', f2: 300, gain: 0.06 })];
    const audio = AUDIO.music({ prog: ['F', 'C', 'G', 'C', 'F', 'C', 'Dm', 'G', 'C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C'], arp: [4, 5, 10, 11] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    OK.forEach((t) => add(shrink(t + 0.1)));
    for (let t = 10.0; t < 14.8; t += 0.25) add(S_.tick(t, 0));
    add([AUDIO.tone(15.4, 140, 4.4, { type: 'triangle', gain: 0.04 })]);
    add(S_.pop(28.9, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
