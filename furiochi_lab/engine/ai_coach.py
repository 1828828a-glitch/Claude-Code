"""AI講評エンジン（設計書 10章）

Claude API で回答の構造を講評し、問題を生成する。AIは笑いの絶対審判ではなく、
期待の明瞭さ・ズレ・伝わりやすさ・自然さ・安全性を根拠付きで評価するコーチとして使う。
出力はJSONで受け取り、画面には自然な日本語で表示する。

認証情報が見つからないとき、または環境変数 FURIOCHI_AI=off のときは使わず、自己採点に切り替える。
"""

import json
import os
from pathlib import Path
import uuid

from furiochi_lab.data.modes import MODES, RUBRICS, WEAKNESS_TAGS
from furiochi_lab.data.problems import PROBLEMS
from furiochi_lab.data.taxonomy import BASIC_TYPE_NAMES, TECHNIQUE_NAMES
from furiochi_lab.engine.rubric import split_answers
from furiochi_lab.models.drill import Evaluation, Example, Problem

DEFAULT_MODEL = "claude-opus-5-5"
DEFAULT_EFFORT = "medium"
# server-side fallbacks の "default" 形式を受け付けるモデル
FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}
FALLBACK_BETA = "server-side-fallback-2026-07-01"

DEFAULT_LEVEL = {"M01": 1, "M02": 2, "M03": 1, "M04": 3, "M05": 3, "M06": 2, "M07": 2}


class CoachError(Exception):
    """講評・生成に失敗したとき。画面では自己採点に切り替える"""


def ai_available() -> bool:
    if os.environ.get("FURIOCHI_AI", "").lower() in ("0", "off", "false", "no"):
        return False
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        return True
    # `ant auth login` のプロファイルがあれば SDK が自動で読む
    return (Path.home() / ".config" / "anthropic").exists()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# プロンプト
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATTERN_LIST = "、".join(BASIC_TYPE_NAMES + [t for t in TECHNIQUE_NAMES if t not in BASIC_TYPE_NAMES])

EVALUATION_SYSTEM = f"""あなたは笑いの構造を分析するコーチです。会話力を磨きたい社会人が、フリオチの思考回路を練習するドリルの講評を担当します。

唯一の正解を仮定しません。まずフリが誘発する自然な期待を記述し、回答がそれに対して意味上の関連を持つか判定します。ズレが弱い場合は理由を説明し、成立し得る改善を1つ提案します。笑いを保証しません。実在の芸人の決め台詞やネタをそのまま複製しません。

評価は次の順で考えます。
1. 危険性と相手への攻撃性を判定する。特定個人への侮辱、深刻な事故や災害、病気・障害・出自などセンシティブな境遇の一方的な嘲笑は、構造が良くても safety_status を needs_revision にし、safety_note に理由を書き、one_revision を安全な形にする。軽いブラックユーモアまで機械的に排除はせず、場面次第で問題になり得るものは check_context にして、safety_note で使う場面を尋ねる。問題がなければ ok にして safety_note は空にする。
2. 出題側の設計意図と、回答から推定される期待を照合する。
3. ズレが同じ尺度の上で成立しているか判定する。
4. 評価軸ごとに0〜2点の整数で暫定評価し、reason に根拠を短く書く。
5. 弱さの原因を一つに絞り、improvements に最大2つの改善点を書き、one_revision に改善した回答を1つ書く。
6. 一つの模範に固定せず、別の構造を使った回答を alternatives に2〜3案書く。pattern には型の名前を書き、why には型の違いが伝わる一言を書く。
7. 回答の狙いが読み取れず判断に自信がないときは confidence を low にし、clarifying_question で狙ったズレを利用者に尋ねる。断定はしない。自信があるときは clarifying_question を空にする。

採点で守ること。
参考の成立例と一致しないことを理由に減点しない。表現が違っても構造が成立していれば評価する。
安全性は点数に混ぜない。安全性の判断は safety_status だけで示す。
得点は笑いの保証ではなく、構造を学ぶための参考指標として付ける。
alternatives には参考の成立例と同じ案を書かない。
tags には指定された弱点タグのうち、この回答に当てはまるものだけを入れる。当てはまらなければ空配列にする。

出力の文章について。
利用者が読む文章は自然な日本語で書く。Markdownの記号や箇条書きの記号は使わない。
detected_expectation は一文で書く。各項目は2文以内を目安にする。
利用者の回答を否定する言い方を避け、何がどう伝わるかを具体的に書く。

型の名前の候補：{PATTERN_LIST}"""

