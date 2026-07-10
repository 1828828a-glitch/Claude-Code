import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, FONT, FPS, GREY, INK, W, eio, eoq, rng, seg } from "../theme";
import { CenterText } from "../components";

/* Scene 1: フック「もし、トップパフォーマーの『脳』をそのままコピーできたら。」 */
export const S1Hook: React.FC = () => {
  const t = useCurrentFrame() / FPS;

  const words = ["情報収集", "要約", "資料作成", "下書き", "疑問解消", "学習補助", "翻訳", "議事録"];
  const r = rng(7);
  const floats = words.map((w, i) => ({
    w,
    i,
    bx: 200 + r() * 1500,
    by: 140 + r() * 820,
    sp: 8 + r() * 14,
    ph: r() * 6.28,
    fs: 34 + r() * 14,
  }));

  const out = eio(seg(t, 5.9, 6.8));
  const k1 = eoq(seg(t, 0.7, 1.8));
  const k2 = eoq(seg(t, 1.5, 2.6));
  const k3 = eoq(seg(t, 2.4, 3.4));

  return (
    <AbsoluteFill>
      {floats.map((f) => {
        const y = f.by + Math.sin(t * 0.5 + f.ph) * 18;
        const x = (f.bx + t * f.sp * 0.6) % W;
        const a = 0.18 * seg(t, 0.2 + f.i * 0.15, 1.2 + f.i * 0.15) * (1 - seg(t, 5.4, 6.4));
        return (
          <div
            key={f.i}
            style={{
              position: "absolute",
              left: x,
              top: y - f.fs,
              fontFamily: FONT,
              fontSize: f.fs,
              fontWeight: 700,
              color: GREY,
              opacity: a,
            }}
          >
            {f.w}
          </div>
        );
      })}
      <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-40 * out}px)` }}>
        <CenterText x={W / 2} top={410} size={86} weight={900} color={INK} opacity={k1} dy={30 * (1 - k1)}>
          もし、トップパフォーマーの<span style={{ color: ACCENT }}>「脳」</span>を
        </CenterText>
        <CenterText x={W / 2} top={540} size={86} weight={900} color={INK} opacity={k2} dy={30 * (1 - k2)}>
          そのままコピーできたら。
        </CenterText>
        <div
          style={{
            position: "absolute",
            left: W / 2 - 330 * k3,
            top: 690,
            width: 660 * k3,
            height: 10,
            background: ACCENT,
            opacity: k3,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
