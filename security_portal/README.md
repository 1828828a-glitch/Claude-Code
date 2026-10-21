# ブランドを守るセキュリティ相談室

企画・宣伝協同組合（経済産業省認可）が運営する、ブランド・マーケティング担当向けのセキュリティ啓発ポータル。中立の立場で、売り込みをせずにリスクを率直にチェックする。

サーバーは不要。`site/` をそのまま Vercel・Cloudflare Pages・Netlify などに置けば動く。

## 画面

| ハッシュ | 画面 | 中身 |
| --- | --- | --- |
| `#home` | ホーム | 注意喚起（PHP）、立ち位置、公的データ3つ、直近の事例、今日できること、FAQ |
| `#check` | 診断 | 属性4問 → 本診断18問（1画面1問・進捗バー・戻る） → 結果 |
| `#cases` | 直近の事例 | カテゴリで絞り込み。各事例に「ブランド・マーケ担当が学べること」と出典 |
| `#risks` | リスクと対策 | 7つのリスクごとに要注意のサイン、今日・今月・仕組みの対策、関連事例、AIに聞く |
| `#now` | 今すぐできること | 13項目のチェックリスト（チェックはその端末の localStorage にだけ残る） |
| `#ask` | AIに聞く | 自由記述と例文から、外部のAIを質問文入りで開く |
| `#game` | 止める？通す？ | 10場面を左右に仕分ける体験。通した危険が「1年後の総括」になる |
| `#about` | 組合について | 運営、中立の方針、専門家チームでの相談の流れ |

結果ページの構成：ステータス画面（レベル・リスク指数・対策率）、7つの守りの総括（レーダーと7枚のカード）、弱点トップ3、放置シミュレーション（放置ルートと対策ルートの切り替え）、次の目標（今週・今月・3か月）、結果をAIに相談、自社で進められる範囲と相談したほうがよい範囲、公的な無料ツール、免責。

## ファイル

```
security_portal/
  site/                  公開するフォルダ
    index.html           画面の骨組みとホームの文章（SEO用にFAQの構造化データあり）
    privacy.html         プライバシーポリシーのひな形
    llms.txt             AI向けの要約（tools/build_llms.py で生成）
    llms-full.txt        AI向けの全文（同上）
    assets/
      scoring.js         採点（questions.json の scoring を解釈する純粋な関数）
      story.js           放置シミュレーション、止める？通す？、AIに聞くリンク
      app.js             画面の組み立てと操作
      style.css
      mark.svg           仮のマーク（正式なロゴに差し替える）
    data/
      questions.json     設問・重み・係数・レベル・上書きルール・属性ごとの一言・相談の目安
      scenes.json        設問の場面、放置シナリオ、止める？通す？のカード
      cases.json         直近の事例
      risks.json         7つのリスクと対策
      actions.json       今すぐできること
      news.json          注意喚起（show_until を過ぎると表示されない）
      config.json        公開URL、組合の情報、専門家の分野、GA4、AIサービスと質問文
  tests/                 node:test の単体テスト
  tools/
    build_llms.py        llms.txt と llms-full.txt を作る
    build_preview.py     確認用の1ファイル版（dist/preview.html）を作る
```

## 動かす・確かめる

```bash
cd security_portal/site && python3 -m http.server 8000   # http://localhost:8000
node --test security_portal/tests/*.test.cjs              # 採点とデータのテスト
python3 security_portal/tools/build_llms.py               # データを直したら作り直す
python3 security_portal/tools/build_preview.py            # サーバーなしで開ける1ファイル版
```

`index.html` を直接ファイルとして開くと、データを読み込めない（ブラウザの制限）。確認は上のローカルサーバーか、1ファイル版で行う。

## 採点

- 回答は はい 0点、一部・たまに 1点、いいえ・分からない 2点。点数×重みを合計する（満点82）。
- リスク指数＝合計÷82×100×係数（四捨五入、上限100）。係数は重なってかかる。
  - 生成AIを個人の判断で使っている、または分からない：×1.1
  - AIを禁止しているが、Q3（隠れた利用の把握）が「いいえ」：×1.15
  - 要配慮情報またはカード・口座を扱う：×1.2
- レベル：0〜24 が1、25〜49 が2、50〜74 が3、75〜100 が4。
- 上書き：重要4項目（Q1 AIへの入力、Q7 サイトの更新、Q10 SNSの多要素認証、Q13 送金の確認）のうち2つ以上が「いいえ」なら、レベル3以上にする。
- 重みや設問を変えたら `scoring.max_raw` も直す（テストで食い違いを検出する）。

