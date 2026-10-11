"""フリオチLAB のテスト

python -m pytest tests/ で実行する。AI講評は偽のクライアントで検証し、APIは呼ばない。
"""

from datetime import date, datetime, timedelta
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from furiochi_lab.data.modes import IMPLEMENTED_MODES, LEVELS, MODES, PILOT_PLAN, RUBRICS, WEAKNESS_TAGS
from furiochi_lab.data.problems import PROBLEMS, PROBLEMS_BY_ID, problems_for_mode
from furiochi_lab.data.taxonomy import BASIC_TYPE_NAMES, TECHNIQUE_NAMES
from furiochi_lab.engine import ai_coach
from furiochi_lab.engine.ai_coach import (
    CoachError, FuriochiCoach, build_evaluation_request, evaluation_schema, to_evaluation,
)
from furiochi_lab.engine.history import HistoryStore, level_progress, streak_days, weakness_counts
from furiochi_lab.engine.rubric import auto_checks, derive_tags, self_evaluation
from furiochi_lab.engine.selector import pilot_set, todays_set
from furiochi_lab.models.drill import Attempt, Evaluation

ROOT = Path(__file__).resolve().parents[1]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 問題バンク
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_bank_meets_mvp_minimum():
    # 設計書 12章：MVPは最低30問
    assert len(PROBLEMS) >= 30
    assert len(PROBLEMS_BY_ID) == len(PROBLEMS), "IDが重複している"
    for code in IMPLEMENTED_MODES:
        assert len(problems_for_mode(code)) >= 8, code


@pytest.mark.parametrize("problem", PROBLEMS, ids=lambda p: p.id)
def test_problem_is_complete(problem):
    known_patterns = set(BASIC_TYPE_NAMES) | set(TECHNIQUE_NAMES)
    assert problem.mode in IMPLEMENTED_MODES
    assert problem.level in LEVELS
    assert problem.prompt and problem.expectation and problem.axis
    assert problem.pattern in known_patterns
    assert problem.examples, "成立例がない"
    for ex in problem.examples:
        assert ex.pattern in known_patterns, ex.pattern
    if problem.mode == "M01":
        limit = MODES["M01"].char_limit
        assert all(len(ex.text) <= limit for ex in problem.examples), "成立例が字数の目安を超えている"
    if problem.mode == "M05":
        assert problem.condition
        assert problem.pattern in problem.condition, "型の指定と想定の型が食い違っている"
    if problem.mode == "M06":
        assert problem.weak_reason


def test_weakness_tags_point_to_known_modes():
    for tag, info in WEAKNESS_TAGS.items():
        assert all(m in MODES for m in info["modes"]), tag


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 採点
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_auto_checks_flag_length_and_explanation():
    f01 = PROBLEMS_BY_ID["F01"]
    assert auto_checks(f01, "12時間しか寝れなくて") == []

    long = auto_checks(f01, "12時間しか寝れなくて。つまり寝すぎて逆に眠いってことなんですけど、わかりますかね")
    tags = {c.tag for c in long}
    assert "オチが長い" in tags
    assert "説明過多" in tags


def test_auto_checks_dialogue_and_harsh_words():
    c01 = PROBLEMS_BY_ID["C01"]
    assert any(c.tag == "会話の不自然さ" for c in auto_checks(c01, "自立の方法を親に聞いた"))
    assert not any(c.tag == "会話の不自然さ" for c in auto_checks(c01, "A「自立する」B「何から？」A「親に聞く」"))
    assert any(c.tag == "危険性" for c in auto_checks(PROBLEMS_BY_ID["F05"], "社員全員デブです"))


def test_self_evaluation_neta():
    f01 = PROBLEMS_BY_ID["F01"]
    ev = self_evaluation(f01, {"expectation": 2, "contrast": 0, "clarity": 1,
                               "naturalness": 2, "brevity": 0}, "ok", [])
    assert ev.total == 5 and ev.max_total == 10
    assert ev.relevance == "unrelated"
    assert "反対軸が不明" in ev.tags and "オチが長い" in ev.tags
    assert len(ev.improvements) == 2
    assert ev.alternatives == f01.examples


def test_self_evaluation_prediction_and_safety():
    p01 = PROBLEMS_BY_ID["P01"]
    ev = self_evaluation(p01, {"specificity": 2, "match": 2}, "needs_revision", [])
    assert ev.rubric == "prediction" and ev.max_total == 4
    assert ev.tags == ["危険性"]


