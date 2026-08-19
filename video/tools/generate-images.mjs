#!/usr/bin/env node
/**
 * 台本の各カットの絵を OpenAI の画像モデルで生成する。
 *
 * 2段階で作る:
 *   1段目 キャラシート  - 繰り返し出る人物を1枚ずつ作る
 *   2段目 各カットの絵  - そのカットに出る人物のシートを参照画像として渡す
 *
 * 2段階にしているのは、1カットずつ独立に生成すると同じ人物の顔が
 * 毎回変わってしまうため。解説動画で信長が5カット出るなら、5枚とも
 * 同じ顔である必要がある。
 *
 * すでに生成済みのものは飛ばすので、何度実行しても増えた分しか課金されない。
 *
 * 使い方:
 *   OPENAI_API_KEY=sk-... node tools/generate-images.mjs src/scripts/xxx.json
 *
 * オプション:
 *   --dry-run           API を叩かず、送る内容だけを表示する（無料）
 *   --force             既存の画像を無視して作り直す
 *   --quality <level>   low | medium | high | auto  (既定 medium)
 *   --only <n[,n...]>   指定した番号のシーンだけ生成する（1始まり）
 *   --fidelity <level>  参照画像の再現度 high | low (既定 high)
 *
 * 環境変数:
 *   OPENAI_API_KEY   必須（--dry-run 時は不要）
 *   OPENAI_BASE_URL  既定 https://api.openai.com/v1 （プロキシや検証用）
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const BASE_URL = (
  process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
).replace(/\/$/, "");
const MODEL = "gpt-image-1";

/** 台本の format から、モデルが受け付ける解像度に変換する */
const SIZE_BY_FORMAT = {
  landscape: "1536x1024",
  vertical: "1024x1536",
  square: "1024x1024",
};

