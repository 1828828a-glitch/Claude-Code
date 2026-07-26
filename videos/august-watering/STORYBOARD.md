---
format: 1080x1920
duration: 31s
message: "8月の水やりは、量より“時間帯”"
arc: Hook → 時間帯 → 手順 → 失敗例 → 守り方 → まとめ
audience: ベランダ・小さな庭で野菜や花を育てる家庭園芸者
mode: autonomous
music: none
---

## Frame 1 — Cover

- scene: ターコイズ地に「水やりは量より時間帯」が白抜きで立ち上がる
- duration: 5s
- transition_in: cut
- status: animated
- poster: 3s

シリーズ「8月の園芸」の1本目。音なし再生を前提に、1秒目で主題を出しきる。

Layout: Cover 処理。butter の badge-pill「8月の園芸 ①」→ display 2行「水やりは / 量より時間帯」
（白 + 3px チャコール text-shadow）→ subtitle 1行。オーナメント 6点を四隅から食い込ませる。

Motion: badge は上から drop-in（0.0-0.5s）、display は2行を 0.12s stagger で下から押し上げ
（0.35-1.1s）、subtitle は 0.9s に fade+rise。オーナメントは 0.2s から stagger で pop-in。
以降は静止させず、display をごく浅く保持（idle wobble は禁止のため保持のみ）。

## Frame 2 — 朝が基本

- scene: cream 地の framed-header。ターコイズのキャップ「朝が基本」に3つのドット箇条書き
- duration: 5s
- transition_in: crossfade
- status: animated
- poster: 3s

いつあげるかを決める beat。日中 NG の理由まで一息で言う。

Layout: Framed Section 処理。キャップ = turquoise + 白文字 text-shadow、ボディ = 白、
butter のドット bullet 3行。右下と左上にオーナメント。

Motion: カードは 0.0-0.55s で下から入り、キャップ→ボディの順に 0.1s ずらす。
bullet は 0.25s stagger で左から入る。

## Frame 3 — あげ方は3ステップ

- scene: peach 地。90px の丸ステップが縦に3つ、下向き矢印でつながる
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

手順を身体化する beat。縦型なので矢印は下向き。

Layout: Process Steps 処理（9:16 は縦積み）。coral → mint → sky の丸マーカー、
白の Fredoka 数字、右にラベル。ヘッドラインは白 + text-shadow。

Motion: ヘッドライン 0.0-0.5s。ステップは 0.35s stagger で各行が scale+rise、
矢印はその間に短く伸びる。最後のステップが着地してから 1.5s 保持。

## Frame 4 — やりがちな3つ

- scene: cream 地。白カード3枚が縦に積まれ、丸アイコンが色を変えて並ぶ
- duration: 5.5s
- transition_in: crossfade
- status: animated
- poster: 3.5s

失敗例を並べる密度フレーム（info-card grid の例外）。

Layout: Info Cards 処理（9:16 は縦積み）。丸アイコンは coral / lavender / sky。
カードは白・3px・6px オフセット影。

Motion: ヘッドライン先行、カードは 0.3s stagger で右から滑り込む。各カードは着地時に
1度だけ 2px の overshoot を持たせ、以後静止。

## Frame 5 — マルチングで守る

- scene: cream 地の framed-header。mint のキャップ「株元を覆う」
- duration: 5s
- transition_in: crossfade
- status: animated
- poster: 3s

回数を減らす発想に転換する beat。

Layout: Framed Section 処理。キャップ = mint、bullet 3行。左下にオーナメント群。

Motion: Frame 2 と同じ骨格を反転して入れる（カードは左から）。bullet stagger 0.25s。

## Frame 6 — Closing

- scene: lavender 地に「朝たっぷり、受け皿は空。」
- duration: 5s
- transition_in: crossfade
- status: animated
- poster: 3s

覚えて帰る一行だけを残す。

Layout: Closing 処理。display 2行を白 + text-shadow、下に subtitle、オーナメント 7点で四隅を埋める。

Motion: display 2行が 0.15s stagger で立ち上がり、subtitle が 0.8s に続く。
オーナメントは外周から中心へ pop-in。最後の 2s は完全静止で読ませる。

## Video direction

- 音声・BGM なし（`music: none` / SCRIPT.md なし）。読ませる速度でカットを決める。
- 縦型 1080x1920。全フレーム `container-type: size` の ground に対して cqw で組む。
- 連続感: 各フレームは crossfade でつなぎ、直前フレームの終了方向と次の入場方向を合わせる。
- 1フレーム1コンテナ + オーナメント 5〜7点。空いた隅を作らない。
- coral は小マーカーのみ。面には使わない。
