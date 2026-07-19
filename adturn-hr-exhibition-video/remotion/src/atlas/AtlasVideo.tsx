import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {V3D_SCENES} from '../theme';

// ── ③ 解剖図鑑版: 羊皮紙×銅版画×学術図版。静かな知の高級感 ──

const SERIF = "'Noto Serif CJK JP', serif";
const INK = '#3B2F23';
const INK_SOFT = 'rgba(59,47,35,0.72)';
const INK_FAINT = 'rgba(59,47,35,0.45)';
const VERMILION = '#A63B22';
const GOLD = '#9C7A3C';
const HAIR = 'rgba(59,47,35,0.4)';

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const useFade = (at: number, dur = 30) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return {opacity: p, transform: `translateY(${(1 - p) * 12}px)`};
};
const useDraw = (at: number, dur = 30) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
};

const Caps: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: INK_FAINT, letterSpacing: '0.44em', ...style}}>{children}</div>
);

// 飾り罫（❖）
const Ornament: React.FC<{at?: number; style?: React.CSSProperties}> = ({at = 0, style}) => {
  const d = useDraw(at);
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, ...style}}>
      <div style={{width: 190 * d, height: 1, background: HAIR}} />
      <div style={{fontSize: 17, color: GOLD, opacity: d}}>❖</div>
      <div style={{width: 190 * d, height: 1, background: HAIR}} />
    </div>
  );
};

