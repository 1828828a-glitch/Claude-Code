# HyperFrames（HeyGen 公式スキル）

このリポジトリには HeyGen 公式の [HyperFrames](https://github.com/heygen-com/hyperframes)
スキル一式が同梱してある。HyperFrames は HTML / CSS / シーク可能なアニメーションから
決定論的に MP4 を書き出すレンダリングフレームワークで、Claude Code から
「動画を作って」と頼むだけでスキルが読み込まれる。

## 何が入っているか

`npx skills add heygen-com/hyperframes --all --full-depth` が生成する公式レイアウトを
そのままコミットしてある。

| パス | 中身 |
| --- | --- |
| `.agents/skills/<skill>/` | スキル本体（Markdown・スクリプト・フォント・SFX などのアセット） |
| `.claude/skills/<skill>` | 上記への相対シンボリックリンク（Claude Code が読む場所） |
| `skills-lock.json` | インストール元とハッシュのロックファイル |

入っているスキルは 25 個。

- ルーター: `hyperframes`（動画系リクエストの入口。ここから各ワークフローへ振り分ける）
- ドメイン: `hyperframes-core` / `-animation` / `-keyframes` / `-creative` / `-cli` /
  `-registry`、`media-use`、`figma`
- ワークフロー: `product-launch-video`、`faceless-explainer`、`pr-to-video`、
  `embedded-captions`、`talking-head-recut`、`motion-graphics`、`music-to-video`、
  `slideshow`、`general-video`、`remotion-to-hyperframes`
- レシピ / モーション原則: `motion-doctrine`、`cut-the-curve`、`seam-craft`、
  `oversized-cursor`、`captions-overlay`、`changelog-video`

既存の Anthropic 公式スキル（`.claude/skills/algorithmic-art` など）は実ディレクトリのまま
残してあり、両者は共存する。

## 使う前に一度だけ

スキルは同梱されているのでインストール不要。ただしローカルレンダリングには
ffmpeg と Chrome Headless Shell が要る。コンテナは使い捨てなので、新しいセッションで
初めてレンダリングする前に実行する。

```bash
bash scripts/setup-hyperframes.sh
```

`hyperframes doctor` で状態を確認できる。`whisper-cpp` / `TTS (Kokoro)` /
`BGM (MusicGen)` が未インストールでもレンダリング自体は通る（文字起こしや
ローカル音声生成を使うときだけ必要）。

## 使い方

Claude Code にそのまま頼む:

```
/hyperframes で、このツールを紹介する15秒のイントロ動画を作って
```

CLI を直接叩く場合:

```bash
npx hyperframes init my-video --example blank --non-interactive
cd my-video
npm run dev      # ブラウザでプレビュー
npm run check    # コンポジションの検証
npm run render   # renders/*.mp4 に書き出し
```

動作確認済み: `hyperframes` v0.7.72 / Node v22 / Linux x64 で
1920x1080・10秒・300フレームの MP4 をローカルレンダリング。

## HeyGen API と組み合わせる

アバター動画・音声・BGM の生成や HeyGen ホストのクラウドレンダリングを使う場合は
API キーが要る。

```bash
export HEYGEN_API_KEY=...      # https://app.heygen.com のダッシュボードで発行
npx hyperframes auth           # または CLI でサインイン
npx hyperframes cloud render   # HeyGen 側でレンダリング
```

典型的なパイプライン（[HeyGen ドキュメント](https://developers.heygen.com/hyperframes-heygen)）:

1. `POST /v3/videos` でアバタークリップを生成 → `GET /v3/videos/{video_id}` で完了待ち
2. `GET /v3/audio/sounds` で BGM / 効果音を取得（`audio_url` は短命の署名付き URL なので
   キャッシュせずそのまま次に渡す）
3. HyperFrames のコンポジションに変数として差し込む
4. `POST /v3/hyperframes/renders` で合成・レンダリング →
   `GET /v3/hyperframes/renders/{render_id}` で完了待ち

キーが無くてもローカルレンダリングは完結するので、API キーはクラウド機能を
使うときだけでよい。

## 更新

```bash
npx hyperframes skills check    # 差分があるか確認
npx hyperframes skills update   # コア＋インストール済みを更新
npx skills add heygen-com/hyperframes --all --full-depth   # 全スキルを再取得
```

更新すると `.agents/skills/` と `skills-lock.json` が書き換わるので、そのままコミットする。

## ライセンス

HyperFrames は HeyGen による Apache License 2.0 のプロジェクト。同梱スキルの原典は
`.agents/skills/` の各 `SKILL.md`、ライセンス全文は
<https://github.com/heygen-com/hyperframes/blob/main/LICENSE> を参照。
