"""投稿された絵や写真を、琳派・花鳥画風の草花スプライトに変換する。

生成モデルは使わず、決定論的な画像処理で「墨線 + 岩絵具 + 和紙」の質感を作る。
外部の画像生成APIに差し替えたい場合は README の「変換バックエンドの差し替え」を参照。
"""

from __future__ import annotations

import io
from collections import deque
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageFilter, ImageOps

MAX_SIDE = 512          # スプライトの最大辺
HOLE_FILL_SIDE = 192    # 穴埋め用に縮小して探索する解像度

# 岩絵具を意識した和の顔料パレット
PIGMENTS = np.array(
    [
        (43, 40, 38),      # 墨
        (98, 66, 118),     # 紫紺
        (77, 92, 152),     # 群青
        (71, 130, 106),    # 緑青
        (66, 96, 62),      # 松葉
        (145, 178, 74),    # 若草
        (194, 212, 186),   # 白緑
        (242, 178, 45),    # 山吹
        (183, 145, 79),    # 黄土
        (176, 63, 79),     # 臙脂
        (238, 190, 197),   # 桜
        (242, 240, 233),   # 胡粉
    ],
    dtype=np.float32,
) / 255.0

# 人間の輝度感度に寄せた距離の重み
_CHANNEL_WEIGHT = np.array([0.30, 0.59, 0.11], dtype=np.float32)


@dataclass
class Sprite:
    """変換結果。root_x は根元の位置（スプライト幅に対する 0..1）。"""

    image: Image.Image
    root_x: float
    bloom_color: tuple[int, int, int]


def stylize(raw: bytes, *, source: str = "photo", cutout: bool = True) -> Sprite:
    """画像バイト列を草花スプライト（透過PNG相当のRGBA）に変換する。"""
    img = _load(raw)
    mask = _subject_mask(img, source=source, cutout=cutout)
    img, mask = _crop_to_subject(img, mask)

    rgb = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    flat = _flatten(rgb)
    painted = _pigment_map(flat)
    ink = _ink_lines(rgb, mask)

    out = painted * (1.0 - ink[..., None] * 0.92)
    out = _pigment_wash(out, mask)
    out = _paper_grain(out)
    out, alpha = _bleed_edges(out, mask)

    return Sprite(
        image=_compose(out, alpha),
        root_x=_root_x(mask),
        bloom_color=_bloom_color(painted, mask),
    )


# --------------------------------------------------------------------------
# 読み込みと切り抜き
# --------------------------------------------------------------------------


