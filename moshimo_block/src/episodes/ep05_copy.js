/* ep05 — もしもコピー機が、人までコピーできたら（30秒） */
EPISODES.push({
  id: 'ep05',
  no: 5,
  short: '人をコピーする社員A',
  title: 'もしもコピー機が、人までコピーできたら',
  lead: '締め切り前日、社員Aはコピー機で自分を増やした。翌朝のオフィスは全員が社員A。部長もまねしてみたら、A4サイズで出てきた。',
  duration: 30,
  poster: 12.6,
  chapters: [
    { t: 0, name: 'コピー機' }, { t: 4.5, name: '増やす' }, { t: 9.5, name: '全員A' },
    { t: 15, name: '部長も' }, { t: 20.5, name: '定時退社' }, { t: 25.5, name: '給料日' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const POP0 = 3.9, SPAWN = [-7.0, 0, -0.6];
    const popAt = (k) => (k === 0 ? POP0 : 5.0 + (k - 1) * 0.45);
    const CLONES = 10;
    const MINI = [16.6, 17.2, 17.8];
    const clonesBy = (t) => Array.from({ length: CLONES }, (_, k) => popAt(k)).filter((x) => x <= t).length;
    const people = (t) => (t < 20.6 ? 1 + clonesBy(t) : Math.round(lerp(1 + CLONES, 48, ease.inOut(prog(t, 20.8, 23.5)))));
    const walkPath = (pts, u) => {
      const seg = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
      let s = u * total;
      for (let i = 0; i < seg.length; i++) {
        if (s <= seg[i] || i === seg.length - 1) {
          const k = seg[i] ? clamp(s / seg[i], 0, 1) : 1;
          return { x: lerp(pts[i][0], pts[i + 1][0], k), z: lerp(pts[i][1], pts[i + 1][1], k), dir: Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) };
        }
        s -= seg[i];
      }
      return { x: pts[pts.length - 1][0], z: pts[pts.length - 1][1], dir: 0 };
    };

    /* ===== オフィス（0〜20.5秒） ===== */
    let A0, BOSS, cloneList, minis;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { windows: [[-2, 2], [-1, 2], [-2, 3], [-1, 3], [3, 2], [4, 2], [3, 3], [4, 3]] });
      const cp = copier(S, -7.0, -2.2, Math.PI / 2);
      const sheets = [1.0, 1.8, 2.6].map(() => box(S, [0.42, 0.02, 0.56], [0, -99, 0], solid('#ffffff'), { cast: false }));
      const seats = [];
      [-3.0, -0.4].forEach((z) => [-3, -0.5, 2, 4.5, 7].forEach((x) => { workstation(S, x, z, null); seats.push({ x, z: z - 0.95, aisle: z - 2.0 }); }));
      P.plant(S, -8.6, -5.3); P.plant(S, 8.6, 2.2, 0.9);
      A0 = addChar(S, CAST.A, [-5.9, 0, -2.2], -Math.PI / 2);
      cloneList = seats.map((seat, k) => ({ c: addChar(S, CAST.A, SPAWN), seat, t: popAt(k) }));
      BOSS = addChar(S, CAST.BOSS, [9.5, 0, 1.6], -Math.PI / 2);
      minis = MINI.map((t, i) => ({ c: addChar(S, CAST.BOSS, SPAWN), t, ph: i * 2.1 }));
      const update = (lt, t) => {
        [1.0, 1.8, 2.6, 3.4, 5.0, 16.1].forEach((s0) => { if (t >= s0 && t < s0 + 0.5) cp.scan(t, s0); });
        sheets.forEach((m, i) => { m.visible = t >= [1.0, 1.8, 2.6][i] + 0.5; m.position.set(-7.0, 0.66 + i * 0.025, -3.1); });
        const a = A0;
        reset(a);
        if (t < 15) {
          if (t < 3.3) { a.armR.rotation.x = -1.4 + (Math.floor(t / 0.8) % 2 ? 0.2 : 0); }
          else if (t < POP0) { a.body.rotation.x = 0.35; a.armL.rotation.x = a.armR.rotation.x = -1.6; a.setFace('sleepy'); }
          else if (t < 4.5) { surprised(a, 0.9, bump(t, [POP0], 0.2)); }
          else if (t < 9.5) { a.setFace('happy'); a.armR.rotation.x = -1.5 + Math.sin(t * 9) * 0.3; }
          else { a.root.position.set(-5.2, 0, -0.4); a.root.rotation.y = 0.6; a.setFace(t > 12 ? 'happy' : 'normal'); if (t > 12 && t < 13.4) a.armR.rotation.z = 2.6; }
        } else {
          a.root.position.set(-4.4, 0, -0.9); a.root.rotation.y = -0.9; surprised(a, 0.4, 0);
        }
        cloneList.forEach(({ c, seat, t: tp }, k) => {
          reset(c);
          c.root.visible = t >= tp && t < 20.5;
          if (!c.root.visible) return;
          const pop = popScale(t, tp, 0.25);
          c.root.scale.setScalar(pop);
          const pts = [[SPAWN[0], SPAWN[2]], [-4.8, seat.aisle], [seat.x, seat.aisle], [seat.x, seat.z]];
          const u = prog(t, tp + 0.4, tp + 1.7);
          if (u <= 0) { c.root.position.set(SPAWN[0], 0, SPAWN[2]); c.root.rotation.y = 0.6; c.setFace(k === 0 ? 'shock' : 'happy'); return; }
          if (u < 1) { const p = walkPath(pts, ease.inOut(u)); c.root.position.set(p.x, 0, p.z); c.root.rotation.y = p.dir; walk(c, t * 16, 0.6); return; }
          c.root.position.set(seat.x, 0, seat.z); c.root.rotation.y = 0;
          sit(c); typing(c, t + k * 0.3);
          if (t > 12.0 && t < 15) { c.head.rotation.y = 0.65; c.armL.rotation.x = c.armR.rotation.x = -0.6; c.setFace('happy'); if (t < 13.4) c.armR.rotation.x = -2.9; }
        });
        reset(BOSS);
        BOSS.root.visible = t >= 9.5;
        if (t < 15) {
          const u = prog(t, 9.6, 10.5);
          BOSS.root.position.set(lerp(9.5, 5.6, u), 0, 1.6);
          if (u < 1) walk(BOSS, t * 12, 0.45); else BOSS.root.rotation.y = -1.25;
          if (t > 13.4) BOSS.setFace('shock');
        } else {
          BOSS.root.position.set(-5.9, 0, -2.2); BOSS.root.rotation.y = -Math.PI / 2;
          if (t < 16.6) { BOSS.body.rotation.x = 0.35; BOSS.armL.rotation.x = BOSS.armR.rotation.x = -1.6; }
          else { BOSS.root.rotation.y = -0.4; BOSS.setFace('shock'); BOSS.armL.rotation.z = -0.5; BOSS.armR.rotation.z = 0.5; }
        }
        minis.forEach(({ c, t: tp, ph }) => {
          reset(c);
          c.root.visible = t >= tp && t >= 15;
          if (!c.root.visible) return;
          c.root.scale.setScalar(0.36 * popScale(t, tp, 0.25));
          const run = Math.max(0, t - tp - 0.35), ang = run * 3.2 + ph;
          const r = Math.min(1, run * 2) * 1.0;
          c.root.position.set(-5.4 + Math.sin(ang) * r, 0, 0.1 + Math.cos(ang) * r);
          c.root.rotation.y = ang + Math.PI / 2;
          if (run > 0) walk(c, t * 20, 0.8);
          c.setFace('happy');
        });
      };
      scenes.push({
        id: 'office', start: 0, end: 15, scene: S, update,
        cam: (lt, t) => {
          if (t < 4.5) return camPath([-2.4, 3.0, 4.8], [-2.9, 2.7, 4.0], [-6.3, 1.0, -1.8], [-6.4, 1.0, -1.8], 38, 4.5)(t);
          if (t < 9.5) return camPath([0.5, 6.2, 10.5], [1.2, 6.6, 11.6], [-1.6, 0.6, -2.4], [0.6, 0.6, -2.2], 40, 5)(t - 4.5);
          return camPath([3.6, 5.4, 11.8], [3.0, 5.0, 10.8], [1.4, 0.9, -1.6], [1.6, 0.9, -1.6], 40, 5.5)(t - 9.5);
        },
      });
      scenes.push({ id: 'office', start: 15, end: 20.5, scene: S, update, cam: camPath([-1.6, 3.0, 5.6], [-2.2, 2.6, 4.6], [-5.6, 0.7, -0.9], [-5.6, 0.6, -0.8], 38, 5.5) });
    }

    /* ===== 定時退社と給料日（20.5〜30秒） ===== */
    let A1;
    {
      const S = newScene({ sky: ['#ffae7a', '#ffe2b8'], sunColor: '#ffd8b0', sunI: 0.55, amb: 0.72 });
      streetSet(S, { windows: [[-7, 4], [5, 4]], sign: 'ブロック町IT' });
      const clock = P.wallClock(S, [-3.6, 3.2, -2.9], 1.0); clock.set(18);
      const r = mulberry32(55), N = 24;
      const crowd = [];
      const center = [3.4, -0.6];
      for (let i = 0; i < N; i++) {
        let pos;
        if (i === 0) pos = [3.4, 1.2];
        else {
          const ring = i < 8 ? 1.5 : i < 16 ? 2.6 : 3.7, a = -Math.PI * ((((i - 1) % 8) + 0.5) / 8) + (r() - 0.5) * 0.15;
          pos = [center[0] + Math.cos(a) * ring * 1.15, center[1] + Math.sin(a) * ring * 0.62];
        }
        const c = addChar(S, CAST.A, [0, 0, -3.6]);
        crowd.push({ c, pos, t: 20.7 + i * 0.17, face: atan2Face(pos) });
      }
      function atan2Face(p) { return Math.atan2(3.4 - p[0], 1.2 - p[1]); }
      A1 = crowd[0].c;
      const env = group(A1.armR, [0, -0.66, 0.14]);
      box(env, [0.5, 0.32, 0.04], [0, 0, 0], faces(solid('#f4f1ea'), { front: P.glow(textTex('給料', { w: 128, h: 64, size: 40, bg: '#f4f1ea', fg: '#d24b4b' })) }));
      const update = (lt, t) => {
        crowd.forEach(({ c, pos, t: t0, face }, i) => {
          reset(c);
          c.root.visible = t >= t0;
          if (!c.root.visible) return;
          const u = prog(t, t0, t0 + 1.6);
          const pts = [[0, -3.6], [0, -1.8], [pos[0], pos[1]]];
          if (u < 1) { const p = walkPath(pts, u); c.root.position.set(p.x, 0, p.z); c.root.rotation.y = p.dir; walk(c, t * 14 + i, 0.6); c.setFace('happy'); return; }
          c.root.position.set(pos[0], 0, pos[1]);
          if (i === 0) {
            c.root.rotation.y = t > 25.5 ? 0 : -0.3;
            if (t > 25.6) { c.armR.rotation.x = -1.5; c.armR.rotation.z = 0.35; c.setFace(t > 27.0 ? 'sleepy' : 'happy'); c.head.rotation.x = 0.25; }
          } else {
            c.root.rotation.y = t > 25.5 ? face : -Math.PI / 2 + (i % 3) * 0.3;
            if (t > 25.6) { c.setFace(i % 4 === 0 ? 'sleepy' : 'shock'); c.head.rotation.x = 0.2; }
          }
        });
        env.visible = t > 25.55;
        env.rotation.set(1.5, -0.35, 0);
      };
      scenes.push({ id: 'street', start: 20.5, end: 25.5, scene: S, update, cam: camPath([9.0, 4.6, 13.0], [8.0, 4.2, 12.0], [1.6, 1.6, -1.4], [2.2, 1.4, -1.2], 40, 5) });
      scenes.push({ id: 'street', start: 25.5, end: 30.01, scene: S, update, cam: camPath([5.6, 3.2, 8.8], [4.8, 3.0, 7.8], [3.2, 1.4, -0.4], [3.3, 1.5, -0.4], 38, 4.5) });
    }

    /* ===== 重ね表示 ===== */
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもコピー機が、人までコピーできたら', cls: 'title' },
        { text: 'ブロック町のIT企業、締め切り前日', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: POP0, t1: 30.1, label: '社員Aの人数', value: people, format: (n) => `${n}人`, done: (t) => t >= 23.5 },
      { type: 'fx', t0: 3.4, t1: POP0, text: 'ウィーン', x: 180, y: 140, rot: -5, size: 44 },
      { type: 'fx', t0: POP0, t1: POP0 + 0.6, text: 'ポンッ', x: 230, y: 330, rot: 8, size: 56 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '締め切り前日の社員Aは、', at: 4.65, cps: 18 },
        { text: '自分を増やすことにした', at: 5.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '翌朝、', at: 9.65, cps: 16 },
        { text: '全員が社員A', at: 10.1, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 10.6, t1: 11.9, text: 'Aくん、ちょっといい？', scene: 'office', anchor: headTop(BOSS) },
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => ({ type: 'bubble', t0: 12.0 + k * 0.03, t1: 13.4, text: 'はい', cls: 'small', scene: 'office', silent: k > 0, anchor: () => headTop(cloneList[k].c, 0.8)() })),
      { type: 'bubble', t0: 12.0, t1: 13.4, text: 'はい', cls: 'small', scene: 'office', silent: true, anchor: headTop(A0, 0.8) },
      { type: 'bubble', t0: 13.5, t1: 15, text: '…どのAくん？', scene: 'office', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '部長もまねしたが、', at: 15.15, cps: 18 },
        { text: 'A4サイズで出てくる', at: 16.9, cps: 16, cls: 'mark' },
      ] },
      ...MINI.map((t, i) => ({ type: 'fx', t0: t, t1: t + 0.5, text: 'ポンッ', x: [260, 340, 200][i], y: [420, 360, 470][i], rot: i % 2 ? 7 : -7, size: 46 })),
      { type: 'tag', t0: 18.4, t1: CUTS[3], text: '用紙サイズ：A4' },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '18時ちょうど、', at: 20.65, cps: 18 },
        { text: '全員そろって定時退社', at: 21.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.6, t1: 24.6, text: 'ゾロゾロ', x: 980, y: 300, rot: -6, size: 54, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも給料は、1人分。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '48人の社員A', at: 27.2, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #05　おわり' },
    ];

    /* ===== 音 ===== */
    const S_ = AUDIO.SFX;
    const scan = (t) => [AUDIO.noise(t, 0.5, { filter: 'bandpass', freq: 700, freq2: 1800, q: 3, gain: 0.06 }), AUDIO.tone(t, 220, 0.5, { type: 'triangle', gain: 0.04 })];
    const audio = AUDIO.music({ prog: ['C', 'Em', 'F', 'G', 'C', 'Em', 'F', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'], arp: [2, 3, 10, 11] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    [1.0, 1.8, 2.6, 3.4, 16.1].forEach((t) => add(scan(t)));
    for (let k = 0; k < CLONES; k++) add(S_.pop(popAt(k), k % 10));
    MINI.forEach((t, i) => add(S_.pop(t, 10 + i)));
    add(S_.chime(20.55));
    for (let i = 0; i < 40; i++) add(S_.step(20.8 + i * 0.1));
    add(S_.cheer(12.0));
    add(S_.coinSmall(25.6));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
