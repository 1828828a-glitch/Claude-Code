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

承認ゲート：壊す操作とは別に、外に出す操作も人の承認に回す。
PR の作成・マージ・コメント、デプロイと公開、外部へのデータ送信、
共有範囲を広げる操作、外部サービス上での削除、定期タスクの作成と変更。
コネクタ（mcp__ で始まるツール）もここで見る。
"""

from __future__ import annotations

import fnmatch
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

# 鍵ファイル名が出てきても中身を読まないコマンド（書き込みはリダイレクトの側で見る）
NON_READING_COMMANDS = {"echo", "printf", "ls", "test", "[", "[[", "touch", "stat", "basename", "dirname", "realpath", "readlink", "which"}
GREP_COMMANDS = {"grep", "egrep", "fgrep"}
# 中身を表示しない git のサブコマンド。ファイル名やメッセージに .env が出てきても通す
GIT_NON_READING = {"status", "check-ignore", "check-attr", "ls-files", "log", "commit", "rm"}
SECRET_VAR = re.compile(r"(?i)[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)[A-Z0-9_]*")
SECRET_VAR_REF = re.compile(r"(?i)\$\{?[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)[A-Z0-9_]*")

# 判定のときの作業ディレクトリ。decide() が Claude Code から受け取った cwd を入れる
CWD = os.getcwd()


WRAPPERS = {"nohup", "time", "command", "exec", "nice", "timeout", "stdbuf", "xargs"}
SHELLS = {"sh", "bash", "zsh", "dash", "ksh"}


def _abs(path: str) -> str:
    p = os.path.expanduser(os.path.expandvars(path.strip("\"'")))
    return os.path.normpath(p if os.path.isabs(p) else os.path.join(CWD, p))


def _project_dir() -> str:
    return _abs(os.environ.get("CLAUDE_PROJECT_DIR") or CWD)


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
    protected = {os.path.normpath(os.path.expanduser("~")), _project_dir()}
    for t in targets:
        if t in CATASTROPHIC_RM_TARGETS:
            return DENY, f"rm -r で {t} を消そうとしています。ルートやホームの丸ごと削除は止めます"
        p = CWD if t in ("*", "./*") else _abs(t[:-2] if t.endswith("/*") else t)
        if p == "/" or any(q == p or q.startswith(p.rstrip("/") + "/") for q in protected):
            return DENY, f"rm -r で {t} を消そうとしています。ホームやこのプロジェクトを丸ごと含む削除は止めます"
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
            return ASK, "force push でリモートの履歴を書き換えます"
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
    elif sub == "checkout" and ("--" in rest or positional == ["."] or flags & {"-f", "--force"} or (
            "-b" not in flags and "-B" not in flags and any(os.path.exists(_abs(a)) for a in positional))):
        return ASK, f"git checkout {' '.join(rest)} で作業中の変更を捨てます"
    elif sub == "switch" and flags & {"-f", "--force", "--discard-changes"}:
        return ASK, "git switch -f で作業中の変更を捨てます"
    elif sub == "restore" and (flags & {"--worktree", "-W"} or not flags & {"--staged", "-S"}):
        return ASK, f"git restore {' '.join(positional) or ''} で作業中の変更を捨てます".replace("  ", " ")
    elif sub == "branch" and flags & {"-D"}:
        return ASK, "git branch -D でマージしていないブランチも消します"
    elif sub == "stash" and positional[:1] in (["drop"], ["clear"]):
        return ASK, "git stash の退避分を消します"
    elif sub == "filter-branch" or (sub == "filter-repo"):
        return ASK, "履歴を書き換えます"
    return None


GATE = "承認ゲート："
LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"}
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

GH_GATED = {
    "pr": {"create", "merge", "close", "reopen", "comment", "review", "edit", "ready"},
    "issue": {"create", "comment", "close", "reopen", "edit", "delete", "transfer"},
    "release": {"create", "upload", "delete", "edit"},
    "repo": {"create", "delete", "edit", "fork", "rename", "archive"},
    "workflow": {"run", "enable", "disable"},
    "run": {"rerun", "cancel", "delete"},
    "secret": {"set", "delete"},
    "variable": {"set", "delete"},
    "gist": {"create", "edit", "delete"},
}


def _option_value(args: list[str], names: tuple[str, ...]) -> str | None:
    for i, a in enumerate(args):
        for n in names:
            if a == n and i + 1 < len(args):
                return args[i + 1]
            if n.startswith("--") and a.startswith(n + "="):
                return a.split("=", 1)[1]
            if not n.startswith("--") and a.startswith(n) and len(a) > len(n):
                return a[len(n):]
    return None


def _check_gh(args: list[str]) -> tuple[str, str] | None:
    positional = [a for a in args if not a.startswith("-")]
    if not positional:
        return None
    group = positional[0]
    action = positional[1] if len(positional) > 1 else ""
    if group in GH_GATED and action in GH_GATED[group]:
        return ASK, f"{GATE}gh {group} {action} で GitHub に書き込みます"
    if group == "api":
        if positional[1:2] == ["graphql"] and not any("mutation" in a for a in args):
            return None
        method = (_option_value(args, ("-X", "--method")) or "").upper()
        has_fields = any(a in ("-f", "-F", "--field", "--raw-field", "--input") or a.startswith(("--field=", "--raw-field=", "--input="))
                         for a in args)
        if method in WRITE_METHODS or (has_fields and method != "GET"):
            return ASK, f"{GATE}gh api で GitHub に書き込みます（{method or 'POST'}）"
    return None


def _check_deploy(name: str, args: list[str]) -> tuple[str, str] | None:
    positional = [a for a in args if not a.startswith("-")]
    first = positional[0] if positional else ""
    hit = False
    if name == "vercel":
        hit = first not in {"whoami", "ls", "list", "inspect", "logs", "help", "login", "logout", "env", "pull", "link", "dev", "build", "--version"}
    elif name == "wrangler":
        hit = first in {"deploy", "publish", "delete", "rollback"} or (first == "pages" and "deploy" in positional) or (
            first == "secret" and len(positional) > 1 and positional[1] in {"put", "delete", "bulk"})
    elif name in ("netlify", "firebase", "fly", "flyctl"):
        hit = first == "deploy"
    elif name in ("npm", "pnpm", "yarn", "bun"):
        hit = first == "publish"
    elif name == "twine":
        hit = first == "upload"
    elif name in ("poetry", "uv"):
        hit = first == "publish"
    elif name in ("scp", "rsync"):
        if any(re.match(r"^([\w.-]+@)?[\w.-]+:", a) and not a.startswith(("/", ".")) for a in positional):
            return ASK, f"{GATE}{name} で外部のホストにファイルを送ります"
    elif name == "gsutil":
        hit = first in {"cp", "mv", "rsync", "acl", "iam", "setmeta", "rm"}
    elif name == "aws":
        hit = first == "s3" and len(positional) > 1 and positional[1] in {"cp", "mv", "sync", "rm"}
        first = " ".join(positional[:2])
    elif name == "docker":
        hit = first == "push"
    elif name == "terraform":
        hit = first in {"apply", "destroy"}
    elif name == "kubectl":
        hit = first in {"apply", "delete", "replace", "patch", "scale", "rollout"}
    elif name == "gcloud":
        hit = "deploy" in positional
    if hit:
        return ASK, f"{GATE}{name} {first}".rstrip() + " で外に公開・反映します"
    return None


CURL_OPTS_WITH_VALUE = {"-o", "--output", "-H", "--header", "-d", "--data", "--data-raw", "--data-binary",
                        "--data-urlencode", "--json", "-F", "--form", "-X", "--request", "-u", "--user", "-A",
                        "--user-agent", "-e", "--referer", "-b", "--cookie", "-c", "--cookie-jar", "-T",
                        "--upload-file", "-w", "--write-out", "-K", "--config", "-m", "--max-time",
                        "--connect-timeout", "-x", "--proxy", "-r", "--range", "-E", "--cert", "--cacert",
                        "-O", "--output-document", "--output-file", "--post-data", "--post-file", "--body-data",
                        "--body-file", "--method", "-U", "-P"}


def _non_local_url(args: list[str]) -> bool:
    """curl・wget の送り先を拾う。http:// を省いた example.com/form も URL として見る"""
    targets = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--url" and i + 1 < len(args):
            targets.append(args[i + 1])
            i += 2
            continue
        if a in CURL_OPTS_WITH_VALUE:
            i += 2
            continue
        if not a.startswith("-"):
            targets.append(a)
        i += 1
    for t in targets:
        rest = t.split("://", 1)[1] if "://" in t else t
        host = rest.split("/", 1)[0].split("@")[-1]
        host = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
        if host and host.lower() not in LOCAL_HOSTS:
            return True
    return False


