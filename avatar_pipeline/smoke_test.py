"""立ち絵 → 3Dメッシュ → 自動リグ → VRM/GLB を通しで検証する。

start.sh で両サービスを起動した状態で実行する。Tポーズのダミー立ち絵を作り、
image-3d に投げて GLB を取り、それを rig-service に渡して 21ボーンのリグ済み
GLB / VRM 1.0 / プレビューPNG を out/ に書き出す。

image-3d が mock ジェネレータで動いている場合、出てくるのは人型ではない
抽象形状なので rig-service は「Tポーズと判定できない」と警告を返す。これは
配線が壊れているのではなく mock 形状の性質で、警告つきでも成果物は出る。
実モデル(hunyuan3d)にすると Tポーズ判定まで通る。

  --rig-only
      image-3d を通さず、合成したTポーズ人型メッシュを rig-service に直接投げる。
      mock 形状では Tポーズ判定を通せないため、GPUが無い環境でリグ経路そのものを
      確かめたいときに使う。
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
from pathlib import Path

import httpx
import trimesh
from PIL import Image, ImageDraw

IMAGE3D = os.environ.get("IMAGE3D_URL", "http://127.0.0.1:8020")
RIGSVC = os.environ.get("RIGSVC_URL", "http://127.0.0.1:8100")
OUT = Path(__file__).resolve().parent / "out"

# 生成ジョブはCPUのmockなら数秒、GPUの実モデルだと数分かかる
GEN_TIMEOUT_SEC = int(os.environ.get("SMOKE_GEN_TIMEOUT", "600"))
RIG_TIMEOUT_SEC = int(os.environ.get("SMOKE_RIG_TIMEOUT", "300"))


def step(msg: str) -> None:
    print(f"\n\033[1;36m==> {msg}\033[0m", flush=True)


def fail(msg: str) -> "None":
    print(f"\033[1;31m[error]\033[0m {msg}", file=sys.stderr)
    raise SystemExit(1)


def make_tpose_png() -> bytes:
    """腕を水平に広げたTポーズのダミー立ち絵。

    rig-service はシルエットから関節位置を推定するので、腕は必ず水平に広げる
    (斜めだと関節位置を推定できない)。背景は白ではなく淡い色にする —
    上流ドキュメントにある通り、白背景だと白い影が飛んで陰影が消える。
    """
    w, h = 768, 768
    im = Image.new("RGB", (w, h), (216, 226, 234))
    d = ImageDraw.Draw(im)
    body = (74, 78, 92)
    d.ellipse([344, 88, 424, 178], fill=body)        # 頭
    d.rectangle([336, 178, 432, 468], fill=body)     # 胴
    d.rectangle([118, 208, 336, 262], fill=body)     # 左腕(水平)
    d.rectangle([432, 208, 650, 262], fill=body)     # 右腕(水平)
    d.rectangle([346, 468, 382, 700], fill=body)     # 左脚
    d.rectangle([386, 468, 422, 700], fill=body)     # 右脚
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def make_tpose_mesh_glb() -> bytes:
    """合成のTポーズ人型メッシュ(Z-up / mm)。

    image-3d の mock 形状は人型ではないので Tポーズ判定を通せない。リグ経路だけを
    確かめるために、腕を水平に伸ばした箱組みの人型を作る。rig-service は
    シルエットから関節位置を推定するので、これでも t_pose=True まで到達する。
    箱のままだと頂点が粗すぎて一部のボーンに頂点が割り当たらないため細分割する。
    """
    def box(cx, cy, cz, sx, sy, sz):
        b = trimesh.creation.box(extents=(sx, sy, sz))
        b.apply_translation((cx, cy, cz))
        return b

    parts = [
        box(0, 0, 880, 150, 150, 150),   # 頭
        box(0, 0, 760, 90, 90, 90),      # 首
        box(0, 0, 600, 260, 140, 240),   # 胸
        box(0, 0, 430, 220, 130, 180),   # 腰
        box(-300, 0, 690, 340, 90, 90),  # 左腕(水平)
        box(300, 0, 690, 340, 90, 90),   # 右腕(水平)
        box(-70, 0, 220, 90, 90, 240),   # 左脚
        box(70, 0, 220, 90, 90, 240),    # 右脚
        box(-70, -40, 60, 90, 170, 60),  # 左足
        box(70, -40, 60, 90, 170, 60),   # 右足
    ]
    mesh = trimesh.util.concatenate(parts)
    for _ in range(3):
        mesh = mesh.subdivide()
    return trimesh.Scene(mesh).export(file_type="glb")


def poll(client: httpx.Client, url: str, timeout_sec: int, label: str) -> dict:
    """status が終端になるまでポーリングする。"""
    deadline = time.monotonic() + timeout_sec
    last = {}
    while time.monotonic() < deadline:
        r = client.get(url, timeout=30)
        r.raise_for_status()
        last = r.json()
        status = last.get("status")
        if status in ("completed", "succeeded"):
            return last
        if status in ("failed", "error"):
            fail(f"{label} が失敗しました: {last.get('error')}")
        time.sleep(2)
    fail(f"{label} が {timeout_sec}s 以内に完了しませんでした。最後の状態: {last.get('status')}")
    return {}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--rig-only",
        action="store_true",
        help="image-3d を通さず、合成Tポーズ人型メッシュを rig-service に直接投げる",
    )
    args = parser.parse_args()

    OUT.mkdir(exist_ok=True)
    client = httpx.Client(follow_redirects=True)
    generator = None

    step("ヘルスチェック")
    try:
        rig_health = client.get(f"{RIGSVC}/api/health", timeout=10).json()
        print(f"  rig-service : {json.dumps(rig_health, ensure_ascii=False)}")
        if not args.rig_only:
            i3d_health = client.get(f"{IMAGE3D}/api/health", timeout=10).json()
            print(f"  image-3d    : {json.dumps(i3d_health, ensure_ascii=False)}")
    except httpx.HTTPError as exc:
        fail(f"サービスに繋がりません({exc})。先に ./start.sh を実行してください。")
        return 1

    if not rig_health.get("engine_available"):
        fail("rig-service のリグエンジン(bpy / Blender CLI)が使えません。")

    if not args.rig_only:
        if not i3d_health.get("rigsvc_url"):
            print("  [warn] image-3d が rig-service を認識していません。"
                  "WebUIに「リグ/VRM化」ボタンは出ません(APIでの受け渡しは可能)。")
        generator = i3d_health.get("generator")
        if generator == "mock":
            print("  [note] image-3d は mock ジェネレータです。出力は人型ではない抽象形状で、"
                  "リグのTポーズ警告は想定内です。")

    if args.rig_only:
        step("1/2 合成Tポーズ人型メッシュを用意")
        glb = make_tpose_mesh_glb()
        (OUT / "mesh.glb").write_bytes(glb)
        print(f"  {OUT / 'mesh.glb'} ({len(glb)} bytes)")
        step("2/2 rig-service で自動リグ + VRM化")
    else:
        step("1/4 Tポーズの立ち絵を用意")
        png = make_tpose_png()
        (OUT / "tpose.png").write_bytes(png)
        print(f"  {OUT / 'tpose.png'} ({len(png)} bytes)")

        step("2/4 image-3d で3Dメッシュを生成")
        r = client.post(
            f"{IMAGE3D}/api/jobs",
            files={"image": ("tpose.png", png, "image/png")},
            data={"params": json.dumps({"target_height_mm": 100, "seed": 42})},
            timeout=60,
        )
        r.raise_for_status()
        gen_id = r.json()["job_id"]
        print(f"  job_id={gen_id}")
        poll(client, f"{IMAGE3D}/api/jobs/{gen_id}", GEN_TIMEOUT_SEC, "3D生成ジョブ")

        glb = client.get(
            f"{IMAGE3D}/api/jobs/{gen_id}/download", params={"format": "glb"}, timeout=120
        ).content
        if glb[:4] != b"glTF":
            fail("image-3d から返ったファイルが GLB ではありません。")
        (OUT / "mesh.glb").write_bytes(glb)
        print(f"  {OUT / 'mesh.glb'} ({len(glb)} bytes)")

        step("3/4 rig-service で自動リグ + VRM化")
    # up_axis: image-3d の出力は Z-up 慣習。auto でも判定するが明示しておく。
    r = client.post(
        f"{RIGSVC}/api/rig",
        files={"model": ("mesh.glb", glb, "model/gltf-binary")},
        data={"params": json.dumps({"height_m": 1.6, "up_axis": "z"})},
        timeout=60,
    )
    r.raise_for_status()
    rig_id = r.json()["job_id"]
    print(f"  job_id={rig_id}")
    rig_job = poll(client, f"{RIGSVC}/api/rig/jobs/{rig_id}", RIG_TIMEOUT_SEC, "リグジョブ")

    step("成果物のダウンロードと検証")
    artifacts = {
        "rigged.glb": (f"{RIGSVC}/api/rig/jobs/{rig_id}/download", {"format": "glb"}),
        "rigged.vrm": (f"{RIGSVC}/api/rig/jobs/{rig_id}/download", {"format": "vrm"}),
        "preview.png": (f"{RIGSVC}/api/rig/jobs/{rig_id}/preview.png", {}),
    }
    for name, (url, params) in artifacts.items():
        data = client.get(url, params=params, timeout=180).content
        (OUT / name).write_bytes(data)
        print(f"  {OUT / name} ({len(data)} bytes)")

    summary = rig_job.get("summary", {})
    bones = summary.get("bones", [])
    weights = summary.get("weights", {})
    vrm = summary.get("vrm", {})
    ratio = weights.get("weighted_ratio")

    t_pose = summary.get("measurements", {}).get("t_pose")
    print(f"\n  ボーン数        : {len(bones)}")
    print(f"  ウェイト付与率  : {ratio}")
    print(f"  Tポーズ判定     : {t_pose}")
    print(f"  VRM spec        : {vrm.get('spec_version')} / humanBones {vrm.get('human_bone_count')}")

    warnings = rig_job.get("warnings") or []
    if warnings:
        print("\n  警告:")
        for w in warnings:
            print(f"    - {w}")

    # 配線が通っているかの判定。mock形状ではTポーズ警告が出るのが正常なので、
    # 警告の有無ではなく構造的な成立条件だけを見る。
    problems = []
    if len(bones) != 21:
        problems.append(f"ボーン数が21ではありません: {len(bones)}")
    if ratio is not None and ratio < 1.0:
        problems.append(f"ウェイトの付いていない頂点があります: weighted_ratio={ratio}")
    if vrm.get("spec_version") != "1.0":
        problems.append(f"VRM 1.0 が出ていません: {vrm.get('spec_version')}")
    if (OUT / "rigged.vrm").read_bytes()[:4] != b"glTF":
        problems.append("VRM ファイルが glTF バイナリではありません。")
    # 合成人型は正しいTポーズなので、ここが False なら判定側の異常とみなす。
    # mock 形状は人型ですらないため、この条件は --rig-only のときだけ課す。
    if args.rig_only and not t_pose:
        problems.append("合成Tポーズメッシュが Tポーズと判定されませんでした。")

    if problems:
        print()
        for p in problems:
            print(f"\033[1;31m[error]\033[0m {p}", file=sys.stderr)
        return 1

    print("\n\033[1;32m==> 通しで成功しました。\033[0m")
    if generator == "mock":
        print("   ※ mock形状のためTポーズ警告が出ますが、パイプラインの配線は正常です。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
