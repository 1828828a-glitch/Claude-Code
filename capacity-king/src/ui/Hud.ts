import Phaser from 'phaser';
import { DEPTH, FONT, GAUGE_COLORS, GAUGE_LABELS, W } from '../config/constants';
import { gauges } from '../systems/GaugeSystem';
import { audio } from '../systems/AudioSystem';
import type { GaugeKey } from '../content/types';

const KEYS: GaugeKey[] = ['peace', 'capacity', 'trust', 'team'];
const BAR_W = 200;
const BAR_H = 16;

// 画面上部の4ゲージ＋ミュート＋画面下部の操作ガイド。
export class Hud {
  private scene: Phaser.Scene;
  private fills: Partial<Record<GaugeKey, Phaser.GameObjects.Rectangle>> = {};
  private nums: Partial<Record<GaugeKey, Phaser.GameObjects.Text>> = {};
  private muteBtn!: Phaser.GameObjects.Text;
  private guideText!: Phaser.GameObjects.Text;
  private chips: Phaser.GameObjects.Container[] = [];
  private onChange: () => void;

  constructor(scene: Phaser.Scene, stageName: string) {
    this.scene = scene;

    const top = scene.add.rectangle(W / 2, 30, W, 60, 0x0a0d1c, 0.82).setDepth(DEPTH.hud);
    top.setStrokeStyle(1, 0x2c3554, 1);

    KEYS.forEach((k, i) => {
      const x = 28 + i * 268;
      const y = 14;
      scene.add
        .text(x, y, GAUGE_LABELS[k], {
          fontFamily: FONT, fontSize: '12px', color: '#ffe9a8', fontStyle: 'bold'
        })
        .setDepth(DEPTH.hud + 1);
      scene.add.rectangle(x + BAR_W / 2, y + 24, BAR_W, BAR_H, 0x232a45).setDepth(DEPTH.hud + 1)
        .setStrokeStyle(1, 0x444f73, 1);
      const fill = scene.add
        .rectangle(x + 1, y + 24, BAR_W - 2, BAR_H - 4, GAUGE_COLORS[k])
        .setOrigin(0, 0.5)
        .setDepth(DEPTH.hud + 2);
      fill.x = x - BAR_W / 2 + BAR_W / 2 + 1; // 左端基準
      fill.setPosition(x + 1, y + 24);
      this.fills[k] = fill;
      this.nums[k] = scene.add
        .text(x + BAR_W + 8, y + 24, '0', {
          fontFamily: FONT, fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
        })
        .setOrigin(0, 0.5)
        .setDepth(DEPTH.hud + 2);
    });

    this.muteBtn = scene.add
      .text(W - 24, 30, audio.muted ? '🔇' : '🔊', { fontSize: '26px' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        audio.unlock();
        const m = audio.toggleMute();
        this.muteBtn.setText(m ? '🔇' : '🔊');
      });

    // 下部操作ガイド（左端にステージ名）
    scene.add.rectangle(W / 2, 706, W, 28, 0x0a0d1c, 0.85).setDepth(DEPTH.hud);
    scene.add
      .text(14, 706, stageName, {
        fontFamily: FONT, fontSize: '12px', color: '#8fa2d9', fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 1);
    this.guideText = scene.add
      .text(W / 2 + 130, 706, '', {
        fontFamily: FONT, fontSize: '14px', color: '#cdd7f3'
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 1);

    this.onChange = () => this.refresh();
    gauges.on('change', this.onChange);
    this.refresh();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gauges.off('change', this.onChange);
    });
  }

  setGuide(text: string) {
    this.guideText.setText(text);
  }

  // クリック操作用のチップボタン列（キー操作の代替）
  setChips(defs: { label: string; key: string }[], onPress: (key: string) => void) {
    this.chips.forEach((c) => c.destroy());
    this.chips = [];
    const totalW = defs.reduce((a, d) => a + d.label.length * 13 + 34, 0);
    let x = W / 2 - totalW / 2;
    defs.forEach((d) => {
      const w = d.label.length * 13 + 26;
      const cont = this.scene.add.container(x + w / 2, 672).setDepth(DEPTH.hud + 2);
      const r = this.scene.add
        .rectangle(0, 0, w, 30, 0x1d2f6f, 0.92)
        .setStrokeStyle(1, 0xe8b923, 0.8);
      const t = this.scene.add
        .text(0, 0, d.label, {
          fontFamily: FONT, fontSize: '14px', color: '#ffe9a8', fontStyle: 'bold'
        })
        .setOrigin(0.5);
      cont.add([r, t]);
      r.setInteractive({ useHandCursor: true })
        .on('pointerover', () => r.setFillStyle(0x3452b5, 0.95))
        .on('pointerout', () => r.setFillStyle(0x1d2f6f, 0.92))
        .on('pointerdown', () => {
          audio.unlock();
          onPress(d.key);
        });
      this.chips.push(cont);
      x += w + 8;
    });
  }

  private refresh() {
    KEYS.forEach((k) => {
      const v = gauges.get(k);
      const fill = this.fills[k];
      const num = this.nums[k];
      if (!fill || !num) return;
      fill.width = Math.max(0, ((BAR_W - 2) * v) / 100);
      num.setText(String(Math.round(v)));
      if (k === 'peace') {
        num.setColor(v < 25 ? '#ff8a7a' : '#ffffff');
        fill.setFillStyle(v < 25 ? 0xe05a3a : GAUGE_COLORS[k]);
      }
    });
  }
}
