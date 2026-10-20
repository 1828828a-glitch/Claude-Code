---
name: ai-video-quality
description: AI動画生成（Veo / Kling / Seedance / MiniMax / Grok Imagine など）で縦型ショート・広告・ドラマ動画を作るときに、企画→プレビズ→カット別プロンプト→生成→監督審査→音響→ffmpeg仕上げ→振り返りまでを一貫した品質基準で回すためのワークフロー。「AIで動画を作りたい」「生成動画のクオリティを上げたい」「TikTok/リール用の実写調・アニメ調動画」「カットがバラバラ・人物が変わる・文字が出る」などの依頼で使う。
---

# AI動画クオリティ・ワークフロー

差がつくのは「モデル」より「情報量 × ハーネス」。参照画像・ルック固定・審査基準という“ハーネス”を先に作り、モデルにはそれを守らせる。

## 0. 起動時のヒアリング（1問ずつ、選択肢付きで）
1. 縦/横、尺（TikTokなら15〜60秒、広告ドラマは40〜45秒が目安）
2. 構成の型（例：フック→本編→回想→オチ／Vlog時系列）と参考動画の有無
3. 画面内テキスト（字幕・ロゴ・PR表記）の可否 ← 「ゼロ」なら全プロンプトにネガティブ指定を入れる
4. 音声：ナレーション（TTS）/ 生成音声 / BGM / 効果音
5. 使える生成サービスと残クレジット（1カットあたりの消費も確認）
決まったら一覧で確認し、OKが出てから作る。

## 1. 監督として最初に言語化する
`brief.md` に書く：
- 狙い（何を感じさせて終わるか）／見る人／見終わった後に残したい一言
- 全体設計：構成、緩急、見せ場、色と光の方針、カメラ方針
- ルールの宣言：似たカットを続けない、平板な絵を許さない

## 2. プレビズ（全尺の編集設計）を先に作る
音楽・ナレーション尺がある場合はそれを先に確定させ、尺に合わせて設計する。
1. ナレーション/BGMを先に用意 → 各行の秒数を測る（`ffprobe`）
2. `shotlist.csv` を作る：`shot_id, 秒数, 構成上の役割, 被写体, 演技, 小道具, カメラ, 光, 音, 参照画像, 共用可否`
3. アングルの切り替えと音楽の山に合わせたメリハリを入れる（Claudeは編集リズム設計が得意。7割をClaude案ベースに人が整える前提）
4. プレビズの段階で何度でもリテイクする（生成前に直す方が安い）
5. 複数パターン制作時は、回想・インサート等の共用カットに印を付け、生成数を減らす

## 3. 一貫性のハーネス（生成前に作る）
- キャラクター参照画像：人物ごとに1枚（正面・自然光・無地背景・衣装確定）。全カットで同じ画像を参照に入れる
- ルック参照画像：トーン/色/光の参照を1枚（例：「水の形状」と「トーン」の2枚で回した事例あり）
- ルック宣言文を固定し、全プロンプトの末尾に同じ文をそのまま付ける
  例：`Photorealistic Japanese live-action drama, natural window light, soft film grain, 35mm lens, warm muted palette, vertical 9:16.`
- 参照画像に対応するモデル/モードを確認（例：Veo 3.1 は Quality が参照画像非対応で Fast + Ingredients を使った）

## 4. カット別プロンプト・テンプレ
```
[SHOT {id} / {秒}s / 9:16]
Subject: {誰が・年齢・服装（参照画像と一致させる）}
Action & acting intensity: {動作}。演技の強さを数値と動詞で：{例: abruptly snatches the bento with an irritated frown, does not look at mother, intensity 8/10}
Props (exact): {小道具を色・形・素材まで具体的に。例: red octopus-shaped Japanese wiener sausage (tako-san wiener) visibly sticking out of the onigiri — NOT salmon, NOT flakes}
Camera: {ショットサイズ, レンズ, 動き。例: handheld medium close-up, slow push-in}
Light & mood: {光源, 時間帯, 色}
Sound (if model generates audio): {環境音のみ / no dialogue}
Look: {固定ルック宣言文}
Negative: no text, no subtitles, no captions, no signage with letters, plain unlabeled lanterns, no logos, no watermark, no on-screen UI
```
コツ：
- 演技は形容詞でなく「具体的な動作＋強度」で書く（穏やかに流れやすい）
- 誤認されやすい小道具は「何であるか」と「何ではないか」を両方書く
- 背景の看板・提灯・張り紙・パッケージは文字が出やすい → 無地指定、または画角で外す
- 1カット1アクション。8秒枠に詰め込みすぎない

