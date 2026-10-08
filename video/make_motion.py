# 企画・宣伝協同組合 Grok Bot活用 生成AI研修 モーショングラフィック版
# 配色はPALETTE、ロゴは video/logo.png を置けば合成される
import subprocess, os, math, random
from PIL import Image, ImageDraw, ImageFont

C = dict(bg1=(255, 255, 255), bg2=(246, 249, 241), acc=(216, 232, 200), acc2=(104, 146, 80),
         txt=(35, 24, 21), sub=(110, 110, 104), card=(238, 245, 230), line=(200, 200, 196))
ORG = "企画・宣伝協同組合"
W, H, FPS = 1920, 1080, 30
FB = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"
OUT = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(OUT, "logo.png")
_fc = {}
def F(s):
    if s not in _fc: _fc[s] = ImageFont.truetype(FB, s)
    return _fc[s]

def eo(t): t = max(0, min(1, t)); return 1 - (1 - t) ** 3
def eio(t): t = max(0, min(1, t)); return 4*t*t*t if t < .5 else 1 - (-2*t+2)**3/2

_tc = {}
def timg(s, size, col):
    k = (s, size, col)
    if k not in _tc:
        f = F(size); b = f.getbbox(s); w, h = b[2] + 8, int(size * 1.35)
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); ImageDraw.Draw(im).text((0, int(size*.1)), s, font=f, fill=col)
        _tc[k] = im
    return _tc[k]

def paste(fr, im, x, y, a=1.0):
    if a <= 0: return
    if a < 1:
        im = im.copy(); al = im.getchannel("A").point(lambda v: int(v * a)); im.putalpha(al)
    fr.alpha_composite(im, (int(x), int(y)))

def mask_up(fr, im, x, y, p):
    # 下からせり上がるマスク表示
    if p <= 0: return
    dy = int((1 - eo(p)) * im.height)
    if dy >= im.height: return
    fr.alpha_composite(im.crop((0, 0, im.width, im.height - dy)), (int(x), int(y + dy)))

def fade_up(fr, im, x, y, p, d=40):
    paste(fr, im, x, y + (1 - eo(p)) * d, eo(p))

# 背景
BG = Image.new("RGBA", (W, H))
dg = ImageDraw.Draw(BG)
for yy in range(H):
    t = yy / H; dg.line([(0, yy), (W, yy)], fill=tuple(int(C["bg1"][i]*(1-t)+C["bg2"][i]*t) for i in range(3)))
random.seed(3)
PTS = [(random.uniform(0, W), random.uniform(0, H), random.uniform(2, 5), random.uniform(.2, .8)) for _ in range(60)]

def background(T):
    fr = BG.copy(); d = ImageDraw.Draw(fr, "RGBA")
    for i, r in enumerate((520, 700, 880)):
        cx, cy = W + 120 + 40*math.sin(T*.3+i), H//2 + 30*math.cos(T*.25+i)
        d.ellipse((cx-r, cy-r, cx+r, cy+r), outline=(226, 234, 218), width=2)
        a = T*.6*(1 if i % 2 else -1) + i
        d.arc((cx-r, cy-r, cx+r, cy+r), math.degrees(a), math.degrees(a)+40, fill=C["acc"]+(255,), width=6)
    for x, y, s, v in PTS:
        yy = (y - T*v*40) % H
        d.ellipse((x-s/2, yy-s/2, x+s/2, yy+s/2), fill=C["acc"]+(200,))
    # 音波バー(ラジオのモチーフ)
    for i in range(48):
        hh = 14 + 46*abs(math.sin(T*2.2 + i*.45)) * (0.5+0.5*math.sin(i*.3+T))
        x = 80 + i*16; d.rectangle((x, H-40-hh, x+7, H-40), fill=C["acc"])
    return fr

