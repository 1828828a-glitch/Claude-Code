---
name: irodori-tts
description: 日本語テキストを Irodori-TTS で音声 (WAV) にする。読み上げ、音声合成、ナレーション、セリフや漫才の音声化、声の指定 (キャプションで声質や感情を指示)、参照音声による声のクローンを頼まれたときに使う。Use when the user asks for Japanese text-to-speech, TTS, voice generation or "Irodori".
---

# Irodori-TTS で日本語を読み上げる

Irodori-TTS は Aratako さんが公開している日本語専用の音声合成モデル (コード MIT、重み MIT)。
テキストに加えて、声質や話し方を文章で指示するキャプションと、声をまねる参照音声を条件にできる。
文中に絵文字を入れると、笑いや溜息、囁きなどの演技を足せる。

このスキルの CLI は `scripts/irodori.py` ひとつ。Python 3.10 以上の標準ライブラリだけで動く。

## 2つのバックエンド

space (既定)
: Hugging Face の公式デモ Space `Aratako/Irodori-TTS-v4.1-Small-Demo` を API として呼ぶ。
  GPU もインストールも要らない。ZeroGPU の無料枠を使うため、環境変数 `HF_TOKEN`
  (Hugging Face の Read 権限トークン) が事実上必須。トークンなしだとクラウド環境の IP では
  すぐ枠切れになる。

local
: `scripts/setup_local.sh` で本家リポジトリをインストールして手元で推論する。GPU 付きの PC 向け。
  インストール済みなら `--backend auto` (既定) が自動でこちらを選ぶ。

## Claude がやる手順

1. 状態を確認する。

   ```bash
   python3 .claude/skills/irodori-tts/scripts/irodori.py --check
   ```

   HF トークンが「なし」で local も未インストールなら、生成は枠切れエラーになる可能性が高い。
   その場合はユーザーにトークンの設定を頼む (下の「トークンの設定」)。トークンをチャットに
   貼ってもらうのは避ける。

2. 生成する。出力は作業ディレクトリ内の `tts_output/` (git 管理外) に置くと、ユーザーがアプリから開ける。

   ```bash
   python3 .claude/skills/irodori-tts/scripts/irodori.py "今日はいい天気ですね。散歩にでも行きましょうか。" \
     -c "穏やかで優しい、二十代の女性の声" -o tts_output/greeting.wav
   ```

   成功すると保存先のパスが標準出力に1行ずつ出る。進捗とエラーは標準エラーに出る。
   Space は順番待ちと GPU の割り当てがあるので、1回あたり数十秒かかるのが普通。

3. できたファイルをユーザーに渡す。ファイル送信ツール (SendUserFile など) があればそれで送る。

## オプション

| オプション | 意味 |
| --- | --- |
| `text` / `-f FILE` / `-` | 読ませる文。ファイルや標準入力からも読める |
| `-o PATH` | 出力先。既定は `tts_output/irodori_日時.wav` |
| `-c TEXT` | キャプション。声質、年齢、感情、距離感、収録環境などを文章で |
| `-r WAV [WAV ...]` | 参照音声。複数渡すと順に連結。合計30秒ほどあると似やすい |
| `--seed N` | 同じシードと同じ条件なら同じ声が出やすい。気に入った声を固定したいとき |
| `-n N` | 候補を N 個まとめて作る (`name_001.wav` ... になる) |
| `--duration-scale X` | 自動推定した長さの倍率。1.2 でゆっくり、0.85 で早口ぎみ |
| `--seconds S` | 長さを秒で固定 |
| `--steps N` | サンプリング回数。Space の既定は40 |
| `--backend auto/space/local` | 実行場所 |
| `--space ID_or_URL` | 別の Space を使う (自分で複製した Space など) |
| `--model REPO` | local で使うモデル。CPU なら `Aratako/Irodori-TTS-v4.1-Small-MF` |

## うまく読ませるコツ

文は日本語だけにする。英単語はカタカナにしたほうが安定する。難読漢字や固有名詞は誤読しやすいので、
ひらがなに開くと確実。長い文章は段落ごとに分けて複数回生成し、ファイル名に連番を振る。

キャプションは声の土台と演技を具体的に書く。例をいくつか。

