"""フリオチの分類・技法・作品分析（研究資料「フリオチの構造と実例大全」より）

12の基本型・20の技法名は、資料と作品分析を再編した実践用の分類であり、
確立した単一の学術分類ではない。作品の台詞は転載せず、筋立てを要約している。
"""

DEFINITION = "フリオチ = 聞き手の期待を設計し、理解可能なズレによって更新するコミュニケーション技術"

BASIC_FLOW: list[dict] = [
    {"stage": "フリ", "cognition": "専門家は基本知識を持っているはず",
     "example": "「この分野は5年間教えています」"},
    {"stage": "期待形成", "cognition": "だから当然、初歩的な説明もできる",
     "example": "「専門用語にも詳しいだろう」"},
    {"stage": "オチ", "cognition": "専門家イメージと食い違う発言が出る",
     "example": "「ChatGPTって何の略でしたっけ？」"},
    {"stage": "反応", "cognition": "同じ尺度で比較してズレを理解",
     "example": "「そこ知らないのかよ」"},
]

FURI_FUNCTIONS = [
    "オチを面白く感じさせるための期待を準備する",
    "オチに向かう導線をつくる",
    "オチの意味を聞き手が理解できるようにする",
]

THEORIES: list[dict] = [
    {"name": "不一致と解消",
     "point": "予測から外れた情報を把握し、そのズレに一定の意味を見いだす",
     "for_writing": "理解に必要な前提が欠けていないか確認する"},
    {"name": "対立する認知スクリプト",
     "point": "一つの状況が、両立しづらい二つの解釈を持つ",
     "for_writing": "プロと素人、重要と些細のような一組を選ぶ"},
    {"name": "無害な規範違反",
     "point": "常識破りでも安全で許容可能と受け取れることが重要",
     "for_writing": "取引先や社内で傷つく人がいないか点検する"},
    {"name": "漫才の言語操作",
     "point": "言語内容のズレだけでなく、質問への不返答や割り込みも笑いになる",
     "for_writing": "セリフの意味だけでなく、会話ルールも操作する"},
]

LAYERS: list[dict] = [
    {"layer": "I 伝達媒体", "axis": "何で期待をつくるか",
     "options": "言葉／容姿／動作／場面／関係性"},
    {"layer": "II ズレの方向", "axis": "どんな予測を裏切るか",
     "options": "大小／多寡／知識／能力／立場／言行／解釈／責任"},
    {"layer": "III 会話運用", "axis": "誰がいつ担うか",
     "options": "自分がフる／相手がフる／第三者がフる／時間差回収／反復"},
]

# 12の基本型
BASIC_TYPES: list[dict] = [
    {"no": 1, "name": "大小逆転", "flip": "大事件→小事", "example": "「一大事」→靴下を片方なくした"},
    {"no": 2, "name": "数量逆転", "flip": "多い→少ない", "example": "「友達めちゃくちゃ多い」→2人"},
    {"no": 3, "name": "知識矛盾", "flip": "詳しい→知らない", "example": "「野球通」→キャッチャーを知らない"},
    {"no": 4, "name": "能力逆転", "flip": "得意→失敗", "example": "「絶対勝つ」→一瞬で敗北"},
    {"no": 5, "name": "言動矛盾", "flip": "主張→自分が違反", "example": "「遅刻するな」→自分が遅刻"},
    {"no": 6, "name": "強弱逆転", "flip": "強気→弱気", "example": "「やるのか」→即土下座"},
    {"no": 7, "name": "価値逆転", "flip": "高級→身近", "example": "「穴場の名店」→大手チェーン"},
    {"no": 8, "name": "重要度逆転", "flip": "重大→些細", "example": "耳打ちで朝食の話"},
    {"no": 9, "name": "印象逆転", "flip": "風貌→意外な嗜好", "example": "怖そうな人がかわいいグッズ好き"},
    {"no": 10, "name": "立場逆転", "flip": "生徒→教師", "example": "「わからない」→完璧に説明"},
    {"no": 11, "name": "解釈転換", "flip": "通常の意味→別解釈", "example": "「仕事が半分」→受注半減"},
    {"no": 12, "name": "反復裏切り", "flip": "パターン→変形", "example": "奇妙な名前の連続→最後は普通"},
]

BASIC_TYPE_NAMES = [t["name"] for t in BASIC_TYPES]

