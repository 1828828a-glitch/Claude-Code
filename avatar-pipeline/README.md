# アバターパイプライン（画像 → 3D → リグ → VRM）

animede 氏の3リポジトリを、このリポジトリから叩けるようにしたもの。

| リポジトリ | 役割 | この環境で動くか |
|---|---|---|
| [image-3d](https://github.com/animede/image-3d) | 画像から3Dモデル（STL / 3MF / GLB / OBJ） | **動く**（mock ジェネレータ）／実モデルは GPU 必要 |
| [rig-service](https://github.com/animede/rig-service) | GLB に21ボーンを自動付与し VRM 1.0 出力 | **動く**（bpy 4.5 LTS、CPU のみ） |
| [diffusers-server](https://github.com/animede/diffusers-server) | 画像・動画生成（Qwen-Image / FLUX.2 / LTX-2.3 等） | **動かない**（CUDA + VRAM 48GB 級が前提） |

## 使い方

```bash
./avatar-pipeline/setup.sh     # clone + venv 作成（bpy のダウンロードで数分かかる）
./avatar-pipeline/run.sh       # image-3d(:8000) と rig-service(:8100) を起動
./avatar-pipeline/demo.sh      # 画像 → GLB → リグ → VRM を一本で通す
./avatar-pipeline/run.sh stop  # 停止
```

`demo.sh` は引数に画像を渡せる（省略時は `samples/tpose.png`）。
生成物は `out/` に落ちる。Web UI は http://127.0.0.1:8000 。

`repos/` と `out/` は git 管理外。`setup.sh` は動作確認したリビジョンに固定して clone する。

## この環境で実際に確認したこと

- `image-3d` は `/api/health` が `generator: mock, gpu.available: false` で起動し、
  画像アップロード → ジョブ → メッシュ後処理 → GLB / STL / 3MF / OBJ ダウンロードまで通る
- `rig-service` は `engine: bpy (4.5.12 LTS)` / `vrm_export_available: true` で起動し、
  上の GLB を受け取って21ボーンのリグ済み GLB と VRM 1.0、プレビュー PNG を返す
- 出力例: [`samples/preview.png`](samples/preview.png)

## 制約（重要）

- **形は入力画像に依存しない。** GPU が無いので image-3d は mock ジェネレータで動く。
  これは決定的なテスト用メッシュ（花びら状の柱型）を返すモードで、アップロードした画像の
  内容は形状に反映されない。パイプラインの疎通確認用と割り切ること。
  実際に画像から起こすには NVIDIA GPU（形状のみで VRAM 16GB、テクスチャ生成まで含めると 32GB）と
  `IMAGE3D_GENERATOR=hunyuan3d` が要る
- **diffusers-server はこのコンテナでは起動できない。** GPU が無いため。コードだけ取得したい場合は
  `./avatar-pipeline/setup.sh --with-diffusers`。実行は手元の GPU マシンで
  リポジトリの README に従う
- **rig-service は Tポーズ前提。** Tポーズの立ち絵から起こしたモデルを渡す設計になっている
- bpy は cp311 ホイールしか無いため、rig-service の venv は Python 3.11 で作る必要がある
  （`setup.sh` が 3.11 を探す。無ければ `uv venv --python 3.11` を案内する）
