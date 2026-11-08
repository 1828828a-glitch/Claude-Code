/* voxel.js — ブロック世界の部品（テクスチャ・ブロック・キャラ・小物） */
const T = window.THREE;

/* ---------- 数値まわり ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ease = {
  inOut: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  out: (u) => 1 - Math.pow(1 - u, 3),
  in: (u) => u * u * u,
  back: (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb(c, k = 1) {
  const f = (v) => clamp(Math.round(v * k), 0, 255);
  return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
}
function mixHex(a, b, u) {
  const A = hexRgb(a), B = hexRgb(b);
  return rgb([lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)]);
}

/* ---------- テクスチャ ---------- */
function canvasTex(w, h, draw, smooth = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  const tex = new T.CanvasTexture(c);
  tex.magFilter = smooth ? T.LinearFilter : T.NearestFilter;
  tex.minFilter = smooth ? T.LinearFilter : T.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}
const px = (g, color, x, y, w = 1, h = 1) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
function noisy(g, base, amp, seed, w = 16, h = 16) {
  const r = mulberry32(seed), c = hexRgb(base);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(g, rgb(c, 1 + (r() - 0.5) * amp), x, y);
}

/* ブロックの種類。all は6面共通、top/side は面ごと */
const BLOCK_DEFS = {
  plank: { all: (g) => {
    noisy(g, '#c58f57', 0.14, 11);
    for (let y = 0; y < 16; y += 4) px(g, '#8d6036', 0, y + 3, 16, 1);
    [[5, 0], [12, 4], [2, 8], [9, 12]].forEach(([x, y]) => px(g, '#8d6036', x, y, 1, 3));
  } },
  carpet: { all: (g) => {
    noisy(g, '#8ea2b4', 0.1, 21);
    px(g, '#7a8ea0', 0, 0, 16, 1); px(g, '#7a8ea0', 0, 0, 1, 16);
  } },
  wall: { all: (g) => noisy(g, '#eef1f3', 0.05, 31) },
  wallBase: { all: (g) => { noisy(g, '#a9b5c1', 0.08, 41); px(g, '#8592a0', 0, 0, 16, 1); } },
  foundation: { all: (g) => {
    noisy(g, '#7a828c', 0.18, 51);
    px(g, '#5f6670', 0, 7, 16, 1); px(g, '#5f6670', 7, 0, 1, 7); px(g, '#5f6670', 3, 8, 1, 8);
  } },
  gold: { all: (g) => {
    noisy(g, '#f0bf2a', 0.12, 61);
    px(g, '#ffe27a', 0, 0, 16, 1); px(g, '#ffe27a', 0, 0, 1, 16);
    px(g, '#c4920f', 0, 15, 16, 1); px(g, '#c4920f', 15, 0, 1, 16);
    [[4, 4], [5, 3], [10, 9], [11, 10]].forEach(([x, y]) => px(g, '#fff6c8', x, y));
  } },
  window: { all: (g) => {
    px(g, '#dfe5ea', 0, 0, 16, 16);
    px(g, '#9ed3f1', 1, 1, 14, 14);
    px(g, '#dfe5ea', 7, 1, 2, 14);
    [[3, 3], [4, 4], [5, 5], [10, 3], [11, 4]].forEach(([x, y]) => px(g, '#e9f7ff', x, y));
  } },
  stone: { all: (g) => {
    noisy(g, '#9da3aa', 0.12, 71);
    px(g, '#868c94', 0, 15, 16, 1); px(g, '#868c94', 15, 0, 1, 16);
  } },
  facade: { all: (g) => {
    noisy(g, '#c9b7a3', 0.1, 81);
    px(g, '#4f6b86', 3, 4, 4, 6); px(g, '#4f6b86', 10, 4, 4, 6);
    px(g, '#ffd68a', 4, 5, 2, 2);
  } },
  pad: { all: (g) => noisy(g, '#e8772e', 0.1, 91) },
  padWhite: { all: (g) => noisy(g, '#f3f1ea', 0.05, 101) },
  sand: { all: (g) => {
    noisy(g, '#ecd59c', 0.12, 111);
    const r = mulberry32(112);
    for (let i = 0; i < 10; i++) px(g, '#d2b878', (r() * 16) | 0, (r() * 16) | 0);
  } },
  sandWet: { all: (g) => noisy(g, '#cdb27a', 0.12, 121) },
  asphalt: { all: (g) => noisy(g, '#4a4e57', 0.12, 141) },
  brick: { all: (g) => {
    noisy(g, '#b57656', 0.12, 151);
    [3, 7, 11, 15].forEach((y) => px(g, '#d9c7b4', 0, y, 16, 1));
    [[0, 3], [8, 3], [4, 7], [12, 7], [0, 11], [8, 11], [4, 15], [12, 15]].forEach(([x, y]) => px(g, '#d9c7b4', x, y - 3, 1, 3));
  } },
  water: { all: (g) => {
    noisy(g, '#3a8fd8', 0.1, 131);
    [[2, 3, 4], [9, 6, 5], [4, 11, 3], [11, 13, 4]].forEach(([x, y, w]) => px(g, '#8cc8f4', x, y, w, 1));
  }, opacity: 0.86, wrap: true },
};

