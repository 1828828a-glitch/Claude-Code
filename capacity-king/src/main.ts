import Phaser from 'phaser';
import { H, W } from './config/constants';
import { gauges } from './systems/GaugeSystem';
import { score } from './systems/ScoreSystem';
import { BootScene } from './scenes/BootScene';
import { HowToScene, TitleScene } from './scenes/TitleScene';
import { TutorialScene } from './scenes/TutorialScene';
import { GorillaScene } from './scenes/GorillaScene';
import { NurseryScene } from './scenes/NurseryScene';
import { LearningScene } from './scenes/LearningScene';
import { FinalScene } from './scenes/FinalScene';
import { EndingScene } from './scenes/EndingScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: W,
  height: H,
  backgroundColor: '#06070f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    TitleScene,
    HowToScene,
    TutorialScene,
    GorillaScene,
    NurseryScene,
    LearningScene,
    FinalScene,
    EndingScene
  ]
});

// 通しプレイの自動テスト用フック（ゲームロジックには影響しない）
(window as unknown as Record<string, unknown>).__CK__ = { game, gauges, score };