# 20技法・逆引きリスト
TECHNIQUES: list[dict] = [
    {"no": 1, "name": "正反対", "operation": "強い主張の逆を出す", "seen_in": "かまいたち"},
    {"no": 2, "name": "確信と否定", "operation": "結論を何度も覆す", "seen_in": "ミルクボーイ"},
    {"no": 3, "name": "強弱逆転", "operation": "強い人物を弱くする", "seen_in": "Key & Peele系"},
    {"no": 4, "name": "知識矛盾", "operation": "知っている人が知らない", "seen_in": "代理教師"},
    {"no": 5, "name": "肯定の転換", "operation": "否定が来る場面で肯定", "seen_in": "ぺこぱ"},
    {"no": 6, "name": "誤り連打", "operation": "わかる誤りを連続提示", "seen_in": "ナイツ"},
    {"no": 7, "name": "二重解釈", "operation": "語句に二つの意味を与える", "seen_in": "Abbott & Costello"},
    {"no": 8, "name": "すれ違い", "operation": "会話の前提だけを違える", "seen_in": "アンジャッシュ"},
    {"no": 9, "name": "権威の空洞化", "operation": "肩書と実態に差をつくる", "seen_in": "Monty Python"},
    {"no": 10, "name": "目的逆転", "operation": "改善しようとして悪化", "seen_in": "Modern Times"},
    {"no": 11, "name": "責任の逆転", "operation": "失敗者が正しい側を責める", "seen_in": "代理教師"},
    {"no": 12, "name": "隠蔽連鎖", "operation": "隠すほど失敗が増える", "seen_in": "Mr. Bean"},
    {"no": 13, "name": "期待の増幅", "operation": "重大さを盛って小さく落とす", "seen_in": "Norm Macdonald"},
    {"no": 14, "name": "異常の正常化", "operation": "おかしなことを真剣に扱う", "seen_in": "Monty Python"},
    {"no": 15, "name": "普通がオチ", "operation": "異常反復の後で普通に戻す", "seen_in": "East/West Bowl"},
    {"no": 16, "name": "再定義", "operation": "同じ事実を別基準で捉える", "seen_in": "Mitch Hedberg"},
    {"no": 17, "name": "自己矛盾", "operation": "自分の主張と結論が衝突", "seen_in": "Emo Philips"},
    {"no": 18, "name": "演出のギャップ", "operation": "演出だけ立派で内容が変", "seen_in": "ロバート秋山"},
    {"no": 19, "name": "情報の後出し", "operation": "後半の新情報で再解釈", "seen_in": "空気階段"},
    {"no": 20, "name": "被害の拡大", "operation": "小さな失敗が大惨事に", "seen_in": "Friends"},
]

TECHNIQUE_NAMES = [t["name"] for t in TECHNIQUES]

# 作品分析。制作者本人がその技法名を用いていると主張するものではない
DOMESTIC_WORKS: list[dict] = [
    {"id": "J01", "title": "ミルクボーイ｜コーンフレーク", "core": "確信⇄否定の反復",
     "structure": "好きな朝食の特徴が特定の食品に一致したり矛盾したりして、結論が何度も反転する。",
     "transfer": "「Aだ」→「いや違う」を交互に重ね、観客に判定を楽しませる。", "source": 5},
    {"id": "J02", "title": "かまいたち｜UFJ・USJ", "core": "誤りの正当化",
     "structure": "言い間違いの訂正で終わるはずが、言い間違えた側が理屈を重ねて強気に振る舞う。",
     "transfer": "間違いを認めない本人の理屈を後付けで増幅する。", "source": 6},
    {"id": "J03", "title": "ぺこぱ｜タクシー漫才", "core": "ツッコミ期待の裏切り",
     "structure": "おかしな行動があれば否定される、と観客が予測する局面で、肯定する独特の返答が来る。",
     "transfer": "ボケそのものだけでなく、ツッコミがどう返すかを反転する。", "source": 5},
    {"id": "J04", "title": "ナイツ｜ヤホー漫才", "core": "言い間違いの連打",
     "structure": "調べ物を説明する体裁で、固有名詞や言葉の取り違えが続き、相方が訂正し続ける。",
     "transfer": "少数の大きな意外性より、わかる誤りをリズミカルに累積する。", "source": 13},
    {"id": "J05", "title": "アンジャッシュ｜すれ違いコント", "core": "二重文脈",
     "structure": "本人同士は自然に会話しているつもりだが、観客は話題の食い違いを把握している。",
     "transfer": "両者の発言をそれぞれ別文脈で整合させる。", "source": None},
    {"id": "J06", "title": "ジャルジャル｜野次ワクチン", "core": "同一ルールの反復と増幅",
     "structure": "新人歌手と指導役が、野次への耐性を鍛える状況から、独特の反復が発展する。",
     "transfer": "単純な1ルールを繰り返し、度合いと反応を変化させる。", "source": 7},
    {"id": "J07", "title": "陣内智則｜ゲームセンター", "core": "道具のルール逸脱",
     "structure": "ゲームセンターの機械に期待する操作や結果が、突拍子もない展開へ変わる。",
     "transfer": "機械やUIに役割を与え、正常に動くはずという前提を破る。", "source": 8},
    {"id": "J08", "title": "ロバート秋山｜クリエイターズ・ファイル", "core": "権威と奇妙な具体性",
     "structure": "一流専門家らしい映像・語り口に対し、作り込まれた架空の職業人の発言がズレる。",
     "transfer": "周辺の演出は徹底して真面目にし、中身を異常にする。", "source": None},
    {"id": "J09", "title": "和牛｜物件探し", "core": "情報の後出し",
     "structure": "不動産案内という通常の設定が進むにつれ、案内役の立場と物件との意外な関係が浮かぶ。",
     "transfer": "後からの情報で当初の場面解釈を更新する。", "source": None},
    {"id": "J10", "title": "空気階段｜火事", "core": "役割・状況の再定義",
     "structure": "危機的な状況で登場人物の役割や正体に新しい情報が付加され、観客の理解が変わる。",
     "transfer": "情報を段階開示して、観客の状況認識を何度も組み替える。", "source": None},
]

