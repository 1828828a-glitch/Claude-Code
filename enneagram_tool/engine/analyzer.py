"""クロスシステム分析エンジン

エニアグラム、認知機能、Nardi脳タイプの判定結果を統合し、
包括的な分析レポートを生成する。
"""

from enneagram_tool.data.enneagram_data import (
    ENNEAGRAM_TYPES, WINGS, INSTINCTUAL_VARIANTS, INSTINCTUAL_STACKS,
    COUNTERTYPE_MAP,
)
from enneagram_tool.data.cognitive_data import (
    COGNITIVE_FUNCTIONS, BEEBE_ARCHETYPES, FUNCTION_STACKS,
)
from enneagram_tool.data.nardi_data import NEURAL_PATTERNS
from enneagram_tool.data.correlation_map import (
    ENNEAGRAM_MBTI_CORRELATION, ENNEAGRAM_FUNCTION_BEHAVIORS,
    CONFLICT_PATTERNS, FUNCTION_CONFLICT_PATTERNS,
)
from enneagram_tool.engine.questionnaire import QuestionnaireEngine


class IntegratedAnalyzer:
    """3システム統合分析エンジン"""

    def __init__(self, engine: QuestionnaireEngine) -> None:
        self.engine = engine

    def determine_enneagram_type(self) -> dict:
        """エニアグラムのコアタイプを判定"""
        top_types = self.engine.get_top_types(3)
        dominant_center = self.engine.get_dominant_center()

        # センターの情報からタイプ候補を絞り込む
        center_types = {
            "center_gut": [8, 9, 1],
            "center_heart": [2, 3, 4],
            "center_head": [5, 6, 7],
        }

        primary_center_types = center_types.get(dominant_center, [])

        # トップスコアのタイプがセンターと一致するか確認
        primary_type_num = int(top_types[0][0].replace("type_", ""))
        confidence = "高" if primary_type_num in primary_center_types else "要確認"

        # ウィング判定
        wings = self._determine_wings(primary_type_num)

        # 本能型スタック
        instinct_stack = self.engine.get_instinct_stack()

        # カウンタータイプ判定
        is_countertype = False
        countertype_note = ""
        if primary_type_num in COUNTERTYPE_MAP:
            counter_instinct = COUNTERTYPE_MAP[primary_type_num]
            dominant_instinct = instinct_stack.split("/")[0]
            if dominant_instinct == counter_instinct:
                is_countertype = True
                countertype_note = (
                    f"注意：タイプ{primary_type_num}の{INSTINCTUAL_VARIANTS[counter_instinct].name_ja}"
                    f"はカウンタータイプです。タイプの特徴が見えにくくなります。"
                )

        return {
            "core_type": primary_type_num,
            "type_info": ENNEAGRAM_TYPES[primary_type_num],
            "confidence": confidence,
            "top_3": [(int(t[0].replace("type_", "")), t[1]) for t in top_types],
            "center": dominant_center,
            "wings": wings,
            "instinct_stack": instinct_stack,
            "is_countertype": is_countertype,
            "countertype_note": countertype_note,
        }

    def _determine_wings(self, core_type: int) -> list[dict]:
        """ウィングの候補を返す"""
        adjacent = []
        left = core_type - 1 if core_type > 1 else 9
        right = core_type + 1 if core_type < 9 else 1

        for wing_num in [left, right]:
            key = f"{core_type}w{wing_num}"
            if key in WINGS:
                adjacent.append({
                    "wing_key": key,
                    "wing_info": WINGS[key],
                })
        return adjacent

    def determine_cognitive_type(self) -> dict:
        """認知機能タイプを判定"""
        top_functions = self.engine.get_top_functions(4)
        orientation = self.engine.get_orientation()

        # 主機能と補助機能の推定
        dominant_func = top_functions[0][0] if top_functions else ""
        auxiliary_func = top_functions[1][0] if len(top_functions) > 1 else ""

        # MBTIタイプの推定
        probable_mbti = self._estimate_mbti(dominant_func, auxiliary_func, orientation)

        # 機能スタックの取得
        stack = None
        if probable_mbti and probable_mbti in FUNCTION_STACKS:
            stack = FUNCTION_STACKS[probable_mbti]

        # Nardi脳パターンの取得
        nardi_pattern = None
        if probable_mbti and probable_mbti in NEURAL_PATTERNS:
            nardi_pattern = NEURAL_PATTERNS[probable_mbti]

        return {
            "top_functions": top_functions,
            "dominant": dominant_func,
            "auxiliary": auxiliary_func,
            "orientation": orientation,
            "probable_mbti": probable_mbti,
            "function_stack": stack,
            "nardi_pattern": nardi_pattern,
        }

    def _estimate_mbti(self, dominant: str, auxiliary: str,
                       orientation: str) -> str:
        """主機能と補助機能からMBTIを推定"""
        # 機能の組み合わせからMBTIを逆引き
        for mbti_code, stack in FUNCTION_STACKS.items():
            if stack.dominant == dominant and stack.auxiliary == auxiliary:
                return mbti_code

        # 完全一致しない場合、主機能だけで候補を絞る
        candidates = []
        for mbti_code, stack in FUNCTION_STACKS.items():
            if stack.dominant == dominant:
                candidates.append(mbti_code)

        if candidates:
            # 外向/内向の傾向で絞り込む
            for c in candidates:
                if orientation == "E" and c[0] == "E":
                    return c
                if orientation == "I" and c[0] == "I":
                    return c
            return candidates[0]

        return ""

    def generate_cross_analysis(self, enneagram_result: dict,
                                cognitive_result: dict) -> dict:
        """エニアグラムと認知機能のクロス分析"""
        core_type = enneagram_result["core_type"]
        probable_mbti = cognitive_result["probable_mbti"]
        dominant_func = cognitive_result["dominant"]

        # エニアグラム×MBTI相関チェック
        correlation_info = []
        if core_type in ENNEAGRAM_MBTI_CORRELATION:
            for mbti, strength, reason in ENNEAGRAM_MBTI_CORRELATION[core_type]:
                if mbti == probable_mbti:
                    correlation_info.append({
                        "mbti": mbti,
                        "strength": strength,
                        "reason": reason,
                        "match": True,
                    })
                    break
            else:
                # 推定MBTIが相関リストにない場合
                correlation_info.append({
                    "mbti": probable_mbti,
                    "strength": 0.0,
                    "reason": f"タイプ{core_type}と{probable_mbti}の組み合わせは稀です。"
                              f"タイプ判定の再確認を推奨します。",
                    "match": False,
                })

        # エニアグラム×認知機能の行動パターン
        behavior_patterns = {}
        if core_type in ENNEAGRAM_FUNCTION_BEHAVIORS:
            type_behaviors = ENNEAGRAM_FUNCTION_BEHAVIORS[core_type]
            if dominant_func in type_behaviors:
                behavior_patterns["dominant_behavior"] = type_behaviors[dominant_func]

        return {
            "correlation": correlation_info,
            "behavior_patterns": behavior_patterns,
            "integration_notes": self._generate_integration_notes(
                core_type, probable_mbti, dominant_func,
            ),
        }

    def _generate_integration_notes(self, core_type: int, mbti: str,
                                     dominant_func: str) -> list[str]:
        """統合分析ノートを生成"""
        notes = []

        type_info = ENNEAGRAM_TYPES.get(core_type)
        func_info = COGNITIVE_FUNCTIONS.get(dominant_func)

        if type_info and func_info:
            # 意思決定パターンの統合分析
            notes.append(
                f"意思決定パターン：エニアグラム{core_type}の"
                f"「{type_info.decision_pattern[:30]}...」と、"
                f"{func_info.name_ja}({dominant_func})の"
                f"「{func_info.description[:30]}...」が統合されています。"
            )

            # ストレス反応の統合分析
            notes.append(
                f"ストレス反応：タイプ{core_type}は{type_info.stress_direction}方向に分裂。"
                f"{dominant_func}がストレス下で影の機能に切り替わる可能性。"
            )

            # ブラインドスポットの統合分析
            notes.append(
                f"盲点：「{type_info.blind_spot[:40]}...」"
            )

        if mbti and mbti in NEURAL_PATTERNS:
            pattern = NEURAL_PATTERNS[mbti]
            notes.append(
                f"脳活動パターン：{pattern.pattern_name_ja} - "
                f"{pattern.description[:60]}..."
            )

        return notes

    def analyze_compatibility(self, type_a: int, type_b: int) -> dict:
        """2つのタイプ間の相性・衝突分析"""
        pair = (min(type_a, type_b), max(type_a, type_b))
        reverse_pair = (max(type_a, type_b), min(type_a, type_b))

        conflict = CONFLICT_PATTERNS.get(pair) or CONFLICT_PATTERNS.get(reverse_pair)

        type_a_info = ENNEAGRAM_TYPES.get(type_a)
        type_b_info = ENNEAGRAM_TYPES.get(type_b)

        result: dict = {
            "type_a": type_a,
            "type_b": type_b,
            "type_a_info": type_a_info,
            "type_b_info": type_b_info,
        }

        if conflict:
            result["conflict_pattern"] = conflict
        else:
            result["conflict_pattern"] = {
                "core_clash": self._generate_generic_clash(type_a, type_b),
                "resolution": "両者の中心的な恐れと欲求を理解し、互いの盲点を補い合うことが鍵。",
            }

        # センター間の相性
        if type_a_info and type_b_info:
            if type_a_info.center == type_b_info.center:
                result["center_note"] = (
                    f"同じ{type_a_info.center}センター。"
                    f"似た反応パターンを持つため、共感しやすいが、同じ盲点を共有するリスク。"
                )
            else:
                result["center_note"] = (
                    f"{type_a_info.center} × {type_b_info.center}。"
                    f"異なるセンターのため、互いに見えない領域を補完できる可能性。"
                )

        return result

    def _generate_generic_clash(self, type_a: int, type_b: int) -> str:
        """定義されていないペアの汎用衝突パターンを生成"""
        a_info = ENNEAGRAM_TYPES.get(type_a)
        b_info = ENNEAGRAM_TYPES.get(type_b)
        if a_info and b_info:
            return (
                f"タイプ{type_a}の核心的恐れ「{a_info.core_fear[:20]}」と"
                f"タイプ{type_b}の核心的恐れ「{b_info.core_fear[:20]}」が"
                f"互いの安全感を脅かす可能性。"
            )
        return ""

    def generate_full_report(self) -> dict:
        """包括的な統合レポートを生成"""
        enneagram = self.determine_enneagram_type()
        cognitive = self.determine_cognitive_type()
        cross = self.generate_cross_analysis(enneagram, cognitive)

        return {
            "enneagram": enneagram,
            "cognitive": cognitive,
            "cross_analysis": cross,
            "summary": self._generate_summary(enneagram, cognitive, cross),
        }

    def _generate_summary(self, enneagram: dict, cognitive: dict,
                          cross: dict) -> str:
        """レポートのサマリーを生成"""
        core = enneagram["core_type"]
        type_info = enneagram["type_info"]
        wings = enneagram["wings"]
        instinct = enneagram["instinct_stack"]
        mbti = cognitive.get("probable_mbti", "不明")
        dominant = cognitive.get("dominant", "不明")

        wing_str = ""
        if wings:
            wing_str = f"（ウィング候補：{', '.join(w['wing_key'] for w in wings)}）"

        counter_note = ""
        if enneagram.get("is_countertype"):
            counter_note = f"\n  ※ {enneagram['countertype_note']}"

        return (
            f"━━━ 統合タイプ判定結果サマリー ━━━\n"
            f"\n"
            f"【エニアグラム】\n"
            f"  コアタイプ：{core} - {type_info.name_ja}（{type_info.name_en}）{wing_str}\n"
            f"  センター：{type_info.center}\n"
            f"  本能型スタック：{instinct}\n"
            f"  判定信頼度：{enneagram['confidence']}{counter_note}\n"
            f"\n"
            f"【認知機能（Beebe）】\n"
            f"  推定タイプ：{mbti}\n"
            f"  主機能：{dominant}（{COGNITIVE_FUNCTIONS.get(dominant, type('', (), {'name_ja': '不明'})()).name_ja}）\n"
            f"\n"
            f"【Nardi脳タイプ】\n"
            f"  {cognitive.get('nardi_pattern', type('', (), {'pattern_name_ja': '未判定'})()).pattern_name_ja}\n"
            f"\n"
            f"【核心的パターン】\n"
            f"  恐れ：{type_info.core_fear}\n"
            f"  欲求：{type_info.core_desire}\n"
            f"  意思決定：{type_info.decision_pattern}\n"
            f"  反応パターン：{type_info.reaction_pattern}\n"
            f"  盲点：{type_info.blind_spot}\n"
        )
