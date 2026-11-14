# このリポジトリでの決まり

Claude Code が毎回最初に読むファイル。中身は2つのアプリと、それを触るときの決まり。

## 中身

フリオチLAB は furiochi_lab と furiochi_app.py。フリオチ思考を鍛えるドリルで、詳しくは furiochi_lab/README.md。furiochi_lab/web/src は claude.ai で開く1ページ版の部品で、問題バンクや採点ルールを Python 側から埋め込んで作る。

エニアグラム統合タイプ判定は enneagram_tool と streamlit_app.py。

テストは tests にあり、python3 -m pytest -q tests で20秒ほどかかる。AI講評は偽のクライアントで試すので、テストで API は呼ばない。

## 動かし方

```bash
pip install -r requirements.txt
scripts/with-env streamlit run furiochi_app.py
scripts/with-env python -m furiochi_lab
python3 furiochi_lab/web/build.py furiochi-lab.html
python3 scripts/check_candidates.py
```

## 鍵

鍵はリポジトリ直下の .env の1か所だけに置く。見本は .env.example。

.env の中身は開かない。表示しない。回答や図やコミットに書かない。鍵が要るコマンドは scripts/with-env を前に付けて実行すれば、実行時に読み込まれる。どの鍵があるかは、セッション開始時に名前だけが渡される。

全文検索は Grep ツールか git grep を使う。Bash の grep -r は .gitignore を見ないので、.env の中身まで出力に出てしまう。

ユーザーがチャットに鍵を貼ろうとすると、送信前に prompt_guard が止める。

## 危ない操作

plugins/harness/scripts/guard.py が、すべての Bash とファイル操作、コネクタのツールの前に走る。

ルートやホーム、このプロジェクトを丸ごと含む削除と、main への force push は止める。再帰削除、sudo、force push、main への push、git reset --hard、作業中の変更を捨てる操作は人の確認に回す。変更を捨てる操作には checkout -- や restore、switch -f も入る。.env の読み取りと上書き、鍵の値の表示も確認に回す。

止められたり確認に回されたりしたら、別のコマンドに言い換えて同じことをしない。何をしようとして止まったかを報告して、指示を待つ。

## 承認ゲート

壊す操作とは別に、外に出す操作は必ず人が承認する。guard.py が確認に回すのは次のもの。

- 公開とデプロイ：vercel、wrangler、firebase などのデプロイ、npm や PyPI への公開、docker push
- GitHub への書き込み：PR の作成・マージ・コメント・レビュー、issue、リリース。作業ブランチへの git push は通る
- 外部へのデータ送信：curl や wget での POST・PUT・DELETE。localhost あては対象外
- 共有と削除：Drive の共有やゴミ箱行き、Docs の削除、Canva のコメントやテンプレート公開
- 定期タスクの作成・変更・手動実行

課金、契約、購入はツールでは見ていない。頼まれても、実行する前に金額と相手をユーザーに確かめる。

定期タスクのように人がいない場面では、ゲートにかかる操作をしない。かかりそうなら手前で止めて、最後の報告に書く。

## 定期タスク

フリオチ新問の朝便が、毎朝6時50分（日本時間）に動く。届け先は実行用セッションの フリオチ新問の朝便（実行用） で、このリポジトリと furiochi-candidates への書き込み先を最初から持っている。毎回、前回の続きではなく同じ手順を最初からやり直す。新問を3つ作り、scripts/check_candidates.py で形を確かめ、furiochi-problem-checker に通して、残ったものを furiochi-candidates ブランチの furiochi_lab/data/candidates/日付.json に置く。PR は作らず、problems.py にも触らない。

候補を問題バンクに入れるかどうかは人が決める。選ぶ場所は選別台 https://claude.ai/artifact/6tAgoE1wTR2T9gUTPa8mt6（ソースは docs/candidate-review.html）。候補は保存場所の candidates に、判定とメモは decisions に入る。ユーザーが選別台で採用した候補を入れてと言ったら、ArtifactData で decisions を読み、verdict が adopt の候補を、メモの手直しを反映して problems.py に移す。id はモードの接頭辞で次の番号を振り直す。移したら decisions のその候補に applied: true を書き、Web版を作り直す。新しい朝便の候補を選別台に足したいと言われたら、furiochi-candidates から読んで candidates に入れる。候補は git show origin/furiochi-candidates:furiochi_lab/data/candidates/日付.json で読み、furiochi-candidates を checkout しない。あちらのブランチにはプラグインの置き場が無いので、切り替えるとフックが外れる。

## プラグイン harness

フック、検品係の kenpin と ja-text-checker、with-env は plugins/harness にまとめてあり、ほかのリポジトリへはプラグインとして配っている。入れ方は plugins/harness/README.md。このリポジトリ自身はプラグインを入れず、.claude/settings.json から plugins/harness/scripts を直接呼び、検品係は .claude/agents からリンクで読む。プラグインを直せば、その場でここにも効く。

フックを足したり変えたりするときは、.claude/settings.json と plugins/harness/hooks/hooks.json の両方を同じ中身に直す。テストがずれを見張っている。プラグインを配り直すときは、plugin.json と .claude-plugin/marketplace.json の version を一緒に上げる。

このリポジトリだけの設定は .claude/harness.json にある。Stop フックで回すテストのコマンドと、Web版の作り直しを知らせるパスを書いている。

## 品質の関所

Python や JSON を書くと、直後に post_edit_check が構文を確かめる。壊れていたらその場で差し戻される。

作業を終える前に stop_tests がテストを回す。.claude/harness.json の test_globs に当たるファイル、ここでは .py に未コミットの変更があるときだけ走り、落ちていれば終わらせずに差し戻す。

ユーザーに完了を伝える前に、検品係を通す。

- kenpin：コードや文章を変えたら必ず。テスト、依頼と差分の突き合わせ、鍵の混入、Web版の作り直し漏れを見る
- ja-text-checker：README、画面の文言、問題文、講評プロンプトなど、人が読む日本語を書いたとき
- furiochi-problem-checker：furiochi_lab/data/problems.py の問題や候補を足したり直したりしたとき

検品で差し戻されたら直してから、もう一度通す。直さないと決めた指摘は、理由を添えてユーザーに伝える。

## 書くときの決まり

画面の文言や README の日本語は、ユーザーの文体ルールに合わせる。Markdown の太字を文中に残さない。「」は引用と固有名詞だけ。（）の補足を重ねない。同じ語尾を3回続けない。逃げの言い回しを使わない。迷ったら ja-text-checker に通す。

フリオチLAB の画面文言では、利用者を責める言い方と、正解を当てるゲームのように読める言い方を避ける。ja-text-checker もこの決まりで見る。

問題バンク、採点ルール、AIプロンプトを変えたら、作業の区切りで Web版を作り直す。

## 書き足した決まり

ユーザーから「今後は〜して」「〜はしないで」のような、この先も続く指示をもらったら、ここに1行で書き足してコミットする。クラウドのセッションは毎回消えるので、覚えておくべきことはこのファイルに残す。日付を頭に付ける。

- 2026-11-08 ハーネス（フック・権限ルール・検品係）を入れた。図は docs/ai-ecosystem.html
- 2026-11-08 承認ゲートと、毎朝の新問づくりの定期タスクを入れた。新問は候補として置くだけで、採用は人が決める
- 2026-11-14 共通の部品をプラグイン harness にまとめ、このリポジトリを配布元にした
- 2026-11-15 朝便の候補を選ぶ選別台を作った。採用は選別台の decisions を正とする
