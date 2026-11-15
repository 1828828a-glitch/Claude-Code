// フリオチ モーション。画像も動画素材も使わず、文字の板を3D空間で動かすだけで作る。
// 時刻 t を渡すと必ず同じ絵が出るように書いてあるので、1コマずつ書き出せる。
import * as THREE from 'three';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w') || 1920);
const H = Number(params.get('h') || 1080);
const SUB = Number(params.get('sub') || 1); // 1コマを何回に分けて描くか。増やすと動きがなめらかにぶれる
export const FPS = 30;
export const DURATION = 20;

const INK = '#141414';
const PAPER = '#f2ede3';
const ACCENT = '#ff5a1f';
const FONT = '"Noto Sans JP", sans-serif';

// 前半の通路に並ぶ言葉。予測の側の言葉だけを置く
const WORDS = [
  '予測', '期待', 'いつもどおり', 'きっとこうなる', '次はこう来る', '前提',
  'お約束', '流れ', 'ふつうは', 'たぶん', '当然', '同じ尺度',
  'SETUP', 'EXPECT', '01', '02', '03', '→',
];
const BIG = ['フリ', '予測どおりに進む', '3', '2', '1', 'ズレ', 'オチ', 'フリオチLAB', '予測を読む。ずらす。短く着地する。'];

// ---- 小道具 ----
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, m) => a + (b - a) * m;
const span = (t, a, b) => clamp01((t - a) / (b - a));
const easeInCubic = (x) => x * x * x;
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeOutBack = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// 文字を描いたキャンバスをテクスチャにする。card は札の種類、null なら文字だけ
function textTexture(text, { card = null, color = INK, px = 150 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `900 ${px}px ${FONT}`;
  g.font = font;
  const pad = card === null ? px * 0.12 : px * 0.42;
  c.width = Math.ceil(g.measureText(text).width + pad * 2);
  c.height = Math.ceil(px * 1.7);
  g.font = font;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  if (card === 0) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); color = INK; }
  if (card === 1) {
    g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = INK; g.fillRect(10, 10, c.width - 20, c.height - 20);
    color = PAPER;
  }
  if (card === 2) { g.fillStyle = ACCENT; g.fillRect(0, 0, c.width, c.height); color = INK; }
  g.fillStyle = color;
  g.fillText(text, c.width / 2, c.height / 2 + px * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.aspect = c.width / c.height;
  return tex;
}

