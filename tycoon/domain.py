"""ビジネス定義。

このモジュールは「どんな business か」を一切決め打ちしない。
業種固有のこと（パイプラインの段階、案件が持つ項目、AI社員の役割）は
すべて business.yaml 側に置き、ここはその形だけを定義する。

つまり屋根工事会社でも、士業でも、受託開発でも、
差し替えるのは business.yaml 一枚だけで済む。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class Stage:
    """パイプラインの一段階。Lead → Estimate → Sold → ... のひとつ。"""

    key: str
    label: str
    description: str = ""

    @property
    def is_terminal(self) -> bool:
        return self.key in ("won", "lost", "paid", "closed")


@dataclass(frozen=True)
class FieldSpec:
    """案件 (job) が持つ項目の定義。"""

    key: str
    label: str
    type: str = "string"  # string | number | date | text
    required: bool = False

    def coerce(self, value: Any) -> Any:
        """YAML/CLI から来た値を宣言された型に寄せる。失敗したらそのまま返す。"""
        if value is None:
            return None
        try:
            if self.type == "number":
                return float(value)
            if self.type in ("string", "text", "date"):
                return str(value)
        except (TypeError, ValueError):
            return value
        return value


@dataclass(frozen=True)
class AgentSpec:
    """AI社員ひとり分の定義。

    autonomy は書き込み系ツールごとの権限:
        "propose" — 提案を作るだけ。人間が承認するまで実行されない（既定）
        "auto"    — 承認なしで即実行。監査ログには必ず残る
    """

    key: str
    name: str
    role: str
    instructions: str
    tools: list[str] = field(default_factory=list)
    autonomy: dict[str, str] = field(default_factory=dict)

    def autonomy_for(self, tool_name: str) -> str:
        return self.autonomy.get(tool_name, "propose")


@dataclass(frozen=True)
class Business:
    """事業まるごとの定義。"""

    name: str
    kind: str
    description: str
    currency: str
    stages: list[Stage]
    job_fields: list[FieldSpec]
    agents: list[AgentSpec]
    glossary: dict[str, str] = field(default_factory=dict)
    # 動作確認用のサンプル。実データを入れたら消してよい。
    sample_data: dict[str, Any] = field(default_factory=dict)

    # ---- 参照ヘルパ ----

    def stage(self, key: str) -> Stage | None:
        return next((s for s in self.stages if s.key == key), None)

    def agent(self, key: str) -> AgentSpec | None:
        return next((a for a in self.agents if a.key == key), None)

    def job_field(self, key: str) -> FieldSpec | None:
        return next((f for f in self.job_fields if f.key == key), None)

    @property
    def first_stage(self) -> Stage:
        return self.stages[0]

    @property
    def stage_keys(self) -> list[str]:
        return [s.key for s in self.stages]

    def describe_for_prompt(self) -> str:
        """system prompt に埋め込むための事業説明。"""
        lines = [
            f"# 事業: {self.name}",
            f"業種: {self.kind}",
            f"通貨: {self.currency}",
            "",
            self.description.strip(),
            "",
            "## パイプラインの段階（この順に進む）",
        ]
        for i, s in enumerate(self.stages, 1):
            desc = f" — {s.description}" if s.description else ""
            lines.append(f"{i}. `{s.key}` ({s.label}){desc}")

        lines += ["", "## 案件が持つ項目"]
        for f in self.job_fields:
            req = "必須" if f.required else "任意"
            lines.append(f"- `{f.key}` ({f.label}, {f.type}, {req})")

        if self.glossary:
            lines += ["", "## 用語"]
            for term, meaning in self.glossary.items():
                lines.append(f"- **{term}**: {meaning}")

        return "\n".join(lines)


class BusinessConfigError(ValueError):
    """business.yaml が壊れている / 足りない。"""


def load_business(path: str | Path) -> Business:
    """business.yaml を読み込んで検証する。"""
    path = Path(path)
    if not path.exists():
        raise BusinessConfigError(
            f"事業定義が見つかりません: {path}\n"
            f"tycoon/business.example.yaml をコピーして埋めてください。"
        )

    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}

    for key in ("name", "kind", "stages", "agents"):
        if not raw.get(key):
            raise BusinessConfigError(f"business.yaml に `{key}` がありません")

    stages = [
        Stage(
            key=s["key"],
            label=s.get("label", s["key"]),
            description=s.get("description", ""),
        )
        for s in raw["stages"]
    ]
    if len({s.key for s in stages}) != len(stages):
        raise BusinessConfigError("stages の key が重複しています")

    job_fields = [
        FieldSpec(
            key=f["key"],
            label=f.get("label", f["key"]),
            type=f.get("type", "string"),
            required=bool(f.get("required", False)),
        )
        for f in raw.get("job_fields", [])
    ]

    agents = []
    for a in raw["agents"]:
        if not a.get("key"):
            raise BusinessConfigError("agents の要素に `key` がありません")
        agents.append(
            AgentSpec(
                key=a["key"],
                name=a.get("name", a["key"]),
                role=a.get("role", ""),
                instructions=a.get("instructions", "").strip(),
                tools=list(a.get("tools", [])),
                autonomy=dict(a.get("autonomy", {})),
            )
        )

    return Business(
        name=raw["name"],
        kind=raw["kind"],
        description=raw.get("description", ""),
        currency=raw.get("currency", "JPY"),
        stages=stages,
        job_fields=job_fields,
        agents=agents,
        glossary=dict(raw.get("glossary", {})),
        sample_data=dict(raw.get("sample_data", {})),
    )