const fail = (message) => {
  console.error(`エラー: ${message}`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const options = {
    quality: "medium",
    fidelity: "high",
    dryRun: false,
    force: false,
    only: null,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--quality") options.quality = argv[++i];
    else if (arg === "--fidelity") options.fidelity = argv[++i];
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

const exists = async (p) =>
  access(p).then(
    () => true,
    () => false,
  );

const digest = (...parts) =>
  createHash("sha1").update(parts.join(" ")).digest("hex").slice(0, 8);

/** ファイル名に使えない文字を落とす */
const slug = (name) =>
  name.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 24) || "char";

/**
 * 画面に文字を入れさせない、余白を残させる、という共通の縛り。
 * 文字は Remotion 側で乗せるし、映像ではズームやパンをかけるため。
 */
const COMMON_RULES = [
  "画像内に文字・ロゴ・透かしを一切入れないこと。",
  "被写体は中央寄りに配置し、上下左右に余白を残すこと。",
];

const buildScenePrompt = (scenePrompt, imageStyle, characterNames) => {
  const lines = [scenePrompt, imageStyle];
  if (characterNames.length > 0) {
    lines.push(
      `参照画像の人物（${characterNames.join("、")}）を、` +
        "顔・髪型・服装・配色を変えずにそのまま登場させること。",
    );
  }
  return [...lines.filter(Boolean), ...COMMON_RULES].join("\n");
};

/**
 * ロゴだけは例外的に文字を画像へ焼き込む。
 * 番組ロゴの文字は装飾の一部（筆文字・金の縁取り等）であり、
 * Remotion のフォント描画では出せないため。
 */
const buildLogoPrompt = (logoPrompt, title, imageStyle) =>
  [
    logoPrompt,
    // タイトルの改行は「/」区切りにして1行で伝える（プロンプトを崩さない）
    `ロゴに含める文字は「${title.replace(/\n/g, " / ")}」。この文字列だけを正確に描き、他の文字を加えないこと。`,
    imageStyle,
    "背景は完全な透明(アルファ)にすること。",
    "ロゴ全体が中央に収まり、四辺に余白を残すこと。",
  ]
    .filter(Boolean)
    .join("\n");

const buildCharacterPrompt = (charPrompt, imageStyle) =>
  [
    charPrompt,
    imageStyle,
    "全身が入った立ち絵。正面向き、自然な立ち姿。",
    "背景は無地の単色にして、人物だけがはっきり分かるようにすること。",
    ...COMMON_RULES,
  ]
    .filter(Boolean)
    .join("\n");

const decodeImage = (body) => {
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(
      `画像が返りませんでした: ${JSON.stringify(body).slice(0, 300)}`,
    );
  }
  return Buffer.from(b64, "base64");
};

const checkResponse = async (response) => {
  if (response.ok) return response.json();
  const detail = await response.text();
  throw new Error(
    `${response.status} ${response.statusText}\n${detail.slice(0, 500)}`,
  );
};

/** 参照画像なしの生成 */
const generate = async ({ prompt, size, quality, apiKey }) =>
  decodeImage(
    await checkResponse(
      await fetch(`${BASE_URL}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: MODEL, prompt, size, quality, n: 1 }),
      }),
    ),
  );

/**
 * 参照画像ありの生成。キャラの一貫性を保つのはこちら。
 * multipart で送る必要があるので JSON ではなく FormData を使う。
 */
const generateWithReferences = async ({
  prompt,
  size,
  quality,
  fidelity,
  references,
  apiKey,
}) => {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", quality);
  form.append("n", "1");
  form.append("input_fidelity", fidelity);

  for (const ref of references) {
    const bytes = await readFile(ref.path);
    form.append(
      "image[]",
      new File([bytes], path.basename(ref.path), { type: "image/png" }),
    );
  }

  return decodeImage(
    await checkResponse(
      await fetch(`${BASE_URL}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      }),
    ),
  );
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

  const size =
    SIZE_BY_FORMAT[script.format ?? "landscape"] ?? SIZE_BY_FORMAT.landscape;
  const imageStyle = script.imageStyle;

  let changed = false;
  const saveScript = async () => {
    if (options.dryRun || !changed) return;
    await writeFile(scriptPath, `${JSON.stringify(script, null, 2)}\n`);
  };

  // 1段目: キャラシート
  const characters = script.characters ?? {};
  const sheets = new Map();

  for (const [name, def] of Object.entries(characters)) {
    const prompt = buildCharacterPrompt(def.prompt, imageStyle);
    const file = `_char-${slug(name)}-${digest(prompt)}.png`;
    const outPath = path.join(outDir, file);
    sheets.set(name, { path: outPath, file });

    if (!options.force && (await exists(outPath))) {
      if (def.sheet !== path.posix.join("photos", file)) {
        def.sheet = path.posix.join("photos", file);
        changed = true;
      }
      console.log(`[キャラ] ${name}: 生成済み -> ${file}`);
      continue;
    }

    if (options.dryRun) {
      console.log(`[キャラ] ${name} -> ${file}\n${prompt}\n`);
      continue;
    }

    process.stdout.write(`[キャラ] ${name} 生成中... `);
    try {
      const image = await generate({
        prompt,
        size: "1024x1024",
        quality: options.quality,
        apiKey,
      });
      await writeFile(outPath, image);
      def.sheet = path.posix.join("photos", file);
      changed = true;
      await saveScript();
      console.log(`${file} (${Math.round(image.length / 1024)}KB)`);
    } catch (error) {
      console.log("失敗");
      console.error(`  ${error.message}`);
      fail("キャラシートが無いと以降のカットで人物が揃わないため中断します。");
    }
  }

  // 2段目: 各カットの絵
  const setImage = (scene, file) => {
    const next = path.posix.join("photos", file);
    if (scene.image === next) return;
    scene.image = next;
    changed = true;
  };

  const targets = [];
  for (const [index, scene] of (script.scenes ?? []).entries()) {
    const isLogo = scene.type === "logo" && scene.logoPrompt;
    if (!scene.imagePrompt && !isLogo) continue;
    if (options.only && !options.only.has(index + 1)) continue;

    if (isLogo) {
      const prompt = buildLogoPrompt(scene.logoPrompt, scene.title, imageStyle);
      const file = `${scriptName}-logo-${digest(prompt)}.png`;
      const outPath = path.join(outDir, file);
      if (!options.force && (await exists(outPath))) {
        if (scene.logoImage !== path.posix.join("photos", file)) {
          scene.logoImage = path.posix.join("photos", file);
          changed = true;
        }
        console.log(`- ${index + 1}. ロゴ生成済み -> ${file}`);
        continue;
      }
      targets.push({
        index,
        scene,
        outPath,
        file,
        prompt,
        references: [],
        names: [],
        kind: "logo",
      });
      continue;
    }

    const names = (scene.characters ?? []).filter((n) => {
      if (sheets.has(n)) return true;
      console.warn(
        `  警告: シーン${index + 1} のキャラ「${n}」は characters に未定義。無視します。`,
      );
      return false;
    });
    const references = names.map((n) => sheets.get(n));

    const prompt = buildScenePrompt(scene.imagePrompt, imageStyle, names);
    // 参照画像が変われば作り直したいので、シート名もハッシュに含める
    const file = `${scriptName}-${String(index + 1).padStart(2, "0")}-${digest(
      prompt,
      ...references.map((r) => r.file),
    )}.png`;
    const outPath = path.join(outDir, file);

    if (!options.force && (await exists(outPath))) {
      setImage(scene, file);
      console.log(`- ${index + 1}. 生成済みなので飛ばします -> ${file}`);
      continue;
    }
    targets.push({ index, scene, outPath, file, prompt, references, names });
  }

  if (targets.length === 0) {
    console.log("生成が必要なカットはありません。");
    await saveScript();
    return;
  }

  console.log(
    `\n${targets.length}カットを生成します（${size} / quality=${options.quality}）\n`,
  );

  let failures = 0;
  for (const {
    index,
    scene,
    outPath,
    file,
    prompt,
    references,
    names,
    kind,
  } of targets) {
    if (options.dryRun) {
      const ref = names.length > 0 ? ` [参照: ${names.join(", ")}]` : "";
      console.log(`--- ${index + 1}. ${file}${ref}\n${prompt}\n`);
      continue;
    }

    process.stdout.write(`- ${index + 1}. 生成中... `);
    try {
      const image =
        references.length > 0
          ? await generateWithReferences({
              prompt,
              size,
              quality: options.quality,
              fidelity: options.fidelity,
              references,
              apiKey,
            })
          : await generate({ prompt, size, quality: options.quality, apiKey });

      await writeFile(outPath, image);
      if (kind === "logo") {
        scene.logoImage = path.posix.join("photos", file);
        changed = true;
      } else {
        setImage(scene, file);
      }
      await saveScript();
      console.log(`${file} (${Math.round(image.length / 1024)}KB)`);
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