def test_derive_tags_prefers_explanation_when_detected():
    from furiochi_lab.engine.rubric import Check
    scores = {"expectation": 2, "contrast": 2, "clarity": 2, "naturalness": 2, "brevity": 0}
    assert derive_tags("neta", scores, [Check("warn", "", "説明過多")]) == ["説明過多"]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 履歴
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def make_attempt(pid: str, scores: dict, tags=(), created: datetime | None = None) -> Attempt:
    p = PROBLEMS_BY_ID[pid]
    rubric = MODES[p.mode].rubric
    ev = Evaluation(source="self", rubric=rubric, scores=scores, tags=list(tags))
    a = Attempt(problem_id=pid, mode=p.mode, answer="x", evaluation=ev)
    if created:
        a.created_at = created.isoformat(timespec="seconds")
    return a


FULL = {"expectation": 2, "contrast": 2, "clarity": 2, "naturalness": 2, "brevity": 2}


def test_history_round_trip(tmp_path):
    path = tmp_path / "history.json"
    store = HistoryStore(path)
    a = make_attempt("F01", FULL, tags=["説明過多"])
    store.add(a)
    store.update(a.id, favorite=True, performance_memo="同僚に言ったら笑った")

    reloaded = HistoryStore(path)
    got = reloaded.get(a.id)
    assert got.favorite and got.performance_memo == "同僚に言ったら笑った"
    assert got.evaluation.total == 10
    assert json.loads(path.read_text(encoding="utf-8"))["version"] == 1

    reloaded.delete(a.id)
    assert HistoryStore(path).all() == []


def test_two_stores_do_not_overwrite_each_other(tmp_path):
    # Web版とターミナル版を同時に開いた状況
    path = tmp_path / "history.json"
    web, cli = HistoryStore(path), HistoryStore(path)
    web.add(make_attempt("F01", FULL))
    cli.add(make_attempt("F02", FULL))
    assert {a.problem_id for a in HistoryStore(path).all()} == {"F01", "F02"}


def test_broken_history_is_kept_aside(tmp_path):
    path = tmp_path / "history.json"
    path.write_text("{壊れたJSON", encoding="utf-8")
    store = HistoryStore(path)
    assert store.all() == []
    assert list(tmp_path.glob("history.broken-*.json"))


def test_streak_days():
    today = date(2026, 10, 11)
    at = lambda d: make_attempt("F01", FULL, created=datetime.combine(today - timedelta(days=d), datetime.min.time()))
    assert streak_days([at(0), at(1), at(2), at(4)], today) == 3
    # 今日まだ解いていなくても、昨日までの連続は途切れない
    assert streak_days([at(1), at(2)], today) == 2
    assert streak_days([at(3)], today) == 0


def test_level_progress():
    lv1 = [make_attempt("F01", FULL) for _ in range(7)] + [
        make_attempt("F02", {**FULL, "contrast": 0}) for _ in range(3)]
    lv2 = [make_attempt("O01", FULL) for _ in range(5)]
    progress = level_progress(lv1 + lv2)
    assert progress[1] == {"done": 10, "ok": 7, "achieved": True}
    assert progress[2]["median"] == 10 and progress[2]["achieved"]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 出題の選び方
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_todays_set_default_and_weakness_focus():
    ids, _ = todays_set([])
    assert len(ids) == 5 and len(set(ids)) == 5
    assert PROBLEMS_BY_ID[ids[0]].mode == "M03"

    weak = [make_attempt("F01", FULL, tags=["説明過多"]) for _ in range(3)]
    ids, reason = todays_set(weak)
    assert "説明過多" in reason
    assert [PROBLEMS_BY_ID[i].mode for i in ids[:2]] == ["M06", "M01"]


def test_pilot_days_fill_their_menus():
    for day in PILOT_PLAN:
        expected = sum(n for _, n in day["menu"])
        assert len(pilot_set(day["day"], [])) == expected


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI講評（偽のクライアント）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI_RESULT = {
    "detected_expectation": "睡眠時間がかなり短かった、という話が来る",
    "deviation": "12時間という長さで予測を反転できています",
    "deviation_axis": "睡眠時間",
    "relevance": "related",
    "scores": {k: {"score": s, "reason": "根拠"} for k, s in
               {"expectation": 2, "contrast": 2, "clarity": 2, "naturalness": 1, "brevity": 5}.items()},
    "safety_status": "ok",
    "safety_note": "",
    "good_point": "数値が一瞬で伝わる",
    "improvements": ["真顔で言って間を置く", "二つ目", "三つ目"],
    "one_revision": "12時間しか寝られなくて",
    "alternatives": [{"text": "朝の10時に起きちゃって", "pattern": "数量逆転", "why": "時刻で伝える"}],
    "tags": ["説明過多", "存在しないタグ"],
    "confidence": "high",
    "clarifying_question": "",
}


