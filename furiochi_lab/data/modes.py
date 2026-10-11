"""出題モード・難易度・採点ルーブリック・弱点タグの定義（設計書 3〜6, 11, 14章）"""

from dataclasses import dataclass


@dataclass
class Mode:
    code: str
    name: str
    what: str
    difficulty: str
    skill: str
    implemented: bool
    instruction: str = ""  # 問題画面に出す指示文
    answer_label: str = "あなたの回答"
    char_limit: int | None = None
    rubric: str = "neta"


MODES: dict[str, Mode] = {
    "M01": Mode(
        code="M01", name="フリ→オチ",
        what="フリが与えられ、短いオチを自由記述する",
        difficulty="初級", skill="期待と逆のズレを作る", implemented=True,
        instruction="このフリに続くオチを書いてください。",
        answer_label="オチ", char_limit=40,
    ),
    "M02": Mode(
        code="M02", name="オチ→フリ",
        what="確定オチを読み、自然なフリを作る",
        difficulty="初級", skill="オチからの逆算", implemented=True,
        instruction="このオチが効くフリを作ってください。相手の合いの手（「何人？」など）を挟んでもかまいません。",
        answer_label="フリ", char_limit=80,
    ),
    "M03": Mode(
        code="M03", name="期待の言語化",
        what="与えられたフリから、聞き手の予測を言語化する",
        difficulty="初級", skill="聞き手視点", implemented=True,
        instruction="このフリを聞いた人が次に何を予想するか、一文で書いてください。",
        answer_label="聞き手の予想", char_limit=60, rubric="prediction",
    ),
    "M04": Mode(
        code="M04", name="同一フリ3オチ",
        what="一つのフリから型を変えて3案を作る",
        difficulty="中級", skill="発想の幅", implemented=False,
    ),
    "M05": Mode(
        code="M05", name="フリオチ自作",
        what="テーマと型の条件だけを手がかりに、ゼロから掛け合いを作る",
        difficulty="中級", skill="構造の統合", implemented=True,
        instruction="テーマと条件に合わせて、2〜4往復の掛け合いを作ってください。話者はA・Bで書くと読みやすくなります。",
        answer_label="掛け合い", char_limit=150,
    ),
    "M06": Mode(
        code="M06", name="ネタの修理",
        what="弱いフリオチを診断し、改善する",
        difficulty="中級", skill="診断と推敲", implemented=True,
        instruction="このネタが弱い理由を一言で診断し、改善版を書いてください。",
        answer_label="改善版", char_limit=150,
    ),
    "M07": Mode(
        code="M07", name="ツッコミ設計",
        what="ボケに対する的確なツッコミを提案する",
        difficulty="中級", skill="ズレの明示", implemented=False,
    ),
    "M08": Mode(
        code="M08", name="掛け合いリレー",
        what="AIが相手役になり、フリと回収を往復する",
        difficulty="上級", skill="相互作用", implemented=False,
    ),
    "M09": Mode(
        code="M09", name="日常エピソード変換",
        what="実際の出来事を30秒ネタに編集する",
        difficulty="上級", skill="実戦投入", implemented=False,
    ),
    "M10": Mode(
        code="M10", name="連続オチ",
        what="反復・エスカレーション・時間差回収を作る",
        difficulty="上級", skill="長尺の構成", implemented=False,
    ),
    "M11": Mode(
        code="M11", name="文脈チェンジ",
        what="同じネタを友人・同僚・取引先向けに調整する",
        difficulty="上級", skill="場の調整", implemented=False,
    ),
    "M12": Mode(
        code="M12", name="作品分解",
        what="実在作品の筋立てからフリ・予測・オチを特定する",
        difficulty="全級", skill="観察と転用", implemented=False,
    ),
}

