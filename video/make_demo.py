# 操作画面イメージで見せる研修紹介動画
import subprocess, os
from PIL import Image, ImageDraw
from make_motion import C, W, H, FPS, OUT, F, eo, eio, timg, paste, mask_up, fade_up, background, logo, mark, \
    s_title, s_list, s_network, s_end, frame

PX, PY, PW, PH = 1200, 50, 520, 980
SX, SY, SW, SH = PX + 20, PY + 20, PW - 40, PH - 40
INK = (35, 24, 21); GRAY = (120, 120, 116); LINE = (228, 228, 224)

def wrap(s, n):
    return [s[i:i+n] for i in range(0, len(s), n)]

def demo(case, author, post, query, answer, steps, extra=None):
    T0 = 1.0; TAP1 = 2.0; TYPE = 2.7; CH = 0.075
    TS = TYPE + len(query)*CH; SEND = TS + .4; ANS = SEND + 1.4
    HL = ANS + len(answer)*.45 + .3
    def f(fr, t):
        logo(fr)
        d = ImageDraw.Draw(fr, "RGBA")
        # 左パネル 手順
        ex = eo((t - HL - 1.6)/.6) if extra else 0
        mask_up(fr, timg(case[0], 42, C["acc2"]), 120, 180, t/.45)
        mask_up(fr, timg(case[1], 72, C["txt"]), 112, 236, (t-.15)/.5)
        if ex < 1:
            cur = max([i for i, (st, _) in enumerate(steps) if t >= st] or [-1])
            for i, (st, txt) in enumerate(steps):
                p = eo((t - st)/.5)
                if p <= 0: continue
                y = 400 + i*130; on = i == cur
                a = p*(1-ex)
                d.rounded_rectangle((120, y, 1080, y+108), 20, fill=(C["acc"] if on else C["card"])+(int(255*a),))
                d.ellipse((146, y+24, 206, y+84), fill=(INK if on else C["acc2"])+(int(255*a),))
                paste(fr, timg(str(i+1), 34, (255, 255, 255)), 165 if i < 9 else 155, y+28, a)
                lines = txt.split("\n")
                for k, ln in enumerate(lines):
                    paste(fr, timg(ln, 36 if len(lines) == 1 else 32, C["txt"]), 236 + (1-p)*30, y + (30 if len(lines) == 1 else 14 + k*42), a)
        if extra and ex > 0: extra(fr, t - HL - 1.6)
        # スマホ
        sp = eo((t - .2)/.7); ox = (1 - sp)*700
        d.rounded_rectangle((PX+ox+10, PY+16, PX+PW+ox+10, PY+PH+16), 64, fill=(0, 0, 0, 30))
        d.rounded_rectangle((PX+ox, PY, PX+PW+ox, PY+PH), 64, fill=INK)
        scr = Image.new("RGBA", (SW, SH), (255, 255, 255, 255)); s = ImageDraw.Draw(scr, "RGBA")
        s.rectangle((0, 0, SW, 110), fill=(250, 250, 248)); s.line((0, 110, SW, 110), fill=LINE, width=2)
        scr.alpha_composite(timg("タイムライン", 30, INK), (30, 50))
        s.rounded_rectangle((SW/2-60, 14, SW/2+60, 40), 13, fill=INK)
        # 元の投稿
        y = 130
        s.ellipse((24, y, 84, y+60), fill=C["acc"]); scr.alpha_composite(timg(author, 26, INK), (100, y+4))
        scr.alpha_composite(timg("@" + "account · 2時間", 20, GRAY), (100, y+38))
        for k, ln in enumerate(post): scr.alpha_composite(timg(ln, 26, INK), (30, y+82+k*40))
        iy = y + 92 + len(post)*40
        for k, lab in enumerate(["返信", "共有", "♡ 128"]):
            scr.alpha_composite(timg(lab, 22, GRAY), (40 + k*130, iy))
        s.line((0, iy+50, SW, iy+50), fill=LINE, width=2)
        y = iy + 70
        # 送信済みリプライ
        if t > SEND:
            a = eo((t-SEND)/.4); lines = wrap(query, 15)
            bh = 30 + len(lines)*38
            s.rounded_rectangle((90, y, SW-24, y+bh), 22, fill=C["acc"]+(int(255*a),))
            for k, ln in enumerate(lines): paste(scr, timg(ln, 26, INK), 112, y+14+k*38, a)
            y += bh + 24
            # Grok 返答
            if t > SEND + .5:
                s.ellipse((24, y, 74, y+50), fill=INK); paste(scr, timg("G", 26, (255, 255, 255)), 40, y+8)
                scr.alpha_composite(timg("Grok", 24, INK), (90, y+10))
                y += 64
                if t < ANS:
                    for k in range(3):
                        r = 8 + 4*abs(((t*3 + k*.33) % 1) - .5)
                        cx = 110 + k*34; s.ellipse((cx-r, y+20-r, cx+r, y+20+r), fill=GRAY)
                else:
                    for k, ln in enumerate(answer):
                        p = (t - ANS - k*.45)/.4
                        if p > 0: fade_up(scr, timg(ln, 25, INK), 40, y + k*44, p, 12)
                    hp = eo((t - HL)/.5)
                    if hp > 0:
                        hy = y + (len(answer)-1)*44 - 6
                        s.rounded_rectangle((26, hy, 26+(SW-52)*hp, hy+46), 10, outline=C["acc2"], width=4)
        # 入力欄
        cy = SH - 120
        s.line((0, cy, SW, cy), fill=LINE, width=2)
        s.rounded_rectangle((20, cy+24, SW-110, cy+90), 33, fill=(244, 244, 240))
        if TYPE <= t < SEND:
            n = min(len(query), int((t - TYPE)/CH)); txt = query[:n]
            vis = txt[-13:] + ("|" if int(t*3) % 2 else "")
            scr.alpha_composite(timg(vis, 26, INK), (40, cy+40))
        else:
            scr.alpha_composite(timg("返信を入力", 26, (170, 170, 166)), (40, cy+40))
        s.ellipse((SW-94, cy+24, SW-28, cy+90), fill=C["acc2"]); paste(scr, timg("送信", 22, (255, 255, 255)), SW-83, cy+42)
        # 角丸マスク
        m = Image.new("L", (SW, SH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, SW, SH), 46, fill=255); scr.putalpha(m)
        fr.alpha_composite(scr, (int(SX+ox), SY))
        paste(fr, timg("※画面はイメージです", 22, GRAY), PX+150, PY+PH+8, sp)
        # 指
        def finger(x, y, tap):
            d.ellipse((x-34, y-34, x+34, y+34), fill=(35, 24, 21, 70), outline=(255, 255, 255, 200), width=3)
            if 0 < tap < .6:
                r = 34 + tap*120; d.ellipse((x-r, y-r, x+r, y+r), outline=C["acc2"]+(int(255*(1-tap/.6)),), width=5)
        rx, ry = SX + 70, SY + iy + 14; sx_, sy_ = SX + SW - 61, SY + cy + 57
        if 1.2 < t < TYPE:
            p = eio((t - 1.2)/.8); finger(rx + (1-p)*200, ry + (1-p)*300, t - TAP1)
        elif TS - .2 < t < SEND + .8:
            p = eio((t - TS + .2)/.6); finger(rx + (sx_-rx)*p, ry + (sy_-ry)*p, t - SEND)
    dur = HL + (5.5 if extra else 2.6)
    return f, dur