class FakeMessages:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self.response


def fake_client(payload: dict | None, stop_reason: str = "end_turn"):
    content = [SimpleNamespace(type="thinking", thinking="")]
    if payload is not None:
        content.append(SimpleNamespace(type="text", text=json.dumps(payload, ensure_ascii=False)))
    response = SimpleNamespace(stop_reason=stop_reason, content=content)
    return SimpleNamespace(messages=FakeMessages(response), beta=SimpleNamespace(messages=FakeMessages(response)))


def test_evaluate_sends_structured_request_with_fallback():
    client = fake_client(AI_RESULT)
    coach = FuriochiCoach(client=client, model="claude-opus-5-5", effort="medium")
    ev = coach.evaluate(PROBLEMS_BY_ID["F01"], "12時間しか寝れなくて", intent_note="睡眠時間で反転")

    call = client.beta.messages.calls[0]
    assert call["model"] == "claude-opus-5-5"
    assert call["fallbacks"] == "default"
    assert call["betas"] == [ai_coach.FALLBACK_BETA]
    assert call["output_config"]["effort"] == "medium"
    assert call["output_config"]["format"]["type"] == "json_schema"
    assert "睡眠時間で反転" in call["messages"][0]["content"]

    assert ev.source == "ai"
    assert ev.scores["brevity"] == 2, "範囲外の点数は0〜2に収める"
    assert ev.total == 9
    assert len(ev.improvements) == 2
    assert ev.tags == ["説明過多"]


def test_other_models_skip_fallback():
    client = fake_client(AI_RESULT)
    FuriochiCoach(client=client, model="claude-haiku-5-5").evaluate(PROBLEMS_BY_ID["F01"], "12時間")
    assert client.messages.calls and not client.beta.messages.calls


def test_refusal_and_bad_output_raise_coach_error():
    with pytest.raises(CoachError):
        FuriochiCoach(client=fake_client(None, "refusal")).evaluate(PROBLEMS_BY_ID["F01"], "x")
    bad = fake_client(None)
    bad.beta.messages.response.content.append(SimpleNamespace(type="text", text="not json"))
    with pytest.raises(CoachError):
        FuriochiCoach(client=bad).evaluate(PROBLEMS_BY_ID["F01"], "x")


def test_low_confidence_keeps_question_and_safety_adds_tag():
    data = {**AI_RESULT, "confidence": "low", "clarifying_question": "どの軸で外しましたか？",
            "safety_status": "needs_revision", "tags": []}
    ev = to_evaluation(data, "neta")
    assert ev.clarifying_question == "どの軸で外しましたか？"
    assert ev.tags == ["危険性"]


def test_schemas_are_strict_objects():
    def walk(node):
        if node.get("type") == "object":
            assert node["additionalProperties"] is False
            assert set(node["required"]) == set(node["properties"])
            for child in node["properties"].values():
                walk(child)
        if node.get("type") == "array":
            walk(node["items"])

    for rubric in RUBRICS:
        walk(evaluation_schema(rubric))
    walk(ai_coach.GENERATION_SCHEMA)


def test_request_separates_examples_from_scoring():
    text = build_evaluation_request(PROBLEMS_BY_ID["R05"], "A「朝は強い」B「何時？」A「11時」",
                                    diagnosis="説明しすぎ")
    assert "<reference_examples>" in text and "<learner>" in text
    assert "利用者の診断（弱い理由）：説明しすぎ" in text
    assert "出題側が想定する弱点" in text


def test_generate_problem():
    payload = {"prompt": "このプロジェクト、絶対に成功させます", "condition": "", "expectation": "成功に向けて努力する",
               "axis": "成功と失敗", "pattern": "能力逆転",
               "examples": [{"text": "まず失敗例を集めてます", "pattern": "目的逆転", "note": ""}],
               "focus": "", "scoring_hint": "", "weak_reason": "無視される"}
    problem = FuriochiCoach(client=fake_client(payload)).generate_problem("M01")
    assert problem.id.startswith("G-") and problem.mode == "M01" and problem.level == 1
    assert problem.weak_reason == ""
    with pytest.raises(CoachError):
        FuriochiCoach(client=fake_client({**payload, "prompt": ""})).generate_problem("M01")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Streamlit アプリ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@pytest.fixture
