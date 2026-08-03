---
name: video-production
description: 台本からドキュメンタリー風の歴史解説モーショングラフィックス動画(1920x1080)を生成する。「動画を作って」「〇〇の解説動画」「歴史動画」「モーショングラフィックス」といった依頼で使う。video-studio/のRemotionプロジェクトを使い、台本(screenplay)データを書くだけで、検証済みのシーンコンポーネントが映像品質を保証する。
---

# 動画制作スキル(video-studio)

台本テキストを受け取り、`video-studio/` のRemotionプロジェクトで
「1分でわかる日本史」風の高品質モーショングラフィックス動画を生成する。

## 品質担保の大原則

**映像の見た目を自分で発明しない。** 色・書体・余白・イージングは
`src/theme.ts` と各シーンコンポーネントに封じ込めてある。
Claudeがやるのは **台本を screenplay データに変換すること** と
**静止画レンダリングで確認すること** だけ。この分業が品質の源泉。

- シーンコンポーネントのスタイル(色・フォントサイズ・座標)を台本ごとに書き換えない
- 新しい見た目が必要なら、その場しのぎのCSSではなく `src/components/` に汎用シーンとして追加し、静止画で検証してから使う
- テキストの色強調は narration / heading 内の `**強調**` 記法だけを使う

## ワークフロー

### 1. 台本をシーンに分解する

台本(ナレーション原稿)を1シーン=1メッセージに分割し、各シーンに最適な型を選ぶ:

| シーン型 | 用途 | 例 |
|---|---|---|
| `title` | 金屏風のオープニング | シリーズ名+エピソード名 |
| `year` | 年号のドン出し | 「1853年 / 嘉永六年」 |
| `character` | 人物紹介(立ち絵+名前+肩書) | ペリー提督、織田信長 |
| `lineup` | アイコン列+数(現状は黒船のみ) | 「黒船 4隻」 |
| `map` | 日本地図+赤ハイライト+矢印+地名 | 「浦賀」「本能寺」 |
| `timeline` | 年表+現在位置マーカー | 1853→1867 |
| `stat` | 数値+カウントアップ+進捗バー | 「天下統一 83%」 |
| `text` | 1文の提示。impact(闇+光る文字)/question(和紙+朱下線)/plain | 「なぜ、裏切ったのか?」 |
| `image` | ユーザー素材のフルスクリーン+Ken Burns | 情景画・写真 |
| `formula` | 「A+B+C」型の提示。トークンが1つずつポップイン | 「否定+ユーモア+解像度…」 |
| `flowCompare` | 旧フロー(グレー)→新フロー(アクセント)の比較 | 「旧: 発言→共有→終了」 |
| `steps` | 番号付き縦ステップ(最大6)が順に積み上がる | 再現可能性の6ステップ |
| `outro` | 締め・次回予告 | 「次回 日米和親条約」 |

ビジネス・ノウハウ系の台本(インフォグラフィックの動画化など)は
`formula` / `flowCompare` / `steps` を軸に組むと動きが出る。
参考実装: `src/screenplay/teirei.ts`(4枚のインフォグラフィックのダイジェスト)。

スキーマの正確な定義は `video-studio/src/screenplay/types.ts` を読むこと。

### 2. screenplay を書く

`video-studio/src/screenplay/` に `<題材>.ts` を作り、`Screenplay` 型で書く。
`demo.ts`(黒船来航)が全シーン型を使った参考実装。

`src/Root.tsx` の import を新しい screenplay に切り替える(または Composition を追加する)。

### 3. 素材(任意)

- 人物立ち絵: 背景透過PNGを `video-studio/public/assets/` に置き、`character` シーンの `image` にファイル名を指定。無ければ様式化された墨シルエットが出る(それなりに見えるが、立ち絵があるほうが参照動画の質感に近い)
- 情景画: `image` シーンで使う。横1920px以上を推奨
- 地図の地名: `src/assets/japanPath.ts` の `PLACES` に無い地点は `[経度, 緯度]` で指定できる

### 4. 静止画で品質チェック(必須)

フルレンダリング前に、**各シーンの代表フレームを1枚ずつ静止画で出して目視確認する**:

