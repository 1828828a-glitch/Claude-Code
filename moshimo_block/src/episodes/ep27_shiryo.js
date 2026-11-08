/* ep27 — もしも会議資料が、ページ数だけ重くなったら（30秒） */
EPISODES.push({
  id: 'ep27',
  no: 27,
  short: '重い会議資料',
  title: 'もしも会議資料が、ページ数だけ重くなったら',
  lead: '1ページ1キロ。「もっと詳しく」で50キロ、200ページは台車、部長の「全部入れて」で1トンになり、フォークリフトで会議室へ。会議で見たのは1ページ目だけだった。',
  duration: 30,
  poster: 17.4,
  chapters: [
    { t: 0, name: '1ページ' }, { t: 4.5, name: '50ページ' }, { t: 9.5, name: '200ページ' },
    { t: 15, name: '1000ページ' }, { t: 20.5, name: '会議' }, { t: 25.5, name: '結論' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const pages = (t) => (t < 4.5 ? 1 : t < 9.5 ? 50 : t < 15 ? 200 : 1000);
    const DROP = 18.6;
    const paperTex = canvasTex(16, 16, (g) => { px(g, '#ffffff', 0, 0, 16, 16); for (let y = 1; y < 16; y += 2) px(g, '#d5dbe2', 0, y, 16, 1); });
    const paperMat = new T.MeshLambertMaterial({ map: paperTex });
    const coverTex = (txt) => P.glow(textTex(txt, { w: 256, h: 128, size: 40, bg: '#ffffff', fg: '#1d2333' }));

    let A, BOSS, M1, M2;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { floor: 'plank', doors: [-6] });
      box(S, [1, 2, 0.2], [-5.5, 1, -7.2], solid('#2b3140'), { cast: false });
      const tbl = group(S);
      P.desk(tbl, 1.0, -2.6, { w: 4.6, d: 1.6, top: '#c99a62', panelColor: '#a87b48' });
      const seats = [[-0.4, -3.75, CAST.M1], [1.0, -3.75, CAST.BOSS], [2.4, -3.75, CAST.M2]];
      [M1, BOSS, M2] = seats.map(([x, z, look]) => { P.chair(S, x, z, 0, '#2f62d6'); return addChar(S, look, [x, 0, z]); });
      A = addChar(S, CAST.A, [-6.0, 0, -1.0], Math.PI / 2);
      const doc1 = box(A.armR, [0.32, 0.02, 0.44], [0, -0.66, 0.2], faces(paperMat, { top: coverTex('資料') }));
      const doc50 = box(S, [0.6, 0.5, 0.8], [0, -99, 0], faces(paperMat, { top: coverTex('50p') }));
      const cart = group(S);
      box(cart, [1.4, 0.1, 1.0], [0, 0.35, 0], solid('#7a828c')); [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].forEach(([x, z]) => box(cart, [0.14, 0.14, 0.14], [x, 0.1, z], solid('#1d2333')));
      box(cart, [0.06, 0.9, 0.9], [-0.7, 0.8, 0], solid('#7a828c'));
      box(cart, [1.2, 1.0, 0.9], [0.1, 0.9, 0], faces(paperMat, { top: coverTex('200p') }));
      const lift = group(S);
      box(lift, [1.8, 1.2, 2.4], [0, 0.9, -0.6], solid('#f2c230')); box(lift, [1.6, 0.9, 1.2], [0, 1.95, -0.9], solid('#f2c230'));
      box(lift, [1.5, 0.06, 1.1], [0, 2.4, -0.9], solid('#1d2333'));
      [[-0.8, -1.4], [0.8, -1.4], [-0.8, 0.3], [0.8, 0.3]].forEach(([x, z]) => box(lift, [0.3, 0.6, 0.6], [x, 0.3, z], solid('#1d2333')));
      box(lift, [0.2, 3.2, 0.2], [-0.6, 1.6, 0.7], solid('#2b3140')); box(lift, [0.2, 3.2, 0.2], [0.6, 1.6, 0.7], solid('#2b3140'));
      const forks = group(lift, [0, 0.3, 0.9]);
      [-0.45, 0.45].forEach((x) => box(forks, [0.2, 0.08, 1.6], [x, 0, 0.8], solid('#5a606c')));
      const ton = box(forks, [2.6, 2.4, 2.4], [0, 1.25, 1.0], faces(paperMat, { front: coverTex('1000p'), top: coverTex('全部入り') }));
      const driver = addChar(lift, CAST.M3, [0, 1.3, -0.9]);
      const page1 = group(BOSS.armR, [0, -0.66, 0.2]);
      box(page1, [0.7, 0.46, 0.02], [0, 0, 0], faces(solid('#ffffff'), { front: P.glow(textTex('結論：OK', { w: 256, h: 128, size: 52, bg: '#ffffff', fg: '#d24b4b' })) }));
      page1.rotation.x = 1.4;
      const crack = P.crackDecal(S, 1.0, 0, -1.6, 0.4); crack.scale.setScalar(3.2);
      const dust = P.dustPuff(S, 14, 27);
      const update = (lt, t) => {
        const smash = t >= DROP;
        tbl.scale.y = smash ? 1 - 0.85 * ease.out(prog(t, DROP, DROP + 0.12)) : 1;
        crack.visible = smash;
        dust.update(t, DROP, [1.0, 0, -1.6], 0.9);
        reset(A);
        doc1.visible = t < 4.5;
        doc50.visible = t >= 4.5 && t < 9.5;
        cart.visible = t >= 9.5 && t < 15;
        lift.visible = t >= 15 && t < 25.5;
        page1.visible = t >= 20.5;
        if (t < 4.5) {
          const u = prog(t, 0.4, 3.6);
          A.root.position.set(lerp(-6.0, -1.6, u), 0, -1.0); A.root.rotation.y = Math.PI / 2;
          if (u > 0 && u < 1) walk(A, t * 14, 0.6);
          A.armR.rotation.x = -1.3; A.setFace('happy');
        } else if (t < 9.5) {
          const u = prog(t, 5.0, 9.2);
          A.root.position.set(lerp(-6.0, -1.6, u), 0, -1.0); A.root.rotation.y = Math.PI / 2;
          walk(A, t * 7, 0.35); A.root.rotation.z = Math.sin(t * 7) * 0.12; A.body.rotation.x = -0.2;
          A.armL.rotation.x = A.armR.rotation.x = -1.5; A.setFace('shock');
          A.root.updateMatrixWorld(true);
          doc50.position.copy(A.root.localToWorld(V3(0, 1.05, 0.55))); doc50.rotation.y = A.root.rotation.y;
        } else if (t < 15) {
          const u = prog(t, 9.8, 14.6);
          const x = lerp(-6.6, -2.2, u);
          A.root.position.set(x - 1.0, 0, -0.6); A.root.rotation.y = Math.PI / 2; walk(A, t * 8, 0.45);
          A.body.rotation.x = 0.35; A.armL.rotation.x = A.armR.rotation.x = -1.4; A.setFace('sleepy');
          cart.position.set(x + 0.2, 0, -0.6);
        } else if (t < 20.5) {
          A.root.position.set(-2.6, 0, 0.4); A.root.rotation.y = 0.6; A.setFace('shock');
        } else {
          A.root.position.set(1.2, 0, 1.0); A.root.rotation.y = 1.4; A.setFace(t > 23.8 ? 'normal' : 'normal');
          if (t > 23.0 && t < 25.5) { A.armR.rotation.x = -1.6; A.armR.rotation.z = -0.2; }
          if (t >= 25.5) { A.setFace('sleepy'); A.head.rotation.x = 0.3; }
        }
        const lu = prog(t, 15.2, 17.6);
        lift.position.set(lerp(-9.0, -1.4, lu), 0, -1.6); lift.rotation.y = Math.PI / 2;
        forks.position.y = 0.3 + (t > 17.8 && t < DROP ? 0.6 * Math.sin(prog(t, 17.8, DROP) * Math.PI) : 0);
        ton.visible = t < DROP;
        reset(driver); sit(driver); driver.setFace('happy');
        [M1, BOSS, M2].forEach((c, i) => {
          reset(c); sit(c); c.armL.rotation.x = c.armR.rotation.x = -1.0;
          if (t >= 15 && t < 20.5) { c.setFace('shock'); if (t > DROP) c.root.position.y += bump(t, [DROP], 0.3); }
          if (i === 1 && t >= 4.5 && t < 15) { c.armR.rotation.x = -2.0; c.setFace('happy'); }
          if (i === 1 && t >= 20.5) { reset(c); c.root.position.set(3.2, 0, 0.2); c.root.rotation.y = -0.7; c.armR.rotation.x = -1.4; c.head.rotation.x = 0.3; c.setFace(t > 24.0 ? 'happy' : 'normal'); }
          if (i !== 1 && t >= 25.5) c.setFace('sleepy');
        });
      };
      const bigBlock = box(S, [2.6, 2.4, 2.4], [1.0, 1.35, -1.8], faces(paperMat, { front: coverTex('1000p'), top: coverTex('全部入り') }));
      const upd = (lt, t) => { update(lt, t); bigBlock.visible = t >= DROP; bigBlock.position.y = 0.15 + 1.2 + (t < DROP + 0.12 ? 0.6 * (1 - prog(t, DROP, DROP + 0.12)) : 0); };
      const cams = [
        [0, 4.5, camPath([1.6, 3.0, 5.6], [1.2, 2.8, 4.8], [-3.0, 1.0, -1.4], [-2.2, 1.0, -1.4], 42, 4.5)],
        [4.5, 9.5, camPath([0.8, 2.6, 4.8], [0.4, 2.4, 4.2], [-4.4, 1.2, -1.2], [-2.6, 1.2, -1.2], 42, 5)],
        [9.5, 15, camPath([1.0, 3.0, 5.4], [0.8, 2.8, 4.8], [-5.0, 1.0, -0.8], [-2.8, 1.0, -0.8], 42, 5.5)],
        [15, 20.5, camPath([4.4, 4.6, 8.6], [4.0, 4.2, 8.0], [-1.6, 1.4, -1.6], [-0.4, 1.2, -1.8], 44, 5.5)],
        [20.5, 25.5, camPath([5.6, 2.8, 5.6], [5.2, 2.6, 5.0], [2.2, 1.2, 0.2], [2.4, 1.2, 0.2], 42, 5)],
        [25.5, 30.01, camPath([4.8, 4.4, 7.6], [4.2, 4.0, 7.0], [0.4, 1.2, -2.0], [0.4, 1.2, -2.0], 44, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'room', start: a, end: b, scene: S, update: upd, cam: (lt) => cam(lt), shake: (lt) => impact(lt + a, [DROP], 0.2, 6) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしも会議資料が、ページ数だけ重くなったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、1ページ＝1キロ', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '会議資料の重さ', value: pages, format: (n) => (n >= 1000 ? '1トン' : `${n}キロ`), done: (t) => t >= 15 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '部長の「もっと詳しく」で、', at: 4.65, cps: 18 },
        { text: '50ページ', at: 5.6, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 1.8, t1: 4.2, text: 'もっと詳しく', scene: 'room', anchor: headTop(BOSS) },
      { type: 'fx', t0: 6.0, t1: 9.0, text: 'ヨロヨロ', x: 540, y: 300, rot: -6, size: 46, shake: true },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '200ページは、', at: 9.65, cps: 16 },
        { text: '台車で運ぶ', at: 10.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 11.6, t1: 14.6, text: 'これ、全部入れといて', scene: 'room', anchor: headTop(BOSS) },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '「全部入れて」の資料は、', at: 15.15, cps: 18 },
        { text: 'フォークリフトで', at: 15.9, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: DROP, t1: DROP + 1.0, text: 'ドゴォン', x: 660, y: 200, rot: -5, size: 66, shake: true },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '会議では、', at: 20.65, cps: 16 },
        { text: '1ページ目しか見ない', at: 21.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 22.2, t1: 23.6, text: 'で、結論は？', scene: 'room', anchor: headTop(BOSS) },
      { type: 'bubble', t0: 23.8, t1: 25.4, text: '1ページ目です', scene: 'room', anchor: headTop(A) },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも結論は、1ページ目に書いてある。', at: 25.75, cps: 18, cls: 'mark-soft small' },
        { text: '資料が重い会社', at: 27.6, cps: 20, cls: 'sub' },
      ] },
      { type: 'bubble', t0: 26.4, t1: 28.4, text: 'うん、いいね', scene: 'room', anchor: headTop(BOSS) },
      { type: 'badge', t0: 28.5, t1: 30.1, text: 'もしもブロック劇場 #27　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const engine = (t, d) => [AUDIO.noise(t, d, { filter: 'lowpass', freq: 260, gain: 0.08, am: 18, amDepth: 0.05, long: true, fade: 0.3 })];
    const audio = AUDIO.music({ prog: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'F', 'G', 'Am', 'Em', 'F', 'G', 'F', 'C'], arp: [8, 9] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    for (let t = 5.0; t < 9.2; t += 0.45) add(S_.stomp(t));
    for (let t = 9.8; t < 14.6; t += 0.2) add(S_.tick(t, 0));
    add(engine(15.2, 3.4)); add(S_.beep(17.8)); add(S_.beep(18.1));
    add(S_.smash(DROP)); add(S_.dust(DROP + 0.05));
    add(S_.pop(24.0, 2));
    add(S_.pop(28.5, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
