# refactor-instructions.md

エニアグラム統合タイプ判定ツール — リファクタリング指示書

このドキュメントは実装担当モデルへの作業指示書です。
**上から順に読み、Phase 0 から順番に実行してください。**
判断に迷ったら、勝手に決めずに「Stop And Ask Conditions」に従って停止してください。

---

## Objective

**目的は、既存仕様を壊さずに、判定結果の正しさを回復し、CLI と Web の二重実装による負債を減らし、今後テストしやすい構造にすることです。**

具体的には次の 3 点に絞ります。

1. **Web 版（Streamlit）が回答を一切スコアに反映していない致命的バグを直す。**
   現状、Web 版はどんな回答をしても常に「タイプ1 / 信頼度 高 / sp/sx」を返します（Phase 0 で再現確認します）。
2. **スコアリングのロジックが 5 箇所に散らばって重複している状態を、テスト可能な 1 箇所に集約する。**
3. **回帰を検出できる自動テストを追加する（現在テストは 0 件）。**

**やらないこと**：見た目を綺麗にすることは目的ではありません。古いコードを一律に「悪」と決めつけないでください。
証拠なしに大きな削除や全面書き換えをしないでください。

---

## Project Understanding

### これは何か

エニアグラム9タイプ × ユング/Beebe 認知機能 × Dario Nardi 脳タイプ、の3つの性格類型システムを
統合して自己申告アンケートからタイプを推定する、**日本語の、ローカル完結型の性格タイプ判定ツール**です。

- 外部 API 呼び出しなし
- データベースなし・マイグレーションなし
- 認証・課金・通知・ジョブ・キュー・ストレージ、いずれも**存在しません**
- ネットワーク送信なし。回答は Streamlit の `session_state`（プロセスメモリ）にのみ保持され、永続化されません
- 全データはリポジトリ内の Python リテラル（`enneagram_tool/data/*.py`）にハードコードされています

つまり、**本番データやユーザーデータを壊すリスクはありません**。壊れるとしたら「判定結果の内容」です。

### 主要なユーザー体験

| モード | CLI | Web | 内容 |
|---|---|---|---|
| フル判定 | `python -m enneagram_tool` | サイドバー「🎯 フル判定」 | 4 Phase の設問に回答 → 統合レポート |
| クイック判定 | `--quick` | 「⚡ クイック判定」 | 少数の設問 → 上位候補のみ |
| タイプ参照 | `--lookup N` | 「🔍 タイプ参照」 | 指定タイプの詳細を表示 |
| 相性分析 | `--compare A B` | 「⚖️ 相性分析」 | 2タイプの衝突パターン |
| データ探索 | `--explore` | 「📚 データ探索」 | 全データの閲覧 |
| 認知機能一覧 | `--functions` | （データ探索タブ内） | 8機能 + Beebe 8元型 |
| 機能衝突 | `--conflicts` | （データ探索タブ内） | 機能間の衝突パターン |

CLI と Web は**同じ機能セットを別々に再実装した二重構造**です。ここが最大の負債源です。

### エントリーポイント

- `enneagram_tool/__main__.py` → `enneagram_tool/main.py:main()`（argparse、637行）
- `streamlit_app.py`（974行、**全ロジックがモジュールトップレベルの if/elif に直書き**）

### モジュールと責務

```
enneagram_tool/
├── models/          データクラス定義のみ（振る舞いなし）
│   ├── enneagram.py  EnneagramType, Wing, InstinctualVariant, InstinctualStack, Tritype, TypeProfile
│   ├── cognitive.py  CognitiveFunction, BeebeArchetype, FunctionStack, CognitiveProfile
│   └── nardi.py      BrainRegion, NeuralPattern, NardiProfile
├── data/            静的データ（合計 1163 行）。全て検証済みで欠損なし
│   ├── enneagram_data.py   ENNEAGRAM_TYPES(9), WINGS(18), INSTINCTUAL_VARIANTS(3),
│   │                       INSTINCTUAL_STACKS(6), COUNTERTYPE_MAP(9)
│   ├── cognitive_data.py   COGNITIVE_FUNCTIONS(8), BEEBE_ARCHETYPES(8), FUNCTION_STACKS(16)
│   ├── nardi_data.py       BRAIN_REGIONS(12), NEURAL_PATTERNS(16), NARDI_PROBLEM_SOLVING_STYLES(8)
│   └── correlation_map.py  ENNEAGRAM_MBTI_CORRELATION(9), ENNEAGRAM_FUNCTION_BEHAVIORS(9),
│                           CONFLICT_PATTERNS(12), FUNCTION_CONFLICT_PATTERNS(8)
├── engine/
│   ├── questionnaire.py  設問定義(30問) + QuestionnaireEngine（スコア保持・集計）
│   └── analyzer.py       IntegratedAnalyzer（スコア → タイプ判定 → レポート dict）
└── utils/display.py      ターミナル表示ユーティリティ（CLI 専用）
```

### データフロー

```
ユーザー回答（"A"/"B"/"C"…の文字）
   ↓  ← ★ここの変換が CLI と Web で別実装。Web は壊れている
QuestionnaireEngine.score_*() が内部 dict に加点
   ├─ center_scores      {center_gut, center_heart, center_head}
   ├─ enneagram_scores   {type_1..type_9}
   ├─ cognitive_scores   {Se,Si,Ne,Ni,Te,Ti,Fe,Fi}
   ├─ instinct_scores    {sp,sx,so}
   ├─ orientation_scores {E,I}
   └─ raw_answers        {question_id: answer}   ← 記録のみ。判定に一切使われない
   ↓
IntegratedAnalyzer.generate_full_report()
   ├─ determine_enneagram_type()  → コアタイプ・ウィング・本能型・カウンタータイプ
   ├─ determine_cognitive_type()  → 主/補助機能 → MBTI 逆引き → FUNCTION_STACKS / NEURAL_PATTERNS
   └─ generate_cross_analysis()   → 相関・統合ノート
   ↓
プレーンな dict（型なし）
   ↓
CLI: main.py が print / Web: streamlit_app.py が st.markdown
```

**重要**：`IntegratedAnalyzer` の戻り値は型定義のない `dict` です。
`models/` に `TypeProfile` / `CognitiveProfile` / `NardiProfile` / `Tritype` が定義されていますが、
**どこからも一切使われていません**（検証済み：全ファイル grep で定義行のみヒット）。

### 外部依存

- ランタイム依存は `streamlit>=1.28.0` の**1つだけ**（`requirements.txt`）
- `enneagram_tool` パッケージ自体は標準ライブラリのみで動作（`argparse`, `dataclasses`, `os`）
- Python 3.10+ 必須（`list[str]`, `str | None` 構文を使用。検証環境は 3.11.15）
- **注意：現在の検証環境に streamlit はインストールされていません。**
  `import streamlit_app` は `ModuleNotFoundError` になります。テストはこれを前提に設計してください。

---

## Behaviors To Preserve

以下は**現在正しく動いており、絶対に壊してはいけない**挙動です。
Phase ごとに、変更前後で出力が一致することを確認してください。

