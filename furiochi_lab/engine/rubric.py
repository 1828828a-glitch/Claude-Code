"""採点ルーブリックの適用・自動チェック・弱点タグの導出

AIが使えないときは、出題側の設計意図と成立例を見たうえで本人が自己採点する。
自動チェックは字数や説明語の有無だけを見る補助で、面白さの判定はしない。
"""

from dataclasses import dataclass
import re

from furiochi_lab.data.modes import MODES, RUBRICS
from furiochi_lab.models.drill import Evaluation, Problem


@dataclass
class Check:
    level: str  # "info" | "warn"
    message: str
    tag: str = ""  # 関連する弱点タグ（候補）


# オチのあとに自分で解説を始めるときに出やすい言い回し
EXPLANATION_MARKERS = (
    "つまり", "要するに", "なぜなら", "というのも", "という意味", "って意味",
    "ということです", "っていうこと", "というわけ", "笑",
)

# 相手を傷つける可能性が高い語。含まれていても即不可にはせず、場面を確認させる
HARSH_WORDS = (
    "死ね", "殺す", "ブス", "デブ", "ハゲ", "チビ", "キモい", "きもい", "ガイジ", "障害者",
)

UTTERANCE_RE = re.compile(r"「")
SENTENCE_SPLIT_RE = re.compile(r"[。！？!?\n]+")


def char_count(text: str) -> int:
    return len(re.sub(r"\s", "", text))


def count_utterances(text: str) -> int:
    quoted = len(UTTERANCE_RE.findall(text))
    lines = len([ln for ln in text.splitlines() if ln.strip()])
    return max(quoted, lines)


def split_answers(answer: str) -> list[str]:
    """複数案のモード（M04）の回答を、出題の順に1案ずつに分ける"""
    return [line.strip() for line in answer.split("\n")]


def _explanation_marker(text: str) -> str:
    """オチのあとに続く文に、自分で解説を始める言い回しがあれば返す"""
    sentences = [s for s in SENTENCE_SPLIT_RE.split(text) if s.strip()]
    tail = "".join(sentences[1:]) if len(sentences) > 1 else ""
    return next((m for m in EXPLANATION_MARKERS if m in tail), "")


def auto_checks(problem: Problem, answer: str) -> list[Check]:
    """字数・説明語・往復数・案の数・強い語の有無を確認する"""
    mode = MODES[problem.mode]
    checks: list[Check] = []

    if mode.answer_count > 1:
        # M04：字数の目安と説明語は1案ずつ見る
        parts = split_answers(answer)
        filled = [p for p in parts if p]
        if len(filled) < mode.answer_count:
            checks.append(Check(
                "warn",
                f"{mode.answer_count}案のうち{len(filled)}案しか書かれていません。"
                "思いつかなかった型は、成立例を見てから再挑戦で埋めてみましょう。",
            ))
        for i, part in enumerate(parts, 1):
            if not part:
                continue
            n = char_count(part)
            if mode.char_limit and n > mode.char_limit:
                checks.append(Check(
                    "warn",
                    f"{i}案目が{n}字あり、目安の{mode.char_limit}字を超えています。着地のあとに足した言葉を削れないか見直しましょう。",
                    "オチが長い",
                ))
            found = _explanation_marker(part)
            if found:
                checks.append(Check(
                    "warn",
                    f"{i}案目の後半に「{found}」が入っています。オチを自分で説明していないか確認しましょう。",
                    "説明過多",
                ))
    else:
        n = char_count(answer)
        if mode.char_limit and n > mode.char_limit:
            if problem.mode == "M07":
                message = (f"{n}字あり、目安の{mode.char_limit}字を超えています。"
                           "ツッコミは説明を足すほど弱くなります。ズレの核心だけを残しましょう。")
            else:
                message = (f"{n}字あり、目安の{mode.char_limit}字を超えています。"
                           "着地のあとに足した言葉を削れないか見直しましょう。")
            tag = {"M01": "オチが長い", "M07": "説明過多"}.get(problem.mode, "")
            checks.append(Check("warn", message, tag))

        if problem.mode != "M03":
            found = _explanation_marker(answer)
            if found:
                checks.append(Check(
                    "warn",
                    f"後半に「{found}」が入っています。オチを自分で説明していないか確認しましょう。",
                    "説明過多",
                ))

    if problem.mode == "M05":
        u = count_utterances(answer)
        if u < 2:
            checks.append(Check("warn", "掛け合いになっていません。A・Bの発話を2つ以上にしましょう。", "会話の不自然さ"))
        elif u > 8:
            checks.append(Check("info", f"発話が{u}つあります。条件は2〜4往復なので、削れる往復がないか見てみましょう。"))

    harsh = [w for w in HARSH_WORDS if w in answer]
    if harsh:
        checks.append(Check(
            "warn",
            f"「{harsh[0]}」は相手を傷つける可能性があります。誰に向けた言葉か、使う場面で問題ないか確認しましょう。",
            "危険性",
        ))

    return checks


