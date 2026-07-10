import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, FONT, FPS, INK, W, eio, eob, eoq, rng, seg } from "../theme";
import { ANSWER_ITEMS, ASSET_WORDS, GRAD, Q_CUTS, QUESTIONS } from "./timeline";

/* ============================================================
   台本v3 パターン②: 突飛だけど目が止まるアニメーション表現
   黒白反転の高コントラスト・巨大タイポ・スラム＋シェイク・ストロボページ
   ============================================================ */

const DARK = "#0c0c12";
const useT = () => useCurrentFrame() / FPS;

/* 着地時の画面シェイク（決定的） */
const shake = (t: number, t0: number, amp = 14, dur = 0.38) => {
  const k = seg(t, t0, t0 + dur);
  if (k <= 0 || k >= 1) return { x: 0, y: 0 };
  const d = 1 - k;
  return { x: Math.sin(t * 97) * amp * d, y: Math.cos(t * 83) * amp * d };
};

/* スラム登場するテキスト（scale 2.4 → 1 のバックアウト） */
const Slam: React.FC<{ at: number; top: number; size: number; color: string;
  children: React.ReactNode; grad?: boolean }> = ({ at, top, size, color, children, grad }) => {
  const t = useT();
  const k = seg(t, at, at + 0.42);
  if (k <= 0) return null;
  const s = 2.4 - 1.4 * eob(k);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center",
      fontFamily: FONT, fontSize: size, fontWeight: 900, lineHeight: 1.35,
      color: grad ? "transparent" : color,
      backgroundImage: grad ? GRAD : undefined,
      WebkitBackgroundClip: grad ? "text" : undefined,
      opacity: Math.min(1, k * 3), transform: `scale(${s})`, whiteSpace: "pre-line" }}>
      {children}
    </div>
  );
};

/* --- S1: 問いの宣言（ダーク・スラム） --- */
const BIntro: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const out = eio(seg(t, dur - 0.6, dur));
  const sh = shake(t, 1.3, 20);
  const kU = eoq(seg(t, 4.6, 5.4));
  return (
    <AbsoluteFill style={{ background: DARK, opacity: 1 - out }}>
      <div style={{ position: "absolute", inset: 0,
        transform: `translate(${sh.x}px,${sh.y}px)` }}>
        <Slam at={0.6} top={330} size={80} color="#9aa0b8">例えば、</Slam>
        <Slam at={1.15} top={430} size={190} color="#fff" grad>採用。</Slam>
        <Slam at={3.6} top={720} size={62} color="#fff">
          {"貴社は、この問いに即答できますか?"}
        </Slam>
        <div style={{ position: "absolute", left: W / 2 - 240 * kU, top: 850,
          width: 480 * kU, height: 6, backgroundImage: GRAD, opacity: kU }} />
      </div>
    </AbsoluteFill>
  );
};

