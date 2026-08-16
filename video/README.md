# video — Claude Code × Remotion アニメーション動画スタジオ

台本（JSON）を渡すと、アニメーション動画が mp4 で出てくる。

- **解説アニメ**（日本史・雑学など、横型）
- **架空のテレビ番組オープニング**（横型）
- **テンポの速い縦型ショート**（TikTok / Reels / Shorts）

動画は React コンポーネントとして書かれていて、[Remotion](https://remotion.dev)
がそれを1フレームずつブラウザで描画して mp4 にする。

## セットアップ

```bash
cd video
npm install
```

Node.js 18 以上が必要。初回レンダリング時に Remotion が Chrome Headless Shell
（約90MB）を自動でダウンロードする。

## 使う

```bash
npm run studio        # ブラウザでプレビュー（台本を編集しながら確認できる）
```

```bash
# 書き出し
npx remotion render src/index.ts HistoryExplainer out/history.mp4
npx remotion render src/index.ts TVOpening       out/opening.mp4
npx remotion render src/index.ts FastCutShorts   out/shorts.mp4

# 1枚だけ静止画で確認（速いので調整中はこれ）
npx remotion still src/index.ts HistoryExplainer out/check.png --frame=120
```

## 台本を書く

`src/scripts/` に JSON を置いて、`src/Root.tsx` から読ませる。

```json
{
  "title": "本能寺の変・3分でわかる",
  "scenes": [
    { "type": "title", "chip": "日本史", "title": "本能寺の変" },
    { "type": "statement", "text": "たった/一夜で、/天下は/ひっくり返った。", "emphasis": ["一夜"] },
    { "type": "timeline", "heading": "その日、何が起きたか", "events": [
      { "year": "6/1 夜", "label": "明智光秀、丹波亀山城を進発" },
      { "year": "6/2 早朝", "label": "本能寺を包囲、信長自刃" }
    ]},
    { "type": "outro", "text": "歴史は、\n一晩でひっくり返る。", "cta": "チャンネル登録" }
  ]
}
```

**尺は書かなくていい。** 文字数から読み上げ時間を見積もって自動で決まる。
「ここだけ長く見せたい」ときだけ `durationInSeconds` を書く。

### シーンの種類

`title` `statement` `narration` `bullets` `timeline` `compare` `quote`
`stat` `logo` `credit` `outro` の11種類。
それぞれのキーは [`src/lib/schema.ts`](src/lib/schema.ts) が唯一の正。

### 日本語のための記法

| 記法 | 効果 |
|---|---|
| `/` | 文節の区切り。`"もう/戻れない"` で「もう」「戻れない」がまとまって動く |
| `\n` | 明示的な改行 |
| `emphasis` | 指定した語だけアクセント色になる |

日本語は単語の区切りが空白ではないので、`/` を入れる場所がそのまま
動画のリズムになる。ここが一番効く。

### 見た目を変える

```json
{ "palette": "neon", "background": "burst", "transition": "flash", "pace": 0.8 }
```

- **palette** — `sumi`（黒地・シリアス） `washi`（和紙・歴史） `neon`（番組OP） `pop`（明るい）
- **background** — `plain` `radial` `stripes` `grid` `burst`（集中線） `washi`
- **transition** — `cut` `flash` `fade` `slide` `zoom`
- **pace** — 全体のテンポ。`0.8` で2割速くなる

## 絵を生成する

文字だけの動画は、どれだけアニメーションを凝っても「動くスライド」に見える。
参考にしている解説動画が強いのは絵があるからなので、ここが完成度の分かれ目になる。

台本のシーンに `imagePrompt` を書いて、生成コマンドを叩く。

```json
{
  "imageStyle": "戦国時代の日本を描いた、色数の少ない和風イラスト。墨と朱を基調にした夜の情景。手描きの絵画調。",
  "scenes": [
    {
      "type": "narration",
      "text": "天正10年6月2日。京都・本能寺に、\n織田信長はわずかな供回りだけで滞在していた。",
      "imagePrompt": "灯りのともる本能寺の一室。障子越しに人影がひとつ、静かに座している。"
    }
  ]
}
```

```bash
export OPENAI_API_KEY=sk-...
npm run assets -- src/scripts/history-honnoji.json

# 課金する前にプロンプトだけ見たいとき
npm run assets -- src/scripts/history-honnoji.json --dry-run
```

生成された画像は `public/photos/` に保存され、台本の `image` に書き戻される。
**「何を描くか」は `imagePrompt`、「どう描くか」は `imageStyle`** と分けるのがコツで、
画風を1箇所にまとめておかないとカットごとに絵柄がバラつく。

- 解像度は台本の `format` から自動で決まる（横型なら 1536×1024、縦型なら 1024×1536）
- ファイル名にプロンプトのハッシュが入るので、**プロンプトを直せば作り直され、直さなければ課金されない**
- `--force` で作り直し、`--only 3,5` で特定のカットだけ、`--quality high` で高品質
- 生成された画像には自動で Ken Burns 効果（寄り／パン）と微細な手ブレがかかる

## ナレーションを入れる

声を入れる効能は「喋ってくれること」だけではない。
**カットの尺が、文字数からの推定ではなく実際の音声の長さで決まるようになる。**
テロップと声がズレなくなるので、解説動画としての質が一段変わる。

シーンに `voiceText`（読み上げる文）を書いて生成する。

```json
{
  "voiceName": "onyx",
  "voiceInstructions": "落ち着いた低めの声で、ドキュメンタリーのナレーションのように。",
  "voiceSpeed": 1.0,
  "scenes": [
    {
      "type": "narration",
      "text": "天正10年6月2日。京都・本能寺に、\n織田信長はわずかな供回りだけで滞在していた。",
      "voiceText": "天正十年六月二日。京都、本能寺に、織田信長はわずかな供回りだけで滞在していた。"
    }
  ]
}
```

```bash
export OPENAI_API_KEY=sk-...
npm run voice -- src/scripts/history-honnoji.json

npm run voice -- src/scripts/history-honnoji.json --dry-run   # 読み上げる文の確認（無料）
```

`public/voice/` に保存され、台本の `voiceFile` と `voiceSeconds`（実測秒数）が
書き戻される。以降そのカットの尺は音声の長さで確定し、全体テンポ (`pace`) の
影響も受けない（声が途中で切れるのが一番みっともないため）。

- **画面の文字と `voiceText` は分けて書く。** 画面は短く、読みは自然な話し言葉に。
  数字は「10年」ではなく「十年」と書いた方が正しく読まれる
- 声: `alloy` `nova` `onyx` `sage` `coral` `echo` など
- ファイル名に文言・声・速度のハッシュが入るので、変えたときだけ作り直される
- `--force` で作り直し、`--only 3,5` で特定のカットだけ

## BGM を入れる

`public/bgm/` に音楽ファイルを置いて指定する。生成はしないので、
使用条件を自分で確認したものを置くこと。

```json
{ "bgm": "bgm/calm.mp3", "bgmVolume": 0.25, "bgmDuckVolume": 0.07 }
```

自動でやること:

- **ナレーション中は音量を下げる（ダッキング）** — 声にBGMを同じ音量で被せると
  一気に素人っぽくなる。声が始まる少し前から下げ、終わったら戻す
- 曲が動画より短ければループする
- 冒頭と末尾はフェードする

## 参考動画の雰囲気を真似する

真似したい動画があるときは、フレームを抜き出して Claude に見せるのが一番速い。

```bash
./tools/extract-frames.sh "https://www.youtube.com/watch?v=xxxx" refs/my-ref 40
```

個別フレームと、全フレームを1枚に並べた `contact-sheet.jpg` が出る。
これを Claude Code に読ませて「この雰囲気で台本を書いて」と頼む。
（`ffmpeg`、URL の場合は `yt-dlp` が必要）

## 素材を足す

`public/` に置いて、`public/` を除いたパスで指定する。

```
public/photos/kyoto.jpg  →  { "image": "photos/kyoto.jpg" }
public/bgm/calm.mp3      →  { "bgm": "bgm/calm.mp3" }
```

画像を指定したシーンには自動で Ken Burns 効果（寄り／パン）と微細な手ブレが
かかる。静止画でも「動いている」ように見せるため。

## 構成

```
src/
  Root.tsx          コンポジションの登録（尺と解像度はここで台本から計算）
  Storyboard.tsx    台本 → シーンの並べ方・繋ぎ方
  lib/
    schema.ts       台本のスキーマ（zod）。仕様の正はここ
    duration.ts     尺の自動計算
    layout.ts       画面サイズに応じた文字サイズ・安全領域
    text.ts         日本語テキストの分割と採寸
    timing.ts       イージングとバネのプリセット
    audio.ts        BGM の音量カーブ（ダッキング・フェード）
  theme/
    tokens.ts       パレット・解像度・安全領域
    fonts.ts        フォント（ローカルバンドル）
  components/       アニメーションの部品（キネティックタイポ、テロップ等）
  scenes/           シーン1種類につき1コンポーネント
  scripts/          台本 JSON
public/
  photos/    画像（手持ち素材と生成物）
  voice/     ナレーション音声（生成物）
  bgm/       BGM（手で置く）
tools/
  extract-frames.sh    参考動画からフレームを抽出
  generate-images.mjs  台本の imagePrompt から画像を生成
  generate-voice.mjs   台本の voiceText からナレーション音声を生成
```

## 演出を足すとき

1. `src/lib/schema.ts` にシーンを追加
2. `src/scenes/` にコンポーネントを追加
3. `src/Storyboard.tsx` の `SceneRouter` に登録
4. `src/lib/duration.ts` に尺の計算を追加

どれか忘れると型エラーになるようにしてある（`npx tsc --noEmit`）。

## つまずきやすいところ

- **文字がはみ出す** — 文字サイズは画面幅から自動で詰まるようになっているが、
  1行が極端に長いと小さくなりすぎる。`\n` で改行を入れる。
- **短いカットで文字が出切らない** — シーンの尺に合わせてアニメーション速度は
  自動で詰まる。それでも足りないなら `durationInSeconds` を伸ばす。
- **レンダリングが遅い** — `--concurrency` はコア数から自動で決まる。
  ただしソフトウェアGL環境ではむしろ 2 程度に下げた方が速いことがある。
- **声が途中で切れる** — 起きないはずだが、もし起きたら `voiceSeconds` が
  実ファイルとズレている。`npm run voice -- <台本> --force` で作り直す。
- **BGM がうるさい／小さい** — `bgmVolume`（通常時）と `bgmDuckVolume`
  （ナレーション中）は別々に調整する。