async function build() {
  await document.fonts.load(`900 100px ${FONT}`, WORDS.join('') + BIG.join(''));

  const gl = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  const out = document.getElementById('out');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');

  const scene = new THREE.Scene();
  const bg = new THREE.Color(PAPER);
  scene.background = bg;
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 600);
  const quad = new THREE.PlaneGeometry(1, 1);

  // オチの中心。通路の突き当たり
  const P = new THREE.Vector3(0, 3, -190);

  // ---- 札 ----
  const rand = rng(20261115);
  const textures = [];
  for (const w of WORDS) for (const k of [0, 1, 2]) textures.push(textTexture(w, { card: k }));
  const cards = [];
  const N = 352;
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const kind = rand() < 0.55 ? 0 : rand() < 0.7 ? 1 : 2;
    const tex = textures[Math.floor(rand() * WORDS.length) * 3 + kind];
    const mesh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
    const h = 1.2;
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 2) % 4;
    const slot = Math.floor(i / 8);
    // A。通路に整列
    const a = new THREE.Vector3(side * 5.5, 0.9 + row * 1.5, -slot * 4.5);
    const qa = new THREE.Quaternion().setFromAxisAngle(yAxis, -side * 1.05);
    // B。中心のまわりに散らばる
    const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    const b = P.clone().addScaledVector(dir, 9 + rand() * 30);
    const qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28));
    const spinAxis = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    // C。1本の線に着地
    const c = new THREE.Vector3(P.x + lerp(-7.5, 7.5, i / (N - 1)), P.y - 1.9, P.z + (rand() - 0.5) * 0.05);
    cards.push({
      mesh, w: h * tex.userData.aspect, h, a, qa, b, qb, c, dir, spinAxis,
      spin: (rand() - 0.5) * 1.6, d1: rand() * 0.35, d2: rand() * 0.7,
    });
    scene.add(mesh);
  }

  // ---- 床と、まっすぐ伸びる予測の線 ----
  const grid = new THREE.GridHelper(480, 120, INK, INK);
  grid.position.set(0, 0, -100);
  grid.material.transparent = true;
  grid.material.opacity = 0.14;
  scene.add(grid);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 230), new THREE.MeshBasicMaterial({ color: ACCENT, toneMapped: false }));
  rail.position.set(0, 0.07, -95);
  scene.add(rail);

  // ---- 大きな文字 ----
  function big(text, height, color, pos) {
    const tex = textTexture(text, { color, px: 300 });
    const mesh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }));
    mesh.renderOrder = 10;
    mesh.position.copy(pos);
    mesh.userData = { w: height * tex.userData.aspect, h: height };
    mesh.scale.set(mesh.userData.w, height, 1);
    scene.add(mesh);
    return mesh;
  }
  const setScale = (m, s) => { m.visible = s > 0.001; m.scale.set(m.userData.w * s, m.userData.h * s, 1); };
  const tFuri = big('フリ', 5, INK, new THREE.Vector3(0, 3.2, -14));
  const tLine = big('予測どおりに進む', 1.5, INK, new THREE.Vector3(0, 3, -30.5));
  const tCount = ['3', '2', '1'].map((s, i) => big(s, 6.5, ACCENT, new THREE.Vector3(0, 3.2, -62 - i * 40)));
  const tZure = big('ズレ', 8, PAPER, P.clone());
  const tOchi = big('オチ', 9, ACCENT, P.clone());
  const tLogo = big('フリオチLAB', 3.4, INK, new THREE.Vector3(P.x, P.y + 0.6, P.z + 0.2));
  const tTag = big('予測を読む。ずらす。短く着地する。', 0.95, INK, new THREE.Vector3(P.x, P.y - 3.4, P.z + 0.2));

  const cInk = new THREE.Color(INK), cPaper = new THREE.Color(PAPER), cAccent = new THREE.Color(ACCENT);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qI = new THREE.Quaternion();
  const look = new THREE.Vector3(), rollAxis = new THREE.Vector3(0, 0, 1);

  // 時刻 t の絵を組み立てる
  function update(t) {
    // 背景。8秒でひっくり返り、着地で紙色に戻る
    if (t < 8) bg.copy(cPaper);
    else if (t < 8.1) bg.copy(cAccent);
    else bg.copy(cInk).lerp(cPaper, easeInOutCubic(span(t, 14.2, 15.2)));

    // カメラ
    let roll = 0;
    if (t < 8) {
      const z = t < 6 ? 8 - 40 * (t / 6) : lerp(-32, -164, easeInCubic(span(t, 6, 8)));
      const sway = Math.sin(t * 0.8) * 0.6 * (1 - span(t, 6, 8));
      camera.position.set(sway, 3, z);
      look.set(sway * 0.4, 3, z - 30);
    } else {
      const u = easeInOutCubic(span(t, 8, 15.5));
      const th = Math.PI * 2 * u;
      const r = 13 + 13 * (1 - u) - 5 * Math.sin(Math.PI * u) - 1.0 * span(t, 15.5, 20);
      camera.position.set(P.x + Math.sin(th) * r, P.y + 7 * Math.sin(th) * (1 - u), P.z + Math.cos(th) * r);
      look.copy(P);
      roll = 0.45 * Math.sin(th * 1.5) * (1 - u);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    camera.rotateOnAxis(rollAxis, roll);

    // 札
    const camZ = camera.position.z;
    for (const k of cards) {
      let s = 1;
      if (t < 8) {
        v.copy(k.a); q.copy(k.qa);
        s = easeOutBack(span(camZ - k.a.z, 72, 52)) * (camZ - k.a.z > 72 ? 0 : 1);
      } else {
        const dt = t - 8;
        const m = easeOutExpo(span(dt, k.d1, k.d1 + 1.5));
        const n = easeInOutCubic(span(t, 14 + k.d2, 15.3 + k.d2));
        v.copy(k.b).addScaledVector(k.dir, dt * 0.35);
        q2.setFromAxisAngle(k.spinAxis, k.spin * dt);
        q.copy(k.qb).multiply(q2);
        v.lerpVectors(k.a, v, m).lerp(k.c, n);
        q.slerpQuaternions(k.qa, q, m).slerp(qI, n);
        s = lerp(1, 0.2, n);
      }
      k.mesh.position.copy(v);
      k.mesh.quaternion.copy(q);
      k.mesh.visible = s > 0.001;
      k.mesh.scale.set(k.w * s, k.h * s, 1);
    }

    grid.visible = rail.visible = t < 8;
    tFuri.visible = tLine.visible = t < 8;
    for (const m of tCount) m.visible = t > 5.5 && t < 8;

    // ズレ。一瞬だけ大きく出て消える
    const z0 = span(t, 8.1, 8.9);
    setScale(tZure, t >= 8.1 && t < 8.9 ? lerp(1.7, 1, easeOutExpo(z0)) : 0);
    tZure.quaternion.copy(camera.quaternion);
    tZure.rotateZ(-0.14);
    // オチ。散らばった札の真ん中に居座る
    setScale(tOchi, t < 8.9 ? 0 : easeOutBack(span(t, 8.9, 9.5)) * (1 - easeInCubic(span(t, 14, 14.6))));
    tOchi.quaternion.copy(camera.quaternion);
    // ロゴとひとこと
    setScale(tLogo, t < 15.3 ? 0 : easeOutBack(span(t, 15.3, 15.9)));
    const tg = easeOutExpo(span(t, 16.5, 17.3));
    setScale(tTag, t < 16.5 ? 0 : 1);
    tTag.material.opacity = tg;
    tTag.position.y = P.y - 3.4 - (1 - tg) * 0.5;
  }

  // 1コマ描く。SUB が2以上なら、コマの前半を細かく刻んで重ね、速い動きをぶれさせる
  function renderFrame(f) {
    for (let k = 0; k < SUB; k++) {
      update((f + (k / SUB) * 0.5) / FPS);
      renderer.render(scene, camera);
      ctx.globalAlpha = 1 / (k + 1);
      ctx.drawImage(gl, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  window.motion = {
    fps: FPS, frames: DURATION * FPS,
    frame: (f, quality = 0.93) => { renderFrame(f); return out.toDataURL('image/jpeg', quality); },
  };

  // 書き出しでないときは、その場で繰り返し再生する
  if (!params.has('render')) {
    const start = performance.now();
    const loop = (now) => {
      renderFrame(Math.floor((((now - start) / 1000) % DURATION) * FPS));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  window.motionReady = true;
}

build();
