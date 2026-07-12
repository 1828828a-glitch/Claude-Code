# CAPACITY KING — ぜんぶ、もっとよくする。

横長PCブラウザ向け、5〜8分で完結する2Dアクション＋判断ゲームのデモです。
飛んでくる食べ物・仕事・相談・トラブルを **受け止める → 状況を理解する → よりよい案に組み替える → 提案して前に進める** の4段階で処理します。

> 平和は、何もしないことで生まれるのではない。
> 誰かの困りごとを受け止め、みんなが前に進める案に変えることで生まれる。

## 起動方法

```bash
cd capacity-king
npm install
npm run dev        # 開発サーバー（表示されたURLをブラウザで開く）
npm run build      # 型チェック＋本番ビルド（dist/ に出力）
npm run preview    # ビルド結果の確認用サーバー
```

- 技術構成：Phaser 3 / TypeScript / Vite
- 基準解像度：1280×720（16:9、ウィンドウに合わせて自動スケール）
- 対応ブラウザ：Chrome / Edge / Safari 現行版
- バックエンド・ログイン・外部API・課金なし

## 操作方法

| 操作 | キー |
|---|---|
| 移動 | 矢印キー / WASD |
| 受け止める | SPACE |
| HOLD（一度止めて考える） | H |
| 提案カードを選択 | 1 / 2 / 3 |
| BETTER PLAN を実行 | ENTER |
| ゴリラへの対応メニュー | G（STAGE 1） |
| AIロボットへの業務委任メニュー | A（STAGE 2） |
| ポーズ | ESC |

画面下部のボタンをクリックしても同じ操作ができます。ミュートは右上のスピーカーアイコン。

## ゲームの進行ルール

- すべて無条件に受け入れると CAPACITY と健康が下がる
- HOLD で止めるだけだと WORLD PEACE が徐々に下がる
- 捨てる・拒絶するだけだと TRUST が下がる
- **BETTER PLAN を成立させたときだけ道が開き、物語が進む**
- WORLD PEACE が 0 になるとゲームオーバー（ステージ最初からやり直し）

## 構成

```
src/
├── main.ts              # エントリポイント（シーン登録）
├── config/constants.ts  # 画面サイズ・ゲージ減衰・色・注記などの定数
├── content/             # ★データ駆動コンテンツ（コードから分離）
│   ├── types.ts         #   LearningChallenge / PlanSet などの型
│   ├── challenges.ts    #   教育問題（英語3・算数4・論理／感情2）
│   └── stages.ts        #   会話・飛来する要望・BETTER PLANカード
├── entities/            # ゴリラ（5パラメーター＋8アクション）、AIロボット
├── systems/             # ゲージ・スコア・Web Audio音・生成グラフィック
├── ui/                  # HUD・会話ボックス・提案カード・ボタン
└── scenes/              # Boot / Title / Tutorial / Stage1-3 / Final / Ending
```

## コンテンツの追加方法

教育問題は `src/content/challenges.ts` の配列に `LearningChallenge` を追加するだけで
STAGE 3 に自動的に出題されます。

```ts
{
  id: 'math-example',
  mode: 'elementary',            // birthday / preschool / elementary / nursery / nursery-dx / sales-training
  subject: 'math',               // english / math / logic / emotion / dx
  gradeLevel: '小2〜小3',
  situation: '場面の説明',
  prompt: '問題文',
  choices: [
    { label: '選択肢', effects: { peace: 6, capacity: 0, trust: 4, teamCondition: 4 }, feedback: '解説' },
    // …3択
  ],
  recommendedChoiceIndex: 1,
  rearrange: 'meat'              // 任意：正解時の世界再配置演出（meat/banana/groups/time）
}
```

会話・BETTER PLANカード・飛来する要望は `src/content/stages.ts` で同様に編集できます。
UI とゲームロジックはコンテンツから分離してあるため、将来的に問題登録画面へ拡張できます。

## 画像素材について

`public/assets/` に ASSET_MANIFEST.md 記載のPNG（`title_screen.png` など）を置くと自動で読み込みます
（現在はタイトル画面が差し替わります）。画像が無い環境でも、キャラクター固定条件
（主人公＝紺スーツ＋金ベルト／ゴリラ＝濃茶・白襟・紺ネクタイ・社員証／ロボット＝クリーム×ミント＋黒フェイス）
を守ったコード生成グラフィックで完全に動作します。ポーズシートの自動分割は行っていません。

## 実装済み機能

- タイトル〜エンディングまでの通しプレイ（自動プレイテストでエンディング到達を確認済み）
- 4つの主要ゲージ（WORLD PEACE / CAPACITY / TRUST / TEAM）と放置・HOLD中の平和度減衰
- 受け止める／HOLD／BETTER PLAN の基本ループ（BETTER PLAN 成立時のみステージ進行）
- チュートリアル（社長の料理ラッシュ→小盛り・シェアの提案）
- STAGE 1：ゴリラ管理（ENERGY/CONDITION/TRUST/HUNGER/STRESSの5パラメーター、
  188cm・140kg表記のステータス画面、8種の対応アクション、バナナ連打はコンディション悪化）
- STAGE 2：保育DX（7業務の飛来→AI/人の振り分け、HUMANITYゲージ、
  全部AIに任せると低下、成功時に書類の山が消え保育士が子どものそばへ）
- STAGE 3：教育ラボ（英語3問・算数4問・論理／感情2問、データ駆動、
  算数正解時に食事・人員・時間が画面上で再配置される演出）
- FINAL：3つの失敗分岐（全部引き受ける／断る／考え続ける=減衰）と、
  役割分担プランを3ステップで組み立てる唯一の進行分岐、成功時に街へ色が戻る演出
- エンディング：実績7項目→メッセージ4文→最後に小さく HAPPY BIRTHDAY
- Web Audio 生成のBGM（シーン別）と効果音、ミュートボタン
- クリック操作の代替ボタン、ポーズ、ゲームオーバー→ステージ再挑戦
- 健康表現に関する注記（ポーズ画面・ステータス画面・エンディング）

## 未実装項目

- 問題編集画面（データ構造とUI分離までを実装。仕様どおりデモでは対象外）
- コンテンツモードの切り替えUI（データ側の `mode` フィールドは実装済み）
- `title_screen.png` 以外の参照PNGのゲーム内直接利用（デザイン基準としてのみ使用）
- セーブ／ロード

## 既知の問題

- 効果音・BGMはWeb Audio生成のため、ブラウザの自動再生制限により
  最初のクリックまたはキー入力があるまで鳴りません
- ウィンドウが極端に縦長の場合、上下に黒帯が出ます（FITスケーリングの仕様）
- Phaserのローダーが任意アセット（未配置PNG）の404をコンソールに出力しますが、
  動作には影響しません

---

※ 健康表現はゲーム演出です。体調に不安がある場合は医療機関へご相談ください。
