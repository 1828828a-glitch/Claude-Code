"""AI社員が使える道具。

設計の要はここ。ツールは2種類しかない。

  読み取り系 — その場で実行する。副作用がないので承認は要らない。
  書き込み系 — 既定では「実行しない」。提案を作って承認待ちに積むだけ。

つまり承認ゲートはループの外側ではなくツールの中にある。
エージェントは自分が実行できたつもりで喋るが、実際に世界が変わるのは
人間が approve したときだけ。autonomy を "auto" にしたツールだけが即実行される。
"""

from __future__ import annotations

import json
from typing import Any, Callable

from anthropic import beta_tool

from .audit import AuditLog
from .domain import AgentSpec, Business
from .store import Store, now

# 書き込み系ツール名 → 効果の種類
WRITE_TOOLS = {
    "draft_customer_message": "send_message",
    "draft_content": "save_draft",
    "advance_job_stage": "advance_stage",
    "create_followup_task": "create_task",
    "update_job_fields": "update_job",
    "add_job_note": "add_note",
}

READ_TOOLS = ["list_jobs", "get_job", "list_open_tasks", "search_jobs"]

ALL_TOOLS = READ_TOOLS + list(WRITE_TOOLS)


class EffectError(ValueError):
    """提案の中身が実データと噛み合わない（存在しない案件、未定義の段階など）。"""


def apply_effect(
    store: Store, business: Business, kind: str, payload: dict, *, actor: str
) -> str:
    """提案の中身を実データに反映する。

    自律実行（autonomy="auto"）と人間の承認、どちらの経路もここを通る。
    反映の仕方が1か所しかないので、両者の挙動がずれない。
    """
    if kind == "send_message":
        job = _require_job(store, payload["job_id"])
        job["communications"].append(
            {
                "at": now(),
                "direction": "out",
                "channel": payload.get("channel", "email"),
                "subject": payload.get("subject", ""),
                "body": payload["body"],
                "sent_by": actor,
            }
        )
        store.touch_job(job)
        return f"{job['title']} の顧客に {payload.get('channel', 'email')} を送信しました"

    if kind == "save_draft":
        job = _require_job(store, payload["job_id"])
        job.setdefault("drafts", []).append(
            {
                "at": now(),
                "by": actor,
                "label": payload.get("label", "draft"),
                "body": payload["body"],
            }
        )
        store.touch_job(job)
        chars = len(payload["body"])
        return f"{job['title']} に原稿を保存しました（{chars:,}字, {payload.get('label', 'draft')}）"

    if kind == "advance_stage":
        job = _require_job(store, payload["job_id"])
        to_stage = payload["to_stage"]
        if business.stage(to_stage) is None:
            raise EffectError(
                f"`{to_stage}` は未定義の段階です。使えるのは: {', '.join(business.stage_keys)}"
            )
        before = job["stage"]
        job["stage"] = to_stage
        store.touch_job(job)
        return f"{job['title']}: {before} → {to_stage}"

    if kind == "create_task":
        task = store.add_task(
            title=payload["title"],
            job_id=payload.get("job_id"),
            due=payload.get("due"),
            owner=payload.get("owner", actor),
        )
        return f"タスクを作成しました: {task['title']} ({task['id']})"

    if kind == "update_job":
        job = _require_job(store, payload["job_id"])
        fields = payload["fields"]
        applied = {}
        for key, value in fields.items():
            spec = business.job_field(key)
            if spec is None:
                raise EffectError(
                    f"`{key}` は未定義の項目です。使えるのは: "
                    f"{', '.join(f.key for f in business.job_fields)}"
                )
            applied[key] = spec.coerce(value)
        job["fields"].update(applied)
        store.touch_job(job)
        return f"{job['title']} の項目を更新しました: {', '.join(applied)}"

    if kind == "add_note":
        job = _require_job(store, payload["job_id"])
        job["notes"].append({"at": now(), "by": actor, "text": payload["text"]})
        store.touch_job(job)
        return f"{job['title']} にメモを追加しました"

    raise EffectError(f"未知の効果です: {kind}")


def _require_job(store: Store, job_id: str) -> dict:
    job = store.job(job_id)
    if job is None:
        raise EffectError(f"案件 {job_id} が見つかりません")
    return job


