"""build/cm30/key_*.jpg と build/reel/key_*.jpg を埋め込んだ絵コンテ storyboard.html を作る（1ファイルで完結）。"""
import base64
import html
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def img(t, name='cm30'):
    p = os.path.join(HERE, 'build', name, f'key_{t:.1f}.jpg')
    with open(p, 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()


SCENES = [
    dict(no='01', time='0:00 – 0:03.7', title='フック', keys=[1.9, 3.0],
         pic='オレンジの点が落ちて弾み、そのまま笑顔のカーブを描く。問いかけが1文字ずつ跳ねて出て、右下に高校生の本音の吹き出し。',
         tel='子ども、好き？／ちょっと、気になる。',
         nar='子ども、好き？　〈高校生の声〉ちょっと、気になるかも。',
         snd='点のバウンド音、オルゴールのメロディが始まる'),
    dict(no='02', time='0:03.7 – 0:07.5', title='資格がなくても', keys=[6.7],
         pic='カーブの端の点がふくらんで、画面ごとコーラル色に変わる。大きな文字が下からせり上がり、黄色いマーカーが引かれる。最後にバッジが2つ弾む。',
         tel='保育士の資格が、なくても。保育の現場を体験できる。／高校生もOK！／資格不要',
         nar='資格がなくても、保育の現場を体験できる。',
         snd='ウクレレのストロークがここから入る'),
    dict(no='03', time='0:07.5 – 0:10.0', title='タイトル', keys=[9.4],
         pic='黄・緑・水色の帯が斜めに横切り、放射線の背景へ。タイトルが1文字ずつ落ちてきて弾み、下から子どもたちが顔を出す。',
         tel='神奈川県／キッズサポーター／募集中！',
         nar='キッズサポーター、募集中！',
         snd='文字の着地音、キラッという音'),
    dict(no='04', time='0:10.0 – 0:16.2', title='どんなお手伝い？', keys=[11.0, 12.6, 14.3, 15.8],
         pic='色違いのパネルが右から約1.5秒ごとに差し替わる。積み木が落ちる、アヒルをスプレーで磨く、クレヨンでハートを描く、給食のトレーに器が並ぶ。',
         tel='たとえば、こんなお手伝い／01 あそびの見守り／02 おもちゃの消毒・おそうじ／03 制作あそびの準備・片づけ／04 給食・おやつの配膳・片づけ',
         nar='あそびの見守り、おもちゃの消毒、工作の準備、給食の配膳。',
         snd='パネルごとのスワイプ音、キックとクラップでテンポを上げる'),
    dict(no='05', time='0:16.2 – 0:20.6', title='はじめ方', keys=[19.9],
         pic='画面が下から入れ替わり、点が波線の道をたどる。点が着くたびに丸いアイコンが開く。最後の修了証でメダルが回り、紙吹雪。',
         tel='はじめ方は、カンタン。／スマホで研修 オンライン・約1時間／日にちを相談／保育の現場へ／修了証がもらえる 働くきっかけにも',
         nar='研修はスマホで約1時間。日にちも相談できます。',
         snd='アイコンが開くたびに音程が上がる'),
    dict(no='06', time='0:20.6 – 0:25.4', title='笑顔があふれる', keys=[21.9, 24.8],
         pic='修了証の位置から黄色の画面が広がり、子どもの顔が次々に咲く。吹き出しが3つ。顔が左右に寄って額縁になり、中央にメインコピー。冒頭の笑顔のカーブが下線として戻ってくる。',
         tel='せんせい、あそぼ！／ありがとう！／みてみて！／子どもの笑顔に、出会えるチャンス。',
         nar='〈子どもの声〉せんせい、あそぼ！　ありがとう！　〈ナレ〉子どもの笑顔に、出会えるチャンス。',
         snd='リズムを抜いてオルゴールとパッドだけにし、コピーを立てる'),
    dict(no='07', time='0:25.4 – 0:30.0', title='エンドカード', keys=[29.5],
         pic='コピーが縮んで上へ。タイトル、募集中のリボン、条件のチップが順に出て、検索窓に文字が打ち込まれ、カーソルがボタンを押す。',
         tel='キッズサポーター 募集中！／中学生以上・資格不要・住所不問／神奈川県 キッズサポーター［検索］／子どもの笑顔応援プロジェクト 神奈川県',
         nar='神奈川県 キッズサポーターで、検索！',
         snd='タイピング音、ボタンでピンポン、Fの和音で終わる'),
]

FACTS = [
    ('対象', '中学生以上で、住所は問わない。高校生も参加できる'),
    ('資格', '保育士などの資格がなくても参加できる'),
    ('研修', 'オンラインで約1時間。PC、タブレット、スマホで受けられる'),
    ('活動', 'あそびの見守り、環境整備、制作の準備と片づけ、給食とおやつの配膳と片づけ'),
    ('受入先', '県内の保育所、認定こども園、幼稚園、放課後児童クラブ'),
    ('修了', '研修と体験を終えるとキッズサポーター修了証が出る'),
    ('就業', '高校生以上で、本人と施設の双方が望めば継続雇用につなげる仕組みがある。CMでは働くきっかけにも、と控えめに表現'),
    ('未記載', '申込期間はページに載っていない。CMには日付を入れていない。交通費は自己負担なので、お得感を出す表現も避けた'),
]


def esc(s):
    return html.escape(s)


def scene_html(s):
    thumbs = ''.join(f'<img src="{img(k)}" alt="{esc(s["title"])} {k}秒時点" loading="lazy">' for k in s['keys'])
    cls = 'thumbs many' if len(s['keys']) > 2 else ('thumbs two' if len(s['keys']) == 2 else 'thumbs')
    tel = '<br>'.join(esc(x) for x in s['tel'].split('／'))
    return f'''
<article class="scene">
  <div class="{cls}">{thumbs}</div>
  <div class="body">
    <div class="head"><span class="no">{s['no']}</span><h3>{esc(s['title'])}</h3><span class="time">{s['time']}</span></div>
    <p class="pic">{esc(s['pic'])}</p>
    <dl>
      <dt>テロップ</dt><dd>{tel}</dd>
      <dt>ナレーション案</dt><dd>{esc(s['nar'])}</dd>
      <dt>音</dt><dd>{esc(s['snd'])}</dd>
    </dl>
  </div>
</article>'''


REEL = [
    (3.5, '0:00', 'つかみ'), (6.4, '0:04', 'でも資格ないし…'), (13.0, '0:07', '資格不要'), (18.6, '0:15', 'タイトル'),
    (21.0, '0:20', 'お手伝いの導入'), (24.8, '0:21', '01 あそびの見守り'), (28.8, '0:25', '02 おもちゃの消毒'),
    (32.8, '0:29', '03 制作の準備'), (36.8, '0:33', '04 給食の配膳'), (46.0, '0:37', 'はじめ方'),
    (49.6, '0:47', '笑顔'), (53.8, '0:50', 'メインコピー'), (59.6, '0:54', 'エンドカード'),
]


def main():
    scenes = ''.join(scene_html(s) for s in SCENES)
    reel = ''.join(f'<figure><img src="{img(t, "reel")}" alt="リール版 {esc(lab)}" loading="lazy"><figcaption><b>{tm}</b> {esc(lab)}</figcaption></figure>' for t, tm, lab in REEL)
    facts = ''.join(f'<dt>{esc(a)}</dt><dd>{esc(b)}</dd>' for a, b in FACTS)
    page = f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>キッズサポーターCM絵コンテ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap" rel="stylesheet">
<style>
:root{{--bg:#FFF6E8;--card:#FFFFFF;--ink:#4E3A2E;--sub:#7A6556;--line:#EADCC8;--accent:#E0603F;--chip:#FFE7A3}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#221B17;--card:#2E2520;--ink:#F3E6D6;--sub:#C9B6A4;--line:#46392F;--accent:#FF9070;--chip:#5A4520}}}}
:root[data-theme="dark"]{{--bg:#221B17;--card:#2E2520;--ink:#F3E6D6;--sub:#C9B6A4;--line:#46392F;--accent:#FF9070;--chip:#5A4520}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:var(--bg);color:var(--ink);font-family:"Zen Maru Gothic",sans-serif;line-height:1.75;padding:40px 16px 80px}}
main{{max-width:1080px;margin:0 auto}}
header h1{{font-size:clamp(28px,5vw,44px);font-weight:900;line-height:1.3}}
header .meta{{color:var(--sub);font-weight:700;margin-top:6px}}
.lead{{margin-top:22px;font-size:17px;max-width:62em}}
.lead b{{color:var(--accent)}}
video{{display:block;width:100%;margin-top:28px;border-radius:16px;background:#000;aspect-ratio:16/9}}
.note{{font-size:14px;color:var(--sub);margin-top:8px}}
h2{{font-size:24px;font-weight:900;margin:52px 0 16px;display:flex;align-items:center;gap:10px}}
h2::before{{content:"";width:14px;height:14px;border-radius:50%;background:var(--accent)}}
.scene{{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:22px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-bottom:16px}}
.thumbs{{display:grid;gap:8px;align-content:start}}
.thumbs.two{{grid-template-columns:1fr}}
.thumbs.many{{grid-template-columns:1fr 1fr}}
.thumbs img{{width:100%;border-radius:10px;display:block;aspect-ratio:16/9;object-fit:cover}}
.head{{display:flex;align-items:center;gap:10px;flex-wrap:wrap}}
.no{{background:var(--ink);color:var(--bg);font-weight:900;border-radius:999px;padding:0 12px;font-size:15px}}
.head h3{{font-size:22px;font-weight:900}}
.time{{margin-left:auto;font-size:14px;color:var(--sub);font-variant-numeric:tabular-nums;font-weight:700}}
.pic{{margin-top:8px}}
dl{{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin-top:12px;font-size:15px}}
dt{{font-weight:900;color:var(--sub);white-space:nowrap}}
dd{{min-width:0}}
.facts{{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px 22px}}
.facts dl{{margin-top:0;font-size:16px}}
.src{{font-size:14px;color:var(--sub);margin-top:12px;word-break:break-all}}
.src a{{color:var(--accent)}}
.reel{{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;margin-top:18px}}
.reel figure{{margin:0}}
.reel img{{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:10px;display:block;border:1px solid var(--line)}}
.reel figcaption{{font-size:13px;color:var(--sub);margin-top:4px;line-height:1.4}}
.reel figcaption b{{color:var(--ink);font-variant-numeric:tabular-nums}}
video.v916{{width:min(360px,100%);aspect-ratio:9/16;margin:20px auto 0}}
@media (max-width:720px){{.reel{{grid-template-columns:repeat(4,minmax(0,1fr))}}}}
.script{{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px 22px;font-size:16px}}
.script p{{display:grid;grid-template-columns:7.5em 1fr;gap:12px;padding:6px 0;border-bottom:1px dashed var(--line)}}
.script p:last-child{{border-bottom:0}}
.script span{{color:var(--sub);font-variant-numeric:tabular-nums;font-weight:700}}
@media (max-width:720px){{.scene{{grid-template-columns:1fr}}.script p{{grid-template-columns:1fr;gap:0}}}}
</style>
</head>
<body>
<main>
<header>
  <h1>キッズサポーター募集CM 絵コンテ</h1>
  <p class="meta">30秒・16:9・モーショングラフィックス　対象：高校生</p>
  <p class="lead">オープニングでオレンジの点が描く<b>笑顔のカーブ</b>を全体の目印にしました。高校生自身の気持ちから入り、資格不要という事実、具体的なお手伝い、始め方の手軽さと進めて、最後に同じカーブが<b>子どもの笑顔に、出会えるチャンス。</b>の下線として戻ってきます。音を消して見ても伝わるよう、ナレーションの内容はすべてテロップにも出しています。</p>
</header>
<video src="kids_supporter_cm.mp4" controls playsinline preload="metadata"></video>
<p class="note">動画は同じフォルダの kids_supporter_cm.mp4 を読み込みます。BGMと効果音は収録済みで、ナレーションは入っていません。</p>

<h2>カット割り</h2>
{scenes}

<h2>リール版 60秒・1080×1920</h2>
<p class="lead">Instagramリール向けに縦9:16で組み直した60秒版です。動きの速さは30秒版の半分ほどに落とし、1カットに4〜7秒をあてて、文字を読み終えてから次へ進むようにしました。冒頭は「子ども、好き？」「ちょっと、気になる。」に「でも、資格ないし…」を足し、次のカットの資格がなくてもへつなげています。お手伝いは1つずつ全画面で見せ、はじめ方は4ステップを点がゆっくりたどります。7.5秒目からは画面上部に「神奈川県 キッズサポーター募集」の名札を出し、途中から見た人にも何の投稿か分かるようにしました。文字はすべて上270px・下670px・左右65pxを避けた中央の帯に入れてあり、プロフィールグリッドの3:4表示でも欠けません。</p>
<div class="reel">{reel}</div>
<video class="v916" src="kids_supporter_reel.mp4" controls playsinline preload="metadata"></video>
<p class="note">カバー画像は kids_supporter_reel_cover.jpg です。キャプション内のURLはリンクにならないので、誘導は動画内の検索と、プロフィールのリンクに任せます。</p>

<h2>ナレーション原稿</h2>
<div class="script">
  <p><span>0:00 – 0:03</span>子ども、好き？　〈高校生〉ちょっと、気になるかも。</p>
  <p><span>0:04 – 0:07</span>資格がなくても、保育の現場を体験できる。</p>
  <p><span>0:08 – 0:10</span>キッズサポーター、募集中！</p>
  <p><span>0:10 – 0:16</span>あそびの見守り、おもちゃの消毒、工作の準備、給食の配膳。</p>
  <p><span>0:16 – 0:20</span>研修はスマホで約1時間。日にちも相談できます。</p>
  <p><span>0:21 – 0:22</span>〈子どもたち〉せんせい、あそぼ！　ありがとう！</p>
  <p><span>0:23 – 0:25</span>子どもの笑顔に、出会えるチャンス。</p>
  <p><span>0:27 – 0:29</span>神奈川県 キッズサポーターで、検索！</p>
</div>

<h2>参照した事実</h2>
<div class="facts"><dl>{facts}</dl>
<p class="src">出典：神奈川県 キッズサポーター募集ページ <a href="https://www.pref.kanagawa.jp/osirase/1386/kanagawa-kidssmile/kidssupport/">https://www.pref.kanagawa.jp/osirase/1386/kanagawa-kidssmile/kidssupport/</a>　2026年10月15日に確認</p></div>
</main>
</body>
</html>'''
    out = os.path.join(HERE, 'storyboard.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(page)
    print('wrote', out, f'{len(page) // 1024} KB')


if __name__ == '__main__':
    main()
