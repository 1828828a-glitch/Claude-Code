#!/usr/bin/env python3
"""PreToolUse フック：危ない操作と鍵ファイルへの接触を見張る番人

Bash のコマンドと、ファイルを読む・書くツールの行き先を調べて、
取り返しのつかない操作は止め（deny）、危ないが正当なこともある操作は
人の確認に回す（ask）。どちらにも当たらなければ何も出さずに通す。

止める：/ やホームの丸ごと削除、main への force push、ディスクの初期化
確認に回す：再帰削除、sudo、force push、git reset --hard、git clean -f、
            未コミットの変更を捨てる操作、curl | sh、.env など鍵ファイルの読み書き、
            環境変数の一覧表示

鍵は .env の1か所に置き、使うときは scripts/with-env が実行時に読む。
Claude Code が中身を開く必要はないので、開こうとしたら必ず人に聞く。
"""

from __future__ import annotations

import json
import os
import re
import shlex
import sys

DENY = "deny"
ASK = "ask"

# 鍵ファイルとして扱う名前。見本ファイル（.env.example など）は対象外。
SECRET_BASENAMES = {"id_rsa", "id_ed25519", "id_ecdsa", "id_dsa", ".netrc", "credentials.json"}
SECRET_SUFFIXES = (".pem", ".p12", ".pfx")
SAMPLE_SUFFIXES = (".example", ".sample", ".template", ".dist")

CONTROL_OPS = {";", "&&", "||", "|", "&", "|&", "(", ")", ";;", "{", "}"}
PROTECTED_BRANCHES = {"main", "master"}
CATASTROPHIC_RM_TARGETS = {"/", "/*", "~", "~/", "~/*", "$HOME", "$HOME/", "$HOME/*", "${HOME}", "${HOME}/", "${HOME}/*"}

# 鍵ファイル名が出てきても中身を読まないコマンド
NON_READING_COMMANDS = {"echo", "printf", "ls", "test", "[", "[[", "touch", "stat", "basename", "dirname", "realpath", "readlink", "which"}
WRAPPERS = {"nohup", "time", "command", "exec", "nice", "timeout", "stdbuf", "xargs"}
SHELLS = {"sh", "bash", "zsh", "dash", "ksh"}


def is_secret_path(path: str) -> bool:
    if not path:
        return False
    base = os.path.basename(path.rstrip("/").strip("\"'"))
    if base.endswith(SAMPLE_SUFFIXES):
        return False
    if base == ".env" or base.startswith(".env.") or base.endswith(".env"):
        return True
    return base in SECRET_BASENAMES or base.endswith(SECRET_SUFFIXES)


def _stronger(a: tuple[str, str] | None, b: tuple[str, str] | None) -> tuple[str, str] | None:
    if a is None:
        return b
    if b is None:
        return a
    return a if a[0] == DENY or b[0] != DENY else b


def _tokenize(command: str) -> list[str] | None:
    text = command.replace("\n", " ; ").replace("`", " ; ")
    lexer = shlex.shlex(text, posix=True, punctuation_chars=";&|()<>")
    lexer.whitespace_split = True
    lexer.commenters = ""
    try:
        return list(lexer)
    except ValueError:
        return None


def _split_pipelines(tokens: list[str]) -> list[list[list[str]]]:
    """トークン列を「パイプでつながった単純コマンドの並び」の列に分ける"""
    pipelines: list[list[list[str]]] = [[[]]]
    for tok in tokens:
        if tok in ("|", "|&"):
            pipelines[-1].append([])
        elif tok in CONTROL_OPS:
            pipelines.append([[]])
        else:
            pipelines[-1][-1].append(tok)
    return [[cmd for cmd in pl if cmd] for pl in pipelines if any(pl)]


def _strip_prefixes(argv: list[str]) -> tuple[list[str], tuple[str, str] | None]:
    """先頭の VAR=値、sudo、env、nohup などをはがして本体のコマンドを取り出す"""
    found: tuple[str, str] | None = None
    i = 0
    while i < len(argv):
        word = argv[i]
        name = os.path.basename(word)
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", word):
            i += 1
        elif name in ("sudo", "doas"):
            found = _stronger(found, (ASK, "sudo で管理者権限を使おうとしています"))
            i += 1
            while i < len(argv) and argv[i].startswith("-"):
                i += 2 if argv[i] in ("-u", "-g", "-C") else 1
        elif name == "env" and i + 1 < len(argv):
            i += 1
            while i < len(argv) and argv[i].startswith("-"):
                i += 1
        elif name in WRAPPERS:
            i += 1
            while i < len(argv) and argv[i].startswith("-"):
                i += 1
            if name == "timeout" and i < len(argv):
                i += 1
        else:
            break
    return argv[i:], found


