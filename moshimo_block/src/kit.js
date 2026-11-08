/* kit.js — 回のファイルで使い回す配役と小技（第3話から使う） */
const CAST = {
  A: { suit: '#2f62d6', tie: '#f2c230', hair: '#2a211b' },
  BOSS: { suit: '#3b3f4a', tie: '#c0392b', hair: '#a9a9a9', mustache: '#6e6e6e', brows: true, skin: '#efc29a', pants: '#2b2f38', scale: 1.08 },
  M1: { suit: '#6f7782', tie: '#d24b4b', hair: '#4a3426', glasses: true },
  M2: { suit: '#4c5560', tie: '#2fa59b', hair: '#1f1a17', long: true, shirt: '#f4f0e6' },
  M3: { suit: '#8a8f98', tie: '#6a5acd', hair: '#5b3b25' },
  NEW: { suit: '#c9cfd6', tie: '#7cc4f2', hair: '#3a2a1e', skin: '#f6d2ae', pants: '#7d8794' },
};
const SKY_DAY = ['#9fd3ef', '#e8f5fb'];
const bump = (lt, times, h = 0.16) => times.reduce((m, ti) => { const d = lt - ti; return d >= 0 && d < 0.25 ? Math.max(m, Math.sin((d / 0.25) * Math.PI) * h) : m; }, 0);
const feet = (c, dy = 0.3) => () => c.root.localToWorld(V3(0, dy, 0));
const floorG = (S, f) => group(S, [0, (f - 1) * P.FLOOR_H, 0]);
const fallTime = (dy, g) => Math.sqrt((2 * dy) / g);
/* 机・椅子・ノートPC・座る人をまとめて置く（人は z-0.95 に座って手前を向く） */
function workstation(parent, x, z, look, o = {}) {
  P.desk(parent, x, z, o);
  P.chair(parent, x, z - 0.95, 0, o.chair);
  if (o.laptop !== false) P.laptop(parent, x + (o.lx || 0), 0.82, z - 0.1);
  return look ? addChar(parent, look, [x, 0, z - 0.95]) : null;
}
function working(c, t, k = 0, speed = 22) { reset(c); sit(c); typing(c, t + k, speed); }
function surprised(c, lookY = 0, hop = 0) {
  c.setFace('shock'); c.head.rotation.y = lookY;
  c.armL.rotation.x = c.armR.rotation.x = -0.4;
  c.root.position.y += hop;
}
/* 文字を書いたブロック（正面に文字） */
const WORD_COLORS = ['#ffffff', '#ffe9a8', '#cfe8ff', '#ffd6d6', '#d9f2d0', '#eadcff'];
function wordTex(word, bg = '#ffffff') {
  const n = Array.from(word).length;
  return P.glow(textTex(word, { w: 256, h: 64, size: Math.min(38, Math.floor(236 / n)), bg, fg: '#1d2333' }));
}
function wordBlock(parent, word, size, i = 0) {
  const bg = WORD_COLORS[i % WORD_COLORS.length];
  return box(parent, size, [0, -99, 0], faces(solid(bg), { front: wordTex(word, bg) }));
}
/* よく使う音の組み合わせ */
function cutSounds(add, cuts) { cuts.forEach((c) => add(AUDIO.SFX.whoosh(c - 0.2))); }
function talkSounds(add, overlay) {
  overlay.filter((o) => o.type === 'bubble' && !o.silent).forEach((o) => add(AUDIO.SFX.talk(o.t0, Math.max(2, Math.min(7, Math.round((o.t1 - o.t0) * 4))))));
}

/* 外から見たビル（れんがの壁、入口、窓）。windows は [x, y] の左下セル（2×2 の穴） */
function streetSet(S, o = {}) {
  const B = new Blocks();
  B.fill('foundation', -16, -2, -4, 15, -2, 7);
  B.fill('stone', -16, -1, -3, 15, -1, 1);
  B.fill('asphalt', -16, -1, 2, 15, -1, 7);
  for (let x = -16; x <= 15; x++) for (let y = -1; y <= (o.height || 12); y++) B.set(y === 3 || y === 8 ? 'wallBase' : 'brick', x, y, -4);
  const holes = [[-1, 0], ...(o.windows || [])];
  holes.forEach(([x, y]) => [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => B.del(x + dx, y + dy, -4)));
  B.build(S);
  holes.forEach(([x, y], i) => box(S, [2, 2, 0.4], [x + 1, y + 1, i === 0 ? -4.7 : -5.1], solid(i === 0 ? '#2b3140' : '#3a3346'), { cast: false }));
  for (let x = -15; x <= 15; x += 3) box(S, [1.4, 0.03, 0.18], [x, 0.015, 4.5], solid('#f4f1ea'), { cast: false });
  if (o.sign) box(S, [3.0, 0.6, 0.1], [0, 2.6, -2.94], faces(solid('#1d2333'), { front: P.glow(textTex(o.sign, { w: 256, h: 64, size: 36, bg: '#1d2333', fg: '#f2c230' })) }));
}
/* コピー機。scan(t) で読み取り光を動かす */
function copier(parent, x, z, rotY = 0) {
  const g = group(parent, [x, 0, z]);
  g.rotation.y = rotY;
  box(g, [1.3, 0.95, 0.85], [0, 0.475, 0], solid('#e3e6ea'));
  box(g, [1.32, 0.06, 0.87], [0, 0.98, 0], solid('#9aa3ad'));
  box(g, [1.2, 0.08, 0.75], [0, 1.05, -0.02], solid('#cfd5dc'));
  box(g, [0.5, 0.12, 0.3], [0.35, 1.0, 0.36], solid('#2b3140'));
  box(g, [0.08, 0.06, 0.04], [0.5, 1.07, 0.5], new T.MeshBasicMaterial({ color: '#4cd964' }), { cast: false });
  box(g, [0.5, 0.06, 0.6], [0.92, 0.6, 0], solid('#cfd5dc'));
  box(g, [1.0, 0.3, 0.05], [0, 0.5, 0.43], solid('#c3c9d0'));
  const light = box(g, [0.06, 0.02, 0.7], [0, 0.99, -0.02], new T.MeshBasicMaterial({ color: '#b8ffcf' }), { cast: false });
  return { g, scan(t, t0, dur = 0.5) { const u = prog(t, t0, t0 + dur); light.visible = u > 0 && u < 1; light.position.x = lerp(-0.55, 0.55, u); } };
}
