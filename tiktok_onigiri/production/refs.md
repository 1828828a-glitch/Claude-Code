# 一貫性のための参照画像(生成前に作る)

人物ごとに1枚、正面・自然光・無地背景・衣装を固定した画像を作り、すべてのカットで同じ画像を Ingredients に入れる。画像生成は Flow の画像生成でも、ほかの画像生成サービスでもよい。できあがった画像は refs/ に下の名前で置く。

プレビズのイラストは構図と尺の確認用で、生成の入力には使わない(絵柄がアニメ調に引っ張られるため)。

## MOM.png 母

```
Photorealistic portrait photo of a Japanese woman in her late 40s, shoulder-length dark brown bob haircut, kind slightly tired eyes, light natural makeup, wearing a dusty-rose knit sweater under a plain cream cotton apron. Front-facing, chest-up, neutral gentle expression, soft natural window light, plain light-gray background, 50mm lens, no text, no logo, no jewelry.
```

## SON_TEEN.png 息子(17歳)

```
Photorealistic portrait photo of a 17-year-old Japanese high-school boy, short slightly messy black hair, wearing a black gakuran school uniform with a stand-up collar and gold buttons. Front-facing, chest-up, neutral slightly sulky expression, soft natural window light, plain light-gray background, 50mm lens, no text, no logo, no school badge with letters.
```

## SON_ADULT.png 息子(23歳)

同じ人物が6年後に見えることが大事。SON_TEEN.png を参照に入れて作る。

```
Photorealistic portrait photo of the same young man at age 23 (use the reference image as his younger self), short neat black hair, wearing a navy business suit, white shirt and a dark-red tie. Front-facing, chest-up, calm tired expression, soft natural window light, plain light-gray background, 50mm lens, no text, no logo.
```

部屋着のカット(SH-POT、SH-ALARM)では、同じ参照画像のまま、プロンプトで灰青の T シャツを指定する。

## LOOK.png ルック(トーン・色・光)

```
Photorealistic still frame from a Japanese TV commercial drama: a small kitchen at morning, warm soft window light from the left, shallow depth of field, soft film grain, warm muted palette, 35mm lens, vertical 9:16, no people, no text.
```

## 全カット共通で末尾に付ける文

ルック宣言(prompts_*.md の Look 行と同じ):

```
Photorealistic Japanese live-action TV-commercial drama, natural motivated light, soft film grain, 35mm lens, shallow depth of field, warm muted palette, vertical 9:16.
```

ネガティブ(Negative 行と同じ):

```
no text, no subtitles, no captions, no signage or menus with letters, plain unlabeled paper lanterns, no logos, no brand names on packages, no watermark, no on-screen UI, phone screen never readable, no dialogue, no lip-synced speech
```

## 注意

- Veo 3.1 の Quality は参照画像に対応していないので、Fast + Ingredients を使う(調査メモの実験結果)
- 1カットに入れる参照は、そのカットに映る人物とルックだけにする。映らない人物の画像を入れると、出てきてしまうことがある
