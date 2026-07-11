import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FONT, SCENES, TOTAL_FRAMES} from '../theme';
import {Callout, DIM, GOLD, INK, LINE, LuxBackdrop, LuxHeadCanvas, RED} from './LuxDemo';

// ── ラグジュアリー版 本編シーン（暗背景・金アクセント・極小タイポの一貫言語） ──

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// フェードアップ（上品な出方の基本形）
const useFU = (at: number, dur = 24) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  return {opacity: p, transform: `translateY(${(1 - p) * 22}px)`};
};

// 線が引かれる
const useDraw = (at: number, dur = 26) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
};

const Caps: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.42em', ...style}}>{children}</div>
);

// ── 常設HUDフレーム（全編通し・グローバルフレームで進行） ──
export const LuxFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [6, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // シーン境界
  const starts: number[] = [];
  let at = 0;
  for (const dur of Object.values(SCENES)) {
    starts.push(at);
    at += dur;
  }
  const idx = starts.filter((s) => frame >= s).length - 1;
  const PHASES = ['SCAN', 'ENGINE', 'CASE', 'Q1', 'Q2', 'Q3', 'ANSWER', 'CONTACT'];
  const STATES = [
    'TRANSCRIBING',
    'ENGINE SPEC',
    'CASE STUDY',
    'QUESTION 01',
    'QUESTION 02',
    'QUESTION 03',
    'RESOLVED',
    'CONTACT',
  ];
  const pct = Math.floor((frame / TOTAL_FRAMES) * 100);
  const done = idx >= 6;

  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: 54, left: 70, right: 70, height: 1, background: LINE, opacity: boot}} />
      {/* 左上ブランド */}
      <div style={{position: 'absolute', top: 72, left: 70, opacity: boot}}>
        <Caps>ADTANK GP — PRESENTATION LAB ／ EXHIBIT 01</Caps>
        <div style={{fontSize: 30, fontWeight: 800, color: INK, letterSpacing: '0.24em', marginTop: 12}}>
          ADTURN <span style={{color: GOLD}}>for HR</span>
        </div>
      </div>
      {/* 右上ステータス */}
      <div style={{position: 'absolute', top: 74, right: 70, textAlign: 'right', opacity: boot}}>
        <Caps>STATE</Caps>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', marginTop: 10}}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: done ? GOLD : RED,
              opacity: done ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(frame / 9)),
            }}
          />
          <div style={{fontSize: 23, fontWeight: 700, color: INK, letterSpacing: '0.3em'}}>{STATES[idx] ?? STATES[0]}</div>
        </div>
      </div>
      {/* 下部フェーズバー */}
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 64, opacity: boot}}>
        <div style={{position: 'relative', height: 2, background: 'rgba(232,236,240,0.16)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: GOLD, opacity: 0.85}} />
          <div
            style={{
              position: 'absolute',
              left: `${pct}%`,
              top: -5,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#0A0E13',
              border: `2px solid ${GOLD}`,
              transform: 'translateX(-6px)',
            }}
          />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 16, alignItems: 'baseline'}}>
          <div style={{display: 'flex', gap: 38}}>
            {PHASES.map((p, i) => (
              <div
                key={p}
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  color: i === idx ? INK : 'rgba(232,236,240,0.28)',
                  borderBottom: i === idx ? `2px solid ${GOLD}` : '2px solid transparent',
                  paddingBottom: 6,
                }}
              >
                {p}
              </div>
            ))}
          </div>
          <div style={{fontSize: 22, fontWeight: 700, color: GOLD, letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums'}}>
            {String(pct).padStart(3, '0')}%
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── L1 技術宣言（315f）: 3Dヘッド＋コピー＋引き出し線 ──
export const L1Tech: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t1 = useFU(36);
  const t2 = useFU(58);
  const rule = useDraw(30);
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <AbsoluteFill style={{opacity: fade}}>
        <LuxHeadCanvas openStart={62} openDur={50} />
      </AbsoluteFill>
      {/* 左: メインコピー */}
      <div style={{position: 'absolute', left: 70, top: 360}}>
        <div style={{width: 64, height: 2, background: GOLD, transform: `scaleX(${rule})`, transformOrigin: 'left'}} />
        <div style={{fontSize: 84, fontWeight: 800, color: INK, letterSpacing: '0.1em', lineHeight: 1.35, marginTop: 30, ...t1}}>
          脳を、
          <br />
          <span style={{color: GOLD}}>AIに転写</span>する。
        </div>
        <div style={{fontSize: 19, fontWeight: 500, color: DIM, letterSpacing: '0.26em', marginTop: 28, ...t2}}>
          世界初のAIエンジン「デジブレ」｜ <span style={{color: GOLD}}>特許出願中</span>
        </div>
      </div>
      {/* 右: 引き出し線 */}
      <Callout at={150} side="right" y={300} len={200} jp="意思決定基準" en="DECISION LOGIC" anchor={{x: 1065, y: 330}} />
      <Callout at={180} side="right" y={470} len={250} jp="言語化されない経験則" en="TACIT HEURISTICS" anchor={{x: 1085, y: 500}} />
      <Callout at={210} side="right" y={640} len={220} jp="一流の質問力" en="QUESTION DESIGN" anchor={{x: 1055, y: 665}} />
    </AbsoluteFill>
  );
};

