---
name: codex-imagegen
description: Claude Code から Codex CLI (`codex exec` + `$imagegen` / gpt-image-2) を起こして画像を生成するスキル。ChatGPT サブスクの枠内で動くので画像用の API キーは不要。単発の画像生成と、動画編集用の B-roll 一括生成（JSON のシーンリストからまとめて生成）の両方に対応。「画像を生成して」「B-rollを作って」「サムネを作って」「Codexで画像を出して」「アイキャッチ画像がほしい」といった依頼で使う。Akari Video など Claude Code 駆動の動画編集ワークフローで挿絵・B-roll素材を用意するときにも使う。
---

# Codex Image Generation (from Claude Code)

Claude Code を司令塔にしたまま、画像生成だけ Codex CLI に投げるためのスキル。

Codex CLI には `image_gen` 組み込みツール（`$imagegen` スキル）があり、ChatGPT Plus 以上の
サブスクリプションのトークンでそのまま `gpt-image-2` を叩ける。**画像生成用に別途
`OPENAI_API_KEY` を用意する必要はない。**

```
Claude Code  ──(codex exec)──>  Codex CLI  ──($imagegen)──>  gpt-image-2  ──>  PNG
```

## 前提条件（初回のみ）

1. Codex CLI がインストール済みで、PATH に `codex` があること
   ```bash
   npm install -g @openai/codex     # または: brew install codex
   ```
2. ChatGPT アカウント（Plus 以上）でログイン済みであること
   ```bash
   codex login          # ブラウザが開く。API キーではなく ChatGPT ログインを選ぶ
   ```
3. 動作確認
   ```bash
   .claude/skills/codex-imagegen/scripts/check_setup.sh
   ```

未セットアップのまま生成しようとすると失敗するので、初回は必ず `check_setup.sh` を先に走らせる。
詳しい手順とトラブルシュートは `references/setup.md` を読むこと。

## 使い方

### 1. 単発で 1 枚生成する

```bash
.claude/skills/codex-imagegen/scripts/gen_image.sh \
  --out assets/hero.png \
  --aspect 16:9 \
  --style "フラットデザイン、パステルカラー、文字なし" \
  "ターミナルの前でコーヒーを飲む開発者"
```

主なオプション:

| オプション | 説明 | デフォルト |
|---|---|---|
| `--out PATH` | 出力先 PNG（相対パスは絶対パスに変換される）。**必須** | — |
| `--aspect A:B` | `16:9` / `1:1` / `9:16` など | `16:9` |
| `--style TEXT` | 画風・トーンの指定 | なし |
| `--retries N` | 失敗時のリトライ回数 | `2` |
| `--timeout SEC` | 1 枚あたりのタイムアウト | `300` |
| `--force` | 既存ファイルがあっても上書き | オフ（スキップ） |
| `--dry-run` | 実行せずコマンドだけ表示 | オフ |

### 2. B-roll をまとめて生成する

シーン定義 JSON を書いて `gen_broll.py` に渡す。1 シーン = 1 枚。

```bash
python3 .claude/skills/codex-imagegen/scripts/gen_broll.py broll.json
```

JSON の形（`examples/broll.example.json` にサンプルあり）:

```json
{
  "output_dir": "assets/broll",
  "aspect": "16:9",
  "style": "シネマティックな実写風、自然光、文字やロゴを入れない",
  "scenes": [
    { "id": "s01", "prompt": "早朝のデスクに置かれたノートPCとコーヒー" },
    { "id": "s02", "prompt": "コードが流れるディスプレイのクローズアップ", "aspect": "9:16" }
  ]
}
```

- `style` / `aspect` はトップレベルが既定値、シーン側で個別に上書きできる
- 出力は `output_dir/<id>.png`
- 生成結果は `output_dir/manifest.json` に記録される（成功/失敗/プロンプト/パス）
- 既に PNG があるシーンはスキップされる → 失敗したものだけ再実行すればよい（全部作り直すなら `--force`）
- `--concurrency N` で並列度を上げられるが、レート制限に当たりやすいので既定は 1。上げても 2〜3 まで

### 3. 生成後に必ずやること

- `manifest.json` の `failed` を確認し、失敗があればユーザーに報告する（黙って減らさない）
- 生成した画像は Read ツールで実際に開いて、依頼内容とズレていないか目視確認する
- 意図と違う場合はプロンプトを具体化して再生成する（後述）

## プロンプトの書き方

`$imagegen` に渡すプロンプトは、スクリプトが以下の 3 要素を組み立てて送る。呼び出し側は
**被写体と画風を具体的に書くことだけ**に集中すればよい。

1. `$imagegen` トリガー（先頭に必要。これがないと組み込みツールが起動しない）
2. 被写体 + 画風 + アスペクト比
3. 「この絶対パスに保存してください」という保存指示

効くコツ:

- ピクセル指定より **アスペクト比指定のほうが安定して反映される**（実寸は後段でリサイズされる）
- 文字を入れたくないなら「文字やロゴを一切入れない」と明示する。gpt-image-2 は文字描画が
  得意なぶん、指示がないと勝手に入れてくる
- B-roll は「主役を作らない」ほうが使いやすい。「引きの画角」「被写界深度浅め」などを指定する
- 人物の同一性はまたぎで保証されない。同じ人物を複数カットで出すのは避ける

## 制約・注意点

- 1 枚あたり **30 秒〜2 分** かかる。10 枚なら数分〜十数分。長時間コマンドとして扱うこと
- Codex 側の中間ファイルは `~/.codex/generated_images/` に残る
- `codex exec` には `--sandbox workspace-write --skip-git-repo-check` と `< /dev/null` が必須。
  これはスクリプトが付けているので、直接叩くとき以外は気にしなくてよい
- ChatGPT サブスクの利用上限に当たると失敗する。その場合は時間をおくか、
  `OPENAI_API_KEY` を設定して `--api-fallback` を使う（`references/setup.md` 参照）
- 生成物の権利・利用規約は OpenAI の規約に従う。実在の人物・既存キャラクター・
  ブランドロゴを狙って生成しないこと

## Akari Video など動画編集ワークフローと組み合わせる場合

編集の司令塔は Claude Code のまま、素材生成のところだけこのスキルを呼ぶ構成にする。

1. 台本 / edit.json から、B-roll が必要なカットを洗い出す
2. カットごとに `id` と `prompt` を決めて `broll.json` を書く
3. `gen_broll.py` で一括生成
4. `manifest.json` のパスを編集データ側のクリップ参照に流し込む

`output_dir` はプロジェクトのアセットディレクトリ（例: `<project>/assets/broll`）を指すこと。
プロジェクト外に散らかすと、あとで編集データからパスが辿れなくなる。
