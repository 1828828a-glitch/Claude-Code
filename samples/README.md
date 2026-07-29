# samples

`/watch` スキル（`.claude/skills/watch/`）の動作確認用サンプル。

## サンプル動画を生成する

```bash
bash samples/build_sample_video.sh sample-demo.mp4
```

`ffmpeg` だけで 39秒 / 1280x720 / 約 640KB の動画を組み立てる。ネットワーク不要。
生成物は git 管理外（`.gitignore` 済み）なので、必要なときに作り直す。

## 動画の構成

6シーンを連結したもので、それぞれ `/watch` の別の挙動を突くようにしてある。

| 時刻 | シーン | 確認できること |
|------|--------|----------------|
| 0:00 | タイトルカード | 日本語テキストの読み取り |
| 0:06 | スライド（箇条書きが 1 秒おきに追加される） | 静止フレームの dedup |
| 0:13 | ターミナル風の出力 | 512px 幅で等幅の小さい文字が読めるか |
| 0:20 | **0:22 に赤い `ERROR 429` が出る** | 「不具合の瞬間」を特定できるか |
| 0:26 | 伸びる棒グラフ | 動きのあるシーン |
| 0:33 | まとめカード | — |

## 試し方

フルスキャン:

```bash
python3 .claude/skills/watch/scripts/watch.py sample-demo.mp4 --no-whisper
```

エラーの瞬間だけを高密度で:

```bash
python3 .claude/skills/watch/scripts/watch.py sample-demo.mp4 --no-whisper --start 0:20 --end 0:26
```

`--no-whisper` を付けているのは、この動画に音声トラックはあっても内容が
サイン波（意味のある発話ではない）で、字幕もないため。Whisper に投げても
得るものがないので明示的に切っている。

### 実測（参考）

フルスキャン: 39秒から 9 フレーム。31 フレームが近似重複として落ちる。

```
Frames: 9 selected from 5 candidates
        (31 near-duplicates dropped, full range, budget 40, cap 100)
```

区間指定 `--start 0:20 --end 0:26`: 状態が変わった 2 枚だけが残る。

```
Frames: 2 selected (10 near-duplicates dropped, focused range, budget 12)
        t=00:20 (エラー前) / t=00:22 (エラー発生)
```

## 依存

- `ffmpeg` / `ffprobe`
- 日本語フォント `/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf`
  （Debian/Ubuntu なら `apt-get install fonts-ipafont-gothic`）。
  別のフォントを使う場合はスクリプト冒頭の `FONT` を差し替える。
