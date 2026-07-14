import * as THREE from 'three';

// ── プロシージャル脳ジオメトリ（半球＋小脳）。しわの畝付き ──
// colorful=true でPOPな頂点カラー（3D版）、falseで単色（ラグジュアリー版のゴールド等）

const POP = ['#F06292', '#FFA726', '#4DB6AC', '#42A5F5', '#FFD54F', '#AB47BC', '#66BB6A', '#EF5350'].map(
  (c) => new THREE.Color(c)
);

const applyVertexColors = (g: THREE.BufferGeometry) => {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // 位置ベースのタイル状カラーリング（低ポリ・ステンドグラス風）
    const cell = Math.abs(Math.floor(v.x * 3.1) * 7 + Math.floor(v.y * 3.3) * 13 + Math.floor(v.z * 2.9) * 5);
    const c = POP[cell % POP.length];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
};

export const makeHemisphereGeo = (seedPhase: number, colorful = false): THREE.BufferGeometry => {
  const g = new THREE.SphereGeometry(1, 120, 120);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // 脳回の畝: うねる縞状の隆起（決定論的ノイズ）
    const ridges =
      Math.sin(v.y * 6.4 + Math.sin(v.z * 4.2 + v.x * 2.3 + seedPhase) * 1.9) +
      Math.sin(v.z * 5.6 + seedPhase + Math.sin(v.x * 3.8) * 2.1) * 0.75;
    const d = 1 + 0.09 * Math.abs(ridges) - 0.055;
    v.multiplyScalar(d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.scale(0.56, 0.82, 1.08); // 幅・高さ・奥行き（側面が長い脳型）
  if (colorful) applyVertexColors(g);
  g.computeVertexNormals();
  return g;
};

export const makeCerebellumGeo = (colorful = false): THREE.BufferGeometry => {
  const g = new THREE.SphereGeometry(1, 80, 80);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // 小脳: 細かい水平の縞
    const d = 1 + 0.05 * Math.abs(Math.sin(v.y * 15 + Math.sin(v.x * 5) * 0.8));
    v.multiplyScalar(d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.scale(0.46, 0.32, 0.5);
  if (colorful) applyVertexColors(g);
  g.computeVertexNormals();
  return g;
};

// 脳の各パーツ配置（グループ内ローカル座標）
export const BRAIN_PARTS = {
  left: {position: [-0.42, 0, 0] as [number, number, number], rotation: [0, 0, 0.07] as [number, number, number]},
  right: {position: [0.42, 0, 0] as [number, number, number], rotation: [0, 0, -0.07] as [number, number, number]},
  cerebellum: {position: [0, -0.62, -0.55] as [number, number, number]},
  stem: {position: [0, -0.72, -0.2] as [number, number, number], rotation: [0.55, 0, 0] as [number, number, number]},
};
