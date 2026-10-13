# AI基本方針 解説アニメーション

東京エレクトロングループが2026年9月17日に制定した「AI基本方針」を、約2分37秒で追う解説動画です。
TELのWebサイトで使われている配色（シアン #00a9e0、グリーン #78be20、パープル #8031a7）と、白地に細い線で組むトーンに寄せています。
ロゴや公式素材は使っていません。内容は公開ページ https://www.tel.co.jp/sustainability/ai/ の記述だけをもとにしています。

完成品は `tel_ai_policy_explainer.mp4`（1920×1080、30fps、BGM付き）。

## 構成

| 時間 | シーン |
| --- | --- |
| 0:00 | オープニング（ウェハのモチーフとタイトル） |
| 0:07 | 基本理念 |
| 0:16 | AIの可能性とリスク |
| 0:28 | 適用範囲 |
| 0:37 | 11の原則を5つのまとまりで俯瞰 |
| 0:46 | 01 高い品質と価値創出 |
| 0:54 | 02〜05 守る（安全性・プライバシー・セキュリティ・人権と公平性） |
| 1:20 | 06 禁止対象のAI（ここだけ暗転） |
| 1:38 | 07〜09 信頼を築く（能力と限界・Human-in-the-loop・透明性） |
| 1:58 | 10 ステークホルダーエンゲージメント |
| 2:07 | 11 ガバナンス体制と年1回の見直しサイクル |
| 2:27 | クロージングと出典 |

## 作り直すとき

```bash
./setup_assets.sh                          # フォントと GSAP を assets/ に取得
node render.js preview 12 84.5 144.5       # 指定秒のコマを frames/ に PNG で確認
node render.js video video_noaudio.mp4     # 全編を書き出し（4並列）
python3 make_audio.py bgm.wav              # BGM と効果音を合成
ffmpeg -i video_noaudio.mp4 -i bgm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart tel_ai_policy_explainer.mp4
```

字幕は `index.html` の `CAPS`、章の表示は `CHAPS` にまとめてあります。文言やタイミングを変えるならそこを触るのが早いです。
アニメーションは GSAP のタイムラインを `window.seek(t)` で1コマずつ止めて撮っているので、何度書き出しても同じ映像になります。