OVERSEAS_WORKS: list[dict] = [
    {"id": "W01", "title": "Abbott & Costello｜Who's on First?", "core": "二重解釈",
     "structure": "疑問詞が選手名として機能するため、質問と回答が何度も食い違う。",
     "transfer": "同じ語を別の意味で受け取る。", "source": 9},
    {"id": "W02", "title": "Monty Python｜Dead Parrot", "core": "事実の否定とエスカレーション",
     "structure": "死んだオウムの返品という明白な事実を、店員が認めず言い訳を増やす。",
     "transfer": "明白な事実を否定し、言い訳を段階的に大きくする。", "source": 10},
    {"id": "W03", "title": "Monty Python｜Argument Clinic", "core": "定義のすり替え",
     "structure": "議論する有料サービスを頼むが、議論ではなくただ否定し合う。",
     "transfer": "言葉の定義をずらしてサービスの中身を変える。", "source": 11},
    {"id": "W04", "title": "Monty Python｜Ministry of Silly Walks", "core": "形式と内容の落差",
     "structure": "行政機関のような厳粛な外観で、歩き方の奇妙さを制度的に扱う。",
     "transfer": "格調高い形式とくだらない内容の落差を使う。", "source": None},
    {"id": "W05", "title": "Key & Peele｜Substitute Teacher", "core": "責任の逆転",
     "structure": "代理教師が生徒の名前を次々に読み間違え、訂正する生徒を怒る。",
     "transfer": "権威ある人の誤りに、正しい人への逆ギレを重ねる。", "source": 14},
    {"id": "W06", "title": "Key & Peele｜East/West College Bowl", "core": "普通がオチ",
     "structure": "珍奇な選手名が続いた結果、ごく普通の名前が逆に意外な存在になる。",
     "transfer": "反復で基準を変え、最後に反転する。", "source": 12},
    {"id": "W07", "title": "Mr. Bean｜Steak Tartare", "core": "隠蔽連鎖",
     "structure": "注文した料理が期待と異なり、食べたくないのを隠す行動が失敗を重ねる。",
     "transfer": "隠そうとする努力が、さらなる失敗を呼ぶ。", "source": 15},
    {"id": "W08", "title": "Mr. Bean｜試験コント", "core": "能力不足の可視化",
     "structure": "試験を真面目に受けるはずが、解けずに不器用な行動に出る。",
     "transfer": "能力不足を行動の反復で見せる。", "source": None},
    {"id": "W09", "title": "Charlie Chaplin｜Modern Times", "core": "目的逆転",
     "structure": "効率化のための機械が、かえって人間を振り回す。",
     "transfer": "目的と結果を逆転させる。", "source": None},
    {"id": "W10", "title": "Buster Keaton｜Steamboat Bill, Jr.", "core": "危機→想定外の安全",
     "structure": "建物外壁が倒壊するが、窓の穴の位置で大事故が回避される。",
     "transfer": "最大の危機から、想定外の安全に着地する。", "source": None},
    {"id": "W11", "title": "The Office（米国版）｜Fire Drill", "core": "予防策→被害拡大",
     "structure": "安全確保のための訓練が、オフィスの大混乱を引き起こす。",
     "transfer": "予防のための行動が被害を広げる。", "source": None},
    {"id": "W12", "title": "Saturday Night Live｜More Cowbell", "core": "問題の増幅",
     "structure": "演奏改善の指示で、目立ちすぎるカウベルをさらに強調する。",
     "transfer": "問題を解消せずに増幅する。", "source": None},
    {"id": "W13", "title": "Seinfeld｜The Opposite", "core": "判断原則の反転",
     "structure": "間違った判断ばかりする主人公が、直感と反対の行動で好転する。",
     "transfer": "判断原則を反転して物語にする。", "source": None},
    {"id": "W14", "title": "Friends｜Pivot", "core": "節約→高コストの失敗",
     "structure": "配送料を節約しようとソファを運ぶが、運搬で重大なトラブルに陥る。",
     "transfer": "節約しようとして高くつく。", "source": None},
    {"id": "W15", "title": "Norm Macdonald｜Moth Joke", "core": "長いフリに極小のオチ",
     "structure": "蛾が深刻な人生相談を長く語るが、医者へ来た理由は単に明かりがついていたから。",
     "transfer": "フリを長く重くして、オチを極端に小さくする。", "source": 16},
    {"id": "W16", "title": "Mitch Hedberg｜Escalator", "core": "再定義",
     "structure": "故障したエスカレーターは使えないと思うが、階段としては使えると解釈し直す。",
     "transfer": "ものの状態を別の機能から再定義する。", "source": 18},
    {"id": "W17", "title": "Mitch Hedberg｜Girlfriend", "core": "後からの否定",
     "structure": "恋人はいないと主張した直後に、その発言を聞くと怒る女性がいると付け足す。",
     "transfer": "前の主張を後の情報で実質的に否定する。", "source": 18},
    {"id": "W18", "title": "Emo Philips｜Brain", "core": "自己矛盾",
     "structure": "脳を最も優れた器官だと思ったが、そう評価している主体も脳だと気づく。",
     "transfer": "判断そのものの前提を疑う。作者の誤帰属に注意。", "source": 19},
]

