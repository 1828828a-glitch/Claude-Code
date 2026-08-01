"""CLI エントリポイント。

使い方:
  python -m work_monitor watch            # 収集ループを開始 (分単位で記録)
  python -m work_monitor collect          # 1回だけ収集
  python -m work_monitor status           # 今日の収集状況を表示
  python -m work_monitor timeline         # 今日のタイムラインを表示
  python -m work_monitor nippo            # 今日の日報を生成
  python -m work_monitor nippo --date 2026-07-31
  python -m work_monitor context          # 最新の日報を仕事文脈にマージ
  python -m work_monitor daily            # nippo + context をまとめて実行 (終業時用)
"""

from __future__ import annotations

import argparse
import time
from datetime import date as _date

from . import context_store, db, report, timeline
from .collectors import claude_logs, notes, screen, slack_history
from .config import CONFIG_PATH, DATA_DIR, load_config


def _today() -> str:
    return _date.today().isoformat()


def run_collect_once(cfg: dict, conn, slow: bool = True) -> dict:
    counts = {}
    if cfg["screen"]["enabled"]:
        counts["screen"] = screen.collect(conn, cfg)
    if slow:
        if cfg["claude_logs"]["enabled"]:
            counts["claude"] = claude_logs.collect(conn, cfg)
        if cfg["notes"]["enabled"]:
            counts["notes"] = notes.collect(conn, cfg)
        if cfg["slack"]["enabled"]:
            counts["slack"] = slack_history.collect(conn, cfg)
    return counts


def cmd_watch(cfg: dict) -> None:
    conn = db.connect()
    interval = cfg["interval_seconds"]
    slow_every = max(1, cfg["slow_every"])
    print(f"[work_monitor] 収集開始 (間隔 {interval}s, データ: {DATA_DIR})")
    print(f"[work_monitor] 設定ファイル: {CONFIG_PATH}")
    cycle = 0
    while True:
        try:
            counts = run_collect_once(cfg, conn, slow=(cycle % slow_every == 0))
            recorded = {k: v for k, v in counts.items() if v}
            if recorded:
                print(f"[{time.strftime('%H:%M')}] 記録: {recorded}")
        except KeyboardInterrupt:
            print("\n[work_monitor] 停止しました。")
            return
        except Exception as e:  # 収集失敗でループを止めない
            print(f"[warn] 収集エラー: {e}")
        cycle += 1
        try:
            time.sleep(interval)
        except KeyboardInterrupt:
            print("\n[work_monitor] 停止しました。")
            return


def cmd_status(target: str) -> None:
    stats = timeline.day_summary_stats(target)
    print(f"{target} の収集状況")
    print(f"  イベント総数: {stats['total']}")
    print(f"  画面記録のある分数: {stats['active_minutes']}")
    for source, n in sorted(stats["counts"].items()):
        print(f"  {source}: {n}件")


def cmd_nippo(cfg: dict, target: str) -> str:
    path = report.generate_report(target, claude_cli=cfg["claude_cli"])
    print(f"日報を生成しました: {path}")
    return path


def cmd_context(cfg: dict, target: str) -> None:
    report_path = report.REPORTS_DIR / f"{target}.md"
    if not report_path.exists():
        print(f"{target} の日報がまだありません。先に nippo を実行します。")
        cmd_nippo(cfg, target)
    result = context_store.update_context(
        str(report_path), target, claude_cli=cfg["claude_cli"]
    )
    if result:
        print(f"仕事文脈を更新しました: {result}")
    else:
        print("仕事文脈の更新に失敗しました (claude CLI を確認してください)。")


def main() -> None:
    parser = argparse.ArgumentParser(prog="work_monitor", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("watch", "collect", "status", "timeline", "nippo", "context", "daily"):
        p = sub.add_parser(name)
        p.add_argument("--date", default=_today(), help="対象日 YYYY-MM-DD (既定: 今日)")
    args = parser.parse_args()

    cfg = load_config()
    if args.command == "watch":
        cmd_watch(cfg)
    elif args.command == "collect":
        counts = run_collect_once(cfg, db.connect())
        print(f"収集完了: {counts}")
    elif args.command == "status":
        cmd_status(args.date)
    elif args.command == "timeline":
        print(timeline.build_day_markdown(args.date))
    elif args.command == "nippo":
        cmd_nippo(cfg, args.date)
    elif args.command == "context":
        cmd_context(cfg, args.date)
    elif args.command == "daily":
        cmd_nippo(cfg, args.date)
        cmd_context(cfg, args.date)


if __name__ == "__main__":
    main()
