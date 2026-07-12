import Phaser from 'phaser';
import { DEPTH } from '../config/constants';

export type RobotPose = 'idle' | 'work' | 'error' | 'happy';

// AIロボット：クリーム×ミント、黒フェイス画面、保育エプロン、胸部タブレット。
// 保育士を置き換えず、事務・整理・翻訳を支援する。
export class Robot {
  sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.image(x, y, 'robot_idle').setDepth(DEPTH.entity);
    scene.tweens.add({ targets: this.sprite, y: y - 6, duration: 1300, yoyo: true, repeat: -1 });
  }

  setPose(pose: RobotPose) {
    this.sprite.setTexture(`robot_${pose}`);
  }

  flashPose(pose: RobotPose, ms = 900) {
    this.setPose(pose);
    this.scene.time.delayedCall(ms, () => this.setPose('idle'));
  }
}
