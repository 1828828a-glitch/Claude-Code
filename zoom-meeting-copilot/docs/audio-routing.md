# 音声ルーティング（Zoom版）

## 完成形

| アプリ/参加者 | 入力（microphone） | 出力（speaker） |
| --- | --- | --- |
| ユーザー本人 | 物理マイク | ヘッドホン |
| GPT参加者（Zoom Web Client） | BlackHole 16ch | BlackHole 2ch |
| ChatGPT Voice | BlackHole 2ch | BlackHole 16ch（専用Chrome内で固定） |

ChatGPT Voiceの出力は専用Chrome内で`BlackHole 16ch`だけへ送ります。macOSのシステム出力は変更しないため、同じMacでは専用Chromeから直接音が出ず、自分が参加しているZoomクライアントを経由したAI音声だけをスピーカーまたはヘッドホンで聞きます。

## 1. ユーザー本人の出力を確認する

1. スピーカーまたはヘッドホンを接続する
2. macOSのシステム出力が、そのスピーカーまたはヘッドホンになっていることを確認する
3. 自分が参加するZoom（デスクトップアプリまたはブラウザ）でも、Speakerに同じ物理出力を選ぶ

## 2. 変更前のデバイスを保存する

`switchaudio-osx`を導入済みなら、元の設定を記録します。

```bash
SwitchAudioSource -c -t input
SwitchAudioSource -c -t output
```

`configure-audio.sh`は、初回切り替え前のデバイス名を`.meeting-copilot-runtime/audio-original.json`へ自動保存します。

## 3. ChatGPT用の入力を設定する

```bash
./scripts/configure-audio.sh
```

内部では次の切り替えを実行します。

```bash
SwitchAudioSource -t input -s "BlackHole 2ch"
```

システム出力は変更しません。Voice開始時に専用Chromeの出力先APIを使い、ChatGPTのAudioContextと、DOM内外で生成された音声要素を`BlackHole 16ch`へ固定します。さらにChrome内部の稼働中出力を検査し、ChatGPTから内蔵スピーカーなど別デバイスへの出力が1系統でも残っていれば起動を中止します。Chrome 110以降が必要です。

## 4. GPT参加者を開く

GPT参加者の会議マイクは、経路が完成するまでミュートしておきます。

```bash
./scripts/open-gpt-participant.sh "https://zoom.us/j/123456789"
```

Zoomの招待URL（`/j/`形式）は自動的にWeb Client（`/wc/MEETING_ID/join`）へ変換されます。専用Chromeがすでに起動している場合は、同じプロファイルへZoomタブを追加します。

参加前設定と参加を自動化する場合:

```bash
npm install
./scripts/open-gpt-participant.sh --join \
  "https://zoom.us/j/123456789?pwd=PASSCODE"
```

自動設定する項目:

- 専用Chrome内でのZoomマイク権限
- 表示名`GPT-Live`
- パスコード（URLの`?pwd=`または`MEETING_COPILOT_ZOOM_PASSCODE`）
- Microphone: `BlackHole 16ch`
- Speaker: `BlackHole 2ch`
- マイクとカメラをオフにした参加前状態
- `Join`のクリックと、入室後の`コンピューターでオーディオに参加`

Zoom Web ClientのUIは頻繁に変わるため、オーディオデバイスの自動選択に失敗した場合は終了コード18で通知し、マイクをミュートのまま残します。その場合はマイクボタン横の矢印から`Select a Microphone: BlackHole 16ch`と`Select a Speaker: BlackHole 2ch`を手動で選び、`./scripts/set-zoom-mic.sh unmute`を再実行してください。`set-zoom-mic.sh`は解除前にデバイス選択を再確認し、確認できない間は終了コード18で解除を拒否します。

参加前画面でマイクのミュートを確認できない場合、`prepare-zoom.mjs`は参加をクリックせずエラーで停止します。

待機室が有効な会議では、ホストが入室を許可するまで待機画面のままです。`start-zoom-copilot.sh`は入室を最大120秒待ち、デバイス確認を経てから会議マイクを解除します。

会議中の緊急停止や再開には次を使います。

```bash
./scripts/set-zoom-mic.sh mute
./scripts/set-zoom-mic.sh unmute
```

手動で設定する場合、Zoom Web Clientの参加前画面またはマイクボタン横の`^`メニューで次を選びます。

- Microphone: `BlackHole 16ch`
- Speaker: `BlackHole 2ch`
- Camera: オフ
- Display name: `GPT-Live`

自動設定モードは、専用Chromeのメディア権限ダイアログを起動中だけ自動承認します。専用プロファイルは通常のChromeとは権限・Cookie・ログイン状態が別です。このウィンドウを会議以外の閲覧には使わないでください。

Zoomのリンクがデスクトップアプリを開こうとした場合は、ページ内の`Join from Your Browser`を選びます。ホストが「認証されたユーザーのみ参加可」を有効にしている会議では、専用ChromeでZoomへ一度ログインしてから再実行してください（終了コード13で通知されます）。

## 5. ChatGPT Voiceを開始する

自動化する場合:

```bash
./scripts/open-chatgpt-live.sh --restart-profile
```

初回だけ、Zoomと共用する専用ChromeでChatGPTへログインし、コマンドを再実行します。その後は次を自動で行います。

- `Meeting Copilot` Projectを開く
- 毎回新しいチャットを作る
- ChatGPT Voice出力を`BlackHole 16ch`へ固定する
- ChatGPT Voiceを開始する

`--restart-profile`は共通Chrome全体を終了するため、Zoom参加中には使わないでください。

手動で行う場合:

1. [ChatGPT Project設定](chatgpt-project.md)の`Meeting Copilot` Projectを開く
2. 新しいVoice会話を開始する
3. GPT参加者のspeakerテスト音または別参加者の発話がChatGPTへ届くことを確認する
4. ChatGPTの短い応答が自分のZoomクライアント経由で聞こえることを確認する
5. GPT参加者の入力レベルが動くことを確認してから、会議マイクをアンミュートする

ChatGPT Voiceは会議側を操作しません。会議マイクのミュートが、意図しない発話を外へ出さない最終防御です。

## 6. ループの確認

次の状態なら経路が誤っています。

- ChatGPTが自分の発話へ連続して反応する
- GPT参加者の入力メーターが、他参加者の発話だけでもChatGPT応答前から動き続ける
- 音量が反復するたびに大きくなる

発生したらGPT参加者の会議マイクを直ちにミュートし、次を確認します。

1. GPT参加者のspeakerが`BlackHole 2ch`
2. GPT参加者のmicrophoneが`BlackHole 16ch`
3. ChatGPT入力が`BlackHole 2ch`
4. ChatGPT出力が専用Chrome内で`BlackHole 16ch`へ設定されている

## 7. 終了と復元

```bash
./scripts/set-zoom-mic.sh mute
./scripts/close-dedicated-chrome.sh
./scripts/restore-audio.sh
```

ChatGPT以外のシステム音は`BlackHole 16ch`へ流れません。同じMacでAI音声が二重に聞こえる場合は、直ちにGPT参加者をミュートして起動ログの`internalAudioOutput`を確認してください。

## 参考

- [Chrome Developers: Change the destination output device in Web Audio](https://developer.chrome.com/blog/audiocontext-setsinkid/)
- [Zoom Support: Joining a meeting or webinar by web browser](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060832)
