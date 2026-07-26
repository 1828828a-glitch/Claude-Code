---
format: 1080x1920
duration: 31s
message: "8月は秋冬野菜のスタートライン"
arc: Hook → カレンダー → 上旬〜中旬 → 下旬 → 発芽のコツ → まとめ
audience: ベランダ・小さな庭で野菜を育てる家庭園芸者
mode: autonomous
music: none
---

## Frame 1 — Cover

- scene: mint 地に「8月は秋冬野菜のスタートライン」が白抜きで立ち上がる
- duration: 5s
- transition_in: cut
- status: animated
- poster: 3s

シリーズ2本目。「暑いから園芸はお休み」という前提をひっくり返す一撃から入る。

Layout: Cover 処理。badge-pill「8月の園芸 ②」→ display 2行「8月は / 秋冬野菜の始まり」→ subtitle。
オーナメント 6点。

Motion: badge drop-in → display 2行 0.12s stagger の押し上げ → subtitle fade+rise。
オーナメントは 0.2s から pop-in。

## Frame 2 — まき時カレンダー

- scene: sky 地。上旬 / 中旬 / 下旬 の3ブロックが縦に並び、下向き矢印でつながる
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

月内のどこで何が始まるかの背骨。ここで全体像を持たせてから各論に入る。

Layout: Process Steps 処理（9:16 縦積み）。丸マーカーは coral → butter → mint、
ラベルは「上旬」「中旬」「下旬」。ヘッドラインは白 + text-shadow。

Motion: ヘッドライン先行、3ブロックは 0.35s stagger で scale+rise、矢印が間を伸びる。

## Frame 3 — 上旬〜中旬にまく

- scene: cream 地の framed-header。turquoise のキャップに3つのドット箇条書き
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

前半にまく作物。育苗スタートの品目が中心。

Layout: Framed Section 処理。キャップ = turquoise、bullet 3行（ニンジン / キャベツ・ブロッコリーは育苗 /
ハクサイは中旬から）。右下にオーナメント。

Motion: カードが下から入り、キャップ→ボディの順。bullet は 0.25s stagger。

## Frame 4 — 下旬にまく

- scene: cream 地の framed-header。peach のキャップに3つのドット箇条書き
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

秋まきの主力が始まる beat。Frame 3 と対になる構造で、入場方向だけ反転させる。

Layout: Framed Section 処理。キャップ = peach、bullet 3行（ダイコン・カブ / コマツナ・ミズナ・シュンギク /
ホウレンソウは下旬から）。左上にオーナメント。

Motion: カードは左から。bullet stagger 0.25s。

## Frame 5 — 暑さの中で発芽させる

- scene: cream 地。白カード3枚が縦に積まれ、丸アイコンが色を変える
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

密度フレーム。高温期に固有のコツだけを3つに絞る。

Layout: Info Cards 処理（縦積み）。丸アイコンは coral / sky / lavender。
カード内容は「発芽まで乾かさない」「夕方にまく」「まき過ぎない」。

Motion: ヘッドライン先行、カードは 0.3s stagger で右から滑り込み、着地で軽い overshoot。

## Frame 6 — Closing

- scene: butter 地に「8月の種が、11月の食卓に。」
- duration: 4.5s
- transition_in: crossfade
- status: animated
- poster: 3s

収穫の絵を最後に置いて終わる。まき時が目安であることもここで明示する。

Layout: Closing 処理。display 2行（butter 地なので文字はチャコール、text-shadow なし）、
下に subtitle「まき時は温暖地の目安」。オーナメント 7点。

Motion: display 2行 0.15s stagger、subtitle 0.8s。最後の 1.5s は静止。

## Video direction

- 音声・BGM なし（`music: none` / SCRIPT.md なし）。
- 縦型 1080x1920。全フレーム `container-type: size` の ground に対して cqw で組む。
- Frame 3 と Frame 4 は同じ骨格・逆方向の入場で対にする。
- butter 地の Frame 6 だけ文字をチャコールにする（白は contrast 不足）。
- 品目名は温暖地の目安として扱い、具体的な日付・数値は出さない。
