import Phaser from 'phaser';
import { DEPTH, FONT, H, HEALTH_NOTE, W } from '../config/constants';
import { audio } from '../systems/AudioSystem';
import { gauges } from '../systems/GaugeSystem';
import { score } from '../systems/ScoreSystem';
import { ENDING_MESSAGES } from '../content/stages';
import { TextButton } from '../ui/TextButton';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  create() {
    audio.playBgm('ending');
    this.add.image(W / 2, H / 2, 'bg_town').setAlpha(0.85);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0d1c, 0.55);

    // 3人が並んで見守る
    this.add.image(W / 2 - 210, 600, 'gorilla_happy').setScale(0.85);
    this.add.image(W / 2, 590, 'hero_success').setScale(0.95);
    this.add.image(W / 2 + 180, 615, 'robot_happy').setScale(0.85);

    void this.run();
  }

  private async run() {
    this.add
      .text(W / 2, 64, 'RESULT — あなたが前に進めたもの', {
        fontFamily: FONT, fontSize: '30px', color: '#ffd76a', fontStyle: 'bold',
        stroke: '#0d1226', strokeThickness: 8
      })
      .setOrigin(0.5);

    const stats: [string, string][] = [
      ['受け止めた相談', `${score.accepted} 件`],
      ['よりよい案に変えた数', `${score.betterPlans} 件`],
      ['ハッピーにした人', `${score.happyPeople} 人`],
      ['守った家庭時間', `週 ${score.familyHours} 時間`],
      ['改善した園', `${score.nurseries} 園`],
      ['ゴリラの最終コンディション', `${score.gorillaCondition} / 100`],
      ['WORLD PEACE 最終値', `${Math.round(gauges.get('peace'))} / 100`]
    ];

    for (let i = 0; i < stats.length; i++) {
      const y = 120 + i * 40;
      const label = this.add
        .text(W / 2 - 250, y, stats[i][0], {
          fontFamily: FONT, fontSize: '19px', color: '#cdd7f3',
          stroke: '#0d1226', strokeThickness: 5
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);
      const value = this.add
        .text(W / 2 + 250, y, stats[i][1], {
          fontFamily: FONT, fontSize: '21px', color: '#ffffff', fontStyle: 'bold',
          stroke: '#0d1226', strokeThickness: 5
        })
        .setOrigin(1, 0.5)
        .setAlpha(0);
      this.tweens.add({ targets: [label, value], alpha: 1, duration: 350 });
      audio.click();
      await this.wait(330);
    }

    await this.wait(1400);

    // メッセージを一文ずつ
    const msg = this.add
      .text(W / 2, 300, '', {
        fontFamily: FONT, fontSize: '27px', color: '#fff6dd', fontStyle: 'bold',
        align: 'center', lineSpacing: 12,
        stroke: '#0d1226', strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05060d, 0).setDepth(DEPTH.fx);
    this.tweens.add({ targets: dim, fillAlpha: 0.72, duration: 1200 });

    for (const m of ENDING_MESSAGES) {
      msg.setAlpha(0).setText(m);
      this.tweens.add({ targets: msg, alpha: 1, duration: 900 });
      await this.wait(3400);
      this.tweens.add({ targets: msg, alpha: 0, duration: 700 });
      await this.wait(800);
    }

    // 最後の最後にだけ、小さく
    const hb = this.add
      .text(W / 2, 420, 'HAPPY BIRTHDAY', {
        fontFamily: FONT, fontSize: '20px', color: '#ffd76a', fontStyle: 'bold',
        stroke: '#0d1226', strokeThickness: 4
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(DEPTH.overlay);
    this.tweens.add({ targets: hb, alpha: 1, duration: 2000 });
    audio.success(true);

    for (let i = 0; i < 20; i++) {
      const s = this.add
        .image(Phaser.Math.Between(200, W - 200), Phaser.Math.Between(120, 500), 'fx_spark')
        .setDepth(DEPTH.overlay)
        .setAlpha(0)
        .setScale(0.5 + Math.random());
      this.tweens.add({
        targets: s, alpha: 0.9, angle: 180, duration: 1200, delay: i * 120, yoyo: true,
        onComplete: () => s.destroy()
      });
    }

    await this.wait(2600);
    this.add
      .text(W / 2, 690, HEALTH_NOTE, { fontFamily: FONT, fontSize: '11px', color: '#8fa2d9' })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);
    const btn = new TextButton(this, W / 2, 560, 'タイトルへもどる', () => {
      audio.stopBgm();
      this.scene.start('Title');
    });
    btn.setDepth(DEPTH.overlay);
  }
}
