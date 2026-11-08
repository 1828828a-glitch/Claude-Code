/* ep29 — もしもホワイトボードに書いた目標が、そのまま本当になったら（30秒） */
EPISODES.push({
  id: 'ep29',
  no: 29,
  short: '本当になる目標',
  title: 'もしもホワイトボードに書いた目標が、そのまま本当になったら',
  lead: '「売上を伸ばす」でグラフが天井をこえ、「風通しのいい職場」で強風、「全員一丸」で本当に丸くなり、「顧客を囲い込む」で柵ができる。でも、ひとつだけ本当にならない目標があった。',
  duration: 30,
  poster: 12.6,
  chapters: [
    { t: 0, name: '売上を伸ばす' }, { t: 4.5, name: '風通し' }, { t: 9.5, name: '全員一丸' },
    { t: 15, name: '囲い込む' }, { t: 20.5, name: '残業ゼロ' }, { t: 25.5, name: '実現しない' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const GOALS = [['売上を伸ばす', 2.0], ['風通しのいい職場', 5.4], ['全員一丸となる', 10.4], ['顧客を囲い込む', 15.8], ['残業ゼロ', 21.4]];
    const achieved = (t) => GOALS.slice(0, 4).filter(([, at]) => t >= at + 0.4).length;
    const boardTex = (txt) => P.glow(textTex(txt, { w: 512, h: 256, size: Math.min(64, Math.floor(460 / Array.from(txt).length)), bg: '#fbfcfd', fg: '#2f62d6' }));
    const DAY = SKY_DAY, NIGHT = ['#121a3a', '#36406e'];

    let BOSS, staff, client;
    {
      const S = newScene({ sky: DAY });
      const winMat = blockMat('window').clone();
      P.officeRoom(S, { overrides: { window: winMat } });
      const { dir, hemi } = S.userData;
      const boardFace = faces(solid('#9aa3ad'), {});
      box(S, [4.2, 2.0, 0.08], [-4.0, 2.4, -5.92], boardFace);
      const boards = GOALS.map(([g]) => boardTex(g));
      const blank = P.glow(textTex('', { w: 64, h: 32, bg: '#fbfcfd' }));
      const clock = P.wallClock(S, [2.2, 3.4, -5.9], 0.9);
      const seats = [[-1.0, -2.0, CAST.A], [2.6, -2.0, CAST.M1], [6.0, -2.0, CAST.M2], [1.0, 1.4, CAST.M3]];
      const rigs = seats.map(([x, z, look]) => { const g = group(S); return { g, c: workstation(g, x, z, look), x, z }; });
      staff = rigs.map((r) => r.c);
      BOSS = addChar(S, CAST.BOSS, [-2.4, 0, -4.6], 0.4);
      const pen = group(BOSS.armR, [0, -0.66, 0.1]); box(pen, [0.06, 0.06, 0.3], [0, 0, 0.1], solid('#2f62d6'));
      const bars = [0, 1, 2].map((i) => box(S, [0.9, 1, 0.9], [-5.4 + i * 1.3, 0, -4.4], solid(['#2f62d6', '#f2c230', '#d24b4b'][i])));
      const r = mulberry32(2929);
      const papers = Array.from({ length: 30 }, () => ({ m: box(S, [0.4, 0.02, 0.5], [0, -99, 0], solid('#ffffff'), { cast: false }), y: 0.8 + r() * 3, z: -5 + r() * 8, ph: r() * 10, sp: 4 + r() * 4 }));
      const ballG = group(S);
      client = addChar(S, { suit: '#d9d9d9', tie: '#3f9b4b', hair: '#6b4a2b', glasses: true }, [5.4, 0, 1.6], -0.6);
      const fence = group(S, [5.4, 0, 1.6]);
      const fencePosts = [];
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; fencePosts.push(box(fence, [0.16, 1.4, 0.16], [Math.cos(a) * 1.1, 0.7, Math.sin(a) * 1.1], solid('#a8794a'))); }
      for (let k = 0; k < 2; k++) for (let i = 0; i < 12; i++) { const a = ((i + 0.5) / 12) * Math.PI * 2; fencePosts.push(box(fence, [0.6, 0.1, 0.08], [Math.cos(a) * 1.1, 0.5 + k * 0.6, Math.sin(a) * 1.1], solid('#c49a5a'), { rot: [0, -a + Math.PI / 2, 0] })); }
      const update = (lt, t) => {
        let g = -1; GOALS.forEach(([, at], i) => { if (t >= at - 0.8) g = i; });
        boardFace[4] = g < 0 ? blank : boards[g];
        const night = t >= 20.5 ? 1 : 0;
        repaintGradient(S.background, mixHex(DAY[0], NIGHT[0], night), mixHex(DAY[1], NIGHT[1], night));
        winMat.color.set(night ? '#3a4570' : '#ffffff'); hemi.intensity = night ? 0.45 : 0.72; dir.intensity = night ? 0.2 : 0.55;
        clock.set(t < 20.5 ? 10 + t * 0.2 : 22);
        bars.forEach((b, i) => { const h = t >= GOALS[0][1] ? lerp(0.4, 3 + i * 2.6, ease.back(prog(t, GOALS[0][1] + i * 0.2, GOALS[0][1] + 1.2 + i * 0.2))) : 0.4; b.scale.y = h; b.position.y = h / 2; b.visible = t < 20.5; });
        const wind = t >= GOALS[1][1] && t < 9.5 ? 1 : 0;
        papers.forEach((p, i) => { p.m.visible = !!wind; if (!wind) return; const x = -9 + ((t * p.sp + p.ph) % 18); p.m.position.set(x, p.y + Math.sin(t * 6 + i) * 0.3, p.z); p.m.rotation.set(t * 5 + i, t * 3, t * 4); });
        const ball = t >= GOALS[2][1] && t < 15;
        const bu = prog(t, GOALS[2][1], GOALS[2][1] + 0.5), roll = Math.max(0, t - GOALS[2][1] - 0.6);
        ballG.position.set(-1.0 + roll * 1.2, 1.1, -0.2); ballG.rotation.z = -roll * 1.4;
        rigs.forEach((rg, i) => {
          const c = rg.c;
          reset(c);
          if (ball) {
            if (c.root.parent !== ballG) ballG.attach(c.root);
            const a = (i / 4) * Math.PI * 2;
            c.root.position.set(Math.cos(a) * 0.95 * bu + (1 - bu) * (rg.x - ballG.position.x), Math.sin(a) * 0.95 * bu - 0.8 * (1 - bu), (i % 2 ? 0.2 : -0.2) * bu);
            c.root.rotation.set(0, 0, (a + Math.PI / 2) * bu);
            sit(c); c.legL.rotation.x = c.legR.rotation.x = -2.2; banzai(c, 0.3); c.setFace('shock');
            return;
          }
          if (c.root.parent !== rg.g) rg.g.attach(c.root);
          reset(c); sit(c); typing(c, t + i, 14, 0.1);
          if (wind) { c.root.rotation.z = -0.25; c.head.rotation.z = -0.2; c.setFace('shock'); c.armL.rotation.z = -0.8; }
          if (t >= 15 && t < 20.5) c.setFace('happy');
          if (t >= 20.5) { c.setFace('sleepy'); c.head.rotation.x = 0.3; }
        });
        reset(client);
        client.root.visible = t >= 15 && t < 20.5;
        fence.visible = t >= GOALS[3][1] && t < 20.5;
        fencePosts.forEach((m, i) => { m.scale.y = Math.max(0.01, ease.back(prog(t, GOALS[3][1] + i * 0.02, GOALS[3][1] + 0.4 + i * 0.02))); });
        if (t >= GOALS[3][1]) { client.setFace('shock'); banzai(client, 0.5, Math.sin(t * 10) * 0.2); }
        reset(BOSS);
        const writing = GOALS.some(([, at]) => t >= at - 0.8 && t < at);
        BOSS.armR.rotation.x = writing ? -1.6 + Math.sin(t * 20) * 0.15 : -0.3;
        BOSS.root.rotation.y = writing ? Math.PI : 0.4;
        BOSS.setFace(t >= 20.5 ? 'normal' : 'happy');
        if (wind) { BOSS.root.rotation.z = -0.25; }
        if (t >= 25.5) { BOSS.root.rotation.y = 0.4; BOSS.setFace('happy'); }
      };
      const cams = [
        [0, 4.5, camPath([2.4, 4.8, 8.6], [1.8, 5.6, 8.2], [-3.4, 2.0, -4.0], [-3.6, 3.2, -4.2], 44, 4.5)],
        [4.5, 9.5, camPath([4.6, 4.4, 9.6], [4.0, 4.0, 8.8], [0, 1.6, -2.0], [0, 1.6, -2.0], 44, 5)],
        [9.5, 15, camPath([3.6, 3.8, 9.0], [4.4, 3.6, 8.6], [-0.6, 1.2, -1.0], [2.6, 1.2, -0.6], 44, 5.5)],
        [15, 20.5, camPath([8.6, 3.6, 7.6], [8.0, 3.4, 7.0], [4.6, 1.0, 1.0], [4.8, 1.0, 1.0], 42, 5.5)],
        [20.5, 25.5, camPath([2.4, 4.0, 7.6], [1.8, 3.6, 6.8], [-2.8, 2.0, -3.8], [-3.2, 2.2, -4.2], 44, 5)],
        [25.5, 30.01, camPath([4.6, 4.6, 9.6], [4.0, 4.2, 8.8], [-0.6, 1.6, -2.4], [-0.6, 1.6, -2.4], 44, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt), shake: (lt) => (lt + a >= 5.4 && lt + a < 9.5 ? 0.03 : 0) }));
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもホワイトボードに書いた目標が、そのまま本当になったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、期初の会議', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 1.0, t1: 30.1, label: '本当になった目標', value: achieved, format: (n) => `${n}個`, done: (t) => t >= 16.2 && t < 20.5 },
      { type: 'fx', t0: GOALS[0][1] + 0.2, t1: GOALS[0][1] + 1.4, text: 'ニョキニョキ', x: 760, y: 220, rot: 6, size: 50 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '「風通しのいい職場」と書けば、', at: 4.65, cps: 20 },
        { text: '強風', at: GOALS[1][1] + 0.2, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: GOALS[1][1] + 0.2, t1: 9.3, text: 'ビュオオオ', x: 880, y: 260, rot: -6, size: 52, shake: true },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '「全員一丸」と書けば、', at: 9.65, cps: 18 },
        { text: '本当に丸くなる', at: GOALS[2][1] + 0.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: GOALS[2][1] + 1.0, t1: 14.6, text: 'ゴロゴロ', x: 860, y: 300, rot: 6, size: 50 },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: '「顧客を囲い込む」と書けば、', at: 15.15, cps: 20 },
        { text: '柵ができる', at: GOALS[3][1] + 0.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: GOALS[3][1] + 0.6, t1: 19.6, text: '出られないんですが…', scene: 'office', anchor: headTop(client) },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '22時、「残業ゼロ」と書いても、', at: 21.6, cps: 20 },
        { text: '何も起きない', at: 23.4, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 23.0, t1: 25.2, text: 'シーン…', x: 760, y: 300, rot: -4, size: 52 },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも「残業ゼロ」だけは、本当にならない。', at: 25.75, cps: 18, cls: 'mark-soft small' },
        { text: '目標が本当になる会社', at: 27.8, cps: 20, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.5, t1: 30.1, text: 'もしもブロック劇場 #29　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const marker = (t) => [AUDIO.noise(t, 0.6, { filter: 'bandpass', freq: 3000, q: 3, gain: 0.03, am: 12, amDepth: 0.02 })];
    const audio = AUDIO.music({ prog: ['C', 'G', 'F', 'C', 'Am', 'G', 'F', 'G', 'C', 'Em', 'Am', 'G', 'F', 'F', 'F', 'C'], arp: [2, 3, 6, 7] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    GOALS.forEach(([, at]) => add(marker(at - 0.8)));
    add(S_.grow(GOALS[0][1] + 0.2));
    add([AUDIO.noise(GOALS[1][1], 3.9, { filter: 'bandpass', freq: 700, q: 0.7, gain: 0.08, am: 0.8, amDepth: 0.04, long: true, fade: 0.4 })]);
    add(S_.squash(GOALS[2][1] + 0.3)); for (let t = GOALS[2][1] + 1.0; t < 14.6; t += 0.4) add(S_.step(t));
    for (let i = 0; i < 6; i++) add(S_.pop(GOALS[3][1] + i * 0.06, i));
    add(S_.tick(23.4, 0)); add(S_.tick(24.4, 1));
    add(S_.pop(28.5, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
