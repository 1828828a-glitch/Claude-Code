// 素材写真の背景透過ツール
//   商品写真: BiRefNet (MIT License) で切り抜き、白背景のにじみを除去
//   ロゴ    : フラットな図形なので色キーで切り抜き、文字の穴も透過
// 使い方: node tools/cutout.mjs
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/source');
const OUT = path.join(ROOT, 'assets/cutout');

const PRODUCTS = [
  'magamp_k_chuutsubu',
  'rikidus_granule',
  'rikidus_liquid',
  'hyponex_genki',
];
const LOGO = 'hyponex_logo';

async function readRGB(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function writeRGBA(file, rgba, width, height, pad = 6) {
  // 透明な余白を削って保存する
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > 3) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const w = Math.min(width, maxX + pad + 1) - left;
  const h = Math.min(height, maxY + pad + 1) - top;
  await sharp(Buffer.from(rgba.buffer), { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: w, height: h })
    .png({ compressionLevel: 9 })
    .toFile(file);
  return { w, h };
}

// 白背景で撮影された写真のフチに残る白を取り除く
// 観測色 I = a*F + (1-a)*白 なので F = (I - (1-a)*255) / a
function decontaminate(rgb, alpha, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    let a = alpha[i] / 255;
    if (a < 0.03) a = 0;
    const o = i * 4;
    if (a === 0) {
      out[o] = out[o + 1] = out[o + 2] = 255;
      out[o + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) {
      const I = rgb[i * 3 + c];
      const F = a > 0.98 ? I : (I - (1 - a) * 255) / Math.max(a, 0.2);
      out[o + c] = Math.max(0, Math.min(255, Math.round(F)));
    }
    out[o + 3] = Math.round(a * 255);
  }
  return out;
}

async function cutProducts(names) {
  const { AutoModel, AutoProcessor, RawImage, env } = await import('@huggingface/transformers');
  env.cacheDir = process.env.HF_CACHE_DIR || path.join(ROOT, '.cache/hf');
  const modelId = 'onnx-community/BiRefNet-ONNX';
  console.log('loading', modelId, '(初回は約1GBのダウンロードがあります)');
  const model = await AutoModel.from_pretrained(modelId, { dtype: 'fp32' });
  const processor = await AutoProcessor.from_pretrained(modelId);

  for (const name of names) {
    const file = path.join(SRC, `${name}.webp`);
    const t0 = Date.now();
    const png = await sharp(file).removeAlpha().png().toBuffer();
    const image = await RawImage.fromBlob(new Blob([png], { type: 'image/png' }));
    const { pixel_values } = await processor(image);
    const { output_image } = await model({ input_image: pixel_values });
    const maskImg = await RawImage.fromTensor(output_image[0].sigmoid().mul(255).to('uint8'))
      .resize(image.width, image.height);
    const alpha = maskImg.data; // 1ch
    const { data: rgb, width, height } = await readRGB(file);
    const rgba = decontaminate(rgb, alpha, width, height);
    await sharp(Buffer.from(alpha), { raw: { width, height, channels: 1 } })
      .png().toFile(path.join(ROOT, '.cache', `${name}_mask.png`));
    const size = await writeRGBA(path.join(OUT, `${name}.png`), rgba, width, height);
    console.log(`${name}: ${size.w}x${size.h} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}

// ロゴ: はっきりした色の画素を「塗り」とし、各画素に最も近い塗りの色を基準に
// 白からの距離で不透明度を決める。文字の穴(P, O, e)も背景として透過される。
async function cutLogo() {
  const file = path.join(SRC, `${LOGO}.webp`);
  const { data: rgb, width, height } = await readRGB(file);
  const N = width * height;
  const solid = new Uint8Array(N);
  const near = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const dist = Math.max(255 - r, 255 - g, 255 - b);
    if (dist > 150) {
      solid[i] = 1;
      near[i] = i;
      queue[qt++] = i;
    }
  }
  // 多点BFSで最寄りの塗り画素を求める
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width, y = (i / width) | 0;
    const nb = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1];
    for (const j of nb) {
      if (j >= 0 && near[j] < 0) {
        near[j] = near[i];
        queue[qt++] = j;
      }
    }
  }
  const rgba = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    const s = near[i];
    const F = [rgb[s * 3], rgb[s * 3 + 1], rgb[s * 3 + 2]];
    const I = [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]];
    // 白→塗り色 の線上に射影して不透明度を出す
    let num = 0, den = 0;
    for (let c = 0; c < 3; c++) {
      num += (255 - I[c]) * (255 - F[c]);
      den += (255 - F[c]) * (255 - F[c]);
    }
    let a = den > 0 ? num / den : 0;
    a = Math.max(0, Math.min(1, a));
    if (a < 0.04) a = 0;
    if (a > 0.96) a = 1;
    const o = i * 4;
    const useOwn = solid[i] && a === 1;
    rgba[o] = useOwn ? I[0] : F[0];
    rgba[o + 1] = useOwn ? I[1] : F[1];
    rgba[o + 2] = useOwn ? I[2] : F[2];
    rgba[o + 3] = Math.round(a * 255);
  }
  const size = await writeRGBA(path.join(OUT, `${LOGO}.png`), rgba, width, height, 4);
  console.log(`${LOGO}: ${size.w}x${size.h}`);
}

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(path.join(ROOT, '.cache'), { recursive: true });
const only = process.argv.find((a) => a.startsWith('--product='));
if (only) {
  await cutProducts([only.split('=')[1]]);
} else {
  await cutLogo();
  if (!process.argv.includes('--logo-only')) {
    // 1枚ごとに別プロセスで推論してメモリを解放する
    const { execFileSync } = await import('node:child_process');
    for (const name of PRODUCTS) {
      execFileSync(process.execPath, [fileURLToPath(import.meta.url), `--product=${name}`], { stdio: 'inherit' });
    }
  }
}
