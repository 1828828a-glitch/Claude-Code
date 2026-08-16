# Claude-Code

| ディレクトリ | 中身 |
|---|---|
| [`video/`](video/) | Remotion でアニメーション動画を作るスタジオ。台本(JSON)から mp4 を書き出す |
| [`enneagram_tool/`](enneagram_tool/) | エニアグラム × Beebe × Nardi の統合タイプ判定ツール（CLI） |
| `streamlit_app.py` | 上記判定ツールの Web 版 |

## Codex を繋ぐ

`.mcp.json` に Codex を MCP サーバーとして登録してある。
Claude Code のセッションから Codex を呼び出せる。

お手元で1回だけ準備が要る:

```bash
npm install -g @openai/codex
codex login
```

これで次回の Claude Code 起動時に `codex` サーバーが接続され、
`codex` ツール（Codex セッションを回す）が使えるようになる。
初回は接続を許可するか聞かれるので承認する。

繋がっているかどうかは Claude Code の `/mcp` で確認できる。

- Codex 側の設定（モデル、承認ポリシー等）は `~/.codex/config.toml`
- ツール呼び出し時に `model` や `approval-policy` を個別に上書きすることもできる
- Codex は `.claude/skills/` を読まないので、Codex に直接このリポジトリを
  触らせたい場合は別途 `AGENTS.md` が必要
