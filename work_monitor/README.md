# work_monitor — 業務監視 → 日報生成 & 仕事文脈の蓄積ツール

自分の業務を分単位で記録し、そこから **日報** と **常に最新の仕事文脈ドキュメント** を自動生成するツールです。

## 何を記録するか

| ソース | 内容 | 前提 |
|---|---|---|
| `screen` | アクティブウィンドウ名 + 画面のOCRテキスト(毎分) | `mss` `pillow` `pytesseract`(任意) |
| `claude` | Claude Code の会話履歴(`~/.claude/projects/**/*.jsonl` の差分) | なし(標準ライブラリのみ) |
| `slack` | Slack の新着メッセージ | 環境変数 `SLACK_TOKEN`(xoxp- ユーザートークン) |
| `notes` | 議事録・メモフォルダで更新されたファイル | `config.json` の `notes.dirs` にフォルダを設定 |

すべてローカルの `~/.work_monitor/events.db`(SQLite)に保存されます。**外部にログを送信することはありません**(日報生成時に `claude -p` へ渡す分を除く)。

## セットアップ

```bash
# 必須依存はなし。画面OCRを使う場合のみ:
pip install mss pillow pytesseract
# + OS に tesseract 本体と日本語データ(jpn)をインストール
#   macOS: brew install tesseract tesseract-lang
#   Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-jpn
#   Linux でウィンドウ名も取るなら: sudo apt install xdotool
```

初回実行時に `~/.work_monitor/config.json` が生成されるので、必要に応じて編集してください(議事録フォルダ、Slack有効化、除外キーワードなど)。

## 使い方

```bash
# 1. 収集を開始(作業中は起動しっぱなしにする)
python -m work_monitor watch

# 2. 終業時に日報生成 + 仕事文脈の更新をまとめて実行
python -m work_monitor daily

# 個別に実行する場合
python -m work_monitor nippo               # 日報だけ生成
python -m work_monitor nippo --date 2026-07-31
python -m work_monitor context             # 日報を仕事文脈にマージ
python -m work_monitor status              # 今日どれだけ記録されたか確認
python -m work_monitor timeline            # 生のタイムラインを表示
```

- 日報: `~/.work_monitor/reports/YYYY-MM-DD.md`
- 仕事文脈: `~/.work_monitor/WORK_CONTEXT.md`(更新前の版は `context_history/` に自動退避)

日報・文脈の生成にはインストール済みの **Claude Code CLI**(`claude -p`)を使うため、APIキーの設定は不要です。CLI が無い環境では生ログがそのまま日報ファイルに保存され、後から再生成できます。

## 自動化の例

macOS / Linux の cron で毎日18:30に日報+文脈更新:

```cron
30 18 * * 1-5 cd /path/to/repo && python -m work_monitor daily
```

`watch` はログイン時に自動起動(launchd / systemd user service / Windows タスクスケジューラ)に登録しておくと、完全に手放しで回ります。

Claude Code から使う場合は、`WORK_CONTEXT.md` を CLAUDE.md から参照したり、セッション冒頭で読み込ませると「今の仕事文脈」を引き継いだ状態で会話を始められます。

## プライバシーと注意点

- 画面OCRは**画面に映ったものすべて**を拾います。`config.json` の `exclude_keywords` に含まれる語が映っている分は記録しません(初期値: パスワード関連)。
- 記録データはリポジトリ外(`~/.work_monitor/`)に置かれるため、誤って git にコミットされることはありません。
- 会社のセキュリティポリシー上、画面録画やSlackログ取得が制限されている場合は各ソースを `enabled: false` にしてください。
