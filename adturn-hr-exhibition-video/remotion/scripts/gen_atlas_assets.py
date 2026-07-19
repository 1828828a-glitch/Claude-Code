import numpy as np, json
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

OUT = '/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/public/img'
INK = (59, 47, 35)  # セピアインク

W = H = 1300
rng = np.random.default_rng(7)

def bumpy_ellipse(cx, cy, w, h, bumps, br, seed):
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([cx-w/2, cy-h/2, cx+w/2, cy+h/2], fill=255)
    r = np.random.default_rng(seed)
    for i in range(bumps):
        a = (i/bumps)*2*np.pi + r.uniform(-0.08, 0.08)
        ex, ey = cx + np.cos(a)*w/2*0.97, cy + np.sin(a)*h/2*0.97
        rr = br*r.uniform(0.75, 1.3)
        d.ellipse([ex-rr, ey-rr, ex+rr, ey+rr], fill=255)
    return np.array(m) > 127

cerebrum = bumpy_ellipse(640, 560, 900, 560, 26, 46, 3)
temporal = bumpy_ellipse(430, 800, 380, 240, 14, 30, 4)
cerebellum = bumpy_ellipse(950, 880, 330, 220, 18, 22, 5)
stem = Image.new('L', (W, H), 0)
ds = ImageDraw.Draw(stem)
ds.polygon([(790, 880), (900, 880), (850, 1080), (770, 1080)], fill=255)
ds.ellipse([760, 1040, 860, 1120], fill=255)
stem = np.array(stem) > 127
union = cerebrum | temporal | cerebellum | stem

def bez(p0, p1, p2, p3, n=110):
    t = np.linspace(0, 1, n)[:, None]
    return ((1-t)**3)*np.array(p0) + 3*((1-t)**2)*t*np.array(p1) + 3*(1-t)*(t**2)*np.array(p2) + (t**3)*np.array(p3)

CURLS = [
    [(300,700),(220,560),(300,440),(390,520)], [(390,520),(360,450),(290,470),(300,540)],
    [(480,430),(430,340),(560,320),(560,430)], [(620,360),(700,320),(760,380),(720,460)],
    [(820,420),(920,360),(1000,440),(950,530)], [(1020,540),(1100,600),(1040,720),(950,660)],
    [(430,560),(540,510),(620,580),(700,540)], [(360,750),(470,680),(560,760),(640,700)],
    [(680,660),(780,610),(860,680),(920,620)], [(430,850),(520,800),(590,860),(540,910)],
    [(680,800),(760,760),(820,810),(780,860)],
]

# ── 銅版画スタイル描画関数 ──
def engrave(mask, curls=None, cerebellum_stripes=False, fname='etch.png'):
    # 擬似陰影: エッジ距離＋上からの光
    dist = ndimage.distance_transform_edt(mask)
    dist = dist / (dist.max() + 1e-6)
    ys = np.linspace(0, 1, H)[:, None]
    light = 0.35 + 0.65 * ys  # 下ほど暗い
    shade = np.clip((1 - dist) * 0.75 + light * 0.45, 0, 1) * mask
    out = Image.new('RGBA', (W, H), (0,0,0,0))
    dr = ImageDraw.Draw(out)
    # ハッチング: 波打つ平行線（濃さ=線の太さ）
    for y0 in range(0, H, 9):
        pts = []
        for x in range(0, W, 6):
            yy = y0 + 14*np.sin(x/85 + y0*0.13)
            iy, ix = int(np.clip(yy,0,H-1)), int(np.clip(x,0,W-1))
            if mask[iy, ix]:
                s = shade[iy, ix]
                pts.append((x, yy, s))
            else:
                if len(pts) > 3:
                    for (px, py, s) in pts:
                        wdt = 0.6 + s*2.4
                        a = int(120 + s*135)
                        dr.ellipse([px-wdt, py-wdt, px+wdt, py+wdt], fill=INK+(a,))
                pts = []
        if len(pts) > 3:
            for (px, py, s) in pts:
                wdt = 0.6 + s*2.4
                a = int(120 + s*135)
                dr.ellipse([px-wdt, py-wdt, px+wdt, py+wdt], fill=INK+(a,))
    # クロスハッチ: 暗部のみ斜め線
    for c0 in range(-H, W, 16):
        for t in range(0, H, 5):
            x, y = c0 + t, t
            if 0 <= x < W and 0 <= y < H and mask[y, x] and shade[y, x] > 0.62:
                dr.ellipse([x-1.1, y-1.1, x+1.1, y+1.1], fill=INK+(150,))
    # 輪郭（太め・版画の主線）
    edge = mask & ~ndimage.binary_erosion(mask, iterations=5)
    eys, exs = np.nonzero(edge)
    for x, y in zip(exs, eys):
        dr.ellipse([x-2.6, y-2.6, x+2.6, y+2.6], fill=INK+(255,))
    # しわの主線
    if curls:
        for c in curls:
            for x, y in bez(*c):
                dr.ellipse([x-3.4, y-3.4, x+3.4, y+3.4], fill=INK+(235,))
    if cerebellum_stripes:
        for k in range(4):
            for x, y in bez((845, 820+k*30), (925, 792+k*30), (1010, 800+k*30), (1078, 852+k*30)):
                dr.ellipse([x-1.8, y-1.8, x+1.8, y+1.8], fill=INK+(210,))
    return out

