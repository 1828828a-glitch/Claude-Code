/* ep12 — もしも仕事の量だけ、机が高くなったら（30秒） */
EPISODES.push({
  id: 'ep12',
  no: 12,
  short: '高くなる机',
  title: 'もしも仕事の量だけ、机が高くなったら',
  lead: '頼まれごとが1つ届くたびに、机の下に書類が1枚積み上がる。社員Aの机ははしごで登る高さになり、夜には月のそば。部長の机は床と同じ高さ。',
  duration: 30,
  poster: 12.4,
  chapters: [
    { t: 0, name: '朝' }, { t: 4.5, name: '仕事が増える' }, { t: 9.5, name: '頼まれごと' },
    { t: 15, name: '部長の机' }, { t: 20.5, name: '夜' }, { t: 25.5, name: '人事評価' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const DESK = [-2.0, -2.5], BOSSD = [6.2, 0.9];
    const tasks = [];
    const push = (t0, src, n, gap) => { for (let i = 0; i < n; i++) tasks.push({ t: t0 + i * gap, src }); };
    push(1.4, 'boss', 4, 0.6);
    push(5.0, 'door', 8, 0.5);
    push(10.0, 'mates', 16, 0.3);
    push(20.8, 'all', 28, 0.16);
    tasks.forEach((k) => { k.land = k.t + 0.55; });
    const done = (t) => tasks.filter((k) => k.land <= t).length;
    const TH = 0.25;
    const stackH = (t) => done(t) * TH;
    const height = (t) => 1 + stackH(t);
    const DAY = SKY_DAY, NIGHT = ['#121a3a', '#36406e'];

    let A, BOSS, mates;
    {
      const S = newScene({ sky: DAY });
      const winMat = blockMat('window').clone();
      P.officeRoom(S, { doors: [-6], overrides: { window: winMat } });
      box(S, [1, 2, 0.2], [-5.5, 1, -7.2], solid('#2b3140'), { cast: false });
      const { dir, hemi } = S.userData;
      const evalTex = canvasTex(512, 256, (g) => {
        g.fillStyle = '#fbfcfd'; g.fillRect(0, 0, 512, 256);
        g.strokeStyle = '#9aa3ad'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248);
        g.fillStyle = '#1d2333'; g.font = `44px ${PIXEL_FONT}`; g.textBaseline = 'top'; g.fillText('今期の人事評価', 30, 24);
        g.font = `40px ${PIXEL_FONT}`; g.fillText('社員A …… B', 40, 104); g.fillText('部長 …… S', 40, 170);
      }, true);
      const plainTex = canvasTex(64, 32, (g) => { g.fillStyle = '#fbfcfd'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#9aa3ad'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 30, 64, 2); });
      const boardFace = faces(solid('#9aa3ad'), { front: P.glow(plainTex) });
      box(S, [3.8, 1.9, 0.08], [3.6, 2.5, -5.92], boardFace);
      const evalMat = P.glow(evalTex), plainMat = boardFace[4];
      const tower = group(S, [DESK[0], 0, DESK[1]]);
      P.desk(tower, 0, 0); P.chair(tower, 0, -0.95); P.laptop(tower, 0, 0.82, -0.1);
      A = addChar(tower, CAST.A, [0, 0, -0.95]);
      const lamp = box(tower, [0.2, 0.5, 0.2], [0.7, 1.07, 0.2], new T.MeshBasicMaterial({ color: '#ffe9a8' }), { cast: false });
      const paperTex = canvasTex(16, 8, (g) => { px(g, '#ffffff', 0, 0, 16, 8); px(g, '#c9d0d8', 0, 3, 16, 1); px(g, '#c9d0d8', 0, 6, 16, 1); });
      const N = tasks.length, stack = new T.InstancedMesh(new T.BoxGeometry(1.9, TH, 1.6), new T.MeshLambertMaterial({ map: paperTex }), N);
      stack.castShadow = true; stack.receiveShadow = true;
      S.add(stack);
      const ladder = group(S, [DESK[0] + 1.25, 0, DESK[1] + 0.2]);
      const rails = [-0.22, 0.22].map((x) => box(ladder, [0.06, 1, 0.06], [x, 0.5, 0], solid('#c49a5a')));
      const rungs = Array.from({ length: 40 }, (_, i) => box(ladder, [0.44, 0.05, 0.06], [0, 0.4 + i * 0.45, 0], solid('#c49a5a')));
      const flyers = tasks.map((k, i) => box(S, [0.42, 0.06, 0.56], [0, -99, 0], solid(k.src === 'door' ? '#ffe9a8' : '#ffffff'), { cast: false }));
      mates = [[2.0, -2.5, CAST.M1], [5.5, -2.5, CAST.M2], [1.8, 0.9, CAST.M3]].map(([x, z, look]) => workstation(S, x, z, look));
      const bossDesk = group(S, [BOSSD[0], 0, BOSSD[1]]);
      P.desk(bossDesk, 0, 0, { top: '#8b5e34', panelColor: '#6b4a2b' });
      box(bossDesk, [1.0, 0.3, 0.04], [0, 0.5, 0.51], faces(solid('#f2c230'), { front: P.glow(textTex('部長', { w: 128, h: 64, size: 40 })) }));
      BOSS = addChar(S, CAST.BOSS, [BOSSD[0], 0, BOSSD[1] - 0.95]);
      const moon = new T.Mesh(new T.BoxGeometry(2.2, 2.2, 0.4), new T.MeshBasicMaterial({ color: '#fff3c4' }));
      moon.position.set(-2, 15, -20); S.add(moon);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3(), r = mulberry32(1212);
      const jit = Array.from({ length: N }, () => [(r() - 0.5) * 0.12, (r() - 0.5) * 0.12, (r() - 0.5) * 0.08]);
      const srcPos = (k, i) => {
        if (k.src === 'boss') return [BOSSD[0], 1.4, BOSSD[1]];
        if (k.src === 'door') return [-5.5, 1.4, -6.4];
        const m = mates[i % 3].root.position; return [m.x, 1.4, m.z];
      };
      const update = (lt, t) => {
        const night = t >= 25.5 ? 0 : prog(t, 20.6, 22.0);
        repaintGradient(S.background, mixHex(DAY[0], NIGHT[0], night), mixHex(DAY[1], NIGHT[1], night));
        winMat.color.set(mixHex('#ffffff', '#3a4570', night));
        hemi.intensity = lerp(0.72, 0.35, night); dir.intensity = lerp(0.55, 0.15, night);
        moon.visible = night > 0.5;
        lamp.visible = night > 0.3;
        boardFace[4] = t >= 25.5 ? evalMat : plainMat;
        const h = stackH(t);
        tower.position.y = h;
        for (let i = 0; i < N; i++) {
          const on = i < done(t);
          ps.set(DESK[0] + jit[i][0], TH / 2 + i * TH, DESK[1] + jit[i][2]);
          q.setFromEuler(new T.Euler(0, jit[i][1], 0));
          sc.setScalar(on ? 1 : 0.0001);
          m4.compose(ps, q, sc); stack.setMatrixAt(i, m4);
        }
        stack.instanceMatrix.needsUpdate = true;
        rails.forEach((m) => { m.scale.y = Math.max(0.01, h + 1); m.position.y = (h + 1) / 2; });
        rungs.forEach((m) => { m.visible = m.position.y < h + 0.8; });
        ladder.visible = h > 0.6;
        tasks.forEach((k, i) => {
          const f = flyers[i], u = prog(t, k.t, k.land);
          f.visible = t >= k.t && t < k.land;
          if (!f.visible) return;
          const s = srcPos(k, i), topY = h + 0.9;
          f.position.set(lerp(s[0], DESK[0], u), lerp(s[1], topY, u) + Math.sin(u * Math.PI) * 1.5, lerp(s[2], DESK[1], u));
          f.rotation.set(0, u * 6, 0);
        });
        reset(A); sit(A);
        const busy = tasks.some((k) => t >= k.land && t < k.land + 0.25);
        typing(A, t, 18 + h * 2, 0.15);
        A.setFace(t < 4.5 ? 'normal' : t < 20.5 ? 'shock' : 'sleepy');
        if (busy) A.root.position.y += 0.08;
        mates.forEach((c, i) => {
          working(c, t, i, 14);
          if (t >= 9.5 && t < 15) { c.armR.rotation.x = -2.0; c.head.rotation.x = -0.3; c.setFace('happy'); }
          if (t >= 20.5) c.root.visible = false; else c.root.visible = true;
        });
        reset(BOSS);
        const sink = ease.inOut(prog(t, 15.2, 16.4));
        bossDesk.scale.y = 1 - sink * 0.86;
        if (t < 15) { sit(BOSS); BOSS.armL.rotation.x = BOSS.armR.rotation.x = -1.0; if (t > 1.2 && t < 4.0) BOSS.armR.rotation.x = -2.0; }
        else { sit(BOSS); BOSS.root.position.y = -0.48 * sink; BOSS.setFace('sleepy'); BOSS.head.rotation.x = 0.4 * sink; BOSS.body.rotation.x = 0.2 * sink; }
        BOSS.root.visible = t < 20.5 || t >= 25.5;
      };
      const towerCam = (lift, back) => (lt, t) => {
        const ty = Math.max(1.4, height(t) - 0.2) + lift;
        return { pos: [DESK[0] + 5.2, ty + 2.6, DESK[1] + back], target: [DESK[0] + 1.2, ty - 0.2, DESK[1]], fov: 42 };
      };
      scenes.push({ id: 'office', start: 0, end: 4.5, scene: S, update, cam: camPath([5.8, 4.8, 10.4], [5.2, 4.4, 9.6], [0.6, 1.4, -2.0], [0.4, 1.6, -2.0], 42, 4.5) });
      scenes.push({ id: 'office', start: 4.5, end: 9.5, scene: S, update, cam: towerCam(0, 10.5) });
      scenes.push({ id: 'office', start: 9.5, end: 15, scene: S, update, cam: towerCam(0.4, 11.5) });
      scenes.push({ id: 'office', start: 15, end: 20.5, scene: S, update, cam: camPath([9.8, 2.4, 6.8], [9.2, 2.2, 6.0], [6.0, 0.6, 0.2], [6.0, 0.6, 0.2], 40, 5.5) });
      scenes.push({ id: 'office', start: 20.5, end: 25.5, scene: S, update, cam: towerCam(0.6, 13.0) });
      scenes.push({ id: 'office', start: 25.5, end: 30.01, scene: S, update, cam: camPath([4.6, 3.2, 1.6], [4.2, 3.0, 0.8], [3.6, 2.4, -5.9], [3.6, 2.4, -5.9], 42, 4.5) });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも仕事の量だけ、机が高くなったら', cls: 'title' },
        { text: 'ブロック町のIT企業、月末', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: CUTS[4], label: '社員Aの机の高さ', value: height, format: (v) => `${v.toFixed(1)}ブロック`, done: (t) => t >= 22 },
      { type: 'bubble', t0: 1.2, t1: 3.6, text: 'Aくん、これもよろしく', scene: 'office', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '仕事が増えるほど、', at: 4.65, cps: 18 },
        { text: '机が高くなる', at: 5.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '頼まれごとが集まって、', at: 9.65, cps: 18 },
        { text: '壁より高くなる', at: 11.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 10.2, t1: 12.2, text: 'これもお願い！', scene: 'office', anchor: headTop(mates[0]) },
      { type: 'bubble', t0: 12.4, t1: 14.8, text: 'あ、これも', scene: 'office', anchor: headTop(mates[1]) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: 'いっぽう部長の机は、', at: 15.15, cps: 18 },
        { text: '床と同じ高さ', at: 16.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 17.0, t1: 20.4, text: 'Zzz…', scene: 'office', anchor: headTop(BOSS, 0.8), x: 110, y: -10, rot: -6, size: 46 },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '定時をすぎても、', at: 20.65, cps: 18 },
        { text: '社員Aの机は月に近づく', at: 21.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも評価は、部長のほうが上。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '仕事の量で机が高くなる会社', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #12　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({ prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Am', 'G', 'F', 'G', 'Am', 'Em', 'F', 'C'], arp: [10, 11] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    tasks.forEach((k, i) => add(S_.pop(k.land, i % 12)));
    add(S_.squash(15.3));
    add(S_.chime(20.6));
    add(S_.error(25.9));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
