"""コマンドライン。

    python -m tycoon jobs                       案件一覧
    python -m tycoon agents                     AI社員一覧
    python -m tycoon run wilem "今日の取りこぼしを洗い出して"
    python -m tycoon queue                      承認待ちを見る
    python -m tycoon approve prop_xxxx          承認して実行する
    python -m tycoon reject  prop_xxxx -m 理由  却下する
    python -m tycoon audit --run run_xxxx       監査ログを読む
    python -m tycoon seed                       サンプルデータを入れる
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import approvals
from .audit import AuditLog
from .domain import Business, BusinessConfigError, load_business
from .store import Store

HERE = Path(__file__).parent
DEFAULT_BUSINESS = HERE / "business.yaml"
FALLBACK_BUSINESS = HERE / "business.example.yaml"


def _resolve_business(path: str | None) -> Business:
    if path:
        return load_business(path)
    if DEFAULT_BUSINESS.exists():
        return load_business(DEFAULT_BUSINESS)
    print(
        f"注意: {DEFAULT_BUSINESS.name} がないので "
        f"{FALLBACK_BUSINESS.name} で動かします（サンプルの事業定義です）。\n"
        f"      cp {FALLBACK_BUSINESS} {DEFAULT_BUSINESS}\n",
        file=sys.stderr,
    )
    return load_business(FALLBACK_BUSINESS)


# ----------------------------------------------------------------------
# 各コマンド
# ----------------------------------------------------------------------


def cmd_jobs(args, business: Business, store: Store, audit: AuditLog) -> int:
    jobs = store.jobs(args.stage)
    if not jobs:
        print("案件がありません。`python -m tycoon seed` でサンプルを入れられます。")
        return 0

    by_stage: dict[str, list[dict]] = {}
    for job in jobs:
        by_stage.setdefault(job["stage"], []).append(job)

    for stage in business.stages:
        bucket = by_stage.get(stage.key)
        if not bucket:
            continue
        print(f"\n■ {stage.label} ({stage.key}) — {len(bucket)}件")
        for job in sorted(bucket, key=lambda j: j["updated_at"]):
            amount = job["fields"].get("amount")
            money = f"  {business.currency} {amount:,.0f}" if amount else ""
            print(f"  {job['id']}  {job['title']}{money}")
            print(f"    最終更新 {job['updated_at'][:10]}")
    print()
    return 0


def cmd_agents(args, business: Business, store: Store, audit: AuditLog) -> int:
    for agent in business.agents:
        auto = [t for t, m in agent.autonomy.items() if m == "auto"]
        print(f"\n{agent.key}  —  {agent.name} / {agent.role}")
        scope = ", ".join(agent.tools) if agent.tools else "全ツール"
        print(f"  使えるツール: {scope}")
        print(f"  自律実行: {', '.join(auto) if auto else 'なし（すべて承認が必要）'}")
    print()
    return 0


def cmd_run(args, business: Business, store: Store, audit: AuditLog) -> int:
    agent = business.agent(args.agent)
    if agent is None:
        print(
            f"`{args.agent}` というAI社員はいません。"
            f"いるのは: {', '.join(a.key for a in business.agents)}",
            file=sys.stderr,
        )
        return 1

    try:
        import anthropic

        from .agents import run_agent
    except ImportError:
        print(
            "anthropic SDK が入っていません:  pip install -r requirements.txt",
            file=sys.stderr,
        )
        return 1

    client = anthropic.Anthropic()

    print(f"▶ {agent.name}（{agent.role}）に依頼中…\n")
    try:
        result = run_agent(
            client=client,
            store=store,
            business=business,
            agent=agent,
            task=args.task,
            audit=audit,
            effort=args.effort,
        )
    except anthropic.AuthenticationError:
        print(
            "APIキーが通りませんでした。ANTHROPIC_API_KEY を設定するか "
            "`ant auth login` を実行してください。",
            file=sys.stderr,
        )
        return 1
    except anthropic.RateLimitError as exc:
        retry = exc.response.headers.get("retry-after", "?")
        print(f"レート制限です。{retry} 秒後に再試行してください。", file=sys.stderr)
        return 1

    print(result.summary or "(要約なし)")
    print(f"\n— run {result.run_id} / {result.turns}ターン / "
          f"出力 {result.usage['output_tokens']:,} トークン")

    if result.proposals:
        print(f"\n承認待ちが {len(result.proposals)} 件たまりました:")
        for proposal in result.proposals:
            print("\n" + approvals.summarize(proposal, business))
        print("\n  承認: python -m tycoon approve <id>")
        print("  却下: python -m tycoon reject <id> -m 理由")
    else:
        print("\n承認待ちはありません。")
    return 0


def cmd_queue(args, business: Business, store: Store, audit: AuditLog) -> int:
    pending = store.proposals("pending")
    if not pending:
        print("承認待ちはありません。")
        return 0
    print(f"承認待ち {len(pending)} 件\n")
    for proposal in pending:
        print(approvals.summarize(proposal, business))
        print()
    return 0


def cmd_approve(args, business: Business, store: Store, audit: AuditLog) -> int:
    try:
        decision = approvals.approve(
            store, business, audit, args.proposal_id, note=args.message
        )
    except approvals.ApprovalError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(f"承認しました: {decision.result}")
    return 0


def cmd_reject(args, business: Business, store: Store, audit: AuditLog) -> int:
    try:
        decision = approvals.reject(store, audit, args.proposal_id, note=args.message)
    except approvals.ApprovalError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(decision.result)
    return 0


def cmd_audit(args, business: Business, store: Store, audit: AuditLog) -> int:
    entries = audit.entries(run_id=args.run, limit=args.limit)
    if not entries:
        print("監査ログはまだありません。")
        return 0
    for entry in entries:
        head = f"{entry['at']}  {entry['event']}"
        if entry.get("agent"):
            head += f"  [{entry['agent']}]"
        print(head)
        for key in ("tool", "kind", "reason", "result", "note", "error", "task", "summary"):
            value = entry.get(key)
            if value:
                text = str(value).replace("\n", " ")
                if len(text) > 160:
                    text = text[:160] + "…"
                print(f"    {key}: {text}")
    return 0


def cmd_seed(args, business: Business, store: Store, audit: AuditLog) -> int:
    from .seed import seed

    count = seed(store, business)
    if count == 0:
        print(
            "何も入れませんでした。"
            "（すでに案件があるか、business.yaml に sample_data がありません）"
        )
    else:
        print(f"サンプル案件を {count} 件入れました。`python -m tycoon jobs` で確認できます。")
    return 0


# ----------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="tycoon", description="AI社員が実務を下書きし、人間が承認する"
    )
    parser.add_argument("--business", help="事業定義YAMLのパス")
    parser.add_argument("--data", default="tycoon_data.json", help="データファイルのパス")
    parser.add_argument("--audit-log", default="tycoon_audit.jsonl", help="監査ログのパス")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("jobs", help="案件一覧")
    p.add_argument("--stage", help="段階で絞る")
    p.set_defaults(func=cmd_jobs)

    p = sub.add_parser("agents", help="AI社員一覧")
    p.set_defaults(func=cmd_agents)

    p = sub.add_parser("run", help="AI社員に仕事を任せる")
    p.add_argument("agent", help="AI社員のキー")
    p.add_argument("task", help="依頼内容")
    p.add_argument(
        "--effort",
        default="high",
        choices=["low", "medium", "high", "xhigh", "max"],
        help="どれだけ考えさせるか（既定 high）",
    )
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("queue", help="承認待ちを見る")
    p.set_defaults(func=cmd_queue)

    p = sub.add_parser("approve", help="提案を承認して実行する")
    p.add_argument("proposal_id")
    p.add_argument("-m", "--message", default="", help="メモ")
    p.set_defaults(func=cmd_approve)

    p = sub.add_parser("reject", help="提案を却下する")
    p.add_argument("proposal_id")
    p.add_argument("-m", "--message", default="", help="却下の理由")
    p.set_defaults(func=cmd_reject)

    p = sub.add_parser("audit", help="監査ログを読む")
    p.add_argument("--run", help="実行IDで絞る")
    p.add_argument("--limit", type=int, default=40)
    p.set_defaults(func=cmd_audit)

    p = sub.add_parser("seed", help="サンプルデータを入れる")
    p.set_defaults(func=cmd_seed)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        business = _resolve_business(args.business)
    except BusinessConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    store = Store(args.data)
    audit = AuditLog(args.audit_log)
    return args.func(args, business, store, audit)


if __name__ == "__main__":
    raise SystemExit(main())
