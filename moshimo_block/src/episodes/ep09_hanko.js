/* ep09 — もしもハンコが、押すたびに2倍の大きさになったら（30秒） */
EPISODES.push({
  id: 'ep09',
  no: 9,
  short: '2倍になるハンコ',
  title: 'もしもハンコが、押すたびに2倍の大きさになったら',
  lead: '係長、課長、部長、本部長、専務。稟議書が上に回るたびにハンコは2倍に。社長のハンコはヘリで届き、ビルの屋上に「承認」が押される。',
  duration: 30,
  poster: 11.2,
  chapters: [
    { t: 0, name: '係長' }, { t: 4.5, name: '課長・部長' }, { t: 9.5, name: '本部長・専務' },
    { t: 14.5, name: '社長' }, { t: 19.5, name: '承認' }, { t: 25, name: '経理' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 14.5, 19.5, 25];
    const CHAIN = [
      { x: -8, look: CAST.M1, size: 0.25, ts: 2.8, arrive: 0, title: '係長' },
      { x: -4.5, look: CAST.M2, size: 0.5, ts: 5.6, arrive: 4.8, title: '課長' },
      { x: -1, look: CAST.BOSS, size: 1, ts: 8.0, arrive: 7.0, title: '部長' },
      { x: 2.5, look: CAST.HONBU, size: 2, ts: 11.0, arrive: 9.9, title: '本部長' },
      { x: 6, look: CAST.SENMU, size: 4, ts: 13.4, arrive: 12.4, title: '専務' },
    ];
    const CEO_T = 17.6, BACK = 27.0;
    const sizeAt = (t) => {
      let v = 0.25;
      CHAIN.forEach((c) => { if (t >= c.ts) v = c.size; });
      if (t >= CEO_T) v = 8;
      if (t >= BACK) v = 0.1;
      return v;
    };
    const markTex = (word, col) => canvasTex(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(8, 8, 112, 112);
      g.fillStyle = col; g.font = `52px ${PIXEL_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(word, 64, 68);
    }, true);
    const OK = new T.MeshBasicMaterial({ map: markTex('承認', '#d0342c'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const NG = new T.MeshBasicMaterial({ map: markTex('差戻', '#2f62d6'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const mark = (parent, s, pos, mat = OK) => { const m = new T.Mesh(new T.PlaneGeometry(s, s), mat); m.rotation.x = -Math.PI / 2; m.position.set(pos[0], pos[1], pos[2]); parent.add(m); return m; };
    const stamp = (parent, s) => {
      const g = group(parent);
      box(g, [0.7 * s, 0.22 * s, 0.7 * s], [0, 0.11 * s, 0], solid('#c0392b'));
      box(g, [0.36 * s, 0.6 * s, 0.36 * s], [0, 0.52 * s, 0], solid('#a8794a'));
      box(g, [0.46 * s, 0.14 * s, 0.46 * s], [0, 0.88 * s, 0], solid('#8b5e34'));
      return g;
    };
    const stampY = (t, ts, s, top) => {
      if (t < ts - 0.9) return top + 0.3 * s;
      if (t < ts - 0.2) return top + lerp(0.3, 1.4, ease.out(prog(t, ts - 0.9, ts - 0.3))) * s;
      if (t < ts) return top + lerp(1.4 * s, 0, ease.in(prog(t, ts - 0.2, ts)));
      if (t < ts + 0.5) return top;
      return top + lerp(0, 1.0, ease.out(prog(t, ts + 0.5, ts + 0.9))) * s;
    };

    /* ===== オフィス：ハンコの行列 ===== */
    let A, people, keiri;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { windows: [[-7, 2], [-6, 2], [-7, 3], [-6, 3], [0, 2], [1, 2], [0, 3], [1, 3], [6, 2], [7, 2], [6, 3], [7, 3]] });
      const rows = CHAIN.map((c, i) => {
        const dg = group(S);
        P.desk(dg, c.x, -2.5);
        P.chair(S, c.x, -3.45);
        const nm = box(dg, [1.0, 0.3, 0.04], [c.x, 0.5, -1.99], faces(solid('#f2c230'), { front: P.glow(textTex(c.title, { w: 128, h: 64, size: 34 })) }));
        const p = addChar(S, c.look, [c.x, 0, -3.45]);
        const st = stamp(S, c.size);
        const paper = box(S, [0.42, 0.02, 0.58], [c.x, 0.84, -2.3], solid('#ffffff'), { cast: false });
        const big = c.size >= 2;
        const mk = mark(S, 0.62 * c.size, [c.x, big ? 0.03 : 0.86, -2.3]);
        const crack = P.crackDecal(S, c.x, 0, -2.3, i); crack.scale.setScalar(c.size * 1.2);
        return { ...c, dg, p, st, paper, mk, crack, big, nm };
      });
      people = rows.map((r) => r.p);
      keiri = workstation(S, -6.5, 1.6, CAST.M3, { laptop: false });
      const kPaper = box(S, [0.42, 0.02, 0.58], [-6.0, 0.84, 1.3], solid('#ffffff'), { cast: false });
      const kMark = mark(S, 0.16, [-6.0, 0.86, 1.3], NG);
      const kStamp = stamp(S, 0.12);
      A = addChar(S, CAST.A, [-6.8, 0, -1.6], -2.2);
      const dust = P.dustPuff(S, 14, 91);
      const standAt = (k) => [CHAIN[k].x + 1.25, -1.7];
      const update = (lt, t) => {
        rows.forEach((r, i) => {
          const c = r.p;
          reset(c); sit(c);
          c.armL.rotation.x = c.armR.rotation.x = -0.9;
          const active = t >= r.arrive && t < r.ts + 1.0;
          const lifting = t >= r.ts - 0.9 && t < r.ts + 0.9;
          if (lifting && r.size < 4) { c.armR.rotation.x = -1.4 - (r.big ? 0.6 : 0.3); if (r.big) c.armL.rotation.x = c.armR.rotation.x; c.setFace(r.big ? 'shock' : 'normal'); }
          if (t >= r.ts && r.size >= 1) { c.setFace('shock'); }
          if (t >= 25) c.setFace('normal');
          const top = r.big && t >= r.ts ? 0.0 : 0.84;
          r.st.visible = (t >= r.arrive - 0.3 && t < r.ts + 0.9) && !(t >= 14.5 && t < 25);
          if (r.size >= 4) { r.st.position.set(r.x, t < r.ts - 0.4 ? 9 : lerp(9, 0.0, ease.in(prog(t, r.ts - 0.4, r.ts))), -2.3); if (t >= r.ts + 0.5) r.st.position.y = lerp(0, 9, ease.in(prog(t, r.ts + 0.5, r.ts + 1.0))); }
          else r.st.position.set(r.x, stampY(t, r.ts, r.size, top), -2.3);
          r.paper.visible = t >= r.arrive && !(r.big && t >= r.ts);
          r.mk.visible = t >= r.ts;
          r.crack.visible = r.size >= 1 && t >= r.ts;
          const crush = r.big ? ease.out(prog(t, r.ts, r.ts + 0.1)) : 0;
          r.dg.scale.y = 1 - crush * 0.88;
          r.nm.visible = crush < 0.5;
          if (r.big && t >= r.ts) c.root.position.y += bump(t, [r.ts], 0.35);
          if (active && !lifting) c.head.rotation.x = 0.25;
        });
        const big = rows[4];
        dust.update(t, big.ts, [big.x, 0, -2.3], 0.9);
        reset(A);
        let k = 0;
        CHAIN.forEach((c, i) => { if (t >= c.arrive) k = i; });
        const dep = CHAIN[k].ts + 0.6, next = CHAIN[k + 1];
        if (t < 25) {
          if (next && t > dep) {
            const u = prog(t, dep, next.arrive);
            const a = standAt(k), b = standAt(k + 1);
            A.root.position.set(lerp(a[0], b[0], u), 0, lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * 0.6);
            A.root.rotation.y = Math.PI / 2;
            walk(A, t * 14, 0.6);
          } else {
            const a = standAt(k);
            A.root.position.set(a[0], 0, a[1]); A.root.rotation.y = -2.2;
            if (t >= CHAIN[k].ts && CHAIN[k].size >= 1) surprised(A, 0, bump(t, [CHAIN[k].ts], 0.25));
          }
        } else {
          A.root.position.set(-4.8, 0, 1.6); A.root.rotation.y = -Math.PI / 2;
          A.armR.rotation.x = t < 25.6 ? -1.2 : 0;
          if (t > BACK) surprised(A, 0, bump(t, [BACK], 0.2));
        }
        working(keiri, t, 0);
        keiri.root.visible = t >= 24;
        kPaper.visible = t >= 25.5;
        kMark.visible = t >= BACK;
        kStamp.visible = t >= 26.3 && t < BACK + 0.6;
        kStamp.position.set(-6.0, stampY(t, BACK, 0.12, 0.84), 1.3);
        if (t > 26.3 && t < BACK + 0.4) { keiri.armR.rotation.x = -1.9; }
        if (t > BACK) keiri.setFace('sleepy');
      };
      const camFollow = (x0, x1, d) => camPath([x0 + 3.2, 4.0, 6.6], [x1 + 3.2, 4.0, 6.6], [x0 - 0.2, 1.1, -2.6], [x1 - 0.2, 1.1, -2.6], 40, d);
      scenes.push({ id: 'office', start: 0, end: 4.5, scene: S, update, cam: camPath([-5.4, 2.8, 1.8], [-5.8, 2.6, 1.2], [-8.0, 1.0, -2.4], [-8.0, 1.0, -2.4], 40, 4.5) });
      scenes.push({ id: 'office', start: 4.5, end: 9.5, scene: S, update, cam: camFollow(-5.2, -1.2, 5), shake: (lt) => impact(lt + 4.5, [8.0], 0.05) });
      scenes.push({ id: 'office', start: 9.5, end: 14.5, scene: S, update, cam: (lt) => ({ pos: [lerp(5.8, 9.4, ease.inOut(prog(lt, 0.4, 3.8))), 5.0, 9.0], target: [lerp(2.4, 5.4, ease.inOut(prog(lt, 0.4, 3.8))), 1.6, -2.6], fov: 42 }), shake: (lt) => impact(lt + 9.5, [11.0], 0.06) + impact(lt + 9.5, [13.4], 0.18, 6) });
      scenes.push({ id: 'office', start: 25, end: 30.01, scene: S, update, cam: camPath([-8.0, 3.0, 5.8], [-7.6, 2.8, 5.0], [-5.8, 1.1, 1.3], [-5.8, 1.1, 1.3], 40, 5) });
    }

    /* ===== 社長のハンコ：ヘリで屋上へ（14.5〜25秒） ===== */
    let heliRef;
    {
      const S = newScene({ sky: ['#6fc0f0', '#e3f4ff'], sun: [12, 30, 14], fog: ['#e3f4ff', 60, 150] });
      const B = new Blocks();
      for (let x = -6; x <= 5; x++) for (let y = 0; y <= 10; y++) B.set('facade', x, y, 5);
      for (let z = -6; z <= 5; z++) for (let y = 0; y <= 10; y++) B.set('facade', 5, y, z);
      B.fill('stone', -6, 11, -6, 5, 11, 5);
      B.fill('stone', -30, -1, -30, 30, -1, 30);
      B.build(S, {}, { cast: false });
      const r = mulberry32(19), cols = ['#c9b7a3', '#a9b5c1', '#d6c7b0', '#9fb0c2', '#b8a99a'];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, d = 15 + r() * 10, h = 5 + r() * 14;
        if (Math.cos(a) > 0.1 && Math.sin(a) > 0.1) continue;
        box(S, [5 + r() * 3, h, 5 + r() * 3], [Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d], solid(cols[i % 5]), { cast: true });
      }
      const roofMark = mark(S, 6.2, [0, 12.02, 0]);
      const heli = P.helicopter(S);
      heliRef = heli;
      heli.ladder.visible = false;
      const big = stamp(S, 8);
      const rope = box(S, [0.08, 3, 0.08], [0, -99, 0], solid('#2b3140'));
      const dust = P.dustPuff(S, 16, 71);
      scenes.push({
        id: 'sky', start: 14.5, end: 25, scene: S,
        cam: (lt, t) => (t < 19.5
          ? { pos: lerp3([22, 16, 26], [19, 18, 24], ease.inOut(prog(t, 14.5, 19.5))), target: [0, 13, 0], fov: 42 }
          : { pos: lerp3([19, 18, 24], [7, 40, 16], ease.inOut(prog(t, 19.5, 23.5))), target: [0, 11.5, 0], fov: 42 }),
        shake: (lt) => impact(lt + 14.5, [CEO_T], 0.3, 5),
        update(lt, t) {
          P.followLight(S, 0, 12, 0);
          heli.rotor.rotation.y = t * 31; heli.tail.rotation.z = t * 40;
          let hx, hy;
          if (t < 16.6) { const u = ease.out(prog(t, 14.5, 16.6)); hx = lerp(-34, 0, u); hy = lerp(32, 28, u); }
          else if (t < CEO_T) { hx = 0; hy = lerp(28, 23.6, ease.in(prog(t, 16.6, CEO_T))); }
          else if (t < 18.6) { hx = 0; hy = 23.6; }
          else { const u = ease.in(prog(t, 18.6, 22)); hx = lerp(0, 36, u); hy = lerp(23.6, 34, u); }
          heli.g.position.set(hx, hy, 0);
          heli.g.rotation.z = t < 16.6 ? 0.12 : t > 18.6 ? -0.12 : 0;
          const attached = t < 18.4;
          const sy = attached ? hy - 11.6 : -99;
          big.visible = attached;
          big.position.set(hx, Math.max(12, sy), 0);
          rope.visible = attached;
          rope.position.set(hx, hy - 0.6 - 1.5, 0);
          roofMark.visible = t >= CEO_T;
          dust.update(t, CEO_T, [0, 12, 0], 1.0);
        },
      });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもハンコが、押すたびに2倍の大きさになったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、稟議書の回覧', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: CHAIN[0].ts, t1: 30.1, label: 'ハンコの大きさ', value: sizeAt, format: (v) => `${v}ブロック`, done: (t) => t >= CEO_T && t < BACK },
      { type: 'bubble', t0: 0.6, t1: 2.2, text: '係長、ハンコお願いします', scene: 'office', anchor: headTop(A) },
      ...CHAIN.map((c, i) => ({ type: 'fx', t0: c.ts, t1: c.ts + 0.7, text: ['ポン', 'ポンッ', 'ドンッ', 'ドゴッ', 'ドゴォォン'][i], x: 640 + (i % 2 ? 160 : -120), y: 260 - i * 20, rot: i % 2 ? 7 : -7, size: 44 + i * 6, shake: i >= 3 })),
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: 'ハンコは押すたびに、', at: 4.65, cps: 18 },
        { text: '2倍の大きさになる', at: 5.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '本部長と専務のハンコは、', at: 9.65, cps: 18 },
        { text: '机ごと押す', at: 11.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '社長のハンコは、', at: 14.65, cps: 18 },
        { text: 'ヘリで運んでくる', at: 15.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: CEO_T, t1: CEO_T + 1.0, text: 'ズドーーン', x: 640, y: 180, rot: -5, size: 66, shake: true },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: 'こうして稟議書は、', at: 19.65, cps: 18 },
        { text: 'ビルごと承認された', at: 20.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: 22.2, t1: CUTS[4], text: '承認：係長・課長・部長・本部長・専務・社長' },
      { type: 'bubble', t0: 25.3, t1: 26.9, text: '日付が空欄ですね', scene: 'office', anchor: headTop(keiri) },
      { type: 'fx', t0: BACK, t1: BACK + 0.6, text: 'ポチッ', x: 420, y: 420, rot: 6, size: 40 },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも書類は、差し戻し。', at: 27.3, cps: 16, cls: 'mark-soft' },
        { text: 'ハンコが2倍になる会社', at: 28.4, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.8, t1: 30.1, text: 'もしもブロック劇場 #09　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({ prog: ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'G', 'C', 'G', 'Am', 'Em', 'F', 'G', 'F', 'C'], arp: [7, 8, 9] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    CHAIN.forEach((c, i) => { if (i < 2) add(S_.pop(c.ts, i * 3)); else if (i === 2) add(S_.stamp(c.ts)); else { add(S_.smash(c.ts)); add(S_.stamp(c.ts)); } });
    add(S_.whistle(13.0, 0.4));
    add(S_.rotor(14.5, 8));
    add(S_.smash(CEO_T)); add(S_.stamp(CEO_T)); add(S_.dust(CEO_T + 0.05));
    add(S_.jingle(20.4));
    add(S_.pop(BACK, 0));
    add(S_.pop(28.8, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