# 練習用の創作例（元ネタの引用ではない。実話として話すことは推奨しない）
ORIGINAL_EXAMPLES: list[dict] = [
    {"title": "理解していない生徒", "pattern": "立場逆転",
     "dialogue": "生徒「全然わからないので質問いいですか？」→先生「どこが？」→生徒「つまり分類を自動化し、緊急度で振り分け、最終承認は人がするんですよね？」→先生「午後から講師やってくれる？」",
     "breakdown": "フリは全然わからない。期待は基礎的な質問。オチは講師より明晰な説明。"},
    {"title": "詳しい講師", "pattern": "知識矛盾",
     "dialogue": "A「AI研修講師なんです」→B「一番多い質問は？」→A「『先生、画面共有できてません』です」",
     "breakdown": "フリはAI専門家。期待は高度な質問。オチは基本操作の失敗。"},
    {"title": "大人としての自立", "pattern": "自己矛盾",
     "dialogue": "A「30歳だし自立しようと思って」→B「何から？」→A「母親に自立の方法を聞いた」",
     "breakdown": "フリは自立への意欲。期待は本人の行動。オチは依存した相談。"},
    {"title": "AIで仕事半減", "pattern": "解釈転換",
     "dialogue": "A「AI導入で仕事が半分になった」→B「効率化？」→A「いや、依頼が半分になっただけ」",
     "breakdown": "フリは生産性向上。期待は業務時間の削減。オチは受注減。"},
    {"title": "分かっているつもり", "pattern": "立場逆転",
     "dialogue": "A「難しいことは言わないでください」→B「じゃあ簡単に」→A「要するに推論コストとワークフローの最適化の話ですよね？」",
     "breakdown": "フリは初心者。期待は簡潔な説明を希望。オチは本人が高度な説明。"},
]

PRODUCTION_STEPS = [
    "まず事実・失敗・奇妙な状況など、オチの候補を1つ決める",
    "聞き手が自然に想像する通常の展開を一文で書く",
    "通常展開と対照になるフリを、自然な会話として組み立てる",
    "断言・数字・第三者の後押しなどで、必要な期待だけを強める",
    "オチを短くし、説明や結論の先出しを削る",
    "声に出して試し、伝わらない箇所を修正する",
]