def logo(fr, a=1.0):
    if os.path.exists(LOGO):
        lg = Image.open(LOGO).convert("RGBA"); lg.thumbnail((360, 100)); paste(fr, lg, W-lg.width-80, 56, a)
    else:
        mark(fr, 80, 60, 84, a); paste(fr, timg(ORG, 34, C["txt"]), 236, 78, a)

def mark(fr, x, y, h, a=1.0, spin=0.0):
    # ロゴの十字と3つの丸のマーク
    w = h*1.6; u = h/10; al = int(255*a); d = ImageDraw.Draw(fr, "RGBA")
    d.rectangle((x, y, x+w, y+h), fill=C["acc"]+(al,))
    cx, cy = x+w*.28, y+h*.5; L, T2 = h*.28, h*.075
    d.rectangle((cx-L, cy-T2, cx+L, cy+T2), fill=(255,255,255,al)); d.rectangle((cx-T2, cy-L, cx+T2, cy+L), fill=(255,255,255,al))
    for dx, dy in ((.62, .3), (.5, .68), (.8, .68)):
        r = h*.09*(1+.25*math.sin(spin*6+dx*9)); px, py = x+w*dx, y+h*dy
        d.ellipse((px-r, py-r, px+r, py+r), fill=(255,255,255,al))

# ---- シーン ----
def s_intro(fr, t):
    words = ["拾う。", "読む。", "提案する。"]
    for i, w in enumerate(words):
        st = i*1.0
        im = timg(w, 200, C["txt"] if i < 2 else C["acc"])
        if t >= st:
            out = eio((t - st - 0.85)/0.25) if i < 2 else 0
            x = W/2 - im.width/2
            fr2 = Image.new("RGBA", (W, H), (0,0,0,0)); mask_up(fr2, im, x, H/2-im.height/2, (t-st)/0.45)
            paste(fr, fr2, -out*W*0.15, 0, 1-out)
    d = ImageDraw.Draw(fr); p = eo((t-2.2)/0.8)
    if p > 0: d.rectangle((W/2-300*p, H/2+150, W/2+300*p, H/2+158), fill=C["acc2"])

def s_title(fr, t):
    logo(fr, eo(t/0.6))
    mask_up(fr, timg("ラジオ営業のための", 54, C["acc2"]), 160, 280, (t-.2)/.5)
    mask_up(fr, timg("Grok Bot活用", 150, C["txt"]), 150, 360, (t-.4)/.6)
    mask_up(fr, timg("生成AI研修", 150, C["txt"]), 150, 560, (t-.6)/.6)
    p = eo((t-1.1)/.7); ImageDraw.Draw(fr).rectangle((160, 790, 160+720*p, 802), fill=C["acc"])
    pm = eo((t-.8)/.6)
    if pm > 0: mark(fr, 1260, 360 + (1-pm)*40, 300, pm, t)
    fade_up(fr, timg("各ラジオ局 営業担当者 合同研修", 46, C["sub"]), 160, 830, (t-1.4)/.6)

