import Phaser from 'phaser';
import { W, H } from '../config/constants';
import type { ItemKind } from '../content/types';

// public/assets のPNGが無い環境でも動くように、
// キャラクター・アイテム・背景をすべてコードで生成する。
// ASSET_MANIFEST の固定条件（主人公＝紺スーツ＋金ベルト、
// ゴリラ＝濃茶＋白襟＋紺ネクタイ＋社員証、ロボット＝クリーム×ミント＋黒フェイス）を守る。

const C = {
  suit: 0x24357a,
  suitDark: 0x1a2757,
  shirt: 0xf7f3e8,
  skin: 0xf0c592,
  hair: 0x17181f,
  gold: 0xe8b923,
  goldDark: 0xb8890f,
  shoe: 0x3a3f4a,
  fur: 0x3e2c22,
  furLight: 0x5a4334,
  gface: 0x8d7362,
  tie: 0x1d3a8f,
  badge: 0xf2f2f2,
  cream: 0xf4efe1,
  mint: 0x9fd8c0,
  mintDark: 0x63b394,
  face: 0x12161c,
  eye: 0x58e6c8,
  outline: 0x101018
};

let seed = 7;
function rnd(): number {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function g(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

function smile(gr: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color = C.outline, w = 2.5) {
  gr.lineStyle(w, color, 1);
  gr.beginPath();
  gr.arc(x, y, r, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155));
  gr.strokePath();
}

// ---------------- HERO ----------------
type HeroPose = 'idle' | 'hold' | 'propose' | 'overload' | 'success' | 'eat';

function drawHero(scene: Phaser.Scene, key: string, pose: HeroPose) {
  if (scene.textures.exists(key)) return;
  const gr = g(scene);
  const cx = 70;
  const wide = pose === 'overload' ? 14 : 0;

  // 脚
  gr.fillStyle(C.suitDark);
  gr.fillRect(cx - 26 - wide / 2, 120, 20 + wide / 2, 44);
  gr.fillRect(cx + 6, 120, 20 + wide / 2, 44);
  gr.fillStyle(C.shoe);
  gr.fillRect(cx - 30 - wide / 2, 158, 26 + wide / 2, 12);
  gr.fillRect(cx + 4, 158, 26 + wide / 2, 12);

  // 胴体（紺スーツ）
  gr.fillStyle(C.suit);
  gr.fillRoundedRect(cx - 42 - wide, 52, 84 + wide * 2, 76, 14);
  // 白シャツ
  gr.fillStyle(C.shirt);
  gr.fillTriangle(cx - 12, 56, cx + 12, 56, cx, 100);
  // 金ベルト
  gr.fillStyle(C.gold);
  gr.fillRect(cx - 40 - wide, 112, 80 + wide * 2, 14);
  gr.fillStyle(C.goldDark);
  gr.fillCircle(cx, 119, 9);
  gr.fillStyle(C.gold);
  gr.fillCircle(cx, 119, 6);

  // 腕（ポーズ差分）— 腕まくりで手首は肌色
  gr.fillStyle(C.suit);
  if (pose === 'hold') {
    gr.fillRect(cx - 62 - wide, 40, 18, 52);
    gr.fillRect(cx + 44 + wide, 40, 18, 52);
    gr.fillStyle(C.skin);
    gr.fillCircle(cx - 53 - wide, 36, 11);
    gr.fillCircle(cx + 53 + wide, 36, 11);
  } else if (pose === 'propose') {
    gr.fillRect(cx - 58, 62, 16, 48);
    gr.fillRect(cx + 42, 24, 16, 56);
    gr.fillStyle(C.skin);
    gr.fillCircle(cx - 50, 112, 10);
    gr.fillCircle(cx + 50, 20, 10);
    // 金色のアイデアカード
    gr.fillStyle(C.gold);
    gr.fillRoundedRect(cx + 38, -4, 26, 20, 4);
    gr.fillStyle(0xfff3b0);
    gr.fillCircle(cx + 51, 6, 5);
  } else if (pose === 'success') {
    gr.fillRect(cx - 66 - wide, 26, 17, 60);
    gr.fillRect(cx + 49 + wide, 26, 17, 60);
    gr.fillStyle(C.skin);
    gr.fillCircle(cx - 58 - wide, 22, 11);
    gr.fillCircle(cx + 58 + wide, 22, 11);
  } else if (pose === 'eat') {
    gr.fillRect(cx - 58, 62, 16, 44);
    gr.fillRect(cx + 30, 50, 34, 16);
    gr.fillStyle(C.skin);
    gr.fillCircle(cx - 50, 108, 10);
    gr.fillCircle(cx + 30, 52, 10);
  } else {
    gr.fillRect(cx - 58 - wide, 60, 16, 52);
    gr.fillRect(cx + 42 + wide, 60, 16, 52);
    gr.fillStyle(C.skin);
    gr.fillCircle(cx - 50 - wide, 114, 10);
    gr.fillCircle(cx + 50 + wide, 114, 10);
  }

  // 頭
  gr.fillStyle(C.skin);
  gr.fillCircle(cx, 30, 24);
  gr.fillStyle(C.hair);
  gr.fillEllipse(cx, 14, 46, 22);
  gr.fillRect(cx - 23, 12, 8, 16);
  gr.fillRect(cx + 15, 12, 8, 16);

  // 表情
  gr.fillStyle(C.outline);
  if (pose === 'overload') {
    gr.fillRect(cx - 12, 28, 7, 3);
    gr.fillRect(cx + 5, 28, 7, 3);
    gr.fillEllipse(cx, 42, 10, 8);
    gr.fillStyle(0x8fd2ff);
    gr.fillCircle(cx + 26, 22, 4);
    gr.fillCircle(cx - 27, 30, 3);
  } else if (pose === 'success' || pose === 'propose') {
    gr.fillRect(cx - 12, 26, 7, 4);
    gr.fillRect(cx + 5, 26, 7, 4);
    smile(gr, cx, 34, 9);
  } else {
    gr.fillRect(cx - 12, 27, 6, 4);
    gr.fillRect(cx + 6, 27, 6, 4);
    smile(gr, cx, 34, 7);
  }

  gr.generateTexture(key, 140, 176);
  gr.destroy();
}

// ---------------- GORILLA ----------------
type GorillaPose = 'idle' | 'tired' | 'sit' | 'happy';

function drawGorilla(scene: Phaser.Scene, key: string, pose: GorillaPose) {
  if (scene.textures.exists(key)) return;
  const gr = g(scene);
  const cx = 95;
  const sit = pose === 'sit';
  const baseY = sit ? 30 : 0;

  // 脚
  if (!sit) {
    gr.fillStyle(C.fur);
    gr.fillRoundedRect(cx - 44, 128, 34, 42, 10);
    gr.fillRoundedRect(cx + 10, 128, 34, 42, 10);
    gr.fillStyle(C.gface);
    gr.fillEllipse(cx - 27, 168, 40, 14);
    gr.fillEllipse(cx + 27, 168, 40, 14);
  }

  // 胴体
  gr.fillStyle(C.fur);
  gr.fillRoundedRect(cx - 56, 46 + baseY, 112, 96 - (sit ? 8 : 0), 30);
  gr.fillStyle(C.furLight);
  gr.fillEllipse(cx, 100 + baseY, 70, 60);

  // 腕
  gr.fillStyle(C.fur);
  if (pose === 'happy') {
    gr.fillRoundedRect(cx - 84, 10 + baseY, 26, 80, 12);
    gr.fillRoundedRect(cx + 58, 10 + baseY, 26, 80, 12);
    gr.fillStyle(C.gface);
    gr.fillCircle(cx - 71, 8 + baseY, 13);
    gr.fillCircle(cx + 71, 8 + baseY, 13);
  } else {
    gr.fillRoundedRect(cx - 84, 56 + baseY, 26, 90 - baseY, 12);
    gr.fillRoundedRect(cx + 58, 56 + baseY, 26, 90 - baseY, 12);
    gr.fillStyle(C.gface);
    gr.fillCircle(cx - 71, 148, 13);
    gr.fillCircle(cx + 71, 148, 13);
  }

  if (sit) {
    // あぐらの脚
    gr.fillStyle(C.fur);
    gr.fillEllipse(cx, 150, 120, 40);
    gr.fillStyle(C.gface);
    gr.fillEllipse(cx - 34, 152, 34, 16);
    gr.fillEllipse(cx + 34, 152, 34, 16);
  }

  // 白襟＋紺ネクタイ＋社員証
  gr.fillStyle(0xffffff);
  gr.fillRect(cx - 26, 46 + baseY, 52, 10);
  gr.fillStyle(C.tie);
  gr.fillTriangle(cx - 8, 56 + baseY, cx + 8, 56 + baseY, cx, 108 + baseY);
  gr.lineStyle(3, 0x8fb2ff, 1);
  gr.lineBetween(cx - 4, 66 + baseY, cx + 6, 74 + baseY);
  gr.lineBetween(cx - 5, 80 + baseY, cx + 5, 88 + baseY);
  gr.fillStyle(C.badge);
  gr.fillRoundedRect(cx + 16, 66 + baseY, 24, 30, 3);
  gr.fillStyle(0x7a8699);
  gr.fillCircle(cx + 28, 76 + baseY, 5);
  gr.fillRect(cx + 20, 85 + baseY, 16, 3);

  // 頭
  gr.fillStyle(C.fur);
  gr.fillCircle(cx, 26 + baseY, 26);
  gr.fillCircle(cx - 24, 26 + baseY, 8);
  gr.fillCircle(cx + 24, 26 + baseY, 8);
  gr.fillStyle(C.gface);
  gr.fillEllipse(cx, 34 + baseY, 34, 24);

  // 表情
  gr.fillStyle(C.outline);
  if (pose === 'tired' || sit) {
    gr.fillRect(cx - 12, 22 + baseY, 8, 3);
    gr.fillRect(cx + 4, 22 + baseY, 8, 3);
    gr.fillEllipse(cx, 38 + baseY, 8, 5);
    gr.fillStyle(0x8fd2ff);
    gr.fillCircle(cx + 28, 14 + baseY, 4);
    gr.fillCircle(cx - 30, 20 + baseY, 3);
  } else if (pose === 'happy') {
    gr.fillRect(cx - 12, 21 + baseY, 8, 4);
    gr.fillRect(cx + 4, 21 + baseY, 8, 4);
    smile(gr, cx, 34 + baseY, 8);
  } else {
    gr.fillRect(cx - 12, 22 + baseY, 7, 4);
    gr.fillRect(cx + 5, 22 + baseY, 7, 4);
    gr.fillEllipse(cx, 39 + baseY, 10, 4);
  }

  gr.generateTexture(key, 190, 180);
  gr.destroy();
}

// ---------------- ROBOT ----------------
type RobotPose = 'idle' | 'work' | 'error' | 'happy';

function drawRobot(scene: Phaser.Scene, key: string, pose: RobotPose) {
  if (scene.textures.exists(key)) return;
  const gr = g(scene);
  const cx = 55;

  // 脚
  gr.fillStyle(C.mint);
  gr.fillRoundedRect(cx - 22, 112, 16, 20, 5);
  gr.fillRoundedRect(cx + 6, 112, 16, 20, 5);

  // 胴体（クリーム）
  gr.fillStyle(C.cream);
  gr.fillRoundedRect(cx - 30, 58, 60, 58, 14);
  // ミントの保育エプロン
  gr.fillStyle(C.mint);
  gr.fillTriangle(cx - 28, 74, cx + 28, 74, cx + 22, 116);
  gr.fillTriangle(cx - 28, 74, cx - 22, 116, cx + 22, 116);
  gr.fillStyle(C.mintDark);
  gr.fillRoundedRect(cx - 12, 92, 24, 16, 4);
  // 胸部タブレット
  gr.fillStyle(C.face);
  gr.fillRoundedRect(cx - 14, 64, 28, 22, 4);
  gr.fillStyle(C.eye);
  if (pose === 'error') {
    gr.fillTriangle(cx, 68, cx - 6, 80, cx + 6, 80);
  } else {
    gr.fillRect(cx - 8, 70, 6, 10);
    gr.fillRect(cx + 2, 72, 6, 8);
  }

  // 腕
  gr.fillStyle(C.cream);
  if (pose === 'work') {
    gr.fillRoundedRect(cx - 46, 60, 14, 34, 6);
    gr.fillRoundedRect(cx + 32, 44, 14, 40, 6);
    gr.fillStyle(C.mint);
    gr.fillCircle(cx + 39, 40, 8);
    gr.fillCircle(cx - 39, 96, 8);
  } else if (pose === 'happy') {
    gr.fillRoundedRect(cx - 46, 40, 14, 40, 6);
    gr.fillRoundedRect(cx + 32, 40, 14, 40, 6);
    gr.fillStyle(C.mint);
    gr.fillCircle(cx - 39, 36, 8);
    gr.fillCircle(cx + 39, 36, 8);
  } else {
    gr.fillRoundedRect(cx - 46, 66, 14, 38, 6);
    gr.fillRoundedRect(cx + 32, 66, 14, 38, 6);
    gr.fillStyle(C.mint);
    gr.fillCircle(cx - 39, 106, 8);
    gr.fillCircle(cx + 39, 106, 8);
  }

  // 頭（黒いフェイス画面）
  gr.fillStyle(C.cream);
  gr.fillRoundedRect(cx - 26, 8, 52, 46, 18);
  gr.fillStyle(C.face);
  gr.fillRoundedRect(cx - 20, 14, 40, 34, 12);
  gr.fillStyle(C.eye);
  if (pose === 'error') {
    gr.fillRect(cx - 13, 24, 8, 3);
    gr.fillRect(cx + 5, 24, 8, 3);
    gr.lineStyle(2.5, C.eye, 1);
    gr.beginPath();
    gr.arc(cx, 42, 6, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    gr.strokePath();
  } else {
    gr.fillEllipse(cx - 9, 28, 8, 10);
    gr.fillEllipse(cx + 9, 28, 8, 10);
    smile(gr, cx, 34, 6, C.eye, 2.5);
  }
  // アンテナ
  gr.lineStyle(3, C.mintDark, 1);
  gr.lineBetween(cx, 8, cx, 0);
  gr.fillStyle(C.mint);
  gr.fillCircle(cx, 0, 5);
  // 耳
  gr.fillStyle(C.mint);
  gr.fillCircle(cx - 27, 30, 7);
  gr.fillCircle(cx + 27, 30, 7);

  gr.generateTexture(key, 110, 136);
  gr.destroy();
}

// ---------------- 脇役 ----------------
function drawBoss(scene: Phaser.Scene) {
  if (scene.textures.exists('boss')) return;
  const gr = g(scene);
  const cx = 55;
  gr.fillStyle(0x3d3d46);
  gr.fillRect(cx - 20, 96, 15, 40);
  gr.fillRect(cx + 5, 96, 15, 40);
  gr.fillStyle(0x2b2b33);
  gr.fillRect(cx - 24, 132, 20, 9);
  gr.fillRect(cx + 4, 132, 20, 9);
  gr.fillStyle(0x4a4a55);
  gr.fillRoundedRect(cx - 32, 44, 64, 58, 10);
  gr.fillStyle(0xf7f3e8);
  gr.fillTriangle(cx - 9, 47, cx + 9, 47, cx, 76);
  gr.fillStyle(0x9c2f2f);
  gr.fillTriangle(cx - 4, 48, cx + 4, 48, cx, 78);
  gr.fillStyle(0x4a4a55);
  gr.fillRect(cx - 46, 40, 14, 40); // 右腕を上げて指令
  gr.fillRect(cx + 32, 52, 14, 42);
  gr.fillStyle(C.skin);
  gr.fillCircle(cx - 39, 36, 8);
  gr.fillCircle(cx + 39, 98, 8);
  gr.fillCircle(cx, 24, 19);
  gr.fillStyle(0xd8d8dc);
  gr.fillEllipse(cx, 10, 34, 14);
  gr.fillStyle(C.outline);
  gr.fillRect(cx - 10, 20, 6, 4);
  gr.fillRect(cx + 4, 20, 6, 4);
  smile(gr, cx, 27, 6);
  gr.fillStyle(0xb9b9bf);
  gr.fillRect(cx - 12, 32, 24, 3); // ひげ
  gr.generateTexture('boss', 110, 145);
  gr.destroy();
}

function drawStaff(scene: Phaser.Scene) {
  if (scene.textures.exists('staff')) return;
  const gr = g(scene);
  const cx = 45;
  gr.fillStyle(0x6b7c99);
  gr.fillRect(cx - 15, 84, 12, 32);
  gr.fillRect(cx + 3, 84, 12, 32);
  gr.fillStyle(0xf5b5c4);
  gr.fillRoundedRect(cx - 24, 38, 48, 50, 10);
  gr.fillStyle(0xffffff);
  gr.fillRoundedRect(cx - 12, 52, 24, 22, 5);
  gr.fillStyle(0x9b6a4f);
  gr.fillCircle(cx, 20, 15);
  gr.fillStyle(0x513528);
  gr.fillEllipse(cx, 10, 26, 12);
  gr.fillCircle(cx + 12, 8, 7);
  gr.fillStyle(C.outline);
  gr.fillRect(cx - 8, 17, 4, 3);
  gr.fillRect(cx + 4, 17, 4, 3);
  smile(gr, cx, 22, 5);
  gr.fillStyle(0xf5b5c4);
  gr.fillRect(cx - 32, 44, 10, 30);
  gr.fillRect(cx + 22, 44, 10, 30);
  gr.generateTexture('staff', 90, 120);
  gr.destroy();
}

function drawChild(scene: Phaser.Scene, key: string, shirt: number) {
  if (scene.textures.exists(key)) return;
  const gr = g(scene);
  const cx = 30;
  gr.fillStyle(0x5b6ea6);
  gr.fillRect(cx - 10, 52, 8, 18);
  gr.fillRect(cx + 2, 52, 8, 18);
  gr.fillStyle(shirt);
  gr.fillRoundedRect(cx - 15, 28, 30, 28, 7);
  gr.fillRect(cx - 21, 32, 8, 18);
  gr.fillRect(cx + 13, 32, 8, 18);
  gr.fillStyle(C.skin);
  gr.fillCircle(cx, 16, 12);
  gr.fillStyle(0x2e2320);
  gr.fillEllipse(cx, 8, 20, 9);
  gr.fillStyle(C.outline);
  gr.fillRect(cx - 6, 14, 3, 3);
  gr.fillRect(cx + 3, 14, 3, 3);
  smile(gr, cx, 18, 4, C.outline, 2);
  gr.generateTexture(key, 60, 72);
  gr.destroy();
}

// ---------------- アイテムアイコン ----------------
function drawIcon(scene: Phaser.Scene, kind: ItemKind) {
  const key = `icon_${kind}`;
  if (scene.textures.exists(key)) return;
  const gr = g(scene);
  const c = 26;

  switch (kind) {
    case 'ramen':
      gr.fillStyle(0xf2ece0);
      gr.fillEllipse(c, 30, 44, 26);
      gr.fillStyle(0x2b4a9b);
      gr.fillEllipse(c, 34, 44, 16);
      gr.fillStyle(0xf5d67a);
      gr.fillEllipse(c, 26, 34, 12);
      gr.fillStyle(0xd97c4a);
      gr.fillCircle(c - 8, 24, 5);
      gr.fillCircle(c + 8, 24, 5);
      gr.fillStyle(0x3f7d47);
      gr.fillRect(c - 2, 18, 4, 6);
      break;
    case 'meat':
      gr.fillStyle(0x333840);
      gr.fillEllipse(c, 30, 46, 24);
      gr.lineStyle(2, 0x555c66, 1);
      gr.lineBetween(6, 30, 46, 30);
      gr.lineBetween(10, 24, 42, 24);
      gr.lineBetween(10, 36, 42, 36);
      gr.fillStyle(0xc2453e);
      gr.fillRoundedRect(10, 18, 15, 11, 3);
      gr.fillRoundedRect(28, 22, 15, 11, 3);
      gr.fillStyle(0xe8a29e);
      gr.fillRect(12, 22, 11, 3);
      break;
    case 'chips':
      gr.fillStyle(0xd8452e);
      gr.fillRoundedRect(10, 8, 32, 38, 5);
      gr.fillStyle(0xf2b035);
      gr.fillEllipse(c, 26, 20, 14);
      gr.fillStyle(0xd8452e);
      gr.fillRect(10, 8, 32, 6);
      gr.fillRect(10, 40, 32, 6);
      break;
    case 'banana':
      gr.fillStyle(0xf2cf3a);
      gr.beginPath();
      gr.arc(c, 18, 18, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
      gr.strokePath();
      gr.fillEllipse(c, 32, 36, 13);
      gr.fillStyle(0xc9a52c);
      gr.fillRect(40, 24, 6, 6);
      gr.fillStyle(0x6b5a1e);
      gr.fillRect(6, 26, 5, 5);
      break;
    case 'water':
      gr.fillStyle(0xbfe3f7);
      gr.fillRoundedRect(16, 12, 20, 34, 6);
      gr.fillStyle(0x7cc4ec);
      gr.fillRoundedRect(18, 26, 16, 18, 5);
      gr.fillStyle(0x3a8fc4);
      gr.fillRect(19, 5, 14, 8);
      break;
    case 'bento':
      gr.fillStyle(0xc8996a);
      gr.fillRoundedRect(4, 14, 44, 28, 5);
      gr.fillStyle(0xffffff);
      gr.fillRect(8, 18, 16, 20);
      gr.fillStyle(0xe0704a);
      gr.fillRect(27, 18, 8, 9);
      gr.fillStyle(0x4f8f4f);
      gr.fillRect(37, 18, 8, 9);
      gr.fillStyle(0xf2c230);
      gr.fillRect(27, 29, 18, 9);
      break;
    case 'note':
      gr.fillStyle(0xf5f0e3);
      gr.fillRoundedRect(8, 8, 36, 38, 4);
      gr.fillStyle(0xd06a7e);
      gr.fillRect(8, 8, 36, 8);
      gr.lineStyle(2, 0x9aa1ad, 1);
      gr.lineBetween(13, 24, 39, 24);
      gr.lineBetween(13, 31, 39, 31);
      gr.lineBetween(13, 38, 33, 38);
      break;
    case 'phone':
      gr.fillStyle(0xf2ede0);
      gr.fillRoundedRect(10, 8, 14, 36, 6);
      gr.fillRoundedRect(24, 10, 18, 12, 6);
      gr.fillRoundedRect(24, 32, 18, 12, 6);
      gr.lineStyle(3, 0xcfc7b2, 1);
      gr.beginPath();
      gr.arc(30, 27, 10, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60));
      gr.strokePath();
      break;
    case 'photo':
      gr.fillStyle(0xffffff);
      gr.fillRect(6, 10, 34, 30);
      gr.fillStyle(0x7cc4ec);
      gr.fillRect(9, 13, 28, 18);
      gr.fillStyle(0x4f8f4f);
      gr.fillTriangle(9, 31, 20, 20, 31, 31);
      gr.fillStyle(0xf2c230);
      gr.fillCircle(31, 17, 3);
      gr.fillStyle(0xf0f0f0);
      gr.fillRect(12, 16, 34, 30);
      gr.fillStyle(0xd9a0a8);
      gr.fillRect(15, 19, 28, 18);
      break;
    case 'shift':
      gr.fillStyle(0xffffff);
      gr.fillRoundedRect(6, 8, 40, 38, 4);
      gr.fillStyle(0xd06a5a);
      gr.fillRect(6, 8, 40, 9);
      gr.lineStyle(2, 0xb9c0cc, 1);
      for (let i = 0; i < 3; i++) {
        gr.lineBetween(6, 24 + i * 8, 46, 24 + i * 8);
        gr.lineBetween(15 + i * 10, 17, 15 + i * 10, 46);
      }
      break;
    case 'lang':
      gr.fillStyle(0x5b8dd9);
      gr.fillCircle(c, 26, 18);
      gr.lineStyle(2, 0xd7e6ff, 1);
      gr.strokeCircle(c, 26, 18);
      gr.strokeEllipse(c, 26, 18, 36);
      gr.lineBetween(8, 26, 44, 26);
      gr.fillStyle(0xffffff);
      gr.fillRect(30, 8, 16, 12);
      break;
    case 'parent':
      gr.fillStyle(0xf2ede0);
      gr.fillRoundedRect(6, 12, 40, 26, 8);
      gr.fillTriangle(14, 36, 26, 36, 16, 46);
      gr.fillStyle(0xe0604a);
      gr.fillCircle(20, 25, 6);
      gr.fillCircle(30, 25, 6);
      gr.fillTriangle(15, 27, 35, 27, 25, 37);
      break;
    case 'child':
      gr.fillStyle(C.skin);
      gr.fillCircle(c, 20, 12);
      gr.fillStyle(0x2e2320);
      gr.fillEllipse(c, 12, 20, 8);
      gr.fillStyle(0xf2c230);
      gr.fillRoundedRect(14, 32, 24, 14, 5);
      gr.fillStyle(C.outline);
      gr.fillRect(20, 18, 3, 3);
      gr.fillRect(29, 18, 3, 3);
      smile(gr, c, 22, 4, C.outline, 2);
      break;
    case 'doc':
      gr.fillStyle(0x8a6b4f);
      gr.fillRoundedRect(6, 14, 40, 30, 4);
      gr.fillStyle(0xf5f0e3);
      gr.fillRect(10, 8, 24, 20);
      gr.lineStyle(2, 0x9aa1ad, 1);
      gr.lineBetween(14, 14, 30, 14);
      gr.lineBetween(14, 20, 30, 20);
      gr.fillStyle(0xc9a227);
      gr.fillRect(6, 26, 40, 4);
      break;
    case 'idea':
      gr.fillStyle(0xf0c93c);
      gr.fillRoundedRect(8, 6, 36, 42, 6);
      gr.fillStyle(0xfff3b0);
      gr.fillCircle(c, 22, 9);
      gr.fillRect(22, 32, 8, 8);
      gr.lineStyle(2, 0xb8890f, 1);
      gr.strokeRoundedRect(8, 6, 36, 42, 6);
      break;
    case 'heart':
      gr.fillStyle(0xe0604a);
      gr.fillCircle(18, 20, 10);
      gr.fillCircle(34, 20, 10);
      gr.fillTriangle(9, 26, 43, 26, 26, 44);
      break;
    case 'clock':
      gr.fillStyle(0x4a6fd0);
      gr.fillCircle(c, 26, 20);
      gr.fillStyle(0xf5f0e3);
      gr.fillCircle(c, 26, 16);
      gr.lineStyle(3, 0x333a44, 1);
      gr.lineBetween(c, 26, c, 15);
      gr.lineBetween(c, 26, 34, 30);
      break;
    case 'giant':
      gr.fillStyle(0x9c2f2f);
      gr.fillRoundedRect(2, 2, 48, 48, 8);
      gr.fillStyle(0xffe08a);
      gr.fillTriangle(26, 10, 12, 34, 40, 34);
      gr.fillStyle(0x9c2f2f);
      gr.fillRect(24, 18, 5, 10);
      gr.fillRect(24, 31, 5, 4);
      break;
  }
  gr.generateTexture(key, 52, 52);
  gr.destroy();
}

// ---------------- エフェクト ----------------
function drawFx(scene: Phaser.Scene) {
  if (!scene.textures.exists('fx_ring')) {
    const gr = g(scene);
    gr.lineStyle(10, 0xf2c230, 1);
    gr.strokeCircle(128, 128, 110);
    gr.lineStyle(4, 0xfff3b0, 1);
    gr.strokeCircle(128, 128, 120);
    gr.generateTexture('fx_ring', 256, 256);
    gr.destroy();
  }
  if (!scene.textures.exists('fx_spark')) {
    const gr = g(scene);
    gr.fillStyle(0xffe98a);
    gr.fillTriangle(12, 0, 9, 9, 15, 9);
    gr.fillTriangle(12, 24, 9, 15, 15, 15);
    gr.fillTriangle(0, 12, 9, 9, 9, 15);
    gr.fillTriangle(24, 12, 15, 9, 15, 15);
    gr.fillStyle(0xffffff);
    gr.fillCircle(12, 12, 3);
    gr.generateTexture('fx_spark', 24, 24);
    gr.destroy();
  }
}

// ---------------- 背景 ----------------
type BgKey = 'bg_town' | 'bg_office' | 'bg_nursery' | 'bg_lab' | 'bg_dark';

function drawBg(scene: Phaser.Scene, key: BgKey) {
  if (scene.textures.exists(key)) return;
  const gr = g(scene);
  seed = key.length * 131 + 17;

  const night = key === 'bg_town' || key === 'bg_dark';
  const grey = key === 'bg_dark';

  // 空
  if (key === 'bg_town') {
    gr.fillGradientStyle(0x101a3e, 0x101a3e, 0x2a3a6e, 0x2a3a6e, 1);
  } else if (key === 'bg_dark') {
    gr.fillGradientStyle(0x1c1c22, 0x1c1c22, 0x33333a, 0x33333a, 1);
  } else if (key === 'bg_office') {
    gr.fillGradientStyle(0x39466e, 0x39466e, 0x5a6b96, 0x5a6b96, 1);
  } else if (key === 'bg_nursery') {
    gr.fillGradientStyle(0x8fc9ea, 0x8fc9ea, 0xcfe9f5, 0xcfe9f5, 1);
  } else {
    gr.fillGradientStyle(0x2e4a44, 0x2e4a44, 0x3c5f57, 0x3c5f57, 1);
  }
  gr.fillRect(0, 0, W, H);

  if (night && !grey) {
    gr.fillStyle(0xfff3b0, 0.9);
    for (let i = 0; i < 40; i++) gr.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 260), 3, 3);
  }

  if (key === 'bg_town' || key === 'bg_dark') {
    // 遠景ビル群
    const base = grey ? 0x2a2a30 : 0x18234e;
    const winCol = grey ? 0x3d3d44 : 0xf5d67a;
    for (let i = 0; i < 14; i++) {
      const bw = 70 + rnd() * 90;
      const bh = 140 + rnd() * 220;
      const bx = i * 95 - 20;
      gr.fillStyle(base, 1);
      gr.fillRect(bx, 560 - bh, bw, bh);
      gr.fillStyle(winCol, grey ? 0.5 : 0.85);
      for (let wy = 570 - bh; wy < 530; wy += 26) {
        for (let wx = bx + 10; wx < bx + bw - 14; wx += 22) {
          if (rnd() > 0.35) gr.fillRect(wx, wy, 10, 12);
        }
      }
    }
    // 飲食店街（左）
    gr.fillStyle(grey ? 0x333338 : 0x5a3a2e);
    gr.fillRect(0, 430, 300, 130);
    gr.fillStyle(grey ? 0x3d3d42 : 0x7a4a38);
    gr.fillRect(0, 418, 300, 18);
    gr.fillStyle(grey ? 0x4a4a50 : 0xd8452e);
    gr.fillCircle(60, 452, 12);
    gr.fillCircle(150, 452, 12);
    gr.fillCircle(240, 452, 12);
    gr.fillStyle(grey ? 0x515158 : 0xf5d67a, 0.9);
    gr.fillRect(30, 480, 60, 60);
    gr.fillRect(130, 480, 60, 60);
    gr.fillRect(230, 480, 50, 60);
    // 保育園（中央右・ピンク）
    gr.fillStyle(grey ? 0x3a3a40 : 0xe8a7b8);
    gr.fillRect(760, 420, 260, 140);
    gr.fillStyle(grey ? 0x44444a : 0xc25a74);
    gr.fillTriangle(750, 424, 1030, 424, 890, 370);
    gr.fillStyle(grey ? 0x55555c : 0xffffff);
    gr.fillCircle(890, 410, 22);
    gr.fillStyle(grey ? 0x2e2e33 : 0x6b4a3a);
    gr.fillCircle(890, 410, 18);
    gr.fillStyle(grey ? 0x515158 : 0xfff3b0, 0.95);
    gr.fillRect(790, 460, 44, 44);
    gr.fillRect(870, 460, 44, 44);
    gr.fillRect(950, 460, 44, 44);
    // 家庭（右）
    gr.fillStyle(grey ? 0x38383e : 0xc8996a);
    gr.fillRect(1080, 450, 150, 110);
    gr.fillStyle(grey ? 0x44444a : 0x9c5a3a);
    gr.fillTriangle(1070, 452, 1240, 452, 1155, 400);
    gr.fillStyle(grey ? 0x515158 : 0xfff3b0, 0.95);
    gr.fillRect(1110, 480, 36, 36);
    gr.fillRect(1170, 480, 36, 36);
    // 会社ビル（中央・ガラス）
    gr.fillStyle(grey ? 0x3d3d44 : 0x3a5a8f);
    gr.fillRect(430, 300, 280, 260);
    gr.fillStyle(grey ? 0x4a4a52 : 0x9fd0f0, grey ? 0.4 : 0.8);
    for (let fy = 0; fy < 4; fy++) {
      for (let fx = 0; fx < 5; fx++) {
        gr.fillRect(445 + fx * 52, 314 + fy * 62, 42, 48);
      }
    }
    // 道
    gr.fillStyle(grey ? 0x26262b : 0x40465a);
    gr.fillRect(0, 560, W, 160);
    gr.fillStyle(grey ? 0x303036 : 0x565e78);
    gr.fillRect(0, 560, W, 10);
  }

  if (key === 'bg_office') {
    gr.fillStyle(0x2c3554);
    gr.fillRect(0, 520, W, 200);
    gr.fillStyle(0x232a45);
    gr.fillRect(0, 520, W, 12);
    // 窓と夜景
    gr.fillStyle(0x141c3a);
    gr.fillRect(80, 90, 480, 300);
    gr.fillRect(720, 90, 480, 300);
    gr.fillStyle(0xf5d67a, 0.7);
    for (let i = 0; i < 60; i++) {
      const wx = 90 + rnd() * 1090;
      if (wx > 545 && wx < 730) continue;
      gr.fillRect(wx, 140 + rnd() * 220, 6, 8);
    }
    gr.lineStyle(10, 0x4a5578, 1);
    gr.strokeRect(80, 90, 480, 300);
    gr.strokeRect(720, 90, 480, 300);
    // デスク
    gr.fillStyle(0x5a4633);
    gr.fillRect(60, 470, 300, 18);
    gr.fillRect(920, 470, 300, 18);
    gr.fillStyle(0x4a3a2b);
    gr.fillRect(80, 488, 20, 60);
    gr.fillRect(320, 488, 20, 60);
    gr.fillRect(940, 488, 20, 60);
    gr.fillRect(1180, 488, 20, 60);
    // 書類の山
    gr.fillStyle(0xf0ead8);
    for (let i = 0; i < 6; i++) gr.fillRect(950 + i * 4, 430 - i * 7, 90, 8);
  }

  if (key === 'bg_nursery') {
    // 太陽
    gr.fillStyle(0xffe08a);
    gr.fillCircle(1150, 100, 46);
    // 室内壁
    gr.fillStyle(0xf7ead5);
    gr.fillRect(0, 260, W, 320);
    gr.fillStyle(0xe8a7b8);
    gr.fillRect(0, 250, W, 16);
    // 床
    gr.fillStyle(0xe0c090);
    gr.fillRect(0, 560, W, 160);
    gr.fillStyle(0xd0af7c);
    for (let i = 0; i < 13; i++) gr.fillRect(i * 100, 560, 3, 160);
    // 窓
    gr.fillStyle(0x9fd8ef);
    gr.fillRoundedRect(90, 300, 180, 140, 10);
    gr.fillRoundedRect(1010, 300, 180, 140, 10);
    gr.lineStyle(8, 0xffffff, 1);
    gr.strokeRoundedRect(90, 300, 180, 140, 10);
    gr.strokeRoundedRect(1010, 300, 180, 140, 10);
    // おえかき掲示
    const colors = [0xe0604a, 0xf2c230, 0x59c795, 0x5b8dd9];
    for (let i = 0; i < 4; i++) {
      gr.fillStyle(0xffffff);
      gr.fillRect(420 + i * 120, 300, 90, 70);
      gr.fillStyle(colors[i]);
      gr.fillCircle(465 + i * 120, 330, 20);
    }
    // おもちゃ棚
    gr.fillStyle(0xc8996a);
    gr.fillRect(40, 480, 220, 80);
    gr.fillStyle(0xe0604a);
    gr.fillRect(60, 496, 30, 30);
    gr.fillStyle(0x5b8dd9);
    gr.fillRect(110, 496, 30, 30);
    gr.fillStyle(0x59c795);
    gr.fillRect(160, 496, 30, 30);
  }

  if (key === 'bg_lab') {
    gr.fillStyle(0x8a6b4f);
    gr.fillRect(0, 540, W, 180);
    // 黒板
    gr.fillStyle(0x2e5c4e);
    gr.fillRoundedRect(340, 110, 600, 300, 8);
    gr.lineStyle(12, 0xc8996a, 1);
    gr.strokeRoundedRect(340, 110, 600, 300, 8);
    gr.lineStyle(3, 0xf0ead8, 0.9);
    gr.lineBetween(390, 180, 500, 180);
    gr.lineBetween(390, 230, 560, 230);
    gr.lineBetween(390, 280, 520, 280);
    // ABC/123ポスター
    gr.fillStyle(0xfff3d6);
    gr.fillRect(120, 160, 140, 100);
    gr.fillRect(1030, 160, 140, 100);
    gr.fillStyle(0xe0604a);
    gr.fillRect(140, 185, 24, 40);
    gr.fillStyle(0x5b8dd9);
    gr.fillRect(178, 185, 24, 40);
    gr.fillStyle(0x59c795);
    gr.fillRect(216, 185, 24, 40);
    gr.fillStyle(0xf2c230);
    gr.fillCircle(1070, 205, 16);
    gr.fillStyle(0x5b8dd9);
    gr.fillCircle(1105, 205, 16);
    gr.fillStyle(0xe0604a);
    gr.fillCircle(1140, 205, 16);
    // 机
    gr.fillStyle(0xc8996a);
    for (let i = 0; i < 3; i++) {
      gr.fillRect(180 + i * 360, 470, 200, 14);
      gr.fillStyle(0xa87c50);
      gr.fillRect(196 + i * 360, 484, 14, 50);
      gr.fillRect(350 + i * 360, 484, 14, 50);
      gr.fillStyle(0xc8996a);
    }
  }

  gr.generateTexture(key, W, H);
  gr.destroy();
}

