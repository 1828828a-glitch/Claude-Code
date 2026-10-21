// 紹介動画を書き出す。index.html を1コマずつ撮って ffmpeg に流し、H.264 の MP4 と字幕（SRT）を作る
// 先に shots.cjs で画面を撮っておく。
// 使い方:
//   node security_portal/video/render.cjs                 → out/intro.mp4 と out/intro.srt
//   node security_portal/video/render.cjs --stills 3,8,15 → 指定した秒の静止画だけ out/ に書く（確認用）
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const FPS = 30;
const OUT = path.join(__dirname, "out");
const PAGE = "file://" + path.join(__dirname, "index.html") + "?render";

function srtTime(sec) {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const stillsArg = process.argv.indexOf("--stills");
  const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(",").map(Number) : null;

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await page.goto(PAGE, { waitUntil: "networkidle" });
  const { duration, captions } = await page.evaluate(() => ({ duration: window.VIDEO.duration, captions: window.VIDEO.captions }));
  // 各場面を一度描いて、使う文字のフォントを先に読み込ませる
  for (let t = 0.5; t < duration; t += 1.5) await page.evaluate((x) => window.VIDEO.seek(x), t);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  if (stills) {
    for (const t of stills) {
      await page.evaluate((x) => window.VIDEO.seek(x), t);
      await page.screenshot({ path: path.join(OUT, `still-${String(t).replace(".", "_")}.png`) });
    }
    await browser.close();
    console.log("stills:", stills.join(", "));
    return;
  }

  const mp4 = path.join(OUT, "intro.mp4");
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", mp4], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg " + code)))));

  const frames = Math.round(duration * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((x) => window.VIDEO.seek(x), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 300 === 0) console.log(`${i}/${frames}`);
  }
  ff.stdin.end();
  await done;
  await browser.close();

  const srt = captions.map(([s, e, text], i) => `${i + 1}\n${srtTime(s)} --> ${srtTime(e)}\n${text}\n`).join("\n");
  fs.writeFileSync(path.join(OUT, "intro.srt"), srt, "utf8");
  console.log("wrote", mp4, "and intro.srt");
})();
