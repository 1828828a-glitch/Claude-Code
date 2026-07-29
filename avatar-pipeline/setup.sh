#!/usr/bin/env bash
# 画像 → 3D → 自動リグ/VRM のパイプラインを用意する（animede 氏の3リポジトリ）。
#   image-3d        画像から3Dモデル（GPUなしの mock ジェネレータあり）
#   rig-service     GLB にヒューマノイドボーンを自動付与し VRM 1.0 で出力（CPUで動く）
#   diffusers-server 画像/動画生成（CUDA 必須。--with-diffusers 指定時のみ clone）
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repos="$here/repos"
mkdir -p "$repos"

# 動作確認したリビジョン。追従したいときはここを上げる。
IMAGE3D_REV="${IMAGE3D_REV:-8634058dd7e96ac0f6462f93a52dfe2cc48fe9f7}"
RIGSVC_REV="${RIGSVC_REV:-aa33ed8a91f9234afc3c18bb4c165be783f6b085}"
DIFFUSERS_REV="${DIFFUSERS_REV:-3d6bfea2d755cc8341cdf24b8c90cd073beff60f}"

with_diffusers=0
[ "${1:-}" = "--with-diffusers" ] && with_diffusers=1

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

clone_at() { # $1 repo URL / $2 dir / $3 branch / $4 rev
  local url="$1" dir="$2" branch="$3" rev="$4"
  if [ -d "$dir/.git" ]; then
    git -C "$dir" fetch --quiet origin "$branch"
  else
    git clone --quiet -b "$branch" "$url" "$dir"
  fi
  git -C "$dir" checkout --quiet "$rev"
  echo "  $dir @ $(git -C "$dir" rev-parse --short HEAD)"
}

# bpy は cp311 ホイールしか無いため rig-service は Python 3.11 が要る
find_py311() {
  for c in python3.11 python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info[:2]==(3,11) else 1)'; then
      command -v "$c"; return 0
    fi
  done
  return 1
}

say "1/4 image-3d を取得"
clone_at https://github.com/animede/image-3d "$repos/image-3d" master "$IMAGE3D_REV"

say "2/4 image-3d の依存を導入（mock モード用。GPU 依存は入れない）"
python3 -m venv "$repos/image-3d/.venv"
"$repos/image-3d/.venv/bin/pip" install -q --upgrade pip
"$repos/image-3d/.venv/bin/pip" install -q -r "$repos/image-3d/requirements.txt"
echo "  OK ($("$repos/image-3d/.venv/bin/python" -V))"

say "3/4 rig-service を取得"
clone_at https://github.com/animede/rig-service "$repos/rig-service" main "$RIGSVC_REV"

say "4/4 rig-service の依存を導入（bpy を含むため数分かかる）"
py311="$(find_py311 || true)"
if [ -z "$py311" ]; then
  echo "  ! Python 3.11 が見つかりません（bpy は cp311 ホイールのみ）。" >&2
  echo "    uv があれば: uv venv --python 3.11 $repos/rig-service/.venv-rig" >&2
  exit 1
fi
"$py311" -m venv "$repos/rig-service/.venv-rig"
"$repos/rig-service/.venv-rig/bin/pip" install -q --upgrade pip
"$repos/rig-service/.venv-rig/bin/pip" install -q -r "$repos/rig-service/requirements.txt"
echo "  OK ($("$repos/rig-service/.venv-rig/bin/python" -c 'import bpy; print("bpy", bpy.app.version_string)'))"

if [ "$with_diffusers" = 1 ]; then
  say "追加: diffusers-server を取得（CUDA GPU 必須。依存は導入しない）"
  clone_at https://github.com/animede/diffusers-server "$repos/diffusers-server" main "$DIFFUSERS_REV"
  echo "  ! この環境では動きません。VRAM 48GB 級の GPU マシンで"
  echo "    repos/diffusers-server/README.md の手順に従ってください。"
fi

say "セットアップ完了"
echo "サーバ起動: ./avatar-pipeline/run.sh"
echo "E2E デモ:   ./avatar-pipeline/demo.sh"