def report(fr, t):
    d = ImageDraw.Draw(fr, "RGBA"); p = eo(t/.6)
    d.rounded_rectangle((120, 380+(1-p)*40, 1080, 980), 24, fill=(255, 255, 255, int(255*p)), outline=INK+(int(255*p),), width=3)
    paste(fr, timg("放送後レポート", 40, INK), 170, 420, p)
    paste(fr, timg("リスナーの声から見えた反響", 28, GRAY), 170, 476, p)
    for i, (lab, v, col) in enumerate([("好意的", .68, C["acc2"]), ("中立", .24, (190, 200, 180)), ("否定的", .08, (200, 160, 150))]):
        y = 560 + i*90; q = eo((t - .6 - i*.25)/.8)
        paste(fr, timg(lab, 30, INK), 170, y, p)
        d.rounded_rectangle((330, y+4, 330+560, y+44), 10, fill=(240, 240, 236, int(255*p)))
        if q > 0: d.rounded_rectangle((330, y+4, 330+560*v*q, y+44), 10, fill=col)
        paste(fr, timg(f"{int(v*100*q)}%", 30, INK), 910, y+2, q)
    fade_up(fr, timg("次回提案 平日7時台の帯で継続出稿を", 34, C["acc2"]), 170, 860, (t-1.6)/.6)
    paste(fr, timg("※数値はイメージ", 22, GRAY), 880, 930, p)

