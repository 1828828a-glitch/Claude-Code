/**
 * 台本に出てくる文字だけを残したフォントを作る。
 *
 * Noto Sans JP は 1 ウェイトで 1MB を超える。そのまま動画に埋め込むと、
 * レンダリング中にフォントの読み込みが返ってこなくなることがあり、
 * 1800 フレームのうち 1 フレームでも詰まると書き出し全体が失敗する。
 * 実際に使う文字は 600 字ほどなので、そこまで削れば 100KB を切る。
 *
 *   node scripts/build-fonts.mjs
 *
 * 台本に新しい漢字を足したら、これを流し直すこと（npm run fonts）。
 */
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "fonts-source");
const outDir = path.join(root, "src/assets/fonts");
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.2.5/files";

const WEIGHTS = ["700", "900"];

/** 台本を書き換えても崩れないよう、かな・英数・約物は最初から全部入れておく。 */
const alwaysInclude = () => {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(String.fromCharCode(c)); // ASCII
  for (let c = 0x3041; c <= 0x30ff; c++) set.add(String.fromCharCode(c)); // かな・カナ
  for (const c of "　、。・ー〜「」『』（）【】％±°℃㎡→←↑↓…‥") set.add(c);
  for (const c of "０１２３４５６７８９") set.add(c);
  return set;
};

const collectSourceCharacters = async (dir, set) => {
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      await collectSourceCharacters(full, set);
    } else if (/\.tsx?$/.test(entry)) {
      for (const c of await readFile(full, "utf8")) set.add(c);
    }
  }
  return set;
};

const download = async (file) => {
  const target = path.join(sourceDir, file);
  if (existsSync(target)) return target;
  process.stdout.write(`元フォントを取得: ${file} ... `);
  const res = await fetch(`${CDN}/${file}`);
  if (!res.ok) throw new Error(`${file} を取得できませんでした (HTTP ${res.status})`);
  await mkdir(sourceDir, { recursive: true });
  await writeFile(target, Buffer.from(await res.arrayBuffer()));
  console.log("完了");
  return target;
};

const characters = await collectSourceCharacters(path.join(root, "src"), alwaysInclude());
const text = [...characters].filter((c) => !"\n\r\t".includes(c)).join("");
console.log(`台本と部品から ${text.length} 文字を収集`);

await mkdir(outDir, { recursive: true });
for (const weight of WEIGHTS) {
  const source = await download(`noto-sans-jp-japanese-${weight}-normal.woff2`);
  const subset = await subsetFont(await readFile(source), text, { targetFormat: "woff2" });
  const out = path.join(outDir, `noto-sans-jp-${weight}.subset.woff2`);
  await writeFile(out, subset);
  console.log(
    `${path.relative(root, out)}  ${(subset.length / 1024).toFixed(0)}KB ` +
      `(元は ${((await stat(source)).size / 1024).toFixed(0)}KB)`,
  );
}
