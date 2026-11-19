// crack リール 3D版。three.js でブロックの部屋とキャラを組み、時刻 t のコマを描く。
// render3d.cjs が headless Chromium から renderFrame(slug, t) を呼んで1コマずつ受け取る。
'use strict';

const W = 360, H = 640, FW = 1080, FH = 1920;
const T_HOOK = 2.5, T_PROB = 6.5;
const STORY_END = T_HOOK + T_PROB;
// あるあるで終わる流れ：あるある 9.0秒 → ヒビ 0.6秒 → ブロックが崩れて crack ロゴ 4.5秒
const G_HIT = STORY_END, G_LOGO = G_HIT + 0.6, TOTAL3 = G_LOGO + 4.5;
const RAINBOW = [[236, 120, 200], [160, 130, 235], [70, 150, 240], [60, 200, 220], [130, 225, 170], [250, 235, 140]];
let NO_BUBBLES = false;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = p => 1 - Math.pow(1 - p, 3);
const smooth = p => p * p * (3 - 2 * p);
const back = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const lerp = (a, b, p) => a + (b - a) * p;
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const col = c => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255);
const shade = (c, k) => c.map(v => Math.round(clamp(v * k, 0, 255)));
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; }
function px(g, x, y, w, h, c) { g.fillStyle = rgb(c); g.fillRect(x, y, w, h); }
const lam = (c, map) => new THREE.MeshLambertMaterial(map ? { map } : { color: col(c) });
const basic = (c, map, extra = {}) => new THREE.MeshBasicMaterial(Object.assign(map ? { map } : { color: col(c) }, extra));

let renderer, scene, camera, hemi, dirL, out, ui, glc;
const ALL = [];      // reset のたびに隠すもの
let UIQ = [];        // 3Dを描いたあとに重ねる2D

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = null, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
  (parent || scene).add(m); return m;
}
function plane(w, h, mat, x, y, z, parent = null) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.receiveShadow = true; (parent || scene).add(m); return m;
}
function group(parent = null, hide = true) { const g = new THREE.Group(); (parent || scene).add(g); if (hide) ALL.push(g); return g; }

