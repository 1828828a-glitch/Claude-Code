"""仕事文脈の蓄積。日報を WORK_CONTEXT.md にマージして「最新の状態」を維持する。

WORK_CONTEXT.md は「今どんなプロジェクトが動いていて、それぞれ何がどこまで
進んでいて、次に何をするか」を常に最新に保つ生きたドキュメント。
更新のたびに旧版を context_history/ に日付付きで退避する。
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from . import llm
from .config import DATA_DIR

CONTEXT_PATH = DATA_DIR / "WORK_CONTEXT.md"
HISTORY_DIR = DATA_DIR / "context_history"

EMPTY_CONTEXT = """# 仕事文脈 (WORK_CONTEXT)

## 進行中のプロジェクト
(まだ記録なし)

## 直近の決定事項
(まだ記録なし)

## 次にやること
(まだ記録なし)
"""

MERGE_PROMPT = """あなたは私の「仕事文脈ドキュメント」を維持するアシスタントです。
このドキュメントは、進行中のプロジェクト・それぞれの最新状況・決定事項・
次にやることを常に最新の状態で一覧できるようにするためのものです。

以下の「現在の仕事文脈」に「{date} の日報」の内容を反映して、
更新後の仕事文脈ドキュメントの全文だけを Markdown で出力してください。

更新ルール:
- 新しい情報で古い記述を置き換える(履歴の羅列にしない。常に「今の状態」)
- 完了したタスクは「次にやること」から消し、必要なら「直近の決定事項」等に成果として残す
- しばらく動きのないプロジェクトも消さずに「停滞中」等と印を付けて残す
- セクション構成: 「## 進行中のプロジェクト」「## 直近の決定事項」「## 次にやること」
  (必要ならプロジェクトごとの小見出しを使う)
- 冒頭に「最終更新: {date}」を入れる
- 前置きや説明は書かず、ドキュメント本文のみを出力する

--- 現在の仕事文脈 ---
{context}

--- {date} の日報 ---
{report}
"""


def update_context(report_path: str, date: str, claude_cli: str = "claude") -> str | None:
    """日報を文脈にマージして WORK_CONTEXT.md を更新する。成功時はパスを返す。"""
    report = Path(report_path).read_text(encoding="utf-8")
    current = (
        CONTEXT_PATH.read_text(encoding="utf-8")
        if CONTEXT_PATH.exists()
        else EMPTY_CONTEXT
    )
    updated = llm.generate(
        MERGE_PROMPT.format(date=date, context=current, report=report),
        claude_cli=claude_cli,
    )
    if updated is None:
        return None
    if CONTEXT_PATH.exists():
        HISTORY_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        (HISTORY_DIR / f"WORK_CONTEXT_{stamp}.md").write_text(
            current, encoding="utf-8"
        )
    CONTEXT_PATH.write_text(updated + "\n", encoding="utf-8")
    return str(CONTEXT_PATH)
