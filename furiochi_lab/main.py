"""フリオチLAB - ターミナル版

使い方:
  python -m furiochi_lab                # 今日の10分（5問）
  python -m furiochi_lab --mode M01     # モードを指定して練習
  python -m furiochi_lab --count 3      # 出題数を変える
  python -m furiochi_lab --list         # 問題バンクの一覧
"""

import argparse
import sys

from furiochi_lab.data.modes import IMPLEMENTED_MODES, MODES, RELEVANCE, RUBRICS, SAFETY_STATUS
from furiochi_lab.data.problems import PROBLEMS, PROBLEMS_BY_ID, problems_for_mode
from furiochi_lab.engine.ai_coach import CoachError, FuriochiCoach, ai_available
from furiochi_lab.engine.history import HistoryStore, weakness_counts
from furiochi_lab.engine.rubric import auto_checks, self_evaluation
from furiochi_lab.engine.selector import ordered_candidates, todays_set
from furiochi_lab.models.drill import Attempt, Evaluation, Problem


def ask(prompt: str, allow_empty: bool = False) -> str:
    while True:
        try:
            value = input(prompt).strip()
        except EOFError:
            print()
            sys.exit(0)
        if value or allow_empty:
            return value


def ask_score(name: str, levels: tuple[str, str, str]) -> int:
    print(f"  {name}")
    for i, text in enumerate(levels):
        print(f"    {i}: {text}")
    while True:
        value = ask("    点数 (0/1/2) > ")
        if value in ("0", "1", "2"):
            return int(value)


def print_evaluation(ev: Evaluation, problem: Problem) -> None:
    print(f"\n  期待：{ev.detected_expectation or problem.expectation}")
    if ev.deviation:
        print(f"  ズレ：{ev.deviation}")
    print(f"  対照軸：{ev.deviation_axis or problem.axis}（{RELEVANCE.get(ev.relevance, '')}）")
    print(f"\n  構造スコア {ev.total}/{ev.max_total}")
    for axis in RUBRICS[ev.rubric]:
        score = ev.scores.get(axis.key, 0)
        reason = ev.reasons.get(axis.key) or axis.levels[score]
        print(f"    {axis.name:<8} {'●' * score}{'○' * (2 - score)}  {reason}")
    if ev.safety_status != "ok":
        print(f"\n  安全性：{SAFETY_STATUS[ev.safety_status]} {ev.safety_note}")
    if ev.good_point:
        print(f"\n  良い点：{ev.good_point}")
    for item in ev.improvements:
        print(f"  改善：{item}")
    if ev.one_revision:
        print(f"  修正案：{ev.one_revision}")
    if ev.alternatives:
        print("\n  別案・成立例：")
        for alt in ev.alternatives:
            print(f"    - {alt.text}〔{alt.pattern}〕")
    if ev.tags:
        print(f"\n  弱点タグ：{'、'.join(ev.tags)}")
    print("\n  ※得点は笑いの保証ではなく、構造を学ぶための参考指標です。")


def run_problem(problem: Problem, store: HistoryStore, coach: FuriochiCoach | None) -> None:
    mode = MODES[problem.mode]
    print("\n" + "=" * 60)
    print(f"  {mode.code} {mode.name}  Lv{problem.level}  {problem.id}")
    print("=" * 60)
    print(f"\n  {problem.prompt}")
    if problem.condition:
        print(f"  条件：{problem.condition}")
    limit = f"（{mode.char_limit}字以内が目安）" if mode.char_limit else ""
    print(f"\n  {mode.instruction}{limit}\n")

    retry_of = None
    while True:
        diagnosis = ask("  弱い理由（一言で）> ") if problem.mode == "M06" else ""
        answer = ask(f"  {mode.answer_label} > ")
        intent = "" if problem.mode == "M03" else ask("  狙った期待とズレ（任意、Enterで省略）> ", allow_empty=True)
        checks = auto_checks(problem, answer)
        for c in checks:
            print(f"  ! {c.message}")

        ev = None
        if coach:
            print("\n  講評しています…")
            weak = [t for t, _ in weakness_counts(store.all()).most_common(3)]
            try:
                ev = coach.evaluate(problem, answer, intent, diagnosis, weak)
            except CoachError as e:
                print(f"  {e} 自己採点で進めます。")
        if ev is None:
            print(f"\n  出題側の想定　期待：{problem.expectation}")
            print(f"  対照軸：{problem.axis}　型：{problem.pattern}")
            if problem.weak_reason:
                print(f"  元ネタが弱い理由：{problem.weak_reason}")
            print("\n  各軸を0〜2点で自己採点してください。")
            scores = {a.key: ask_score(a.name, a.levels) for a in RUBRICS[mode.rubric]}
            ng = ask("  安全性に気になる点はありますか？ (y/N) > ", allow_empty=True).lower() == "y"
            ev = self_evaluation(problem, scores, "check_context" if ng else "ok", checks)

        print_evaluation(ev, problem)
        attempt = Attempt(problem_id=problem.id, mode=problem.mode, answer=answer, evaluation=ev,
                          intent_note=intent, diagnosis=diagnosis, retry_of=retry_of)
        if ask("\n  履歴に保存しますか？ (Y/n) > ", allow_empty=True).lower() != "n":
            store.add(attempt)
        if ask("  同じお題でもう一度作りますか？ (y/N) > ", allow_empty=True).lower() != "y":
            return
        retry_of = attempt.id
        print("\n  別の型や別の尺度で書き換えてみましょう。\n")


def list_problems() -> None:
    for code in IMPLEMENTED_MODES:
        print(f"\n{code} {MODES[code].name}")
        for p in problems_for_mode(code):
            print(f"  {p.id}  Lv{p.level}  {p.prompt}")
    print(f"\n計 {len(PROBLEMS)} 問")


def main() -> None:
    parser = argparse.ArgumentParser(description="フリオチLAB - フリオチ思考訓練ドリル")
    parser.add_argument("--mode", choices=IMPLEMENTED_MODES, help="練習するモード")
    parser.add_argument("--count", type=int, default=5, help="出題数（既定5）")
    parser.add_argument("--list", action="store_true", help="問題バンクの一覧を表示")
    parser.add_argument("--no-ai", action="store_true", help="AI講評を使わず自己採点で進める")
    args = parser.parse_args()

    if args.list:
        list_problems()
        return

    store = HistoryStore()
    coach = None
    if ai_available() and not args.no_ai:
        coach = FuriochiCoach()
    print("\nフリオチLAB　" + ("AI講評あり" if coach else "自己採点モード"))
    print("正解のボケを当てるゲームではありません。期待を読み、同じ尺度でズレを作る練習です。")

    if args.mode:
        ids = ordered_candidates(args.mode, store.all())[:args.count]
    else:
        ids, reason = todays_set(store.all(), n=args.count)
        print(reason)

    for pid in ids:
        run_problem(PROBLEMS_BY_ID[pid], store, coach)
    print(f"\nお疲れさまでした。履歴：{store.path}")
