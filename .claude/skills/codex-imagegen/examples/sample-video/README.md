# サンプル動画

B-roll を生成してから 1 本の mp4 になるまでを、そのまま動かせる形にしたもの。
約 19 秒 / 5 シーンの縦横 1920x1080。

```
broll.json  ──gen_broll.py──>  assets/broll/*.png
                                      │
script.json ──────────────────── make_video.py ──> sample.mp4
```

## 動かす

```bash
cd .claude/skills/codex-imagegen/examples/sample-video

# 1. B-roll を生成（Codex CLI が必要。5 枚で数分かかる）
python3 ../../scripts/gen_broll.py broll.json

# 2. mp4 に組み立てる（ffmpeg が必要。20 秒ほど）
python3 make_video.py script.json -o sample.mp4
```

Codex がまだ使えないときは、1 を次に置き換えるとダミー素材で最後まで通せる。
尺やテロップの当たりを取るのに使う。

```bash
python3 placeholder_broll.py broll.json      # 要 Pillow
```

## ファイル

| ファイル | 役割 |
|---|---|
| `broll.json` | どんな絵を出すか。gen_broll.py に渡す |
| `script.json` | どの絵に何秒どのテロップを乗せるか。make_video.py に渡す |
| `make_video.py` | 画像 → Ken Burns + テロップ + クロスフェード → mp4 |
| `placeholder_broll.py` | Codex なしで動作確認するためのダミー画像生成 |

`assets/broll/*.png` と `sample.mp4` は生成物なので Git 管理していない。上のコマンドで作り直せる。

## script.json の書き方

```json
{
  "resolution": "1920x1080",
  "fps": 30,
  "broll_dir": "assets/broll",
  "transition": 0.6,
  "scenes": [
    { "id": "s01", "style": "title", "telop": "1行目\n2行目", "duration": 3.5 }
  ]
}
```

- `id` は `broll_dir/<id>.png` に対応する。`broll.json` の `id` と揃える
- `style` は `title`（画面中央・大きめ）か省略（画面下・通常サイズ）
- `telop` の `\n` で改行。テロップ無しにしたいシーンは `telop` を書かない
- `transition` はクロスフェードの秒数。`0` にすると切り替えがカットになる
- 完成尺 = 各 `duration` の合計 − `transition` × (シーン数 − 1)

## 作り込むときの勘所

- **B-roll 側に文字を入れない。** テロップと必ずぶつかる。`broll.json` の `style` に
  「文字やロゴを一切入れない」を入れてある
- **画面下半分は空けておく。** 同じく `style` で「画面下半分は暗めでテロップが乗る余白を残す」
  と指示している。ここが明るいとテロップが沈む
- **1 シーン 4〜5 秒。** これより短いとズームが効かず、長いと静止画だとバレる
- **ズームは寄りと引きを交互に。** `make_video.py` がシーンの偶奇で自動的に切り替える

## BGM を付ける

```bash
python3 make_video.py script.json -o sample.mp4 --bgm path/to/bgm.m4a
```

末尾 2 秒でフェードアウトする。`--bgm` を指定しない場合も無音の音声トラックは入る
（音声トラックが無い mp4 を再生できないプレイヤーがあるため）。

## ナレーションを足したい場合

このサンプルはテロップだけで音声合成は含まない。VOICEVOX などでシーンごとの wav を作り、
`duration` をその長さに合わせてから `--bgm` の代わりに音声として重ねる、という拡張になる。
AKARI Video を使うなら、その工程は本体側のスキルが持っている。
