# このリポジトリでの決まり

Claude Code が毎回最初に読むファイル。中身は2つのアプリと、それを触るときの決まり。

## 中身

フリオチLAB は furiochi_lab と furiochi_app.py。フリオチ思考を鍛えるドリルで、詳しくは furiochi_lab/README.md。furiochi_lab/web/src は claude.ai で開く1ページ版の部品で、問題バンクや採点ルールを Python 側から埋め込んで作る。

エニアグラム統合タイプ判定は enneagram_tool と streamlit_app.py。

テストは tests にあり、python3 -m pytest -q tests で7秒ほどで終わる。AI講評は偽のクライアントで試すので、テストで API は呼ばない。

## 動かし方

```bash
pip install -r requirements.txt
scripts/with-env streamlit run furiochi_app.py
scripts/with-env python -m furiochi_lab
python3 furiochi_lab/web/build.py furiochi-lab.html
```

## 鍵

鍵はリポジトリ直下の .env の1か所だけに置く。見本は .env.example。

.env の中身は開かない。表示しない。回答や図やコミットに書かない。鍵が要るコマンドは scripts/with-env を前に付けて実行すれば、実行時に読み込まれる。どの鍵があるかは、セッション開始時に名前だけが渡される。

ユーザーがチャットに鍵を貼ろうとすると、送信前に prompt_guard が止める。

## 危ない操作

.claude/hooks/guard.py がすべての Bash と、ファイルを読む・書く操作の前に走る。ルートやホームの丸ごと削除、main への force push は止める。再帰削除、sudo、force push、git reset --hard、変更を捨てる操作、.env への接触は人の確認に回す。

止められたり確認に回されたりしたら、別のコマンドに言い換えて同じことをしない。何をしようとして止まったかを報告して、指示を待つ。

## 品質の関所

Python や JSON を書くと、直後に post_edit_check が構文を確かめる。壊れていたらその場で差し戻される。

作業を終える前に stop_tests がテストを回す。未コミットの .py があるときだけ走り、落ちていれば終わらせずに差し戻す。

ユーザーに完了を伝える前に、検品係を通す。

- kenpin：コードや文章を変えたら必ず。テスト、依頼と差分の突き合わせ、鍵の混入、Web版の作り直し漏れを見る
- ja-text-checker：README、画面の文言、問題文、講評プロンプトなど、人が読む日本語を書いたとき
- furiochi-problem-checker：furiochi_lab/data/problems.py の問題を足したり直したりしたとき

検品で差し戻されたら直してから、もう一度通す。直さないと決めた指摘は、理由を添えてユーザーに伝える。

## 書くときの決まり

画面の文言や README の日本語は、ユーザーの文体ルールに合わせる。Markdown の太字を文中に残さない。「」は引用と固有名詞だけ。（）の補足を重ねない。同じ語尾を3回続けない。逃げの言い回しを使わない。迷ったら ja-text-checker に通す。

問題バンク、採点ルール、AIプロンプトを変えたら、作業の区切りで Web版を作り直す。

## 書き足した決まり

ユーザーから「今後は〜して」「〜はしないで」のような、この先も続く指示をもらったら、ここに1行で書き足してコミットする。クラウドのセッションは毎回消えるので、覚えておくべきことはこのファイルに残す。日付を頭に付ける。

- 2026-11-08 ハーネス（フック・権限ルール・検品係）を入れた。図は docs/ai-ecosystem.html