def _check_send(name: str, args: list[str]) -> tuple[str, str] | None:
    if not _non_local_url(args):
        return None
    sending = False
    if name == "curl":
        method = (_option_value(args, ("-X", "--request")) or "").upper()
        get_mode = "-G" in args or "--get" in args
        long_data = any(a.startswith(("--data", "--json", "--form", "--upload-file")) for a in args)
        short_data = any(a.startswith("-") and not a.startswith("--") and any(ch in a[1:] for ch in "dFT")
                         and "X" not in a[1:2] for a in args)
        sending = method in WRITE_METHODS or ((long_data or short_data) and not get_mode and method != "GET")
    elif name == "wget":
        method = (_option_value(args, ("--method",)) or "").upper()
        sending = method in WRITE_METHODS or any(a.startswith(("--post-data", "--post-file", "--body-data", "--body-file")) for a in args)
    if sending:
        return ASK, f"{GATE}{name} で外部にデータを送ります"
    return None


OUTWARD_WORDS = {"send", "post", "publish", "share", "delete", "trash", "merge", "deploy", "comment", "reply",
                 "permission", "invite"}
GITHUB_WRITE_HEADS = {"create", "merge", "push", "delete", "fork", "add", "update", "enable", "disable", "resolve",
                      "unresolve", "request", "assign", "run", "rerun", "cancel"}


