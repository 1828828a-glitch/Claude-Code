import Phaser from 'phaser';
import { DEPTH, FONT, H, W } from '../config/constants';
import { audio } from '../systems/AudioSystem';
import { gauges } from '../systems/GaugeSystem';
import { score } from '../systems/ScoreSystem';
import { TextButton } from '../ui/TextButton';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.input.once('pointerdown', () => audio.unlock());
    this.input.keyboard!.once('keydown', () => audio.unlock());
    audio.playBgm('title');

    const hasArt = this.textures.exists('title_screen');
    if (hasArt) {
      // 公式タイトル画像（タイトル文字込み）をそのまま背景に
      const img = this.add.image(W / 2, H / 2, 'title_screen');
      img.setDisplaySize(W, H);
    } else {
      this.add.image(W / 2, H / 2, 'bg_town');

      // 主人公・ゴリラ・AIロボットが横並び
      this.add.image(W / 2 - 230, 520, 'gorilla_idle').setScale(1.05);
      this.add.image(W / 2, 505, 'hero_idle').setScale(1.25);
      this.add.image(W / 2 + 190, 545, 'robot_idle');

      const title = this.add
        .text(W / 2, 170, 'CAPACITY KING', {
          fontFamily: FONT, fontSize: '86px', color: '#ffd76a', fontStyle: 'bold',
          stroke: '#5a3a00', strokeThickness: 12,
          shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 8, fill: true }
        })
        .setOrigin(0.5);
      this.tweens.add({ targets: title, y: 160, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add
        .text(W / 2, 245, 'ぜんぶ、もっとよくする。', {
          fontFamily: FONT, fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
          stroke: '#0d1226', strokeThickness: 6
        })
        .setOrigin(0.5);
    }

    const startBtn = new TextButton(this, W / 2, hasArt ? 560 : 620, 'GAME START', () => this.start(), {
      width: 280, height: 56, fontSize: 24
    });
    const howBtn = new TextButton(this, W / 2, hasArt ? 630 : 680, 'HOW TO PLAY', () => this.scene.start('HowTo'), {
      width: 280, height: 44, fontSize: 18, bg: 0x14204e
    });
    startBtn.setDepth(DEPTH.hud);
    howBtn.setDepth(DEPTH.hud);
    this.tweens.add({ targets: startBtn, scale: 1.04, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard!.on('keydown-ENTER', () => this.start());
    this.input.keyboard!.on('keydown-SPACE', () => this.start());
  }

  private start() {
    audio.unlock();
    audio.confirm();
    gauges.reset();
    score.reset();
    this.scene.start('Tutorial');
  }
}

export class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  create() {
    this.add.image(W / 2, H / 2, 'bg_town').setAlpha(0.4);
    this.add.rectangle(W / 2, H / 2, 900, 620, 0x0d1226, 0.95).setStrokeStyle(3, 0xe8b923);
    this.add
      .text(W / 2, 90, 'HOW TO PLAY', {
        fontFamily: FONT, fontSize: '34px', color: '#ffd76a', fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const lines = [
      '飛んでくる食べ物・仕事・相談を、4段階で処理しよう。',
      '',
      '① 受け止める …………… SPACE（受けるほどPOWERは上がるが余力が減る）',
      '② 状況を理解する ……… H で HOLD（世界は止まるが平和度は減り続ける）',
      '③ よりよい案に組み替える … 1 / 2 / 3 で提案カードを選ぶ',
      '④ 提案し、前に進める … ENTER で BETTER PLAN 実行！',
      '',
      '移動：矢印キー / WASD　　G：ゴリラ対応メニュー　　A：AI委任メニュー',
      'ESC：ポーズ　　画面上のボタンをクリックしても操作できます。',
      '',
      '勝利条件は「敵を倒すこと」でも「全部引き受けること」でもない。',
      'BETTER PLAN を成立させたときだけ、道が開き、物語が進む。',
      'WORLD PEACE が 0 になるとゲームオーバー。'
    ];
    this.add
      .text(W / 2, 370, lines.join('\n'), {
        fontFamily: FONT, fontSize: '18px', color: '#eef2ff', align: 'center', lineSpacing: 9
      })
      .setOrigin(0.5);

    new TextButton(this, W / 2, 640, 'タイトルへもどる', () => this.scene.start('Title'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Title'));
  }
}
