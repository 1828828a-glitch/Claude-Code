"""フリオチLAB のテスト

python -m pytest tests/ で実行する。AI講評は偽のクライアントで検証し、APIは呼ばない。
"""

from datetime import date, datetime, timedelta
import json
from pathlib import Path
import re
from types import SimpleNamespace

import pytest

from furiochi_lab.data.modes import IMPLEMENTED_MODES, LEVELS, MODES, PILOT_PLAN, RUBRICS, WEAKNESS_TAGS
from furiochi_lab.data.problems import PROBLEMS, PROBLEMS_BY_ID, problems_for_mode
from furiochi_lab.data.taxonomy import BASIC_TYPE_NAMES, TECHNIQUE_NAMES
from furiochi_lab.engine import ai_coach
from furiochi_lab.engine.ai_coach import (
    CoachError, FuriochiCoach, build_evaluation_request, evaluation_schema, to_evaluation,
)
from furiochi_lab.engine.history import (
    HistoryStore, effort_summary, explained_structure, level_progress, streak_days, weakness_counts,
)
from furiochi_lab.engine.rubric import Check, auto_checks, derive_tags, self_evaluation, split_answers
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
    assert WEAKNESS_TAGS["繰り返し依存"]["modes"] == ["M04", "M05"]


def test_new_modes_follow_the_contract():
    m04, m07 = MODES["M04"], MODES["M07"]
    assert m04.implemented and m04.answer_count == 3 and m04.char_limit == 40 and m04.rubric == "trio"
    assert m07.implemented and m07.answer_count == 1 and m07.char_limit == 30 and m07.rubric == "tsukkomi"
    assert [a.key for a in RUBRICS["trio"]] == ["variety", "validity", "clarity", "brevity"]
    assert [a.key for a in RUBRICS["tsukkomi"]] == ["pinpoint", "standard", "brevity", "tone"]
    assert all(m.answer_count == 1 for code, m in MODES.items() if code != "M04")


M04_BANK = problems_for_mode("M04")
M07_BANK = problems_for_mode("M07")


def test_m04_bank_ids_and_count():
    assert [p.id for p in M04_BANK] == [f"D{i:02d}" for i in range(1, 9)]


@pytest.mark.parametrize("problem", M04_BANK, ids=lambda p: p.id)
def test_m04_problem_has_three_types_and_matching_examples(problem):
    known = set(BASIC_TYPE_NAMES) | set(TECHNIQUE_NAMES)
    types = problem.condition.split("／")
    assert problem.level == 3
    assert "「" not in problem.prompt and "」" not in problem.prompt, "フリはカギ括弧なしの一言"
    assert len(types) == 3 and len(set(types)) == 3, "条件は互いに違う3つの型"
    assert all(t in known for t in types), types
    assert problem.condition_types() == types
    assert problem.pattern == types[0]
    assert [ex.pattern for ex in problem.examples] == types, "成立例は条件の型と同じ順に1案ずつ"
    assert all(len(ex.text) <= MODES["M04"].char_limit for ex in problem.examples)
    assert problem.focus and problem.scoring_hint and problem.scene


def test_d01_is_the_design_doc_sample():
    d01 = PROBLEMS_BY_ID["D01"]
    assert d01.prompt == "AI研修で人生が変わりました"
    assert d01.condition == "大小逆転／解釈転換／自己矛盾"
    assert [ex.text for ex in d01.examples] == [
        "朝起きる時間が5分早くなった", "転職してAIと無関係な仕事に", "AIが大事と言いながら一度も使っていない"]


def test_m07_bank_ids_and_count():
    assert [p.id for p in M07_BANK] == [f"T{i:02d}" for i in range(1, 11)]


