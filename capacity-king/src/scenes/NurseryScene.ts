import Phaser from 'phaser';
import { StageBase } from './StageBase';
import { DEPTH, FONT, W } from '../config/constants';
import { Robot } from '../entities/Robot';
import { audio } from '../systems/AudioSystem';
import { gauges } from '../systems/GaugeSystem';
import { score } from '../systems/ScoreSystem';
import {
  NURSERY_ASSIGN_HINT, NURSERY_CLEAR, NURSERY_INTRO, NURSERY_PLAN,
  NURSERY_TASKS, NURSERY_TASK_AI, SPEAKER
} from '../content/stages';

type TaskState = { kind: string; label: string; assigned: 'ai' | 'human' | null };

// STAGE 2：NURSERY DX PANIC
// AIに任せる仕事と、人が担う仕事を分ける。
export class NurseryScene extends StageBase {
  private robot!: Robot;
  private humanity = 100;
  private humanityBar: Phaser.GameObjects.Rectangle | null = null;
  private tasks: TaskState[] = [];
  private assignPanel: Phaser.GameObjects.Container | null = null;
  private assignIndex = 0;
  private assignResolver: (() => void) | null = null;
  private docPile: Phaser.GameObjects.Container | null = null;
  private staffSprite!: Phaser.GameObjects.Image;
  private kids: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Nursery');
  }

  protected stageName() {
    return 'STAGE 2 / NURSERY DX PANIC';
  }
  protected bgKey() {
    return 'bg_nursery';
  }
  protected bgm() {
    return 'nursery' as const;
  }

  protected defaultChips() {
    this.hud.setChips(
      [
        { label: 'SPACE 受け止める', key: 'SPACE' },
        { label: 'H HOLD', key: 'H' },
        { label: '1', key: '1' },
        { label: '2', key: '2' },
        { label: '3', key: '3' },
        { label: 'ENTER 提案', key: 'ENTER' },
        { label: 'A AI委任', key: 'A' },
        { label: 'ESC', key: 'ESC' }
      ],
      (k) => this.handleKey(k)
    );
    this.hud.setGuide('A AIロボットへの業務委任メニュー　SPACE 受け止める　H HOLD　ENTER BETTER PLAN');
  }

  protected onMenuA() {
    if (this.assignPanel) return;
    if (this.tasks.length === 0) {
      this.floatText(this.hero.x, this.hero.y - 130, 'まず業務を受け止めよう（SPACE）', '#ffe9a8');
      return;
    }
    this.openAssignPanel();
  }

  protected handleKey(code: string) {
    // 委任パネル表示中は 1=AI / 2=人 で振り分け
    if (this.assignPanel && !this.dialogue.active) {
      if (code === '1') this.assign('ai');
      else if (code === '2') this.assign('human');
      else if (code === 'A' || code === 'ESC') this.closeAssignPanel();
      return;
    }
    super.handleKey(code);
  }

  private openAssignPanel() {
    this.assignIndex = this.tasks.findIndex((t) => t.assigned === null);
    if (this.assignIndex < 0) this.assignIndex = 0;
    this.renderAssignPanel();
  }

  private renderAssignPanel() {
    this.assignPanel?.destroy();
    const cont = this.add.container(W / 2, 350).setDepth(DEPTH.menu);
    this.assignPanel = cont;

    const bg = this.add.rectangle(0, 0, 820, 380, 0x0d1226, 0.96).setStrokeStyle(3, 0x9fd8c0);
    cont.add(bg);
    cont.add(
      this.add.text(0, -165, '業務の振り分け — 1: AIに任せる / 2: 人が担う（Aで閉じる）', {
        fontFamily: FONT, fontSize: '18px', color: '#8ef0c0', fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const pending = this.tasks.filter((t) => t.assigned === null);
    if (pending.length === 0) {
      cont.add(
        this.add.text(0, 0, '全業務の振り分けが完了！\nH で止めて BETTER PLAN をまとめよう。', {
          fontFamily: FONT, fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 8
        }).setOrigin(0.5)
      );
      return;
    }

    const current = this.tasks[this.assignIndex]?.assigned === null
      ? this.tasks[this.assignIndex]
      : pending[0];

    // 現在のタスク
    cont.add(this.add.image(-260, -60, `icon_${current.kind}`).setScale(1.6));
    cont.add(
      this.add.text(-260, 0, current.label, {
        fontFamily: FONT, fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const mkBtn = (x: number, y: number, label: string, color: number, cb: () => void) => {
      const r = this.add.rectangle(x, y, 300, 62, color).setStrokeStyle(2, 0xffffff, 0.5);
      const t = this.add.text(x, y, label, {
        fontFamily: FONT, fontSize: '19px', color: '#0d1226', fontStyle: 'bold'
      }).setOrigin(0.5);
      cont.add([r, t]);
      r.setInteractive({ useHandCursor: true })
        .on('pointerover', () => r.setAlpha(0.85))
        .on('pointerout', () => r.setAlpha(1))
        .on('pointerdown', () => {
          audio.unlock();
          cb();
        });
    };
    mkBtn(120, -60, '1️⃣ AIロボットに任せる', 0x9fd8c0, () => this.assign('ai'));
    mkBtn(120, 20, '2️⃣ 人（先生）が担う', 0xf5b5c4, () => this.assign('human'));

    // 進捗リスト
    const doneList = this.tasks
      .map((t) => {
        if (t.assigned === 'ai') return `🤖 ${t.label}`;
        if (t.assigned === 'human') return `👩‍🏫 ${t.label}`;
        return `□ ${t.label}`;
      })
      .join('　');
    cont.add(
      this.add.text(0, 120, doneList, {
        fontFamily: FONT, fontSize: '13px', color: '#cdd7f3', wordWrap: { width: 780 }, align: 'center'
      }).setOrigin(0.5)
    );
    cont.add(
      this.add.text(0, 165, 'ヒント：集計・下書き・翻訳・整理はAI。子どものケアと大切な対話は人。AIの出力は職員が確認。', {
        fontFamily: FONT, fontSize: '12px', color: '#8fa2d9'
      }).setOrigin(0.5)
    );
  }

  private assign(to: 'ai' | 'human') {
    const pending = this.tasks.filter((t) => t.assigned === null);
    if (pending.length === 0) return;
    const current = this.tasks[this.assignIndex]?.assigned === null
      ? this.tasks[this.assignIndex]
      : pending[0];

    const aiCorrect = NURSERY_TASK_AI[current.kind];
    const correct = (to === 'ai') === aiCorrect;

    if (!correct && to === 'ai') {
      // 人が担うべき仕事をAIへ → HUMANITY低下、振り分けは保留のまま
      this.humanity = Math.max(0, this.humanity - 12);
      this.updateHumanity();
      gauges.add('team', -4);
      audio.error();
      this.robot.flashPose('error', 1100);
      this.floatText(this.robot.sprite.x, this.robot.sprite.y - 110, 'ピポー！ ソレハ人ノ仕事デス…！', '#ff9a8a');
      this.renderAssignPanel();
      return;
    }
    if (!correct && to === 'human') {
      audio.warn();
      this.floatText(W / 2, 260, 'それは先生の時間を奪う…AIに任せられる仕事だ！', '#ffb08a');
      this.renderAssignPanel();
      return;
    }

    current.assigned = to;
    audio.confirm();
    if (to === 'ai') {
      this.robot.flashPose('work', 900);
      gauges.add('capacity', 3);
    } else {
      gauges.add('trust', 2);
    }
    this.assignIndex = this.tasks.findIndex((t) => t.assigned === null);
    this.renderAssignPanel();

    if (this.tasks.every((t) => t.assigned !== null)) {
      this.time.delayedCall(600, () => {
        this.closeAssignPanel();
        this.assignResolver?.();
        this.assignResolver = null;
      });
    }
  }

  private closeAssignPanel() {
    this.assignPanel?.destroy();
    this.assignPanel = null;
  }

  private updateHumanity() {
    if (this.humanityBar) {
      this.humanityBar.width = Math.max(2, (176 * this.humanity) / 100);
      this.humanityBar.setFillStyle(this.humanity < 50 ? 0xe05a3a : 0xf5b5c4);
    }
  }

  protected async script() {
    this.robot = new Robot(this, W - 170, 545);
    this.staffSprite = this.add.image(W - 300, 520, 'staff').setDepth(DEPTH.entity);
    this.kids = [
      this.add.image(W - 420, 560, 'child_a').setDepth(DEPTH.entity),
      this.add.image(W - 480, 570, 'child_b').setDepth(DEPTH.entity),
      this.add.image(W - 370, 580, 'child_c').setDepth(DEPTH.entity)
    ];
    this.kids.forEach((k, i) =>
      this.tweens.add({ targets: k, y: k.y - 4, duration: 700 + i * 120, yoyo: true, repeat: -1 })
    );

    // 書類の山
    const pile = this.add.container(W - 300, 470).setDepth(DEPTH.entity);
    for (let i = 0; i < 7; i++) {
      pile.add(this.add.image(Phaser.Math.Between(-16, 16), -i * 12, 'icon_note').setScale(0.8));
    }
    this.docPile = pile;

    // HUMANITYサブゲージ
    this.add.rectangle(W - 130, 84, 190, 34, 0x0a0d1c, 0.85).setDepth(DEPTH.hud).setStrokeStyle(1, 0xf5b5c4);
    this.add
      .text(W - 214, 74, 'HUMANITY', { fontFamily: FONT, fontSize: '11px', color: '#f5b5c4', fontStyle: 'bold' })
      .setDepth(DEPTH.hud + 1);
    this.add.rectangle(W - 130, 92, 178, 10, 0x232a45).setDepth(DEPTH.hud + 1);
    this.humanityBar = this.add
      .rectangle(W - 219, 92, 176, 8, 0xf5b5c4)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 2);

    this.drainEnabled = false;
    await this.say(NURSERY_INTRO);
    this.drainEnabled = true;

    // 業務が飛んでくる：受け止めるとタスクリストに入る
    const defs = NURSERY_TASKS;
    this.hud.setGuide('業務を SPACE で受け止めよう！ 受け止めた業務は A で振り分け');
    const results = await this.throwWave(defs, { gapMs: 1900, duration: 7800 });
    results.forEach((caught, i) => {
      const d = defs[i];
      // 取り逃した業務も机に積まれる＝結局対応が必要
      this.tasks.push({ kind: d.kind, label: d.label, assigned: null });
      if (!caught) gauges.add('team', -1);
    });

    this.drainEnabled = false;
    await this.say(NURSERY_ASSIGN_HINT);
    this.drainEnabled = true;

    // 全タスクの振り分けが終わるまで待つ
    this.hud.setGuide('A で委任メニューを開き、1: AI / 2: 人 に振り分けよう');
    await new Promise<void>((resolve) => {
      this.assignResolver = resolve;
      this.openAssignPanel();
    });

    // 仕上げのBETTER PLAN
    await this.requirePlan(NURSERY_PLAN);

    // 成功演出：書類の山が消え、保育士が子どものそばへ
    if (this.docPile) {
      this.tweens.add({
        targets: this.docPile, alpha: 0, y: 420, duration: 900,
        onComplete: () => this.docPile?.destroy()
      });
    }
    this.tweens.add({ targets: this.staffSprite, x: W - 430, duration: 1200, ease: 'Sine.easeInOut' });
    this.robot.setPose('happy');
    this.kids.forEach((k, i) =>
      this.tweens.add({ targets: k, y: k.y - 18, duration: 300, yoyo: true, repeat: 3, delay: i * 100 })
    );
    score.happyPeople += 20;
    score.nurseries += 1;
    score.familyHours += 2;
    this.humanity = Math.min(100, this.humanity + 20);
    this.updateHumanity();

    this.drainEnabled = false;
    await this.wait(1300);
    await this.say(NURSERY_CLEAR);
    this.goto('Learning');
  }
}