COMMON_FAILURES: list[dict] = [
    {"failure": "オチが唐突すぎて、なんで？となる", "fix": "予測の軸を先に明示する"},
    {"failure": "フリが長く、オチまで注意が続かない", "fix": "必要な情報以外を削る"},
    {"failure": "ボケを説明してしまう", "fix": "ツッコミが自然に出る状態を目指す"},
    {"failure": "正反対なだけで意外性がない", "fix": "数字・役割・行動の具体性を加える"},
    {"failure": "その場の相手が笑えない", "fix": "自分の失敗や安全な対象から始める"},
]

PRACTICE_PLAN: list[dict] = [
    {"period": "1〜3日", "task": "実際の会話や作品から毎日3例、フリとオチを抽出する",
     "check": "観客が何を期待したか言える"},
    {"period": "4〜7日", "task": "同じオチに3種類のフリをつける",
     "check": "正反対以外の型を使える"},
    {"period": "2週目", "task": "相手に渡すフリ・短いツッコミを作る",
     "check": "掛け合いで自然に成立する"},
    {"period": "3週目", "task": "実際の出来事を30秒エピソードにする",
     "check": "状況説明が短く、オチが明瞭"},
    {"period": "4週目", "task": "複数オチ・時間差回収に挑戦する",
     "check": "一つの会話で2箇所以上の笑いの場を設計"},
]

SOURCES: dict[int, dict] = {
    2: {"title": "Shultz (1972), The role of incongruity and resolution in children's appreciation of cartoon humor",
        "url": "https://www.sciencedirect.com/science/article/pii/0022096572900744"},
    3: {"title": "McGraw & Warren (2010), Benign Violations",
        "url": "https://pubmed.ncbi.nlm.nih.gov/20587696/"},
    4: {"title": "山本貴也（2007）漫才におけるおかしみの構造の言語学的分類",
        "url": "https://tufs.repo.nii.ac.jp/records/5414"},
    5: {"title": "M-1グランプリ2019 決勝リポート",
        "url": "https://www.m-1gp.com/archive/2019/report/"},
    6: {"title": "かまいたちチャンネル｜UFJ・USJ漫才",
        "url": "https://www.youtube.com/watch?v=Gp2hyXo4s4w"},
    7: {"title": "ジャルジャル公式「野次ワクチン」",
        "url": "https://www.youtube.com/watch?v=PBe-mI5q_ZU"},
    8: {"title": "陣内智則のネタジン「ゲームセンター」",
        "url": "https://www.youtube.com/watch?v=to_V661YMW0"},
    9: {"title": "Abbott and Costello Fan Club「Who's on First?」",
        "url": "https://abbottandcostellofanclub.com/whos-on-first/"},
    10: {"title": "Monty Python公式「Dead Parrot」",
         "url": "https://www.youtube.com/watch?v=TaFDzTzKAT0"},
    11: {"title": "Monty Python公式「Argument Clinic」",
         "url": "https://www.youtube.com/watch?v=DkQhK8O9Jik"},
    12: {"title": "Comedy Central公式「East/West College Bowl」",
         "url": "https://www.youtube.com/watch?v=gODZzSOelss"},
    13: {"title": "サンキュータツオ氏による漫才構造分析（BRUTUS）",
         "url": "https://brutus.jp/cn/post-60721/"},
    14: {"title": "Key & Peele「Substitute Teacher」作品情報",
         "url": "https://en.wikipedia.org/wiki/Substitute_Teacher_(Key_%26_Peele)"},
    15: {"title": "Mr Bean公式「Steak Tartare」",
         "url": "https://www.youtube.com/watch?v=C6QqSxmpRMM"},
    16: {"title": "TIME｜Norm Macdonald's Moth Joke 解説",
         "url": "https://time.com/6098035/norm-macdonald-comedy/"},
    17: {"title": "Raskin (1985), Semantic Mechanisms of Humor（理論概説）",
         "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8161202/"},
    18: {"title": "Comedy Central Presents Mitch Hedberg（演目の記録）",
         "url": "https://www.imdb.com/title/tt0454803/quotes/"},
    19: {"title": "Quote Investigator｜Emo Philipsの脳ジョーク帰属検証",
         "url": "https://quoteinvestigator.com/2021/01/10/brain-said/"},
}
