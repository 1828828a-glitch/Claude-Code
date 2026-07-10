import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, ACCENT2, FONT, FPS, GREY, INK, W, eio, eob, eoq, lerp, rng, seg } from "../theme";
import { CenterText, Ring, Stamp } from "../components";

/* Scene 2: 世界初「脳の転写」→ デジブレ登場・特許出願中 */
export const S2Digibure: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const tAbs = t + 7; // シーン開始 7.0s（Canvas版のグローバル時刻）

  const inK = eoq(seg(t, 0, 0.8));
  const out = eio(seg(tAbs, 14.7, 15.5));

  const hx = 560, hy = 600, rx = 1360, ry = 600;
  const kFig = eoq(seg(t, 0.5, 1.4));
  const kRing = eoq(seg(t, 0.9, 1.9));
  const pulse = 1 + Math.sin(t * 3) * 0.02;

  // 転写パーティクル（Canvas版と同一の乱数系列）
  const flow = seg(t, 1.2, 6.5);
  const r = rng(42);
  const particles = Array.from({ length: 46 }, () => {
    const off = r();
    const arc = (r() - 0.5) * 260;
    const size = 2 + r() * 4;
    const color = r() > 0.35 ? ACCENT : ACCENT2;
    return { off, arc, size, color };
  });

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <CenterText x={W / 2} top={110} size={40} weight={800} color={GREY} opacity={inK}>
        ADTANK GP
      </CenterText>
      <CenterText x={W / 2} top={175} size={76} weight={900} color={INK} opacity={inK}>
        世界で初めて、<span style={{ color: ACCENT }}>「脳の転写」</span>に成功。
      </CenterText>

      {kFig > 0 && (
        <div style={{ opacity: kFig }}>
          {/* 頭 */}
          <div style={{ position: "absolute", left: hx - 70, top: hy - 140, width: 140, height: 140,
            borderRadius: "50%", background: INK }} />
          {/* 肩 */}
          <div style={{ position: "absolute", left: hx - 105, top: hy + 20, width: 210, height: 150,
            borderRadius: 60, background: INK }} />
          <CenterText x={hx} top={hy + 205} size={36} weight={700} color={GREY}>
            トップパフォーマー
          </CenterText>
        </div>
      )}

      {kRing > 0 && (
        <>
          <Ring cx={rx} cy={ry - 30} r={123 * kRing * pulse} lw={26 * kRing} opacity={kRing} />
          <CenterText x={rx} top={ry + 120} size={64} weight={900} color={ACCENT} opacity={kRing}>
            デジブレ
          </CenterText>
          <CenterText x={rx} top={ry + 212} size={34} weight={700} color={GREY} opacity={kRing}>
            オリジナルAIエンジン
          </CenterText>
        </>
      )}

      {/* 受信リップル（リングから波紋が広がる） */}
      {(() => {
        const flowG = seg(t, 1.6, 2.2) * (1 - seg(t, 6, 6.8));
        if (flowG <= 0) return null;
        return [0, 1, 2].map((i) => {
          const p = (t * 0.5 + i / 3) % 1;
          return (
            <Ring key={`rip${i}`} cx={rx} cy={ry - 30} r={123 + p * 95} lw={3}
              opacity={(1 - p) * 0.25 * flowG * (1 - out)} />
          );
        });
      })()}
      {flow > 0 && flow < 1 &&
        particles.map((p, i) => {
          const prog = (t * 0.45 + p.off) % 1;
          const a = Math.sin(prog * Math.PI) * 0.9 * seg(t, 1.2, 2);
          const x = lerp(hx + 80, rx - 125, prog);
          const y = lerp(hy - 70, ry - 30, prog) + Math.sin(prog * Math.PI) * p.arc;
          return (
            <div
              key={i}
              style={{ position: "absolute", left: x - p.size, top: y - p.size,
                width: p.size * 2, height: p.size * 2, borderRadius: "50%",
                background: p.color, opacity: a }}
            />
          );
        })}

      <Stamp cx={W / 2} cy={930} k={seg(t, 2.6, 3.1)} eob={eob} />
    </AbsoluteFill>
  );
};
