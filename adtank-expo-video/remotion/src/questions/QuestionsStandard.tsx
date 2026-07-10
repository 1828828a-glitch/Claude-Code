import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, ACCENT2, BG, CARD, FONT, FPS, GREY, INK, W, eio, eoc, eoq, rng, seg } from "../theme";
import { ANSWER_ITEMS, ASSET_WORDS, GRAD, Q_CUTS, Q_DURATION, QUESTIONS } from "./timeline";

/* ============================================================
   台本v3 パターン①: スタンダードだけど洗練されたクリエイティブ表現
   白基調・静かなタイピング/フェード・青〜紫グラデーションのアクセント
   ============================================================ */

const useT = () => useCurrentFrame() / FPS;

const Center: React.FC<{ top: number; size: number; weight?: number; color?: string;
  opacity?: number; dy?: number; spacing?: number; children: React.ReactNode }> =
  ({ top, size, weight = 900, color = INK, opacity = 1, dy = 0, spacing = 0.04, children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center",
    fontFamily: FONT, fontSize: size, fontWeight: weight, color, opacity,
    letterSpacing: `${spacing}em`, transform: `translateY(${dy}px)`, lineHeight: 1.45,
    whiteSpace: "pre-line" }}>
    {children}
  </div>
);

/* --- S1: 問いの宣言 --- */
const SIntro: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const k1 = eoq(seg(t, 0.6, 2.0));
  const o1 = eio(seg(t, 2.9, 3.7));
  const k2 = eoq(seg(t, 3.6, 4.8));
  const kU = eoq(seg(t, 4.4, 5.4));
  const out = eio(seg(t, dur - 0.8, dur));
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Center top={470} size={84} opacity={k1 * (1 - o1)} dy={20 * (1 - k1)}
        spacing={0.28 - 0.2 * k1}>
        例えば、採用。
      </Center>
      <Center top={452} size={72} opacity={k2} dy={24 * (1 - k2)}>
        貴社は、この問いに<span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text",
          color: "transparent" }}>即答</span>できますか。
      </Center>
      <div style={{ position: "absolute", left: W / 2 - 260 * kU, top: 600, width: 520 * kU,
        height: 6, backgroundImage: GRAD, opacity: kU * k2 }} />
    </AbsoluteFill>
  );
};

/* --- S2〜S5: 問い（タイピング表示） --- */
const SQuestion: React.FC<{ idx: number; dur: number }> = ({ idx, dur }) => {
  const t = useT();
  const frame = useCurrentFrame();
  const q = QUESTIONS[idx];
  const out = eio(seg(t, dur - 0.8, dur));
  const kN = eoq(seg(t, 0.15, 1.0));

  const full = q.lines.join("\n");
  const typeStart = 0.7, cps = 15;
  const shown = Math.max(0, Math.floor((t - typeStart) * cps));
  const done = shown >= full.length;
  const doneAt = typeStart + full.length / cps;
  const caretOn = !done || t < doneAt + 0.8;
  const kSub = eoq(seg(t, doneAt + 0.35, doneAt + 1.15));

  // Q2: 背景に「埋もれた事実」ワードが浮かんでは消える
  const isQ2 = idx === 1;
  const r = rng(31);
  const words = ASSET_WORDS.map((w, i) => ({
    w, x: 180 + r() * 1560, y: i % 2 === 0 ? 150 + r() * 210 : 830 + r() * 130,
    d: 1.2 + r() * 4.5, sp: 10 + r() * 12,
  }));
  // Q2: キラーフレーズ（ナレーション q3b と同期 = ローカル9.0秒）
  const kKiller = isQ2 ? eoq(seg(t, 9.0, 10.2)) : 0;

  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      {isQ2 && words.map((w, i) => {
        const a = 0.16 * Math.max(0, Math.sin(Math.PI * seg(t, w.d, w.d + 5)));
        return (
          <div key={i} style={{ position: "absolute", left: w.x, top: w.y - (t - w.d) * w.sp,
            fontSize: 42, fontWeight: 800, color: GREY, opacity: a }}>
            {w.w}
          </div>
        );
      })}
      {/* Qナンバー（グラデーション） */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center",
        fontSize: 110, fontWeight: 900, backgroundImage: GRAD, WebkitBackgroundClip: "text",
        color: "transparent", opacity: kN, transform: `translateY(${18 * (1 - kN)}px)` }}>
        {q.n}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 336, textAlign: "center",
        fontSize: 30, fontWeight: 800, color: GREY, opacity: kN, letterSpacing: "0.3em" }}>
        {q.tag}
      </div>
      {/* タイピングされる問い */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center",
        fontSize: 62, fontWeight: 900, color: INK, lineHeight: 1.55, whiteSpace: "pre-line" }}>
        {full.slice(0, shown)}
        {caretOn && (
          <span style={{ display: "inline-block", width: 8, height: 58, background: ACCENT,
            marginLeft: 6, verticalAlign: "-6px",
            opacity: frame % 20 < 11 ? 1 : 0 }} />
        )}
      </div>
      {/* 問いの下の小さな一文 */}
      <Center top={isQ2 ? 680 : 700} size={31} weight={700} color={GREY} opacity={kSub}
        dy={16 * (1 - kSub)}>
        {q.sub}
      </Center>
      {/* Q2のみ: キラーフレーズ */}
      {isQ2 && kKiller > 0 && (
        <Center top={820} size={54} opacity={kKiller} dy={22 * (1 - kKiller)}>
          魅力の不足ではなく、<span style={{ backgroundImage: GRAD,
            WebkitBackgroundClip: "text", color: "transparent" }}>翻訳の不足</span>です。
        </Center>
      )}
      {/* 進行ドット（4問中の現在地） */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ position: "absolute", left: W / 2 - 66 + i * 36, top: 980,
          width: 16, height: 16, borderRadius: 8, opacity: kN,
          background: i === idx ? ACCENT : "#d9dbe6" }} />
      ))}
    </AbsoluteFill>
  );
};

