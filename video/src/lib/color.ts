/**
 * 配色まわりの小さな判定。
 *
 * パレットを増やしたときに「明るい配色だと暗幕が濃すぎる」といった
 * 調整をパレット名で場合分けしないで済ませるために使う。
 */

/** #rrggbb の明るさを判定する（相対輝度のざっくり近似） */
export const isLight = (hex: string): boolean => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return false;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
};