1. **CLI の全モードが現在の出力を維持すること**
   - `--lookup 1`〜`--lookup 9` の出力テキスト
   - `--compare A B` の出力テキスト（全 36 通りの組み合わせ）
   - `--functions` / `--conflicts` の出力テキスト
   - `--explore` のメニュー番号と対応（0〜9）
2. **CLI フル判定の判定ロジック**：センター判定 → **優勢センターの詳細設問のみ**を出題・加点する現在の流れ
   （※これが仕様として正しいかは Q1 で確認が必要。**確認が取れるまで CLI 側は変えないこと**）
3. **ストレス方向設問の加点値 1.5**（他の設問は 1.0）。この重み付けを勝手に変えないこと
4. **本能型スタックの表記**（`"sp/sx"` のようなスラッシュ区切り 2 要素）
5. **カウンタータイプ警告の発火条件**：`COUNTERTYPE_MAP[core_type] == 本能型スタックの第1要素`
6. **`data/` 配下の全データ内容**。テキストの改変・要約・整形は禁止（Q4 の (5,2) 削除を除く）
7. **MBTI 逆引きのフォールバック順序**：完全一致 → 主機能一致かつ E/I 一致 → 候補の先頭 → 空文字
8. **免責文言**：「※ この結果は自己理解の参考としてご活用ください。…」を CLI・Web 双方から消さないこと
9. **CLI は追加依存なしで動くこと**。`enneagram_tool/` 配下に streamlit を import しないこと

---

## Non-Negotiables

作業中、以下は例外なく守ってください。

1. **最初に `git status` を実行**し、未コミット変更の有無を記録してから着手すること
2. **既存の未コミット変更と自分の変更を混ぜないこと**。既存の変更があれば、それには触れず報告すること
3. **編集前に Baseline Commands を全て実行し、結果を記録すること**（Phase 0）
4. **変更は小さく、戻しやすい単位でコミットすること**。1 Phase = 1 コミット以上に分割しない
5. **無関係な整形・ついでのリファクタリングをしないこと**
   - `black` / `ruff format` の一括適用は**禁止**（差分が巨大化しレビュー不能になる）
   - 触っていない行のインデント・引用符・改行を変えないこと
6. **既存挙動を勝手に変えないこと**。挙動を変える必要が出たら停止して質問すること
7. **正しさが不明な場合は実装を止めて質問すること**（Stop And Ask Conditions 参照）
8. **各 Phase の終わりに必ず検証を実行**し、結果を記録すること
9. **`data/` 配下のテキスト内容を書き換えないこと**（構造の変更も承認が必要）
10. **`.claude/skills/` 配下には一切触れないこと**（Anthropic 公式スキルのベンダーコピー。本件と無関係）
11. **最後に、実行したコマンドと結果を Reporting Format に従って報告すること**

---

## Stop And Ask Conditions

以下に該当したら、**実装を止めて、人間に質問してください**。推測で進めないでください。

- コードから正しい仕様が判断できない
- テストと実装が矛盾している
- 削除候補のコードが本当に不要か確証が持てない
- 公開 API / データ構造 / 保存済みデータに影響する可能性がある
- 互換性を壊す可能性がある
- 複数の設計案があり、プロダクト判断が必要
- **判定結果（出力されるタイプ番号・MBTI・スコア）が変わる変更**を行おうとしている
  （※ D-01 の修正は例外。理由は Debt Map 参照）

### すでに判明している「実装前に確認すべき質問」

**下記 Q1〜Q6 は、この指示書の作成者が既にコードを読んで「コードからは決められない」と判断したものです。
Phase 3 以降で該当箇所に触れる前に、回答を得てください。回答が得られない項目は着手せず、提案として報告してください。**

---

**Q1. CLI と Web で、センター詳細設問のスコアリング方針が違います。どちらが正しい仕様ですか？**

- CLI（`main.py:99-108`）：優勢センターの詳細設問**だけ**を出題し、加点する
- Web（`streamlit_app.py:244-272, 390-398`）：**3センター全ての**詳細設問を出題し、全て加点する

検証済みの実害：同じ回答傾向でも結果が変わります。

```
（センター=頭、各詳細設問でA を選択した場合）
Web 方式 : type_1=2.0, type_2=2.0, type_5=2.0 → コアタイプ 1
CLI 方式 : type_5=2.0                          → コアタイプ 5
```

Web 方式は同点が発生しやすく、同点時は dict 挿入順（= type_1 が有利）で決まります。

→ **回答が得られるまで、両者を統一しないでください。**

---

**Q2. Phase 3（Nardi 4問）・Phase 4（クロス 3問）・影の機能（shadow_1）・wing_check は、判定に反映すべきですか？**

検証済み：30問中 **9問が一切スコアに影響しません**。
`raw_answers` に記録されるだけで、`IntegratedAnalyzer` はこれを読みません。

```
スコアに影響しない設問: wing_check, shadow_1, nardi_1, nardi_2, nardi_3, nardi_4,
                        cross_1, cross_2, cross_3
```

- Web のホーム画面は「30問の質問で3システム統合判定」と表示していますが、実質 21 問しか効いていません
- Nardi 脳タイプの結果は、Nardi 設問ではなく **MBTI 推定値からの引き当て**で決まっています
- `NARDI_PROBLEM_SOLVING_STYLES`（8エントリ）は、`nardi_1` の 6 選択肢と**個数も内容も対応しません**。
  スコアリング設計が未完成のまま放置されたと見られます

選択肢：(a) 設計して実装する（新しいスコアリング仕様が必要）/ (b) 「参考情報のみ」と UI に明記する /
(c) 設問を削除する。**これはプロダクト判断です。実装担当が決めないでください。**

---

**Q3. `wing_check` 設問（`questionnaire.py:181-189`）は実装しますか、削除しますか？**

設問文自体が「（この質問はコアタイプ判定後に表示されます）」と書かれていますが、
CLI・Web いずれにも `subcategory == "wing"` を処理する分岐が存在せず、**一度も出題されません**。
現状ウィングは「隣接2タイプを両方候補として並べる」だけで、選択させていません。

---

**Q4. `CONFLICT_PATTERNS` に `(2,5)` と `(5,2)` が両方あり、内容が違います。どちらが正ですか？**

```python
(2,5): core_clash='2の「近づきたい」vs 5の「距離を保ちたい」'
(5,2): core_clash='5の「独立と距離」vs 2の「つながりと親密さ」'
```

- `analyzer.analyze_compatibility` は `(min,max)` を先に引くため、**`(5,2)` は永久に到達不能**
- しかし Web の「衝突パターン」タブ（`streamlit_app.py:962`）は生のキーを列挙するため、**両方が別項目として表示されます**
- 併せて `(6,3)` もキー順が逆（他は昇順）。こちらは reverse 引きで拾われるため動作はします

→ どちらのテキストを残すかは内容の判断です。**勝手に片方を消さないでください。**

---

**Q5. CLI と Web、今後どちらが主たる提供形態ですか？**

