# 10月に咲く花10選 モーショングラフィック動画

参考記事: https://www.hyponex.co.jp/plantia/plantia-8990/

- `index.html` … ブラウザで再生するプレイヤー（字幕の切り替え、WebM録画あり）
- `video.js` … 映像（Canvas）とBGM（Web Audio合成）の本体
- `render.cjs` … ヘッドレスChromiumで1フレームずつ描画し、ffmpegでMP4に書き出す
- `narration_script.txt` … タイムコード付きナレーション台本
- `fonts/` … Zen Maru Gothic（SIL OFL 1.1）を使用文字だけにサブセット化したもの

## 再生

```
npx serve .   # などでローカルサーバーを立てて index.html を開く
```

## MP4書き出し

```
npm i playwright
FFMPEG=/path/to/ffmpeg node render.cjs october_flowers.mp4          # 字幕なし
FFMPEG=/path/to/ffmpeg node render.cjs october_flowers_subtitled.mp4 --subs
```

台本の文言を変えたら `video.js` の `NARRATION` も合わせて直すと字幕が一致します。
新しい文字を使う場合はフォントのサブセットを作り直してください。
