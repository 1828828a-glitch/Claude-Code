---
format: 1080x1920
duration: 31s
message: "8月の病害虫は、葉裏で見つければ間に合う"
arc: Hook → 犯人3種 → ハダニ → 病気は風通し → 見回り手順 → まとめ
audience: ベランダ・小さな庭で野菜や花を育てる家庭園芸者
mode: autonomous
music: none
---

## Frame 1 — Cover

- scene: soft-pink 地に「見るのは、葉の裏」が白抜きで立ち上がる
- duration: 5s
- transition_in: cut
- status: animated
- poster: 3s

シリーズ3本目。図鑑ではなく「どこを見るか」の話だと最初に宣言する。

Layout: Cover 処理。badge-pill「8月の園芸 ③」→ display 2行「見るのは、/ 葉の裏」→ subtitle
「8月の病害虫は、小さいうちに見つける」。オーナメント 6点。

Motion: badge drop-in → display 2行 0.12s stagger → subtitle fade+rise。

## Frame 2 — 真夏の常連3種

- scene: cream 地。白カード3枚が縦に積まれ、丸アイコンが色を変える
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

犯人を一望する密度フレーム。名前と居場所だけを持たせる。

Layout: Info Cards 処理（縦積み）。丸アイコンは coral / lavender / sky。
カードは「ハダニ — 葉裏・高温乾燥で増える」「アブラムシ / コナジラミ — 新芽と葉裏」
「ヨトウムシ — 夜行性、昼は株元に隠れる」。

Motion: ヘッドライン先行、カード 0.3s stagger で右から滑り込み、着地で軽い overshoot。

## Frame 3 — ハダニは乾燥が好き

- scene: cream 地の framed-header。turquoise のキャップに3つのドット箇条書き
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

いちばん多い相手を1枚で深掘りする。水やりの話と接続する beat。

Layout: Framed Section 処理。キャップ = turquoise「ハダニ」、bullet 3行
（葉裏に潜む / 葉の色が白くかすれる / 葉裏に水をかけて湿らせる）。右下にオーナメント。

Motion: カードが下から入り、キャップ→ボディの順。bullet 0.25s stagger。

## Frame 4 — 病気は風通しから

- scene: cream 地の framed-header。lavender のキャップに3つのドット箇条書き
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

害虫から病気へ切り替える beat。Frame 3 と対になる構造で入場方向を反転。

Layout: Framed Section 処理。キャップ = lavender「うどんこ病・炭疽病」、bullet 3行
（密植を避ける / 下葉をかいて風の道を作る / 病葉は早めに取り除いて持ち出す）。左上にオーナメント。

Motion: カードは左から。bullet 0.25s stagger。

## Frame 5 — 見回りは3か所

- scene: peach 地。90px の丸ステップが縦に3つ、下向き矢印でつながる
- duration: 5s
- transition_in: crossfade
- status: animated
- poster: 3s

抽象論を身体の動きに落とす。見る順番を持って帰らせる。

Layout: Process Steps 処理（縦積み）。coral → mint → sky の丸マーカー、
ラベルは「葉の裏」「新芽の先」「株元の土」。ヘッドラインは白 + text-shadow。

Motion: ヘッドライン先行、ステップ 0.35s stagger、矢印が間を伸びる。

## Frame 6 — Closing

- scene: turquoise 地に「週2回、葉の裏を見る。」
- duration: 4.5s
- transition_in: crossfade
- status: animated
- poster: 3s

習慣ひとつに集約して終わる。

Layout: Closing 処理。display 2行を白 + text-shadow、下に subtitle「それがいちばん効く対策」。
オーナメント 7点。

Motion: display 2行 0.15s stagger、subtitle 0.8s。最後の 1.5s は静止。

## Video direction

- 音声・BGM なし（`music: none` / SCRIPT.md なし）。
- 縦型 1080x1920。全フレーム `container-type: size` の ground に対して cqw で組む。
- Frame 3 と Frame 4 は同じ骨格・逆方向の入場で対にする。
- 農薬の商品名・希釈倍率は出さない。予防と早期発見に限定する。
- 虫の写実的な描写はしない。オーナメントと色面で持たせる。
