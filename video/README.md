# 紙コラージュ風・日本語解説動画（Claude + Remotion）

AI の画像・映像モデルは一切使わず、**コードだけ**で 1920×1080 / 30fps の解説動画を作る仕組み。
色面と図形とテロップで組み立てるので、何度書き出しても同じ絵が出るし、
台詞を 1 行直して数分で作り直せる。

入っている動画（どちらも約 60 秒）:

| Composition | 内容 | 配色 |
| --- | --- | --- |
| `Ants` | アリの巣の解説。地面の断面、トンネル、行列 | 土・草・紙 |
| `DeepSea` | 深海の解説。水深、水圧、発光生物、熱水噴出孔 | 海・深海・発光色 |

同じ部品立てで、色と主役だけを入れ替えている。
地面の断面が「水深」に、アリの行列が「海底の生きもの」になっただけ。

## 使う

```bash
cd video
npm install

npm run studio              # ブラウザでプレビュー・値をいじりながら調整
npm run render:ants         # out/ants.mp4 に書き出し（約 3 分）
npm run render:deepsea      # out/deepsea.mp4 に書き出し
```

個別に書き出すとき:

```bash
npx remotion render Ants out/ants.mp4
npx remotion still Ants out/frame.png --frame=300   # 1 枚だけ静止画で確認
```

## 新しい動画を作る

`src/storyboards/` に台本ファイルを 1 つ足して、`src/Root.tsx` に登録するだけ。

```tsx
// src/storyboards/coffee.tsx
export const coffeeStoryboard: SceneSpec[] = [
  {
    id: "01-つかみ",
    seconds: 8,
    backdrop: { kind: "clay" },
    title: { text: "一杯の裏側", placement: "top-center" },
    subtitle: "毎朝のコーヒーは、地球を半周してきています。",
    art: () => <MyArt />,
  },
  // カットを並べる。上から順にそのまま動画になる
];
```

```tsx
// src/Root.tsx に追加
<Composition
  id="Coffee"
  component={() => <Storyboard scenes={coffeeStoryboard} />}
  durationInFrames={storyboardDuration(coffeeStoryboard)}
  fps={layout.fps}
  width={layout.width}
  height={layout.height}
/>
```

新しい漢字を使ったら、フォントを作り直す（後述）。

## カットの書き方

`SceneSpec` の 5 項目だけ埋める。

| 項目 | 役割 |
| --- | --- |
| `seconds` | このカットの長さ。7〜8 秒が読みやすい |
| `backdrop` | 下地。`soil` / `chalk` / `clay` / `night` / `paper`。`groundY` を渡すと地面の断面になる |
| `title` | テープ留めの見出し。`sub` を足すとオレンジのシールが下に付く |
| `subtitle` | 画面下のナレーション帯。全カットで位置が変わらないので目が疲れない |
| `art` | そのカットのイラスト。下の部品を組み合わせて描く |

### 用意してある部品

**イラスト**
- `src/components/Ant.tsx` — `Ant` `Leaf` `Human` `Car` `Mushroom`。
  アリは `facing` で向き、`carrying` で荷物を持たせる。
- `src/components/Sea.tsx` — `WaterSurface` `SunRays` `MarineSnow` `Bubbles`
  `Jellyfish` `Anglerfish` `Submersible` `HydrothermalVent` `CrushedCan`。
  `MarineSnow` は撒くだけで「沈んでいる」感じが出るので、暗いカットでは便利。

**図解**（`src/components/Diagram.tsx`）

| 部品 | 何ができるか |
| --- | --- |
| `Tunnel` | 制御点を並べると、そこにトンネルが掘られていく |
| `Chamber` | 巣の部屋。ぽんと膨らんで出てくる |
| `Ruler` | 深さや高さのものさし。数字を添えるとスケール感が出る |
| `DotTrail` | 点線が手前から順に灯る（フェロモン、電流、経路） |
| `Walker` | パスの上の任意の位置に物を置く。進行方向に自動で傾く |
| `Marchers` | 行列。等間隔で歩き続け、端で薄くなって入れ替わる |
| `At` | 画面座標に中心を合わせて置く。配置はこれで統一する |
| `Glow` | 光る目印 |

**文字**（`src/components/Titles.tsx`）`TapedTitle` `StickerLabel` `Subtitle`

**動き**（`src/anim.ts`）
`usePop`（紙を置く跳ね） `useFade` `useSlide` `useDrift` `useBob`（歩く上下動）
`useCountUp`（数字の数え上げ） `stagger`（順番に出す） `rand`（毎回同じ乱数）

`Math.random()` は使わない。`rand(seed)` を使えば、何度書き出しても同じ絵になる。

**色**（`src/theme.ts`）
土・草・紙の 3 系統に、差し色のオレンジが 1 色だけ。増やすと途端に散らかるので、
`palette` の中から選ぶ。深海用に海の 4 段階と発光色を足してあるが、
1 本の動画の中では 1 系統に絞ること。

背景は `backdrop.kind` で選ぶ:
`soil` `chalk` `clay` `night` `paper` `sea` `deep` `abyss`

## フォント

日本語フォントは `src/assets/fonts/` に同梱し、バンドルに埋め込んでいる。
Google Fonts から読むと日本語は文字コード範囲ごとに分割配信され、
1 フレームあたり千回以上のリクエストが飛ぶうえ、オフラインでは動かない。

同梱しているのは**台本で使う文字だけに絞ったもの**（2.2MB → 190KB）。
なので、**台本に新しい漢字を足したら作り直す**:

```bash
npm run fonts
```

初回だけ元フォント（Noto Sans JP / SIL Open Font License）を取得する。
`npm run render:ants` は中でこれを実行するので、普段は意識しなくてよい。
ネットワークが無い環境では `npx remotion render Ants out/ants.mp4` を直接使う。

使えるウェイトは 700（本文）と 900（見出し）の 2 つ。

## ナレーション音声を足す

`public/` に音声ファイルを置き、`Storyboard` と並べて `<Audio src={staticFile("vo.mp3")} />`
を置けば乗る。カットごとに分けるなら `<Sequence>` で挟む。

## 覚えておくとよいこと

- **書き出しが 1 フレームでも失敗すると全体が落ちる。** フォントの読み込みには
  `retries` を付けてあるので、タブが作り直されてもそのフレームだけやり直される。
- **テロップの高さ（画面下 54px から約 90px）には何も置かない。** 隠れる。
- **`seconds` は読み上げの速さで決める。** 全角 30 文字で 7〜8 秒がだいたいの目安。

## ライセンス

同梱フォントは Noto Sans JP（SIL Open Font License 1.1）。
`src/assets/fonts/LICENSE-NotoSansJP.txt` を参照。

Remotion 自体は個人・小規模での利用は無償だが、会社で使う場合はライセンスが要る。
<https://remotion.dev/license> を確認すること。
