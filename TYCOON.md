# tycoon — 事業をゲームとして動かす

元ネタ: [@pricefoulger](https://x.com/pricefoulger/status/2080851734730342514) の
「自社CRMを経営タイクーンゲームとして作る」というアイデア。

> ゲーム内の案件は全部リアルの案件。AIエージェントが実際の顧客対応や事務手続きを
> ゲーム内でこなす。ゲーム内の成長が実際の事業成長とそのまま連動する。
> これなら一日中「遊び（＝仕事）」たくなる。

面白いのはゲーム化そのものではなく、**それが成立する条件**のほうです。
「遊ぶ＝働く」が本当に成り立つのは、実務が承認ボタン数回に圧縮されているときだけ。
そこを作らずに見た目だけゲームにしても、ただの重いCRMになります。

なので最初に作ったのは、その圧縮を担う層 —— **AI社員が実務を下書きし、人間は承認だけする**ループです。

## 設計の核

ツールは2種類しかありません。

| | 承認 | 例 |
|---|---|---|
| **読み取り系** | 不要（副作用がない） | `list_jobs` `get_job` `search_jobs` `list_open_tasks` |
| **書き込み系** | **必要** | `draft_customer_message` `draft_content` `advance_job_stage` `create_followup_task` `update_job_fields` `add_job_note` |

**承認ゲートはエージェントループの外側ではなく、ツールの内側にあります。**
書き込み系ツールは呼ばれても何も実行せず、提案を承認キューに積んで
「承認待ちに積みました」と返すだけ。エージェントが何を考えていようと、
どれだけ確信していようと、人間が `approve` するまで実データは1バイトも動きません。

外側にゲートを置く設計（ループを止めて人間に聞く）だと、
エージェントが賢くなるほど「ここは聞かなくていいだろう」の判断が入り込む余地が生まれます。
内側に置けば、その余地が構造的に存在しません。

例外は `autonomy: auto` を明示的に与えたツールだけ。それも監査ログには必ず残ります。

```
AI社員 ──→ 書き込み系ツール ──→ 提案キュー ──→ 人間が承認 ──→ 実データが動く
                    │                                              ▲
                    └── autonomy: auto のときだけ ──────────────────┘
```

## 業種非依存

業種に依存するもの（パイプラインの段階、案件が持つ項目、AI社員の役割と指示、
動作確認用のサンプルデータ）はすべて YAML に集約してあります。
コードには一切入っていません。**差し替えるのはYAML一枚だけ**です。

| ファイル | 中身 |
|---|---|
| `business.yaml` | **性格タイプ論のコンテンツ発信**（リポジトリの痕跡から推測したもの。既定で使われる） |
| `business.typing-sessions.yaml` | タイプ診断セッションの提供（副線として読んだほう） |
| `business.example.yaml` | 汎用の案件型受託業。ゼロから書き起こすときの雛形 |

```bash
# 別の定義で試す
python -m tycoon --business tycoon/business.typing-sessions.yaml jobs

# ゼロから書く
cp tycoon/business.example.yaml tycoon/business.yaml   # TODO を埋める
```

`business.yaml` がどうやって書かれたかは、ファイル冒頭のコメントに根拠込みで書いてあります。
外れている箇所は直接書き換えてください。

## 使う

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...        # または ant auth login

python -m tycoon seed                            # サンプルデータ
python -m tycoon jobs                            # 案件一覧
python -m tycoon agents                          # AI社員一覧

python -m tycoon run mikage "止まっている記事を洗い出して"
python -m tycoon queue                           # 承認待ちを見る
python -m tycoon approve prop_xxxx               # 承認 → ここで初めて実行される
python -m tycoon reject prop_xxxx -m "まだ早い"   # 却下 → 何も起きない

python -m tycoon audit --run run_xxxx            # 誰が・いつ・何を・なぜ
```

`--effort low|medium|high|xhigh|max` で思考の深さを調整できます（既定 `high`）。
定型の巡回なら `low` でも十分実用になります。

## 監査ログ

モックの「View audit」がこれ。AIが実務に触る以上、後から追えないと運用に乗りません。
追記専用のJSONLで、次を全部記録します。

- `run_started` / `run_finished` — 誰に何を依頼し、何トークン使ったか
- `tool_called` — どのツールをどんな引数で呼んだか（読み取り含む）
- `proposal_created` — 何を提案し、その理由は何か
- `proposal_approved` / `proposal_rejected` — 人間がどう判断し、何とコメントしたか
- `effect_applied` — 実データが実際に変わった瞬間
- `effect_failed` / `approval_failed` — 弾かれた操作

却下理由が溜まると「どこまでAIに任せてよいか」の実測データになります。
毎回承認しているツールを `autonomy: auto` に昇格させ、
却下が続くツールは指示文を直す。この往復が運用の本体です。

## テスト

APIキーなしで走ります。検証しているのは「AIが賢いか」ではなく
**「AIが暴走しても実データが動かないか」**です。

```bash
python tests/test_agent_loop.py     # 10/10 passed
```

- 書き込み系ツールを呼んでも承認前は実データ不変（顧客連絡も記事原稿も）
- 承認したときだけ変わり、全過程が監査に残る
- 二重承認は弾く
- 存在しない段階への移動（＝幻覚）は承認しても弾かれ、提案は保留のまま残る
- ツールスコープの強制（監視役には顧客へ連絡する手段が渡っていない）
- 同梱の `business*.yaml` が全部読め、seed が通り、全AI社員を組み立てられる
  （業種を差し替えたときに壊れる箇所は、たいていここで先に落ちる）

## いまの状態と、次

**動くもの**

- 業種非依存のエージェント実行基盤（Claude Opus 5 / tool runner）
- ツール内蔵の承認ゲートと承認キュー
- 追記専用の監査ログ
- ツール単位の自律実行権限
- 案件・顧客・タスク・やり取り履歴の最小データモデル

**まだないもの**

- **実際の送信**。`draft_customer_message` を承認すると、いまはやり取り履歴に
  「送信済み」として記録されるだけで、メールは飛びません。
  実配信（SMTP / SendGrid / LINE API など）を繋ぐのは `tools.apply_effect` の
  `send_message` 分岐1か所です。**本番で使う前に必ずここを繋いでください。**
  繋ぐまでは「送ったことになっているが送っていない」状態になります。
- ダッシュボードとゲームビュー。モックの `Dashboard | Split | Game` トグル。
  データモデルは両ビュー共通なので、上に載せる作業になります。
- レベルとマイルストーン。実業績（回収額・受注数）から算出して機能をアンロックする、
  元ツイートで一番効いている部分。実データが溜まってから設計するほうが確実です。
- 複数AI社員の並行実行と引き継ぎ。

## ファイル構成

```
tycoon/
  domain.py               事業定義の読み込みと検証
  business.yaml           ← 自分の仕事に書き換えるのはこれだけ
  store.py                実データ（JSON一枚）
  audit.py                監査ログ
  tools.py                AI社員の道具。承認ゲートはこの中
  agents.py               AI社員を1人動かす
  approvals.py            承認キュー
  cli.py                  コマンドライン
  seed.py                 sample_data を実データとして流し込む
tests/test_agent_loop.py  承認ループの検証（APIキー不要）
```
