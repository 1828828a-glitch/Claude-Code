/* ep08 — もしも社員の「やる気」が、頭の上のゲージで見えたら（30秒） */
EPISODES.push({
  id: 'ep08',
  no: 8,
  short: 'やる気ゲージ',
  title: 'もしも社員の「やる気」が、頭の上のゲージで見えたら',
  lead: '月曜9時のやる気は3%。コーヒーで少し回復し、部長の「ちょっといい？」で全員ゼロ、昼ごはんで満タン、定時前には限界突破。',
  duration: 30,
  poster: 22.6,
  chapters: [
    { t: 0, name: '月曜9時' }, { t: 4.5, name: 'コーヒー' }, { t: 9.5, name: 'ちょっといい？' },
    { t: 15, name: '昼ごはん' }, { t: 20.5, name: '定時前' }, { t: 25.5, name: '翌週' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const SIP = [5.4, 7.6], DRAIN = 11.9, LUNCH = [15.8, 17.6], OVER = [21.4, 24.0], BELL = 24.5;
    const BASE = [0.03, 0.18, 0.12, 0.22, 0.15], FULL = [1.0, 0.9, 0.85, 1.0, 0.95], MAX = [3.0, 2.4, 2.7, 2.2, 2.9];
    const level = (i, t) => {
      if (t >= 25.5) return 0;
      let v = BASE[i];
      if (i === 0) SIP.forEach((s, k) => { v += (k ? 0.25 : 0.3) * ease.out(prog(t, s, s + 0.5)); });
      else v += 0.06 * prog(t, 4.5, 9.5) + (i === 1 ? 0.3 * ease.out(prog(t, 6.5, 7.0)) : 0);
      v *= 1 - ease.in(prog(t, DRAIN, DRAIN + 0.3));
      v = lerp(v, FULL[i], ease.inOut(prog(t, LUNCH[0] + i * 0.15, LUNCH[1] + i * 0.15)));
      v = lerp(v, MAX[i], ease.in(prog(t, OVER[0] + i * 0.2, OVER[1])));
      return v;
    };

    let staff, BOSS;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      P.plant(S, -8.6, -5.3); P.shelf(S, 7.6, -5.7);
      const clock = P.wallClock(S, [5.4, 3.2, -5.9], 1.0);
      const calFace = faces(solid('#d24b4b'), { front: P.glow(textTex('月', { w: 128, h: 128, size: 84, bg: '#ffffff', fg: '#1d2333' })) });
      box(S, [0.8, 0.9, 0.06], [-6.4, 3.0, -5.94], calFace);
      const seats = [[-3, -2.5, CAST.A], [0.5, -2.5, CAST.M1], [4, -2.5, CAST.M2], [-1.2, 0.8, CAST.M3], [2.4, 0.8, CAST.NEW]];
      staff = seats.map(([x, z, look]) => workstation(S, x, z, look));
      BOSS = addChar(S, CAST.BOSS, [9.5, 0, 2.0], -Math.PI / 2);
      const mugA = group(staff[0].armR, [0, -0.66, 0.12]); box(mugA, [0.2, 0.24, 0.2], [0, 0, 0], solid('#f4f1ea'));
      const mugM = group(staff[1].armR, [0, -0.66, 0.12]); box(mugM, [0.2, 0.24, 0.2], [0, 0, 0], solid('#2fa59b'));
      const bentos = seats.map(([x, z]) => {
        const g = group(S, [x + 0.45, 0.82, z + 0.1]);
        box(g, [0.5, 0.14, 0.36], [0, 0.07, 0], solid('#1d2333'));
        box(g, [0.22, 0.04, 0.3], [-0.12, 0.15, 0], solid('#ffffff'), { cast: false });
        box(g, [0.1, 0.05, 0.1], [0.1, 0.15, -0.06], solid('#d24b4b'), { cast: false });
        box(g, [0.12, 0.05, 0.12], [0.12, 0.15, 0.08], solid('#f2c230'), { cast: false });
        const lid = box(g, [0.52, 0.04, 0.38], [0, 0.17, 0], solid('#d24b4b'));
        return { g, lid };
      });
      const gauges = staff.map(() => {
        const g = group(S);
        box(g, [1.32, 0.28, 0.06], [0, 0, 0], solid('#1d2333', { emissive: '#1d2333' }), { cast: false });
        const fill = box(g, [1.2, 0.17, 0.1], [0, 0, 0.01], new T.MeshBasicMaterial({ color: '#4cd964' }), { cast: false });
        return { g, fill };
      });
      const update = (lt, t) => {
        clock.set(t < 9.5 ? 9 + t * 0.06 : t < 15 ? 10.5 : t < 20.5 ? 12.1 : t < 25.5 ? 17 + 55 / 60 + (5 / 60) * prog(t, 20.6, BELL) : 9);
        staff.forEach((c, i) => {
          working(c, t, i, 14);
          const v = level(i, t);
          if (v < 0.1) { c.setFace('sleepy'); c.head.rotation.x = 0.25; }
          if (i === 0 && t >= 5.0 && t < 8.5) {
            const drink = SIP.some((s) => t > s - 0.3 && t < s + 0.5);
            c.armR.rotation.x = drink ? -2.4 : -1.3; c.armR.rotation.z = drink ? -0.45 : -0.2;
            if (t > SIP[0] + 0.3) c.setFace('happy');
          }
          if (i === 1 && t > 6.2 && t < 7.2) { c.armR.rotation.x = -2.4; c.armR.rotation.z = -0.45; }
          if (t >= DRAIN && t < 15) { c.setFace('sleepy'); c.head.rotation.x = 0.35; c.body.rotation.x = 0.15; c.armL.rotation.x = c.armR.rotation.x = -0.4; }
          if (t >= 15 && t < 20.5) { c.armR.rotation.x = -1.3 + Math.sin(t * 9 + i) * 0.35; c.armL.rotation.x = -1.0; if (t > LUNCH[0] + 0.6) c.setFace('happy'); }
          if (t >= OVER[0] && t < 25.5) { c.setFace('happy'); c.armL.rotation.x = c.armR.rotation.x = -1.2 + Math.sin(t * 40 + i) * 0.2; }
          if (t >= BELL && t < 25.5) { reset(c); c.setFace('happy'); banzai(c, 1, Math.sin(t * 10 + i) * 0.15); c.root.position.y = Math.abs(Math.sin(t * 7 + i)) * 0.2; }
          const head = c.head.localToWorld(V3(0, 1.05, 0));
          const gg = gauges[i];
          gg.g.position.copy(head);
          const show = Math.max(0.02, v);
          gg.fill.scale.x = show;
          gg.fill.position.x = -0.6 + 0.6 * show;
          gg.fill.material.color.set(v > 1 ? '#38d6ff' : v < 0.3 ? '#e8483b' : v < 0.7 ? '#f2c230' : '#4cd964');
          gg.fill.visible = !(v < 0.08 && Math.floor(t * 4) % 2);
        });
        mugA.visible = t >= 5.0 && t < 8.5;
        mugM.visible = t >= 6.0 && t < 7.4;
        bentos.forEach((b, i) => { b.g.visible = t >= 15 && t < 20.5; b.lid.position.y = 0.17 + ease.out(prog(t, LUNCH[0] - 0.2 + i * 0.1, LUNCH[0] + 0.1 + i * 0.1)) * 0.35; b.lid.rotation.x = -0.9 * prog(t, LUNCH[0] - 0.2 + i * 0.1, LUNCH[0] + 0.1 + i * 0.1); });
        reset(BOSS);
        BOSS.root.visible = t >= 9.5 && t < 15;
        const u = prog(t, 9.7, 10.5);
        BOSS.root.position.set(lerp(9.5, 6.4, u), 0, 2.0);
        if (u > 0 && u < 1) walk(BOSS, t * 12, 0.45); else if (u >= 1) { BOSS.root.rotation.y = -0.8; BOSS.setFace('happy'); BOSS.armR.rotation.z = t < DRAIN ? 2.4 : 0; }
      };
      const cams = [
        [0, 4.5, camPath([-5.8, 3.8, 2.8], [-5.6, 3.6, 2.0], [-2.8, 1.9, -3.2], [-2.9, 2.0, -3.2], 40, 4.5)],
        [4.5, 9.5, camPath([-5.0, 3.1, 0.8], [-4.8, 3.0, 0.2], [-3.0, 2.0, -3.4], [-3.0, 2.1, -3.4], 40, 5)],
        [9.5, 15, camPath([6.8, 5.2, 11.2], [6.2, 5.0, 10.4], [1.0, 1.9, -1.0], [1.0, 1.9, -1.2], 40, 5.5)],
        [15, 20.5, camPath([3.6, 4.8, 9.2], [3.2, 4.5, 8.4], [0.4, 1.9, -1.6], [0.4, 2.0, -1.6], 40, 5.5)],
        [20.5, 25.5, camPath([5.0, 5.6, 11.6], [4.4, 5.4, 10.8], [0.8, 2.2, -1.4], [0.8, 2.3, -1.4], 42, 5)],
        [25.5, 30.01, camPath([-5.8, 3.8, 3.0], [-5.6, 3.6, 2.2], [-2.6, 2.0, -3.0], [-2.7, 2.0, -3.0], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const A = staff[0];
    const pct = (t) => Math.round(level(0, t) * 100);
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも社員の「やる気」が、頭の上のゲージで見えたら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜9時', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '社員Aのやる気', value: pct, format: (n) => `${n}%`, done: (t) => t >= OVER[0] + 0.5 && t < 25.5 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: 'コーヒーを飲むと、', at: 4.65, cps: 18 },
        { text: 'ちょっと回復', at: SIP[0] + 0.2, cps: 16, cls: 'mark' },
      ] },
      ...SIP.map((s, k) => ({ type: 'float', t0: s + 0.1, t1: s + 1.0, text: k ? '+25%' : '+30%', scene: 'office', anchor: headTop(A, 1.3) })),
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '部長の「ちょっといい？」で、', at: 9.65, cps: 18 },
        { text: '全員ゼロになる', at: DRAIN + 0.1, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 10.6, t1: DRAIN, text: 'みんな、ちょっといい？', scene: 'office', anchor: headTop(BOSS) },
      { type: 'fx', t0: DRAIN, t1: DRAIN + 0.9, text: 'シュン…', x: 640, y: 210, rot: -4, size: 56 },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '昼ごはんで、', at: 15.15, cps: 16 },
        { text: '満タンまで回復', at: 16.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: 17.8, t1: CUTS[3], text: '本日の日替わり：からあげ弁当' },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '定時5分前、', at: 20.65, cps: 16 },
        { text: 'やる気が限界突破', at: OVER[0] + 0.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: OVER[0] + 0.3, t1: OVER[1], text: 'ギュイーン', x: 900, y: 250, rot: 6, size: 56, shake: true },
      { type: 'tag', t0: BELL, t1: CUTS[4], text: '18:00 定時' },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも月曜の朝は、全員ゼロから。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: 'やる気が見える会社、翌週の月曜', at: 27.4, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #08　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const heal = (t) => ['C5', 'E5', 'G5', 'C6'].map((n, i) => AUDIO.tone(t + i * 0.06, n, 0.14, { wave: 'pulse25', gain: 0.06, decay: true }));
    const drain = (t) => [AUDIO.tone(t, 900, 0.5, { type: 'square', f2: 90, gain: 0.07 })];
    const audio = AUDIO.music({ prog: ['Am', 'Am', 'F', 'G', 'C', 'G', 'F', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Am', 'C'], arp: [11, 12] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    SIP.forEach((t) => add(heal(t)));
    add(heal(6.6));
    add(drain(DRAIN));
    for (let i = 0; i < 5; i++) add(heal(LUNCH[0] + 0.6 + i * 0.25));
    add([AUDIO.tone(OVER[0], 200, OVER[1] - OVER[0], { wave: 'pulse25', f2: 1600, gain: 0.05 })]);
    add(S_.chime(BELL)); add(S_.cheer(BELL + 0.2));
    add(drain(25.6));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
