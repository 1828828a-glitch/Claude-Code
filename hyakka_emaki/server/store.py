"""庭の状態管理。株の追加・間引き・永続化と、接続中の画面への配信を担う。"""

from __future__ import annotations

import asyncio
import json
import random
import secrets
import time
from dataclasses import asdict, dataclass, field
from typing import Any

from . import config

# 奥行きのレーン。手前ほど大きく、下に、はっきり描かれる。
LANES = 3

# 株の間隔（1.0 = 画面の高さ）。絵巻は右へ伸びていく。
MIN_GAP = 0.17
MAX_GAP = 0.31


@dataclass
class Plant:
    """庭に生えている一株。"""

    id: str
    name: str
    description: str
    label: str
    image: str
    width: int
    height: int
    root_x: float
    bloom_color: str
    lane: int
    x: float
    planted_at: float

    def to_json(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Garden:
    plants: list[Plant] = field(default_factory=list)
    cursor: float = 0.0

    def to_json(self) -> dict[str, Any]:
        return {"plants": [p.to_json() for p in self.plants], "cursor": self.cursor}


class GardenStore:
    """庭ひとつぶんの状態。WebSocketで繋がった全画面に変化を配信する。"""

    def __init__(self) -> None:
        self._garden = Garden()
        self._lock = asyncio.Lock()
        self._listeners: set[asyncio.Queue[dict[str, Any]]] = set()
        self._last_submit: dict[str, float] = {}
        self._random = random.Random(20260726)

    # -- 起動と保存 -------------------------------------------------------

    def load(self) -> None:
        config.PLANT_DIR.mkdir(parents=True, exist_ok=True)
        if not config.GARDEN_FILE.exists():
            return
        try:
            raw = json.loads(config.GARDEN_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return

        plants: list[Plant] = []
        for item in raw.get("plants", []):
            try:
                plant = Plant(**item)
            except TypeError:
                continue  # 古い形式の記録は読み飛ばす
            if (config.PLANT_DIR / f"{plant.id}.png").exists():
                plants.append(plant)

        self._garden = Garden(plants=plants, cursor=float(raw.get("cursor", 0.0)))

    def _save(self) -> None:
        config.PLANT_DIR.mkdir(parents=True, exist_ok=True)
        temporary = config.GARDEN_FILE.with_suffix(".json.tmp")
        temporary.write_text(
            json.dumps(self._garden.to_json(), ensure_ascii=False, indent=1), encoding="utf-8"
        )
        temporary.replace(config.GARDEN_FILE)

    # -- 配信 -------------------------------------------------------------

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=64)
        self._listeners.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._listeners.discard(queue)

    def _broadcast(self, message: dict[str, Any]) -> None:
        for queue in list(self._listeners):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                # 追いつけていない画面は取りこぼす。次のsnapshotで整合する。
                self._listeners.discard(queue)

    # -- 参照 -------------------------------------------------------------

    def snapshot(self) -> dict[str, Any]:
        return {
            "type": "snapshot",
            "plants": [p.to_json() for p in self._garden.plants],
            "cursor": self._garden.cursor,
        }

    def count(self) -> int:
        return len(self._garden.plants)

    # -- 投稿制限 ---------------------------------------------------------

    def cooldown_remaining(self, token: str) -> float:
        last = self._last_submit.get(token)
        if last is None:
            return 0.0
        return max(0.0, config.SUBMIT_COOLDOWN - (time.time() - last))

    def mark_submitted(self, token: str) -> None:
        now = time.time()
        self._last_submit[token] = now
        # 古い記録を掃除しておく
        stale = [key for key, value in self._last_submit.items() if now - value > 3600]
        for key in stale:
            del self._last_submit[key]

    # -- 植える -----------------------------------------------------------

    @staticmethod
    def new_id() -> str:
        """先に画像を書き出せるよう、株のIDだけを払い出す。"""
        return secrets.token_hex(8)

    async def plant(
        self,
        *,
        plant_id: str,
        name: str,
        description: str,
        label: str,
        width: int,
        height: int,
        root_x: float,
        bloom_color: str,
    ) -> Plant:
        async with self._lock:
            self._garden.cursor += self._random.uniform(MIN_GAP, MAX_GAP)

            plant = Plant(
                id=plant_id,
                name=name,
                description=description,
                label=label,
                image=f"/plants/{plant_id}.png",
                width=width,
                height=height,
                root_x=root_x,
                bloom_color=bloom_color,
                lane=self._random.randrange(LANES),
                x=self._garden.cursor,
                planted_at=time.time(),
            )
            self._garden.plants.append(plant)

            withered = self._cull()
            self._save()

        self._broadcast({"type": "sprout", "plant": plant.to_json()})
        for gone in withered:
            self._broadcast({"type": "wither", "id": gone.id})
        return plant

    def _cull(self) -> list[Plant]:
        """上限を超えた古い株を土に還す。呼び出し側でロックを保持していること。"""
        removed: list[Plant] = []
        while len(self._garden.plants) > config.MAX_PLANTS:
            gone = self._garden.plants.pop(0)
            removed.append(gone)
            (config.PLANT_DIR / f"{gone.id}.png").unlink(missing_ok=True)
        return removed

    async def relabel(self, plant_id: str, label: str) -> bool:
        """立札の文言を差し替える。株が既に枯れていれば何もしない。"""
        async with self._lock:
            for plant in self._garden.plants:
                if plant.id == plant_id:
                    plant.label = label
                    self._save()
                    break
            else:
                return False

        self._broadcast({"type": "relabel", "id": plant_id, "label": label})
        return True

    async def clear(self) -> None:
        """庭を更地に戻す。"""
        async with self._lock:
            for plant in self._garden.plants:
                (config.PLANT_DIR / f"{plant.id}.png").unlink(missing_ok=True)
            self._garden = Garden()
            self._save()
        self._broadcast({"type": "cleared"})


store = GardenStore()
