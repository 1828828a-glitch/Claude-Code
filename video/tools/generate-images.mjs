#!/usr/bin/env node
/**
 * 台本の各カットの絵を OpenAI の画像モデルで生成する。
 *
 * 台本に `imagePrompt` が書かれたシーンだけを対象にして画像を作り、
 * 保存先のパスを `image` に書き戻す。すでに `image` があって実ファイルも
 * あるカットは飛ばすので、何度実行しても増えた分だけしか課金されない。
 *
 * 使い方:
 *   OPENAI_API_KEY=sk-... node tools/generate-images.mjs src/scripts/xxx.json
 *
 * オプション:
 *   --dry-run           API を叩かず、送信するプロンプトだけを表示する（無料）
 *   --force             既存の画像を無視して作り直す
 *   --quality <level>   low | medium | high | auto  (既定 medium)
 *   --only <n[,n...]>   指定した番号のシーンだけ生成する（1始まり）
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const API_URL = "https://api.openai.com/v1/images/generations";
const MODEL = "gpt-image-1";

/** 台本の format から、モデルが受け付ける解像度に変換する */
const SIZE_BY_FORMAT = {
  landscape: "1536x1024",
  vertical: "1024x1536",
  square: "1024x1024",
};

const parseArgs = (argv) => {
  const options = { quality: "medium", dryRun: false, force: false, only: null };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--quality") options.quality = argv[++i];
    else if (arg === "--only")
      options.only = new Set(
        (argv[++i] ?? "").split(",").map((n) => Number(n.trim())),
      );
    else if (arg.startsWith("--")) fail(`不明なオプション: ${arg}`);
    else positional.push(arg);
  }

  if (positional.length !== 1) {
    fail("台本の JSON を1つ指定してください（例: src/scripts/xxx.json）");
  }
  return { scriptPath: positional[0], options };
};

const fail = (message) => {
  console.error(`エラー: ${message}`);
  process.exit(1);
};

const exists = async (p) =>
  access(p).then(
    () => true,
    () => false,
  );

/**
 * プロンプトから決まるファイル名。
 * プロンプトを書き換えたら別ファイルになるので、
 * 「文言を直したのに古い絵のまま」という事故が起きない。
 */
const fileNameFor = (scriptName, index, prompt) => {
  const digest = createHash("sha1").update(prompt).digest("hex").slice(0, 8);
  return `${scriptName}-${String(index + 1).padStart(2, "0")}-${digest}.png`;
};

/**
 * 実際に送るプロンプト。
 * 画風(imageStyle)を後ろに付けることで、全カットの絵柄を揃える。
 * 文字は Remotion 側で乗せるので、画像には焼き込ませない。
 */
const buildPrompt = (scenePrompt, imageStyle) =>
  [
    scenePrompt,
    imageStyle,
    "画像内に文字・ロゴ・透かしを一切入れないこと。",
    "被写体は中央寄りに配置し、上下左右に余白を残すこと（映像でズームやパンをかけるため）。",
  ]
    .filter(Boolean)
    .join("\n");

const generateImage = async ({ prompt, size, quality, apiKey }) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, prompt, size, quality, n: 1 }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${response.status} ${response.statusText}\n${detail}`);
  }

  const body = await response.json();
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`画像が返りませんでした: ${JSON.stringify(body)}`);
  return Buffer.from(b64, "base64");
};

const main = async () => {
  const { scriptPath, options } = parseArgs(process.argv.slice(2));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !options.dryRun) {
    fail("OPENAI_API_KEY が設定されていません（--dry-run なら不要です）");
  }

  const script = JSON.parse(await readFile(scriptPath, "utf8"));
  const scriptName = path.basename(scriptPath, ".json");
  const outDir = path.join("public", "photos");
  await mkdir(outDir, { recursive: true });

  const size = SIZE_BY_FORMAT[script.format ?? "landscape"] ?? SIZE_BY_FORMAT.landscape;

  // 台本を書き換えたときだけ保存する。--dry-run では一切書かない
  let changed = false;
  const saveScript = async () => {
    if (options.dryRun || !changed) return;
    await writeFile(scriptPath, `${JSON.stringify(script, null, 2)}\n`);
  };
  const setImage = (scene, fileName) => {
    const next = path.posix.join("photos", fileName);
    if (scene.image === next) return;
    scene.image = next;
    changed = true;
  };

  const targets = [];
  for (const [index, scene] of script.scenes.entries()) {
    if (!scene.imagePrompt) continue;
    if (options.only && !options.only.has(index + 1)) continue;

    const fileName = fileNameFor(scriptName, index, scene.imagePrompt);
    const outPath = path.join(outDir, fileName);

    if (!options.force && (await exists(outPath))) {
      // 生成済み。パスだけ確実に台本へ反映しておく
      setImage(scene, fileName);
      console.log(`- ${index + 1}. 生成済みなので飛ばします → ${fileName}`);
      continue;
    }
    targets.push({ index, scene, outPath, fileName });
  }

  if (targets.length === 0) {
    console.log("生成が必要なカットはありません。");
    await saveScript();
    return;
  }

  console.log(
    `${targets.length}カットを生成します（${size} / quality=${options.quality}）\n`,
  );

  let failures = 0;
  for (const { index, scene, outPath, fileName } of targets) {
    const prompt = buildPrompt(scene.imagePrompt, script.imageStyle);

    if (options.dryRun) {
      console.log(`--- ${index + 1}. ${fileName}\n${prompt}\n`);
      continue;
    }

    process.stdout.write(`- ${index + 1}. 生成中... `);
    try {
      const image = await generateImage({
        prompt,
        size,
        quality: options.quality,
        apiKey,
      });
      await writeFile(outPath, image);
      setImage(scene, fileName);
      // 1枚ごとに書き戻す。途中で失敗しても、できた分は残る
      await saveScript();
      console.log(`${fileName} (${Math.round(image.length / 1024)}KB)`);
    } catch (error) {
      failures += 1;
      console.log("失敗");
      console.error(`  ${error.message}`);
    }
  }

  if (options.dryRun) {
    console.log("--dry-run のため画像は生成していません。");
    return;
  }

  console.log(
    `\n完了: ${targets.length - failures}/${targets.length} 枚。台本を更新しました。`,
  );
  if (failures > 0) process.exit(1);
};

main().catch((error) => fail(error.stack ?? error.message));