def _short_flags(args: list[str]) -> set[str]:
    flags: set[str] = set()
    for a in args:
        if a == "--":
            break
        if a.startswith("--"):
            flags.add(a)
        elif a.startswith("-") and len(a) > 1:
            flags.update("-" + ch for ch in a[1:])
    return flags


def _check_rm(args: list[str]) -> tuple[str, str] | None:
    flags = _short_flags(args)
    recursive = bool(flags & {"-r", "-R", "--recursive"})
    force = bool(flags & {"-f", "--force"})
    if not recursive:
        return None
    targets = [a for a in args if not a.startswith("-")]
    for t in targets:
        if t in CATASTROPHIC_RM_TARGETS:
            return DENY, f"rm -r で {t} を消そうとしています。ルートやホームの丸ごと削除は止めます"
    what = "rm -rf" if force else "rm -r"
    return ASK, f"{what} で再帰削除します（対象: {' '.join(targets) or '不明'}）"


def _git_subcommand(args: list[str]) -> tuple[str, list[str]]:
    i = 0
    while i < len(args) and args[i].startswith("-"):
        i += 2 if args[i] in ("-C", "-c", "--git-dir", "--work-tree", "--namespace") else 1
    if i >= len(args):
        return "", []
    return args[i], args[i + 1:]


def _check_git(args: list[str]) -> tuple[str, str] | None:
    sub, rest = _git_subcommand(args)
    flags = _short_flags(rest)
    positional = [a for a in rest if not a.startswith("-")]

    if sub == "push":
        refs = positional[1:]
        force = bool(flags & {"-f", "--force", "--force-if-includes"}) or any(
            f.startswith("--force-with-lease") for f in flags) or any(r.startswith("+") for r in refs)
        dest = {r.lstrip("+").split(":")[-1].removeprefix("refs/heads/") for r in refs}
        to_protected = bool(dest & PROTECTED_BRANCHES)
        if force and to_protected:
            return DENY, "main/master への force push は止めます。履歴が消えて戻せなくなります"
        if force:
            return ASK, "force push で リモートの履歴を書き換えます"
        if "--delete" in flags or "-d" in flags or any(r.startswith(":") for r in refs):
            return ASK, "リモートのブランチを削除します"
        if to_protected:
            return ASK, "main/master に直接 push します"
        if "--mirror" in flags or "--all" in flags:
            return ASK, "git push --mirror/--all でリモートをまとめて書き換えます"
    elif sub == "reset" and "--hard" in flags:
        return ASK, "git reset --hard で未コミットの変更を捨てます"
    elif sub == "clean" and flags & {"-f", "--force"}:
        return ASK, "git clean -f で追跡していないファイルを消します"
    elif sub == "checkout" and "--" in rest and "." in rest[rest.index("--"):]:
        return ASK, "git checkout -- . で作業中の変更を捨てます"
    elif sub == "checkout" and positional == ["."]:
        return ASK, "git checkout . で作業中の変更を捨てます"
    elif sub == "restore" and "." in positional and not flags & {"--staged", "-S"}:
        return ASK, "git restore . で作業中の変更を捨てます"
    elif sub == "branch" and flags & {"-D"}:
        return ASK, "git branch -D でマージしていないブランチも消します"
    elif sub == "stash" and positional[:1] in (["drop"], ["clear"]):
        return ASK, "git stash の退避分を消します"
    elif sub == "filter-branch" or (sub == "filter-repo"):
        return ASK, "履歴を書き換えます"
    return None


def _check_secret_args(name: str, args: list[str]) -> tuple[str, str] | None:
    if name in NON_READING_COMMANDS:
        return None
    candidates = args
    if name in ("cp", "mv", "rsync", "scp", "install"):
        plain = [a for a in args if not a.startswith("-")]
        candidates = plain[:-1]  # 最後は書き込み先
    for a in candidates:
        for part in [a, *a.split("=")[1:]]:
            if is_secret_path(part):
                return ASK, f"鍵ファイル {os.path.basename(part)} に触れます。中身は scripts/with-env が実行時に読むので、開く必要があるか確認してください"
    return None