// ------------------------------------------------------------------ 初期化
function initGL() {
  glc = mk(FW, FH);
  renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(FW, FH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  scene = new THREE.Scene(); scene.background = col([24, 22, 34]);
  camera = new THREE.PerspectiveCamera(50, FW / FH, 0.1, 100);
  hemi = new THREE.HemisphereLight(0xffffff, 0x8a6a50, 0.65); scene.add(hemi);
  dirL = new THREE.DirectionalLight(0xffffff, 0.75); dirL.position.set(4, 10, 8); dirL.castShadow = true;
  const sc = dirL.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 10; sc.bottom = -6; sc.near = 1; sc.far = 40;
  dirL.shadow.mapSize.set(1536, 1536); dirL.shadow.bias = -0.0015; scene.add(dirL);
  out = mk(FW, FH); ui = out.getContext('2d');
}

// ------------------------------------------------------------------ 部屋
const OF = {};
function wallCanvas(seed, base, line) {
  const c = mk(32, 32), g = c.getContext('2d'), r = rng(seed);
  for (let by = 0; by < 32; by += 16) for (let bx = 0; bx < 32; bx += 16) {
    const j = (r() * 20 - 10) | 0;
    px(g, bx, by, 16, 16, base.map(v => v + j));
    for (let k = 0; k < 6; k++) px(g, bx + ((r() * 14) | 0), by + ((r() * 14) | 0), 2, 2, base.map(v => v + j - 12));
    px(g, bx, by + 15, 16, 1, line); px(g, bx + 15, by, 1, 16, line);
  }
  return c;
}
function buildOffice() {
  const wc = wallCanvas(7, [205, 186, 150], [176, 158, 126]);
  const mkRep = (c, rx, ry) => { const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
  plane(10, 10, lam(null, mkRep(wc, 5, 5)), 0, 5, -3);
  const lw = plane(14, 10, lam(null, mkRep(wc, 7, 5)), -5, 5, 4); lw.rotation.y = Math.PI / 2;
  const rw = plane(14, 10, lam(null, mkRep(wc, 7, 5)), 5, 5, 4); rw.rotation.y = -Math.PI / 2;
  const fc = mk(32, 32), fg = fc.getContext('2d'), r = rng(3);
  for (let y = 0; y < 32; y += 8) {
    const off = (y / 8) % 2 * 16;
    for (let x = -16; x < 32; x += 32) {
      const j = (r() * 24 - 12) | 0;
      px(fg, x + off, y, 32, 8, [146 + j, 98 + j, 58 + j]);
      px(fg, x + off, y + 7, 32, 1, [100, 66, 40]); px(fg, x + off + 31, y, 1, 8, [100, 66, 40]);
    }
  }
  const fl = plane(10, 14, lam(null, mkRep(fc, 5, 7)), 0, 0, 4); fl.rotation.x = -Math.PI / 2;
  box(10, 0.25, 0.1, lam([110, 80, 50]), 0, 0.125, -2.95, null, false);
  // 窓
  OF.win = group(null, false); OF.win.position.set(-2.3, 4.1, -2.95);
  box(2.1, 1.7, 0.1, lam([240, 240, 240]), 0, 0, 0, OF.win, false);
  OF.sky = basic([130, 200, 250]); plane(1.8, 1.4, OF.sky, 0, 0, 0.06, OF.win);
  box(0.1, 1.4, 0.1, lam([240, 240, 240]), 0, 0, 0.1, OF.win, false);
  box(1.8, 0.1, 0.1, lam([240, 240, 240]), 0, 0, 0.1, OF.win, false);
  OF.stars = group(OF.win, false);
  [[-0.6, 0.4], [-0.2, 0.2], [0.5, 0.45], [0.7, -0.3], [-0.5, -0.4], [0.2, -0.5]].forEach(([x, y]) => box(0.05, 0.05, 0.02, basic([255, 250, 200]), x, y, 0.08, OF.stars, false));
  // 時計
  OF.clock = group(null, false); OF.clock.position.set(2.2, 4.6, -2.95);
  box(1.7, 0.7, 0.12, lam([60, 60, 70]), 0, 0, 0, OF.clock, false);
  OF.clockC = mk(96, 32); OF.clockT = tex(OF.clockC); OF.clockS = null;
  plane(1.5, 0.5, basic(null, OF.clockT), 0, 0, 0.07, OF.clock);
  // クモの巣
  const webC = mk(64, 64), wg = webC.getContext('2d');
  wg.strokeStyle = 'rgba(240,240,240,0.9)'; wg.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) { const a = (5 + k * 20) * Math.PI / 180; wg.beginPath(); wg.moveTo(0, 0); wg.lineTo(64 * Math.cos(a), 64 * Math.sin(a)); wg.stroke(); }
  for (let rr = 12; rr < 64; rr += 12) { wg.beginPath(); for (let k = 0; k < 5; k++) { const a = (5 + k * 20) * Math.PI / 180; const f = k ? 'lineTo' : 'moveTo'; wg[f](rr * Math.cos(a), rr * Math.sin(a)); } wg.stroke(); }
  const wt = new THREE.CanvasTexture(webC);
  const webMat = basic([255, 255, 255], wt, { transparent: true });
  const wgeo = new THREE.PlaneGeometry(1.8, 1.8); wgeo.translate(0.9, -0.9, 0);
  OF.webL = new THREE.Mesh(wgeo, webMat); OF.webL.position.set(-4.95, 6.6, -2.94); scene.add(OF.webL);
  OF.webR = new THREE.Mesh(wgeo, webMat); OF.webR.position.set(4.95, 6.6, -2.94); scene.add(OF.webR);
  // 机
  OF.desks = [0, 1, 2].map(() => makeDesk());
}
function makeDesk() {
  const g = group();
  const top = lam([176, 120, 68]), front = lam([128, 84, 48]);
  box(1.9, 0.12, 0.9, top, 0, 1.15, 0, g);
  box(1.9, 1.1, 0.06, front, 0, 0.55, 0.42, g);
  box(0.06, 1.1, 0.86, front, -0.92, 0.55, 0, g); box(0.06, 1.1, 0.86, front, 0.92, 0.55, 0, g);
  box(0.1, 0.22, 0.1, lam([80, 80, 90]), 0.75, 1.32, -0.05, g);
  box(0.85, 0.52, 0.07, lam([80, 80, 90]), 0.75, 1.62, -0.05, g);
  const scr = basic([90, 190, 255]); const s = plane(0.75, 0.42, scr, 0.75, 1.62, -0.09, g); s.rotation.y = Math.PI;
  box(0.6, 0.04, 0.22, lam([60, 60, 66]), -0.15, 1.23, -0.15, g);
  return { g, scr };
}
function setClock(s) {
  OF.clock.visible = !!s;
  if (!s || s === OF.clockS) return;
  const g = OF.clockC.getContext('2d');
  px(g, 0, 0, 96, 32, [10, 20, 10]); g.font = '16px uni'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgb(90,255,120)'; g.fillText(s, 48, 17); OF.clockS = s; OF.clockT.needsUpdate = true;
}
function office(hour, clock, webs = 0, opt = {}) {
  setClock(clock);
  OF.win.visible = !opt.noWindow;
  const sky = hour < 17 ? [130, 200, 250] : hour < 18.5 ? [250, 170, 110] : hour < 19.5 ? [130, 90, 160] : [25, 25, 60];
  OF.sky.color = col(sky); OF.stars.visible = hour >= 19.5;
  if (hour < 17) { hemi.color.set(0xffffff); hemi.intensity = 0.66; dirL.color.set(0xfff2dd); dirL.intensity = 0.72; }
  else if (hour < 18.5) { hemi.color.set(0xfff0e0); hemi.intensity = 0.6; dirL.color.set(0xffaa66); dirL.intensity = 0.8; }
  else if (hour < 19.5) { hemi.color.set(0xc8b8e0); hemi.intensity = 0.62; dirL.color.set(0xb0a0d8); dirL.intensity = 0.55; }
  else { hemi.color.set(0x9aa4dc); hemi.intensity = 0.62; dirL.color.set(0xa0acff); dirL.intensity = 0.42; }
  OF.webL.visible = OF.webR.visible = webs > 0.01;
  const ws = Math.max(0.01, webs); OF.webL.scale.set(ws, ws, 1); OF.webR.scale.set(-ws, ws, 1);
  OF.night = hour >= 19.5;
}
function showDesk(i, x, z = 0.85) {
  const d = OF.desks[i]; d.g.visible = true; d.g.position.set(x, 0, z);
  d.scr.color = col(OF.night ? [120, 170, 255] : [90, 190, 255]);
}

// ------------------------------------------------------------------ キャラクター
const SPECS = {
  T: { skin: [242, 202, 162], hair: [96, 62, 30], shirt: [64, 112, 204], pants: [44, 44, 84] },
  M: { skin: [250, 212, 178], hair: [36, 30, 30], shirt: [72, 172, 92], pants: [52, 52, 64], long: true },
  B: { skin: [232, 190, 150], hair: [150, 150, 156], shirt: [236, 236, 236], pants: [62, 62, 70], tie: [206, 44, 44], glasses: true },
  S: { skin: [236, 196, 156], hair: [236, 236, 236], shirt: [46, 46, 60], pants: [36, 36, 46], tie: [240, 196, 40] },
};
const CH = {};
const DARK = [40, 30, 30];
function faceCanvas(sp, expr, look) {
  const c = mk(16, 16), g = c.getContext('2d');
  px(g, 0, 0, 16, 16, sp.skin);
  px(g, 0, 0, 16, 3, sp.hair); px(g, 0, 3, 2, 3, sp.hair); px(g, 14, 3, 2, 3, sp.hair);
  for (const ex of [2, 10]) {
    if (expr === 'happy') { px(g, ex, 8, 1, 1, DARK); px(g, ex + 1, 7, 2, 1, DARK); px(g, ex + 3, 8, 1, 1, DARK); }
    else if (expr === 'tired') { px(g, ex, 8, 4, 1, DARK); px(g, ex, 9, 4, 1, [176, 130, 150]); }
    else if (expr === 'shock') { px(g, ex, 6, 4, 4, [255, 255, 255]); px(g, ex + 1, 7, 2, 2, DARK); }
    else { px(g, ex, 7, 4, 2, [255, 255, 255]); px(g, ex + (look > 0 ? 2 : look < 0 ? 0 : 1), 7, 2, 2, DARK); }
    if (sp.glasses) { g.strokeStyle = 'rgb(30,30,30)'; g.lineWidth = 1; g.strokeRect(ex - 0.5, 5.5, 5, 5); }
  }
  if (sp.glasses) px(g, 7, 7, 2, 1, [30, 30, 30]);
  if (expr === 'happy') { px(g, 5, 11, 6, 2, [150, 40, 40]); px(g, 6, 12, 4, 1, [230, 110, 110]); }
  else if (expr === 'shock') px(g, 7, 11, 2, 3, [80, 20, 20]);
  else if (expr === 'tired') px(g, 6, 12, 4, 1, [120, 60, 50]);
  else px(g, 6, 11, 4, 1, [120, 60, 50]);
  return c;
}
function makeChar(key) {
  const sp = SPECS[key];
  const g = group();
  const pants = lam(sp.pants), shoe = lam([50, 40, 36]), skin = lam(sp.skin), hairM = lam(sp.hair), sh = lam(sp.shirt), arm = lam(shade(sp.shirt, 0.9));
  const legL = group(g, false); legL.position.set(-0.2, 0.8, 0);
  const legR = group(g, false); legR.position.set(0.2, 0.8, 0);
  for (const L of [legL, legR]) { box(0.38, 0.8, 0.4, pants, 0, -0.4, 0, L); box(0.4, 0.14, 0.46, shoe, 0, -0.73, 0.03, L); }
  const bc = mk(16, 20), bg = bc.getContext('2d');
  px(bg, 0, 0, 16, 20, sp.shirt); px(bg, 6, 0, 4, 2, shade(sp.shirt, 0.8));
  if (sp.tie) { px(bg, 6, 0, 4, 2, sp.tie); px(bg, 7, 2, 2, 11, sp.tie); }
  else { px(bg, 7, 2, 1, 1, shade(sp.shirt, 0.75)); px(bg, 7, 6, 1, 1, shade(sp.shirt, 0.75)); px(bg, 7, 10, 1, 1, shade(sp.shirt, 0.75)); }
  px(bg, 0, 18, 16, 2, shade(sp.pants, 0.9));
  box(0.8, 1.0, 0.42, [sh, sh, sh, sh, lam(null, tex(bc)), sh], 0, 1.3, 0, g);
  const armL = group(g, false); armL.position.set(-0.59, 1.75, 0);
  const armR = group(g, false); armR.position.set(0.59, 1.75, 0);
  for (const A of [armL, armR]) { box(0.34, 0.72, 0.36, arm, 0, -0.36, 0, A); box(0.32, 0.24, 0.34, skin, 0, -0.84, 0, A); }
  const head = group(g, false); head.position.set(0, 1.8, 0);
  const sc = mk(16, 16), sg = sc.getContext('2d'); px(sg, 0, 0, 16, 16, sp.skin); px(sg, 0, 0, 16, 5, sp.hair);
  const side = lam(null, tex(sc));
  const faceMat = lam(null, tex(faceCanvas(sp, 'n', 0)));
  box(0.8, 0.8, 0.8, [side, side, hairM, skin, faceMat, hairM], 0, 0.4, 0, head);
  if (sp.long) box(0.88, 1.0, 0.24, hairM, 0, 0.18, -0.34, head);
  const sweat = box(0.12, 0.22, 0.06, basic([120, 190, 255]), 0.52, 0.62, 0.25, head, false);
  const gc = mk(16, 16), gg = gc.getContext('2d'); px(gg, 0, 0, 16, 16, [236, 120, 160]); px(gg, 7, 0, 2, 16, [250, 230, 120]); px(gg, 0, 7, 16, 2, [250, 230, 120]);
  const gm = lam(null, tex(gc));
  const gift = box(0.78, 0.52, 0.46, gm, 0, 1.32, 0.5, g);
  const stamp = group(armR, false);
  box(0.16, 0.32, 0.16, lam([170, 120, 70]), 0, -1.08, 0, stamp); box(0.28, 0.14, 0.28, lam([210, 40, 40]), 0, -1.28, 0, stamp);
  return { g, legL, legR, armL, armR, head, faceMat, sp, sweat, gift, stamp, faces: {} };
}
function pose(ch, o) {
  ch.g.visible = true;
  ch.g.position.set(o.x, o.y || 0, o.z || 0); ch.g.rotation.y = o.ry || 0;
  const la = o.walk != null ? Math.sin(o.walk) * 0.7 : 0;
  ch.legL.rotation.x = la; ch.legR.rotation.x = -la;
  let aL = [-la * 0.8, 0], aR = [la * 0.8, 0];
  if (o.typing != null) { aL = [-1.15 + 0.12 * Math.sin(o.typing), 0]; aR = [-1.15 + 0.12 * Math.sin(o.typing + Math.PI), 0]; }
  if (o.hold === 'box') { aL = [-1.0, 0]; aR = [-1.0, 0]; }
  if (o.arm === 1) aR = [-Math.PI * 0.92, 0];
  if (o.arm === 2) { aL = [0, -2.6]; aR = [0, 2.6]; }
  if (o.arm === 3) aR = [-Math.PI / 2, 0];
  ch.armL.rotation.set(aL[0], 0, aL[1]); ch.armR.rotation.set(aR[0], 0, aR[1]);
  ch.head.rotation.set(o.nod || 0, (o.look || 0) * 0.5, 0);
  const key = (o.expr || 'n') + (o.look || 0);
  if (!ch.faces[key]) ch.faces[key] = tex(faceCanvas(ch.sp, o.expr || 'n', o.look || 0));
  ch.faceMat.map = ch.faces[key];
  ch.sweat.visible = !!o.sweat; ch.gift.visible = o.hold === 'box'; ch.stamp.visible = o.hold === 'stamp';
}
function headTop(ch, dy = 0) { return new THREE.Vector3(ch.g.position.x, ch.g.position.y + 2.75 + dy, ch.g.position.z); }
function walkPath(pts, speed, t0, t) {
  let d = Math.max(0, (t - t0) * speed);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az);
    if (d <= L) { const p = d / L; return { x: lerp(ax, bx, p), z: lerp(az, bz, p), ry, walk: t * 12, moving: t > t0 }; }
    d -= L;
  }
  const n = pts.length - 1, [ax, az] = pts[n - 1], [bx, bz] = pts[n];
  return { x: bx, z: bz, ry: Math.atan2(bx - ax, bz - az), walk: null, moving: false, done: true };
}