brain = engrave(union, CURLS, True)
brain.save(f'{OUT}/etch_brain.png')
print('etch_brain saved')

# ── 頭部側面プロフィール（版画・眉上で分割した2枚） ──
PW, PH = 1100, 1400
prof = Image.new('L', (PW, PH), 0)
dp = ImageDraw.Draw(prof)
# 側面シルエット（右向き）: 手置きの輪郭点
profile_pts = [
    (330,120),(470,90),(610,110),(720,180),(780,280),(800,380),(795,470),(775,540),  # 頭頂→額
    (800,590),(790,640),(760,660),(775,700),(755,730),(790,780),(770,830),(700,860), # 鼻・唇・顎
    (660,920),(640,1010),(660,1120),(700,1250),(700,1400),(240,1400),(260,1200),     # 首・肩
    (240,1000),(200,800),(180,600),(200,400),(240,240),
]
dp.polygon(profile_pts, fill=255)
pmask = np.array(prof) > 127
CUT_Y = 430  # 眉上
lower = pmask.copy(); lower[:CUT_Y, :] = False
lid = pmask.copy(); lid[CUT_Y:, :] = False

def save_part(mask_part, fname):
    global W, H, rng
    Wo, Ho = W, H
    W_, H_ = mask_part.shape[1], mask_part.shape[0]
    # engrave関数はW,Hグローバル依存なので差し替え
    globals()['W'], globals()['H'] = W_, H_
    img = engrave(mask_part, None, False)
    globals()['W'], globals()['H'] = Wo, Ho
    img.save(f'{OUT}/{fname}')
    print(fname, 'saved')

save_part(lower, 'etch_head_lower.png')
save_part(lid, 'etch_head_lid.png')

# ── 羊皮紙タイル ──
T = 512
noise = rng.normal(0, 1, (T, T))
noise = ndimage.gaussian_filter(noise, 3) * 10 + rng.normal(0, 2.2, (T, T))
base = np.stack([
    np.clip(242 + noise, 226, 250),
    np.clip(234 + noise*1.1, 216, 244),
    np.clip(214 + noise*1.3, 194, 228),
], axis=-1).astype(np.uint8)
Image.fromarray(base, 'RGB').save(f'{OUT}/paper_tile.png')
print('paper_tile saved')

# ── ⑤用: 脳の星座データ（正規化座標） ──
inner = ndimage.binary_erosion(union, iterations=16)
ys, xs = np.nonzero(inner)
idx = rng.choice(len(xs), size=64, replace=False)
stars = [[round(float(xs[i])/1300, 4), round(float(ys[i])/1300, 4)] for i in idx]
# 近傍を線で結ぶ（各点から最寄り2点）
pts = np.array([[s[0], s[1]] for s in stars])
edges = set()
for i in range(len(pts)):
    d = np.hypot(pts[:,0]-pts[i,0], pts[:,1]-pts[i,1])
    d[i] = 9
    for j in np.argsort(d)[:2]:
        edges.add(tuple(sorted((i, int(j)))))
# 輪郭の星（形が分かるように）
edge_m = union & ~ndimage.binary_erosion(union, iterations=3)
eys, exs = np.nonzero(edge_m)
idx2 = rng.choice(len(exs), size=56, replace=False)
outline = [[round(float(exs[i])/1300, 4), round(float(eys[i])/1300, 4)] for i in idx2]
with open('/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/src/cosmos/brainStars.json', 'w') as f:
    import os
    os.makedirs('/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/src/cosmos', exist_ok=True)
    json.dump({'stars': stars, 'edges': sorted(list(edges)), 'outline': outline}, f)
print('brainStars.json saved:', len(stars), 'stars,', len(edges), 'edges')
