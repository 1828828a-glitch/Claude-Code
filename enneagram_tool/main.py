"""エニアグラム統合タイプ判定ツール - メインCLIエントリーポイント

使い方:
  python -m enneagram_tool             # フル判定モード
  python -m enneagram_tool --quick     # クイック判定モード
  python -m enneagram_tool --lookup 5  # タイプ情報参照
  python -m enneagram_tool --compare 4 8  # 2タイプの相性分析
  python -m enneagram_tool --functions # 認知機能一覧
  python -m enneagram_tool --explore   # 全データ探索モード
"""

import argparse
import sys

from enneagram_tool.engine.questionnaire import (
    QuestionnaireEngine,
    ENNEAGRAM_QUESTIONS,
    COGNITIVE_QUESTIONS,
    NARDI_QUESTIONS,
    CROSS_SYSTEM_QUESTIONS,
)
from enneagram_tool.engine.analyzer import IntegratedAnalyzer
from enneagram_tool.data.enneagram_data import (
    ENNEAGRAM_TYPES, WINGS, INSTINCTUAL_VARIANTS, INSTINCTUAL_STACKS,
    COUNTERTYPE_MAP,
)
from enneagram_tool.data.cognitive_data import (
    COGNITIVE_FUNCTIONS, BEEBE_ARCHETYPES, FUNCTION_STACKS,
)
from enneagram_tool.data.nardi_data import NEURAL_PATTERNS
from enneagram_tool.data.correlation_map import (
    ENNEAGRAM_MBTI_CORRELATION, CONFLICT_PATTERNS,
    FUNCTION_CONFLICT_PATTERNS,
)
from enneagram_tool.utils.display import (
    clear_screen, print_header, print_subheader, print_box,
    print_progress, print_score_bar, print_type_card,
    print_separator, get_input, print_banner,
)


