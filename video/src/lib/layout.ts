import { useVideoConfig } from "remotion";
import { maxLineWidthInEm } from "./text";
import { SAFE_AREA, type FormatName } from "../theme/tokens";

/**
 * 画面幅を基準にしたスケール係数。
 *
 * 設計値はすべて「横型 1920px のときの px」で書いている。
 * 縦型はスマホで指1本分の距離から見るため、単純に幅で割ると字が小さすぎる。
 * そこで縦型だけ基準幅を狭く取り、相対的に文字を大きくしている。
 */
export const useScale = (): number => {
  const { width, height } = useVideoConfig();
  const isVertical = height > width;
  return isVertical ? width / 820 : width / 1920;
};

/** 現在の解像度からフォーマット名を推定する */
export const useFormatName = (): FormatName => {
  const { width, height } = useVideoConfig();
  if (height > width) return "vertical";
  if (width === height) return "square";
  return "landscape";
};

/** 文字が隠れない領域の padding */
export const useSafeArea = () => SAFE_AREA[useFormatName()];

/** px 値をスケールする小さなヘルパー */
export const useSized = () => {
  const scale = useScale();
  return (px: number) => px * scale;
};

/**
 * テキストが安全領域からはみ出さない最大のフォントサイズを返す。
 *
 * 台本に何文字書かれるかは事前に分からないので、
 * 「設計上の理想サイズ」と「幅から逆算した上限」の小さい方を採る。
 * これがあるおかげで、テンプレートは長文の台本を渡されても崩れない。
 *
 * @param widthRatio 安全領域のうち実際に使ってよい割合（0〜1）
 */
export const useFitFontSize = () => {
  const { width } = useVideoConfig();
  const safe = useSafeArea();
  const scale = useScale();

  return (text: string, baseSize: number, widthRatio = 1): number => {
    const ideal = baseSize * scale;
    // "/" は文節の区切り記号で画面には出ないので採寸から除く
    const em = maxLineWidthInEm(text.replace(/\//g, ""));
    if (em <= 0) return ideal;

    const available = (width - safe.left - safe.right) * widthRatio;
    return Math.min(ideal, available / em);
  };
};