MODE_GUIDES = {
    "M01": "回答はフリに続くオチです。フリが作る期待と同じ尺度の上でズレているかを中心に評価します。",
    "M02": "回答は、指定されたオチが効くように利用者が作ったフリです。フリが作る期待と、指定のオチが同じ尺度でぶつかるかを評価します。alternatives には、同じオチに対する別のフリを書きます。",
    "M03": "回答は、フリを聞いた人が次に何を予想するかを言語化したものです。評価軸は予測の具体性とフリとの対応の2つです。意味が合っていれば表現は問いません。one_revision には、より具体的な予想の書き方を1つ書きます。alternatives には、その期待を裏切るオチの例を書きます。",
    "M04": "回答は、一つのフリから利用者が作った3つのオチで、条件の型の順に回答1・回答2・回答3として並んでいます。3案が本当に違う型を使い分けているか、同じ型の言い換えになっていないかを見ます。あわせて、各案がフリと同じ尺度の上でズレているかを1案ずつ確かめ、成立していない案があれば deviation で番号を挙げて触れます。one_revision には、いちばん弱い案を直した1案を書きます。alternatives には、回答とも参考の成立例とも違う型を使った別の3案を、1案ずつ書きます。",
    "M05": "回答は、テーマと条件に沿って利用者がゼロから作った掛け合いです。指定の型を使えているかに deviation で触れ、型が違う場合は改善点に入れます。alternatives には、同じテーマで別の型を使った掛け合いを書きます。",
    "M06": "出題は弱いフリオチで、回答は利用者による改善版です。利用者の診断（弱い理由）が別に付いています。採点は改善版のネタに対して行い、診断が出題側の想定する弱点を捉えているかに deviation の中で一言触れます。",
    "M07": "出題はAとBの掛け合いで、最後のAの発言がボケです。回答は、利用者がBとして返すツッコミです。ツッコミがボケのズレの核心を突いているか、本来どうあるべきかという基準を示して笑いを確定させているかを評価し、短く言い切れているかも見ます。必要以上に攻撃的な言い方は tone を下げ、相手を立てたまま突っ込めていれば評価します。detected_expectation には、ボケの前に聞き手が抱いていた期待を書きます。one_revision と alternatives には、別の角度から突っ込むツッコミを書き、pattern にはツッコミが指したボケの型を書きます。",
}

