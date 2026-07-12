import Phaser from 'phaser';
import { buildTextures } from '../systems/TextureFactory';
import { applySheetTextures } from '../systems/AssetIntegration';

// public/assets のPNG（存在すれば）を読み込み、
// 無いものはコード生成テクスチャで補ってタイトルへ。
const OPTIONAL_ASSETS = [
  'title_screen',
  'game_keyvisual',
  'character_reference',
  'hero_pose_sheet',
  'gorilla_state_sheet',
  'robot_action_sheet',
  'item_asset_sheet',
  'ui_effect_sheet'
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 参照画像が置かれていれば読み込む（無くてもエラーで止めない）
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.info(`[assets] ${file.key} は見つからないため、生成グラフィックを使用します`);
    });
    // 単一ファイル配布（Artifact等）では window.__CK_ASSETS__ にdata URIが埋め込まれる
    const inlined = (window as unknown as { __CK_ASSETS__?: Record<string, string> }).__CK_ASSETS__;
    OPTIONAL_ASSETS.forEach((key) => this.load.image(key, inlined?.[key] ?? `assets/${key}.png`));
  }

  create() {
    applySheetTextures(this); // 実素材があればポーズを静止画として切り出す
    buildTextures(this);      // 足りないものは生成グラフィックで補完
    this.scene.start('Title');
  }
}