def check_mcp(tool_name: str) -> tuple[str, str] | None:
    parts = tool_name.split("__")
    if len(parts) < 3:
        return None
    server, action = parts[1], "__".join(parts[2:])
    words = [w.lower() for w in re.split(r"[_\-]+", action) if w]
    if "github" in server.lower() and words and (
            words[0] in GITHUB_WRITE_HEADS or action.endswith("_write") or "workflow" in words and words[0] != "list"):
        return ASK, f"{GATE}GitHub に書き込みます（{action}）"
    if server == "claude-code-remote" and action in {"create_trigger", "update_trigger", "delete_trigger", "fire_trigger"}:
        return ASK, f"{GATE}定期タスクを作る・変える・動かします（{action}）"
    if OUTWARD_WORDS & set(words):
        return ASK, f"{GATE}{server} で外に出す・共有する・消す操作をします（{action}）"
    return None


GREP_OPTS_WITH_VALUE = {"-e", "--regexp", "-f", "--file", "-m", "--max-count", "-A", "-B", "-C", "--context",
                        "--after-context", "--before-context", "--include", "--exclude", "--exclude-dir", "-d",
                        "--directories", "-D", "--label", "-g", "--glob", "-t", "--type", "-T", "--type-not"}


def _grep_files(args: list[str]) -> list[str]:
    """grep・rg の引数から、検索パターンを除いたファイルの並びを取り出す"""
    has_e = False
    positional: list[str] = []
    i = 0
    while i < len(args):
        a = args[i]
        if a in ("-e", "--regexp", "-f", "--file") or a.startswith(("--regexp=", "--file=")) or (
                a.startswith("-e") and not a.startswith("--") and len(a) > 2):
            has_e = True
        if a in GREP_OPTS_WITH_VALUE:
            i += 2
            continue
        if not a.startswith("-"):
            positional.append(a)
        i += 1
    return positional if has_e else positional[1:]