- 落ち着いた低めの男性。ラジオのパーソナリティのように、ゆったり近い距離で話す。
- 元気な十代の女の子。友達に話しかけるように明るく早口。
- 年配の女性。孫に昔話を聞かせるように、優しくゆっくり。
- 疲れ切った会社員の男性。ため息まじりに、だるそうに。

参照音声とキャプションを両方使うときは、声の特徴は参照音声に任せて、キャプションでは感情や
話し方だけを指示する。矛盾すると音が崩れやすい。

## 絵文字で演技をつける

文中の位置に入れると、そこで効く。重ねると強くなる。よく効くものを抜粋。

| 絵文字 | 効果 | 絵文字 | 効果 |
| --- | --- | --- | --- |
| 🤭 | くすくす笑い | 😮‍💨 | 吐息、溜息 |
| ⏸️ | 間をあける | 👂 | 囁き、耳元 |
| 😊 | 楽しげに | 😆 | 喜びながら |
| 😠 | 怒って、拗ねて | 😭 | 泣きながら |
| 😲 | 驚いて | 😱 | 悲鳴、絶叫 |
| 🙄 | 呆れて | 😏 | からかうように |
| 🥺 | 声を震わせて | 😰 | 慌てて、どもって |
| 🫶 | 優しく | 😪 | 眠そうに |
| ⏩ | 早口で | 🐢 | ゆっくり |
| 📞 | 電話越しの音 | 📢 | エコー |
| 🤔 | 疑問の声 | 📖 | ナレーション調 |
| 🤧 | 咳、くしゃみ | 🎵 | 鼻歌 |

例: `あははっ🤭、それ本当に言ってるの？⏸️…😮‍💨まぁ、君らしいけどね。`

全一覧はモデルカードの EMOJI_ANNOTATIONS.md
(https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small/blob/main/EMOJI_ANNOTATIONS.md) にある。

## 守ること

モデルの配布条件に倫理上の制限がついている。本人の同意がない実在の人物 (声優、芸能人、
知人など) の声をクローンしない。人をだます目的の音声を作らない。参照音声を渡されたら、
本人の声か、使ってよい音声かを確かめてから使う。

## トークンの設定

Hugging Face のアカウントで https://huggingface.co/settings/tokens から Read 権限のトークンを作り、
環境変数 `HF_TOKEN` に入れる。

- Claude Code on the web: セッション上部の環境メニューから環境を編集し、環境変数に
  `HF_TOKEN=hf_...` を追加する。次に始めたセッションから効く。
- 自分の PC: `export HF_TOKEN=hf_...` を書くか、`hf auth login` (旧 `huggingface-cli login`) を済ませておく
  (`~/.cache/huggingface/token` も読む)。

無料アカウントの ZeroGPU 枠は1日あたりの上限がある。足りなくなったら時間をおくか、
PRO にするか、local バックエンドを使う。

## 手元の PC で動かす (local バックエンド)

NVIDIA GPU のある Linux か Windows (WSL や Git Bash)、または Mac で、git と uv を入れてから:

```bash
bash .claude/skills/irodori-tts/scripts/setup_local.sh
```

本家リポジトリを `~/.cache/irodori-tts/Irodori-TTS` に入れて依存関係をそろえる。
初回生成時にモデル (約3GB) とコーデックを Hugging Face から落とす。
ブラウザの UI を使いたいなら `--webui` を付けると http://localhost:7861 で開く。

CPU だけでも動くが遅い。その場合は `--model Aratako/Irodori-TTS-v4.1-Small-MF` を付けると、
4ステップで生成する蒸留版になる。

## うまくいかないとき

- `exceeded your ZeroGPU runs limit`: トークン未設定か、枠の使い切り。上の「トークンの設定」へ。
- Space が `SLEEPING` や `BUILDING`: 起動待ちで数分かかる。`--timeout` を延ばして再実行。
- `Space に /gradio_inference がありません`: デモ Space の作りが変わった。`--check` の結果を
  ユーザーに伝え、local バックエンドを提案する。
- 声が毎回変わる: `--seed` を固定する。キャプションを具体的にする。
- 読み間違い: その語をひらがなにする。