// ------------------------------------------------------------------ ヒビ丸
let HIBI;
function makeHibi() {
  const g = group();
  const rc = mk(16, 16), rg = rc.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(rg, x, y, 1, 1, RAINBOW[Math.floor((x + y) / 32 * 6 * 1.0) % 6]);
  const fc = mk(16, 16), fg = fc.getContext('2d'); fg.drawImage(rc, 0, 0);
  px(fg, 3, 5, 3, 5, [0, 0, 0]); px(fg, 10, 5, 3, 5, [0, 0, 0]); px(fg, 4, 6, 1, 1, [255, 255, 255]); px(fg, 11, 6, 1, 1, [255, 255, 255]);
  px(fg, 6, 12, 4, 1, [0, 0, 0]);
  fg.strokeStyle = '#fff'; fg.lineWidth = 1; fg.beginPath(); fg.moveTo(9.5, 0); fg.lineTo(12.5, 3); fg.lineTo(10.5, 4); fg.lineTo(14.5, 8); fg.stroke();
  const rm = basic(null, tex(rc)), fm = basic(null, tex(fc));
  const body = box(0.9, 0.9, 0.9, [rm, rm, rm, rm, fm, rm], 0, 0, 0, g);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: 0x000000 }));
  g.add(edges);
  const pick = group(g, false); pick.position.set(0.52, -0.15, 0.1);
  box(0.09, 1.15, 0.09, lam([150, 100, 56]), 0, 0.55, 0, pick);
  box(0.95, 0.15, 0.15, basic([225, 230, 255]), 0, 1.12, 0, pick);
  box(0.2, 0.2, 0.2, basic([200, 205, 240]), 0, 1.12, 0, pick);
  const spark = group(g, false);
  for (let k = 0; k < 4; k++) box(0.1, 0.1, 0.1, basic(RAINBOW[k]), Math.cos(k * Math.PI / 2) * 0.85, Math.sin(k * Math.PI / 2) * 0.85, 0, spark, false);
  HIBI = { g, pick, spark };
}
function hibi(x, y, z, t, pickX = -0.3, pickZ = -0.5) {
  HIBI.g.visible = true; HIBI.g.position.set(x, y, z);
  HIBI.g.rotation.set(0, 0.25 * Math.sin(t * 2.2), 0);
  HIBI.pick.rotation.set(pickX, 0, pickZ);
  HIBI.spark.rotation.z = t * 3;
}

