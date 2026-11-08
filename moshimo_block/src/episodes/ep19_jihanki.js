/* ep19 — もしも自販機のボタンを押すと、なんでも出てきたら（30秒） */
EPISODES.push({
  id: 'ep19',
  no: 19,
  short: 'なんでも自販機',
  title: 'もしも自販機のボタンを押すと、なんでも出てきたら',
  lead: '「ひらめき」を押せば電球、「まくら」を押せば大きなまくら、「南の島」を押せば砂浜とヤシの木。部長は「ノルマ」を押し、社員Aは「定時」を押した。',
  duration: 30,
  poster: 12.4,
  chapters: [
    { t: 0, name: 'コーヒー' }, { t: 4.5, name: 'なんでも' }, { t: 9.5, name: '南の島' },
    { t: 15, name: 'ノルマ' }, { t: 20.5, name: '定時' }, { t: 25.5, name: '昇給' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const VM = [0, 0, -5.0];
    const PUSH = { coffee: 2.2, idea: 5.6, pillow: 7.6, island: 10.4, kotatsu: 12.8, quota: 16.6, bell: 21.8, raise: 26.6 };
    const items = (t) => Object.values(PUSH).filter((p) => p + 0.3 <= t && p !== PUSH.raise).length + (t >= PUSH.island + 0.6 ? 30 : 0) + (t >= PUSH.quota + 0.4 ? 200 : 0);
    const SOLD = 'raise';

    let A, BOSS, M1, M2, M3;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { floor: 'plank', windows: [[-7, 2], [-6, 2], [-7, 3], [-6, 3], [5, 2], [6, 2], [5, 3], [6, 3]] });
      const clock = P.wallClock(S, [3.4, 3.4, -5.9], 0.9);
      /* 自販機 */
      const vm = group(S, VM);
      box(vm, [2.2, 2.8, 1.1], [0, 1.4, 0], solid('#d24b4b'));
      box(vm, [1.3, 1.5, 0.04], [-0.3, 1.8, 0.56], solid('#cfe8f5', { emissive: '#4a6a80' }));
      const cols = ['#2f62d6', '#f2c230', '#3f9b4b', '#ffffff', '#6a5acd', '#ff8fb3'];
      for (let i = 0; i < 12; i++) box(vm, [0.18, 0.28, 0.12], [-0.8 + (i % 4) * 0.33, 2.3 - Math.floor(i / 4) * 0.5, 0.5], solid(cols[i % 6]), { cast: false });
      const labels = ['コーヒー', 'ひらめき', 'まくら', '南の島', 'こたつ', 'ノルマ', '定時', '昇給'];
      const panelTex = canvasTex(128, 512, (g) => {
        g.fillStyle = '#1d2333'; g.fillRect(0, 0, 128, 512);
        g.font = `24px ${PIXEL_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        labels.forEach((l, i) => { g.fillStyle = '#f4f1ea'; g.fillRect(10, 14 + i * 62, 108, 46); g.fillStyle = l === '昇給' ? '#d24b4b' : '#1d2333'; g.fillText(l, 64, 38 + i * 62); });
      }, true);
      box(vm, [0.6, 2.2, 0.04], [0.72, 1.6, 0.56], P.glow(panelTex));
      box(vm, [1.2, 0.3, 0.1], [-0.3, 0.45, 0.56], solid('#1d2333'));
      const soldOn = P.glow(textTex('売り切れ', { w: 128, h: 48, size: 30, bg: '#ff3b30', fg: '#ffffff' })), soldOff = P.glow(textTex('売り切れ', { w: 128, h: 48, size: 30, bg: '#4a1010', fg: '#7a3030' }));
      const soldLamp = box(vm, [0.6, 0.22, 0.05], [0.72, 0.36, 0.6], soldOff, { cast: false });
      const slot = [VM[0] - 0.3, 0.45, VM[2] + 0.7];
      /* 出てくるもの */
      const can = box(S, [0.2, 0.3, 0.2], [0, -99, 0], solid('#6b3e1f'));
      const bulb = group(S); box(bulb, [0.4, 0.4, 0.4], [0, 0.2, 0], new T.MeshBasicMaterial({ color: '#fff3a0' })); box(bulb, [0.22, 0.16, 0.22], [0, -0.08, 0], solid('#9aa3ad'));
      const pillow = box(S, [1.6, 0.5, 1.0], [0, -99, 0], solid('#f4f1ea'));
      const island = group(S, [slot[0] + 1.8, 0, slot[2] + 2.6]);
      const sand = box(island, [3.6, 0.4, 3.0], [0, 0.2, 0], blockMat('sand'));
      for (let i = 0; i < 6; i++) box(island, [0.3, 0.5, 0.3], [-1.0 + i * 0.05, 0.6 + i * 0.5, -0.8], solid(i % 2 ? '#8b5e34' : '#7a5232'));
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => box(island, [Math.abs(dx) ? 1.4 : 0.4, 0.14, Math.abs(dz) ? 1.4 : 0.4], [-0.7 + dx * 0.7, 3.4, -0.8 + dz * 0.7], solid('#3f9b4b')));
      const kotatsu = group(S, [slot[0] - 2.6, 0, slot[2] + 2.0]);
      box(kotatsu, [1.6, 0.4, 1.6], [0, 0.2, 0], solid('#d26f3c')); box(kotatsu, [1.8, 0.08, 1.8], [0, 0.44, 0], solid('#8b5e34'));
      box(kotatsu, [0.3, 0.3, 0.3], [0.3, 0.63, 0.2], solid('#ff9f2e'));
      const paperTex = canvasTex(16, 8, (g) => { px(g, '#ffffff', 0, 0, 16, 8); px(g, '#c9d0d8', 0, 3, 16, 1); px(g, '#c9d0d8', 0, 6, 16, 1); });
      const PN = 140, papers = new T.InstancedMesh(new T.BoxGeometry(0.6, 0.25, 0.45), new T.MeshLambertMaterial({ map: paperTex }), PN);
      S.add(papers);
      const r = mulberry32(1919);
      const pp = Array.from({ length: PN }, () => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 3.6; return [slot[0] + Math.cos(a) * d, 0.12 + (1 - d / 3.8) * 2.4 * r(), slot[2] + 1.6 + Math.sin(a) * d * 0.7, r() * 3]; });
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e3 = new T.Euler(), ps = new T.Vector3(), sc = new T.Vector3();
      A = addChar(S, CAST.A, [0.6, 0, -3.4], Math.PI);
      M1 = addChar(S, CAST.M1, [-1.6, 0, -2.6], 2.6);
      M2 = addChar(S, CAST.M2, [3.6, 0, -3.8], -1.8);
      M3 = addChar(S, CAST.M3, [-3.0, 0, -0.8], 2.2);
      BOSS = addChar(S, CAST.BOSS, [7.0, 0, 1.0], -1.6);
      const pop = (obj, t0, to, dur = 0.5) => {
        const u = prog(t, t0, t0 + dur);
        obj.visible = t >= t0;
        obj.position.set(lerp(slot[0], to[0], u), lerp(slot[1], to[1], u) + Math.sin(u * Math.PI) * 0.8, lerp(slot[2], to[2], u));
      };
      let t = 0;
      const update = (lt, tt) => {
        t = tt;
        clock.set(t < 20.5 ? 13 + t * 0.15 : t < 25.5 ? (t < PUSH.bell ? 16.2 : 18) : 10);
        pop(can, PUSH.coffee, [slot[0] + 0.6, 0.15, slot[2] + 0.4]);
        can.visible = t >= PUSH.coffee && t < 4.5;
        bulb.visible = t >= PUSH.idea && t < 9.5;
        const ah = A.head.localToWorld(V3(0, 1.2, 0));
        bulb.position.copy(ah); bulb.scale.setScalar(popScale(t, PUSH.idea + 0.2, 0.3));
        pop(pillow, PUSH.pillow, [slot[0] - 1.0, 0.25, slot[2] + 1.2], 0.6);
        pillow.visible = t >= PUSH.pillow && t < 15;
        island.visible = t >= PUSH.island && t < 15;
        island.scale.setScalar(ease.back(prog(t, PUSH.island, PUSH.island + 0.6)) + 0.0001);
        kotatsu.visible = t >= PUSH.kotatsu && t < 15;
        kotatsu.scale.setScalar(ease.back(prog(t, PUSH.kotatsu, PUSH.kotatsu + 0.5)) + 0.0001);
        const pf = prog(t, PUSH.quota, PUSH.quota + 1.4);
        pp.forEach((p, i) => {
          const on = t >= PUSH.quota && t < 20.5 + (t < PUSH.bell ? 5 : 0) && i < pf * PN && !(t >= PUSH.bell + 0.3);
          const u = clamp(pf * 1.4 - i / PN, 0, 1);
          ps.set(lerp(slot[0], p[0], u), lerp(slot[1], p[1], u) + Math.sin(u * Math.PI) * 1.0, lerp(slot[2], p[2], u));
          q.setFromEuler(e3.set(0, p[3], 0)); sc.setScalar(on ? 1 : 0.0001);
          m4.compose(ps, q, sc); papers.setMatrixAt(i, m4);
        });
        papers.instanceMatrix.needsUpdate = true;
        soldLamp.material = t >= PUSH.raise && Math.floor(t * 3) % 2 === 0 ? soldOn : soldOff;
        const presser = (c, at) => { if (t > at - 0.4 && t < at + 0.2) { c.armR.rotation.x = -1.6; } };
        [A, M1, M2, M3].forEach((c) => reset(c));
        if (t < 9.5) {
          presser(A, PUSH.coffee); presser(A, PUSH.idea); presser(M1, PUSH.pillow);
          A.setFace(t > PUSH.idea ? 'happy' : 'normal');
          if (t > PUSH.pillow + 0.6) { M1.root.position.set(slot[0] - 1.0, 0.5, slot[2] + 1.2); M1.root.rotation.set(-Math.PI / 2, 0, 0); M1.root.position.y = 0.7; M1.setFace('sleepy'); }
        } else if (t < 15) {
          A.root.position.set(slot[0] + 1.4, 0.4, slot[2] + 2.8); A.root.rotation.set(0, 0.3, 0); A.setFace('shades'); A.armR.rotation.z = 2.6;
          M2.root.position.set(slot[0] - 2.6, 0, slot[2] + 3.0); M2.root.rotation.y = Math.PI; sit(M2); M2.root.position.y = 0; M2.setFace('sleepy');
          presser(M3, PUSH.island); presser(M3, PUSH.kotatsu); M3.setFace('happy');
          M1.root.position.set(slot[0] - 1.0, 0.7, slot[2] + 1.2); M1.root.rotation.set(-Math.PI / 2, 0, 0); M1.setFace('sleepy');
        } else if (t < 20.5) {
          [A, M1, M2, M3].forEach((c, i) => { c.root.position.set(slot[0] - 1.6 + i * 1.2, -0.6 * prog(t, PUSH.quota + 0.3, PUSH.quota + 1.4), slot[2] + 2.2 + (i % 2) * 0.8); c.root.rotation.y = 0; c.setFace('shock'); banzai(c, 0.6, Math.sin(t * 14 + i) * 0.2); });
        } else {
          const gone = t >= PUSH.bell + 0.4;
          [A, M1, M2, M3].forEach((c, i) => {
            c.root.position.set(slot[0] - 1.6 + i * 1.2, 0, slot[2] + 2.2 + (i % 2) * 0.8); c.root.rotation.y = 0; c.setFace(gone ? 'happy' : 'sleepy');
            if (gone && i > 0) { const u = prog(t, PUSH.bell + 0.6 + i * 0.2, PUSH.bell + 2.6 + i * 0.2); c.root.position.x += u * 10; c.root.rotation.y = Math.PI / 2; walk(c, t * 14, 0.6); }
            if (i === 0) { if (t < 25.5) presser(A, PUSH.bell); if (gone && t < 25.5) banzai(A, 1, Math.sin(t * 10) * 0.15); }
          });
          if (t >= 25.5) { A.root.position.set(0.6, 0, -3.4); A.root.rotation.y = Math.PI; presser(A, PUSH.raise); A.setFace(t > PUSH.raise + 0.3 ? 'sleepy' : 'normal'); A.root.rotation.y = Math.PI + (t > PUSH.raise + 0.6 ? 0.8 : 0); }
          [M1, M2, M3].forEach((c) => { if (t >= 25.5) c.root.visible = false; });
        }
        reset(BOSS);
        BOSS.root.visible = t >= 15 && t < 20.5;
        const bu = prog(t, 15.2, 16.0);
        BOSS.root.position.set(lerp(7.0, 1.4, bu), 0, lerp(1.0, -3.2, bu)); BOSS.root.rotation.y = bu < 1 ? -2.2 : Math.PI;
        if (bu < 1) walk(BOSS, t * 12, 0.45); else { presser(BOSS, PUSH.quota); BOSS.setFace('angry'); }
      };
      const cams = [
        [0, 4.5, camPath([1.6, 3.0, 3.2], [1.4, 2.8, 2.4], [-0.2, 1.3, -4.4], [-0.2, 1.3, -4.4], 42, 4.5)],
        [4.5, 9.5, camPath([3.6, 2.8, 2.8], [3.2, 2.6, 2.2], [-0.4, 1.2, -3.8], [-0.4, 1.2, -3.8], 42, 5)],
        [9.5, 15, camPath([5.2, 4.2, 6.8], [4.6, 3.8, 6.0], [-0.4, 1.0, -2.6], [-0.4, 1.0, -2.6], 44, 5.5)],
        [15, 20.5, camPath([5.4, 4.4, 6.8], [4.8, 4.0, 6.0], [0, 1.0, -2.8], [0, 1.0, -2.8], 44, 5.5)],
        [20.5, 25.5, camPath([5.4, 4.0, 6.4], [4.8, 3.6, 5.6], [0, 1.0, -2.8], [0.6, 1.0, -2.8], 44, 5)],
        [25.5, 30.01, camPath([3.8, 2.2, -1.2], [3.4, 1.8, -1.8], [0.4, 1.3, -4.4], [0.6, 0.8, -4.4], 42, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'room', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも自販機のボタンを押すと、なんでも出てきたら', cls: 'title small' },
        { text: 'ブロック町のIT企業、午後1時', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: PUSH.coffee, t1: 30.1, label: '自販機から出たもの', value: items, format: (n) => `${n}個`, done: (t) => t >= PUSH.quota + 0.4 && t < 25.5 },
      { type: 'fx', t0: PUSH.coffee + 0.3, t1: PUSH.coffee + 1.0, text: 'ガコン', x: 700, y: 520, rot: 6, size: 46 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: 'この自販機は、', at: 4.65, cps: 16 },
        { text: 'なんでも出てくる', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: PUSH.idea + 0.2, t1: PUSH.idea + 0.9, text: 'ピコン', scene: 'room', anchor: headTop(A, 1.4), x: 110, y: 0, rot: 6, size: 44 },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '社員たちは、', at: 9.65, cps: 16 },
        { text: '仕事をしなくなる', at: 10.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '部長が押したのは、', at: 15.15, cps: 18 },
        { text: '「ノルマ」', at: PUSH.quota + 0.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: PUSH.quota + 0.2, t1: PUSH.quota + 1.6, text: 'ドサドサドサ', x: 660, y: 200, rot: -5, size: 60, shake: true },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '社員Aが押したのは、', at: 20.65, cps: 18 },
        { text: '「定時」', at: PUSH.bell + 0.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: PUSH.bell + 0.3, t1: CUTS[4], text: '16:12 → 18:00' },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも「昇給」だけは、いつも売り切れ。', at: 27.0, cps: 18, cls: 'mark-soft small' },
        { text: 'なんでも出てくる自販機', at: 28.5, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.9, t1: 30.1, text: 'もしもブロック劇場 #19　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const btn = (t) => [AUDIO.tone(t, 'A5', 0.05, { gain: 0.05 })];
    const gakon = (t) => [AUDIO.noise(t, 0.12, { filter: 'lowpass', freq: 600, gain: 0.2, decay: true }), AUDIO.tone(t, 160, 0.12, { type: 'sine', f2: 70, gain: 0.2, decay: true })];
    const audio = AUDIO.music({ prog: ['C', 'F', 'C', 'G', 'C', 'F', 'G', 'C', 'F', 'C', 'G', 'Am', 'F', 'G', 'F', 'C'], arp: [4, 5, 6] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    Object.values(PUSH).forEach((t) => { add(btn(t - 0.2)); });
    add(gakon(PUSH.coffee + 0.3)); add(S_.sparkle(PUSH.idea + 0.2)); add(gakon(PUSH.pillow + 0.3));
    add(S_.grow(PUSH.island)); add(S_.waves(PUSH.island + 0.4, 4.0)); add(S_.pop(PUSH.kotatsu, 3));
    for (let i = 0; i < 14; i++) add(S_.thud(PUSH.quota + 0.2 + i * 0.1, i % 5));
    add(S_.chime(PUSH.bell + 0.1)); add(S_.cheer(PUSH.bell + 0.6));
    add(S_.error(PUSH.raise + 0.1));
    add(S_.pop(28.9, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
