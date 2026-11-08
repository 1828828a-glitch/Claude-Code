/* ep06 — もしも、ため息が1回1ブロックの雲になったら（30秒） */
EPISODES.push({
  id: 'ep06',
  no: 6,
  short: 'ため息の雲',
  title: 'もしも、ため息が1回1ブロックの雲になったら',
  lead: '月曜の朝、ため息は雲になって天井にたまる。たまれば社内に雨が降り、部長のため息には雷がつく。金曜18時、雲は一気に晴れて虹が出る。',
  duration: 30,
  poster: 13.2,
  chapters: [
    { t: 0, name: '月曜の朝' }, { t: 4.5, name: 'ため息' }, { t: 10, name: '社内の雨' },
    { t: 15.5, name: '部長の雷' }, { t: 21, name: '金曜18時' }, { t: 25.5, name: '部長の頭上' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 10, 15.5, 21, 25.5];
    const RAIN = [10.6, 21.9], UMB = 11.3, BIG = 16.6, BOLTS = [17.6, 18.7], CLEAR = 21.9, BOW = 22.5, LAST = 25.2;
    const r = mulberry32(606);
    const sighs = [[1.5, 0], [3.2, 0]];
    for (let t = 4.8; t < 9.8; t += 0.14) sighs.push([t, (r() * 5) | 0]);
    const clouds = (t) => sighs.filter(([s]) => s <= t).length;
    const count = (t) => (t < CLEAR ? clouds(t) + (t >= BIG ? 1 : 0) : t < LAST ? 0 : 1);

    let staff, BOSS, A;
    {
      const S = newScene({ sky: SKY_DAY });
      const winMat = blockMat('window').clone();
      P.officeRoom(S, { overrides: { window: winMat } });
      const { dir, hemi } = S.userData;
      const cal = (d) => P.glow(textTex(d, { w: 128, h: 128, size: 84, bg: '#ffffff', fg: d === '金' ? '#d24b4b' : '#1d2333' }));
      const calFace = faces(solid('#d24b4b'), {});
      box(S, [0.8, 0.9, 0.06], [6.2, 2.4, -5.94], calFace);
      const days = { mon: cal('月'), fri: cal('金') };
      const clock = P.wallClock(S, [-6.0, 2.4, -5.9], 0.9);
      staff = [[-4, -3.0, CAST.A], [0, -3.0, CAST.M1], [4, -3.0, CAST.M2], [-2, 0.4, CAST.M3], [2, 0.4, CAST.NEW]].map(([x, z, look]) => workstation(S, x, z, look));
      A = staff[0];
      BOSS = addChar(S, CAST.BOSS, [9.5, 0, 2.0], -Math.PI / 2);
      /* 雲のかたまり */
      const cloudMat = new T.MeshLambertMaterial({ color: '#ffffff', emissive: '#55606e' });
      const blob = (parent, seed, s = 1, mat = cloudMat) => {
        const g = group(parent);
        const q = mulberry32(seed);
        for (let i = 0; i < 4; i++) box(g, [(0.5 + q() * 0.5) * s, (0.35 + q() * 0.25) * s, (0.45 + q() * 0.4) * s], [(q() - 0.5) * 0.6 * s, q() * 0.2 * s, (q() - 0.5) * 0.4 * s], mat, { cast: false });
        return g;
      };
      const puffs = sighs.map(([t, who], k) => ({ g: blob(S, 100 + k), t, who, to: [-8 + r() * 16, 3.3 + r() * 1.3, -5 + r() * 6], sp: 0.6 + r() * 0.8 }));
      const darkMat = new T.MeshLambertMaterial({ color: '#5a606c', emissive: '#1d2230' });
      const big = blob(S, 900, 3.2, darkMat);
      const mini = blob(S, 901, 0.9, darkMat);
      const bolt = group(S);
      const yel = new T.MeshBasicMaterial({ color: '#ffe14a' });
      [[0, 3.0, 0.2], [0.3, 2.4, -0.1], [0, 1.8, 0.2], [0.35, 1.2, -0.05], [0.05, 0.6, 0.15]].forEach(([x, y, rz]) => box(bolt, [0.18, 0.7, 0.18], [x, y, 0], yel, { cast: false, rot: [0, 0, rz] }));
      /* 雨 */
      const N = 320, rain = new T.InstancedMesh(new T.BoxGeometry(0.03, 0.32, 0.03), new T.MeshBasicMaterial({ color: '#7fb8ee' }), N);
      const drops = Array.from({ length: N }, () => [-9 + r() * 18, r() * 3.6, -5.5 + r() * 8]);
      S.add(rain);
      const M2 = 40, rain2 = new T.InstancedMesh(new T.BoxGeometry(0.03, 0.3, 0.03), new T.MeshBasicMaterial({ color: '#7fb8ee' }), M2);
      const drops2 = Array.from({ length: M2 }, () => [(r() - 0.5) * 1.1, r() * 1.5, (r() - 0.5) * 0.9]);
      S.add(rain2);
      /* 傘 */
      const umbColors = ['#d24b4b', '#2fa59b', '#f2c230', '#6a5acd', '#2f62d6'];
      const umbrellas = staff.map((c, i) => {
        const u = group(c.armL, [0, -0.62, 0]);
        box(u, [0.05, 1.0, 0.05], [0, -0.5, 0], solid('#2b3140'));
        [[1.5, 0], [1.0, -0.1], [0.5, -0.2]].forEach(([w, dy], k) => box(u, [w, 0.1, w], [0, -1.0 + dy, 0], solid(k === 1 ? '#ffffff' : umbColors[i])));
        u.rotation.x = Math.PI;
        return u;
      });
      /* 虹 */
      const bowCols = ['#e8483b', '#f29a2e', '#f2d23a', '#4fb35a', '#2f7fe0', '#6a5acd'];
      const cells = [];
      bowCols.forEach((col, b) => {
        const rad = 6.4 - b * 0.42, n = Math.round((Math.PI * rad) / 0.42);
        for (let i = 0; i <= n; i++) { const a = Math.PI * (i / n); cells.push({ x: Math.cos(Math.PI - a) * rad, y: Math.sin(a) * rad * 0.62 + 0.3, c: col, a: i / n }); }
      });
      const bow = new T.InstancedMesh(new T.BoxGeometry(0.42, 0.42, 0.3), new T.MeshBasicMaterial({ color: '#ffffff' }), cells.length);
      const tint = new T.Color();
      cells.forEach((c, i) => bow.setColorAt(i, tint.set(c.c)));
      bow.instanceColor.needsUpdate = true;
      S.add(bow);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      const update = (lt, t) => {
        calFace[4] = t < 21 ? days.mon : days.fri;
        clock.set(t < 21 ? 9 + t / 10 : 17 + Math.min(1, (59 + ease.inOut(prog(t, 21.3, 21.5))) / 60));
        const gloom = prog(t, 9.6, 11.0) * (1 - prog(t, CLEAR, CLEAR + 0.6));
        cloudMat.color.set(mixHex('#ffffff', '#9aa2b0', gloom));
        hemi.intensity = lerp(0.72, 0.5, gloom) + (BOLTS.some((b) => t >= b && t < b + 0.1) ? 0.7 : 0);
        dir.intensity = lerp(0.55, 0.3, gloom) + prog(t, CLEAR, CLEAR + 0.8) * 0.35;
        winMat.color.set(mixHex('#ffffff', '#8c96a6', gloom));
        const vanish = 1 - ease.in(prog(t, CLEAR, CLEAR + 0.5));
        puffs.forEach((p, k) => {
          p.g.visible = t >= p.t && vanish > 0.01;
          if (!p.g.visible) return;
          const src = staff[p.who].head.localToWorld(V3(0, 0.3, 0.45));
          const u = ease.out(prog(t, p.t, p.t + 1.2));
          p.g.position.set(lerp(src.x, p.to[0], u), lerp(src.y, p.to[1], u) + Math.sin(t * p.sp + k) * 0.06, lerp(src.z, p.to[2], u));
          p.g.scale.setScalar((0.3 + 0.7 * u) * vanish);
        });
        big.visible = t >= BIG && vanish > 0.01;
        const bu = ease.out(prog(t, BIG, BIG + 0.9));
        big.position.set(lerp(6.0, 2.0, bu), lerp(2.0, 3.6, bu), lerp(1.8, -1.0, bu));
        big.scale.setScalar((0.3 + 0.7 * bu) * vanish);
        bolt.visible = BOLTS.some((b) => t >= b && t < b + 0.12);
        bolt.position.set(1.6, 0, -1.0);
        const raining = t >= RAIN[0] && t < RAIN[1];
        drops.forEach((d, i) => {
          const y = 3.6 - ((t * 7 + d[1]) % 3.6);
          ps.set(d[0], y, d[2]); sc.setScalar(raining ? 1 : 0.0001);
          m4.compose(ps, q, sc); rain.setMatrixAt(i, m4);
        });
        rain.instanceMatrix.needsUpdate = true;
        const bossRain = t >= LAST + 0.5;
        mini.visible = t >= LAST;
        const head = BOSS.head.localToWorld(V3(0, 1.4, 0));
        mini.position.copy(head);
        mini.scale.setScalar(popScale(t, LAST, 0.3));
        drops2.forEach((d, i) => {
          const y = head.y - 0.2 - ((t * 6 + d[1]) % 1.5);
          ps.set(head.x + d[0], y, head.z + d[2]); sc.setScalar(bossRain ? 1 : 0.0001);
          m4.compose(ps, q, sc); rain2.setMatrixAt(i, m4);
        });
        rain2.instanceMatrix.needsUpdate = true;
        cells.forEach((c, i) => {
          const on = t >= BOW + c.a * 1.0;
          ps.set(c.x, c.y, -5.6); sc.setScalar(on ? popScale(t, BOW + c.a * 1.0, 0.2) : 0.0001);
          m4.compose(ps, q, sc); bow.setMatrixAt(i, m4);
        });
        bow.instanceMatrix.needsUpdate = true;
        staff.forEach((c, i) => {
          working(c, t, i, 14);
          const mySighs = sighs.filter(([s, w]) => w === i && t >= s && t < s + 0.5).length;
          if (mySighs) { c.setFace('sleepy'); c.head.rotation.x = -0.25; c.body.rotation.x = -0.08; }
          umbrellas[i].visible = t >= UMB + i * 0.12 && t < CLEAR;
          umbrellas[i].scale.setScalar(popScale(t, UMB + i * 0.12, 0.25));
          if (umbrellas[i].visible) { c.armL.rotation.x = -Math.PI; c.armR.rotation.x = -1.2 + Math.sin(t * 14 + i) * 0.1; }
          if (t > BOLTS[0] && t < CLEAR) c.setFace('shock');
          if (t >= CLEAR) { reset(c); sit(c); c.setFace('happy'); banzai(c, 1, Math.sin(t * 10 + i) * 0.15); c.root.position.y += Math.abs(Math.sin(t * 6 + i)) * 0.12; }
        });
        reset(BOSS);
        BOSS.root.visible = t >= 15.5;
        const u = prog(t, 15.7, 16.4);
        if (t < 25.5) {
          BOSS.root.position.set(lerp(9.5, 6.0, u), 0, 2.0);
          if (u < 1) walk(BOSS, t * 12, 0.45); else BOSS.root.rotation.y = -0.6;
          if (t >= BIG && t < BIG + 0.8) { BOSS.setFace('sleepy'); BOSS.head.rotation.x = -0.3; BOSS.body.rotation.x = -0.1; }
          if (t >= CLEAR) BOSS.root.rotation.y = -0.9;
        } else {
          BOSS.root.position.set(6.0, 0, 2.0); BOSS.root.rotation.y = -0.4;
          if (t < LAST + 0.4) { BOSS.setFace('sleepy'); BOSS.head.rotation.x = -0.25; } else { BOSS.setFace('shock'); BOSS.head.rotation.x = -0.35; }
        }
      };
      const cams = [
        [0, 4.5, camPath([-5.4, 3.4, 1.8], [-5.2, 3.2, 1.0], [-4.0, 1.6, -3.8], [-4.0, 1.9, -3.8], 40, 4.5)],
        [4.5, 10, camPath([5.0, 5.6, 11.0], [4.4, 5.2, 10.2], [0, 2.4, -2.0], [0, 2.6, -2.0], 40, 5.5)],
        [10, 15.5, camPath([4.2, 3.6, 10.4], [3.6, 3.4, 9.6], [0, 1.6, -1.6], [0, 1.7, -1.6], 40, 5.5)],
        [15.5, 21, camPath([7.8, 4.4, 10.6], [7.0, 4.6, 9.8], [2.8, 2.2, -0.6], [2.6, 2.6, -0.8], 40, 5.5)],
        [21, 25.5, camPath([2.0, 4.6, 11.8], [1.4, 4.4, 11.2], [0, 2.4, -2.6], [0, 2.6, -2.8], 42, 4.5)],
        [25.5, 30.01, camPath([8.8, 3.2, 7.8], [8.2, 3.0, 7.0], [5.0, 2.0, 0.4], [5.2, 2.1, 0.6], 38, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt), shake: (lt) => impact(lt + a, BOLTS, 0.08) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも、ため息が1回1ブロックの雲になったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.5, t1: 30.1, label: 'オフィスの雲', value: count, format: (n) => `${n}個`, done: (t) => t >= LAST },
      { type: 'fx', t0: 1.5, t1: 2.4, text: 'はぁ…', scene: 'office', anchor: headTop(A, 0.4), x: 120, y: 0, rot: -5, size: 40 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '月曜の朝は、', at: 4.65, cps: 18 },
        { text: 'みんなため息が多い', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '雲がたまると、', at: 10.15, cps: 18 },
        { text: '社内に雨が降る', at: 10.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: UMB, t1: UMB + 0.8, text: 'バサッ', x: 900, y: 260, rot: 6, size: 50 },
      { type: 'tag', t0: 12.6, t1: CUTS[2], text: '本日の社内：くもり時々雨' },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '部長のため息は、', at: 15.65, cps: 18 },
        { text: '雷つき', at: BOLTS[0], cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: BIG, t1: BIG + 1.0, text: 'はぁ〜〜〜', scene: 'office', anchor: headTop(BOSS, 0.4), x: -170, y: 10, rot: -6, size: 48 },
      { type: 'fx', t0: BOLTS[0], t1: BOLTS[0] + 0.9, text: 'ピシャーン', x: 760, y: 200, rot: 7, size: 64, shake: true },
      { type: 'fx', t0: BOLTS[1], t1: BOLTS[1] + 0.9, text: 'ゴロゴロ', x: 520, y: 260, rot: -6, size: 56, shake: true },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '金曜の18時、', at: 21.15, cps: 18 },
        { text: '雲が一気に晴れる', at: CLEAR + 0.1, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: CLEAR, t1: CLEAR + 0.9, text: 'パァァッ', x: 700, y: 200, rot: -4, size: 62 },
      { type: 'bubble', t0: 23.2, t1: 25.4, text: 'おつかれさまでしたー！', scene: 'office', anchor: headTop(staff[3]) },
      { type: 'fx', t0: LAST, t1: LAST + 0.8, text: 'はぁ…', scene: 'office', anchor: headTop(BOSS, 0.4), x: -120, y: 30, rot: -5, size: 40 },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも部長の頭上だけは、雨。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: 'ため息で天気が変わる会社', at: 27.3, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #06　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const sigh = (t, low = 0) => [AUDIO.noise(t, 0.6, { filter: 'bandpass', freq: 900 - low * 400, freq2: 300, q: 1.2, gain: 0.05 + low * 0.05 })];
    const thunder = (t) => [AUDIO.noise(t, 1.4, { filter: 'lowpass', freq: 500, freq2: 120, gain: 0.3, decay: true }), AUDIO.noise(t, 0.12, { filter: 'highpass', freq: 2000, gain: 0.2, decay: true })];
    const audio = AUDIO.music({ prog: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Dm', 'Am', 'Dm', 'G', 'F', 'C', 'F', 'C'], arp: [12, 13] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    sighs.forEach(([t], i) => { if (i < 2 || i % 3 === 0) add(sigh(t)); });
    add([AUDIO.noise(RAIN[0], RAIN[1] - RAIN[0], { filter: 'highpass', freq: 3000, gain: 0.05, long: true, fade: 0.6 })]);
    add(S_.pop(UMB, 4));
    add(sigh(BIG, 1));
    BOLTS.forEach((t) => add(thunder(t)));
    add(S_.chime(21.25));
    add(S_.sparkle(CLEAR)); add(S_.jingle(CLEAR + 0.3)); add(S_.cheer(BOW));
    add(sigh(LAST));
    add([AUDIO.noise(LAST + 0.5, 4.3, { filter: 'highpass', freq: 3500, gain: 0.03, long: true, fade: 0.5 })]);
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