// ------------------------------------------------------------------ 小道具
const P = {};
function labelCanvas(w, h, bg, lines, fg = [255, 255, 255], border = null) {
  const c = mk(w, h), g = c.getContext('2d'); px(g, 0, 0, w, h, bg);
  if (border) { g.strokeStyle = rgb(border); g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
  g.font = '16px uni'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.fillStyle = rgb(l[1] || fg); g.fillText(l[0], w / 2, h / 2 + (i - (lines.length - 1) / 2) * 18 + 1); });
  return c;
}
function buildProps() {
  // 第1話：おさきボタン、バナー、ドア
  P.ped = group(); P.ped.position.set(-0.5, 0, 2.3);
  const pf = lam(null, tex(labelCanvas(48, 32, [120, 120, 130], [['おさき']])));
  const pg = lam([120, 120, 130]);
  box(1.0, 1.0, 0.7, [pg, pg, lam([160, 160, 170]), pg, pf, pg], 0, 0.5, 0, P.ped);
  P.btn = box(0.5, 0.2, 0.4, lam([225, 40, 40]), 0, 1.1, 0, P.ped);
  P.banner = plane(3.2, 0.8, lam(null, tex(labelCanvas(160, 40, [255, 240, 170], [['本日のヒーロー', [180, 60, 40]], ['ツミキ 18:01 退勤', [0, 0, 0]]], null, [200, 140, 40]))), -1.3, 4.3, -2.93);
  ALL.push(P.banner);
  P.door = group(); P.door.position.set(2.0, 0, -2.95);
  box(1.45, 2.45, 0.08, lam([90, 58, 34]), 0, 1.22, 0, P.door, false);
  plane(1.2, 2.2, basic([12, 10, 14]), 0, 1.12, 0.05, P.door);
  P.hinge = group(P.door, false); P.hinge.position.set(-0.6, 0, 0.08);
  box(1.2, 2.2, 0.08, lam([150, 100, 58]), 0.6, 1.12, 0, P.hinge);
  box(0.1, 0.1, 0.1, lam([230, 200, 90]), 1.05, 1.1, 0.07, P.hinge);
  // 第2話：おみやげの塔、ステージ、写真ボード
  P.stack = group(); P.boxes = [];
  const BC = [[236, 120, 160], [120, 170, 240], [250, 200, 90], [140, 210, 140], [200, 140, 230], [240, 150, 90]];
  for (let k = 0; k < 14; k++) {
    const cc = mk(16, 8), cg = cc.getContext('2d'); px(cg, 0, 0, 16, 8, BC[k % 6]); px(cg, 7, 0, 2, 8, [250, 240, 200]); px(cg, 0, 7, 16, 1, shade(BC[k % 6], 0.75));
    const m = lam(null, tex(cc)); const tm = lam(BC[k % 6]);
    P.boxes.push(box(0.95, 0.45, 0.7, [m, m, tm, tm, m, m], 0, 0, 0, P.stack));
  }
  P.stage = group(); P.stage.position.set(-1.3, 0, 0.6);
  const stf = lam(null, tex(labelCanvas(96, 16, [150, 100, 58], [['1分トーク']])));
  const stw = lam([150, 100, 58]);
  box(2.4, 0.35, 1.6, [stw, stw, lam([190, 140, 80]), stw, stf, stw], 0, 0.175, 0, P.stage);
  P.photoC = mk(128, 84); P.photoT = tex(P.photoC);
  P.photo = group(); box(2.7, 1.8, 0.08, lam([250, 250, 250]), 0, 0, 0, P.photo, false);
  plane(2.5, 1.64, basic(null, P.photoT), 0, 0, 0.05, P.photo);
  // 第3話：稟議書ボード、ミニハンコ
  P.boardC = mk(300, 190); P.boardT = tex(P.boardC);
  P.board = group(); P.board.position.set(0, 3.9, -2.92);
  box(5.7, 3.7, 0.1, lam([90, 70, 50]), 0, 0, 0, P.board, false);
  plane(5.4, 3.42, basic(null, P.boardT), 0, 0, 0.06, P.board);
  P.minis = [0, 1, 2].map(() => {
    const g = group();
    const fc = mk(8, 8), fg = fc.getContext('2d'); px(fg, 0, 0, 8, 8, [210, 40, 40]); px(fg, 1, 3, 2, 2, [255, 255, 255]); px(fg, 5, 3, 2, 2, [255, 255, 255]); px(fg, 3, 6, 2, 1, [120, 20, 20]);
    const rm = lam([210, 40, 40]);
    box(0.42, 0.42, 0.42, [rm, rm, rm, rm, lam(null, tex(fc)), rm], 0, 0.21, 0, g);
    box(0.16, 0.34, 0.16, lam([170, 120, 70]), 0, 0.59, 0, g);
    return g;
  });
  // 紙吹雪
  P.conf = group(); P.confBits = [];
  for (let i = 0; i < 70; i++) P.confBits.push(box(0.09, 0.05, 0.09, basic(RAINBOW[i % 6]), 0, 0, 0, P.conf, false));
}
function confetti(o, t, seed = 3) {
  if (t <= 0) return;
  P.conf.visible = true; const r = rng(seed);
  P.confBits.forEach((b, i) => {
    const vx = (r() - 0.5) * 5, vy = 3 + r() * 4, vz = (r() - 0.2) * 4;
    b.position.set(o[0] + vx * t, o[1] + vy * t - 4.9 * t * t, o[2] + vz * t);
    b.rotation.set(t * (3 + i % 5), t * 4, t * 2);
    b.visible = b.position.y > 0;
  });
}
function drawPhoto(t) {
  const g = P.photoC.getContext('2d');
  px(g, 0, 0, 128, 84, [150, 210, 250]); px(g, 0, 50, 128, 34, [110, 180, 110]);
  g.fillStyle = rgb([120, 120, 140]); g.beginPath(); g.moveTo(16, 56); g.lineTo(54, 14); g.lineTo(92, 56); g.fill();
  px(g, 46, 14, 16, 8, [255, 255, 255]);
  px(g, 70, 58, 52, 20, [120, 200, 230]);
  for (let k = 0; k < 3; k++) px(g, 78 + k * 14, 46 - ((t * 20 + k * 6) % 18), 4, 6, [240, 240, 240]);
  px(g, 84, 50, 18, 16, [150, 100, 60]); px(g, 87, 54, 12, 10, [240, 190, 160]);
  px(g, 89, 57, 2, 2, [0, 0, 0]); px(g, 95, 57, 2, 2, [0, 0, 0]);
  P.photoT.needsUpdate = true;
}
const SLOTS = ['社長', '本部長', '部長', '課長', '担当'];
function drawStamp(g, cx, cy, s, ang) {
  g.save(); g.translate(cx, cy); g.rotate(-ang * Math.PI / 180);
  g.strokeStyle = 'rgb(210,40,40)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgb(210,40,40)'; g.font = '16px uni'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 1);
  g.restore();
}
function drawPaper(stamps, t, extra) {
  const g = P.boardC.getContext('2d');
  px(g, 0, 0, 300, 190, [252, 250, 240]);
  g.font = '16px uni'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText('稟議書 No.128', 150, 20);
  SLOTS.forEach((s, i) => {
    const x0 = 20 + i * 54;
    g.strokeStyle = 'rgb(60,60,60)'; g.lineWidth = 2; g.strokeRect(x0, 40, 50, 72); g.beginPath(); g.moveTo(x0, 61); g.lineTo(x0 + 50, 61); g.stroke();
    g.fillStyle = '#000'; g.fillText(s, x0 + 25, 51);
  });
  for (let i = 0; i < 4; i++) px(g, 22, 128 + i * 14, 248 - (i % 2) * 50, 6, [200, 200, 200]);
  for (const slot in stamps) {
    const [s, ang, t0] = stamps[slot];
    if (t < t0) continue;
    const k = back(clamp((t - t0) * 4)); const sc = k < 1 ? 2 - k : 1;
    const x0 = 20 + SLOTS.indexOf(slot) * 54 + 25;
    g.save(); g.translate(x0, 88); g.scale(sc, sc); drawStamp(g, 0, 0, s, ang); g.restore();
  }
  if (extra) extra(g);
  P.boardT.needsUpdate = true;
}
function drawScreen(t) {
  const g = P.boardC.getContext('2d');
  px(g, 0, 0, 300, 190, [24, 34, 60]);
  g.font = '16px uni'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgb(180,200,240)'; g.fillText('稟議 No.128', 150, 22);
  const done = t > 1.0, pr = (t >= 0.8 && t < 1.2) ? 3 : 0;
  px(g, 80, 60 + pr, 140, 50, done ? [90, 90, 110] : [60, 190, 110]);
  if (!pr) px(g, 80, 106, 140, 4, done ? [60, 60, 80] : [30, 120, 70]);
  g.fillStyle = '#fff'; g.fillText(done ? '承認済み ✓' : '承認する', 150, 85 + pr);
  P.boardT.needsUpdate = true;
}

