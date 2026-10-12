"""出題・講評・学習履歴のデータモデル"""

from dataclasses import asdict, dataclass, field
from datetime import datetime
import uuid


@dataclass
class Example:
    """成立例（唯一解ではなく、成立条件を学ぶための参考）"""
    text: str
    pattern: str  # 12の基本型または20技法の名称
    note: str = ""


@dataclass
class Problem:
    id: str  # F01, O01, P01, D01, C01, R01, T01 / 生成問題は G- で始まる
    mode: str  # M01〜M12
    level: int  # 1〜5
    prompt: str  # 画面に出すフリ・オチ・テーマ・弱いネタ
    expectation: str  # 出題側の設計意図（フリが作る期待）
    axis: str  # 対照軸・尺度
    pattern: str  # 想定している型
    examples: list[Example] = field(default_factory=list)
    focus: str = ""  # 解説の焦点
    scoring_hint: str = ""  # AI採点用のヒント（利用者には結果画面でのみ表示）
    condition: str = ""  # M04・M05の型指定（M04は「／」区切りで3つ）
    weak_reason: str = ""  # M06：元ネタが弱い理由
    scene: str = "友人との雑談"

    def condition_types(self) -> list[str]:
        """M04 の条件「大小逆転／解釈転換／自己矛盾」を、型の名前の並びにする"""
        return [t.strip() for t in self.condition.split("／") if t.strip()]

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Problem":
        data = dict(data)
        data["examples"] = [Example(**e) for e in data.get("examples", [])]
        return cls(**data)


@dataclass
class Evaluation:
    """講評結果。AI講評と自己採点の両方をこの形で保持する"""
    source: str  # "ai" | "self"
    rubric: str  # "neta" | "prediction"
    scores: dict[str, int]
    reasons: dict[str, str] = field(default_factory=dict)
    detected_expectation: str = ""
    deviation: str = ""  # 回答が期待をどう裏切ったか（裏切っていないか）
    deviation_axis: str = ""
    relevance: str = "related"  # related | weak | unrelated
    safety_status: str = "ok"  # ok | check_context | needs_revision
    safety_note: str = ""
    good_point: str = ""
    improvements: list[str] = field(default_factory=list)  # 最大2つ
    one_revision: str = ""
    alternatives: list[Example] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    confidence: str = "medium"  # high | medium | low | self
    clarifying_question: str = ""

    @property
    def total(self) -> int:
        return sum(self.scores.values())

    @property
    def max_total(self) -> int:
        return 2 * len(self.scores)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Evaluation":
        data = dict(data)
        data["alternatives"] = [Example(**a) for a in data.get("alternatives", [])]
        return cls(**data)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


@dataclass
class Attempt:
    """1回の回答と講評。再挑戦は retry_of で元の回答とつなぐ

    M04 のように複数案を出すモードでは、answer に各案を出題の順に改行でつないで入れる。
    """
    problem_id: str
    mode: str
    answer: str
    evaluation: Evaluation
    intent_note: str = ""  # 狙った期待とズレの自己記述
    diagnosis: str = ""  # M06：弱い理由の診断
    self_scores: dict[str, int] | None = None  # AI講評と比べるための自己評価
    favorite: bool = False
    performance_memo: str = ""  # 実演メモ（実際に使ったときの反応）
    retry_of: str | None = None
    problem_snapshot: dict | None = None  # 生成問題は本体を一緒に保存する
    elapsed_sec: int | None = None  # 制作時間（問題を出してから回答を送るまでの秒数）
    satisfaction: int | None = None  # 自己満足度（1〜5、任意）
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    created_at: str = field(default_factory=_now)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Attempt":
        data = dict(data)
        data["evaluation"] = Evaluation.from_dict(data["evaluation"])
        return cls(**data)