def run_full_assessment() -> None:
    """フル判定モード：全質問を通してタイプを判定"""
    engine = QuestionnaireEngine()

    print_banner()
    print("  このツールは3つのシステムを統合してあなたのタイプを判定します：")
    print("  1. エニアグラム（9タイプ・ウィング・本能型サブタイプ）")
    print("  2. ユング心理学 × John Beebeモデル（8つの認知機能）")
    print("  3. Dario Nardi 脳タイプ（EEG脳活動パターン）")
    print()
    print("  各質問に対して、最も当てはまる選択肢の記号（A, B, C...）を入力してください。")
    print("  直感的に、考えすぎずに答えることをお勧めします。")
    print()
    input("  準備ができたらEnterキーを押してください...")

    total_questions = (
        len(ENNEAGRAM_QUESTIONS) + len(COGNITIVE_QUESTIONS)
        + len(NARDI_QUESTIONS) + len(CROSS_SYSTEM_QUESTIONS)
    )
    current_q = 0

    # ━━━ Phase 1: エニアグラム判定 ━━━
    print_header("Phase 1: エニアグラム判定", "=")
    print("  まずセンター（腹・心・頭）を判定し、その後タイプを絞り込みます。\n")

    # センター判定
    print_subheader("センター判定")
    for q in ENNEAGRAM_QUESTIONS:
        if q.subcategory != "center":
            continue
        current_q += 1
        print_progress(current_q, total_questions, "エニアグラム")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B", "C"])
        engine.score_center_question(q.id, answer)

    dominant_center = engine.get_dominant_center()
    center_names = {
        "center_gut": "本能（腹）センター → タイプ 8, 9, 1",
        "center_heart": "感情（心）センター → タイプ 2, 3, 4",
        "center_head": "思考（頭）センター → タイプ 5, 6, 7",
    }
    print(f"\n  >> 優勢なセンター: {center_names.get(dominant_center, '不明')}")

    # センター内詳細判定
    center_subcategory_map = {
        "center_gut": "gut_detail",
        "center_heart": "heart_detail",
        "center_head": "head_detail",
    }
    detail_subcategory = center_subcategory_map.get(dominant_center, "")
    type_maps = {
        "gut_detail": {"A": "type_1", "B": "type_8", "C": "type_9"},
        "heart_detail": {"A": "type_2", "B": "type_3", "C": "type_4"},
        "head_detail": {"A": "type_5", "B": "type_6", "C": "type_7"},
    }

    if detail_subcategory:
        print_subheader("タイプ詳細判定")
        for q in ENNEAGRAM_QUESTIONS:
            if q.subcategory != detail_subcategory:
                continue
            current_q += 1
            print_progress(current_q, total_questions, "エニアグラム")
            print(f"\n  Q. {q.text}")
            answer = get_input("選択してください:", ["A", "B", "C"])
            engine.score_type_detail(q.id, answer, type_maps[detail_subcategory])

    # ストレス方向チェック
    print_subheader("ストレス反応パターン")
    for q in ENNEAGRAM_QUESTIONS:
        if q.subcategory != "stress_direction":
            continue
        current_q += 1
        print_progress(current_q, total_questions, "エニアグラム")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:",
                          ["A", "B", "C", "D", "E", "F", "G", "H", "I"])
        stress_type_map = {
            "A": "type_1", "B": "type_2", "C": "type_3",
            "D": "type_4", "E": "type_5", "F": "type_6",
            "G": "type_7", "H": "type_8", "I": "type_9",
        }
        if answer in stress_type_map:
            engine.enneagram_scores[stress_type_map[answer]] = (
                engine.enneagram_scores.get(stress_type_map[answer], 0.0) + 1.5
            )
        engine.record_answer(q.id, answer)

    # 本能型サブタイプ判定
    print_subheader("本能型サブタイプ判定")
    for q in ENNEAGRAM_QUESTIONS:
        if q.subcategory != "instinctual":
            continue
        current_q += 1
        print_progress(current_q, total_questions, "エニアグラム")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B", "C"])
        engine.score_instinct_question(q.id, answer)

    # ━━━ Phase 2: 認知機能判定 ━━━
    print_header("Phase 2: 認知機能判定（Beebe モデル）", "=")
    print("  ユング心理学の8つの認知機能を判定します。\n")

    # 知覚軸
    print_subheader("知覚機能（情報の取り入れ方）")
    for q in COGNITIVE_QUESTIONS:
        if q.subcategory != "perceiving":
            continue
        current_q += 1
        print_progress(current_q, total_questions, "認知機能")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B", "C", "D"])
        engine.score_cognitive_question(
            q.id, answer,
            {"A": "Se", "B": "Si", "C": "Ne", "D": "Ni"},
        )

    # 判断軸
    print_subheader("判断機能（意思決定の仕方）")
    for q in COGNITIVE_QUESTIONS:
        if q.subcategory != "judging":
            continue
        current_q += 1
        print_progress(current_q, total_questions, "認知機能")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B", "C", "D"])
        engine.score_cognitive_question(
            q.id, answer,
            {"A": "Te", "B": "Ti", "C": "Fe", "D": "Fi"},
        )

    # 外向/内向
    print_subheader("外向・内向の傾向")
    for q in COGNITIVE_QUESTIONS:
        if q.subcategory != "orientation":
            continue
        current_q += 1
        print_progress(current_q, total_questions, "認知機能")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B"])
        engine.score_orientation_question(q.id, answer)

    # 影の機能
    print_subheader("影の機能チェック")
    for q in COGNITIVE_QUESTIONS:
        if q.subcategory != "shadow":
            continue
        current_q += 1
        print_progress(current_q, total_questions, "認知機能")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B", "C", "D", "E"])
        engine.record_answer(q.id, answer)

    # ━━━ Phase 3: Nardi脳タイプ判定 ━━━
    print_header("Phase 3: Nardi脳タイプ判定", "=")
    print("  脳の活動パターンに関する質問です。\n")

    for q in NARDI_QUESTIONS:
        current_q += 1
        print_progress(current_q, total_questions, "Nardi脳タイプ")
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B", "C", "D", "E", "F"])
        engine.record_answer(q.id, answer)

    # ━━━ Phase 4: クロスシステム検証 ━━━
    print_header("Phase 4: クロスシステム検証", "=")
    print("  3つのシステムを横断する検証質問です。\n")

    for q in CROSS_SYSTEM_QUESTIONS:
        current_q += 1
        print_progress(current_q, total_questions, "クロス検証")
        print(f"\n  Q. {q.text}")
        valid = ["A", "B", "C", "D", "E", "F"][:len(q.text.split("\n")) - 1]
        if not valid:
            valid = ["A", "B", "C"]
        answer = get_input("選択してください:", valid)
        engine.record_answer(q.id, answer)

    # ━━━ 結果表示 ━━━
    print_header("判定結果", "=")
    analyzer = IntegratedAnalyzer(engine)
    report = analyzer.generate_full_report()

    # サマリー表示
    print(report["summary"])

    # スコア詳細
    print_subheader("エニアグラム スコア詳細")
    max_score = max(engine.enneagram_scores.values()) if engine.enneagram_scores.values() else 1.0
    for i in range(1, 10):
        score = engine.enneagram_scores.get(f"type_{i}", 0.0)
        label = f"タイプ{i}"
        print_score_bar(label, score, max(max_score, 1.0))

    print_subheader("認知機能 スコア詳細")
    max_func_score = max(engine.cognitive_scores.values()) if engine.cognitive_scores.values() else 1.0
    for func_code in ["Se", "Si", "Ne", "Ni", "Te", "Ti", "Fe", "Fi"]:
        score = engine.cognitive_scores.get(func_code, 0.0)
        func_name = COGNITIVE_FUNCTIONS[func_code].name_ja
        print_score_bar(f"{func_code}({func_name[:4]})", score, max(max_func_score, 1.0))

    print_subheader("本能型サブタイプ スコア")
    max_inst_score = max(engine.instinct_scores.values()) if engine.instinct_scores.values() else 1.0
    for inst_code, inst_info in INSTINCTUAL_VARIANTS.items():
        score = engine.instinct_scores.get(inst_code, 0.0)
        print_score_bar(inst_info.name_ja[:6], score, max(max_inst_score, 1.0))

    # Nardi脳パターン
    cognitive_result = report["cognitive"]
    if cognitive_result.get("nardi_pattern"):
        pattern = cognitive_result["nardi_pattern"]
        print_subheader("Nardi脳活動パターン")
        print(f"  パターン名: {pattern.pattern_name_ja}")
        print(f"  説明: {pattern.description}")
        print(f"  問題解決スタイル: {pattern.problem_solving_style}")
        print(f"  ストレス反応: {pattern.stress_response}")

    # クロス分析
    cross = report["cross_analysis"]
    if cross.get("correlation"):
        print_subheader("エニアグラム × MBTI 相関分析")
        for corr in cross["correlation"]:
            match_str = "一致" if corr.get("match") else "稀な組み合わせ"
            print(f"  {corr['mbti']}: 相関強度 {corr['strength']:.1f} ({match_str})")
            print(f"  理由: {corr['reason']}")

    if cross.get("integration_notes"):
        print_subheader("統合分析ノート")
        for note in cross["integration_notes"]:
            print(f"  - {note}")

    # ウィング候補
    enneagram_result = report["enneagram"]
    if enneagram_result.get("wings"):
        print_subheader("ウィング候補")
        for w in enneagram_result["wings"]:
            info = w["wing_info"]
            print(f"  {w['wing_key']}: {info.name_ja}")
            print(f"    {info.description}")
            print(f"    行動変化: {info.behavioral_shift}")

    print_separator("=")
    print("\n  判定完了！")
    print("  ※ この結果は自己理解の参考としてご活用ください。")
    print("  ※ 正確なタイプ判定には、専門家との対話や長期的な自己観察が推奨されます。\n")


