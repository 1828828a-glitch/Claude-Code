export type Pt = { x: number; y: number };

/**
 * 制御点をなめらかにつないだ SVG パス（Catmull-Rom → 3 次ベジエ）。
 * 巣穴のトンネルや行列の経路は、点をいくつか置くだけで曲線になる。
 */
export const smoothPath = (pts: Pt[], tension = 0.5): string => {
  if (pts.length < 2) return "";
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension * 2, y: p1.y + ((p2.y - p0.y) / 6) * tension * 2 };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension * 2, y: p2.y - ((p3.y - p1.y) / 6) * tension * 2 };
    d.push(`C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
};

const bezier = (p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  };
};

/**
 * パス上を等速で進むための座標表。
 * ブラウザの getPointAtLength を使わないので、レンダラでも Studio でも結果が一致する。
 */
export const samplePath = (pts: Pt[], tension = 0.5, perSegment = 24): { points: Pt[]; lengths: number[]; total: number } => {
  const samples: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension * 2, y: p1.y + ((p2.y - p0.y) / 6) * tension * 2 };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension * 2, y: p2.y - ((p3.y - p1.y) / 6) * tension * 2 };
    for (let s = 0; s < perSegment; s++) {
      samples.push(bezier(p1, c1, c2, p2, s / perSegment));
    }
  }
  samples.push(pts[pts.length - 1]);

  const lengths: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  return { points: samples, lengths, total: lengths[lengths.length - 1] };
};

/**
 * パス上の位置と進行方向。t は 0〜1（道のりの割合）。
 * 進行方向が取れるので、アリを進む向きに合わせて傾けられる。
 */
export const pointAt = (pts: Pt[], t: number, tension = 0.5): Pt & { angle: number } => {
  const { points, lengths, total } = samplePath(pts, tension);
  const target = Math.max(0, Math.min(1, t)) * total;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < target) i++;
  const span = lengths[i] - lengths[i - 1] || 1;
  const local = (target - lengths[i - 1]) / span;
  const a = points[i - 1];
  const b = points[i];
  return {
    x: a.x + (b.x - a.x) * local,
    y: a.y + (b.y - a.y) * local,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
};
