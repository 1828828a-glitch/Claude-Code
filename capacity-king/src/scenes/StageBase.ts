import Phaser from 'phaser';
import { DEPTH, DRAIN_FREE, DRAIN_HOLD, FONT, H, HEALTH_NOTE, W } from '../config/constants';
import { gauges, type GaugeValues } from '../systems/GaugeSystem';
import { score } from '../systems/ScoreSystem';
import { audio } from '../systems/AudioSystem';
import { Hud } from '../ui/Hud';
import { DialogueBox } from '../ui/DialogueBox';
import { ChoiceCards } from '../ui/ChoiceCards';
import { TextButton } from '../ui/TextButton';
import type { DialogueLine, FlyingItemDef, GaugeKey, PlanSet } from '../content/types';

type FlyingItem = {
  cont: Phaser.GameObjects.Container;
  def: FlyingItemDef;
  tween: Phaser.Tweens.Tween;
  caught: boolean;
  done: boolean;
  resolve: (caught: boolean) => void;
};

// 全ステージ共通の基盤：
// 受け止める(SPACE) → 止めて考える(H/HOLD) → 提案カード(1/2/3) → BETTER PLAN実行(ENTER)。
export abstract class StageBase extends Phaser.Scene {
  protected hud!: Hud;
  protected dialogue!: DialogueBox;
  protected cards!: ChoiceCards;
  protected hero!: Phaser.GameObjects.Image;
  protected heroBulk = 0;
  protected holding = false;
  protected pausedGame = false;
  protected over = false;
  protected drainEnabled = true;
  protected items: FlyingItem[] = [];
  protected pendingShow: (() => void) | null = null;
  protected planResolver: (() => void) | null = null;
  protected planFeedbackBusy = false;
  private holdOverlay!: Phaser.GameObjects.Container;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private snapshot!: GaugeValues;
  private brightShown = false;
  private moveKeys!: Record<'left' | 'right' | 'up' | 'down', Phaser.Input.Keyboard.Key[]>;
  protected heroY = 520;

  protected abstract stageName(): string;
  protected abstract bgKey(): string;
  protected abstract bgm(): 'title' | 'town' | 'gorilla' | 'nursery' | 'lab' | 'final' | 'ending';
  protected abstract script(): Promise<void>;

  create() {
    this.over = false;
    this.pausedGame = false;
    this.holding = false;
    this.items = [];
    this.pendingShow = null;
    this.planResolver = null;
    this.heroBulk = 0;
    this.brightShown = false;
    this.snapshot = gauges.snapshot();

    this.add.image(W / 2, H / 2, this.bgKey()).setDepth(DEPTH.bg);

    this.hero = this.add.image(320, this.heroY, 'hero_idle').setDepth(DEPTH.entity);
    this.add
      .ellipse(320, this.heroY + 86, 120, 24, 0x000000, 0.25)
      .setDepth(DEPTH.entity - 1)
      .setName('heroShadow');

    this.hud = new Hud(this, this.stageName());
    this.dialogue = new DialogueBox(this);
    this.cards = new ChoiceCards(this);

    // HOLD演出
    const hRect = this.add.rectangle(W / 2, H / 2, W, H, 0x0a1a4a, 0.34);
    const hText = this.add
      .text(110, 120, 'HOLD', {
        fontFamily: FONT, fontSize: '54px', color: '#ffd76a', fontStyle: 'bold',
        stroke: '#0d1226', strokeThickness: 8
      })
      .setOrigin(0.5)
      .setAngle(-8);
    const hSub = this.add
      .text(110, 158, '世界は止まる。でも平和度は減っていく…', {
        fontFamily: FONT, fontSize: '13px', color: '#cdd7f3',
        stroke: '#0d1226', strokeThickness: 4
      })
      .setOrigin(0.5);
    this.holdOverlay = this.add
      .container(0, 0, [hRect, hText, hSub])
      .setDepth(DEPTH.holdOverlay)
      .setVisible(false);

    this.setupInput();
    this.defaultChips();
    audio.playBgm(this.bgm());

    this.script().catch(() => {
      /* シーン破棄で中断された場合は無視 */
    });
  }

  // ---------------- 入力 ----------------

