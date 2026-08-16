# 画像の置き場所

ここに写真やイラストを置いて、台本から参照する。

```json
{ "type": "narration", "text": "…", "image": "photos/kyoto.jpg" }
```

`npm run assets` で生成した画像もここに入る（台本の `imagePrompt` から作られ、
`image` に自動で書き戻される）。手持ちの素材と生成物を混ぜても問題ない。

画像を指定したカットには自動で Ken Burns 効果（寄り／パン）と微細な手ブレがかかる。
