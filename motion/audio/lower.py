# 合成した声を、アクセントの形はそのままに低く落ち着いた声へ作り替える。
# WORLD で声の高さと声道の響きを分けて取り出し、高さを下げ、響きを少し下へずらして組み立て直す
import sys, numpy as np, soundfile as sf, pyworld as pw
src, dst, f0_ratio, formant, flat = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
x, sr = sf.read(src); x = x.astype(np.float64)
f0, t = pw.harvest(x, sr, f0_floor=120, f0_ceil=700, frame_period=5.0)
sp = pw.cheaptrick(x, f0, t, sr); ap = pw.d4c(x, f0, t, sr)
v = f0 > 0
med = np.exp(np.mean(np.log(f0[v])))
if f0_ratio > 10: f0_ratio = f0_ratio / med  # 10より大きい値は、そろえたい高さ(Hz)として扱う
f0n = np.zeros_like(f0)
f0n[v] = np.exp(np.log(med) + (np.log(f0[v]) - np.log(med)) * flat) * f0_ratio  # flat<1 で抑揚の幅を狭める
n = sp.shape[1]; idx = np.arange(n) / formant  # formant<1 で響きを低いほうへ
sp2 = np.stack([np.interp(idx, np.arange(n), row, right=row[-1]) for row in sp])
ap2 = np.stack([np.interp(idx, np.arange(n), row, right=row[-1]) for row in ap])
y = pw.synthesize(f0n, sp2, ap2, sr, frame_period=5.0)
y = y / max(1e-9, np.abs(y).max()) * 0.9
sf.write(dst, y, sr)
print(dst, "f0", int(med), "->", int(med * f0_ratio), "len", round(len(y) / sr, 2))
