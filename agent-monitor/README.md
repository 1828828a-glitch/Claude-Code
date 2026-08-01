# Agent Monitor — サブエージェントの動きを見える化

Claude Code のサブエージェントたちが「誰が・どこで・何をやっているか」を
サイドバー風のページでライブ中継するミニダッシュボードです。
外部ツール不要、標準機能（Bash でのファイル追記 + 静的HTML）だけで動きます。

## 仕組み（単純です）

1. 各サブエージェントが、作業の節目ごとに `status.jsonl` へ1行ずつ JSON を追記する
2. `monitor.html` がそのファイルを1秒ごとに読み直して表示を更新する

それだけです。

```
サブエージェントA ─┐
サブエージェントB ─┼─ 追記 → status.jsonl ← 1秒ごとにfetch ── monitor.html（ブラウザ）
サブエージェントC ─┘
```

## 使い方

### 1. ビューアを起動

```bash
cd agent-monitor
python3 -m http.server 8787
# ブラウザで http://localhost:8787/monitor.html を開く
# （VS Code なら Simple Browser でエディタ横に並べるとサイドバーになります）
```

### 2. Claude にこう頼む

サブエージェントを使うタスクを頼むとき、プロンプトに一言添えるだけ：

> 各サブエージェントには、作業の節目ごとに `agent-monitor/status.jsonl` へ
> 以下の形式で1行追記させてください：
> `{"agent":"名前","task":"担当タスク","status":"running|done|error","step":"今やっていること","progress":0-100,"ts":"ISO時刻"}`

CLAUDE.md に書いておけば毎回自動で有効になります：

```markdown
## サブエージェント運用ルール
サブエージェントを起動するときは、各エージェントのプロンプトに
「開始時・節目ごと・完了時に agent-monitor/status.jsonl へ
{"agent":...,"status":...,"step":...,"progress":...,"ts":...} 形式の
JSON を1行 append すること」という指示を必ず含めること。
```

### 3. リセット

新しいセッションを始めるときはファイルを空にするだけ：

```bash
> agent-monitor/status.jsonl
```

## ステータス行のフォーマット

| フィールド | 説明 |
|---|---|
| `agent` | エージェント名（表示のキーになる） |
| `task` | 担当タスクの説明 |
| `status` | `running` / `done` / `error` / `pending` |
| `step` | いまやっていること（ログにも積まれる） |
| `progress` | 0〜100 の進捗（省略可） |
| `ts` | ISO 8601 時刻（`date -u +%Y-%m-%dT%H:%M:%SZ`） |

追記コマンド例（エージェントが実行するもの）：

```bash
echo '{"agent":"researcher","task":"コード調査","status":"running","step":"streamlit_app.py を解析中","progress":40,"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> agent-monitor/status.jsonl
```