def run_quick_assessment() -> None:
    """クイック判定モード：最小限の質問でタイプを推定"""
    engine = QuestionnaireEngine()

    print_banner()
    print("  【クイックモード】最小限の質問で大まかなタイプを推定します。\n")

    # センター判定（3問）
    print_subheader("センター判定")
    center_questions = [q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "center"]
    for q in center_questions:
        print(f"\n  Q. {q.text}")
        answer = get_input("選択してください:", ["A", "B", "C"])
        engine.score_center_question(q.id, answer)

    dominant_center = engine.get_dominant_center()
    center_subcategory_map = {
        "center_gut": "gut_detail",
        "center_heart": "heart_detail",
        "center_head": "head_detail",
    }
    type_maps = {
        "gut_detail": {"A": "type_1", "B": "type_8", "C": "type_9"},
        "heart_detail": {"A": "type_2", "B": "type_3", "C": "type_4"},
        "head_detail": {"A": "type_5", "B": "type_6", "C": "type_7"},
    }

    # タイプ絞り込み（2問）
    detail_sub = center_subcategory_map.get(dominant_center, "")
    if detail_sub:
        print_subheader("タイプ絞り込み")
        for q in ENNEAGRAM_QUESTIONS:
            if q.subcategory != detail_sub:
                continue
            print(f"\n  Q. {q.text}")
            answer = get_input("選択してください:", ["A", "B", "C"])
            engine.score_type_detail(q.id, answer, type_maps[detail_sub])

    # 認知機能（2問）
    print_subheader("認知機能クイックチェック")
    perceive_q = next(
        (q for q in COGNITIVE_QUESTIONS if q.id == "perceive_1"), None,
    )
    if perceive_q:
        print(f"\n  Q. {perceive_q.text}")
        answer = get_input("選択してください:", ["A", "B", "C", "D"])
        engine.score_cognitive_question(
            perceive_q.id, answer,
            {"A": "Se", "B": "Si", "C": "Ne", "D": "Ni"},
        )

    judge_q = next(
        (q for q in COGNITIVE_QUESTIONS if q.id == "judge_1"), None,
    )
    if judge_q:
        print(f"\n  Q. {judge_q.text}")
        answer = get_input("選択してください:", ["A", "B", "C", "D"])
        engine.score_cognitive_question(
            judge_q.id, answer,
            {"A": "Te", "B": "Ti", "C": "Fe", "D": "Fi"},
        )

    # 結果
    print_header("クイック判定結果", "=")
    analyzer = IntegratedAnalyzer(engine)

    top_types = engine.get_top_types(3)
    print("\n  エニアグラム候補タイプ（上位3つ）:")
    for type_key, score in top_types:
        type_num = int(type_key.replace("type_", ""))
        if type_num in ENNEAGRAM_TYPES:
            info = ENNEAGRAM_TYPES[type_num]
            highlight = (type_key == top_types[0][0])
            print_type_card(type_num, info, highlight=highlight)
            print()

    top_funcs = engine.get_top_functions(2)
    print("  認知機能（上位2つ）:")
    for func_code, score in top_funcs:
        func = COGNITIVE_FUNCTIONS[func_code]
        print(f"    {func_code}: {func.name_ja} - {func.description[:50]}...")

    print()
    print("  ※ より正確な判定には --full モードをお勧めします。\n")


