"""フリオチLAB - フリオチ思考訓練ドリル Streamlit Web App

出題 → 個人思考 → 回答 → 期待とズレの自己記述 → 構造フィードバック →
成立例の提示 → 別案で再挑戦 → 弱点タグの蓄積、という学習ループを回す。

起動：streamlit run furiochi_app.py
"""

from datetime import date
import html
import re
import time

import streamlit as st

from furiochi_lab.data.modes import (
    IMPLEMENTED_MODES, LEVELS, MODES, PILOT_PLAN, RELEVANCE, RUBRICS,
    SAFETY_STATUS, WEAKNESS_TAGS,
)
from furiochi_lab.data.problems import PROBLEMS_BY_ID, problems_for_mode
from furiochi_lab.data.taxonomy import (
    BASIC_FLOW, BASIC_TYPES, COMMON_FAILURES, DEFINITION, DOMESTIC_WORKS,
    FURI_FUNCTIONS, LAYERS, ORIGINAL_EXAMPLES, OVERSEAS_WORKS, PRACTICE_PLAN,
    PRODUCTION_STEPS, SOURCES, TECHNIQUES, THEORIES,
)
from furiochi_lab.engine.ai_coach import CoachError, FuriochiCoach, ai_available
from furiochi_lab.engine.history import (
    HistoryStore, attempt_date, attempted_ids, effort_summary, level_progress, mode_summary,
    resolve_problem, streak_days, weakness_counts,
)
from furiochi_lab.engine.rubric import auto_checks, char_count, self_evaluation, split_answers
from furiochi_lab.engine.selector import next_problem_id, pilot_set, todays_set
from furiochi_lab.models.drill import Attempt, Evaluation, Problem

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ページ設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

st.set_page_config(
    page_title="フリオチLAB",
    page_icon="🎤",
    layout="centered",
    initial_sidebar_state="auto",
)

st.markdown("""
<style>
    .prompt-card {
        border-left: 5px solid #e94560;
        background: rgba(233, 69, 96, 0.07);
        border-radius: 6px;
        padding: 0.9rem 1rem;
        margin: 0.4rem 0 0.8rem 0;
        font-size: 1.25rem;
        line-height: 1.7;
    }
    .meta {
        color: #888;
        font-size: 0.85rem;
    }
</style>
""", unsafe_allow_html=True)

PAGES = ["🏠 ホーム", "✍️ 練習", "📒 マイノート", "📚 型の辞典"]
HOME, PRACTICE, NOTES, DICTIONARY = PAGES

MD_SPECIAL = re.compile(r"([\\`*_{}\[\]<>#|~])")


def esc(text: str) -> str:
    """利用者や生成AIの文章をMarkdownとして解釈させない"""
    return MD_SPECIAL.sub(r"\\\1", text)


def quote(text: str) -> str:
    """回答を引用表示する。掛け合いの改行はそのまま残す"""
    lines = [esc(line) for line in text.splitlines() if line.strip()]
    return "> " + "  \n> ".join(lines)


def fmt_sec(sec: int) -> str:
    minutes, seconds = divmod(int(sec), 60)
    return f"{minutes}分{seconds:02d}秒" if minutes else f"{seconds}秒"


# 型の名前 → 一言の説明（M04 の入力欄のヘルプに使う）
TYPE_HINTS = {t["name"]: t["flip"] for t in BASIC_TYPES}
TYPE_HINTS.update({t["name"]: t["operation"] for t in TECHNIQUES if t["name"] not in TYPE_HINTS})

SATISFACTION = {1: "1 納得いかない", 2: "2 いまいち", 3: "3 まあまあ", 4: "4 わりと好き", 5: "5 会心"}

THINKING_AIDS = {
    "M04": ("- このフリを聞いた人は、次に何を期待する？\n"
            "- 型ごとに、何をずらすかを決める（大きさ・言葉の意味・本人の矛盾など）\n"
            "- 3案とも、フリと同じ尺度の上に乗っている？"),
    "M07": ("- ボケの前に、聞き手は何を期待していた？\n"
            "- ボケはその期待のどこを外した？ 一言で言うと？\n"
            "- 本来どうあるべきかを短く示せる？ 相手を下げすぎていない？"),
}
DEFAULT_THINKING_AID = ("- このフリを聞いた人は、次に何を期待する？\n"
                        "- その期待と反対の位置にあるものは何？ 同じ尺度で考える\n"
                        "- どんな場面で、誰に向かって言う？")

INTENT_FIELD = {
    "M04": ("狙った期待とズレ（任意）", "例：1案目は変化の大きさ、2案目は変化の向き、3案目は本人の矛盾でずらした"),
    "M07": ("突いたズレと、示した基準（任意）", "例：詳しいと言ったのに、一番有名なものを使っていない点を突いた"),
}
DEFAULT_INTENT_FIELD = ("狙った期待とズレ（任意）", "例：寝ていない→実は長く寝ている、の睡眠時間の軸で反転させた")