const MAT_CACHE = new Map();
function blockMat(type) {
  if (MAT_CACHE.has(type)) return MAT_CACHE.get(type);
  const d = BLOCK_DEFS[type];
  const tex = canvasTex(16, 16, d.all);
  if (d.wrap) { tex.wrapS = tex.wrapT = T.RepeatWrapping; }
  const m = new T.MeshLambertMaterial({ map: tex });
  if (d.opacity) { m.transparent = true; m.opacity = d.opacity; }
  MAT_CACHE.set(type, m);
  return m;
}
function solid(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!MAT_CACHE.has(key)) MAT_CACHE.set(key, new T.MeshLambertMaterial(Object.assign({ color }, extra || {})));
  return MAT_CACHE.get(key);
}
/* 6面の材質を並べる。three.js の順は +x, -x, +y, -y, +z(正面), -z */
function faces(base, o = {}) {
  return [o.right || o.side || base, o.left || o.side || base, o.top || base, o.bottom || base, o.front || base, o.back || base];
}

/* ---------- 格子ブロック ---------- */
const UNIT = new T.BoxGeometry(1, 1, 1);
class Blocks {
  constructor() { this.cells = new Map(); this.meshes = {}; }
  set(type, x, y, z) { this.cells.set(`${x},${y},${z}`, [type, x, y, z]); return this; }
  del(x, y, z) { this.cells.delete(`${x},${y},${z}`); return this; }
  fill(type, x0, y0, z0, x1, y1, z1) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.set(type, x, y, z);
    return this;
  }
  build(parent, overrides = {}, opt = {}) {
    const groups = new Map();
    for (const c of this.cells.values()) {
      if (!groups.has(c[0])) groups.set(c[0], []);
      groups.get(c[0]).push(c);
    }
    const m = new T.Matrix4();
    for (const [type, list] of groups) {
      const mat = overrides[type] || blockMat(type);
      const mesh = new T.InstancedMesh(UNIT, mat, list.length);
      list.forEach((c, i) => { m.makeTranslation(c[1] + 0.5, c[2] + 0.5, c[3] + 0.5); mesh.setMatrixAt(i, m); });
      mesh.receiveShadow = true;
      mesh.castShadow = opt.cast !== false && !mat.transparent;
      parent.add(mesh);
      this.meshes[type] = mesh;
    }
    return this;
  }
}

