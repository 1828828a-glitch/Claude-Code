import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, ACCENT2, CARD, FONT, FPS, INK, W, eio, eoc, eoq, rng, seg } from "../theme";
import { CenterText } from "../components";

/* Scene 6: サービス紹介 ADTURN for HR — 戦略レポート「そのもの」を出力 */

const DOCS = [
  { x: 430, title: "採用「勝ち筋」戦略レポート", d: 0.5, seed: 11 },
  { x: 1050, title: "採用戦略・ブランド価値変革提言書", d: 0.9, seed: 18 },
];

export const S6Output: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const tAbs = t + 42;
  const out = eio(seg(tAbs, 50.7, 51.5));

  const kH = eoq(seg(t, 0.1, 1));
  const kS = eoq(seg(t, 2.6, 3.4));
  const dw = 440, dh = 500;

  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: W / 2, top: 80, transform: `translateX(-50%) translateY(${24 * (1 - kH)}px)`,
        opacity: kH, background: ACCENT, borderRadius: 32, padding: "0 28px", height: 64,
        display: "flex", alignItems: "center", color: "#fff", fontSize: 34, fontWeight: 800,
        whiteSpace: "nowrap" }}>
        デジブレ搭載｜採用・人事向け診断サービス
      </div>
      <CenterText x={W / 2} top={172} size={92} weight={900} color={ACCENT} opacity={kH} dy={24 * (1 - kH)}>
        ADTURN for HR
      </CenterText>
      <CenterText x={W / 2} top={300} size={44} weight={800} color={INK} opacity={kH} dy={24 * (1 - kH)}>
        診断から、戦略レポート<span style={{ color: ACCENT }}>「そのもの」</span>まで出力。
      </CenterText>

      {DOCS.map((doc) => {
        const k = eoq(seg(t, doc.d, doc.d + 0.9));
        if (k <= 0) return null;
        const y = 385 + 60 * (1 - k);
        const rl = rng(doc.seed);
        // 非見出し行の幅係数を事前に順番どおり確定させる（Canvas版と同じ消費順）
        const lines = Array.from({ length: 10 }, (_, li) => {
          const isHead = li === 0 || li === 4 || li === 8;
          return { li, isHead, factor: isHead ? 0 : 0.72 + rl() * 0.28 };
        });
        return (
          <div key={doc.title} style={{ position: "absolute", left: doc.x, top: y, width: dw, height: dh,
            opacity: k, background: CARD, border: "2px solid #e3e4ea", borderRadius: 16,
            boxSizing: "border-box", boxShadow: "0 16px 40px rgba(30,34,80,.14)" }}>
            <div style={{ position: "absolute", left: 34, top: 30, fontSize: 28, fontWeight: 800,
              color: INK, whiteSpace: "nowrap" }}>
              {doc.title}
            </div>
            <div style={{ position: "absolute", left: 34, top: 80, width: dw - 68, height: 4,
              background: ACCENT }} />
            {lines.map((l) => {
              const lk = eoc(seg(t, doc.d + 0.9 + l.li * 0.22, doc.d + 1.7 + l.li * 0.22));
              if (lk <= 0) return null;
              const width = (l.isHead ? 200 : (dw - 68) * l.factor) * lk;
              return (
                <div key={l.li} style={{ position: "absolute", left: 34, top: 120 + l.li * 38,
                  width, height: l.isHead ? 18 : 12,
                  background: l.isHead ? ACCENT2 : "#d9dbe3" }} />
              );
            })}
          </div>
        );
      })}

      <CenterText x={W / 2} top={955} size={42} weight={800} color={INK} opacity={kS}>
        人事・採用トップパフォーマーの「脳」が、貴社を診断する。
      </CenterText>
    </AbsoluteFill>
  );
};
