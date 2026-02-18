"""エニアグラム9タイプ・ウィング・本能型サブタイプのデータモデル"""

from dataclasses import dataclass, field


@dataclass
class EnneagramType:
    number: int
    name_ja: str
    name_en: str
    center: str  # 本能(腹)・感情(心)・思考(頭)
    core_fear: str
    core_desire: str
    core_motivation: str
    stress_direction: int  # 統合・分裂の矢印
    growth_direction: int
    key_behaviors: list[str] = field(default_factory=list)
    decision_pattern: str = ""
    reaction_pattern: str = ""
    blind_spot: str = ""


@dataclass
class Wing:
    base_type: int
    wing_type: int
    name_ja: str
    description: str
    behavioral_shift: str


@dataclass
class InstinctualVariant:
    code: str  # sp, sx, so
    name_ja: str
    name_en: str
    focus: str
    description: str


@dataclass
class InstinctualStack:
    dominant: str
    secondary: str
    blind_spot: str
    description: str


@dataclass
class Tritype:
    gut_type: int  # 8,9,1
    heart_type: int  # 2,3,4
    head_type: int  # 5,6,7
    description: str = ""


@dataclass
class TypeProfile:
    """判定結果を格納する統合プロファイル"""
    core_type: int = 0
    wing: int = 0
    instinctual_stack: str = ""  # e.g. "sp/sx"
    tritype: tuple[int, int, int] = (0, 0, 0)
    health_level: int = 5  # 1-9 (1=最健全, 9=最不健全)
    type_scores: dict[int, float] = field(default_factory=dict)
    confidence: float = 0.0
