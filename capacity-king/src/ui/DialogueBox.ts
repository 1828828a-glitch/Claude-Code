import Phaser from 'phaser';
import { DEPTH, FONT, W } from '../config/constants';
import { audio } from '../systems/AudioSystem';
import type { DialogueLine } from '../content/types';

// 画面下部の会話ボックス。SPACE / ENTER / クリックで送る。
export class DialogueBox {
  private scene: Phaser.Scene;
  private cont: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private nextMark: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private idx = 0;
  private resolver: (() => void) | null = null;
  private advanceHandler: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const bg = scene.add
      .rectangle(0, 0, 980, 118, 0x0d1226, 1)
      .setStrokeStyle(3, 0xe8b923, 1);
    this.nameText = scene.add.text(-470, -48, '', {
      fontFamily: FONT, fontSize: '16px', color: '#ffd76a', fontStyle: 'bold'
    });
    this.bodyText = scene.add.text(-470, -22, '', {
      fontFamily: FONT, fontSize: '19px', color: '#f4f6ff',
      wordWrap: { width: 930 }, lineSpacing: 6
    });
    this.nextMark = scene.add
      .text(468, 40, '▼ SPACE', { fontFamily: FONT, fontSize: '13px', color: '#8fa2d9' })
      .setOrigin(1);
    this.cont = scene.add
      .container(W / 2, 585, [bg, this.nameText, this.bodyText, this.nextMark])
      .setDepth(DEPTH.dialogue)
      .setVisible(false);

    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.advance());

    scene.tweens.add({
      targets: this.nextMark, alpha: 0.25, duration: 500, yoyo: true, repeat: -1
    });

    this.advanceHandler = () => this.advance();
  }

  get active(): boolean {
    return this.cont.visible;
  }

  show(lines: DialogueLine[]): Promise<void> {
    this.lines = lines;
    this.idx = 0;
    this.cont.setVisible(true);
    this.render();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  advance() {
    if (!this.cont.visible) return;
    audio.click();
    this.idx++;
    if (this.idx >= this.lines.length) {
      this.cont.setVisible(false);
      const r = this.resolver;
      this.resolver = null;
      r?.();
    } else {
      this.render();
    }
  }

  private render() {
    const l = this.lines[this.idx];
    this.nameText.setText(l.speaker);
    this.bodyText.setText(l.text);
  }
}
