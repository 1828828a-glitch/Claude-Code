// 読み込み係: 間取りJSON(office.json)を読んで画面用データに組み立てる。
// マス目⇄ピクセル変換と、壁の当たり判定・A*道さがしもここ。
'use strict';
window.Layout = (() => {
  let data = null;
  let blocked = new Set();
  let TILE = 32, COLS = 42, ROWS = 24;

  const key = (x, y) => x + ',' + y;

  async function load() {
    const res = await fetch('office.json');
    data = await res.json();
    TILE = data.grid.tile; COLS = data.grid.cols; ROWS = data.grid.rows;
    blocked = new Set();
    for (const w of data.walls) {
      for (let dx = 0; dx < w.w; dx++) {
        for (let dy = 0; dy < w.h; dy++) blocked.add(key(w.x + dx, w.y + dy));
      }
    }
    return data;
  }

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const walkable = (x, y) => inBounds(x, y) && !blocked.has(key(x, y));

  // マス中心 = 番号×32＋16
  const center = (t) => ({ x: t[0] * TILE + TILE / 2, y: t[1] * TILE + TILE / 2 });
  const tileOf = (pos) => [
    Math.max(0, Math.min(COLS - 1, Math.floor(pos.x / TILE))),
    Math.max(0, Math.min(ROWS - 1, Math.floor(pos.y / TILE))),
  ];

  // 目的地が壁の中なら、いちばん近い通れるマスに寄せる
  function nearestOpen(t) {
    if (walkable(t[0], t[1])) return t;
    for (let r = 1; r < 8; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = t[0] + dx, y = t[1] + dy;
          if (walkable(x, y)) return [x, y];
        }
      }
    }
    return t;
  }

  // A* 道さがし（4方向）。歩く前に壁を避けた道を引く。
  function findPath(from, to) {
    from = nearestOpen(from); to = nearestOpen(to);
    if (from[0] === to[0] && from[1] === to[1]) return [];
    const open = [{ t: from, g: 0, f: 0, parent: null }];
    const seen = new Map([[key(from[0], from[1]), 0]]);
    const h = (t) => Math.abs(t[0] - to[0]) + Math.abs(t[1] - to[1]);
    let iter = 0;
    while (open.length && iter++ < 6000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur.t[0] === to[0] && cur.t[1] === to[1]) {
        const path = [];
        for (let n = cur; n; n = n.parent) path.unshift(n.t);
        path.shift(); // 現在地は含めない
        return path;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.t[0] + dx, ny = cur.t[1] + dy;
        if (!walkable(nx, ny)) continue;
        const g = cur.g + 1, k = key(nx, ny);
        if (seen.has(k) && seen.get(k) <= g) continue;
        seen.set(k, g);
        open.push({ t: [nx, ny], g, f: g + h([nx, ny]), parent: cur });
      }
    }
    return []; // 道が見つからない
  }

  function roomAt(t) {
    if (!data) return null;
    return data.rooms.find((r) => t[0] >= r.x && t[0] < r.x + r.w && t[1] >= r.y && t[1] < r.y + r.h) || null;
  }

  return {
    load,
    get data() { return data; },
    get TILE() { return TILE; },
    get COLS() { return COLS; },
    get ROWS() { return ROWS; },
    walkable, center, tileOf, nearestOpen, findPath, roomAt,
  };
})();
