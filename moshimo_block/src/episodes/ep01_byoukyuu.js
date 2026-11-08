/* ep01 — もしも社員Aだけ、秒給1万円だったら（30秒） */
EPISODES.push({
  id: 'ep01',
  no: 1,
  short: '秒給1万円の社員A',
  title: 'もしも社員Aだけ、秒給1万円だったら',
  credit: {
    text: '着想元は、はんぺんさん（@hanpen_VR）の動画「もしも社員Aだけ、秒給1万円だったら」。ブロックの世界に描き直したファン版です。',
    href: 'https://x.com/hanpen_VR/status/2117994859495936197',
    label: '元の動画を見る',
  },
  lead: '出社した瞬間から1秒ごとに1万円。会議は3秒、PCは100台、帰りはヘリ。ブロックの街のIT企業で、社員Aの1日を30秒で追います。',
  duration: 30,
  poster: 2.8,
  chapters: [
    { t: 0, name: '朝のオフィス' }, { t: 4, name: '出社' }, { t: 8.5, name: '定例会議' },
    { t: 13, name: 'PCトラブル' }, { t: 19, name: '定時' }, { t: 25.4, name: '有給' },
  ],
  build() {
    const A_LOOK = { suit: '#2f62d6', tie: '#f2c230', hair: '#2a211b' };
    const MATES = [
      { suit: '#6f7782', tie: '#d24b4b', hair: '#4a3426', glasses: true },
      { suit: '#4c5560', tie: '#2fa59b', hair: '#1f1a17', long: true, shirt: '#f4f0e6' },
      { suit: '#8a8f98', tie: '#6a5acd', hair: '#5b3b25' },
    ];
    const V3 = (x, y, z) => new T.Vector3(x, y, z);
    const headTop = (c, dy = 0.95) => () => c.head.localToWorld(V3(0, dy, 0));
    const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    const cam = (p0, p1, q0, q1, fov, d) => (lt) => {
      const u = ease.inOut(prog(lt, 0, d));
      return { pos: lerp3(p0, p1, u), target: lerp3(q0, q1, u), fov };
    };
    const OVERTIME = [19.3, 21.6], WAGE = 10000, START = 5.0;
    const FINAL = 8 * 3600 * WAGE; // 9時〜18時、休憩1時間を除く8時間
    const wageAt = (t) => {
      if (t < START) return 0;
      const v0 = (OVERTIME[0] - START) * WAGE;
      if (t < OVERTIME[0]) return (t - START) * WAGE;
      const u = ease.inOut(prog(t, OVERTIME[0], OVERTIME[1]));
      return v0 * Math.pow(FINAL / v0, u);
    };
    const scenes = [];

    /* ===== 1. 朝のオフィス（0〜4秒） ===== */
    {
      const S = newScene({ sky: ['#9fd3ef', '#e8f5fb'] });
      P.officeRoom(S);
      [-4, 0, 4].forEach((x) => { P.desk(S, x, -2.5); P.chair(S, x, -3.45); });
      P.laptop(S, -4, 0.82, -2.6); P.laptop(S, 4, 0.82, -2.6); P.laptop(S, 0, 0.82, -2.6, 'off');
      box(S, [1.3, 0.32, 0.04], [0, 0.5, -1.99], faces(solid('#f2c230'), { front: P.glow(textTex('社員Aの席', { w: 256, h: 64, size: 38 })) }));
      P.plant(S, -8.6, -5.3); P.plant(S, 8.2, -5.3, 0.9); P.shelf(S, 6.4, -5.7);
      const clock = P.wallClock(S, [1.5, 3.4, -5.9], 0.9); clock.set(9);
      const arrow = P.voxelArrow(S, [0, 2.2, -2.4]);
      const c1 = addChar(S, MATES[0], [-4, 0, -3.45]);
      const c2 = addChar(S, MATES[1], [4, 0, -3.45]);
      scenes.push({
        id: 'office', start: 0, end: 4.0, scene: S,
        cam: cam([5.4, 4.7, 10.0], [4.4, 4.0, 8.6], [0, 1.2, -2.4], [0, 1.2, -2.5], 34, 4),
        update(lt) {
          [c1, c2].forEach((c, i) => {
            reset(c); sit(c); typing(c, lt + i);
            const look = ease.inOut(prog(lt, 2.3, 2.7));
            c.head.rotation.y = (i ? -0.7 : 0.7) * look;
            if (look > 0) { c.armL.rotation.x = c.armR.rotation.x = lerp(c.armL.rotation.x, -0.5, look); }
          });
          const a = prog(lt, 1.1, 1.3);
          arrow.visible = a > 0;
          arrow.scale.setScalar(a > 0 ? popScale(lt, 1.1) : 1);
          arrow.position.y = 2.2 + Math.abs(Math.sin(lt * 5)) * 0.25;
          arrow.rotation.y = lt * 1.5;
        },
      });
    }

    /* ===== 2. 出社（4〜8.5秒） ===== */
    {
      const S = newScene({ sky: ['#9fd3ef', '#e8f5fb'] });
      P.officeRoom(S, { doors: [-5], windows: [[-2, 2], [-1, 2], [-2, 3], [-1, 3], [3, 2], [4, 2], [3, 3], [4, 3]] });
      box(S, [1, 2, 0.2], [-4.5, 1, -7.2], solid('#2b3140'), { cast: false });
      box(S, [1.2, 0.15, 0.3], [-4.5, 2.05, -6.85], solid('#8592a0'));
      const doorPivot = group(S, [-4.95, 0, -6.1]);
      box(doorPivot, [0.9, 1.95, 0.1], [0.45, 0.98, 0], faces(solid('#a8794a'), {}));
      box(doorPivot, [0.08, 0.08, 0.14], [0.78, 1.0, 0], solid('#f2c230'));
      P.plant(S, -8.4, -5.3); P.shelf(S, 6.4, -5.7);
      const sign = box(S, [2.6, 0.5, 0.06], [-4.5, 3.0, -5.95], faces(solid('#1d2333'), { front: P.glow(textTex('出社はこちら', { w: 256, h: 48, size: 30, bg: '#1d2333', fg: '#f2c230' })) }));
      sign.castShadow = false;
      const path = [];
      for (let z = -6; z <= -3; z++) path.push([-5, z]);
      for (let x = -4; x <= 1; x++) path.push([x, -3]);
      const carpet = path.map(([x, z]) => box(S, [0.98, 0.06, 0.98], [x + 0.5, 0.03, z + 0.5], blockMat('gold'), { cast: false }));
      const A = addChar(S, A_LOOK, [-4.5, 0, -6.6]);
      const m1 = addChar(S, MATES[2], [3.6, 0, -1.0], -0.9);
      const m2 = addChar(S, MATES[0], [5.0, 0, -0.2], -1.1);
      const r = mulberry32(42);
      const bursts = [];
      const from = [-4.5, 1.2, -2.5];
      for (let i = 0; i < 14; i++) bursts.push({ t0: 1.0, o: from, v: [(r() - 0.5) * 4, 4 + r() * 2.5, (r() - 0.3) * 3], spin: (r() - 0.5) * 14 });
      [[2, -0.71], [3, 0.8], [4, 0.8]].forEach(([k, x]) => bursts.push({ t0: k, o: [x, 2.0, -2.5], v: [(r() - 0.5) * 1.2, 5.2, 0.6], spin: 9 }));
      bursts.forEach((b) => { b.mesh = P.coinMesh(S); });
      let aPos = V3(0, 0, 0);
      scenes.push({
        id: 'clockin', start: 4.0, end: 8.5, scene: S,
        cam: cam([4.8, 5.6, 9.8], [3.9, 5.0, 8.8], [-2.2, 1.0, -3.4], [-0.6, 1.1, -2.6], 36, 4.5),
        update(lt) {
          doorPivot.rotation.y = -1.7 * ease.out(prog(lt, 0.1, 0.4));
          carpet.forEach((m, i) => { const t0 = 0.25 + i * 0.065; m.visible = lt >= t0; m.scale.set(1, 1, 1).multiplyScalar(lt >= t0 ? popScale(lt, t0, 0.12) : 1); });
          reset(A);
          if (lt < 1.0) {
            const u = prog(lt, 0.3, 1.0);
            A.root.position.set(-4.5, 0, lerp(-6.6, -2.5, u));
            A.root.rotation.y = 0;
            if (u > 0 && u < 1) walk(A, lt * 18);
          } else if (lt < 1.25) {
            A.root.position.set(-4.5, 0, -2.5);
            A.setFace('happy');
            A.armR.rotation.x = -2.9;
          } else if (lt < 2.3) {
            const u = prog(lt, 1.25, 2.3);
            A.root.position.set(lerp(-4.5, 0.8, u), 0, -2.5);
            A.root.rotation.y = Math.PI / 2;
            walk(A, lt * 16);
            A.setFace('happy');
          } else {
            A.root.position.set(0.8, 0, -2.5);
            A.root.rotation.y = lerp(Math.PI / 2, 0.35, ease.out(prog(lt, 2.3, 2.5)));
            A.setFace('happy');
            if (lt > 2.5) { banzai(A, 1, Math.sin(lt * 12) * 0.15); A.root.position.y = Math.abs(Math.sin(lt * 6)) * 0.18; }
          }
          aPos = A.root.position.clone();
          [m1, m2].forEach((m, i) => {
            reset(m);
            const tx = aPos.x - m.root.position.x, tz = aPos.z - m.root.position.z;
            m.head.rotation.y = clamp(Math.atan2(tx, tz) - m.root.rotation.y, -0.9, 0.9) * 0.6;
            if (lt > 2.6) { m.setFace('shock'); banzai(m, 0.9, Math.sin(lt * 10 + i) * 0.2); }
          });
          bursts.forEach((b) => {
            const d = lt - b.t0;
            b.mesh.visible = d >= 0 && d < 2.6;
            if (!b.mesh.visible) return;
            const origin = V3(b.o[0], b.o[1], b.o[2]);
            const g = -14, land = (b.v[1] + Math.sqrt(b.v[1] * b.v[1] + 2 * -g * (origin.y - 0.06))) / -g;
            const tt = Math.min(d, land);
            b.mesh.position.set(origin.x + b.v[0] * tt, Math.max(0.06, origin.y + b.v[1] * tt + 0.5 * g * tt * tt), origin.z + b.v[2] * tt);
            if (d < land) b.mesh.rotation.set(d * b.spin * 0.3, d * b.spin, 0);
            else b.mesh.rotation.set(-Math.PI / 2, 0, 0);
          });
        },
        A,
      });
    }
    const A2 = scenes[1].A;

    /* ===== 3. 定例会議（8.5〜13秒） ===== */
    let meetA, meetMates;
    {
      const S = newScene({ sky: ['#9fd3ef', '#e8f5fb'] });
      P.officeRoom(S, { floor: 'plank', windows: [[3, 2], [4, 2], [3, 3], [4, 3], [6, 2], [7, 2], [6, 3], [7, 3]] });
      P.whiteboard(S, [-2.2, 2.5, -5.92]);
      P.desk(S, -2.2, -2.3, { w: 4.6, d: 1.3, top: '#c99a62', panelColor: '#a87b48' });
      [-3.7, -2.2, -0.7].forEach((x) => {
        P.chair(S, x, -3.45, 0, '#2f62d6');
        box(S, [0.42, 0.02, 0.3], [x, 0.83, -2.1], solid('#ffffff'));
        box(S, [0.14, 0.18, 0.14], [x + 0.35, 0.91, -1.95], solid('#f4f1ea'));
      });
      const B = new Blocks(); B.fill('gold', 2, 0, -1, 3, 0, 0); B.build(S);
      const coneMat = new T.MeshBasicMaterial({ color: '#fff1a8', transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending });
      const cone = new T.Mesh(new T.CylinderGeometry(0.7, 1.5, 4.6, 4, 1, true), coneMat);
      cone.position.set(3.0, 3.3, 0); cone.rotation.y = Math.PI / 4; S.add(cone);
      const A = addChar(S, A_LOOK, [3.0, 1, 0.0], -0.95);
      meetMates = [-3.7, -2.2, -0.7].map((x, i) => addChar(S, MATES[i], [x, 0, -3.45]));
      const digitMat = solid('#e8483b', { emissive: '#5a1008' });
      const digits = [3, 2, 1].map((d) => voxelDigit(S, d, 0.24, digitMat));
      digits.forEach((g) => g.position.set(-2.2, 3.3, -2.0));
      meetA = A;
      scenes.push({
        id: 'meeting', start: 8.5, end: 13.0, scene: S,
        cam: cam([4.2, 4.0, 9.0], [3.6, 3.7, 8.2], [0.0, 1.6, -1.8], [0.0, 1.6, -2.0], 36, 4.5),
        update(lt) {
          reset(A);
          A.setFace(lt > 3.5 ? 'happy' : 'normal');
          if (lt > 0.2 && lt < 3.5) { A.armR.rotation.x = -1.55; A.armR.rotation.z = 0.2; A.head.rotation.z = Math.sin(lt * 4) * 0.05; }
          if (lt >= 3.5) { banzai(A, 0.95, Math.sin(lt * 12) * 0.12); A.root.position.y = 1 + Math.abs(Math.sin(lt * 7)) * 0.12; }
          cone.material.opacity = 0.18 + Math.sin(lt * 6) * 0.04;
          meetMates.forEach((c, i) => {
            reset(c); sit(c);
            c.armL.rotation.x = c.armR.rotation.x = -1.0;
            c.head.rotation.y = 0.35;
            if (lt > 1.4) c.setFace('shock');
            if (i === 1 && lt > 1.9 && lt < 3.5) { c.armR.rotation.x = -2.6; c.armR.rotation.z = Math.sin(lt * 9) * 0.1; }
            if (lt >= 3.5) { c.head.rotation.x = 0.45; c.setFace('sleepy'); c.armL.rotation.x = c.armR.rotation.x = -0.3; }
          });
          digits.forEach((g, i) => {
            const t0 = 1.4 + i * 0.7;
            g.visible = lt >= t0 && lt < t0 + 0.7;
            if (g.visible) { g.scale.setScalar(popScale(lt, t0, 0.2)); g.rotation.y = Math.sin((lt - t0) * 5) * 0.35; }
          });
        },
      });
    }

    /* ===== 4. PCトラブル（13〜19秒） ===== */
    let pcMate, pcA;
    const RAIN = [2.3, 0.024]; // 降り始め（場面内の秒）と1台ごとの間隔
    {
      const S = newScene({ sky: ['#9fd3ef', '#e8f5fb'] });
      P.officeRoom(S, { windows: [[-7, 2], [-6, 2], [-7, 3], [-6, 3], [5, 2], [6, 2], [5, 3], [6, 3]] });
      P.desk(S, -5, -2.4, { w: 2.2 });
      const mon = P.monitor(S, -5.5, 0.82, -2.45, 'error');
      P.desk(S, 6.4, -4.4); P.laptop(S, 6.4, 0.82, -4.5);
      P.plant(S, -8.6, -5.3);
      pcMate = addChar(S, MATES[2], [-4.3, 0, -3.3]);
      pcA = addChar(S, A_LOOK, [5.2, 0, 0.8], -0.75);
      const pcMats = faces(solid('#2f343b'), { top: solid('#4a515b'), front: P.screenTex('new') });
      const N = 100, pcs = new T.InstancedMesh(new T.BoxGeometry(0.92, 0.92, 0.92), pcMats, N);
      pcs.castShadow = true; pcs.receiveShadow = true; S.add(pcs);
      const r = mulberry32(2026), order = [];
      for (let L = 0; L < 4; L++) {
        const layer = [];
        for (let i = 0; i < 25; i++) layer.push(i);
        for (let i = 24; i > 0; i--) { const j = (r() * (i + 1)) | 0; [layer[i], layer[j]] = [layer[j], layer[i]]; }
        layer.forEach((cell) => order.push({ L, c: cell % 5, row: (cell / 5) | 0, yaw: (r() - 0.5) * 0.5, jx: (r() - 0.5) * 0.12, jz: (r() - 0.5) * 0.12 }));
      }
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e3 = new T.Euler(), sc = new T.Vector3(), ps = new T.Vector3();
      scenes.push({
        id: 'pc', start: 13.0, end: 19.0, scene: S,
        cam: cam([3.4, 6.4, 12.8], [2.8, 6.0, 11.8], [0.2, 1.6, -1.6], [0.4, 1.8, -1.6], 36, 6),
        update(lt) {
          mon.show(Math.floor(lt / 0.22) % 2 ? 'error2' : 'error');
          const c = pcMate;
          reset(c); c.setFace('shock');
          banzai(c, 0.95, Math.sin(lt * 14) * 0.25);
          c.root.position.y = Math.abs(Math.sin(lt * 9)) * 0.1;
          if (lt > RAIN[0]) c.head.rotation.y = -0.6;
          const A = pcA;
          reset(A);
          if (lt > 1.4) A.root.rotation.y = lerp(-0.75, -1.1, ease.out(prog(lt, 1.4, 1.6)));
          if (lt > 1.6 && lt < RAIN[0]) { A.armR.rotation.x = -2.9; A.setFace('happy'); }
          if (lt >= RAIN[0]) { A.setFace('happy'); banzai(A, 1, Math.sin(lt * 11) * 0.15); A.root.rotation.y = -0.4; }
          order.forEach((o, i) => {
            const land = RAIN[0] + i * RAIN[1], fall = 0.5;
            const tx = -1.0 + o.c + o.jx, tz = -3.5 + o.row + o.jz, ty = 0.46 + o.L * 0.92;
            let y = ty, s = 1;
            if (lt < land - fall) s = 0;
            else if (lt < land) { const u = (lt - (land - fall)) / fall; y = ty + 9 * (1 - u * u); }
            else { const k = prog(lt, land, land + 0.1); s = 1; y = ty - Math.sin(k * Math.PI) * 0.05; }
            ps.set(tx, s ? y : -50, tz);
            q.setFromEuler(e3.set(0, o.yaw, 0));
            sc.setScalar(s || 0.001);
            m4.compose(ps, q, sc);
            pcs.setMatrixAt(i, m4);
          });
          pcs.instanceMatrix.needsUpdate = true;
        },
        shake(lt) { const k = prog(lt, RAIN[0] + 0.1, RAIN[0] + 100 * RAIN[1]); return k > 0 && k < 1 ? 0.06 : 0; },
      });
    }

    /* ===== 5. 定時（19〜22.6秒） ===== */
    {
      const DAY = ['#9fd3ef', '#e8f5fb'], DUSK = ['#ff9562', '#ffd9a0'];
      const winMat = blockMat('window').clone();
      const S = newScene({ sky: DAY });
      P.officeRoom(S, { windows: [[-7, 2], [-6, 2], [-7, 3], [-6, 3], [4, 2], [5, 2], [4, 3], [5, 3]], overrides: { window: winMat } });
      const clock = P.wallClock(S, [-1.0, 2.9, -5.88], 2.6);
      P.desk(S, 2.4, -2.5); P.chair(S, 2.4, -3.45); P.laptop(S, 2.4, 0.82, -2.6);
      P.desk(S, -4.0, -2.5); P.chair(S, -4.0, -3.45); P.laptop(S, -4.0, 0.82, -2.6);
      P.plant(S, -8.6, -5.3);
      const A = addChar(S, A_LOOK, [2.4, 0, -3.45]);
      const mate = addChar(S, MATES[1], [-4.0, 0, -3.45]);
      const { dir, hemi } = S.userData;
      scenes.push({
        id: 'overtime', start: 19.0, end: 22.6, scene: S,
        cam: cam([2.6, 3.9, 9.6], [1.3, 3.4, 7.8], [-0.4, 2.1, -3.2], [-0.6, 2.2, -3.6], 38, 3.6),
        clock,
        update(lt, t) {
          const u = ease.inOut(prog(t, OVERTIME[0], OVERTIME[1]));
          clock.set(9 + 9 * u);
          const sky = prog(t, OVERTIME[0], OVERTIME[1]);
          repaintGradient(S.background, mixHex(DAY[0], DUSK[0], sky), mixHex(DAY[1], DUSK[1], sky));
          winMat.color.set(mixHex('#ffffff', '#ffb27a', sky));
          dir.color.set(mixHex('#ffffff', '#ffc08a', sky));
          hemi.intensity = lerp(0.72, 0.62, sky);
          reset(mate); sit(mate); typing(mate, t, 10, 0.08); mate.setFace(sky > 0.6 ? 'sleepy' : 'normal');
          reset(A);
          if (t < OVERTIME[1] + 0.05) { sit(A); typing(A, t, 60, 0.3); A.setFace('happy'); }
          else {
            const k = ease.back(prog(t, OVERTIME[1] + 0.05, OVERTIME[1] + 0.3));
            A.root.position.x = 2.4 + 1.5 * k;
            A.root.position.z = -3.45 + 0.6 * k;
            A.setFace('happy');
            A.armR.rotation.x = -2.95; A.armL.rotation.z = -0.4;
            A.root.position.y = Math.abs(Math.sin(t * 8)) * 0.1;
          }
        },
      });
    }
    const clockScene = scenes[scenes.length - 1];

    /* ===== 6. 屋上のヘリ（22.6〜25.4秒） ===== */
    let roofA, heli;
    {
      const S = newScene({ sky: ['#ff8f5e', '#ffd8a0'], sun: [-7, 7, 6], sunColor: '#ffcf9a', sunI: 0.7, amb: 0.62, hemiSky: '#ffe2c4', hemiGround: '#7a6a80', fog: ['#ffcf9c', 24, 70] });
      const B = new Blocks();
      B.fill('facade', -9, -4, -6, 7, -2, 3);
      B.fill('stone', -8, -1, -5, 7, -1, 3);
      B.fill('facade', -9, -1, -6, 7, 0, -6); B.fill('facade', -9, -1, -5, -9, 0, 3);
      for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
        const d = Math.hypot(x, z);
        if (d >= 2.4 && d < 3.4) B.set('pad', x, -1, z);
      }
      [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1], [0, 0]].forEach(([x, z]) => B.set('padWhite', x, -1, z));
      B.build(S);
      const r = mulberry32(77), city = ['#7b6a8f', '#8c7b9c', '#6f6384', '#9a87a6'];
      for (let i = 0; i < 26; i++) {
        const w = 3 + r() * 3, h = 6 + r() * 14, d = 3 + r() * 3;
        box(S, [w, h, d], [-34 + i * 2.7 + r() * 2, -12 + h / 2, -16 - r() * 24], solid(city[(r() * 4) | 0]), { cast: false });
      }
      const sun = new T.Mesh(new T.BoxGeometry(5, 5, 0.5), new T.MeshBasicMaterial({ color: '#ff7b45', fog: false }));
      sun.position.set(16, 3, -60); S.add(sun);
      roofA = addChar(S, A_LOOK, [0.5, 0, 0.5], 0.2);
      heli = P.helicopter(S);
      const HOVER = 4.86;
      scenes.push({
        id: 'roof', start: 22.6, end: 25.4, scene: S,
        cam: (lt) => {
          const u = ease.inOut(prog(lt, 1.2, 2.8));
          return { pos: lerp3([5.6, 3.8, 11.0], [4.0, 5.8, 12.2], u), target: lerp3([0.4, 2.8, -0.5], [-2.2, 6.0, -1.5], u), fov: 40 };
        },
        update(lt, t) {
          heli.rotor.rotation.y = t * 31;
          heli.tail.rotation.z = t * 40;
          const A = roofA;
          reset(A); A.setFace('happy');
          let hp;
          if (lt < 1.0) {
            const u = ease.out(prog(lt, 0, 1.0));
            hp = lerp3([14, 10, -4], [0.5, HOVER, 0.5], u);
            heli.g.rotation.z = lerp(0.18, 0, u);
          } else if (lt < 1.2) {
            hp = [0.5, HOVER + Math.sin(lt * 6) * 0.05, 0.5];
            heli.g.rotation.z = 0;
          } else {
            const u = ease.in(prog(lt, 1.2, 2.8));
            hp = lerp3([0.5, HOVER, 0.5], [-7, 12, -2.5], u);
            heli.g.rotation.z = -0.12 * prog(lt, 1.2, 1.6);
          }
          heli.g.position.set(hp[0], hp[1], hp[2]);
          heli.ladder.rotation.z = Math.sin(t * 3) * 0.04 + (lt < 1.0 ? 0.15 * (1 - prog(lt, 0.6, 1.0)) : 0);
          if (lt < 0.9) { A.armR.rotation.z = 2.6 + Math.sin(lt * 14) * 0.3; }
          else if (lt < 1.2) { A.armL.rotation.x = A.armR.rotation.x = -Math.PI; A.root.position.y = Math.sin(prog(lt, 1.0, 1.2) * Math.PI) * 0.2; }
          else {
            A.armL.rotation.x = A.armR.rotation.x = -Math.PI;
            A.root.position.set(hp[0], hp[1] - HOVER, hp[2]);
            A.legL.rotation.x = Math.sin(t * 6) * 0.35; A.legR.rotation.x = -Math.sin(t * 6) * 0.35;
            A.root.rotation.z = Math.sin(t * 3) * 0.06;
          }
        },
      });
    }

    /* ===== 7. 有給（25.4〜30秒） ===== */
    let beachA;
    {
      const S = newScene({ sky: ['#58b7ee', '#d9f2ff'], sun: [6, 12, 6], sunI: 0.6, amb: 0.78, hemiGround: '#d9c48e', fog: ['#d9f2ff', 26, 80] });
      const B = new Blocks();
      B.fill('sand', -10, -2, -4, 9, -2, 4);
      B.fill('sand', -10, -1, -3, 9, -1, 4);
      B.fill('sandWet', -10, -1, -4, 9, -1, -4);
      B.build(S);
      const W = new Blocks(); W.fill('water', -26, 0, -18, 25, 0, -5); W.build(S);
      W.meshes.water.position.y = -1.12;
      const waterTex = blockMat('water').map;
      const sun = new T.Mesh(new T.BoxGeometry(4.2, 4.2, 0.5), new T.MeshBasicMaterial({ color: '#ffd84a', fog: false }));
      sun.position.set(-6, 7, -45); S.add(sun);
      const clouds = [P.cloud(S, [-12, 9, -30], 3), P.cloud(S, [4, 11, -38], 4), P.cloud(S, [16, 8.5, -32], 5)];
      P.parasol(S, -1.1, -1.6);
      const chairG = group(S, [0.2, 0, 0]);
      const frame = solid('#f4f1ea'), cloth = solid('#3fb0a5');
      box(chairG, [0.9, 0.1, 1.6], [0, 0.4, 0.4], cloth);
      box(chairG, [0.9, 1.0, 0.08], [0, 0.78, -0.46], cloth, { rot: [-0.6, 0, 0] });
      [[-0.4, 1.1], [0.4, 1.1], [-0.4, -0.3], [0.4, -0.3]].forEach(([x, z]) => box(chairG, [0.06, 0.38, 0.06], [x, 0.19, z], frame));
      P.suitcase(S, 2.3, 0.9, -0.3);
      P.sandCastle(S, -3.4, 0.6);
      P.beachBall(S, -2.2, 2.4);
      beachA = addChar(S, A_LOOK, [0.2, 0.14, 0.28]);
      const cup = group(beachA.armL, [0, -0.62, 0.06]);
      box(cup, [0.16, 0.24, 0.16], [0, 0, 0], solid('#ff9f43'));
      box(cup, [0.03, 0.2, 0.03], [0.04, 0.18, 0], solid('#ffffff'));
      scenes.push({
        id: 'beach', start: 25.4, end: 30.01, scene: S,
        cam: cam([5.8, 3.4, 9.0], [4.5, 2.9, 7.7], [-0.2, 1.0, -1.6], [-0.4, 1.1, -1.8], 36, 4.6),
        update(lt, t) {
          waterTex.offset.set(t * 0.06, Math.sin(t * 0.8) * 0.05);
          W.meshes.water.position.y = -1.12 + Math.sin(t * 1.6) * 0.03;
          clouds.forEach((c, i) => { c.position.x = [-12, 4, 16][i] + lt * 0.4; });
          const A = beachA;
          reset(A);
          A.root.rotation.x = -0.6;
          A.legL.rotation.x = A.legR.rotation.x = -0.97;
          A.setFace('shades');
          A.armR.rotation.x = -2.9; A.armR.rotation.z = 0.55;
          const cheers = ease.back(prog(lt, 2.6, 2.9)) * (1 - prog(lt, 3.8, 4.1));
          A.armL.rotation.x = lerp(-0.9, -2.2, cheers);
          A.head.rotation.x = 0.3 + Math.sin(t * 1.5) * 0.03;
          A.head.rotation.y = 0.15;
          A.body.rotation.x = Math.sin(t * 1.5) * 0.015;
        },
      });
    }

    /* ===== 重ね表示 ===== */
    const sceneOf = (id) => scenes.find((s) => s.id === id);
    const overlay = [
      { type: 'caption', t0: 0, t1: 4.0, lines: [
        { text: 'もしも社員Aだけ、秒給1万円だったら', cls: 'title' },
        { text: 'ブロック町のIT企業、ある平日の朝', at: 0.6, cps: 22, cls: 'sub' },
      ] },
      { type: 'caption', t0: 4.0, t1: 8.5, lines: [
        { text: '出社した瞬間から、', at: 4.15, cps: 18 },
        { text: '1秒＝1万円', at: 5.0, cps: 20, cls: 'mark' },
      ] },
      { type: 'counter', t0: 5.0, t1: 25.4, label: '社員Aの本日の給料', value: wageAt, done: (t) => t >= OVERTIME[1] },
      { type: 'fx', t0: 5.0, t1: 6.3, text: 'チャリーン', x: 470, y: 250, rot: -9 },
      ...[6, 7, 8].map((k) => ({ type: 'float', t0: k, t1: k + 0.9, text: '+1万円', scene: 'clockin', anchor: headTop(A2, 1.1) })),
      { type: 'bubble', t0: 8.75, t1: 11.9, text: '1分＝60万円なので、\n結論から3秒でどうぞ', scene: 'meeting', anchor: headTop(meetA) },
      { type: 'bubble', t0: 10.45, t1: 12.1, text: 'あ、あの…', scene: 'meeting', anchor: headTop(meetMates[1]) },
      { type: 'tag', t0: 12.0, t1: 13.0, text: '定例会議、開始3秒で終了' },
      { type: 'bubble', t0: 13.25, t1: 15.3, text: 'PCが固まった！', scene: 'pc', anchor: headTop(pcMate) },
      { type: 'bubble', t0: 14.6, t1: 16.7, text: '新しいの買ってきた', scene: 'pc', anchor: headTop(pcA) },
      { type: 'fx', t0: 15.45, t1: 17.9, text: 'ドサドサッ', x: 560, y: 120, rot: -6, shake: true },
      { type: 'tag', t0: 17.1, t1: 19.0, text: '新品PC100台、ポケットマネーで' },
      { type: 'tag', t0: OVERTIME[1] + 0.05, t1: 22.6, text: '18:00 定時', scene: 'overtime', anchor: () => V3(-1.0, 1.35, -5.8) },
      { type: 'caption', t0: 22.6, t1: 25.4, lines: [
        { text: '本日の給料、2億8800万円', at: 22.75, cps: 16 },
        { text: '（休憩1時間は除く）', at: 23.5, cps: 24, cls: 'sub' },
      ] },
      { type: 'fx', t0: 23.9, t1: 25.4, text: 'お疲れさまでしたー', x: 900, y: 520, rot: -5, size: 50 },
      { type: 'caption', t0: 25.4, t1: 30.1, lines: [
        { text: 'それでも有給は、きっちり全部使います。', at: 25.6, cps: 14, cls: 'mark-soft' },
        { text: '秒給1万円の社員A', at: 27.3, cps: 18, cls: 'sub' },
      ] },
      { type: 'badge', t0: 28.3, t1: 30.1, text: 'もしもブロック劇場 #01　おわり' },
    ];

    /* ===== 音 ===== */
    const S_ = AUDIO.SFX, audio = AUDIO.music();
    const add = (list) => audio.push(...list);
    [4.0, 8.5, 13.0, 19.0, 22.6, 25.4].forEach((c) => add(S_.whoosh(c - 0.2)));
    add(S_.pop(1.1, 2));
    add(S_.door(4.1));
    for (let i = 0; i < 10; i++) add(S_.pop(4.25 + i * 0.065, i));
    for (let k = 0; k < 4; k++) add(S_.step(4.3 + k * 0.17));
    add(S_.coin(5.0)); add(S_.sparkle(5.15));
    for (let k = 0; k < 6; k++) add(S_.step(5.3 + k * 0.17));
    [6, 7, 8].forEach((k) => add(S_.coinSmall(k)));
    add(S_.cheer(6.6));
    add(S_.talk(8.75, 7)); add(S_.talk(10.45, 3));
    [9.9, 10.6, 11.3].forEach((k) => add(S_.beep(k)));
    add(S_.buzzer(12.0));
    add(S_.error(13.05)); add(S_.talk(13.25, 4)); add(S_.talk(14.6, 5));
    for (let i = 0; i < 100; i += 4) add(S_.thud(13.0 + RAIN[0] + i * RAIN[1], i % 7));
    add(S_.pop(17.1, 4));
    { let k = 0; for (let t = OVERTIME[0]; t < OVERTIME[1]; k++) { add(S_.tick(t, k % 2)); t += lerp(0.16, 0.035, Math.sin(prog(t, OVERTIME[0], OVERTIME[1]) * Math.PI)); } }
    add(S_.chime(OVERTIME[1] + 0.05));
    add(S_.rotor(22.6, 2.8));
    add(S_.pop(23.8, 6)); add(S_.jingle(23.9));
    add(S_.waves(25.4, 4.6));
    add(S_.pop(28.3, 3));

    return { scenes, overlay, audio, cuts: [4.0, 8.5, 13.0, 19.0, 22.6, 25.4], sceneOf, clockScene };
  },
});
