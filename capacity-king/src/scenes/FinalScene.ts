import Phaser from 'phaser';
import { StageBase } from './StageBase';
import { DEPTH, FONT, H, W } from '../config/constants';
import { audio } from '../systems/AudioSystem';
import { gauges } from '../systems/GaugeSystem';
import { score } from '../systems/ScoreSystem';
import {
  FINAL_BUILD, FINAL_INTRO, FINAL_PLAN_ROOT, FINAL_SPEECH, SPEAKER
} from '../content/stages';

// FINAL STAGE：MAKE THE WORLD BETTER
// 唯一の進行分岐は「みんなの力を組み合わせた提案」。
export class FinalScene extends StageBase {
  private builtParts: string[] = [];
  private partsText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Final');
  }

  protected stageName() {
    return 'FINAL / MAKE THE WORLD BETTER';
  }
  protected bgKey() {
    return 'bg_dark';
  }
  protected bgm() {
    return 'final' as const;
  }

  private addPart(label: string) {
    this.builtParts.push(label);
    if (!this.partsText) {
      this.add
        .text(24, 80, 'PLAN PARTS', {
          fontFamily: FONT, fontSize: '13px', color: '#ffd76a', fontStyle: 'bold',
          stroke: '#0d1226', strokeThickness: 4
        })
        .setDepth(DEPTH.hud);
      this.partsText = this.add
        .text(24, 102, '', {
          fontFamily: FONT, fontSize: '14px', color: '#b6f0c8', lineSpacing: 6,
          stroke: '#0d1226', strokeThickness: 4, wordWrap: { width: 330 }
        })
        .setDepth(DEPTH.hud);
    }
    this.partsText.setText(this.builtParts.map((p) => `✔ ${p}`).join('\n'));
    audio.confirm();
  }

  protected async script() {
    const boss = this.add.image(W - 150, 500, 'boss').setDepth(DEPTH.entity).setFlipX(true);
    const gorilla = this.add.image(180, 560, 'gorilla_tired').setScale(0.7).setDepth(DEPTH.entity);
    const robot = this.add.image(300, 585, 'robot_idle').setScale(0.7).setDepth(DEPTH.entity);
    const staff = this.add.image(W / 2 + 130, 585, 'staff').setScale(0.8).setDepth(DEPTH.entity);
    const kids = [
      this.add.image(W / 2 + 210, 600, 'child_a').setDepth(DEPTH.entity),
      this.add.image(W / 2 + 260, 605, 'child_b').setDepth(DEPTH.entity)
    ];
    this.hero.setPosition(W / 2 - 120, 520);

    this.drainEnabled = false;
    await this.say(FINAL_INTRO);
    this.drainEnabled = true;

    // 巨大な最終指令が飛来し、頭上に留まる
    const giant = this.add.container(W + 100, 250, [
      this.add.image(0, 0, 'icon_giant').setScale(2.6),
      this.add
        .text(0, 84, '最終指令：保育業界を全部変える', {
          fontFamily: FONT, fontSize: '17px', color: '#ffb08a', fontStyle: 'bold',
          stroke: '#0d1226', strokeThickness: 5
        })
        .setOrigin(0.5)
    ]).setDepth(DEPTH.item);
    this.tweens.add({ targets: giant, x: W / 2, duration: 1800, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: giant, y: 240, duration: 1200, yoyo: true, repeat: -1, delay: 1800 });

    // 失敗分岐を体験しつつ、「もっといい案を組み立てる」に辿り着くまでループ
    let root = -1;
    while (root !== 2) {
      root = await this.choosePlan(FINAL_PLAN_ROOT);
      const choice = FINAL_PLAN_ROOT.choices[root];
      gauges.applyEffects(choice.effects);

      if (root === 0) {
        // 全部引き受ける：巨大化して動けない
        audio.error();
        this.hero.setTexture('hero_overload');
        this.tweens.add({ targets: this.hero, scale: 2.1, duration: 900, ease: 'Bounce.easeOut' });
        this.cameras.main.shake(500, 0.008);
        await this.wait(1100);
        await this.say([{ speaker: SPEAKER.sys, text: choice.feedback }]);
        this.tweens.add({ targets: this.hero, scale: 1, duration: 600 });
        this.hero.setTexture('hero_idle');
      } else if (root === 1) {
        // 断る：時間が止まり、みんなの表情が暗くなる
        audio.warn();
        const grey = this.add.rectangle(W / 2, H / 2, W, H, 0x20242c, 0.55).setDepth(DEPTH.fx);
        [gorilla, robot, staff, ...kids].forEach((s) => s.setTint(0x777788));
        await this.wait(900);
        await this.say([{ speaker: SPEAKER.sys, text: choice.feedback }]);
        grey.destroy();
        [gorilla, robot, staff, ...kids].forEach((s) => s.clearTint());
      }
    }

    await this.say([{ speaker: SPEAKER.hero, text: FINAL_PLAN_ROOT.choices[2].feedback }]);

    // 3つの構成要素を正しく選んで、プランを組み立てる
    for (const set of FINAL_BUILD) {
      let ok = false;
      while (!ok) {
        this.setHold(true);
        const idx = await this.choosePlan(set);
        const c = set.choices[idx];
        gauges.applyEffects(c.effects);
        if (c.kind === 'better') {
          ok = true;
          this.addPart(c.label.length > 30 ? c.label.slice(0, 29) + '…' : c.label);
          this.floatText(this.hero.x, this.hero.y - 140, 'プランに組み込んだ！', '#b6f0c8', 18);
        } else {
          audio.warn();
          this.cameras.main.shake(200, 0.006);
          await this.say([{ speaker: SPEAKER.sys, text: c.feedback + '（もう一度選ぼう）' }]);
        }
      }
    }

    // ==== BETTER PLAN 完成：世界が動き出す ====
    this.drainEnabled = false;
    this.setHold(false);
    this.hero.setTexture('hero_propose');

    for (const line of FINAL_SPEECH) {
      await this.say([{ speaker: SPEAKER.hero, text: line }]);
    }

    score.betterPlans++;
    score.happyPeople += 100;
    score.nurseries += 99; // 3園の実証 → 事例の横展開で100園へ
    score.familyHours += 3;

    // 巨大指令が金色の光に変わる
    this.tweens.add({ targets: giant, scale: 0.1, alpha: 0, duration: 800, ease: 'Cubic.easeIn' });
    await this.playSuccess(true);
    gauges.set('peace', 100);
    gauges.add('capacity', 25);
    gauges.add('trust', 25);
    gauges.add('team', 25);

    // 止まっていた世界が動き出し、暗かった街に色が戻る
    const townKey = this.textures.exists('game_keyvisual') ? 'game_keyvisual' : 'bg_town';
    const townBg = this.add.image(W / 2, H / 2, townKey).setDisplaySize(W, H).setDepth(DEPTH.bg).setAlpha(0);
    this.tweens.add({ targets: townBg, alpha: 1, duration: 2000 });
    gorilla.setTexture('gorilla_happy');
    robot.setTexture('robot_happy');
    [gorilla, robot, staff, ...kids].forEach((s, i) =>
      this.tweens.add({ targets: s, y: s.y - 16, duration: 320, yoyo: true, repeat: 5, delay: i * 90 })
    );
    await this.wait(2300);
    await this.say([
      { speaker: SPEAKER.boss, text: '……そうか。全部変えるより、ずっといい。頼んだぞ！' },
      { speaker: SPEAKER.sys, text: '保育園、会社、家庭が、一つの平和な街としてつながった。' }
    ]);

    audio.stopBgm();
    this.goto('Ending');
  }
}
