# Opus 5 自己紹介ショート動画

非エンジニア向けに「Opus 5 とは何か」を説明する縦型ショート動画を、Python + ffmpeg で生成します。
ナレーションと BGM も生成対象で、既製の音源やストック素材は使っていません。

| 出力 | 尺 | 内容 |
|---|---|---|
| `out/opus5_intro_voiced.mp4` | 1分8.8秒 | ナレーション + BGM 入り(本編) |
| `out/opus5_intro_silent.mp4` | 40.0秒 | 無音・字幕のみ(自分で音楽を載せたいとき用) |
| `out/opus5_intro_poster.jpg` | – | サムネイル |

- 1080×1920(9:16)/ 30fps / H.264 High / yuv420p / `+faststart`
- 配色は Anthropic のブランドカラー(`#141413` / `#faf9f5` / `#d97757` / `#6a9bcc` / `#788c5d`)

## 構成(全7シーン)

| # | 内容 |
|---|------|
| 1 | フック:「Opus 5 って、なに?」 |
| 2 | 自己紹介:なまえ・うまれ・しゅるい・正式名 `claude-opus-5` |
| 3 | できること3つ:読む・まとめる / 考える・調べる / つくる |
| 4 | 会える場所:チャット と Claude Code |
| 5 | なかま:Opus 5 / Sonnet 5 / Haiku 4.5 の使い分け |
| 6 | 正直なところ:得意・苦手・知識の範囲 |
| 7 | 締め + ワードマーク |

各シーンの尺は、ナレーションの長さから自動的に決まります(`min_dur` を下限とする)。

## 使い方

```bash
pip install pillow numpy imageio-ffmpeg pyopenjtalk   # ffmpeg 同梱の静的バイナリが入る
./intro_video/fetch_fonts.sh                          # フォント取得(初回のみ)

# 1) 音声を作る(同時に、映像を合わせるための timing JSON が出る)
python3 intro_video/make_audio.py --out out/opus5_audio.wav --timing out/opus5_timing.json

# 2) 映像を音声に合わせて書き出す
python3 intro_video/make_intro_video.py \
    --timing out/opus5_timing.json --audio out/opus5_audio.wav \
    --out out/opus5_intro_voiced.mp4 --poster out/opus5_intro_poster.jpg

# 無音版が欲しいときは --timing / --audio を付けずに実行する
python3 intro_video/make_intro_video.py --out out/opus5_intro_silent.mp4
```

`pyopenjtalk` は初回実行時に辞書(約23MB)をダウンロードします。

### make_audio.py の主なオプション

| オプション | 既定値 | 説明 |
|---|---|---|
| `--voice-peak` | `0.90` | ナレーションのピーク。歪ませないため 1.0 未満にしている |
| `--bgm-below-db` | `12.0` | BGM を声より何 dB 下げるか |
| `--duck-db` | `9.0` | 声が乗っている間に BGM をさらに下げる量 |

レベルを「固定倍率」ではなく声を基準にした相対 dB で決めているのは、合成 BGM の素の振幅が
音色構成で大きく変わるためです。倍率指定だと簡単に BGM が声を食います。

### make_intro_video.py の主なオプション

| オプション | 既定値 | 説明 |
|---|---|---|
| `--timing` | なし | `make_audio.py` が出した JSON。尺とセリフのタイミングを同期させる |
| `--audio` | なし | 多重化する音声。省略時は無音の AAC トラックだけ付く |
| `--fps` | `30` | フレームレート |
| `--crf` | `20` | 画質(小さいほど高画質・大容量) |

環境変数 `OPUS5_FONT_DIR` でフォント置き場、`FFMPEG_BIN` で ffmpeg のパスを指定できます。

## 音と映像の同期のしくみ

`make_audio.py` は台本の 1 文ごとに音声を合成し、「その文がシーン開始から何秒後に始まるか」を
**キュー**として JSON に書き出します。`make_intro_video.py` 側では各シーンの描画関数が
`cue(n, fallback)` を通してこの値を読み、n 番目のセリフに合わせて要素を出します。

たとえば「なかま」のシーンでは、「じっくり考えるオーパス」と読み上げた瞬間に Opus 5 のカードが、
「バランスのいいソネット」で Sonnet 5 のカードが出ます。`--timing` を渡さない無音版では
`fallback`(台本なしのタイミング)が使われるため、同じコードがそのまま動きます。

## 内容を変えるとき

- **字幕・レイアウト**: `make_intro_video.py` の `scene_*()` 関数。1 シーン 1 関数。
- **ナレーション原稿**: `make_audio.py` の `NARRATION`。`lines` の 1 要素が 1 キューになるので、
  行を増減させたら映像側の `cue(n, ...)` の番号も合わせる。
- **英語の固有名詞はカタカナで書く**。Open JTalk は `Opus 5` を「オーピーユーエス ゴ」と
  一字ずつ読むため、原稿では「オーパス・ファイブ」と書いている(字幕は英字のまま)。
- **BGM**: `PROGRESSION`(コード進行)と `BPM`、`build_bgm()` の各パート。

縦位置は `SCENES` テーブルの第3要素で微調整します。測り直しは次のコマンドで:

```bash
python3 - <<'PY'
import sys; sys.path.insert(0, 'intro_video')
from make_intro_video import *
from PIL import Image
for i, (dur, fn, off) in enumerate(SCENES):
    sub = Frame(Image.new('RGBA', (W, H), (0, 0, 0, 0)))
    fn(sub, dur - 0.6)
    bb = sub.layer.getbbox()
    print(f'S{i+1} {fn.__name__:14s} center={(bb[1]+bb[3])//2 + off}')
PY
```

## 実装メモ

- 日本語の折り返しは `wrap_text()`。英数字は単語単位、日本語は 1 文字単位で折り、行頭に
  `。、」` などが来ないよう簡易的な禁則処理をしています。
- 背景のグローは同心円で描くとリング状の縞が出るため、ぼかしてから合成。加えて暗部の階調段差を
  隠すためごく薄いグレインを乗せています(強くすると H.264 のビットレートを大きく食うので `0.012`)。
- BGM はサイン波の加算合成のみ。リバーブは指数減衰ノイズを IR とした FFT 畳み込み、フィルタも
  FFT のゼロ位相型です(音楽用途なら位相のズレは問題になりません)。
- ナレーションには軽いコンプレッサー(閾値 `0.075` / レシオ `2.5`)をかけて実効レベルを約 3dB
  持ち上げています。リミッターは `tanh` ではなく素直なピーク合わせ — `tanh` は声の波形を潰すため。
- BGM は声のエンベロープでダッキングしています(0.09 秒の先読みつき)。

## クレジット / ライセンス

生成物に含まれる第三者の素材は音声モデルのみです。

- **HTS Voice "Mei"** — Copyright (c) 2009-2013 Nagoya Institute of Technology,
  released by MMDAgent Project Team ([mmdagent.jp](http://www.mmdagent.jp/)).
  Licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/).
  → 帰属表示の義務があるため、ナレーション版の末尾に出典を表示しています。
- Open JTalk / pyopenjtalk(修正 BSD)、Noto Sans JP・Poppins(SIL OFL 1.1)。
- BGM はこのリポジトリのコードによる完全な生成物で、既製曲は使っていません。
