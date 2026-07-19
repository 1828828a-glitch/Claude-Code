import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {V3D_SCENES} from '../theme';
import starData from './brainStars.json';

// ── ⑤ Cosmos版: 深宇宙×星座の脳。壮大な発明の物語 ──

const SANS = "'Noto Sans CJK JP', sans-serif";
const WHITE = '#F2F4FA';
const DIM = 'rgba(242,244,250,0.55)';
const GOLD = '#E8C87A';
const VIOLET = '#8F7CFF';

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const useFade = (at: number, dur = 30) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return {opacity: p, transform: `translateY(${(1 - p) * 16}px)`};
};

const Caps: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontFamily: SANS, fontSize: 17, fontWeight: 700, color: DIM, letterSpacing: '0.5em', ...style}}>{children}</div>
);

// ── 星空（全編共通・ゆっくりパララックス＋瞬き） ──
const Starfield: React.FC = () => {
  const frame = useCurrentFrame();
  const stars = Array.from({length: 150}, (_, i) => i);
  return (
    <AbsoluteFill>
      {/* 星雲 */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 60% 46% at 26% 30%, rgba(80,60,180,0.20), transparent 65%), radial-gradient(ellipse 52% 42% at 76% 66%, rgba(160,60,140,0.12), transparent 65%), radial-gradient(ellipse 70% 55% at 55% 40%, rgba(40,70,160,0.14), transparent 70%)',
        }}
      />
      {stars.map((i) => {
        const layer = i % 3;
        const x = random(`sx${i}`) * 1980 - (frame * (0.014 + layer * 0.02)) % 1980;
        const y = random(`sy${i}`) * 1080;
        const size = 1 + random(`ss${i}`) * (layer === 2 ? 2.6 : 1.4);
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / (26 + random(`st${i}`) * 40) + i));
        const goldish = random(`sg${i}`) > 0.86;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: (x + 1980) % 1980 - 30,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: goldish ? GOLD : WHITE,
              opacity: tw * (0.35 + layer * 0.3),
              boxShadow: size > 2.4 ? `0 0 ${size * 3}px rgba(242,244,250,0.6)` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ── 星座の脳（点が集まり、線で結ばれ、輝く） ──
// assembleAt: 星が集まり始める / connectAt: 線が結ばれ始める
const BrainConstellation: React.FC<{
  cx: number;
  cy: number;
  size: number;
  assembleAt: number;
  connectAt: number;
  glow?: number; // 0-1
  driftX?: number;
}> = ({cx, cy, size, assembleAt, connectAt, glow = 1, driftX = 0}) => {
  const frame = useCurrentFrame();
  const {stars, edges, outline} = starData as {stars: number[][]; edges: number[][]; outline: number[][]};
  const asm = interpolate(frame, [assembleAt, assembleAt + 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const pos = (p: number[], i: number, isOutline: boolean) => {
    // 集合前はランダムな遠方位置から飛んでくる
    const seed = isOutline ? `o${i}` : `s${i}`;
    const sx = cx + (random(`${seed}x`) - 0.5) * 2400;
    const sy = cy + (random(`${seed}y`) - 0.5) * 1500;
    const tx = cx + (p[0] - 0.5) * size + driftX + Math.sin(frame / 50 + i) * 2.5;
    const ty = cy + (p[1] - 0.5) * size + Math.cos(frame / 46 + i * 1.3) * 2.5;
    const d = Math.min(1, asm * (1 + (isOutline ? 0.15 : 0) + random(`${seed}d`) * 0.35));
    return [sx + (tx - sx) * d, sy + (ty - sy) * d];
  };
  const starPts = stars.map((p, i) => pos(p, i, false));
  const outPts = outline.map((p, i) => pos(p, i, true));
  const conn = interpolate(frame, [connectAt, connectAt + 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const nConn = Math.floor(edges.length * conn);
  const pulse = 0.75 + 0.25 * Math.sin(frame / 18);
  return (
    <>
      {/* 中心のほのかな星雲光 */}
      {conn > 0.35 && (
        <div
          style={{
            position: 'absolute',
            left: cx + driftX - size * 0.55,
            top: cy - size * 0.55,
            width: size * 1.1,
            height: size * 1.1,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(232,200,122,${0.16 * glow * conn}) 0%, rgba(143,124,255,${0.10 * glow * conn}) 45%, transparent 70%)`,
          }}
        />
      )}
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        {edges.slice(0, nConn).map(([a, b], i) => (
          <line
            key={i}
            x1={starPts[a][0]}
            y1={starPts[a][1]}
            x2={starPts[b][0]}
            y2={starPts[b][1]}
            stroke={GOLD}
            strokeWidth={1}
            opacity={0.5 * glow * pulse}
          />
        ))}
        {outPts.map(([x, y], i) => (
          <circle key={`o${i}`} cx={x} cy={y} r={1.6} fill={WHITE} opacity={0.55 * asm * glow} />
        ))}
        {starPts.map(([x, y], i) => {
          const big = random(`b${i}`) > 0.75;
          return (
            <circle
              key={`s${i}`}
              cx={x}
              cy={y}
              r={big ? 3.4 : 2.1}
              fill={big ? GOLD : WHITE}
              opacity={(0.75 + 0.25 * Math.sin(frame / 20 + i)) * asm * glow}
            />
          );
        })}
      </svg>
    </>
  );
};

// 星のリング（転写先）
const StarRing: React.FC<{cx: number; cy: number; r: number; at: number}> = ({cx, cy, r, at}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const N = 26;
  return (
    <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
      {Array.from({length: N}, (_, i) => {
        const a = (i / N) * Math.PI * 2 + frame / 90;
        return (
          <circle
            key={i}
            cx={cx + Math.cos(a) * r}
            cy={cy + Math.sin(a) * r * 0.42}
            r={i % 4 === 0 ? 3 : 1.8}
            fill={i % 3 === 0 ? GOLD : WHITE}
            opacity={p * (0.5 + 0.5 * Math.sin(frame / 16 + i))}
          />
        );
      })}
    </svg>
  );
};

// 転写の光流（脳→リング）
const LightStream: React.FC<{from: [number, number]; to: [number, number]; at: number; count?: number}> = ({from, to, at, count = 26}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return (
    <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
      {Array.from({length: count}, (_, i) => {
        const t0 = at + random(`ls${i}`) * 90;
        const life = 60 + random(`ll${i}`) * 50;
        const p = ((frame - t0) / life) % 1;
        if (frame < t0 || p < 0) return null;
        const arc = Math.sin(p * Math.PI) * (60 + random(`la${i}`) * 60);
        const x = from[0] + (to[0] - from[0]) * p;
        const y = from[1] + (to[1] - from[1]) * p - arc;
        return <circle key={i} cx={x} cy={y} r={1.6 + random(`lr${i}`) * 1.6} fill={i % 3 === 0 ? GOLD : WHITE} opacity={0.7 * Math.sin(p * Math.PI)} />;
      })}
    </svg>
  );
};

// ── S1 技術宣言: 星が集まり脳の星座に→リングへ転写 ──
const K1: React.FC = () => {
  const t1 = useFade(150, 36);
  const t2 = useFade(184);
  return (
    <AbsoluteFill style={{fontFamily: SANS}}>
      <BrainConstellation cx={1210} cy={430} size={520} assembleAt={20} connectAt={75} />
      <StarRing cx={1660} cy={250} r={120} at={120} />
      <LightStream from={[1210, 380]} to={[1660, 250]} at={150} />
      <div style={{position: 'absolute', left: 110, top: 360, ...t1}}>
        <Caps>ACROSS THE UNIVERSE OF MINDS</Caps>
        <div style={{fontSize: 86, fontWeight: 300, color: WHITE, letterSpacing: '0.1em', lineHeight: 1.5, marginTop: 32}}>
          脳を、
          <br />
          <span style={{color: GOLD, fontWeight: 700}}>AIに転写</span>する。
        </div>
        <div style={{fontSize: 21, fontWeight: 500, color: DIM, letterSpacing: '0.3em', marginTop: 28, ...t2}}>
          世界初のAIエンジン「デジブレ」 ｜ <span style={{color: GOLD}}>特許出願中</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── S2 技術の中身 ──
const K2: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 240;
  const count = Math.floor(interpolate(frame, [20, 95], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}));
  const h1 = useFade(8);
  const h3 = useFade(56);
  const TAGS = ['人事', '採用コンサル', 'マーケ', 'ブランディング', '経営コンサル', 'アーティスト'];
  const b2h = useFade(250, 34);
  const b2l = useFade(280);
  const b2r = useFade(296);
  return (
    <AbsoluteFill style={{fontFamily: SANS}}>
      {!isBeat2 && (
        <>
          <BrainConstellation cx={1310} cy={470} size={480} assembleAt={0} connectAt={0} glow={0.85} />
          <div style={{position: 'absolute', left: 110, top: 290}}>
            <div style={{...h1}}>
              <Caps>SOURCE — TOP PERFORMERS</Caps>
              <div style={{fontSize: 31, fontWeight: 700, color: WHITE, letterSpacing: '0.2em', marginTop: 16}}>各領域のトップパフォーマー</div>
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 30}}>
              <span style={{fontSize: 42, fontWeight: 300, color: DIM}}>約</span>
              <span style={{fontSize: 215, fontWeight: 200, color: GOLD, fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: '0 0 90px rgba(232,200,122,0.4)'}}>
                {count}
              </span>
              <span style={{fontSize: 42, fontWeight: 300, color: DIM}}>名</span>
            </div>
            <div style={{fontSize: 33, fontWeight: 700, color: WHITE, letterSpacing: '0.16em', marginTop: 36, ...h3}}>
              の脳を、<span style={{color: GOLD}}>コピー済み</span>。
            </div>
          </div>
          {/* 星座ラベルのように散らす */}
          {TAGS.map((t, i) => {
            const p = interpolate(frame, [36 + i * 14, 58 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
            const px = [1090, 1520, 1660, 1500, 1130, 1330][i];
            const py = [230, 250, 470, 700, 690, 155][i];
            return (
              <div key={t} style={{position: 'absolute', left: px, top: py, opacity: p, fontFamily: SANS}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <div style={{width: 5, height: 5, borderRadius: '50%', background: GOLD}} />
                  <span style={{fontSize: 22, fontWeight: 700, color: 'rgba(242,244,250,0.8)', letterSpacing: '0.16em'}}>{t}</span>
                </div>
              </div>
            );
          })}
        </>
      )}
      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', ...b2h}}>
            <Caps style={{marginBottom: 24}}>OUTPUT QUALITY</Caps>
            <div style={{fontSize: 60, fontWeight: 300, color: WHITE, letterSpacing: '0.08em', whiteSpace: 'nowrap'}}>
              レシピではなく、<span style={{color: GOLD, fontWeight: 700}}>料理そのもの</span>を出力。
            </div>
          </div>
          <div style={{position: 'absolute', left: 280, top: 520, width: 570, textAlign: 'center', ...b2l}}>
            <Caps style={{marginBottom: 18}}>GENERIC AI</Caps>
            <div style={{fontSize: 32, fontWeight: 700, color: 'rgba(242,244,250,0.4)', letterSpacing: '0.12em'}}>既存のAIツール</div>
            <div style={{fontSize: 23, fontWeight: 500, color: 'rgba(242,244,250,0.4)', lineHeight: 1.9, marginTop: 16}}>
              一般的な回答を出力し、
              <br />
              業務を「補助」する。
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 505, width: 1, height: 270, background: 'rgba(242,244,250,0.22)'}} />
          <div style={{position: 'absolute', right: 280, top: 512, width: 610, textAlign: 'center', ...b2r}}>
            <Caps style={{marginBottom: 18, color: GOLD}}>DIGIBRE</Caps>
            <div style={{fontSize: 36, fontWeight: 700, color: GOLD, letterSpacing: '0.14em'}}>デジブレ</div>
            <div style={{fontSize: 24, fontWeight: 700, color: WHITE, lineHeight: 1.9, marginTop: 16}}>
              提案書・分析・戦略「そのもの」を
              <br />
              トップパフォーマー品質で出力。
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── 章扉 ──
const KCase: React.FC<{caps: string; jp: React.ReactNode; sub: string}> = ({caps, jp, sub}) => {
  const frame = useCurrentFrame();
  const t0 = useFade(10);
  const t1 = useFade(24, 36);
  const t2 = useFade(68);
  // 流れ星
  const shoot = interpolate(frame, [30, 75], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: SANS, justifyContent: 'center', alignItems: 'center'}}>
      {shoot > 0 && shoot < 1 && (
        <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
          <line
            x1={300 + shoot * 1300}
            y1={220 + shoot * 180}
            x2={300 + shoot * 1300 - 130}
            y2={220 + shoot * 180 - 22}
            stroke={GOLD}
            strokeWidth={2}
            opacity={Math.sin(shoot * Math.PI)}
            strokeLinecap="round"
          />
        </svg>
      )}
      <div style={{textAlign: 'center'}}>
        <Caps style={{...t0}}>{caps}</Caps>
        <div style={{fontSize: 116, fontWeight: 300, color: WHITE, letterSpacing: '0.14em', margin: '46px 0', whiteSpace: 'nowrap', ...t1}}>{jp}</div>
        <div style={{fontSize: 26, fontWeight: 500, color: DIM, letterSpacing: '0.3em', ...t2}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 問い ──
const KQ: React.FC<{num: string; index: string; lines: [string, string]; sub: string}> = ({num, index, lines, sub}) => {
  const t0 = useFade(8);
  const l1 = useFade(22, 30);
  const l2 = useFade(42, 30);
  const s = useFade(78);
  const gp = useFade(4, 44);
  return (
    <AbsoluteFill style={{fontFamily: SANS}}>
      <div style={{position: 'absolute', right: 100, top: 90, fontSize: 520, fontWeight: 100, color: 'rgba(232,200,122,0.08)', lineHeight: 1, ...gp}}>
        {num}
      </div>
      <div style={{position: 'absolute', left: 110, top: 300}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, ...t0}}>
          <div style={{width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: `0 0 12px ${GOLD}`}} />
          <Caps>{index}</Caps>
        </div>
        <div style={{fontSize: 62, fontWeight: 300, color: WHITE, letterSpacing: '0.06em', marginTop: 44, whiteSpace: 'nowrap', ...l1}}>{lines[0]}</div>
        <div style={{fontSize: 62, fontWeight: 300, color: WHITE, letterSpacing: '0.06em', marginTop: 22, whiteSpace: 'nowrap', ...l2}}>{lines[1]}</div>
        <div style={{width: 700, height: 1, background: 'rgba(242,244,250,0.25)', marginTop: 46}} />
        <div style={{fontSize: 24, fontWeight: 500, color: DIM, letterSpacing: '0.2em', marginTop: 28, ...s}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 答え（HR） ──
const KAnswer: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 105;
  const h = useFade(6);
  const logoIn = useFade(114, 36);
  const subIn = useFade(154);
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  return (
    <AbsoluteFill style={{fontFamily: SANS}}>
      {!isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 110, top: 250, ...h}}>
            <Caps>RESOLUTION</Caps>
            <div style={{fontSize: 54, fontWeight: 300, color: WHITE, letterSpacing: '0.08em', marginTop: 26}}>
              4つの問い、<span style={{color: GOLD, fontWeight: 700}}>すべてに答え</span>を。
            </div>
          </div>
          <div style={{position: 'absolute', left: 110, right: 110, top: 460}}>
            {QUESTIONS.map((q, i) => {
              const p = interpolate(frame, [24 + i * 14, 46 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={q} style={{opacity: p}}>
                  <div style={{display: 'flex', alignItems: 'center', padding: '22px 8px', gap: 24}}>
                    <div style={{width: 7, height: 7, borderRadius: '50%', background: GOLD, boxShadow: `0 0 14px ${GOLD}`}} />
                    <span style={{fontSize: 32, fontWeight: 700, color: WHITE, letterSpacing: '0.12em'}}>{q}</span>
                    <span style={{flex: 1}} />
                    <Caps style={{color: GOLD, fontSize: 15}}>ANSWERED</Caps>
                  </div>
                  <div style={{height: 1, background: 'rgba(242,244,250,0.15)'}} />
                </div>
              );
            })}
          </div>
        </>
      )}
      {isBeat2 && (
        <>
          <StarRing cx={960} cy={260} r={200} at={110} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center', ...logoIn}}>
            <div style={{fontSize: 96, fontWeight: 300, color: WHITE, letterSpacing: '0.16em'}}>
              ADTURN <span style={{color: GOLD, fontWeight: 700}}>for HR</span>
            </div>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center', ...subIn}}>
            <div style={{fontSize: 24, fontWeight: 500, color: DIM, letterSpacing: '0.22em', whiteSpace: 'nowrap'}}>
              人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 530, transform: 'translateX(-50%)', display: 'flex', gap: 30}}>
            {REPORTS.map((r, i) => {
              const p = interpolate(frame, [176 + i * 13, 202 + i * 13], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={r} style={{width: 330, padding: '30px 0 26px', textAlign: 'center', border: '1px solid rgba(232,200,122,0.4)', borderRadius: 6, background: 'rgba(232,200,122,0.05)', opacity: p, transform: `translateY(${(1 - p) * 22}px)`}}>
                  <Caps style={{fontSize: 12, color: GOLD}}>{String(i + 1).padStart(2, '0')}</Caps>
                  <div style={{fontSize: 26, fontWeight: 700, color: WHITE, letterSpacing: '0.04em', marginTop: 12, whiteSpace: 'nowrap'}}>{r}</div>
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
const KNoGen: React.FC = () => {
  const b1 = useFade(12, 30);
  const b1s = useFade(48);
  return (
    <AbsoluteFill style={{fontFamily: SANS, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', ...b1}}>
        <Caps>NO BOILERPLATE</Caps>
        <div style={{fontSize: 94, fontWeight: 300, color: WHITE, letterSpacing: '0.1em', marginTop: 42}}>
          一般論は、<span style={{color: GOLD, fontWeight: 700}}>一行もない</span>。
        </div>
        <div style={{fontSize: 24, fontWeight: 500, color: DIM, letterSpacing: '0.2em', marginTop: 38, ...b1s}}>
          貴社の公開情報から、トップパフォーマーの「脳」が診断。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── マーケ導入 ──
const KMIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 100;
  const l1 = useFade(116, 34);
  const l2 = useFade(148, 34);
  const s = useFade(198);
  return (
    <AbsoluteFill style={{fontFamily: SANS}}>
      {!isBeat2 && (
        <KCase
          caps="CASE 02 — MARKETING"
          jp={
            <>
              例えば、<span style={{color: GOLD, fontWeight: 700}}>マーケティング</span>。
            </>
          }
          sub="貴社のデジタル上の機会損失、見えていますか。"
        />
      )}
      {isBeat2 && (
        <>
          <BrainConstellation cx={1440} cy={520} size={420} assembleAt={100} connectAt={130} glow={0.7} />
          <div style={{position: 'absolute', left: 110, top: 350}}>
            <Caps>DIGITAL OPPORTUNITY LOSS</Caps>
            <div style={{fontSize: 64, fontWeight: 300, color: WHITE, letterSpacing: '0.06em', marginTop: 38, whiteSpace: 'nowrap', ...l1}}>
              デジタル上の<span style={{color: GOLD, fontWeight: 700}}>機会損失</span>を、可視化。
            </div>
            <div style={{fontSize: 64, fontWeight: 300, color: WHITE, letterSpacing: '0.06em', marginTop: 24, whiteSpace: 'nowrap', ...l2}}>
              打開策を、<span style={{color: GOLD, fontWeight: 700}}>具体的に出力</span>。
            </div>
            <div style={{fontSize: 24, fontWeight: 500, color: DIM, letterSpacing: '0.2em', marginTop: 40, ...s}}>
              トップパフォーマーの脳が、診断から打開策まで。
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── 診断範囲→ロードマップ ──
const KMScope: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 160 ? 1 : frame < 310 ? 2 : 3;
  const h1 = useFade(6);
  const b2 = useFade(172, 34);
  const h3 = useFade(318);
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const ROAD = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  return (
    <AbsoluteFill style={{fontFamily: SANS}}>
      {beat === 1 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center', ...h1}}>
            <Caps>DIAGNOSTIC SCOPE — 診断範囲</Caps>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 420, transform: 'translateX(-50%)', display: 'flex', gap: 34}}>
            {SCOPE.map((sc, i) => {
              const p = interpolate(frame, [14 + i * 11, 34 + i * 11], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={sc} style={{width: 340, padding: '40px 0', textAlign: 'center', border: '1px solid rgba(232,200,122,0.4)', borderRadius: 6, background: 'rgba(232,200,122,0.05)', opacity: p, transform: `translateY(${(1 - p) * 22}px)`}}>
                  <Caps style={{fontSize: 12, color: GOLD}}>{String(i + 1).padStart(2, '0')}</Caps>
                  <div style={{fontSize: 40, fontWeight: 700, color: WHITE, letterSpacing: '0.1em', marginTop: 14}}>{sc}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center', ...b2}}>
            <Caps>WHAT ／ IN WHAT ORDER ／ HOW</Caps>
            <div style={{fontSize: 72, fontWeight: 300, color: WHITE, letterSpacing: '0.08em', marginTop: 44, whiteSpace: 'nowrap'}}>
              何を、<span style={{color: GOLD, fontWeight: 700}}>どの順番で</span>、どう直すべきか。
            </div>
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 310, textAlign: 'center', ...h3}}>
            <Caps>FROM DIAGNOSIS TO EXECUTION</Caps>
            <div style={{fontSize: 46, fontWeight: 300, color: WHITE, letterSpacing: '0.12em', marginTop: 28}}>
              診断で、<span style={{color: GOLD, fontWeight: 700}}>終わらせない</span>。
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 540, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center'}}>
            {ROAD.map((r, i) => {
              const p = interpolate(frame, [340 + i * 26, 366 + i * 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <React.Fragment key={r}>
                  <div style={{padding: '32px 50px', border: '1px solid rgba(232,200,122,0.4)', borderRadius: 6, background: 'rgba(232,200,122,0.05)', fontSize: 33, fontWeight: 700, color: WHITE, whiteSpace: 'nowrap', letterSpacing: '0.06em', opacity: p, transform: `translateY(${(1 - p) * 18}px)`}}>
                    {r}
                  </div>
                  {i < 2 && (
                    <svg key={`ar${i}`} width="80" height="10" style={{margin: '0 6px', opacity: p}}>
                      <line x1="0" y1="5" x2="68" y2="5" stroke={GOLD} strokeWidth="1.4" />
                      <path d="M 68 1 L 76 5 L 68 9" fill="none" stroke={GOLD} strokeWidth="1.4" />
                    </svg>
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
const KMReveal: React.FC = () => {
  const logoIn = useFade(14, 40);
  const sub = useFade(66);
  return (
    <AbsoluteFill style={{fontFamily: SANS, justifyContent: 'center', alignItems: 'center'}}>
      <StarRing cx={960} cy={330} r={240} at={8} />
      <div style={{textAlign: 'center', ...logoIn}}>
        <div style={{fontSize: 100, fontWeight: 300, color: WHITE, letterSpacing: '0.12em', whiteSpace: 'nowrap'}}>
          ADTURN <span style={{color: GOLD, fontWeight: 700}}>for Marketing</span>
        </div>
        <div style={{fontSize: 26, fontWeight: 500, color: DIM, letterSpacing: '0.26em', marginTop: 44, ...sub}}>
          デジタル上の機会損失に、すべての打開策を。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── フィナーレ ──
const KFinale: React.FC = () => {
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
  const pulse = 1 + Math.sin(frame / 14) * 0.04;
  return (
    <AbsoluteFill style={{fontFamily: SANS}}>
      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 40}}>
          <Caps style={{...h1}}>PRODUCTS — デジブレから生まれたプロダクト</Caps>
          {[p1, p2].map((anim, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 28, padding: '26px 58px', border: '1px solid rgba(232,200,122,0.4)', borderRadius: 8, background: 'rgba(232,200,122,0.05)', ...anim}}>
              <span style={{fontSize: 46, fontWeight: 700, color: WHITE, letterSpacing: '0.04em'}}>{PRODUCTS[i]}</span>
              <span style={{fontSize: 20, fontWeight: 500, color: DIM, letterSpacing: '0.12em'}}>{PSUB[i]}</span>
            </div>
          ))}
        </AbsoluteFill>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 120}}>
          <BrainConstellation cx={960} cy={250} size={330} assembleAt={215} connectAt={235} glow={0.9} />
          <div style={{textAlign: 'center', marginTop: 130, ...core}}>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 22, padding: '20px 58px', borderRadius: 999, border: `1.5px solid ${GOLD}`, background: 'rgba(232,200,122,0.08)', boxShadow: '0 0 60px rgba(232,200,122,0.2)'}}>
              <span style={{fontSize: 54, fontWeight: 700, color: WHITE, letterSpacing: '0.1em'}}>デジブレ</span>
            </div>
          </div>
          <div style={{display: 'flex', gap: 76, marginTop: 46, ...prods}}>
            {PRODUCTS.map((p, i) => (
              <div key={p} style={{padding: '20px 42px', border: '1px solid rgba(232,200,122,0.4)', borderRadius: 8, background: 'rgba(232,200,122,0.05)', textAlign: 'center'}}>
                <div style={{fontSize: 34, fontWeight: 700, color: WHITE}}>{p}</div>
                <div style={{fontSize: 18, fontWeight: 500, color: DIM, marginTop: 6, letterSpacing: '0.12em'}}>{PSUB[i]}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize: 29, fontWeight: 500, color: DIM, letterSpacing: '0.14em', marginTop: 44, ...tsub}}>
            それぞれの分野の、トップパフォーマーの脳を<span style={{color: GOLD, fontWeight: 700}}>転写</span>して実現。
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center', ...b3}}>
            <Caps style={{marginBottom: 40}}>NEXT — YOUR OWN MODEL</Caps>
            <div style={{fontSize: 80, fontWeight: 300, color: WHITE, letterSpacing: '0.08em'}}>
              さあ、次は<span style={{color: GOLD, fontWeight: 700}}>貴社専用</span>に
            </div>
            <div style={{fontSize: 80, fontWeight: 300, color: WHITE, letterSpacing: '0.08em', marginTop: 18}}>カスタマイズを。</div>
          </div>
        </AbsoluteFill>
      )}
      {beat === 4 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          {/* 中心に輝く恒星 */}
          <div
            style={{
              position: 'absolute',
              top: 150,
              left: '50%',
              width: 190,
              height: 190,
              transform: `translateX(-50%) scale(${pulse})`,
              borderRadius: '50%',
              background: `radial-gradient(circle, #FFF6DF 0%, ${GOLD} 30%, rgba(232,200,122,0.25) 62%, transparent 75%)`,
              boxShadow: '0 0 120px rgba(232,200,122,0.5)',
              opacity: b4a.opacity,
            }}
          />
          <div style={{textAlign: 'center', marginTop: 130}}>
            <div style={{fontSize: 118, fontWeight: 300, color: WHITE, letterSpacing: '0.22em', ...b4a}}>
              デジ<span style={{color: GOLD, fontWeight: 700}}>ブレ</span>
            </div>
            <div style={{fontSize: 21, fontWeight: 500, color: DIM, letterSpacing: '0.2em', marginTop: 28, ...b4b}}>
              世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
            </div>
            <div style={{marginTop: 44, ...b4c}}>
              <span style={{display: 'inline-block', padding: '18px 52px', border: `1px solid ${GOLD}`, borderRadius: 999, fontSize: 26, fontWeight: 700, color: WHITE, letterSpacing: '0.22em', background: 'rgba(232,200,122,0.07)'}}>
                デモ実施中 ｜ ぜひブースでご体験ください
              </span>
            </div>
            <div style={{fontSize: 19, fontWeight: 700, color: DIM, letterSpacing: '0.5em', marginTop: 46, ...b4c}}>ADTANK GP</div>
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

export const AdturnCosmosVideo: React.FC = () => {
  const s = V3D_SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const SCENE_LIST: Array<[keyof typeof V3D_SCENES, React.FC]> = [
    ['tech', K1],
    ['engine', K2],
    ['intro', () => (
      <KCase
        caps="CASE 01 — RECRUITMENT"
        jp={
          <>
            例えば、<span style={{color: GOLD, fontWeight: 700}}>採用</span>。
          </>
        }
        sub="貴社は、この問いに、即答できますか。"
      />
    )],
    ['q1', () => <KQ num="1" index="QUESTION 01 ／ 03" lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']} sub="貴社が選ばれる「構造上の理由」を言えますか。" />],
    ['q2', () => <KQ num="2" index="QUESTION 02 ／ 03" lines={['「語っていない魅力」が、', '社内に眠っていませんか？']} sub="誰も武器だと気づいていない事実、ありませんか。" />],
    ['q3', () => <KQ num="3" index="QUESTION 03 ／ 03" lines={['面接で競合と迷う学生に、', '「何」と語りますか？']} sub="内定承諾の瀬戸際で使う「一言」、ありますか。" />],
    ['answer', KAnswer],
    ['nogen', KNoGen],
    ['mintro', KMIntro],
    ['mq1', () => <KQ num="1" index="MARKETING 01 ／ 03" lines={['検索されたとき、', '選択肢に入っていますか？']} sub="比較検討の入口は、検索から始まります。" />],
    ['mq2', () => <KQ num="2" index="MARKETING 02 ／ 03" lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']} sub="営業資料の強みと、Webの見え方は一致していますか。" />],
    ['mq3', () => <KQ num="3" index="MARKETING 03 ／ 03" lines={['見込み客を、', '問い合わせまで運べていますか？']} sub="流入から問い合わせまでの導線、途切れていませんか。" />],
    ['mscope', KMScope],
    ['mreveal', KMReveal],
    ['finale', KFinale],
  ];
  return (
    <AbsoluteFill style={{background: '#030512'}}>
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      <Starfield />
      {SCENE_LIST.map(([key, Comp]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`K ${key}`}>
          <SceneFade duration={s[key]}>
            <Comp />
          </SceneFade>
        </Sequence>
      ))}
      {/* ビネット */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 92% 80% at 50% 46%, transparent 55%, rgba(0,0,10,0.55) 100%)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
