# harness

Claude Code のハーネスを、リポジトリごとに作らずに入れるためのプラグイン。フック、検品係、鍵のラッパーをまとめて持ってくるので、リポジトリの側に置くのは、CLAUDE.md の決まりと .claude/harness.json、それに .env.example と .gitignore の数行だけになる。

## 入れ方

最初に一度だけ、配布元を登録する。

```bash
claude plugin marketplace add 1828828a-glitch/Claude-Code
```

この1行は、配布元リポジトリの既定ブランチに .claude-plugin/marketplace.json があるときに通る。既定ブランチに入る前は、置いてあるブランチを # のあとに名指しする。

```bash
claude plugin marketplace add "1828828a-glitch/Claude-Code#claude/confident-volta-z0bss5"
```

自分のすべてのリポジトリで使うなら、ユーザー単位で入れる。

```bash
claude plugin install harness@harness-kit
```

チームのリポジトリに入れて、そこを開いた人全員に効かせるなら、そのリポジトリの中で配布元もプラグインもプロジェクト単位で登録する。両方が .claude/settings.json に書き込まれるので、コミットすれば配れる。配布元を --scope なしで登録すると自分のユーザー設定にしか入らず、clone した人の手元では見つからない。

```bash
claude plugin marketplace add 1828828a-glitch/Claude-Code --scope project
claude plugin install harness@harness-kit --scope project
```

入れたあと、そのリポジトリで Claude に「このリポジトリにハーネスを入れて」と頼むと、harness-setup スキルが .claude/harness.json、.env.example、.gitignore、CLAUDE.md の決まりをそのリポジトリに合わせて作る。

更新は claude plugin update harness@harness-kit。外すときは claude plugin uninstall harness@harness-kit。

## 入っているもの

| 部品 | 種類 | すること |
| --- | --- | --- |
| guard.py | PreToolUse | 危ない操作を止めるか確認に回す。外に出す操作は承認ゲートにかける |
| prompt_guard.py | UserPromptSubmit | チャットに貼られた API キーを送信前に止める |
| session_start.py | SessionStart | ブランチ、未コミットの数、.env にある鍵の名前だけを Claude に渡す |
| post_edit_check.py | PostToolUse | 書いた直後に Python と JSON の構文を確かめる。作り直しが要るパスなら知らせる |
| stop_tests.py | Stop | 未コミットの変更があればテストを回し、落ちていたら終わらせない |
| kenpin | サブエージェント | 完了を伝える前の検品係。テスト、差分、鍵の混入を見て合否を返す |
| ja-text-checker | サブエージェント | 人が読む日本語を、AIっぽい言い回しと文体ルールで見る |
| harness-setup | スキル | リポジトリごとの設定を作る導入の手順 |
| with-env | bin | .env を実行時に読み込んで、後ろのコマンドを動かす |

guard.py が止めるのは、ルートやホーム、プロジェクトを丸ごと含む削除と、main への force push。確認に回すのは、再帰削除、sudo、force push、変更を捨てる git 操作、.env の読み書き、鍵の値の表示。承認ゲートには、PR やコメント、issue、リリースといった GitHub への書き込み、デプロイと公開、外部へのデータ送信、共有と削除、定期タスクの作成と変更をかける。npx や python -m を前に付けても見抜く。

これはうっかりの事故を防ぐためのもので、わざと抜けようとする相手まで防ぐものではない。

## リポジトリごとの設定

.claude/harness.json に置く。無くても動く。

| 項目 | 既定 | 中身 |
| --- | --- | --- |
| test_command | なし | Stop フックで回すテスト。文字列なら bash で回すので && やパイプも使える。並びで書くとシェルを通さずに回す。無ければ tests/ と pytest があるときだけ pytest を回す |
| test_globs | ["*.py"] | この形のファイルに未コミットの変更があるときだけテストを回す |
| test_timeout | 180 | テストを待つ秒数。フックの登録が200秒なので、190秒より長くは待たない |
| rebuild_reminders | [] | {"paths": [...], "message": "..."} の並び。paths で始まるファイルを触ったら message を Claude に添える。paths の頭の ./ は無くてよい |

書き方が少し違っても、文字列を1つだけ書いた並びや、オブジェクト1つの rebuild_reminders は受け付ける。読めない値は既定に戻す。

## 要るもの

python3、bash、git。フックはどれも Python の標準ライブラリだけで書いてある。

フックはスクリプトが見つからないとき、何もせずに通す。プラグインを外したり、ブランチを切り替えて scripts が消えたりしても、すべての操作が止まることはない。その間は番人もいないので、気づいたら戻す。

## 配布元のリポジトリについて

このプラグインの置き場は 1828828a-glitch/Claude-Code の plugins/harness。そのリポジトリ自身は、プラグインを入れずに同じファイルを直接使っている。フックは .claude/settings.json から plugins/harness/scripts を呼び、検品係は .claude/agents からリンクで読む。プラグインを直せば、その場で配布元にも効く。テストは tests/test_claude_hooks.py にあり、settings.json とプラグインの hooks.json が同じ中身かどうかも確かめている。

配布元のリポジトリでは .claude/settings.json に "enabledPlugins": {"harness@harness-kit": false} を書いてある。プラグインをユーザー単位で入れていても、ここではフックと検品係が二重に動かない。
