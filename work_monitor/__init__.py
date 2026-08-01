"""work_monitor: 業務を分単位で記録し、日報と仕事文脈を自動生成するツール。

収集ソース:
- PC画面 (スクリーンショット + OCR + アクティブウィンドウタイトル)
- Claude Code の会話履歴 (~/.claude/projects/**/*.jsonl)
- Slack 履歴 (Slack Web API, トークン設定時のみ)
- 議事録/メモフォルダ (更新されたファイルを取り込み)

生成物:
- 日報:   ~/.work_monitor/reports/YYYY-MM-DD.md
- 仕事文脈: ~/.work_monitor/WORK_CONTEXT.md (毎日マージ更新)
"""

__version__ = "0.1.0"
