import Phaser from 'phaser';
import { DEPTH, FONT, W, H } from '../config/constants';
import { audio } from '../systems/AudioSystem';
import type { PlanSet } from '../content/types';

// HOLD中に表示される提案カード（1/2/3で選択、ENTERで実行、クリック可）。
export class ChoiceCards {
  private scene: Phaser.Scene;
  private cont: Phaser.GameObjects.Container | null = null;
  private frames: Phaser.GameObjects.Rectangle[] = [];
  private selected = 0;
  private set: PlanSet | null = null;
  private onConfirm: ((index: number) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get active(): boolean {
    return this.cont !== null;
  }

  show(set: PlanSet, onConfirm: (index: number) => void) {
    this.hide();
    this.set = set;
    this.onConfirm = onConfirm;
    this.selected = 0;
    this.frames = [];

    const cont = this.scene.add.container(0, 0).setDepth(DEPTH.cards);
    this.cont = cont;

    const title = this.scene.add
      .text(W / 2, 128, set.title, {
        fontFamily: FONT, fontSize: '26px', color: '#ffd76a', fontStyle: 'bold',
        stroke: '#0d1226', strokeThickness: 6
      })
      .setOrigin(0.5);
    cont.add(title);
    if (set.prompt) {
      cont.add(
        this.scene.add
          .text(W / 2, 162, set.prompt, {
            fontFamily: FONT, fontSize: '16px', color: '#dfe6ff',
            stroke: '#0d1226', strokeThickness: 4
          })
          .setOrigin(0.5)
      );
    }

    const cardW = 350;
    const cardH = 240;
    set.choices.forEach((ch, i) => {
      const cx = W / 2 + (i - 1) * (cardW + 30);
      const cy = H / 2 + 20;
      const frame = this.scene.add
        .rectangle(cx, cy, cardW, cardH, 0x141b38, 0.97)
        .setStrokeStyle(4, 0x44507a, 1);
      const num = this.scene.add
        .text(cx - cardW / 2 + 16, cy - cardH / 2 + 12, `${i + 1}`, {
          fontFamily: FONT, fontSize: '26px', color: '#ffd76a', fontStyle: 'bold'
        });
      const label = this.scene.add
        .text(cx, cy - 40, ch.label, {
          fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
          wordWrap: { width: cardW - 44 }, align: 'center', lineSpacing: 4
        })
        .setOrigin(0.5);
      const detail = this.scene.add
        .text(cx, cy + 55, ch.detail ?? '', {
          fontFamily: FONT, fontSize: '15px', color: '#aeb9dd',
          wordWrap: { width: cardW - 44 }, align: 'center', lineSpacing: 4
        })
        .setOrigin(0.5);
      cont.add([frame, num, label, detail]);
      this.frames.push(frame);

      frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        audio.unlock();
        if (this.selected === i) {
          this.confirm();
        } else {
          this.select(i);
        }
      });
    });

    cont.add(
      this.scene.add
        .text(W / 2, H / 2 + 172, '1 / 2 / 3 で選択 → ENTER で BETTER PLAN 実行（カードを2回クリックでも実行）', {
          fontFamily: FONT, fontSize: '15px', color: '#ffe9a8',
          stroke: '#0d1226', strokeThickness: 4
        })
        .setOrigin(0.5)
    );

    this.select(0);
  }

  select(i: number) {
    if (!this.set) return;
    this.selected = Phaser.Math.Clamp(i, 0, this.set.choices.length - 1);
    audio.select();
    this.frames.forEach((f, j) => {
      if (j === this.selected) {
        f.setStrokeStyle(5, 0xe8b923, 1);
        f.setFillStyle(0x1c2650, 0.98);
        f.setScale(1.04);
      } else {
        f.setStrokeStyle(4, 0x44507a, 1);
        f.setFillStyle(0x141b38, 0.97);
        f.setScale(1);
      }
    });
  }

  confirm() {
    if (!this.set || !this.onConfirm) return;
    const cb = this.onConfirm;
    const idx = this.selected;
    audio.confirm();
    this.hide();
    cb(idx);
  }

  hide() {
    this.cont?.destroy();
    this.cont = null;
    this.set = null;
    this.onConfirm = null;
    this.frames = [];
  }
}
