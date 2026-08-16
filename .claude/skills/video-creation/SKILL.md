---
name: video-creation
description: Remotion(React)でアニメーション動画を作る。日本史・雑学などの解説アニメ、架空のテレビ番組オープニング、テンポの速い縦型ショート動画など。「動画作って」「アニメーション作って」「ショート動画にして」「この台本を動画に」「参考動画の雰囲気を真似して」といったリクエストで使う。台本(JSON)からmp4を書き出すところまでを担当する。
---

# 動画制作（Remotion）

`video/` の Remotion プロジェクトで動画を作る。React コンポーネントで
アニメーションを書き、mp4 に書き出す。

## 全体の流れ

1. **お題を確認する** — 題材・尺・縦横・雰囲気。分からなければ聞く前に
   デフォルト（横型・解説アニメ・1〜2分）で1本作って見せた方が早い。
2. **参考動画があるなら先に学習する** — 下の「参考動画から雰囲気を盗む」
3. **台本 JSON を書く** — `video/src/scripts/*.json`
4. **プレビューで確認する** — 静止画を数枚レンダリングして自分の目で見る
5. **mp4 に書き出す**

## コマンド

作業ディレクトリは常に `video/`。

```bash
npm install                 # 初回のみ
npm run studio              # ブラウザでプレビュー（人間が見る用）
npx remotion compositions src/index.ts   # 尺と解像度の確認

# 静止画（自分で絵を確認するときはこれ。速い）
npx remotion still src/index.ts <ID> out/check.png --frame=120

# 書き出し
npx remotion render src/index.ts <ID> out/video.mp4
```

コンポジション ID は `HistoryExplainer` / `TVOpening` / `FastCutShorts`。

## 台本の書き方

`video/src/scripts/` に JSON を置き、`src/Root.tsx` から読む。
尺は台本の文字数から自動計算されるので、`durationInSeconds` は
「ここだけ長く見せたい」ときだけ書けばいい。

```json
{
  "title": "動画のタイトル",
  "palette": "sumi",
  "background": "washi",
  "transition": "fade",
  "pace": 1,
  "scenes": [
    { "type": "title", "chip": "日本史", "title": "本能寺の変" },
    { "type": "statement", "text": "たった/一夜で、/天下が/変わった。", "emphasis": ["一夜"] },
    { "type": "narration", "text": "天正10年6月2日。", "image": "photos/kyoto.jpg" }
  ]
}
```

### シーンの種類

| type | 用途 | 主なキー |
|---|---|---|
| `title` | 冒頭・章タイトル | `title` `subtitle` `chip` |
| `statement` | 決め台詞の全画面キネティックタイポ | `text` `emphasis` `mode` |
| `narration` | 画像＋テロップの基本カット | `text` `emphasis` `image` `imagePrompt` |
| `bullets` | 箇条書きの順次表示 | `heading` `items` |
| `timeline` | 年表 | `heading` `events[{year,label}]` |
| `compare` | 左右2分割の比較 | `heading` `left` `right` |
| `quote` | 引用・史料 | `text` `source` |
| `stat` | 数字を1つ大きく（カウントアップ） | `value` `label` `suffix` |
| `logo` | 番組ロゴカード | `title` `tagline` |
| `credit` | 出演者・スタッフ | `role` `names` |
| `outro` | 締め・CTA | `text` `cta` |

全シーン共通で `durationInSeconds` `background` `transition` `image` `imagePrompt` `telop` が使える。

### 覚えておくと効く記法

- **`/`** … `statement` のテキストに入れると、その文節単位でまとめて動く。
  `"もう/戻れない"` → 「もう」「戻れない」の2ブロック。日本語は単語の
  区切りが無いので、これがリズムを作る一番の道具になる。
- **`\n`** … 明示的な改行。
- **`emphasis`** … その語だけ色が変わる。1カットにつき1語までにする。

### パレットと背景

- パレット: `sumi`(黒地・シリアス) `washi`(和紙・歴史) `neon`(番組OP) `pop`(明るい・ショート)
- 背景: `plain` `radial` `stripes` `grid` `burst`(集中線) `washi`
- 繋ぎ: `cut` `flash` `fade` `slide` `zoom`

## 絵をつける

文字だけだと「動くスライド」に見える。解説系は絵が入って初めて動画になるので、
台本を書いたら画像を当てるところまでをセットで考える。

シーンに `imagePrompt`（何を描くか）、台本のトップレベルに `imageStyle`（どう描くか）を書く。
画風を1箇所にまとめないとカットごとに絵柄がバラつくので、必ず分ける。

```bash
npm run assets -- src/scripts/xxx.json --dry-run   # プロンプトの確認（無料）
OPENAI_API_KEY=sk-... npm run assets -- src/scripts/xxx.json
```

`public/photos/` に保存され、台本の `image` に書き戻される。
ファイル名にプロンプトのハッシュが入るので、プロンプトを直さない限り再生成されない。

絵を当てる／当てないの判断:

- **当てる** … `narration` `statement` `title` `outro`。文字が少なく、絵で語れるカット
- **当てない** … `timeline` `compare` `bullets` `stat`。文字情報が主役なので、
  背景に絵を敷くと読めなくなる。`background` のパターンで十分

## 参考動画から雰囲気を盗む

真似したい動画があるなら、言葉で説明させるより**フレームを見せる**方が速い。

```bash
./tools/extract-frames.sh "<YouTubeのURL>" refs/my-ref 40
```

`refs/my-ref/contact-sheet.jpg`（全フレームを1枚に並べた画像）と個別フレームを
Read で読み、次を言語化してから台本を書く:

- 配色（背景・文字・アクセントの3色）
- 1カットの長さとカット割りのテンポ
- 文字の出方（1文字ずつ / 単語ごと / 一気に）
- カットの繋ぎ方（ハードカット / フラッシュ / スライド）
- 画面のどこに文字を置いているか

言語化した内容は、既存パレットに無ければ `src/theme/tokens.ts` に
パレットを1つ足す形で残す。

## 素材（画像・BGM）の置き場所

`video/public/` に置き、台本からは `public/` を除いた相対パスで指定する。

```
video/public/photos/kyoto.jpg  →  "image": "photos/kyoto.jpg"
video/public/bgm/calm.mp3      →  "bgm": "bgm/calm.mp3"
```

外部 URL もそのまま書けるが、レンダリング中にネットワークを叩くので
本番では `public/` に置く方が安定する。

## 作業するときの注意

- **必ず自分の目で見る。** レンダリングが成功しても絵が壊れていることはある。
  `remotion still` で 3〜5 フレーム書き出して Read で確認してから完了と言う。
  特に確認すべきは「文字が画面からはみ出していないか」「短いカットで
  文字が出切る前に次のカットに行っていないか」。
- **色は `src/theme/tokens.ts` のパレット経由で使う。** コンポーネントに
  直接 hex を書くと動画全体で色がバラつく。
- **新しい演出を足すときは**、`src/lib/schema.ts` にシーンを追加 →
  `src/scenes/` にコンポーネントを追加 → `src/Storyboard.tsx` の
  `SceneRouter` に登録 → `src/lib/duration.ts` に尺の計算を追加、の4点セット。
  どれか忘れると型エラーで気づけるようにしてある。
- **フォントはバンドル済み**（`@fontsource`）。Google Fonts の CDN は
  日本語だとサブセットが数百ファイルに分かれて遅く不安定なので使わない。
- `npx tsc --noEmit` で型チェックが通ることを確認してからコミットする。
