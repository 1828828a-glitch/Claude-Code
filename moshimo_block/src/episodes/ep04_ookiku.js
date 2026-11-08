/* ep04 — もしも部長だけ、毎朝1ブロックずつ大きくなったら（30秒） */
EPISODES.push({
  id: 'ep04',
  no: 4,
  short: '毎朝大きくなる部長',
  title: 'もしも部長だけ、毎朝1.5倍ずつ大きくなったら',
  lead: '月曜1.8ブロック、金曜9.1ブロック。ノートPCはスマホに、天井には頭をぶつけ、木曜は頭だけ上の階へ出勤。体はどんどん大きくなる部長の1週間です。',
  duration: 30,
  poster: 6.6,
  chapters: [
    { t: 0, name: '月曜' }, { t: 4.5, name: '火曜' }, { t: 9.5, name: '水曜' },
    { t: 14.5, name: '木曜' }, { t: 19.5, name: '金曜' }, { t: 25, name: '有給申請' },
  ],
  build() {
    const H = 4, scenes = [];
    const fg = (S, f) => group(S, [0, (f - 1) * H, 0]);
    const CUTS = [4.5, 9.5, 14.5, 19.5, 25];
    const GROW = [[0, 1.8], [4.8, 2.7], [9.8, 4.05], [15.1, 6.1], [19.8, 9.1]];
    const height = (t) => {
      let h = GROW[0][1];
      for (let i = 1; i < GROW.length; i++) {
        const [tg, v] = GROW[i];
        if (t >= tg) h = lerp(GROW[i - 1][1], v, ease.back(prog(t, tg, tg + 0.3)));
      }
      return h;
    };
    const scaleAt = (t) => height(t) / 1.74;
    const BUMP = 12.6, STAMP = 27.0;

    /* ===== 月・火：オフィス ===== */
    let boss1, a1;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S);
      P.desk(S, 0, -2.5); P.chair(S, 0, -3.45, 0, '#5a2f2f');
      const deskPc = P.laptop(S, 0, 0.82, -2.6);
      box(S, [1.0, 0.32, 0.04], [0, 0.5, -1.99], faces(solid('#f2c230'), { front: P.glow(textTex('部長', { w: 128, h: 64, size: 40 })) }));
      a1 = workstation(S, -4, -2.5, CAST.A);
      const m2 = workstation(S, 4, -2.5, CAST.M2);
      P.plant(S, -8.6, -5.3); P.shelf(S, 6.4, -5.7);
      const cal = (d, c) => P.glow(textTex(d, { w: 128, h: 128, size: 84, bg: '#ffffff', fg: c }));
      const calFace = faces(solid('#d24b4b'), {});
      box(S, [0.8, 0.9, 0.06], [1.6, 3.1, -5.94], calFace);
      const days = [cal('月', '#1d2333'), cal('火', '#1d2333')];
      const boss = addChar(S, CAST.BOSS, [0, 0, -3.45]);
      boss1 = boss;
      const handPc = P.laptop(boss.armL, 0, -0.66, 0.12);
      const mug = group(boss.armR, [0, -0.66, 0.1]);
      box(mug, [0.18, 0.22, 0.18], [0, 0, 0], solid('#f4f1ea'));
      const update = (lt, t) => {
        calFace[4] = days[t < 4.5 ? 0 : 1];
        const s = scaleAt(t);
        reset(boss);
        boss.root.scale.setScalar(s);
        const tue = t >= 4.5;
        deskPc.visible = !tue; handPc.visible = tue; mug.visible = false;
        if (!tue) {
          sit(boss); typing(boss, t);
          if (t > 2.4 && t < 3.6) { boss.armL.rotation.x = boss.armR.rotation.x = -3.0; boss.setFace('sleepy'); }
        } else {
          boss.root.position.z = -3.7;
          boss.armL.rotation.x = -1.25; boss.armL.rotation.z = 0.25;
          boss.armR.rotation.x = -1.35 + Math.sin(t * 16) * 0.08; boss.armR.rotation.z = -0.3;
          boss.head.rotation.x = 0.35;
          handPc.scale.setScalar(1 / s); handPc.rotation.set(1.2, 0, 0);
        }
        [a1, m2].forEach((c, i) => {
          working(c, t, i);
          if (t > 5.0) surprised(c, i ? -0.8 : 0.8, bump(t, [GROW[1][0] + 0.1], 0.18));
        });
      };
      scenes.push({ id: 'office', start: 0, end: 4.5, scene: S, update, cam: camPath([5.2, 4.6, 10.0], [4.4, 4.0, 8.8], [0, 1.2, -2.6], [0, 1.2, -2.7], 34, 4.5) });
      scenes.push({ id: 'office', start: 4.5, end: 9.5, scene: S, update, cam: camPath([3.2, 3.6, 7.6], [2.6, 3.4, 6.6], [0, 1.9, -3.2], [0, 2.0, -3.3], 36, 5) });
    }

    /* ===== 水・木：ビルの2階と3階 ===== */
    let boss3, mate3, a3;
    {
      const S = newScene({ sky: SKY_DAY });
      const holes = [];
      [-4, -3, -2, -1, 0].forEach((x) => [-2, -1, 0].forEach((z) => holes.push([x, 2 * H - 1, z])));
      P.tower(S, { floors: 4, floorH: H, slab: 1, holes });
      const brk = new P.Breakables(S, 44);
      holes.forEach(([x, y, z]) => brk.add(blockMat('carpet'), [x + 0.5, y + 0.5, z + 0.5], GROW[3][0] + 0.12, { bits: 3 }));
      const f2 = fg(S, 2), f3 = fg(S, 3);
      P.desk(f2, 1.6, 0.2, { w: 2.4, d: 1.1, top: '#c99a62', panelColor: '#a87b48' });
      P.chair(f2, 1.0, -0.75, 0, '#2f62d6'); P.chair(f2, 2.4, -0.75, 0, '#2f62d6');
      a3 = addChar(f2, CAST.A, [1.0, 0, -0.75]);
      const m3 = addChar(f2, CAST.M3, [2.4, 0, -0.75]);
      mate3 = workstation(f3, 1.4, 0.4, CAST.M1);
      P.plant(f3, -5.0, -2.4); P.plant(f2, -5.0, -2.4, 0.8);
      const crack = P.crackDecal(S, -2.0, 2 * H - 1 - 0.04, -0.4, 0.5);
      crack.rotation.x = Math.PI / 2; crack.scale.setScalar(2.4);
      boss3 = addChar(f2, CAST.BOSS, [-2.0, 0, -0.4], 0.5);
      const dust = P.dustPuff(S, 12, 8);
      const update = (lt, t) => {
        brk.update(t);
        P.followLight(S, 0, t < 14.5 ? H + 1.5 : 2 * H, 0);
        crack.visible = t >= BUMP && t < GROW[3][0] + 0.12;
        dust.update(t, GROW[3][0] + 0.12, [-2.0, 2 * H, -0.4], 0.8);
        const s = scaleAt(t), b = boss3;
        reset(b); b.root.scale.setScalar(s);
        if (t < 14.5) {
          const standing = prog(t, BUMP - 0.25, BUMP) * (1 - ease.out(prog(t, BUMP + 0.1, BUMP + 0.45)));
          sit(b);
          b.legL.rotation.x = b.legR.rotation.x = lerp(-Math.PI / 2, -0.5, standing);
          b.root.position.y = lerp(0.3 - 0.5 * s, -0.75, standing);
          b.head.rotation.x = 0.4 * (1 - standing);
          b.body.rotation.x = 0.15 * (1 - standing);
          if (t < BUMP - 0.3) { b.armR.rotation.x = -1.3 + Math.sin(t * 9) * 0.3; }
          if (t > BUMP) { b.setFace('shock'); b.armR.rotation.x = -2.9; b.armR.rotation.z = 0.5; }
        } else {
          b.root.position.y = 0;
          b.setFace(t > 17.6 ? 'happy' : 'normal');
          b.armR.rotation.x = -1.0 + Math.sin(t * 8) * 0.2;
        }
        [a3, m3].forEach((c, i) => {
          reset(c); sit(c); c.armL.rotation.x = c.armR.rotation.x = -1.0;
          c.head.rotation.y = 0.9; c.head.rotation.x = -0.25;
          if (t > BUMP) surprised(c, 0.9, bump(t, [BUMP], 0.2));
        });
        working(mate3, t);
        if (t > GROW[3][0] + 0.1) { surprised(mate3, 0.9, bump(t, [GROW[3][0] + 0.15], 0.25)); if (t > 16.2) { mate3.setFace('happy'); mate3.head.rotation.x = 0.15; } }
      };
      scenes.push({
        id: 'tower', start: 9.5, end: 14.5, scene: S, update,
        cam: camPath([3.4, H + 3.0, 11.6], [2.8, H + 2.8, 10.4], [-0.6, H + 1.4, -0.4], [-0.8, H + 1.4, -0.4], 38, 5),
        shake: (lt) => impact(lt + 9.5, [BUMP], 0.12),
      });
      scenes.push({
        id: 'tower', start: 14.5, end: 19.5, scene: S, update,
        cam: camPath([3.2, 2 * H + 2.4, 12.0], [2.8, 2 * H + 2.2, 11.0], [-0.6, 2 * H + 0.6, -0.8], [-0.6, 2 * H + 0.6, -0.8], 40, 5),
        shake: (lt) => impact(lt + 14.5, [GROW[3][0] + 0.12], 0.14),
      });
    }

    /* ===== 金曜：会社に入れない（19.5〜30秒） ===== */
    let boss5, a5, peekA;
    {
      const S = newScene({ sky: ['#7fc6ef', '#e9f6fb'] });
      const B = new Blocks();
      B.fill('foundation', -14, -2, -4, 13, -2, 7);
      B.fill('stone', -14, -1, -3, 13, -1, 1);
      B.fill('asphalt', -14, -1, 2, 13, -1, 7);
      for (let x = -14; x <= 13; x++) for (let y = -1; y <= 14; y++) B.set(y === 3 || y === 9 ? 'wallBase' : 'brick', x, y, -4);
      [[1, 4], [2, 4], [1, 5], [2, 5], [-7, 4], [-6, 4], [-7, 5], [-6, 5], [6, 4], [7, 4], [6, 5], [7, 5]].forEach(([x, y]) => B.del(x, y, -4));
      [[-1, 0], [0, 0], [-1, 1], [0, 1]].forEach(([x, y]) => B.del(x, y, -4));
      B.build(S);
      [[2, 5], [-6, 5], [7, 5]].forEach(([x, y]) => box(S, [2, 2, 0.4], [x, y, -5.1], solid('#3a3346'), { cast: false }));
      box(S, [2, 2, 0.4], [0, 1, -4.7], solid('#2b3140'), { cast: false });
      for (let x = -13; x <= 13; x += 3) box(S, [1.4, 0.03, 0.18], [x, 0.015, 4.5], solid('#f4f1ea'), { cast: false });
      box(S, [3.0, 0.6, 0.1], [0, 2.6, -2.94], faces(solid('#1d2333'), { front: P.glow(textTex('ブロック町IT', { w: 256, h: 64, size: 36, bg: '#1d2333', fg: '#f2c230' })) }));
      peekA = addChar(S, CAST.A, [2.0, 3.6, -4.45]);
      const peekM = addChar(S, CAST.M2, [1.2, 3.6, -4.55]);
      boss5 = addChar(S, CAST.BOSS, [-0.4, 0, -2.0], 0.4);
      a5 = addChar(S, CAST.A, [3.4, 0, 0.8], -1.2);
      const paper = box(a5.armR, [0.32, 0.42, 0.02], [0, -0.66, 0.12], solid('#ffffff'));
      const stamp = group(S);
      box(stamp, [1.6, 0.8, 1.6], [0, 0, 0], faces(solid('#d24b4b'), { top: P.glow(textTex('却下', { w: 128, h: 128, size: 80, bg: '#d24b4b', fg: '#ffffff' })), front: P.glow(textTex('却下', { w: 128, h: 64, size: 48, bg: '#d24b4b', fg: '#ffffff' })) }));
      const dust = P.dustPuff(S, 10, 12);
      const crack2 = P.crackDecal(S, 2.3, 0, 0.5, 0.3); crack2.scale.setScalar(2.4);
      const update = (lt, t) => {
        const s = scaleAt(t), b = boss5;
        reset(b); b.root.scale.setScalar(s);
        [peekA, peekM].forEach((c) => { reset(c); c.head.rotation.y = -0.7; if (t > 20.0) c.setFace('shock'); });
        peekA.root.visible = t < 25;
        sit(b);
        b.root.position.y = 0.3 - 0.5 * s;
        b.armL.rotation.x = b.armR.rotation.x = -0.9;
        if (t < 25) {
          b.head.rotation.y = 0.85; b.head.rotation.x = 0.1;
          b.armR.rotation.x = -0.9 + Math.sin(t * 3) * 0.1;
          a5.root.visible = false;
        } else {
          a5.root.visible = true;
          b.head.rotation.x = 0.4; b.head.rotation.y = 0.5;
          reset(a5); a5.armR.rotation.x = -1.4; a5.head.rotation.x = -0.45;
          if (t > STAMP) { a5.setFace('shock'); a5.root.position.y += bump(t, [STAMP], 0.3); a5.armR.rotation.x = -0.5; }
          b.setFace(t > 26.8 ? 'normal' : 'normal');
          if (t > 26.6 && t < STAMP + 0.2) { b.armR.rotation.x = -2.2 + ease.in(prog(t, 26.7, STAMP)) * 1.4; b.armR.rotation.z = -0.5; }
        }
        paper.visible = t < STAMP;
        stamp.visible = t >= 26.75;
        stamp.position.set(2.3, lerp(7, 0.4, ease.in(prog(t, 26.75, STAMP))), 0.5);
        crack2.visible = t >= STAMP;
        dust.update(t, STAMP, [2.3, 0, 0.5], 0.7);
      };
      scenes.push({ id: 'street', start: 19.5, end: 25, scene: S, update, cam: camPath([7.2, 6.4, 17.0], [6.4, 6.8, 16.0], [0.6, 5.4, -2.4], [0.8, 5.6, -2.6], 40, 5.5) });
      scenes.push({
        id: 'street', start: 25, end: 30.01, scene: S, update,
        cam: camPath([9.4, 4.8, 15.4], [8.6, 5.0, 14.4], [1.2, 4.2, -1.0], [1.4, 4.3, -1.2], 40, 5),
        shake: (lt) => impact(lt + 25, [STAMP], 0.16, 7),
      });
    }

    /* ===== 重ね表示 ===== */
    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも部長だけ、毎朝1.5倍ずつ大きくなったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜日', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 0.8, t1: CUTS[4], label: '部長の身長', value: height, format: (v) => `${v.toFixed(1)}ブロック`, done: (t) => t >= GROW[4][0] + 0.3 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '火曜日、', at: 4.65, cps: 16 },
        { text: 'ノートPCがスマホになる', at: 5.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: GROW[1][0], t1: GROW[1][0] + 0.7, text: 'ムクッ', scene: 'office', anchor: headTop(boss1, 1.1), x: 150, y: -10, rot: 8, size: 48 },
      { type: 'bubble', t0: 6.9, t1: 8.2, text: '部長、なんか大きくないですか', scene: 'office', anchor: headTop(a1) },
      { type: 'bubble', t0: 8.25, t1: 9.5, text: '気のせいだ', scene: 'office', anchor: headTop(boss1, 0.9) },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '水曜日、', at: 9.65, cps: 16 },
        { text: '天井に頭をぶつける', at: BUMP + 0.15, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 10.4, t1: BUMP - 0.3, text: 'では、会議を始める', scene: 'tower', anchor: headTop(boss3, 0.9) },
      { type: 'fx', t0: BUMP, t1: BUMP + 0.8, text: 'ゴンッ', scene: 'tower', anchor: headTop(boss3, 0.9), x: 160, y: -20, rot: -8, size: 60, shake: true },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '木曜日、', at: 14.65, cps: 16 },
        { text: '頭だけ上の階に出勤', at: 15.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: GROW[3][0] + 0.1, t1: GROW[3][0] + 0.8, text: 'バキッ', x: 900, y: 240, rot: 7, size: 56, shake: true },
      { type: 'bubble', t0: 16.4, t1: 17.9, text: '部長、おはようございます', scene: 'tower', anchor: headTop(mate3) },
      { type: 'bubble', t0: 18.0, t1: 19.5, text: 'うむ', scene: 'tower', anchor: () => headTop(boss3, 0.6)().add(V3(1.2, 0, 0)) },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '金曜日、', at: 19.65, cps: 16 },
        { text: '会社に入れない', at: 20.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 21.2, t1: 23.0, text: '今日は窓から参加する', scene: 'street', anchor: () => headTop(boss5, 0.4)().add(V3(3.2, 0, 0)), cls: 'big' },
      { type: 'bubble', t0: 23.1, t1: 25, text: 'リモートとは…', scene: 'street', anchor: headTop(peekA) },
      { type: 'bubble', t0: 25.3, t1: 26.7, text: 'あの、来週1日だけ有給を…', scene: 'street', anchor: headTop(a5), cls: 'small' },
      { type: 'bubble', t0: 26.75, t1: 28.2, text: '却下', scene: 'street', anchor: headTop(boss5, 0.9), cls: 'big' },
      { type: 'fx', t0: STAMP, t1: STAMP + 0.6, text: 'ドンッ', x: 980, y: 520, rot: 6, size: 56, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも部長の器は、小さいまま。', at: 27.35, cps: 16, cls: 'mark-soft' },
        { text: '身長9.1ブロックの部長', at: 28.6, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.8, t1: 30.1, text: 'もしもブロック劇場 #04　おわり' },
    ];

    /* ===== 音 ===== */
    const S_ = AUDIO.SFX;
    const audio = AUDIO.music({ prog: ['F', 'C', 'G', 'Am', 'F', 'C', 'G', 'G', 'F', 'C', 'Dm', 'G', 'Am', 'F', 'G', 'C'], arp: [10, 11] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    GROW.slice(1).forEach(([t]) => add(S_.grow(t)));
    add(S_.stomp(BUMP)); add(S_.crack(BUMP + 0.02));
    add(S_.smash(GROW[3][0] + 0.12)); add(S_.dust(GROW[3][0] + 0.15));
    add(S_.whistle(26.75, STAMP - 26.75)); add(S_.stamp(STAMP)); add(S_.dust(STAMP + 0.03));
    add(S_.pop(28.8, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
