#!/usr/bin/env python3
"""フリオチLAB の候補問題を、問題バンクに入れる前に機械的に検査する

定期タスクが毎朝作る候補（furiochi_lab/data/candidates/日付.json）を読み、
問題の形として壊れていないかを1問ずつ見る。中身の面白さや成立は
furiochi-problem-checker が見るので、ここでは形だけを見る。

  python3 scripts/check_candidates.py                      # candidates/ の全ファイル
  python3 scripts/check_candidates.py path/to/2026-11-09.json

候補ファイルの形：
  {"date": "2026-11-09", "problems": [Problem.to_dict() と同じ形, ...]}

1問でも通らなければ終了コード1で終わる。
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from furiochi_lab.data.modes import IMPLEMENTED_MODES  # noqa: E402
from furiochi_lab.data.problems import PROBLEMS  # noqa: E402
from furiochi_lab.data.taxonomy import BASIC_TYPE_NAMES, TECHNIQUE_NAMES  # noqa: E402
from furiochi_lab.models.drill import Problem  # noqa: E402

CANDIDATE_DIR = ROOT / "furiochi_lab" / "data" / "candidates"
PATTERN_NAMES = set(BASIC_TYPE_NAMES) | set(TECHNIQUE_NAMES)
MARKDOWN_MARKS = ("**", "##", "```", "__")
EXAMPLE_RANGE = {"M03": (1, 2), "M04": (3, 3)}


def problem_issues(data: dict, seen_ids: set[str], bank_prompts: set[str]) -> list[str]:
    try:
        p = Problem.from_dict(data)
    except (TypeError, KeyError) as e:
        return [f"Problem の形になっていない（{e}）"]

    issues = []
    if not p.id.startswith("G-"):
        issues.append(f"id が G- で始まっていない（{p.id}）")
    if p.id in seen_ids:
        issues.append(f"id が重複している（{p.id}）")
    seen_ids.add(p.id)
    if p.mode not in IMPLEMENTED_MODES:
        issues.append(f"mode が実装済みのモードではない（{p.mode}）")
    if not 1 <= p.level <= 5:
        issues.append(f"level が1〜5の外（{p.level}）")
    for key in ("prompt", "expectation", "axis", "focus", "scoring_hint"):
        if not str(getattr(p, key)).strip():
            issues.append(f"{key} が空")
    if p.prompt.strip() in bank_prompts:
        issues.append("同じ prompt の問題がすでにバンクにある")
    if p.pattern not in PATTERN_NAMES:
        issues.append(f"pattern が型の辞典にない（{p.pattern}）")

    lo, hi = EXAMPLE_RANGE.get(p.mode, (2, 3))
    if not lo <= len(p.examples) <= hi:
        issues.append(f"成立例の数が {len(p.examples)} 件（{p.mode} は {lo}〜{hi} 件）")
    for i, ex in enumerate(p.examples, 1):
        if not ex.text.strip():
            issues.append(f"成立例{i} が空")
        if ex.pattern not in PATTERN_NAMES:
            issues.append(f"成立例{i} の型が辞典にない（{ex.pattern}）")

    if p.mode == "M04":
        types = p.condition_types()
        if len(types) != 3 or len(set(types)) != 3:
            issues.append("M04 の condition が、違う型3つを「／」でつないだ形になっていない")
        elif any(t not in PATTERN_NAMES for t in types):
            issues.append("M04 の condition に辞典にない型がある")
        elif [ex.pattern for ex in p.examples] != types:
            issues.append("M04 の成立例の型が condition の順に並んでいない")
    elif p.mode == "M05":
        if not p.condition.strip():
            issues.append("M05 なのに condition（型の指定）が空")
    elif p.condition.strip():
        issues.append(f"{p.mode} では condition を空にする")
    if p.mode == "M06" and not p.weak_reason.strip():
        issues.append("M06 なのに weak_reason が空")

    text = json.dumps(data, ensure_ascii=False)
    if any(m in text for m in MARKDOWN_MARKS):
        issues.append("Markdown の記号が混ざっている")
    return issues


def check_file(path: Path, seen_ids: set[str], bank_prompts: set[str]) -> tuple[int, int, list[str]]:
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return 0, 1, [f"{path.name}: 読めない（{e}）"]
    problems = doc.get("problems") if isinstance(doc, dict) else None
    if not isinstance(problems, list) or not problems:
        return 0, 1, [f"{path.name}: problems の配列がない"]
    ok = ng = 0
    lines = []
    for data in problems:
        pid = data.get("id", "?") if isinstance(data, dict) else "?"
        try:
            issues = problem_issues(data, seen_ids, bank_prompts) if isinstance(data, dict) else ["オブジェクトではない"]
        except (TypeError, AttributeError, ValueError) as e:
            issues = [f"値の型が違う（{e}）"]
        if issues:
            ng += 1
            lines.append(f"NG {path.name} {pid}: " + " / ".join(issues))
        else:
            ok += 1
            lines.append(f"OK {path.name} {pid}: {data.get('mode')} {data.get('prompt')}")
    return ok, ng, lines


def main(argv: list[str]) -> int:
    paths = [Path(a) for a in argv] or sorted(CANDIDATE_DIR.glob("*.json"))
    if not paths:
        print("候補ファイルがありません")
        return 0
    seen_ids = {p.id for p in PROBLEMS}
    bank_prompts = {p.prompt.strip() for p in PROBLEMS}
    total_ok = total_ng = 0
    for path in paths:
        ok, ng, lines = check_file(path, seen_ids, bank_prompts)
        total_ok += ok
        total_ng += ng
        print("\n".join(lines))
    print(f"合格 {total_ok} 問、不合格 {total_ng} 問")
    return 1 if total_ng else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