// ------------------------------------------------------------------ 2D の重ね描き
function U(f) { UIQ.push(f); }
function proj(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function txt(s, x, y, size, fill, ol = [0, 0, 0], ow = 1, align = 'center', base = 'middle') {
  ui.font = `${size}px uni`; ui.textAlign = align; ui.textBaseline = base;
  if (ol) { ui.fillStyle = rgb(ol); for (let dx = -ow; dx <= ow; dx++) for (let dy = -ow; dy <= ow; dy++) if (dx || dy) ui.fillText(s, x + dx, y + dy); }
  ui.fillStyle = rgb(fill); ui.fillText(s, x, y);
}
function typeLine(cx, y, s, size, n, ow) {
  if (n <= 0) return; ui.font = `${size}px uni`;
  const x0 = cx - ui.measureText(s).width / 2;
  txt([...s].slice(0, n).join(''), x0, y, size, [255, 255, 255], [0, 0, 0], ow, 'left');
}
function bubble(x, y, s, p = 1, think = false) {
  if (NO_BUBBLES || p <= 0) return;
  const lines = s.split('\n'); ui.font = '16px uni';
  const w = Math.max(...lines.map(l => ui.measureText(l).width)) + 14, h = lines.length * 18 + 8;
  y = Math.max(y, 170 + h);
  const x0 = Math.round(clamp(x - w / 2, 4, W - 4 - w)), y0 = Math.round(y - h);
  if (think) for (const [dx, dy, r] of [[0, 4, 3], [3, 11, 2]]) { px(ui, x + dx - r - 1, y + dy - r - 1, 2 * r + 2, 2 * r + 2, [0, 0, 0]); px(ui, x + dx - r, y + dy - r, 2 * r, 2 * r, [255, 255, 255]); }
  px(ui, x0, y0, w, h, [0, 0, 0]); px(ui, x0 + 2, y0 + 2, w - 4, h - 4, [255, 255, 255]);
  if (!think) {
    const tx = clamp(x, x0 + 8, x0 + w - 8);
    ui.fillStyle = '#000'; ui.beginPath(); ui.moveTo(tx - 7, y - 2); ui.lineTo(tx + 5, y - 2); ui.lineTo(tx - 2, y + 10); ui.fill();
    ui.fillStyle = '#fff'; ui.beginPath(); ui.moveTo(tx - 4, y - 2); ui.lineTo(tx + 2, y - 2); ui.lineTo(tx - 2, y + 6); ui.fill();
  }
  let n = Math.floor(lines.reduce((a, l) => a + [...l].length, 0) * clamp(p * 1.6));
  lines.forEach((l, i) => {
    const k = clamp(n, 0, [...l].length); n -= [...l].length;
    if (k > 0) txt([...l].slice(0, k).join(''), x0 + 7, y0 + 5 + i * 18, 16, [0, 0, 0], null, 0, 'left', 'top');
  });
}
function sayCh(ch, s, p, think = false) { U(() => { const [x, y] = proj(headTop(ch)); bubble(x, y - 4, s, p, think); }); }
function sayAt(v, s, p, think = false) { U(() => { const [x, y] = proj(v); bubble(x, y - 4, s, p, think); }); }
function band(lines, label, p = 1, accent = [255, 222, 90]) {
  const h = (label ? 26 : 0) + lines.length * 40 + 18, y0 = 40;
  ui.fillStyle = 'rgba(14,14,24,0.82)'; ui.fillRect(0, y0, W, h);
  px(ui, 0, y0, W, 3, accent); px(ui, 0, y0 + h - 3, W, 3, accent);
  let y = y0 + 16;
  if (label) { txt(label, W / 2, y, 16, accent, null); y += 26; }
  let n = Math.floor(lines.reduce((a, l) => a + [...l].length, 0) * clamp(p * 1.4));
  for (const l of lines) { typeLine(W / 2, y + 12, l, 32, n, 2); n -= [...l].length; y += 40; }
}
function bigPop(s, cx, cy, p, colr = [255, 230, 60], scale = 2) {
  if (p <= 0) return;
  const k = back(clamp(p * 2.5)), sc = Math.max(0.1, scale * k);
  ui.save(); ui.translate(cx, cy); ui.scale(sc, sc); txt(s, 0, 0, 32, colr, [0, 0, 0], 2); ui.restore();
}
function popAt(v, s, p, colr, scale) { U(() => { const [x, y] = proj(v); bigPop(s, x, y, p, colr, scale); }); }
function heart(x, y) { for (const [dx, dy, w] of [[-4, 0, 3], [1, 0, 3], [-5, 2, 10], [-4, 4, 8], [-3, 6, 6], [-2, 8, 4], [-1, 10, 2]]) px(ui, x + dx, y + dy, w, 2, [240, 90, 130]); }
const crackCache = {};
function crackPaths(cx, cy) {
  const key = `${cx | 0},${cy | 0}`;
  if (!crackCache[key]) {
    const r = rng(11), paths = [];
    for (let k = 0; k < 10; k++) {
      let a = k / 10 * Math.PI * 2 + (r() - 0.5) * 0.4, x = cx, y = cy; const pts = [[x, y]];
      while (x > -20 && x < W + 20 && y > -20 && y < H + 20) { a += (r() - 0.5); const L = 14 + r() * 16; x += L * Math.cos(a); y += L * Math.sin(a); pts.push([x, y]); }
      paths.push(pts);
    }
    crackCache[key] = paths;
  }
  return crackCache[key];
}
function drawCracks(cx, cy, p) {
  for (const pts of crackPaths(cx, cy)) {
    const n = Math.max(1, Math.floor((pts.length - 1) * p)), s = pts.slice(0, n + 1);
    for (const [w, c] of [[5, '#000'], [2, '#fff']]) { ui.strokeStyle = c; ui.lineWidth = w; ui.lineJoin = 'miter'; ui.beginPath(); s.forEach(([x, y], i) => i ? ui.lineTo(x, y) : ui.moveTo(x, y)); ui.stroke(); }
  }
}

// ------------------------------------------------------------------ カメラ
function camKeys(keys, t, shake = 0) {
  let a = keys[0], b = keys[keys.length - 1], p = 0;
  if (t <= keys[0][0]) b = a; else if (t >= b[0]) a = b;
  else for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t < keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; p = smooth((t - a[0]) / (b[0] - a[0])); break; }
  const P0 = a[1].map((v, i) => lerp(v, b[1][i], p)), L0 = a[2].map((v, i) => lerp(v, b[2][i], p));
  const sx = shake ? Math.sin(t * 97) * shake : 0, sy = shake ? Math.cos(t * 83) * shake : 0;
  camera.position.set(P0[0] + sx, P0[1] + sy, P0[2]); camera.lookAt(L0[0] + sx, L0[1] + sy, L0[2]);
  camera.updateMatrixWorld(true);
  return { p: P0, l: L0 };
}