def check_simple_command(argv: list[str], depth: int = 0) -> tuple[str, str] | None:
    argv, result = _strip_prefixes(argv)
    if not argv:
        return result
    name = os.path.basename(argv[0])
    args = argv[1:]

    if name == "with-env":
        # 鍵の読み込み役。本体は .env を読むが、後ろに続くコマンドは普通に調べる
        return _stronger(result, check_simple_command(args, depth + 1)) if depth < 3 else result
    if name in SHELLS and "-c" in args and depth < 3:
        idx = args.index("-c")
        if idx + 1 < len(args):
            result = _stronger(result, check_bash(args[idx + 1], depth + 1))
    if name == "rm":
        result = _stronger(result, _check_rm(args))
    elif name == "git":
        result = _stronger(result, _check_git(args))
    elif name.startswith("mkfs"):
        result = _stronger(result, (DENY, "ディスクを初期化するコマンドは止めます"))
    elif name == "dd" and any(a.startswith("of=/dev/") for a in args):
        result = _stronger(result, (DENY, "dd でデバイスに直接書き込むのは止めます"))
    elif name in ("chmod", "chown") and _short_flags(args) & {"-R", "--recursive"} and (
            "777" in args or "/" in args):
        result = _stronger(result, (ASK, f"{name} -R で権限をまとめて変えます"))
    elif name in ("printenv",) and not [a for a in args if not a.startswith("-")]:
        result = _stronger(result, (ASK, "環境変数を全部表示します。鍵が画面に出るおそれがあります"))
    elif name == "env" and not args:
        result = _stronger(result, (ASK, "環境変数を全部表示します。鍵が画面に出るおそれがあります"))
    elif name in ("export", "set", "declare") and (not args or args == ["-p"]):
        result = _stronger(result, (ASK, "環境変数を全部表示します。鍵が画面に出るおそれがあります"))

    return _stronger(result, _check_secret_args(name, args))


def check_bash(command: str, depth: int = 0) -> tuple[str, str] | None:
    tokens = _tokenize(command)
    if tokens is None:
        # 引用符の閉じ忘れなどで分解できないときは、文字列で最低限だけ見る
        if re.search(r"(^|[\s/])\.env(\s|$)", command):
            return ASK, "鍵ファイル .env に触れる可能性があります"
        if re.search(r"\brm\s+-[a-zA-Z]*[rR]", command):
            return ASK, "再帰削除が含まれています"
        return None

    # < .env のような入力リダイレクトも読み取り扱い
    for i, tok in enumerate(tokens[:-1]):
        if tok == "<" and is_secret_path(tokens[i + 1]):
            return ASK, f"鍵ファイル {os.path.basename(tokens[i + 1])} を入力として読みます"

    result: tuple[str, str] | None = None
    for pipeline in _split_pipelines([t for t in tokens if t not in ("<", ">", ">>", "<<", "<<<", ">&", "<&")]):
        for argv in pipeline:
            result = _stronger(result, check_simple_command(argv, depth))
        names = [os.path.basename(_strip_prefixes(c)[0][0]) for c in pipeline if _strip_prefixes(c)[0]]
        if names and names[0] in ("curl", "wget") and any(n in SHELLS or n.startswith("python") for n in names[1:]):
            result = _stronger(result, (ASK, "ネットから落としたスクリプトをそのまま実行します"))
    return result


def check_file_tool(tool_name: str, tool_input: dict) -> tuple[str, str] | None:
    paths = [tool_input.get(k, "") for k in ("file_path", "notebook_path", "path")]
    verb = "読みます" if tool_name in ("Read", "Grep") else "書き換えます"
    for p in paths:
        if is_secret_path(p):
            return ASK, f"鍵ファイル {os.path.basename(p)} を{verb}。鍵は scripts/with-env が実行時に読むので、Claude Code が開く必要があるか確認してください"
    glob = tool_input.get("glob", "") or ""
    if tool_name == "Grep" and ".env" in glob and not glob.endswith(SAMPLE_SUFFIXES):
        return ASK, "鍵ファイル .env の中身を検索します"
    return None


def decide(payload: dict) -> tuple[str, str] | None:
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}
    if tool_name == "Bash":
        return check_bash(tool_input.get("command", ""))
    if tool_name in ("Read", "Edit", "Write", "MultiEdit", "NotebookEdit", "Grep"):
        return check_file_tool(tool_name, tool_input)
    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    verdict = decide(payload)
    if verdict is None:
        return 0
    decision, reason = verdict
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": f"[guard] {reason}",
        }
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
