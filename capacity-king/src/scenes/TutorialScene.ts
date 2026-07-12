import { StageBase } from './StageBase';
import { DEPTH, W } from '../config/constants';
import { score } from '../systems/ScoreSystem';
import {
  SPEAKER, TUTORIAL_AFTER_EAT, TUTORIAL_CLEAR, TUTORIAL_FOODS,
  TUTORIAL_HOLD_HINT, TUTORIAL_INTRO, TUTORIAL_PLAN
} from '../content/stages';

// TUTORIAL：受け止めるだけでは守れない
export class TutorialScene extends StageBase {
  constructor() {
    super('Tutorial');
  }

  protected stageName() {
    return 'TUTORIAL / 受け止めるだけでは守れない';
  }
  protected bgKey() {
    return 'bg_office';
  }
  protected bgm() {
    return 'town' as const;
  }

  protected async script() {
    // 社長が右側から食べ物を投げてくる
    const boss = this.add.image(W - 140, 500, 'boss').setDepth(DEPTH.entity).setFlipX(true);
    this.tweens.add({ targets: boss, y: 494, duration: 900, yoyo: true, repeat: -1 });

    this.drainEnabled = false;
    await this.say(TUTORIAL_INTRO);
    this.drainEnabled = true;

    this.hud.setGuide('SPACE で飛んでくる料理を受け止めよう！（←→/WASD で移動）');
    await this.throwWave(TUTORIAL_FOODS, { gapMs: 2100, duration: 7000 });

    // 2周目：受け続けるとCAPACITYが減ることを体感させる
    await this.say(TUTORIAL_AFTER_EAT);
    const wavePromise = this.throwWave(
      [...TUTORIAL_FOODS].reverse(),
      { gapMs: 1500, duration: 7000 }
    );
    await this.wait(1200);
    await this.say(TUTORIAL_HOLD_HINT);
    const planPromise = this.requirePlan(TUTORIAL_PLAN);
    await Promise.all([wavePromise, planPromise]);

    score.happyPeople += 8;
    score.familyHours += 1;
    this.drainEnabled = false;
    await this.say(TUTORIAL_CLEAR);
    this.goto('Gorilla');
  }
}
