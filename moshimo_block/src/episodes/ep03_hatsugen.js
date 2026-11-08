/* ep03 — もしも会議の発言が、1つにつき1ブロック積み上がったら（30秒） */
EPISODES.push({
  id: 'ep03',
  no: 3,
  short: '積み上がる会議',
  title: 'もしも会議の発言が、1つにつき1ブロック積み上がったら',
  lead: '「えー」も「まあ」も「要するに」も1ブロック。部長の話は天井を抜け、ビルを抜け、雲の上へ。新人のひと言で全部くずれる定例会議の30秒です。',
  duration: 30,
  poster: 7.2,
  chapters: [
    { t: 0, name: '定例会議' }, { t: 4.5, name: '部長の話' }, { t: 10, name: '上の階' },
    { t: 16, name: '雲の上' }, { t: 20.5, name: '結論は？' }, { t: 25.5, name: '議事録' },
  ],
  build() {
    const CEO = { suit: '#26282e', tie: '#f2c230', hair: '#f2f2f2', mustache: '#f2f2f2', brows: true, skin: '#eebf96', scale: 1.04 };
    const H = P.FLOOR_H, scenes = [];
    const CUTS = [4.5, 10, 16, 20.5, 25.5], COLLAPSE = 23.2, TINY = 22.3;
    const OPENING = [[1.3, 'おはようございます', 'A'], [2.0, 'よろしくお願いします', 'M2'], [2.8, 'えー', 'B'], [3.3, 'では', 'B'], [3.8, '始めます', 'B']];
    const RAMBLE = ['まず', 'そもそも', 'えー', 'いわゆる', 'まあ', '逆に言うと', '要するに', 'ぶっちゃけ', 'なんというか', '前提として', '念のため', '補足すると', 'えーっと', '話を戻すと', '結局', 'とはいえ', '一応', 'ざっくり言うと'];
    const WORDS = [...OPENING.map(([t, w, who]) => ({ t, w, who })), ...RAMBLE.map((w, i) => ({ t: 4.6 + i * 0.29, w, who: 'B' }))];
    const said = (t) => WORDS.filter((x) => x.t <= t).length;
    const count = (t) => {
      if (t < 10) return said(t);
      if (t < 16) return Math.round(lerp(WORDS.length, 140, prog(t, 10.2, 15.2)));
      if (t < 20.5) return Math.round(lerp(140, 412, ease.inOut(prog(t, 16.2, 20.2))));
      return 412 + (t >= TINY ? 1 : 0);
    };

    /* ===== 会議室（0〜10秒と 20.5〜30秒で使う） ===== */
    let A, M2, BOSS, NEW, tiny;
    const stackTop = (t) => 0.82 + 0.4 * said(t);
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { floor: 'plank', windows: [[3, 2], [4, 2], [3, 3], [4, 3], [6, 2], [7, 2], [6, 3], [7, 3]] });
      const minutes = canvasTex(512, 256, (g) => {
        g.fillStyle = '#fbfcfd'; g.fillRect(0, 0, 512, 256);
        g.strokeStyle = '#9aa3ad'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248);
        g.fillStyle = '#1d2333'; g.font = `52px ${PIXEL_FONT}`; g.textBaseline = 'top';
        g.fillText('議事録', 36, 34);
        g.fillStyle = '#2f62d6'; g.fillRect(36, 98, 160, 6);
        g.fillStyle = '#d24b4b'; g.font = `64px ${PIXEL_FONT}`;
        g.fillText('・特になし', 36, 140);
      }, true);
      const agenda = canvasTex(512, 256, (g) => {
        g.fillStyle = '#fbfcfd'; g.fillRect(0, 0, 512, 256);
        g.strokeStyle = '#9aa3ad'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248);
        g.fillStyle = '#1d2333'; g.font = `48px ${PIXEL_FONT}`; g.textBaseline = 'top';
        g.fillText('本日の議題', 36, 34);
        g.fillStyle = '#2f62d6'; g.font = `40px ${PIXEL_FONT}`;
        g.fillText('・来期の方針（5分）', 36, 120);
      }, true);
      const boardFace = faces(solid('#9aa3ad'), { front: P.glow(agenda) });
      box(S, [3.8, 1.9, 0.08], [-1.8, 2.5, -5.92], boardFace);
      const minutesMat = P.glow(minutes), agendaMat = boardFace[4];
      P.desk(S, 0, -2.3, { w: 4.6, d: 1.4, top: '#c99a62', panelColor: '#a87b48' });
      P.chair(S, -1.6, -3.45, 0, '#2f62d6'); P.chair(S, 1.6, -3.45, 0, '#2f62d6'); P.chair(S, 3.2, -2.3, -Math.PI / 2, '#2f62d6');
      P.laptop(S, -1.6, 0.82, -2.6);
      A = addChar(S, CAST.A, [-1.6, 0, -3.45]);
      M2 = addChar(S, CAST.M2, [1.6, 0, -3.45]);
      NEW = addChar(S, CAST.NEW, [3.2, 0, -2.3], -Math.PI / 2);
      BOSS = addChar(S, CAST.BOSS, [-3.3, 0, -2.0], Math.PI / 2 - 0.3);
      const r = mulberry32(303);
      const FILL = 30, N = WORDS.length + FILL;
      const blocks = [];
      for (let k = 0; k < N; k++) {
        const w = k < WORDS.length ? WORDS[k].w : RAMBLE[k % RAMBLE.length];
        const m = wordBlock(S, w, [1.3, 0.4, 0.8], k);
        const pile = [(r() - 0.5) * 8.4 * Math.sqrt(r()), 0, -2.2 + (r() - 0.5) * 5.0];
        blocks.push({ m, t: k < WORDS.length ? WORDS[k].t : 10, yaw: (r() - 0.5) * 0.25, jx: (r() - 0.5) * 0.12, pile, pyaw: r() * Math.PI, ptilt: (r() - 0.5) * 0.5, delay: r() * 0.35, dur: 0.45 + r() * 0.35 });
      }
      const heights = {};
      blocks.forEach((b) => { const key = Math.round(b.pile[0]) + ',' + Math.round(b.pile[2]); heights[key] = (heights[key] || 0) + 1; b.pile[1] = 0.2 + 0.4 * (heights[key] - 1); });
      tiny = wordBlock(S, '結論は？', [0.7, 0.3, 0.5], 3);
      const dust = P.dustPuff(S, 14, 31);
      const update = (lt, t) => {
        boardFace[4] = t >= 25.5 ? minutesMat : agendaMat;
        const wob = t > TINY + 0.05 && t < COLLAPSE ? Math.sin(t * 22) * 0.05 * prog(t, TINY, COLLAPSE) : Math.sin(t * 2.4) * 0.006;
        blocks.forEach((b, k) => {
          b.m.visible = t >= b.t;
          if (!b.m.visible) return;
          const sy = 0.82 + 0.2 + 0.4 * k, sx = b.jx + wob * k;
          if (t < COLLAPSE) {
            const drop = 1 - ease.in(prog(t, b.t, b.t + 0.15));
            b.m.position.set(sx, sy + drop * 1.4, -2.3);
            b.m.rotation.set(0, b.yaw, wob * 0.5);
          } else {
            const u = prog(t, COLLAPSE + b.delay, COLLAPSE + b.delay + b.dur);
            const e = ease.in(u);
            b.m.position.set(lerp(sx, b.pile[0], ease.out(u)), lerp(sy, b.pile[1], e) + Math.sin(u * Math.PI) * 0.6, lerp(-2.3, b.pile[2], ease.out(u)));
            b.m.rotation.set(b.ptilt * u, lerp(b.yaw, b.pyaw, u), u * (k % 2 ? 0.3 : -0.3) * (1 - u));
          }
        });
        tiny.visible = t >= TINY - 0.2 && t >= 20;
        tiny.position.set(1.9, 0.82 + 0.15 + (1 - ease.in(prog(t, TINY - 0.2, TINY))) * 1.0, -1.9);
        tiny.rotation.y = -0.3;
        dust.update(t, COLLAPSE + 0.4, [0, 0, -2.2], 1.0);
        const talking = t > 2.8 && t < 10;
        reset(BOSS);
        if (talking) { BOSS.armR.rotation.x = -1.2 + Math.sin(t * 11) * 0.35; BOSS.armL.rotation.x = -0.6 + Math.sin(t * 7) * 0.2; BOSS.head.rotation.z = Math.sin(t * 9) * 0.05; }
        if (t > 20 && t < COLLAPSE) { BOSS.head.rotation.x = -0.3; }
        if (t >= COLLAPSE) { BOSS.setFace('shock'); banzai(BOSS, 0.7, Math.sin(t * 12) * 0.1); }
        [A, M2].forEach((c, i) => {
          reset(c); sit(c);
          c.armL.rotation.x = c.armR.rotation.x = -1.0;
          c.head.rotation.y = i ? -0.95 : -0.45;
          if (t > 6.5 && t < 20) { c.head.rotation.x = -0.35; c.head.rotation.y *= 0.4; c.setFace('shock'); }
          if (t > 20) { c.head.rotation.x = -0.4; c.head.rotation.y = 0; }
          if (t >= COLLAPSE) { surprised(c, 0, bump(t, [COLLAPSE + 0.3], 0.25)); }
        });
        if (t > 25.5) { reset(A); sit(A); typing(A, t, 9, 0.1); A.setFace('sleepy'); A.head.rotation.x = 0.2; }
        reset(NEW); sit(NEW);
        NEW.armL.rotation.x = NEW.armR.rotation.x = -1.0;
        NEW.head.rotation.x = Math.sin(t * 2.2) * 0.12 + (t > 7.5 && t < 20 ? 0.3 : 0);
        if (t > 7.5 && t < 20) NEW.setFace('sleepy');
        if (t > 20.5 && t < TINY + 0.3) { NEW.armR.rotation.x = -2.9; NEW.head.rotation.x = 0; }
        if (t >= COLLAPSE) surprised(NEW, 0, bump(t, [COLLAPSE + 0.3], 0.25));
      };
      const roomCam = camPath([4.2, 4.2, 9.4], [3.6, 3.8, 8.6], [-0.4, 1.5, -2.2], [-0.4, 1.6, -2.3], 36, 4.5);
      scenes.push({
        id: 'room', start: 0, end: 10, scene: S, update,
        cam: (lt, t) => {
          if (t < 4.5) return roomCam(lt);
          const ty = clamp(stackTop(t) - 1.4, 1.6, 7.2);
          return { pos: [3.4, ty + 2.4, 10.4], target: [-0.2, ty, -2.3], fov: 38 };
        },
      });
      scenes.push({
        id: 'room', start: 20.5, end: 30.01, scene: S, update,
        cam: (lt, t) => (t < 25.5
          ? { pos: [4.4, 4.6, 10.0], target: [0, 1.9, -2.2], fov: 38 }
          : camPath([-0.6, 3.6, 2.6], [-0.9, 3.2, 1.7], [-1.6, 1.8, -3.6], [-1.6, 1.9, -3.8], 36, 4.5)(t - 25.5)),
        shake: (lt) => impact(lt + 20.5, [TINY], 0.02) + impact(lt + 20.5, [COLLAPSE + 0.3], 0.14, 5),
      });
    }

    /* ===== 上の階（10〜16秒）：発言の柱がフロアを突き抜ける ===== */
    let watcher3, ceo5;
    {
      const S = newScene({ sky: SKY_DAY });
      const holes = [];
      for (let f = 1; f <= 5; f++) holes.push([0, f * H - 1, 1], [0, f * H - 2, 1]);
      P.tower(S, { holes });
      const top = (lt) => 3.0 + 23 * Math.pow(prog(lt, 0.2, 5.2), 1.2);
      const reach = (y) => 0.2 + Math.pow(clamp((y - 3.0) / 23, 0, 1), 1 / 1.2) * 5.0;
      const brk = new P.Breakables(S, 41);
      holes.forEach(([x, y, z], i) => brk.add(blockMat(i % 2 ? 'foundation' : 'carpet'), [x + 0.5, y + 0.5, z + 0.5], reach(y - 0.2), { bits: 4 }));
      const fl = [1, 2, 3, 4, 5].map((f) => floorG(S, f));
      P.desk(fl[0], 0.5, 1.0, { w: 3.2, d: 1.2, top: '#c99a62', panelColor: '#a87b48' });
      const boss = addChar(fl[0], CAST.BOSS, [-2.0, 0, 0.6], 1.0);
      const people = [
        { c: workstation(fl[1], 3.2, -0.8, CAST.M1), f: 2 },
        { c: workstation(fl[2], -3.6, -0.8, CAST.M3), f: 3 },
        { c: workstation(fl[3], 3.2, -0.8, CAST.NEW), f: 4 },
        { c: workstation(fl[4], -3.4, -0.8, CEO), f: 5 },
      ];
      watcher3 = people[1].c; ceo5 = people[3].c;
      const r = mulberry32(5);
      const col = Array.from({ length: 66 }, (_, k) => ({ m: wordBlock(S, RAMBLE[(k * 7) % RAMBLE.length], [0.95, 0.4, 0.8], k), yaw: (r() - 0.5) * 0.2 }));
      const camY = (lt) => clamp(top(lt) - 1.8, 1.6, 21.6);
      scenes.push({
        id: 'upstairs', start: 10, end: 16, scene: S,
        cam: (lt) => { const ty = camY(lt); return { pos: [4.4, ty + 1.9, 11.6], target: [0.2, ty, -0.4], fov: 38 }; },
        shake: (lt) => impact(lt, holes.filter((_, i) => i % 2 === 0).map(([, y]) => reach(y - 0.2)), 0.05),
        update(lt) {
          brk.update(lt);
          P.followLight(S, 0, camY(lt), 0);
          const tp = top(lt);
          col.forEach((b, k) => {
            const y = tp - 0.2 - 0.4 * k;
            b.m.visible = y > 1.0;
            b.m.position.set(0.5 + Math.sin(k * 1.7) * 0.04, y, 1.4);
            b.m.rotation.y = b.yaw;
          });
          reset(boss);
          boss.armR.rotation.x = -1.2 + Math.sin(lt * 11) * 0.35;
          boss.head.rotation.x = -0.25;
          people.forEach(({ c, f }, i) => {
            working(c, lt, i);
            const pass = reach((f - 1) * H + 0.5);
            if (lt > pass) surprised(c, i % 2 ? 0.9 : -0.9, bump(lt, [pass], 0.22));
          });
        },
        reach,
      });
    }
    const reach3 = scenes[scenes.length - 1].reach;

    /* ===== 雲の上（16〜20.5秒） ===== */
    {
      const S = newScene({ sky: ['#5fb6ee', '#e3f4ff'], fog: ['#e3f4ff', 70, 170], sun: [10, 30, 12] });
      const B = new Blocks();
      for (let x = -6; x <= 5; x++) for (let y = 0; y <= 23; y++) B.set('facade', x, y, 1);
      for (let z = -3; z <= 1; z++) for (let y = 0; y <= 23; y++) B.set('facade', 5, y, z);
      B.fill('stone', -6, 24, -3, 5, 24, 1);
      B.build(S, {}, { cast: false });
      const r = mulberry32(17), cityCols = ['#c9b7a3', '#a9b5c1', '#d6c7b0', '#9fb0c2'];
      for (let i = 0; i < 18; i++) {
        const h = 8 + r() * 14, x = -40 + i * 5 + r() * 2, z = -12 - r() * 25;
        box(S, [4 + r() * 3, h, 4 + r() * 3], [x, h / 2 - 2, z], solid(cityCols[i % 4]), { cast: false });
      }
      const scribble = canvasTex(32, 16, (g) => {
        px(g, '#ffffff', 0, 0, 32, 16); px(g, '#1d2333', 4, 6, 18, 2); px(g, '#1d2333', 4, 10, 12, 1); px(g, '#9aa3ad', 0, 15, 32, 1);
      });
      const N = 125, col = new T.InstancedMesh(new T.BoxGeometry(1.3, 0.4, 0.8), new T.MeshLambertMaterial({ map: scribble }), N);
      const tint = new T.Color();
      for (let k = 0; k < N; k++) col.setColorAt(k, tint.set(WORD_COLORS[k % WORD_COLORS.length]));
      col.instanceColor.needsUpdate = true;
      S.add(col);
      const clouds = [P.cloud(S, [-9, 40, -4], 21), P.cloud(S, [8, 50, -8], 22), P.cloud(S, [-3, 61, 4], 23), P.cloud(S, [11, 68, -2], 24)];
      const bird = (y, seed) => {
        const g = group(S, [0, y, 2]);
        box(g, [0.5, 0.25, 0.25], [0, 0, 0], solid('#2b3140'));
        const wings = [-1, 1].map((s) => { const w = group(g, [0, 0.05, s * 0.12]); box(w, [0.3, 0.05, 0.5], [0, 0, s * 0.25], solid('#2b3140')); return w; });
        return { g, wings, seed };
      };
      const birds = [bird(34, 1), bird(57, 2)];
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e3 = new T.Euler(), one = new T.Vector3(1, 1, 1), ps = new T.Vector3();
      const yaws = Array.from({ length: N }, () => (r() - 0.5) * 0.25);
      scenes.push({
        id: 'sky', start: 16, end: 20.5, scene: S,
        cam: (lt) => { const y = lerp(21, 64, ease.inOut(prog(lt, 0.1, 4.3))); return { pos: [17, y + 1.5, 34], target: [0, y, -1], fov: 40 }; },
        update(lt, t) {
          P.followLight(S, 0, lerp(21, 64, ease.inOut(prog(lt, 0.1, 4.3))), -1);
          for (let k = 0; k < N; k++) {
            ps.set(0.5 + 0.00028 * k * k * Math.sin(t * 1.3), 25.2 + 0.4 * k, -1.0);
            q.setFromEuler(e3.set(0, yaws[k], 0.0006 * k * Math.sin(t * 1.3)));
            m4.compose(ps, q, one); col.setMatrixAt(k, m4);
          }
          col.instanceMatrix.needsUpdate = true;
          clouds.forEach((c, i) => { c.position.x = [-9, 8, -3, 11][i] + lt * (i % 2 ? -0.6 : 0.5); });
          birds.forEach((b, i) => {
            b.g.position.x = (i ? 12 : -14) + lt * (i ? -5 : 6);
            b.g.rotation.y = i ? Math.PI : 0;
            b.wings.forEach((w, s) => { w.rotation.x = Math.sin(t * 14 + i) * 0.6 * (s ? 1 : -1); });
          });
        },
      });
    }

    /* ===== 重ね表示 ===== */
    const who = { A: () => A, M2: () => M2, B: () => BOSS };
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも会議の発言が、1つにつき1ブロック積み上がったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜10時の定例会議', at: 0.6, cps: 24, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.3, t1: CUTS[4], label: '積み上がった発言', value: count, format: (n) => `${n}個`, done: (t) => t >= TINY },
      ...OPENING.map(([t, w, k], i) => ({ type: 'bubble', t0: t, t1: OPENING[i + 1] ? OPENING[i + 1][0] : CUTS[0], text: w, scene: 'room', anchor: () => headTop(who[k]())() })),
      ...RAMBLE.map((w, i) => ({ type: 'bubble', t0: 4.6 + i * 0.29, t1: 4.6 + (i + 1) * 0.29, text: w, scene: 'room', anchor: () => headTop(BOSS, 1.0)(), silent: i % 3 !== 0 })),
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '部長の話は、', at: 4.65, cps: 18 },
        { text: 'とにかく積み上がる', at: 5.5, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: 'そして、', at: 10.15, cps: 16 },
        { text: '天井を突き抜ける', at: 10.7, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 10 + reach3(2 * H + 0.5) + 0.3, t1: 10 + reach3(2 * H + 0.5) + 1.8, text: '下から何か来た…', scene: 'upstairs', anchor: () => headTop(watcher3)() },
      { type: 'bubble', t0: 10 + reach3(4 * H + 0.5) + 0.2, t1: CUTS[2], text: 'あ、部長の話だ', scene: 'upstairs', anchor: () => headTop(ceo5)() },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '会議開始から1時間、', at: 16.15, cps: 18 },
        { text: '雲の上まで届く', at: 17.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 20.8, t1: TINY, text: 'あの、結論は…？', scene: 'room', anchor: () => headTop(NEW)() },
      { type: 'fx', t0: TINY, t1: TINY + 0.6, text: 'コトッ', scene: 'room', anchor: () => tiny.position.clone(), x: 110, y: -50, rot: 6, size: 44 },
      { type: 'bubble', t0: TINY + 0.15, t1: COLLAPSE, text: '……', scene: 'room', anchor: () => headTop(BOSS, 1.0)(), silent: true },
      { type: 'fx', t0: COLLAPSE + 0.1, t1: COLLAPSE + 1.4, text: 'ガラガラガラッ', x: 660, y: 150, rot: -5, size: 62, shake: true },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '新人のひと言で、', at: 23.6, cps: 18 },
        { text: '全部くずれる', at: 24.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'tag', t0: 24.6, t1: CUTS[4], text: '会議時間 2時間14分' },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも議事録は、1行だけ。', at: 25.7, cps: 14, cls: 'mark-soft' },
        { text: '発言413個の定例会議', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #03　おわり' },
    ];

    /* ===== 音 ===== */
    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({ prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Am', 'Em', 'F', 'G', 'Am', 'G', 'F', 'C'], arp: [5, 6, 8, 9] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    WORDS.forEach((w, i) => add(S_.pop(w.t + 0.15, i % 12)));
    for (let f = 1; f <= 5; f++) { add(S_.crack(10 + reach3(f * H - 2.2))); add(S_.stomp(10 + reach3(f * H - 2.2))); }
    add(S_.waves(16, 4.5));
    [16.8, 17.4, 19.0].forEach((t) => add(S_.coinSmall(t)));
    add(S_.pop(TINY, 0));
    for (let i = 0; i < 6; i++) add(S_.tick(TINY + 0.15 + i * 0.13, i % 2));
    add(S_.smash(COLLAPSE + 0.3));
    for (let i = 0; i < 14; i++) add(S_.thud(COLLAPSE + 0.3 + i * 0.07, i % 6));
    add(S_.dust(COLLAPSE + 0.5));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