def limit_note(mode) -> str:
    """字数の目安の書き添え。複数案のモードは1案あたりの目安"""
    if not mode.char_limit:
        return ""
    per = "1案" if mode.answer_count > 1 else ""
    return f"（{per}{mode.char_limit}字以内が目安）"


def answer_slots(problem: Problem) -> list[str]:
    """複数案のモードで、各案に使う型の名前（条件が足りなければ「n案目」）"""
    count = MODES[problem.mode].answer_count
    types = problem.condition_types()
    return [types[i] if i < len(types) else f"{i + 1}案目" for i in range(count)]


def answer_markdown(problem: Problem | None, answer: str) -> str:
    """回答を表示用のMarkdownにする。M04 は案ごとに型と字数を添える"""
    if problem is None or MODES[problem.mode].answer_count == 1:
        return quote(answer)
    parts = split_answers(answer)
    rows = []
    for i, slot in enumerate(answer_slots(problem)):
        text = parts[i] if i < len(parts) else ""
        body = f"{esc(text)}　（{char_count(text)}字）" if text else "（未記入）"
        rows.append(f"{i + 1}. 〔{esc(slot)}〕 {body}")
    return "\n".join(rows)


def render_answer(problem: Problem | None, answer: str) -> None:
    st.markdown(answer_markdown(problem, answer))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# セッション状態
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def init_session_state() -> None:
    defaults = {
        "page": HOME,
        "store": None,
        "coach": None,
        "use_ai": True,
        "generated": {},
        "problem_id": None,
        "phase": "answer",  # answer | self_eval | result
        "draft": None,
        "current": None,
        "saved": False,
        "retry_of": None,
        "round": 0,
        "queue": [],
        "queue_label": "",
        "queue_pos": 0,
        "ai_error": "",
        "practice_mode": "M01",
        "flash": "",
        "pending_problem": None,
        "shown_at": None,  # 問題を出した時刻（制作時間の計測に使う）
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value
    if st.session_state.store is None:
        st.session_state.store = HistoryStore()


init_session_state()
store: HistoryStore = st.session_state.store


def get_coach() -> FuriochiCoach | None:
    if not (ai_available() and st.session_state.use_ai):
        return None
    if st.session_state.coach is None:
        st.session_state.coach = FuriochiCoach()
    return st.session_state.coach


def get_problem(pid: str | None) -> Problem | None:
    if pid is None:
        return None
    return PROBLEMS_BY_ID.get(pid) or st.session_state.generated.get(pid)


def problem_display(p: Problem) -> str:
    if p.mode in ("M01", "M03", "M04"):
        return f"「{p.prompt}」"
    return p.prompt


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 画面遷移（ボタンのコールバック）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def start_problem(pid: str, retry_of: str | None = None) -> None:
    st.session_state.problem_id = pid
    st.session_state.phase = "answer"
    st.session_state.draft = None
    st.session_state.current = None
    st.session_state.saved = False
    st.session_state.retry_of = retry_of
    st.session_state.ai_error = ""
    st.session_state.round += 1
    st.session_state.shown_at = time.time()
    problem = get_problem(pid)
    if problem:
        st.session_state.practice_mode = problem.mode
    st.session_state.page = PRACTICE


def start_queue(ids: list[str], label: str) -> None:
    if not ids:
        return
    st.session_state.queue = list(ids)
    st.session_state.queue_label = label
    st.session_state.queue_pos = 0
    start_problem(ids[0])


def stop_queue() -> None:
    st.session_state.queue = []
    st.session_state.queue_label = ""
    st.session_state.queue_pos = 0


def start_mode(mode: str) -> None:
    stop_queue()
    pid = next_problem_id(mode, store.all())
    st.session_state.practice_mode = mode
    if pid:
        start_problem(pid)


def go_next() -> None:
    queue = st.session_state.queue
    if queue:
        pos = st.session_state.queue_pos + 1
        if pos < len(queue):
            st.session_state.queue_pos = pos
            start_problem(queue[pos])
            return
        st.session_state.flash = f"{st.session_state.queue_label}が終わりました。お疲れさまでした。"
        stop_queue()
    current = get_problem(st.session_state.problem_id)
    mode = current.mode if current else st.session_state.practice_mode
    exclude = [current.id] if current else []
    pid = next_problem_id(mode, store.all(), exclude=exclude)
    if pid:
        start_problem(pid)


def retry_same() -> None:
    current: Attempt | None = st.session_state.current
    start_problem(st.session_state.problem_id, retry_of=current.id if current else None)


# ウィジェット生成後はそのキーを書き換えられないため、生成した問題は次の実行の冒頭で開く
if st.session_state.pending_problem:
    start_problem(st.session_state.pending_problem)
    st.session_state.pending_problem = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# サイドバー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

with st.sidebar:
    st.title("🎤 フリオチLAB")
    st.caption("フリオチ思考訓練ドリル")
    st.radio("メニュー", PAGES, key="page")
    st.divider()
    if ai_available():
        st.toggle("AI講評を使う", key="use_ai")
        st.caption("Claude が構造を講評します。オフにすると自己採点で進みます。")
    else:
        st.caption("AI講評はオフです（APIキー未設定）。出題側の意図と成立例を見ながら自己採点で進みます。")
    st.caption(f"履歴の保存先：{store.path}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 講評の表示
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_scores(ev: Evaluation) -> None:
    st.markdown(f"##### 構造スコア　{ev.total} / {ev.max_total}")
    for axis in RUBRICS[ev.rubric]:
        score = ev.scores.get(axis.key, 0)
        reason = ev.reasons.get(axis.key) or axis.levels[score]
        st.markdown(f"**{axis.name}**　{'●' * score}{'○' * (2 - score)}　{esc(reason)}")


def render_evaluation(ev: Evaluation, problem: Problem) -> None:
    """設計書 6章の出力順序：期待 → ズレ → 内訳 → 改善 → 別解"""
    source = "AI講評" if ev.source == "ai" else "自己採点"
    st.caption(source)

    st.markdown("##### フリが作る期待")
    st.markdown(esc(ev.detected_expectation or problem.expectation))

    st.markdown("##### ズレ")
    if ev.deviation:
        st.markdown(esc(ev.deviation))
    axis = ev.deviation_axis or problem.axis
    st.markdown(f"対照軸：{esc(axis)}　／　{RELEVANCE.get(ev.relevance, '')}")

    render_scores(ev)

    if ev.safety_status != "ok":
        label = SAFETY_STATUS[ev.safety_status]
        note = ev.safety_note or "誰かを傷つける形になっていないか、使う場面を確認しましょう。"
        if ev.safety_status == "needs_revision":
            st.error(f"安全性：{label}　{note}")
        else:
            st.warning(f"安全性：{label}　{note}")

    if ev.good_point:
        st.markdown("##### 良い点")
        st.markdown(esc(ev.good_point))

    if ev.improvements:
        st.markdown("##### 改善するなら")
        for item in ev.improvements:
            st.markdown(f"- {esc(item)}")
    if ev.one_revision:
        st.markdown("**修正案**")
        st.info(esc(ev.one_revision))

    if ev.alternatives:
        st.markdown("##### 別の型で作るなら" if ev.source == "ai" else "##### 成立例")
        for alt in ev.alternatives:
            note = f"　{esc(alt.note)}" if alt.note else ""
            st.markdown(f"- {esc(alt.text)}　〔{esc(alt.pattern)}〕{note}")

    if ev.tags:
        st.markdown("##### 弱点タグ")
        st.markdown("　".join(f"`{t}`" for t in ev.tags))

    st.caption("得点は笑いの保証ではなく、構造を学ぶための参考指標です。高得点でもウケないことはあるし、低得点でも演技や関係性で成立することがあります。")


def render_design_intent(problem: Problem) -> None:
    st.markdown(f"**出題側の想定**　期待：{esc(problem.expectation)}")
    st.markdown(f"対照軸：{esc(problem.axis)}　／　型：{esc(problem.pattern)}")
    if problem.weak_reason:
        st.markdown(f"元ネタが弱い理由：{esc(problem.weak_reason)}")
    if problem.focus:
        st.markdown(f"解説の焦点：{esc(problem.focus)}")


def render_examples(problem: Problem) -> None:
    for ex in problem.examples:
        note = f"　{esc(ex.note)}" if ex.note else ""
        st.markdown(f"- {esc(ex.text)}　〔{esc(ex.pattern)}〕{note}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ホーム
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_home() -> None:
    attempts = store.all()
    st.markdown("# 🎤 フリオチLAB")
    st.markdown("相手の予測を読み、理解できるズレを作り、短く着地させる練習。正解のボケを当てるゲームではありません。")

    today = date.today()
    st.markdown(f"連続 **{streak_days(attempts, today)}日**　今日 **{sum(attempt_date(a) == today for a in attempts)}問**"
                f"　累計 **{len(attempts)}問**")

    with st.container(border=True):
        st.markdown("### 今日の10分")
        ids, reason = todays_set(attempts)
        st.caption(reason)
        for pid in ids:
            p = get_problem(pid)
            st.markdown(f"- {MODES[p.mode].name}　{esc(p.prompt)}")
        st.button("今日の10分を始める", type="primary", use_container_width=True,
                  on_click=start_queue, args=(ids, "今日の10分"))

    weak = weakness_counts(attempts).most_common(3)
    if weak:
        st.markdown("### 最近の弱点")
        for tag, count in weak:
            info = WEAKNESS_TAGS[tag]
            mode = info["modes"][0]
            cols = st.columns([3, 1])
            cols[0].markdown(f"**{tag}**（{count}回）　{info['description']}")
            cols[1].button(MODES[mode].name, key=f"weak_{tag}", on_click=start_mode, args=(mode,))

    st.markdown("### モードを選ぶ")
    done = attempted_ids(attempts)
    for code in IMPLEMENTED_MODES:
        m = MODES[code]
        bank = problems_for_mode(code)
        solved = sum(p.id in done for p in bank)
        cols = st.columns([3, 1])
        cols[0].markdown(f"**{code} {m.name}**（{m.difficulty}）　{m.what}  \n"
                         f"<span class='meta'>{solved}/{len(bank)}問　主な技能：{m.skill}</span>",
                         unsafe_allow_html=True)
        cols[1].button("練習する", key=f"mode_{code}", on_click=start_mode, args=(code,))
    pending = "、".join(f"{c} {MODES[c].name}" for c in MODES if not MODES[c].implemented)
    st.caption(f"今後追加：{pending}")

    with st.expander("まず試す7日間のパイロット"):
        for day in PILOT_PLAN:
            menu = "、".join(f"{MODES[m].name}×{n}" for m, n in day["menu"])
            line = f"**Day {day['day']}**　{menu or '—'}　ゴール：{day['goal']}"
            if day.get("pending"):
                line += f"  \n<span class='meta'>{day['pending']}</span>"
            cols = st.columns([3, 1])
            cols[0].markdown(line, unsafe_allow_html=True)
            if day["menu"]:
                cols[1].button("始める", key=f"pilot_{day['day']}", on_click=start_queue,
                               args=(pilot_set(day["day"], attempts), f"Day {day['day']}"))

    with st.expander("進行判定（初期仮説）"):
        progress = level_progress(attempts)
        lv1, lv2 = progress[1], progress[2]
        st.markdown(f"**Lv1 {LEVELS[1]['name']}**　基準：{LEVELS[1]['criterion']}")
        st.progress(min(lv1["ok"], 7) / 7,
                    text=f"直近{lv1['done']}問中 {lv1['ok']}問で説明できた" + ("　達成" if lv1["achieved"] else ""))
        st.markdown(f"**Lv2 {LEVELS[2]['name']}**　基準：{LEVELS[2]['criterion']}")
        median_text = f"中央値 {lv2['median']}" if lv2["median"] is not None else "まだ記録なし"
        st.markdown(f"{lv2['done']}問　{median_text}" + ("　達成" if lv2["achieved"] else ""))
        st.caption("解放条件は仮説です。時間制限は設けず、問題はいつでもどれでも解けます。")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 練習（問題画面 → 自己採点 → 結果 → 再挑戦）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_problem_picker() -> None:
    queue = st.session_state.queue
    if queue:
        pos = st.session_state.queue_pos
        cols = st.columns([3, 1])
        cols[0].progress((pos + 1) / len(queue),
                         text=f"{st.session_state.queue_label}　{pos + 1} / {len(queue)}")
        cols[1].button("中断する", on_click=stop_queue)
        return

    cols = st.columns([2, 1])
    mode = cols[0].selectbox(
        "モード", IMPLEMENTED_MODES, key="practice_mode",
        format_func=lambda c: f"{c} {MODES[c].name}",
    )
    cols[1].button("次の問題", on_click=start_mode, args=(mode,), use_container_width=True)

    with st.expander("問題を選ぶ"):
        done = attempted_ids(store.all())
        for p in problems_for_mode(mode):
            mark = "✓" if p.id in done else "　"
            st.button(f"{mark} {p.id}　{p.prompt}", key=f"pick_{p.id}",
                      on_click=start_problem, args=(p.id,))

    coach = get_coach()
    if coach:
        with st.expander("AIで新しい問題を作る"):
            with st.form("generate_form"):
                theme = st.text_input("題材の希望（任意）", placeholder="例：在宅勤務、引っ越し、新人研修")
                submitted = st.form_submit_button(f"{MODES[mode].name}の問題を生成")
            if submitted:
                with st.spinner("問題を作っています…"):
                    try:
                        problem = coach.generate_problem(mode, theme)
                    except CoachError as e:
                        st.error(str(e))
                    else:
                        st.session_state.generated[problem.id] = problem
                        st.session_state.pending_problem = problem.id
                        st.rerun()


def render_problem_card(problem: Problem) -> None:
    mode = MODES[problem.mode]
    level = LEVELS[problem.level]
    origin = "AI生成" if problem.id.startswith("G-") else problem.id
    st.markdown(f"<span class='meta'>{mode.code} {mode.name}　Lv{problem.level} {level['name']}　{origin}</span>",
                unsafe_allow_html=True)
    st.markdown(f"<div class='prompt-card'>{html.escape(problem_display(problem))}</div>", unsafe_allow_html=True)
    if problem.condition:
        st.markdown(f"条件：{esc(problem.condition)}")
    st.markdown(f"{mode.instruction}{limit_note(mode)}")


def render_answer_phase(problem: Problem) -> None:
    mode = MODES[problem.mode]
    rnd = st.session_state.round

    if st.session_state.retry_of:
        prev = store.get(st.session_state.retry_of) or st.session_state.current
        if prev:
            with st.container(border=True):
                st.markdown("**前回の回答**")
                render_answer(problem, prev.answer)
                st.caption("同じお題のまま、別の型や別の尺度で書き換えてみましょう。")

    with st.expander("思考補助"):
        st.markdown(THINKING_AIDS.get(problem.mode, DEFAULT_THINKING_AID))
    if problem.mode != "M03":
        hint_label = "ヒント（ボケが外した尺度）" if problem.mode == "M07" else "ヒント（対照軸）"
        with st.expander(hint_label):
            st.markdown(esc(problem.axis))

    with st.form(f"answer_form_{rnd}"):
        diagnosis = ""
        if problem.mode == "M06":
            diagnosis = st.text_input("弱い理由（一言で）", key=f"diag_{rnd}")
        if mode.answer_count > 1:
            # M04：条件の型ごとに1案ずつ。順番を保ったまま改行でつなぐ
            parts = []
            for i, slot in enumerate(answer_slots(problem)):
                hint = TYPE_HINTS.get(slot)
                parts.append(st.text_input(
                    f"{i + 1}案目　{slot}" + (f"（{hint}）" if hint else ""), key=f"ans_{rnd}_{i + 1}",
                    help=f"{mode.char_limit}字以内が目安" if mode.char_limit else None,
                ).strip())
            answer = "\n".join(parts)
        elif problem.mode in ("M01", "M03", "M07"):
            label = f"{mode.answer_label}{limit_note(mode)}"
            answer = st.text_input(label, key=f"ans_{rnd}").strip()
        else:
            label = f"{mode.answer_label}{limit_note(mode)}"
            answer = st.text_area(label, key=f"ans_{rnd}", height=120,
                                  placeholder="A「…」B「…」A「…」" if problem.mode in ("M05", "M06") else "").strip()
        intent = ""
        if problem.mode != "M03":
            intent_label, intent_placeholder = INTENT_FIELD.get(problem.mode, DEFAULT_INTENT_FIELD)
            intent = st.text_area(intent_label, key=f"intent_{rnd}", height=68, placeholder=intent_placeholder)
        save = st.checkbox("この回答を履歴に保存する", value=True, key=f"save_{rnd}")
        submitted = st.form_submit_button("講評を見る", type="primary", use_container_width=True)

    if not submitted:
        return
    if not answer.strip():
        st.warning(f"{mode.answer_label}を入力してください。")
        return
    if problem.mode == "M06" and not diagnosis.strip():
        st.warning("弱い理由を一言で入力してください。")
        return

    shown_at = st.session_state.shown_at
    draft = {
        "answer": answer,
        "intent": intent.strip(),
        "diagnosis": diagnosis.strip(),
        "save": save,
        "checks": auto_checks(problem, answer),
        "elapsed_sec": max(0, int(time.time() - shown_at)) if shown_at else None,
    }
    st.session_state.draft = draft

    coach = get_coach()
    if coach:
        weak = [t for t, _ in weakness_counts(store.all()).most_common(3)]
        with st.spinner("講評しています…"):
            try:
                ev = coach.evaluate(problem, draft["answer"], draft["intent"], draft["diagnosis"], weak)
            except CoachError as e:
                st.session_state.ai_error = str(e)
                st.session_state.phase = "self_eval"
            else:
                finish_attempt(problem, ev)
    else:
        st.session_state.phase = "self_eval"
    st.rerun()


def finish_attempt(problem: Problem, ev: Evaluation) -> None:
    draft = st.session_state.draft
    attempt = Attempt(
        problem_id=problem.id,
        mode=problem.mode,
        answer=draft["answer"],
        evaluation=ev,
        intent_note=draft["intent"],
        diagnosis=draft["diagnosis"],
        retry_of=st.session_state.retry_of,
        problem_snapshot=problem.to_dict() if problem.id.startswith("G-") else None,
        elapsed_sec=draft.get("elapsed_sec"),
    )
    if draft["save"]:
        store.add(attempt)
    st.session_state.current = attempt
    st.session_state.saved = draft["save"]
    st.session_state.phase = "result"


def render_checks(checks) -> None:
    for c in checks:
        (st.warning if c.level == "warn" else st.info)(c.message)


def render_self_eval_phase(problem: Problem) -> None:
    draft = st.session_state.draft
    rnd = st.session_state.round
    if st.session_state.ai_error:
        st.warning(f"{st.session_state.ai_error}　自己採点で進めます。")

    st.markdown("##### あなたの回答")
    if draft["diagnosis"]:
        st.markdown(f"弱い理由：{esc(draft['diagnosis'])}")
    render_answer(problem, draft["answer"])
    if MODES[problem.mode].answer_count == 1:
        st.caption(f"{char_count(draft['answer'])}字")
    if draft["intent"]:
        st.markdown(f"狙い：{esc(draft['intent'])}")
    render_checks(draft["checks"])

    with st.container(border=True):
        render_design_intent(problem)
        st.markdown("**成立例**（唯一解ではありません）")
        render_examples(problem)

    st.markdown("##### 自己採点")
    st.caption("出題側の想定と比べて、各軸を0〜2点で付けてください。想定と違う答えでも、構造が成立していれば点を付けてかまいません。")
    rubric = RUBRICS[MODES[problem.mode].rubric]
    default_safety = "check_context" if any(c.tag == "危険性" for c in draft["checks"]) else "ok"
    with st.form(f"self_eval_form_{rnd}"):
        scores = {}
        for axis in rubric:
            scores[axis.key] = st.select_slider(
                axis.name, options=[0, 1, 2], value=1, key=f"score_{axis.key}_{rnd}",
                format_func=lambda v, a=axis: f"{v}点　{a.levels[v]}",
            )
        safety = st.radio(
            "安全性（点数とは別枠）", list(SAFETY_STATUS), key=f"safety_{rnd}",
            index=list(SAFETY_STATUS).index(default_safety),
            format_func=lambda s: SAFETY_STATUS[s], horizontal=True,
        )
        submitted = st.form_submit_button("採点を記録", type="primary", use_container_width=True)
    if submitted:
        ev = self_evaluation(problem, scores, safety, draft["checks"])
        finish_attempt(problem, ev)
        st.rerun()


def render_result_phase(problem: Problem) -> None:
    attempt: Attempt = st.session_state.current
    draft = st.session_state.draft
    rnd = st.session_state.round
    ev = attempt.evaluation

    st.markdown("##### あなたの回答")
    if attempt.diagnosis:
        st.markdown(f"弱い理由：{esc(attempt.diagnosis)}")
    render_answer(problem, attempt.answer)
    if attempt.elapsed_sec is not None:
        st.caption(f"制作時間 {fmt_sec(attempt.elapsed_sec)}")
    if draft and draft["checks"] and ev.source == "ai":
        render_checks(draft["checks"])

    if ev.confidence == "low" and ev.clarifying_question:
        with st.container(border=True):
            st.markdown(f"**確認させてください**　{esc(ev.clarifying_question)}")
            with st.form(f"clarify_form_{rnd}"):
                reply = st.text_area("狙ったズレ", key=f"clarify_{rnd}", height=68)
                again = st.form_submit_button("狙いを伝えて講評し直す")
            if again and reply.strip():
                coach = get_coach()
                if coach:
                    note = f"{attempt.intent_note}\n{reply.strip()}".strip()
                    with st.spinner("講評し直しています…"):
                        try:
                            new_ev = coach.evaluate(problem, attempt.answer, note, attempt.diagnosis)
                        except CoachError as e:
                            st.error(str(e))
                        else:
                            attempt.evaluation = new_ev
                            attempt.intent_note = note
                            if st.session_state.saved:
                                store.update(attempt.id, evaluation=new_ev, intent_note=note)
                            st.rerun()

    render_evaluation(ev, problem)

    if ev.source == "ai":
        with st.expander("出題側の想定と成立例"):
            render_design_intent(problem)
            render_examples(problem)
        with st.expander("自分の評価と比べる"):
            rubric = RUBRICS[ev.rubric]
            with st.form(f"compare_form_{rnd}"):
                mine = {
                    axis.key: st.select_slider(
                        axis.name, options=[0, 1, 2], value=1, key=f"mine_{axis.key}_{rnd}",
                        format_func=lambda v, a=axis: f"{v}点　{a.levels[v]}",
                    )
                    for axis in rubric
                }
                compared = st.form_submit_button("比べる")
            if compared:
                attempt.self_scores = mine
                if st.session_state.saved:
                    store.update(attempt.id, self_scores=mine)
            if attempt.self_scores:
                for axis in rubric:
                    a_score = ev.scores.get(axis.key, 0)
                    m_score = attempt.self_scores.get(axis.key, 0)
                    gap = "" if a_score == m_score else ("　自分の評価が高め" if m_score > a_score else "　自分の評価が低め")
                    st.markdown(f"{axis.name}：AI {a_score}　自分 {m_score}{gap}")

    with st.container(border=True):
        # 新しい回答は未選択から始まる。選んだ値はウィジェットの状態として同じ回のあいだ残る
        sat = st.radio(
            "自分の出来への満足度（任意）", list(SATISFACTION), key=f"sat_{rnd}", horizontal=True,
            index=None, format_func=SATISFACTION.get,
        )
        st.caption("点数とは別に、自分がどれくらい気に入ったかを残しておくと、あとで見返すときの手がかりになります。")
        if sat != attempt.satisfaction:
            attempt.satisfaction = sat
            if st.session_state.saved:
                store.update(attempt.id, satisfaction=sat)

    st.divider()
    c1, c2 = st.columns(2)
    c1.button("同じお題でもう一度作る", on_click=retry_same, use_container_width=True)
    c2.button("次の問題へ", on_click=go_next, type="primary", use_container_width=True)

    if st.session_state.saved:
        with st.expander("保存・実演メモ"):
            fav = st.checkbox("お気に入りに入れる", value=attempt.favorite, key=f"fav_{rnd}")
            if fav != attempt.favorite:
                attempt.favorite = fav
                store.update(attempt.id, favorite=fav)
            memo = st.text_area("実際に使ってみた反応（実演メモ）", value=attempt.performance_memo,
                                key=f"memo_{rnd}", height=68)
            if st.button("メモを保存", key=f"memo_save_{rnd}"):
                attempt.performance_memo = memo
                store.update(attempt.id, performance_memo=memo)
                st.success("保存しました。")
    else:
        st.caption("この回答は履歴に保存していません。")


def render_practice() -> None:
    if st.session_state.flash:
        st.success(st.session_state.flash)
        st.session_state.flash = ""

    render_problem_picker()
    problem = get_problem(st.session_state.problem_id)
    if problem is None:
        st.info("モードを選んで「次の問題」を押すと始まります。")
        return

    render_problem_card(problem)
    phase = st.session_state.phase
    if phase == "answer":
        render_answer_phase(problem)
    elif phase == "self_eval":
        render_self_eval_phase(problem)
    else:
        render_result_phase(problem)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# マイノート
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_notes() -> None:
    st.markdown("# 📒 マイノート")
    attempts = store.all()
    if not attempts:
        st.info("まだ回答がありません。練習で講評を受けると、ここに保存されます。")
        return

    summary = sorted(mode_summary(attempts).items())
    for start in range(0, len(summary), 4):
        row = summary[start:start + 4]
        for col, (mode, s) in zip(st.columns(4), row):
            col.metric(MODES[mode].name, f"{s['count']}問")
            col.caption(f"平均 {s['avg_ratio'] * 100:.0f}%")

    effort = effort_summary(attempts)
    effort_parts = []
    if effort["median_sec"] is not None:
        effort_parts.append(f"制作時間の中央値 {fmt_sec(effort['median_sec'])}（{effort['timed']}問）")
    if effort["avg_satisfaction"] is not None:
        effort_parts.append(f"自己満足度の平均 {effort['avg_satisfaction']:.1f}（{effort['rated']}問）")
    if effort_parts:
        st.caption("　".join(effort_parts))

    weak = weakness_counts(attempts, recent=len(attempts))
    if weak:
        st.markdown("弱点タグの累計：" + "　".join(f"`{t}` {n}" for t, n in weak.most_common()))

    view = st.radio("表示", ["すべて", "お気に入り", "実演メモあり"], horizontal=True)
    if view == "お気に入り":
        attempts = [a for a in attempts if a.favorite]
    elif view == "実演メモあり":
        attempts = [a for a in attempts if a.performance_memo]

    for a in reversed(attempts):
        problem = resolve_problem(a)
        prompt = problem.prompt if problem else a.problem_id
        star = "★ " if a.favorite else ""
        title = (f"{star}{a.created_at[:10]}　{MODES[a.mode].name}　{prompt[:24]}　"
                 f"{a.evaluation.total}/{a.evaluation.max_total}")
        with st.expander(title):
            if a.diagnosis:
                st.markdown(f"弱い理由：{esc(a.diagnosis)}")
            render_answer(problem, a.answer)
            meta = []
            if a.elapsed_sec is not None:
                meta.append(f"制作時間 {fmt_sec(a.elapsed_sec)}")
            if a.satisfaction is not None:
                meta.append(f"自己満足度 {a.satisfaction}/5")
            if meta:
                st.caption("　".join(meta))
            if a.intent_note:
                st.markdown(f"狙い：{esc(a.intent_note)}")
            ev = a.evaluation
            st.markdown(f"期待：{esc(ev.detected_expectation)}")
            if ev.one_revision:
                st.markdown(f"修正案：{esc(ev.one_revision)}")
            if ev.tags:
                st.markdown("　".join(f"`{t}`" for t in ev.tags))
            if a.retry_of:
                st.caption("再挑戦の回答")

            fav = st.checkbox("お気に入り", value=a.favorite, key=f"note_fav_{a.id}")
            if fav != a.favorite:
                store.update(a.id, favorite=fav)
                st.rerun()
            memo = st.text_area("実演メモ", value=a.performance_memo, key=f"note_memo_{a.id}", height=68)
            c1, c2, c3 = st.columns(3)
            if c1.button("メモを保存", key=f"note_save_{a.id}"):
                store.update(a.id, performance_memo=memo)
                st.rerun()
            if problem:
                if problem.id.startswith("G-"):
                    st.session_state.generated[problem.id] = problem
                c2.button("このお題で再挑戦", key=f"note_retry_{a.id}",
                          on_click=start_problem, args=(problem.id, a.id))
            if c3.button("削除", key=f"note_del_{a.id}"):
                store.delete(a.id)
                st.rerun()

    st.download_button("履歴をJSONで書き出す", store.export_json(),
                       file_name="furiochi_history.json", mime="application/json")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 型の辞典（研究資料）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def source_link(no: int | None) -> str:
    if no is None or no not in SOURCES:
        return "概要レベルで紹介"
    s = SOURCES[no]
    return f"[{s['title']}]({s['url']})"


def render_dictionary() -> None:
    st.markdown("# 📚 型の辞典")
    st.info(DEFINITION)
    tabs = st.tabs(["基本構造", "12の基本型", "20の技法", "作品分析", "作り方"])

    with tabs[0]:
        st.markdown("##### フリから反応まで")
        st.table([{"段階": r["stage"], "聞き手の認知": r["cognition"], "例：AI研修": r["example"]}
                  for r in BASIC_FLOW])
        st.markdown("##### フリの3つの機能")
        for f in FURI_FUNCTIONS:
            st.markdown(f"- {f}")
        st.markdown("##### 理論的な背景")
        st.table([{"視点": t["name"], "要点": t["point"], "作問への示唆": t["for_writing"]}
                  for t in THEORIES])
        st.caption("これらは笑いを説明する有力な理論・分類であり、一定の構造なら必ず笑うことを保証するものではない。")
        st.markdown("##### 分類の3階層")
        st.table([{"階層": r["layer"], "分類軸": r["axis"], "主な選択肢": r["options"]} for r in LAYERS])

    with tabs[1]:
        st.table([{"型": f"{t['no']:02d} {t['name']}", "予測の反転軸": t["flip"], "例": t["example"]}
                  for t in BASIC_TYPES])
        st.markdown("##### オリジナル応用例（元ネタの引用ではない）")
        for ex in ORIGINAL_EXAMPLES:
            st.markdown(f"**{ex['title']}**〔{ex['pattern']}〕  \n{ex['dialogue']}  \n"
                        f"<span class='meta'>{ex['breakdown']}</span>", unsafe_allow_html=True)
        st.caption("練習用の創作です。実際に起きていない出来事を、事実のエピソードとして話すことは推奨しません。")

    with tabs[2]:
        st.table([{"技法": f"{t['no']:02d} {t['name']}", "操作": t["operation"], "観察例": t["seen_in"]}
                  for t in TECHNIQUES])

    with tabs[3]:
        st.caption("台詞は転載せず、筋立てを独自に要約しています。技法名は分析用の整理で、制作者本人の用語ではありません。")
        for label, works in (("国内", DOMESTIC_WORKS), ("海外", OVERSEAS_WORKS)):
            st.markdown(f"##### {label}")
            for w in works:
                with st.expander(f"{w['id']} {w['title']}　〔{w['core']}〕"):
                    st.markdown(f"構造：{w['structure']}")
                    st.markdown(f"転用技術：{w['transfer']}")
                    st.markdown(f"確認区分：{source_link(w['source'])}")

    with tabs[4]:
        st.markdown("##### ネタ制作の6ステップ")
        for i, step in enumerate(PRODUCTION_STEPS, 1):
            st.markdown(f"{i}. {step}")
        st.markdown("##### よくある失敗")
        st.table([{"失敗": f["failure"], "直し方": f["fix"]} for f in COMMON_FAILURES])
        st.markdown("##### 実践の進め方")
        st.table([{"期間": p["period"], "主な課題": p["task"], "確認ポイント": p["check"]}
                  for p in PRACTICE_PLAN])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ルーティング
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

page = st.session_state.page
if page == HOME:
    render_home()
elif page == PRACTICE:
    render_practice()
elif page == NOTES:
    render_notes()
else:
    render_dictionary()
