# セットアップとトラブルシュート

## なぜこの構成なのか

Claude Code は画像を生成できない。一方 Codex CLI には `image_gen` という組み込みツールがあり、
ChatGPT Plus 以上のログイントークンでそのまま `gpt-image-2` を呼べる（画像用の API キー課金が
発生しない）。そこで **文章理解と全体の司令塔は Claude Code、画像生成だけ Codex CLI** という
役割分担にする。Claude Code は `codex exec` を叩くだけなので、追加の MCP サーバーもいらない。

想定コスト: ChatGPT Plus $20 + Claude Pro $20。どちらも既存の契約枠内で完結する。

## インストール

```bash
# Codex CLI
npm install -g @openai/codex
# または
brew install codex

codex --version
```

## ログイン

```bash
codex login
```

ブラウザが開いたら **ChatGPT アカウントでのログイン**を選ぶ。「API キーを使う」を選ぶと
従量課金になり、サブスク枠で動かすという前提が崩れる。

成功すると `~/.codex/auth.json` が作られる。

## 動作確認

```bash
.claude/skills/codex-imagegen/scripts/check_setup.sh

# 実際に 1 枚出してみる
.claude/skills/codex-imagegen/scripts/gen_image.sh \
  --out /tmp/codex-test.png --aspect 1:1 "青い折り紙の鶴、白背景、文字なし"
```

## codex exec のフラグについて

`gen_image.sh` は内部でこの形に組み立てている。

```bash
codex exec --sandbox workspace-write --skip-git-repo-check '$imagegen ...' < /dev/null
```

| 要素 | 理由 |
|---|---|
| `$imagegen` を先頭に置く | 組み込み画像生成ツールのトリガー。これがないと通常の応答になる |
| `--sandbox workspace-write` | 生成した PNG を書き出すための書き込み権限 |
| `--skip-git-repo-check` | Git 管理外のディレクトリでも動かすため |
| `< /dev/null` | stdin を閉じて非対話実行にする。付けないと入力待ちで止まる |
| 保存先を絶対パスで書く | 相対パスだと Codex 側の cwd 基準になり、取り違える |

## よくある失敗

| 症状 | 原因と対処 |
|---|---|
| `codex: command not found` | 未インストール。`npm install -g @openai/codex` |
| プロンプト待ちで固まる | `< /dev/null` が抜けている。スクリプト経由で呼ぶ |
| 「成功」と言うのに PNG がない | 保存先が相対パスだった / サンドボックス権限不足。`gen_image.sh` はファイルの実在で判定して自動リトライする |
| `rate limit` / `usage limit` 系のエラー | ChatGPT サブスクの上限。時間をおくか、下記の API フォールバックを使う |
| 画像に勝手に文字が入る | gpt-image-2 は文字描画が強い。`--style` に「文字やロゴを一切入れない」と明示する |
| 指定した解像度にならない | ピクセル指定は後段リサイズされる。アスペクト比で指定するほうが安定 |
| 1 枚に数分かかる | 仕様。30 秒〜2 分が目安。バッチは時間に余裕をみる |

## API キーへのフォールバック

サブスクの上限に当たったときだけの逃げ道。従量課金になるので、使うなら意識的に。

```bash
export OPENAI_API_KEY="sk-..."
.claude/skills/codex-imagegen/scripts/gen_image.sh --api-fallback \
  --out assets/hero.png "..."
```

`--api-fallback` を付けない限り、`gen_image.sh` は環境変数に `OPENAI_API_KEY` が残っていても
それを外して実行する（意図せず課金側に流れないようにするため）。

## 中間ファイル

Codex は生成過程の画像を `~/.codex/generated_images/` に残す。ディスクを食ってきたら、
このディレクトリを消して問題ない。

## 参考

- AKARI Video（Claude Code / Codex を編集エンジンにする OSS 動画編集）: https://akari-oss.app/
- 元ネタの投稿: https://x.com/ryoma_nakajima/status/2082359468650811598
