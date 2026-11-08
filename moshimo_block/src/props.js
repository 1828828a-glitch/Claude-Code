/* props.js — シリーズで使い回す舞台と小道具（オフィス・机・PC・時計・ヘリ・ビーチ） */
const glow = (tex) => new T.MeshBasicMaterial({ map: tex });
const SCREEN_CACHE = {};
function screenTex(kind) {
  if (SCREEN_CACHE[kind]) return SCREEN_CACHE[kind];
  const tex = canvasTex(32, 32, (g) => {
    if (kind === 'code') {
      px(g, '#1c2740', 0, 0, 32, 32);
      const r = mulberry32(5), cols = ['#7fd1ff', '#ffd36b', '#9be59b', '#ff9bb5', '#d6e2ff'];
      for (let y = 3; y < 30; y += 3) { const ind = (r() * 3 | 0) * 2; px(g, cols[(r() * cols.length) | 0], 3 + ind, y, 6 + ((r() * 16) | 0), 1); }
    } else if (kind === 'error' || kind === 'error2') {
      const a = kind === 'error';
      px(g, a ? '#c9302c' : '#7d1714', 0, 0, 32, 32);
      for (let i = 0; i < 18; i++) { px(g, a ? '#ffffff' : '#ffb3ad', 6 + i, 6 + i, 3, 3); px(g, a ? '#ffffff' : '#ffb3ad', 23 - i, 6 + i, 3, 3); }
    } else if (kind === 'new') {
      px(g, '#2f7fe0', 0, 0, 32, 32);
      px(g, '#ffffff', 6, 6, 20, 14); px(g, '#2f7fe0', 7, 9, 18, 10);
      px(g, '#ffd23a', 11, 12, 2, 2); px(g, '#ffd23a', 19, 12, 2, 2); px(g, '#ffd23a', 12, 16, 8, 1);
      px(g, '#9fd0ff', 6, 24, 20, 2);
    } else {
      px(g, '#20242b', 0, 0, 32, 32); px(g, '#2c323b', 2, 2, 10, 1);
    }
  });
  SCREEN_CACHE[kind] = glow(tex);
  return SCREEN_CACHE[kind];
}

/* 床・奥の壁・左の壁でできた断面ジオラマ。windows は奥の壁 [x, y] の窓 */
function officeRoom(S, o = {}) {
  const B = new Blocks();
  const x0 = -10, x1 = 9, z0 = -6, z1 = 3, top = o.wallH || 4, wz = z0 - 1;
  B.fill('foundation', x0 - 1, -2, wz, x1, -2, z1);
  B.fill(o.floor || 'carpet', x0, -1, z0, x1, -1, z1);
  (o.holes || []).forEach(([x, z]) => { B.del(x, -1, z); B.del(x, -2, z); });
  const wallType = (y) => (y <= -1 ? 'foundation' : y === 0 ? 'wallBase' : 'wall');
  for (let x = x0 - 1; x <= x1; x++) for (let y = -1; y <= top; y++) B.set(wallType(y), x, y, wz);
  for (let z = z0; z <= z1; z++) for (let y = -1; y <= top; y++) B.set(wallType(y), x0 - 1, y, z);
  const wins = o.windows || [[-7, 2], [-6, 2], [-7, 3], [-6, 3], [-2, 2], [-1, 2], [-2, 3], [-1, 3], [3, 2], [4, 2], [3, 3], [4, 3]];
  wins.forEach(([x, y]) => B.set('window', x, y, wz));
  (o.leftWindows || [[-3, 2], [-2, 2], [-3, 3], [-2, 3]]).forEach(([z, y]) => B.set('window', x0 - 1, y, z));
  (o.doors || []).forEach((x) => { B.del(x, 0, wz); B.del(x, 1, wz); });
  B.build(S, o.overrides || {});
  return B;
}

