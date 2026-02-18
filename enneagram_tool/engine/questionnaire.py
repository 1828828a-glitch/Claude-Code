"""インタラクティブな質問エンジン

3つのシステム（エニアグラム、認知機能、Nardi脳タイプ）を
横断的に判定するための質問群を管理・実行する。
"""

from dataclasses import dataclass, field


@dataclass
class Question:
    """質問の定義"""
    id: str
    text: str
    category: str  # "enneagram", "cognitive", "nardi", "cross"
    subcategory: str  # より具体的な分類
    scoring: dict[str, float] = field(default_factory=dict)
    # scoring例: {"type_1": 2.0, "type_7": -1.0} or {"Te": 1.5, "Fi": -0.5}
    follow_up: str | None = None  # 条件付きフォローアップ質問ID


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# エニアグラム判定質問（行動観察ベース）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENNEAGRAM_QUESTIONS: list[Question] = [
    # === センター（三つ組）判定 ===
    Question(
        id="center_1",
        text="予想外のことが起きた時、最初の反応は？\n"
             "  A) 体が反応する（腹に力が入る、動き出す、または固まる）\n"
             "  B) 感情が動く（不安、悲しみ、恥ずかしさ等の感情が先に来る）\n"
             "  C) 頭が動く（「なぜ？」「どうすれば？」と考え始める）",
        category="enneagram",
        subcategory="center",
        scoring={
            "center_gut": 0,   # A選択時に加算
            "center_heart": 0,  # B選択時に加算
            "center_head": 0,   # C選択時に加算
        },
    ),
    Question(
        id="center_2",
        text="人と意見が食い違った時、内面で最初に起きることは？\n"
             "  A) 怒りや苛立ちが腹の底から湧く\n"
             "  B) 相手にどう思われるか、関係が壊れないかが気になる\n"
             "  C) 相手の論理の矛盾や、リスクについて考え始める",
        category="enneagram",
        subcategory="center",
        scoring={
            "center_gut": 0,
            "center_heart": 0,
            "center_head": 0,
        },
    ),
    Question(
        id="center_3",
        text="一日の終わりに最も消耗を感じるのは？\n"
             "  A) 自分の意志を曲げなければならなかった時\n"
             "  B) 感情的に無視された、または認められなかった時\n"
             "  C) 先の見通しが立たず、不確実なままだった時",
        category="enneagram",
        subcategory="center",
        scoring={
            "center_gut": 0,
            "center_heart": 0,
            "center_head": 0,
        },
    ),

    # === 腹（本能）センター詳細判定 ===
    Question(
        id="gut_1",
        text="怒りについて、最も当てはまるのは？\n"
             "  A) 常に内面に怒りがあるが、表に出さないよう抑えている\n"
             "  B) 怒りを感じたら、すぐに直接的に表現する\n"
             "  C) 怒りをほとんど感じない。怒る理由がわからないことが多い",
        category="enneagram",
        subcategory="gut_detail",
        scoring={
            "type_1": 0,  # A
            "type_8": 0,  # B
            "type_9": 0,  # C
        },
    ),
    Question(
        id="gut_2",
        text="自分の領域（空間・時間・決定権）について、最も当てはまるのは？\n"
             "  A) 境界は明確にあるが、それは「正しい境界」でなければならない\n"
             "  B) 自分の境界を侵されると即座に反応する。領域を強く守る\n"
             "  C) 気づくと他人に合わせて自分の境界がなくなっている",
        category="enneagram",
        subcategory="gut_detail",
        scoring={
            "type_1": 0,
            "type_8": 0,
            "type_9": 0,
        },
    ),

    # === 心（感情）センター詳細判定 ===
    Question(
        id="heart_1",
        text="自己イメージについて、最も当てはまるのは？\n"
             "  A) 自分は「人のためになる存在」でありたい\n"
             "  B) 自分は「成功し、価値を認められる存在」でありたい\n"
             "  C) 自分は「他の誰とも違うユニークな存在」でありたい",
        category="enneagram",
        subcategory="heart_detail",
        scoring={
            "type_2": 0,
            "type_3": 0,
            "type_4": 0,
        },
    ),
    Question(
        id="heart_2",
        text="他者の目にどう映るかについて、最も当てはまるのは？\n"
             "  A) 人に好かれているか、必要とされているかが重要\n"
             "  B) 有能で結果を出していると見られているかが重要\n"
             "  C) 自分の深さや独自性が理解されているかが重要",
        category="enneagram",
        subcategory="heart_detail",
        scoring={
            "type_2": 0,
            "type_3": 0,
            "type_4": 0,
        },
    ),

    # === 頭（思考）センター詳細判定 ===
    Question(
        id="head_1",
        text="不安や恐怖への対処として、最も当てはまるのは？\n"
             "  A) とにかく情報を集めて理解しようとする\n"
             "  B) 最悪の事態を想定し、備えようとする\n"
             "  C) 楽しいこと、新しいことに意識を向ける",
        category="enneagram",
        subcategory="head_detail",
        scoring={
            "type_5": 0,
            "type_6": 0,
            "type_7": 0,
        },
    ),
    Question(
        id="head_2",
        text="安全・安心の確保方法として、最も当てはまるのは？\n"
             "  A) 知識と専門性で自分の領域を守る\n"
             "  B) 信頼できる人や組織に所属する\n"
             "  C) 選択肢をたくさん持ち、いつでも逃げ道を確保する",
        category="enneagram",
        subcategory="head_detail",
        scoring={
            "type_5": 0,
            "type_6": 0,
            "type_7": 0,
        },
    ),

    # === 分裂・統合の方向性チェック ===
    Question(
        id="stress_1",
        text="強いストレス下で、普段と違う自分が出てくることはありますか？\n"
             "それはどのような変化ですか？\n"
             "  A) 普段は冷静なのに、急に感情的・自己憐憫的になる（1→4）\n"
             "  B) 普段は穏やかなのに、急に攻撃的・支配的になる（2→8）\n"
             "  C) 普段は活動的なのに、急に無気力・シャットダウンする（3→9）\n"
             "  D) 普段は独立的なのに、急に人にすがりつく（4→2）\n"
             "  E) 普段は慎重なのに、急に衝動的・散漫になる（5→7）\n"
             "  F) 普段は疑い深いのに、急に見栄を張り成功を誇示する（6→3）\n"
             "  G) 普段は楽天的なのに、急に批判的・完璧主義になる（7→1）\n"
             "  H) 普段は力強いのに、急に引きこもり人を避ける（8→5）\n"
             "  I) 普段は穏やかなのに、急に不安・疑心暗鬼になる（9→6）",
        category="enneagram",
        subcategory="stress_direction",
        scoring={},  # 動的にスコアリング
    ),

    # === ウィング判定 ===
    Question(
        id="wing_check",
        text="あなたのタイプの隣り合う2つのタイプのうち、\n"
             "どちらの特徴がより自分に当てはまると感じますか？\n"
             "（この質問はコアタイプ判定後に表示されます）",
        category="enneagram",
        subcategory="wing",
        scoring={},
    ),

    # === 本能型サブタイプ判定 ===
    Question(
        id="instinct_1",
        text="日常的に最も意識が向くのは？\n"
             "  A) 身体的な安全・健康・お金・快適さ（自己保存型）\n"
             "  B) 特別な一対一の関係・強烈なつながり・魅力（性的型）\n"
             "  C) 社会的な立場・所属・コミュニティでの役割（社会型）",
        category="enneagram",
        subcategory="instinctual",
        scoring={
            "sp": 0,
            "sx": 0,
            "so": 0,
        },
    ),
    Question(
        id="instinct_2",
        text="新しい環境に入った時、最初に気になるのは？\n"
             "  A) 出口はどこか、温度は快適か、安全か\n"
             "  B) 目を引く人は誰か、インパクトのある人物は\n"
             "  C) ここでの自分の位置づけは、グループの構造はどうなっているか",
        category="enneagram",
        subcategory="instinctual",
        scoring={
            "sp": 0,
            "sx": 0,
            "so": 0,
        },
    ),
    Question(
        id="instinct_3",
        text="最もストレスを感じる状況は？\n"
             "  A) 経済的な不安、健康の問題、生活基盤の不安定さ\n"
             "  B) 深いつながりの欠如、魅力の喪失、退屈な関係\n"
             "  C) 所属グループからの排除、社会的な評価の低下",
        category="enneagram",
        subcategory="instinctual",
        scoring={
            "sp": 0,
            "sx": 0,
            "so": 0,
        },
    ),
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 認知機能判定質問
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COGNITIVE_QUESTIONS: list[Question] = [
    # === 知覚軸判定 ===
    Question(
        id="perceive_1",
        text="情報を取り入れる時、自然に使うのは？\n"
             "  A) 五感で今起きていることを直接捉える（Se）\n"
             "  B) 過去の経験と照合して理解する（Si）\n"
             "  C) 可能性やパターンを外部に見出す（Ne）\n"
             "  D) 内面で深い洞察やビジョンを形成する（Ni）",
        category="cognitive",
        subcategory="perceiving",
        scoring={"Se": 0, "Si": 0, "Ne": 0, "Ni": 0},
    ),
    Question(
        id="perceive_2",
        text="問題に直面した時、自然にやるのは？\n"
             "  A) まず何が起きているか五感で確認する\n"
             "  B) 似たような過去の経験を思い出す\n"
             "  C)「他にどんな可能性があるか」を考える\n"
             "  D) 答えが内面から浮かび上がるのを待つ",
        category="cognitive",
        subcategory="perceiving",
        scoring={"Se": 0, "Si": 0, "Ne": 0, "Ni": 0},
    ),
    Question(
        id="perceive_3",
        text="理想の休日の過ごし方に近いのは？\n"
             "  A) アクティブな体験（スポーツ、旅行、食べ歩き）\n"
             "  B) 馴染みの場所でリラックス（定番のカフェ、いつもの散歩道）\n"
             "  C) 新しいことを探索（知らない街、新しい趣味、面白い本）\n"
             "  D) 一人で深く考える時間（瞑想、ジャーナリング、内省）",
        category="cognitive",
        subcategory="perceiving",
        scoring={"Se": 0, "Si": 0, "Ne": 0, "Ni": 0},
    ),

    # === 判断軸判定 ===
    Question(
        id="judge_1",
        text="重要な決断をする時の基準は？\n"
             "  A) 客観的なデータ、効率、外部の基準（Te）\n"
             "  B) 内的な論理、整合性、独自のフレームワーク（Ti）\n"
             "  C) 周囲の人々の気持ち、社会的な調和（Fe）\n"
             "  D) 自分の内面の価値観、本物かどうか（Fi）",
        category="cognitive",
        subcategory="judging",
        scoring={"Te": 0, "Ti": 0, "Fe": 0, "Fi": 0},
    ),
    Question(
        id="judge_2",
        text="グループで議論する時、あなたの自然な役割は？\n"
             "  A) 効率的に結論に導く司会役\n"
             "  B) 論理の矛盾を指摘し、精密な分析を提供する役\n"
             "  C) 全員の意見をまとめ、雰囲気を良くする調整役\n"
             "  D) 自分の信じる価値観に基づいて、静かに重要な一言を言う役",
        category="cognitive",
        subcategory="judging",
        scoring={"Te": 0, "Ti": 0, "Fe": 0, "Fi": 0},
    ),
    Question(
        id="judge_3",
        text="他者の意見が自分と異なる時の自然な反応は？\n"
             "  A)「根拠を示してくれ」と客観的証拠を求める\n"
             "  B)「その論理は整合しているか」と内的に分析する\n"
             "  C)「対立を避けたい」と折り合える点を探す\n"
             "  D)「自分の価値観には合わない」と内心で感じるが、強く主張しない",
        category="cognitive",
        subcategory="judging",
        scoring={"Te": 0, "Ti": 0, "Fe": 0, "Fi": 0},
    ),

    # === 外向/内向判定 ===
    Question(
        id="orientation_1",
        text="エネルギーの充電方法は？\n"
             "  A) 人と会って話す、外出する、活動する\n"
             "  B) 一人の時間を過ごす、内省する、静かな環境に身を置く",
        category="cognitive",
        subcategory="orientation",
        scoring={"E": 0, "I": 0},
    ),
    Question(
        id="orientation_2",
        text="考え事をする時は？\n"
             "  A) 人と話しながら、または声に出しながら考える\n"
             "  B) 一人で静かに、頭の中で考えをまとめる",
        category="cognitive",
        subcategory="orientation",
        scoring={"E": 0, "I": 0},
    ),

    # === Beebe影の機能チェック ===
    Question(
        id="shadow_1",
        text="ストレス下で「いつもの自分らしくない」反応をすることがありますか？\n"
             "  A) 普段は論理的なのに、急に感情的になる\n"
             "  B) 普段は感情重視なのに、急に冷酷に論理的になる\n"
             "  C) 普段は慎重なのに、急に衝動的になる\n"
             "  D) 普段は自由なのに、急に規則にこだわる\n"
             "  E) 特に思い当たらない",
        category="cognitive",
        subcategory="shadow",
        scoring={},  # 動的にスコアリング
    ),
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Nardi脳タイプ判定質問
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NARDI_QUESTIONS: list[Question] = [
    Question(
        id="nardi_1",
        text="集中して問題を解いている時、あなたの脳はどう動いていると感じますか？\n"
             "  A) 全身全霊で一点に集中。周囲の音が聞こえなくなる（ゾーン型）\n"
             "  B) 複数の考えが同時に走っている感じ（並列処理型）\n"
             "  C) 頭がクリアに整理され、ステップバイステップで進む（指令型）\n"
             "  D) あちこちにアイデアが飛び火する（クリスマスツリー型）\n"
             "  E) 体を動かしながら、または手を使いながら考える（動作連動型）\n"
             "  F) 人と話すことで考えがまとまる（対話型）",
        category="nardi",
        subcategory="problem_solving",
        scoring={},
    ),
    Question(
        id="nardi_2",
        text="新しい情報を学ぶ時、最も効果的なのは？\n"
             "  A) 一つの分野を深く掘り下げる\n"
             "  B) 複数の分野を横断的に学ぶ\n"
             "  C) 実践的に手を動かして学ぶ\n"
             "  D) 人に教えながら学ぶ\n"
             "  E) 過去の知識と比較しながら学ぶ\n"
             "  F) 全体像を先に掴んでから細部に入る",
        category="nardi",
        subcategory="learning_style",
        scoring={},
    ),
    Question(
        id="nardi_3",
        text="「フロー状態」（完全に没頭して時間を忘れる状態）に入るのは\n"
             "どんな活動をしている時ですか？\n"
             "  A) 複雑な問題の分析・理論構築\n"
             "  B) 創造的な表現（文章、音楽、アート等）\n"
             "  C) 身体的な活動（スポーツ、手作業、料理等）\n"
             "  D) 人との深い対話\n"
             "  E) 計画の立案と実行\n"
             "  F) 新しいアイデアのブレインストーミング",
        category="nardi",
        subcategory="flow_trigger",
        scoring={},
    ),
    Question(
        id="nardi_4",
        text="ストレスが高まった時、脳がどう反応すると感じますか？\n"
             "  A) 思考が堂々巡りし、決断できなくなる\n"
             "  B) 頭が真っ白になり、シャットダウンする\n"
             "  C) 過度に分析的になり、細部に囚われる\n"
             "  D) 感情が溢れ出し、コントロールできなくなる\n"
             "  E) 衝動的に行動してしまう\n"
             "  F) 他者との接触を完全に断ちたくなる",
        category="nardi",
        subcategory="stress_response",
        scoring={},
    ),
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# クロスシステム検証質問
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CROSS_SYSTEM_QUESTIONS: list[Question] = [
    Question(
        id="cross_1",
        text="「正しさ」と「効率」が対立する場面で、どちらを優先しますか？\n"
             "  A) 正しさ（たとえ時間がかかっても、原則を守るべき）\n"
             "  B) 効率（結果が同じなら、最短ルートを選ぶべき）\n"
             "  C) 場合による（状況次第で柔軟に判断する）",
        category="cross",
        subcategory="decision_priority",
        scoring={},
    ),
    Question(
        id="cross_2",
        text="対人関係で最もエネルギーを使うのは？\n"
             "  A) 相手の感情を読み取ること\n"
             "  B) 自分の意見を正確に伝えること\n"
             "  C) 場の雰囲気を保つこと\n"
             "  D) 相手の論理を理解すること",
        category="cross",
        subcategory="interpersonal",
        scoring={},
    ),
    Question(
        id="cross_3",
        text="チームで最も自然に取る役割は？\n"
             "  A) ビジョンを示すリーダー\n"
             "  B) 分析と改善を担う参謀\n"
             "  C) チームの調和を守るファシリテーター\n"
             "  D) 専門的な知識を提供するエキスパート\n"
             "  E) 実行力で推進するドゥーアー\n"
             "  F) アイデアを生み出すクリエイター",
        category="cross",
        subcategory="team_role",
        scoring={},
    ),
]


class QuestionnaireEngine:
    """質問の管理と回答のスコアリングを行うエンジン"""

    def __init__(self) -> None:
        self.enneagram_scores: dict[str, float] = {}
        self.cognitive_scores: dict[str, float] = {}
        self.nardi_scores: dict[str, float] = {}
        self.instinct_scores: dict[str, float] = {"sp": 0.0, "sx": 0.0, "so": 0.0}
        self.center_scores: dict[str, float] = {
            "center_gut": 0.0, "center_heart": 0.0, "center_head": 0.0,
        }
        self.orientation_scores: dict[str, float] = {"E": 0.0, "I": 0.0}
        self.raw_answers: dict[str, str] = {}

        # タイプ別スコア初期化
        for i in range(1, 10):
            self.enneagram_scores[f"type_{i}"] = 0.0
        for func in ["Se", "Si", "Ne", "Ni", "Te", "Ti", "Fe", "Fi"]:
            self.cognitive_scores[func] = 0.0

    def record_answer(self, question_id: str, answer: str) -> None:
        """回答を記録する"""
        self.raw_answers[question_id] = answer

    def score_center_question(self, question_id: str, answer: str) -> None:
        """センター判定の回答をスコアリング"""
        mapping = {"A": "center_gut", "B": "center_heart", "C": "center_head"}
        key = answer.upper().strip()
        if key in mapping:
            self.center_scores[mapping[key]] += 1.0
        self.record_answer(question_id, answer)

    def score_type_detail(self, question_id: str, answer: str,
                          type_map: dict[str, str]) -> None:
        """タイプ詳細判定の回答をスコアリング
        type_map: {"A": "type_1", "B": "type_8", "C": "type_9"} 等
        """
        key = answer.upper().strip()
        if key in type_map:
            score_key = type_map[key]
            self.enneagram_scores[score_key] = (
                self.enneagram_scores.get(score_key, 0.0) + 1.0
            )
        self.record_answer(question_id, answer)

    def score_cognitive_question(self, question_id: str, answer: str,
                                 func_map: dict[str, str]) -> None:
        """認知機能判定の回答をスコアリング
        func_map: {"A": "Se", "B": "Si", "C": "Ne", "D": "Ni"} 等
        """
        key = answer.upper().strip()
        if key in func_map:
            func_key = func_map[key]
            self.cognitive_scores[func_key] = (
                self.cognitive_scores.get(func_key, 0.0) + 1.0
            )
        self.record_answer(question_id, answer)

    def score_instinct_question(self, question_id: str, answer: str) -> None:
        """本能型判定の回答をスコアリング"""
        mapping = {"A": "sp", "B": "sx", "C": "so"}
        key = answer.upper().strip()
        if key in mapping:
            self.instinct_scores[mapping[key]] += 1.0
        self.record_answer(question_id, answer)

    def score_orientation_question(self, question_id: str, answer: str) -> None:
        """外向/内向判定の回答をスコアリング"""
        mapping = {"A": "E", "B": "I"}
        key = answer.upper().strip()
        if key in mapping:
            self.orientation_scores[mapping[key]] += 1.0
        self.record_answer(question_id, answer)

    def get_dominant_center(self) -> str:
        """最もスコアの高いセンターを返す"""
        return max(self.center_scores, key=self.center_scores.get)  # type: ignore[arg-type]

    def get_top_types(self, n: int = 3) -> list[tuple[str, float]]:
        """スコアの高い上位n個のタイプを返す"""
        sorted_types = sorted(
            self.enneagram_scores.items(), key=lambda x: x[1], reverse=True,
        )
        return sorted_types[:n]

    def get_top_functions(self, n: int = 4) -> list[tuple[str, float]]:
        """スコアの高い上位n個の認知機能を返す"""
        sorted_funcs = sorted(
            self.cognitive_scores.items(), key=lambda x: x[1], reverse=True,
        )
        return sorted_funcs[:n]

    def get_instinct_stack(self) -> str:
        """本能型スタック（e.g. "sp/sx"）を返す"""
        sorted_instincts = sorted(
            self.instinct_scores.items(), key=lambda x: x[1], reverse=True,
        )
        return f"{sorted_instincts[0][0]}/{sorted_instincts[1][0]}"

    def get_orientation(self) -> str:
        """外向/内向の傾向を返す"""
        if self.orientation_scores["E"] > self.orientation_scores["I"]:
            return "E"
        elif self.orientation_scores["I"] > self.orientation_scores["E"]:
            return "I"
        return "A"  # Ambivert
