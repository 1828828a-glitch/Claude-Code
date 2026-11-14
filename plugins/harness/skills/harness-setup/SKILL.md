---
name: harness-setup
description: プラグイン harness を入れたリポジトリで、最初の1回だけ使う導入の手順。「このリポジトリにハーネスを入れて」「harness をセットアップして」「鍵の置き場とテストの設定を作って」と頼まれたとき、またはセッション開始時に .claude/harness.json が無いと分かったときに使う。CLAUDE.md の決まり、.env.example、.gitignore、.claude/harness.json をそのリポジトリに合わせて作る。
---

# ハーネスの導入

フックと検品係はプラグインが持ってくるので、ここで作るのはリポジトリごとに違う部分だけ。既にあるファイルは上書きせず、足りない行を足す。終わったら、作ったものと足したものを一覧にして報告する。

## 1. テストのコマンドを決める

リポジトリの中を見て、普段使うテストのコマンドを1つ決める。手がかりは次のとおり。

- package.json の scripts.test があれば npm test（pnpm-lock.yaml なら pnpm test、yarn.lock なら yarn test）
- pyproject.toml、pytest.ini、tests/ があれば python3 -m pytest -q -x
- go.mod があれば go test ./...
- Cargo.toml があれば cargo test

見つからなければ test_command は書かない。そのとき Stop フックは tests/ と pytest があるときだけ動く。

test_globs には、変わったらテストを回したいファイルの形を書く。Python なら ["*.py"]、TypeScript なら ["*.ts", "*.tsx"] のように。

## 2. .claude/harness.json を作る

```json
{
  "test_command": "npm test",
  "test_globs": ["*.ts", "*.tsx"],
  "test_timeout": 180,
  "rebuild_reminders": []
}
```

rebuild_reminders には、触ったら何かを作り直す必要があるパスと、その手順を書く。生成物を git に入れているリポジトリでよく要る。例は {"paths": ["src/content/"], "message": "作業の区切りで npm run build を実行する"}。無ければ空のままでいい。

## 3. 鍵の置き場を作る

- .gitignore に次の行が無ければ足す：.env、.env.*、!.env.example、.claude/state/、.claude/settings.local.json
- .env.example を作り、リポジトリが読む環境変数の名前を値なしで並べる。コードの中の process.env.X、os.environ["X"]、os.getenv("X") などから拾う
- .env 自体は作らない。中身も開かない

## 4. CLAUDE.md に決まりを足す

CLAUDE.md が無ければ作る。あれば末尾に次の節を足す。リポジトリの言葉に合わせて言い回しを変えてよいが、中身は削らない。

```markdown
## 鍵

鍵はリポジトリ直下の .env の1か所だけに置く。見本は .env.example。.env の中身は開かず、表示もしない。鍵が要るコマンドは with-env を前に付けて実行する。全文検索は Grep ツールか git grep を使う。

## 危ない操作と承認ゲート

プラグイン harness の guard.py が、Bash とファイル操作、コネクタの前に走る。止められたり確認に回されたりしたら、別のコマンドに言い換えて同じことをしない。何をしようとして止まったかを報告して、指示を待つ。PR、デプロイ、公開、外部への送信、共有、定期タスクの変更は、必ず人が承認する。

## 品質の関所

ユーザーに完了を伝える前に、検品係の kenpin を通す。人が読む日本語を書いたら ja-text-checker にも通す。差し戻されたら直してから、もう一度通す。

## 書き足した決まり

ユーザーから、この先も続く指示をもらったら、ここに日付を付けて1行で書き足す。
```

## 5. 確かめる

- python3 -m json.tool .claude/harness.json で JSON が壊れていないかを見る
- test_command を一度実行して、通るかどうかを報告に書く。落ちても直さず、落ちたことだけを書く
- 作ったファイルはコミットしない。コミットするかはユーザーが決める