// ── L2 技術の中身（400f）: 約40名スペック → レシピではなく料理そのもの ──
export const L2Engine: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 240;

  const count = Math.floor(
    interpolate(frame, [20, 95], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut})
  );
  const h1 = useFU(8);
  const h2 = useFU(20);
  const h3 = useFU(56);
  const brainIn = useFU(14, 30);
  const rule = useDraw(12);

  const TAGS = ['人事', '採用コンサル', 'マーケ', 'ブランディング', '経営コンサル', 'アーティスト'];

  const b2h = useFU(250);
  const b2l = useFU(276);
  const b2r = useFU(292);
  const b2rule = useDraw(268);

  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {!isBeat2 && (
        <>
          {/* 左: カウンター */}
          <div style={{position: 'absolute', left: 70, top: 300}}>
            <div style={{...h1}}>
              <Caps>SOURCE — TOP PERFORMERS</Caps>
              <div style={{fontSize: 30, fontWeight: 700, color: INK, letterSpacing: '0.2em', marginTop: 12}}>
                各領域のトップパフォーマー
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 34, ...h2}}>
              <span style={{fontSize: 46, fontWeight: 700, color: DIM}}>約</span>
              <span style={{fontSize: 220, fontWeight: 800, color: GOLD, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
                {count}
              </span>
              <span style={{fontSize: 46, fontWeight: 700, color: DIM}}>名</span>
            </div>
            <div style={{width: 560, height: 1, background: LINE, marginTop: 30, transform: `scaleX(${rule})`, transformOrigin: 'left'}} />
            <div style={{fontSize: 34, fontWeight: 700, color: INK, letterSpacing: '0.18em', marginTop: 26, ...h3}}>
              の脳を、<span style={{color: GOLD}}>コピー済み</span>。
            </div>
          </div>

          {/* 右: 標本フレームの脳＋領域インデックス */}
          <div style={{position: 'absolute', left: 1010, top: 250, width: 500, height: 460, ...brainIn}}>
            {/* コーナーブラケット */}
            {[
              {left: 0, top: 0, bt: 1, bl: 1},
              {right: 0, top: 0, bt: 1, br: 1},
              {left: 0, bottom: 0, bb: 1, bl: 1},
              {right: 0, bottom: 0, bb: 1, br: 1},
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 34,
                  height: 34,
                  left: c.left,
                  right: c.right,
                  top: c.top,
                  bottom: c.bottom,
                  borderTop: c.bt ? `1.5px solid ${GOLD}` : undefined,
                  borderBottom: c.bb ? `1.5px solid ${GOLD}` : undefined,
                  borderLeft: c.bl ? `1.5px solid ${GOLD}` : undefined,
                  borderRight: c.br ? `1.5px solid ${GOLD}` : undefined,
                  opacity: 0.9,
                }}
              />
            ))}
            <Img
              src={staticFile('img/brain.png')}
              style={{position: 'absolute', left: 50, top: 30, width: 400, height: 400, objectFit: 'contain'}}
            />
            <Caps style={{position: 'absolute', left: 0, bottom: -34}}>SPECIMEN — DIGIBRE CORE</Caps>
          </div>
          <div style={{position: 'absolute', left: 1580, top: 262}}>
            {TAGS.map((t, i) => {
              const p = interpolate(frame, [36 + i * 14, 56 + i * 14], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: easeOut,
              });
              return (
                <div key={t} style={{display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 26, opacity: p, transform: `translateX(${(1 - p) * 16}px)`}}>
                  <span style={{fontSize: 14, fontWeight: 500, color: GOLD, letterSpacing: '0.2em'}}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{fontSize: 24, fontWeight: 700, color: INK, letterSpacing: '0.14em', whiteSpace: 'nowrap'}}>{t}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', ...b2h}}>
            <Caps style={{marginBottom: 20}}>OUTPUT QUALITY</Caps>
            <div style={{fontSize: 62, fontWeight: 800, color: INK, letterSpacing: '0.08em', whiteSpace: 'nowrap'}}>
              レシピではなく、<span style={{color: GOLD}}>料理そのもの</span>を出力。
            </div>
          </div>
          {/* 比較2カラム */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 470,
              transform: 'translateX(-50%)',
              width: 2,
              height: 300,
              background: LINE,
              opacity: b2rule,
            }}
          />
          <div style={{position: 'absolute', left: 250, top: 510, width: 600, textAlign: 'center', ...b2l}}>
            <Caps style={{marginBottom: 18}}>GENERIC AI</Caps>
            <div style={{fontSize: 36, fontWeight: 700, color: 'rgba(232,236,240,0.45)', letterSpacing: '0.12em'}}>既存のAIツール</div>
            <div style={{fontSize: 24, fontWeight: 500, color: 'rgba(232,236,240,0.4)', lineHeight: 1.9, marginTop: 18}}>
              一般的な回答を出力し、
              <br />
              業務を「補助」する。
            </div>
          </div>
          <div style={{position: 'absolute', right: 250, top: 496, width: 640, textAlign: 'center', ...b2r}}>
            <Caps style={{marginBottom: 18, color: GOLD}}>DIGIBRE</Caps>
            <div style={{fontSize: 40, fontWeight: 800, color: GOLD, letterSpacing: '0.14em'}}>デジブレ</div>
            <div style={{fontSize: 25, fontWeight: 700, color: INK, lineHeight: 1.9, marginTop: 18}}>
              提案書・分析・戦略「そのもの」を
              <br />
              トップパフォーマー品質で出力。
            </div>
            <div style={{width: 120, height: 2, background: GOLD, margin: '24px auto 0'}} />
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── L3 問いの宣言（190f） ──
export const L3Intro: React.FC = () => {
  const t0 = useFU(10);
  const t1 = useFU(24, 30);
  const t2 = useFU(64);
  const rTop = useDraw(16);
  const rBot = useDraw(40);
  return (
    <AbsoluteFill style={{fontFamily: FONT, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center'}}>
        <Caps style={{...t0}}>CASE 01 — RECRUITMENT</Caps>
        <div style={{width: 620, height: 1, background: LINE, margin: '38px auto 0', transform: `scaleX(${rTop})`}} />
        <div style={{fontSize: 128, fontWeight: 800, color: INK, letterSpacing: '0.12em', margin: '40px 0', ...t1}}>
          例えば、<span style={{color: GOLD}}>採用</span>。
        </div>
        <div style={{width: 620, height: 1, background: LINE, margin: '0 auto', transform: `scaleX(${rBot})`}} />
        <div style={{fontSize: 26, fontWeight: 500, color: DIM, letterSpacing: '0.3em', marginTop: 40, ...t2}}>
          貴社は、この問いに、即答できますか。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 問いシーン共通 ──
const LuxQuestion: React.FC<{
  num: string;
  index: string;
  lines: [string, string];
  sub: string;
  extra?: React.ReactNode;
}> = ({num, index, lines, sub, extra}) => {
  const t0 = useFU(8);
  const l1 = useFU(22, 28);
  const l2 = useFU(40, 28);
  const s = useFU(74);
  const rule = useDraw(34);
  const gp = useFU(4, 40);
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {/* ゴーストの数字 */}
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: 40,
          fontSize: 560,
          fontWeight: 800,
          color: 'rgba(232,236,240,0.05)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          ...gp,
        }}
      >
        {num}
      </div>
      <div style={{position: 'absolute', left: 70, top: 300}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, ...t0}}>
          <div style={{width: 40, height: 2, background: GOLD}} />
          <Caps>{index}</Caps>
        </div>
        <div style={{fontSize: 64, fontWeight: 800, color: INK, letterSpacing: '0.08em', marginTop: 40, whiteSpace: 'nowrap', ...l1}}>
          {lines[0]}
        </div>
        <div style={{fontSize: 64, fontWeight: 800, color: INK, letterSpacing: '0.08em', marginTop: 20, whiteSpace: 'nowrap', ...l2}}>
          {lines[1]}
        </div>
        <div style={{width: 760, height: 1, background: LINE, marginTop: 44, transform: `scaleX(${rule})`, transformOrigin: 'left'}} />
        <div style={{fontSize: 24, fontWeight: 500, color: DIM, letterSpacing: '0.22em', marginTop: 30, ...s}}>{sub}</div>
      </div>
      {extra}
    </AbsoluteFill>
  );
};

export const LQ1: React.FC = () => (
  <LuxQuestion
    num="1"
    index="QUESTION 01 ／ 03"
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

export const LQ2: React.FC = () => {
  const frame = useCurrentFrame();
  const WORDS = ['定着率', '技術力', '歴史', '福利厚生', '外部評価'];
  const killer = useFU(180);
  return (
    <LuxQuestion
      num="2"
      index="QUESTION 02 ／ 03"
      lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
      sub="誰も武器だと気づいていない事実、ありませんか。"
      extra={
        <>
          {/* 眠っている資産のインデックス */}
          <div style={{position: 'absolute', right: 130, top: 330}}>
            {WORDS.map((w, i) => {
              const p = interpolate(frame, [30 + i * 16, 52 + i * 16], [0, 0.5], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div key={w} style={{display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 30, opacity: p}}>
                  <span style={{fontSize: 13, fontWeight: 500, color: GOLD, letterSpacing: '0.2em'}}>ASSET {String(i + 1).padStart(2, '0')}</span>
                  <span style={{fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '0.16em'}}>{w}</span>
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 70, top: 760, ...killer}}>
            <div style={{fontSize: 44, fontWeight: 800, color: GOLD, letterSpacing: '0.1em'}}>
              魅力の不足ではなく、翻訳の不足。
            </div>
            <div style={{width: 300, height: 2, background: GOLD, marginTop: 18}} />
          </div>
        </>
      }
    />
  );
};

export const LQ3: React.FC = () => {
  const frame = useCurrentFrame();
  const bubble = useFU(70);
  return (
    <LuxQuestion
      num="3"
      index="QUESTION 03 ／ 03"
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      sub="内定承諾の瀬戸際で使う「一言」、ありますか。"
      extra={
        <div style={{position: 'absolute', right: 170, top: 640, textAlign: 'center', ...bubble}}>
          <div
            style={{
              display: 'flex',
              gap: 26,
              justifyContent: 'center',
              padding: '38px 60px',
              border: `1px solid ${LINE}`,
              borderRadius: 4,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: GOLD,
                  opacity: 0.25 + 0.75 * Math.max(0, Math.sin(frame / 7 - i * 1.05)),
                }}
              />
            ))}
          </div>
          <Caps style={{marginTop: 18}}>貴社の「一言」 ＝ ？</Caps>
        </div>
      }
    />
  );
};

// ── L7 答え（460f） ──
const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
const REPORTS_EN = ['POSITIONING MAP', 'HIDDEN ASSETS', 'TARGET PERSONA', 'TALK SCRIPT'];

export const L7Answer: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 105;
  const h = useFU(6);
  const logoIn = useFU(114, 30);
  const subIn = useFU(150);
  const lineIn = useFU(250);

  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {!isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 70, top: 250, ...h}}>
            <Caps>RESOLUTION</Caps>
            <div style={{fontSize: 58, fontWeight: 800, color: INK, letterSpacing: '0.1em', marginTop: 24}}>
              4つの問い、<span style={{color: GOLD}}>すべてに答え</span>を。
            </div>
          </div>
          <div style={{position: 'absolute', left: 70, right: 70, top: 470}}>
            {QUESTIONS.map((q, i) => {
              const p = interpolate(frame, [24 + i * 14, 46 + i * 14], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: easeOut,
              });
              return (
                <div key={q} style={{opacity: p, transform: `translateY(${(1 - p) * 14}px)`}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 26, padding: '26px 10px'}}>
                    <svg width="34" height="34" viewBox="0 0 34 34">
                      <circle cx="17" cy="17" r="15.5" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.7" />
                      <path
                        d="M 10 17.5 L 15 22.5 L 24.5 12.5"
                        fill="none"
                        stroke={GOLD}
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeDasharray="22"
                        strokeDashoffset={22 * (1 - p)}
                      />
                    </svg>
                    <span style={{fontSize: 34, fontWeight: 700, color: INK, letterSpacing: '0.14em'}}>{q}</span>
                    <span style={{flex: 1}} />
                    <Caps style={{color: GOLD}}>ANSWERED</Caps>
                  </div>
                  <div style={{height: 1, background: LINE, opacity: 0.6}} />
                </div>
              );
            })}
          </div>
        </>
      )}

      {isBeat2 && (
        <>
          {/* センターロックアップ */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', ...logoIn}}>
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30}}>
              <div style={{width: 54, height: 54, borderRadius: '50%', border: `3px solid ${GOLD}`}} />
              <div style={{fontSize: 96, fontWeight: 800, color: INK, letterSpacing: '0.16em'}}>
                ADTURN <span style={{color: GOLD}}>for HR</span>
              </div>
            </div>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 372, textAlign: 'center', ...subIn}}>
            <div style={{fontSize: 24, fontWeight: 500, color: DIM, letterSpacing: '0.24em', whiteSpace: 'nowrap'}}>
              人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
            </div>
          </div>
          {/* ドシエカード */}
          <div style={{position: 'absolute', left: '50%', top: 470, transform: 'translateX(-50%)', display: 'flex', gap: 26}}>
            {REPORTS.map((r, i) => {
              const p = interpolate(frame, [170 + i * 13, 196 + i * 13], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: easeOut,
              });
              return (
                <div
                  key={r}
                  style={{
                    width: 330,
                    height: 250,
                    background: '#111722',
                    borderTop: `2px solid ${GOLD}`,
                    boxShadow: '0 22px 44px rgba(0,0,0,0.45)',
                    padding: '28px 28px',
                    opacity: p,
                    transform: `translateY(${(1 - p) * 26}px)`,
                  }}
                >
                  <Caps style={{fontSize: 12, color: GOLD}}>
                    {String(i + 1).padStart(2, '0')} — {REPORTS_EN[i]}
                  </Caps>
                  <div style={{fontSize: 28, fontWeight: 700, color: INK, letterSpacing: '0.08em', marginTop: 16, whiteSpace: 'nowrap'}}>{r}</div>
                  <div style={{marginTop: 26}}>
                    {[92, 70, 82].map((w, j) => (
                      <div key={j} style={{height: 7, width: `${w}%`, background: 'rgba(232,236,240,0.14)', borderRadius: 3, marginBottom: 12}} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 790, textAlign: 'center', ...lineIn}}>
            <div style={{fontSize: 17, fontWeight: 500, color: DIM, letterSpacing: '0.3em', whiteSpace: 'nowrap'}}>
              市場ポジションの設計 ｜ 眠れる魅力の発掘 ｜ 狙うべき人材の特定 ｜ 面接で使うトークスクリプト
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── L8 CTA（440f） ──
export const L8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 104 ? 1 : frame < 328 ? 2 : 3;

  const doc = useFU(8, 30);
  const b1 = useFU(20, 28);
  const b1s = useFU(56);

  const b2 = useFU(116, 30);
  const b2u = useDraw(146, 30);
  const b2s = useFU(160);

  const ring = useFU(336, 30);
  const logo = useFU(348, 30);
  const cta = useFU(370);

  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {beat === 1 && (
        <>
          {/* ダークドキュメント */}
          <div style={{position: 'absolute', left: 200, top: 240, width: 420, height: 560, background: '#111722', borderTop: `2px solid ${GOLD}`, boxShadow: '0 26px 52px rgba(0,0,0,0.5)', padding: 34, ...doc}}>
            <Caps style={{fontSize: 13, color: GOLD}}>戦略レポート ｜ P.21</Caps>
            <div style={{height: 1, background: LINE, margin: '20px 0 26px'}} />
            {[88, 72, 94, 60, 84, 78, 90, 52, 86, 68].map((w, i) => {
              const lit = Math.floor(frame / 6) % 10 === i;
              return (
                <div
                  key={i}
                  style={{
                    height: 9,
                    width: `${w}%`,
                    background: lit ? 'rgba(216,179,106,0.5)' : 'rgba(232,236,240,0.12)',
                    borderRadius: 4,
                    marginBottom: 20,
                  }}
                />
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 760, top: 380}}>
            <div style={{...b1}}>
              <Caps>NO BOILERPLATE</Caps>
              <div style={{fontSize: 88, fontWeight: 800, color: INK, letterSpacing: '0.1em', lineHeight: 1.5, marginTop: 26}}>
                一般論は、
                <br />
                <span style={{color: GOLD}}>一行もない。</span>
              </div>
            </div>
            <div style={{fontSize: 23, fontWeight: 500, color: DIM, letterSpacing: '0.2em', lineHeight: 2.1, marginTop: 30, ...b1s}}>
              貴社の公開情報から、人事・採用
              <br />
              トップパフォーマーの「脳」が診断。
            </div>
          </div>
        </>
      )}

      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{...b2}}>
              <Caps>READY TO DELIVER</Caps>
              <div style={{fontSize: 84, fontWeight: 800, color: INK, letterSpacing: '0.08em', marginTop: 36, whiteSpace: 'nowrap'}}>
                貴社の「答え」は、<span style={{color: GOLD}}>もう出せます</span>。
              </div>
            </div>
            <div style={{width: 900, height: 2, background: GOLD, margin: '42px auto 0', transform: `scaleX(${b2u})`}} />
            <div style={{fontSize: 27, fontWeight: 500, color: DIM, letterSpacing: '0.26em', marginTop: 40, ...b2s}}>
              トップパフォーマーの脳を、あなたの武器に。
            </div>
          </div>
        </AbsoluteFill>
      )}

      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{display: 'flex', justifyContent: 'center', ...ring}}>
              <div style={{width: 110, height: 110, borderRadius: '50%', border: `4px solid ${GOLD}`, boxShadow: '0 0 60px rgba(216,179,106,0.25)'}} />
            </div>
            <div style={{fontSize: 116, fontWeight: 800, color: INK, letterSpacing: '0.18em', marginTop: 50, ...logo}}>
              ADTURN <span style={{color: GOLD}}>for HR</span>
            </div>
            <div style={{marginTop: 54, ...cta}}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 22,
                  padding: '22px 52px',
                  border: `1.5px solid ${GOLD}`,
                  borderRadius: 3,
                }}
              >
                <span style={{fontSize: 20, fontWeight: 800, color: GOLD, letterSpacing: '0.3em'}}>デモ実施中</span>
                <span style={{width: 1, height: 24, background: LINE}} />
                <span style={{fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '0.24em'}}>ぜひブースでご体験ください</span>
              </div>
              <Caps style={{marginTop: 44, letterSpacing: '0.6em'}}>ADTANK GP</Caps>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const LuxBackground: React.FC = LuxBackdrop;
