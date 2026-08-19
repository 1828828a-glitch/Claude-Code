/**
 * 地図データを SVG のパスに変換する。
 *
 * d3-geo を入れるほどの用途ではない（投影は1種類で足りる）ので、
 * メルカトル投影だけを自前で持つ。日本の緯度なら形の破綻もない。
 */

export type MapFeature = {
  name: string;
  /** ポリゴンの配列。各ポリゴンは [外周, 穴, ...] の環の配列 */
  polygons: [number, number][][][];
};

export type MapData = {
  attribution?: string;
  features: MapFeature[];
};

/**
 * メルカトル投影。
 *
 * x と y は必ず同じ単位系（ラジアン）で揃えること。
 * 経度を度のまま使うと、y だけラジアン系になって縦横比が 57 倍狂い、
 * 日本が横一本の線に潰れる。
 */
const mercatorX = (lon: number) => (lon * Math.PI) / 180;
const mercatorY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/** 外周リングの面積（度の二乗のまま。大小比較にしか使わない） */
const polygonArea = (ring: [number, number][]): number => {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum) / 2;
};

/**
 * バウンディングボックスを取る。
 *
 * mainlandOnly を立てると、各地物の「最大のポリゴン＝本体」だけで測る。
 * 東京都は伊豆・小笠原諸島を含むため、離島込みで測ると南へ大きく
 * 引っ張られて、寄ったはずの地図が海だらけになる。
 */
const boundsOf = (features: MapFeature[], mainlandOnly = false): Bounds => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const feature of features) {
    let polygons = feature.polygons;
    if (mainlandOnly && polygons.length > 1) {
      polygons = [
        polygons.reduce((largest, polygon) =>
          polygonArea(polygon[0] ?? []) > polygonArea(largest[0] ?? [])
            ? polygon
            : largest,
        ),
      ];
    }
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [lon, lat] of ring) {
          const x = mercatorX(lon);
          const y = mercatorY(lat);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  return { minX, maxX, minY, maxY };
};

export type Projection = (lon: number, lat: number) => [number, number];

/**
 * 与えられた地図が幅 width / 高さ height にちょうど収まる投影を作る。
 * 縦横比は保つので、日本が潰れたり伸びたりしない。
 */
export const fitProjection = (
  features: MapFeature[],
  width: number,
  height: number,
  padding = 0,
  /**
   * 画面に収める対象。既定は features 全体。
   * 一部だけ渡すとそこに寄った絵になる（日本は斜めに長いので、
   * 全体に合わせると本州が小さくなってしまう）。
   */
  fitTo: MapFeature[] = features,
): { project: Projection; bounds: Bounds } => {
  const zoomed = fitTo !== features && fitTo.length > 0;
  const bounds = boundsOf(zoomed ? fitTo : features, zoomed);
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;

  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const scale = Math.min(usableW / spanX, usableH / spanY);

  // 余った分は中央に寄せる
  const offsetX = padding + (usableW - spanX * scale) / 2;
  const offsetY = padding + (usableH - spanY * scale) / 2;

  const project: Projection = (lon, lat) => [
    offsetX + (mercatorX(lon) - bounds.minX) * scale,
    // SVG は下向きが正なので、緯度は反転する
    offsetY + (bounds.maxY - mercatorY(lat)) * scale,
  ];

  return { project, bounds };
};

/** 1つの地物を SVG の d 属性に変換する */
export const featureToPath = (
  feature: MapFeature,
  project: Projection,
): string => {
  const parts: string[] = [];

  for (const polygon of feature.polygons) {
    for (const ring of polygon) {
      if (ring.length < 2) continue;
      const points = ring.map(([lon, lat]) => {
        const [x, y] = project(lon, lat);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      parts.push(`M${points.join("L")}Z`);
    }
  }
  return parts.join("");
};

/** 地物の重心（ラベルを置く位置に使う） */
export const featureCentroid = (
  feature: MapFeature,
  project: Projection,
): [number, number] => {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const polygon of feature.polygons) {
    // 外周だけ見れば十分
    for (const [lon, lat] of polygon[0] ?? []) {
      const [x, y] = project(lon, lat);
      sumX += x;
      sumY += y;
      count += 1;
    }
  }
  return count === 0 ? [0, 0] : [sumX / count, sumY / count];
};