def app(tmp_path, monkeypatch):
    from streamlit.testing.v1 import AppTest
    monkeypatch.setenv("FURIOCHI_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("FURIOCHI_AI", "off")
    at = AppTest.from_file(str(ROOT / "furiochi_app.py"), default_timeout=30)
    at.run()
    assert not at.exception
    return at


def test_app_self_eval_loop(app, tmp_path):
    app.button(key="mode_M01").click().run()
    assert not app.exception
    assert app.session_state.problem_id == "F01"

    app.text_input(key="ans_1").input("12時間しか寝れなくて")
    next(b for b in app.button if b.label == "講評を見る").click().run()
    assert not app.exception
    assert app.session_state.phase == "self_eval"

    for key in ("expectation", "contrast", "clarity", "naturalness", "brevity"):
        app.select_slider(key=f"score_{key}_1").set_value(2)
    next(b for b in app.button if b.label == "採点を記録").click().run()
    assert not app.exception
    assert app.session_state.phase == "result"

    saved = json.loads((tmp_path / "history.json").read_text(encoding="utf-8"))["attempts"]
    assert len(saved) == 1 and saved[0]["evaluation"]["scores"]["contrast"] == 2

    # 同じお題で再挑戦すると、前回の回答とつながる
    next(b for b in app.button if b.label == "同じお題でもう一度作る").click().run()
    assert not app.exception
    assert app.session_state.phase == "answer"
    assert app.session_state.retry_of == saved[0]["id"]


def test_app_today_queue_and_m06(app):
    next(b for b in app.button if b.label == "今日の10分を始める").click().run()
    assert not app.exception
    assert len(app.session_state.queue) == 5

    next(b for b in app.button if b.label == "中断する").click().run()
    assert app.session_state.queue == []
    app.selectbox(key="practice_mode").set_value("M06").run()
    next(b for b in app.button if b.label == "次の問題").click().run()
    assert app.session_state.problem_id == "R01"
    rnd = app.session_state.round
    app.text_area(key=f"ans_{rnd}").input("A「うちの家系に100年ぶりの大事件が」B「なに？」A「父がカレーを温めた」")
    next(b for b in app.button if b.label == "講評を見る").click().run()
    # 診断が空なら先へ進まない
    assert app.session_state.phase == "answer"
    app.text_input(key=f"diag_{rnd}").input("フリが弱い")
    next(b for b in app.button if b.label == "講評を見る").click().run()
    assert not app.exception
    assert app.session_state.phase == "self_eval"


@pytest.mark.parametrize("page", ["📒 マイノート", "📚 型の辞典"])
def test_app_pages_render(app, page):
    app.sidebar.radio[0].set_value(page).run()
    assert not app.exception


class FakeCoach:
    """アプリに差し込む偽のコーチ。1回目は自信が低く、確認後は通常の講評を返す"""

    def __init__(self):
        self.calls = []

    def evaluate(self, problem, answer, intent_note="", diagnosis="", weak_tags=()):
        self.calls.append(intent_note)
        if len(self.calls) == 1:
            return to_evaluation({**AI_RESULT, "confidence": "low",
                                  "clarifying_question": "どの尺度で外しましたか？"}, "neta")
        return to_evaluation(AI_RESULT, "neta")


def test_app_ai_feedback_flow(tmp_path, monkeypatch):
    from streamlit.testing.v1 import AppTest
    monkeypatch.setenv("FURIOCHI_DATA_DIR", str(tmp_path))
    monkeypatch.delenv("FURIOCHI_AI", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "dummy")
    at = AppTest.from_file(str(ROOT / "furiochi_app.py"), default_timeout=30)
    coach = FakeCoach()
    at.session_state["coach"] = coach
    at.run()

    at.button(key="mode_M01").click().run()
    at.text_input(key="ans_1").input("12時間しか寝れなくて")
    next(b for b in at.button if b.label == "講評を見る").click().run()
    assert not at.exception
    assert at.session_state.phase == "result"
    assert any("どの尺度で外しましたか" in m.value for m in at.markdown)

    at.text_area(key="clarify_1").input("睡眠時間の長短で反転させた")
    next(b for b in at.button if b.label == "狙いを伝えて講評し直す").click().run()
    assert not at.exception
    assert "睡眠時間の長短で反転させた" in coach.calls[-1]
    assert not any("どの尺度で外しましたか" in m.value for m in at.markdown)

    for key in ("expectation", "contrast", "clarity", "naturalness", "brevity"):
        at.select_slider(key=f"mine_{key}_1").set_value(2)
    next(b for b in at.button if b.label == "比べる").click().run()
    assert not at.exception
    saved = json.loads((tmp_path / "history.json").read_text(encoding="utf-8"))["attempts"][0]
    assert saved["evaluation"]["source"] == "ai"
    assert saved["evaluation"]["confidence"] == "high"
    assert saved["self_scores"]["naturalness"] == 2
