import Phaser from 'phaser';
import { StageBase } from './StageBase';
import { DEPTH, FONT, HEALTH_NOTE, W } from '../config/constants';
import { Gorilla, GORILLA_ACTIONS } from '../entities/Gorilla';
import { audio } from '../systems/AudioSystem';
import { score } from '../systems/ScoreSystem';
import {
  GORILLA_CLEAR, GORILLA_INTRO, GORILLA_MID, GORILLA_PLAN_1, GORILLA_PLAN_2,
  GORILLA_STATUS_HINT, SPEAKER
} from '../content/stages';
import type { FlyingItemDef } from '../content/types';

// STAGE 1：GORILLA MANAGEMENT
export class GorillaScene extends StageBase {
  private gorilla!: Gorilla;
  private statusPanel: Phaser.GameObjects.Container | null = null;
  private menuPanel: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Gorilla');
  }

  protected stageName() {
    return 'STAGE 1 / GORILLA MANAGEMENT';
  }
  protected bgKey() {
    return 'bg_office';
  }
  protected bgm() {
    return 'gorilla' as const;
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
        { label: 'G ゴリラ対応', key: 'G' },
        { label: 'ESC', key: 'ESC' }
      ],
      (k) => this.handleKey(k)
    );
    this.hud.setGuide('G ゴリラ対応メニュー　SPACE 受け止める　H HOLD　1-3 選択　ENTER BETTER PLAN　ESC ポーズ');
  }

  protected onMenuG() {
    if (this.menuPanel) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  private openMenu() {
    if (this.dialogue.active || this.cards.active) return;
    this.closeStatus();
    const cont = this.add.container(W / 2, 380).setDepth(DEPTH.menu);
    const bg = this.add.rectangle(0, 0, 760, 330, 0x0d1226, 0.96).setStrokeStyle(3, 0xe8b923);
    cont.add(bg);
    cont.add(
      this.add.text(0, -140, 'ゴリラへの対応（クリックで実行 / Gで閉じる）', {
        fontFamily: FONT, fontSize: '19px', color: '#ffd76a', fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    GORILLA_ACTIONS.forEach((a, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = -185 + col * 370;
      const y = -85 + row * 62;
      const r = this.add.rectangle(x, y, 340, 50, 0x1d2f6f).setStrokeStyle(2, 0x44507a);
      const t = this.add.text(x, y, a.label, {
        fontFamily: FONT, fontSize: '17px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      cont.add([r, t]);
      r.setInteractive({ useHandCursor: true })
        .on('pointerover', () => r.setFillStyle(0x3452b5))
        .on('pointerout', () => r.setFillStyle(0x1d2f6f))
        .on('pointerdown', () => {
          audio.unlock();
          const res = this.gorilla.apply(a.key);
          if (res.good) audio.confirm();
          else audio.warn();
          this.floatText(this.gorilla.sprite.x, this.gorilla.sprite.y - 130, res.text, res.good ? '#b6f0c8' : '#ff9a8a', 15);
          this.refreshStatusPanel();
        });
    });
    this.menuPanel = cont;
    this.openStatus(); // メニューと一緒に状態も見せる
  }

  private closeMenu() {
    this.menuPanel?.destroy();
    this.menuPanel = null;
    this.closeStatus();
  }

  private openStatus() {
    if (this.statusPanel) return;
    const cont = this.add.container(190, 320).setDepth(DEPTH.menu);
    this.statusPanel = cont;
    this.refreshStatusPanel();
  }

  private closeStatus() {
    this.statusPanel?.destroy();
    this.statusPanel = null;
  }

  private refreshStatusPanel() {
    if (!this.statusPanel) return;
    this.statusPanel.removeAll(true);
    const p = this.gorilla.params;
    const bg = this.add.rectangle(0, 0, 330, 340, 0x0d1226, 0.95).setStrokeStyle(3, 0x59c795);
    this.statusPanel.add(bg);
    this.statusPanel.add(
      this.add.text(0, -150, 'ゴリラ部下 ステータス', {
        fontFamily: FONT, fontSize: '18px', color: '#8ef0c0', fontStyle: 'bold'
      }).setOrigin(0.5)
    );
    this.statusPanel.add(
      this.add.text(0, -122, '身長188cm / 体重140kg / 営業のエース', {
        fontFamily: FONT, fontSize: '13px', color: '#cdd7f3'
      }).setOrigin(0.5)
    );
    const rows: { label: string; v: number; invert?: boolean }[] = [
      { label: 'ENERGY', v: p.energy },
      { label: 'CONDITION', v: p.condition },
      { label: 'TRUST', v: p.trust },
      { label: 'HUNGER', v: p.hunger, invert: true },
      { label: 'STRESS', v: p.stress, invert: true }
    ];
    rows.forEach((r, i) => {
      const y = -86 + i * 38;
      this.statusPanel!.add(
        this.add.text(-145, y, r.label, {
          fontFamily: FONT, fontSize: '13px', color: '#ffe9a8', fontStyle: 'bold'
        }).setOrigin(0, 0.5)
      );
      this.statusPanel!.add(
        this.add.rectangle(30, y, 180, 12, 0x232a45).setStrokeStyle(1, 0x44507a)
      );
      const bad = r.invert ? r.v > 60 : r.v < 35;
      this.statusPanel!.add(
        this.add
          .rectangle(30 - 89, y, Math.max(2, (178 * r.v) / 100), 8, bad ? 0xe05a3a : 0x59c795)
          .setOrigin(0, 0.5)
      );
      this.statusPanel!.add(
        this.add.text(128, y, String(Math.round(r.v)), {
          fontFamily: FONT, fontSize: '12px', color: '#ffffff'
        }).setOrigin(0, 0.5)
      );
    });
    this.statusPanel.add(
      this.add.text(0, 112, this.gorilla.recentSweets ? '⚠ 直前に甘い物を摂取（糖代謝リスクあり）' : '食事バランス：改善中', {
        fontFamily: FONT, fontSize: '12px', color: this.gorilla.recentSweets ? '#ffb08a' : '#b6f0c8'
      }).setOrigin(0.5)
    );
    this.statusPanel.add(
      this.add.text(0, 146, HEALTH_NOTE, {
        fontFamily: FONT, fontSize: '10px', color: '#8fa2d9', wordWrap: { width: 300 }, align: 'center'
      }).setOrigin(0.5)
    );
  }

  protected async script() {
    this.gorilla = new Gorilla(this, W - 220, 490);
    this.gorilla.refreshPose();

    this.drainEnabled = false;
    await this.say(GORILLA_INTRO);
    this.openStatus();
    await this.say(GORILLA_STATUS_HINT);
    this.drainEnabled = true;

    // ビート1：バナナ3本要求 → 状態を見て最善の対応を選ぶ
    await this.requirePlan(GORILLA_PLAN_1);
    this.gorilla.recentSweets = false;
    this.gorilla.params.condition = Math.max(this.gorilla.params.condition, 60);
    this.gorilla.params.hunger = 30;
    this.gorilla.refreshPose();
    this.refreshStatusPanel();
    score.happyPeople += 3;

    // ビート2：案件ラッシュ。Gメニューで分担しつつ受け止める
    this.drainEnabled = false;
    await this.say(GORILLA_MID);
    this.drainEnabled = true;
    const salesWave: FlyingItemDef[] = [
      { kind: 'doc', label: '新規案件A' },
      { kind: 'phone', label: '顧客からの相談' },
      { kind: 'doc', label: '新規案件B' },
      { kind: 'doc', label: '大型コンペ資料' },
      { kind: 'phone', label: '既存顧客フォロー' }
    ];
    const wave = this.throwWave(salesWave, { gapMs: 2400, duration: 7500 });
    const plan = this.requirePlan(GORILLA_PLAN_2);
    await Promise.all([wave, plan]);

    // クリア処理
    this.gorilla.params.condition = Math.max(this.gorilla.params.condition, 75);
    this.gorilla.params.stress = Math.min(this.gorilla.params.stress, 30);
    this.gorilla.refreshPose();
    score.happyPeople += 4;
    score.familyHours += 2;
    this.closeMenu();
    this.drainEnabled = false;
    await this.say(GORILLA_CLEAR);
    this.goto('Nursery');
  }
}