def _check_grep_recursive(args: list[str]) -> tuple[str, str] | None:
    flags = _short_flags(args)
    recursive = bool(flags & {"-r", "-R", "--recursive", "--dereference-recursive"}) or \
        _option_value(args, ("-d", "--directories")) == "recurse"
    if not recursive:
        return None
    excludes = [args[i + 1] for i, a in enumerate(args[:-1]) if a == "--exclude"] + \
        [a.split("=", 1)[1] for a in args if a.startswith("--exclude=")]
    if any(fnmatch.fnmatch(".env", pat.strip("\"'")) for pat in excludes):
        return None
    project = _project_dir()
    for t in _grep_files(args) or ["."]:
        d = _abs(t)
        try:
            names = os.listdir(d) if os.path.isdir(d) else []
        except OSError:
            names = []
        if d != project and project.startswith(d.rstrip("/") + "/"):
            try:
                names = names + os.listdir(project)
            except OSError:
                pass
        if any(is_secret_path(n) for n in names):
            return ASK, (f"grep -r は .gitignore を見ないので、{t} にある鍵ファイルの中身まで出力に出ます。"
                         "Grep ツールか git grep を使うか、--exclude='.env*' を付けてください")
    return None


def _check_value_display(name: str, args: list[str]) -> tuple[str, str] | None:
    if name in ("echo", "printf") and any(SECRET_VAR_REF.search(a) for a in args):
        return ASK, "鍵らしき環境変数の値を画面に出します"
    if name == "printenv" and any(SECRET_VAR.fullmatch(a) for a in args if not a.startswith("-")):
        return ASK, "鍵らしき環境変数の値を画面に出します"
    return None


def _secret_hit(paths: list[str]) -> str | None:
    for a in paths:
        for part in [a, *a.split("=")[1:]]:
            if is_secret_path(part):
                return os.path.basename(part.strip("\"'"))
    return None


def _check_secret_args(name: str, args: list[str]) -> tuple[str, str] | None:
    read_msg = "鍵ファイル {} に触れます。中身は scripts/with-env が実行時に読むので、開く必要があるか確認してください"
    if name in GREP_COMMANDS or name in ("rg", "ag"):
        hit = _secret_hit(_grep_files(args))
        return (ASK, read_msg.format(hit)) if hit else None
    if name == "git":
        sub, rest = _git_subcommand(args)
        if sub in GIT_NON_READING:
            return None
        hit = _secret_hit(rest)
        return (ASK, read_msg.format(hit)) if hit else None
    if name in NON_READING_COMMANDS:
        return None
    if name in ("cp", "mv", "rsync", "scp", "install", "ln"):
        plain = [a for a in args if not a.startswith("-")]
        hit = _secret_hit(plain[:-1])
        if hit:
            return ASK, read_msg.format(hit)
        if plain and is_secret_path(plain[-1]) and os.path.exists(_abs(plain[-1])):
            return ASK, f"鍵ファイル {os.path.basename(plain[-1])} を上書きします。今の鍵が消えます"
        return None
    hit = _secret_hit(args)
    return (ASK, read_msg.format(hit)) if hit else None