// ------------------------------------------------------------------ 第1話 定時に帰れない空気
const K1 = [[0, [0, 5.4, 13.8], [0, 1.9, 0]], [2.5, [0, 4.6, 11], [0, 1.8, 0]], [3.3, [-1.2, 3.5, 6.6], [-2.1, 2.1, 0]], [5.0, [-1.0, 3.6, 6.9], [-2.1, 2.1, 0]],
  [5.7, [-5.5, 5.2, 9.5], [0, 1.8, 0]], [7.2, [5.5, 5.2, 9.5], [0, 1.8, 0]], [7.9, [0, 4.6, 11], [0, 1.9, 0]], [9.0, [0, 4.4, 10.4], [0, 1.9, 0]]];
function ep1Story(t) {
  let hour, clock;
  if (t < 2.6) { hour = 17.98; clock = '17:59'; }
  else if (t < 5.2) { hour = 18; clock = '18:00'; }
  else { const hf = Math.min(21, 18 + (t - 5.2) / 0.7); hour = hf; clock = hf < 21 ? `${hf | 0}:${String(((hf % 1) * 60) | 0).padStart(2, '0')}` : '21:00'; }
  office(hour, clock, seg(t, 5.2, 7.4));
  const people = [[CH.T, -2.1], [CH.M, 0], [CH.B, 2.1]];
  people.forEach(([ch, x], i) => {
    let expr = t > 5.2 ? 'tired' : 'n', sweat = false, look = 0, typing = t * 14 + i * 2;
    if (i === 0 && t >= 2.6 && t < 4.0) { expr = 'happy'; typing = null; }
    if (i === 0 && t >= 4.0 && t < 5.2) { look = Math.sin(t * 6) > 0 ? 1 : -1; sweat = true; typing = null; }
    pose(ch, { x, z: 0, expr, sweat, look, typing, nod: t > 5.2 ? 0.18 : 0 });
    showDesk(i, x);
  });
  camKeys(K1, t);
  if (t >= 5.2 && t < 7.4 && Math.floor(t * 6) % 2 === 0) U(() => { const [x, y] = proj(new THREE.Vector3(2.2, 4.0, -2.9)); txt('早送り >>', x, y, 16, [255, 240, 120]); });
  if (t >= 2.6 && t < 4.0) sayCh(CH.T, 'おわった！\n帰れる…！', seg(t, 2.6, 3.0), true);
  if (t >= 4.0 && t < 5.2) sayCh(CH.T, 'でも 先に帰るの\n気まずい…', seg(t, 4.0, 4.4), true);
  if (t >= 7.5) people.forEach(([ch], i) => sayCh(ch, 'だれか先に\n帰って…', seg(t, 7.5 + i * 0.3, 7.9 + i * 0.3), true));
}
// ------------------------------------------------------------------ 第2話 休み明けのおみやげ配り
const K2 = [[0, [-2.4, 4.3, 9.5], [-1.8, 1.8, 0.5]], [2.2, [-0.4, 4.4, 10], [-0.3, 1.8, 0.5]], [4.4, [0, 4.6, 11], [0, 1.9, 0]], [6.6, [-0.4, 4.8, 11.5], [-0.6, 2.4, 0]],
  [7.6, [1.2, 6.4, 15], [-0.8, 3.8, 0]], [9.0, [0.6, 6.2, 14.4], [-0.8, 3.6, 0]]];
function ep2Story(t) {
  office(9, '9:00', 0);
  showDesk(0, -2.1); showDesk(1, 0.2); showDesk(2, 2.2);
  [[CH.M, 0.2], [CH.B, 2.2]].forEach(([ch, x], i) => {
    let expr = 'n'; if (t > 6.8) expr = i === 0 ? 'shock' : 'tired';
    pose(ch, { x, z: 0, expr, typing: t < 4.4 ? t * 14 + i * 2 : null, look: t > 6.8 ? -1 : 0 });
  });
  const nbox = t < 4.5 ? 0 : Math.min(14, Math.floor((t - 4.5) / 0.16) + 1);
  P.stack.visible = nbox > 0; P.stack.position.set(-2.1, 1.21, 0.85);
  P.stack.rotation.z = Math.sin(t * 9) * 0.035 * seg(t, 6.6, 7.2);
  P.boxes.forEach((b, k) => {
    b.visible = k < nbox; const age = t - 4.5 - k * 0.16;
    b.position.set(((k % 3) - 1) * 0.06, 0.225 + k * 0.46 + (1 - ease(clamp(age / 0.18))) * 3, 0);
    b.rotation.y = ((k * 37) % 7 - 3) * 0.03;
  });
  if (t < 2.0) { const w = walkPath([[-4.6, 2.0], [-0.9, 2.0]], 1.9, 0, t); pose(CH.T, { x: w.x, z: w.z, ry: w.ry, walk: w.walk, hold: 'box', expr: 'happy' }); }
  else pose(CH.T, { x: -0.9, z: 2.0, hold: t < 4.5 ? 'box' : null, expr: t > 6.8 ? 'shock' : 'n', sweat: t > 2.5 && t < 6.8, look: t > 6.8 ? -1 : (t > 2.5 && t < 4.5 ? 1 : 0) });
  camKeys(K2, t);
  if (t < 2.6) sayCh(CH.T, '旅行\nたのしかった〜', seg(t, 0.8, 1.3));
  if (t >= 2.5 && t < 4.5) {
    [CH.M, CH.B].forEach((ch, i) => { if (t > 2.7 + i * 0.4) popAt(headTop(ch, 0.3), String(i + 1), seg(t, 2.7 + i * 0.4, 3.2 + i * 0.4), [255, 230, 60], 1); });
    sayCh(CH.T, t < 3.7 ? '人数分…\nたりる？' : 'となりの部署も\n…？', t < 3.7 ? seg(t, 2.6, 3.0) : seg(t, 3.7, 4.1), true);
  }
  if (t >= 4.6 && t < 6.8) { sayCh(CH.M, 'これ\nお返し♪', seg(t, 4.6, 5.0)); sayCh(CH.B, 'わたしからも', seg(t, 5.3, 5.7)); }
  if (t >= 6.8) { sayCh(CH.T, 'お返しの\nお返しの…', seg(t, 6.8, 7.2)); sayCh(CH.B, '正直 甘いの\n苦手なんだよね', seg(t, 7.7, 8.2), true); }
}
// ------------------------------------------------------------------ 第3話 上司におじぎするハンコ
const K3 = [[0, [0, 4.4, 11.8], [0, 2.9, 0]], [2.4, [0, 4.3, 10.6], [0, 2.9, 0]], [3.0, [1.5, 4.3, 3.6], [1.8, 3.9, -2.9]], [3.4, [1.5, 4.3, 3.6], [1.8, 3.9, -2.9]],
  [3.9, [0.6, 4.2, 9.4], [0.4, 2.8, 0]], [4.3, [0.6, 4.2, 9.4], [0.4, 2.8, 0]], [4.7, [1.6, 4.2, 4.2], [1.8, 3.9, -2.9]], [5.1, [1.6, 4.2, 4.2], [1.8, 3.9, -2.9]],
  [5.8, [-3.0, 5.0, 10.5], [0, 2.9, 0]], [7.0, [3.0, 5.0, 10.5], [0, 2.9, 0]], [7.6, [0, 4.4, 11], [0, 2.7, 0]], [9.0, [0, 4.3, 10.4], [0, 2.7, 0]]];
