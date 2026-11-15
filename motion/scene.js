// 恒和システム 会社の魅力編。画像も動画素材も使わず、管理画面ふうのパネルを3D空間に並べてカメラが渡り歩く。
// 時刻 t を渡すと必ず同じ絵が出るように書いてあるので、1コマずつ書き出せる。
// 載せている数字と出典は、別チャットで作った「会社の魅力編」の台本と同じもの。
import * as THREE from 'three';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w') || 1920);
const H = Number(params.get('h') || 1080);
const SUB = Number(params.get('sub') || 1); // 1コマを何回に分けて描くか。増やすと速い動きがなめらかにぶれる
export const FPS = 30;

const BG = '#060b18';
const CY = '#35d6ff';
const WH = '#eaf2ff';
const GR = '#7f8ba3';
const DIM = '#2a3650';
const GRN = '#4be3a4';
const JP = '"Noto Sans JP", sans-serif';
const MONO = '"JetBrains Mono", "Noto Sans JP", monospace';
const PW = 1600, PH = 900; // パネル1枚の描画サイズ

// ---- 小道具 ----
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, m) => a + (b - a) * m;
const ap = (t, t0, d) => clamp01((t - t0) / d);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- パネルに描くための2Dの部品 ----
function tx(g, s, x, y, size, color, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  g.font = `${o.weight || 900} ${size}px ${o.font || JP}`;
  g.textAlign = o.align || 'left';
  g.textBaseline = o.base || 'middle';
  g.fillStyle = color;
  g.fillText(s, x, y);
  g.restore();
}
// 下からすっと出る文字
function rise(g, s, x, y, size, color, k, o = {}) {
  const e = easeOut(k);
  tx(g, s, x, y + (1 - e) * 24, size, color, { ...o, alpha: e });
}
function box(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
// 伸びる棒。数字は伸び切ってから最終の値だけを出す。途中の数字は映さない
function bar(g, x, y, h, full, k, color, value) {
  box(g, x, y, full.max, h, 6); g.fillStyle = '#0f1a30'; g.fill();
  const w = Math.max(8, full.w * easeOut(k));
  if (k > 0) { box(g, x, y, w, h, 6); g.fillStyle = color; g.fill(); }
  if (k >= 1) tx(g, value, x + full.w + 18, y + h / 2 + 2, h * 0.8, color === GR ? GR : WH);
}
function badge(g, s, x, y, k, size = 44) {
  const e = backOut(k);
  if (e <= 0) return;
  g.save(); g.translate(x, y); g.scale(e, e);
  g.font = `900 ${size}px ${JP}`;
  const w = g.measureText(s).width + size * 1.1;
  box(g, -w / 2, -size * 0.85, w, size * 1.7, size * 0.85); g.fillStyle = GRN; g.fill();
  tx(g, s, 0, 3, size, BG, { align: 'center' });
  g.restore();
}
// パネルの枠。左上に番号と題、四隅に鉤
function frame(g, no, en, ja) {
  g.clearRect(0, 0, PW, PH);
  box(g, 6, 6, PW - 12, PH - 12, 10); g.fillStyle = 'rgba(8,16,34,0.9)'; g.fill();
  g.save(); g.shadowColor = CY; g.shadowBlur = 18; g.lineWidth = 2.5; g.strokeStyle = 'rgba(53,214,255,0.55)'; g.stroke(); g.restore();
  g.strokeStyle = CY; g.lineWidth = 6;
  for (const [cx, cy, sx, sy] of [[6, 6, 1, 1], [PW - 6, 6, -1, 1], [6, PH - 6, 1, -1], [PW - 6, PH - 6, -1, -1]]) {
    g.beginPath(); g.moveTo(cx + sx * 46, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * 46); g.stroke();
  }
  g.fillStyle = 'rgba(53,214,255,0.10)'; g.fillRect(8, 8, PW - 16, 78);
  if (no) tx(g, `${no} / ${en}`, 48, 48, 30, CY, { font: MONO, weight: 700 });
  if (ja) tx(g, ja, PW / 2, 48, 32, WH, { align: 'center' });
  tx(g, 'KOWA SYSTEM', PW - 100, 48, 24, GR, { font: MONO, weight: 700, align: 'right' });
  g.fillStyle = GRN; g.beginPath(); g.arc(PW - 62, 47, 9, 0, 7); g.fill();
}
function note(g, s) { tx(g, s, 48, PH - 42, 21, GR, { weight: 500 }); }

// ---- 各パネルの中身。lt はそのパネルに着いてからの秒数 ----
const PANELS = [
  { // 起動画面と社名
    start: 0,
    draw(g, lt) {
      frame(g, '', '', '');
      const lines = ['> kowa-system --start', '  since ........ 1979', '  status ....... running', '  uptime ....... 47 years'];
      lines.forEach((s, i) => {
        const k = ap(lt, 0.25 + i * 0.42, 0.38);
        const shown = s.slice(0, Math.floor(s.length * k));
        const cursor = k > 0 && k < 1 ? '_' : '';
        tx(g, shown + cursor, 110, 190 + i * 54, 34, i === 0 ? CY : GR, { font: MONO, weight: 700 });
      });
      rise(g, '恒和システム株式会社', PW / 2, 590, 118, WH, ap(lt, 2.0, 0.5), { align: 'center' });
      rise(g, '業務システムの設計・開発・運用管理', PW / 2, 716, 42, CY, ap(lt, 2.5, 0.5), { align: 'center' });
    },
  },
  { // 1つめ。歴史
    start: 4,
    draw(g, lt) {
      frame(g, '01', 'HISTORY', '続いている会社');
      rise(g, '設立から', 90, 168, 38, GR, ap(lt, 0.35, 0.4));
      const k47 = backOut(ap(lt, 0.5, 0.45));
      if (k47 > 0) { g.save(); g.translate(90, 300); g.scale(k47, k47); tx(g, '47', 0, 0, 220, CY); tx(g, '年', 268, 34, 90, WH); g.restore(); }
      // 年表
      const x0 = 640, x1 = 1480, y = 290;
      g.lineWidth = 6; g.strokeStyle = DIM; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      const u = easeOut(ap(lt, 0.9, 1.3));
      g.strokeStyle = CY; g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, u), y); g.stroke();
      [['1979', '設立'], ['1987', '社員持株'], ['2016', '女性活躍'], ['2026', 'いま']].forEach(([yr, s], i) => {
        const x = lerp(x0, x1, i / 3), k = backOut(ap(lt, 0.95 + i * 0.4, 0.3));
        if (k <= 0) return;
        g.fillStyle = i === 3 ? GRN : CY; g.beginPath(); g.arc(x, y, 16 * k, 0, 7); g.fill();
        g.fillStyle = BG; g.beginPath(); g.arc(x, y, 7 * k, 0, 7); g.fill();
        tx(g, yr, x, y - 52, 34, WH, { align: 'center', font: MONO, weight: 700, alpha: k });
        tx(g, s, x, y + 54, 28, GR, { align: 'center', alpha: k });
      });
      // 平均寿命との比較
      const sc = 760 / 47;
      rise(g, '恒和システム', 500, 520, 30, WH, ap(lt, 3.0, 0.3), { align: 'right' });
      bar(g, 530, 493, 54, { max: 760, w: 47 * sc }, ap(lt, 3.1, 0.6), CY, '47年');
      rise(g, '倒産したIT企業の平均寿命', 500, 606, 30, GR, ap(lt, 3.6, 0.3), { align: 'right' });
      bar(g, 530, 579, 54, { max: 760, w: 17.2 * sc }, ap(lt, 3.7, 0.6), GR, '17.2年');
      badge(g, '2.7倍', 1130, 606, ap(lt, 4.5, 0.35), 46);
      rise(g, 'これからの目標', 90, 730, 30, GR, ap(lt, 5.3, 0.35));
      rise(g, '100年続く会社へ', 330, 728, 66, WH, ap(lt, 5.4, 0.45));
      note(g, '出典：恒和システム 採用サイト（会社概要）／東京商工リサーチ「2025年 倒産企業の平均寿命」情報通信業');
    },
  },
  { // 2つめ。人
    start: 11,
    draw(g, lt) {
      frame(g, '02', 'PEOPLE', '若くて、多様');
      const rows = [
        ['社員に占める20代の割合', 48.3, '48.3%', 'IT業界', 23.5, '23.5%', '約2倍'],
        ['女性の割合', 48.3, '48.3%', 'IT業界', 30.8, '30.8%', ''],
        ['文系出身の割合', 79.2, '79.2%', '新卒エンジニア全体', 25, '約25%', ''],
      ];
      rows.forEach(([title, a, as, who, b, bs, bd], i) => {
        const y = 118 + i * 232, t0 = 0.35 + i * 2.0;
        rise(g, title, 90, y + 30, 38, WH, ap(lt, t0, 0.35));
        tx(g, '恒和システム', 500, y + 100, 28, WH, { align: 'right', alpha: ap(lt, t0 + 0.15, 0.25) });
        bar(g, 530, y + 76, 48, { max: 900, w: a * 9 }, ap(lt, t0 + 0.2, 0.6), CY, as);
        tx(g, who, 500, y + 162, 28, GR, { align: 'right', alpha: ap(lt, t0 + 0.75, 0.25) });
        bar(g, 530, y + 138, 48, { max: 900, w: b * 9 }, ap(lt, t0 + 0.8, 0.6), GR, bs);
        if (bd) badge(g, bd, 1330, y + 100, ap(lt, t0 + 1.5, 0.35), 40);
      });
      note(g, '出典：総務省「労働力調査」2025年平均 情報通信業の就業者／レバテック調査（ITmedia ビジネスオンライン 2024年12月10日）');
    },
  },
  { // 3つめ。働き方
    start: 18,
    draw(g, lt) {
      frame(g, '03', 'WORK-LIFE', 'ココロもフトコロも');
      const tiles = [
        ['年間休日', '128', '日', 'IT業界平均 122.2日', '＋6日'],
        ['残業の月平均', '11', '時間', 'IT業界平均 16.5時間', '−5.5時間'],
        ['有休取得の平均', '20.6', '日', 'IT業界平均 12.7日', '＋8日'],
      ];
      tiles.forEach(([lab, n, unit, avg, diff], i) => {
        const x = 70 + i * 495, on = ap(lt, 0.35 + i * 1.1, 0.4);
        box(g, x, 118, 470, 650, 14);
        g.fillStyle = on > 0 ? 'rgba(53,214,255,0.07)' : 'rgba(255,255,255,0.02)'; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = on > 0 ? 'rgba(53,214,255,0.6)' : DIM; g.stroke();
        tx(g, lab, x + 235, 178, 36, on > 0 ? WH : DIM, { align: 'center' });
        const k = backOut(on);
        if (k > 0) {
          g.save(); g.translate(x + 235, 350); g.scale(k, k);
          g.font = `900 170px ${JP}`; const nw = g.measureText(n).width;
          g.font = `900 56px ${JP}`; const uw = g.measureText(unit).width;
          tx(g, n, -(nw + uw + 10) / 2, 0, 170, CY);
          tx(g, unit, -(nw + uw + 10) / 2 + nw + 10, 44, 56, WH);
          g.restore();
        }
        const c = ap(lt, 4.3 + i * 0.4, 0.4);
        if (c > 0) { g.strokeStyle = DIM; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 40, 500); g.lineTo(x + 430, 500); g.stroke(); }
        rise(g, avg, x + 235, 556, 30, GR, c, { align: 'center' });
        badge(g, diff, x + 235, 668, ap(lt, 4.55 + i * 0.4, 0.35), 50);
      });
      note(g, '出典：恒和システム 採用サイト（募集要項）／厚生労働省「就労条件総合調査」令和7年・「毎月勤労統計調査」2025年');
    },
  },
  { // 全社員が株主
    start: 25,
    draw(g, lt) {
      frame(g, '04', 'OWNERSHIP', '会社は、みんなのもの');
      // つながりの図。真ん中が会社、まわりが社員
      const cx = 420, cy = 450, R = 250, N = 12;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        const k = easeOut(ap(lt, 0.35 + i * 0.06, 0.45));
        if (k <= 0) continue;
        g.strokeStyle = 'rgba(53,214,255,0.45)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(lerp(cx, x, k), lerp(cy, y, k)); g.stroke();
        if (k >= 1) {
          g.fillStyle = BG; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill();
          g.strokeStyle = CY; g.lineWidth = 4; g.stroke();
          g.fillStyle = CY; g.beginPath(); g.arc(x, y - 7, 9, 0, 7); g.fill();
          g.beginPath(); g.arc(x, y + 20, 16, Math.PI, 0); g.fill();
        }
        // 配当が会社から社員へ流れる
        const f = lt - 1.9 - i * 0.05;
        if (f > 0) {
          const m = (f * 0.55) % 1;
          g.fillStyle = GRN; g.beginPath(); g.arc(lerp(cx, x, m), lerp(cy, y, m), 8, 0, 7); g.fill();
        }
      }
      const kc = backOut(ap(lt, 0.3, 0.4));
      g.fillStyle = CY; g.beginPath(); g.arc(cx, cy, 78 * kc, 0, 7); g.fill();
      tx(g, '恒和', cx, cy + 4, 52, BG, { align: 'center', alpha: kc });
      rise(g, '全社員が株主', 800, 330, 104, WH, ap(lt, 0.9, 0.45));
      rise(g, '会社がもうかれば、', 804, 468, 42, CY, ap(lt, 1.9, 0.4));
      rise(g, '配当が社員にも届く。', 804, 530, 42, CY, ap(lt, 2.1, 0.4));
      rise(g, '配当の額は業績によって変わります', 804, 620, 26, GR, ap(lt, 2.6, 0.4), { weight: 500 });
      note(g, '出典：恒和システム 採用サイト（福利厚生・持株制度）');
    },
  },
  { // しめ
    start: 29.5,
    draw(g, lt) {
      frame(g, '', '', '');
      tx(g, '> status: running', 110, 170, 30, GR, { font: MONO, weight: 700, alpha: ap(lt, 0.3, 0.3) });
      ['47年続く', '若くて多様', 'しっかり休める', '全社員が株主'].forEach((s, i) => {
        const k = backOut(ap(lt, 0.5 + i * 0.25, 0.35));
        if (k <= 0) return;
        const x = 215 + i * 390;
        g.save(); g.translate(x, 320); g.scale(k, k);
        box(g, -175, -44, 350, 88, 44); g.strokeStyle = CY; g.lineWidth = 3; g.stroke();
        tx(g, s, 0, 3, 36, WH, { align: 'center' });
        g.restore();
      });
      rise(g, '恒和システム株式会社', PW / 2, 520, 118, WH, ap(lt, 1.5, 0.5), { align: 'center' });
      const k = backOut(ap(lt, 2.4, 0.4));
      if (k > 0) {
        g.save(); g.translate(PW / 2, 700); g.scale(k, k);
        box(g, -360, -52, 720, 104, 52); g.fillStyle = CY; g.fill();
        tx(g, '気になったら、採用担当まで', 0, 4, 44, BG, { align: 'center' });
        g.restore();
      }
    },
  },
];
export const DURATION = 35;

