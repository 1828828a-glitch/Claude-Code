# ADTURN for HR 展示会用紹介動画（Remotion）

デジブレの技術的新規性（トップパフォーマーの脳の転写・特許出願中）を主訴求とした、約100秒・1920x1080・30fpsのモーショングラフィックス動画。BGM（アンビエントシンセ）とナレーション（日本語・3話者）付き。

演出コンポーネントは `src/fx.tsx` に集約: 文字単位キネティックタイポ（KineticChars）、浮遊/収束パーティクル（Particles）、ニューラルネット結線＋信号パルス（NeuralNet）、3Dチルトインカード（TiltIn）、SVGチェック描画（DrawCheck）、放射バースト（RadialBurst）、オドメーターカウンター（Odometer）、下線スイープ（Underline）。

## 3D VFX（S1: 頭部スプリット）

`src/scenes/Head3D.tsx` — Three.js（@remotion/three + React Three Fiber）による実3Dシーン。

- 頭部モデル: three.js公式サンプルの LeePerrySmith.glb（MIT）を `public/models/` に同梱。Draco圧縮のためデコーダーを `public/draco/` に同梱。
- 「パカっと割れる」演出: 同一ジオメトリを2枚描画し、それぞれ逆向きのワールド空間クリッピング平面（`material.clippingPlanes`）で半分ずつに切って、ヒンジ状に回転・平行移動。`renderer.localClippingEnabled` を `onCreated` で有効化。
- 暗黙知ストリーム: 600粒のPointsが頭内部から螺旋を描いてデジブレリングへ吸い込まれる（決定論的乱数で全フレーム再現可能）。
- ヘッドレス環境では `remotion.config.ts` の `setChromiumOpenGlRenderer('swangle')`（SwiftShader）が必須。
- **重要（ハマりどころ）**: GLBの非同期ロードは必ずThreeCanvasの**外**（親コンポーネント）で行い、ジオメトリをpropsで渡すこと。キャンバス内部の子でロードすると、ロード完了後にGLキャンバスが再描画されず、静止画レンダリングでモデルが消える。

2Dシーン側は `CameraDrift`（src/Video.tsx）で微小なパース回転＋ドリーを常時かけ、シネマティックな奥行きを付与。

## 構成（台本 v1 準拠）

| シーン | 尺 | 内容・スタイル |
|---|---|---|
| S1 技術宣言 | 10.5s | 3D VFX: 頭部がパカっと割れ、暗黙知の粒子がデジブレリングへ |
| S2 技術の中身 | 13.3s | ライト: オドメーターで約40名 → 3Dチルトカード対比 |
| S2.5 現場の声 | 13.2s | 夕暮れダーク: 経営者・人事のつぶやきバブル → フラッシュ→「それ、解決できます。」 |
| S3 問いの宣言 | 6.3s | ホワイト: 「例えば、採用。」スラム |
| S4 Q1 | 8.3s | ライト: ベース問いレイアウト |
| S5 Q2 | 9.8s | ダーク: 闇に光る埋蔵ワード（眠れる魅力） |
| S6 Q3 | 8s | ライト: 面接の「空の吹き出し」モチーフ |
| S7 答え | 15.3s | 光のウォッシュ: チェック描画→ロゴ後光→納品物カード |
| S8 CTA | 14.7s | ダーク: パーティクル収束→エンドカード |

音声は3話者構成: ナレーター（Nanami）、経営者役（Keita）、人事責任者役（Nanami低ピッチ）。

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
- 音声: `public/audio/` に格納。ナレーション（n1〜n8c）は edge-tts（`ja-JP-NanamiNeural`, rate +10%）で生成、BGM（bgm.m4a）はスクリプトで合成したアンビエントパッド。配置・音量オートメーション（問いゾーンでのダッキング含む）は `src/Video.tsx` の `NARRATION` / `bgmVolume`。
- ナレーション原稿を変えた場合は、各クリップの実尺に合わせて `SCENES` と `NARRATION` の開始フレームを再調整すること。
- テロップのみで訴求が完結する構成のため、音出しNGブースでは音声を無視してそのまま流せます。
