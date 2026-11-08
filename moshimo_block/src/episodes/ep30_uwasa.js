/* ep30 — もしも社内のうわさが、目に見える煙になったら（30秒） */
EPISODES.push({
  id: 'ep30',
  no: 30,
  short: 'うわさの煙',
  title: 'もしも社内のうわさが、目に見える煙になったら',
  lead: '「Aさん、最近元気ないね」から始まったうわさは、人を通るたびに大きく、話も大きくなる。部長に届くころには「Aさんがうちの会社を買うらしい」。',
  duration: 30,
  poster: 17.6,
  chapters: [
    { t: 0, name: 'ひそひそ' }, { t: 4.5, name: '辞めるらしい' }, { t: 9.5, name: '会社を作るらしい' },
    { t: 15, name: '部長へ' }, { t: 20.5, name: 'Aさま' }, { t: 25.5, name: '本人だけ' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const HOPS = [[1.6, 0, 1, 'Aさん、最近元気ないね'], [5.2, 1, 2, 'Aさん、辞めるらしいよ'], [8.0, 2, 3, 'Aさん、独立するらしい'], [10.8, 3, 4, 'Aさん、会社を作るらしい'], [15.6, 4, 5, 'Aさん、うちの会社を買うらしい']];
    const sizeAt = (t) => { let s = 0; HOPS.forEach(([ht], i) => { if (t >= ht) s = lerp(i === 0 ? 0.5 : [0.5, 1, 1.8, 3, 5.2][i - 1], [1, 1.8, 3, 5.2, 8][i], ease.out(prog(t, ht, ht + 1.6))); }); return s; };
    const BOW = 22.2;

    let A, ppl;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      const seats = [[-6.0, -2.6, CAST.M1], [-2.6, -2.6, CAST.M2], [0.8, -2.6, CAST.M3], [4.2, -2.6, CAST.NEW], [7.2, 0.8, CAST.HONBU]];
      const staff = seats.map(([x, z, look]) => workstation(S, x, z, look));
      const BOSS = addChar(S, CAST.BOSS, [5.0, 0, 2.2], -1.4);
      A = workstation(S, -4.0, 1.4, CAST.A);
      ppl = [...staff, BOSS];
      const bento = group(S, [-3.6, 0.82, 1.5]); box(bento, [0.5, 0.14, 0.36], [0, 0.07, 0], solid('#1d2333')); box(bento, [0.22, 0.04, 0.3], [-0.12, 0.15, 0], solid('#ffffff'));
      const N = 220, smoke = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.5, 0.5), new T.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), N);
      const r = mulberry32(3030);
      const pts = Array.from({ length: N }, () => { const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), rr = Math.cbrt(r()); return [Math.cos(u) * Math.sin(v) * rr, Math.cos(v) * rr * 0.6, Math.sin(u) * Math.sin(v) * rr, r()]; });
      S.add(smoke);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e3 = new T.Euler(), ps = new T.Vector3(), sc = new T.Vector3();
      const colors = ['#d9dee3', '#b8a4d8', '#9a7ad0', '#7a52c0', '#4a2a7a'];
      const headOf = (i) => ppl[i].head.localToWorld(V3(0, 0.9, 0));
      const update = (lt, t) => {
        staff.forEach((c, i) => {
          working(c, t, i, 14);
          const hop = HOPS.find(([ht, from, to]) => (from === i || to === i) && t >= ht - 0.6 && t < ht + 1.4);
          if (hop) { const other = hop[1] === i ? hop[2] : hop[1]; const o = ppl[other].root.position, p = c.root.position; c.head.rotation.y = clamp(Math.atan2(o.x - p.x, o.z - p.z), -1.2, 1.2); c.body.rotation.y = c.head.rotation.y * 0.3; c.setFace(hop[1] === i ? 'happy' : 'shock'); }
          if (t >= 20.5) { c.head.rotation.y = -0.6; c.setFace('shock'); }
        });
        const BOSSc = ppl[5];
        reset(BOSSc);
        if (t < 20.5) { BOSSc.root.position.set(5.0, 0, 2.2); BOSSc.root.rotation.y = -1.4; if (t > 16.4) { BOSSc.setFace('shock'); BOSSc.body.rotation.z = Math.sin(t * 30) * 0.03; } }
        else if (t < 25.5) {
          const u = prog(t, 20.6, BOW - 0.2);
          BOSSc.root.position.set(lerp(5.0, -2.6, u), 0, lerp(2.2, 1.6, u)); BOSSc.root.rotation.y = u < 1 ? -Math.PI / 2 : -Math.PI / 2;
          if (u < 1) walk(BOSSc, t * 12, 0.45); else { bend(BOSSc, 0.9 * ease.out(prog(t, BOW, BOW + 0.4))); BOSSc.setFace('shock'); }
        } else { BOSSc.root.position.set(-2.6, 0, 1.6); BOSSc.root.rotation.y = -Math.PI / 2; bend(BOSSc, 0.9); BOSSc.setFace('shock'); }
        reset(A); sit(A);
        A.armL.rotation.x = -1.0; A.armR.rotation.x = -1.3 + Math.sin(t * 8) * 0.3; A.setFace(t >= BOW + 0.4 && t < 25.5 ? 'shock' : 'happy');
        if (t >= BOW + 0.4 && t < 25.5) A.head.rotation.y = 0.9;
        ppl.forEach((p) => p.root.updateMatrixWorld(true));
        let cx, cy, cz;
        const cur = HOPS.filter(([ht]) => t >= ht).pop();
        if (!cur) { const h = headOf(0); cx = h.x; cy = h.y; cz = h.z; }
        else {
          const [ht, from, to] = cur, u = ease.inOut(prog(t, ht, ht + 1.6));
          const a = headOf(from), b = headOf(to);
          cx = lerp(a.x, b.x, u); cy = lerp(a.y, b.y, u) + Math.sin(u * Math.PI) * 0.6; cz = lerp(a.z, b.z, u);
          if (from === 4 && to === 5 && u >= 1) { cy += 0; }
        }
        if (t >= 20.5) { const tx = lerp(cx, -1.0, ease.inOut(prog(t, 20.6, 22.6))); cx = tx; cz = lerp(cz, -0.2, ease.inOut(prog(t, 20.6, 22.6))); cy = lerp(cy, 4.2, ease.inOut(prog(t, 20.6, 22.6))); }
        const s = sizeAt(t), k = Math.min(4, HOPS.filter(([ht]) => t >= ht + 0.6).length);
        smoke.material.color.set(colors[Math.max(0, k - 1)]);
        pts.forEach((p, i) => {
          const on = t >= 1.4 && p[3] < 0.2 + 0.8 * (s / 8);
          ps.set(cx + p[0] * s * 0.6 + Math.sin(t * 2 + i) * 0.05, Math.max(0.4, cy + s * 0.32 + p[1] * s * 0.5), cz + p[2] * s * 0.6);
          q.setFromEuler(e3.set(t * 0.3 + i, t * 0.2, 0)); sc.setScalar(on ? 0.5 + s * 0.04 : 0.0001);
          m4.compose(ps, q, sc); smoke.setMatrixAt(i, m4);
        });
        smoke.instanceMatrix.needsUpdate = true;
      };
      const cams = [
        [0, 4.5, camPath([-3.0, 3.6, 4.6], [-3.2, 3.4, 4.0], [-5.0, 1.6, -3.2], [-4.8, 1.6, -3.2], 42, 4.5)],
        [4.5, 9.5, camPath([1.0, 4.0, 6.4], [2.0, 3.8, 6.0], [-2.6, 1.8, -3.0], [-0.4, 1.8, -3.0], 44, 5)],
        [9.5, 15, camPath([4.4, 4.4, 7.0], [5.4, 4.2, 6.6], [1.4, 2.0, -2.6], [3.4, 2.0, -2.0], 44, 5.5)],
        [15, 20.5, camPath([9.6, 5.0, 9.6], [9.0, 5.4, 9.0], [4.4, 2.2, 0.0], [4.6, 2.8, 0.4], 46, 5.5)],
        [20.5, 25.5, camPath([1.4, 4.0, 8.4], [0.6, 3.8, 7.6], [-2.4, 1.6, 0.6], [-3.0, 1.6, 0.8], 44, 5)],
        [25.5, 30.01, camPath([-1.6, 4.6, 8.0], [-1.8, 4.8, 7.6], [-3.4, 2.4, 0.6], [-3.4, 3.0, 0.4], 46, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも社内のうわさが、目に見える煙になったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、昼休み', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.6, t1: 30.1, label: 'うわさの大きさ', value: (t) => Math.round(sizeAt(t) * 10) / 10, format: (v) => `${v.toFixed(1)}ブロック`, done: (t) => t >= 17.2 },
      ...HOPS.map(([ht, from, , text], i) => ({ type: 'bubble', t0: ht - 0.6, t1: ht + 1.4, text, cls: 'small', scene: 'office', anchor: headTop(ppl[from]) })),
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: 'うわさは、人を通るたびに', at: 4.65, cps: 18 },
        { text: '大きくなる', at: 5.8, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '話も、', at: 9.65, cps: 16 },
        { text: 'どんどん大きくなる', at: 10.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '部長に届くころには、', at: 15.15, cps: 18 },
        { text: 'こうなる', at: 16.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: 'そして部長は、', at: 20.65, cps: 16 },
        { text: '社員Aに頭を下げた', at: BOW + 0.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: BOW + 0.2, t1: 24.0, text: 'Aさま、今後ともよろしく…', scene: 'office', anchor: () => headTop(ppl[5], 0.4)() },
      { type: 'bubble', t0: 24.1, t1: 25.4, text: '？', scene: 'office', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも本人だけは、何も知らない。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: 'うわさが見える会社', at: 27.4, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #30　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const whisper = (t) => [AUDIO.noise(t, 0.9, { filter: 'bandpass', freq: 2600, q: 2.2, gain: 0.05, am: 9, amDepth: 0.03 })];
    const audio = AUDIO.music({ prog: ['Am', 'Em', 'F', 'C', 'Am', 'Em', 'F', 'G', 'Dm', 'Am', 'F', 'G', 'Am', 'G', 'F', 'C'], arp: [8, 9, 10] });
    const add = (list) => audio.push(...list);
    HOPS.forEach(([ht], i) => { add(whisper(ht - 0.6)); add([AUDIO.tone(ht, 200 + i * 60, 1.4, { type: 'sine', f2: 140 + i * 40, gain: 0.04 + i * 0.01 })]); });
    cutSounds(add, CUTS);
    add(S_.buzzer(16.8));
    add(S_.pop(BOW, 1));
    add(S_.pop(24.1, 6));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
