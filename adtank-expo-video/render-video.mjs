/**
 * adtank-expo-video/index.html を 30fps でフレーム書き出しし、
 * ffmpeg (libx264) にパイプして MP4 を生成する。
 *
 * 使い方:
 *   node render-video.mjs [出力パス] [ffmpegパス]
 *
 * 前提:
 *   - playwright (npm) がインストール済み
 *   - Chromium が PLAYWRIGHT_BROWSERS_PATH 配下に存在
 *   - libx264 入りの ffmpeg（例: pip install imageio-ffmpeg のバイナリ）
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = "file://" + path.join(__dirname, "index.html");
const OUT = process.argv[2] || path.join(__dirname, "adtank-digibure-expo-60s.mp4");
const FFMPEG = process.argv[3] || findFfmpeg();
const FPS = 30;

function findFfmpeg() {
  const candidates = [
    "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2",
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("ffmpeg が見つかりません。第2引数でパスを指定してください。");
}

function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  if (!existsSync(root)) return undefined;
  for (const d of readdirSync(root)) {
    if (d.startsWith("chromium-")) {
      const bin = path.join(root, d, "chrome-linux", "chrome");
      if (existsSync(bin)) return bin;
    }
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(HTML);
await page.evaluate(() => document.fonts.ready);

const duration = await page.evaluate(() => window.__DURATION);
const total = Math.round(duration * FPS);
console.log(`rendering ${total} frames @ ${FPS}fps -> ${OUT}`);

const ff = spawn(FFMPEG, [
  "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium",
  "-movflags", "+faststart",
  OUT,
], { stdio: ["pipe", "inherit", "inherit"] });

const ffDone = new Promise((res, rej) =>
  ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg exit " + c)))));

for (let i = 0; i < total; i++) {
  const dataUrl = await page.evaluate((t) => window.__frame(t), i / FPS);
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 150 === 0) console.log(`  frame ${i}/${total}`);
}
ff.stdin.end();
await ffDone;
await browser.close();
console.log("done:", OUT);
