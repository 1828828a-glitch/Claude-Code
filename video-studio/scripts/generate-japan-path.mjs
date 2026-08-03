import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';

const topo = JSON.parse(readFileSync('countries-50m.json', 'utf8'));
const countries = feature(topo, topo.objects.countries);
const japan = countries.features.find((f) => f.id === '392');
if (!japan) throw new Error('Japan not found');

// Project Japan into a 1000x1000 viewBox
const projection = geoMercator().fitExtent(
  [
    [0, 0],
    [1000, 1000],
  ],
  japan
);
const path = geoPath(projection);
const d = path(japan);

// Also export projected coordinates for major landmarks so scenes can pin labels
const places = {
  edo: [139.767, 35.681], // 江戸/東京
  kyoto: [135.768, 35.011],
  osaka: [135.502, 34.694],
  uraga: [139.717, 35.245],
  nagoya: [136.906, 35.181],
  kamakura: [139.55, 35.32],
  hiroshima: [132.455, 34.385],
  hakata: [130.402, 33.59],
  sendai: [140.869, 38.268],
  sapporo: [141.354, 43.062],
  kagoshima: [130.558, 31.597],
  shimonoseki: [130.941, 33.958],
  azuchi: [136.139, 35.146],
  honnoji: [135.767, 35.005],
};
const projected = Object.fromEntries(
  Object.entries(places).map(([k, v]) => {
    const p = projection(v);
    return [k, [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]];
  })
);

// Helper so MapScene can project arbitrary lon/lat: export the mercator params.
// fitExtent produces scale + translate; capture them.
const scale = projection.scale();
const translate = projection.translate();

const out = `// 自動生成: world-atlas@2.0.2 countries-50m.json から抽出した日本のアウトライン。
// viewBox は 0 0 1000 1000。genmap スクリプト(scripts/generate-japan-path.mjs)で再生成可能。
export const JAPAN_PATH = ${JSON.stringify(d)};

// メルカトル投影パラメータ(lon/lat → viewBox座標の変換用)
export const MERCATOR = { scale: ${scale}, translate: [${translate[0]}, ${translate[1]}] as [number, number] };

export const project = ([lon, lat]: [number, number]): [number, number] => {
  const λ = (lon * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const x = MERCATOR.scale * λ + MERCATOR.translate[0];
  const y = MERCATOR.scale * -Math.log(Math.tan(Math.PI / 4 + φ / 2)) + MERCATOR.translate[1];
  return [x, y];
};

// 主要地点のviewBox座標
export const PLACES: Record<string, [number, number]> = ${JSON.stringify(projected, null, 2)};
`;
writeFileSync('japanPath.ts', out);
console.log('path length:', d.length, 'uraga:', projected.uraga, 'kyoto:', projected.kyoto);
