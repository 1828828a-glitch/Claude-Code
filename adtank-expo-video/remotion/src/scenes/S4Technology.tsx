import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, CARD, FONT, FPS, GREY, INK, W, eio, eoq, seg } from "../theme";
import { CenterText } from "../components";

/* Scene 4: 技術的裏付け（独自の暗黙知抽出 × AIに翻訳する独自技術） */

const Icon: React.FC<{ type: "brain" | "med" | "skill" }> = ({ type }) => {
  const common = { fill: "none", stroke: ACCENT, strokeWidth: 8, strokeLinecap: "round" as const };
  if (type === "brain") {
    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="52" {...common} />
        <path d="M80 28 L80 132" {...common} />
        <path d="M64 66 A14 14 0 0 1 36 66" {...common} />
        <path d="M96 90 A14 14 0 0 1 124 90" {...common} />
      </svg>
    );
  }
  if (type === "med") {
    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="58" {...common} />
        <path d="M54 80 L106 80 M80 54 L80 106" {...common} />
      </svg>
    );
  }
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx="68" cy="68" r="44" {...common} />
      <path d="M100 100 L132 132" {...common} />
    </svg>
  );
};

const CARDS = [
  { title: "脳科学の観点", sub1: "思考・記憶・感情が生まれる", sub2: "メカニズムの解明", icon: "brain" as const },
  { title: "医学的な観点", sub1: "脳の構造・機能から", sub2: "高次脳機能を解明", icon: "med" as const },
  { title: "スキル抽出の観点", sub1: "質問による暗黙知抽出を", sub2: "同志社大学と共同研究", icon: "skill" as const },
];

export const S4Technology: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const tAbs = t + 24.5;
  const out = eio(seg(tAbs, 32.2, 33));

  const kH = eoq(seg(t, 0.1, 1));
  const kS = eoq(seg(t, 2.2, 3));
  const cw = 480, ch = 430, gap = 60, x0 = (W - cw * 3 - gap * 2) / 2, cy = 400;

  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      <CenterText x={W / 2} top={125} size={44} weight={800} color={GREY} opacity={kH} dy={24 * (1 - kH)}>
        なぜ、脳を転写できるのか。
      </CenterText>
      <CenterText x={W / 2} top={195} size={72} weight={900} color={INK} opacity={kH} dy={24 * (1 - kH)}>
        <span style={{ color: ACCENT }}>独自の暗黙知抽出</span> × <span style={{ color: ACCENT }}>AIに翻訳する独自技術</span>
      </CenterText>

      {CARDS.map((c, i) => {
        const k = eoq(seg(t, 0.7 + i * 0.28, 1.6 + i * 0.28));
        if (k <= 0) return null;
        const x = x0 + i * (cw + gap);
        const y = cy + 50 * (1 - k);
        return (
          <div key={c.title} style={{ position: "absolute", left: x, top: y, width: cw, height: ch,
            opacity: k, background: CARD, border: "2px solid #e3e4ea", borderRadius: 24,
            boxSizing: "border-box", overflow: "hidden" }}>
            <div style={{ height: 96, background: ACCENT, display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: 800 }}>
              {c.title}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <Icon type={c.icon} />
            </div>
            <div style={{ textAlign: "center", fontSize: 32, fontWeight: 700, color: GREY, marginTop: 8 }}>
              {c.sub1}
              <br />
              {c.sub2}
            </div>
          </div>
        );
      })}

      <CenterText x={W / 2} top={905} size={40} weight={800} color={INK} opacity={kS}>
        脳科学・医学の専門家と確立したメソッドを、すでに実装。
      </CenterText>
    </AbsoluteFill>
  );
};