GENERATION_SYSTEM = f"""あなたはフリオチ思考訓練ドリルの出題者です。会話力を磨きたい社会人が、聞き手の期待を設計し、理解可能なズレを作る練習をするための問題を1問作ります。

守ること。
日常会話や職場で自然に出てくる題材にする。特定の実在個人、事故や災害、病気・障害・出自などセンシティブな境遇を題材にしない。
実在の芸人のネタや決め台詞を使わない。
フリとオチは同じ尺度の上で対比できるようにし、axis にその尺度を書く。
expectation には、フリを聞いた人が自然に抱く期待を一文で書く。
examples は2〜3件。唯一解ではなく、成立条件を学ぶための参考例として、型を変えて書く（M04 と M07 は下のモードごとの書き方に従う）。
pattern には次の型の名前から選ぶ：{PATTERN_LIST}
focus には解説の焦点を一文で、scoring_hint には採点で見るべき点を一文で書く。
Markdownの記号は使わない。

モードごとの書き方。
M01 フリ→オチ：prompt はフリの一言（30字以内、カギ括弧なし）。examples はオチ（40字以内）。condition と weak_reason は空。
M02 オチ→フリ：prompt は「オチ：「…」」の形。examples は「フリ →「合いの手」→「オチ」」の形。condition と weak_reason は空。
M03 期待の言語化：prompt はフリの一言。examples は、その期待を裏切るオチの例を1〜2件。condition と weak_reason は空。
M04 同一フリ3オチ：prompt はフリの一言（30字以内、カギ括弧なし）。condition は、互いに違う3つの型の名前を「／」でつないだもの（例：大小逆転／解釈転換／自己矛盾）。pattern は condition の最初の型。examples は condition の型の順に1件ずつ計3件のオチ（各40字以内）で、それぞれの pattern にその型を書く。3案とも、フリと同じ尺度の上でズレるようにする。weak_reason は空。
M05 フリオチ自作：prompt は「テーマ：…」の形。condition は「（12の基本型のどれか）を使う／2〜4往復」の形。examples はA「…」B「…」の形の掛け合い。weak_reason は空。
M06 ネタの修理：prompt はA「…」B「…」の形の、どこかが弱いフリオチ。weak_reason に弱い理由を一文で書く。examples は改善版の掛け合い。condition は空。
M07 ツッコミ設計：prompt はA「…」B「…」A「…」の形の掛け合いで、最後はAのボケで終える。expectation にはボケの前に聞き手が抱く期待、axis にはボケが外した尺度、pattern にはボケの型を書く。examples は、Bとして返すツッコミ（30字以内）を2〜3件。それぞれの pattern にはボケの型、note にはそのツッコミの狙いを短く書く。condition と weak_reason は空。"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 出力スキーマ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _obj(properties: dict) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


STR = {"type": "string"}


def evaluation_schema(rubric: str) -> dict:
    score = _obj({"score": {"type": "integer", "description": "0, 1, 2 のいずれか"}, "reason": STR})
    return _obj({
        "detected_expectation": STR,
        "deviation": STR,
        "deviation_axis": STR,
        "relevance": {"type": "string", "enum": ["related", "weak", "unrelated"]},
        "scores": _obj({a.key: score for a in RUBRICS[rubric]}),
        "safety_status": {"type": "string", "enum": ["ok", "check_context", "needs_revision"]},
        "safety_note": STR,
        "good_point": STR,
        "improvements": {"type": "array", "items": STR},
        "one_revision": STR,
        "alternatives": {"type": "array", "items": _obj({"text": STR, "pattern": STR, "why": STR})},
        "tags": {"type": "array", "items": {"type": "string", "enum": list(WEAKNESS_TAGS)}},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        "clarifying_question": STR,
    })


GENERATION_SCHEMA = _obj({
    "prompt": STR,
    "condition": STR,
    "expectation": STR,
    "axis": STR,
    "pattern": STR,
    "examples": {"type": "array", "items": _obj({"text": STR, "pattern": STR, "note": STR})},
    "focus": STR,
    "scoring_hint": STR,
    "weak_reason": STR,
})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# リクエスト本文
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def build_evaluation_request(problem: Problem, answer: str, intent_note: str = "",
                             diagnosis: str = "", weak_tags: list[str] | tuple = ()) -> str:
    """採点意図と例示回答を分けて渡し、模範解答に引きずられにくくする"""
    mode = MODES[problem.mode]
    rubric = RUBRICS[mode.rubric]

    lines = [
        f"モード：{mode.code} {mode.name}",
        f"出題：{problem.prompt}",
    ]
    if problem.condition:
        lines.append(f"条件：{problem.condition}")
    lines += [
        f"指示：{mode.instruction}",
        f"場面：{problem.scene}",
        f"出題側の設計意図（フリが作る期待）：{problem.expectation}",
        f"想定している対照軸：{problem.axis}",
        f"想定している型：{problem.pattern}",
    ]
    if problem.weak_reason:
        lines.append(f"出題側が想定する弱点：{problem.weak_reason}")
    if problem.scoring_hint:
        lines.append(f"採点ヒント：{problem.scoring_hint}")
    if mode.char_limit:
        per = "1案につき" if mode.answer_count > 1 else ""
        lines.append(f"字数の目安：{per}{mode.char_limit}字以内")

    axes = "\n".join(
        f"{a.key}（{a.name}）：0点＝{a.levels[0]}／1点＝{a.levels[1]}／2点＝{a.levels[2]}"
        for a in rubric
    )
    examples = "\n".join(f"{e.text}（{e.pattern}）" for e in problem.examples) or "なし"
    tags = "\n".join(f"{name}：{t['description']}" for name, t in WEAKNESS_TAGS.items())

    if mode.answer_count > 1:
        parts = split_answers(answer)
        parts += [""] * (mode.answer_count - len(parts))
        learner = [f"回答{i}：{part or '（未記入）'}" for i, part in enumerate(parts, 1)]
    else:
        learner = [f"回答：{answer}"]
    if diagnosis:
        learner.append(f"利用者の診断（弱い理由）：{diagnosis}")
    if intent_note:
        learner.append(f"利用者が狙った期待とズレ：{intent_note}")
    if weak_tags:
        learner.append(f"過去によく付いた弱点タグ：{'、'.join(weak_tags)}")

    return (
        f"<mode_guide>\n{MODE_GUIDES[problem.mode]}\n</mode_guide>\n\n"
        f"<problem>\n" + "\n".join(lines) + "\n</problem>\n\n"
        f"<rubric>\n{axes}\n</rubric>\n\n"
        f"<weakness_tags>\n{tags}\n</weakness_tags>\n\n"
        f"<reference_examples>\n参考の成立例です。採点の基準にはせず、alternatives と重複させないためにだけ使ってください。\n{examples}\n</reference_examples>\n\n"
        f"<learner>\n" + "\n".join(learner) + "\n</learner>"
    )


def build_generation_request(mode_code: str, theme: str = "",
                             existing: list[Problem] | None = None) -> str:
    mode = MODES[mode_code]
    existing = PROBLEMS if existing is None else existing
    taken = "\n".join(p.prompt for p in existing if p.mode == mode_code)
    parts = [f"{mode.code} {mode.name} の問題を1問作ってください。"]
    if theme:
        parts.append(f"題材の希望：{theme}")
    parts.append(f"既存のお題と重複しないでください。\n<existing>\n{taken}\n</existing>")
    return "\n\n".join(parts)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 応答の変換
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _clamp(value) -> int:
    try:
        return max(0, min(2, int(value)))
    except (TypeError, ValueError):
        return 0


def to_evaluation(data: dict, rubric: str) -> Evaluation:
    raw_scores = data.get("scores") or {}
    scores: dict[str, int] = {}
    reasons: dict[str, str] = {}
    for axis in RUBRICS[rubric]:
        item = raw_scores.get(axis.key) or {}
        scores[axis.key] = _clamp(item.get("score"))
        reasons[axis.key] = str(item.get("reason", ""))

    alternatives = [
        Example(text=str(a["text"]), pattern=str(a.get("pattern", "")), note=str(a.get("why", "")))
        for a in (data.get("alternatives") or [])
        if isinstance(a, dict) and a.get("text")
    ][:3]

    safety = data.get("safety_status")
    safety = safety if safety in ("ok", "check_context", "needs_revision") else "ok"
    tags = [t for t in (data.get("tags") or []) if t in WEAKNESS_TAGS]
    if safety == "needs_revision" and "危険性" not in tags:
        tags.append("危険性")

    confidence = data.get("confidence")
    confidence = confidence if confidence in ("high", "medium", "low") else "medium"
    relevance = data.get("relevance")
    relevance = relevance if relevance in ("related", "weak", "unrelated") else "related"

    return Evaluation(
        source="ai",
        rubric=rubric,
        scores=scores,
        reasons=reasons,
        detected_expectation=str(data.get("detected_expectation", "")),
        deviation=str(data.get("deviation", "")),
        deviation_axis=str(data.get("deviation_axis", "")),
        relevance=relevance,
        safety_status=safety,
        safety_note=str(data.get("safety_note", "")),
        good_point=str(data.get("good_point", "")),
        improvements=[str(x) for x in (data.get("improvements") or []) if x][:2],
        one_revision=str(data.get("one_revision", "")),
        alternatives=alternatives,
        tags=tags,
        confidence=confidence,
        clarifying_question=str(data.get("clarifying_question", "")) if confidence == "low" else "",
    )


def to_problem(data: dict, mode_code: str) -> Problem:
    for key in ("prompt", "expectation", "axis"):
        if not str(data.get(key, "")).strip():
            raise CoachError("生成された問題に必要な項目が欠けていました。もう一度生成してください。")
    examples = [
        Example(text=str(e["text"]), pattern=str(e.get("pattern", "")), note=str(e.get("note", "")))
        for e in (data.get("examples") or [])
        if isinstance(e, dict) and e.get("text")
    ][:3]
    condition = str(data.get("condition", "")).strip() if mode_code in ("M04", "M05") else ""
    pattern = str(data.get("pattern", "")).strip()
    if mode_code == "M04":
        types = [t.strip() for t in condition.split("／") if t.strip()]
        if len(types) != 3 or len(set(types)) != 3:
            raise CoachError("生成された問題の型の条件が3つそろっていませんでした。もう一度生成してください。")
        pattern = pattern or types[0]
    return Problem(
        id=f"G-{uuid.uuid4().hex[:8]}",
        mode=mode_code,
        level=DEFAULT_LEVEL.get(mode_code, 1),
        prompt=str(data["prompt"]).strip(),
        expectation=str(data["expectation"]).strip(),
        axis=str(data["axis"]).strip(),
        pattern=pattern,
        examples=examples,
        focus=str(data.get("focus", "")),
        scoring_hint=str(data.get("scoring_hint", "")),
        condition=condition,
        weak_reason=str(data.get("weak_reason", "")) if mode_code == "M06" else "",
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# クライアント
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class FuriochiCoach:
    """Claude API を使う講評・出題のコーチ"""

    def __init__(self, client=None, model: str | None = None, effort: str | None = None) -> None:
        if client is None:
            import anthropic
            client = anthropic.Anthropic()
        self.client = client
        self.model = model or os.environ.get("FURIOCHI_MODEL", DEFAULT_MODEL)
        self.effort = effort or os.environ.get("FURIOCHI_EFFORT", DEFAULT_EFFORT)

    def evaluate(self, problem: Problem, answer: str, intent_note: str = "",
                 diagnosis: str = "", weak_tags: list[str] | tuple = ()) -> Evaluation:
        rubric = MODES[problem.mode].rubric
        request = build_evaluation_request(problem, answer, intent_note, diagnosis, weak_tags)
        data = self._call(EVALUATION_SYSTEM, request, evaluation_schema(rubric))
        return to_evaluation(data, rubric)

    def generate_problem(self, mode_code: str, theme: str = "") -> Problem:
        request = build_generation_request(mode_code, theme)
        data = self._call(GENERATION_SYSTEM, request, GENERATION_SCHEMA)
        return to_problem(data, mode_code)

    def _call(self, system: str, user: str, schema: dict) -> dict:
        import anthropic

        kwargs = {
            "model": self.model,
            "max_tokens": 16000,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "output_config": {
                "effort": self.effort,
                "format": {"type": "json_schema", "schema": schema},
            },
        }
        try:
            if self.model in FALLBACK_MODELS:
                # 安全分類器に断られたとき、サーバー側で推奨モデルに切り替えて再実行する
                response = self.client.beta.messages.create(
                    betas=[FALLBACK_BETA], fallbacks="default", **kwargs,
                )
            else:
                response = self.client.messages.create(**kwargs)
        except anthropic.AuthenticationError as e:
            raise CoachError("APIキーが無効です。設定を確認してください。") from e
        except anthropic.PermissionDeniedError as e:
            raise CoachError("このAPIキーではモデルを利用できません。") from e
        except anthropic.NotFoundError as e:
            raise CoachError(f"モデル {self.model} が見つかりません。") from e
        except anthropic.RateLimitError as e:
            raise CoachError("APIが混み合っています。少し待ってから再度試してください。") from e
        except anthropic.APIStatusError as e:
            raise CoachError(f"APIエラーが発生しました（{e.status_code}）。") from e
        except anthropic.APIConnectionError as e:
            raise CoachError("APIに接続できませんでした。ネットワークを確認してください。") from e

        if response.stop_reason == "refusal":
            raise CoachError("この内容は講評できませんでした。表現を変えるか、自己採点で進めてください。")
        if response.stop_reason == "max_tokens":
            raise CoachError("応答が途中で切れました。もう一度試してください。")

        text = next((b.text for b in response.content if b.type == "text"), None)
        if not text:
            raise CoachError("応答に本文がありませんでした。もう一度試してください。")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            raise CoachError("応答を読み取れませんでした。もう一度試してください。") from e
        if not isinstance(data, dict):
            raise CoachError("応答の形式が想定と違いました。もう一度試してください。")
        return data
