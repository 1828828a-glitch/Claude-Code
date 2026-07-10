# ADTANK GP「ADTURN for HR」展示会用 紹介動画 — Remotion版

`../index.html`（Canvas版）と同じ72秒・同じ絵コンテを、
[Remotion](https://www.remotion.dev/)（Reactベースの動画フレームワーク）で実装したものです。

- 尺: 72秒 / 1920×1080 / 30fps / H.264 MP4
- シーン構成・コピー・配色・イージング・乱数系列はCanvas版と同一
- BGM（`public/bgm.mp3`）とナレーション（`public/narration.mp3`）を
  `DigibureExpo.tsx` の `<Audio>` で合成（音源の生成方法は `../audio/` を参照）

## 構成

```
src/
  index.ts          エントリポイント（registerRoot）
  Root.tsx          Composition定義（DigibureExpo, 1800frames）
  DigibureExpo.tsx  マスター（背景・シーンSequence・進行バー）
  theme.ts          ブランドカラー・イージング・乱数（Canvas版と共通のトークン）
  components.tsx    共通部品（中央揃えテキスト・リング・特許出願中スタンプ）
  scenes/
    S1Hook.tsx        0:00–0:07 フック
    S2Digibure.tsx    0:07–0:15 脳の転写・デジブレ登場・特許出願中
    S3Compare.tsx     0:15–0:24 既存AIとの比較「料理そのものを」
    S4Technology.tsx  0:24–0:33 暗黙知抽出×AI翻訳技術
    S5Roster.tsx      0:33–0:42 約40名コピー済みカウンター
    S6Output.tsx      0:42–1:03 サービス紹介 ADTURN for HR（章立てウォークスルー）
    S7CTA.tsx         1:03–1:12 CTA・ブース誘導
```

## 台本v3「問い連打型」コンポジション（2パターン）

`ADTURN for HR レポート紹介動画台本 v3（問い連打型＋無自覚資産）` を実装した
93秒・8シーンのコンポジションが2種類あります（音声は共通・`src/questions/`）。

| ID | パターン | 表現 |
|---|---|---|
| `QuestionsStandard` | ① スタンダード洗練 | 白基調・タイピング・静かなフェード・グラデーションアクセント |
| `QuestionsBold` | ② 突飛・アイキャッチ | 黒白反転・巨大アウトライン数字・スラム＋シェイク・全画面反転・グリッチ |

```bash
npx remotion render src/index.ts QuestionsStandard out/adturn-questions-standard-93s.mp4 --codec=h264
npx remotion render src/index.ts QuestionsBold out/adturn-questions-bold-93s.mp4 --codec=h264
```

シーン切替時刻・問いのテキストは `src/questions/timeline.ts` に集約。
ナレーション・BGM素材の生成は `../audio/questions/` を参照。

## 使い方

```bash
npm install

# プレビュー（Remotion Studio）— タイムラインを見ながらGUIで編集確認
npm run studio

# MP4書き出し
npm run render
```

コピーの差し替えは各シーンのJSX、シーンの尺は `DigibureExpo.tsx` の `CUTS`（秒）、
色は `theme.ts` を編集してください。

### コンテナ・CI環境での書き出し

Chromeを自動ダウンロードできない環境では、chrome-headless-shell 互換のバイナリを
環境変数で指定します（`remotion.config.ts` が参照）:

```bash
CHROME_BIN=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell npm run render
```

※ 通常のChrome/Chromium本体は新ヘッドレスモードのみのため起動に失敗します。
headless shell（旧ヘッドレスモードのスタンドアロン実装）を指定してください。

### ライセンスについて

Remotionは個人・小規模組織（従業員3名以下等）は無償ですが、それ以上の企業利用には
会社ライセンスが必要です（[remotion.pro](https://remotion.pro/license)）。
社内利用の前にご確認ください。
