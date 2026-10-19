# 使い方: python3 sheet.py <video> <t1,t2,...> <cols> <out>
import sys
from PIL import Image, ImageDraw
v, ts, cols, out = sys.argv[1], sys.argv[2].split(','), int(sys.argv[3]), sys.argv[4]
def name(t):
    f = float(t); s = str(int(f)) if f == int(f) else str(f)
    return f"frames_check/{v}_{s.replace('.', '_')}.png"
w, h = 270, 480
rows = (len(ts) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows), 'white')
d = ImageDraw.Draw(sheet)
for i, t in enumerate(ts):
    im = Image.open(name(t)).resize((w, h))
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    d.rectangle([(i % cols) * w, (i // cols) * h, (i % cols) * w + 60, (i // cols) * h + 22], fill='black')
    d.text(((i % cols) * w + 4, (i // cols) * h + 4), t, fill='white')
sheet.save(out)