// ---------------- エントリポイント ----------------
export function buildTextures(scene: Phaser.Scene) {
  drawHero(scene, 'hero_idle', 'idle');
  drawHero(scene, 'hero_hold', 'hold');
  drawHero(scene, 'hero_propose', 'propose');
  drawHero(scene, 'hero_overload', 'overload');
  drawHero(scene, 'hero_success', 'success');
  drawHero(scene, 'hero_eat', 'eat');

  drawGorilla(scene, 'gorilla_idle', 'idle');
  drawGorilla(scene, 'gorilla_tired', 'tired');
  drawGorilla(scene, 'gorilla_sit', 'sit');
  drawGorilla(scene, 'gorilla_happy', 'happy');

  drawRobot(scene, 'robot_idle', 'idle');
  drawRobot(scene, 'robot_work', 'work');
  drawRobot(scene, 'robot_error', 'error');
  drawRobot(scene, 'robot_happy', 'happy');

  drawBoss(scene);
  drawStaff(scene);
  drawChild(scene, 'child_a', 0xe0604a);
  drawChild(scene, 'child_b', 0x59c795);
  drawChild(scene, 'child_c', 0x5b8dd9);

  const kinds: ItemKind[] = [
    'ramen', 'meat', 'chips', 'banana', 'water', 'bento',
    'note', 'phone', 'photo', 'shift', 'lang', 'parent', 'child',
    'doc', 'idea', 'heart', 'clock', 'giant'
  ];
  kinds.forEach((k) => drawIcon(scene, k));

  drawFx(scene);

  (['bg_town', 'bg_office', 'bg_nursery', 'bg_lab', 'bg_dark'] as BgKey[]).forEach((k) => drawBg(scene, k));
}