/* --- S6: 答えの存在証明 --- */
const MiniGraphic: React.FC<{ kind: number }> = ({ kind }) => {
  const c = { fill: "none", stroke: ACCENT, strokeWidth: 6, strokeLinecap: "round" as const };
  if (kind === 0) return ( // ポジショニングマップ
    <svg width="150" height="120" viewBox="0 0 150 120">
      <path d="M75 8 L75 112 M12 60 L138 60" {...c} strokeWidth={4} opacity={0.5} />
      <circle cx="104" cy="34" r="12" fill={ACCENT} />
      <circle cx="42" cy="82" r="8" fill="#c9cce8" />
      <circle cx="58" cy="38" r="8" fill="#c9cce8" />
    </svg>
  );
  if (kind === 1) return ( // 無自覚資産の発掘
    <svg width="150" height="120" viewBox="0 0 150 120">
      {[0, 1, 2].map((row) => [0, 1, 2].map((col) => (
        <rect key={`${row}${col}`} x={24 + col * 38} y={10 + row * 36} width="28" height="26"
          rx="6" fill={row === 1 && col === 1 ? ACCENT : "#e0e2f0"} />
      )))}
    </svg>
  );
  if (kind === 2) return ( // ターゲットペルソナ
    <svg width="150" height="120" viewBox="0 0 150 120">
      <circle cx="50" cy="42" r="22" fill={ACCENT} />
      <rect x="26" y="70" width="48" height="34" rx="16" fill={ACCENT} />
      <path d="M92 40 L134 40 M92 62 L126 62 M92 84 L134 84" {...c} strokeWidth={8}
        opacity={0.45} />
    </svg>
  );
  return ( // トークスクリプト
    <svg width="150" height="120" viewBox="0 0 150 120">
      <rect x="12" y="14" width="82" height="40" rx="14" fill="#e0e2f0" />
      <rect x="52" y="64" width="86" height="42" rx="14" fill={ACCENT} />
    </svg>
  );
};

