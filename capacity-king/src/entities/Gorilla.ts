import Phaser from 'phaser';
import { DEPTH, FONT } from '../config/constants';
import { gauges } from '../systems/GaugeSystem';
import { score } from '../systems/ScoreSystem';

export type GorillaAction =
  | 'banana' | 'water' | 'meal' | 'walk'
  | 'rest' | 'listen' | 'delegate' | 'checkup';

export type GorillaParams = {
  energy: number;    // 行動力
  condition: number; // 体調
  trust: number;     // 主人公への信頼
  hunger: number;    // 空腹（高いほど空腹）
  stress: number;    // ストレス（高いほど悪い）
};

export const GORILLA_ACTIONS: { key: GorillaAction; label: string }[] = [
  { key: 'banana', label: 'バナナを1本渡す' },
  { key: 'water', label: '水を渡す' },
  { key: 'meal', label: 'バランスのよい食事を提案' },
  { key: 'walk', label: '少し歩く' },
  { key: 'rest', label: '休ませる' },
  { key: 'listen', label: '話を聞く' },
  { key: 'delegate', label: '役割を任せる' },
  { key: 'checkup', label: '健康チェックを勧める' }
];

// ゴリラ部下：身長188cm・体重140kg。営業力は高いが体調を崩しやすい。
// 「状態を見ずに同じ対応を続けるマネジメント」を失敗として表現する。
export class Gorilla {
  sprite: Phaser.GameObjects.Image;
  params: GorillaParams = { energy: 45, condition: 42, trust: 55, hunger: 78, stress: 70 };
  recentSweets = true; // 直前に甘い物を食べている
  bananaStreak = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.image(x, y, 'gorilla_tired').setDepth(DEPTH.entity);
    scene.tweens.add({ targets: this.sprite, y: y - 5, duration: 1100, yoyo: true, repeat: -1 });
  }

  refreshPose() {
    const c = this.params.condition;
    if (c < 30) this.sprite.setTexture('gorilla_sit');
    else if (c < 55) this.sprite.setTexture('gorilla_tired');
    else if (c >= 75 && this.params.stress < 40) this.sprite.setTexture('gorilla_happy');
    else this.sprite.setTexture('gorilla_idle');
    score.gorillaCondition = Math.round(c);
  }

  private clampAll() {
    const p = this.params;
    (Object.keys(p) as (keyof GorillaParams)[]).forEach((k) => {
      p[k] = Phaser.Math.Clamp(p[k], 0, 100);
    });
  }

  // 対応アクションを適用し、フィードバック文と良し悪しを返す。
  // バナナ連打は正解にならない：状態を見ない同じ対応はコンディションを悪化させる。
  apply(action: GorillaAction): { text: string; good: boolean } {
    const p = this.params;
    let text = '';
    let good = true;

    switch (action) {
      case 'banana': {
        this.bananaStreak++;
        p.hunger -= 18;
        if (this.recentSweets || this.bananaStreak >= 2 || p.condition < 50) {
          const dmg = 8 + this.bananaStreak * 4;
          p.condition -= dmg;
          p.stress += 4;
          gauges.add('team', -4);
          text = this.bananaStreak >= 2
            ? `バナナ${this.bananaStreak}連発…！ 血糖値が乱高下してCONDITIONが下がった（-${dmg}）`
            : `直前に甘い物を食べていた…糖分の追い打ちでCONDITION低下（-${dmg}）`;
          good = false;
        } else {
          p.condition += 2;
          text = '小腹が満たされた。ただし連発は禁物だ。';
        }
        break;
      }
      case 'water': {
        this.bananaStreak = 0;
        p.condition += 8;
        p.stress -= 5;
        text = 'ゴクゴク…水分補給でひと息ついた。';
        break;
      }
      case 'meal': {
        this.bananaStreak = 0;
        this.recentSweets = false;
        p.hunger -= 40;
        p.condition += 12;
        gauges.add('team', 4);
        text = '野菜と魚の定食！ 体に力が戻ってきた。';
        break;
      }
      case 'walk': {
        p.stress -= 14;
        p.condition += 5;
        p.energy -= 4;
        text = '外の空気で気分転換。ストレスが軽くなった。';
        break;
      }
      case 'rest': {
        this.bananaStreak = 0;
        p.energy += 22;
        p.stress -= 10;
        p.condition += 6;
        gauges.add('team', 3);
        text = '15分の仮眠。ENERGYが回復した。';
        break;
      }
      case 'listen': {
        p.trust += 14;
        p.stress -= 12;
        gauges.add('trust', 4);
        text = '「ウホ…実は案件が多すぎて…」話すだけで少し楽になったようだ。';
        break;
      }
      case 'delegate': {
        if (p.condition < 40 || p.energy < 30) {
          p.condition -= 8;
          p.stress += 8;
          gauges.add('team', -5);
          text = '今のゴリラに任せるのは酷だった…まず回復が先だ。';
          good = false;
        } else {
          p.energy -= 10;
          p.trust += 10;
          gauges.add('capacity', 8);
          gauges.add('trust', 3);
          text = '「ウホ！任せろ！」得意な商談を任せた。自分の余力も戻った。';
        }
        break;
      }
      case 'checkup': {
        p.trust += 6;
        p.condition += 4;
        gauges.add('trust', 2);
        text = '数値を一緒に確認。無理のないペース配分を約束した。';
        break;
      }
    }

    this.clampAll();
    this.refreshPose();
    return { text, good };
  }
}
