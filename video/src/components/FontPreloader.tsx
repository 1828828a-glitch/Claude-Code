import React, { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { FONT_SPECS } from "../theme/fonts";

/**
 * フォントが載る前のフレームがレンダリングされるのを防ぐ。
 *
 * Remotion はフレーム単位で描画するので、途中のフレームで初めて使われる
 * 文字があると、そこだけフォールバックフォントで焼き込まれることがある。
 * 台本の全テキストをここで先に読ませておくことで、それを防ぐ。
 */
export const FontPreloader: React.FC<{ sampleText?: string }> = ({
  sampleText = "",
}) => {
  const [handle] = useState(() => delayRender("フォント読み込み中"));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // サンプルテキストを渡すことで、必要な unicode-range のサブセットまで確実に読む
      const text = sampleText || "あア亜A1";
      await Promise.all(
        FONT_SPECS.map((spec) =>
          document.fonts.load(spec, text).catch(() => undefined),
        ),
      );
      await document.fonts.ready;
      if (!cancelled) continueRender(handle);
    };

    load().catch((err) => {
      cancelRender(err);
    });

    return () => {
      cancelled = true;
    };
  }, [handle, sampleText]);

  return null;
};
