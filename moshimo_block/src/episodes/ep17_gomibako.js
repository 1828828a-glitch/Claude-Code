/* ep17 — もしも会社のゴミ箱が、ブラックホールだったら（30秒） */
EPISODES.push({
  id: 'ep17',
  no: 17,
  short: 'ブラックホールのゴミ箱',
  title: 'もしも会社のゴミ箱が、ブラックホールだったら',
  lead: '紙くずも古いPCも、なんでも入るゴミ箱。吸いこむ力はだんだん強くなり、机も部長も、最後は会社ごと。それでも吸いこめないものがひとつだけあった。',
  duration: 30,
  poster: 17.4,
  chapters: [
    { t: 0, name: 'ポイ捨て' }, { t: 4.5, name: 'ピカピカ' }, { t: 9.5, name: '強くなる' },
    { t: 15, name: '部長も' }, { t: 20.5, name: '会社ごと' }, { t: 25.5, name: '月曜日' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const BIN = [0.6, 0, 0.6];
    const count = (t) => {
      if (t < 2.0) return 0;
      if (t < 4.5) return 1;
      if (t < 9.5) return 1 + Math.floor(30 * prog(t, 5.0, 9.0));
      if (t < 15) return 31 + Math.floor(60 * prog(t, 10.0, 14.6));
      if (t < 20.5) return 91 + Math.floor(12 * prog(t, 15.4, 18.0)) + (t >= 17.8 ? 1 : 0);
      if (t < 25.5) return 104 + Math.floor(12241 * ease.in(prog(t, 21.0, 24.6)));
      return 12345 - (t >= 26.4 ? 1 : 0);
    };
    const binProp = (parent, pos, s = 1) => {
      const g = group(parent, pos);
      g.scale.setScalar(s);
      box(g, [0.62, 0.7, 0.62], [0, 0.35, 0], solid('#2a2440'));
      box(g, [0.5, 0.04, 0.5], [0, 0.71, 0], new T.MeshBasicMaterial({ color: '#05030a' }), { cast: false });
      const ring = group(g, [0, 0.78, 0]);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; box(ring, [0.1, 0.06, 0.1], [Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42], new T.MeshBasicMaterial({ color: i % 2 ? '#b37bff' : '#6a3dff' }), { cast: false }); }
      return { g, ring };
    };
    /* らせんを描いてゴミ箱へ */
    const swirl = (p0, to, t, ts, d) => {
      const u = prog(t, ts, ts + d);
      if (u <= 0) return { pos: p0, s: 1, u };
      const dx = p0[0] - to[0], dz = p0[2] - to[2], r0 = Math.hypot(dx, dz), a0 = Math.atan2(dz, dx);
      const e = ease.in(u), r = r0 * (1 - e), a = a0 + e * Math.PI * 5;
      return { pos: [to[0] + Math.cos(a) * r, lerp(p0[1], to[1], e) + Math.sin(u * Math.PI) * 0.6, to[2] + Math.sin(a) * r], s: Math.max(0.0001, 1 - e), u };
    };

    let A, BOSS, staff;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      const bin = binProp(S, BIN);
      const seats = [[-3.6, -2.6, CAST.A], [0.6, -2.8, CAST.M1], [4.4, -2.6, CAST.M2], [-2.6, 1.4, CAST.M3], [3.8, 1.4, CAST.NEW]];
      const rigs = seats.map(([x, z, look]) => {
        const g = group(S);
        P.desk(g, x, z); P.chair(g, x, z - 0.95); P.laptop(g, x, 0.82, z - 0.1);
        const c = addChar(S, look, [x, 0, z - 0.95]);
        return { g, c, home: [x, 0, z] };
      });
      staff = rigs.map((r) => r.c);
      A = staff[0];
      BOSS = addChar(S, CAST.BOSS, [6.6, 0, -0.4], -1.0);
      const r = mulberry32(1717);
      const junk = [];
      junk.push({ m: box(S, [0.22, 0.22, 0.22], [0, -99, 0], solid('#ffffff')), p0: [-3.0, 1.4, -2.2], ts: 1.2, d: 0.8 });
      for (let i = 0; i < 18; i++) {
        const isPc = i % 3 === 0;
        junk.push({ m: box(S, isPc ? [0.6, 0.45, 0.4] : [0.42, 0.06, 0.56], [0, -99, 0], solid(isPc ? '#3a4049' : '#ffffff')), p0: [-6 + r() * 12, 0.5 + r() * 1.5, -4 + r() * 6], ts: 5.0 + i * 0.22, d: 0.9 });
      }
      for (let i = 0; i < 26; i++) {
        const kind = i % 3, rg = rigs[i % 5];
        junk.push({ m: box(S, kind === 0 ? [0.18, 0.22, 0.18] : kind === 1 ? [0.42, 0.04, 0.56] : [0.3, 0.1, 0.12], [0, -99, 0], solid(['#f4f1ea', '#ffffff', '#d24b4b'][kind])), p0: [rg.home[0] + (r() - 0.5) * 1.2, 0.95, rg.home[2] + (r() - 0.5) * 0.6], ts: 10.0 + i * 0.17, d: 1.0 });
      }
      const ringSpeed = (t) => (t < 9.5 ? 3 : t < 15 ? 8 : 16);
      const update = (lt, t) => {
        bin.ring.rotation.y = t * ringSpeed(t);
        bin.g.scale.setScalar(1 + (t >= 15 ? 0.6 * prog(t, 15, 18) : 0) + Math.sin(t * 20) * 0.02);
        junk.forEach((j) => {
          const w = swirl(j.p0, [BIN[0], 0.8, BIN[2]], t, j.ts, j.d);
          const appear = j.ts < 4.5 ? 0.6 : j.ts < 9.5 ? 4.5 : 9.5;
          j.m.visible = t >= appear && w.u < 1 && t < 15;
          j.m.position.set(w.pos[0], w.pos[1], w.pos[2]); j.m.scale.setScalar(w.s); j.m.rotation.set(t * 3, t * 4, 0);
        });
        rigs.forEach((rg, i) => {
          const ts = 15.4 + i * 0.5, w = swirl([0, 0, 0], [BIN[0] - rg.home[0], 0.6, BIN[2] - rg.home[2]], t, ts, 1.0);
          rg.g.position.set(w.pos[0], w.pos[1], w.pos[2]);
          rg.g.scale.setScalar(w.s);
          rg.g.visible = w.u < 1;
          const c = rg.c;
          reset(c);
          if (t < 15 || w.u <= 0) { sit(c); typing(c, t + i, 14, 0.1); }
          else { const dx = BIN[0] - c.root.position.x, dz = BIN[2] - c.root.position.z; c.root.rotation.y = Math.atan2(-dx, -dz); c.root.rotation.x = -0.35; banzai(c, 0.4, Math.sin(t * 20 + i) * 0.2); c.setFace('shock'); }
          if (i === 0 && t < 4.5 && t > 0.6) { c.armR.rotation.x = t < 1.2 ? -2.6 : -1.0; }
          if (t >= 4.5 && t < 9.5) c.setFace('happy');
          if (t >= 9.5 && t < 15) { c.setFace('shock'); c.root.rotation.x = -0.1; }
        });
        reset(BOSS);
        const bw = swirl([6.6, 0, -0.4], [BIN[0], 0.6, BIN[2]], t, 17.4, 0.9);
        BOSS.root.visible = bw.u < 1 && t < 20.5;
        BOSS.root.position.set(bw.pos[0], bw.pos[1], bw.pos[2]); BOSS.root.scale.setScalar(1.08 * bw.s);
        if (t >= 9.5) { BOSS.setFace('shock'); BOSS.root.rotation.x = -0.2; BOSS.armL.rotation.z = -0.5; BOSS.armR.rotation.z = 0.5; }
        if (bw.u > 0) { BOSS.root.rotation.set(t * 8, t * 6, 0); banzai(BOSS, 1); }
      };
      const cams = [
        [0, 4.5, camPath([3.6, 3.4, 7.4], [3.0, 3.2, 6.6], [-1.2, 0.9, -0.8], [-1.0, 0.9, -0.6], 42, 4.5)],
        [4.5, 9.5, camPath([5.4, 5.0, 10.4], [4.8, 4.6, 9.6], [0.4, 1.0, -0.8], [0.4, 1.0, -0.8], 42, 5)],
        [9.5, 15, camPath([4.8, 4.2, 9.0], [4.2, 3.8, 8.2], [0.4, 1.0, -0.6], [0.4, 1.0, -0.6], 42, 5.5)],
        [15, 20.5, camPath([5.6, 5.2, 10.6], [5.0, 4.8, 9.8], [0.8, 0.8, -0.4], [0.8, 0.8, -0.4], 44, 5.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt), shake: (lt) => (lt + a >= 9.5 ? 0.02 + (lt + a >= 15 ? 0.04 : 0) : 0) }));
    }

    /* ===== 外：会社ごと（20.5〜30秒） ===== */
    let A2, BOSS2, crowd;
    {
      const S = newScene({ sky: ['#6fc0f0', '#e3f4ff'], sun: [12, 30, 16], fog: ['#e3f4ff', 70, 180] });
      const ground = new Blocks(); ground.fill('stone', -30, -1, -20, 30, -1, 20); ground.build(S, {}, { cast: false });
      const cells = [];
      for (let x = -6; x <= 5; x++) for (let y = 0; y <= 15; y++) { cells.push([x, y, 1]); cells.push([x, y, -6]); }
      for (let z = -5; z <= 0; z++) for (let y = 0; y <= 15; y++) { cells.push([5, y, z]); cells.push([-6, y, z]); }
      for (let x = -5; x <= 4; x++) for (let z = -5; z <= 0; z++) cells.push([x, 16, z]);
      const N = cells.length, bld = new T.InstancedMesh(UNIT, blockMat('facade'), N);
      S.add(bld);
      const r = mulberry32(1718);
      const order = cells.map((c, i) => ({ c, ts: 21.0 + (1 - c[1] / 16) * 0.2 + r() * 3.2 + (c[1] / 16) * 0.2 })).sort((a, b) => a.ts - b.ts);
      const SB = [0.5, 0, 8.5];
      const bin = binProp(S, SB, 2.2);
      crowd = [CAST.A, CAST.M1, CAST.M2, CAST.M3, CAST.NEW].map((look, i) => addChar(S, look, [SB[0] - 3 + i * 1.5, 0, SB[2] + 2.6 + (i % 2) * 0.6], Math.PI));
      A2 = crowd[0];
      BOSS2 = addChar(S, CAST.BOSS, [0, -99, 0]);
      const cal = group(S);
      box(cal, [0.9, 1.1, 0.12], [0, 0, 0], faces(solid('#ffffff'), { front: P.glow(textTex('月', { w: 128, h: 128, size: 90, bg: '#ffffff', fg: '#d24b4b' })), back: P.glow(textTex('月', { w: 128, h: 128, size: 90, bg: '#ffffff', fg: '#d24b4b' })) }));
      box(cal, [0.9, 0.2, 0.14], [0, 0.6, 0], solid('#d24b4b'));
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e3 = new T.Euler(), ps = new T.Vector3(), sc = new T.Vector3();
      const update = (lt, t) => {
        bin.ring.rotation.y = t * 18;
        order.forEach(({ c, ts }, i) => {
          const w = swirl([c[0] + 0.5, c[1] + 0.5, c[2] + 0.5], [SB[0], 1.8, SB[2]], t, ts, 1.1);
          ps.set(w.pos[0], w.pos[1], w.pos[2]); q.setFromEuler(e3.set(w.u * 6, w.u * 8, 0)); sc.setScalar(w.u >= 1 ? 0.0001 : w.s);
          m4.compose(ps, q, sc); bld.setMatrixAt(i, m4);
        });
        bld.instanceMatrix.needsUpdate = true;
        crowd.forEach((c, i) => {
          reset(c);
          c.root.rotation.y = Math.PI + (i - 2) * 0.15;
          c.root.position.set(SB[0] - 3 + i * 1.5, 0, SB[2] + 2.6 + (i % 2) * 0.6);
          if (t < 25.5) { c.setFace('shock'); c.root.rotation.x = -0.25; banzai(c, 0.4, Math.sin(t * 16 + i) * 0.2); }
          else { c.root.rotation.y = Math.PI + (i - 2) * 0.2; c.setFace(t > 27.2 ? 'sleepy' : 'shock'); c.head.rotation.x = 0.2; }
        });
        reset(BOSS2);
        BOSS2.root.visible = t >= 26.4;
        const bu = prog(t, 26.4, 27.0);
        BOSS2.root.position.set(SB[0] - bu * 1.6, 1.6 + Math.sin(bu * Math.PI) * 2.0 - (bu >= 1 ? 1.6 : 0), SB[2] + bu * 1.2);
        if (bu < 1) BOSS2.root.rotation.set(bu * 6, 0, 0); else { BOSS2.root.rotation.set(0, -2.6, 0); BOSS2.setFace('shock'); }
        cal.visible = t >= 27.2;
        const cu = prog(t, 27.2, 27.8);
        cal.position.set(SB[0] - cu * 2.6, 1.8 + Math.sin(cu * Math.PI) * 2.6 + (cu >= 1 ? 0.6 : 0) - (cu >= 1 ? 1.8 : 0), SB[2] - cu * 0.8);
        cal.rotation.set(0, cu < 1 ? cu * 8 : -2.2, 0);
      };
      scenes.push({ id: 'lot', start: 20.5, end: 25.5, scene: S, update, cam: camPath([16, 12, 30], [14, 10, 27], [0, 7, 0], [0.4, 4.0, 3], 44, 5), shake: () => 0.05 });
      scenes.push({ id: 'lot', start: 25.5, end: 30.01, scene: S, update, cam: camPath([-4.0, 3.6, 3.2], [-3.4, 3.4, 3.8], [0.2, 1.3, 10.4], [0.2, 1.3, 10.4], 42, 4.5) });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも会社のゴミ箱が、ブラックホールだったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、金曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 2.0, t1: 30.1, label: 'ゴミ箱が吸いこんだもの', value: count, format: (n) => `${n.toLocaleString('ja-JP')}個`, done: (t) => t >= 24.6 },
      { type: 'fx', t0: 1.9, t1: 2.6, text: 'シュポッ', x: 760, y: 360, rot: 7, size: 46 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: 'なんでも入るので、', at: 4.65, cps: 18 },
        { text: '社内がピカピカ', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: 'でもだんだん、', at: 9.65, cps: 16 },
        { text: '吸いこむ力が強くなる', at: 10.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 10.2, t1: 14.8, text: 'ゴオオオ', x: 900, y: 260, rot: -6, size: 52, shake: true },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '机も、イスも、', at: 15.15, cps: 18 },
        { text: '部長も', at: 17.5, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 17.6, t1: 19.4, text: '部長ーーっ！', scene: 'office', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '最後は、', at: 20.65, cps: 16 },
        { text: '会社ごと吸いこんだ', at: 21.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.2, t1: 25.0, text: 'ズゴゴゴゴ', x: 880, y: 300, rot: -6, size: 58, shake: true },
      { type: 'fx', t0: 26.4, t1: 27.0, text: 'ペッ', x: 760, y: 280, rot: 7, size: 52 },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも月曜日だけは、吸いこめない。', at: 27.3, cps: 18, cls: 'mark-soft small' },
        { text: 'ゴミ箱がブラックホールの会社', at: 28.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.9, t1: 30.1, text: 'もしもブロック劇場 #17　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const suck = (t, d, g = 0.06) => [AUDIO.noise(t, d, { filter: 'bandpass', freq: 300, freq2: 1600, q: 1.5, gain: g, long: true, fade: 0.3 })];
    const audio = AUDIO.music({ prog: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Dm', 'Am', 'Dm', 'Am', 'F', 'G', 'F', 'C'], arp: [8, 9, 10, 11] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    add(S_.whistle(1.2, 0.8)); add(S_.pop(2.0, 6));
    for (let t = 5.0; t < 9.0; t += 0.22) add(S_.pop(t + 0.9, 8));
    add(suck(9.6, 5.4, 0.06)); add(suck(15, 5.5, 0.1)); add(suck(20.6, 4.8, 0.16));
    add(S_.whistle(17.4, 0.9));
    add(S_.pop(26.4, 2)); add(S_.pop(27.2, 6));
    add(S_.pop(28.9, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