```bash
cd video-studio
npx remotion still HistoryVideo out/check_<scene>.jpg --frame=<フレーム番号>
# このリモート環境では --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell を付ける
```

フレーム番号の目安: シーンのアニメーションが落ち着く「シーン開始+60〜80フレーム」。
シーン開始フレームは各シーン尺(`sceneDurationSec`)の累積から計算(トランジションで12フレームずつ重なる)。

チェックリスト:
- [ ] テキストがはみ出し・改行崩れしていない(長い見出しは`\n`で手動改行)
- [ ] 字幕が1行に収まっている(目安: 全角28文字以内。超えるなら文を分割)
- [ ] 強調(`**`)が1シーン1〜2箇所に留まっている
- [ ] 人物・地図・図版が字幕や見出しと重なっていない
- [ ] 地図のハイライト位置が正しい地方を指している

問題があれば screenplay(または素材)を直して再確認。コンポーネント側をいじるのは最終手段。

### 5. フルレンダリング

```bash
npx remotion render HistoryVideo out/<題材>.mp4
# リモート環境では --browser-executable=... を付ける
```

レンダリング後、`ffmpeg -i out/<題材>.mp4 -vf fps=1,scale=640:-1 frames/f_%02d.jpg` で
数フレーム抜き出して最終確認し、動画ファイルをユーザーに届ける。

## 尺とテンポの規範

- ナレーションは1シーン1文(長くて2文)。読了時間は自動計算される(約6.5文字/秒+余白)
- `durationSec` の手動指定は「余韻が必要な演出」だけに使う(2.5〜8秒が実用域)
- 動画全体は 40〜90秒 に収める(参照動画のフォーマット)。長い台本は複数話に分ける
- シーン順の定石: title → year/character(状況設定)→ 事件の提示(map/lineup/text)→
  展開(stat/timeline)→ 締め(outro)

## ナレーション音声とBGM

### ナレーション(edge-tts)

`edge-tts`(`pip install edge-tts`)で日本語ニューラル音声を合成できる:

```bash
edge-tts --voice ja-JP-NanamiNeural --rate=+8% \
  --text "ナレーション本文" --write-media public/assets/narration/scene_01.mp3
```

- 声は `ja-JP-NanamiNeural`(女性・落ち着き)を既定に。男性なら `ja-JP-KeitaNeural`
- 数字・英字は読み間違いやすいので読み仮名で書く(例: 5% → 5パーセント、1on1 → 1オン1)
- 合成後に ffmpeg で実尺を測り、**各シーンの `durationSec` を「音声実尺+約1.1秒」に明示指定する**
  (音声はシーン頭+8フレームから再生される)
- シーンの `audio` に `narration/scene_01.mp3` のようにパスを指定
- 字幕(`narration`)は音声の要約でよい。全角28文字以内に収める
- このリモート環境ではTLS対策が必要な場合がある: certifiのバンドルを
  `cp /etc/ssl/certs/ca-certificates.crt $(python3 -c "import certifi; print(certifi.where())")` で差し替える

### BGM

- screenplay の `bgm: { file: 'bgm/xxx.mp3', volume: 0.13 }` で全編ループ+末尾フェードアウト
- **音声フォーマットは必ずmp3**(ChromiumはAAC/m4aをデコードできずレンダリングが止まる)
- 既存の同梱BGM: `bgm/corporate_pad.mp3`(温かいパッド系、ライセンスフリーの自作生成)。
  別の曲調が必要なら `scripts` の要領でnumpy合成するか、ユーザー提供の音源を使う
- 音量はナレーションを邪魔しない 0.10〜0.16 が目安

## 技術メモ

- フォントは `public/fonts/` にセルフホスト済み(JIS X 0208サブセット)。ネットワーク不要で決定論的にレンダリングされる
- 日本地図パスは `scripts/generate-japan-path.mjs` で world-atlas から再生成できる
- このリモート環境ではChromium起動に `--browser-executable` 指定が必須(上記パス)。ローカル環境では不要
- 縦型(ショート動画)が要求されたら `theme.ts` の `VIDEO` を 1080x1920 にした別Compositionを作り、各シーンの静止画確認からやり直す
