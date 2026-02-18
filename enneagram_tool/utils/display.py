"""ターミナル表示ユーティリティ"""

import os

# ターミナル幅の取得
try:
    TERM_WIDTH = os.get_terminal_size().columns
except OSError:
    TERM_WIDTH = 80


def clear_screen() -> None:
    """画面クリア"""
    os.system("cls" if os.name == "nt" else "clear")


def print_header(text: str, char: str = "=") -> None:
    """セクションヘッダーを表示"""
    line = char * min(len(text) + 4, TERM_WIDTH)
    print(f"\n{line}")
    print(f"  {text}")
    print(line)


def print_subheader(text: str) -> None:
    """サブヘッダーを表示"""
    print(f"\n--- {text} ---")


def print_box(text: str, width: int = 60) -> None:
    """テキストをボックスで囲んで表示"""
    lines = text.split("\n")
    border = "+" + "-" * (width - 2) + "+"
    print(border)
    for line in lines:
        # 行が長い場合は折り返す
        while len(line) > width - 4:
            print(f"| {line[:width-4]} |")
            line = line[width-4:]
        padding = " " * (width - 4 - len(line))
        print(f"| {line}{padding} |")
    print(border)


def print_progress(current: int, total: int, label: str = "") -> None:
    """プログレスバーを表示"""
    bar_width = 30
    filled = int(bar_width * current / total)
    bar = "#" * filled + "-" * (bar_width - filled)
    percent = int(100 * current / total)
    print(f"\r  [{bar}] {percent}% {label} ({current}/{total})", end="", flush=True)
    if current == total:
        print()  # 完了時に改行


def print_score_bar(label: str, score: float, max_score: float,
                    bar_width: int = 20) -> None:
    """スコアバーを表示"""
    if max_score <= 0:
        ratio = 0.0
    else:
        ratio = min(score / max_score, 1.0)
    filled = int(bar_width * ratio)
    bar = "█" * filled + "░" * (bar_width - filled)
    print(f"  {label:12s} |{bar}| {score:.1f}")


def print_type_card(type_num: int, type_info: object, highlight: bool = False) -> None:
    """タイプ情報のカードを表示"""
    prefix = ">>>" if highlight else "   "
    # type_info has attributes name_ja, name_en, center, core_fear, core_desire
    print(f"{prefix} タイプ{type_num}: {type_info.name_ja} ({type_info.name_en})")  # type: ignore[attr-defined]
    print(f"       センター: {type_info.center}")  # type: ignore[attr-defined]
    print(f"       核心的恐れ: {type_info.core_fear}")  # type: ignore[attr-defined]
    print(f"       核心的欲求: {type_info.core_desire}")  # type: ignore[attr-defined]


def print_separator(char: str = "-", width: int = 60) -> None:
    """区切り線を表示"""
    print(char * width)


def get_input(prompt: str, valid_options: list[str] | None = None) -> str:
    """ユーザー入力を取得（バリデーション付き）"""
    while True:
        answer = input(f"\n{prompt}\n> ").strip()
        if valid_options is None:
            return answer
        if answer.upper() in [opt.upper() for opt in valid_options]:
            return answer.upper()
        print(f"  ※ 有効な選択肢: {', '.join(valid_options)}")


def print_banner() -> None:
    """起動バナーを表示"""
    banner = r"""
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   エニアグラム統合タイプ判定ツール v1.0                ║
  ║   Enneagram x Beebe x Nardi                          ║
  ║                                                       ║
  ║   タイプ判定を"勘"から"再現性"へ                      ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
"""
    print(banner)
