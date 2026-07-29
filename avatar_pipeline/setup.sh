#!/usr/bin/env bash
# 立ち絵 → 3Dモデル → 自動リグ → VRM/Godot パイプラインのセットアップ。
#
# animede 氏の3リポジトリを clone し、それぞれ専用の venv を作って依存を入れる。
#   - image-3d       … 画像→3Dメッシュ (Python 3.12 / GPU任意)
#   - rig-service    … GLB→21ボーン自動リグ+VRM 1.0 (Python 3.11 必須 / CPUのみ)
#   - diffusers-server … 立ち絵そのものの生成 (Python 3.12 / 要48GB級VRAM, --with-diffusers 指定時のみ)
#
# 使い方:
#   ./setup.sh                  # image-3d + rig-service
#   ./setup.sh --with-diffusers # 上に加えて diffusers-server も
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_DIR="$SCRIPT_DIR/repos"

WITH_DIFFUSERS=0
for arg in "$@"; do
  case "$arg" in
    --with-diffusers) WITH_DIFFUSERS=1 ;;
    -h|--help) sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "不明な引数: $arg" >&2; exit 2 ;;
  esac
done

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null || die "git が見つかりません。"

HAVE_UV=0
command -v uv >/dev/null && HAVE_UV=1
[ "$HAVE_UV" -eq 1 ] || warn "uv が無いためシステムの python3.11 / python3.12 を使います。uv があれば必要な Python を自動調達できます: https://docs.astral.sh/uv/"

# clone_or_update <name> <url> <branch>
clone_or_update() {
  local name="$1" url="$2" branch="$3"
  if [ -d "$REPOS_DIR/$name/.git" ]; then
    log "$name: 既存の clone を更新"
    git -C "$REPOS_DIR/$name" fetch --depth 1 origin "$branch"
    git -C "$REPOS_DIR/$name" reset --hard "origin/$branch"
  else
    log "$name: clone"
    git clone --depth 1 -b "$branch" "$url" "$REPOS_DIR/$name"
  fi
}

# make_venv <repo_dir> <venv_name> <python_version>
# bpy のように cp311 ホイールしか無いものがあるため、Python のバージョンは厳密に指定する。
make_venv() {
  local repo_dir="$1" venv_name="$2" pyver="$3"
  local venv_path="$repo_dir/$venv_name"

  if [ -x "$venv_path/bin/python" ]; then
    local cur
    cur="$("$venv_path/bin/python" -c 'import sys;print("%d.%d"%sys.version_info[:2])')"
    if [ "$cur" = "$pyver" ]; then
      echo "$venv_path"
      return 0
    fi
    warn "$venv_name は Python $cur で作られています。$pyver で作り直します。"
    rm -rf "$venv_path"
  fi

  if [ "$HAVE_UV" -eq 1 ]; then
    uv venv --python "$pyver" "$venv_path" >/dev/null
  else
    command -v "python$pyver" >/dev/null \
      || die "python$pyver が見つかりません。uv を入れるか python$pyver を用意してください。"
    "python$pyver" -m venv "$venv_path"
  fi
  echo "$venv_path"
}

# pip_install <venv_path> <args...>
pip_install() {
  local venv_path="$1"; shift
  if [ "$HAVE_UV" -eq 1 ]; then
    uv pip install --python "$venv_path/bin/python" "$@"
  else
    "$venv_path/bin/python" -m pip install --upgrade pip >/dev/null
    "$venv_path/bin/python" -m pip install "$@"
  fi
}

mkdir -p "$REPOS_DIR"

# --- image-3d (デフォルトブランチは master) ---------------------------------
clone_or_update image-3d https://github.com/animede/image-3d.git master
log "image-3d: venv (Python 3.12) + 依存"
# requirements.txt は base 依存のみ(torch を含まない)。GPU 実モデルは
# requirements-gpu.txt 側で、ここでは入れない(README「Phase 1」構成)。
I3D_VENV="$(make_venv "$REPOS_DIR/image-3d" .venv 3.12)"
pip_install "$I3D_VENV" -r "$REPOS_DIR/image-3d/requirements.txt"

# --- rig-service ------------------------------------------------------------
clone_or_update rig-service https://github.com/animede/rig-service.git main
log "rig-service: venv (Python 3.11 必須) + 依存 (bpy は数百MBあります)"
RIG_VENV="$(make_venv "$REPOS_DIR/rig-service" .venv-rig 3.11)"
pip_install "$RIG_VENV" -r "$REPOS_DIR/rig-service/requirements.txt"

# --- diffusers-server (任意) ------------------------------------------------
if [ "$WITH_DIFFUSERS" -eq 1 ]; then
  clone_or_update diffusers-server https://github.com/animede/diffusers-server.git main
  log "diffusers-server: venv (Python 3.12) + 依存"
  warn "diffusers-server は 48GB級VRAM を前提とし、torch(CUDA) と diffusers の git 版が要ります。"
  warn "ここでは requirements.txt のみ入れます。torch と diffusers は上流 README の手順で別途入れてください。"
  DIFF_VENV="$(make_venv "$REPOS_DIR/diffusers-server" .venv 3.12)"
  pip_install "$DIFF_VENV" -r "$REPOS_DIR/diffusers-server/requirements.txt" \
    || warn "diffusers-server の依存解決に失敗しました。GPU環境で上流 README の手順を実行してください。"
fi

log "セットアップ完了"
cat <<'EOS'

次にやること:
  ./start.sh        # image-3d(:8020) と rig-service(:8100) を起動
  ./smoke_test.sh   # 立ち絵→3D→リグ→VRM を通しで検証

GPU があるなら実モデル生成に切り替えられます:
  repos/image-3d/ で requirements-gpu.txt を入れたうえで
  IMAGE3D_GENERATOR=hunyuan3d ./start.sh
EOS
