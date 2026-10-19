# 効果音の差し替え

Web版の効果音は `src/sound.js` が Web Audio でその場で作っている。このフォルダに同じ名前の音声ファイルを置いて `build.py` を実行し直すと、その音に差し替わる。置かなかった音は作った音のまま鳴る。

| ファイル名 | 鳴る場面 | 長さの目安 |
| --- | --- | --- |
| `debayashi` | 今日の10分・パイロット・型の練習を始めたとき（出囃子） | 3〜5秒 |
| `mekuri` | 新しい問題のめくりが落ちてきたとき | 0.4秒 |
| `hyoshigi` | 回答を送ったとき、効果音をオンにしたとき（拍子木） | 0.3秒 |
| `harisen` | M07 ツッコミ設計で回答を送ったとき | 0.3秒 |
| `taiko` | 結果の得点率が5割未満のとき | 0.6秒 |
| `dodon` | 結果の得点率が5割以上のとき | 0.8秒 |
| `applause` | 結果の得点率が8割以上のとき（`dodon` に続けて） | 2秒 |
| `kane` | 30秒チャレンジの時間切れ（鉦） | 0.5秒 |
| `tick` | 30秒チャレンジの残り5秒から1秒ごと | 0.1秒 |

拡張子は `.wav` `.ogg` `.mp3` `.flac` `.m4a` のどれでもよい。Safari は OGG を読めないことがあるので、WAV か MP3 にしておくと確実。読めなかったファイルは作った音で鳴る。

音声はページに埋め込むので、ページ全体で 16MB を超えないよう、モノラルにして前後の無音を切っておく。ビルドの出力に `sound: harisen.wav 41234 bytes` のような行が出れば埋め込まれている。

## Audio Studio で作る

[Audio Studio MCP](https://github.com/kanaworksai-hue/audio-studio-mcp)（Stable Audio 3 を手元で動かす MCP サーバー。Apple シリコンの Mac か NVIDIA GPU の Windows で動く）を登録した Claude Code に、こう頼むのが早い。

> furiochi_lab/web/sounds/README.md の表の音を Audio Studio で作って。1つにつき3候補作ってから選び、モノラル・無音カット・ピーク -1 dB の WAV にして、このフォルダに表の名前で保存して

プロンプトは Stable Audio 3 の公式ガイドの形（英語、効果音は source・action・material・space の4項目）にしてある。

| ファイル名 | audio_type | 秒数 | プロンプト |
| --- | --- | --- | --- |
| `debayashi` | music（bpm 150） | 5 | Short Japanese yose theater entrance cue with bright shamisen strums in a miyako-bushi scale, shime-daiko and taiko hits, small atarigane bell accents, lively festive mood, ending on one strong final hit. |
| `mekuri` | sfx | 1 | source: large sheet of thick washi paper / action: flipped over quickly and slapping down onto a wooden board / material: crisp dry paper, light wood tap / space: small indoor stage, close-up, dry |
| `hyoshigi` | sfx | 1 | source: hyoshigi, a pair of Japanese hardwood clappers / action: struck together once, sharp clack / material: dense oak, bright ringing transient / space: small theater, short natural reverb |
| `harisen` | sfx | 1 | source: harisen, a large folded paper fan / action: slapped hard on a head, comedic smack / material: stiff layered paper, crisp crack with paper rattle / space: indoor stage, close-up, dry |
| `taiko` | sfx | 2 | source: Japanese taiko drum / action: single strong hit in the center / material: cowhide skin, deep boom / space: small wooden hall, short reverb |
| `dodon` | sfx | 2 | source: Japanese taiko drum / action: two quick hits, the second one stronger / material: cowhide skin, deep boom / space: small wooden hall, short reverb |
| `applause` | sfx | 3 | source: small theater audience of about thirty people / action: warm applause swelling and then fading out / material: hand claps / space: indoor theater, natural room reverb |
| `kane` | sfx | 1 | source: atarigane, a small hand-held brass gong / action: struck once with a deer-horn mallet / material: bright brass, metallic ring / space: small theater, close-up |
| `tick` | sfx | 1 | source: small wooden block / action: tapped once lightly / material: hardwood, short dry click / space: close-up, dry |

Stable Audio 3 で作った音には Stability AI Community License が適用される。年間収益が100万米ドル未満の個人・団体なら商用でも無料で使える。
