"""百花繚乱絵巻のサーバ。

大画面（/）とスマホ（/m）を配信し、投稿された画像を草花に変換して庭へ植える。
"""

from __future__ import annotations

import asyncio
import io
import secrets
from contextlib import asynccontextmanager

import qrcode
from fastapi import FastAPI, Form, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from . import config, labeler
from .stylize import stylize
from .store import store

ADMIN_TOKEN = secrets.token_urlsafe(8)

MAX_NAME_LENGTH = 24
MAX_DESCRIPTION_LENGTH = 120


@asynccontextmanager
async def lifespan(app: FastAPI):
    config.PLANT_DIR.mkdir(parents=True, exist_ok=True)
    store.load()
    _announce()
    yield


app = FastAPI(title="百花繚乱絵巻", lifespan=lifespan)
config.PLANT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")
app.mount("/plants", StaticFiles(directory=config.PLANT_DIR), name="plants")


def _announce() -> None:
    base = config.PUBLIC_URL or f"http://<この端末のIP>:{config.PORT}"
    print("\n  百花繚乱絵巻")
    print(f"    大画面 : {base}/")
    print(f"    スマホ : {base}/m")
    print(f"    庭を更地に戻す: {base}/api/clear?token={ADMIN_TOKEN}")
    if not config.ANTHROPIC_API_KEY:
        print("    立札はローカル生成（ANTHROPIC_API_KEY を設定すると Claude が書きます）")
    print()


# --------------------------------------------------------------------------
# 画面
# --------------------------------------------------------------------------


@app.get("/")
async def display() -> FileResponse:
    return FileResponse(config.STATIC_DIR / "display.html")


@app.get("/m")
async def mobile() -> FileResponse:
    return FileResponse(config.STATIC_DIR / "mobile.html")


@app.get("/api/qr.png")
async def qr_code(request: Request) -> Response:
    """スマホ用URLのQRコード。会場LANのURLは HANA_PUBLIC_URL で固定できる。"""
    base = config.PUBLIC_URL or str(request.base_url).rstrip("/")

    image = qrcode.make(f"{base}/m", box_size=10, border=2)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return Response(
        buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


# --------------------------------------------------------------------------
# 庭
# --------------------------------------------------------------------------


@app.get("/api/garden")
async def garden() -> dict:
    return store.snapshot()


@app.websocket("/ws")
async def stream(websocket: WebSocket) -> None:
    await websocket.accept()
    queue = store.subscribe()

    async def pump() -> None:
        while True:
            message = await queue.get()
            await websocket.send_json(message)

    pumping = asyncio.create_task(pump())
    try:
        await websocket.send_json(store.snapshot())
        while True:
            # 受信自体は使わないが、切断の検知に必要。
            await websocket.receive_text()
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        pumping.cancel()
        store.unsubscribe(queue)


@app.post("/api/plant")
async def plant(
    request: Request,
    image: UploadFile,
    name: str = Form(""),
    description: str = Form(""),
    source: str = Form("photo"),
    cutout: str = Form("on"),
    token: str = Form(""),
) -> dict:
    visitor = token.strip()[:64] or (request.client.host if request.client else "unknown")
    waiting = store.cooldown_remaining(visitor)
    if waiting > 0:
        raise HTTPException(429, f"次の株を植えるまであと{waiting:.0f}秒待ってください。")

    raw = await image.read()
    if not raw:
        raise HTTPException(400, "画像が空です。")
    if len(raw) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "画像が大きすぎます。")

    clean_name = labeler.normalize(name, limit=MAX_NAME_LENGTH) or "名もなき草"
    clean_description = labeler.normalize(description, limit=MAX_DESCRIPTION_LENGTH)

    try:
        sprite = await asyncio.to_thread(
            stylize,
            raw,
            source="paint" if source == "paint" else "photo",
            cutout=cutout != "off",
        )
    except Exception:
        raise HTTPException(400, "画像を読み取れませんでした。別の画像で試してください。")

    store.mark_submitted(visitor)

    # 画面が sprout を受け取った瞬間に画像を取りにくるので、先に書き出しておく。
    plant_id = store.new_id()
    await asyncio.to_thread(sprite.image.save, config.PLANT_DIR / f"{plant_id}.png", "PNG")

    grown = await store.plant(
        plant_id=plant_id,
        name=clean_name,
        description=clean_description,
        label=labeler.local_label(clean_name, clean_description),
        width=sprite.image.width,
        height=sprite.image.height,
        root_x=sprite.root_x,
        bloom_color="#%02x%02x%02x" % sprite.bloom_color,
    )

    if config.ANTHROPIC_API_KEY:
        # 立札の清書は後追いで届ける。画面への登場を待たせない。
        asyncio.create_task(_refine_label(grown.id, clean_name, clean_description))

    return {"id": grown.id, "name": grown.name, "label": grown.label}


async def _refine_label(plant_id: str, name: str, description: str) -> None:
    label = await labeler.refined_label(name, description)
    if label:
        await store.relabel(plant_id, label)


@app.get("/api/clear")
async def clear(token: str = "") -> dict:
    if not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(403, "合言葉が違います。")
    await store.clear()
    return {"ok": True}
