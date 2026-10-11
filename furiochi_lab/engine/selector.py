"""出題の選び方（次の1問・今日の10分・7日間パイロット）"""

from furiochi_lab.data.modes import IMPLEMENTED_MODES, PILOT_PLAN, WEAKNESS_TAGS
from furiochi_lab.data.problems import problems_for_mode
from furiochi_lab.engine.history import last_attempted_at, weakness_counts
from furiochi_lab.models.drill import Attempt

# 弱点がまだ見えないときの基本の並び。予測の言語化から入り、逆算・修理へ進む
DEFAULT_ROTATION = ["M03", "M01", "M01", "M02", "M06"]


def ordered_candidates(mode: str, attempts: list[Attempt]) -> list[str]:
    """未回答の問題を出題順に、その後に回答から時間が経った順に並べる"""
    latest = last_attempted_at(attempts)
    bank = [p.id for p in problems_for_mode(mode)]
    fresh = [pid for pid in bank if pid not in latest]
    seen = sorted((pid for pid in bank if pid in latest), key=lambda pid: latest[pid])
    return fresh + seen


def next_problem_id(mode: str, attempts: list[Attempt],
                    exclude: tuple[str, ...] | list[str] = ()) -> str | None:
    for pid in ordered_candidates(mode, attempts):
        if pid not in exclude:
            return pid
    return None


def _pick(modes: list[str], attempts: list[Attempt], n: int) -> list[str]:
    chosen: list[str] = []
    for mode in modes:
        if len(chosen) >= n:
            break
        pid = next_problem_id(mode, attempts, exclude=chosen)
        if pid:
            chosen.append(pid)
    return chosen


def todays_set(attempts: list[Attempt], n: int = 5) -> tuple[list[str], str]:
    """今日の10分。直近の弱点タグに効くモードを優先して5問選ぶ"""
    weak = weakness_counts(attempts).most_common(1)
    if weak:
        tag = weak[0][0]
        focus_modes = [m for m in WEAKNESS_TAGS[tag]["modes"] if m in IMPLEMENTED_MODES]
        modes = focus_modes * 2 + DEFAULT_ROTATION
        reason = f"直近で多い弱点「{tag}」に効くモードを多めにしています"
    else:
        modes = DEFAULT_ROTATION
        reason = "予測の言語化から入り、フリ→オチ、逆算、修理の順に進みます"
    return _pick(modes, attempts, n), reason


def pilot_set(day: int, attempts: list[Attempt]) -> list[str]:
    """7日間パイロットの指定日のメニュー（実装済みモードの分だけ）"""
    plan = next(d for d in PILOT_PLAN if d["day"] == day)
    modes: list[str] = []
    for mode, count in plan["menu"]:
        modes.extend([mode] * count)
    return _pick(modes, attempts, len(modes))
