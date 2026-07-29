# avatar_pipeline — 立ち絵 → 3Dモデル → 自動リグ → VRM / Godot

[@uzuki425 氏の投稿](https://x.com/uzuki425/status/2081725340230255078) で紹介されていた
3つのリポジトリを、手元で通しで動かすためのセットアップ一式。

上流のコードは vendor せず、`setup.sh` が `repos/` 配下に clone してそれぞれ専用の
venv を作る(`repos/` は `.gitignore` 済み)。ここに入っているのは配線と検証だけ。

| リポジトリ | 役割 | 実行環境 |
|---|---|---|
| [animede/diffusers-server](https://github.com/animede/diffusers-server) | 立ち絵そのものを生成 | GPU **48GB級VRAM** |
| [animede/image-3d](https://github.com/animede/image-3d) | 立ち絵 → 3Dメッシュ+テクスチャ | GPU 16〜32GB / **GPU無しでも mock で動く** |
| [animede/rig-service](https://github.com/animede/rig-service) | GLB → 21ボーン自動リグ → VRM 1.0 | **CPUのみ** (bpy 4.5 / Python 3.11) |

2つのサービスは HTTP だけで繋がる疎結合なので、片方だけでも単体で使える。
3Dプリントが目的なら rig-service は起動しなくてよい。

## 必要なもの

- **Python 3.11 と 3.12 の両方**
  - rig-service は 3.11 が必須(`bpy` に cp311 ホイールしか無い)
  - image-3d は 3.12
  - [`uv`](https://docs.astral.sh/uv/) があれば足りない方を自動で調達するので、
    システムに片方しか無くても構わない
- git、curl
- ディスク 5GB 程度(bpy が数百MBある)
- GPU は任意。無ければ image-3d は mock 形状にフォールバックする

## 使い方

```bash
cd avatar_pipeline
./setup.sh                  # clone + venv + 依存インストール
./start.sh                  # image-3d(:8020) と rig-service(:8100) を起動
./smoke_test.sh             # 立ち絵→3D→リグ→VRM を通しで検証
./smoke_test.sh --rig-only  # image-3d を通さずリグ経路だけを検証
```

ブラウザで <http://127.0.0.1:8020> を開き、**腕を水平に広げたTポーズの立ち絵**を
アップロードする。生成が終わると「リグ/VRM化」ボタンが出るので押すと rig-service に
渡り、リグ済み GLB と VRM 1.0 が得られる。

停止は `./stop.sh`。ログは `.run/*.log`。

### 環境変数

`start.sh` は以下を見る(いずれも省略可)。

| 変数 | 既定 | 説明 |
|---|---|---|
| `IMAGE3D_PORT` | `8020` | image-3d の待ち受けポート |
| `RIGSVC_PORT` | `8100` | rig-service の待ち受けポート |
| `IMAGE3D_GENERATOR` | `auto` | `auto` \| `mock` \| `hunyuan3d` |
| `RIGSVC_ENGINE` | `auto` | `auto` \| `bpy` \| `blender_cli` |
| `IMAGE3D_RIGSVC_URL` | `http://127.0.0.1:8100` | image-3d から見た rig-service |

`IMAGE3D_RIGSVC_URL` が要点で、これが設定されていないと WebUI に「リグ/VRM化」
ボタンが出ない(APIで直接渡すことは変わらずできる)。

## GPU で実モデルに切り替える

既定の `auto` は GPU と `hy3dgen` が揃っていれば自動で Hunyuan3D-2 を使い、
無ければ mock に落ちる。実モデルを使うには GPU 側の依存を追加で入れる。

```bash
uv pip install --python repos/image-3d/.venv/bin/python -r repos/image-3d/requirements-gpu.txt
IMAGE3D_GENERATOR=hunyuan3d ./start.sh
```

VRAM の目安(上流 README の実測値):

| 機能 | 実測ピーク | 最小要件 |
|---|---|---|
| mock のみ | — | GPU不要 |
| 形状生成 | 約12GB | 16GB |
| + テクスチャ生成 (`texture_mode=paint`) | 約25GB | 32GB |

立ち絵の生成まで含める場合は `./setup.sh --with-diffusers` で diffusers-server も
clone する。ただし torch(CUDA) と **git 版の diffusers** が別途必要で、48GB級の
VRAM を前提とする。手順は上流 README に従うこと。

## mock で動かしたときの見え方

image-3d が mock ジェネレータのとき、返ってくるのは人型ではない抽象形状
(トーラス結び目の頭 + カプセル胴 + 球の腕)。そのため rig-service は
「Tポーズと判定できませんでした」と警告を返す。

これは配線の不具合ではなく mock 形状の性質で、警告つきでも 21ボーンのリグと
VRM 1.0 は生成される。`smoke_test.py` も警告の有無ではなく、ボーン数21・
ウェイト付与率1.0・VRM 1.0 出力という構造的な条件だけを判定している。

Tポーズ判定まで通したい場合は GPU で実モデルに切り替えるか、実際のTポーズ立ち絵から
作った GLB を rig-service に直接投げる。GPUが無い状態でリグ経路そのものを確かめたい
なら、合成のTポーズ人型メッシュを直接投げるモードがある。

```bash
./smoke_test.sh --rig-only
```

こちらは image-3d を経由せず、`t_pose=True`・警告なし・ウェイト付与率1.0 で
21ボーンのリグと VRM 1.0 が出るところまで確認できる。

## つまずきやすいところ

上流のドキュメントと、実際に動かして踏んだもの。

- **腕は必ず水平に広げる** — 斜めだと関節位置を推定できず、リグ精度が大きく落ちる
- **背景を白にしない** — 白い影が飛んで陰影が消える。単色かキーイング(rembg)で抜く
- **座標系** — image-3d は Z-up / mm、VRM と Godot は Y-up / メートル。
  受け渡し時に変換される。`up_axis` で明示指定できる
- **VRM のライセンス既定値は最も制限的**(作者のみ・非営利・改変再配布不可)。
  緩めるなら `vrm_meta` で明示する
- **venv をディレクトリごと移動すると壊れる** — `bin/` のスクリプトが shebang に
  絶対パスを埋めるため。`start.sh` は `python -m` 経由なので影響を受けない

## 出力

`smoke_test.sh` は `out/` に書き出す。

- `tpose.png` — 入力に使ったダミー立ち絵
- `mesh.glb` — image-3d が生成した3Dメッシュ
- `rigged.glb` — 21ボーンのリグ済み GLB(Godot 4 にそのままインポートできる)
- `rigged.vrm` — VRM 1.0(VRChat / VTuber系アプリ向け)
- `preview.png` — rig-service が描いた正面プレビュー
