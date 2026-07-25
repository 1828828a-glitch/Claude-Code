# session-start.sh — video-shotcraft の自動セットアップ

[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)(Apache-2.0)は
Remotion で映画的なプロダクト動画を作るためのエージェントスキルです。
ショットレシピカード 106 枚、モーションプレビュー 163 本、検証済みテンプレート
「Ink Press」、SFX ライブラリ、2.5D ページカメラ等のコンポーネントが含まれます。

Claude Code on the web のコンテナはセッションごとに作り直されるため、
`~/.claude/skills/` に入れたスキルは次のセッションには残りません。
このフックが毎回入れ直すことで、常に `video-shotcraft` が使える状態になります。

## 有効化

`.claude/settings.json` に登録します(未登録の場合は手動実行のみになります)。

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh"
          }
        ]
      }
    ]
  }
}
```

登録するとリモートセッションの起動時に毎回走ります(同期実行なので、
起動が完了するまで数十秒待つ形になります)。既に導入済みなら即座に抜けます。

## 手動で実行する

```bash
CLAUDE_CODE_REMOTE=true .claude/hooks/session-start.sh
```

ローカルの Claude Code では `~/.claude/skills/` が永続するため、フックは何もせず
終了します。ローカルには上流の手順で入れてください。

```bash
git clone https://github.com/Vincentwei1021/video-shotcraft.git
ln -s "$(pwd)/video-shotcraft" ~/.claude/skills/video-shotcraft
```

## 環境変数

| 変数 | 効果 |
|---|---|
| `VSC_INCLUDE_PREVIEWS=1` | `gallery/media`(約106MB のプレビュー動画)も取得する |
| `VSC_SKIP_NPM=1` | `template/` の `npm install` を省略する |
| `VSC_REF=<ref>` | 取得するブランチ/タグ(既定 `main`) |
| `VSC_FORCE=1` | 導入済みでも入れ直す |

既定ではプレビュー動画 106MB を除外した部分クローン(作業ツリー約58MB)にしています。
モーションプレビューは [Gallery](https://vincentwei1021.github.io/video-shotcraft/) で
閲覧できるため、ローカルに必須ではありません。カード名の索引
`gallery/api/library.json` は除外していないので、スキルの検証処理は問題なく動きます。

ローカルでプレビューを見たい場合は `VSC_INCLUDE_PREVIEWS=1` を付けるか、
導入後に次を実行します。

```bash
cd ~/.claude/skills/video-shotcraft/gallery && python3 -m http.server 4178
```

## 動作要件

このコンテナでは以下が揃っていることを確認済みです。

| 要件 | 状態 |
|---|---|
| Node.js | v22.22.2 |
| npm | 10.9.7 |
| Remotion | 4.0.484(`template/package.json`) |
| Chromium | Remotion が自前で用意する(`/opt/pw-browsers` にも同梱あり) |

レンダリング検証の結果:

- `npx remotion still src/index.ts AiflPromo` → 1920×1080 PNG 出力 OK
- `npx remotion render src/index.ts AiflPromo --frames=180-330` → 5.08秒 /
  H.264 1920×1080 + AAC 48kHz ステレオ(SFX 入り)出力 OK

## 注意

- Remotion は独自ライセンスです(個人・小規模チームは無料、企業は有料ライセンスが
  必要な場合があります)。<https://github.com/remotion-dev/remotion/blob/main/LICENSE.md>
- `template/public/` の製品スクリーンショットはデモ用アセットです。公開前に対象製品の
  ものへ差し替えてください。
- SFX の出典は `assets/audio/ATTRIBUTION.md` を参照。
