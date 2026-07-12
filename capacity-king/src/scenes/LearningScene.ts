import Phaser from 'phaser';
import { StageBase } from './StageBase';
import { DEPTH, FONT, W } from '../config/constants';
import { CHALLENGES } from '../content/challenges';
import { LEARNING_CLEAR, LEARNING_INTRO, LEARNING_PLAN } from '../content/stages';
import { audio } from '../systems/AudioSystem';
import { gauges } from '../systems/GaugeSystem';
import { score } from '../systems/ScoreSystem';
import type { LearningChallenge } from '../content/types';

const SUBJECT_LABEL: Record<string, string> = {
  english: '🔤 えいご',
  math: '🔢 さんすう',
  logic: '🧩 ろんり',
  emotion: '💛 きもち',
  dx: '🤖 DX'
};

// STAGE 3：LEARNING PEACE LAB
// 問題はデータ駆動（src/content/challenges.ts）。UIとロジックを分離してある。
export class LearningScene extends StageBase {
  private panel: Phaser.GameObjects.Container | null = null;
  private selected = 0;
  private choiceRects: Phaser.GameObjects.Rectangle[] = [];
  private current: LearningChallenge | null = null;
  private answerResolver: ((idx: number) => void) | null = null;

  constructor() {
    super('Learning');
  }

  protected stageName() {
    return 'STAGE 3 / LEARNING PEACE LAB';
  }
  protected bgKey() {
    return 'bg_lab';
  }
  protected bgm() {
    return 'lab' as const;
  }

  protected defaultChips() {
    this.hud.setChips(
      [
        { label: '1', key: '1' },
        { label: '2', key: '2' },
        { label: '3', key: '3' },
        { label: 'ENTER 答える', key: 'ENTER' },
        { label: 'H HOLD', key: 'H' },
        { label: 'ESC', key: 'ESC' }
      ],
      (k) => this.handleKey(k)
    );
    this.hud.setGuide('1-3 で答えを選び ENTER で決定。正解すると世界が再配置される！');
  }

  protected handleKey(code: string) {
    if (this.panel && this.answerResolver && !this.dialogue.active) {
      if (code === '1') this.select(0);
      else if (code === '2') this.select(1);
      else if (code === '3') this.select(2);
      else if (code === 'ENTER') this.confirmAnswer();
      else if (code === 'ESC') super.handleKey(code);
      return;
    }
    super.handleKey(code);
  }

  private select(i: number) {
    if (!this.current) return;
    this.selected = Phaser.Math.Clamp(i, 0, this.current.choices.length - 1);
    audio.select();
    this.choiceRects.forEach((r, j) => {
      r.setStrokeStyle(j === this.selected ? 4 : 2, j === this.selected ? 0xe8b923 : 0x44507a);
      r.setFillStyle(j === this.selected ? 0x1c2650 : 0x141b38);
    });
  }

  private confirmAnswer() {
    if (!this.answerResolver) return;
    const r = this.answerResolver;
    this.answerResolver = null;
    audio.confirm();
    r(this.selected);
  }