def _load(raw: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGBA")
    w, h = img.size
    scale = MAX_SIDE / max(w, h)
    if scale < 1.0:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    return img


def _subject_mask(img: Image.Image, *, source: str, cutout: bool) -> np.ndarray:
    """被写体マスク（0..1 float）を推定する。"""
    alpha = np.asarray(img.getchannel("A"), dtype=np.float32) / 255.0

    if source == "paint":
        # ペイントは透過キャンバスなのでアルファがそのまま使える
        if alpha.max() > 0.02:
            return _clean_mask(alpha > 0.35, feather=1.0)
        return np.ones(alpha.shape, dtype=np.float32)

    if not cutout:
        return np.ones(alpha.shape, dtype=np.float32)

    if alpha.min() < 0.98:
        # 既に透過を持つPNG写真はそれを尊重する
        return _clean_mask(alpha > 0.35, feather=1.2)

    return _photo_mask(np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0)


def _photo_mask(rgb: np.ndarray) -> np.ndarray:
    """背景色からの距離と彩度で被写体を推定する。無地背景で最もよく効く。"""
    h, w, _ = rgb.shape
    border = np.concatenate(
        [
            rgb[:2].reshape(-1, 3),
            rgb[-2:].reshape(-1, 3),
            rgb[:, :2].reshape(-1, 3),
            rgb[:, -2:].reshape(-1, 3),
        ]
    )
    background = np.median(border, axis=0)

    diff = (rgb - background) * _CHANNEL_WEIGHT
    distance = np.sqrt((diff * diff).sum(axis=2))
    saturation = rgb.max(axis=2) - rgb.min(axis=2)

    score = 0.72 * _normalize(distance) + 0.28 * _normalize(saturation)
    binary = score > _otsu(score)

    if binary.mean() > 0.92:
        # 全面が被写体と判定された＝背景を切り分けられなかった
        return np.ones((h, w), dtype=np.float32)
    if binary.mean() < 0.01:
        return np.ones((h, w), dtype=np.float32)

    return _clean_mask(binary, feather=1.4)


def _clean_mask(binary: np.ndarray, *, feather: float) -> np.ndarray:
    """細かいノイズを落とし、内部の穴を埋め、縁をぼかす。"""
    img = Image.fromarray((binary.astype(np.uint8) * 255), mode="L")
    # オープニングで点ノイズを除去（茎のような細い構造は残す）
    img = img.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    cleaned = np.asarray(img) > 127

    filled = cleaned | _holes(cleaned)

    out = Image.fromarray((filled.astype(np.uint8) * 255), mode="L")
    if feather > 0:
        out = out.filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(out, dtype=np.float32) / 255.0


def _holes(binary: np.ndarray) -> np.ndarray:
    """外周と繋がっていない背景領域＝内部の穴を返す。"""
    h, w = binary.shape
    scale = HOLE_FILL_SIDE / max(h, w)
    if scale < 1.0:
        sh, sw = max(1, round(h * scale)), max(1, round(w * scale))
        small = np.asarray(
            Image.fromarray((binary.astype(np.uint8) * 255), mode="L").resize((sw, sh), Image.BILINEAR)
        ) > 127
    else:
        small = binary

    sh, sw = small.shape
    outside = np.zeros((sh, sw), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for y in range(sh):
        for x in (0, sw - 1):
            if not small[y, x] and not outside[y, x]:
                outside[y, x] = True
                queue.append((y, x))
    for x in range(sw):
        for y in (0, sh - 1):
            if not small[y, x] and not outside[y, x]:
                outside[y, x] = True
                queue.append((y, x))

    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < sh and 0 <= nx < sw and not small[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                queue.append((ny, nx))

    holes_small = ~small & ~outside
    if holes_small.shape != binary.shape:
        holes = np.asarray(
            Image.fromarray((holes_small.astype(np.uint8) * 255), mode="L").resize(
                (binary.shape[1], binary.shape[0]), Image.NEAREST
            )
        ) > 127
        return holes
    return holes_small


def _crop_to_subject(img: Image.Image, mask: np.ndarray) -> tuple[Image.Image, np.ndarray]:
    ys, xs = np.nonzero(mask > 0.08)
    if ys.size == 0:
        return img, mask

    pad = 4
    top = max(0, int(ys.min()) - pad)
    bottom = min(mask.shape[0], int(ys.max()) + pad + 1)
    left = max(0, int(xs.min()) - pad)
    right = min(mask.shape[1], int(xs.max()) + pad + 1)

    return img.crop((left, top, right, bottom)), mask[top:bottom, left:right]


# --------------------------------------------------------------------------
# 彩色
# --------------------------------------------------------------------------


def _flatten(rgb: np.ndarray) -> np.ndarray:
    """メディアンフィルタで面を平坦化する（輪郭は保ったまま塗りをまとめる）。"""
    img = _to_image(rgb)
    img = img.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MedianFilter(5))
    return np.asarray(img, dtype=np.float32) / 255.0


def _pigment_map(rgb: np.ndarray) -> np.ndarray:
    """各画素を最も近い顔料に寄せつつ、元の色味を3割残す。"""
    best_distance = np.full(rgb.shape[:2], np.inf, dtype=np.float32)
    best_color = np.zeros_like(rgb)

    for pigment in PIGMENTS:
        diff = (rgb - pigment) * _CHANNEL_WEIGHT
        distance = (diff * diff).sum(axis=2)
        closer = distance < best_distance
        best_distance = np.where(closer, distance, best_distance)
        best_color = np.where(closer[..., None], pigment, best_color)

    blended = best_color * 0.7 + rgb * 0.3
    # 明度を段階化して塗り面をはっきりさせる
    levels = 5.0
    luma = (blended * _CHANNEL_WEIGHT).sum(axis=2, keepdims=True)
    stepped = np.floor(luma * levels + 0.5) / levels
    blended = np.clip(blended + (stepped - luma) * 0.45, 0.0, 1.0)
    return blended


def _ink_lines(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """墨線を抽出する。輪郭・内部のエッジ・かすれを合成した 0..1 の濃度。"""
    gray = (rgb * _CHANNEL_WEIGHT).sum(axis=2)

    # Difference of Gaussians でエッジの暗い側を拾う
    near = _blur(gray, 0.8)
    far = _blur(gray, 2.4)
    edges = np.clip((far - near) * 9.0, 0.0, 1.0)

    # シルエットの輪郭線
    solid = (mask > 0.5).astype(np.float32)
    outline = np.clip(solid - _erode(solid, 2), 0.0, 1.0)

    ink = np.maximum(edges, outline * 0.9) * mask
    ink = _blur(ink, 0.6)                       # にじみ
    ink *= 0.72 + 0.28 * _noise(ink.shape, seed=7, blur=1.4)  # 筆のかすれ
    return np.clip(ink, 0.0, 1.0)


def _pigment_wash(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """隈取り（縁を沈ませる暈し）と岩絵具のムラを乗せ、塗り面に奥行きを出す。"""
    depth = _blur(np.clip(mask, 0.0, 1.0), 7.0)
    inner = np.clip((depth - 0.35) / 0.65, 0.0, 1.0)
    shade = 0.82 + 0.18 * inner

    mottle = 0.94 + 0.12 * _noise(rgb.shape[:2], seed=31, blur=3.0)
    return np.clip(rgb * (shade * mottle)[..., None], 0.0, 1.0)


def _paper_grain(rgb: np.ndarray) -> np.ndarray:
    """和紙の粒状感と繊維の筋を重ねる。"""
    grain = _noise(rgb.shape[:2], seed=11, blur=0.6)
    fiber = _noise((rgb.shape[0], max(2, rgb.shape[1] // 12)), seed=23, blur=0.8)
    fiber = np.asarray(
        Image.fromarray((fiber * 255).astype(np.uint8), mode="L").resize(
            (rgb.shape[1], rgb.shape[0]), Image.BILINEAR
        ),
        dtype=np.float32,
    ) / 255.0

    modulation = 0.93 + 0.05 * grain + 0.04 * fiber
    warm = np.array([1.01, 0.998, 0.975], dtype=np.float32)
    return np.clip(rgb * modulation[..., None] * warm, 0.0, 1.0)


def _bleed_edges(rgb: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """縁の外へ色をわずかに滲ませ、暗いフチが出ないよう色を外へ引き伸ばす。"""
    weight = np.clip(mask, 0.0, 1.0)
    spread_color = np.stack([_blur(rgb[..., c] * weight, 3.0) for c in range(3)], axis=2)
    spread_weight = _blur(weight, 3.0)[..., None]
    extended = np.where(spread_weight > 1e-4, spread_color / np.maximum(spread_weight, 1e-4), rgb)

    solid = weight[..., None]
    color = rgb * solid + extended * (1.0 - solid)

    halo = np.clip(_blur(weight, 2.2) * 0.42, 0.0, 1.0)
    alpha = np.clip(np.maximum(weight, halo), 0.0, 1.0)
    return np.clip(color, 0.0, 1.0), alpha


def _compose(rgb: np.ndarray, alpha: np.ndarray) -> Image.Image:
    rgba = np.concatenate([rgb, alpha[..., None]], axis=2)
    return Image.fromarray((rgba * 255.0 + 0.5).astype(np.uint8), mode="RGBA")


# --------------------------------------------------------------------------
# 付随情報
# --------------------------------------------------------------------------


def _root_x(mask: np.ndarray) -> float:
    """根元（下端付近の重心）の水平位置を 0..1 で返す。"""
    h, w = mask.shape
    band = mask[int(h * 0.88) :]
    weights = band.sum(axis=0)
    total = weights.sum()
    if total < 1e-4:
        return 0.5
    return float((weights * np.arange(w)).sum() / total / max(1, w - 1))


def _bloom_color(rgb: np.ndarray, mask: np.ndarray) -> tuple[int, int, int]:
    """花びらの粒子に使う代表色。彩度が高く緑から遠い色を選ぶ。"""
    inside = mask > 0.5
    if not inside.any():
        return (238, 190, 197)

    pixels = rgb[inside]
    saturation = pixels.max(axis=1) - pixels.min(axis=1)
    greenish = (pixels[:, 1] > pixels[:, 0]) & (pixels[:, 1] > pixels[:, 2])
    score = saturation - greenish * 0.25

    keep = score > np.quantile(score, 0.9)
    chosen = pixels[keep] if keep.any() else pixels
    color = np.median(chosen, axis=0)
    return tuple(int(round(c * 255)) for c in color)  # type: ignore[return-value]


# --------------------------------------------------------------------------
# 小道具
# --------------------------------------------------------------------------


def _to_image(rgb: np.ndarray) -> Image.Image:
    return Image.fromarray((np.clip(rgb, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


def _blur(plane: np.ndarray, sigma: float) -> np.ndarray:
    """分離可能ガウシアンぼかし。PillowのGaussianBlurはfloat画像を扱えないため自前で持つ。"""
    if sigma <= 0:
        return plane.astype(np.float32)

    radius = max(1, int(np.ceil(sigma * 3.0)))
    offsets = np.arange(-radius, radius + 1, dtype=np.float32)
    kernel = np.exp(-(offsets**2) / (2.0 * sigma * sigma))
    kernel /= kernel.sum()

    out = plane.astype(np.float32)
    for axis in (0, 1):
        pad = [(radius, radius) if a == axis else (0, 0) for a in range(out.ndim)]
        padded = np.pad(out, pad, mode="edge")
        accumulated = np.zeros_like(out)
        for index, weight in enumerate(kernel):
            window = [slice(None)] * out.ndim
            window[axis] = slice(index, index + out.shape[axis])
            accumulated += weight * padded[tuple(window)]
        out = accumulated
    return out


def _erode(plane: np.ndarray, size: int) -> np.ndarray:
    img = Image.fromarray((np.clip(plane, 0.0, 1.0) * 255).astype(np.uint8), mode="L")
    img = img.filter(ImageFilter.MinFilter(size * 2 + 1))
    return np.asarray(img, dtype=np.float32) / 255.0


def _noise(shape: tuple[int, int], *, seed: int, blur: float) -> np.ndarray:
    rng = np.random.default_rng(seed)
    raw = rng.random(shape, dtype=np.float32)
    return _normalize(_blur(raw, blur))


def _normalize(plane: np.ndarray) -> np.ndarray:
    low = float(plane.min())
    high = float(plane.max())
    if high - low < 1e-6:
        return np.zeros_like(plane)
    return (plane - low) / (high - low)


def _otsu(plane: np.ndarray) -> float:
    """大津の二値化しきい値。"""
    hist, edges = np.histogram(plane, bins=256, range=(0.0, 1.0))
    hist = hist.astype(np.float64)
    total = hist.sum()
    if total == 0:
        return 0.5

    centers = (edges[:-1] + edges[1:]) / 2.0
    weight_bg = np.cumsum(hist)
    weight_fg = total - weight_bg
    valid = (weight_bg > 0) & (weight_fg > 0)
    if not valid.any():
        return 0.5

    sum_total = (hist * centers).sum()
    sum_bg = np.cumsum(hist * centers)
    mean_bg = np.divide(sum_bg, weight_bg, out=np.zeros_like(sum_bg), where=weight_bg > 0)
    mean_fg = np.divide(
        sum_total - sum_bg, weight_fg, out=np.zeros_like(sum_bg), where=weight_fg > 0
    )
    between = weight_bg * weight_fg * (mean_bg - mean_fg) ** 2
    between[~valid] = -1.0
    return float(centers[int(np.argmax(between))])
