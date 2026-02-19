"""Dario Nardi 脳タイプモデル：EEG脳活動パターンのデータモデル"""

from dataclasses import dataclass, field


@dataclass
class BrainRegion:
    """脳領域とその機能"""
    code: str
    name_ja: str
    name_en: str
    location: str
    primary_function: str


@dataclass
class NeuralPattern:
    """タイプ別の脳活動パターン"""
    mbti_type: str
    pattern_name_ja: str
    pattern_name_en: str
    description: str
    active_regions: list[str] = field(default_factory=list)
    signature_behavior: str = ""
    problem_solving_style: str = ""
    stress_response: str = ""


@dataclass
class NardiProfile:
    """Nardi脳タイプの判定結果"""
    brain_pattern: str = ""
    problem_solving_style: str = ""
    stress_pattern: str = ""
    flow_state_trigger: str = ""
    scores: dict[str, float] = field(default_factory=dict)
