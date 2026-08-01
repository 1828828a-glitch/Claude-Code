"""画面キャプチャ収集。アクティブウィンドウタイトル + スクリーンショットOCR。

依存 (すべてオプショナル):
- mss + Pillow : スクリーンショット
- pytesseract  : OCR (別途 tesseract 本体と jpn 言語データが必要)

依存が無い環境ではウィンドウタイトルだけでも記録する。
"""

from __future__ import annotations

import subprocess
import sys


def active_window_title() -> str | None:
    """アクティブウィンドウのタイトルを OS 別にベストエフォートで取得する。"""
    try:
        if sys.platform == "win32":
            import ctypes

            hwnd = ctypes.windll.user32.GetForegroundWindow()
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
            return buf.value or None
        if sys.platform == "darwin":
            script = (
                'tell application "System Events" to get name of first process '
                "whose frontmost is true"
            )
            out = subprocess.run(
                ["osascript", "-e", script], capture_output=True, text=True, timeout=5
            )
            return out.stdout.strip() or None
        # Linux (X11)
        out = subprocess.run(
            ["xdotool", "getactivewindow", "getwindowname"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return out.stdout.strip() or None
    except Exception:
        return None


def screenshot_ocr(lang: str, max_chars: int) -> str | None:
    """全画面をキャプチャして OCR したテキストを返す。依存が無ければ None。"""
    try:
        import mss
        from PIL import Image
    except ImportError:
        return None
    try:
        with mss.mss() as sct:
            raw = sct.grab(sct.monitors[0])
            img = Image.frombytes("RGB", raw.size, raw.rgb)
    except Exception:
        return None
    try:
        import pytesseract

        try:
            text = pytesseract.image_to_string(img, lang=lang)
        except pytesseract.TesseractError:
            text = pytesseract.image_to_string(img)  # jpn データ未導入などの場合
    except ImportError:
        return None
    except Exception:
        return None
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    return text[:max_chars] or None


def collect(conn, cfg: dict) -> int:
    """1回分の画面イベントを記録する。記録できたら 1、スキップなら 0。"""
    from .. import db

    scfg = cfg["screen"]
    title = active_window_title()
    text = screenshot_ocr(scfg["ocr_lang"], scfg["max_chars"])
    if not title and not text:
        return 0
    blob = f"{title or ''}\n{text or ''}"
    if any(kw.lower() in blob.lower() for kw in cfg.get("exclude_keywords", [])):
        return 0
    added = db.add_event(conn, "screen", title, text)
    return 1 if added else 0