Phase 4〜5（共通レイヤ抽出）の投資量がこの回答で変わります。
「Web が主・CLI は開発用」なら共通化の優先度は下がり、「両方サポート」なら共通化が必須になります。

---

**Q6. 判定信頼度「高」の意味を変えてよいですか？**

現状 `analyzer.py:44` は「トップスコアのタイプが優勢センターに属するか」だけで「高」/「要確認」を決めます。
検証済みの問題：**全スコアが 0.0（=一切回答が反映されていない状態）でも「タイプ1・信頼度 高」と出ます。**

最小限のガード（スコアが全て 0 なら「判定不能」にする等）は妥当と思われますが、
「高」の判定式そのものを変えるのは仕様変更です。

---

## Baseline Commands

**Phase 0 で必ず全て実行し、出力を記録してください。**
以降の各 Phase で同じコマンドを再実行し、記録した baseline と比較します。

```bash
# 0. 作業前の状態確認（最初に必ず）
git status
git log --oneline -5

# 1. 構文チェック（全ファイルがコンパイルできること）
python3 -m compileall -q enneagram_tool streamlit_app.py

# 2. Lint（現在 9 件。数と内容を記録すること）
ruff check . --exclude .claude --output-format concise

# 3. 型チェック（現在 2 件。数と内容を記録すること）
mypy enneagram_tool --ignore-missing-imports

# 4. CLI 非対話モードのゴールデン出力を保存（★これが最重要の安全網）
mkdir -p /tmp/baseline
for i in 1 2 3 4 5 6 7 8 9; do
  python3 -m enneagram_tool --lookup $i > /tmp/baseline/lookup_$i.txt 2>&1
done
for a in 1 2 3 4 5 6 7 8 9; do for b in 1 2 3 4 5 6 7 8 9; do
  python3 -m enneagram_tool --compare $a $b > /tmp/baseline/compare_${a}_${b}.txt 2>&1
done; done
python3 -m enneagram_tool --functions  > /tmp/baseline/functions.txt  2>&1
python3 -m enneagram_tool --conflicts  > /tmp/baseline/conflicts.txt  2>&1

# 5. CLI フル判定のゴールデン出力（固定回答を流し込む）
printf 'A\n%.0s' {1..40} | python3 -m enneagram_tool > /tmp/baseline/full_allA.txt 2>&1
printf 'B\n%.0s' {1..40} | python3 -m enneagram_tool > /tmp/baseline/full_allB.txt 2>&1
printf 'C\n%.0s' {1..40} | python3 -m enneagram_tool > /tmp/baseline/full_allC.txt 2>&1

# 6. テスト（Phase 1 以降。現在テストファイルは 0 件）
python3 -m pytest -q
```

**baseline との比較方法**（各 Phase の最後に実行）：

```bash
mkdir -p /tmp/after && \
for i in 1 2 3 4 5 6 7 8 9; do python3 -m enneagram_tool --lookup $i > /tmp/after/lookup_$i.txt 2>&1; done && \
for a in 1 2 3 4 5 6 7 8 9; do for b in 1 2 3 4 5 6 7 8 9; do \
  python3 -m enneagram_tool --compare $a $b > /tmp/after/compare_${a}_${b}.txt 2>&1; done; done && \
python3 -m enneagram_tool --functions > /tmp/after/functions.txt 2>&1 && \
python3 -m enneagram_tool --conflicts > /tmp/after/conflicts.txt 2>&1 && \
printf 'A\n%.0s' {1..40} | python3 -m enneagram_tool > /tmp/after/full_allA.txt 2>&1 && \
printf 'B\n%.0s' {1..40} | python3 -m enneagram_tool > /tmp/after/full_allB.txt 2>&1 && \
printf 'C\n%.0s' {1..40} | python3 -m enneagram_tool > /tmp/after/full_allC.txt 2>&1 && \
diff -r /tmp/baseline /tmp/after && echo "✅ NO REGRESSION"
```

**注意**：
- streamlit は未インストールです。`streamlit run` での動作確認はできません。
  Web 側の検証は「streamlit を import しない純粋関数に切り出してテストする」方法で行ってください。
- pytest / ruff / mypy / black / flake8 / pyright はインストール済みです。
- CI 設定・`pyproject.toml` は存在しません。作成は Phase 6 の提案事項です。

---

## Debt Map

各項目に **判定**を付けています。
- 🟢 **実装可**：証拠が揃っており、今すぐ直してよい
- 🟡 **条件付き**：指定の Q に回答が出てから実装
- 🔴 **提案のみ**：承認なしに実装しないこと

---

### D-01 🟢 【最優先・致命的】Web 版が回答を一切スコアに反映していない

- **根拠**：`streamlit_app.py` の全設問で `answer[2:3].strip()` により選択肢の記号を取り出している
  （239, 252, 262, 272, 285, 296, 311, 321, 331, 341, 359, 372, 648, 657, 668, 673 行）。
  しかし選択肢文字列は `"A) 体が反応する（…）"` の形式で、`[2:3]` は **`)` の次の半角スペース**を取ります。
  `.strip()` の結果は空文字 `""` になります。
- **実測（検証済み）**：
  ```
  answer = "A) 体が反応する（…）"
  answer[2:3]          → ' '
  answer[2:3].strip()  → ''      ← マッピングに存在しないキー
  answer[0:1]          → 'A'     ← 本来欲しい値
  ```
  結果、`score_center_question` / `score_type_detail` / `score_cognitive_question` /
  `score_instinct_question` / `score_orientation_question` は**全て何も加点しません**。
  ```
  center_scores    : 全て 0.0
  enneagram_scores : 全て 0.0
  instinct_scores  : 全て 0.0
  → 出力は常に「コアタイプ 1 / 信頼度 高 / sp/sx」（回答内容に関係なく固定）
  ```
- **なぜ負債か**：Web 版の中核機能が完全に無効。ユーザーには「判定された」ように見えるため、誤りに気づけません。
- **影響範囲**：Web のフル判定・クイック判定の**全結果**。CLI は `get_input` が記号そのものを返すため無傷。
- **変更リスク**：**低**。「常に同じ結果を返す」ことが仕様であるはずがなく、Behaviors To Preserve にも該当しません。
  ただし修正すると Web の出力は当然変わります。これは**バグ修正であり、仕様変更ではありません**。
- **改善案**：文字列スライスに依存しない方式へ変更する。推奨は選択肢の値を記号にし、表示だけ `format_func` に委ねる形です。
  ```python
  # 例: options が ["A) …", "B) …", "C) …"] のとき
  labels = {opt[0]: opt for opt in options}          # {"A": "A) …", ...}
  letter = st.radio(question_text, list(labels), format_func=lambda k: labels[k], key=...)
  # letter は "A" / "B" / "C" そのもの
  ```
  最小修正で済ませるなら `answer[0:1]` でも動作しますが、`[2:3]` と同じ脆さが残るため上記を推奨します。
- **検証方法**：
  1. 抽出処理を streamlit 非依存の純粋関数（例 `option_letter(option: str) -> str`）に切り出す
  2. 全 30 設問の全選択肢に対し、期待記号が返ることを pytest で確認する
  3. 「回答を変えたら結果が変わる」ことをテストで固定する（異なる回答セット2つで異なるコアタイプになること）
