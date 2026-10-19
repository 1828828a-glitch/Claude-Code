# 使い方: python3 mp4sheet.py <mp4> <step> <out>
import subprocess, sys, os
from PIL import Image, ImageDraw
mp4, step, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]))
ts = []; t = step / 2
while t < dur: ts.append(round(t, 2)); t += step
w, h, cols = 216, 384, 11
rows = (len(ts) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows), 'white'); d = ImageDraw.Draw(sheet)
for i, t in enumerate(ts):
    f = f'/tmp/_f.png'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(t), '-i', mp4, '-frames:v', '1', f])
    im = Image.open(f).resize((w, h)); x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y)); d.rectangle([x, y, x + 44, y + 18], fill='black'); d.text((x + 3, y + 3), str(t), fill='white')
sheet.save(out)
