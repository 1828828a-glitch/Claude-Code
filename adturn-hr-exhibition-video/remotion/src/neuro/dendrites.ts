import {random} from 'remotion';

// ── 手続き型ニューロン生成(決定論的) ──
// スタイルA(マイクロスコピー)とスタイルC(電子顕微鏡)で共用。
// 細胞体(ソーマ)から樹状突起がランダムウォークで枝分かれする。

export type Pt = [number, number];
export type Branch = {pts: Pt[]};
export type Neuron = {x: number; y: number; r: number; branches: Branch[]};

export const makeNeurons = (seed: string, count: number, w = 1920, h = 1080): Neuron[] => {
  const res: Neuron[] = [];
  for (let i = 0; i < count; i++) {
    const x = 60 + random(`${seed}x${i}`) * (w - 120);
    const y = 60 + random(`${seed}y${i}`) * (h - 120);
    const r = 9 + random(`${seed}r${i}`) * 15;
    const nb = 3 + Math.floor(random(`${seed}nb${i}`) * 3);
    const branches: Branch[] = [];
    for (let b = 0; b < nb; b++) {
      let ang = random(`${seed}a${i}_${b}`) * Math.PI * 2;
      let px = x;
      let py = y;
      const pts: Pt[] = [[px, py]];
      const segs = 9 + Math.floor(random(`${seed}s${i}_${b}`) * 8);
      let step = 16 + random(`${seed}st${i}_${b}`) * 18;
      for (let s2 = 0; s2 < segs; s2++) {
        ang += (random(`${seed}d${i}_${b}_${s2}`) - 0.5) * 0.95;
        px += Math.cos(ang) * step;
        py += Math.sin(ang) * step;
        step *= 0.965;
        pts.push([px, py]);
      }
      branches.push({pts});
      // 途中から生える子枝
      if (random(`${seed}sb${i}_${b}`) < 0.75) {
        const k = 3 + Math.floor(random(`${seed}k${i}_${b}`) * Math.max(1, segs - 5));
        const base = pts[Math.min(k, pts.length - 1)];
        let a2 = ang + (random(`${seed}a2${i}_${b}`) - 0.5) * 2.6;
        let qx = base[0];
        let qy = base[1];
        const pts2: Pt[] = [[qx, qy]];
        let st2 = 11 + random(`${seed}st2${i}_${b}`) * 10;
        const segs2 = 5 + Math.floor(random(`${seed}s2${i}_${b}`) * 5);
        for (let s3 = 0; s3 < segs2; s3++) {
          a2 += (random(`${seed}d2${i}_${b}_${s3}`) - 0.5) * 1.0;
          qx += Math.cos(a2) * st2;
          qy += Math.sin(a2) * st2;
          st2 *= 0.95;
          pts2.push([qx, qy]);
        }
        branches.push({pts: pts2});
      }
    }
    res.push({x, y, r, branches});
  }
  return res;
};

export const pathD = (pts: Pt[]): string => 'M ' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');

// ポリライン上の位置(t: 0..1)
export const pointAt = (pts: Pt[], t: number): Pt => {
  const f = Math.min(Math.max(t, 0), 1) * (pts.length - 1);
  const i = Math.floor(f);
  const u = f - i;
  const a = pts[Math.min(i, pts.length - 1)];
  const b = pts[Math.min(i + 1, pts.length - 1)];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
};