- **判定**：🟢 **実装可**。ただし D-02（CLI/Web の方針差）は**同時に触らないこと**。

---

### D-02 🟡 CLI と Web でセンター詳細設問のスコアリング方針が異なる

- **根拠**：`main.py:87-108`（優勢センターのみ）vs `streamlit_app.py:244-272, 390-398`（全センター）
- **なぜ負債か**：同一入力から異なる結果が出る。「どちらが正しい」がコードから決定できません。
- **影響範囲**：フル判定のコアタイプ確定ロジック全体
- **変更リスク**：**高**。どちらに寄せても、片方のユーザーの結果が変わります。
- **改善案**：Q1 の回答を得た後、**採用された方式を `QuestionnaireEngine` 側の 1 メソッドに実装**し、
  CLI・Web の双方がそれを呼ぶ形にする。
- **検証方法**：採用方式に対する単体テスト + D-01 で追加したゴールデンテストの更新
- **判定**：🟡 **Q1 の回答後**。回答なしに統一しないこと。

---

### D-03 🟡 30問中 9問がスコアに一切影響しない

- **根拠**：`wing_check`, `shadow_1`, `nardi_1〜4`, `cross_1〜3`。
  `raw_answers` に記録されるのみで、`analyzer.py` はこの dict を読みません（全文検索で確認済み）。
  未使用データ `NARDI_PROBLEM_SOLVING_STYLES`（8件）は `nardi_1` の 6 選択肢と対応しません。
- **なぜ負債か**：ユーザーは 9 問分の入力コストを払って何も得ていません。
  さらに Web ホームは「30問で3システム統合判定」と説明しており、**説明と実装が食い違っています**。
- **影響範囲**：フル判定の所要時間とユーザー信頼。判定結果そのものには（現状）影響なし。
- **変更リスク**：**高**（スコアリングを追加すれば全ユーザーの結果が変わる）
- **改善案**：Q2 の回答次第。(a) 設計して実装 (b) UI に「参考情報」と明記 (c) 削除。
- **検証方法**：採用案に応じたテスト
- **判定**：🟡 **Q2 の回答後**。実装担当が独自にスコアリングを設計しないこと。

---

### D-04 🟢 CLI フル判定の進捗バーが 100% に到達しない

- **根拠**：`main.py:57-60` で分母 `total_questions = 30`。
  しかし実際に出題されるのは 25 問（優勢センター以外の詳細4問 + `wing_check` 1問が出題されないため）。
- **なぜ負債か**：進捗表示が常に 83% で終わり、ユーザーに「途中で終わった」印象を与えます。
- **影響範囲**：CLI フル判定の表示のみ。判定結果には影響しません。
- **変更リスク**：**低**（表示のみ）。ただし `full_allA.txt` 等のゴールデン出力は変わるため、baseline 更新が必要。
- **改善案**：実際に出題する設問リストを先に組み立て、その `len()` を分母にする。
- **検証方法**：`printf 'A\n%.0s' {1..40} | python3 -m enneagram_tool | grep '100%'` が該当行を返すこと
- **判定**：🟢 **実装可**（D-02 の結論で出題数が変わるため、**D-02 の後に実施**）

---

### D-05 🟢 `--lookup 0` が黙ってフル判定を開始する

- **根拠**：`main.py:620` の `if args.lookup:`。`0` は falsy のため分岐に入らず、else でフル判定が走ります。
  実測：`python3 -m enneagram_tool --lookup 0` → バナーが出てフル判定が開始される。
  `lookup_type()` 内のエラーメッセージ（`main.py:378-380`）には到達しません。
- **なぜ負債か**：不正入力が無言で別機能を起動します。
- **影響範囲**：CLI の `--lookup` のみ
- **変更リスク**：**低**
- **改善案**：`if args.lookup is not None:` に変更（`--compare` 等の他分岐も同様に確認すること）
- **検証方法**：`python3 -m enneagram_tool --lookup 0` がエラーメッセージを出して終了すること。
  `--lookup 1`〜`9` の出力が baseline と一致すること。
- **判定**：🟢 **実装可**

---

### D-06 🟢 非対話実行時に `EOFError` が未捕捉でトレースバックする

- **根拠**：`utils/display.py:83-91` の `get_input` が素の `input()` を呼び、例外処理がありません。
  実測：`printf 'A\n' | python3 -m enneagram_tool --quick` → `EOFError: EOF when reading a line` でトレースバック。
- **なぜ負債か**：エラーハンドリングの不統一。また**これがあるため CLI の自動テストが書きにくい**構造になっています。
- **影響範囲**：全ての対話モード（フル・クイック・探索）
- **変更リスク**：**低**。ただし**終了時の出力が変わる**ため baseline 更新が必要。
- **改善案**：`EOFError` / `KeyboardInterrupt` を捕捉し、日本語のメッセージを出して終了コードを返す。
  ゴールデンテストへの影響を避けるため、**メッセージは stderr に出し、終了コードで判定する**設計を推奨します。
- **検証方法**：`printf 'A\n' | python3 -m enneagram_tool --quick; echo $?` がトレースバックなしで終了すること
- **判定**：🟢 **実装可**

---

### D-07 🟡 `CONFLICT_PATTERNS` のキーが正規化されておらず、到達不能な重複がある

- **根拠**：`correlation_map.py`。`(2,5)` と `(5,2)` が両方存在し内容が異なる。`(6,3)` もキー順が逆。
  `analyzer.py:232-235` は `(min,max)` → `(max,min)` の順で引くため `(5,2)` に到達しません。
  一方 `streamlit_app.py:962` は生キーを列挙するため両方表示されます。
- **なぜ負債か**：同じペアに 2 つの真実があり、参照経路によって見える内容が違います。
- **影響範囲**：`--compare 2 5` / `--compare 5 2`、Web の衝突パターンタブ
- **変更リスク**：**中**（表示テキストが変わる）
- **改善案**：Q4 で残すテキストを決めた上で、キーを `(min,max)` に正規化し、参照側の reverse 引きを削除する。
- **検証方法**：全 36 組の `--compare` 出力を baseline と比較。承認された差分のみ許容。
- **判定**：🟡 **Q4 の回答後**

---

### D-08 🟢 未使用 import / 未使用ローカル変数（ruff 検出 9 件）

- **根拠**（`ruff check` 実測）：
  ```
  analyzer.py:8   F401 INSTINCTUAL_STACKS         analyzer.py:12  F401 BEEBE_ARCHETYPES
  analyzer.py:17  F401 FUNCTION_CONFLICT_PATTERNS main.py:13      F401 sys
  main.py:32      F401 CONFLICT_PATTERNS          main.py:36      F401 clear_screen
  main.py:36      F401 print_box                  main.py:354     F841 analyzer（未使用ローカル）
  streamlit_app.py:23  F401 NARDI_PROBLEM_SOLVING_STYLES
  ```
