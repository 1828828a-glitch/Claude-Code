# 『夫婦』編 ブロック調3D動画

台本『夫婦』編を、ブロック調の3D映像にしたもの。Three.js で場面を組み、Playwright で1コマずつ撮って ffmpeg で MP4 にまとめる。約91秒、1280×720、24fps。

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

BGM を作って映像に重ねる。曲調は、妻の台詞「実はね…」の場面が始まるところで明るく変わる。bgm.py は timeline.json の starts[11] をその位置として読んでいる。場面を足したり並べ替えたりしたら、bgm.py の切り替え位置も合わせて直す。

```bash
python3 bgm.py
```

```bash
ffmpeg -i video.mp4 -i bgm.wav -c:v copy -c:a aac -b:a 192k -shortest fufu_openup.mp4
```

一部のコマだけ確かめたいときは、秒数を並べて静止画にする。

```bash
ONLY=12,30.5,51 node cap.js
```

## 中身について

キャラクター、部屋、保育園、会社、質感はすべてこの index.html の中で描いている。既存ゲームの素材やロゴは使っていない。字幕のフォントは M PLUS Rounded 1c。

声は入っていない。保育園で妻が謝る場面の字幕「すみません、遅くなりました……！」は、台本に無い言葉を足したもの。