def _unwrap_runner(name: str, args: list[str]) -> list[str] | None:
    """npx wrangler deploy や python -m twine upload の、実際に動くコマンドを取り出す"""
    rest: list[str] | None = None
    if name in ("npx", "bunx", "uvx", "pnpx"):
        rest = args
    elif name in ("pnpm", "yarn", "npm", "bun") and args[:1] in (["dlx"], ["exec"], ["x"]):
        rest = args[1:]
    elif name in ("uv", "pipx", "poetry", "pdm") and args[:1] == ["run"]:
        rest = args[1:]
    elif re.fullmatch(r"python[0-9.]*", name) and args[:1] == ["-m"] and len(args) > 1:
        return args[1:]
    if rest is None:
        return None
    i = 0
    while i < len(rest) and (rest[i].startswith("-") or rest[i] == "--"):
        i += 2 if rest[i] in ("-p", "--package") else 1
    return rest[i:] or None


def check_simple_command(argv: list[str], depth: int = 0) -> tuple[str, str] | None:
    argv, result = _strip_prefixes(argv)
    if not argv:
        return result
    name = os.path.basename(argv[0])
    args = argv[1:]

    if name == "with-env":
        # 鍵の読み込み役。本体は .env を読むが、後ろに続くコマンドは普通に調べる
        return _stronger(result, check_simple_command(args, depth + 1)) if depth < 3 else result
    inner = _unwrap_runner(name, args)
    if inner is not None and depth < 3:
        return _stronger(result, check_simple_command(inner, depth + 1))
    if name in SHELLS and "-c" in args and depth < 3:
        idx = args.index("-c")
        if idx + 1 < len(args):
            result = _stronger(result, check_bash(args[idx + 1], depth + 1))
    if name == "rm":
        result = _stronger(result, _check_rm(args))
    elif name == "git":
        result = _stronger(result, _check_git(args))
    elif name == "gh":
        result = _stronger(result, _check_gh(args))
    elif name in ("curl", "wget"):
        result = _stronger(result, _check_send(name, args))
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
    elif name == "find" and ("-delete" in args or any(a in ("-exec", "-execdir", "-ok") and i + 1 < len(args) and
                                                      os.path.basename(args[i + 1]) == "rm" for i, a in enumerate(args))):
        result = _stronger(result, (ASK, "find でまとめて削除します"))
    elif name == "declare" and any(SECRET_VAR.fullmatch(a) for a in args if not a.startswith("-")):
        result = _stronger(result, (ASK, "鍵らしき環境変数の値を画面に出します"))
    elif name in ("export", "set", "declare") and (not args or args == ["-p"]):
        result = _stronger(result, (ASK, "環境変数を全部表示します。鍵が画面に出るおそれがあります"))

    result = _stronger(result, _check_deploy(name, args))
    result = _stronger(result, _check_value_display(name, args))
    if name in GREP_COMMANDS:
        result = _stronger(result, _check_grep_recursive(args))
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

    # < .env は読み取り、> .env と >> .env は、すでにある鍵ファイルへの書き込みとして扱う
    for i, tok in enumerate(tokens[:-1]):
        target = tokens[i + 1]
        if not is_secret_path(target):
            continue
        if tok == "<":
            return ASK, f"鍵ファイル {os.path.basename(target)} を入力として読みます"
        if ">" in tok and "<" not in tok and not tok.endswith("&") and os.path.exists(_abs(target)):
            return ASK, f"鍵ファイル {os.path.basename(target)} に書き込みます。上書きすると今の鍵が消えます"

    result: tuple[str, str] | None = None
    for pipeline in _split_pipelines([t for t in tokens if t not in ("<", ">", ">>", "<<", "<<<", ">&", "<&", "&>", "&>>", ">|")]):
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
    global CWD
    CWD = payload.get("cwd") or os.getcwd()
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}
    if tool_name == "Bash":
        return check_bash(tool_input.get("command", ""))
    if tool_name in ("Read", "Edit", "Write", "MultiEdit", "NotebookEdit", "Grep"):
        return check_file_tool(tool_name, tool_input)
    if tool_name.startswith("mcp__"):
        return check_mcp(tool_name)
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
