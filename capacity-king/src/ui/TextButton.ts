import Phaser from 'phaser';
import { FONT } from '../config/constants';
import { audio } from '../systems/AudioSystem';

export type TextButtonOpts = {
  width?: number;
  height?: number;
  fontSize?: number;
  bg?: number;
  bgHover?: number;
  stroke?: number;
  textColor?: string;
};

// クリック可能なボタン。キーボード操作の代替としても使う。
export class TextButton extends Phaser.GameObjects.Container {
  private rect: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private opts: Required<TextButtonOpts>;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    opts: TextButtonOpts = {}
  ) {
    super(scene, x, y);
    this.opts = {
      width: opts.width ?? 200,
      height: opts.height ?? 46,
      fontSize: opts.fontSize ?? 20,
      bg: opts.bg ?? 0x1d2f6f,
      bgHover: opts.bgHover ?? 0x3452b5,
      stroke: opts.stroke ?? 0xe8b923,
      textColor: opts.textColor ?? '#fffbe8'
    };

    this.rect = scene.add
      .rectangle(0, 0, this.opts.width, this.opts.height, this.opts.bg, 1)
      .setStrokeStyle(2, this.opts.stroke, 1);
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: `${this.opts.fontSize}px`,
        color: this.opts.textColor,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.add([this.rect, this.label]);
    this.setSize(this.opts.width, this.opts.height);

    this.rect
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.rect.setFillStyle(this.opts.bgHover))
      .on('pointerout', () => this.rect.setFillStyle(this.opts.bg))
      .on('pointerdown', () => {
        audio.unlock();
        audio.click();
        onClick();
      });

    scene.add.existing(this);
  }

  setText(t: string) {
    this.label.setText(t);
    return this;
  }
}
