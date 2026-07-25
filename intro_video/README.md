# Opus 5 自己紹介ショート動画

非エンジニア向けに「Opus 5 とは何か」を説明する縦型ショート動画を、Python + ffmpeg で生成します。

- 出力: `out/opus5_intro.mp4` (1080×1920 / 30fps / 40.0秒 / H.264 + 無音AACトラック / 約8MB)
- サムネイル: `out/opus5_intro_poster.jpg`
- 配色は Anthropic のブランドカラー(`#141413` / `#faf9f5` / `#d97757` / `#6a9bcc` / `#788c5d`)

無音です。音楽やナレーションは書き出し後に載せる前提で、内容は字幕だけで読み切れるように作っています。

## 構成(全7シーン / 40秒)

| # | 尺 | 内容 |
|---|-----|------|
| 1 | 4.0s | フック:「Opus 5 って、なに?」 |
| 2 | 5.8s | 自己紹介:なまえ・うまれ・しゅるい・正式名 `claude-opus-5` |
| 3 | 6.6s | できること3つ:読む・まとめる / 考える・調べる / つくる |
| 4 | 6.2s | 会える場所:チャット と Claude Code |
| 5 | 6.0s | なかま:Opus 5 / Sonnet 5 / Haiku 4.5 の使い分け |
| 6 | 6.2s | 正直なところ:得意・苦手・知識の範囲 |
| 7 | 5.2s | 締め + ワードマーク |

## 使い方

```bash
pip install pillow imageio-ffmpeg      # ffmpeg 同梱の静的バイナリが入る
./intro_video/fetch_fonts.sh           # フォント取得(初回のみ)
python3 intro_video/make_intro_video.py --out out/opus5_intro.mp4
```

主なオプション:

| オプション | 既定値 | 説明 |
|---|---|---|
| `--out` | `out/opus5_intro.mp4` | 出力先 |
| `--poster` | `out/opus5_intro_poster.jpg` | サムネイルの出力先 |
| `--fps` | `30` | フレームレート |
| `--crf` | `20` | 画質(小さいほど高画質・大容量) |

環境変数:

- `OPUS5_FONT_DIR` — フォント置き場を明示指定する(既定は `intro_video/fonts/`)
- `FFMPEG_BIN` — 使用する ffmpeg のパスを明示指定する

## 内容を変えるとき

各シーンは `scene_*()` 関数に 1 対 1 で対応しています。文言はその関数内の文字列を直接書き換えてください。
尺と縦位置の微調整は `SCENES` テーブル(`(尺, 描画関数, 縦オフセット)`)で行います。
縦オフセットは各シーンの内容を画面中央に揃えるための値で、次のコマンドで測り直せます。

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

- 日本語の折り返しは `wrap_text()` が担当。英数字は単語単位、日本語は 1 文字単位で折り、行頭に `。、」` などが来ないよう簡易的な禁則処理をしています。
- 背景のグローは同心円で描くとリング状の縞が出るため、ぼかしてから合成しています。加えて暗部の階調段差を隠すため、ごく薄いグレインを乗せています(強くすると H.264 のビットレートを大きく食うので `0.012` 程度)。
- SNS の一部プレイヤーは音声トラックのない動画を嫌うため、`anullsrc` で無音の AAC を付けています。