function ep3Story(t) {
  office(10, null, 0, { noWindow: true });
  P.board.visible = true;
  const stamps = {};
  if (t >= 2.6) stamps['担当'] = ['ツミ', t < 4.3 ? 0 : 22 * ease(seg(t, 4.3, 4.9)), 2.6];
  [['課長', '課'], ['部長', 'ガン'], ['本部長', '本']].forEach(([slot, nm], i) => { stamps[slot] = [nm, 22 + i * 10, 5.2 + i * 0.6]; });
  drawPaper(stamps, t, g => {
    if (t >= 4.4 && t < 5.3) { g.font = '16px uni'; g.textAlign = 'center'; g.fillStyle = 'rgb(200,40,40)'; g.fillText('おじぎ角度 22°', 230, 124); }
  });
  let ts = 'n'; if ((t >= 3.5 && t < 5.0) || t > 7.4) ts = 'shock'; else if (t >= 5.0) ts = 'tired';
  pose(CH.T, { x: -1.9, z: 1.3, hold: t < 2.6 ? 'stamp' : null, arm: t < 2.6 ? 1 : 0, expr: ts, sweat: t > 3.5 && t < 5.0 });
  pose(CH.B, { x: 2.0, z: 1.3, expr: t > 7.4 ? 'shock' : 'n', look: -1 });
  if (t > 6.9) { const w = walkPath([[-4.6, 2.3], [-0.2, 2.3]], 5.5, 6.9, t); pose(CH.S, { x: w.x, z: w.z, ry: w.done ? 0 : w.ry, walk: w.walk }); }
  camKeys(K3, t);
  if (t >= 5.0 && t < 7.2) {
    const day = 1 + Math.min(4, Math.floor((t - 5.0) / 0.45));
    U(() => { const [x, y] = proj(new THREE.Vector3(0, 1.9, -2.8)); px(ui, x - 60, y - 11, 120, 22, [40, 40, 60]); txt(`承認まで ${day}日目`, x, y, 16, [255, 230, 90], null); });
  }
  if (t < 2.6) sayCh(CH.T, 'ハンコ押す\nだけだよね？', seg(t, 0.6, 1.1));
  if (t >= 3.5 && t < 5.0) sayCh(CH.B, 'まっすぐは\n失礼だよ？', seg(t, 3.5, 3.9));
  if (t >= 7.6) sayCh(CH.S, 'で、これ\n何の書類？', seg(t, 7.6, 8.0));
}
const EPS = {
  '01_teiji': { no: '#01', title: ['定時に', '帰れない空気'], story: ep1Story, keys: K1, thumbT: 8.6, thumb: ['定時に', '帰れない', '空気'] },
  '02_omiyage': { no: '#02', title: ['休み明けの', 'おみやげ配り'], story: ep2Story, keys: K2, thumbT: 7.4, thumb: ['休み明けの', 'おみやげ', '配り'] },
  '03_hanko': { no: '#03', title: ['上司におじぎ', 'するハンコ'], story: ep3Story, keys: K3, thumbT: 6.8, thumb: ['上司に', 'おじぎする', 'ハンコ'] },
};