- **なぜ負債か**：依存関係が実態より広く見え、モジュール間の結合を読み違えさせます。
- **影響範囲**：なし（実行時の挙動に影響しません）
- **変更リスク**：**低**
- **改善案**：`ruff check --select F401,F841 --fix` を**該当ファイルにのみ**適用。
  `main.py:354` の `analyzer = IntegratedAnalyzer(engine)` は行ごと削除（後続で未使用）。
- **注意**：`ruff check --fix` を**全体に**かけないこと。`--select F401,F841` に限定すること。
  `ruff format` / `black` は**実行しないこと**。
- **検証方法**：`ruff check` の残件が 0 になり、baseline diff が空であること
- **判定**：🟢 **実装可**（最も安全。Phase 2 の先頭で実施）

---

### D-09 🟢 Web に到達不能な死コードがある

- **根拠**：`streamlit_app.py:569` の `arch_ja = ...` は代入後**一度も使われません**。
  さらに `stack.functions.index((func_code, archetype))` はループ内で O(n) 検索しており、
  同一タプルが重複した場合に誤ったインデックスを返します。
  同 `render_score_bar`（101-105行）も定義のみで**呼び出し 0 件**。
- **なぜ負債か**：読み手に「Beebe 元型名を表示している」と誤解させます（実際は `archetype` 文字列をそのまま表示）。
- **影響範囲**：なし（表示は変わりません）
- **変更リスク**：**低**
- **改善案**：`arch_ja` の行を削除。`render_score_bar` は**削除前に用途を確認**し、
  不要と判断できれば削除、迷えば残して Phase 6 の提案に回す。
- **検証方法**：`ruff check` に新規指摘が出ないこと。`python3 -m compileall` が通ること
- **判定**：🟢 **実装可**（`arch_ja` のみ。`render_score_bar` は判断がつかなければ残すこと）

---

### D-10 🔴 スコアリング変換ロジックが 5 箇所に重複している

- **根拠**：`{"A": "type_1", "B": "type_8", "C": "type_9"}` 形式のマップが以下に重複：
  ```
  main.py:93-97        （フル判定）      main.py:311-315      （クイック判定）
  main.py:120-124      （ストレス方向）  streamlit_app.py:390-405 （フル判定）
  streamlit_app.py:682-686 （クイック判定）
  ```
  認知機能マップ `{"A":"Se","B":"Si","C":"Ne","D":"Ni"}` も 4 箇所に重複（main.py 157/338、streamlit 417/693）。
- **なぜ負債か**：D-01 のようなバグが片方だけに入り込む温床です。実際に入り込みました。
- **影響範囲**：全判定フロー
- **変更リスク**：**中**（挙動を変えずに移動させる必要がある）
- **改善案**：マップ定義を `questionnaire.py` に定数として集約（例 `ANSWER_MAPS: dict[str, dict[str,str]]`）し、
  CLI・Web の双方がそれを参照する。**この段階では値を一切変えないこと**（純粋な移動のみ）。
- **検証方法**：移動前後で baseline diff が完全に空であること + 単体テストが通ること
- **判定**：🟢 **実装可**（ただし Phase 4。D-01 と D-08 の完了後）

---

### D-11 🔴 `streamlit_app.py` 974 行が全てモジュールトップレベルにある

- **根拠**：`streamlit_app.py` は 33 行目の `st.set_page_config` から末尾まで、
  関数化されていない `if mode == ... elif ...` の連続です。関数は
  `render_score_bar`（未使用）/ `init_session_state` / `reset_assessment` の 3 つのみ。
- **なぜ負債か**：
  - import しただけで Streamlit ランタイムが必要になり、**単体テストが一切書けません**
    （検証環境に streamlit がないため `import streamlit_app` は即 `ModuleNotFoundError`）
  - スコアリング（ドメイン）と表示（プレゼンテーション）が同一スコープに混在しています
- **影響範囲**：Web 全体
- **変更リスク**：**中〜高**（大きく動かすと差分が読めなくなる）
- **改善案**：**全面書き換えはしないこと。** 段階的に、次の順で切り出す：
  1. 記号抽出関数（D-01 の修正で作るもの）を streamlit 非依存モジュールへ
  2. 「回答 dict → `QuestionnaireEngine`」の変換部分を streamlit 非依存関数へ
  3. 表示部分は `streamlit_app.py` に残す
  UI の見た目・文言・レイアウトは変えないこと。
- **検証方法**：切り出した関数への単体テスト。`streamlit_app.py` の残存部分が
  `python3 -m compileall` を通ること（実行確認は streamlit 未導入のため不可、報告に明記すること）
- **判定**：🟡 **1 と 2 のみ実装可（Phase 5）**。それ以上の再編は 🔴 提案のみ。

---

### D-12 🔴 `models/` の結果用データクラスが完全に未使用（契約の曖昧さ）

- **根拠**：`TypeProfile`, `CognitiveProfile`, `NardiProfile`, `Tritype` は
  全ファイル検索で**定義行以外にヒットしません**。
  `IntegratedAnalyzer` は代わりに型注釈のない `dict` を返し、
  利用側は `report["enneagram"]["type_info"].name_ja` のように文字列キーで深く辿っています。
- **なぜ負債か**：戻り値の契約が型で表現されておらず、キー名の変更が静的に検出できません。
  `analyzer.py:324, 327` には `type('', (), {'name_ja': '不明'})()` という
  動的クラス生成による null オブジェクトの代用が入っており、この曖昧さの副作用です。
- **影響範囲**：`analyzer.py` とその全利用者（CLI・Web）
- **変更リスク**：**高**（全参照箇所の書き換えが必要）
- **改善案**：`TypedDict` または既存 dataclass での置き換えを**提案として**まとめる。
  未使用クラスは「削除」ではなく「本来の設計意図の痕跡」として扱い、
  Q5 の回答を踏まえて活用/削除を決める。
- **検証方法**：（実装する場合）`mypy --strict` を段階導入
- **判定**：🔴 **提案のみ**。Phase 6 で設計案を文書化するに留めること。**削除もしないこと。**

---

### D-13 🟢 テストが 0 件（安全網の欠如）

- **根拠**：リポジトリ全体に `test_*.py` / `tests/` が存在しません（`.claude/skills/` 配下のベンダーコードを除く）。
  CI 設定（`.github/workflows/` 等）も、`pyproject.toml` / `setup.py` / `setup.cfg` も存在しません。
- **なぜ負債か**：D-01 のような「全ユーザーに影響する致命的バグ」が誰にも気づかれずマージされました。
- **影響範囲**：全体
- **変更リスク**：**なし**（追加のみ）
- **改善案**：Phase 1 で `tests/` を作成。優先順位は下記 Verification Requirements を参照。
- **検証方法**：`python3 -m pytest -q` が全て pass すること
- **判定**：🟢 **実装可**（Phase 1 で最優先）

---

### D-14 🟡 同点時のタイブレークが暗黙の dict 挿入順

