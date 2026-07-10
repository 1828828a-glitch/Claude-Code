import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACCENT, ACCENT2, CARD, FONT, FPS, GREY, INK, W, eio, eoc, eoq, lerp, rng, seg } from "../theme";
import { CenterText } from "../components";

/* Scene 6: サービス紹介 ADTURN for HR — レポートの章立てウォークスルー */

const CHAPTERS = [
  { n: "01", title: "現状診断", desc: "公開情報から「採用の現在地」を可視化" },
  { n: "02", title: "競合ポジショニング分析", desc: "競合の強みと、構造的な限界" },
  { n: "03", title: "ターゲット再定義", desc: "本当に狙うべき「隠れた優秀層」" },
  { n: "04", title: "採用ファネル設計", desc: "歩留まりを最大化する動線設計" },
  { n: "05", title: "トークスクリプト", desc: "競合と比較されても選ばれる「語り」" },
  { n: "06", title: "具体的提言", desc: "明日から実行できる「即効薬」" },
];
const CH_T0 = 4.2, CH_STEP = 1.9; // 章iの登場時刻 = CH_T0 + i*CH_STEP

export const S6Output: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const tAbs = t + 42;
  const out = eio(seg(tAbs, 62.2, 63));

  const kH = eoq(seg(t, 0.1, 1));
  const kD = eoq(seg(t, 0.5, 1.4));
  const dx = 170, dy = 310, dw = 560, dh = 680;

  // 誌面の章ブロック幅（Canvas版と同じ乱数系列で確定）
  const rl = rng(23);
  const sections = Array.from({ length: 6 }, () => ({
    w0: 0.62 + rl() * 0.3,
    w1: 0.86 + rl() * 0.12,
    w2: 0.5 + rl() * 0.35,
  }));

  // 登場済みの最新章
  let hi = -1;
  for (let i = 0; i < 6; i++) if (t >= CH_T0 + i * CH_STEP) hi = i;
  const kMove = hi >= 0 ? eoc(seg(t, CH_T0 + hi * CH_STEP, CH_T0 + hi * CH_STEP + 0.55)) : 0;
  const hlY = hi >= 0 ? dy + 108 + lerp(Math.max(0, hi - 1) * 94, hi * 94, hi === 0 ? 1 : kMove) - 12 : 0;
  const kHl = eoq(seg(t, CH_T0, CH_T0 + 0.5));
  const kS = eoq(seg(t, 16.6, 17.4));

  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      {/* ヘッダー（チップ＋サービス名） */}
      <div style={{ position: "absolute", left: W / 2, top: 64, transform: `translateX(-50%) translateY(${24 * (1 - kH)}px)`,
        opacity: kH, background: ACCENT, borderRadius: 32, padding: "0 28px", height: 64,
        display: "flex", alignItems: "center", color: "#fff", fontSize: 34, fontWeight: 800,
        whiteSpace: "nowrap" }}>
        デジブレ搭載｜採用・人事向け診断サービス
      </div>
      <CenterText x={W / 2} top={152} size={84} weight={900} color={ACCENT} opacity={kH} dy={24 * (1 - kH)}>
        ADTURN for HR
      </CenterText>

      {/* 左：レポート誌面（2枚重ね・6章ブロック入り） */}
      {kD > 0 && (
        <div style={{ opacity: kD }}>
          {/* 背面の提言書 */}
          <div style={{ position: "absolute", left: dx + 34, top: dy + 22, width: dw, height: dh,
            background: "#f0f1f6", border: "2px solid #e3e4ea", borderRadius: 16,
            boxSizing: "border-box", transform: "rotate(2deg)" }} />
          {/* 前面の戦略レポート */}
          <div style={{ position: "absolute", left: dx, top: dy, width: dw, height: dh,
            background: CARD, border: "2px solid #e3e4ea", borderRadius: 16, boxSizing: "border-box",
            boxShadow: "0 18px 46px rgba(30,34,80,.16)" }}>
            <div style={{ position: "absolute", left: 36, top: 26, fontSize: 30, fontWeight: 800, color: INK,
              whiteSpace: "nowrap" }}>
              採用「勝ち筋」戦略レポート
            </div>
            <div style={{ position: "absolute", left: 36, top: 78, width: dw - 72, height: 4, background: ACCENT }} />
            {sections.map((s, i) => (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: 36, top: 108 + i * 94, width: 170 * s.w0 + 60,
                  height: 16, background: ACCENT2 }} />
                <div style={{ position: "absolute", left: 36, top: 138 + i * 94, width: (dw - 72) * s.w1,
                  height: 10, background: "#d9dbe3" }} />
                <div style={{ position: "absolute", left: 36, top: 160 + i * 94, width: (dw - 72) * s.w2,
                  height: 10, background: "#d9dbe3" }} />
              </React.Fragment>
            ))}
          </div>
          {/* 章ハイライト枠（最新章へスライドして追従） */}
          {hi >= 0 && (
            <div style={{ position: "absolute", left: dx + 22, top: hlY, width: dw - 44, height: 86,
              border: `3.5px solid ${ACCENT}`, borderRadius: 12, boxSizing: "border-box",
              background: "rgba(91,103,242,.07)", opacity: kHl }} />
          )}
        </div>
      )}

      {/* 右：章立てリスト（番号バッジ＋タイトル＋一行解説がカスケード） */}
      {CHAPTERS.map((c, i) => {
        const k = eoq(seg(t, CH_T0 + i * CH_STEP, CH_T0 + i * CH_STEP + 0.7));
        if (k <= 0) return null;
        const active = i === hi;
        const ix = 860 + 40 * (1 - k);
        const iy = 316 + i * 112;
        return (
          <div key={c.n} style={{ position: "absolute", left: ix, top: iy, opacity: k * (active ? 1 : 0.55) }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 64, height: 64, borderRadius: 16,
              background: active ? ACCENT : "#c9cce8", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontSize: 30, fontWeight: 800 }}>
              {c.n}
            </div>
            <div style={{ position: "absolute", left: 92, top: -4, fontSize: 38, fontWeight: 800, color: INK,
              whiteSpace: "nowrap" }}>
              {c.title}
            </div>
            <div style={{ position: "absolute", left: 92, top: 44, fontSize: 27, fontWeight: 700, color: GREY,
              whiteSpace: "nowrap" }}>
              {c.desc}
            </div>
          </div>
        );
      })}

      {/* 締めのメッセージ */}
      <CenterText x={W / 2} top={1000} size={40} weight={800} color={INK} opacity={kS}>
        この戦略レポート<span style={{ color: ACCENT }}>「そのもの」</span>を、デジブレが出力。
      </CenterText>
    </AbsoluteFill>
  );
};