  private ask(ch: LearningChallenge): Promise<number> {
    this.current = ch;
    this.selected = 0;
    this.choiceRects = [];
    this.panel?.destroy();

    const cont = this.add.container(W / 2, 330).setDepth(DEPTH.menu);
    this.panel = cont;
    cont.add(this.add.rectangle(0, 0, 940, 470, 0x0d1226, 0.96).setStrokeStyle(3, 0xe8b923));
    cont.add(
      this.add.text(-440, -212, `${SUBJECT_LABEL[ch.subject]}　対象:${ch.gradeLevel}`, {
        fontFamily: FONT, fontSize: '14px', color: '#8ef0c0', fontStyle: 'bold'
      })
    );
    cont.add(
      this.add.text(0, -175, ch.situation, {
        fontFamily: FONT, fontSize: '15px', color: '#aeb9dd',
        wordWrap: { width: 880 }, align: 'center'
      }).setOrigin(0.5)
    );
    cont.add(
      this.add.text(0, -120, ch.prompt, {
        fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
        wordWrap: { width: 880 }, align: 'center', lineSpacing: 6
      }).setOrigin(0.5)
    );

    ch.choices.forEach((c, i) => {
      const y = -40 + i * 82;
      const r = this.add.rectangle(0, y, 860, 68, 0x141b38).setStrokeStyle(2, 0x44507a);
      const t = this.add.text(-390, y, `${i + 1}．${c.label}`, {
        fontFamily: FONT, fontSize: '19px', color: '#f4f6ff', fontStyle: 'bold',
        wordWrap: { width: 800 }
      }).setOrigin(0, 0.5);
      cont.add([r, t]);
      this.choiceRects.push(r);
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        audio.unlock();
        if (this.selected === i && this.answerResolver) this.confirmAnswer();
        else this.select(i);
      });
    });

    cont.add(
      this.add.text(0, 215, '1 / 2 / 3 で選択 → ENTER で決定（クリックでも回答できます）', {
        fontFamily: FONT, fontSize: '13px', color: '#ffe9a8'
      }).setOrigin(0.5)
    );

    this.select(0);
    return new Promise<number>((resolve) => {
      this.answerResolver = resolve;
    });
  }

  // 正解すると、食事・人員・時間がゲーム世界で実際に再配置される
  private async rearrange(kind: LearningChallenge['rearrange']) {
    if (!kind) return;
    const targets: Phaser.GameObjects.Image[] = [];
    const cx = W / 2;
    const cy = 300;

    if (kind === 'meat') {
      for (let i = 0; i < 12; i++) targets.push(this.add.image(cx, cy, 'icon_meat').setScale(0.7).setDepth(DEPTH.fx));
      const groups = [
        { x: cx - 330, y: 520 }, { x: cx - 110, y: 520 }, { x: cx + 110, y: 520 }, { x: cx + 330, y: 520 }
      ];
      targets.forEach((t, i) => {
        const gp = groups[i % 4];
        this.tweens.add({
          targets: t, x: gp.x + (Math.floor(i / 4) - 1) * 34, y: gp.y,
          duration: 900, delay: i * 60, ease: 'Cubic.easeOut'
        });
      });
      groups.forEach((gp, i) =>
        this.time.delayedCall(1100, () => this.floatText(gp.x, gp.y - 50, `${i + 1}人目：3枚`, '#b6f0c8'))
      );
    } else if (kind === 'banana') {
      for (let i = 0; i < 10; i++) targets.push(this.add.image(cx, cy, 'icon_banana').setScale(0.7).setDepth(DEPTH.fx));
      targets.forEach((t, i) => {
        const now = i < 5;
        this.tweens.add({
          targets: t, x: (now ? cx - 260 : cx + 260) + (i % 5) * 36 - 72, y: 520,
          duration: 900, delay: i * 70, ease: 'Cubic.easeOut'
        });
      });
      this.time.delayedCall(1200, () => {
        this.floatText(cx - 260, 460, '今食べる：5本', '#b6f0c8');
        this.floatText(cx + 260, 460, '後の楽しみ：5本', '#ffe9a8');
      });
    } else if (kind === 'groups') {
      const kidTex = ['child_a', 'child_b', 'child_c'];
      for (let i = 0; i < 20; i++)
        targets.push(this.add.image(cx, cy, kidTex[i % 3]).setScale(0.55).setDepth(DEPTH.fx));
      targets.forEach((t, i) => {
        const gI = i % 4;
        this.tweens.add({
          targets: t,
          x: cx - 390 + gI * 260 + (Math.floor(i / 4) % 5) * 34,
          y: 540,
          duration: 900, delay: i * 45, ease: 'Cubic.easeOut'
        });
      });
      this.time.delayedCall(1200, () => this.floatText(cx, 470, '5人ずつ×4グループで、みんな安全！', '#b6f0c8', 18));
    } else if (kind === 'time') {
      const bar = this.add.rectangle(cx, 500, 500, 30, 0x8fa2d9).setDepth(DEPTH.fx);
      const label = this.add
        .text(cx, 455, '写真整理 30分', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx);
      const clock = this.add.image(cx - 290, 500, 'icon_clock').setDepth(DEPTH.fx);
      this.tweens.add({ targets: bar, width: 300, duration: 1000, delay: 300 });
      this.time.delayedCall(1100, () => {
        label.setText('写真整理 18分（−12分は子どもとの時間へ！）');
        this.floatText(cx, 560, '+12分 こどもと遊ぶ時間', '#b6f0c8', 18);
      });
      targets.push(clock);
      this.time.delayedCall(2400, () => {
        bar.destroy();
        label.destroy();
      });
    }

    await this.wait(2400);
    targets.forEach((t) =>
      this.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => t.destroy() })
    );
  }

  protected async script() {
    this.hero.setPosition(220, 520);

    this.drainEnabled = false;
    await this.say(LEARNING_INTRO);

    for (const ch of CHALLENGES) {
      this.drainEnabled = true;
      const idx = await this.ask(ch);
      this.drainEnabled = false;
      const choice = ch.choices[idx];
      gauges.applyEffects({
        peace: choice.effects.peace,
        capacity: choice.effects.capacity,
        trust: choice.effects.trust,
        team: choice.effects.teamCondition
      });
      const correct = idx === ch.recommendedChoiceIndex;
      this.panel?.destroy();
      this.panel = null;

      if (correct) {
        score.learningCorrect++;
        score.happyPeople += 3;
        audio.success();
        this.floatText(W / 2, 250, '⭕ せいかい！', '#b6f0c8', 30);
        await this.rearrange(ch.rearrange);
      } else {
        audio.warn();
        this.floatText(W / 2, 250, 'うーん、おしい…', '#ffb08a', 24);
      }
      await this.say([{ speaker: '─', text: choice.feedback }]);
    }

    this.drainEnabled = true;
    await this.requirePlan(LEARNING_PLAN);
    score.happyPeople += 6;

    this.drainEnabled = false;
    await this.say(LEARNING_CLEAR);
    this.goto('Final');
  }
}
