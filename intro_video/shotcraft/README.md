# shotcraft 版 — video-shotcraft で作り直す Opus 5 紹介動画

`intro_video/` の自作版(Pillow + ffmpeg)とは別系統。
[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) のショットレシピカードを
使って、Remotion で映画的なモーションに作り替える試み。

制作モードは **自主自由創作**、画面比は **横型を先に作って縦型へリパック**。
判断の記録と分鏡は [DESIGN-SPEC.md](DESIGN-SPEC.md) にある。

## 現状

| Stage | 状態 |
|---|---|
| 0 製品ブリーフ・決定表 | 完了(DESIGN-SPEC.md) |
| 1 視覚方向・styleframe | 完了(`styleframe/` の3枚を検証済み) |
| 2 要素→ショット割り当て | 完了(12ショット、106枚から選定) |
| 3 分鏡・帧級タイムライン | 完了(`remotion/src/timeline.ts`) |
| 4 素材採集 | 完了(実ターミナル出力を `remotion/public/textures/`) |
| 5 逐ショット実装 | **1/12 のみカード忠実**。残り11は `Pending` の暫定表示 |
| 6 音設計(BGM/SFX) | 未着手。ナレーションのみ結線済み |
| 5b 縦型リパック | 未着手(composition は登録済み) |
| 7 独立終検 | 未着手 |

**この時点では成片としては未完成。** 端から端まで再生はできるが、11ショットは
カードを適用していない暫定表示なので、見た目の質は `intro_video/` の自作版に劣る。
現在の配布物は引き続き `out/opus5_intro_voiced.mp4`(自作版)。

### 実装済みショット

| # | shot | card | 備考 |
|---|---|---|---|
| 1 | `brandOpen` | `brand-ink-open` | 参考実装 `template/src/aifl/live/SceneOpen.tsx` 帧0–83 を読んで移植 |

### 残りの実装手順(1ショットあたり)

pipeline 阶段5 の硬規則。飛ばすと調校の蓄積を捨てることになる。

1. `gallery/api/library.json` で卡名と `style-key` を検証する
2. `references/shots/<card>.md` を**全文**読む
3. カードの「参考实现」欄が指す demo TSX を**全文**読む(これが調校済みパラメータの真相)
4. 必要なら `assets/lib/` のコンポーネントをコピーして持ち込む(import しない)
5. 実装する。カードの「已知坑/命門」のパラメータは降格させない
6. `npx remotion still` で検収フレーム2枚を出して目視確認(`out/qa/` に保存)
7. 整片を再渲染して接縫を確認

## 使い方

```bash
cd intro_video/shotcraft/remotion
npm install
npm run setup          # public/fonts/ にフォントを配置(先に ../../fetch_fonts.sh)

# ナレーション(BGM/SFX なし)を public/audio/ に出す
python3 ../../make_audio.py --out /tmp/mix.wav --timing ../../../out/opus5_timing.json \
    --voice-out public/audio/narration.wav

npm run dev            # Remotion Studio
npm run render         # 横型 1920x1080 → out/promo.mp4
npm run render:v       # 縦型 1080x1920 → out/promo-vertical.mp4
```

素材を撮り直すとき:

```bash
node ../capture/capture.mjs   # 実ターミナル出力を取り直して 2x で撮る
```

## 構成

```
shotcraft/
├── DESIGN-SPEC.md          # Stage 0-3 の判断記録・分鏡・検収フレーム表
├── styleframe/             # Stage 1。HTML/CSS の静止キーフレームと撮影スクリプト
├── capture/                # Stage 4。実ターミナル出力の採集(playwright)
└── remotion/
    ├── src/timeline.ts     # 帧級タイムライン。SHOTS の from が唯一の基準
    ├── src/tokens.ts       # 色・字・動效トークン(全ショット共通、混用禁止)
    ├── src/Main.tsx        # ショットの合成とナレーション結線
    └── src/shots/          # 1ショット1ファイル
```

## 注意

- **確定性渲染**: `Math.random()` / `Date.now()` は使わない。擬似乱数は `tokens.ts` の
  `mulberry32` に index 由来の seed を渡す。渲染間で1フレームも揺れないこと。
- **タイムラインを動かしたら**: `timeline.ts` の `SHOT_LIST` だけを直す。SFX 钉帧表は
  `SHOTS.<id>.from + offset` の相対式で書くこと(裸のフレーム番号は書かない)。
- Remotion は独自ライセンス。個人・小規模チームは無料、企業は有料の場合がある。
- ナレーション音声は HTS音声 "Mei"(CC BY 3.0、**帰属表示義務**)。成片の末尾に出典を出す。
