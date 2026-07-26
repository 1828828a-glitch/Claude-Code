"""承認ループの検証。APIキーなしで動く。

確かめたいのは「AIが賢いか」ではなく「AIが暴走しても実データが動かないか」。
だからモデルは呼ばず、ツールを直接叩いて次の3点を見る:

  1. 書き込み系ツールを呼んでも、承認するまで実データは1バイトも変わらない
  2. 承認したときだけ変わり、その全過程が監査ログに残る
  3. autonomy="auto" のツールだけは即実行され、それも監査ログに残る
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tycoon import approvals
from tycoon.audit import AuditLog
from tycoon.domain import load_business
from tycoon.store import Store
from tycoon.tools import ALL_TOOLS, build_tools

TYCOON_DIR = Path(__file__).parent.parent / "tycoon"
BUSINESS_YAML = TYCOON_DIR / "business.example.yaml"
ALL_BUSINESS_YAMLS = sorted(TYCOON_DIR.glob("business*.yaml"))


def _fixture(tmp: Path):
    business = load_business(BUSINESS_YAML)
    store = Store(tmp / "data.json")
    audit = AuditLog(tmp / "audit.jsonl")
    customer = store.add_customer("テスト商事", email="t@example.com")
    job = store.add_job(
        "テスト案件", stage="estimate_sent", customer_id=customer["id"], amount=100_000
    )
    store.save()
    return business, store, audit, job


def _tools_for(business, store, audit, agent_key: str, run_id: str = "run_test"):
    agent = business.agent(agent_key)
    assert agent is not None, f"{agent_key} が business.yaml にいない"
    tools = build_tools(
        store=store, business=business, agent=agent, run_id=run_id, audit=audit
    )
    return {t.name: t for t in tools}


def test_tool_schemas_are_generated():
    """全ツールがモデルに渡せるスキーマを持っていること。"""
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, _ = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "riley")

        assert set(tools) == set(ALL_TOOLS), f"ツールの欠落/余剰: {set(tools) ^ set(ALL_TOOLS)}"
        for name, tool in tools.items():
            schema = tool.to_dict()
            assert schema["description"], f"{name} に説明がない"
            assert schema["input_schema"]["type"] == "object", name
            for prop, spec in schema["input_schema"]["properties"].items():
                assert spec.get("description"), f"{name}.{prop} に説明がない"


def test_write_tool_does_not_touch_real_data():
    """提案どまりのツールを呼んでも案件は変わらない。"""
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, job = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "riley")
        before = json.dumps(store.job(job["id"]), sort_keys=True)

        reply = tools["draft_customer_message"].call(
            {
                "job_id": job["id"],
                "body": "お世話になっております。先日のお見積の件、いかがでしょうか。",
                "reason": "見積送付から13日返信がないため",
                "channel": "email",
                "subject": "お見積の件",
            }
        )
        assert "承認待ち" in reply, reply

        # 再読み込みしても案件は無傷
        after = json.dumps(Store(store.path).job(job["id"]), sort_keys=True)
        assert after == before, "承認前に実データが変わってしまった"

        pending = store.proposals("pending")
        assert len(pending) == 1
        assert pending[0]["kind"] == "send_message"
        assert pending[0]["reason"]

        events = [e["event"] for e in audit.entries()]
        assert "proposal_created" in events


def test_approval_applies_the_effect():
    """承認したときだけ実データが動き、監査ログに残る。"""
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, job = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "riley")

        tools["advance_job_stage"].call(
            {"job_id": job["id"], "to_stage": "won", "reason": "先方から発注書を受領"}
        )
        proposal = store.proposals("pending")[0]
        assert store.job(job["id"])["stage"] == "estimate_sent"

        approvals.approve(store, business, audit, proposal["id"], note="確認済み")

        assert Store(store.path).job(job["id"])["stage"] == "won"
        assert store.proposal(proposal["id"])["status"] == "approved"
        assert "proposal_approved" in [e["event"] for e in audit.entries()]


def test_rejection_changes_nothing():
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, job = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "riley")

        tools["advance_job_stage"].call(
            {"job_id": job["id"], "to_stage": "paid", "reason": "入金があったと思われる"}
        )
        proposal = store.proposals("pending")[0]

        approvals.reject(store, audit, proposal["id"], note="入金確認が取れていない")

        assert Store(store.path).job(job["id"])["stage"] == "estimate_sent"
        assert store.proposal(proposal["id"])["status"] == "rejected"
        assert store.proposals("pending") == []


def test_double_decision_is_refused():
    """同じ提案を二度承認できない。"""
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, job = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "riley")
        tools["add_job_note"].call(
            {"job_id": job["id"], "text": "メモ", "reason": "記録のため"}
        )
        proposal = store.proposals("pending")[0]
        approvals.approve(store, business, audit, proposal["id"])

        try:
            approvals.approve(store, business, audit, proposal["id"])
        except approvals.ApprovalError:
            pass
        else:
            raise AssertionError("二重承認が通ってしまった")


def test_auto_autonomy_executes_immediately():
    """デヴィの add_job_note は auto なので承認を経ず実行される。"""
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, job = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "devi")

        reply = tools["add_job_note"].call(
            {"job_id": job["id"], "text": "台帳と履歴を突合済み", "reason": "整合性確認"}
        )
        assert "実行しました" in reply, reply
        assert len(Store(store.path).job(job["id"])["notes"]) == 1
        assert store.proposals("pending") == []
        assert "effect_applied" in [e["event"] for e in audit.entries()]

        # 一方、同じデヴィでも段階変更は auto ではないので提案どまり
        tools["advance_job_stage"].call(
            {"job_id": job["id"], "to_stage": "won", "reason": "テスト"}
        )
        assert len(store.proposals("pending")) == 1


def test_invalid_stage_is_rejected_not_silently_applied():
    """存在しない段階への移動は、承認しても弾かれる。"""
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, job = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "riley")
        tools["advance_job_stage"].call(
            {"job_id": job["id"], "to_stage": "銀河進出", "reason": "幻覚"}
        )
        proposal = store.proposals("pending")[0]

        try:
            approvals.approve(store, business, audit, proposal["id"])
        except approvals.ApprovalError as exc:
            assert "未定義の段階" in str(exc)
        else:
            raise AssertionError("未定義の段階が通ってしまった")

        assert Store(store.path).job(job["id"])["stage"] == "estimate_sent"
        # 失敗した提案は pending のまま。人間が判断し直せる。
        assert store.proposal(proposal["id"])["status"] == "pending"


def test_agent_tool_scope_is_enforced():
    """ウィレムには顧客へ連絡する手段が渡っていない。"""
    with tempfile.TemporaryDirectory() as d:
        business, store, audit, _ = _fixture(Path(d))
        tools = _tools_for(business, store, audit, "wilem")
        assert "draft_customer_message" not in tools
        assert "create_followup_task" in tools


def test_every_business_definition_is_usable():
    """同梱の business*.yaml がすべて読め、seed が通り、AI社員を組み立てられること。

    業種を差し替えたときに壊れる箇所は、たいていここで先に落ちる。
    """
    assert ALL_BUSINESS_YAMLS, "business*.yaml が1つも見つからない"

    for yaml_path in ALL_BUSINESS_YAMLS:
        business = load_business(yaml_path)
        label = yaml_path.name

        with tempfile.TemporaryDirectory() as d:
            store = Store(Path(d) / "data.json")
            audit = AuditLog(Path(d) / "audit.jsonl")

            from tycoon.seed import seed

            count = seed(store, business)
            assert count > 0, f"{label}: sample_data からサンプルが入らなかった"

            # サンプルの段階がすべて実在すること（seed 側でも検証しているが念のため）
            for job in store.jobs():
                assert business.stage(job["stage"]) is not None, f"{label}: {job['stage']}"

            # サンプルが使う項目が job_fields に定義されていること
            defined = {f.key for f in business.job_fields}
            for job in store.jobs():
                unknown = set(job["fields"]) - defined
                assert not unknown, f"{label}: 未定義の項目 {unknown} を sample_data が使っている"

            # 全AI社員がツールを組み立てられ、system prompt が作れること
            from tycoon.agents import build_system_prompt

            assert business.agents, f"{label}: AI社員がいない"
            for agent in business.agents:
                tools = build_tools(
                    store=store,
                    business=business,
                    agent=agent,
                    run_id="run_check",
                    audit=audit,
                )
                assert tools, f"{label}/{agent.key}: ツールが空"
                prompt = build_system_prompt(business, agent)
                assert business.name in prompt
                assert agent.name in prompt


def test_content_draft_flows_through_approval():
    """記事の下書きも、顧客連絡と同じく承認するまで保存されない。"""
    with tempfile.TemporaryDirectory() as d:
        business = load_business(TYCOON_DIR / "business.yaml")
        store = Store(Path(d) / "data.json")
        audit = AuditLog(Path(d) / "audit.jsonl")
        job = store.add_job("テスト記事", stage=business.first_stage.key)
        store.save()

        writer = next(a for a in business.agents if "draft_content" not in a.autonomy)
        tools = {
            t.name: t
            for t in build_tools(
                store=store, business=business, agent=writer, run_id="run_x", audit=audit
            )
        }
        assert "draft_content" in tools

        tools["draft_content"].call(
            {
                "job_id": job["id"],
                "body": "本文がここに入る。",
                "reason": "構成どおりに下書きした",
                "label": "draft",
            }
        )
        assert store.job(job["id"]).get("drafts") in (None, [])

        proposal = store.proposals("pending")[0]
        assert "原稿を保存" in approvals.summarize(proposal, business)

        approvals.approve(store, business, audit, proposal["id"])
        drafts = Store(store.path).job(job["id"])["drafts"]
        assert len(drafts) == 1 and drafts[0]["label"] == "draft"


def main() -> int:
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for test in tests:
        try:
            test()
        except Exception as exc:  # noqa: BLE001 - テストランナーなので全部拾う
            failed += 1
            print(f"FAIL  {test.__name__}: {type(exc).__name__}: {exc}")
        else:
            print(f"ok    {test.__name__}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