- **根拠**：`questionnaire.py:522-545`。`get_dominant_center` は `max()`、
  `get_top_types` / `get_instinct_stack` は `sorted(..., reverse=True)` を使用。
  いずれも同点時は**挿入順で先勝ち**になります（`type_1`, `center_gut`, `sp` が常に有利）。
  全スコア 0 でも `get_instinct_stack()` は `"sp/sx"` を返します（実測確認済み）。
- **なぜ負債か**：結果が「回答」ではなく「dict の定義順」で決まる場面があり、再現性の主張と矛盾します。
  （このツールの目的は「判定を"勘"から"再現性"へ」と `__init__.py` に明記されています）
- **影響範囲**：同点が発生する全ケース。D-02 で Web 方式が採用されると同点が増えます。
- **変更リスク**：**中**（結果が変わりうる）
- **改善案**：同点を検出して UI に明示する（「タイプ 3 と 6 が同点です」等）。
  順序を変えるのではなく、**同点であることを隠さない**のが低リスクです。
- **検証方法**：同点になる入力の単体テスト
- **判定**：🟡 **Q6 の回答後**（信頼度表示の扱いと一体で判断が必要）

---

### D-15 🟢 日本語文字列の表示幅・切り詰めの扱いが不統一

- **根拠**：`display.py:65` の `f"  {label:12s}"` は文字数ベースで、全角文字では桁が揃いません。
  `display.py:37-41` の `print_box` も同様（かつ未使用）。
  加えて `[:30]` `[:50]` `[:80]` といった切り詰めが `analyzer.py` と両 UI に散在しています
  （`analyzer.py:206,207,213,218,225,277,278`、`streamlit_app.py:504-506,846,852` ほか）。
- **なぜ負債か**：ドメイン層（`analyzer.py`）が表示都合の切り詰めを行っており、責務が混在しています。
  UI ごとに適切な長さは異なるはずです。
- **影響範囲**：表示のみ
- **変更リスク**：**中**（出力テキストが変わり baseline diff が出る）
- **改善案**：`analyzer.py` は**切り詰めていない全文**を返し、切り詰めは各 UI 側で行う。
  ただしこれは出力変更を伴うため、承認が必要です。
- **判定**：🔴 **提案のみ**（Phase 6 で文書化）。`print_score_bar` の桁揃えのみ、
  ゴールデン出力に影響しない範囲であれば 🟢 実装可。

---

### D-16 🟢 Web のリセットボタンが回答をクリアしきらない

- **根拠**：`streamlit_app.py:215-217` の `reset_assessment()` は `engine` / `phase` /
  `answers` / `report` / `assessment_mode` を初期化しますが、
  各設問の `st.radio(..., key=f"q_{q.id}")` で作られた **widget key は消していません**。
  そのため再表示時にも前回の選択が残ります。
  加えて `phase` / `answers` / `assessment_mode` の 3 キーは**どこからも読まれていません**（未使用状態）。
- **なぜ負債か**：「最初からやり直す」が期待通りに動きません。状態の所有者が曖昧です。
- **影響範囲**：Web フル判定のリセット操作
- **変更リスク**：**低**
- **改善案**：`q_` プレフィックスの session_state キーも削除する。
  未使用の 3 キーは削除**候補**だが、将来の段階的ウィザード実装の意図が読めるため、
  削除する場合は Q5 の回答を待つこと。
- **検証方法**：streamlit 未導入のため自動検証不可。**手動確認手順を報告に記載すること**。
- **判定**：🟢 **キー削除の実装は可**。未使用 3 キーの削除は 🟡（Q5 後）。

---

### D-17 🟢 `mypy` 検出の型エラー 2 件（変数の使い回し）

- **根拠**：
  ```
  main.py:572 error: Incompatible types in assignment
              (expression has type "InstinctualStack", variable has type "FunctionStack")
  main.py:573 error: "FunctionStack" has no attribute "description"
  ```
  `explore_mode()` 内で、選択肢 5（`main.py:548`）と選択肢 7（`main.py:572`）が
  同じ関数スコープで変数名 `stack` を使い回しているためです。
  **実行時は別の elif 分岐なので現状バグではありません。**
- **なぜ負債か**：命名の使い回しにより型チェックが通らず、本物の型エラーが埋もれます。
- **影響範囲**：なし（静的解析のみ）
- **変更リスク**：**低**（変数名の変更のみ、出力は不変）
- **改善案**：`main.py:572-573` の変数を `instinct_stack` 等にリネーム。
  併せて `explore_mode` の各分岐を関数に切り出すのが本筋だが、それは Phase 6 の提案に留める。
- **検証方法**：`mypy enneagram_tool --ignore-missing-imports` が 0 件になること + baseline diff が空
- **判定**：🟢 **実装可**

---

### セキュリティ境界について（過剰対応しないこと）

調査の結果、**このリポジトリに認証・課金・通知・外部 API・ジョブ・キュー・ストレージ・DB は存在しません**。
`requirements.txt` の依存は `streamlit` 1 つのみです。以下だけ留意してください。

- `streamlit_app.py:44-82` で `unsafe_allow_html=True` を使用していますが、
  **埋め込んでいるのは静的な CSS 文字列のみ**で、ユーザー入力は流れ込みません（確認済み）。
  ここに動的な値を差し込む変更をしないでください。
- ユーザーの回答は `st.session_state`（プロセスメモリ）にのみ保持され、ファイルにも外部にも送信されません。
  **永続化やテレメトリを追加しないでください**（本件のスコープ外です）。
- Streamlit アプリを公開ホスティングした場合、アクセス制御はありません。
  これは現状の設計判断であり、本リファクタリングで変更しないでください。

存在しない脅威に対する防御コードを追加しないでください。

---

## Implementation Phases

**必ずこの順で実行してください。各 Phase の完了時にコミットし、検証結果を記録してください。**

### Phase 0 — 現状把握（コード変更なし）

1. `git status` / `git log --oneline -5` を実行し、未コミット変更の有無を記録
2. Baseline Commands を**全て**実行し、出力を `/tmp/baseline/` に保存
3. `ruff` 9 件・`mypy` 2 件の内訳を記録
4. D-01 を自分の手で再現する（下記スクリプトを実行し、全スコアが 0.0 になることを確認）
   ```bash
   python3 - <<'EOF'
   from enneagram_tool.engine.questionnaire import QuestionnaireEngine, ENNEAGRAM_QUESTIONS
   e = QuestionnaireEngine()
   for q in ENNEAGRAM_QUESTIONS:
       if q.subcategory != "center": continue
       opts = [l.strip() for l in q.text.split("\n")[1:] if l.strip()]
       e.score_center_question(q.id, opts[0][2:3].strip())   # streamlit と同じ抽出
   print("center_scores:", e.center_scores)  # 全て 0.0 なら D-01 再現
   EOF
   ```
5. **コミットしない**（変更がないため）

**完了条件**：baseline が保存され、D-01 の再現が確認できている

---

### Phase 1 — 安全網の構築（テスト追加のみ、既存コードは触らない）

`tests/` を新規作成し、**既存ファイルを一切変更せずに**テストを追加します。

追加するテスト（優先順）：

