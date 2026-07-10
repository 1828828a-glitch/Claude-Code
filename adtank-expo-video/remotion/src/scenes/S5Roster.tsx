import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, ACCENT2, CARD, FONT, FPS, GREY, INK, W, eio, eoc, eoq, seg } from "../theme";
import { CenterText } from "../components";

/* Scene 5: 各領域のトップパフォーマー約40名の脳をコピー済み */

const CHIPS: Array<{ label: string; x: number; y: number }> = [
  { label: "大手コンサル 4大ファームMD", x: 330, y: 410 },
  { label: "上場企業役員", x: 1590, y: 410 },
  { label: "外資系企業エース人事", x: 260, y: 660 },
  { label: "大手コピーライター", x: 1660, y: 660 },
  { label: "世界的有名アーティスト", x: 330, y: 910 },
  { label: "論文著者", x: 1590, y: 910 },
  { label: "4度IPOのシリアルアントレプレナー", x: 600, y: 1010 },
  { label: "大手採用コンサル会社本部長", x: 1320, y: 1010 },
];

export const S5Roster: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const tAbs = t + 33;
  const out = eio(seg(tAbs, 41.2, 42));

  const kH = eoq(seg(t, 0.1, 1));
  const kC = seg(t, 0.6, 2.6);
  const n = Math.round(40 * eoc(kC));
  const kR = eoq(seg(t, 0.3, 1.2));
  const cx = W / 2, cy = 630, R = 250;
  const circumference = 2 * Math.PI * R;

  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      <CenterText x={W / 2} top={95} size={68} weight={900} color={INK} opacity={kH} dy={24 * (1 - kH)}>
        各領域のトップパフォーマーの脳を、<span style={{ color: ACCENT }}>コピー済み。</span>
      </CenterText>
      <CenterText x={W / 2} top={208} size={32} weight={700} color={GREY} opacity={kH} dy={24 * (1 - kH)}>
        マーケ・採用・人事・ブランディング・経営コンサル・アーティスト…
      </CenterText>

      {kR > 0 && (
        <>
          <svg
            width={560} height={560}
            style={{ position: "absolute", left: cx - 280, top: cy - 280,
              transform: `scale(${kR})`, opacity: kR }}
          >
            <circle cx={280} cy={280} r={R} fill="none" stroke="#e0e2ef" strokeWidth={10} />
            <circle
              cx={280} cy={280} r={R} fill="none" stroke={ACCENT} strokeWidth={18}
              strokeLinecap="round"
              strokeDasharray={`${circumference * eoc(kC)} ${circumference}`}
              transform="rotate(-90 280 280)"
            />
          </svg>
          <CenterText x={cx} top={cy - 95} size={104} weight={900} color={INK} opacity={kR}>
            約<span style={{ color: ACCENT }}>{n}</span>名
          </CenterText>
          <CenterText x={cx} top={cy + 50} size={40} weight={800} color={GREY} opacity={kR}>
            の脳をコピー済み
          </CenterText>
        </>
      )}

      {CHIPS.map((c, i) => {
        const k = eoq(seg(t, 1.2 + i * 0.22, 2 + i * 0.22));
        if (k <= 0) return null;
        return (
          <div
            key={c.label}
            style={{ position: "absolute", left: c.x, top: c.y - 34 + 14 * (1 - k),
              transform: "translateX(-50%)", opacity: k, background: CARD,
              border: `2px solid ${ACCENT2}`, borderRadius: 32, padding: "0 24px",
              height: 64, display: "flex", alignItems: "center",
              fontSize: 30, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}
          >
            {c.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
