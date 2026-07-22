---
name: adturn-style-build
description: ADTURN展示会動画(2分39秒)の新スタイル版をRemotionで制作するワークフロー。「〇〇スタイルで作って」「スタイル△のフル版を実装して」等、adturn-hr-exhibition-video配下の動画スタイル制作を頼まれたら必ずこのスキルを使う。台本・尺・ナレーションは固定で見せ方だけを変える。
---

# ADTURN スタイル制作ワークフロー

## 動画は2系統ある(まず判別する)
- **展示会用(2分39秒)**: ADTURN/デジブレという製品を売る動画。台本固定。この下の手順に従う
- **レポート紹介用(約90秒)**: 出力レポートそのものを、レポート対象企業に見せる個社向け動画。`docs/style-prompts/04_レポート紹介動画.md` を読み、`remotion/src/report/reportConfig.ts` と `public/report/` の紙面PNGを差し替えて `AdturnReport` をレンダリングする(コード変更ほぼ不要)

## 前提知識(必読)
1. `adturn-hr-exhibition-video/docs/style-prompts/00_共通仕様.md` — 台本全文・15シーン構成・ナレーションキュー表・品質チェックリスト。**ここに書かれた尺(4775f/30fps)・台本・キューは変更禁止**(展示会用のみ)
2. スタイル個別仕様は `docs/style-prompts/01〜03_*.md`(新スタイルの場合はユーザーの指示に従う)
3. 実装の参考実装: `remotion/src/kinetic/KineticVideo.tsx`(2Dのみ・最速) / `remotion/src/vaience/VaienceVideo.tsx`(S1のみ3D) / `remotion/src/natgeo/NatGeoVideo.tsx`(全編クローム重ね)

## 手順

### 1. デモから作る(いきなりフルを作らない)
- 600f(20秒)のデモComposition(techシーン相当: 宣言→頭がパカーン→脳の取り出し)を先に作る
- ユーザー確認前でも静止画検証は必須

### 2. 実装ルール
- 作業ディレクトリ: `adturn-hr-exhibition-video/remotion/`
- タイムライン: `theme.ts` の `V3D_SCENES` / `V3D_TOTAL_FRAMES` を使用。`Video.tsx` のNARRATION表をコピーして流用
- **Sequence内の `useCurrentFrame()` はローカルフレーム(0始まり)**。演出タイミングを絶対フレームで書くと表示されないバグになる(前科あり)
- 3D頭部を使う場合: `scenes/Head3D.tsx` の `useHeadGeometry` をThreeCanvasの**外**で呼ぶ。フタ開きのクリッピング平面はフタのワールド変換に毎フレーム追従(`LuxDemo.tsx` のLuxHead参照)。開き切ったらフタはフェードアウト
- 脳: `scenes/BrainGeo.ts`(手続き型3D脳、colorful引数あり)
- BGM: `scripts/gen_bgm_full4.py` 方式でnumpy合成、165秒。問い区間(23.8-56.3s/90.7-109.2s)は静め、リフト区間(56-72/126.5-140/148-165s)は上げる。コンポーネント側でもduckWinでダッキング

### 3. 検証(必須)
- `npx tsc --noEmit`
- 全ビート網羅の静止画: `npx remotion still src/index.ts <Comp> out/stills/x.png --frame=N`
- 確認は560px縮小JPEG経由(`ffmpeg -vf scale=560:-1`)。フルサイズPNGを直接Readしない(リクエスト上限)
- 音声はレンダリング後にキュー位置のRMSで確認

### 4. レンダリングと納品
- `npx remotion render src/index.ts <Comp> out/xxx.mp4`(バックグラウンド実行、2Dのみ約10分/3D入り20-40分)
- 30MiB超は `-crf 23 -c:a copy` で再エンコード
- BGMなし版: `out/narration_only.m4a`(なければ00_共通仕様のキュー表からadelay+amixで生成)を `-map 0:v -map 1:a -c:v copy` で差し替え(再レンダリング不要)
- 完了ごとにSendUserFileで納品(display: render)

### 5. Git
- ブランチ `claude/adturn-hr-exhibition-video-r3adrq` にコミット・プッシュ(out/ はgitignore済み)