function desk(parent, x, z, o = {}) {
  const g = group(parent, [x, 0, z]);
  const w = o.w || 1.8, d = o.d || 1.0, h = 0.82;
  box(g, [w, 0.1, d], [0, h - 0.05, 0], solid(o.top || '#e8ecef'));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
    box(g, [0.1, h - 0.1, 0.1], [sx * (w / 2 - 0.08), (h - 0.1) / 2, sz * (d / 2 - 0.08)], solid('#8f99a4')));
  if (o.panel !== false) box(g, [w - 0.1, 0.45, 0.05], [0, 0.45, d / 2 - 0.06], solid(o.panelColor || '#cdd5dc'));
  return g;
}
/* ノートPC。画面は奥（座る人）向き、手前にはフタの背中が見える */
function laptop(parent, x, y, z, kind = 'code') {
  const g = group(parent, [x, y, z]);
  box(g, [0.7, 0.04, 0.45], [0, 0.02, -0.06], solid('#b9c0c8'));
  box(g, [0.7, 0.46, 0.04], [0, 0.25, 0.17], faces(solid('#c9cfd6'), { back: screenTex(kind), front: solid('#d6dbe1') }), { rot: [0.16, 0, 0] });
  return g;
}
/* 据え置きモニター。画面は手前向き */
function monitor(parent, x, y, z, kind = 'code', rotY = 0) {
  const g = group(parent, [x, y, z]);
  g.rotation.y = rotY;
  box(g, [0.45, 0.04, 0.3], [0, 0.02, 0], solid('#2f343b'));
  box(g, [0.1, 0.32, 0.1], [0, 0.18, -0.04], solid('#2f343b'));
  const frame = box(g, [1.0, 0.66, 0.08], [0, 0.66, 0], faces(solid('#2a2f36'), { front: screenTex(kind) }));
  return { g, frame, show(k) { frame.material[4] = screenTex(k); } };
}
function chair(parent, x, z, rotY = 0, color = '#3a414d') {
  const g = group(parent, [x, 0, z]);
  g.rotation.y = rotY;
  box(g, [0.5, 0.05, 0.5], [0, 0.03, 0], solid('#2b3038'));
  box(g, [0.08, 0.4, 0.08], [0, 0.22, 0], solid('#2b3038'));
  box(g, [0.62, 0.1, 0.6], [0, 0.44, 0], solid(color));
  box(g, [0.62, 0.62, 0.08], [0, 0.8, -0.32], solid(color));
  return g;
}
function plant(parent, x, z, s = 1) {
  const g = group(parent, [x, 0, z]);
  g.scale.setScalar(s);
  box(g, [0.5, 0.45, 0.5], [0, 0.225, 0], solid('#c0663a'));
  box(g, [0.42, 0.05, 0.42], [0, 0.45, 0], solid('#5a3d2a'));
  [[0, 0.75, 0, 0.42], [0.18, 1.05, 0.05, 0.3], [-0.16, 1.15, -0.06, 0.32], [0.02, 1.4, 0, 0.26]].forEach(([lx, ly, lz, sz], i) =>
    box(g, [sz, sz, sz], [lx, ly, lz], solid(i % 2 ? '#3f9b4b' : '#4fb35a')));
  return g;
}
function shelf(parent, x, z) {
  const g = group(parent, [x, 0, z]);
  const tex = canvasTex(16, 32, (c) => {
    px(c, '#7a5232', 0, 0, 16, 32);
    const r = mulberry32(17), cols = ['#d24b4b', '#2f62d6', '#f2c230', '#3f9b4b', '#efefef', '#6a5acd'];
    [2, 12, 22].forEach((y) => { let xx = 1; while (xx < 15) { const w = 1 + ((r() * 2) | 0); px(c, cols[(r() * cols.length) | 0], xx, y, w, 8); xx += w; } px(c, '#5a3a22', 0, y + 8, 16, 2); });
  });
  box(g, [1.6, 2.4, 0.5], [0, 1.2, 0], faces(solid('#7a5232'), { front: lam(tex) }));
  return g;
}
function wallClock(parent, pos, size = 1) {
  const g = group(parent, pos);
  const tex = canvasTex(32, 32, (c) => {
    px(c, '#1d2333', 0, 0, 32, 32); px(c, '#fbfaf5', 2, 2, 28, 28);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, r = 11.5, x = Math.round(16 + Math.sin(a) * r - 1), y = Math.round(16 - Math.cos(a) * r - 1);
      px(c, i % 3 === 0 ? '#d24b4b' : '#1d2333', x, y, 2, 2);
    }
  });
  box(g, [size, size, 0.12], [0, 0, 0], faces(solid('#1d2333'), { front: lam(tex) }));
  const hand = (len, wid, color) => {
    const p = group(g, [0, 0, 0.08]);
    box(p, [wid, len, 0.04], [0, len / 2 - wid / 2, 0], solid(color), { cast: false });
    return p;
  };
  const hour = hand(size * 0.27, size * 0.06, '#1d2333');
  const minute = hand(size * 0.4, size * 0.045, '#1d2333');
  box(g, [size * 0.08, size * 0.08, 0.06], [0, 0, 0.12], solid('#d24b4b'), { cast: false });
  return {
    g, hour, minute,
    set(h) {
      hour.rotation.z = -((h % 12) / 12) * Math.PI * 2;
      minute.rotation.z = -(h % 1) * Math.PI * 2;
    },
  };
}
function whiteboard(parent, pos) {
  const tex = canvasTex(64, 32, (c) => {
    px(c, '#9aa3ad', 0, 0, 64, 32); px(c, '#fbfcfd', 1, 1, 62, 30);
    px(c, '#2f62d6', 5, 4, 22, 1); px(c, '#2f62d6', 5, 7, 16, 1);
    [[8, 10], [14, 7], [20, 13], [26, 9]].forEach(([x, h]) => px(c, '#d24b4b', 30 + x, 27 - h, 4, h));
    px(c, '#1d2333', 36, 27, 28, 1);
    px(c, '#3f9b4b', 5, 13, 18, 1); px(c, '#3f9b4b', 5, 16, 12, 1); px(c, '#1d2333', 5, 20, 20, 1); px(c, '#1d2333', 5, 23, 14, 1);
  });
  return box(parent, [3.8, 1.9, 0.08], pos, faces(solid('#9aa3ad'), { front: lam(tex) }));
}
/* 下向き矢印（ブロック5段） */
function voxelArrow(parent, pos, cube = 0.16, color = '#f2c230') {
  const g = group(parent, pos);
  ['00100', '00100', '11111', '01110', '00100'].forEach((row, y) => [...row].forEach((v, x) => {
    if (v === '1') box(g, [cube, cube, cube], [(x - 2) * cube, (2 - y) * cube, 0], solid(color, { emissive: '#4a3a00' }));
  }));
  return g;
}

