import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, CARD, FONT, FPS, GREY, INK, W, eio, eob, eoq, seg } from "../theme";
import { CenterText, Ring } from "../components";

/* Scene 3: 既存AI（△）との比較 →「レシピではなく、料理そのものを。」 */
export const S3Compare: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const tAbs = t + 15.5;
  const out = eio(seg(tAbs, 23.7, 24.5));

  const kL = eoq(seg(t, 0.15, 1));
  const kR = eoq(seg(t, 0.45, 1.3));
  const kV = eob(seg(t, 0.9, 1.4));
  const kT = eoq(seg(t, 1.8, 2.7));
  const cw = 700, ch = 520, cy = 180;

  const cardStyle = (x: number, border: string, bw: number): React.CSSProperties => ({
    position: "absolute", left: x, top: cy, width: cw, height: ch,
    background: CARD, border: `${bw}px solid ${border}`, borderRadius: 28,
    boxSizing: "border-box",
  });

  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      {kL > 0 && (
        <div style={{ opacity: kL }}>
          <div style={cardStyle(170 - 80 * (1 - kL), "#e3e4ea", 2)} />
          {/* 三角アイコン */}
          <svg style={{ position: "absolute", left: 170 - 80 * (1 - kL) + cw / 2 - 70, top: cy + 50 }}
            width="140" height="140" viewBox="0 0 140 140">
            <polygon points="70,22 118,105 22,105" fill="none" stroke="#a9adb8"
              strokeWidth="16" strokeLinejoin="round" />
          </svg>
          <CenterText x={170 - 80 * (1 - kL) + cw / 2} top={cy + 212} size={46} weight={800} color={GREY}>
            既存のAIツール
          </CenterText>
          <CenterText x={170 - 80 * (1 - kL) + cw / 2} top={cy + 305} size={38} weight={700} color={GREY}>
            一般的な回答を出力
          </CenterText>
          <CenterText x={170 - 80 * (1 - kL) + cw / 2} top={cy + 375} size={38} weight={700} color={GREY}>
            役割は業務の「補助」まで
          </CenterText>
        </div>
      )}
      {kR > 0 && (
        <div style={{ opacity: kR }}>
          <div style={cardStyle(1050 + 80 * (1 - kR), ACCENT, 4)} />
          <Ring cx={1050 + 80 * (1 - kR) + cw / 2} cy={cy + 120} r={56} lw={16} opacity={kR} />
          <CenterText x={1050 + 80 * (1 - kR) + cw / 2} top={cy + 212} size={46} weight={900} color={ACCENT}>
            デジブレ
          </CenterText>
          <CenterText x={1050 + 80 * (1 - kR) + cw / 2} top={cy + 305} size={38} weight={800} color={INK}>
            提案書・分析・戦略「そのもの」を
          </CenterText>
          <CenterText x={1050 + 80 * (1 - kR) + cw / 2} top={cy + 375} size={38} weight={800} color={INK}>
            トップパフォーマー品質で出力
          </CenterText>
        </div>
      )}
      {kV > 0 && (
        <div
          style={{ position: "absolute", left: W / 2 - 62, top: cy + ch / 2 - 62, width: 124, height: 124,
            borderRadius: "50%", background: INK, transform: `scale(${kV})`,
            opacity: Math.min(1, Math.max(0, kV)), display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontSize: 44, fontWeight: 900 }}
        >
          VS
        </div>
      )}
      {kT > 0 && (
        <>
          <CenterText x={W / 2} top={800} size={78} weight={900} color={INK} opacity={kT} dy={26 * (1 - kT)}>
            レシピではなく、<span style={{ color: ACCENT }}>「料理そのもの」</span>を。
          </CenterText>
          <div style={{ position: "absolute", left: W / 2 - 300 * kT, top: 915, width: 600 * kT,
            height: 8, background: ACCENT, opacity: kT }} />
        </>
      )}
    </AbsoluteFill>
  );
};