  private setupInput() {
    const kb = this.input.keyboard!;
    const key = (c: string) => kb.addKey(c);
    this.moveKeys = {
      left: [key('LEFT'), key('A')],
      right: [key('RIGHT'), key('D')],
      up: [key('UP'), key('W')],
      down: [key('DOWN'), key('S')]
    };
    kb.on('keydown-SPACE', () => this.handleKey('SPACE'));
    kb.on('keydown-H', () => this.handleKey('H'));
    kb.on('keydown-ONE', () => this.handleKey('1'));
    kb.on('keydown-TWO', () => this.handleKey('2'));
    kb.on('keydown-THREE', () => this.handleKey('3'));
    kb.on('keydown-ENTER', () => this.handleKey('ENTER'));
    kb.on('keydown-G', () => this.handleKey('G'));
    kb.on('keydown-A', () => this.handleKey('A'));
    kb.on('keydown-ESC', () => this.handleKey('ESC'));
    kb.once('keydown', () => audio.unlock());
    this.input.once('pointerdown', () => audio.unlock());
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
        { label: 'ESC', key: 'ESC' }
      ],
      (k) => this.handleKey(k)
    );
    this.hud.setGuide('←→/WASD 移動　SPACE 受け止める　H HOLD　1-3 カード選択　ENTER BETTER PLAN　ESC ポーズ');
  }

  protected handleKey(code: string) {
    if (this.over) return;
    if (code === 'ESC') {
      this.togglePause();
      return;
    }
    if (this.pausedGame) return;

    if (this.dialogue.active) {
      if (code === 'SPACE' || code === 'ENTER') this.dialogue.advance();
      return;
    }

    if (this.cards.active) {
      if (code === '1') this.cards.select(0);
      else if (code === '2') this.cards.select(1);
      else if (code === '3') this.cards.select(2);
      else if (code === 'ENTER') this.cards.confirm();
      else if (code === 'H') this.setHold(false);
      return;
    }

    if (code === 'SPACE') this.tryCatch();
    else if (code === 'H') this.setHold(!this.holding);
    else if (code === 'G') this.onMenuG();
    else if (code === 'A') this.onMenuA();
    else if (code === 'ENTER' && this.holding) this.showPending();
  }

  protected onMenuG() {}
  protected onMenuA() {}

  // ---------------- HOLD & カード ----------------

  protected setHold(v: boolean) {
    if (this.holding === v) return;
    this.holding = v;
    this.holdOverlay.setVisible(v);
    if (v) {
      audio.hold();
      this.hero.setTexture('hero_hold');
      this.items.forEach((it) => !it.done && it.tween.pause());
      this.time.delayedCall(350, () => this.showPending());
    } else {
      this.cards.hide();
      this.hero.setTexture(this.currentHeroIdle());
      this.items.forEach((it) => !it.done && it.tween.resume());
    }
  }

  protected showPending() {
    if (!this.pendingShow || this.cards.active || this.planFeedbackBusy || this.over) return;
    if (!this.holding) return;
    this.pendingShow();
  }

  // BETTER PLANを成立させるまでステージは進まない
  protected requirePlan(set: PlanSet): Promise<void> {
    this.pendingShow = () => this.cards.show(set, (idx) => void this.resolvePlanChoice(set, idx));
    this.hud.setGuide('H で止めて考えよう → 1-3 でカードを選び ENTER で BETTER PLAN！');
    return new Promise((resolve) => {
      this.planResolver = resolve;
      if (this.holding) this.showPending();
    });
  }

  // カードの選択結果だけを返す（効果・演出は呼び出し側で制御。FINALステージ用）
  protected choosePlan(set: PlanSet): Promise<number> {
    this.hud.setGuide('H で止めて考えよう → 1-3 でカードを選び ENTER で実行！');
    return new Promise((resolve) => {
      this.pendingShow = () => this.cards.show(set, (idx) => {
        this.pendingShow = null;
        resolve(idx);
      });
      if (this.holding) this.showPending();
    });
  }

  private async resolvePlanChoice(set: PlanSet, idx: number) {
    const choice = set.choices[idx];
    this.planFeedbackBusy = true;
    gauges.applyEffects(choice.effects);

    if (choice.kind === 'better') {
      this.pendingShow = null;
      await this.playSuccess();
      await this.say([{ speaker: '─', text: choice.feedback }]);
      this.planFeedbackBusy = false;
      this.setHold(false);
      score.betterPlans++;
      const r = this.planResolver;
      this.planResolver = null;
      r?.();
    } else {
      if (choice.kind === 'bad') audio.warn();
      else audio.click();
      this.cameras.main.shake(200, choice.kind === 'bad' ? 0.006 : 0.002);
      await this.say([{ speaker: '─', text: choice.feedback + '（もう一度カードを選ぼう）' }]);
      this.planFeedbackBusy = false;
      if (this.holding) this.showPending();
    }
  }

  // ---------------- 演出 ----------------

  protected async playSuccess(big = false) {
    this.cards.hide();
    this.hero.setTexture('hero_propose');
    this.floatText(this.hero.x, this.hero.y - 130, 'もっといい案があります！', '#ffd76a', 22);
    await this.wait(700);
    this.hero.setTexture('hero_success');
    audio.success(big);
    audio.wave();

    for (let i = 0; i < (big ? 5 : 3); i++) {
      const ring = this.add
        .image(this.hero.x, this.hero.y - 40, 'fx_ring')
        .setDepth(DEPTH.fx)
        .setScale(0.15)
        .setAlpha(0.95);
      this.tweens.add({
        targets: ring,
        scale: big ? 9 : 6,
        alpha: 0,
        duration: 1300,
        delay: i * 220,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });
    }
    for (let i = 0; i < 14; i++) {
      const s = this.add
        .image(this.hero.x, this.hero.y - 40, 'fx_spark')
        .setDepth(DEPTH.fx)
        .setScale(0.6 + Math.random());
      this.tweens.add({
        targets: s,
        x: this.hero.x + Phaser.Math.Between(-360, 360),
        y: this.hero.y - 40 + Phaser.Math.Between(-260, 120),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 1100,
        ease: 'Cubic.easeOut',
        onComplete: () => s.destroy()
      });
    }
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xfff3c0, 0.45).setDepth(DEPTH.fx + 1);
    this.tweens.add({ targets: flash, alpha: 0, duration: 900, onComplete: () => flash.destroy() });

    // 受け止めていた重みが幸福エネルギーに変わる
    this.heroBulk = Math.max(0, this.heroBulk - 0.5);
    await this.wait(big ? 1600 : 1100);
    this.hero.setTexture(this.currentHeroIdle());
    this.hero.setScale(1 + this.heroBulk * 0.5);
  }

  protected floatText(x: number, y: number, text: string, color = '#ffffff', size = 16) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold',
        stroke: '#0d1226', strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 2);
    this.tweens.add({
      targets: t, y: y - 60, alpha: 0, duration: 1400, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy()
    });
  }

  protected currentHeroIdle(): string {
    if (this.heroBulk > 0.65 || gauges.get('capacity') < 25) return 'hero_overload';
    return 'hero_idle';
  }

  // ---------------- 飛来する要望 ----------------

  protected spawnItem(def: FlyingItemDef, opts: { y?: number; duration?: number } = {}): Promise<boolean> {
    const y = opts.y ?? 440;
    const icon = this.add.image(0, 0, `icon_${def.kind}`).setScale(1.15);
    const label = this.add
      .text(0, 40, def.label, {
        fontFamily: FONT, fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#0d1226', strokeThickness: 4
      })
      .setOrigin(0.5);
    const cont = this.add.container(W + 70, y, [icon, label]).setDepth(DEPTH.item);
    this.tweens.add({ targets: icon, y: -6, duration: 420, yoyo: true, repeat: -1 });

    return new Promise<boolean>((resolve) => {
      const tween = this.tweens.add({
        targets: cont,
        x: -90,
        duration: opts.duration ?? 6500,
        onComplete: () => {
          if (!item.done) {
            item.done = true;
            cont.destroy();
            gauges.add('peace', -3);
            gauges.add('trust', -3);
            audio.miss();
            this.floatText(120, y, '受け止められなかった…', '#ff9a8a');
            resolve(false);
          }
        }
      });
      const item: FlyingItem = { cont, def, tween, caught: false, done: false, resolve };
      this.items.push(item);
      if (this.holding) tween.pause();
    });
  }

  protected tryCatch() {
    const candidates = this.items.filter(
      (it) => !it.done && Math.abs(it.cont.x - this.hero.x) < 120 && it.cont.x > 60
    );
    if (candidates.length === 0) {
      audio.click();
      return;
    }
    const item = candidates.sort(
      (a, b) => Math.abs(a.cont.x - this.hero.x) - Math.abs(b.cont.x - this.hero.x)
    )[0];
    item.done = true;
    item.caught = true;
    item.tween.stop();
    audio.catch();

    this.tweens.add({
      targets: item.cont,
      x: this.hero.x,
      y: this.hero.y - 60,
      scale: 0.3,
      alpha: 0.2,
      duration: 240,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        item.cont.destroy();
        audio.munch();
        this.hero.setTexture('hero_eat');
        this.time.delayedCall(260, () => {
          if (!this.holding) this.hero.setTexture(this.currentHeroIdle());
        });

        // 受け止める＝POWERは上がるが、CAPACITYが削れる
        score.accepted++;
        this.heroBulk = Math.min(1, this.heroBulk + 0.14);
        this.hero.setScale(1 + this.heroBulk * 0.5);
        gauges.applyEffects(item.def.effects ?? { capacity: -7, trust: 2 });
        this.floatText(this.hero.x, this.hero.y - 120, '受け止めた！', '#ffe9a8');
        if (gauges.get('capacity') < 30) {
          this.floatText(this.hero.x, this.hero.y - 150, 'CAPACITYが限界に近い…！', '#ff9a8a');
        }
        item.resolve(true);
      }
    });
  }

  protected async throwWave(defs: FlyingItemDef[], opts: { gapMs?: number; duration?: number; y?: number } = {}) {
    const promises: Promise<boolean>[] = [];
    for (let i = 0; i < defs.length; i++) {
      promises.push(this.spawnItem(defs[i], { duration: opts.duration, y: opts.y }));
      await this.wait(opts.gapMs ?? 1600);
    }
    return Promise.all(promises);
  }

  // ---------------- 進行ユーティリティ ----------------

  protected wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  protected say(lines: DialogueLine[]): Promise<void> {
    return this.dialogue.show(lines);
  }

  protected goto(sceneKey: string) {
    this.scene.start(sceneKey);
  }

  // ---------------- ポーズ / ゲームオーバー ----------------

  private togglePause() {
    if (this.over) return;
    this.pausedGame = !this.pausedGame;
    if (this.pausedGame) {
      this.tweens.pauseAll();
      this.time.paused = true;
      const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x05060d, 0.8);
      const title = this.add
        .text(W / 2, 220, 'PAUSE', {
          fontFamily: FONT, fontSize: '48px', color: '#ffd76a', fontStyle: 'bold'
        })
        .setOrigin(0.5);
      const note = this.add
        .text(W / 2, 560, HEALTH_NOTE, {
          fontFamily: FONT, fontSize: '13px', color: '#8fa2d9'
        })
        .setOrigin(0.5);
      const resume = new TextButton(this, W / 2, 330, 'つづける (ESC)', () => this.togglePause());
      const toTitle = new TextButton(this, W / 2, 400, 'タイトルへ', () => {
        this.pausedGame = false;
        this.tweens.resumeAll();
        this.time.paused = false;
        audio.stopBgm();
        this.scene.start('Title');
      });
      this.pauseOverlay = this.add
        .container(0, 0, [bg, title, note, resume, toTitle])
        .setDepth(DEPTH.overlay);
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
      this.tweens.resumeAll();
      this.time.paused = false;
      // HOLD中に開いた場合はHOLD状態を維持
      if (this.holding) this.items.forEach((it) => !it.done && it.tween.pause());
    }
  }

  private doGameOver() {
    this.over = true;
    audio.stopBgm();
    audio.gameover();
    this.tweens.pauseAll();
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x05060d, 0.88).setDepth(DEPTH.overlay);
    this.add
      .text(W / 2, 240, 'WORLD PEACE が失われた…', {
        fontFamily: FONT, fontSize: '38px', color: '#ff9a8a', fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 1);
    this.add
      .text(W / 2, 300, '受け止めるだけでも、止まるだけでも、街は幸せにならない。\n「もっといい案」で前に進もう。', {
        fontFamily: FONT, fontSize: '17px', color: '#cdd7f3', align: 'center', lineSpacing: 6
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 1);
    const retry = new TextButton(this, W / 2, 400, 'このステージをやり直す', () => {
      gauges.restore(this.snapshot);
      // 平和度が低すぎる状態で詰まないよう最低値を保証
      if (gauges.get('peace') < 30) gauges.set('peace', 30);
      audio.playBgm(this.bgm());
      this.scene.restart();
    });
    retry.setDepth(DEPTH.overlay + 1);
    bg.setInteractive(); // 下のUIへのクリックを遮断
  }

  // ---------------- update ----------------

  update(_time: number, deltaMs: number) {
    if (this.over || this.pausedGame) return;
    const dt = deltaMs / 1000;

    // WORLD PEACE は決断しない限り少しずつ減る
    if (!this.dialogue.active && this.drainEnabled) {
      gauges.values.peace = Math.max(
        0,
        gauges.values.peace - (this.holding || this.cards.active ? DRAIN_HOLD : DRAIN_FREE) * dt
      );
      gauges.emit('change', gauges.values);
    }

    if (gauges.get('peace') <= 0) {
      this.doGameOver();
      return;
    }

    if (gauges.get('peace') >= 100 && !this.brightShown) {
      this.brightShown = true;
      const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xfff8d8, 0.5).setDepth(DEPTH.fx);
      this.tweens.add({ targets: flash, alpha: 0, duration: 1500, onComplete: () => flash.destroy() });
    }

    // 移動（HOLD・カード・会話中は動けない）
    if (!this.holding && !this.cards.active && !this.dialogue.active) {
      const speed = 340 * dt;
      const down = (arr: Phaser.Input.Keyboard.Key[]) => arr.some((k) => k.isDown);
      if (down(this.moveKeys.left)) this.hero.x = Math.max(90, this.hero.x - speed);
      if (down(this.moveKeys.right)) this.hero.x = Math.min(W - 90, this.hero.x + speed);
      const shadow = this.children.getByName('heroShadow') as Phaser.GameObjects.Ellipse | null;
      if (shadow) shadow.x = this.hero.x;
    }
  }
}