# 自己採点のとき、フリとのつながり（relevance）を読み取る軸
RELEVANCE_AXIS = {"neta": "contrast", "prediction": "match", "trio": "validity", "tsukkomi": "pinpoint"}


def rubric_for(problem: Problem) -> str:
    return MODES[problem.mode].rubric


def derive_tags(rubric: str, scores: dict[str, int], checks: list[Check],
                safety_status: str = "ok") -> list[str]:
    """0点の軸と自動チェックから弱点タグを導く"""
    tags: list[str] = []

    def add(tag: str) -> None:
        if tag and tag not in tags:
            tags.append(tag)

    check_tags = {c.tag for c in checks if c.tag}

    if rubric == "prediction":
        if scores.get("specificity", 2) == 0 or scores.get("match", 2) == 0:
            add("反対軸が不明")
    elif rubric == "trio":
        if scores.get("variety", 2) == 0:
            add("繰り返し依存")
        if scores.get("validity", 2) == 0 or scores.get("clarity", 2) == 0:
            add("反対軸が不明")
        if scores.get("brevity", 2) == 0:
            add("説明過多" if "説明過多" in check_tags else "オチが長い")
    elif rubric == "tsukkomi":
        if scores.get("pinpoint", 2) == 0 or scores.get("standard", 2) == 0:
            add("反対軸が不明")
        if scores.get("brevity", 2) == 0:
            add("説明過多")
        if scores.get("tone", 2) == 0:
            add("危険性")
    else:
        if (scores.get("expectation", 2) == 0 or scores.get("contrast", 2) == 0
                or scores.get("clarity", 2) == 0):
            add("反対軸が不明")
        if scores.get("naturalness", 2) == 0:
            add("会話の不自然さ")
        if scores.get("brevity", 2) == 0:
            add("説明過多" if "説明過多" in check_tags else "オチが長い")
        if scores.get("brevity", 2) <= 1:
            for t in ("オチが長い", "説明過多"):
                if t in check_tags:
                    add(t)
        if scores.get("naturalness", 2) <= 1 and "会話の不自然さ" in check_tags:
            add("会話の不自然さ")

    if safety_status == "needs_revision":
        add("危険性")
    return tags


def self_evaluation(problem: Problem, scores: dict[str, int], safety_status: str,
                    checks: list[Check]) -> Evaluation:
    """自己採点から講評を組み立てる"""
    rubric = rubric_for(problem)
    axes = RUBRICS[rubric]
    scores = {a.key: max(0, min(2, int(scores.get(a.key, 0)))) for a in axes}
    reasons = {a.key: a.levels[scores[a.key]] for a in axes}

    relevance = {2: "related", 1: "weak", 0: "unrelated"}[scores[RELEVANCE_AXIS[rubric]]]

    best = max(axes, key=lambda a: scores[a.key])
    good_point = (f"{best.name}は「{best.levels[2]}」と自己評価しています。"
                  if scores[best.key] == 2 else "")

    weakest = sorted((a for a in axes if scores[a.key] < 2), key=lambda a: scores[a.key])[:2]
    improvements = [f"{a.name}：「{a.levels[2]}」を目指す。" for a in weakest]

    return Evaluation(
        source="self",
        rubric=rubric,
        scores=scores,
        reasons=reasons,
        detected_expectation=problem.expectation,
        deviation_axis=problem.axis,
        relevance=relevance,
        safety_status=safety_status,
        good_point=good_point,
        improvements=improvements,
        alternatives=list(problem.examples),
        tags=derive_tags(rubric, scores, checks, safety_status),
        confidence="self",
    )