/* 箱ひとつ。pos は箱の中心 */
function box(parent, size, pos, material, opt = {}) {
  const mesh = new T.Mesh(new T.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (opt.rot) mesh.rotation.set(opt.rot[0], opt.rot[1], opt.rot[2]);
  mesh.castShadow = opt.cast !== false;
  mesh.receiveShadow = opt.recv !== false;
  parent.add(mesh);
  return mesh;
}
function group(parent, pos = [0, 0, 0]) {
  const g = new T.Group();
  g.position.set(pos[0], pos[1], pos[2]);
  parent.add(g);
  return g;
}

/* ---------- 文字テクスチャ（フォント読み込み後に作る） ---------- */
const PIXEL_FONT = '"DotGothic16", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
function textTex(text, o = {}) {
  const w = o.w || 256, h = o.h || 64;
  return canvasTex(w, h, (g) => {
    px(g, o.bg || '#f2c230', 0, 0, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }
    g.fillStyle = o.fg || '#1d2333';
    g.font = `${o.size || 34}px ${PIXEL_FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  }, true);
}

/* ---------- キャラクター ---------- */
const CHAR_DEFAULT = {
  skin: '#f2c9a0', hair: '#2a211b', suit: '#2f62d6', shirt: '#ffffff', tie: '#f2c230',
  pants: '#23314f', shoe: '#17181c', long: false, glasses: false,
};
function faceTex(o, expr) {
  return canvasTex(16, 16, (g) => {
    px(g, o.skin, 0, 0, 16, 16);
    px(g, o.hair, 0, 0, 16, 4);
    px(g, o.hair, 0, 4, 2, o.long ? 12 : 4); px(g, o.hair, 14, 4, 2, o.long ? 12 : 4);
    px(g, o.hair, 4, 4, 3, 1);
    const ink = '#1d1d2b';
    if (expr === 'happy') {
      px(g, ink, 4, 9); px(g, ink, 5, 8, 2, 1); px(g, ink, 7, 9);
      px(g, ink, 9, 9); px(g, ink, 10, 8, 2, 1); px(g, ink, 12, 9);
      px(g, '#8a2b2b', 6, 12, 4, 2); px(g, '#e8646a', 7, 13, 2, 1);
    } else if (expr === 'shock') {
      px(g, '#ffffff', 4, 7, 3, 3); px(g, ink, 5, 8);
      px(g, '#ffffff', 9, 7, 3, 3); px(g, ink, 10, 8);
      px(g, '#8a2b2b', 7, 11, 2, 3);
      px(g, '#7cc4f2', 13, 5, 1, 2);
    } else if (expr === 'shades') {
      px(g, ink, 3, 7, 10, 1); px(g, ink, 3, 8, 4, 2); px(g, ink, 9, 8, 4, 2);
      px(g, '#6c7a8c', 4, 8); px(g, '#6c7a8c', 10, 8);
      px(g, '#8a2b2b', 6, 12, 4, 1); px(g, ink, 5, 11); px(g, ink, 10, 11);
    } else if (expr === 'sleepy') {
      px(g, ink, 4, 9, 3, 1); px(g, ink, 9, 9, 3, 1);
      px(g, '#8a2b2b', 7, 12, 2, 1);
    } else {
      px(g, ink, 5, 7, 2, 3); px(g, '#ffffff', 5, 7);
      px(g, ink, 9, 7, 2, 3); px(g, '#ffffff', 9, 7);
      px(g, '#8a2b2b', 6, 12, 4, 1);
    }
    if (expr !== 'shades' && expr !== 'shock') { px(g, '#f2a0a0', 3, 11); px(g, '#f2a0a0', 12, 11); }
    if (o.brows && expr !== 'shades') { px(g, o.hair, 4, 5, 3, 1); px(g, o.hair, 9, 5, 3, 1); }
    if (o.mustache) { px(g, o.mustache, 5, 11, 6, 1); px(g, o.mustache, 4, 12); px(g, o.mustache, 11, 12); }
    if (o.glasses && expr !== 'shades') {
      g.strokeStyle = '#3b3b48'; g.lineWidth = 1;
      g.strokeRect(3.5, 6.5, 5, 4); g.strokeRect(8.5, 6.5, 5, 4);
    }
  });
}
function charTextures(o) {
  const side = canvasTex(16, 16, (g) => {
    px(g, o.skin, 0, 0, 16, 16); px(g, o.hair, 0, 0, 16, 5); px(g, o.hair, 10, 5, 6, o.long ? 11 : 5);
    px(g, '#e0b088', 6, 8, 2, 3);
  });
  const back = canvasTex(16, 16, (g) => { px(g, o.hair, 0, 0, 16, 16); if (!o.long) px(g, o.skin, 0, 13, 16, 3); });
  const top = canvasTex(16, 16, (g) => noisy(g, o.hair, 0.15, 7));
  const bodyFront = canvasTex(16, 16, (g) => {
    px(g, o.suit, 0, 0, 16, 16);
    for (let y = 0; y < 7; y++) px(g, o.shirt, 8 - (7 - y) / 2 - 1, y, 7 - y + 2, 1);
    px(g, o.tie, 7, 1, 2, 9); px(g, o.tie, 6, 1, 4, 2);
    px(g, '#1d2333', 7, 11, 2, 1);
    px(g, '#00000022', 0, 14, 16, 2);
  });
  const bodyBack = canvasTex(16, 16, (g) => { px(g, o.suit, 0, 0, 16, 16); px(g, '#0000001a', 7, 4, 2, 12); });
  const arm = canvasTex(16, 16, (g) => { px(g, o.suit, 0, 0, 16, 16); px(g, o.shirt, 0, 11, 16, 1); px(g, o.skin, 0, 12, 16, 4); });
  const leg = canvasTex(16, 16, (g) => { px(g, o.pants, 0, 0, 16, 16); px(g, o.shoe, 0, 12, 16, 4); });
  return { side, back, top, bodyFront, bodyBack, arm, leg };
}
const lam = (tex) => new T.MeshLambertMaterial({ map: tex });

function makeChar(opts = {}) {
  const o = Object.assign({}, CHAR_DEFAULT, opts);
  const tx = charTextures(o);
  const root = new T.Group();
  const part = (size, pivot, offset, mats) => {
    const p = new T.Group();
    p.position.set(pivot[0], pivot[1], pivot[2]);
    const m = new T.Mesh(new T.BoxGeometry(size[0], size[1], size[2]), mats);
    m.position.set(offset[0], offset[1], offset[2]);
    m.castShadow = true; m.receiveShadow = true;
    p.add(m); root.add(p);
    p.mesh = m;
    return p;
  };
  const faceMats = {};
  ['normal', 'happy', 'shock', 'shades', 'sleepy'].forEach((e) => { faceMats[e] = lam(faceTex(o, e)); });
  const skin = solid(o.skin), suit = solid(o.suit);
  const sideM = lam(tx.side);
  const headMats = [sideM, sideM, lam(tx.top), skin, faceMats.normal, lam(tx.back)];
  const armM = lam(tx.arm), legM = lam(tx.leg);
  const ch = {
    root,
    legL: part([0.27, 0.5, 0.3], [-0.15, 0.5, 0], [0, -0.25, 0], faces(legM, { top: solid(o.pants), bottom: solid(o.shoe) })),
    legR: part([0.27, 0.5, 0.3], [0.15, 0.5, 0], [0, -0.25, 0], faces(legM, { top: solid(o.pants), bottom: solid(o.shoe) })),
    body: part([0.62, 0.6, 0.36], [0, 0.5, 0], [0, 0.3, 0], faces(suit, { front: lam(tx.bodyFront), back: lam(tx.bodyBack) })),
    armL: part([0.22, 0.6, 0.22], [-0.42, 1.06, 0], [0, -0.27, 0], faces(armM, { top: suit, bottom: skin })),
    armR: part([0.22, 0.6, 0.22], [0.42, 1.06, 0], [0, -0.27, 0], faces(armM, { top: suit, bottom: skin })),
    head: part([0.64, 0.64, 0.64], [0, 1.1, 0], [0, 0.32, 0], headMats),
    setFace(e) { headMats[4] = faceMats[e] || faceMats.normal; },
  };
  return ch;
}
function addChar(parent, opts, pos = [0, 0, 0], rotY = 0) {
  const c = makeChar(opts);
  c.home = { pos: pos.slice(), rotY, scale: opts.scale || 1 };
  parent.add(c.root);
  reset(c);
  return c;
}

/* ---------- ポーズ ---------- */
function reset(c) {
  ['head', 'body', 'armL', 'armR', 'legL', 'legR'].forEach((k) => c[k].rotation.set(0, 0, 0));
  c.root.position.set(c.home.pos[0], c.home.pos[1], c.home.pos[2]);
  c.root.rotation.set(0, c.home.rotY, 0);
  c.root.scale.setScalar(c.home.scale);
  c.root.visible = true;
  c.setFace('normal');
}
function walk(c, ph, amp = 0.7) {
  const s = Math.sin(ph);
  c.legL.rotation.x = s * amp; c.legR.rotation.x = -s * amp;
  c.armL.rotation.x = -s * amp * 0.8; c.armR.rotation.x = s * amp * 0.8;
  c.root.position.y += Math.abs(Math.cos(ph)) * 0.05;
}
function sit(c) { c.legL.rotation.x = c.legR.rotation.x = -Math.PI / 2; }
function typing(c, t, speed = 22, amp = 0.12) {
  c.armL.rotation.x = -1.2 + Math.sin(t * speed) * amp;
  c.armR.rotation.x = -1.2 + Math.sin(t * speed + 1.7) * amp;
  c.head.rotation.x = 0.14 + Math.sin(t * 3) * 0.03;
}
function banzai(c, k = 1, wob = 0) {
  c.armL.rotation.z = -2.7 * k - wob;
  c.armR.rotation.z = 2.7 * k + wob;
}

/* ---------- 小物 ---------- */
const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
};
function voxelDigit(parent, d, cube, mat) {
  const g = group(parent);
  DIGITS[d].forEach((row, y) => [...row].forEach((v, x) => {
    if (v === '1') box(g, [cube, cube, cube], [(x - 1) * cube, (2 - y) * cube, 0], mat);
  }));
  return g;
}
function gradientTex(top, bottom) {
  const tex = canvasTex(2, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  }, true);
  tex.userData = { top, bottom };
  return tex;
}
function repaintGradient(tex, top, bottom) {
  const g = tex.image.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  tex.needsUpdate = true;
}
function newScene(o = {}) {
  const s = new T.Scene();
  const sky = o.sky || ['#a9d8f0', '#eaf6fb'];
  s.background = gradientTex(sky[0], sky[1]);
  const hemi = new T.HemisphereLight(o.hemiSky || '#ffffff', o.hemiGround || '#b8a88c', o.amb == null ? 0.72 : o.amb);
  s.add(hemi);
  const dir = new T.DirectionalLight(o.sunColor || '#ffffff', o.sunI == null ? 0.55 : o.sunI);
  const sp = o.sun || [7, 12, 8];
  dir.position.set(sp[0], sp[1], sp[2]);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  const sc = dir.shadow.camera;
  sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 50;
  dir.shadow.bias = -0.0015;
  dir.shadow.normalBias = 0.02;
  s.add(dir); s.add(dir.target);
  s.userData = { hemi, dir };
  if (o.fog) s.fog = new T.Fog(o.fog[0], o.fog[1], o.fog[2]);
  return s;
}

const V = {
  T, clamp, lerp, prog, ease, mulberry32, mixHex, canvasTex, px, noisy, blockMat, solid, faces,
  Blocks, box, group, textTex, makeChar, addChar, reset, walk, sit, typing, banzai,
  voxelDigit, gradientTex, repaintGradient, newScene, PIXEL_FONT,
};
