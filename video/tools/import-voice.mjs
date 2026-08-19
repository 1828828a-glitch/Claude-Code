#!/usr/bin/env node
/**
 * 外部で用意したナレーション音声を台本に取り込む。
 *
 * OpenAI の API を使わずに、VOICEVOX などの無料ソフトや自分の声の録音で
 * ナレーションを作りたい人のための入口。カット番号をファイル名にした
 * 音声を渡すと、public/voice/ に配置して voiceFile / voiceSeconds を
 * 台本に書き戻す。以降そのカットの尺は音声の実測の長さで確定する。
 *
 * 使い方:
 *   node tools/import-voice.mjs <台本.json> <音声フォルダ>
 *
 * 音声ファイルの名前はカット番号（1始まり）で始めること:
 *   01.wav  02.mp3  05.m4a  ...   （cut01.wav や 1-タイトル.wav でも可）
 *
 * 対応形式: wav / mp3 / m4a / aac / ogg / flac
 * 長さの計測には Remotion 同梱の ffprobe を使うので、追加インストール不要。
 */
import { readFile, writeFile, mkdir, readdir, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const AUDIO_EXT = new Set([".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac"]);

const fail = (message) => {
  console.error(`エラー: ${message}`);
  process.exit(1);
};

/** Remotion 同梱の ffprobe を探す（プラットフォーム別パッケージのどれか） */
const findFfprobe = async () => {
  const base = path.join("node_modules", "@remotion");
  for (const dir of await readdir(base)) {
    if (!dir.startsWith("compositor-")) continue;
    const bin = path.join(base, dir, "ffprobe");
    try {
      await readFile(path.join(base, dir, "package.json"));
      return { bin, libDir: path.join(base, dir) };
    } catch {
      /* 次を試す */
    }
  }
  fail("ffprobe が見つかりません。video/ で npm install 済みか確認してください。");
};

const probeSeconds = (ffprobe, file) => {
  const out = execFileSync(
    ffprobe.bin,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    {
      env: {
        ...process.env,
        // 同梱の共有ライブラリを見つけさせる（Linux / macOS）
        LD_LIBRARY_PATH: ffprobe.libDir,
        DYLD_LIBRARY_PATH: ffprobe.libDir,
      },
    },
  )
    .toString()
    .trim();
  const seconds = Number(out);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`長さを計測できませんでした: ${file} (${out})`);
  }
  return seconds;
};

const main = async () => {
  const [scriptPath, audioDir] = process.argv.slice(2);
  if (!scriptPath || !audioDir) {
    fail("使い方: node tools/import-voice.mjs <台本.json> <音声フォルダ>");
  }

  const script = JSON.parse(await readFile(scriptPath, "utf8"));
  const scriptName = path.basename(scriptPath, ".json");
  const scenes = script.scenes ?? [];
  const ffprobe = await findFfprobe();

  const outDir = path.join("public", "voice");
  await mkdir(outDir, { recursive: true });

  // フォルダから「番号 → 音声ファイル」の対応を作る
  const entries = [];
  for (const name of await readdir(audioDir)) {
    const ext = path.extname(name).toLowerCase();
    if (!AUDIO_EXT.has(ext)) continue;
    const match = /(\d+)/.exec(path.basename(name, ext));
    if (!match) {
      console.warn(`  警告: 番号が読み取れないので飛ばします: ${name}`);
      continue;
    }
    entries.push({ index: Number(match[1]), src: path.join(audioDir, name), ext });
  }
  if (entries.length === 0) {
    fail(`音声ファイルが見つかりません: ${audioDir}（wav/mp3/m4a/aac/ogg/flac）`);
  }
  entries.sort((a, b) => a.index - b.index);

  let imported = 0;
  for (const { index, src, ext } of entries) {
    const scene = scenes[index - 1];
    if (!scene) {
      console.warn(`  警告: カット${index} は台本にありません（全${scenes.length}カット）`);
      continue;
    }

    const seconds = probeSeconds(ffprobe, src);
    // 「manual-」で始めて、npm run voice が作るファイルと名前空間を分ける
    const file = `manual-${scriptName}-${String(index).padStart(2, "0")}${ext}`;
    await copyFile(src, path.join(outDir, file));

    scene.voiceFile = path.posix.join("voice", file);
    scene.voiceSeconds = Math.round(seconds * 1000) / 1000;
    imported += 1;
    console.log(
      `- カット${index} (${scene.type}): ${seconds.toFixed(2)}秒 -> ${file}`,
    );
  }

  await writeFile(scriptPath, `${JSON.stringify(script, null, 2)}\n`);
  console.log(`\n${imported}カットに音声を割り当て、台本の尺を実測値で更新しました。`);

  const missing = scenes
    .map((sc, i) => ({ i: i + 1, sc }))
    .filter(({ sc }) => sc.voiceText && !sc.voiceFile);
  if (missing.length > 0) {
    console.log(`まだ音声が無いカット: ${missing.map(({ i }) => i).join(", ")}`);
  }
};

main().catch((error) => fail(error.stack ?? error.message));
