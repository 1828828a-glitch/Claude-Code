# ADTURN for HR 展示会用紹介動画（Remotion）

デジブレの技術的新規性（トップパフォーマーの脳の転写・特許出願中）を主訴求とした、約72秒・1920x1080・30fpsのモーショングラフィックス動画。

## 構成（台本 v1 準拠）

| シーン | 尺 | 内容 |
|---|---|---|
| S1 技術宣言 | 10s | 「脳を、AIに転写する。」世界初・特許出願中 |
| S2 技術の中身 | 10s | 約40名カウントアップ → レシピではなく料理そのもの |
| S3 問いの宣言 | 6s | 「例えば、採用。」 |
| S4〜S6 問い3連打 | 24s | ポジション / 無自覚の魅力 / クロージング |
| S7 答え | 12s | ADTURN for HR ロゴ＋4つの納品物 |
| S8 CTA | 10s | 「一般論は、一行もない。」→ ブースへ |

## ビルド・レンダリング

```bash
npm install
# 日本語フォントが必要: apt-get install fonts-noto-cjk fonts-noto-cjk-extra
npx remotion render src/index.ts AdturnForHR out/adturn-for-hr.mp4 --codec=h264 --crf=20
# プレビュー: npx remotion studio
```

`remotion.config.ts` の `setBrowserExecutable` は実行環境のChromiumパスに合わせて変更してください（ローカルではこの行を削除すればRemotionが自動でダウンロードします）。

## 調整ポイント

- 尺・シーン配分: `src/theme.ts` の `SCENES`（フレーム数 @30fps）
- 配色・フォント: `src/theme.ts` の `COLORS` / `GRADIENT` / `FONT`
- 各シーンのテキスト・演出: `src/scenes/*.tsx`
- 音声なし（展示会の音出しNGブース対応）。BGM・ナレーションを載せる場合は `<Audio>` を `src/Video.tsx` に追加。