const SAnswers: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const out = eio(seg(t, dur - 0.8, dur));
  const phase2 = seg(t, 5.2, 5.9); // チェック → レポートページへ
  const kH = eoq(seg(t, 5.9, 6.9));
  const kI = eoq(seg(t, 7.6, 8.6));
  const pages = ["ポジショニングマップ", "無自覚資産の発掘", "ターゲットペルソナ", "トークスクリプト"];
  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      {/* フェーズ1: 4つの問いにチェックが点灯 */}
      <AbsoluteFill style={{ opacity: 1 - eio(phase2) }}>
        <Center top={150} size={44} weight={800} color={GREY} opacity={eoq(seg(t, 0.2, 1))}>
          4つの問い、すべてに。
        </Center>
        {QUESTIONS.map((q, i) => {
          const k = eoq(seg(t, 0.6 + i * 0.75, 1.4 + i * 0.75));
          const kC = eoq(seg(t, 1.05 + i * 0.75, 1.6 + i * 0.75));
          if (k <= 0) return null;
          return (
            <div key={q.n} style={{ position: "absolute", left: 210 + i * 390,
              top: 360 + 40 * (1 - k), width: 330, height: 360, opacity: k, background: CARD,
              border: "2px solid #e3e4ea", borderRadius: 24, textAlign: "center",
              boxShadow: "0 12px 34px rgba(30,34,80,.08)" }}>
              <div style={{ marginTop: 44, fontSize: 54, fontWeight: 900,
                backgroundImage: GRAD, WebkitBackgroundClip: "text", color: "transparent" }}>
                {q.n}
              </div>
              <div style={{ marginTop: 8, fontSize: 32, fontWeight: 800, color: INK }}>{q.tag}</div>
              <svg width="86" height="86" viewBox="0 0 86 86"
                style={{ marginTop: 34, transform: `scale(${kC})`, opacity: kC }}>
                <circle cx="43" cy="43" r="39" fill={ACCENT} />
                <path d="M26 44 L38 57 L61 31" fill="none" stroke="#fff" strokeWidth="9"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          );
        })}
      </AbsoluteFill>
      {/* フェーズ2: レポートページがめくられていく */}
      <AbsoluteFill style={{ opacity: eio(phase2) }}>
        <Center top={92} size={38} weight={800} opacity={kH} dy={20 * (1 - kH)}>
          <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text",
            color: "transparent", letterSpacing: "0.08em" }}>ADTURN for HR</span>
        </Center>
        <Center top={158} size={54} opacity={kH} dy={20 * (1 - kH)}>
          その全ての<span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text",
            color: "transparent" }}>「答え」</span>を、レポートとして出力します。
        </Center>
        {pages.map((p, i) => {
          const k = eoq(seg(t, 6.3 + i * 0.55, 7.2 + i * 0.55));
          if (k <= 0) return null;
          return (
            <div key={p} style={{ position: "absolute", left: 250 + i * 370,
              top: 330 + 50 * (1 - k), width: 300, height: 430, opacity: k, background: CARD,
              border: "2px solid #e3e4ea", borderRadius: 16, textAlign: "center",
              boxShadow: "0 16px 40px rgba(30,34,80,.12)" }}>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 46 }}>
                <MiniGraphic kind={i} />
              </div>
              <div style={{ marginTop: 40, fontSize: 28, fontWeight: 800, color: INK }}>{p}</div>
              <div style={{ margin: "22px auto 0", width: 210, height: 8, background: "#e6e7f0" }} />
              <div style={{ margin: "12px auto 0", width: 170, height: 8, background: "#e6e7f0" }} />
            </div>
          );
        })}
        <Center top={860} size={33} weight={800} color={GREY} opacity={kI}>
          {ANSWER_ITEMS.join("　/　")}
        </Center>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* --- S7: 実物の提示 --- */
const SProof: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const out = eio(seg(t, dur - 0.8, dur));
  const kD = eoq(seg(t, 0.2, 1.1));
  const flip = Math.floor(Math.max(0, t - 0.6) / 0.55); // 0.55秒ごとにページが変わる
  const flipK = seg((t - 0.6) % 0.55, 0, 0.18);
  const r = rng(101 + flip * 13);
  const lines = Array.from({ length: 15 }, (_, i) => ({
    w: (i % 5 === 0 ? 0.45 : 0.7 + r() * 0.3), head: i % 5 === 0,
  }));
  const kT = eoq(seg(t, 0.8, 1.7));
  const kS = eoq(seg(t, 2.6, 3.5));
  return (
    <AbsoluteFill style={{ opacity: 1 - out, fontFamily: FONT }}>
      {/* 左: パラパラめくられる高密度レポート */}
      {kD > 0 && (
        <div style={{ opacity: kD }}>
          {[2, 1].map((o) => (
            <div key={o} style={{ position: "absolute", left: 200 + o * 22, top: 220 + o * 16,
              width: 520, height: 660, background: "#f0f1f6", border: "2px solid #e3e4ea",
              borderRadius: 14, transform: `rotate(${o * 1.6}deg)` }} />
          ))}
          <div style={{ position: "absolute", left: 200, top: 220, width: 520, height: 660,
            background: CARD, border: "2px solid #e3e4ea", borderRadius: 14,
            boxShadow: "0 18px 46px rgba(30,34,80,.16)",
            transform: `translateY(${-8 * (1 - flipK)}px)` }}>
            <div style={{ position: "absolute", left: 34, top: 26, fontSize: 25, fontWeight: 800,
              color: INK }}>
              戦略レポート｜p.{String(3 + flip).padStart(2, "0")}
            </div>
            <div style={{ position: "absolute", left: 34, top: 64, width: 452, height: 3,
              background: ACCENT }} />
            {lines.map((l, i) => (
              <div key={i} style={{ position: "absolute", left: 34, top: 92 + i * 37,
                width: 452 * l.w, height: l.head ? 14 : 9,
                background: l.head ? ACCENT2 : "#d9dbe3", opacity: flipK }} />
            ))}
          </div>
        </div>
      )}
      {/* 右: コピー */}
      <div style={{ position: "absolute", left: 820, top: 380, width: 940, opacity: kT,
        transform: `translateY(${22 * (1 - kT)}px)` }}>
        <div style={{ fontSize: 84, fontWeight: 900, color: INK, lineHeight: 1.4 }}>
          一般論は、<br />
          <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text",
            color: "transparent" }}>一行もない。</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 824, top: 700, width: 900, fontSize: 33,
        fontWeight: 700, color: GREY, lineHeight: 1.8, opacity: kS }}>
        貴社の公開情報から、人事・採用<br />トップパフォーマーの「脳」が診断。
      </div>
    </AbsoluteFill>
  );
};

