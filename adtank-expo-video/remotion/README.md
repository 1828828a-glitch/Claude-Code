# ADTANK GP「デジブレ」展示会用 紹介動画 — Remotion版

`../index.html`（Canvas版）と同じ60秒・同じ絵コンテを、
[Remotion](https://www.remotion.dev/)（Reactベースの動画フレームワーク）で実装したものです。

- 尺: 60秒 / 1920×1080 / 30fps / H.264 MP4
- シーン構成・コピー・配色・イージング・乱数系列はCanvas版と同一

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
    S6Output.tsx      0:42–0:51 出力例 ADTURN for HR
    S7CTA.tsx         0:51–1:00 CTA・ブース誘導
```

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
