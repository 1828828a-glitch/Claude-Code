/* ep10 — もしも会社のWi-Fiが、目に見えるブロックだったら（30秒） */
EPISODES.push({
  id: 'ep10',
  no: 10,
  short: '見えるWi-Fi',
  title: 'もしも会社のWi-Fiが、目に見えるブロックだったら',
  lead: '電波は青いブロックになって飛んでいく。部長が前に立てば止まり、動画を見れば部長にだけ流れ込む。社員は全員ルーターのまわりに座ることにした。',
  duration: 30,
  poster: 6.4,
  chapters: [
    { t: 0, name: 'ルーター' }, { t: 4.5, name: '丸見え' }, { t: 9.5, name: '通せんぼ' },
    { t: 15, name: '動画' }, { t: 20.5, name: '集合' }, { t: 25.5, name: '翌日' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const R = [0, 1.45, -5.2];
    const BLOCK = [10.8, 15], VIDEO = [15.6, 20.5];
    const bars = (t) => (t < 9.5 ? 1 : t < 20.5 ? 0 : t < 25.5 ? 3 : 0);

    let staff, BOSS, A;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { windows: [[-7, 2], [-6, 2], [-7, 3], [-6, 3], [5, 2], [6, 2], [5, 3], [6, 3]] });
      box(S, [2.2, 1.2, 0.7], [0, 0.6, -5.5], solid('#7a5232'));
      const router = group(S, R);
      box(router, [0.9, 0.24, 0.5], [0, 0, 0], solid('#1d2333'));
      [-0.3, 0.3].forEach((x) => box(router, [0.06, 0.6, 0.06], [x, 0.4, -0.15], solid('#1d2333'), { rot: [0, 0, x * 0.6] }));
      [-0.2, 0, 0.2].forEach((x) => box(router, [0.06, 0.04, 0.02], [x, 0.03, 0.26], new T.MeshBasicMaterial({ color: '#4cd964' }), { cast: false }));
      const seats = [[-3.5, -3.0, CAST.M1], [3.5, -3.0, CAST.M2], [-2.0, 0.6, CAST.M3], [2.0, 0.6, CAST.NEW], [-8.0, 1.6, CAST.A]];
      const rigs = seats.map(([x, z, look]) => { const g = group(S); return { g, c: workstation(g, x, z, look), tgt: [x, 1.1, z - 0.1] }; });
      staff = rigs.map((r) => r.c);
      A = staff[4];
      BOSS = addChar(S, CAST.BOSS, [9.5, 0, 1.6], -Math.PI / 2);
      const tablet = group(BOSS.armR, [0, -0.66, 0.14]);
      box(tablet, [0.5, 0.36, 0.04], [0, 0, 0], faces(solid('#2b3140'), { front: P.screenTex('new') }));
      const bossDesk = group(S);
      P.desk(bossDesk, 0, -3.9); P.laptop(bossDesk, 0, 0.82, -4.0);
      box(bossDesk, [1.0, 0.32, 0.04], [0, 0.5, -3.39], faces(solid('#f2c230'), { front: P.glow(textTex('部長', { w: 128, h: 64, size: 40 })) }));
      /* 電波のかたまり */
      const N = 260, pk = new T.InstancedMesh(new T.BoxGeometry(0.16, 0.16, 0.16), new T.MeshBasicMaterial({ color: '#4fd2ff' }), N);
      S.add(pk);
      const RING = 4, PER = 28, rings = new T.InstancedMesh(new T.BoxGeometry(0.22, 0.22, 0.22), new T.MeshBasicMaterial({ color: '#9fe6ff', transparent: true, opacity: 0.5 }), RING * PER);
      S.add(rings);
      const sparks = new T.InstancedMesh(new T.BoxGeometry(0.12, 0.12, 0.12), new T.MeshBasicMaterial({ color: '#ffe14a' }), 24);
      S.add(sparks);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3(), one = new T.Vector3(1, 1, 1);
      const r = mulberry32(1010);
      const pkt = Array.from({ length: N }, () => ({ ph: r(), lane: r(), j: [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3] }));
      const crowd = [[-1.6, -3.4], [-0.8, -2.8], [0.8, -2.8], [1.6, -3.4], [2.2, -4.3]];
      const update = (lt, t) => {
        const S5 = t >= 20.5 && t < 25.5, S6 = t >= 25.5;
        bossDesk.visible = S6;
        reset(BOSS);
        BOSS.root.visible = t >= 9.5;
        let bossPos = null;
        if (t >= 9.5 && t < 20.5) {
          const u = prog(t, 9.7, 10.8);
          BOSS.root.position.set(lerp(9.5, 0, u), 0, lerp(1.6, -4.3, u));
          if (u < 1) { walk(BOSS, t * 12, 0.45); BOSS.root.rotation.y = Math.atan2(-9.5, -5.9); }
          else { BOSS.root.rotation.y = 0; bossPos = [0, 1.2, -4.3]; }
          if (t >= BLOCK[0] && t < 15) { BOSS.armL.rotation.x = BOSS.armR.rotation.x = -3.0; BOSS.setFace('sleepy'); }
          if (t >= 15) { BOSS.root.position.set(0.9, 0, -4.3); BOSS.armR.rotation.x = -1.4; BOSS.armL.rotation.x = -1.2; BOSS.head.rotation.x = 0.3; BOSS.setFace('happy'); bossPos = null; }
        } else if (S5) {
          BOSS.root.position.set(7.0, 0, 1.0); BOSS.root.rotation.y = -0.9; BOSS.setFace('shock');
        } else if (S6) {
          BOSS.root.position.set(0, 0, -4.85); sit(BOSS); typing(BOSS, t); BOSS.setFace('happy');
        }
        tablet.visible = t >= 15 && t < 20.5;
        /* 社員 */
        rigs.forEach((rg, i) => {
          const c = rg.c;
          reset(c);
          rg.g.visible = !S5 && !S6;
          c.root.visible = true;
          if (S5 || S6) {
            c.root.parent !== S && S.attach(c.root);
            const p = crowd[i];
            const q6 = [[-2.4, -4.4], [-3.2, -3.6], [2.4, -4.4], [3.2, -3.6], [-2.2, -2.8]][i];
            c.root.position.set(S6 ? q6[0] : p[0], 0, S6 ? q6[1] : p[1]);
            c.root.rotation.y = Math.atan2(R[0] - c.root.position.x, R[2] - c.root.position.z) + Math.PI;
            sit(c); c.root.position.y = -0.2;
            c.armL.rotation.x = c.armR.rotation.x = -1.1 + Math.sin(t * 16 + i) * 0.1;
            c.setFace(S6 ? 'sleepy' : 'happy');
            if (i === 4 && S5) { c.root.position.set(-0.7, 1.2, -5.5); c.root.rotation.y = 0; c.root.position.y = 1.2 - 0.2 + 0.5; }
            return;
          }
          if (c.root.parent === S) { rg.g.attach(c.root); }
          sit(c);
          const starving = (t >= BLOCK[0] && t < 15) || (t >= 15 && i !== 99);
          if (t < BLOCK[0]) { typing(c, t + i, 16, 0.12); if (i === 4) { c.setFace('sleepy'); c.armL.rotation.x = c.armR.rotation.x = -1.2; } else c.setFace('happy'); }
          else if (starving) { c.armL.rotation.x = c.armR.rotation.x = -0.7; c.setFace(t > 12 ? 'shock' : 'sleepy'); c.head.rotation.y = i % 2 ? -0.5 : 0.5; }
        });
        /* 電波：ルーターから各ノートPCへ */
        const targets = [];
        if (S5 || S6) staff.forEach((c) => targets.push({ p: c.head.localToWorld(V3(0, -0.3, 0.4)), w: S6 ? 0.15 : 1 }));
        else rigs.forEach((rg, i) => targets.push({ p: V3(rg.tgt[0], rg.tgt[1], rg.tgt[2]), w: i === 4 ? 0.25 : 1 }));
        if (t >= 15 && t < 20.5) targets.forEach((x) => { x.w = 0.04; });
        if (t >= 15 && t < 20.5) targets.push({ p: BOSS.armR.localToWorld(V3(0, -0.66, 0.2)), w: 6, boss: true });
        if (S6) targets.push({ p: V3(0, 1.1, -4.0), w: 2.5, boss: true });
        const total = targets.reduce((s, x) => s + x.w, 0);
        let hit = 0;
        pkt.forEach((p, i) => {
          let acc = 0, tg = targets[0];
          for (const x of targets) { acc += x.w / total; if (p.lane <= acc) { tg = x; break; } }
          let u = (t * 0.9 + p.ph) % 1;
          const from = V3(R[0], R[1] + 0.1, R[2] + 0.2), to = tg.p;
          let s = 1;
          if (bossPos && !tg.boss) { const stop = 0.22; if (u > stop) { s = 0.0001; hit++; } }
          ps.set(lerp(from.x, to.x, u) + p.j[0] * Math.sin(u * Math.PI), lerp(from.y, to.y, u) + Math.sin(u * Math.PI) * (tg.boss ? 1.9 : 0.8) + p.j[1], lerp(from.z, to.z, u));
          sc.setScalar(s * (tg.boss ? 1.1 : 1));
          m4.compose(ps, q, sc); pk.setMatrixAt(i, m4);
        });
        pk.instanceMatrix.needsUpdate = true;
        for (let k = 0; k < RING; k++) {
          const u = (t * 0.5 + k / RING) % 1, rad = 0.6 + u * 6;
          for (let j = 0; j < PER; j++) {
            const a = (j / PER) * Math.PI * 2;
            ps.set(R[0] + Math.cos(a) * rad, R[1] + Math.sin(a) * rad * 0.35 + 0.3, R[2] + Math.abs(Math.sin(a)) * rad * 0.6);
            sc.setScalar((1 - u) * 0.9 + 0.05);
            m4.compose(ps, q, sc); rings.setMatrixAt(k * PER + j, m4);
          }
        }
        rings.instanceMatrix.needsUpdate = true;
        for (let k = 0; k < 24; k++) {
          const on = bossPos && t >= BLOCK[0] && t < 15;
          const u = (t * 2.3 + k / 24) % 1, a = k * 2.4;
          ps.set(Math.cos(a) * u * 0.9, 1.6 + Math.sin(a * 1.3) * u * 0.7, -4.6 + u * 0.4);
          sc.setScalar(on ? 1 - u : 0.0001);
          m4.compose(ps, q, sc); sparks.setMatrixAt(k, m4);
        }
        sparks.instanceMatrix.needsUpdate = true;
      };
      const cams = [
        [0, 4.5, camPath([5.6, 5.4, 9.6], [5.0, 5.0, 8.8], [0, 1.4, -2.4], [0, 1.4, -2.6], 40, 4.5)],
        [4.5, 9.5, camPath([-3.0, 5.0, 9.0], [-2.4, 4.8, 8.4], [-2.6, 1.2, -1.6], [-2.2, 1.3, -1.8], 42, 5)],
        [9.5, 15, camPath([4.2, 6.0, 5.8], [3.6, 5.8, 5.0], [0, 1.4, -3.8], [0, 1.4, -4.0], 40, 5.5)],
        [15, 20.5, camPath([3.4, 5.4, 3.6], [2.8, 5.2, 3.0], [0.6, 1.4, -4.0], [0.6, 1.5, -4.1], 40, 5.5)],
        [20.5, 25.5, camPath([3.8, 4.4, 5.6], [3.2, 4.2, 4.8], [0, 1.2, -3.6], [0, 1.3, -3.8], 40, 5)],
        [25.5, 30.01, camPath([4.2, 4.4, 6.4], [3.6, 4.2, 5.6], [0, 1.2, -3.0], [0, 1.3, -3.2], 40, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも会社のWi-Fiが、目に見えるブロックだったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、午前10時', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '社員Aのアンテナ', value: bars, format: (n) => `${'▮'.repeat(n)}${'▯'.repeat(3 - n)} ${n}本`, done: (t) => t >= 20.5 && t < 25.5 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '電波が見えると、', at: 4.65, cps: 18 },
        { text: '窓際の席は届かない', at: 5.5, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 6.8, t1: 9.3, text: 'ここ、1本しか来ない…', scene: 'office', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '部長が前に立つと、', at: 9.65, cps: 18 },
        { text: '電波が止まる', at: BLOCK[0] + 0.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: BLOCK[0] + 0.1, t1: BLOCK[0] + 1.6, text: 'カンカンカン', x: 640, y: 210, rot: -5, size: 50, shake: true },
      { type: 'bubble', t0: 12.4, t1: 14.9, text: '部長、そこ電波です', scene: 'office', anchor: headTop(staff[0]) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: 'しかも部長は、', at: 15.15, cps: 18 },
        { text: '動画で全部持っていく', at: 16.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: 17.6, t1: CUTS[3], text: '社内の通信量の98%：部長' },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: 'そこで社員は、', at: 20.65, cps: 18 },
        { text: 'ルーターのまわりに座る', at: 21.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 22.6, t1: 25.3, text: '3本！', scene: 'office', anchor: headTop(A, 0.8) },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも翌日、部長の席はルーターの真ん前。', at: 25.75, cps: 15, cls: 'mark-soft small' },
        { text: 'Wi-Fiが見える会社', at: 27.6, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #10　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const ping = (t, n) => [AUDIO.tone(t, n, 0.08, { wave: 'pulse12', gain: 0.03, decay: true })];
    const audio = AUDIO.music({ prog: ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], arp: [0, 1, 6, 7] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    for (let t = 0.5; t < 9.5; t += 1.0) add(ping(t, 'E7'));
    for (let t = BLOCK[0]; t < BLOCK[0] + 1.6; t += 0.18) add(S_.tick(t, 1));
    add(S_.error(12.0));
    for (let t = VIDEO[0]; t < VIDEO[1]; t += 0.5) add(ping(t, 'G6'));
    add(S_.cheer(22.6));
    add(S_.error(25.9));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
