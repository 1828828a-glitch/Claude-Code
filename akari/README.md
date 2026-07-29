# AKARI Video をこのリポジトリで使う

[AKARI Video](https://github.com/AkariLabs/akari-video)（MIT / [akari-oss.app](https://akari-oss.app/)）は、
`edit.json` を単一の真実として AI エージェントが編集を組み立てる動画編集環境。
デスクトップアプリは macOS 前提だが、**ヘッドレス書き出し経路（Claude Code + skills）は Linux でも動く**ので、
そこだけを切り出して使えるようにしてある。

## 1. セットアップ

```bash
./akari/setup.sh
```

やること:

1. `ffmpeg` / `ffprobe` / 日本語フォント（Noto Sans CJK）の確認と、不足時の `apt` 導入
2. AKARI Video 本体をピン留めしたリビジョンで `akari/engine/` に clone
3. `render-cut` の依存（puppeteer-core / hyperframes）を `npm install`
4. Chromium を検出して `akari/engine.env` に `CHROME_PATH` を書き出し

`akari/engine/` と `akari/engine.env` は git 管理外。追従したいときは `setup.sh` 冒頭の `rev` を上げる。

## 2. 書き出し

```bash
./akari/render.sh akari/projects/enneagram-short --out exports/enneagram-short.mp4
```

`render.sh` は素材生成 →`edit-lint`→`render-cut` の順に走らせる。
lint が PASS しない限り書き出しは実行されない（AKARI 側の設計）。

## 3. サンプル: `projects/enneagram-short`

このリポジトリのエニアグラム統合診断ツールを紹介する縦型ショート。
1080×1920 / 30fps / 26秒 / 無音。出力は
[`projects/enneagram-short/exports/enneagram-short.mp4`](projects/enneagram-short/exports/enneagram-short.mp4)。

| 秒 | シーン | 素材 |
|---|---|---|
| 0.0–5.0 | フック「自分の『取扱説明書』を、言葉にできますか。」 | `overlays/01-hook.html` |
| 5.0–11.5 | 3理論（エニアグラム / ビービー8機能 / ナーディ神経科学） | `overlays/02-pillars.html` |
| 11.5–17.0 | 30問の内訳とプログレス | `overlays/03-questions.html` |
| 17.0–21.5 | 判定結果のサンプル出力 | `overlays/04-result.html` |
| 21.5–26.0 | CTA（起動コマンド） | `overlays/05-cta.html` |

構成:

- `edit.json` — 尺・カット・オーバーレイの配置。ここが唯一の真実
- `overlays/*.html` — 画づくりは全部 HTML/CSS。1断片1ルート要素、調整値は CSS 変数
- `tools/make-assets.sh` — 背景素材を ffmpeg で決定的に生成（`assets/` は git 管理外）

質問数（14 / 9 / 4 / 3 = 30問）や判定結果の表記は `enneagram_tool/` の実データから取っている。

### 中身を変える

- 文言・レイアウト → `overlays/*.html` を編集して再レンダー
- 尺やシーン順 → `edit.json` の `cuts` と `overlays` の `start` / `duration` を編集
- 微調整だけなら → `edit.json` の `overlays[].vars` に `{"--font-size": "72px"}` のように渡せば
  HTML を触らずに上書きできる（断片側は `var(--name, fallback)` で受けている）

## 4. この環境での制約

- **BGM・ナレーションなし**: 音声素材を持たないため無音。AKARI 側には
  `generate-narration` / `setup-audio-library` スキルがあるので、VOICEVOX や
  API キーを繋げば追加できる
- **デスクトップシェルは未使用**: `apps/shell/` は macOS 前提かつ移行中。ここではヘッドレス経路のみ
- **背景は生成グラデーション**: 実写素材の代わり。差し替えるなら `assets/` に置いて
  `edit.json` の `sources[]` を書き換える
