/* ep28 — もしも会社の窓が、行きたい場所につながったら（30秒） */
EPISODES.push({
  id: 'ep28',
  no: 28,
  short: '行きたい場所の窓',
  title: 'もしも会社の窓が、行きたい場所につながったら',
  lead: '「海に行きたい」と言えば窓の外は海、「山」なら雪山、「宇宙」なら星空。社員Aは窓から海へ、部長はゴルフ場へ。社長のひと言で、窓はぜんぶ会社にもどった。',
  duration: 30,
  poster: 12.2,
  chapters: [
    { t: 0, name: '海' }, { t: 4.5, name: '山と宇宙' }, { t: 9.5, name: '窓から海へ' },
    { t: 15, name: 'ゴルフ場' }, { t: 20.5, name: '社長' }, { t: 25.5, name: '見るだけ' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const WX = [-6, -1, 4];
    const SW = { beach: 2.6, mount: 5.4, space: 7.4, golf: 15.8, office: 22.0, back: 25.5 };
    const viewOf = (w, t) => {
      if (t >= SW.back) return 'plain';
      if (t >= SW.office) return 'office';
      if (w === 0) return t >= SW.beach ? 'beach' : 'plain';
      if (w === 1) return t >= SW.golf ? 'golf' : t >= SW.mount ? 'mount' : 'plain';
      return t >= SW.space ? 'space' : 'plain';
    };
    const LABEL = { plain: '駐車場', beach: '海', mount: '雪山', space: '宇宙', golf: 'ゴルフ場', office: '会社' };
    const counterView = (t) => (t < SW.mount ? viewOf(0, t) : t < SW.space ? 'mount' : t < SW.golf ? 'space' : t < SW.office ? 'golf' : t < SW.back ? 'office' : 'plain');

    let A, BOSS, M1, M2, CEO;
    {
      const S = newScene({ sky: SKY_DAY });
      const holes = [];
      WX.forEach((x) => [x - 1, x].forEach((hx) => [2, 3].forEach((y) => holes.push([hx, y]))));
      P.officeRoom(S, { windows: [], wallHoles: holes, leftWindows: [] });
      const worlds = WX.map((x) => {
        const mk = () => group(S, [x, 0, -7]);
        const w = {};
        w.plain = mk(); box(w.plain, [6, 0.4, 6], [0, 1.0, -3.5], solid('#8a8f98')); [[-1.2, '#d24b4b'], [1.0, '#2f62d6']].forEach(([cx, c]) => box(w.plain, [1.0, 0.5, 0.6], [cx, 1.45, -3.5], solid(c)));
        w.beach = mk(); w.beach.position.y = 0.7; box(w.beach, [6, 0.4, 3], [0, 1.0, -2], blockMat('sand')); box(w.beach, [8, 0.3, 4], [0, 0.9, -5.4], blockMat('water')); box(w.beach, [1.2, 1.2, 0.3], [1.6, 4.6, -7.4], new T.MeshBasicMaterial({ color: '#ffd84a' }));
        for (let i = 0; i < 4; i++) box(w.beach, [0.24, 0.5, 0.24], [-1.6 + i * 0.05, 1.45 + i * 0.5, -2.2], solid('#8b5e34'));
        box(w.beach, [1.4, 0.12, 1.4], [-1.5, 3.4, -2.2], solid('#3f9b4b'));
        w.mount = mk(); box(w.mount, [6, 0.4, 6], [0, 1.0, -3], solid('#4fb35a'));
        [[-1.2, 2.6], [0.8, 3.4], [2.0, 2.0]].forEach(([mx, h]) => { for (let k = 0; k < 4; k++) box(w.mount, [2.2 - k * 0.5, h / 4, 1.6], [mx, 1.2 + (k + 0.5) * h / 4, -5.4], solid(k === 3 ? '#ffffff' : '#7a828c')); });
        w.space = mk(); box(w.space, [7, 6, 0.4], [0, 3, -6], new T.MeshBasicMaterial({ color: '#0b1030' }));
        const r = mulberry32(x + 50); for (let i = 0; i < 22; i++) box(w.space, [0.08, 0.08, 0.08], [(r() - 0.5) * 6, 1 + r() * 4.5, -5.7], new T.MeshBasicMaterial({ color: '#ffffff' }), { cast: false });
        box(w.space, [1.4, 1.4, 1.4], [0.8, 3.2, -5.0], faces(solid('#2f7fe0', { emissive: '#103060' }), { top: solid('#4fb35a') })); box(w.space, [0.5, 0.5, 0.5], [-1.4, 4.0, -5.2], new T.MeshBasicMaterial({ color: '#d9d9d9' }));
        w.golf = mk(); box(w.golf, [6, 0.4, 6], [0, 1.0, -3], solid('#5cc466')); box(w.golf, [1.6, 0.41, 1.0], [-1.2, 1.0, -2.4], blockMat('sand')); box(w.golf, [0.06, 2.0, 0.06], [1.4, 2.2, -4.0], solid('#ffffff')); box(w.golf, [0.6, 0.36, 0.04], [1.7, 3.0, -4.0], solid('#d24b4b'));
        w.office = mk(); box(w.office, [6, 0.4, 6], [0, 1.0, -3], blockMat('carpet')); box(w.office, [6, 5, 0.3], [0, 3, -5.8], blockMat('wall'));
        [[-1.2], [1.2]].forEach(([dx]) => { P.desk(w.office, dx, -3.5); P.laptop(w.office, dx, 0.82, -3.6); });
        w.office.children.forEach((c) => { if (c.isGroup) c.position.y += 1.2; });
        return w;
      });
      const seats = [[-6, -2.6, CAST.A], [-1, -2.6, CAST.M1], [4, -2.6, CAST.M2]];
      [A, M1, M2] = seats.map(([x, z, look]) => workstation(S, x, z, look));
      BOSS = addChar(S, CAST.BOSS, [7.2, 0, 1.4], -1.0);
      CEO = addChar(S, CAST.CEO, [9.5, 0, 1.6], -Math.PI / 2);
      const club = group(BOSS.armR, [0, -0.66, 0.1]); box(club, [0.05, 0.9, 0.05], [0, -0.4, 0], solid('#c3c9d0')); box(club, [0.2, 0.1, 0.12], [0.06, -0.85, 0], solid('#2b3140'));
      const sparkles = Array.from({ length: 12 }, () => box(S, [0.12, 0.12, 0.12], [0, -99, 0], new T.MeshBasicMaterial({ color: '#fff3a0' }), { cast: false }));
      const update = (lt, t) => {
        worlds.forEach((w, i) => { const v = viewOf(i, t); Object.keys(w).forEach((k) => { w[k].visible = k === v; }); });
        const switchT = [[SW.beach, 0], [SW.mount, 1], [SW.space, 2], [SW.golf, 1]].concat(t >= SW.office ? [[SW.office, 0], [SW.office, 1], [SW.office, 2]] : []);
        sparkles.forEach((m, i) => {
          const hit = switchT.filter(([st]) => t >= st && t < st + 0.6)[i % 3] || switchT.find(([st]) => t >= st && t < st + 0.6);
          m.visible = !!hit; if (!hit) return;
          const u = prog(t, hit[0], hit[0] + 0.6), a = (i / 12) * Math.PI * 2;
          m.position.set(WX[hit[1]] + Math.cos(a) * (0.6 + u * 0.8), 3 + Math.sin(a) * (0.6 + u * 0.8), -5.8); m.scale.setScalar(1 - u);
        });
        [M1, M2].forEach((c, i) => { working(c, t, i + 1, 14); if (t >= SW.mount + i * 2 - 0.8 && t < 9.5) { c.head.rotation.y = 0; c.head.rotation.x = -0.3; c.setFace('happy'); } });
        reset(A);
        if (t < 9.5) { sit(A); typing(A, t, 12, 0.08); A.setFace(t > SW.beach ? 'happy' : 'sleepy'); if (t > SW.beach) { A.head.rotation.x = -0.3; } }
        else if (t < SW.office) {
          const u = prog(t, 9.8, 11.4);
          if (u < 1) { A.root.position.set(-6.0, lerp(0, 2.2, ease.in(prog(t, 10.8, 11.4))), lerp(-3.55, -6.6, prog(t, 9.8, 11.4))); A.root.rotation.y = Math.PI; walk(A, t * 14, 0.6); if (t > 10.8) banzai(A, 1); }
          else { A.root.rotation.order = 'YXZ'; A.root.position.set(-6.4, 2.08, -9.4); A.root.rotation.set(-Math.PI / 2 * 0.7, 0, 0); A.setFace('shades'); A.armL.rotation.z = -2.6; A.armR.rotation.z = 2.6; }
        } else if (t < SW.back) {
          const u = prog(t, SW.office, SW.office + 0.6);
          A.root.rotation.order = 'XYZ';
          A.root.position.set(-6.0, Math.max(0, 2.0 + Math.sin(u * Math.PI) * 0.6 - u * 2.0), lerp(-6.6, -5.0, u)); A.root.rotation.x = u < 1 ? u * 4 : 0; A.setFace('shock');
          if (u >= 1) { A.root.position.y = 0; A.root.rotation.x = 0; }
        } else { A.root.rotation.order = 'XYZ'; sit(A); typing(A, t, 10, 0.06); A.setFace('sleepy'); A.head.rotation.x = -0.25; }
        reset(BOSS); club.visible = t >= 15 && t < SW.back;
        if (t < 15) { BOSS.root.position.set(7.2, 0, 1.4); BOSS.setFace(t > 11 ? 'shock' : 'normal'); if (t > 11) BOSS.head.rotation.y = 0.6; }
        else if (t < SW.office) {
          const u = prog(t, 16.0, 17.6);
          if (u < 1) { BOSS.root.position.set(lerp(7.2, -1.0, u), lerp(0, 2.2, ease.in(prog(t, 17.0, 17.6))), lerp(1.4, -6.6, u)); BOSS.root.rotation.y = Math.atan2(-8.2, -8.0); walk(BOSS, t * 12, 0.45); }
          else { BOSS.root.position.set(-0.6, 1.2, -9.6); BOSS.root.rotation.y = -0.4; BOSS.setFace('happy'); const sw = (t * 0.8) % 1; BOSS.armR.rotation.x = sw < 0.7 ? -2.6 * (sw / 0.7) : -2.6 + (sw - 0.7) / 0.3 * 3.0; BOSS.armR.rotation.z = -0.3; }
        } else if (t < SW.back) {
          const u = prog(t, SW.office, SW.office + 0.6);
          BOSS.root.position.set(-1.0, Math.max(0, 2.0 + Math.sin(u * Math.PI) * 0.6 - u * 2.0), lerp(-6.6, -5.0, u)); BOSS.root.rotation.x = u < 1 ? -u * 4 : 0; BOSS.setFace('shock');
        } else { BOSS.root.position.set(7.2, 0, 1.4); BOSS.setFace('sleepy'); }
        reset(CEO);
        CEO.root.visible = t >= 20.5 && t < SW.back;
        const cu = prog(t, 20.6, 21.6);
        CEO.root.position.set(lerp(9.5, 5.0, cu), 0, 1.6); if (cu < 1) walk(CEO, t * 10, 0.4); else CEO.root.rotation.y = -2.4;
      };
      const cams = [
        [0, 4.5, camPath([-2.8, 3.4, 4.6], [-3.2, 3.2, 3.8], [-5.6, 2.4, -5.0], [-5.6, 2.6, -5.4], 42, 4.5)],
        [4.5, 9.5, camPath([0.0, 3.6, 7.6], [0.4, 3.4, 7.0], [-1.0, 2.6, -5.6], [0.0, 2.6, -5.6], 44, 5)],
        [9.5, 15, camPath([-4.6, 3.4, 3.0], [-5.2, 3.2, 1.6], [-6.0, 2.4, -6.4], [-6.0, 2.2, -7.0], 42, 5.5)],
        [15, 20.5, camPath([1.8, 3.4, 3.4], [1.2, 3.2, 2.0], [-0.8, 2.4, -6.4], [-0.8, 2.2, -7.0], 42, 5.5)],
        [20.5, 25.5, camPath([3.6, 4.4, 8.8], [3.0, 4.0, 8.0], [-0.6, 2.0, -4.0], [-0.6, 1.6, -3.6], 44, 5)],
        [25.5, 30.01, camPath([-3.0, 3.0, 3.4], [-3.4, 2.8, 2.6], [-5.6, 2.2, -5.0], [-5.6, 2.4, -5.4], 42, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも会社の窓が、行きたい場所につながったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '窓の向こう', value: (t) => Object.keys(LABEL).indexOf(counterView(t)), format: (n) => LABEL[Object.keys(LABEL)[n]], done: (t) => t >= SW.office && t < SW.back },
      { type: 'bubble', t0: 1.2, t1: SW.beach, text: '海に行きたい…', scene: 'office', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '行きたい場所を言うと、', at: 4.65, cps: 18 },
        { text: '窓の外が変わる', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: SW.mount - 0.9, t1: SW.mount + 0.6, text: '山がいいな', scene: 'office', anchor: headTop(M1) },
      { type: 'bubble', t0: SW.space - 0.9, t1: SW.space + 0.6, text: '宇宙…', scene: 'office', anchor: headTop(M2) },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '社員Aは、', at: 9.65, cps: 16 },
        { text: '窓から海へ', at: 11.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '部長は、', at: 15.15, cps: 16 },
        { text: 'ゴルフ場へ', at: 16.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 15.2, t1: SW.golf, text: 'ゴルフ場！', scene: 'office', anchor: headTop(BOSS) },
      { type: 'fx', t0: 18.4, t1: 19.2, text: 'カキーン', x: 820, y: 240, rot: 6, size: 52 },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '社長のひと言で、', at: 20.65, cps: 18 },
        { text: '窓はぜんぶ会社にもどる', at: SW.office + 0.1, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 21.0, t1: SW.office, text: '会社に行きたい', scene: 'office', anchor: headTop(CEO) },
      { type: 'fx', t0: SW.office + 0.5, t1: SW.office + 1.3, text: 'ドサドサッ', x: 640, y: 420, rot: -5, size: 56, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも有給は、窓から見るだけ。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '窓が行きたい場所につながる会社', at: 27.4, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.4, t1: 30.1, text: 'もしもブロック劇場 #28　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const warp = (t) => [AUDIO.tone(t, 400, 0.4, { wave: 'pulse12', f2: 1600, gain: 0.05 }), AUDIO.tone(t + 0.2, 'C6', 0.3, { type: 'triangle', gain: 0.05, decay: true })];
    const audio = AUDIO.music({ prog: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'F', 'C'], arp: [2, 3, 4] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    [SW.beach, SW.mount, SW.space, SW.golf, SW.office].forEach((t) => add(warp(t)));
    add(S_.waves(11.4, 3.6));
    add(S_.whistle(18.5, 0.6)); add(S_.pop(18.4, 8));
    add(S_.thud(SW.office + 0.6, 0)); add(S_.thud(SW.office + 0.7, 2));
    add(S_.pop(28.4, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
