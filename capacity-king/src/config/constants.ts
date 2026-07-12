export const W = 1280;
export const H = 720;

export const FONT = '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans JP", sans-serif';

export const GAUGE_COLORS: Record<string, number> = {
  peace: 0xf2c230,
  capacity: 0x3e6df0,
  trust: 0xe0604a,
  team: 0x59c795
};

export const GAUGE_LABELS: Record<string, string> = {
  peace: 'WORLD PEACE',
  capacity: 'CAPACITY',
  trust: 'TRUST',
  team: 'TEAM'
};

// WORLD PEACE decay per second
export const DRAIN_FREE = 0.35;   // 通常時（何も決めずに放置）
export const DRAIN_HOLD = 0.9;    // HOLD中（止めて考えている間）

export const DEPTH = {
  bg: 0,
  deco: 5,
  entity: 10,
  item: 20,
  fx: 30,
  holdOverlay: 60,
  hud: 100,
  dialogue: 110,
  menu: 115,
  cards: 120,
  overlay: 130
};

export const HEALTH_NOTE =
  '※ 健康表現はゲーム演出です。体調に不安がある場合は医療機関へご相談ください。';