// パネルの置き場所。x, y, z と、左右の向き
const PLACE = [[0, 0, 0, 0], [15, 1.5, -42, -0.3], [-13, -1, -84, 0.3], [13, 2, -126, -0.25], [-10, 0, -168, 0.25], [0, 0.5, -210, 0]];
const DIST = 13.4; // パネルの正面に止まるときの距離
const MOVE = 0.6; // 次のパネルへ動き出すのは、着く何秒前か

async function build() {
  const gl = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  const out = document.getElementById('out');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 50, 200);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);

  // ---- パネル ----
  const quad = new THREE.PlaneGeometry(16, 9);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const panels = PANELS.map((p, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = PW; canvas.height = PH;
    const g = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mesh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, fog: false }));
    const [x, y, z, yaw] = PLACE[i];
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    scene.add(mesh);
    const normal = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    return {
      ...p, g, tex, mesh, normal, state: '',
      end: i + 1 < PANELS.length ? PANELS[i + 1].start : DURATION,
      quat: new THREE.Quaternion().setFromAxisAngle(yAxis, yaw),
    };
  });

  // フォントは使う字だけ読み込まれるので、いったん全部描いて読み込みを起こし、終わるのを待つ
  for (let pass = 0; pass < 3; pass++) {
    for (const p of panels) p.draw(p.g, 99);
    await document.fonts.ready;
    await new Promise((ok) => setTimeout(ok, 150));
  }

  // ---- まわりの空間 ----
  const grid = new THREE.GridHelper(600, 150, CY, CY);
  grid.position.set(0, -8, -100);
  grid.material.transparent = true; grid.material.opacity = 0.3;
  scene.add(grid);
  const rand = rng(1979);
  // 縦に立つ細い線。データの柱
  const pillars = [];
  for (let i = 0; i < 160; i++) {
    const x = (rand() - 0.5) * 120, z = 20 - rand() * 260, h = 2 + rand() * 14;
    if (Math.abs(x) < 4) continue;
    pillars.push(x, -8, z, x, -8 + h, z);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pillars, 3));
  scene.add(new THREE.LineSegments(pg, new THREE.LineBasicMaterial({ color: CY, transparent: true, opacity: 0.35 })));
  // 漂う点
  const dots = [];
  for (let i = 0; i < 1400; i++) dots.push((rand() - 0.5) * 110, -7 + rand() * 26, 25 - rand() * 265);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: CY, size: 0.09, transparent: true, opacity: 0.7 })));
  // パネルどうしをつなぐ線と、その上を流れる荷物
  const pathPts = PLACE.map(([x, y, z, yaw]) => new THREE.Vector3(x - Math.sin(yaw) * 0.6, y - 5.6, z - Math.cos(yaw) * 0.6));
  const curve = new THREE.CatmullRomCurve3(pathPts, false, 'catmullrom', 0.2);
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(240)), new THREE.LineBasicMaterial({ color: '#3b7bff', transparent: true, opacity: 0.8 })));
  const packets = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.18), new THREE.MeshBasicMaterial({ color: i % 3 ? CY : GRN, toneMapped: false }));
    scene.add(m);
    packets.push(m);
  }

  // パネルの正面に止まったときのカメラの位置。止まっている間もゆっくり寄る
  const pose = (i, t, v) => {
    const p = panels[i];
    const push = ap(t, p.start, p.end - p.start) * 0.9;
    return v.copy(p.mesh.position).addScaledVector(p.normal, DIST - push);
  };
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), rollAxis = new THREE.Vector3(0, 0, 1);

  // 時刻 t のパネルの絵を描く。いま見ているパネルと、その前後だけを描き直す
  function drawPanels(t) {
    for (const p of panels) {
      const want = t < p.start - 1.2 ? 'empty' : t > p.end + 1.2 ? 'final' : 'live';
      if (want !== 'live' && want === p.state) continue;
      p.draw(p.g, want === 'empty' ? -9 : t - p.start);
      p.tex.needsUpdate = true;
      p.state = want;
    }
  }

  // 時刻 t のカメラと、動く小物
  function updateCamera(t) {
    let i = 0;
    while (i + 1 < panels.length && t >= panels[i + 1].start - MOVE) i++;
    const p = panels[i];
    const m = i === 0 ? 1 : easeInOut(ap(t, p.start - MOVE, MOVE * 2));
    if (m >= 1) {
      pose(i, t, camera.position);
      camera.quaternion.copy(p.quat);
    } else {
      pose(i - 1, t, va); pose(i, t, vb);
      camera.position.lerpVectors(va, vb, m);
      camera.position.y += Math.sin(Math.PI * m) * 2.2;
      camera.position.addScaledVector(p.normal, Math.sin(Math.PI * m) * 5);
      camera.quaternion.slerpQuaternions(panels[i - 1].quat, p.quat, m);
      camera.rotateOnAxis(rollAxis, Math.sin(Math.PI * m) * 0.1 * (i % 2 ? -1 : 1));
    }
    packets.forEach((b, k) => {
      const u = (t * 0.035 + k / packets.length) % 1;
      curve.getPointAt(u, b.position);
      b.lookAt(curve.getPointAt(Math.min(1, u + 0.005), va));
      b.rotateY(Math.PI / 2);
    });
  }

  // 1コマ描く。SUB が2以上なら、コマの前半を細かく刻んで重ね、速い動きをぶれさせる
  function renderFrame(f) {
    drawPanels(f / FPS);
    for (let k = 0; k < SUB; k++) {
      updateCamera((f + (k / SUB) * 0.5) / FPS);
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