// ── ページ・クローム（羊皮紙＋二重罫＋ヘッダ） ──
const PLATES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const PageChrome: React.FC = () => {
  const frame = useCurrentFrame();
  const starts: number[] = [];
  let at = 0;
  for (const dur of Object.values(V3D_SCENES)) {
    starts.push(at);
    at += dur;
  }
  const idx = Math.max(0, starts.filter((s) => frame >= s).length - 1);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', fontFamily: SERIF}}>
      {/* 二重の飾り罫 */}
      <div style={{position: 'absolute', inset: 34, border: `2.5px solid ${INK}`, opacity: 0.75}} />
      <div style={{position: 'absolute', inset: 46, border: `1px solid ${INK}`, opacity: 0.5}} />
      {/* ヘッダ */}
      <div style={{position: 'absolute', top: 64, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontSize: 17, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.5em'}}>ANATOMIA COGNITIONIS — 認知の解剖学</div>
      </div>
      {/* フッタ: 図版番号 */}
      <div style={{position: 'absolute', bottom: 58, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontSize: 17, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.4em'}}>— PLATE {PLATES[idx] ?? 'I'} —</div>
      </div>
      {/* 経年のシミ（ごく薄く） */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 62%, rgba(120,90,50,0.13) 100%)'}} />
    </AbsoluteFill>
  );
};

// 引き出し線ラベル（図版風）
const FigLabel: React.FC<{at: number; x: number; y: number; len: number; side?: 'left' | 'right'; fig: string; jp: string}> = ({at, x, y, len, side = 'right', fig, jp}) => {
  const d = useDraw(at);
  const f = useFade(at + 14);
  const endX = side === 'right' ? x + len * d : x - len * d;
  return (
    <>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <circle cx={x} cy={y} r={3.2} fill={INK} opacity={d} />
        <line x1={x} y1={y} x2={endX} y2={y} stroke={INK} strokeWidth={1.1} opacity={0.8} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: side === 'right' ? x + len + 12 : undefined,
          right: side === 'left' ? 1920 - (x - len) + 12 : undefined,
          top: y - 24,
          textAlign: side === 'left' ? 'right' : 'left',
          fontFamily: SERIF,
          ...f,
        }}
      >
        <div style={{fontSize: 15, fontWeight: 700, color: VERMILION, letterSpacing: '0.2em'}}>{fig}</div>
        <div style={{fontSize: 23, fontWeight: 700, color: INK, letterSpacing: '0.1em', whiteSpace: 'nowrap'}}>{jp}</div>
      </div>
    </>
  );
};

// ── A1 技術宣言: 版画の頭部がひらき、版画の脳が現れる ──
const A1: React.FC = () => {
  const frame = useCurrentFrame();
  const SPLIT = 55;
  const split = interpolate(frame, [SPLIT, SPLIT + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const rise = interpolate(frame, [SPLIT + 14, SPLIT + 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const t1 = useFade(140, 34);
  const t2 = useFade(170);
  // 頭部プレート: 高さ700px表示（元1100x1400）カットY=430→表示215
  const HW = 550;
  const HH = 700;
  const CUTV = 215;
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {/* 図版: 頭部 */}
      <div style={{position: 'absolute', left: 990, top: 170, width: HW, height: HH}}>
        {/* 脳（背面から浮上） */}
        {frame >= SPLIT + 10 && (
          <Img
            src={staticFile('img/etch_brain.png')}
            style={{
              position: 'absolute',
              left: 60,
              top: 130 - rise * 195,
              width: 430,
              height: 430,
              objectFit: 'contain',
              transform: `rotate(${-4 + Math.sin(frame / 40) * 2}deg)`,
            }}
          />
        )}
        {/* フタ（左ヒンジで開く） */}
        <Img
          src={staticFile('img/etch_head_lid.png')}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `rotate(${-split * 52}deg) translateY(${-split * 10}px)`,
            transformOrigin: `95px ${CUTV}px`,
          }}
        />
        {/* 下側（顔） */}
        <Img src={staticFile('img/etch_head_lower.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain'}} />
      </div>
      <FigLabel at={SPLIT + 60} x={1245} y={300} len={180} side="right" fig="FIG. 1" jp="暗黙知" />
      <FigLabel at={SPLIT + 84} x={1030} y={560} len={160} side="left" fig="FIG. 2" jp="トップパフォーマー" />
      {/* 左: タイトル */}
      <div style={{position: 'absolute', left: 130, top: 330, ...t1}}>
        <Caps>TABULA I — DE TRANSSCRIPTIONE CEREBRI</Caps>
        <div style={{fontSize: 84, fontWeight: 700, color: INK, letterSpacing: '0.1em', lineHeight: 1.5, marginTop: 34}}>
          脳を、
          <br />
          <span style={{color: VERMILION}}>AIに転写</span>する。
        </div>
        <div style={{fontSize: 22, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.24em', marginTop: 30, ...t2}}>
          世界初のAIエンジン「デジブレ」 ｜ <span style={{color: GOLD}}>特許出願中</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── A2 技術の中身 ──
const A2: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 240;
  const count = Math.floor(interpolate(frame, [20, 95], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}));
  const h1 = useFade(8);
  const h3 = useFade(56);
  const brainIn = useFade(16, 34);
  const TAGS = ['人事', '採用コンサル', 'マーケ', 'ブランディング', '経営コンサル', 'アーティスト'];
  const b2h = useFade(250, 34);
  const b2l = useFade(280);
  const b2r = useFade(296);
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {!isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 130, top: 280}}>
            <div style={{...h1}}>
              <Caps>INDEX SPECIMINUM — 標本目録</Caps>
              <div style={{fontSize: 31, fontWeight: 700, color: INK, letterSpacing: '0.18em', marginTop: 16}}>各領域のトップパフォーマー</div>
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 26}}>
              <span style={{fontSize: 42, fontWeight: 700, color: INK_SOFT}}>約</span>
              <span style={{fontSize: 200, fontWeight: 700, color: VERMILION, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05}}>{count}</span>
              <span style={{fontSize: 42, fontWeight: 700, color: INK_SOFT}}>名</span>
            </div>
            <Ornament at={16} style={{justifyContent: 'flex-start', marginTop: 20}} />
            <div style={{fontSize: 33, fontWeight: 700, color: INK, letterSpacing: '0.16em', marginTop: 24, ...h3}}>
              の脳を、<span style={{color: VERMILION}}>コピー済み</span>。
            </div>
          </div>
          {/* 右: 版画の脳＋目録 */}
          <div style={{position: 'absolute', left: 1020, top: 210, width: 470, height: 470, ...brainIn}}>
            <Img src={staticFile('img/etch_brain.png')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            <Caps style={{textAlign: 'center', marginTop: 4}}>SPECIMEN — DIGIBRE CORE</Caps>
          </div>
          <div style={{position: 'absolute', left: 1540, top: 268, width: 260}}>
            {TAGS.map((t, i) => {
              const p = interpolate(frame, [36 + i * 14, 58 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={t} style={{display: 'flex', alignItems: 'baseline', marginBottom: 22, opacity: p}}>
                  <span style={{fontSize: 21, fontWeight: 700, color: INK, letterSpacing: '0.1em', whiteSpace: 'nowrap'}}>{t}</span>
                  <span style={{flex: 1, borderBottom: `1px dotted ${HAIR}`, margin: '0 8px'}} />
                  <span style={{fontSize: 15, fontWeight: 700, color: VERMILION}}>{String(i + 1).padStart(2, '0')}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 240, textAlign: 'center', ...b2h}}>
            <Caps style={{marginBottom: 22}}>DE QUALITATE — 出力の質について</Caps>
            <div style={{fontSize: 58, fontWeight: 700, color: INK, letterSpacing: '0.06em', whiteSpace: 'nowrap'}}>
              レシピではなく、<span style={{color: VERMILION}}>料理そのもの</span>を出力。
            </div>
            <Ornament at={266} style={{marginTop: 26}} />
          </div>
          <div style={{position: 'absolute', left: 300, top: 520, width: 560, textAlign: 'center', ...b2l}}>
            <Caps style={{marginBottom: 16}}>VULGARIS — 既存のAIツール</Caps>
            <div style={{fontSize: 24, fontWeight: 700, color: INK_FAINT, lineHeight: 1.9}}>
              一般的な回答を出力し、
              <br />
              業務を「補助」する。
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 505, width: 1, height: 250, background: HAIR}} />
          <div style={{position: 'absolute', right: 300, top: 505, width: 600, textAlign: 'center', ...b2r}}>
            <Caps style={{marginBottom: 16, color: GOLD}}>DIGIBRE — デジブレ</Caps>
            <div style={{fontSize: 25, fontWeight: 700, color: INK, lineHeight: 1.9}}>
              提案書・分析・戦略「そのもの」を
              <br />
              トップパフォーマー品質で出力。
            </div>
            <div style={{width: 110, height: 2, background: GOLD, margin: '20px auto 0'}} />
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── 章扉（共通） ──
const ACase: React.FC<{caps: string; jp: React.ReactNode; sub: string}> = ({caps, jp, sub}) => {
  const t0 = useFade(10);
  const t1 = useFade(26, 34);
  const t2 = useFade(70);
  return (
    <AbsoluteFill style={{fontFamily: SERIF, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center'}}>
        <Caps style={{...t0}}>{caps}</Caps>
        <Ornament at={16} style={{marginTop: 36}} />
        <div style={{fontSize: 112, fontWeight: 700, color: INK, letterSpacing: '0.12em', margin: '44px 0', whiteSpace: 'nowrap', ...t1}}>{jp}</div>
        <Ornament at={44} />
        <div style={{fontSize: 26, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.26em', marginTop: 40, ...t2}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 問い（共通） ──
const AQ: React.FC<{roman: string; index: string; lines: [string, string]; sub: string}> = ({roman, index, lines, sub}) => {
  const t0 = useFade(8);
  const l1 = useFade(22, 30);
  const l2 = useFade(42, 30);
  const s = useFade(78);
  const gp = useFade(4, 44);
  const brainIn = useFade(50, 40);
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      <div style={{position: 'absolute', right: 130, top: 150, fontSize: 400, fontWeight: 700, color: 'rgba(59,47,35,0.07)', lineHeight: 1, ...gp}}>
        {roman}
      </div>
      {/* 小さな版画の脳（右下の挿絵） */}
      <div style={{position: 'absolute', right: 190, bottom: 170, width: 300, height: 300, transform: brainIn.transform, opacity: brainIn.opacity * 0.5}}>
        <Img src={staticFile('img/etch_brain.png')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
      </div>
      <div style={{position: 'absolute', left: 130, top: 300}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, ...t0}}>
          <span style={{fontSize: 16, color: GOLD}}>❖</span>
          <Caps>{index}</Caps>
        </div>
        <div style={{fontSize: 60, fontWeight: 700, color: INK, letterSpacing: '0.06em', marginTop: 44, whiteSpace: 'nowrap', ...l1}}>{lines[0]}</div>
        <div style={{fontSize: 60, fontWeight: 700, color: INK, letterSpacing: '0.06em', marginTop: 22, whiteSpace: 'nowrap', ...l2}}>{lines[1]}</div>
        <div style={{width: 680, height: 1, background: HAIR, marginTop: 44}} />
        <div style={{fontSize: 24, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.18em', marginTop: 28, ...s}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 答え（HR） ──
const AAnswer: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 105;
  const h = useFade(6);
  const logoIn = useFade(114, 36);
  const subIn = useFade(154);
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {!isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 130, top: 250, ...h}}>
            <Caps>RESOLUTIO — 解</Caps>
            <div style={{fontSize: 54, fontWeight: 700, color: INK, letterSpacing: '0.08em', marginTop: 26}}>
              4つの問い、<span style={{color: VERMILION}}>すべてに答え</span>を。
            </div>
          </div>
          <div style={{position: 'absolute', left: 130, right: 130, top: 460}}>
            {QUESTIONS.map((q, i) => {
              const p = interpolate(frame, [24 + i * 14, 46 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={q} style={{opacity: p}}>
                  <div style={{display: 'flex', alignItems: 'baseline', padding: '22px 8px', gap: 24}}>
                    <span style={{fontSize: 18, color: GOLD}}>❖</span>
                    <span style={{fontSize: 32, fontWeight: 700, color: INK, letterSpacing: '0.12em'}}>{q}</span>
                    <span style={{flex: 1, borderBottom: `1px dotted ${HAIR}`, margin: '0 14px'}} />
                    <span style={{fontSize: 17, fontWeight: 700, color: VERMILION, letterSpacing: '0.3em'}}>SOLUTUM</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', ...logoIn}}>
            <Caps style={{marginBottom: 24}}>OPUS PRIMUM — 第一のプロダクト</Caps>
            <div style={{fontSize: 96, fontWeight: 700, color: INK, letterSpacing: '0.12em'}}>
              ADTURN <span style={{color: VERMILION}}>for HR</span>
            </div>
            <Ornament at={140} style={{marginTop: 24}} />
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 452, textAlign: 'center', ...subIn}}>
            <div style={{fontSize: 24, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.2em', whiteSpace: 'nowrap'}}>
              人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 540, transform: 'translateX(-50%)', display: 'flex', gap: 28}}>
            {REPORTS.map((r, i) => {
              const p = interpolate(frame, [176 + i * 13, 202 + i * 13], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={r} style={{width: 330, padding: '28px 0 24px', textAlign: 'center', border: `1.5px solid ${INK}`, opacity: p * 0.9, transform: `translateY(${(1 - p) * 18}px)`}}>
                  <div style={{fontSize: 14, fontWeight: 700, color: VERMILION, letterSpacing: '0.3em'}}>TAB. {['I', 'II', 'III', 'IV'][i]}</div>
                  <div style={{fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '0.04em', marginTop: 12, whiteSpace: 'nowrap'}}>{r}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── 一般論は一行もない ──
const ANoGen: React.FC = () => {
  const b1 = useFade(12, 30);
  const b1s = useFade(48);
  return (
    <AbsoluteFill style={{fontFamily: SERIF, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', ...b1}}>
        <Caps>NULLA VERBA VULGARIA</Caps>
        <Ornament at={16} style={{marginTop: 30}} />
        <div style={{fontSize: 92, fontWeight: 700, color: INK, letterSpacing: '0.1em', margin: '38px 0'}}>
          一般論は、<span style={{color: VERMILION}}>一行もない</span>。
        </div>
        <Ornament at={40} />
        <div style={{fontSize: 24, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.18em', marginTop: 34, ...b1s}}>
          貴社の公開情報から、トップパフォーマーの「脳」が診断。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── マーケ導入＋断言 ──
const AMIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 100;
  const l1 = useFade(116, 34);
  const l2 = useFade(148, 34);
  const s = useFade(198);
  const chart = useDraw(180, 70);
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {!isBeat2 && (
        <ACase
          caps="CAPUT II — MARKETING"
          jp={
            <>
              例えば、<span style={{color: VERMILION}}>マーケティング</span>。
            </>
          }
          sub="貴社のデジタル上の機会損失、見えていますか。"
        />
      )}
      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 130, top: 340}}>
            <Caps>DE DAMNO OCCASIONIS — 機会損失について</Caps>
            <div style={{fontSize: 62, fontWeight: 700, color: INK, letterSpacing: '0.06em', marginTop: 36, whiteSpace: 'nowrap', ...l1}}>
              デジタル上の<span style={{color: VERMILION}}>機会損失</span>を、可視化。
            </div>
            <div style={{fontSize: 62, fontWeight: 700, color: INK, letterSpacing: '0.06em', marginTop: 22, whiteSpace: 'nowrap', ...l2}}>
              打開策を、<span style={{color: VERMILION}}>具体的に出力</span>。
            </div>
            <div style={{fontSize: 23, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.18em', marginTop: 36, ...s}}>
              トップパフォーマーの脳が、診断から打開策まで。
            </div>
          </div>
          {/* インクのグラフ */}
          <div style={{position: 'absolute', right: 150, top: 640, width: 620, height: 280, opacity: Math.min(1, chart * 2)}}>
            <svg width="620" height="280" viewBox="0 0 620 280">
              <line x1="20" y1="250" x2="600" y2="250" stroke={INK} strokeWidth="1.4" opacity="0.6" />
              <line x1="20" y1="250" x2="20" y2="20" stroke={INK} strokeWidth="1.4" opacity="0.6" />
              <path
                d="M 30 90 L 120 110 L 210 105 L 300 150 L 370 205"
                fill="none"
                stroke={INK}
                strokeWidth="2.6"
                strokeDasharray="7 6"
                strokeDashoffset={(1 - Math.min(1, chart * 1.6)) * 500}
                opacity="0.55"
              />
              {chart > 0.55 && (
                <path
                  d="M 370 205 L 440 160 L 510 130 L 580 60"
                  fill="none"
                  stroke={VERMILION}
                  strokeWidth="3.4"
                  strokeDashoffset={(1 - Math.max(0, (chart - 0.55) / 0.45)) * 300}
                  strokeDasharray="300"
                />
              )}
              <circle cx="370" cy="205" r="7" fill="none" stroke={VERMILION} strokeWidth="2" opacity={chart > 0.5 ? 1 : 0} />
            </svg>
            <div style={{position: 'absolute', left: 150, top: 236, fontSize: 17, fontWeight: 700, color: INK_FAINT, letterSpacing: '0.2em'}}>機会損失</div>
            <div style={{position: 'absolute', right: 20, top: 18, fontSize: 18, fontWeight: 700, color: VERMILION, letterSpacing: '0.2em', opacity: chart > 0.7 ? 1 : 0}}>打開策</div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── 診断範囲→ロードマップ ──
const AMScope: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 160 ? 1 : frame < 310 ? 2 : 3;
  const h1 = useFade(6);
  const b2 = useFade(172, 34);
  const h3 = useFade(318);
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const ROAD = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {beat === 1 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', ...h1}}>
            <Caps>AMBITUS DIAGNOSIS — 診断範囲</Caps>
            <Ornament at={16} style={{marginTop: 24}} />
          </div>
          <div style={{position: 'absolute', left: '50%', top: 430, transform: 'translateX(-50%)', display: 'flex', gap: 32}}>
            {SCOPE.map((sc, i) => {
              const p = interpolate(frame, [14 + i * 11, 34 + i * 11], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={sc} style={{width: 340, padding: '40px 0', textAlign: 'center', border: `1.5px solid ${INK}`, opacity: p * 0.92, transform: `translateY(${(1 - p) * 20}px)`}}>
                  <div style={{fontSize: 14, fontWeight: 700, color: VERMILION, letterSpacing: '0.3em'}}>{['I', 'II', 'III', 'IV'][i]}</div>
                  <div style={{fontSize: 38, fontWeight: 700, color: INK, letterSpacing: '0.1em', marginTop: 14}}>{sc}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center', ...b2}}>
            <Caps>QUID ／ QUO ORDINE ／ QUOMODO</Caps>
            <div style={{fontSize: 70, fontWeight: 700, color: INK, letterSpacing: '0.08em', marginTop: 42, whiteSpace: 'nowrap'}}>
              何を、<span style={{color: VERMILION}}>どの順番で</span>、どう直すべきか。
            </div>
            <Ornament at={200} style={{marginTop: 34}} />
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', ...h3}}>
            <Caps>A DIAGNOSI AD OPUS — 診断から実行へ</Caps>
            <div style={{fontSize: 44, fontWeight: 700, color: INK, letterSpacing: '0.12em', marginTop: 28}}>
              診断で、<span style={{color: VERMILION}}>終わらせない</span>。
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 530, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center'}}>
            {ROAD.map((r, i) => {
              const p = interpolate(frame, [340 + i * 26, 366 + i * 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <React.Fragment key={r}>
                  <div style={{padding: '32px 50px', border: `1.5px solid ${INK}`, fontSize: 33, fontWeight: 700, color: INK, whiteSpace: 'nowrap', letterSpacing: '0.06em', opacity: p * 0.92, transform: `translateY(${(1 - p) * 18}px)`}}>
                    {r}
                  </div>
                  {i < 2 && (
                    <div style={{margin: '0 20px', fontSize: 30, color: GOLD, opacity: p}}>☞</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── マーケ版リビール ──
const AMReveal: React.FC = () => {
  const logoIn = useFade(14, 40);
  const sub = useFade(66);
  return (
    <AbsoluteFill style={{fontFamily: SERIF, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', ...logoIn}}>
        <Caps style={{marginBottom: 26}}>OPUS SECUNDUM — 第二のプロダクト</Caps>
        <Ornament at={20} />
        <div style={{fontSize: 98, fontWeight: 700, color: INK, letterSpacing: '0.1em', whiteSpace: 'nowrap', margin: '38px 0'}}>
          ADTURN <span style={{color: VERMILION}}>for Marketing</span>
        </div>
        <Ornament at={48} />
        <div style={{fontSize: 26, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.22em', marginTop: 38, ...sub}}>
          デジタル上の機会損失に、すべての打開策を。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── フィナーレ ──
const AFinale: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 215 ? 1 : frame < 510 ? 2 : frame < 645 ? 3 : 4;
  const h1 = useFade(6);
  const p1 = useFade(22, 36);
  const p2 = useFade(108, 36);
  const core = useFade(224, 36);
  const prods = useFade(292, 34);
  const tsub = useFade(334);
  const b3 = useFade(520, 40);
  const b4a = useFade(658, 40);
  const b4b = useFade(682);
  const b4c = useFade(702);
  const PRODUCTS = ['ADTURN for HR', 'ADTURN for Marketing'];
  const PSUB = ['人事・採用', 'マーケティング'];
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 38}}>
          <Caps style={{...h1}}>OPERA — デジブレから生まれたプロダクト</Caps>
          {[p1, p2].map((anim, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 28, padding: '24px 56px', border: `1.5px solid ${INK}`, ...anim}}>
              <span style={{fontSize: 46, fontWeight: 700, color: INK, letterSpacing: '0.04em'}}>{PRODUCTS[i]}</span>
              <span style={{fontSize: 20, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.12em'}}>{PSUB[i]}</span>
            </div>
          ))}
        </AbsoluteFill>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 40}}>
          <div style={{textAlign: 'center', ...core}}>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 22, padding: '20px 58px', border: `2px solid ${GOLD}`}}>
              <span style={{fontSize: 24, color: GOLD}}>❖</span>
              <span style={{fontSize: 54, fontWeight: 700, color: INK, letterSpacing: '0.1em'}}>デジブレ</span>
              <span style={{fontSize: 24, color: GOLD}}>❖</span>
            </div>
          </div>
          <div style={{width: 1, height: 54, background: HAIR, margin: '16px 0'}} />
          <div style={{display: 'flex', gap: 76, ...prods}}>
            {PRODUCTS.map((p, i) => (
              <div key={p} style={{padding: '20px 42px', border: `1.5px solid ${INK}`, textAlign: 'center'}}>
                <div style={{fontSize: 34, fontWeight: 700, color: INK}}>{p}</div>
                <div style={{fontSize: 18, fontWeight: 700, color: INK_SOFT, marginTop: 6, letterSpacing: '0.12em'}}>{PSUB[i]}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize: 29, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.14em', marginTop: 46, ...tsub}}>
            それぞれの分野の、トップパフォーマーの脳を<span style={{color: VERMILION}}>転写</span>して実現。
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center', ...b3}}>
            <Caps style={{marginBottom: 38}}>PROXIMUM — 貴社専用のモデルへ</Caps>
            <div style={{fontSize: 78, fontWeight: 700, color: INK, letterSpacing: '0.08em'}}>
              さあ、次は<span style={{color: VERMILION}}>貴社専用</span>に
            </div>
            <div style={{fontSize: 78, fontWeight: 700, color: INK, letterSpacing: '0.08em', marginTop: 18}}>カスタマイズを。</div>
          </div>
        </AbsoluteFill>
      )}
      {beat === 4 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center'}}>
            {/* 金の封蝋風シール */}
            <div style={{display: 'flex', justifyContent: 'center', ...b4a}}>
              <div
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 38% 32%, #C9A45C, ${GOLD} 60%, #6E5426 100%)`,
                  boxShadow: '0 8px 30px rgba(59,47,35,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: '#F6EBD4'}}>脳</span>
              </div>
            </div>
            <div style={{fontSize: 116, fontWeight: 700, color: INK, letterSpacing: '0.18em', marginTop: 42, ...b4a}}>
              デジ<span style={{color: VERMILION}}>ブレ</span>
            </div>
            <Ornament at={690} style={{marginTop: 24}} />
            <div style={{fontSize: 21, fontWeight: 700, color: INK_SOFT, letterSpacing: '0.16em', marginTop: 26, ...b4b}}>
              世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
            </div>
            <div style={{marginTop: 40, ...b4c}}>
              <span style={{display: 'inline-block', padding: '16px 50px', border: `1.5px solid ${INK}`, fontSize: 25, fontWeight: 700, color: INK, letterSpacing: '0.2em'}}>
                デモ実施中 ｜ ぜひブースでご体験ください
              </span>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ── 本編 ──
const NARRATION: Array<[string, number]> = [
  ['n1', 15], ['n2a', 327], ['n2b', 580], ['n3', 733], ['n4', 925], ['n5', 1176], ['n6', 1459],
  ['n7a', 1696], ['n7b', 1868], ['n8a', 2159], ['m0', 2298], ['m1', 2395], ['m2', 2732], ['m3', 2912],
  ['m4', 3107], ['m5', 3283], ['m6', 3444], ['m7', 3597], ['p0', 3805], ['p1', 4005], ['p2', 4222],
  ['p3', 4515], ['p4', 4668],
];

const SceneFade: React.FC<{duration: number; children: React.ReactNode}> = ({duration, children}) => {
  const frame = useCurrentFrame();
  const opacity =
    interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(frame, [duration - 14, duration - 2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const AdturnAtlasVideo: React.FC = () => {
  const s = V3D_SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const SCENE_LIST: Array<[keyof typeof V3D_SCENES, React.FC]> = [
    ['tech', A1],
    ['engine', A2],
    ['intro', () => (
      <ACase
        caps="CAPUT I — 採用"
        jp={
          <>
            例えば、<span style={{color: VERMILION}}>採用</span>。
          </>
        }
        sub="貴社は、この問いに、即答できますか。"
      />
    )],
    ['q1', () => <AQ roman="I" index="QUAESTIO I ／ III" lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']} sub="貴社が選ばれる「構造上の理由」を言えますか。" />],
    ['q2', () => <AQ roman="II" index="QUAESTIO II ／ III" lines={['「語っていない魅力」が、', '社内に眠っていませんか？']} sub="誰も武器だと気づいていない事実、ありませんか。" />],
    ['q3', () => <AQ roman="III" index="QUAESTIO III ／ III" lines={['面接で競合と迷う学生に、', '「何」と語りますか？']} sub="内定承諾の瀬戸際で使う「一言」、ありますか。" />],
    ['answer', AAnswer],
    ['nogen', ANoGen],
    ['mintro', AMIntro],
    ['mq1', () => <AQ roman="I" index="MERCATURA I ／ III" lines={['検索されたとき、', '選択肢に入っていますか？']} sub="比較検討の入口は、検索から始まります。" />],
    ['mq2', () => <AQ roman="II" index="MERCATURA II ／ III" lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']} sub="営業資料の強みと、Webの見え方は一致していますか。" />],
    ['mq3', () => <AQ roman="III" index="MERCATURA III ／ III" lines={['見込み客を、', '問い合わせまで運べていますか？']} sub="流入から問い合わせまでの導線、途切れていませんか。" />],
    ['mscope', AMScope],
    ['mreveal', AMReveal],
    ['finale', AFinale],
  ];
  return (
    <AbsoluteFill style={{background: '#EFE7D3'}}>
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {/* 羊皮紙 */}
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('img/paper_tile.png')})`, backgroundRepeat: 'repeat'}} />
      {SCENE_LIST.map(([key, Comp]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`A ${key}`}>
          <SceneFade duration={s[key]}>
            <Comp />
          </SceneFade>
        </Sequence>
      ))}
      <PageChrome />
    </AbsoluteFill>
  );
};
