crack サービス紹介動画（60秒・16:9）

JavaScript の canvas で描いたモーショングラフィックと、そのナレーション台本です。


■ 入っているもの

index.html
  動画の本体。ブラウザで開くとそのまま再生できる。フォントも中に埋め込んであるので、ネットにつながっていなくても同じ見た目になる。
crack_service_video.mp4
  index.html を 1920×1080、30fps で書き出した無音の動画。
narration_script.txt
  ナレーション台本。シーンごとの映像、テロップ、読み、タイムコード、公開前の確認事項。
narration.srt
  ナレーションの字幕ファイル。動画編集ソフトに読み込めばそのまま字幕になり、録音の目安にも使える。
render.mjs
  index.html から MP4 を作り直すスクリプト。
tools/embed_fonts.py
  文言を変えたときに、フォントを作り直して index.html に埋め込むスクリプト。
licenses/
  埋め込んでいるフォント（Zen Kaku Gothic New、Syne）のライセンス。どちらも SIL Open Font License 1.1。


■ 見る

index.html を Chrome か Edge で開く。

スペースキーで再生と停止、左右の矢印キーで2秒ずつ移動、F で全画面、C で字幕の表示切り替え。
画面の下にナレーション台本が並んでいて、行をクリックするとその位置へ飛ぶ。
仮ナレーションにチェックを入れると、ブラウザの読み上げ機能が台本を読む。本番の声ではなく、間の確認用。
WebMで書き出すボタンを押すと、再生しながら録画して WebM ファイルを保存する。60秒かかるので、その間はタブを表示したままにしておく。


■ MP4 を作り直す

Node.js 18 以降と ffmpeg が必要。

  npm install playwright
  npx playwright install chromium
  node render.mjs                 字幕なしの crack_service_video.mp4 と narration.srt
  node render.mjs --subs          字幕を焼き込んだ crack_service_video_subtitled.mp4
  node render.mjs --stills 11.8   11.8秒の静止画を stills/ に PNG で保存（サムネイル用）

ffmpeg が PATH に無い場合は、環境変数 FFMPEG にパスを入れて実行する。


■ 直す

文言とタイミングは index.html の中にある。
ナレーションの文と秒数は、スクリプト冒頭の NARRATION にまとまっている。字幕、SRT、仮ナレーションはここから作られる。
画面のテロップは、シーンごとの関数（sceneGray、sceneKlein、sceneArt、sceneWorkshop、sceneProof、sceneClose）の中の tline の行を書き換える。数字は秒。
シーンの切り替え時刻は、render 関数に並んでいる。

新しい漢字を足したときは、フォントに含まれていないので次を実行する。

  pip install fonttools brotli
  python3 tools/embed_fonts.py

実行しなくても、ネットにつながっていれば Google Fonts から足りない字を読み込むので表示はされる。
MP4 を作り直すときは埋め込みフォントしか使わないため、実行してから書き出す。

描画は render(ctx, t) という、時刻 t だけで絵が決まる関数ひとつに集約してある。
プレイヤー、WebM 書き出し、render.mjs の三つが同じ関数を呼ぶので、ブラウザで見た絵と MP4 の絵は一致する。
