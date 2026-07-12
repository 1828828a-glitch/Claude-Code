# Asset Manifest

| ファイル | 用途 | 使用上の注意 |
|---|---|---|
| `title_screen.png` | タイトル画面 | 16:9。タイトル文字込み。そのまま背景として使用可能 |
| `game_keyvisual.png` | 世界観・配色・最終ステージの参照 | タイトル文字なし。ゲーム背景の基準 |
| `character_reference.png` | 主人公・ゴリラ・AIロボットの基本デザイン | 3キャラクターの体格差、衣装、配色を固定する基準 |
| `hero_pose_sheet.png` | 主人公の状態・ポーズ差分 | 4列×2行。待機、歩行、受容、食事、HOLD、提案、過負荷、成功 |
| `gorilla_state_sheet.png` | ゴリラの体調・行動差分 | 5列×2行。営業、空腹、疲労、警告、水分、食事、休憩、歩行、成功 |
| `robot_action_sheet.png` | AIロボットの業務差分 | 4列×2行。待機、スキャン、翻訳、整理、計算、エラー、確認、成功 |
| `item_asset_sheet.png` | 食べ物・業務・教育・報酬アイコン | 6列×4行。必要なアイコンだけ個別に切り出して使用 |
| `ui_effect_sheet.png` | ゲージ、ボタン、カード、演出 | 4列×3行。UI部品と平和の波などの演出基準 |

## 透明背景

以下の画像は透過PNGです。

- `character_reference.png`
- `hero_pose_sheet.png`
- `gorilla_state_sheet.png`
- `robot_action_sheet.png`
- `item_asset_sheet.png`
- `ui_effect_sheet.png`

`title_screen.png`と`game_keyvisual.png`は背景込みの画像です。

## キャラクターの固定条件

- 主人公：大柄な日本人男性、紺色スーツ、白シャツ、金色のチャンピオンベルト風ベルト
- ゴリラ：188cm・140kg設定、濃い茶色の毛、白襟、紺色ネクタイ、社員証
- AIロボット：クリームとミント、黒いフェイス画面、保育エプロン、胸部タブレット

実装時に画像を追加生成・変形する場合も、この条件を変えないでください。

