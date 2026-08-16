# ナレーション音声の置き場所

`npm run voice -- src/scripts/xxx.json` が生成した音声がここに入る。
手で置く必要はない。

台本の `voiceText`（読み上げる文）から音声を作り、
`voiceFile`（保存先）と `voiceSeconds`（実測の長さ）を台本に書き戻す。

**このカットの尺は `voiceSeconds` で決まる。** 文字数からの推定ではなく
実際の音声の長さになるので、テロップと声がズレない。
