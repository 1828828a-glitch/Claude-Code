import Phaser from 'phaser';
import { buildTextures } from '../systems/TextureFactory';

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
    OPTIONAL_ASSETS.forEach((key) => this.load.image(key, `assets/${key}.png`));
  }

  create() {
    buildTextures(this);
    this.scene.start('Title');
  }
}
