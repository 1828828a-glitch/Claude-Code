import Phaser from 'phaser';

// public/assets のポーズシートが読み込まれている場合、
// 各ポーズを「静止画」として切り出し、生成グラフィックと同じテクスチャキーに登録する。
// （仕様どおり、シートを無理に歩行アニメーションとして自動分割はしない）
// シートが無い場合は何もせず、TextureFactory の生成グラフィックが使われる。

type SheetSpec = { cols: number; rows: number; targetH: number };

function carve(
  scene: Phaser.Scene,
  sheetKey: string,
  spec: SheetSpec,
  mapping: Record<string, [number, number]>
) {
  if (!scene.textures.exists(sheetKey)) return;
  const src = scene.textures.get(sheetKey).getSourceImage() as HTMLImageElement;
  if (!src || !src.width) return;
  const cw = src.width / spec.cols;
  const ch = src.height / spec.rows;
  const scale = spec.targetH / ch;
  const tw = Math.max(1, Math.round(cw * scale));
  const th = Math.max(1, Math.round(spec.targetH));

  Object.entries(mapping).forEach(([key, [col, row]]) => {
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, tw, th);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, col * cw, row * ch, cw, ch, 0, 0, tw, th);
    canvas.refresh();
  });
}

export function applySheetTextures(scene: Phaser.Scene) {
  // 主人公：待機、歩行、受容、食事 / HOLD、提案、過負荷、成功（4列×2行）
  carve(scene, 'hero_pose_sheet', { cols: 4, rows: 2, targetH: 176 }, {
    hero_idle: [0, 0],
    hero_eat: [3, 0],
    hero_hold: [0, 1],
    hero_propose: [1, 1],
    hero_overload: [2, 1],
    hero_success: [3, 1]
  });

  // ゴリラ：営業、空腹、疲労、警告、水分 / 食事、休憩、歩行、成功（5列×2行）
  carve(scene, 'gorilla_state_sheet', { cols: 5, rows: 2, targetH: 180 }, {
    gorilla_idle: [0, 0],
    gorilla_tired: [3, 0],
    gorilla_sit: [2, 1],
    gorilla_happy: [4, 1]
  });

  // AIロボット：待機、スキャン、翻訳、整理 / 計算、エラー、確認、成功（4列×2行）
  carve(scene, 'robot_action_sheet', { cols: 4, rows: 2, targetH: 136 }, {
    robot_idle: [0, 0],
    robot_work: [1, 0],
    robot_error: [1, 1],
    robot_happy: [3, 1]
  });

  // アイテム（6列×4行）— 意味が対応するセルのみ採用し、残りは生成アイコンを使用
  carve(scene, 'item_asset_sheet', { cols: 6, rows: 4, targetH: 52 }, {
    icon_ramen: [0, 0],
    icon_meat: [1, 0],
    icon_chips: [2, 0],
    icon_banana: [3, 0],
    icon_water: [4, 0],
    icon_bento: [5, 0],
    icon_doc: [0, 1],   // 郵便物 → 営業案件・書類
    icon_idea: [1, 1],  // ひらめきノート → BETTER PLANカード
    icon_phone: [2, 1],
    icon_shift: [3, 1], // カレンダー → シフト作成
    icon_note: [4, 1],  // ハートの連絡ノート → 手書き連絡帳
    icon_photo: [5, 1],
    icon_lang: [2, 2],  // ABC → 多言語のお知らせ
    icon_clock: [4, 2],
    icon_child: [5, 2], // 子どもたちのテーブル → 子どもとの対話
    icon_heart: [0, 3],
    icon_parent: [3, 3] // 握手 → 保護者対応
  });
}