def s_hook(fr, t):
    mask_up(fr, timg("Grokに聞くだけで", 64, C["acc2"]), 300, 340, t/.5)
    mask_up(fr, timg("営業の下調べが変わる。", 120, C["txt"]), 290, 440, (t-.3)/.6)
    fade_up(fr, timg("実際の操作イメージで見てみましょう", 44, C["sub"]), 300, 640, (t-1.0)/.6)
    p = eo((t-.6)/.6)
    if p > 0: mark(fr, 1400, 380, 200, p, t)

D1 = demo(("CASE 1  新規営業", "訪問前に評判を下調べ"), "まちのパン工房",
          ["新作の朝限定カレーパン、", "今日も7時に完売しました！", "明日も焼きます！"],
          "@grok このお店の最近の評判と話題をまとめて",
          ["朝限定商品が話題で完売続き", "通勤前に寄る人の投稿が多い", "家族連れの週末投稿も増加", "→ 朝の通勤帯と相性が良い"],
          [(1.0, "見込み先の投稿をひらく"), (2.0, "返信ボタンをタップ"), (2.7, "@grok と書いて質問する"), (6.6, "数秒で評判の要約が届く"), (8.6, "朝の番組で提案する\n仮説がもうできている")])
D2 = demo(("CASE 2  既存営業", "放送後の反響を集める"), "リスナーさん",
          ["朝の番組で流れてたCMの", "スーパーのセール、行ってきた！", "ラジオで知ったの初めてかも"],
          "@grok このCMへのリスナーの反応を集めて",
          ["好意的な声が約7割", "「ラジオで知った」が多数", "平日朝の聴取者に届いている", "→ 朝帯の継続出稿を提案"],
          [(1.0, "クライアント名で話題の投稿を探す"), (2.0, "返信ボタンをタップ"), (2.7, "@grok で反応を集めさせる"), (6.4, "反響が言葉でまとまる"), (8.4, "そのまま報告書と\n次の提案に使える")],
          extra=report)

SC = [(s_title, 4.2), (s_hook, 3.6), D1, D2,
      (s_list("研修の中身", "半日で手が動くところまで", ["Grok Botの基本操作と、拾える投稿・拾えない投稿", "営業シーン別プロンプトをその場で作る", "誤情報とコンプライアンスの線引き", "局をまたいだグループワークで提案書を1枚"]), 6.5),
      (s_network, 5.5), (s_end, 5)]

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        for s in map(float, sys.argv[1:]): frame(s, SC).convert("RGB").save(os.path.join(OUT, f"pv_{s:.1f}.png"))
        sys.exit()
    total = sum(d for _, d in SC); print(total)
    out = os.path.join(OUT, "grok_training_demo.mp4")
    pr = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for k in range(int(total*FPS)): pr.stdin.write(frame(k/FPS, SC).convert("RGB").tobytes())
    pr.stdin.close(); pr.wait()
