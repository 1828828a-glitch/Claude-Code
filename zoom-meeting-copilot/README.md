# Meeting Copilot for Zoom

ChatGPT Web Voiceを、**Zoom**へ`GPT-Live`という別参加者として接続するmacOS向けの実験的ツールです。OpenAI APIは使わず、BlackHoleの仮想音声デバイスで会議音声とChatGPT音声を双方向に橋渡しします。ミーティングの司会進行、要点の整理、タスクやネクストアクションの提示などをリアルタイムで行わせることができます。

このプロジェクトは、[bb8ad8/meeting-copilot](https://github.com/bb8ad8/meeting-copilot)（Google Meet版）をZoom Web Client向けに移植したものです。音声ルーティングとChatGPT Voice起動の仕組みは上流をそのまま利用し、会議参加の自動化をZoom Web Client用に書き直しています。上流と同じ[GNU General Public License v3.0](LICENSE)で提供します。

このプロジェクトは非公式であり、OpenAI、Zoom、Existential Audioの提供・承認を受けた製品ではありません。ChatGPTとZoom Web Clientの画面変更により、自動化が動かなくなる可能性があります。

## 上流（Google Meet版）との違い

- 会議への参加はZoom Web Client（`zoom.us/wc/…`）で行います。`/j/`形式の招待URLは自動でWeb Client URLへ変換されます
- パスコード付き会議に対応します（URLの`?pwd=`または`MEETING_COPILOT_ZOOM_PASSCODE`）
- 待機室のある会議では、ホストの許可を待ってから会議マイクを解除します
- Meet版のChrome拡張（常駐コントロールUI）は未移植です。開始・終了はターミナルのスクリプトで操作します

## 動作環境

- macOS（Apple Silicon想定）
- Google Chrome公式ビルド
- Node.js 20以降、Homebrew、BlackHole 2ch / 16ch
- ChatGPT Web Voiceを利用できるアカウント
- Zoomミーティングの招待URL（サインイン必須の会議では、専用ChromeでZoomへログインできるアカウント）

## 音声構成

```text
会議参加者の音声
  -> 専用ChromeのGPT参加者Zoom（Web Client）
  -> Zoom speaker: BlackHole 2ch
  -> macOS system input: BlackHole 2ch
  -> ChatGPT Voice input

ChatGPT Voice output
  -> ChatGPT VoiceタブだけをBlackHole 16chへ出力
  -> GPT参加者Zoom mic: BlackHole 16ch
  -> Zoomミーティング
  -> 各参加者のZoomクライアント
  -> 現在の物理出力（ヘッドホン／スピーカー）
```

ChatGPTから見て、`BlackHole 2ch`を入力経路、`BlackHole 16ch`を出力経路に分けることで、ChatGPTの発話が自分の入力へ戻るループを防ぎます。ChatGPT Voiceタブ以外の音声とmacOSのシステム出力は変更しません。

## セットアップ

初回導入は、ローカルのファイルとターミナルを操作できるAIコーディング支援（Claude Codeなど）へセットアップを依頼する方法を推奨します。管理者認証、再起動、アカウントへのログインなどは利用者が行います。

```bash
./scripts/check-env.sh
./scripts/install-audio-deps.sh --dry-run
./scripts/install-audio-deps.sh --accept-blackhole-license
```

BlackHoleの導入後にmacOSを再起動し、[BlackHoleのセットアップ](docs/setup-blackhole.md)と[音声ルーティング](docs/audio-routing.md)を完了します。続けて依存パッケージを導入します。

```bash
npm install
```

ChatGPT側は[Project設定](docs/chatgpt-project.md)に従って`Meeting Copilot` Projectを作成し、Project URLを`.meeting-copilot.env`へ保存します。

```bash
cp .meeting-copilot.env.example .meeting-copilot.env
# MEETING_COPILOT_CHATGPT_PROJECT_URL を自分のProject URLへ変更する
```

## 使い方

### 統合起動

ChatGPT Voiceの開始からZoom参加、入室後の会議マイク解除までをまとめて実行します。

```bash
./scripts/start-zoom-copilot.sh "https://zoom.us/j/123456789?pwd=PASSCODE"
```

初回はChatGPTとZoom（必要な場合）へのログインを求められるため、専用Chromeでログインしてから同じコマンドを再実行してください。

### 低レベル起動

```bash
# Zoomタブを開くだけ（手動で設定して参加する）
./scripts/open-gpt-participant.sh "https://zoom.us/j/123456789"

# 参加前設定（表示名・ミュート・BlackHoleデバイス）まで自動化
./scripts/open-gpt-participant.sh --auto-prepare --restart-profile "https://zoom.us/j/123456789?pwd=PASSCODE"

# 参加まで自動化
./scripts/open-gpt-participant.sh --join --restart-profile "https://zoom.us/j/123456789?pwd=PASSCODE"

# ChatGPT Voiceの起動だけを実行
./scripts/open-chatgpt-live.sh --restart-profile
```

### 会議中のマイク制御

```bash
./scripts/set-zoom-mic.sh mute
./scripts/set-zoom-mic.sh unmute
./scripts/set-zoom-mic.sh toggle
```

### 終了と復元

```bash
./scripts/set-zoom-mic.sh mute
./scripts/close-dedicated-chrome.sh
./scripts/restore-audio.sh
```

## 既知の制限

- Zoom Web ClientのUIは頻繁に変わるため、オーディオデバイスの自動選択に失敗することがあります。その場合は終了コード18で通知し、会議マイクをミュートのまま残すので、マイクボタン横のメニューから`BlackHole 16ch`（マイク）と`BlackHole 2ch`（スピーカー）を手動で選んでください
- ホストが「認証されたユーザーのみ参加可」を有効にしている会議では、専用ChromeでZoomへ一度ログインする必要があります
- Web Clientでの参加はホスト側の設定（`Show a "Join from your browser" link`）で無効化されている場合があります
- Meet版の常駐コントロールUI（Chrome拡張）は未移植です

## 開発用チェック

```bash
./tests/scripts-test.sh
```

## 配布上の注意

Meeting Copilot for Zoomは[GNU General Public License v3.0](LICENSE)で提供します。BlackHoleはリポジトリへ同梱せず、利用者が上流のライセンス条件を確認して直接導入します。Playwrightなど外部依存のライセンスは各パッケージに従います。

本ソフトウェアは実験的な自動化ツールであり、会議への参加、録音、要約、判断の正確性や継続動作を保証しません。本番会議へ導入する前に、機密情報を含まない会議で確認してください。

会議音声をChatGPTへ送る前に、所属組織の規定と参加者への通知・同意要件を必ず確認してください。ボットを会議へ参加させることはZoomの利用規約およびホストの設定に従う必要があります。

## クレジット

- 元プロジェクト: [bb8ad8/meeting-copilot](https://github.com/bb8ad8/meeting-copilot)（GPL-3.0）
- 元のアイデア: ChatGPT Voiceを会議の一参加者として招く運用（[@k1ito さんのツイート](https://x.com/k1ito)より）
