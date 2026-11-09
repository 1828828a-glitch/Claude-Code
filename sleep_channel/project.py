"""動画1本ぶんのプロジェクトフォルダ

<作業フォルダ>/<slug>/
  project.json        テーマ・章立て・確認ポイント・読み替え・承認状態
  script/ch01.txt     章ごとのナレーション原稿（手で直してよい）
  review.md           人が確認するための一覧（script のたびに作り直す）
  images/             画像を置く。ch03_xxx.jpg のように章番号を付けるとその章で表示する
  images/credits.txt  画像の出典（概要欄に転記する）
  bgm.mp3 など        環境音（任意。作業フォルダ直下の bgm.* を全動画の共通にもできる）
  audio/              合成した音声と timeline.json
  out/                完成動画と概要欄
"""

from dataclasses import asdict, dataclass, field
from datetime import date
import json
from pathlib import Path

from sleep_channel.config import data_dir


@dataclass
class Chapter:
    number: int
    title: str
    summary: str
    points: list[str] = field(default_factory=list)
    check_points: list[str] = field(default_factory=list)
    readings: dict[str, str] = field(default_factory=dict)

    @property
    def label(self) -> str:
        return f"ch{self.number:02d}"


@dataclass
class Project:
    slug: str
    theme: str
    target_minutes: int
    chapter_chars: int
    title_candidates: list[str] = field(default_factory=list)
    summary: str = ""
    tags: list[str] = field(default_factory=list)
    chapters: list[Chapter] = field(default_factory=list)
    approved: bool = False
    created: str = field(default_factory=lambda: date.today().isoformat())
    root: Path = field(default=None, repr=False, compare=False)

    # ── パス ──────────────────────────────

    @property
    def dir(self) -> Path:
        return self.root / self.slug

    @property
    def script_dir(self) -> Path:
        return self.dir / "script"

    @property
    def image_dir(self) -> Path:
        return self.dir / "images"

    @property
    def audio_dir(self) -> Path:
        return self.dir / "audio"

    @property
    def out_dir(self) -> Path:
        return self.dir / "out"

    @property
    def title(self) -> str:
        return self.title_candidates[0] if self.title_candidates else self.theme

    def script_path(self, chapter: Chapter) -> Path:
        return self.script_dir / f"{chapter.label}.txt"

    # ── 原稿 ──────────────────────────────

    def narration(self, chapter: Chapter) -> str:
        path = self.script_path(chapter)
        return path.read_text(encoding="utf-8").strip() if path.exists() else ""

    def write_narration(self, chapter: Chapter, text: str) -> None:
        self.script_dir.mkdir(parents=True, exist_ok=True)
        self.script_path(chapter).write_text(text.strip() + "\n", encoding="utf-8")

    def missing_chapters(self) -> list[Chapter]:
        return [c for c in self.chapters if not self.narration(c)]

    def total_chars(self) -> int:
        return sum(len(self.narration(c)) for c in self.chapters)

    def readings(self) -> dict[str, str]:
        """章ごとの読み替えを1つにまとめる。後の章の指定が優先"""
        merged: dict[str, str] = {}
        for c in self.chapters:
            merged.update(c.readings)
        return merged

    # ── 保存 ──────────────────────────────

    def save(self) -> Path:
        self.dir.mkdir(parents=True, exist_ok=True)
        data = asdict(self)
        data.pop("root")
        path = self.dir / "project.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return path

    @classmethod
    def load(cls, slug: str, root: Path | None = None) -> "Project":
        root = root or data_dir()
        path = root / slug / "project.json"
        if not path.exists():
            raise FileNotFoundError(f"プロジェクト {slug} が見つかりません（{path}）")
        raw = json.loads(path.read_text(encoding="utf-8"))
        raw["chapters"] = [Chapter(**c) for c in raw.get("chapters", [])]
        return cls(**raw, root=root)


def new_slug(root: Path | None = None, today: date | None = None) -> str:
    """日付ベースのフォルダ名。同じ日に複数作ったら -2, -3 と付ける"""
    root = root or data_dir()
    base = (today or date.today()).strftime("%Y%m%d")
    slug, n = base, 1
    while (root / slug).exists():
        n += 1
        slug = f"{base}-{n}"
    return slug


def list_projects(root: Path | None = None) -> list[Project]:
    root = root or data_dir()
    if not root.exists():
        return []
    projects = []
    for path in sorted(root.glob("*/project.json")):
        try:
            projects.append(Project.load(path.parent.name, root))
        except (json.JSONDecodeError, TypeError):
            continue
    return projects