## 5. モデルの使い分け（2026-10時点の観察。随時更新）
- 実写ドラマ・人物一貫性：Veo 3.1（参照画像あり）が安定
- 形状・動きの柔軟なコントロール、プレビズ追従：Kling（プロンプトで形状指定が効く）
- アニメ調：Seedance 2.5 / MiniMax H3 / Wan 3.0 が Grok Imagine より上という評価。MCP等で役割ごとに使い分ける
- 3D背景・セット：Gemini 4 Argon に Three.js で世界を作らせる手もある
- モーショングラフィック・文字アニメ：Remotion / HyperFrames（文字なし要件の案件では使わない）
- 予算管理：1カットの消費クレジット × 想定カット数 × リテイク係数1.5 で見積もってから生成開始

## 6. 監督審査（生成のたびに）
作業者ではなく監督の目で、カットごとに `review.md` に記録：
- [ ] 意図（そのカットの役割）が一目で伝わるか
- [ ] 演技の強さは設計どおりか
- [ ] 人物の顔・髪・服が参照画像と一致しているか（前後カットと並べて確認）
- [ ] 小道具は正しく認識できるか
- [ ] 画面内に文字・ロゴ・透かしが無いか（1秒ごとにフレームを抜いて確認）
- [ ] 手指・食べ物・液体の破綻が無いか
- [ ] 前後カットとアングル・サイズが被っていないか
不合格は理由を一文で書き、「プロンプト修正でリテイク」か「設計を変更」かを決める。

フレーム確認コマンド：
```bash
ffmpeg -i shot.mp4 -vf "fps=1,scale=240:-1,tile=8x1" sheet.jpg
```

## 7. 音
- ナレーション：日本語は Fish Audio が自然という評価（ElevenLabs は日本語がカタコトになりやすい）。無料枠/無料TTSは商用可否を必ず確認し、納品前に明記
- 声の設計：年齢感・トーン・話し方を文章で指定して作る（Prompt-to-voice系）
- 効果音は場面ごとに4要素で書く：①何が鳴るか ②どう鳴るか ③質感 ④場所（距離・響き）。例：「味噌汁の鍋が吹きこぼれる／ジュワッと急に強く／泡立つ水音、高音控えめ／近い、狭いキッチン」
- 候補を複数（4つ）生成し、映像と同期再生できる比較ページを作って聴き比べて選ぶ（ローカル生成OSS：Audio Studio MCP）
- BGMはナレーションの下で -18〜-22 dB 目安、ナレーション区間はダッキング

## 8. 仕上げ（ffmpeg）
```bash
# 解像度・fps統一してから結合
for f in shots/*.mp4; do ffmpeg -y -i "$f" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" -c:v libx264 -crf 18 -an "norm/$(basename $f)"; done
printf "file '%s'\n" norm/*.mp4 > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -c copy video.mp4
# ナレ + BGM（ダッキング）
ffmpeg -y -i video.mp4 -i narration.wav -i bgm.mp3 -filter_complex \
 "[2:a]volume=0.25[b];[b][1:a]sidechaincompress=threshold=0.05:ratio=8[bd];[bd][1:a]amix=inputs=2:duration=first[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest final.mp4
```
機械チェック（必ず実行）：`scripts/check_video.sh final.mp4` — 尺・解像度・音声トラック有無・無音区間・黒フレームを確認。

## 9. 振り返りでこのSkillを更新する
制作が終わったら：
1. 何度リテイクしたか、原因（演技/小道具/文字/一貫性/尺）を集計
2. 効いたプロンプトの言い回しを §4 のコツに追記、効かなかったものは削除
3. モデルの観察を §5 に日付付きで更新
4. 不要・過剰になった手順は削る

出典と元投稿は `references/sources.md`。