/* --- S2〜S5: 問い（巨大ナンバー横断＋行スラム） --- */
const BQuestion: React.FC<{ idx: number; dur: number }> = ({ idx, dur }) => {
  const t = useT();
  const frame = useCurrentFrame();
  const q = QUESTIONS[idx];
  const darkScene = idx % 2 === 1; // Q2, Q4 はダーク
  const bg = darkScene ? DARK : "#fff";
  const fg = darkScene ? "#fff" : INK;
  const subFg = darkScene ? "#8b90a8" : "#8b8f99";
  const out = eio(seg(t, dur - 0.6, dur));
  const sh1 = shake(t, 0.95, 16);
  const sh2 = shake(t, 1.55, 12);

  // Q2: 周回して吸い込まれるワード＋キラーフレーズの全画面反転
  const isQ2 = idx === 1;
  const killer = isQ2 ? seg(t, 8.8, 9.4) : 0;
  const kKill1 = eoq(seg(t, 9.2, 9.7));
  const kKill2 = eoq(seg(t, 10.1, 10.6));
  const shK = shake(t, 10.15, 22);

  return (
    <AbsoluteFill style={{ background: bg, opacity: 1 - out, fontFamily: FONT }}>
      {/* 背景を横断する巨大アウトラインナンバー */}
      <div style={{ position: "absolute", top: 140, left: 0, right: 0, textAlign: "center",
        fontSize: 780, fontWeight: 900, fontFamily: FONT, lineHeight: 1,
        color: "transparent", opacity: darkScene ? 0.16 : 0.1,
        WebkitTextStroke: `4px ${ACCENT}`,
        transform: `translateX(${260 - t * 34}px)` }}>
        {q.n}
      </div>
      {/* Q2: 周回するワード */}
      {isQ2 && ASSET_WORDS.map((w, i) => {
        const born = eoq(seg(t, 1.6 + i * 0.3, 2.4 + i * 0.3));
        if (born <= 0) return null;
        const ang = (i / ASSET_WORDS.length) * Math.PI * 2 + t * 0.3;
        const rad = (390 + i * 22) * born * (1 + killer * 2.2);
        const a = born * 0.75 * (1 - killer);
        return (
          <div key={w} style={{ position: "absolute",
            left: W / 2 + Math.cos(ang) * rad, top: 540 + Math.sin(ang) * rad * 0.62,
            transform: "translate(-50%,-50%)", padding: "10px 26px", borderRadius: 40,
            border: `2px solid ${darkScene ? "#3a3d55" : "#d5d7e6"}`, fontSize: 34,
            fontWeight: 800, color: subFg, opacity: a, whiteSpace: "nowrap" }}>
            {w}
          </div>
        );
      })}
      <div style={{ position: "absolute", inset: 0,
        transform: `translate(${sh1.x + sh2.x}px,${sh1.y + sh2.y}px)` }}>
        <Slam at={0.35} top={250} size={56} color={ACCENT}>{q.n}｜{q.tag}</Slam>
        <Slam at={0.75} top={400} size={74} color={fg}>{q.lines[0]}</Slam>
        <Slam at={1.35} top={540} size={74} color={fg} grad>{q.lines[1]}</Slam>
        {/* サブコピー: 左からアクセントバー付きで高速スライド */}
        {(() => {
          const k = eoq(seg(t, 2.3, 2.9));
          if (k <= 0) return null;
          return (
            <div style={{ position: "absolute", left: W / 2, top: 740,
              transform: `translateX(calc(-50% + ${60 * (1 - k)}px))`, opacity: k,
              borderLeft: `10px solid ${ACCENT}`, padding: "6px 0 6px 28px", fontSize: 34,
              fontWeight: 700, color: subFg, whiteSpace: "nowrap" }}>
              {q.sub}
            </div>
          );
        })()}
      </div>
      {/* 進行カウンター */}
      <div style={{ position: "absolute", right: 70, bottom: 50, fontSize: 56, fontWeight: 900,
        color: fg, opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>
        0{idx + 1}<span style={{ opacity: 0.35 }}> / 04</span>
      </div>
      {/* Q2: キラーフレーズの全画面反転 */}
      {isQ2 && killer > 0 && (
        <AbsoluteFill style={{ background: ACCENT, opacity: eio(killer) }}>
          <div style={{ position: "absolute", inset: 0, fontFamily: FONT,
            transform: `translate(${shK.x}px,${shK.y}px)` }}>
            <Slam at={9.2} top={400} size={86} color="#fff">魅力の不足ではなく、</Slam>
            <Slam at={10.1} top={540} size={110} color="#fff">「翻訳」の不足です。</Slam>
          </div>
          {/* フラッシュ */}
          <AbsoluteFill style={{ background: "#fff",
            opacity: frame % 2 === 0 && t > 10.1 && t < 10.25 ? 0.5 : 0 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* --- S6: 答えの存在証明（2x2スタンプ → 3D回転でページへ） --- */
const BAnswers: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const out = eio(seg(t, dur - 0.6, dur));
  const flipK = eio(seg(t, 5.0, 5.8));
  const pages = ["ポジショニング\nマップ", "無自覚資産の\n発掘", "ターゲット\nペルソナ", "トーク\nスクリプト"];
  return (
    <AbsoluteFill style={{ background: "#fff", opacity: 1 - out, fontFamily: FONT }}>
      <Slam at={0.25} top={110} size={60} color={INK}>4つの問い、すべてに答えを。</Slam>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
        perspective: 1600 }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d",
          transform: `rotateY(${flipK * 180}deg)` }}>
          {/* 表: 2x2の問いグリッド＋スタンプチェック */}
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
            {QUESTIONS.map((q, i) => {
              const col = i % 2, row = Math.floor(i / 2);
              const k = eob(seg(t, 0.8 + i * 0.5, 1.25 + i * 0.5));
              const kC = seg(t, 1.15 + i * 0.5, 1.5 + i * 0.5);
              if (k <= 0) return null;
              const sh = shake(t, 1.2 + i * 0.5, 8, 0.25);
              return (
                <div key={q.n} style={{ position: "absolute", left: 430 + col * 560 + sh.x,
                  top: 240 + row * 330 + sh.y, width: 500, height: 280,
                  transform: `scale(${Math.min(1.6, k)})`, background: "#fff",
                  border: `4px solid ${INK}`, borderRadius: 20, textAlign: "center" }}>
                  <div style={{ marginTop: 46, fontSize: 52, fontWeight: 900, color: INK }}>
                    {q.n}｜{q.tag}
                  </div>
                  {kC > 0 && (
                    <div style={{ position: "absolute", right: 26, top: -34,
                      transform: `rotate(-14deg) scale(${2 - eob(kC)})`, opacity: Math.min(1, kC * 2) }}>
                      <svg width="96" height="96" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="42" fill={ACCENT} />
                        <path d="M29 49 L43 63 L68 34" fill="none" stroke="#fff" strokeWidth="10"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* 裏: レポートページの扇形モンタージュ */}
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden",
            transform: "rotateY(180deg)" }}>
            {pages.map((p, i) => (
              <div key={p} style={{ position: "absolute", left: 330 + i * 340, top: 300,
                width: 300, height: 420, background: "#fff", border: "3px solid #e3e4ea",
                borderRadius: 16, transform: `rotate(${(i - 1.5) * 5}deg)`,
                boxShadow: "0 18px 50px rgba(30,34,80,.18)", textAlign: "center" }}>
                <div style={{ marginTop: 36, fontSize: 32, fontWeight: 900, color: INK,
                  whiteSpace: "pre-line", lineHeight: 1.5 }}>{p}</div>
                {[0, 1, 2, 3, 4].map((li) => (
                  <div key={li} style={{ margin: "16px auto 0", width: 210 - (li % 3) * 30,
                    height: 9, background: li === 0 ? ACCENT : "#d9dbe3" }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {flipK > 0.6 && (
        <>
          <Slam at={6.0} top={800} size={44} color={INK} grad>
            ADTURN for HR
          </Slam>
          <Slam at={6.3} top={890} size={34} color={INK}>
            {ANSWER_ITEMS.join("　/　")}
          </Slam>
        </>
      )}
    </AbsoluteFill>
  );
};

/* --- S7: 実物の提示（ストロボページ＋グリッチタイポ） --- */
const BProof: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const frame = useCurrentFrame();
  const out = eio(seg(t, dur - 0.6, dur));
  const page = Math.floor(frame / 8); // 8フレームごとに誌面が差し替わる
  const r = rng(400 + page * 17);
  const rot = (r() - 0.5) * 3;
  const lines = Array.from({ length: 14 }, (_, i) => ({
    w: i % 4 === 0 ? 0.4 + r() * 0.2 : 0.6 + r() * 0.38, head: i % 4 === 0,
  }));
  const kIn = eoq(seg(t, 0.15, 0.8));
  const g = Math.sin(frame * 1.7) * 3; // グリッチ量
  const kT = seg(t, 0.7, 0.75);
  const kS = eoq(seg(t, 3.2, 4.0));
  return (
    <AbsoluteFill style={{ background: DARK, opacity: 1 - out, fontFamily: FONT }}>
      {/* ストロボで差し替わる誌面 */}
      <div style={{ position: "absolute", left: 210, top: 200, width: 500, height: 680,
        background: "#fff", borderRadius: 14, opacity: kIn,
        transform: `rotate(${rot}deg)`, boxShadow: "0 0 90px rgba(91,103,242,.35)" }}>
        <div style={{ position: "absolute", left: 32, top: 24, fontSize: 24, fontWeight: 800,
          color: INK }}>
          戦略レポート｜p.{String(2 + page % 40).padStart(2, "0")}
        </div>
        <div style={{ position: "absolute", left: 32, top: 60, width: 436, height: 3,
          background: ACCENT }} />
        {lines.map((l, i) => (
          <div key={i} style={{ position: "absolute", left: 32, top: 88 + i * 40,
            width: 436 * l.w, height: l.head ? 14 : 9,
            background: l.head ? ACCENT : "#c9ccd8" }} />
        ))}
      </div>
      {/* グリッチタイポ */}
      {kT > 0 && (
        <div style={{ position: "absolute", left: 800, top: 360, width: 1000 }}>
          {[{ c: "#f25ba0", ox: -g }, { c: ACCENT, ox: g }, { c: "#fff", ox: 0 }].map((ly, i) => (
            <div key={i} style={{ position: "absolute", left: ly.ox,
              top: i === 2 ? 0 : Math.sin(frame * 2.3 + i) * 2,
              fontSize: 92, fontWeight: 900, color: ly.c, lineHeight: 1.35,
              opacity: i === 2 ? 1 : 0.75 }}>
              一般論は、<br />一行もない。
            </div>
          ))}
          <div style={{ position: "absolute", top: 330, fontSize: 34, fontWeight: 700,
            color: "#9aa0b8", lineHeight: 1.8, opacity: kS }}>
            貴社の公開情報から、人事・採用<br />トップパフォーマーの「脳」が診断。
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* --- S8: CTA（リングが画面を飲み込む） --- */
const BCta: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const kFill = eio(seg(t, 0.1, 1.1)); // アクセント円が画面全体へ
  const sh = shake(t, 1.5, 16);
  const shName = shake(t, 6.75, 14);
  const k2 = eoq(seg(t, 6.6, 7.5));
  const o1 = eio(seg(t, 6.0, 6.6));
  const pulse = 1 + Math.sin(t * 2.4) * 0.015;
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: FONT }}>
      {/* 拡大する円 */}
      <div style={{ position: "absolute", left: W / 2 - 110, top: 430, width: 220, height: 220,
        borderRadius: "50%", background: ACCENT,
        transform: `scale(${0.4 + kFill * 11})` }} />
      <div style={{ position: "absolute", inset: 0, transform: `translate(${sh.x}px,${sh.y}px)` }}>
        {kFill > 0.85 && (
          <>
            <div style={{ position: "absolute", left: W / 2 - 85, top: 210, width: 170,
              height: 170, border: "20px solid #fff", borderRadius: "50%",
              boxSizing: "border-box", transform: `scale(${pulse})`,
              opacity: eoq(seg(t, 1.2, 1.9)) }} />
            <div style={{ position: "absolute", inset: 0, opacity: 1 - o1 }}>
              <Slam at={1.5} top={470} size={92} color="#fff">
                {"貴社の「答え」は、\nもう出せます。"}
              </Slam>
            </div>
          </>
        )}
        {/* 切り替え: サービス名スラム＋CTA */}
        {k2 > 0 && (
          <div style={{ position: "absolute", inset: 0,
            transform: `translate(${shName.x}px,${shName.y}px)` }}>
            <Slam at={6.6} top={445} size={124} color="#fff">
              ADTURN for HR
            </Slam>
            <div style={{ position: "absolute", left: 0, right: 0, top: 630,
              textAlign: "center", fontSize: 33, fontWeight: 700, color: "#fff",
              opacity: k2 * 0.85 }}>
              Powered by デジブレ｜オリジナルAIエンジン（特許出願中）
            </div>
            <div style={{ position: "absolute", left: W / 2, top: 780,
              transform: `translateX(-50%) translateY(${18 * (1 - k2)}px)`, opacity: k2,
              background: "#fff", borderRadius: 46, padding: "0 52px", height: 92,
              display: "flex", alignItems: "center", color: ACCENT, fontSize: 40,
              fontWeight: 900, whiteSpace: "nowrap" }}>
              デモ実施中｜ぜひブースでご体験ください
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 930,
              textAlign: "center", fontSize: 34, fontWeight: 800, color: "#fff",
              opacity: k2 * 0.9, letterSpacing: "0.2em" }}>
              ADTANK GP
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/* --- master --- */
export const QuestionsBold: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: DARK }}>
      <Audio src={staticFile("q_bgm.mp3")} volume={0.55} />
      <Audio src={staticFile("q_narration.mp3")} />
      {Q_CUTS.slice(0, -1).map((from, i) => {
        const dur = Q_CUTS[i + 1] - from;
        let node: React.ReactNode;
        if (i === 0) node = <BIntro dur={dur} />;
        else if (i >= 1 && i <= 4) node = <BQuestion idx={i - 1} dur={dur} />;
        else if (i === 5) node = <BAnswers dur={dur} />;
        else if (i === 6) node = <BProof dur={dur} />;
        else node = <BCta dur={dur} />;
        return (
          <Sequence key={i} from={Math.round(from * FPS)}
            durationInFrames={Math.round(dur * FPS)}>
            {node}
          </Sequence>
        );
      })}
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 8,
        backgroundImage: GRAD, width: `${(frame / durationInFrames) * 100}%` }} />
    </AbsoluteFill>
  );
};
