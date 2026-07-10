import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, FONT, FPS, GREY, INK, W, eio, eoq, seg } from "../theme";
import { CenterText, Ring } from "../components";

/* Scene 7: CTA「トップパフォーマーの脳を、あなたの武器に。」 */
export const S7CTA: React.FC = () => {
  const t = useCurrentFrame() / FPS;

  const kBG = eio(seg(t, 0, 1));
  const kR = eoq(seg(t, 0.2, 1.2));
  const k1 = eoq(seg(t, 0.6, 1.5));
  const k2 = eoq(seg(t, 1.3, 2.2));
  const k3 = eoq(seg(t, 2.1, 3));
  const pulse = 1 + Math.sin(t * 2.4) * 0.02;

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <AbsoluteFill style={{ background: ACCENT, opacity: kBG * 0.06 }} />
      {kR > 0 && <Ring cx={W / 2} cy={330} r={107 * kR * pulse} lw={24 * kR} opacity={kR} />}
      <CenterText x={W / 2} top={460} size={104} weight={900} color={INK} opacity={k1} dy={26 * (1 - k1)}>
        ADTURN for HR
      </CenterText>
      <CenterText x={W / 2} top={585} size={38} weight={700} color={GREY} opacity={k1} dy={26 * (1 - k1)}>
        Powered by デジブレ｜オリジナルAIエンジン（特許出願中）
      </CenterText>
      <CenterText x={W / 2} top={678} size={64} weight={900} color={INK} opacity={k2} dy={26 * (1 - k2)}>
        トップパフォーマーの脳を、<span style={{ color: ACCENT }}>あなたの武器に。</span>
      </CenterText>
      {k3 > 0 && (
        <>
          <div style={{ position: "absolute", left: W / 2, top: 830, transform: "translateX(-50%)",
            opacity: k3, background: ACCENT, borderRadius: 46, padding: "0 50px", height: 92,
            display: "flex", alignItems: "center", color: "#fff", fontSize: 42, fontWeight: 800,
            whiteSpace: "nowrap" }}>
            デモ実施中｜ぜひブースでご体験ください
          </div>
          <CenterText x={W / 2} top={965} size={36} weight={800} color={GREY} opacity={k3}>
            ADTANK GP
          </CenterText>
        </>
      )}
    </AbsoluteFill>
  );
};