def s_news(fr, t):
    logo(fr)
    mask_up(fr, timg("NEW", 44, C["acc2"]), 140, 250, t/.4)
    mask_up(fr, timg("Grokが", 96, C["txt"]), 140, 320, (t-.2)/.5)
    mask_up(fr, timg("Xの投稿を", 96, C["txt"]), 140, 450, (t-.35)/.5)
    mask_up(fr, timg("拾って答える。", 96, C["acc2"]), 140, 580, (t-.5)/.5)
    fade_up(fr, timg("@grok とリプライするだけで文脈を読む", 40, C["sub"]), 145, 760, (t-.9)/.6)
    # 投稿モック
    d = ImageDraw.Draw(fr, "RGBA"); X0, Y0 = 1040, 200
    p = eo((t-.6)/.7); ox = (1-p)*120
    if p > 0:
        d.rounded_rectangle((X0+ox, Y0, X0+760+ox, Y0+230), 24, fill=C["card"]+(int(240*p),))
        d.ellipse((X0+30+ox, Y0+30, X0+90+ox, Y0+90), fill=C["acc"]+(int(255*p),))
        paste(fr, timg("リスナーの投稿", 30, C["sub"]), X0+110+ox, Y0+38, p)
        paste(fr, timg("今朝のラジオで紹介してた新商品、", 36, C["txt"]), X0+40+ox, Y0+110, p)
        paste(fr, timg("帰りに買ってみた！めっちゃ美味しい", 36, C["txt"]), X0+40+ox, Y0+160, p)
    q = "@grok この話題の反応をまとめて"
    n = int(max(0, (t-1.6)/0.06))
    if t > 1.5:
        a = eo((t-1.5)/.3)
        d.rounded_rectangle((X0+120, Y0+270, X0+760, Y0+360), 24, fill=C["acc"]+(int(255*a),))
        s = q[:min(n, len(q))] + ("｜" if n < len(q) and int(t*4) % 2 else "")
        if s: paste(fr, timg(s, 34, C["txt"]), X0+150, Y0+292)
    st = 1.6 + len(q)*0.06 + .3
    if t > st:
        a = eo((t-st)/.5)
        d.rounded_rectangle((X0, Y0+400, X0+760, Y0+400+300*a), 24, fill=(255, 255, 255, 255), outline=C["txt"], width=3)
        paste(fr, timg("Grok", 32, C["acc2"]), X0+36, Y0+420, a)
        for i, line in enumerate(["好意的な反応が多数。", "「通勤中に聴いて買った」の声が目立つ", "20〜30代の関心が高い傾向"]):
            pp = (t - st - .5 - i*.35)/.4
            fade_up(fr, timg(line, 32, (20, 30, 60)), X0+36, Y0+480+i*60, pp, 15)

def s_list(kicker, title, items):
    def f(fr, t):
        logo(fr)
        mask_up(fr, timg(kicker, 46, C["acc2"]), 160, 210, t/.45)
        mask_up(fr, timg(title, 92, C["txt"]), 150, 270, (t-.15)/.55)
        d = ImageDraw.Draw(fr, "RGBA")
        for i, it in enumerate(items):
            y = 450 + i*130; p = eo((t - .6 - i*.22)/.6)
            if p <= 0: continue
            x = 160 + (1-p)*200
            d.rounded_rectangle((x, y, x+(W-320)*p, y+108), 18, fill=C["card"]+(255,))
            d.rectangle((x, y, x+10, y+108), fill=C["acc2"])
            paste(fr, timg(f"{i+1:02d}", 46, C["acc2"]), x+40, y+24, p)
            paste(fr, timg(it, 44, C["txt"]), x+150, y+26, eo((t-.8-i*.22)/.5))
    return f

def s_network(fr, t):
    logo(fr)
    mask_up(fr, timg("合同開催だから", 46, C["acc2"]), 160, 240, t/.45)
    mask_up(fr, timg("他局の使い方が", 92, C["txt"]), 150, 310, (t-.15)/.55)
    mask_up(fr, timg("いちばんの教材になる。", 92, C["acc2"]), 150, 440, (t-.3)/.55)
    fade_up(fr, timg("同じ道具でも、局ごとに使い方は違う。その差を持ち帰る。", 40, C["sub"]), 160, 640, (t-.9)/.6)
    d = ImageDraw.Draw(fr, "RGBA"); cx, cy, R = 1500, 620, 230
    nodes = [(cx + R*math.cos(math.radians(-90+72*i + t*8)), cy + R*math.sin(math.radians(-90+72*i + t*8))) for i in range(5)]
    for i in range(5):
        for j in range(i+1, 5):
            p = eo((t - 1.0 - (i+j)*.08)/.6)
            if p > 0:
                a, b = nodes[i], nodes[j]
                d.line([a, (a[0]+(b[0]-a[0])*p, a[1]+(b[1]-a[1])*p)], fill=C["acc2"]+(150,), width=3)
    for i, (x, y) in enumerate(nodes):
        p = eo((t - .5 - i*.12)/.4); r = 48*p
        if r > 0:
            d.ellipse((x-r, y-r, x+r, y+r), fill=C["card"], outline=C["acc2"], width=4)
            paste(fr, timg(f"{chr(65+i)}局", 30, C["txt"]), x-28, y-22, p)
    p = eo((t-2.2)/.5); r = 70*p
    if r > 0:
        d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=C["txt"]); paste(fr, timg("Grok", 34, C["bg1"]), cx-44, cy-24, p)