IMPLEMENTED_MODES = [code for code, m in MODES.items() if m.implemented]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 難易度と進行判定（初期仮説。テスト受講者の実績から修正する）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LEVELS: dict[int, dict] = {
    1: {"name": "観察", "feature": "反対軸が明白／単文／普遍的なテーマ",
        "criterion": "10問中7問で予測とズレを説明できる"},
    2: {"name": "逆算", "feature": "オチ指定／2〜3往復／数値・行動",
        "criterion": "構造スコアの中央値が7/10以上"},
    3: {"name": "創作", "feature": "テーマ指定／複数案／解説も記入",
        "criterion": "3案中2案で対照軸が異なる"},
    4: {"name": "会話", "feature": "相手からのフリを受ける／即時応答",
        "criterion": "30秒以内に有意味な返しを出せる"},
    5: {"name": "応用", "feature": "複数オチ／時間差回収／場の調整",
        "criterion": "実演の反応記録と自己分析ができる"},
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 採点ルーブリック（各軸0〜2点）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class Axis:
    key: str
    name: str
    levels: tuple[str, str, str]  # 0点・1点・2点の基準


RUBRICS: dict[str, list[Axis]] = {
    # フリオチそのものを評価する10点ルーブリック
    "neta": [
        Axis("expectation", "期待の明確さ",
             ("何を予測させるか不明", "予測はあるが弱い", "具体的な予測を誘導")),
        Axis("contrast", "ズレの強さ",
             ("フリと無関係", "対照はあるが弱い", "同じ軸で明確な反転")),
        Axis("clarity", "理解の速さ",
             ("説明がないとわからない", "少し解釈が必要", "一度で理解できる")),
        Axis("naturalness", "会話の自然さ",
             ("言い回しが不自然", "概ね自然", "場面に自然に収まる")),
        Axis("brevity", "コンパクトさ",
             ("オチの後に長い説明", "冗長だが伝わる", "余計な説明なく短く着地")),
    ],
    # M03 期待の言語化。予測が具体的で、意味が合っていれば表現は問わない
    "prediction": [
        Axis("specificity", "予測の具体性",
             ("何を予想するのか曖昧", "方向はあるが抽象的", "内容まで具体的に言えている")),
        Axis("match", "フリとの対応",
             ("フリと関係の薄い予想", "一部がフリの期待と重なる", "フリが作る期待と意味が合う")),
    ],
}

SAFETY_STATUS = {
    "ok": "問題なし",
    "check_context": "使う場面によっては要注意",
    "needs_revision": "要修正",
}

RELEVANCE = {
    "related": "フリと同じ尺度でつながっている",
    "weak": "フリとのつながりが弱い",
    "unrelated": "フリとのつながりが読み取れない",
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 弱点タグ（設計書 11章）と、克服に向くモード
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WEAKNESS_TAGS: dict[str, dict] = {
    "反対軸が不明": {
        "description": "フリとオチが同じ尺度に乗っておらず、ズレではなく話題の脱線になっている",
        "modes": ["M03", "M01"],
    },
    "オチが長い": {
        "description": "オチの一文が長く、着地までに注意が切れる",
        "modes": ["M01"],
    },
    "説明過多": {
        "description": "オチの後に自分で解説してしまい、聞き手が気づく楽しみを奪っている",
        "modes": ["M06", "M01"],
    },
    "内輪ネタ依存": {
        "description": "その場にいない人には前提が伝わらない",
        "modes": ["M06", "M05"],
    },
    "危険性": {
        "description": "特定の人やセンシティブな境遇を一方的に下げている",
        "modes": ["M06"],
    },
    "会話の不自然さ": {
        "description": "ネタのための台詞になっていて、会話として浮いている",
        "modes": ["M02", "M05"],
    },
    "繰り返し依存": {
        "description": "同じズレの反復に頼り、後半に新しさがない",
        "modes": ["M05"],
    },
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# まず試す7日間のパイロット（設計書 14章）
# 未実装モードの日は、実装済みモードで代替できる部分だけを出す
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PILOT_PLAN: list[dict] = [
    {"day": 1, "menu": [("M03", 5), ("M01", 3)], "goal": "期待が一文で言える"},
    {"day": 2, "menu": [("M01", 8)], "goal": "同じ尺度の反転ができる"},
    {"day": 3, "menu": [("M02", 8)], "goal": "オチから逆算できる"},
    {"day": 4, "menu": [("M06", 5)], "goal": "弱点の診断ができる",
     "pending": "M07×3問（ツッコミ設計）は今後追加"},
    {"day": 5, "menu": [("M05", 2)], "goal": "一つのテーマを多角化",
     "pending": "M04×3問（同一フリ3オチ）は今後追加"},
    {"day": 6, "menu": [], "goal": "掛け合い・実話に展開",
     "pending": "M08×3往復、M09×1件は今後追加"},
    {"day": 7, "menu": [], "goal": "実戦反応と改善点を記録",
     "pending": "今週作ったネタから3本をマイノートで修正し、1本を実演してメモを残す"},
]