def lookup_type(type_num: int) -> None:
    """指定タイプの詳細情報を表示"""
    if type_num not in ENNEAGRAM_TYPES:
        print(f"  エラー: タイプ{type_num}は存在しません（1-9を指定してください）")
        return

    info = ENNEAGRAM_TYPES[type_num]

    print_header(f"タイプ{type_num}: {info.name_ja} ({info.name_en})")
    print(f"\n  センター: {info.center}")
    print(f"  核心的恐れ: {info.core_fear}")
    print(f"  核心的欲求: {info.core_desire}")
    print(f"  動機: {info.core_motivation}")
    print(f"\n  分裂方向: → タイプ{info.stress_direction}")
    print(f"  統合方向: → タイプ{info.growth_direction}")

    print_subheader("主な行動パターン")
    for behavior in info.key_behaviors:
        print(f"    - {behavior}")

    print_subheader("意思決定パターン")
    print(f"    {info.decision_pattern}")

    print_subheader("反応パターン")
    print(f"    {info.reaction_pattern}")

    print_subheader("盲点（ブラインドスポット）")
    print(f"    {info.blind_spot}")

    # ウィング
    print_subheader("ウィング")
    for key, wing in WINGS.items():
        if wing.base_type == type_num:
            print(f"    {key}: {wing.name_ja}")
            print(f"      {wing.description}")
            print(f"      行動変化: {wing.behavioral_shift}")
            print()

    # カウンタータイプ
    if type_num in COUNTERTYPE_MAP:
        ct = COUNTERTYPE_MAP[type_num]
        ct_info = INSTINCTUAL_VARIANTS[ct]
        print_subheader("カウンタータイプ")
        print(f"    {ct_info.name_ja}({ct}) - タイプの特徴が見えにくくなる本能型")

    # よくあるMBTI相関
    if type_num in ENNEAGRAM_MBTI_CORRELATION:
        print_subheader("よくあるMBTI相関")
        for mbti, strength, reason in ENNEAGRAM_MBTI_CORRELATION[type_num]:
            bar = "█" * int(strength * 10) + "░" * (10 - int(strength * 10))
            print(f"    {mbti} [{bar}] {strength:.1f}  {reason}")

    print()


