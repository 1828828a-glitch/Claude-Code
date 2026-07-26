# videos/ — HyperFrames プロジェクト

HeyGen 公式の HyperFrames スキルで作った動画プロジェクト。各ディレクトリが1本の動画。

## シリーズ「8月の園芸」

温暖地の家庭園芸者向け、縦型 1080x1920・約31秒・音声なしの3本。
デザインは daisy-days プリセット、日本語は Noto Sans CJK JP。

| プロジェクト | テーマ | 尺 | 出力 |
| --- | --- | --- | --- |
| `august-watering` | 8月の水やりは量より時間帯 | 31.0s | `renders/video.mp4` |
| `august-sowing` | 8月は秋冬野菜のスタートライン | 31.5s | `renders/video.mp4` |
| `august-pest-control` | 8月の病害虫は葉裏で見つける | 31.0s | `renders/video.mp4` |

## 各プロジェクトの構成

```
BRIEF.md                     確定したブリーフ（意図・尺・比率・トーン）
STORYBOARD.md                フレームごとの構成とモーション設計
frame.md                     デザインスペック（daisy-days を remix したもの）
capture/extracted/           元テキストとトークン
index.html                   コンポジション本体（モノリシック、6シーン）
vendor/gsap.min.js           GSAP をローカルに同梱（CDN 依存を外すため）
renders/video.mp4            レンダリング済み MP4
```

## 作り直す・手を入れる

```bash
bash ../../scripts/setup-hyperframes.sh   # 初回のみ（ffmpeg・Chrome・日本語フォント）
cd august-watering
npx hyperframes check                     # lint / runtime / layout / motion / contrast
npx hyperframes snapshot --at 2.5,7.5,12.5,18,23.5,28.5
npx hyperframes render --quality high --output renders/video.mp4
npm run dev                               # Studio でプレビュー（バックグラウンドで起動）
```

## 作ったときの決定事項

- **音声なし** — HeyGen 未サインインで、ローカル TTS（Kokoro）も未導入のため、
  ナレーションと BGM は使わず画面テキストとモーションだけで構成した。
  `STORYBOARD.md` に `music: none`、`SCRIPT.md` なしで無音プロジェクトとしてマークしてある。
  音声を足す場合は `npx hyperframes auth login` の後、faceless-explainer の Step 3.1 から再開する。
- **GSAP をローカル同梱** — CDN からの読み込みだと `check` のブラウザ起動が
  10秒のナビゲーションタイムアウトに引っかかるため、`vendor/gsap.min.js` を参照している。
- **彩度のある地色の上の文字はチャコール + 白のオフセット影** — プリセットの
  「白文字 + チャコール影」だとコントラストが 1.85:1 で WCAG AA を満たさないため反転させた。
  ステッカー的な輪郭の印象は保っている。
- **内容は温暖地の目安** — まき時や作業時期は地域と品種で前後する。動画内にもその旨を入れてある。
