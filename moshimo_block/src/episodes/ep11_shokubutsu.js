/* ep11 — もしも会社の観葉植物が、毎日1ブロックずつ伸びたら（30秒） */
EPISODES.push({
  id: 'ep11',
  no: 11,
  short: '伸びる観葉植物',
  title: 'もしも会社の観葉植物が、毎日1ブロックずつ伸びたら',
  lead: '1日目は鉢植え、10日目は天井まで、30日目は会議を木の上で、60日目はランチが実る。100日目、木はビルより大きくなった。',
  duration: 30,
  poster: 12.0,
  chapters: [
    { t: 0, name: '1日目' }, { t: 4.5, name: '10日目' }, { t: 9.5, name: '30日目' },
    { t: 15, name: '60日目' }, { t: 20.5, name: '100日目' }, { t: 25.5, name: '水やり当番' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const DAYS = [[0, 1], [2.6, 2], [4.5, 10], [9.5, 30], [15, 60], [20.6, 100]];
    const heightAt = (t) => { let v = 1; DAYS.forEach(([s, h]) => { if (t >= s) v = h; }); if (t >= 20.6) v = Math.round(lerp(60, 100, prog(t, 20.6, 23.6))); return v; };
    const POT = [-6.5, -4.2];
    const can = (parent) => {
      const g = group(parent);
      box(g, [0.34, 0.3, 0.24], [0, 0, 0], solid('#3fb0a5'));
      box(g, [0.06, 0.06, 0.4], [0, 0.1, 0.28], solid('#3fb0a5'), { rot: [-0.6, 0, 0] });
      box(g, [0.06, 0.2, 0.06], [0, 0.22, -0.08], solid('#2b8a80'));
      return g;
    };

    /* ===== オフィス（ツタと葉のブロックが育つ） ===== */
    let A, BOSS, staff;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      box(S, [0.8, 0.6, 0.8], [POT[0], 0.3, POT[1]], solid('#c0663a'));
      const r = mulberry32(1111);
      const cells = [], seen = new Set();
      const add = (x, y, z, kind, order) => { const k = `${Math.round(x * 2)},${Math.round(y * 2)},${Math.round(z * 2)}`; if (seen.has(k)) return; seen.add(k); cells.push({ x, y, z, kind, order }); };
      for (let y = 0.8; y < 4.6; y += 0.4) add(POT[0], y, POT[1], 'stem', y);
      for (let b = 0; b < 14; b++) {
        let x = POT[0], z = POT[1], y = 4.4 - r() * 0.6, o = 4.6;
        const dx = (r() - 0.25) * 0.9, dz = (r() - 0.3) * 0.7;
        for (let s = 0; s < 34; s++) {
          x = clamp(x + dx + (r() - 0.5) * 0.5, -9.5, 8.5); z = clamp(z + dz + (r() - 0.5) * 0.5, -5.8, 2.6);
          y = clamp(y + (r() - 0.5) * 0.25, 3.4, 4.8); o += 0.45;
          add(x, y, z, s % 6 === 0 ? 'stem' : 'leaf', o);
          if (r() < 0.12) for (let d = 1; d < 5; d++) add(x, y - d * 0.4, z, 'leaf', o + d * 0.3);
        }
      }
      cells.sort((a, b) => a.order - b.order);
      const N = cells.length, leaves = new T.InstancedMesh(new T.BoxGeometry(0.42, 0.42, 0.42), new T.MeshLambertMaterial({ color: '#ffffff' }), N);
      const tint = new T.Color(), greens = ['#3f9b4b', '#4fb35a', '#2f7d3a', '#5cc466'];
      cells.forEach((c, i) => leaves.setColorAt(i, tint.set(c.kind === 'stem' && c.y > 2.0 ? '#6b4a2b' : greens[i % 4])));
      leaves.instanceColor.needsUpdate = true;
      leaves.castShadow = true; leaves.receiveShadow = true;
      S.add(leaves);
      const fruits = Array.from({ length: 16 }, (_, i) => { const c = cells[60 + i * 17] || cells[i]; return { m: box(S, [0.36, 0.36, 0.36], [c.x, c.y - 0.45, c.z], solid('#ff9f2e')), c }; });
      const deck = group(S, [1.0, 0, -2.6]);
      box(deck, [4.4, 0.18, 2.4], [0, 1.3, 0], solid('#a8794a'));
      [[-2, -1], [2, -1], [-2, 1], [2, 1]].forEach(([x, z]) => box(deck, [0.18, 1.3, 0.18], [x, 0.65, z], solid('#8b5e34')));
      const seats = [[-3.6, -2.6, CAST.M1], [4.6, -2.6, CAST.M2], [-1.0, 0.8, CAST.M3], [3.0, 0.8, CAST.NEW]];
      const ws = seats.map(([x, z, look]) => { const g = group(S); return { g, c: workstation(g, x, z, look) }; });
      staff = ws.map((w) => w.c);
      A = addChar(S, CAST.A, [-5.4, 0, -3.2], -2.4);
      const wc = can(A.armR); wc.position.set(0, -0.66, 0.16);
      BOSS = addChar(S, CAST.BOSS, [5.6, 0, 1.6], -0.8);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      const grown = (t) => {
        if (t < 2.6) return 1;
        if (t < 4.5) return 3;
        if (t < 9.5) return Math.floor(lerp(9, N * 0.35, ease.out(prog(t, 4.6, 6.2))));
        return Math.floor(lerp(N * 0.35, N, ease.out(prog(t, 9.6, 11.0))));
      };
      const update = (lt, t) => {
        const n = grown(t);
        cells.forEach((c, i) => {
          const on = i < n;
          ps.set(c.x, c.y, c.z); sc.setScalar(on ? (t >= 2.6 && t < 2.9 && i >= 1 && i < 3 ? popScale(t, 2.6, 0.3) : 1) : 0.0001);
          m4.compose(ps, q, sc); leaves.setMatrixAt(i, m4);
        });
        leaves.instanceMatrix.needsUpdate = true;
        const deckOn = t >= 9.5;
        deck.visible = deckOn;
        ws.forEach((w, i) => {
          const c = w.c;
          reset(c);
          w.g.visible = !deckOn || t >= 15;
          if (t >= 9.5 && t < 15) {
            S.attach(c.root);
            c.root.position.set(-0.4 + i * 1.0, 1.39, -2.9 + (i % 2) * 0.6);
            c.root.rotation.y = 0;
            sit(c); typing(c, t + i, 12, 0.1);
            c.setFace('happy');
            return;
          }
          if (c.root.parent === S) w.g.attach(c.root);
          sit(c); typing(c, t + i, 14, 0.12);
          if (t >= 4.5 && t < 9.5) { c.head.rotation.x = -0.4; c.setFace(i % 2 ? 'shock' : 'normal'); }
          if (t >= 15) { c.armR.rotation.x = -2.2; c.armR.rotation.z = -0.4; c.setFace('happy'); }
        });
        fruits.forEach((f, i) => { f.m.visible = t >= 15 && t < 20.5; f.m.position.y = f.c.y - 0.45 + (i === 0 ? 0 : 0); });
        const fall = fruits[0].m;
        if (t >= 16.4) fall.position.set(4.0, lerp(fruits[0].c.y - 0.45, 2.3, ease.in(prog(t, 16.4, 16.8))) + (t > 16.8 ? bump(t, [16.8], 0.6) : 0), 0.6);
        reset(A);
        if (t < 4.5) {
          A.armR.rotation.x = t > 1.0 && t < 2.6 ? -1.4 : -0.8;
          wc.rotation.x = t > 1.2 && t < 2.5 ? 0.8 : 0;
          A.setFace(t > 2.6 ? 'happy' : 'normal');
          if (t > 2.6) A.root.position.y = bump(t, [2.7], 0.2);
          wc.visible = true;
        } else if (t < 9.5) {
          A.root.position.set(-5.0, 0, -1.6); A.root.rotation.y = -0.6; A.head.rotation.x = -0.5; A.setFace('shock'); wc.visible = true;
        } else if (t < 15) {
          A.root.position.set(1.0, 1.39, -1.8); A.root.rotation.y = 0.2; A.setFace('happy'); A.armR.rotation.z = 2.4 + Math.sin(t * 6) * 0.2; wc.visible = false;
        } else {
          A.root.position.set(-1.6, 0, -1.2); A.root.rotation.y = 0.4; A.armR.rotation.x = -2.2; A.armR.rotation.z = -0.4; A.setFace('happy'); wc.visible = false;
        }
        reset(BOSS);
        BOSS.root.visible = t >= 15;
        BOSS.root.position.set(4.0, 0, 0.6); BOSS.root.rotation.y = -0.5;
        if (t > 16.8) { BOSS.setFace('shock'); BOSS.armR.rotation.x = -2.9; BOSS.armR.rotation.z = 0.5; }
      };
      const cams = [
        [0, 4.5, camPath([-9.0, 2.6, -0.4], [-8.8, 2.4, -1.0], [-6.0, 1.0, -3.8], [-6.0, 1.0, -3.8], 40, 4.5)],
        [4.5, 9.5, camPath([4.8, 4.0, 9.6], [4.2, 3.6, 8.8], [-1.6, 2.4, -2.4], [-1.4, 2.6, -2.4], 42, 5)],
        [9.5, 15, camPath([5.4, 3.0, 6.6], [4.8, 2.8, 5.8], [0.8, 2.2, -2.6], [0.8, 2.3, -2.6], 42, 5.5)],
        [15, 20.5, camPath([6.4, 3.8, 8.4], [5.8, 3.6, 7.6], [1.6, 1.8, -0.8], [1.6, 1.9, -0.8], 42, 5.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    /* ===== ビルより大きい木（20.5〜30秒） ===== */
    let A2;
    {
      const S = newScene({ sky: ['#6fc0f0', '#e3f4ff'], sun: [12, 30, 14], fog: ['#e3f4ff', 80, 200] });
      const B = new Blocks();
      for (let x = -6; x <= 5; x++) for (let y = 0; y <= 10; y++) B.set('facade', x, y, 5);
      for (let z = -6; z <= 5; z++) for (let y = 0; y <= 10; y++) B.set('facade', 5, y, z);
      B.fill('stone', -6, 11, -6, 5, 11, 5);
      B.fill('stone', -40, -1, -40, 40, -1, 40);
      B.build(S, {}, { cast: false });
      const r = mulberry32(1112), cols = ['#c9b7a3', '#a9b5c1', '#d6c7b0', '#9fb0c2'];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2, d = 16 + r() * 10, h = 5 + r() * 9;
        if (Math.cos(a) > 0.1 && Math.sin(a) > 0.1) continue;
        box(S, [5, h, 5], [Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d], solid(cols[i % 4]));
      }
      const trunk = group(S, [0, 12, 0]);
      const TH = 34;
      const segs = Array.from({ length: TH }, (_, k) => box(trunk, [2.2, 1.02, 2.2], [Math.sin(k * 0.15) * 0.4, k + 0.5, 0], solid(k % 3 ? '#7a5232' : '#6b4a2b')));
      const L = 520, canopy = new T.InstancedMesh(new T.BoxGeometry(1.5, 1.5, 1.5), new T.MeshLambertMaterial({ color: '#ffffff' }), L);
      const pts = [], tint = new T.Color(), greens = ['#3f9b4b', '#4fb35a', '#2f7d3a', '#5cc466'];
      for (let i = 0; i < L; i++) {
        const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), rad = 6 + r() * 6;
        pts.push([Math.cos(u) * Math.sin(v) * rad * 1.3, 12 + TH + Math.cos(v) * rad * 0.8, Math.sin(u) * Math.sin(v) * rad * 1.3]);
        canopy.setColorAt(i, tint.set(greens[i % 4]));
      }
      canopy.instanceColor.needsUpdate = true;
      S.add(canopy);
      A2 = addChar(S, CAST.A, [2.6, 12, 2.6], -2.3);
      const wc = can(A2.armR); wc.position.set(0, -0.66, 0.16);
      const drops = Array.from({ length: 8 }, () => box(S, [0.08, 0.16, 0.08], [0, -99, 0], new T.MeshBasicMaterial({ color: '#7fb8ee' }), { cast: false }));
      const clouds = [P.cloud(S, [-14, 34, -6], 31), P.cloud(S, [12, 42, -10], 32), P.cloud(S, [-6, 52, 8], 33)];
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
      const update = (lt, t) => {
        P.followLight(S, 0, 20, 0);
        const g = ease.inOut(prog(t, 20.6, 23.6));
        segs.forEach((s, k) => { s.visible = k < g * TH; });
        const cg = ease.back(prog(t, 23.0, 24.0));
        pts.forEach((p, i) => {
          ps.set(p[0] * cg, 12 + (p[1] - 12) * Math.max(g, 0.01), p[2] * cg);
          sc.setScalar(cg > 0.01 ? cg : 0.0001);
          m4.compose(ps, q, sc); canopy.setMatrixAt(i, m4);
        });
        canopy.instanceMatrix.needsUpdate = true;
        clouds.forEach((c, i) => { c.position.x = [-14, 12, -6][i] + lt * 0.4; });
        reset(A2);
        A2.armR.rotation.x = -1.3; wc.rotation.x = 0.8;
        A2.setFace(t > 27 ? 'sleepy' : 'normal');
        drops.forEach((d, i) => {
          const u = (t * 1.8 + i / 8) % 1;
          const tip = A2.armR.localToWorld(V3(0, -0.8, 0.5));
          d.visible = t >= 25.5;
          d.position.set(tip.x + (i % 3 - 1) * 0.05, tip.y - u * 1.0, tip.z);
        });
      };
      scenes.push({ id: 'tree', start: 20.5, end: 25.5, scene: S, update, cam: (lt) => ({ pos: lerp3([26, 8, 30], [30, 22, 40], ease.inOut(prog(lt, 0, 4.5))), target: lerp3([0, 14, 0], [0, 30, 0], ease.inOut(prog(lt, 0, 4.5))), fov: 44 }) });
      scenes.push({ id: 'tree', start: 25.5, end: 30.01, scene: S, update, cam: camPath([7.2, 14.4, 9.2], [6.4, 14.8, 8.2], [1.4, 13.4, 1.4], [1.2, 14.4, 1.2], 42, 4.5) });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも会社の観葉植物が、毎日1ブロックずつ伸びたら', cls: 'title small' },
        { text: 'ブロック町のIT企業、1日目', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '観葉植物の高さ', value: heightAt, format: (n) => `${n}ブロック`, done: (t) => t >= 23.6 },
      { type: 'fx', t0: 2.6, t1: 3.4, text: 'ニョキッ', x: 360, y: 300, rot: -6, size: 48 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '10日目、', at: 4.65, cps: 16 },
        { text: '天井をはいまわる', at: 5.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '30日目、', at: 9.65, cps: 16 },
        { text: '会議は木の上で', at: 10.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 11.6, t1: 14.6, text: 'では、葉っぱの件から', scene: 'office', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '60日目、', at: 15.15, cps: 16 },
        { text: 'ランチが実る', at: 15.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 16.8, t1: 17.6, text: 'ゴンッ', scene: 'office', anchor: headTop(BOSS, 0.8), x: 120, y: -10, rot: 7, size: 52, shake: true },
      { type: 'tag', t0: 17.8, t1: CUTS[3], text: '本日の社食：天井のみかん' },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '100日目、', at: 20.65, cps: 16 },
        { text: 'ビルより大きくなる', at: 21.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.0, t1: 23.6, text: 'ニョキニョキニョキ', x: 860, y: 300, rot: -6, size: 50, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも水やり当番は、社員A。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '観葉植物が伸びる会社', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #11　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const grow = (t) => [AUDIO.tone(t, 300, 0.4, { wave: 'pulse25', f2: 900, gain: 0.05 })];
    const audio = AUDIO.music({ prog: ['F', 'C', 'Dm', 'C', 'F', 'C', 'G', 'C', 'F', 'G', 'Am', 'Em', 'F', 'G', 'F', 'C'], arp: [10, 11, 12] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    add(AUDIO.SFX.waves(1.1, 1.4));
    add(grow(2.6));
    for (let t = 4.7; t < 6.2; t += 0.25) add(grow(t));
    for (let t = 9.7; t < 11.0; t += 0.25) add(grow(t));
    add(S_.stomp(16.8)); add(S_.pop(16.9, 2));
    for (let t = 20.8; t < 23.6; t += 0.2) add(grow(t));
    add(S_.cheer(24.0));
    add(AUDIO.SFX.waves(25.5, 4.5));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
