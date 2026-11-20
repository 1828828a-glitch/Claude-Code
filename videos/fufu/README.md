# 『夫婦』編 ブロック調3D動画

台本『夫婦』編を、ブロック調の3D映像にしたもの。Three.js で場面を組み、Playwright で1コマずつ撮って ffmpeg で MP4 にまとめる。約85秒、24fps。横長は1280×720、縦長は1080×1920。

冒頭は、妻が「全部私のせいなの！？」と叫ぶ瞬間から入り、映像を巻き戻して夫の帰宅から本編が始まる。けんかの間は色を抜き、「実はさ…」のあとで色と曲が戻る。

index.html に場面がすべて入っている。場面ごとの秒数、カメラの動き、台詞は配列 S の中で直せる。キャラクターや部屋の小物も同じファイルで作っている。

## 作り直し方

Node.js、ffmpeg、numpy の入った Python 3 が前提。このフォルダで依存とブラウザを入れて、ローカルサーバーを立てる。

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
python3 -m http.server 8765
```

別のターミナルで映像を書き出す。timeline.json と video.mp4 ができる。この環境では5分ほどかかった。

```bash
FPS=24 node cap.js
```

BGM と効果音を作って映像に重ねる。bgm.py は timeline.json に書かれた効果音の時刻と、曲調を切り替える位置を読む。どちらも index.html の driver の部分で決めているので、場面を足したり並べ替えたりしたら SP、SFXL、MARKS の場面番号も合わせて直す。

```bash
python3 bgm.py
```

```bash
ffmpeg -i video.mp4 -i bgm.wav -c:v copy -c:a aac -b:a 192k -shortest fufu_openup.mp4
```

TikTok などの縦長用は VERT=1 を付ける。1080×1920 の video_v.mp4 ができる。カメラは横長用の動きをもとに、縦のときだけ視野を広げて少し引く。字幕は縦の画面で意味の切れ目に改行が入る。台詞の中の | が、縦のときだけ改行になる印。

```bash
VERT=1 FPS=24 node cap.js
```

```bash
ffmpeg -i video_v.mp4 -i bgm.wav -c:v copy -c:a aac -b:a 192k -shortest fufu_openup_v.mp4
```

一部のコマだけ確かめたいときは、秒数を並べて静止画にする。

```bash
ONLY=12,30.5,51 node cap.js
```

## 中身について

キャラクター、部屋、保育園、会社、質感はすべてこの index.html の中で描いている。既存ゲームの素材やロゴは使っていない。字幕のフォントは M PLUS Rounded 1c。

声は入っていない。保育園で妻が謝る場面の字幕「すみません、遅くなりました……！」は、台本に無い言葉を足したもの。
