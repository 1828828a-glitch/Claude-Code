"""Dario Nardi 脳タイプモデル：EEG脳活動パターンの包括的データ定義

Nardiの研究では、MBTIの16タイプそれぞれに特徴的な脳活動パターンが
EEG（脳波計）で観察された。各タイプが問題解決やストレスに直面した際、
脳のどの領域がどのように活性化するかが異なる。
"""

from enneagram_tool.models.nardi import BrainRegion, NeuralPattern

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 脳領域定義（Nardi EEGマッピングの主要領域）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BRAIN_REGIONS: dict[str, BrainRegion] = {
    "F3": BrainRegion("F3", "左前頭", "Left Frontal", "前頭葉左側",
        "論理的分析、言語処理、段階的推論"),
    "F4": BrainRegion("F4", "右前頭", "Right Frontal", "前頭葉右側",
        "パターン認識、直観、文脈理解"),
    "Fp1": BrainRegion("Fp1", "左前頭極", "Left Prefrontal", "前頭前皮質左側",
        "計画、意思決定、実行機能"),
    "Fp2": BrainRegion("Fp2", "右前頭極", "Right Prefrontal", "前頭前皮質右側",
        "想像、創造性、将来のシミュレーション"),
    "C3": BrainRegion("C3", "左中心", "Left Central", "中心溝左側",
        "運動制御、手順実行、身体協調"),
    "C4": BrainRegion("C4", "右中心", "Right Central", "中心溝右側",
        "空間認識、身体感覚、環境マッピング"),
    "T3": BrainRegion("T3", "左側頭", "Left Temporal", "側頭葉左側",
        "言語理解、記憶、カテゴリ分類"),
    "T4": BrainRegion("T4", "右側頭", "Right Temporal", "側頭葉右側",
        "感情処理、音楽、社会的手がかり"),
    "P3": BrainRegion("P3", "左頭頂", "Left Parietal", "頭頂葉左側",
        "論理的関係、数学、構造分析"),
    "P4": BrainRegion("P4", "右頭頂", "Right Parietal", "頭頂葉右側",
        "空間関係、視覚処理、全体把握"),
    "O1": BrainRegion("O1", "左後頭", "Left Occipital", "後頭葉左側",
        "視覚処理（詳細）、文字認識"),
    "O2": BrainRegion("O2", "右後頭", "Right Occipital", "後頭葉右側",
        "視覚処理（全体）、パターン視覚化"),
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 16タイプ別の脳活動パターン（Nardiの研究に基づく）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEURAL_PATTERNS: dict[str, NeuralPattern] = {
    "INTJ": NeuralPattern(
        mbti_type="INTJ",
        pattern_name_ja="全脳同期型（ゾーン）",
        pattern_name_en="Whole-Brain Zen State",
        description="課題に没頭すると、脳全体が低周波で同期する「ゾーン」状態に入る。"
                    "テニスの壁打ちのように、脳内の複数領域が一斉にリズムを合わせる。",
        active_regions=["Fp1", "Fp2", "F3", "F4", "P3", "P4"],
        signature_behavior="外界の刺激を遮断し、問題に完全に没入。周囲が見えなくなる。",
        problem_solving_style="ビジョンを内面で練り上げ、全体像が見えた時点で一気に行動。",
        stress_response="過集中で感覚入力を遮断。身体的ニーズ（空腹・疲労）を無視する。",
    ),
    "INTP": NeuralPattern(
        mbti_type="INTP",
        pattern_name_ja="多領域並列処理型",
        pattern_name_en="Multiple-Region Parallel Processing",
        description="脳の離れた複数領域が同時に活性化し、並列的に情報を処理する。"
                    "一見無関係な概念間のつながりを発見する。",
        active_regions=["F3", "F4", "P3", "P4", "T3", "T4"],
        signature_behavior="会話中に長い沈黙があるが、内面では複数の思考ラインを同時進行。",
        problem_solving_style="複数のフレームワークで同時に問題を分析し、最も整合的な解を選ぶ。",
        stress_response="分析が堂々巡りになり、決断できなくなる。社交的になることも（Fe劣等の噴出）。",
    ),
    "ENTJ": NeuralPattern(
        mbti_type="ENTJ",
        pattern_name_ja="前頭指令型",
        pattern_name_en="Frontal Executive Command",
        description="前頭前皮質が強く活性化し、他の脳領域を指揮するように統制する。"
                    "まるで司令塔から軍隊を指揮するような脳活動。",
        active_regions=["Fp1", "Fp2", "F3", "T3"],
        signature_behavior="議論をリードし、結論に向けて場をコントロール。曖昧さを許容しない。",
        problem_solving_style="目標を設定し、最短ルートで到達する戦略を即座に構築。",
        stress_response="コントロール欲が過剰になり、独裁的に。細部に囚われ始めると危険信号。",
    ),
    "ENTP": NeuralPattern(
        mbti_type="ENTP",
        pattern_name_ja="クリスマスツリー型",
        pattern_name_en="Christmas Tree Pattern",
        description="新しい刺激を受けるたびに、脳全体がランダムに点滅するように活性化。"
                    "刺激→活性化→新しい接続→次の刺激、というサイクルが超高速で回る。",
        active_regions=["F3", "F4", "Fp2", "T3", "T4", "P4"],
        signature_behavior="話しながらアイデアが次々と生まれる。会話が最大の思考ツール。",
        problem_solving_style="ブレインストーミング的に可能性を爆発させ、面白い選択肢を見つける。",
        stress_response="アイデアが拡散しすぎて収束できない。批判的になり周囲を攻撃することも。",
    ),
    "INFJ": NeuralPattern(
        mbti_type="INFJ",
        pattern_name_ja="トランスリミナル統合型",
        pattern_name_en="Trans-Contextual Integration",
        description="前頭前皮質と側頭葉が強く連携し、異なる文脈の情報を統合する。"
                    "他者の内面世界を直観的に把握する脳活動パターン。",
        active_regions=["Fp1", "Fp2", "T4", "F4"],
        signature_behavior="相手の言葉の裏にある感情やニーズを直観的に把握。「あなたは本当はこう思っている」。",
        problem_solving_style="直観で全体像を掴み、人間関係の文脈で最適解を見出す。",
        stress_response="他者の感情を過剰に取り込み、自他の境界が曖昧に。感覚過負荷で引きこもる。",
    ),
    "INFP": NeuralPattern(
        mbti_type="INFP",
        pattern_name_ja="内的シミュレーション型",
        pattern_name_en="Internal Simulation Mode",
        description="脳全体が穏やかに活性化し、内面で複数のシナリオをシミュレーション。"
                    "特に感情関連の領域が豊かに活動する。",
        active_regions=["Fp2", "F4", "T4", "P4", "O2"],
        signature_behavior="物思いにふける時間が長い。感情的な体験を内面で何度も再生・再解釈。",
        problem_solving_style="自分の価値観に照らして、最も「正しい」と感じる選択を内面で探索。",
        stress_response="感情の過負荷で引きこもり。極度のストレスで冷酷に論理的になることも（Te劣等の噴出）。",
    ),
    "ENFJ": NeuralPattern(
        mbti_type="ENFJ",
        pattern_name_ja="対人同期型",
        pattern_name_en="Interpersonal Synchronization",
        description="他者と対話する際、相手の脳活動パターンに同期するかのように"
                    "自身の脳活動が変化する。ミラーリングの達人。",
        active_regions=["F4", "T4", "Fp1", "Fp2"],
        signature_behavior="相手に合わせて話し方、テンポ、感情表現を自動調整。グループのファシリテーター。",
        problem_solving_style="人間関係のダイナミクスを把握し、全員が最大のパフォーマンスを出せる環境を構築。",
        stress_response="他者のニーズに応えすぎて自分を見失う。無視されると激しい反応を示す。",
    ),
    "ENFP": NeuralPattern(
        mbti_type="ENFP",
        pattern_name_ja="可能性爆発型",
        pattern_name_en="Possibility Explosion",
        description="新しい情報に接すると、脳の複数領域が連鎖的に活性化。"
                    "一つの刺激から無数の連想が広がる。",
        active_regions=["Fp2", "F4", "T3", "T4", "P4"],
        signature_behavior="目を輝かせながらアイデアを語る。話題が飛ぶが、感情的な一貫性がある。",
        problem_solving_style="人間の可能性にフォーカスし、創造的で独自の解決策を見出す。",
        stress_response="選択肢の多さに圧倒される。ストレスで細部に固執し始めると危険信号。",
    ),
    "ISTJ": NeuralPattern(
        mbti_type="ISTJ",
        pattern_name_ja="手順実行型",
        pattern_name_en="Procedural Execution",
        description="左脳領域が安定的に活性化し、手順に沿って着実に情報を処理。"
                    "過去のデータベースとの照合が自動的に行われる。",
        active_regions=["F3", "C3", "T3", "P3"],
        signature_behavior="決められた手順を正確に実行。マニュアルやチェックリストを好む。",
        problem_solving_style="過去の成功事例を参照し、実績のある方法を適用。",
        stress_response="想定外の事態でフリーズ。手順がないと不安が急上昇。",
    ),
    "ISFJ": NeuralPattern(
        mbti_type="ISFJ",
        pattern_name_ja="記憶照合型",
        pattern_name_en="Memory Matching",
        description="側頭葉と前頭葉の左側が連携し、過去の経験・感情記憶と照合して判断。"
                    "特に対人的な記憶が豊かに保持される。",
        active_regions=["F3", "T3", "T4", "C3"],
        signature_behavior="「前にこういうことがあったから」と過去の経験を基準にする。人の好みを覚えている。",
        problem_solving_style="過去の経験と他者へのケアを統合して、安全で思いやりのある解決策を選ぶ。",
        stress_response="変化に対する不安が強まる。「こうなるはずだった」というギャップに苦しむ。",
    ),
    "ESTJ": NeuralPattern(
        mbti_type="ESTJ",
        pattern_name_ja="実行管理型",
        pattern_name_en="Execution Management",
        description="前頭前皮質と左脳領域が強く連携し、計画→実行→確認のサイクルを高速で回す。",
        active_regions=["Fp1", "F3", "T3", "C3"],
        signature_behavior="計画を立て、タスクを割り振り、進捗を確認。効率の最大化を追求。",
        problem_solving_style="既存のシステムやルールを活用し、最も効率的な方法で問題を解決。",
        stress_response="コントロールできない状況で強い不安。感情的な問題に対処できず、回避する。",
    ),
    "ESFJ": NeuralPattern(
        mbti_type="ESFJ",
        pattern_name_ja="社会的調和型",
        pattern_name_en="Social Harmony Orchestration",
        description="右側頭葉（感情処理）と前頭葉が連携し、グループの感情状態をリアルタイムで監視。",
        active_regions=["T4", "F3", "F4", "Fp1"],
        signature_behavior="グループの雰囲気を管理し、全員が心地よい状態を維持しようとする。",
        problem_solving_style="人間関係の調和を維持しながら、実績のある方法で問題を解決。",
        stress_response="調和が乱れると過度な介入。批判されると自己価値の危機を感じる。",
    ),
    "ISTP": NeuralPattern(
        mbti_type="ISTP",
        pattern_name_ja="レーザー集中型",
        pattern_name_en="Laser Focus",
        description="課題に取り組む際、必要な脳領域のみがピンポイントで活性化し、"
                    "他の領域は完全に静まる。極めて効率的な脳の使い方。",
        active_regions=["F3", "C3", "C4", "P3"],
        signature_behavior="手を動かしながら考える。道具や機械との対話が自然。",
        problem_solving_style="問題を分解し、最小限の手順で最大の効果を出す。実験と検証を繰り返す。",
        stress_response="感情的な場面で完全にシャットダウン。沈黙が長くなる。",
    ),
    "ISFP": NeuralPattern(
        mbti_type="ISFP",
        pattern_name_ja="感覚統合型",
        pattern_name_en="Sensory Integration",
        description="五感の情報と内面の価値観が統合される。右脳領域全体が穏やかに活性化し、"
                    "美的・感情的な体験を深く処理。",
        active_regions=["F4", "T4", "P4", "O2", "C4"],
        signature_behavior="体験を通じて学び、感覚的な美しさに敏感。言葉より行動で表現。",
        problem_solving_style="自分の価値観に合う方法を感覚的に選択。実際にやってみて判断。",
        stress_response="価値観を侵害されると静かに引きこもる。極度のストレスで攻撃的になることも。",
    ),
    "ESTP": NeuralPattern(
        mbti_type="ESTP",
        pattern_name_ja="即応反射型",
        pattern_name_en="Rapid Response Reflex",
        description="感覚入力に対して脳が即座に反応し、運動領域が連動して活性化。"
                    "「考えるより先に体が動く」脳活動パターン。",
        active_regions=["C3", "C4", "F3", "T3"],
        signature_behavior="状況を瞬時に把握し、身体的に反応。危機管理が得意。",
        problem_solving_style="まず行動し、結果を見て調整。理論より実践。",
        stress_response="退屈で衝動的になる。刺激を求めてリスクの高い行動を取ることも。",
    ),
    "ESFP": NeuralPattern(
        mbti_type="ESFP",
        pattern_name_ja="体験共有型",
        pattern_name_en="Experiential Sharing",
        description="感覚領域と感情領域が同時に活性化し、「今この瞬間」の体験を"
                    "他者と共有することで最大の活性化が起きる。",
        active_regions=["C3", "C4", "T4", "F4"],
        signature_behavior="場を盛り上げ、全員が楽しめる体験を創出。エンターテイナー。",
        problem_solving_style="人を巻き込み、楽しみながら問題を解決。実践的で現実的。",
        stress_response="注目されないと不安。ストレスで引きこもり、将来を悲観的に考え始める。",
    ),
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Nardiの問題解決アプローチ分類
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NARDI_PROBLEM_SOLVING_STYLES: dict[str, str] = {
    "zone_out": "外界を遮断し、内面で深く集中する（Ni主導：INTJ, INFJ）",
    "parallel_process": "複数のフレームワークで同時に分析する（Ti主導：INTP, ISTP）",
    "command_control": "前頭葉を司令塔として、他の脳領域を統制する（Te主導：ENTJ, ESTJ）",
    "brainstorm_burst": "外部刺激から連鎖的にアイデアを展開する（Ne主導：ENTP, ENFP）",
    "mirror_match": "他者の脳パターンに同期し、共鳴から解を見出す（Fe主導：ENFJ, ESFJ）",
    "value_align": "内面の価値基準に照らして最適解を選ぶ（Fi主導：INFP, ISFP）",
    "procedural_map": "過去の手順データベースと照合して実行する（Si主導：ISTJ, ISFJ）",
    "action_first": "まず身体で反応し、結果から学ぶ（Se主導：ESTP, ESFP）",
}
