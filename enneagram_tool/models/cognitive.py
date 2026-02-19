"""ユング心理学 × John Beebeモデル：8つの心理機能データモデル"""

from dataclasses import dataclass, field


@dataclass
class CognitiveFunction:
    """8つの心理機能"""
    code: str  # Se, Si, Ne, Ni, Te, Ti, Fe, Fi
    name_ja: str
    name_en: str
    axis: str  # 知覚(Perceiving) or 判断(Judging)
    orientation: str  # 外向(Extraverted) or 内向(Introverted)
    description: str
    observable_behaviors: list[str] = field(default_factory=list)
    question_patterns: list[str] = field(default_factory=list)


@dataclass
class BeebeArchetype:
    """Beebeモデルの8つのアーキタイプ（元型）位置"""
    position: int  # 1-8
    name_en: str
    name_ja: str
    role: str
    consciousness_level: str  # 意識的 or 無意識的
    description: str
    behavioral_signature: str


@dataclass
class FunctionStack:
    """個人の機能スタック（16タイプ対応）"""
    mbti_code: str  # e.g. "INTJ"
    functions: list[tuple[str, str]]  # [(function_code, archetype_position), ...]
    dominant: str
    auxiliary: str
    tertiary: str
    inferior: str
    opposing: str
    critical_parent: str
    trickster: str
    demon: str


@dataclass
class CognitiveProfile:
    """認知機能の判定結果"""
    dominant_function: str = ""
    auxiliary_function: str = ""
    probable_mbti: str = ""
    function_scores: dict[str, float] = field(default_factory=dict)
    stack_confidence: float = 0.0