1. `tests/test_data_integrity.py` — データの構造的な健全性
   - `ENNEAGRAM_TYPES` が 1〜9 を持つ / `WINGS` が 18 件 / `FUNCTION_STACKS` と `NEURAL_PATTERNS` が 16 件
   - 全 `stress_direction` / `growth_direction` が 1〜9 の範囲
   - `COUNTERTYPE_MAP` の値が `INSTINCTUAL_VARIANTS` のキーに含まれる
   - `FUNCTION_STACKS` の各 `functions` が 8 要素で、機能コードが `COGNITIVE_FUNCTIONS` に存在する
2. `tests/test_questionnaire_engine.py` — スコアリングの単体テスト
   - 各 `score_*` メソッドが正しいキーに +1.0 する
   - 不正な記号（`""`, `"Z"`, `" "`）では加点されない ← **D-01 を検出するテスト**
   - `get_instinct_stack` / `get_orientation` / `get_top_types` の戻り値形式
3. `tests/test_analyzer.py` — 判定ロジックの単体テスト
   - 明確なスコアを与えたときのコアタイプ確定
   - `_determine_wings` が隣接 2 タイプを返す（9→1、1→9 の巡回を含む）
   - `analyze_compatibility` が全 36 組で例外を出さない
   - カウンタータイプ警告の発火条件
4. `tests/test_cli_golden.py` — CLI 出力のゴールデンテスト
   - `subprocess` で `--lookup 1..9` / `--compare`（代表数組）/ `--functions` / `--conflicts` を実行
   - 出力に含まれるべきキーワードを検証（全文一致でなくてよい。全文比較は `/tmp/baseline` の diff で担保）

**制約**：
- `streamlit` に依存するテストを書かないこと（未インストールのため必ず失敗します）
- 既存の実装ファイルを 1 行も変更しないこと
- **現状の壊れた挙動を「正解」として固定しないこと**。
  D-01 を検出するテストは「不正記号では加点されない」という**正しい仕様**を書いてください
  （現状の実装はこれを満たします。壊れているのは呼び出し側の Web です）

**検証**：`python3 -m pytest -q` が全て pass。baseline diff が空。
**コミット**：`test: add regression tests for data, engine, analyzer, and CLI output`

---

### Phase 2 — 明らかに安全な整理

対象：**D-08**（未使用 import / 変数）、**D-09**（`arch_ja` 死コード）、**D-17**（変数名の使い回し）

- `ruff check --select F401,F841 --fix` を該当ファイルにのみ適用
- `main.py:354` の未使用 `analyzer` 行を削除
- `streamlit_app.py:569` の `arch_ja` 行を削除
- `main.py:572-573` の変数を `instinct_stack` 等にリネーム
- **`render_score_bar` の削除は任意**。用途に確信が持てなければ残すこと

**やらないこと**：`black` / `ruff format` の実行、触っていない行の整形

**検証**：`ruff check` 0 件 / `mypy` 0 件 / `pytest` pass / **baseline diff が完全に空**
**コミット**：`chore: remove unused imports, dead assignments, and shadowed variable`

---

### Phase 3 — 致命的バグの修正（D-01）

**Web の記号抽出を修正します。これは仕様変更ではなくバグ修正です。**

1. `option_letter(option: str) -> str` 相当の**streamlit 非依存**な純粋関数を用意する
   （置き場所は `enneagram_tool/engine/questionnaire.py` を推奨。streamlit を import しないこと）
2. その関数に対し、**全 30 設問の全選択肢**で期待記号が返ることをテストする
3. `streamlit_app.py` の `answer[2:3].strip()` を**全 16 箇所**置き換える
   （D-01 に列挙した行番号を参照。1 箇所も残さないこと）
4. 「異なる回答 → 異なる結果」になることをテストで固定する

**同時にやらないこと**：
- D-02（CLI/Web の方針差）には**触らないこと**。今は Web を「意図通りに動く状態」に戻すだけです
- スコアの重み・設問・データを変えないこと

**検証**：新規テスト pass / `pytest` 全 pass / **CLI の baseline diff が空**（CLI は無変更のはず）
**コミット**：`fix: web app never scored answers due to wrong option-letter slice`

**この Phase の完了時点で、必ず人間に報告してください。** Web の出力が変わるため、
続行前に Q1〜Q6 の回答を得ることを推奨します。

---

### Phase 4 — 小さな責務分離（D-10）

スコアリングの記号マップを 1 箇所に集約します。**値は一切変更しません。**

1. `questionnaire.py` に定数として集約（例）：
   ```python
   CENTER_ANSWER_MAP  = {"A": "center_gut", "B": "center_heart", "C": "center_head"}
   TYPE_DETAIL_MAPS   = {"gut_detail": {...}, "heart_detail": {...}, "head_detail": {...}}
   PERCEIVE_MAP       = {"A": "Se", "B": "Si", "C": "Ne", "D": "Ni"}
   JUDGE_MAP          = {"A": "Te", "B": "Ti", "C": "Fe", "D": "Fi"}
   STRESS_TYPE_MAP    = {"A": "type_1", ..., "I": "type_9"}
   ```
2. `main.py` と `streamlit_app.py` の重複定義をこれらの参照に置き換える
3. **1 ファイルずつ変更し、その都度 baseline diff が空であることを確認する**

**やらないこと**：この Phase でロジックを変えないこと。純粋な「移動」に留めること。

**検証**：`pytest` pass / **baseline diff が完全に空** / `ruff` `mypy` 0 件
**コミット**：`refactor: centralize answer-to-score mappings in questionnaire module`

---

### Phase 5 — 境界の明確化（D-11 の 1・2 のみ、D-16）

1. Web の「回答 dict → `QuestionnaireEngine`」変換部分を、
   **streamlit を import しない関数**として切り出す（`streamlit_app.py` から呼ぶ）
2. その関数に対する単体テストを追加（これで初めて Web のスコアリングがテスト可能になります）
3. D-16：`reset_assessment()` で `q_` プレフィックスの session_state キーも削除する

**やらないこと**：
- UI の見た目・文言・レイアウト・タブ構成を変えないこと
- `streamlit_app.py` の全面的な関数化・再編（🔴 提案のみ）
- 未使用の `phase` / `answers` / `assessment_mode` キーの削除（Q5 の回答待ち）

**検証**：`pytest` pass / `compileall` pass / baseline diff が空
**制約**：streamlit 未導入のため Web の実動作確認はできません。
**手動確認手順を報告に明記してください。**
**コミット**：`refactor: extract streamlit-independent scoring adapter`

---

### Phase 6 — 提案のみ（実装しない）

以下を `refactor-proposals.md` として**文書化するに留めてください**。コードは変更しないこと。

- D-02 / D-03 / D-07 / D-14 の各案（Q1〜Q6 の回答が前提）
- D-12：`IntegratedAnalyzer` の戻り値を `TypedDict` / dataclass 化する設計案
  （`type('', (), {...})()` の null オブジェクト代用の解消を含む）