def build_tools(
    *,
    store: Store,
    business: Business,
    agent: AgentSpec,
    run_id: str,
    audit: AuditLog,
) -> list[Callable]:
    """このエージェントが今回の実行で使えるツール一式を組み立てる。

    agent.tools が空なら全ツール。指定があればその範囲だけ渡す。
    """

    def gate(tool_name: str, kind: str, payload: dict, reason: str) -> str:
        """書き込み系ツールの共通処理。承認に回すか、即実行するか。"""
        mode = agent.autonomy_for(tool_name)

        if mode == "auto":
            try:
                result = apply_effect(
                    store, business, kind, payload, actor=f"{agent.name} (AI)"
                )
            except EffectError as exc:
                audit.record(
                    "effect_failed",
                    run_id=run_id,
                    agent=agent.key,
                    kind=kind,
                    payload=payload,
                    error=str(exc),
                )
                return f"実行できませんでした: {exc}"
            store.save()
            audit.record(
                "effect_applied",
                run_id=run_id,
                agent=agent.key,
                kind=kind,
                payload=payload,
                reason=reason,
                mode="auto",
                result=result,
            )
            return f"実行しました（自律実行の権限あり）: {result}"

        proposal = store.add_proposal(
            run_id=run_id, agent=agent.key, kind=kind, payload=payload, reason=reason
        )
        store.save()
        audit.record(
            "proposal_created",
            run_id=run_id,
            agent=agent.key,
            kind=kind,
            payload=payload,
            reason=reason,
            proposal_id=proposal["id"],
        )
        return (
            f"承認待ちに積みました（{proposal['id']}）。"
            f"人間が承認するまで実行されません。この件はこれ以上進めず、次の作業へ移ってください。"
        )

    # ------------------------------------------------------------------
    # 読み取り系
    # ------------------------------------------------------------------

    @beta_tool
    def list_jobs(stage: str = "", limit: int = 20) -> str:
        """案件を一覧する。

        Args:
            stage: 絞り込む段階のキー。空文字なら全段階。
            limit: 返す件数の上限。
        """
        jobs = store.jobs(stage or None)
        jobs = sorted(jobs, key=lambda j: j["updated_at"], reverse=True)[:limit]
        if not jobs:
            return "該当する案件はありません。"
        return json.dumps(
            [
                {
                    "id": j["id"],
                    "title": j["title"],
                    "stage": j["stage"],
                    "updated_at": j["updated_at"],
                    "fields": j["fields"],
                }
                for j in jobs
            ],
            ensure_ascii=False,
            indent=2,
        )

    @beta_tool
    def get_job(job_id: str) -> str:
        """案件1件の全体を見る。顧客情報、やり取りの履歴、メモを含む。

        Args:
            job_id: 案件ID。
        """
        job = store.job(job_id)
        if job is None:
            return f"案件 {job_id} は見つかりません。"
        customer = store.customer(job["customer_id"]) if job.get("customer_id") else None
        return json.dumps(
            {**job, "customer": customer}, ensure_ascii=False, indent=2
        )

    @beta_tool
    def search_jobs(query: str) -> str:
        """案件をキーワードで探す。題名・メモ・やり取り本文を対象にする。

        Args:
            query: 検索語。
        """
        q = query.lower().strip()
        if not q:
            return "検索語が空です。"
        hits = []
        for job in store.jobs():
            haystack = " ".join(
                [job["title"], json.dumps(job["fields"], ensure_ascii=False)]
                + [n["text"] for n in job["notes"]]
                + [c.get("body", "") for c in job["communications"]]
            ).lower()
            if q in haystack:
                hits.append({"id": job["id"], "title": job["title"], "stage": job["stage"]})
        if not hits:
            return f"「{query}」に該当する案件はありません。"
        return json.dumps(hits, ensure_ascii=False, indent=2)

    @beta_tool
    def list_open_tasks() -> str:
        """未完了のタスクを一覧する。"""
        tasks = store.tasks(open_only=True)
        if not tasks:
            return "未完了のタスクはありません。"
        return json.dumps(tasks, ensure_ascii=False, indent=2)

    # ------------------------------------------------------------------
    # 書き込み系（既定では提案どまり）
    # ------------------------------------------------------------------

    @beta_tool
    def draft_customer_message(
        job_id: str, body: str, reason: str, channel: str = "email", subject: str = ""
    ) -> str:
        """顧客へ送るメッセージを下書きし、人間の承認に回す。

        本文は実際に顧客が読むものとして完成させること。プレースホルダを残さない。

        Args:
            job_id: 対象の案件ID。
            body: 送信するメッセージ本文。そのまま送れる状態で書く。
            reason: なぜ今これを送るのか。承認する人間が読む。
            channel: 送信手段。email / sms / line など。
            subject: 件名。email のとき必須。
        """
        return gate(
            "draft_customer_message",
            "send_message",
            {"job_id": job_id, "body": body, "channel": channel, "subject": subject},
            reason,
        )

    @beta_tool
    def draft_content(job_id: str, body: str, reason: str, label: str = "draft") -> str:
        """記事や原稿の本文を書き、人間の承認に回す。

        そのまま公開できる状態で書くこと。見出しの穴埋めや「※ここに事例」のような
        プレースホルダを残さない。書けない箇所があるなら body には含めず reason で報告する。

        Args:
            job_id: 対象の案件ID。
            body: 原稿の本文そのもの。
            reason: 何を狙ってこう書いたか。承認する人間が読む。
            label: 原稿の段階。outline / draft / revised など。
        """
        return gate(
            "draft_content",
            "save_draft",
            {"job_id": job_id, "body": body, "label": label},
            reason,
        )

    @beta_tool
    def advance_job_stage(job_id: str, to_stage: str, reason: str) -> str:
        """案件をパイプラインの別の段階へ動かす。

        Args:
            job_id: 対象の案件ID。
            to_stage: 移動先の段階キー。
            reason: 根拠。実際に起きた出来事を挙げること。
        """
        return gate(
            "advance_job_stage",
            "advance_stage",
            {"job_id": job_id, "to_stage": to_stage},
            reason,
        )

    @beta_tool
    def create_followup_task(
        title: str, reason: str, job_id: str = "", due: str = "", owner: str = ""
    ) -> str:
        """フォローアップのタスクを作る。

        Args:
            title: タスクの内容。何をするかが一読でわかる書き方にする。
            reason: なぜこのタスクが必要か。
            job_id: 紐づく案件ID。案件に紐づかないなら空文字。
            due: 期限。YYYY-MM-DD 形式。
            owner: 担当者。空なら自分。
        """
        return gate(
            "create_followup_task",
            "create_task",
            {
                "title": title,
                "job_id": job_id or None,
                "due": due or None,
                "owner": owner or agent.name,
            },
            reason,
        )

    @beta_tool
    def update_job_fields(job_id: str, fields_json: str, reason: str) -> str:
        """案件の項目を更新する。

        Args:
            job_id: 対象の案件ID。
            fields_json: 更新する項目のJSONオブジェクト文字列。例: {"amount": 480000}
            reason: 更新の根拠。どこから得た情報かを書く。
        """
        try:
            fields = json.loads(fields_json)
        except json.JSONDecodeError as exc:
            return f"fields_json がJSONとして読めません: {exc}"
        if not isinstance(fields, dict):
            return "fields_json はJSONオブジェクトである必要があります。"
        return gate(
            "update_job_fields", "update_job", {"job_id": job_id, "fields": fields}, reason
        )

    @beta_tool
    def add_job_note(job_id: str, text: str, reason: str) -> str:
        """案件にメモを残す。あとから自分や他のAI社員が読む前提で書く。

        Args:
            job_id: 対象の案件ID。
            text: メモ本文。
            reason: なぜ残すのか。
        """
        return gate("add_job_note", "add_note", {"job_id": job_id, "text": text}, reason)

    available: dict[str, Any] = {
        "list_jobs": list_jobs,
        "get_job": get_job,
        "search_jobs": search_jobs,
        "list_open_tasks": list_open_tasks,
        "draft_customer_message": draft_customer_message,
        "draft_content": draft_content,
        "advance_job_stage": advance_job_stage,
        "create_followup_task": create_followup_task,
        "update_job_fields": update_job_fields,
        "add_job_note": add_job_note,
    }

    if not agent.tools:
        return list(available.values())

    unknown = [t for t in agent.tools if t not in available]
    if unknown:
        raise ValueError(
            f"エージェント `{agent.key}` が未知のツールを要求しています: {unknown}。"
            f"使えるのは: {', '.join(available)}"
        )
    return [available[t] for t in agent.tools]