def s_end(fr, t):
    mask_up(fr, timg("新規も、既存も、提案の鮮度を上げる。", 64, C["txt"]), W/2-570, 300, t/.6)
    im = timg(ORG, 110, C["txt"])
    mask_up(fr, im, W/2-im.width/2, 470, (t-.5)/.7)
    p = eo((t-1.0)/.7); ImageDraw.Draw(fr).rectangle((W/2-400*p, 640, W/2+400*p, 648), fill=C["acc"])
    im2 = timg("研修日程・費用はお気軽にご相談ください", 44, C["sub"])
    fade_up(fr, im2, W/2-im2.width/2, 690, (t-1.3)/.6)
    p = eo((t-1.6)/.6)
    if p > 0: mark(fr, W/2-96, 800 + (1-p)*30, 120, p, t)
    im3 = timg("Planning Advertising Cooperative Association", 30, C["sub"]); fade_up(fr, im3, W/2-im3.width/2, 950, (t-1.9)/.6)

SC = [(s_intro, 3.6), (s_title, 5), (s_news, 8.5),
      (s_list("新規営業で使う", "訪問前の5分で仮説を作る", ["見込み先の公式Xと口コミの空気を要約", "地域で伸びている話題から番組連動の切り口", "競合キャンペーンの投稿を拾って比較"]), 5.5),
      (s_list("既存営業で使う", "提案の鮮度を上げる", ["出稿中クライアントへの反応をリスナー投稿から拾う", "放送後の反響を、数字の前に言葉で報告", "次の季節企画のネタを先回りで持っていく"]), 5.5),
      (s_list("研修の中身", "半日で手が動くところまで", ["Grok Botの基本操作と、拾える投稿・拾えない投稿", "営業シーン別プロンプトをその場で作る", "誤情報とコンプライアンスの線引き", "局をまたいだグループワークで提案書を1枚"]), 6.5),
      (s_network, 6), (s_end, 5)]
WIPE = .45

def frame(T):
    acc = 0
    for i, (fn, dur) in enumerate(SC):
        if T < acc + dur or i == len(SC)-1:
            t = T - acc; fr = background(T); fn(fr, t)
            d = ImageDraw.Draw(fr)
            if i < len(SC)-1 and t > dur - WIPE:     # ワイプイン
                p = eio((t-(dur-WIPE))/WIPE); d.polygon([(0,0),(W*1.2*p,0),(W*1.2*p-300,H),(0,H)], fill=C["acc"])
            if i > 0 and t < WIPE:                    # ワイプアウト
                p = eio(t/WIPE); x0 = W*1.2*p; d.polygon([(x0,0),(W+400,0),(W+400,H),(x0-300,H)], fill=C["acc"])
            if i == len(SC)-1 and t > dur - .6:
                fr = Image.blend(fr, Image.new("RGBA", (W, H), C["bg1"]+(255,)), eo((t-(dur-.6))/.6))
            return fr
        acc += dur

total = sum(d for _, d in SC)
out = os.path.join(OUT, "grok_training_motion.mp4")
pr = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
for k in range(int(total*FPS)):
    pr.stdin.write(frame(k/FPS).convert("RGB").tobytes())
pr.stdin.close(); pr.wait()
for s in (2.0, 7.5, 12.5, 30.0, 38.5):
    frame(s).convert("RGB").save(os.path.join(OUT, f"preview_{s:.1f}.png"))
