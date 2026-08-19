#!/usr/bin/env node
/**
 * 地図データ（GeoJSON）を取得して、動画で使える大きさまで簡略化する。
 *
 * 元データは1300万バイトあり、そのままでは Remotion のバンドルに入れられない。
 * 点を間引いて 1/50 以下に落としてから public/maps/ に置く。
 *
 * ■ ライセンスについて（重要）
 * 既定の日本地図は「地球地図日本」（国土地理院）由来のデータ。
 *   - 非営利利用: 出典元（地球地図日本）の明記が必要
 *   - 営利利用:   出典元の明記に加えて、著作権者への利用報告が必要
 * この義務があるため、データはリポジトリに含めず、使う人が自分で取得する形にしている。
 * 台本の map シーンに `attribution` を書けば画面に出典を焼き込める。
 *
 * 使い方:
 *   node tools/fetch-map.mjs                    # 日本の都道府県地図を取得
 *   node tools/fetch-map.mjs --tolerance 0.02   # もっと粗くする（軽くなる）
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SOURCE = {
  url: "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson",
  out: "japan-prefectures.json",
  nameKey: "nam_ja",
  attribution: "出典: 地球地図日本（国土地理院）",
};

const fail = (m) => {
  console.error(`エラー: ${m}`);
  process.exit(1);
};

const args = process.argv.slice(2);
let tolerance = 0.01; // 度。0.01度 ≒ 1km
let minAreaDeg = 0.0008; // これより小さい島は落とす
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--tolerance") tolerance = Number(args[++i]);
  else if (args[i] === "--min-area") minAreaDeg = Number(args[++i]);
  else fail(`不明なオプション: ${args[i]}`);
}

/** 点と線分の距離（度のまま扱う。日本の緯度なら十分な近似） */
const perpDistance = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + clamped * dx), py - (ay + clamped * dy));
};

/**
 * Douglas-Peucker。輪郭の形を保ったまま点を間引く。
 *
 * 再帰で書くと点数の多い海岸線でスタックを使い切るので、
 * 自前のスタックで反復的に処理する（node に --stack-size を渡さずに済む）。
 */
const simplify = (points, tol) => {
  if (points.length <= 2) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index !== -1 && maxDist > tol) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i] === 1);
};

/** 靴紐公式。小さい島を落とす判定に使う */
const ringArea = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum) / 2;
};

const round = (points) =>
  points.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]);

const simplifyPolygon = (rings) =>
  rings
    .map((ring) => simplify(ring, tolerance))
    .filter((ring) => ring.length >= 4 && ringArea(ring) >= minAreaDeg)
    .map(round);

const main = async () => {
  console.log(`▸ 取得中: ${SOURCE.url}`);
  const response = await fetch(SOURCE.url);
  if (!response.ok) fail(`${response.status} ${response.statusText}`);
  const raw = await response.json();
  const before = JSON.stringify(raw).length;

  const features = [];
  for (const feature of raw.features) {
    const name = feature.properties?.[SOURCE.nameKey];
    if (!name) continue;

    const g = feature.geometry;
    let polygons = [];
    if (g.type === "Polygon") polygons = [simplifyPolygon(g.coordinates)];
    else if (g.type === "MultiPolygon")
      polygons = g.coordinates.map(simplifyPolygon);
    polygons = polygons.filter((p) => p.length > 0);
    if (polygons.length === 0) continue;

    features.push({ name, polygons });
  }

  // 動画で扱いやすい最小限の形にしてから書き出す（GeoJSON のままだと冗長）
  const out = {
    attribution: SOURCE.attribution,
    tolerance,
    features,
  };
  const json = JSON.stringify(out);

  const dir = path.join("public", "maps");
  await mkdir(dir, { recursive: true });
  const outPath = path.join(dir, SOURCE.out);
  await writeFile(outPath, json);

  const points = features.reduce(
    (n, f) => n + f.polygons.flat().reduce((m, r) => m + r.length, 0),
    0,
  );
  console.log(`▸ ${features.length}件 / ${points}点`);
  console.log(
    `▸ ${Math.round(before / 1024)}KB → ${Math.round(json.length / 1024)}KB : ${outPath}`,
  );
  console.log("");
  console.log("■ ライセンス");
  console.log(`  ${SOURCE.attribution}`);
  console.log("  非営利: 出典の明記が必要");
  console.log("  営利  : 出典の明記に加えて著作権者への利用報告が必要");
  console.log("  台本の map シーンに attribution を書くと画面に出せます。");
};

main().catch((e) => fail(e.stack ?? e.message));
