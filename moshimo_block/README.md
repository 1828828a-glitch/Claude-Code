# もしもブロック劇場

「もしも○○だったら」を30秒のブロック風3Dアニメにするシリーズ。第1話は「もしも社員Aだけ、秒給1万円だったら」で、はんぺんさん（@hanpen_VR）の動画をブロックの世界に描き直したファン版です。

映像はすべてコードで描いています。three.js の箱でできたジオラマとキャラ、DOM で重ねる文字、Web Audio で鳴らすピコピコ音源。どれも「時刻 t を渡すとその瞬間の姿になる」作りなので、ブラウザで再生しても、1コマずつ撮って MP4 にしても同じ絵が出ます。

```
python moshimo_block/build.py                      # dist/moshimo-block.html を作る（Artifact にそのまま載る1枚）
node moshimo_block/render.cjs                      # dist/ep01.mp4 を書き出す（Playwright と ffmpeg が必要、2〜3分）
node moshimo_block/render.cjs out/ --frames 3,10   # 指定した秒の静止画だけ撮る（見た目の確認用）
```

src/ の中身は次のとおり。build.py が上から順につないで1本の JS にします。

```
voxel.js     テクスチャ、格子ブロック、キャラ（表情5種）、ポーズ、ブロック数字
props.js     オフィスの部屋、机、PC、時計、ヘリ、パラソルなど使い回す小道具
audio.js     矩形波・三角波・ノイズの音源、効果音、BGM（128BPM・16小節＝30秒）、WAV書き出し
overlay.js   見出し（タイプライター表示）、吹き出し、効果文字、給料カウンター、ブロック状の場面転換
episodes/    1話ごとのファイル。EPISODES.push({...}) で登録する
player.js    再生ページの操作と、書き出し用の window.__seek / __renderAudio
```

新しい回を足すときは episodes/ にファイルを1つ増やします。build() が返すのは scenes（場面ごとの three.js シーン、カメラ、update(lt, t)）、overlay（文字の出し入れを時刻で書いたリスト）、audio（AUDIO.music() に効果音を足したリスト）、cuts（場面転換の時刻）の4つ。再生ページは今のところ EPISODES[0] を流すので、別の回を見るときはそこを差し替えてください。