/* コイン（四角い金貨） */
let COIN_MATS = null;
function coinMesh(parent) {
  if (!COIN_MATS) {
    const tex = canvasTex(16, 16, (c) => {
      px(c, '#c4920f', 0, 0, 16, 16); px(c, '#ffd84a', 1, 1, 14, 14); px(c, '#fff3b0', 2, 2, 12, 1);
      px(c, '#b07f0a', 5, 4, 1, 3); px(c, '#b07f0a', 10, 4, 1, 3); px(c, '#b07f0a', 6, 7, 4, 1);
      px(c, '#b07f0a', 7, 7, 2, 6); px(c, '#b07f0a', 5, 9, 6, 1);
    });
    COIN_MATS = faces(solid('#e0a816'), { front: lam(tex), back: lam(tex) });
  }
  return box(parent, [0.34, 0.34, 0.07], [0, -50, 0], COIN_MATS);
}

/* ヘリ（機首は -x 向き）。縄ばしごの下端は機体中心から 3.2 下 */
function helicopter(parent) {
  const g = group(parent);
  const blue = solid('#2f6fe0'), dark = solid('#1d2333'), gold = solid('#f2c230');
  box(g, [2.2, 1.1, 1.2], [0, 0, 0], blue);
  box(g, [2.22, 0.2, 1.22], [0, -0.2, 0], gold);
  box(g, [0.55, 0.65, 1.02], [-1.2, 0.12, 0], solid('#9fd4f2', { emissive: '#1d3a52' }));
  box(g, [2.1, 0.3, 0.3], [2.1, 0.2, 0], blue);
  box(g, [0.3, 0.8, 0.12], [3.0, 0.55, 0], blue);
  [-0.5, 0.5].forEach((z) => {
    box(g, [2.0, 0.08, 0.1], [0, -0.88, z], dark);
    box(g, [0.08, 0.3, 0.08], [-0.5, -0.7, z], dark); box(g, [0.08, 0.3, 0.08], [0.5, -0.7, z], dark);
  });
  box(g, [0.18, 0.2, 0.18], [0, 0.65, 0], dark);
  const rotor = group(g, [0, 0.78, 0]);
  box(rotor, [4.4, 0.05, 0.28], [0, 0, 0], dark, { cast: true });
  box(rotor, [0.28, 0.05, 4.4], [0, 0, 0], dark, { cast: true });
  const tail = group(g, [3.0, 0.55, 0.12]);
  box(tail, [0.08, 0.9, 0.05], [0, 0, 0], dark);
  const ladder = group(g, [0, -0.6, 0]);
  const rope = solid('#c49a5a');
  [-0.25, 0.25].forEach((x) => box(ladder, [0.04, 2.6, 0.04], [x, -1.3, 0], rope));
  for (let i = 0; i < 6; i++) box(ladder, [0.54, 0.05, 0.06], [0, -0.4 - i * 0.44, 0], rope);
  return { g, rotor, tail, ladder };
}