@pytest.mark.parametrize("problem", M07_BANK, ids=lambda p: p.id)
def test_m07_problem_is_a_dialogue_ending_with_a_boke(problem):
    speakers = re.findall(r"([AB])「", problem.prompt)
    assert problem.level == 2
    assert problem.prompt.startswith("A「") and problem.prompt.endswith("」")
    assert len(speakers) >= 3 and speakers[-1] == "A", "最後はAのボケで終わる"
    assert speakers == ["A", "B"] * (len(speakers) // 2) + ["A"] * (len(speakers) % 2), "AとBが交互に話す"
    assert 2 <= len(problem.examples) <= 3
    assert all(len(ex.text) <= MODES["M07"].char_limit for ex in problem.examples)
    assert all(ex.pattern == problem.pattern for ex in problem.examples)
    assert problem.expectation and problem.axis and problem.focus and problem.scoring_hint and problem.scene
    assert not problem.condition and not problem.weak_reason


def test_m07_design_doc_samples():
    expected = {
        "T01": "一番有名なところ通ってないんかい！",
        "T02": "それ調理前の準備だろ！",
        "T03": "年1回は趣味じゃなくて行事だよ！",
        "T04": "今その宣言の一番大事なところ破ったよ！",
    }
    for pid, line in expected.items():
        assert PROBLEMS_BY_ID[pid].examples[0].text == line
    assert len({p.pattern for p in M07_BANK}) >= 8, "ボケの型がばらけている"


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
    scores = {"expectation": 2, "contrast": 2, "clarity": 2, "naturalness": 2, "brevity": 0}
    assert derive_tags("neta", scores, [Check("warn", "", "説明過多")]) == ["説明過多"]


def test_auto_checks_m04_counts_answers_and_checks_each_length():
    d01 = PROBLEMS_BY_ID["D01"]
    assert auto_checks(d01, "朝起きる時間が5分早くなった\n転職してAIと無関係な仕事に\nAIが大事と言いながら一度も使っていない") == []

    short = auto_checks(d01, "朝起きる時間が5分早くなった\n\nAIが大事と言いながら一度も使っていない")
    assert len(short) == 1 and short[0].level == "warn" and "2案しか" in short[0].message

    # 3案合わせると40字を超えるが、1案ずつなら目安の内側
    assert not any(c.tag == "オチが長い" for c in auto_checks(d01, "あ" * 30 + "\n" + "い" * 30 + "\n" + "う" * 30))

    long = auto_checks(d01, "朝5分早起き\n" + "転職して" * 11 + "\n使っていない")
    assert [c.tag for c in long] == ["オチが長い"] and long[0].message.startswith("2案目")

    explained = auto_checks(d01, "朝5分早起き\n転職した。つまりAIのおかげ\n使っていない")
    assert [c.tag for c in explained] == ["説明過多"] and "2案目" in explained[0].message
    assert split_answers("a\n\nc") == ["a", "", "c"]


def test_auto_checks_m07_length_is_explanation():
    t01 = PROBLEMS_BY_ID["T01"]
    assert auto_checks(t01, "一番有名なところ通ってないんかい！") == []
    long = auto_checks(t01, "詳しいって言ったのにChatGPTを使ったことがないのは、詳しいとは言えないでしょう")
    assert [c.tag for c in long] == ["説明過多"]


def test_derive_tags_trio():
    full = {"variety": 2, "validity": 2, "clarity": 2, "brevity": 2}
    assert derive_tags("trio", full, []) == []
    assert derive_tags("trio", {**full, "variety": 0}, []) == ["繰り返し依存"]
    assert derive_tags("trio", {**full, "validity": 0}, []) == ["反対軸が不明"]
    assert derive_tags("trio", {**full, "clarity": 0}, []) == ["反対軸が不明"]
    assert derive_tags("trio", {**full, "brevity": 0}, []) == ["オチが長い"]
    assert derive_tags("trio", {**full, "brevity": 0}, [Check("warn", "", "説明過多")]) == ["説明過多"]
    assert derive_tags("trio", full, [], "needs_revision") == ["危険性"]


def test_derive_tags_tsukkomi():
    full = {"pinpoint": 2, "standard": 2, "brevity": 2, "tone": 2}
    assert derive_tags("tsukkomi", full, []) == []
    assert derive_tags("tsukkomi", {**full, "pinpoint": 0}, []) == ["反対軸が不明"]
    assert derive_tags("tsukkomi", {**full, "standard": 0}, []) == ["反対軸が不明"]
    assert derive_tags("tsukkomi", {**full, "brevity": 0}, []) == ["説明過多"]
    assert derive_tags("tsukkomi", {**full, "tone": 0}, []) == ["危険性"]
    assert derive_tags("tsukkomi", {**full, "tone": 0}, [], "needs_revision") == ["危険性"]


def test_self_evaluation_trio_and_tsukkomi():
    ev = self_evaluation(PROBLEMS_BY_ID["D01"], {"variety": 0, "validity": 1, "clarity": 2, "brevity": 2}, "ok", [])
    assert ev.rubric == "trio" and ev.max_total == 8 and ev.total == 5
    assert ev.relevance == "weak"
    assert ev.tags == ["繰り返し依存"]
    assert [a.pattern for a in ev.alternatives] == ["大小逆転", "解釈転換", "自己矛盾"]

    ev = self_evaluation(PROBLEMS_BY_ID["T01"], {"pinpoint": 2, "standard": 0, "brevity": 2, "tone": 9}, "ok", [])
    assert ev.rubric == "tsukkomi" and ev.max_total == 8 and ev.scores["tone"] == 2
    assert ev.relevance == "related"
    assert ev.tags == ["反対軸が不明"]


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


def test_attempt_keeps_time_and_satisfaction(tmp_path):
    path = tmp_path / "history.json"
    store = HistoryStore(path)
    a = make_attempt("D01", {"variety": 2, "validity": 2, "clarity": 2, "brevity": 2})
    assert a.elapsed_sec is None and a.satisfaction is None
    a.answer = "一案目\n二案目\n三案目"
    a.elapsed_sec = 95
    store.add(a)
    store.update(a.id, satisfaction=4)
    got = HistoryStore(path).get(a.id)
    assert got.answer.split("\n") == ["一案目", "二案目", "三案目"]
    assert got.elapsed_sec == 95 and got.satisfaction == 4

    # 項目が増える前に保存した履歴も読める
    raw = json.loads(path.read_text(encoding="utf-8"))
    for item in raw["attempts"]:
        del item["elapsed_sec"], item["satisfaction"]
    path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
    old = HistoryStore(path).get(a.id)
    assert old.elapsed_sec is None and old.satisfaction is None


def test_effort_summary():
    a, b, c = (make_attempt("F01", FULL) for _ in range(3))
    a.elapsed_sec, b.elapsed_sec = 30, 90
    a.satisfaction, c.satisfaction = 2, 5
    summary = effort_summary([a, b, c])
    assert summary == {"timed": 2, "median_sec": 60, "rated": 2, "avg_satisfaction": 3.5}
    assert effort_summary([])["median_sec"] is None


def test_explained_structure_for_new_rubrics():
    trio = {"variety": 0, "validity": 1, "clarity": 0, "brevity": 0}
    assert explained_structure(make_attempt("D01", trio))
    assert not explained_structure(make_attempt("D01", {**trio, "validity": 0}))
    tsukkomi = {"pinpoint": 1, "standard": 0, "brevity": 0, "tone": 0}
    assert explained_structure(make_attempt("T01", tsukkomi))
    assert not explained_structure(make_attempt("T01", {**tsukkomi, "pinpoint": 0}))


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


def test_pilot_days_4_and_5_use_the_new_modes():
    day4 = next(d for d in PILOT_PLAN if d["day"] == 4)
    day5 = next(d for d in PILOT_PLAN if d["day"] == 5)
    assert day4["menu"] == [("M06", 5), ("M07", 3)] and "pending" not in day4
    assert day5["menu"] == [("M04", 3), ("M05", 2)] and "pending" not in day5
    modes4 = [PROBLEMS_BY_ID[i].mode for i in pilot_set(4, [])]
    modes5 = [PROBLEMS_BY_ID[i].mode for i in pilot_set(5, [])]
    assert modes4 == ["M06"] * 5 + ["M07"] * 3
    assert modes5 == ["M04"] * 3 + ["M05"] * 2


def test_todays_set_sends_repetition_to_m04():
    weak = [make_attempt("D01", {"variety": 0, "validity": 2, "clarity": 2, "brevity": 2},
                         tags=["繰り返し依存"]) for _ in range(3)]
    ids, reason = todays_set(weak)
    assert "繰り返し依存" in reason
    assert PROBLEMS_BY_ID[ids[0]].mode == "M04" and ids[0] != "D01"


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


def test_request_lists_m04_answers_in_order():
    text = build_evaluation_request(PROBLEMS_BY_ID["D01"], "朝5分早起き\n転職した\nAIを使っていない")
    assert "回答1：朝5分早起き\n回答2：転職した\n回答3：AIを使っていない" in text
    assert "回答：" not in text
    assert "条件：大小逆転／解釈転換／自己矛盾" in text
    assert "字数の目安：1案につき40字以内" in text
    assert ai_coach.MODE_GUIDES["M04"] in text

    partial = build_evaluation_request(PROBLEMS_BY_ID["D01"], "朝5分早起き\n\n")
    assert "回答2：（未記入）\n回答3：（未記入）" in partial


def test_request_for_m07_uses_one_answer():
    text = build_evaluation_request(PROBLEMS_BY_ID["T01"], "一番有名なところ通ってないんかい！")
    assert "回答：一番有名なところ通ってないんかい！" in text
    assert "字数の目安：30字以内" in text
    assert ai_coach.MODE_GUIDES["M07"] in text


def test_prompts_cover_every_implemented_mode():
    for code in IMPLEMENTED_MODES:
        assert code in ai_coach.MODE_GUIDES, code
        assert code in ai_coach.DEFAULT_LEVEL, code
        assert f"{code} {MODES[code].name}" in ai_coach.GENERATION_SYSTEM, code
    assert ai_coach.DEFAULT_LEVEL["M04"] == 3 and ai_coach.DEFAULT_LEVEL["M07"] == 2


def test_evaluate_m04_and_m07_with_their_rubrics():
    trio = {**AI_RESULT, "scores": {k: {"score": 2, "reason": ""} for k in ("variety", "validity", "clarity", "brevity")}}
    ev = FuriochiCoach(client=fake_client(trio)).evaluate(PROBLEMS_BY_ID["D01"], "a\nb\nc")
    assert ev.rubric == "trio" and ev.total == 8
    schema = evaluation_schema("tsukkomi")
    assert list(schema["properties"]["scores"]["properties"]) == ["pinpoint", "standard", "brevity", "tone"]


def test_generate_m04_problem_keeps_condition():
    payload = {"prompt": "今年こそ、本気でダイエットします", "condition": "数量逆転／言動矛盾／再定義",
               "expectation": "体重を大きく減らす", "axis": "体重の増減", "pattern": "",
               "examples": [{"text": "まず1グラム", "pattern": "数量逆転", "note": ""}],
               "focus": "", "scoring_hint": "", "weak_reason": "無視される"}
    problem = FuriochiCoach(client=fake_client(payload)).generate_problem("M04")
    assert problem.mode == "M04" and problem.level == 3
    assert problem.condition_types() == ["数量逆転", "言動矛盾", "再定義"]
    assert problem.pattern == "数量逆転" and problem.weak_reason == ""
    with pytest.raises(CoachError):
        FuriochiCoach(client=fake_client({**payload, "condition": "数量逆転／数量逆転"})).generate_problem("M04")

    m07 = FuriochiCoach(client=fake_client({**payload, "condition": "数量逆転"})).generate_problem("M07")
    assert m07.level == 2 and m07.condition == ""


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


def test_app_m04_three_answers_and_satisfaction(app, tmp_path):
    app.button(key="mode_M04").click().run()
    assert not app.exception
    assert app.session_state.problem_id == "D01"
    labels = [w.label for w in app.text_input]
    assert any("大小逆転" in label for label in labels)
    assert any("自己矛盾" in label for label in labels)

    # 3案とも空なら先へ進まない
    next(b for b in app.button if b.label == "講評を見る").click().run()
    assert app.session_state.phase == "answer"

    app.text_input(key="ans_1_1").input("朝起きる時間が5分早くなった")
    app.text_input(key="ans_1_2").input("転職してAIと無関係な仕事に")
    app.text_input(key="ans_1_3").input("AIが大事と言いながら一度も使っていない")
    next(b for b in app.button if b.label == "講評を見る").click().run()
    assert not app.exception
    assert app.session_state.phase == "self_eval"
    assert any("〔解釈転換〕" in m.value for m in app.markdown)

    for key, value in (("variety", 2), ("validity", 2), ("clarity", 1), ("brevity", 0)):
        app.select_slider(key=f"score_{key}_1").set_value(value)
    next(b for b in app.button if b.label == "採点を記録").click().run()
    assert not app.exception
    assert app.session_state.phase == "result"

    saved = json.loads((tmp_path / "history.json").read_text(encoding="utf-8"))["attempts"][0]
    assert saved["answer"].split("\n") == [
        "朝起きる時間が5分早くなった", "転職してAIと無関係な仕事に", "AIが大事と言いながら一度も使っていない"]
    assert saved["evaluation"]["rubric"] == "trio"
    assert saved["evaluation"]["tags"] == ["オチが長い"]
    assert isinstance(saved["elapsed_sec"], int) and saved["elapsed_sec"] >= 0
    assert saved["satisfaction"] is None

    app.radio(key="sat_1").set_value(4).run()
    assert not app.exception
    saved = json.loads((tmp_path / "history.json").read_text(encoding="utf-8"))["attempts"][0]
    assert saved["satisfaction"] == 4

    # マイノートでも3案が型付きで並ぶ
    app.sidebar.radio[0].set_value("📒 マイノート").run()
    assert not app.exception
    assert any("〔自己矛盾〕" in m.value for m in app.markdown)


def test_app_m07_tsukkomi(app, tmp_path):
    app.button(key="mode_M07").click().run()
    assert not app.exception
    assert app.session_state.problem_id == "T01"
    app.text_input(key="ans_1").input("一番有名なところ通ってないんかい！")
    next(b for b in app.button if b.label == "講評を見る").click().run()
    assert not app.exception
    assert app.session_state.phase == "self_eval"

    for key in ("pinpoint", "standard", "brevity", "tone"):
        app.select_slider(key=f"score_{key}_1").set_value(2)
    next(b for b in app.button if b.label == "採点を記録").click().run()
    assert not app.exception
    assert app.session_state.phase == "result"
    saved = json.loads((tmp_path / "history.json").read_text(encoding="utf-8"))["attempts"][0]
    assert saved["evaluation"]["rubric"] == "tsukkomi"
    assert sum(saved["evaluation"]["scores"].values()) == 8
    assert saved["evaluation"]["tags"] == []


def test_app_pilot_day_4_starts_with_m06_then_m07(app):
    starts = [b for b in app.button if b.label == "始める"]
    assert len(starts) == 5, "Day 1〜5 に開始ボタンがある"
    app.button(key="pilot_4").click().run()
    assert not app.exception
    modes = [PROBLEMS_BY_ID[i].mode for i in app.session_state.queue]
    assert modes == ["M06"] * 5 + ["M07"] * 3


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
