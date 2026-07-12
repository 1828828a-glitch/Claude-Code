import Phaser from 'phaser';
import type { GaugeKey } from '../content/types';

export type GaugeValues = Record<GaugeKey, number>;

// 4つの主要ゲージを一元管理するシングルトン。
// 'change' イベントで HUD が追従する。WORLD PEACE が 0 でゲームオーバー。
class GaugeSystem extends Phaser.Events.EventEmitter {
  values: GaugeValues = { peace: 55, capacity: 80, trust: 60, team: 70 };

  reset(v?: Partial<GaugeValues>) {
    this.values = { peace: 55, capacity: 80, trust: 60, team: 70, ...v };
    this.emit('change', this.values);
  }

  snapshot(): GaugeValues {
    return { ...this.values };
  }

  restore(s: GaugeValues) {
    this.values = { ...s };
    this.emit('change', this.values);
  }

  get(key: GaugeKey): number {
    return this.values[key];
  }

  set(key: GaugeKey, v: number) {
    this.values[key] = Phaser.Math.Clamp(v, 0, 100);
    this.emit('change', this.values);
  }

  add(key: GaugeKey, delta: number) {
    if (delta === 0) return;
    this.set(key, this.values[key] + delta);
    this.emit('delta', key, delta);
  }

  applyEffects(effects?: Partial<Record<GaugeKey, number>>) {
    if (!effects) return;
    (Object.keys(effects) as GaugeKey[]).forEach((k) => this.add(k, effects[k] ?? 0));
  }
}

export const gauges = new GaugeSystem();