/* --- S8: CTA --- */
const SCta: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const kG = eio(seg(t, 0, 1.4));
  const kR = eoq(seg(t, 0.3, 1.3));
  const pulse = 1 + Math.sin(t * 2.2) * 0.02;
  const k1 = eoq(seg(t, 0.9, 1.9));
  const o1 = eio(seg(t, 6.0, 6.8));
  const k2 = eoq(seg(t, 6.6, 7.6));
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <AbsoluteFill style={{ opacity: kG * 0.5, background:
        "radial-gradient(circle at 50% 42%, rgba(91,103,242,.16), transparent 55%)" }} />
      <div style={{ position: "absolute", left: W / 2 - 105, top: 255, width: 210, height: 210,
        border: `24px solid ${ACCENT}`, borderRadius: "50%", boxSizing: "border-box",
        opacity: kR, transform: `scale(${kR * pulse})` }} />
      <Center top={560} size={76} opacity={k1 * (1 - o1)} dy={24 * (1 - k1) - 20 * o1}>
        貴社の<span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text",
          color: "transparent" }}>「答え」</span>は、もう出せます。
      </Center>
      {k2 > 0 && (
        <>
          <Center top={505} size={88} opacity={k2} dy={20 * (1 - k2)}>
            <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text",
              color: "transparent", letterSpacing: "0.04em" }}>ADTURN for HR</span>
          </Center>
          <Center top={640} size={32} weight={700} color={GREY} opacity={k2}>
            Powered by デジブレ｜オリジナルAIエンジン（特許出願中）
          </Center>
          <div style={{ position: "absolute", left: W / 2, top: 730, transform:
            `translateX(-50%) translateY(${20 * (1 - k2)}px)`, opacity: k2,
            backgroundImage: GRAD, borderRadius: 46, padding: "0 52px", height: 92,
            display: "flex", alignItems: "center", color: "#fff", fontSize: 40, fontWeight: 800,
            whiteSpace: "nowrap" }}>
            デモ実施中｜ぜひブースでご体験ください
          </div>
          <Center top={880} size={34} weight={800} color={GREY} opacity={k2}>
            ADTANK GP
          </Center>
        </>
      )}
    </AbsoluteFill>
  );
};

/* --- master --- */
export const QuestionsStandard: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("q_bgm.mp3")} volume={0.55} />
      <Audio src={staticFile("q_narration.mp3")} />
      <AbsoluteFill style={{ opacity: 0.5, backgroundImage:
        "radial-gradient(#ecedf2 2px, transparent 2.5px)", backgroundSize: "120px 120px",
        backgroundPosition: "80px 80px" }} />
      {Q_CUTS.slice(0, -1).map((from, i) => {
        const dur = Q_CUTS[i + 1] - from;
        let node: React.ReactNode;
        if (i === 0) node = <SIntro dur={dur} />;
        else if (i >= 1 && i <= 4) node = <SQuestion idx={i - 1} dur={dur} />;
        else if (i === 5) node = <SAnswers dur={dur} />;
        else if (i === 6) node = <SProof dur={dur} />;
        else node = <SCta dur={dur} />;
        return (
          <Sequence key={i} from={Math.round(from * FPS)}
            durationInFrames={Math.round(dur * FPS)}>
            {node}
          </Sequence>
        );
      })}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 8,
        background: "#e7e8ee" }} />
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 8,
        backgroundImage: GRAD, width: `${(frame / durationInFrames) * 100}%` }} />
    </AbsoluteFill>
  );
};