// ------------------------------------------------------------------ コマの組み立て
function reset() {
  ALL.forEach(o => { o.visible = false; });
  P.confBits.forEach(b => { b.visible = true; });
  UIQ = [];
}
function compose(beforeUI) {
  renderer.setClearColor(0x000000, 1);
  renderer.render(scene, camera);
  ui.setTransform(1, 0, 0, 1, 0, 0); ui.globalAlpha = 1;
  ui.drawImage(glc, 0, 0);
  ui.setTransform(3, 0, 0, 3, 0, 0);
  if (beforeUI) beforeUI();
  UIQ.forEach(f => f()); UIQ = [];
}
function storyFrame(ep, t) {
  reset(); ep.story(t); compose();
  if (t < T_HOOK) band(['こんなこと', 'ありませんか？'], null, seg(t, 0, 0.9));
  else band(ep.title, '誰も喜ばない常識 ' + ep.no, seg(t, T_HOOK, T_HOOK + 0.9));
}
function dim(k) { hemi.intensity *= 1 - 0.35 * k; dirL.intensity *= 1 - 0.45 * k; }
// 崩れるブロック（別シーン）
let SH = null;
const brokenCache = {};
function buildShatter() {
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(3, 5, 8); s.add(dl);
  const cam = new THREE.PerspectiveCamera(50, FW / FH, 0.1, 100); cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
  const hW = 2 * 10 * Math.tan(25 * Math.PI / 180), wW = hW * FW / FH;
  const snapC = mk(FW, FH); const snapT = new THREE.CanvasTexture(snapC);
  const front = new THREE.MeshBasicMaterial({ map: snapT }); const side = new THREE.MeshLambertMaterial({ color: 0x8a7a9a });
  const tiles = []; const cols = 15, rows = 27, tw = wW / cols, th = hW * 24 / 640;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const geo = new THREE.BoxGeometry(tw, th, 0.25); const uv = geo.attributes.uv;
    const u0 = i / cols, u1 = (i + 1) / cols, vt = 1 - j * 24 / 640, vb = Math.max(0, 1 - (j + 1) * 24 / 640);
    for (let k = 16; k < 20; k++) uv.setXY(k, lerp(u0, u1, uv.getX(k)), lerp(vb, vt, uv.getY(k)));
    const m = new THREE.Mesh(geo, [side, side, side, side, front, side]);
    m.userData = { i, j, x: -wW / 2 + (i + 0.5) * tw, y: hW / 2 - (j + 0.5) * th };
    s.add(m); tiles.push(m);
  }
  SH = { s, cam, snapC, snapT, tiles };
}
// ------------------------------------------------------------------ エンドカード
let LOGO, MARK;
const BLOBS = [[[0.15, 0.2], [236, 120, 200]], [[0.85, 0.15], [120, 160, 245]], [[0.5, 0.05], [252, 238, 150]], [[0.1, 0.75], [170, 120, 230]], [[0.9, 0.7], [40, 170, 230]], [[0.5, 0.95], [150, 235, 200]], [[0.5, 0.5], [190, 170, 240]]];
const gradC = mk(54, 96);
function endCard(lt, flash = true) {
  const g = gradC.getContext('2d'); px(g, 0, 0, 54, 96, [190, 170, 240]);
  BLOBS.forEach(([[bx, by], c], i) => {
    const x = (bx + 0.08 * Math.cos(lt * 0.9 + i)) * 54, y = (by + 0.05 * Math.sin(lt * 0.7 + i * 2)) * 96;
    const gr = g.createRadialGradient(x, y, 0, x, y, 40); gr.addColorStop(0, `rgba(${c},0.95)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 54, 96);
  });
  ui.setTransform(1, 0, 0, 1, 0, 0); ui.imageSmoothingEnabled = true; ui.imageSmoothingQuality = 'high';
  ui.drawImage(gradC, 0, 0, FW, FH);
  const mw = MARK.width, mh = MARK.height, ox = (FW - mw) / 2, oy = 760;
  for (let xs = 0; xs < mw; xs += 8) {
    const q = seg(lt, 0.15 + xs / mw * 0.55, 0.55 + xs / mw * 0.55);
    if (q <= 0) continue;
    const off = -(1 - back(q)) * 320;
    ui.drawImage(MARK, xs, 0, 8, mh, ox + xs, oy + off, 8, mh);
  }
  const tag = '誰も喜ばない常識に、', tag2 = 'ヒビを入れる。';
  let n = Math.floor(([...tag].length + [...tag2].length) * seg(lt, 1.3, 2.3));
  ui.font = '64px uni'; ui.textAlign = 'left'; ui.textBaseline = 'middle';
  for (const [s, y] of [[tag, 1340], [tag2, 1440]]) {
    const k = clamp(n, 0, [...s].length); n -= [...s].length;
    if (k <= 0) continue;
    const x0 = FW / 2 - ui.measureText(s).width / 2, part = [...s].slice(0, k).join('');
    ui.fillStyle = 'rgb(60,40,110)'; ui.fillText(part, x0 + 5, y + 5); ui.fillStyle = '#fff'; ui.fillText(part, x0, y);
  }
  if (flash && lt < 0.35) { ui.fillStyle = `rgba(255,255,255,${1 - lt / 0.35})`; ui.fillRect(0, 0, FW, FH); }
}

// ------------------------------------------------------------------ 外から呼ぶ口
// あるあるのオチの画面にヒビが入り、ブロックになって崩れて crack ロゴが出る
const HIT = [180, 330];
function hitFrame(ep, lt) {
  reset(); ep.story(STORY_END);
  const last = ep.keys[ep.keys.length - 1];
  camKeys([[0, last[1], last[2]]], lt, lt >= 0.1 && lt < 0.45 ? 0.1 : 0);
  compose();
  band(ep.title, '誰も喜ばない常識 ' + ep.no, 1);
  if (lt >= 0.1) {
    drawCracks(HIT[0], HIT[1], ease(seg(lt, 0.1, 0.45)));
    if (lt < 0.2) { ui.fillStyle = 'rgba(255,255,255,0.6)'; ui.fillRect(0, 0, W, H); }
    bigPop('パキッ！', W / 2, 500, seg(lt, 0.1, 0.6), [255, 230, 60], 2.5);
  }
}
function shatterOver(slug, ep, tt) {
  if (!SH) buildShatter();
  if (brokenCache.slug !== slug) {
    hitFrame(ep, 0.599);
    const g = SH.snapC.getContext('2d'); g.drawImage(out, 0, 0); SH.snapT.needsUpdate = true;
    brokenCache.slug = slug;
  }
  endCard(tt, false);
  const r = rng(5), [cx, cy] = HIT;
  for (const m of SH.tiles) {
    const d = m.userData, ux = (d.i + 0.5) * 24, uy = (d.j + 0.5) * 24;
    const delay = Math.hypot(ux - cx, uy - cy) / 420 * 0.45 + r() * 0.12;
    const vx = (r() - 0.5) * 3, vz = 1 + r() * 4, wx = (r() - 0.5) * 10, wy = (r() - 0.5) * 8;
    const k = Math.max(0, tt - delay);
    m.position.set(d.x + vx * k, d.y - 13 * k * k, vz * k);
    m.rotation.set(wx * k, wy * k, 0);
    m.visible = m.position.y > -8;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.render(SH.s, SH.cam);
  renderer.setClearColor(0x000000, 1);
  ui.setTransform(1, 0, 0, 1, 0, 0); ui.drawImage(glc, 0, 0);
}
function drawFrame(slug, t) {
  const ep = EPS[slug];
  if (t < G_HIT) storyFrame(ep, t);
  else if (t < G_LOGO) hitFrame(ep, t - G_HIT);
  else if (t < G_LOGO + 1.4) shatterOver(slug, ep, t - G_LOGO);
  else endCard(t - G_LOGO, false);
}
window.TIMES = [TOTAL3, G_HIT, G_LOGO];
window.renderFrame = (slug, t, fmt = 'jpeg') => { drawFrame(slug, t); return out.toDataURL(fmt === 'png' ? 'image/png' : 'image/jpeg', 0.92); };
window.renderThumb = slug => {
  const ep = EPS[slug];
  NO_BUBBLES = true; reset(); ep.story(ep.thumbT); NO_BUBBLES = false; UIQ = [];
  dim(0.85);
  const dir = new THREE.Vector3(-0.62, 0.8, 0.5).unproject(camera).sub(camera.position).normalize();
  const hp = camera.position.clone().add(dir.multiplyScalar(10));
  hibi(hp.x, hp.y, hp.z, 0.3, -0.3, 0.6); HIBI.g.lookAt(camera.position);
  compose(() => { ui.fillStyle = 'rgba(12,10,30,0.35)'; ui.fillRect(0, 0, W, H); });
  ui.setTransform(1, 0, 0, 1, 0, 0);
  const T = (s, x, y, size, c, ow) => { ui.font = `${size}px uni`; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.fillStyle = '#000'; for (let dx = -ow; dx <= ow; dx += 2) for (let dy = -ow; dy <= ow; dy += 2) ui.fillText(s, x + dx, y + dy); ui.fillStyle = rgb(c); ui.fillText(s, x, y); };
  T('誰も喜ばない常識 ' + ep.no, FW / 2, 420, 64, [255, 222, 90], 4);
  ep.thumb.forEach((l, i) => T(l, FW / 2, 620 + i * 160, 128, [255, 255, 255], 6));
  const r = rng(ep.no.charCodeAt(2)); let x = 60, y = 560 + r() * 80; const pts = [[x, y]];
  while (x < FW - 60) { x += 40 + r() * 50; y += (r() - 0.5) * 120; pts.push([x, y]); }
  for (const [w, c] of [[16, '#000'], [6, '#fff']]) { ui.strokeStyle = c; ui.lineWidth = w; ui.beginPath(); pts.forEach(([a, b], i) => i ? ui.lineTo(a, b) : ui.moveTo(a, b)); ui.stroke(); }
  T('それ、割ってみない？', FW / 2, 1120, 64, [140, 220, 255], 4);
  ui.drawImage(LOGO, FW - 260, FH - 560, 220, 220);
  return out.toDataURL('image/png');
};

(async () => {
  await document.fonts.load('16px uni');
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  LOGO = await load('../assets/crack_logo.png'); MARK = await load('../assets/logo_mark.png');
  initGL(); buildOffice(); buildProps(); makeHibi();
  for (const k of ['T', 'M', 'B', 'S']) CH[k] = makeChar(k);
  window.READY = true;
})().catch(e => { console.error('init failed', e); window.READY = 'error'; });
