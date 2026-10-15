crack リール動画（田中さんの話）

同じ台本から2本つくっています。どちらも 1080x1920、30fps、H.264 で、BGM 入りのままインスタのリールに上げられます。

out/crack_reel.mp4 は落ち着いた版で、約1分41秒あります。黒地に明朝体が一字ずつ浮かび、背景の色で朝から夜へ移っていきます。曲はピアノと弦です。

out/crack_reel_mojicut.mp4 は文字カット版で、84秒です。原稿用紙、小説の扉ページ、色紙のタイトルカード、単色のフラッシュを、BPM100 の拍に合わせて切り替えます。曲はピチカートとチェンバロで、カットの切り替わりに効果音が入ります。

out/cover.png はカバー画像の候補です。曲は music.py でゼロから組んだもので、FluidSynth と FluidR3_GM で鳴らしているので、権利の心配はありません。

文言やタイミングを変えるときは、index.html（落ち着いた版）か mojicut.html（文字カット版）の ITEMS を書き換えます。ブラウザで開くとそのまま再生されます。文字カット版の b は拍数で、1拍が0.6秒です。曲のコードや旋律は music.py にあり、場面の時刻に合わせて書いてあります。尺を大きく変えたら曲側もずらしてください。

作り直す手順

    ./fetch_fonts.sh                          # 初回だけ。書体を fonts/ に落とす
    python3 music.py                          # 2曲を out/bgm_*.wav に書き出す
    node render.mjs                           # 落ち着いた版（bgm_chic.wav を入れて書き出す）
    node render.mjs --page mojicut.html       # 文字カット版（bgm_mojicut.wav を入れる。out/mojicut_cuts.json も更新）

文字カット版の効果音は out/mojicut_cuts.json のカット位置に置くので、mojicut.html の尺を変えたら、映像を書き出してから music.py をもう一度走らせ、最後に映像を書き出し直してください。

確認用に node render.mjs --stills 12,54.5 で指定秒のフレームを、--range 50,60 で区間だけを書き出せます。

必要なのは Playwright（Node 版）、ffmpeg、fluidsynth と fluid-soundfont-gm、Python の numpy、scipy、mido です。

文字はリールの上の見出し、下のキャプション、右のボタンにかからない範囲に収めています。ロゴは書体で組んだ仮のものです。