function parasol(parent, x, z) {
  const g = group(parent, [x, 0, z]);
  box(g, [0.12, 2.6, 0.12], [0, 1.3, 0], solid('#f4f1ea'));
  [[3.0, '#f2c230'], [2.2, '#ffffff'], [1.4, '#f2c230'], [0.6, '#ffffff']].forEach(([w, c], i) =>
    box(g, [w, 0.14, w], [0, 2.5 + i * 0.14, 0], solid(c)));
  g.rotation.z = 0.08;
  return g;
}
function suitcase(parent, x, z, rotY = 0) {
  const g = group(parent, [x, 0, z]);
  g.rotation.y = rotY;
  box(g, [0.9, 0.62, 0.36], [0, 0.33, 0], solid('#2f62d6'));
  box(g, [0.92, 0.12, 0.38], [0, 0.33, 0], solid('#f2c230'));
  box(g, [0.34, 0.08, 0.08], [0, 0.7, 0], solid('#1d2333'));
  [-0.3, 0.3].forEach((xx) => box(g, [0.08, 0.06, 0.08], [xx, 0.03, 0.12], solid('#1d2333')));
  return g;
}
function sandCastle(parent, x, z) {
  const g = group(parent, [x, 0, z]);
  const s = blockMat('sand');
  box(g, [0.9, 0.4, 0.9], [0, 0.2, 0], s);
  [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([a, b]) => box(g, [0.24, 0.32, 0.24], [a, 0.56, b], s));
  box(g, [0.34, 0.6, 0.34], [0, 0.7, 0], s);
  box(g, [0.03, 0.3, 0.03], [0, 1.15, 0], solid('#1d2333'));
  box(g, [0.18, 0.1, 0.02], [0.1, 1.25, 0], solid('#d24b4b'));
  return g;
}
function beachBall(parent, x, z) {
  const g = group(parent, [x, 0.3, z]);
  box(g, [0.6, 0.6, 0.6], [0, 0, 0], faces(solid('#ffffff'), { right: solid('#d24b4b'), left: solid('#2f62d6'), front: solid('#f2c230'), back: solid('#3f9b4b') }));
  return g;
}
function cloud(parent, pos, seed) {
  const g = group(parent, pos);
  const r = mulberry32(seed), m = solid('#ffffff', { emissive: '#8a96a8' });
  for (let i = 0; i < 6; i++) box(g, [1.6 + r() * 1.6, 0.8 + r() * 0.6, 1.4 + r() * 1.2], [(r() - 0.5) * 4, r() * 0.6, (r() - 0.5) * 1.6], m, { cast: false });
  return g;
}

