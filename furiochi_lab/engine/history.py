"""学習履歴の保存と集計（設計書 11章）

履歴はローカルのJSONファイルに保存する。保存先は環境変数 FURIOCHI_DATA_DIR で変更できる。
個人の具体的な失敗談が含まれ得るため、回答ごとに保存するかどうかを利用者が選ぶ。
"""

from collections import Counter
from datetime import date, datetime, timedelta
import json
import os
from pathlib import Path
from statistics import median

from furiochi_lab.data.modes import RUBRICS
from furiochi_lab.data.problems import PROBLEMS_BY_ID
from furiochi_lab.models.drill import Attempt, Problem


def default_path() -> Path:
    base = os.environ.get("FURIOCHI_DATA_DIR")
    root = Path(base) if base else Path.home() / ".furiochi_lab"
    return root / "history.json"


class HistoryStore:
    """回答履歴の読み書き

    Web版とターミナル版を同時に開いても上書きし合わないよう、読み書きのたびにファイルから読み直す。
    """

    def __init__(self, path: Path | None = None) -> None:
        self.path = Path(path) if path else default_path()
        self._attempts: list[Attempt] = self._load()

    def _reload(self) -> None:
        self._attempts = self._load()

    def _load(self) -> list[Attempt]:
        if not self.path.exists():
            return []
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            return [Attempt.from_dict(a) for a in raw.get("attempts", [])]
        except (json.JSONDecodeError, KeyError, TypeError):
            # 壊れたファイルは消さずに退避して、新しい履歴で始める
            stamp = datetime.now().strftime("%Y%m%d%H%M%S")
            self.path.rename(self.path.with_name(f"{self.path.stem}.broken-{stamp}.json"))
            return []

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(self.export_json(), encoding="utf-8")
        os.replace(tmp, self.path)

    def export_json(self) -> str:
        data = {"version": 1, "attempts": [a.to_dict() for a in self._attempts]}
        return json.dumps(data, ensure_ascii=False, indent=2)

    def all(self) -> list[Attempt]:
        self._reload()
        return list(self._attempts)

    def get(self, attempt_id: str) -> Attempt | None:
        self._reload()
        return next((a for a in self._attempts if a.id == attempt_id), None)

    def add(self, attempt: Attempt) -> None:
        self._reload()
        self._attempts.append(attempt)
        self._save()

    def update(self, attempt_id: str, **fields) -> Attempt:
        attempt = self.get(attempt_id)
        if attempt is None:
            raise KeyError(attempt_id)
        for key, value in fields.items():
            setattr(attempt, key, value)
        self._save()
        return attempt

    def delete(self, attempt_id: str) -> None:
        self._reload()
        self._attempts = [a for a in self._attempts if a.id != attempt_id]
        self._save()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 集計
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def resolve_problem(attempt: Attempt) -> Problem | None:
    if attempt.problem_snapshot:
        return Problem.from_dict(attempt.problem_snapshot)
    return PROBLEMS_BY_ID.get(attempt.problem_id)


def attempt_date(attempt: Attempt) -> date:
    return datetime.fromisoformat(attempt.created_at).date()


def streak_days(attempts: list[Attempt], today: date | None = None) -> int:
    """連続学習日数。今日まだ解いていなければ昨日までの連続を数える"""
    today = today or date.today()
    days = {attempt_date(a) for a in attempts}
    cursor = today if today in days else today - timedelta(days=1)
    count = 0
    while cursor in days:
        count += 1
        cursor -= timedelta(days=1)
    return count


def weakness_counts(attempts: list[Attempt], recent: int = 20) -> Counter:
    """直近の回答に付いた弱点タグを数える"""
    counter: Counter = Counter()
    for a in attempts[-recent:]:
        counter.update(a.evaluation.tags)
    return counter


def mode_summary(attempts: list[Attempt]) -> dict[str, dict]:
    """モードごとの回答数と平均得点率"""
    summary: dict[str, dict] = {}
    for a in attempts:
        s = summary.setdefault(a.mode, {"count": 0, "ratios": []})
        s["count"] += 1
        ev = a.evaluation
        if ev.max_total:
            s["ratios"].append(ev.total / ev.max_total)
    return {
        mode: {"count": s["count"],
               "avg_ratio": sum(s["ratios"]) / len(s["ratios"]) if s["ratios"] else 0.0}
        for mode, s in summary.items()
    }


def effort_summary(attempts: list[Attempt]) -> dict:
    """制作時間の中央値と、自己満足度の平均（記録がある回答だけで数える）"""
    secs = [a.elapsed_sec for a in attempts if a.elapsed_sec is not None]
    sats = [a.satisfaction for a in attempts if a.satisfaction is not None]
    return {
        "timed": len(secs),
        "median_sec": median(secs) if secs else None,
        "rated": len(sats),
        "avg_satisfaction": sum(sats) / len(sats) if sats else None,
    }


def explained_structure(attempt: Attempt) -> bool:
    """予測とズレを説明できたか（期待とズレの軸がどちらも1点以上）

    M04 は各案の成立、M07 はズレの指摘が1点以上なら、ズレを説明できたとみなす。
    """
    sc = attempt.evaluation.scores
    rubric = attempt.evaluation.rubric
    if rubric == "prediction":
        return sc.get("specificity", 0) >= 1 and sc.get("match", 0) >= 1
    if rubric == "trio":
        return sc.get("validity", 0) >= 1
    if rubric == "tsukkomi":
        return sc.get("pinpoint", 0) >= 1
    return sc.get("expectation", 0) >= 1 and sc.get("contrast", 0) >= 1


def level_progress(attempts: list[Attempt]) -> dict[int, dict]:
    """Lv1・Lv2の進行判定（設計書 5章の初期仮説）"""
    by_level: dict[int, list[Attempt]] = {}
    for a in attempts:
        p = resolve_problem(a)
        if p:
            by_level.setdefault(p.level, []).append(a)

    lv1 = by_level.get(1, [])[-10:]
    lv1_ok = sum(explained_structure(a) for a in lv1)

    lv2 = [a for a in by_level.get(2, []) if a.evaluation.rubric == "neta"]
    lv2_totals = [a.evaluation.total for a in lv2]
    lv2_median = median(lv2_totals) if lv2_totals else None

    return {
        1: {"done": len(lv1), "ok": lv1_ok,
            "achieved": len(lv1) >= 10 and lv1_ok >= 7},
        2: {"done": len(lv2), "median": lv2_median,
            "achieved": len(lv2) >= 5 and lv2_median is not None and lv2_median >= 7},
    }


def attempted_ids(attempts: list[Attempt]) -> set[str]:
    return {a.problem_id for a in attempts}


def last_attempted_at(attempts: list[Attempt]) -> dict[str, str]:
    latest: dict[str, str] = {}
    for a in attempts:
        if a.created_at > latest.get(a.problem_id, ""):
            latest[a.problem_id] = a.created_at
    return latest


def axis_names(rubric: str) -> dict[str, str]:
    return {a.key: a.name for a in RUBRICS[rubric]}
