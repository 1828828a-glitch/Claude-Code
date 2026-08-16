# MiniMax-H3 を ComfyUI で動かす（低 VRAM 向けセットアップ）

Comfy-Org が Hugging Face で公開している [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3)
の再配布版を、手元の GPU に合う量子化だけ選んでダウンロードするスクリプトです。

きっかけはこの記事:
[動画生成AI「MiniMax-H3」のComfyUI向け軽量版が登場、少ないVRAMでも動作](https://www.techno-edge.net/article/2026/08/15/5394.html)

## なぜスクリプトが要るのか

配布リポジトリには bf16 / int8_convrot / fp8_scaled / pruned が全部入っていて、合計 438GB あります。
実際に必要なのは **拡散モデル 1 本 + テキストエンコーダ 1 本 + VAE 2 本** の 4 ファイルだけ。
どれを選ぶかは VRAM だけでなく、PyTorch が cu130 ビルドかどうか、GPU が sm89 以降かどうかでも変わります。
そこを自動判定して、必要な分だけ ComfyUI の `models/` に置きます。

## 使い方

```bash
# 1. まず判定結果と、落とす予定のファイルを見る（何もダウンロードしない）
python setup_minimax_h3.py

# 2. 問題なければ実行。ComfyUI が自動検出されない場合は --comfy で指定
python setup_minimax_h3.py --comfy ~/ComfyUI --download --workflows

# 3. 落としたファイルの sha256 を検証
python setup_minimax_h3.py --comfy ~/ComfyUI --verify
```

**ComfyUI の venv の python で実行してください。** そこから `import torch` できないと
CUDA バージョンや compute capability が読めず、量子化の自動判定をスキップします。

その他のオプション:

| オプション | 意味 |
|---|---|
| `--preset auto\|max\|high\|mid\|low` | 構成を明示指定。既定は `auto`（VRAM から判定） |
| `--task fl2va\|ref2va\|both` | fl2va = t2v / 先頭・末尾フレーム指定の i2v（既定）、ref2va = 参照入力モード |
| `--turbo` | 4step turbo LoRA も落とす（生成ステップを削れる） |
| `--workflows` | 公式ワークフロー 3 種を `user/default/workflows/` に置く |
| `--list` / `--presets` | 配布ファイル一覧 / プリセット一覧を表示 |

依存は標準ライブラリのみです。`huggingface_hub` が入っていればそちらを使い（速い）、
無ければ Range ヘッダによるレジューム付きの HTTP 取得にフォールバックします。
途中で切れても、同じコマンドを叩き直せば続きから取得します。

## プリセット

| プリセット | VRAM の目安 | 拡散モデル | テキストエンコーダ | 合計 |
|---|---|---|---|---|
| `max` | 80GB〜 | full / bf16 | bf16 | 115.1GB |
| `high` | 40GB〜 | full / int8_convrot | int8_convrot | 62.4GB |
| `mid` | 20GB〜 | pruned / int8_convrot | nvfp4_awq | 39.6GB |
| `low` | 20GB 未満 | pruned / int8_convrot + turbo LoRA | nvfp4_awq | 41.4GB |

`mid` の組み合わせが ComfyUI 公式ワークフローテンプレートの既定値です
（`minimax_h3_fl2va_pruned_int8_convrot` + `qwen3vl_32b_minimax_h3_nvfp4_awq`）。

VRAM が足りない場合でも ComfyUI は使っていない重みを system RAM へ退避するので、
16GB クラスでも RAM に余裕があれば動きます。そのぶん転送待ちで遅くなるので、
RAM 64GB 以上と `--lowvram` 起動を勧めます。

## 量子化の選び方

Comfy-Org の README にある通りの優先順位です。

- **int8_convrot** — 第一候補。ただし **PyTorch が cu130 ビルドである必要があります**。
  `python -c "import torch; print(torch.version.cuda)"` が `13.0` 以上ならこれ。
- **fp8_scaled** — int8_convrot が使えないときの代替。pruned 版にしか存在せず、
  fp8 なので Ada (sm89) 以降が必要。
- **bf16** — 量子化なし。上記どちらも使えない環境（例: RTX 3090 は sm86 なので fp8 不可）向け。
  pruned bf16 で 37.5GB、full bf16 で 61.7GB。

テキストエンコーダ（Qwen3-VL-32B）側は **nvfp4_awq が Blackwell 必須ではありません**。
14.6GB まで落ちるので、VRAM が厳しいならまずここを nvfp4 にするのが効きます。

スクリプトは条件を満たさない量子化を自動で降格し、その理由を出力します。

```
  ※ PyTorch が cu130 ビルドでないため int8_convrot -> fp8_scaled に降格。
```

## pruned 版とは

AdaLN 分岐に約 13B パラメータが乗っており、その変調出力は事前計算してキャッシュできるため、
**推論だけなら読み込む必要がありません**（[本家モデルカード](https://huggingface.co/MiniMaxAI/MiniMax-H3)より）。
pruned 版はそこを落としたもので、bf16 同士で比べると 61.7GB → 37.5GB になります。
ファインチューニングをするなら full 版が要ります。

## 配布ファイル一覧

`python setup_minimax_h3.py --list` で同じものが出ます。

| 種別 | ファイル | サイズ |
|---|---|---|
| diffusion_models | `minimax_h3_fl2va_bf16` | 61.73 GB |
| | `minimax_h3_fl2va_int8_convrot` | 31.70 GB |
| | `minimax_h3_fl2va_pruned_bf16` | 37.46 GB |
| | `minimax_h3_fl2va_pruned_fp8_scaled` | 19.52 GB |
| | `minimax_h3_fl2va_pruned_int8_convrot` | 19.53 GB |
| | `minimax_h3_ref2va_*`（同じ 5 種） | 同上 |
| text_encoders | `qwen3vl_32b_minimax_h3_bf16` | 47.97 GB |
| | `qwen3vl_32b_minimax_h3_int8_convrot` | 25.28 GB |
| | `qwen3vl_32b_minimax_h3_nvfp4_awq` | 14.61 GB |
| loras | `minimax_h3_fl2v_turbo_4step_v1.0_768p` | 1.82 GB |
| | `minimax_h3_fl2v_turbo_8step_v1.0` | 1.82 GB |
| | `minimax_h3_ref2v_turbo_4step_v0.1` | 1.82 GB |
| vae | `minimax_h3_video_vae_fp16` | 4.85 GB |
| | `minimax_h3_audio_vae_fp32` | 0.56 GB |

配置先はリポジトリの構成そのままで、`ComfyUI/models/` 以下に同じ階層で入ります。

## fl2va と ref2va

| | 入力 | ComfyUI ノード |
|---|---|---|
| **fl2va** | 画像 0〜2 枚。0 枚なら t2v、1 枚で先頭 or 末尾フレーム指定、2 枚で先頭と末尾の間を生成 | `MiniMaxH3ImageToVideo` |
| **ref2va** | 画像 9 枚まで / 動画 3 本まで / 音声 3 本まで（合計 12 ファイル、総尺 15 秒以内） | reference2video テンプレート |

まず試すなら `fl2va` だけで十分です（既定）。両方欲しければ `--task both`。

## 生成仕様

- 長さ 4〜15 秒 / 24fps / 音声 32kHz ステレオ
- 短辺 768px が標準。ComfyUI 版では 768x1344 が上限で、32 の倍数に丸められる
- フレーム数は 24fps で 17 フレーム単位のブロック（`17k+5`）に切り上げられる
- 台詞は日本語・英語・中国語ほか 11 言語
- 2K 出力の `H3-Regenerate-2K` は**未オープンソース**（API のみ）。ローカルは 768p まで

音声は後付けではなく、映像と同じ 1 回の forward で一緒に生成されます。
プロンプトには映像の指示だけでなく、台詞・SE・BGM も同じブロックに書きます。

## ComfyUI 側の手順

1. ComfyUI を最新にする（[更新ガイド](https://docs.comfy.org/installation/update_comfyui)）。
   Desktop / Cloud 版は stable 追従なので、nightly でしか対応していないノードは未提供のことがあります。
2. このスクリプトでモデルを配置する。
3. ComfyUI を再起動し、`--workflows` で落としたテンプレートを読み込む。

公式ワークフローの直リンク:

- [t2v](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_minimax_h3_t2v.json)
- [i2v](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_minimax_h3_i2v.json)
- [r2v](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_minimax_h3_r2v.json)

## ライセンス

モデルの重みは MiniMax H3 Community License に従います。取得前に
[LICENSE](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE) を確認してください。
このディレクトリのスクリプト自体はリポジトリのライセンスに従います。