- D-15：切り詰め責務を UI 側へ移す案
- `explore_mode()` の分岐を関数へ分割する案
- `pyproject.toml` / `pytest.ini` / GitHub Actions CI の導入案（現在いずれも不在）
- `README.md` の新規作成案（現在リポジトリに README が存在しません）

**コミット**：`docs: add refactor proposals requiring product decisions`

---

## Verification Requirements

**各 Phase の完了時に、以下を全て実行し、結果を記録してください。**

| # | コマンド | 合格条件 |
|---|---|---|
| 1 | `python3 -m compileall -q enneagram_tool streamlit_app.py` | エラーなし |
| 2 | `ruff check . --exclude .claude --output-format concise` | Phase 2 以降は 0 件 |
| 3 | `mypy enneagram_tool --ignore-missing-imports` | Phase 2 以降は 0 件 |
| 4 | `python3 -m pytest -q` | 全 pass（Phase 1 以降） |
| 5 | baseline 比較（Baseline Commands 参照） | **`diff -r` が空**（差分が出たら停止して報告） |

### baseline に差分が出てよい Phase と、その理由

| Phase | 差分の可否 | 理由 |
|---|---|---|
| 0, 1, 2, 4 | ❌ **差分ゼロ必須** | 挙動を変えない Phase のため |
| 3 | ⚠️ CLI は差分ゼロ必須 | Web のみ変更。CLI に差分が出たら**誤り** |
| 5 | ❌ 差分ゼロ必須 | 純粋な切り出しのため |
| D-04 / D-05 / D-06 実施時 | ✅ 承認済み差分のみ | 差分内容を報告に明記し、baseline を更新すること |

**差分が出た場合の対応**：直前の変更を戻し、原因を特定してから報告してください。
**「たぶん問題ない差分」として通さないでください。**

### テストに関する必須要件

- 新規テストは `tests/` 配下に置き、`streamlit` を import しないこと
- **現状の壊れた挙動をテストで固定しないこと**（特に D-01 周辺）
- テストが実装の内部構造ではなく**観測可能な振る舞い**を検証していること
- 1 つのテストが 1 つのことを検証していること

---

## Reporting Format

**最後に、以下の形式で報告してください。**

```markdown
## 実行サマリー

- 着手時の git status: <clean / 未コミット変更あり（内容）>
- 完了した Phase: <0〜N>
- 未完了 / 停止した Phase とその理由: <...>

## Baseline 記録（Phase 0 時点）

| 検証項目 | 結果 |
|---|---|
| compileall | <OK / エラー内容> |
| ruff | <N 件（内訳）> |
| mypy | <N 件（内訳）> |
| pytest | <テストファイル 0 件 / N passed> |
| D-01 の再現 | <再現した / しなかった＋詳細> |

## Phase ごとの結果

### Phase N: <名前>
- 変更したファイル: <パスと変更行数>
- 変更内容の要約: <1〜3 行>
- 実行したコマンドと結果:
  ```
  $ <コマンド>
  <出力の要点>
  ```
- baseline diff: <空 / 差分内容と、それが承認済みである根拠>
- コミット: <ハッシュとメッセージ>

## 対応した Debt 一覧

| ID | 対応 | 備考 |
|---|---|---|
| D-01 | 修正済み / 未対応 / 提案のみ | ... |
| ... | | |

## 未解決の質問（回答待ちで着手できなかったもの）

- Q<N>: <質問と、回答が必要な理由>

## 提案に留めた項目

- <項目と、実装しなかった理由>

## 手動確認が必要な項目

- <streamlit 未導入のため自動検証できなかった項目と、人間が確認すべき手順>
```

**報告に関する必須事項**：
- テストが失敗した場合は、**失敗した事実と出力をそのまま**書くこと。隠さないこと
- スキップした手順は、**スキップしたと明記**すること
- 「たぶん動く」「おそらく問題ない」と書かないこと。確認したか、していないかを書くこと

---

## Out-of-scope Items

**以下は本リファクタリングの範囲外です。指示があるまで着手しないでください。**

1. **新機能の追加**（新しい判定システム、レポート出力形式、エクスポート機能、多言語対応など）
2. **`data/` 配下のテキスト内容の改変・追記・要約・校正**（Q4 の重複解消を除く）
3. **判定アルゴリズムの改善・高度化**（重み付けの調整、機械学習の導入など）
4. **UI の再デザイン**（配色、レイアウト、絵文字、タブ構成の変更）
5. **`black` / `ruff format` による一括整形**
6. **`.claude/skills/` 配下のあらゆる変更**（Anthropic 公式スキルのベンダーコピー。本件と無関係）
7. **`.claude/settings.json` の変更**
8. **依存関係の追加**（`requirements.txt` への追記。テスト用の開発依存も、まず提案すること）
9. **回答データの永続化・テレメトリ・分析基盤の追加**
10. **認証・アクセス制御の追加**（存在しない要件です）
11. **パッケージング**（`pyproject.toml`、PyPI 公開、Docker 化）— Phase 6 の提案に留めること
12. **CI/CD の構築** — Phase 6 の提案に留めること
13. **`git push` / PR 作成 / ブランチ操作**（明示的な指示があるまで行わないこと）
14. **未使用データクラス（`TypeProfile` 等）と `BRAIN_REGIONS` の削除**
    — 設計意図の痕跡であり、Q5 の回答なしに消さないこと

---

## 付録：確認済みの事実（実装担当が再調査しなくてよい項目）

以下はこの指示書の作成時に**実際にコマンドを実行して確認済み**です。

- Python 3.11.15。`pytest 9.0.2` / `ruff 0.15.8` / `mypy 1.19.1` / `black` / `flake8` / `pyright` はインストール済み
- **`streamlit` は未インストール**。`import streamlit_app` は `ModuleNotFoundError` になる
- `python3 -m compileall` は全ファイルで成功する
- CLI のフル判定は最後まで完走し、正常終了する（終了コード 0）
- CLI の `--compare 1 99` は正しくエラーメッセージを返す
- `--lookup 0` はエラーにならず、フル判定が開始される（D-05）
- `printf 'A\n' | python3 -m enneagram_tool --quick` は `EOFError` でトレースバックする（D-06）
- データの網羅性に欠損はない：`ENNEAGRAM_TYPES` 9件 / `WINGS` 18件 / `FUNCTION_STACKS` 16件 /
  `NEURAL_PATTERNS` 16件 / `BEEBE_ARCHETYPES` 8件 / `COGNITIVE_FUNCTIONS` 8件 /
  `ENNEAGRAM_MBTI_CORRELATION` 9件 / `ENNEAGRAM_FUNCTION_BEHAVIORS` 9件
- `CONFLICT_PATTERNS` は 12 件。うち `(2,5)`/`(5,2)` が重複、`(6,3)`/`(5,2)` がキー順逆（D-07）
- 設問数は合計 30（エニアグラム14 / 認知9 / Nardi 4 / クロス3）。うち 9 問がスコアに無関係（D-03）
- リポジトリに `README` / `CLAUDE.md` / `AGENTS.md` / `pyproject.toml` / CI 設定 / テストは**存在しない**
