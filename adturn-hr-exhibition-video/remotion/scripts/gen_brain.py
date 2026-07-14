import numpy as np
from PIL import Image, ImageDraw
from scipy.spatial import Delaunay
from scipy import ndimage

rng = np.random.default_rng(21)
W = H = 1300

# ── 脳（側面ビュー）: 大脳＋小脳＋脳幹。輪郭に脳回のコブ、内部にしわのライン ──
def bumpy_ellipse(cx, cy, w, h, bumps, br, seed):
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([cx-w/2, cy-h/2, cx+w/2, cy+h/2], fill=255)
    r = np.random.default_rng(seed)
    for i in range(bumps):
        a = (i/bumps)*2*np.pi + r.uniform(-0.08, 0.08)
        ex = cx + np.cos(a)*w/2*0.97
        ey = cy + np.sin(a)*h/2*0.97
        rr = br*r.uniform(0.75, 1.3)
        d.ellipse([ex-rr, ey-rr, ex+rr, ey+rr], fill=255)
    return np.array(m) > 127

# 大脳: 前頭葉(左)が丸く、後頭葉(右)へ流れる大きな塊
cerebrum = bumpy_ellipse(640, 560, 900, 560, bumps=26, br=46, seed=3)
# 側頭葉の張り出し（左下）
temporal = bumpy_ellipse(430, 800, 380, 240, bumps=14, br=30, seed=4)
# 小脳（右下・細かいコブ）
cerebellum = bumpy_ellipse(950, 880, 330, 220, bumps=18, br=22, seed=5)
# 脳幹
stem = Image.new('L', (W, H), 0)
ds = ImageDraw.Draw(stem)
ds.polygon([(790, 880), (900, 880), (850, 1080), (770, 1080)], fill=255)
ds.ellipse([760, 1040, 860, 1120], fill=255)
stem = np.array(stem) > 127

union = cerebrum | temporal | cerebellum | stem

PAL = [
    '#E91E63','#F06292','#EC407A','#F48FB1',
    '#26A69A','#4DB6AC','#80CBC4',
    '#FF7043','#FFA726','#FFD54F','#FB8C00',
    '#66BB6A','#A5D6A7',
    '#42A5F5','#5C6BC0','#7E57C2','#B39DDB',
    '#EF5350','#F8BBD0',
]
WHITES = ['#FFFFFF','#F4F6FA']
def hex2rgb(s): return tuple(int(s[i:i+2],16) for i in (1,3,5))

out = Image.new('RGBA', (W, H), (0,0,0,0))
dr = ImageDraw.Draw(out)

# ── ステッカー風の縁取り（濃紺） ──
ring = ndimage.binary_dilation(union, iterations=10)
ring_arr = (ring*255).astype(np.uint8)
ring_l = Image.fromarray(ring_arr, 'L')
navy = Image.new('RGBA', (W, H), (39, 47, 74, 255))
out.paste(navy, (0, 0), ring_l)

def triangulate(mask, seed, step=78):
    r = np.random.default_rng(seed)
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pts = []
    for gy in range(y0, y1+1, step):
        for gx in range(x0, x1+1, step):
            px, py = gx + r.uniform(-26, 26), gy + r.uniform(-26, 26)
            ix, iy = int(np.clip(px,0,W-1)), int(np.clip(py,0,H-1))
            if mask[iy, ix]: pts.append((px, py))
    edge = mask & ~ndimage.binary_erosion(mask, iterations=3)
    eys, exs = np.nonzero(edge)
    idx = r.choice(len(exs), size=min(190, len(exs)), replace=False)
    for i in idx: pts.append((float(exs[i]), float(eys[i])))
    pts = np.array(pts)
    tri = Delaunay(pts)
    for s in tri.simplices:
        p = pts[s]
        cx, cy = p.mean(axis=0)
        if not mask[int(np.clip(cy,0,H-1)), int(np.clip(cx,0,W-1))]: continue
        u = r.uniform()
        col = hex2rgb(WHITES[int(r.uniform()*2)]) if u < 0.13 else hex2rgb(PAL[int(r.uniform()*len(PAL))])
        dr.polygon([tuple(q) for q in p], fill=col + (255,))

triangulate(cerebrum, 7)
triangulate(temporal, 11, step=64)
triangulate(cerebellum, 13, step=52)
triangulate(stem, 17, step=50)

# ── 脳のしわ（脳回）: ベジェ曲線の白ラインで「脳」と一目で分かるように ──
def bez(p0, p1, p2, p3, n=90):
    t = np.linspace(0, 1, n)[:, None]
    P = ((1-t)**3)*np.array(p0) + 3*((1-t)**2)*t*np.array(p1) + 3*(1-t)*(t**2)*np.array(p2) + (t**3)*np.array(p3)
    return P

CURLS = [
    # 前頭葉（左端）: 縦向きの巻き
    [(300,700),(220,560),(300,440),(390,520)],
    [(390,520),(360,450),(290,470),(300,540)],
    # 頭頂 左寄りの小フック（下向き）
    [(480,430),(430,340),(560,320),(560,430)],
    # 頭頂 中央のうねり（右肩下がり）
    [(620,360),(700,320),(760,380),(720,460)],
    [(720,460),(770,420),(750,360),(690,380)],
    # 頭頂 右の斜めアーチ
    [(820,420),(920,360),(1000,440),(950,530)],
    # 後頭葉（右端）: 縦巻き
    [(1020,540),(1100,600),(1040,720),(950,660)],
    # 中央やや上の短いS
    [(430,560),(540,510),(620,580),(700,540)],
    # 中央下の逆S（左右で高さを変えて口に見えないように）
    [(360,750),(470,680),(560,760),(640,700)],
    [(680,660),(780,610),(860,680),(920,620)],
    # 側頭葉の小さな巻き
    [(430,850),(520,800),(590,860),(540,910)],
    [(540,910),(580,870),(540,830),(490,860)],
    # 下中央の短いフック
    [(680,800),(760,760),(820,810),(780,860)],
]
def stroke(P, radius, color):
    for x, y in P:
        dr.ellipse([x-radius, y-radius, x+radius, y+radius], fill=color)

for c in CURLS:
    P = bez(*c)
    stroke(P, 8, (39, 47, 74, 185))
# 小脳の縞（細かい並行アーク）
for k in range(3):
    P = bez((850, 830+k*36), (930, 800+k*36), (1010, 810+k*36), (1075, 860+k*36))
    stroke(P, 6, (39, 47, 74, 200))

out.save('/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/public/img/brain.png')
print('saved')
