# 🏢 AI会社 バーチャルオフィス

AI社員が働く様子を、ブラウザ上のドット絵オフィスでリアルタイムに見せるアプリです。
Node.js 標準機能のみで動きます（追加ライブラリのインストール不要）。

## 起動方法

```bash
node virtual-office/server.js
```

ブラウザで **http://localhost:3777** を開く。

- **▶ デモ再生** — AIを繋いでいなくても、"それっぽい忙しい1日"（約100秒）が再生される。
  出社 → 社長の指示 → キックオフ会議 → 調査・執筆・実装 → わざと1回エラー → 決裁 → 完了 → 退社
- **👁 観賞モード** — 無人でも社員たちが自動で賑やかに働き続ける（人に見せる名刺代わり）

## 本物のAIと繋がる仕組み

Claude Code の hooks は登録済みです（`.claude/settings.json`）。
このリポジトリで Claude Code を使うと：

```
Claude Codeが作業する（ファイルを書く・調べる…）
  → hooks が合図を出す
  → hooks/recorder.js（記録係）が data/events.jsonl に要約を1行書く
  → server.js（見張り役）が新しい行に気づいて SSE でブラウザへ送る
  → 画面の社員が動く
```

サーバーを起動した状態で Claude Code に何か頼むと、画面の社員が本当に働き出します。

## できごと → 社員の動き 対応表

| Claude Codeの動き | 画面の社員 |
|---|---|
| セッション開始 | 秘書つむぎが出社して着席 |
| あなたの指示 | 社長が読み上げ📣、秘書が受け取る📥 |
| ファイルを読む | 席で書類を読む📖 |
| コードを書く | 両腕を動かしてタイピング💻 |
| コマンド実行 | 手を動かす🔧 |
| ネット検索 | 調べもの🔍 |
| サブエージェント起動 | 担当社員が出社→キックオフ会議🤝 |
| エラー | 体を揺らして汗💦 |
| 承認待ち | 社長室へ歩いてお辞儀🙇 |
| ひと区切り | 休憩室でコーヒー☕ |
| サブエージェント完了 | 報告して退場✅ |
| セッション終了 | みんな帰宅🏠 |

対応は `public/js/translate.js` の `TOOL_MAP` で自由に変えられます。

## 社員名簿

`public/js/roster.js`。`.claude/agents/` のAI社員と連動しています。

| キャラ | 対応するAI社員 |
|---|---|
| 社長（あなた） | ユーザー本人 |
| 秘書 つむぎ | メインのClaude Codeセッション（ai-secretary） |
| 編集 いろは | ai-editor |
| マーケ あかり | ai-marketer |
| 営業 そら | ai-sales |
| リサーチ しおん | ai-researcher |
| 開発 レン | ai-engineer |
| 派遣スタッフ | 名簿にないサブエージェント（自動採番・架空名） |

## 記録係の3つの掟（hooks/recorder.js）

1. パスワード・APIキーらしき文字は記録前に伏せ字（***）にする
2. 記録は要約だけ。作業の全文は残さない
3. 何が起きても必ず正常終了（exit 0）し、Claude Code 本体を絶対に止めない

## ファイル構成

```
virtual-office/
├── server.js            # 見張り役（静的配信 + events.jsonl監視 + SSE）ポート3777
├── hooks/recorder.js    # 記録係（Claude Code hooks → events.jsonl）
├── data/events.jsonl    # できごとメモ（gitignore済み）
└── public/
    ├── index.html / style.css
    ├── office.json      # 間取りの設計図（42×24マス・部屋・椅子・壁・特別な場所）
    └── js/
        ├── layout.js    # 読み込み係 + マス⇄ピクセル変換 + A*道さがし
        ├── roster.js    # 社員名簿と派遣スタッフ
        ├── sprites.js   # 背景を1回だけ描く係 + キャラ描画
        ├── world.js     # 社員の移動・会議・休憩・雑談・自動イベント
        ├── translate.js # できごと → 社員の動き の翻訳係
        ├── demo.js      # デモモードの台本
        ├── panel.js     # サイドパネル（出社中の社員 + 社内の動き）
        └── main.js      # 起動係
```

## カスタマイズ

- **間取りを変える**: `public/office.json` を編集（すべて「何マス目か」で指定。廊下は端から端まで通すこと）
- **社員を増やす**: `public/js/roster.js` に追加し、`.claude/agents/` に対応する指示書を作る
- **動きの対応を変える**: `public/js/translate.js` の `TOOL_MAP`
