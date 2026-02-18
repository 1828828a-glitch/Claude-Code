"""ユング心理学 × John Beebeモデル 8つの心理機能の包括的データ定義"""

from enneagram_tool.models.cognitive import (
    CognitiveFunction, BeebeArchetype, FunctionStack,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8つの心理機能
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COGNITIVE_FUNCTIONS: dict[str, CognitiveFunction] = {
    "Se": CognitiveFunction(
        code="Se",
        name_ja="外向的感覚",
        name_en="Extraverted Sensing",
        axis="知覚",
        orientation="外向",
        description="今この瞬間の感覚的な現実を鋭く捉える。物理的環境、身体感覚、現実の詳細に意識が向く。",
        observable_behaviors=[
            "「今」に没入し、即座に反応できる",
            "五感の情報に敏感で、環境の変化にすぐ気づく",
            "身体的な体験や刺激を積極的に求める",
            "実物を見せて、触らせて、体験させる説明を好む",
            "退屈を嫌い、常に何かしら感覚的な刺激を求める",
        ],
        question_patterns=[
            "初めての場所に入った時、最初に何に気づきますか？",
            "体を動かすことと頭で考えること、どちらが先に来ますか？",
            "今この瞬間の感覚にどれぐらい意識が向いていますか？",
        ],
    ),
    "Si": CognitiveFunction(
        code="Si",
        name_ja="内向的感覚",
        name_en="Introverted Sensing",
        axis="知覚",
        orientation="内向",
        description="過去の経験・記憶と照合して現在を理解する。身体内部の感覚、前例、手順を重視する。",
        observable_behaviors=[
            "過去の経験を詳細に記憶し、比較材料にする",
            "馴染みのある手順やルーティンを好む",
            "身体内部の感覚（体調、空腹、疲労）に敏感",
            "「前はこうだった」という比較が自然に出る",
            "伝統的な方法や実績のあるやり方を信頼する",
        ],
        question_patterns=[
            "新しいやり方と慣れたやり方、どちらを選びますか？",
            "過去の経験をどれぐらい鮮明に思い出せますか？",
            "体調の微妙な変化にすぐ気づく方ですか？",
        ],
    ),
    "Ne": CognitiveFunction(
        code="Ne",
        name_ja="外向的直観",
        name_en="Extraverted Intuition",
        axis="知覚",
        orientation="外向",
        description="可能性、パターン、つながりを外部世界に見出す。一つの事象から無限の可能性を展開する。",
        observable_behaviors=[
            "話題が次々と飛ぶが、本人の中ではつながっている",
            "「もし〜だったら」「〜とも言える」が頻出",
            "ブレインストーミングが得意で、アイデアが枯れない",
            "既存のものを新しい方法で組み合わせる",
            "一つに決めることへの抵抗感がある",
        ],
        question_patterns=[
            "一つのアイデアから連想が広がりやすいですか？",
            "可能性を広げるのと絞り込むの、どちらが自然ですか？",
            "「普通」のやり方に退屈を感じますか？",
        ],
    ),
    "Ni": CognitiveFunction(
        code="Ni",
        name_ja="内向的直観",
        name_en="Introverted Intuition",
        axis="知覚",
        orientation="内向",
        description="深層のパターンを見抜き、未来のビジョンを内面で構築する。一つの核心的な洞察に収束する。",
        observable_behaviors=[
            "「何かが違う」という直観が先に来て、後から理由がわかる",
            "長期的なビジョンや将来像を内面で描く",
            "複雑な情報を一つの核心に収束させる",
            "比喩やシンボルで考える",
            "答えが突然降りてくる感覚がある",
        ],
        question_patterns=[
            "答えが突然ひらめく経験はありますか？",
            "10年後の自分のビジョンが見えていますか？",
            "「なぜそう思うか」を論理的に説明しにくいことがありますか？",
        ],
    ),
    "Te": CognitiveFunction(
        code="Te",
        name_ja="外向的思考",
        name_en="Extraverted Thinking",
        axis="判断",
        orientation="外向",
        description="客観的な基準、効率、結果で判断する。外部のデータ、システム、手順を組織化する。",
        observable_behaviors=[
            "「結果」「効率」「データ」を重視する",
            "To-doリストや計画表で物事を管理する",
            "「根拠は？」「数字で見せて」が自然に出る",
            "決断が早く、すぐ実行に移す",
            "非効率なプロセスにストレスを感じる",
        ],
        question_patterns=[
            "何かを決める時、データや客観的根拠をどれぐらい重視しますか？",
            "計画を立てて管理するのは得意ですか？",
            "効率の悪さにイライラしますか？",
        ],
    ),
    "Ti": CognitiveFunction(
        code="Ti",
        name_ja="内向的思考",
        name_en="Introverted Thinking",
        axis="判断",
        orientation="内向",
        description="内的な論理フレームワークで分析する。整合性、正確性、分類を重視する。",
        observable_behaviors=[
            "「なぜ？」「それは正確には何を意味する？」と掘り下げる",
            "独自の論理体系を構築する",
            "定義の曖昧さが気になる",
            "既存の分類や理論の矛盾を発見する",
            "自分の考えを体系立てて内面で整理する",
        ],
        question_patterns=[
            "言葉の定義が曖昧だと気になりますか？",
            "「なぜそうなるのか」を自分で納得するまで考えますか？",
            "既存の理論や分類の矛盾を見つけることがありますか？",
        ],
    ),
    "Fe": CognitiveFunction(
        code="Fe",
        name_ja="外向的感情",
        name_en="Extraverted Feeling",
        axis="判断",
        orientation="外向",
        description="グループの調和、他者の感情、社会的な価値観に基づいて判断する。",
        observable_behaviors=[
            "場の雰囲気を瞬時に読み取る",
            "他者の感情に自動的に同調する",
            "グループの調和を維持するために行動する",
            "感情表現が豊かで、共感を言葉にする",
            "社会的な礼儀やマナーを自然に守る",
        ],
        question_patterns=[
            "周囲の人の気分が変わった時、すぐに気づきますか？",
            "場の雰囲気が悪いと、自分から改善しようとしますか？",
            "他人が喜んでくれることに、自分も喜びを感じますか？",
        ],
    ),
    "Fi": CognitiveFunction(
        code="Fi",
        name_ja="内向的感情",
        name_en="Introverted Feeling",
        axis="判断",
        orientation="内向",
        description="内面の価値観、真実性、個人的な倫理で判断する。自分の感情の深層に向き合う。",
        observable_behaviors=[
            "「自分にとって本物か」「心から信じられるか」が基準",
            "感情を表に出さないが、内面では非常に深く感じている",
            "自分の価値観に反することには静かに抵抗する",
            "他者の痛みを自分事のように感じる（共感ではなく同一化）",
            "表面的な社交が苦手で、深い一対一の関係を好む",
        ],
        question_patterns=[
            "自分の価値観に反することを求められたら、どう感じますか？",
            "感情を言葉にするのは得意ですか、苦手ですか？",
            "「本物かどうか」が判断基準になることがありますか？",
        ],
    ),
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Beebeモデルの8つの元型位置
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEEBE_ARCHETYPES: dict[int, BeebeArchetype] = {
    1: BeebeArchetype(
        position=1,
        name_en="Hero/Heroine",
        name_ja="英雄（ヒーロー）",
        role="主機能",
        consciousness_level="意識的",
        description="最も発達し、自信を持って使う機能。自我の中心。",
        behavioral_signature="この機能を使っている時、最も自然で自信がある。困難に直面した時、最初に使う。",
    ),
    2: BeebeArchetype(
        position=2,
        name_en="Good Parent",
        name_ja="良き親",
        role="補助機能",
        consciousness_level="意識的",
        description="他者を助け、支援するために使う機能。主機能を補完する。",
        behavioral_signature="他者のニーズに応える時に自然に使う。助言や支援の形で現れる。",
    ),
    3: BeebeArchetype(
        position=3,
        name_en="Eternal Child (Puer/Puella)",
        name_ja="永遠の子供",
        role="第三機能",
        consciousness_level="意識的（未成熟）",
        description="遊び心と脆弱さが共存する機能。創造性の源だが、未熟。",
        behavioral_signature="楽しい時に出てくるが、ストレス下では幼稚な形で現れる。",
    ),
    4: BeebeArchetype(
        position=4,
        name_en="Anima/Animus",
        name_ja="アニマ/アニムス",
        role="劣等機能",
        consciousness_level="意識と無意識の境界",
        description="最も未発達で、憧れと恐怖の対象。成長の最大の鍵。",
        behavioral_signature="強く惹かれるが同時に不安を感じる領域。この機能が上手い人に惹かれる。",
    ),
    5: BeebeArchetype(
        position=5,
        name_en="Opposing Personality",
        name_ja="対抗的人格",
        role="主機能の影",
        consciousness_level="無意識的",
        description="他者からの批判や攻撃に対する防衛として出現する。",
        behavioral_signature="追い詰められた時に、普段と正反対の態度で反撃する。「いつもの自分らしくない」反応。",
    ),
    6: BeebeArchetype(
        position=6,
        name_en="Critical Parent (Senex/Witch)",
        name_ja="批判的な親（老賢者/魔女）",
        role="補助機能の影",
        consciousness_level="無意識的",
        description="他者を批判し、コントロールする形で出現する。",
        behavioral_signature="他者の弱点を的確に突く。「こうすべきだ」と上から断言する。",
    ),
    7: BeebeArchetype(
        position=7,
        name_en="Trickster",
        name_ja="トリックスター",
        role="第三機能の影",
        consciousness_level="無意識的",
        description="混乱を引き起こし、ダブルバインドを生む。自他を欺く。",
        behavioral_signature="自分でも気づかないうちに矛盾した行動をする。他者を混乱させる。",
    ),
    8: BeebeArchetype(
        position=8,
        name_en="Demon/Daimon",
        name_ja="デーモン（魔神）",
        role="劣等機能の影",
        consciousness_level="深層無意識",
        description="最も破壊的だが、統合されれば最も変容力のある機能。",
        behavioral_signature="極限のストレスで出現。自他を深く傷つけるか、または突破口となる。",
    ),
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 16タイプの機能スタック
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNCTION_STACKS: dict[str, FunctionStack] = {
    "INTJ": FunctionStack(
        mbti_code="INTJ",
        functions=[
            ("Ni", "Hero"), ("Te", "Parent"), ("Fi", "Child"), ("Se", "Inferior"),
            ("Ne", "Opposing"), ("Ti", "Critical Parent"), ("Fe", "Trickster"), ("Si", "Demon"),
        ],
        dominant="Ni", auxiliary="Te", tertiary="Fi", inferior="Se",
        opposing="Ne", critical_parent="Ti", trickster="Fe", demon="Si",
    ),
    "INTP": FunctionStack(
        mbti_code="INTP",
        functions=[
            ("Ti", "Hero"), ("Ne", "Parent"), ("Si", "Child"), ("Fe", "Inferior"),
            ("Te", "Opposing"), ("Ni", "Critical Parent"), ("Se", "Trickster"), ("Fi", "Demon"),
        ],
        dominant="Ti", auxiliary="Ne", tertiary="Si", inferior="Fe",
        opposing="Te", critical_parent="Ni", trickster="Se", demon="Fi",
    ),
    "ENTJ": FunctionStack(
        mbti_code="ENTJ",
        functions=[
            ("Te", "Hero"), ("Ni", "Parent"), ("Se", "Child"), ("Fi", "Inferior"),
            ("Ti", "Opposing"), ("Ne", "Critical Parent"), ("Si", "Trickster"), ("Fe", "Demon"),
        ],
        dominant="Te", auxiliary="Ni", tertiary="Se", inferior="Fi",
        opposing="Ti", critical_parent="Ne", trickster="Si", demon="Fe",
    ),
    "ENTP": FunctionStack(
        mbti_code="ENTP",
        functions=[
            ("Ne", "Hero"), ("Ti", "Parent"), ("Fe", "Child"), ("Si", "Inferior"),
            ("Ni", "Opposing"), ("Te", "Critical Parent"), ("Fi", "Trickster"), ("Se", "Demon"),
        ],
        dominant="Ne", auxiliary="Ti", tertiary="Fe", inferior="Si",
        opposing="Ni", critical_parent="Te", trickster="Fi", demon="Se",
    ),
    "INFJ": FunctionStack(
        mbti_code="INFJ",
        functions=[
            ("Ni", "Hero"), ("Fe", "Parent"), ("Ti", "Child"), ("Se", "Inferior"),
            ("Ne", "Opposing"), ("Fi", "Critical Parent"), ("Te", "Trickster"), ("Si", "Demon"),
        ],
        dominant="Ni", auxiliary="Fe", tertiary="Ti", inferior="Se",
        opposing="Ne", critical_parent="Fi", trickster="Te", demon="Si",
    ),
    "INFP": FunctionStack(
        mbti_code="INFP",
        functions=[
            ("Fi", "Hero"), ("Ne", "Parent"), ("Si", "Child"), ("Te", "Inferior"),
            ("Fe", "Opposing"), ("Ni", "Critical Parent"), ("Se", "Trickster"), ("Ti", "Demon"),
        ],
        dominant="Fi", auxiliary="Ne", tertiary="Si", inferior="Te",
        opposing="Fe", critical_parent="Ni", trickster="Se", demon="Ti",
    ),
    "ENFJ": FunctionStack(
        mbti_code="ENFJ",
        functions=[
            ("Fe", "Hero"), ("Ni", "Parent"), ("Se", "Child"), ("Ti", "Inferior"),
            ("Fi", "Opposing"), ("Ne", "Critical Parent"), ("Si", "Trickster"), ("Te", "Demon"),
        ],
        dominant="Fe", auxiliary="Ni", tertiary="Se", inferior="Ti",
        opposing="Fi", critical_parent="Ne", trickster="Si", demon="Te",
    ),
    "ENFP": FunctionStack(
        mbti_code="ENFP",
        functions=[
            ("Ne", "Hero"), ("Fi", "Parent"), ("Te", "Child"), ("Si", "Inferior"),
            ("Ni", "Opposing"), ("Fe", "Critical Parent"), ("Ti", "Trickster"), ("Se", "Demon"),
        ],
        dominant="Ne", auxiliary="Fi", tertiary="Te", inferior="Si",
        opposing="Ni", critical_parent="Fe", trickster="Ti", demon="Se",
    ),
    "ISTJ": FunctionStack(
        mbti_code="ISTJ",
        functions=[
            ("Si", "Hero"), ("Te", "Parent"), ("Fi", "Child"), ("Ne", "Inferior"),
            ("Se", "Opposing"), ("Ti", "Critical Parent"), ("Fe", "Trickster"), ("Ni", "Demon"),
        ],
        dominant="Si", auxiliary="Te", tertiary="Fi", inferior="Ne",
        opposing="Se", critical_parent="Ti", trickster="Fe", demon="Ni",
    ),
    "ISFJ": FunctionStack(
        mbti_code="ISFJ",
        functions=[
            ("Si", "Hero"), ("Fe", "Parent"), ("Ti", "Child"), ("Ne", "Inferior"),
            ("Se", "Opposing"), ("Fi", "Critical Parent"), ("Te", "Trickster"), ("Ni", "Demon"),
        ],
        dominant="Si", auxiliary="Fe", tertiary="Ti", inferior="Ne",
        opposing="Se", critical_parent="Fi", trickster="Te", demon="Ni",
    ),
    "ESTJ": FunctionStack(
        mbti_code="ESTJ",
        functions=[
            ("Te", "Hero"), ("Si", "Parent"), ("Ne", "Child"), ("Fi", "Inferior"),
            ("Ti", "Opposing"), ("Se", "Critical Parent"), ("Ni", "Trickster"), ("Fe", "Demon"),
        ],
        dominant="Te", auxiliary="Si", tertiary="Ne", inferior="Fi",
        opposing="Ti", critical_parent="Se", trickster="Ni", demon="Fe",
    ),
    "ESFJ": FunctionStack(
        mbti_code="ESFJ",
        functions=[
            ("Fe", "Hero"), ("Si", "Parent"), ("Ne", "Child"), ("Ti", "Inferior"),
            ("Fi", "Opposing"), ("Se", "Critical Parent"), ("Ni", "Trickster"), ("Te", "Demon"),
        ],
        dominant="Fe", auxiliary="Si", tertiary="Ne", inferior="Ti",
        opposing="Fi", critical_parent="Se", trickster="Ni", demon="Te",
    ),
    "ISTP": FunctionStack(
        mbti_code="ISTP",
        functions=[
            ("Ti", "Hero"), ("Se", "Parent"), ("Ni", "Child"), ("Fe", "Inferior"),
            ("Te", "Opposing"), ("Si", "Critical Parent"), ("Ne", "Trickster"), ("Fi", "Demon"),
        ],
        dominant="Ti", auxiliary="Se", tertiary="Ni", inferior="Fe",
        opposing="Te", critical_parent="Si", trickster="Ne", demon="Fi",
    ),
    "ISFP": FunctionStack(
        mbti_code="ISFP",
        functions=[
            ("Fi", "Hero"), ("Se", "Parent"), ("Ni", "Child"), ("Te", "Inferior"),
            ("Fe", "Opposing"), ("Si", "Critical Parent"), ("Ne", "Trickster"), ("Ti", "Demon"),
        ],
        dominant="Fi", auxiliary="Se", tertiary="Ni", inferior="Te",
        opposing="Fe", critical_parent="Si", trickster="Ne", demon="Ti",
    ),
    "ESTP": FunctionStack(
        mbti_code="ESTP",
        functions=[
            ("Se", "Hero"), ("Ti", "Parent"), ("Fe", "Child"), ("Ni", "Inferior"),
            ("Si", "Opposing"), ("Te", "Critical Parent"), ("Fi", "Trickster"), ("Ne", "Demon"),
        ],
        dominant="Se", auxiliary="Ti", tertiary="Fe", inferior="Ni",
        opposing="Si", critical_parent="Te", trickster="Fi", demon="Ne",
    ),
    "ESFP": FunctionStack(
        mbti_code="ESFP",
        functions=[
            ("Se", "Hero"), ("Fi", "Parent"), ("Te", "Child"), ("Ni", "Inferior"),
            ("Si", "Opposing"), ("Fe", "Critical Parent"), ("Ti", "Trickster"), ("Ne", "Demon"),
        ],
        dominant="Se", auxiliary="Fi", tertiary="Te", inferior="Ni",
        opposing="Si", critical_parent="Fe", trickster="Ti", demon="Ne",
    ),
}