def compare_types(type_a: int, type_b: int) -> None:
    """2タイプの相性・衝突分析を表示"""
    if type_a not in ENNEAGRAM_TYPES or type_b not in ENNEAGRAM_TYPES:
        print("  エラー: 有効なタイプ番号（1-9）を指定してください")
        return

    engine = QuestionnaireEngine()
    analyzer = IntegratedAnalyzer(engine)
    result = analyzer.analyze_compatibility(type_a, type_b)

    info_a = ENNEAGRAM_TYPES[type_a]
    info_b = ENNEAGRAM_TYPES[type_b]

    print_header(f"タイプ{type_a} ({info_a.name_ja}) × タイプ{type_b} ({info_b.name_ja}) 相性分析")

    # 基本比較
    print_subheader("基本比較")
    print(f"  タイプ{type_a}: {info_a.center} | 恐れ: {info_a.core_fear}")
    print(f"  タイプ{type_b}: {info_b.center} | 恐れ: {info_b.core_fear}")

    # センター相性
    if result.get("center_note"):
        print_subheader("センター間の相性")
        print(f"  {result['center_note']}")

    # 衝突パターン
    conflict = result.get("conflict_pattern", {})
    if conflict:
        print_subheader("衝突パターン")
        if "core_clash" in conflict:
            print(f"  核心的対立: {conflict['core_clash']}")
        if "cognitive_clash" in conflict:
            print(f"  認知的衝突: {conflict['cognitive_clash']}")
        if "resolution" in conflict:
            print_subheader("解決の糸口")
            print(f"  {conflict['resolution']}")

    # 意思決定の違い
    print_subheader("意思決定パターンの違い")
    print(f"  タイプ{type_a}: {info_a.decision_pattern}")
    print(f"  タイプ{type_b}: {info_b.decision_pattern}")

    # 反応パターンの違い
    print_subheader("反応パターンの違い")
    print(f"  タイプ{type_a}: {info_a.reaction_pattern}")
    print(f"  タイプ{type_b}: {info_b.reaction_pattern}")

    print()


def show_cognitive_functions() -> None:
    """認知機能一覧を表示"""
    print_header("8つの認知機能（ユング × Beebe）")

    for code, func in COGNITIVE_FUNCTIONS.items():
        print(f"\n  {code}: {func.name_ja} ({func.name_en})")
        print(f"    軸: {func.axis} | 向き: {func.orientation}")
        print(f"    {func.description}")
        print("    観察可能な行動:")
        for behavior in func.observable_behaviors[:3]:
            print(f"      - {behavior}")

    print_header("Beebeモデルの8つの元型位置")
    for pos, archetype in BEEBE_ARCHETYPES.items():
        print(f"\n  {pos}. {archetype.name_ja} ({archetype.name_en})")
        print(f"     役割: {archetype.role} | 意識レベル: {archetype.consciousness_level}")
        print(f"     {archetype.description}")
        print(f"     行動シグネチャー: {archetype.behavioral_signature}")

    print()


def show_function_conflicts() -> None:
    """認知機能間の衝突パターンを表示"""
    print_header("認知機能間の衝突パターン")
    for (func_a, func_b), description in FUNCTION_CONFLICT_PATTERNS.items():
        print(f"\n  {func_a} vs {func_b}")
        print(f"    {description}")
    print()


