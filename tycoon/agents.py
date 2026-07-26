"""AI社員を1人動かす。

モックの AI Team パネル（Riley / Devi / Wilem がそれぞれ実タスクを走らせ、
横に "View audit" が並んでいる）に対応する部分。
"""

from __future__ import annotations

from dataclasses import dataclass

import anthropic

from .audit import AuditLog
from .domain import AgentSpec, Business
from .store import Store
from .tools import build_tools

MODEL = "claude-opus-5"
MAX_TOKENS = 16000

# 1回の実行でモデルとやり取りする上限。暴走したループを止めるための保険。
MAX_TURNS = 24


SHARED_RULES = """
あなたはこの事業で実際に働いているスタッフです。デモでも練習でもありません。
扱うのは本物の顧客と本物の案件です。

## 仕事の進め方

まず読み取り系のツールで事実を確かめてから動くこと。記憶や推測で書かない。
案件の状態、過去のやり取り、既存のタスクを見てから判断する。

## 承認について

書き込み系のツール（顧客への連絡、段階の変更、項目の更新、タスク作成）は、
既定では**提案として積まれるだけで実行されない**。人間が承認して初めて実世界が動く。

- ツールが「承認待ちに積みました」と返したら、それはまだ起きていない。
  「送信しました」と報告してはいけない。「送信を提案しました」と書くこと。
- 承認する人間はあなたの `reason` だけを読んで判断する。
  何を根拠にそう判断したかを具体的に書く。「フォローが必要だと思われるため」ではなく
  「5/13 の見積送付から13日間返信がなく、当初の工事希望日が来週のため」と書く。
- 同じ提案を二重に積まない。積んだら次の作業に移る。

## 報告の仕方

最後に、人間が読む短い要約を書く。何を確認し、何を提案し、何が承認待ちかを述べる。
やっていないことをやったように書かない。判断に迷った点があれば正直に挙げる。
""".strip()


@dataclass
class RunResult:
    run_id: str
    agent: str
    summary: str
    proposals: list[dict]
    usage: dict
    turns: int


def build_system_prompt(business: Business, agent: AgentSpec) -> str:
    parts = [
        f"あなたは「{business.name}」の {agent.role} を担当する {agent.name} です。",
        "",
        business.describe_for_prompt(),
        "",
        SHARED_RULES,
    ]
    if agent.instructions:
        parts += ["", f"## {agent.name} への個別指示", agent.instructions]

    auto_tools = [t for t, mode in agent.autonomy.items() if mode == "auto"]
    if auto_tools:
        parts += [
            "",
            "## あなたの自律実行権限",
            "次のツールは承認なしで即座に実行される。慎重に使うこと: "
            + ", ".join(f"`{t}`" for t in auto_tools),
        ]
    return "\n".join(parts)


def run_agent(
    *,
    client: anthropic.Anthropic,
    store: Store,
    business: Business,
    agent: AgentSpec,
    task: str,
    audit: AuditLog,
    effort: str = "high",
) -> RunResult:
    """AI社員に1件の仕事を任せ、終わるまで回す。"""
    run = store.add_run(agent=agent.key, prompt=task)
    run_id = run["id"]
    store.save()

    audit.record("run_started", run_id=run_id, agent=agent.key, task=task, model=MODEL)

    tools = build_tools(
        store=store, business=business, agent=agent, run_id=run_id, audit=audit
    )
    system = build_system_prompt(business, agent)

    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        output_config={"effort": effort},
        system=system,
        tools=tools,
        messages=[{"role": "user", "content": task}],
    )

    usage = {"input_tokens": 0, "output_tokens": 0, "cache_read_input_tokens": 0}
    final_text = ""
    turns = 0

    for message in runner:
        turns += 1
        for key in usage:
            usage[key] += getattr(message.usage, key, 0) or 0

        for block in message.content:
            if block.type == "text" and block.text.strip():
                final_text = block.text.strip()
            elif block.type == "tool_use":
                audit.record(
                    "tool_called",
                    run_id=run_id,
                    agent=agent.key,
                    tool=block.name,
                    input=block.input,
                )

        if turns >= MAX_TURNS:
            audit.record("run_truncated", run_id=run_id, agent=agent.key, turns=turns)
            final_text = (
                (final_text + "\n\n") if final_text else ""
            ) + f"[打ち切り] {MAX_TURNS} ターンの上限に達したため実行を止めました。"
            break

    proposals = [p for p in store.proposals("pending") if p["run_id"] == run_id]

    store.finish_run(run, summary=final_text, usage=usage)
    store.save()
    audit.record(
        "run_finished",
        run_id=run_id,
        agent=agent.key,
        summary=final_text,
        usage=usage,
        proposals=[p["id"] for p in proposals],
        turns=turns,
    )

    return RunResult(
        run_id=run_id,
        agent=agent.key,
        summary=final_text,
        proposals=proposals,
        usage=usage,
        turns=turns,
    )
