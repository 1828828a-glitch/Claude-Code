/* ep07 — もしもオフィスの床が、全部トランポリンだったら（30秒） */
EPISODES.push({
  id: 'ep07',
  no: 7,
  short: 'トランポリンの床',
  title: 'もしもオフィスの床が、全部トランポリンだったら',
  lead: '歩けば跳ね、座っていても上下する。部長が着地すれば全員が宙を舞い、帰りは窓からひと跳び。何もかも上がる会社の30秒です。',
  duration: 30,
  poster: 12.0,
  chapters: [
    { t: 0, name: '出社' }, { t: 4.5, name: '仕事中' }, { t: 9.5, name: '部長の着地' },
    { t: 15, name: '会議' }, { t: 20.5, name: '帰り道' }, { t: 25.5, name: '給料日' },
  ],
  build() {
    const scenes = [], CUTS = [4.5, 9.5, 15, 20.5, 25.5];
    const hop = (t, period, h, ph = 0) => h * Math.abs(Math.sin(Math.PI * (t / period + ph)));
    const LAND = [11.6, 13.2];
    const launch = (t) => {
      const a = prog(t, LAND[0], LAND[0] + 1.1), b = prog(t, LAND[1], LAND[1] + 0.9);
      return (a > 0 && a < 1 ? Math.sin(a * Math.PI) * 3.2 : 0) + (b > 0 && b < 1 ? Math.sin(b * Math.PI) * 2.0 : 0);
    };
    const jumps = (t) => {
      const seg = [[0.6, 1 / 0.6], [4.5, 12], [9.5, 14], [15, 16], [20.5, 600]];
      let n = 0;
      seg.forEach(([s, rate], i) => { const e = seg[i + 1] ? seg[i + 1][0] : 25.5; if (t > s) n += (Math.min(t, e) - s) * rate; });
      return Math.floor(n);
    };

    /* ===== オフィス ===== */
    let A, BOSS, staff, slip;
    {
      const S = newScene({ sky: SKY_DAY });
      P.officeRoom(S, { floor: 'tramp', doors: [-5], windows: [[-2, 2], [-1, 2], [-2, 3], [-1, 3], [3, 2], [4, 2], [3, 3], [4, 3]] });
      box(S, [1, 2, 0.2], [-4.5, 1, -7.2], solid('#2b3140'), { cast: false });
      box(S, [20.2, 0.3, 0.3], [-0.5, 0.15, 3.85], solid('#d24b4b'), { cast: false });
      box(S, [0.3, 0.3, 10.2], [-10.15, 0.15, -1.0], solid('#d24b4b'), { cast: false });
      const board = canvasTex(256, 128, (g) => {
        g.fillStyle = '#fbfcfd'; g.fillRect(0, 0, 256, 128);
        g.strokeStyle = '#9aa3ad'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 122);
        g.fillStyle = '#1d2333'; g.font = `28px ${PIXEL_FONT}`; g.textBaseline = 'top'; g.fillText('今期の売上', 16, 12);
      }, true);
      box(S, [3.6, 2.0, 0.08], [-6.4, 2.4, -5.92], faces(solid('#9aa3ad'), { front: P.glow(board) }));
      const bars = [0, 1, 2].map((i) => box(S, [0.6, 1, 0.3], [-7.4 + i * 1.0, 0, -5.6], solid(['#2f62d6', '#f2c230', '#d24b4b'][i])));
      const seats = [[-1.5, -2.6, CAST.A], [2.0, -2.6, CAST.M1], [5.5, -2.6, CAST.M2], [0.2, 0.6, CAST.M3], [3.8, 0.6, CAST.NEW]];
      const rigs = seats.map(([x, z, look]) => { const g = group(S); return { g, c: workstation(g, x, z, look), x, z }; });
      staff = rigs.map((r) => r.c);
      A = staff[0];
      BOSS = addChar(S, CAST.BOSS, [9.5, 0, 2.2], -Math.PI / 2);
      slip = group(A.armR, [0.2, -0.66, 0.16]);
      box(slip, [0.9, 0.6, 0.02], [0, 0, 0], faces(solid('#ffffff'), { front: P.glow(textTex('給料明細　前年比 ±0円', { w: 512, h: 128, size: 40, bg: '#ffffff', fg: '#1d2333' })) }));
      const update = (lt, t) => {
        const L = launch(t);
        rigs.forEach((r, i) => {
          const c = r.c;
          reset(c);
          r.g.position.y = t >= 4.5 ? hop(t, 0.5, 0.18, i * 0.37) : 0;
          if (i === 0 && t < 4.5) {
            r.g.position.y = 0;
            const pts = [[-4.5, -6.6], [-4.5, -4.2], [-1.5, -4.2], [-1.5, -3.55]];
            const u = prog(t, 0.4, 4.2);
            let k = u * 3, seg = Math.min(2, Math.floor(k)), f = k - seg;
            const p = [lerp(pts[seg][0], pts[seg + 1][0], f), lerp(pts[seg][1], pts[seg + 1][1], f)];
            c.root.position.set(p[0], hop(t, 0.6, 1.1), p[1]);
            c.root.rotation.y = seg === 1 ? Math.PI / 2 : 0;
            banzai(c, 0.35, Math.sin(t * 10) * 0.1);
            c.setFace('happy');
            return;
          }
          if (t >= 15 && t < 25.5 && i === 0) {
            c.root.position.set(-5.2, hop(t, 0.55, 0.7), -4.2);
            c.root.rotation.y = 0.25;
            c.armR.rotation.x = -2.4 + Math.sin(t * 6) * 0.3; c.setFace('happy');
            return;
          }
          sit(c);
          c.root.position.y += hop(t, 0.5, 0.12, i * 0.2) + L;
          if (L > 0.05) { c.setFace('shock'); banzai(c, 0.8, Math.sin(t * 14 + i) * 0.2); c.root.rotation.z = Math.sin(t * 5 + i) * 0.3; return; }
          if (t >= 15 && t < 20.5) { c.head.rotation.y = 0.9; c.armL.rotation.x = c.armR.rotation.x = -1.3 + Math.sin(t * 18 + i) * 0.25; c.armL.rotation.z = 0.3; c.armR.rotation.z = -0.3; c.setFace('happy'); return; }
          typing(c, t + i, 16, 0.12);
          if (i === 0 && t >= 25.5) { c.armL.rotation.x = -1.4; c.armR.rotation.x = -1.4; c.armR.rotation.z = -0.25; c.setFace('sleepy'); c.head.rotation.x = 0.35; }
        });
        slip.visible = t >= 25.5;
        slip.rotation.set(1.4, 0, 0);
        bars.forEach((b, i) => {
          const h = (t >= 15 ? lerp(0.3, 1.0 + i * 0.9, ease.back(prog(t, 15.6 + i * 0.3, 16.2 + i * 0.3))) : 0.3) + (t >= 15 ? hop(t, 0.5, 0.15, i * 0.3) : 0);
          b.scale.y = h; b.position.y = h / 2 + 0.3;
        });
        reset(BOSS);
        BOSS.root.visible = t >= 9.5 && t < 20.5;
        const w = prog(t, 9.7, 10.4);
        BOSS.root.position.set(lerp(9.5, 6.6, w), 0, 2.2);
        if (w > 0 && w < 1) { walk(BOSS, t * 12, 0.45); BOSS.root.position.y = hop(t, 0.5, 0.4); }
        else if (t >= 10.4 && t < 15) {
          BOSS.root.rotation.y = -0.6;
          const j1 = prog(t, 10.8, LAND[0]), j2 = prog(t, 12.4, LAND[1]);
          let y = 0;
          if (j1 > 0 && j1 < 1) y = Math.sin(j1 * Math.PI) * 3.6;
          if (j2 > 0 && j2 < 1) y = Math.sin(j2 * Math.PI) * 2.6;
          BOSS.root.position.y = y;
          if (y > 0.05) banzai(BOSS, 0.5); else BOSS.root.scale.set(1.08 * (1 + bump(t, LAND, 0.25)), 1.08 * (1 - bump(t, LAND, 0.3)), 1.08);
          BOSS.setFace('happy');
        } else if (t >= 15) {
          BOSS.root.position.set(7.4, hop(t, 0.6, 0.5), 0.6); BOSS.root.rotation.y = -1.0;
          BOSS.armL.rotation.x = BOSS.armR.rotation.x = -1.2 + Math.sin(t * 18) * 0.3;
        }
      };
      const cams = [
        [0, 4.5, camPath([2.6, 5.0, 7.6], [2.0, 4.6, 6.8], [-3.0, 1.4, -3.6], [-2.6, 1.3, -3.4], 40, 4.5)],
        [4.5, 9.5, camPath([6.6, 5.6, 11.4], [6.0, 5.2, 10.6], [1.6, 1.2, -1.6], [1.8, 1.2, -1.6], 40, 5)],
        [9.5, 15, camPath([8.6, 5.4, 13.0], [8.0, 5.2, 12.4], [2.6, 2.2, -1.0], [2.6, 2.4, -1.0], 42, 5.5)],
        [15, 20.5, camPath([-2.6, 3.9, 5.2], [-3.0, 3.7, 4.4], [-5.4, 1.8, -4.2], [-5.4, 1.9, -4.2], 40, 5.5)],
        [25.5, 30.01, camPath([-0.2, 3.1, 0.6], [-0.5, 2.9, -0.1], [-1.5, 1.4, -3.6], [-1.5, 1.5, -3.6], 42, 4.5)],
      ];
      cams.forEach(([a, b, cam]) => scenes.push({ id: 'office', start: a, end: b, scene: S, update, cam: (lt) => cam(lt), shake: (lt) => impact(lt + a, LAND, 0.14, 7) }));
    }

    /* ===== 帰り道：窓からひと跳び（20.5〜25.5秒） ===== */
    let fliers;
    {
      const S = newScene({ sky: ['#ffae7a', '#ffe2b8'], sunColor: '#ffd8b0', sunI: 0.55, amb: 0.72 });
      streetSet(S, { windows: [[-7, 4], [1, 4], [7, 4]], sign: 'ブロック町IT' });
      const looks = [CAST.M1, CAST.M2, CAST.A, CAST.M3, CAST.NEW, CAST.BOSS, CAST.M1, CAST.A];
      const wins = [-6, 2, 8];
      fliers = looks.map((look, i) => ({ c: addChar(S, look, [0, -99, 0]), t0: 21.0 + i * 0.45, x0: wins[i % 3], vx: 2.2 + (i % 3) * 0.6, vy: 6.5 + (i % 2) * 1.2, vz: 2.4 }));
      scenes.push({
        id: 'street', start: 20.5, end: 25.5, scene: S,
        cam: camPath([4.6, 4.4, 15.0], [4.0, 4.8, 14.0], [1.0, 4.6, -2.0], [1.4, 5.0, -2.0], 42, 5),
        update(lt, t) {
          fliers.forEach((f, i) => {
            const c = f.c, d = t - f.t0;
            reset(c);
            c.root.visible = d >= 0;
            if (!c.root.visible) return;
            c.root.position.set(f.x0 + f.vx * d, 4.2 + f.vy * d - 0.5 * 9 * d * d, -4.4 + f.vz * d);
            c.root.rotation.set(-0.3 + d * 0.8, -0.4, Math.sin(d * 3 + i) * 0.3);
            banzai(c, 0.9, Math.sin(t * 12 + i) * 0.15);
            c.setFace('happy');
          });
        },
      });
    }

    const overlay = [
      { type: 'caption', t0: 0, t1: CUTS[0], lines: [
        { text: 'もしもオフィスの床が、全部トランポリンだったら', cls: 'title small' },
        { text: 'ブロック町のIT企業、月曜の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'counter', t0: 0.9, t1: CUTS[4], label: '社内のジャンプ回数', value: jumps, format: (n) => `${n.toLocaleString('ja-JP')}回`, done: (t) => t >= 24 },
      { type: 'fx', t0: 0.9, t1: 1.8, text: 'ボヨン', scene: 'office', anchor: feet(A, 0.2), x: 120, y: 0, rot: 7, size: 46 },
      { type: 'fx', t0: 2.4, t1: 3.3, text: 'ボヨヨン', scene: 'office', anchor: feet(A, 0.2), x: -130, y: 10, rot: -7, size: 46 },
      { type: 'caption', t0: CUTS[0], t1: CUTS[1], lines: [
        { text: '仕事中も、', at: 4.65, cps: 16 },
        { text: 'ずっと上下する', at: 5.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'caption', t0: CUTS[1], t1: CUTS[2], lines: [
        { text: '部長が着地すると、', at: 9.65, cps: 18 },
        { text: '全員が飛ぶ', at: LAND[0] + 0.1, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: LAND[0], t1: LAND[0] + 0.9, text: 'ドッボーン', x: 940, y: 520, rot: 6, size: 60, shake: true },
      { type: 'caption', t0: CUTS[2], t1: CUTS[3], lines: [
        { text: 'おかげで社内は、', at: 15.15, cps: 18 },
        { text: '何もかも上がる', at: 16.0, cps: 16, cls: 'mark' },
      ] },
      { type: 'bubble', t0: 16.6, t1: 19.0, text: '売上も、テンションも、\n上がってます！', scene: 'office', anchor: headTop(A, 1.0) },
      { type: 'tag', t0: 19.0, t1: CUTS[3], text: '売上 前年比 +120%' },
      { type: 'caption', t0: CUTS[3], t1: CUTS[4], lines: [
        { text: '帰りは、', at: 20.65, cps: 16 },
        { text: '窓からひと跳び', at: 21.3, cps: 16, cls: 'mark' },
      ] },
      { type: 'fx', t0: 21.2, t1: 24.6, text: 'ボヨーン', x: 900, y: 260, rot: -6, size: 56, shake: true },
      { type: 'caption', t0: CUTS[4], t1: 30.1, lines: [
        { text: 'それでも給料だけは、上がらない。', at: 25.75, cps: 14, cls: 'mark-soft' },
        { text: '床がトランポリンの会社', at: 27.4, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #07　おわり' },
    ];

    const S_ = AUDIO.SFX;
    const boing = (t, k = 1) => [AUDIO.tone(t, 170, 0.22, { type: 'triangle', f2: 520, gain: 0.1 * k }), AUDIO.tone(t + 0.12, 520, 0.18, { type: 'sine', f2: 300, gain: 0.05 * k })];
    const audio = AUDIO.music({ prog: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'F', 'C'], arp: [8, 9] });
    const add = (list) => audio.push(...list);
    cutSounds(add, CUTS);
    talkSounds(add, overlay);
    for (let t = 0.6; t < 4.4; t += 0.6) add(boing(t));
    for (let t = 4.75; t < 9.5; t += 0.5) add(boing(t, 0.4));
    LAND.forEach((t, i) => { add(S_.stomp(t)); add(boing(t, 1.6 - i * 0.4)); add(S_.cheer(t + 0.2)); });
    add(S_.cheer(16.4));
    for (let i = 0; i < 8; i++) add(boing(21.0 + i * 0.45, 0.8));
    for (let t = 25.75; t < 29.5; t += 0.5) add(boing(t, 0.3));
    add(S_.pop(28.3, 3));
    return { scenes, overlay, audio, cuts: CUTS };
  },
});