## AIに聞く

サイトにAIは置かず、普段使っているAIを質問文入りのURLで開く。対応は ChatGPT（`hints=search` 付き）、Claude、Grok、Perplexity、Google の AI モード。Gemini 本体はURLで質問文を渡せないため入れていない。

- 外部のAIは JavaScript で描いた画面を読めないことが多いので、質問文では `llms-full.txt` を読ませる。データを直したら `build_llms.py` を実行する。
- `config.json` の `site_url` を公開URL（末尾の `/` まで）にすると、質問文に資料のURLが入る。空のままだと資料なしの質問文になり、画面に「要確認」が出る。
- 質問文は `config.json` の `ai.prompts` で直せる。日本語はURLにすると約9倍に膨らむので、`max_url_length`（2000）を超えないようにしている。結果入りの質問文は、長すぎると弱点の数を減らして収める。
- 参考にした事例では「なぜ最適な選択肢なのか」と前提を置いて聞いていたが、中立の立場と合わないので、「率直に」「不要な対策や過剰な投資は勧めないで」「特定の会社やサービスを勧める必要はない」と頼む形にした。
- 各サービスのURLの仕様は予告なく変わる。公開前と、その後も定期的に、実際にリンクを押して確かめる。

## 通信とデータの扱い

- 診断の回答は sessionStorage にだけ保存し、結果を表示するまで外部へ何も送らない（Playwright で確認済み）。
- GA4 は `config.json` の `ga4_id` を入れたときだけ読み込む。`diag_start`・`diag_answer` も結果の表示まではメモリにためておき、結果を表示した時点でまとめて送る。そのため、途中でやめた人の設問ごとの離脱は計測できない。離脱を測りたい場合は、この方針と引き換えになる。
- 連絡先を入力するフォームは置いていない。相談は組合の問い合わせフォームへのリンクで受け、結果の要約（会社名は含まない）をコピーして貼ってもらう。

## 公開前に人が確認すること

1. `config.json` の `org.experts`：専門家の分野は仮置き。組合員の実際の分野に直し、`confirmed` を `true` にすると「要確認」の表示が消える。
2. `config.json` の `site_url` と、`index.html` の OGP 画像（`assets/ogp.png` はまだない）。
3. `assets/mark.svg` は仮のマーク。組合の正式なロゴファイルに差し替える。
4. `privacy.html` の【要確認】の箇所（GA4 の有無、所在地、制定日）。
5. 実在企業の事例の書き方（`cases.json`）を、組合の担当者か法務に見てもらう。
6. 問い合わせ先 `https://www.pac-or.jp/contact.html` が正しいか。
7. AIサービスの5つのリンクを実際に押して、質問文が入った状態で開くか。

## 載せていないもの

確認できなかった情報は載せていない。2026年10月20日に話題になった PingCAP（TiDB Cloud）からの大量流出は犯行グループの主張のみで未確認、認証局 eMudhra の中間証明書の秘密鍵の件も一次情報を確認できなかったため、どちらも事例に入れていない。確認が取れたら `cases.json` に追加する。

## 紹介動画

`video/` に、1920×1080・63秒の紹介動画の作り方一式がある。映像はHTMLのアニメーションで組み、1コマずつ撮って MP4 にする。字幕は焼き込み。BGMは `video/bgm.py` がその場で合成するオリジナル曲（96BPM・ハ長調、-16 LUFS）で、ナレーションは入っていない。ナレーション原稿と構成は `video/narration.md`。

```bash
cd security_portal/site && python3 -m http.server 8765 &   # サイトを配信しておく
node security_portal/video/shots.cjs                        # 実際の画面を撮る（video/shots/）
python3 security_portal/video/bgm.py                        # BGM（video/out/bgm.wav）を作る
node security_portal/video/render.cjs                       # video/out/intro.mp4（BGMつき）と intro.srt を書き出す
node security_portal/video/render.cjs --stills 5,30,60      # 指定した秒の静止画だけ見る
```

文言や秒数は `video/index.html` の中で直す。ブラウザでそのまま開くと再生して確かめられる。書き出しには Playwright と ffmpeg が要る。

## 更新のしかた

- 毎月：新しい事例を `cases.json` の先頭に足し、`updated` を変える。注意喚起は `news.json`（期限は `show_until`）。
- 四半期：設問を見直す。新しい手口が出たら設問・場面（`scenes.json`）・カードを足す。
- データを直したら、テストと `build_llms.py` を実行する。
