"""エニアグラム統合タイプ判定ツール - Streamlit Web App

Enneagram x Beebe x Nardi を統合したタイプ判定ツールのWeb版。
"""

import streamlit as st

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
from enneagram_tool.data.nardi_data import NEURAL_PATTERNS, NARDI_PROBLEM_SOLVING_STYLES
from enneagram_tool.data.correlation_map import (
    ENNEAGRAM_MBTI_CORRELATION, CONFLICT_PATTERNS,
    FUNCTION_CONFLICT_PATTERNS,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ページ設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

st.set_page_config(
    page_title="Enneagram x Beebe x Nardi",
    page_icon="🔮",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# カスタムCSS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

st.markdown("""
<style>
    .main-title {
        text-align: center;
        padding: 1rem 0;
    }
    .score-bar {
        background: #1a1a2e;
        border-radius: 4px;
        padding: 2px;
        margin: 2px 0;
    }
    .score-fill {
        background: linear-gradient(90deg, #e94560, #0f3460);
        border-radius: 3px;
        height: 20px;
        transition: width 0.5s;
    }
    .type-card {
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
    }
    .center-gut { border-left: 4px solid #e94560; }
    .center-heart { border-left: 4px solid #f5a623; }
    .center-head { border-left: 4px solid #4a90d9; }
    .highlight-box {
        background: rgba(233, 69, 96, 0.1);
        border: 1px solid rgba(233, 69, 96, 0.3);
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
    }
    div[data-testid="stRadio"] > label {
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ヘルパー関数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CENTER_COLORS = {
    "本能（腹）": "🔴",
    "感情（心）": "🟡",
    "思考（頭）": "🔵",
}

CENTER_CSS_CLASS = {
    "本能（腹）": "center-gut",
    "感情（心）": "center-heart",
    "思考（頭）": "center-head",
}


def render_score_bar(label: str, score: float, max_score: float, width: int = 100) -> str:
    pct = (score / max_score * 100) if max_score > 0 else 0
    filled = int(pct / 100 * 20)
    bar = "█" * filled + "░" * (20 - filled)
    return f"`{label:12s}` {bar} {score:.1f}"


def init_session_state():
    if "engine" not in st.session_state:
        st.session_state.engine = QuestionnaireEngine()
    if "phase" not in st.session_state:
        st.session_state.phase = 0
    if "answers" not in st.session_state:
        st.session_state.answers = {}
    if "report" not in st.session_state:
        st.session_state.report = None
    if "assessment_mode" not in st.session_state:
        st.session_state.assessment_mode = None


def reset_assessment():
    st.session_state.engine = QuestionnaireEngine()
    st.session_state.phase = 0
    st.session_state.answers = {}
    st.session_state.report = None
    st.session_state.assessment_mode = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# サイドバー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

with st.sidebar:
    st.title("🔮 Enneagram Tool")
    st.caption("Enneagram x Beebe x Nardi")

    mode = st.radio(
        "モード選択",
        [
            "🏠 ホーム",
            "🎯 フル判定",
            "⚡ クイック判定",
            "🔍 タイプ参照",
            "⚖️ 相性分析",
            "📚 データ探索",
        ],
        index=0,
    )

    st.divider()
    st.caption("© Enneagram x Beebe x Nardi 統合タイプ判定ツール")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ホーム
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if mode == "🏠 ホーム":
    st.markdown("# 🔮 エニアグラム統合タイプ判定ツール")
    st.markdown("### Enneagram x John Beebe x Dario Nardi")

    st.markdown("---")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("#### 🔴 エニアグラム")
        st.markdown("""
        - 9タイプ・18ウィング
        - 3本能型 x 6スタック
        - 9カウンタータイプ
        - 分裂・統合方向
        """)

    with col2:
        st.markdown("#### 🔵 認知機能 (Beebe)")
        st.markdown("""
        - 8つのユング心理機能
        - Beebe 8元型モデル
        - 16タイプ完全機能スタック
        - Hero〜Demon
        """)

    with col3:
        st.markdown("#### 🟢 Nardi 脳タイプ")
        st.markdown("""
        - 12脳領域マッピング
        - 16タイプ別EEGパターン
        - 問題解決スタイル
        - ストレス反応パターン
        """)

    st.markdown("---")

    st.info("""
    **使い方**: 左のサイドバーからモードを選択してください。

    - **フル判定**: 30問の質問で3システム統合判定（推奨）
    - **クイック判定**: 7問で大まかなタイプ推定
    - **タイプ参照**: 9タイプの詳細情報
    - **相性分析**: 2タイプ間の衝突パターンと解決策
    - **データ探索**: 全データのブラウジング
    """)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# フル判定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

elif mode == "🎯 フル判定":
    init_session_state()

    st.markdown("# 🎯 フル判定モード")
    st.caption("3つのシステムを統合してタイプを判定します")

    # リセットボタン
    if st.button("🔄 最初からやり直す"):
        reset_assessment()
        st.rerun()

    # 全質問をフラットなリストにまとめ、フォームで一括送信
    if st.session_state.report is None:
        with st.form("full_assessment_form"):
            # ━━━ Phase 1: エニアグラム ━━━
            st.markdown("## Phase 1: エニアグラム判定")
            st.markdown("まずセンター（腹・心・頭）を判定し、その後タイプを絞り込みます。")

            # センター判定
            st.markdown("### 🎯 センター判定")
            center_questions = [q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "center"]
            center_answers = {}
            for q in center_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(
                    question_text,
                    options,
                    key=f"q_{q.id}",
                )
                center_answers[q.id] = answer[2:3].strip() if answer else ""  # Extract A/B/C

            # 全センターの詳細質問を表示（判定はバックエンドで行う）
            st.markdown("### 🔍 タイプ詳細判定")

            st.markdown("**本能（腹）センター: タイプ1, 8, 9**")
            gut_questions = [q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "gut_detail"]
            gut_answers = {}
            for q in gut_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                gut_answers[q.id] = answer[2:3].strip() if answer else ""

            st.markdown("**感情（心）センター: タイプ2, 3, 4**")
            heart_questions = [q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "heart_detail"]
            heart_answers = {}
            for q in heart_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                heart_answers[q.id] = answer[2:3].strip() if answer else ""

            st.markdown("**思考（頭）センター: タイプ5, 6, 7**")
            head_questions = [q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "head_detail"]
            head_answers = {}
            for q in head_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                head_answers[q.id] = answer[2:3].strip() if answer else ""

            # ストレス方向
            st.markdown("### 😰 ストレス反応パターン")
            stress_q = next(
                (q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "stress_direction"), None,
            )
            stress_answer = ""
            if stress_q:
                lines = stress_q.text.split("\n")
                question_text = lines[0] + "\n" + lines[1]
                options = [line.strip() for line in lines[2:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{stress_q.id}")
                stress_answer = answer[2:3].strip() if answer else ""

            # 本能型サブタイプ
            st.markdown("### 🧬 本能型サブタイプ判定")
            instinct_questions = [q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "instinctual"]
            instinct_answers = {}
            for q in instinct_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                instinct_answers[q.id] = answer[2:3].strip() if answer else ""

            # ━━━ Phase 2: 認知機能 ━━━
            st.markdown("---")
            st.markdown("## Phase 2: 認知機能判定（Beebe モデル）")
            st.markdown("ユング心理学の8つの認知機能を判定します。")

            st.markdown("### 👁️ 知覚機能（情報の取り入れ方）")
            perceive_questions = [q for q in COGNITIVE_QUESTIONS if q.subcategory == "perceiving"]
            perceive_answers = {}
            for q in perceive_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                perceive_answers[q.id] = answer[2:3].strip() if answer else ""

            st.markdown("### ⚖️ 判断機能（意思決定の仕方）")
            judge_questions = [q for q in COGNITIVE_QUESTIONS if q.subcategory == "judging"]
            judge_answers = {}
            for q in judge_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                judge_answers[q.id] = answer[2:3].strip() if answer else ""

            st.markdown("### 🔄 外向・内向の傾向")
            orient_questions = [q for q in COGNITIVE_QUESTIONS if q.subcategory == "orientation"]
            orient_answers = {}
            for q in orient_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                orient_answers[q.id] = answer[2:3].strip() if answer else ""

            st.markdown("### 🌑 影の機能チェック")
            shadow_questions = [q for q in COGNITIVE_QUESTIONS if q.subcategory == "shadow"]
            shadow_answers = {}
            for q in shadow_questions:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                shadow_answers[q.id] = answer[2:3].strip() if answer else ""

            # ━━━ Phase 3: Nardi脳タイプ ━━━
            st.markdown("---")
            st.markdown("## Phase 3: Nardi脳タイプ判定")
            st.markdown("脳の活動パターンに関する質問です。")

            nardi_answers = {}
            for q in NARDI_QUESTIONS:
                lines = q.text.split("\n")
                question_text = lines[0]
                extra_lines = [line for line in lines[1:] if line.strip() and not line.strip().startswith(("A)", "B)", "C)", "D)", "E)", "F)"))]
                if extra_lines:
                    question_text += "\n" + "\n".join(extra_lines)
                options = [line.strip() for line in lines[1:] if line.strip() and line.strip()[0] in "ABCDEF" and line.strip()[1] == ")"]
                if not options:
                    options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                nardi_answers[q.id] = answer[2:3].strip() if answer else ""

            # ━━━ Phase 4: クロスシステム検証 ━━━
            st.markdown("---")
            st.markdown("## Phase 4: クロスシステム検証")
            st.markdown("3つのシステムを横断する検証質問です。")

            cross_answers = {}
            for q in CROSS_SYSTEM_QUESTIONS:
                lines = q.text.split("\n")
                question_text = lines[0]
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(question_text, options, key=f"q_{q.id}")
                cross_answers[q.id] = answer[2:3].strip() if answer else ""

            # 送信
            st.markdown("---")
            submitted = st.form_submit_button(
                "🔮 判定する",
                use_container_width=True,
                type="primary",
            )

            if submitted:
                engine = QuestionnaireEngine()

                # センター
                for qid, ans in center_answers.items():
                    engine.score_center_question(qid, ans)

                # 全センター詳細（3センター全部スコアリング）
                gut_map = {"A": "type_1", "B": "type_8", "C": "type_9"}
                for qid, ans in gut_answers.items():
                    engine.score_type_detail(qid, ans, gut_map)
                heart_map = {"A": "type_2", "B": "type_3", "C": "type_4"}
                for qid, ans in heart_answers.items():
                    engine.score_type_detail(qid, ans, heart_map)
                head_map = {"A": "type_5", "B": "type_6", "C": "type_7"}
                for qid, ans in head_answers.items():
                    engine.score_type_detail(qid, ans, head_map)

                # ストレス方向
                stress_type_map = {
                    "A": "type_1", "B": "type_2", "C": "type_3",
                    "D": "type_4", "E": "type_5", "F": "type_6",
                    "G": "type_7", "H": "type_8", "I": "type_9",
                }
                if stress_answer in stress_type_map:
                    engine.enneagram_scores[stress_type_map[stress_answer]] = (
                        engine.enneagram_scores.get(stress_type_map[stress_answer], 0.0) + 1.5
                    )
                engine.record_answer("stress_1", stress_answer)

                # 本能型
                for qid, ans in instinct_answers.items():
                    engine.score_instinct_question(qid, ans)

                # 知覚
                perceive_map = {"A": "Se", "B": "Si", "C": "Ne", "D": "Ni"}
                for qid, ans in perceive_answers.items():
                    engine.score_cognitive_question(qid, ans, perceive_map)

                # 判断
                judge_map = {"A": "Te", "B": "Ti", "C": "Fe", "D": "Fi"}
                for qid, ans in judge_answers.items():
                    engine.score_cognitive_question(qid, ans, judge_map)

                # 外向/内向
                for qid, ans in orient_answers.items():
                    engine.score_orientation_question(qid, ans)

                # 影
                for qid, ans in shadow_answers.items():
                    engine.record_answer(qid, ans)

                # Nardi
                for qid, ans in nardi_answers.items():
                    engine.record_answer(qid, ans)

                # クロス
                for qid, ans in cross_answers.items():
                    engine.record_answer(qid, ans)

                st.session_state.engine = engine
                analyzer = IntegratedAnalyzer(engine)
                st.session_state.report = analyzer.generate_full_report()
                st.rerun()

    # ━━━ 結果表示 ━━━
    if st.session_state.report is not None:
        report = st.session_state.report
        engine = st.session_state.engine

        st.markdown("---")
        st.markdown("## 🎯 判定結果")

        # サマリー
        enneagram = report["enneagram"]
        cognitive = report["cognitive"]
        cross = report["cross_analysis"]
        type_info = enneagram["type_info"]

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric(
                "エニアグラム",
                f"タイプ{enneagram['core_type']}",
                f"{type_info.name_ja}",
            )
        with col2:
            st.metric(
                "MBTI (推定)",
                cognitive.get("probable_mbti", "不明"),
                f"主機能: {cognitive.get('dominant', '?')}",
            )
        with col3:
            nardi = cognitive.get("nardi_pattern")
            st.metric(
                "Nardi脳タイプ",
                nardi.pattern_name_ja[:12] if nardi else "未判定",
                cognitive.get("probable_mbti", ""),
            )

        st.markdown("---")

        # エニアグラム詳細
        st.markdown("### 🔴 エニアグラム判定結果")

        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"""
            | 項目 | 結果 |
            |------|------|
            | コアタイプ | **{enneagram['core_type']} - {type_info.name_ja}** ({type_info.name_en}) |
            | センター | {type_info.center} |
            | 本能型スタック | {enneagram['instinct_stack']} |
            | 判定信頼度 | {enneagram['confidence']} |
            | 核心的恐れ | {type_info.core_fear} |
            | 核心的欲求 | {type_info.core_desire} |
            """)

        with col2:
            st.markdown(f"""
            | 項目 | 結果 |
            |------|------|
            | 意思決定パターン | {type_info.decision_pattern[:50]}... |
            | 反応パターン | {type_info.reaction_pattern[:50]}... |
            | 盲点 | {type_info.blind_spot[:50]}... |
            | 分裂方向 | → タイプ{type_info.stress_direction} |
            | 統合方向 | → タイプ{type_info.growth_direction} |
            """)

        if enneagram.get("is_countertype"):
            st.warning(f"⚠️ {enneagram['countertype_note']}")

        # エニアグラムスコア
        st.markdown("#### スコア詳細")
        max_score = max(engine.enneagram_scores.values()) if any(engine.enneagram_scores.values()) else 1.0
        scores_text = ""
        for i in range(1, 10):
            score = engine.enneagram_scores.get(f"type_{i}", 0.0)
            pct = score / max(max_score, 0.01)
            filled = int(pct * 20)
            bar = "█" * filled + "░" * (20 - filled)
            name = ENNEAGRAM_TYPES[i].name_ja
            marker = " ◀" if i == enneagram['core_type'] else ""
            scores_text += f"タイプ{i} ({name[:5]:5s})  {bar}  {score:.1f}{marker}\n"
        st.code(scores_text, language=None)

        # ウィング
        if enneagram.get("wings"):
            st.markdown("#### ウィング候補")
            for w in enneagram["wings"]:
                info = w["wing_info"]
                st.markdown(f"- **{w['wing_key']}** ({info.name_ja}): {info.description}")

        st.markdown("---")

        # 認知機能詳細
        st.markdown("### 🔵 認知機能判定結果")
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"""
            | 項目 | 結果 |
            |------|------|
            | 推定MBTI | **{cognitive.get('probable_mbti', '不明')}** |
            | 主機能 (Hero) | {cognitive.get('dominant', '?')} |
            | 補助機能 (Parent) | {cognitive.get('auxiliary', '?')} |
            | 外向/内向 | {cognitive.get('orientation', '?')} |
            """)

        with col2:
            max_func = max(engine.cognitive_scores.values()) if any(engine.cognitive_scores.values()) else 1.0
            func_text = ""
            for func_code in ["Se", "Si", "Ne", "Ni", "Te", "Ti", "Fe", "Fi"]:
                score = engine.cognitive_scores.get(func_code, 0.0)
                pct = score / max(max_func, 0.01)
                filled = int(pct * 15)
                bar = "█" * filled + "░" * (15 - filled)
                fname = COGNITIVE_FUNCTIONS[func_code].name_ja[:6]
                marker = " ◀" if func_code == cognitive.get("dominant") else ""
                func_text += f"{func_code} ({fname})  {bar}  {score:.1f}{marker}\n"
            st.code(func_text, language=None)

        # 機能スタック
        if cognitive.get("function_stack"):
            stack = cognitive["function_stack"]
            st.markdown("#### 機能スタック")
            stack_text = ""
            for func_code, archetype in stack.functions[:4]:
                arch_ja = BEEBE_ARCHETYPES[stack.functions.index((func_code, archetype)) + 1].name_ja if stack.functions.index((func_code, archetype)) + 1 in BEEBE_ARCHETYPES else archetype
                stack_text += f"  {archetype:16s} → {func_code} ({COGNITIVE_FUNCTIONS[func_code].name_ja})\n"
            stack_text += "  ─── 影 ───\n"
            for func_code, archetype in stack.functions[4:]:
                stack_text += f"  {archetype:16s} → {func_code} ({COGNITIVE_FUNCTIONS[func_code].name_ja})\n"
            st.code(stack_text, language=None)

        st.markdown("---")

        # Nardi
        if cognitive.get("nardi_pattern"):
            pattern = cognitive["nardi_pattern"]
            st.markdown("### 🧠 Nardi脳活動パターン")
            st.markdown(f"**{pattern.pattern_name_ja}** ({pattern.pattern_name_en})")
            st.markdown(f"> {pattern.description}")
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"**問題解決**: {pattern.problem_solving_style}")
            with col2:
                st.markdown(f"**ストレス反応**: {pattern.stress_response}")
            st.markdown(f"**活性領域**: {', '.join(pattern.active_regions)}")

            st.markdown("---")

        # クロス分析
        st.markdown("### 🔀 クロスシステム分析")

        if cross.get("correlation"):
            for corr in cross["correlation"]:
                match_str = "✅ 相関あり" if corr.get("match") else "⚠️ 稀な組み合わせ"
                st.markdown(f"**{corr['mbti']}**: 相関強度 {corr['strength']:.1f} ({match_str})")
                st.markdown(f"  {corr['reason']}")

        if cross.get("integration_notes"):
            st.markdown("#### 統合分析ノート")
            for note in cross["integration_notes"]:
                st.markdown(f"- {note}")

        # 本能型スコア
        st.markdown("---")
        st.markdown("### 🧬 本能型サブタイプ")
        max_inst = max(engine.instinct_scores.values()) if any(engine.instinct_scores.values()) else 1.0
        inst_text = ""
        for code, variant in INSTINCTUAL_VARIANTS.items():
            score = engine.instinct_scores.get(code, 0.0)
            pct = score / max(max_inst, 0.01)
            filled = int(pct * 15)
            bar = "█" * filled + "░" * (15 - filled)
            inst_text += f"{variant.name_ja:8s} ({code})  {bar}  {score:.1f}\n"
        st.code(inst_text, language=None)
        st.markdown(f"**本能型スタック**: {enneagram['instinct_stack']}")

        st.markdown("---")
        st.info("※ この結果は自己理解の参考としてご活用ください。正確なタイプ判定には、専門家との対話や長期的な自己観察が推奨されます。")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# クイック判定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

elif mode == "⚡ クイック判定":
    st.markdown("# ⚡ クイック判定モード")
    st.caption("最小限の質問で大まかなタイプを推定します")

    if "quick_report" not in st.session_state:
        st.session_state.quick_report = None

    if st.button("🔄 やり直す", key="quick_reset"):
        st.session_state.quick_report = None
        st.rerun()

    if st.session_state.quick_report is None:
        with st.form("quick_form"):
            st.markdown("### センター判定（3問）")
            center_questions = [q for q in ENNEAGRAM_QUESTIONS if q.subcategory == "center"]
            center_ans = {}
            for q in center_questions:
                lines = q.text.split("\n")
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(lines[0], options, key=f"quick_{q.id}")
                center_ans[q.id] = answer[2:3].strip() if answer else ""

            st.markdown("### タイプ絞り込み（6問）")
            detail_ans = {}
            for q in ENNEAGRAM_QUESTIONS:
                if q.subcategory in ("gut_detail", "heart_detail", "head_detail"):
                    lines = q.text.split("\n")
                    options = [line.strip() for line in lines[1:] if line.strip()]
                    answer = st.radio(lines[0], options, key=f"quick_{q.id}")
                    detail_ans[q.id] = (q.subcategory, answer[2:3].strip() if answer else "")

            st.markdown("### 認知機能クイックチェック（2問）")
            perceive_q = next((q for q in COGNITIVE_QUESTIONS if q.id == "perceive_1"), None)
            judge_q = next((q for q in COGNITIVE_QUESTIONS if q.id == "judge_1"), None)
            perceive_ans = ""
            judge_ans = ""
            if perceive_q:
                lines = perceive_q.text.split("\n")
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(lines[0], options, key=f"quick_{perceive_q.id}")
                perceive_ans = answer[2:3].strip() if answer else ""
            if judge_q:
                lines = judge_q.text.split("\n")
                options = [line.strip() for line in lines[1:] if line.strip()]
                answer = st.radio(lines[0], options, key=f"quick_{judge_q.id}")
                judge_ans = answer[2:3].strip() if answer else ""

            submitted = st.form_submit_button("⚡ クイック判定", use_container_width=True, type="primary")

            if submitted:
                engine = QuestionnaireEngine()
                for qid, ans in center_ans.items():
                    engine.score_center_question(qid, ans)

                type_maps = {
                    "gut_detail": {"A": "type_1", "B": "type_8", "C": "type_9"},
                    "heart_detail": {"A": "type_2", "B": "type_3", "C": "type_4"},
                    "head_detail": {"A": "type_5", "B": "type_6", "C": "type_7"},
                }
                for qid, (subcat, ans) in detail_ans.items():
                    engine.score_type_detail(qid, ans, type_maps[subcat])

                if perceive_ans:
                    engine.score_cognitive_question(
                        "perceive_1", perceive_ans,
                        {"A": "Se", "B": "Si", "C": "Ne", "D": "Ni"},
                    )
                if judge_ans:
                    engine.score_cognitive_question(
                        "judge_1", judge_ans,
                        {"A": "Te", "B": "Ti", "C": "Fe", "D": "Fi"},
                    )

                top_types = engine.get_top_types(3)
                top_funcs = engine.get_top_functions(2)
                st.session_state.quick_report = {
                    "top_types": top_types,
                    "top_funcs": top_funcs,
                }
                st.rerun()

    if st.session_state.quick_report is not None:
        r = st.session_state.quick_report
        st.markdown("## 結果")

        st.markdown("### エニアグラム候補（上位3つ）")
        for type_key, score in r["top_types"]:
            type_num = int(type_key.replace("type_", ""))
            if type_num in ENNEAGRAM_TYPES:
                info = ENNEAGRAM_TYPES[type_num]
                is_top = (type_key == r["top_types"][0][0])
                marker = " ⭐" if is_top else ""
                color = CENTER_COLORS.get(info.center, "⚪")
                st.markdown(f"""
                **{color} タイプ{type_num}: {info.name_ja}** ({info.name_en}){marker} — スコア: {score:.1f}

                > 恐れ: {info.core_fear} / 欲求: {info.core_desire}
                """)

        st.markdown("### 認知機能（上位2つ）")
        for func_code, score in r["top_funcs"]:
            func = COGNITIVE_FUNCTIONS[func_code]
            st.markdown(f"- **{func_code}** ({func.name_ja}): {func.description[:60]}...")

        st.info("※ より正確な判定にはフル判定モードをお勧めします。")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# タイプ参照
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

elif mode == "🔍 タイプ参照":
    st.markdown("# 🔍 タイプ参照")

    type_num = st.selectbox(
        "タイプを選択",
        list(range(1, 10)),
        format_func=lambda x: f"タイプ{x}: {ENNEAGRAM_TYPES[x].name_ja} ({ENNEAGRAM_TYPES[x].name_en})",
    )

    if type_num:
        info = ENNEAGRAM_TYPES[type_num]
        color = CENTER_COLORS.get(info.center, "⚪")

        st.markdown(f"## {color} タイプ{type_num}: {info.name_ja} ({info.name_en})")
        st.markdown(f"**センター**: {info.center}")

        col1, col2 = st.columns(2)
        with col1:
            st.markdown("#### 核心")
            st.markdown(f"- **恐れ**: {info.core_fear}")
            st.markdown(f"- **欲求**: {info.core_desire}")
            st.markdown(f"- **動機**: {info.core_motivation}")
        with col2:
            st.markdown("#### 方向性")
            st.markdown(f"- **分裂方向**: → タイプ{info.stress_direction} ({ENNEAGRAM_TYPES[info.stress_direction].name_ja})")
            st.markdown(f"- **統合方向**: → タイプ{info.growth_direction} ({ENNEAGRAM_TYPES[info.growth_direction].name_ja})")

        st.markdown("#### 主な行動パターン")
        for behavior in info.key_behaviors:
            st.markdown(f"- {behavior}")

        st.markdown("#### 意思決定パターン")
        st.markdown(f"> {info.decision_pattern}")

        st.markdown("#### 反応パターン")
        st.markdown(f"> {info.reaction_pattern}")

        st.markdown("#### 盲点（ブラインドスポット）")
        st.warning(info.blind_spot)

        # ウィング
        st.markdown("#### ウィング")
        for key, wing in WINGS.items():
            if wing.base_type == type_num:
                st.markdown(f"**{key}**: {wing.name_ja}")
                st.markdown(f"- {wing.description}")
                st.markdown(f"- 行動変化: {wing.behavioral_shift}")

        # カウンタータイプ
        if type_num in COUNTERTYPE_MAP:
            ct = COUNTERTYPE_MAP[type_num]
            ct_info = INSTINCTUAL_VARIANTS[ct]
            st.markdown("#### カウンタータイプ")
            st.warning(f"{ct_info.name_ja}({ct}) — タイプの特徴が見えにくくなる本能型")

        # MBTI相関
        if type_num in ENNEAGRAM_MBTI_CORRELATION:
            st.markdown("#### よくあるMBTI相関")
            corr_text = ""
            for mbti, strength, reason in ENNEAGRAM_MBTI_CORRELATION[type_num]:
                bar = "█" * int(strength * 10) + "░" * (10 - int(strength * 10))
                corr_text += f"{mbti}  {bar}  {strength:.1f}  {reason}\n"
            st.code(corr_text, language=None)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 相性分析
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

elif mode == "⚖️ 相性分析":
    st.markdown("# ⚖️ 相性分析")
    st.caption("2タイプ間の衝突パターンと解決の糸口")

    col1, col2 = st.columns(2)
    with col1:
        type_a = st.selectbox(
            "タイプA",
            list(range(1, 10)),
            format_func=lambda x: f"タイプ{x}: {ENNEAGRAM_TYPES[x].name_ja}",
            key="compare_a",
        )
    with col2:
        type_b = st.selectbox(
            "タイプB",
            list(range(1, 10)),
            index=1,
            format_func=lambda x: f"タイプ{x}: {ENNEAGRAM_TYPES[x].name_ja}",
            key="compare_b",
        )

    if type_a and type_b:
        engine = QuestionnaireEngine()
        analyzer = IntegratedAnalyzer(engine)
        result = analyzer.analyze_compatibility(type_a, type_b)

        info_a = ENNEAGRAM_TYPES[type_a]
        info_b = ENNEAGRAM_TYPES[type_b]
        color_a = CENTER_COLORS.get(info_a.center, "⚪")
        color_b = CENTER_COLORS.get(info_b.center, "⚪")

        st.markdown(f"## {color_a} タイプ{type_a} ({info_a.name_ja}) × {color_b} タイプ{type_b} ({info_b.name_ja})")

        # 基本比較
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"#### タイプ{type_a}: {info_a.name_ja}")
            st.markdown(f"- センター: {info_a.center}")
            st.markdown(f"- 恐れ: {info_a.core_fear}")
            st.markdown(f"- 欲求: {info_a.core_desire}")
            st.markdown(f"- 意思決定: {info_a.decision_pattern[:80]}...")
        with col2:
            st.markdown(f"#### タイプ{type_b}: {info_b.name_ja}")
            st.markdown(f"- センター: {info_b.center}")
            st.markdown(f"- 恐れ: {info_b.core_fear}")
            st.markdown(f"- 欲求: {info_b.core_desire}")
            st.markdown(f"- 意思決定: {info_b.decision_pattern[:80]}...")

        # センター相性
        if result.get("center_note"):
            st.markdown("#### センター間の相性")
            st.info(result["center_note"])

        # 衝突パターン
        conflict = result.get("conflict_pattern", {})
        if conflict:
            st.markdown("#### 衝突パターン")
            if "core_clash" in conflict:
                st.error(f"**核心的対立**: {conflict['core_clash']}")
            if "cognitive_clash" in conflict:
                st.warning(f"**認知的衝突**: {conflict['cognitive_clash']}")
            if "resolution" in conflict:
                st.markdown("#### 💡 解決の糸口")
                st.success(conflict["resolution"])

        # 反応パターンの違い
        st.markdown("#### 反応パターンの違い")
        st.markdown(f"- **タイプ{type_a}**: {info_a.reaction_pattern}")
        st.markdown(f"- **タイプ{type_b}**: {info_b.reaction_pattern}")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# データ探索
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

elif mode == "📚 データ探索":
    st.markdown("# 📚 データ探索")

    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
        "9タイプ一覧",
        "認知機能",
        "Beebe元型",
        "16タイプスタック",
        "Nardi脳タイプ",
        "本能型",
        "衝突パターン",
    ])

    with tab1:
        st.markdown("### エニアグラム9タイプ一覧")
        for num, info in ENNEAGRAM_TYPES.items():
            color = CENTER_COLORS.get(info.center, "⚪")
            with st.expander(f"{color} タイプ{num}: {info.name_ja} ({info.name_en}) — {info.center}"):
                st.markdown(f"- **恐れ**: {info.core_fear}")
                st.markdown(f"- **欲求**: {info.core_desire}")
                st.markdown(f"- **動機**: {info.core_motivation}")
                st.markdown(f"- **分裂**: → タイプ{info.stress_direction} / **統合**: → タイプ{info.growth_direction}")
                st.markdown(f"- **意思決定**: {info.decision_pattern}")
                st.markdown(f"- **盲点**: {info.blind_spot}")

    with tab2:
        st.markdown("### 8つの認知機能")
        for code, func in COGNITIVE_FUNCTIONS.items():
            with st.expander(f"{code}: {func.name_ja} ({func.name_en}) — {func.axis}/{func.orientation}"):
                st.markdown(func.description)
                st.markdown("**観察可能な行動:**")
                for b in func.observable_behaviors:
                    st.markdown(f"- {b}")

    with tab3:
        st.markdown("### Beebeモデル 8元型")
        for pos, arch in BEEBE_ARCHETYPES.items():
            with st.expander(f"{pos}. {arch.name_ja} ({arch.name_en}) — {arch.role}"):
                st.markdown(f"**意識レベル**: {arch.consciousness_level}")
                st.markdown(arch.description)
                st.markdown(f"**行動シグネチャー**: {arch.behavioral_signature}")

    with tab4:
        st.markdown("### 16タイプ機能スタック")
        for mbti_code, stack in FUNCTION_STACKS.items():
            main_funcs = " → ".join(f"{f[0]}({f[1]})" for f in stack.functions[:4])
            shadow_funcs = " → ".join(f"{f[0]}({f[1]})" for f in stack.functions[4:])
            with st.expander(f"{mbti_code}: {main_funcs}"):
                st.markdown(f"**主要**: {main_funcs}")
                st.markdown(f"**影**: {shadow_funcs}")

    with tab5:
        st.markdown("### Nardi脳タイプ")
        for mbti_type, pattern in NEURAL_PATTERNS.items():
            with st.expander(f"{mbti_type}: {pattern.pattern_name_ja}"):
                st.markdown(pattern.description)
                st.markdown(f"**問題解決**: {pattern.problem_solving_style}")
                st.markdown(f"**ストレス反応**: {pattern.stress_response}")
                st.markdown(f"**活性領域**: {', '.join(pattern.active_regions)}")

    with tab6:
        st.markdown("### 本能型サブタイプ")
        for code, variant in INSTINCTUAL_VARIANTS.items():
            st.markdown(f"**{code}: {variant.name_ja}** ({variant.name_en})")
            st.markdown(f"- 焦点: {variant.focus}")
            st.markdown(f"- {variant.description}")

        st.markdown("---")
        st.markdown("### 本能型スタック")
        for stack_code, stack in INSTINCTUAL_STACKS.items():
            st.markdown(f"- **{stack_code}**: {stack.description}")

        st.markdown("---")
        st.markdown("### カウンタータイプ一覧")
        st.caption("各タイプで一つだけ、タイプの特徴に反する本能型")
        for type_num, instinct in COUNTERTYPE_MAP.items():
            info = ENNEAGRAM_TYPES[type_num]
            variant = INSTINCTUAL_VARIANTS[instinct]
            st.markdown(f"- タイプ{type_num} ({info.name_ja}) → {variant.name_ja} ({instinct})")

    with tab7:
        st.markdown("### タイプ間の衝突パターン")
        for (ta, tb), conflict in CONFLICT_PATTERNS.items():
            name_a = ENNEAGRAM_TYPES[ta].name_ja
            name_b = ENNEAGRAM_TYPES[tb].name_ja
            with st.expander(f"タイプ{ta} ({name_a}) × タイプ{tb} ({name_b})"):
                st.error(f"**核心的対立**: {conflict['core_clash']}")
                if "cognitive_clash" in conflict:
                    st.warning(f"**認知的衝突**: {conflict['cognitive_clash']}")
                st.success(f"**解決**: {conflict['resolution']}")

        st.markdown("---")
        st.markdown("### 認知機能間の衝突パターン")
        for (fa, fb), desc in FUNCTION_CONFLICT_PATTERNS.items():
            st.markdown(f"- **{fa} vs {fb}**: {desc}")
