# ナレーション原稿（72秒・シーン対応・最終版）

| # | 開始 | 尺 | 原稿 |
|---|------|-----|------|
| 1 | 0:01.0 | 4.9秒 | もし、トップパフォーマーの脳を、そのままコピーできたら。 |
| 2 | 0:07.3 | 8.1秒 | アドタンクGPは、世界で初めて脳の転写に成功。デジブレ、特許出願中。 |
| 3 | 0:16.0 | 8.0秒 | デジブレは、提案書・分析・戦略そのものを、トップパフォーマー品質で出力します。 |
| 4 | 0:24.9 | 8.0秒 | 脳科学・医学の専門家と確立した、独自の暗黙知抽出と、AI翻訳技術。 |
| 5 | 0:33.8 | 6.0秒 | 各領域のトップパフォーマー、約40名の脳を、すでにコピー済み。 |
| 6 | 0:42.6 | 19.0秒 | 採用診断サービス、アドターン・フォー・エイチアール。現状診断、競合ポジショニング分析、ターゲットの再定義、採用ファネル設計、トークスクリプト、そして具体的な提言まで。戦略レポートそのものを、出力します。（rate +6%） |
| 7 | 1:03.4 | 7.8秒 | トップパフォーマーの脳を、武器に。アドターン・フォー・エイチアール。デモはブースで。（rate +8%） |

- 音声: edge-tts `ja-JP-NanamiNeural`（rate +4%）
- 「ADTANK」「ADTURN for HR」はTTSの読み誤り防止のため「アドタンク」「アドターン・フォー・エイチアール」表記で合成

## ファイル・再生成手順

```bash
# ナレーション（narr1.mp3 〜 narr7.mp3）
python3 -m edge_tts --voice ja-JP-NanamiNeural --rate "+4%" \
  --text "（上表の原稿）" --write-media narrN.mp3

# BGM（bgm.wav → bgm.mp3）
python3 bgm_synth.py

# ナレーションを開始時刻どおりに1本化（narration.wav）
# → adelay 1000 / 7300 / 16000 / 24900 / 33800 / 42600 / 63400 ms で amix

# BGMをナレーションでダッキングして最終ミックス（mix.wav）
# → sidechaincompress (threshold=0.015, ratio=5) 後に amix

# Canvas版MP4への合成
ffmpeg -i adturn-hr-expo-72s.mp4 -i audio/mix.wav \
  -c:v copy -c:a aac -b:a 192k -shortest adturn-hr-expo-72s-with-audio.mp4
```

Remotion版は `remotion/public/` の `bgm.mp3`・`narration.mp3` を
`DigibureExpo.tsx` の `<Audio>` で読み込んでレンダリング時に合成します。
