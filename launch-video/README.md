# ローンチ動画 (Remotion)

Claude Code + [Remotion](https://www.remotion.dev/) で、エニアグラム統合タイプ判定ツールの
ローンチ動画をコードから生成するプロジェクトです。動画は React コンポーネントとして
記述されているので、Claude Code に指示するだけで内容を自由に作り替えられます。

## セットアップ

```bash
cd launch-video
npm install
```

## 使い方

```bash
# プレビュー (ブラウザで Remotion Studio が開く)
npm run dev

# MP4 に書き出し → out/launch-video.mp4
npm run render

# サムネイル画像だけ書き出し → out/thumbnail.png
npm run still

# SNS 用の正方形バージョン (1080x1080) を書き出し
npx remotion render LaunchVideoSquare out/launch-video-square.mp4
```

## 構成

| ファイル | 役割 |
| --- | --- |
| `src/Root.tsx` | コンポジション定義 (サイズ・長さ・fps) |
| `src/LaunchVideo.tsx` | 動画本体。Intro → Features → Outro の3シーン構成 (10秒) |
| `remotion.config.ts` | レンダリング設定。クラウド環境ではインストール済み Chromium を自動検出 |

## Claude Code で派生動画を作るプロンプト例

このディレクトリで Claude Code に以下のように頼むだけで動画を編集できます。

- 「動画を15秒に伸ばして、機能紹介のシーンをひとつずつ全画面で見せて」
- 「配色を青系に変えて、もっとミニマルな雰囲気にして」
- 「BGM を追加して」(音声ファイルを `public/` に置いて `<Audio>` で読み込み)
- 「新機能『◯◯』の告知動画を、この動画をベースに作って」
- 「縦型 (1080x1920) の TikTok / リール用バージョンを追加して」
- 「英語版の動画を作って」

## 環境メモ

- レンダリングには Chromium が必要です。ローカルでは Remotion が自動でダウンロードします。
- Claude Code on the web などのクラウド環境では、`remotion.config.ts` が
  `/opt/pw-browsers` のインストール済み Chromium headless shell を自動で使います。
  別のブラウザを使いたい場合は環境変数 `REMOTION_BROWSER_EXECUTABLE` で指定できます。