def explore_mode() -> None:
    """探索モード：全データをインタラクティブに閲覧"""
    while True:
        print_header("データ探索モード")
        print("  1) エニアグラム9タイプ一覧")
        print("  2) タイプ詳細（番号指定）")
        print("  3) 2タイプ比較")
        print("  4) 認知機能一覧")
        print("  5) 16タイプ機能スタック")
        print("  6) Nardi脳タイプ一覧")
        print("  7) 本能型サブタイプ一覧")
        print("  8) 認知機能間の衝突パターン")
        print("  9) カウンタータイプ一覧")
        print("  0) 終了")

        choice = get_input("番号を選択:", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])

        if choice == "0":
            print("  探索モードを終了します。")
            break
        elif choice == "1":
            print_header("エニアグラム9タイプ一覧")
            for num, info in ENNEAGRAM_TYPES.items():
                print_type_card(num, info)
                print()
        elif choice == "2":
            type_str = get_input("タイプ番号（1-9）:", [str(i) for i in range(1, 10)])
            lookup_type(int(type_str))
        elif choice == "3":
            a = get_input("タイプA（1-9）:", [str(i) for i in range(1, 10)])
            b = get_input("タイプB（1-9）:", [str(i) for i in range(1, 10)])
            compare_types(int(a), int(b))
        elif choice == "4":
            show_cognitive_functions()
        elif choice == "5":
            print_header("16タイプ機能スタック")
            for mbti_code, stack in FUNCTION_STACKS.items():
                funcs = " → ".join(
                    f"{f[0]}({f[1]})" for f in stack.functions[:4]
                )
                shadow = " → ".join(
                    f"{f[0]}({f[1]})" for f in stack.functions[4:]
                )
                print(f"  {mbti_code}: {funcs}")
                print(f"  {'':6s}影: {shadow}")
                print()
        elif choice == "6":
            print_header("Nardi脳タイプ一覧")
            for mbti_type, pattern in NEURAL_PATTERNS.items():
                print(f"\n  {mbti_type}: {pattern.pattern_name_ja}")
                print(f"    {pattern.description[:80]}...")
                print(f"    問題解決: {pattern.problem_solving_style[:60]}...")
                print(f"    ストレス: {pattern.stress_response[:60]}...")
        elif choice == "7":
            print_header("本能型サブタイプ")
            for code, variant in INSTINCTUAL_VARIANTS.items():
                print(f"\n  {code}: {variant.name_ja} ({variant.name_en})")
                print(f"    焦点: {variant.focus}")
                print(f"    {variant.description}")
            print_subheader("本能型スタック")
            for stack_code, stack in INSTINCTUAL_STACKS.items():
                print(f"\n  {stack_code}: {stack.description}")
        elif choice == "8":
            show_function_conflicts()
        elif choice == "9":
            print_header("カウンタータイプ一覧")
            print("  各タイプの「カウンタータイプ」は、そのタイプらしくない")
            print("  本能型サブタイプで、誤判定の原因になりやすい。\n")
            for type_num, instinct in COUNTERTYPE_MAP.items():
                info = ENNEAGRAM_TYPES[type_num]
                variant = INSTINCTUAL_VARIANTS[instinct]
                print(f"  タイプ{type_num} ({info.name_ja}) → {variant.name_ja}({instinct})")

        input("\n  Enterキーで続行...")


def main() -> None:
    """メインエントリーポイント"""
    parser = argparse.ArgumentParser(
        description="エニアグラム統合タイプ判定ツール - Enneagram x Beebe x Nardi",
    )
    parser.add_argument(
        "--quick", action="store_true",
        help="クイック判定モード（最小限の質問）",
    )
    parser.add_argument(
        "--lookup", type=int, metavar="TYPE",
        help="タイプ情報の参照（1-9）",
    )
    parser.add_argument(
        "--compare", type=int, nargs=2, metavar=("TYPE_A", "TYPE_B"),
        help="2タイプの相性分析",
    )
    parser.add_argument(
        "--functions", action="store_true",
        help="認知機能一覧を表示",
    )
    parser.add_argument(
        "--conflicts", action="store_true",
        help="認知機能間の衝突パターンを表示",
    )
    parser.add_argument(
        "--explore", action="store_true",
        help="データ探索モード",
    )

    args = parser.parse_args()

    if args.lookup:
        lookup_type(args.lookup)
    elif args.compare:
        compare_types(args.compare[0], args.compare[1])
    elif args.functions:
        show_cognitive_functions()
    elif args.conflicts:
        show_function_conflicts()
    elif args.explore:
        explore_mode()
    elif args.quick:
        run_quick_assessment()
    else:
        run_full_assessment()


if __name__ == "__main__":
    main()