/* 壊れるブロック。tBreak を過ぎると消えて、かけらが飛び散る */
class Breakables {
  constructor(parent, seed = 1) { this.parent = parent; this.items = []; this.r = mulberry32(seed); }
  add(mat, pos, tBreak, o = {}) {
    const size = o.size || [1, 1, 1];
    const m = box(this.parent, size, pos, mat, { cast: o.cast });
    const bits = [];
    for (let k = 0; k < (o.bits || 6); k++) {
      const s = 0.18 + this.r() * 0.16;
      bits.push({
        m: box(this.parent, [s, s, s], [0, -99, 0], mat, { cast: false }),
        v: [(this.r() - 0.5) * 3.2, 1.5 + this.r() * 3, (this.r() - 0.3) * 2.6], spin: (this.r() - 0.5) * 12,
      });
    }
    this.items.push({ m, pos, tBreak, bits, life: o.life || 0.9, g: o.g || -16 });
    return m;
  }
  update(t) {
    for (const it of this.items) {
      it.m.visible = t < it.tBreak;
      const d = t - it.tBreak;
      for (const b of it.bits) {
        b.m.visible = d >= 0 && d < it.life;
        if (!b.m.visible) continue;
        b.m.position.set(it.pos[0] + b.v[0] * d, it.pos[1] + b.v[1] * d + 0.5 * it.g * d * d, it.pos[2] + b.v[2] * d);
        b.m.rotation.set(d * b.spin, d * b.spin * 0.7, 0);
        b.m.scale.setScalar(Math.max(0.01, 1 - d / it.life));
      }
    }
  }
}
/* ひび割れの模様（床に貼るシール） */
let CRACK_MAT = null;
function crackDecal(parent, x, y, z, rot = 0) {
  if (!CRACK_MAT) {
    const tex = canvasTex(16, 16, (g) => {
      const c = '#2a2f3a';
      [[7, 0], [7, 1], [8, 2], [8, 3], [7, 4], [6, 5], [6, 6], [7, 7], [8, 7], [9, 8], [10, 9], [11, 9], [12, 10], [13, 11],
        [6, 8], [5, 9], [4, 10], [3, 10], [2, 11], [1, 12], [8, 9], [8, 10], [9, 11], [9, 12], [8, 13], [8, 14], [9, 15],
        [9, 6], [10, 5], [11, 5], [12, 4], [5, 4], [4, 3], [3, 3]].forEach(([a, b]) => px(g, c, a, b));
    });
    CRACK_MAT = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  }
  const m = new T.Mesh(new T.PlaneGeometry(1, 1), CRACK_MAT);
  m.rotation.set(-Math.PI / 2, 0, rot);
  m.position.set(x, y + 0.012, z);
  parent.add(m);
  return m;
}
/* 土けむり（白い箱がふくらんで消える） */
function dustPuff(parent, n = 8, seed = 3) {
  const r = mulberry32(seed), mat = solid('#efeae0'), parts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4;
    parts.push({ m: box(parent, [0.3, 0.3, 0.3], [0, -99, 0], mat, { cast: false }), dir: [Math.cos(a), 0.25 + r() * 0.3, Math.sin(a)], sp: 1.4 + r() * 1.2 });
  }
  return {
    update(t, t0, at, life = 0.8) {
      const d = t - t0;
      parts.forEach((p) => {
        p.m.visible = d >= 0 && d < life;
        if (!p.m.visible) return;
        const k = ease.out(d / life);
        p.m.position.set(at[0] + p.dir[0] * p.sp * k, at[1] + 0.15 + p.dir[1] * k, at[2] + p.dir[2] * p.sp * k);
        p.m.scale.setScalar(0.6 + 1.4 * k * (1 - k) + (1 - d / life) * 0.4);
      });
    },
  };
}
/* 断面のビル。H ブロックごとに1フロア（床2段＋天井まで3段）。holes の [x, y, z] は空けておき、壊れるブロックに使う */
const FLOOR_H = 5;
function tower(S, o = {}) {
  const floors = o.floors || 5, x0 = -6, x1 = 5, z0 = -3, z1 = 1, wz = z0 - 1;
  const holes = new Set((o.holes || []).map((c) => c.join(',')));
  const B = new Blocks();
  const put = (type, x, y, z) => { if (!holes.has(`${x},${y},${z}`)) B.set(type, x, y, z); };
  for (let f = 0; f <= floors; f++) {
    const y = f * FLOOR_H;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      put(f === 0 || f === floors ? 'stone' : o.floor || 'carpet', x, y - 1, z);
      put('foundation', x, y - 2, z);
    }
  }
  const wallAt = (y) => { const m = ((y % FLOOR_H) + FLOOR_H) % FLOOR_H; return m >= 3 ? 'foundation' : m === 0 ? 'wallBase' : 'wall'; };
  for (let y = -2; y < floors * FLOOR_H - 2; y++) {
    for (let x = x0 - 1; x <= x1; x++) B.set(wallAt(y), x, y, wz);
    for (let z = z0; z <= z1; z++) B.set(wallAt(y), x0 - 1, y, z);
  }
  for (let f = 0; f < floors; f++) [2, 3].forEach((x) => [1, 2].forEach((dy) => B.set('window', x, f * FLOOR_H + dy, wz)));
  B.build(S, {}, { cast: false });
  for (let f = 0; f < floors; f++) {
    const sign = box(S, [0.9, 0.5, 0.05], [x0 + 0.8, f * FLOOR_H + 2.1, z0 + 0.03], faces(solid('#1d2333'), { front: glow(textTex(`${f + 1}F`, { w: 128, h: 64, size: 40, bg: '#1d2333', fg: '#f2c230' })) }));
    sign.castShadow = false;
  }
  return B;
}
/* 影を落とす光をカメラの見ている高さへ移す（高いビルでも影が出るように） */
function followLight(S, x, y, z) {
  const { dir } = S.userData;
  dir.position.set(x + 7, y + 12, z + 8);
  dir.target.position.set(x, y, z);
  dir.target.updateMatrixWorld();
}

const P = {
  Breakables, crackDecal, dustPuff, tower, followLight, FLOOR_H,
  glow, screenTex, officeRoom, desk, laptop, monitor, chair, plant, shelf, wallClock, whiteboard,
  voxelArrow, coinMesh, helicopter, parasol, suitcase, sandCastle, beachBall, cloud, lam,
};

/* 回のファイルで使う小さな道具 */
const V3 = (x, y, z) => new T.Vector3(x, y, z);
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const headTop = (c, dy = 0.95) => () => c.head.localToWorld(V3(0, dy, 0));
/* p0→p1 へカメラ位置、q0→q1 へ注視点を d 秒かけて動かす */
const camPath = (p0, p1, q0, q1, fov, d) => (lt) => {
  const u = ease.inOut(prog(lt, 0, d));
  return { pos: lerp3(p0, p1, u), target: lerp3(q0, q1, u), fov };
};
/* 衝撃の時刻リストから、いまの揺れの強さを出す */
const impact = (lt, times, amp = 0.1, decay = 10) => times.reduce((s, ti) => (lt >= ti ? s + amp * Math.exp(-(lt - ti) * decay) : s), 0);
