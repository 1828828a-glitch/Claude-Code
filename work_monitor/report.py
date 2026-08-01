"""日報生成。1日のタイムラインを Claude に渡して日報 Markdown を作る。"""

from __future__ import annotations

from . import llm, timeline
from .config import DATA_DIR

REPORTS_DIR = DATA_DIR / "reports"

PROMPT_TEMPLATE = """あなたは私の業務ログから日報を作成するアシスタントです。
以下は {date} の作業ログ(画面アクティビティ、Claudeでの作業、Slack、議事録)です。
これをもとに、上司や自分の振り返りにそのまま使える日報を Markdown で書いてください。

要件:
- 冒頭に「## 本日のサマリー」(3〜5行)
- 「## 時間帯別の作業内容」: 時間帯ごとに何をしていたかを箇条書き(推測で埋めず、ログにあることだけ)
- 「## 成果・進捗」: 完了したこと・進んだこと
- 「## 課題・持ち越し」: 未完了・翌日にやること(ログから読み取れる範囲で)
- 機密情報(トークン、パスワード等)がログに紛れていたら日報には書かない
- 日本語で、簡潔に

--- 作業ログここから ---
{log}
--- 作業ログここまで ---
"""


def generate_report(date: str, claude_cli: str = "claude") -> str:
    """日報を生成して reports/YYYY-MM-DD.md に保存し、ファイルパスを返す。"""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    log_md = timeline.build_day_markdown(date)
    out_path = REPORTS_DIR / f"{date}.md"

    report = llm.generate(
        PROMPT_TEMPLATE.format(date=date, log=log_md), claude_cli=claude_cli
    )
    if report is None:
        # CLI が使えない場合は生ログをそのまま保存 (後から再生成できる)
        report = f"# 日報 {date} (自動要約なし・生ログ)\n\n{log_md}"
    out_path.write_text(report + "\n", encoding="utf-8")
    return str(out_path)
