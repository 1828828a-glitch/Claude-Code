"""承認キュー。

モックの「NEEDS YOUR DECISION」と「Customer message ready → Review / Approve send」。
人間がこの画面でやることは1日ぶんでも数分で終わるべきで、
そのために提案は「何を・なぜ」が一目でわかる形で出す必要がある。
"""

from __future__ import annotations

from dataclasses import dataclass

from .audit import AuditLog
from .domain import Business
from .store import Store, now
from .tools import EffectError, apply_effect


class ApprovalError(ValueError):
    pass


@dataclass
class Decision:
    proposal_id: str
    status: str
    result: str


def _require_pending(store: Store, proposal_id: str) -> dict:
    proposal = store.proposal(proposal_id)
    if proposal is None:
        raise ApprovalError(f"提案 {proposal_id} が見つかりません")
    if proposal["status"] != "pending":
        raise ApprovalError(
            f"提案 {proposal_id} はすでに {proposal['status']} です（{proposal['decided_at']}）"
        )
    return proposal


def approve(
    store: Store, business: Business, audit: AuditLog, proposal_id: str, *, note: str = ""
) -> Decision:
    """提案を承認し、実データに反映する。"""
    proposal = _require_pending(store, proposal_id)

    try:
        result = apply_effect(
            store,
            business,
            proposal["kind"],
            proposal["payload"],
            actor=f"{proposal['agent']} (AI) / 人間承認済み",
        )
    except EffectError as exc:
        # 提案が積まれてから実データが変わり、もう当てはまらなくなった場合。
        # 承認扱いにはせず pending のまま残し、人間が判断し直せるようにする。
        audit.record(
            "approval_failed",
            run_id=proposal["run_id"],
            proposal_id=proposal_id,
            error=str(exc),
        )
        raise ApprovalError(f"反映できませんでした: {exc}") from exc

    proposal["status"] = "approved"
    proposal["decided_at"] = now()
    proposal["note"] = note or None
    store.save()

    audit.record(
        "proposal_approved",
        run_id=proposal["run_id"],
        proposal_id=proposal_id,
        agent=proposal["agent"],
        kind=proposal["kind"],
        payload=proposal["payload"],
        note=note or None,
        result=result,
    )
    return Decision(proposal_id, "approved", result)


def reject(
    store: Store, audit: AuditLog, proposal_id: str, *, note: str = ""
) -> Decision:
    """提案を却下する。実データは一切変わらない。

    note は「なぜ却下したか」。これが溜まると、次に同じ判断をAI側に寄せるための材料になる。
    """
    proposal = _require_pending(store, proposal_id)
    proposal["status"] = "rejected"
    proposal["decided_at"] = now()
    proposal["note"] = note or None
    store.save()

    audit.record(
        "proposal_rejected",
        run_id=proposal["run_id"],
        proposal_id=proposal_id,
        agent=proposal["agent"],
        kind=proposal["kind"],
        payload=proposal["payload"],
        note=note or None,
    )
    return Decision(proposal_id, "rejected", "却下しました。実データは変わっていません。")


def summarize(proposal: dict, business: Business) -> str:
    """承認画面に出す1件ぶんの表示。人間はこれを読んで判断する。"""
    kind = proposal["kind"]
    payload = proposal["payload"]

    if kind == "send_message":
        head = f"顧客へ {payload.get('channel', 'email')} を送信"
        if payload.get("subject"):
            head += f" — 件名: {payload['subject']}"
        body = payload["body"]
        detail = body if len(body) <= 600 else body[:600] + "…"
    elif kind == "advance_stage":
        stage = business.stage(payload["to_stage"])
        label = stage.label if stage else payload["to_stage"]
        head = f"案件を「{label}」へ進める"
        detail = f"job: {payload['job_id']}"
    elif kind == "create_task":
        head = f"タスク作成: {payload['title']}"
        detail = f"期限 {payload.get('due') or '未設定'} / 担当 {payload.get('owner') or '未設定'}"
    elif kind == "update_job":
        head = "案件の項目を更新"
        detail = ", ".join(f"{k} = {v}" for k, v in payload["fields"].items())
    elif kind == "add_note":
        head = "案件にメモを追加"
        detail = payload["text"]
    else:
        head = kind
        detail = str(payload)

    return (
        f"[{proposal['id']}] {head}\n"
        f"  提案者: {proposal['agent']}   {proposal['created_at']}\n"
        f"  理由: {proposal['reason']}\n"
        f"  内容: {detail}"
    )
