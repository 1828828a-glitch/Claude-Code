import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FONT, V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {Bracket, CYAN, SpaceBackdrop, VCanvas, V_BG, V_DIM, V_WHITE, V_YELLOW} from './VaienceDemo';

// ── バイエンス風 フル版(4775f = 159s) ──
// 漆黒の宇宙+青白リムライト+シミュレーションHUD。台本・構成・ナレーションは本編と同一。

const SCENES = V3D_SCENES;
const TOTAL = V3D_TOTAL_FRAMES;
const WHITE = V_WHITE;
const DIM = V_DIM;
const YELLOW = V_YELLOW;

const NARRATION: Array<[string, number]> = [
  ['n1', 15], ['n2a', 327], ['n2b', 580], ['n3', 733], ['n4', 925], ['n5', 1176], ['n6', 1459],
  ['n7a', 1696], ['n7b', 1868], ['n8a', 2159], ['m0', 2298], ['m1', 2395], ['m2', 2732], ['m3', 2912],
  ['m4', 3107], ['m5', 3283], ['m6', 3444], ['m7', 3597], ['p0', 3805], ['p1', 4005], ['p2', 4222],
  ['p3', 4515], ['p4', 4668],
];

const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.12, 0.12, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const bgmVolume = (f: number) => {
  const base = 0.9 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return base * endFade;
};

// ── 共通: HUDフレーム(ブラケット+左上見出し+右上状態) ──
const Hud: React.FC<{title: string; state?: string; sub?: string}> = ({title, state = 'TRANSCRIBING', sub}) => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [4, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none'}}>
      <Bracket x={54} y={54} o={boot} />
      <Bracket x={1820} y={54} flipX o={boot} />
      <Bracket x={54} y={980} flipY o={boot} />
      <Bracket x={1820} y={980} flipX flipY o={boot} />
      <div style={{position: 'absolute', top: 66, left: 124, opacity: boot}}>
        <div style={{fontSize: 16, fontWeight: 700, color: CYAN, letterSpacing: '0.4em'}}>{title}</div>
        {sub && <div style={{fontSize: 13, fontWeight: 500, color: DIM, letterSpacing: '0.3em', marginTop: 8}}>{sub}</div>}
      </div>
      <div style={{position: 'absolute', top: 66, right: 124, opacity: boot}}>
        <div style={{display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end'}}>
          <div style={{width: 9, height: 9, borderRadius: '50%', background: CYAN, opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 10))}} />
          <div style={{fontSize: 16, fontWeight: 700, color: WHITE, letterSpacing: '0.34em'}}>{state}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// フェード付きシーンラッパー(宇宙背景共通)
const Space: React.FC<{children: React.ReactNode; dur: number}> = ({children, dur}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14, dur - 14, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: V_BG, fontFamily: FONT}}>
      <SpaceBackdrop />
      <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 110% 90% at 50% 46%, transparent 52%, rgba(0,0,0,0.62) 100%)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

const Rise: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * 26}px)`, ...style}}>{children}</div>;
};

// ══ S1 技術宣言(315f): 3Dシミュレーション ══
const VTech: React.FC = () => {
  const local = useCurrentFrame();
  const t1 = interpolate(local, [30, 58], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(local, [120, 148], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const badge = interpolate(local, [255, 280], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Space dur={315}>
      <VCanvas openStart={150} openDur={55} dur={315} />
      <Hud title="SIMULATION ── 脳転写プロセス" sub="BRAIN TRANSCRIPTION ／ DIGIBRE ENGINE ／ 特許出願中" state={local < 150 ? 'OBSERVING' : 'TRANSCRIBING'} />
      {out1 > 0 && (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 120, opacity: out1}}>
          <div style={{fontSize: 42, fontWeight: 700, color: DIM, letterSpacing: '0.1em', opacity: t1}}>トップパフォーマーの</div>
          <div style={{fontSize: 88, fontWeight: 900, color: WHITE, marginTop: 12, opacity: t1, textShadow: '0 0 40px rgba(84,216,255,0.35)'}}>
            脳を、AIに<span style={{color: YELLOW}}>転写</span>する。
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 110, opacity: badge}}>
        <div style={{fontSize: 52, fontWeight: 900, color: WHITE}}>
          世界初のAIエンジン──<span style={{color: CYAN}}>デジブレ</span>。
        </div>
        <div style={{fontSize: 21, fontWeight: 700, color: DIM, letterSpacing: '0.3em', marginTop: 16}}>ADTURN ／ 特許出願中</div>
      </AbsoluteFill>
    </Space>
  );
};

// ══ S2 技術の中身(400f): 星団=転写済みの40の脳 ══
const VEngine: React.FC = () => {
  const local = useCurrentFrame();
  const count = Math.round(interpolate(local, [20, 100], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const b2 = interpolate(local, [235, 258], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const b1o = 1 - b2;
  const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];
  // 星団の擬似ランダム配置
  const stars = Array.from({length: 40}).map((_, i) => {
    const a = i * 2.399963;
    const r = 40 + Math.sqrt(i) * 52;
    return {x: 1280 + Math.cos(a) * r * 1.15, y: 480 + Math.sin(a) * r * 0.72};
  });
  return (
    <Space dur={400}>
      <Hud title="ARCHIVE ── 転写済みの脳" sub="COPIED MINDS ／ DIGIBRE ENGINE" />
      {b1o > 0 && (
        <AbsoluteFill style={{opacity: b1o}}>
          <div style={{position: 'absolute', left: 130, top: 300}}>
            <div style={{fontSize: 44, fontWeight: 700, color: DIM}}>各領域のトップパフォーマー</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6}}>
              <span style={{fontSize: 76, fontWeight: 900, color: WHITE}}>約</span>
              <span style={{fontSize: 250, fontWeight: 900, color: CYAN, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, textShadow: '0 0 60px rgba(84,216,255,0.5)'}}>
                {count}
              </span>
              <span style={{fontSize: 76, fontWeight: 900, color: WHITE}}>名</span>
            </div>
            <div style={{fontSize: 60, fontWeight: 900, color: WHITE}}>
              の脳を、<span style={{color: YELLOW}}>コピー済み。</span>
            </div>
            <Rise at={110}>
              <div style={{fontSize: 27, fontWeight: 500, color: DIM, marginTop: 30}}>脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。</div>
            </Rise>
          </div>
          {/* 星団 */}
          <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
            {stars.map((st, i) => (
              <g key={i} opacity={i < count ? 1 : 0.1}>
                <circle cx={st.x} cy={st.y} r={i % 6 === 0 ? 5 : 3.2} fill={i % 9 === 4 ? YELLOW : '#BFE6FF'} opacity={0.5 + 0.5 * Math.abs(Math.sin(local / 22 + i))} />
                {i % 6 === 0 && <circle cx={st.x} cy={st.y} r={11} fill="none" stroke={CYAN} strokeWidth={1} opacity={0.4} />}
              </g>
            ))}
          </svg>
          <div style={{position: 'absolute', right: 130, bottom: 150, display: 'flex', gap: 12, flexWrap: 'wrap', width: 640, justifyContent: 'flex-end'}}>
            {DOMAINS.map((d, i) => (
              <div
                key={d}
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: WHITE,
                  border: `1.5px solid rgba(84,216,255,0.45)`,
                  padding: '9px 20px',
                  borderRadius: 999,
                  opacity: interpolate(local, [40 + i * 10, 56 + i * 10], [0, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
                  letterSpacing: '0.08em',
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {/* B2: レシピではなく料理 */}
      {b2 > 0 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: b2}}>
          <div style={{fontSize: 78, fontWeight: 900, color: WHITE, textAlign: 'center', textShadow: '0 0 50px rgba(84,216,255,0.3)'}}>
            レシピではなく、<span style={{color: YELLOW}}>料理そのもの</span>を出力。
          </div>
          <div style={{display: 'flex', gap: 60, marginTop: 70}}>
            <Rise at={268}>
              <div style={{width: 600, padding: '40px 46px', border: '1.5px solid rgba(234,244,255,0.28)', borderRadius: 8}}>
                <div style={{fontSize: 34, fontWeight: 700, color: DIM}}>既存のAIツール</div>
                <div style={{fontSize: 28, fontWeight: 500, color: DIM, marginTop: 18, lineHeight: 1.7}}>
                  一般的な回答を出力し、
                  <br />
                  業務を「補助」する。
                </div>
              </div>
            </Rise>
            <Rise at={284}>
              <div style={{width: 640, padding: '40px 46px', border: `2px solid ${CYAN}`, borderRadius: 8, boxShadow: '0 0 60px rgba(84,216,255,0.25)'}}>
                <div style={{fontSize: 34, fontWeight: 900, color: CYAN}}>デジブレ</div>
                <div style={{fontSize: 28, fontWeight: 700, color: WHITE, marginTop: 18, lineHeight: 1.7}}>
                  提案書・分析・戦略「そのもの」を
                  <br />
                  トップパフォーマー品質で出力。
                </div>
              </div>
            </Rise>
          </div>
        </AbsoluteFill>
      )}
    </Space>
  );
};

// ══ S3 例えば、採用。(190f) ══
const VIntro: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <Space dur={190}>
      <Hud title="CASE 01 ── 採用" state="SCANNING" />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Rise at={8}>
          <div style={{fontSize: 150, fontWeight: 900, color: WHITE, textShadow: '0 0 80px rgba(84,216,255,0.4)'}}>
            例えば、<span style={{color: CYAN}}>採用</span>。
          </div>
        </Rise>
        <Rise at={64}>
          <div style={{fontSize: 40, fontWeight: 700, color: DIM, marginTop: 40}}>貴社は、この問いに即答できますか。</div>
        </Rise>
        {/* 流れ星 */}
        <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
          <line
            x1={1500 - local * 4.5}
            y1={140 + local * 1.9}
            x2={1500 - local * 4.5 + 130}
            y2={140 + local * 1.9 - 55}
            stroke="#CFE4FF"
            strokeWidth={2.5}
            opacity={local > 40 && local < 110 ? 0.8 : 0}
            strokeLinecap="round"
          />
        </svg>
      </AbsoluteFill>
    </Space>
  );
};

// ══ 問いシーン共通 ══
const VQuestion: React.FC<{
  num: string;
  tag: string;
  lines: string[];
  sub: string;
  active: number;
  dur: number;
  extra?: React.ReactNode;
}> = ({num, tag, lines, sub, active, dur, extra}) => {
  const local = useCurrentFrame();
  return (
    <Space dur={dur}>
      <Hud title={`QUESTION ── ${tag}`} state="ANALYZING" />
      {/* 巨大ゴースト数字(発光) */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          bottom: -160,
          fontSize: 880,
          fontWeight: 100,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: '2px rgba(84,216,255,0.3)',
          textShadow: '0 0 120px rgba(84,216,255,0.14)',
          fontFamily: FONT,
        }}
      >
        {num}
      </div>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 130, paddingRight: 110}}>
        <div style={{fontSize: 24, fontWeight: 700, color: CYAN, letterSpacing: '0.4em', marginBottom: 34, opacity: interpolate(local, [6, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          QUESTION {num}
        </div>
        {lines.map((l, i) => (
          <Rise key={l} at={18 + i * 14}>
            <div style={{fontSize: 84, fontWeight: 900, color: WHITE, lineHeight: 1.36, textShadow: '0 0 60px rgba(84,216,255,0.25)'}}>{l}</div>
          </Rise>
        ))}
        <Rise at={62}>
          <div style={{fontSize: 30, fontWeight: 500, color: DIM, marginTop: 30}}>{sub}</div>
        </Rise>
        {extra}
      </AbsoluteFill>
      <div style={{position: 'absolute', bottom: 70, left: 130, display: 'flex', gap: 16}}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{width: i === active ? 54 : 16, height: 5, background: i === active ? CYAN : 'rgba(234,244,255,0.3)', borderRadius: 3}} />
        ))}
      </div>
    </Space>
  );
};

const VQ1: React.FC = () => (
  <VQuestion num="1" tag="POSITION" active={0} dur={250}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

const VQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['定着率', '技術力', '歴史', '福利厚生', '外部評価'];
  return (
    <VQuestion num="2" tag="HIDDEN ASSETS" active={1} dur={295}
      lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
      sub="社内では当たり前すぎて、誰も武器だと気づいていない事実。"
      extra={
        <div style={{display: 'flex', gap: 18, marginTop: 40, flexWrap: 'wrap'}}>
          {WORDS.map((w, i) => (
            <div
              key={w}
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: '#BFE6FF',
                border: '1.5px solid rgba(84,216,255,0.4)',
                borderRadius: 999,
                padding: '12px 28px',
                opacity: 0.2 + 0.5 * Math.abs(Math.sin(local / 20 + i * 1.4)),
                textShadow: '0 0 30px rgba(84,216,255,0.6)',
              }}
            >
              {w}
            </div>
          ))}
        </div>
      }
    />
  );
};

const VQ3: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <VQuestion num="3" tag="CLOSING" active={2} dur={240}
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
      extra={
        <div style={{marginTop: 44, display: 'flex', alignItems: 'center', gap: 26}}>
          <div style={{width: 360, height: 120, border: '2px dashed rgba(84,216,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{width: 16, height: 16, borderRadius: '50%', background: CYAN, opacity: 0.25 + 0.75 * Math.max(0, Math.sin(local / 7 - i))}} />
            ))}
          </div>
          <div style={{fontSize: 30, fontWeight: 700, color: YELLOW}}>貴社の「一言」＝ ？</div>
        </div>
      }
    />
  );
};

// ══ S7 答え(460f) ══
const VAnswer: React.FC = () => {
  const local = useCurrentFrame();
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  const b2 = interpolate(local, [100, 122], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Space dur={460}>
      <Hud title="SOLUTION ── 答えの存在証明" state="RESOLVED" />
      {b2 < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - b2}}>
          <div style={{fontSize: 74, fontWeight: 900, color: WHITE}}>
            4つの問い、<span style={{color: CYAN}}>すべてに答え</span>を。
          </div>
          <div style={{display: 'flex', gap: 28, marginTop: 60}}>
            {QUESTIONS.map((q, i) => (
              <Rise key={q} at={20 + i * 11}>
                <div style={{position: 'relative', fontSize: 30, fontWeight: 700, color: WHITE, border: '1.5px solid rgba(84,216,255,0.45)', borderRadius: 10, padding: '34px 30px'}}>
                  {q}
                  <div style={{position: 'absolute', top: -18, right: -18, width: 40, height: 40, borderRadius: '50%', background: CYAN, color: '#04121E', fontSize: 26, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    ✓
                  </div>
                </div>
              </Rise>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: b2}}>
          <div style={{fontSize: 100, fontWeight: 900, color: WHITE, textShadow: '0 0 80px rgba(84,216,255,0.4)'}}>
            ADTURN <span style={{color: CYAN}}>for HR</span>
          </div>
          <Rise at={140}>
            <div style={{fontSize: 32, fontWeight: 700, color: DIM, marginTop: 16}}>人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート</div>
          </Rise>
          <div style={{display: 'flex', gap: 26, marginTop: 54}}>
            {REPORTS.map((r, i) => (
              <Rise key={r} at={170 + i * 12}>
                <div style={{width: 290, border: '1.5px solid rgba(84,216,255,0.4)', borderRadius: 10, padding: '24px 22px', background: 'rgba(84,216,255,0.05)'}}>
                  <div style={{fontSize: 17, fontWeight: 700, color: CYAN, letterSpacing: '0.3em'}}>REPORT {String(i + 1).padStart(2, '0')}</div>
                  <div style={{fontSize: 28, fontWeight: 900, color: WHITE, marginTop: 12, minHeight: 80}}>{r}</div>
                  {[0, 1, 2].map((j) => (
                    <div key={j} style={{height: 5, background: 'rgba(234,244,255,0.2)', marginTop: 9, width: `${86 - j * 16}%`, borderRadius: 3}} />
                  ))}
                </div>
              </Rise>
            ))}
          </div>
          <Rise at={300}>
            <div style={{display: 'flex', gap: 18, marginTop: 44, fontSize: 24, fontWeight: 700, color: DIM}}>
              <span>市場ポジションの設計</span>
              <span style={{opacity: 0.4}}>／</span>
              <span>眠れる魅力の発掘</span>
              <span style={{opacity: 0.4}}>／</span>
              <span>狙うべき人材の特定</span>
              <span style={{opacity: 0.4}}>／</span>
              <span>面接で使うトークスクリプト</span>
            </div>
          </Rise>
        </AbsoluteFill>
      )}
    </Space>
  );
};

// ══ S8 一般論は一行もない(130f) ══
const VNoGen: React.FC = () => (
  <Space dur={130}>
    <Hud title="NO BOILERPLATE" state="VERIFIED" />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Rise at={6}>
        <div style={{fontSize: 108, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.4, textShadow: '0 0 80px rgba(84,216,255,0.35)'}}>
          一般論は、<span style={{color: YELLOW}}>一行もない。</span>
        </div>
      </Rise>
      <Rise at={44}>
        <div style={{fontSize: 30, fontWeight: 500, color: DIM, marginTop: 38}}>貴社の公開情報から、トップパフォーマーの「脳」が診断。</div>
      </Rise>
    </AbsoluteFill>
  </Space>
);

// ══ M1 例えば、マーケティング。(440f) ══
const VMIntro: React.FC = () => {
  const local = useCurrentFrame();
  const b2 = interpolate(local, [96, 118], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lossDraw = interpolate(local, [180, 245], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const gainDraw = interpolate(local, [255, 320], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lossPts = [[40, 120], [130, 150], [220, 145], [310, 200], [400, 230], [470, 295]];
  const gainPts = [[470, 295], [545, 235], [620, 205], [695, 135], [760, 80]];
  const path = (pts: number[][], p: number) => {
    const n = Math.max(2, Math.ceil(pts.length * p));
    return 'M ' + pts.slice(0, n).map(([x, y]) => `${x} ${y}`).join(' L ');
  };
  return (
    <Space dur={440}>
      <Hud title="CASE 02 ── マーケティング" state="SCANNING" />
      {b2 < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - b2}}>
          <div style={{fontSize: 122, fontWeight: 900, color: WHITE, textShadow: '0 0 80px rgba(84,216,255,0.4)'}}>
            例えば、<span style={{color: CYAN}}>マーケティング</span>。
          </div>
          <Rise at={54}>
            <div style={{fontSize: 42, fontWeight: 700, color: DIM, marginTop: 42}}>貴社のデジタル上の機会損失、見えていますか。</div>
          </Rise>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{opacity: b2}}>
          <div style={{position: 'absolute', left: 130, top: 340}}>
            <div style={{fontSize: 82, fontWeight: 900, color: WHITE}}>
              機会損失を、<span style={{color: YELLOW}}>可視化</span>。
            </div>
            <div style={{fontSize: 82, fontWeight: 900, color: WHITE, marginTop: 20}}>
              打開策を、<span style={{color: CYAN}}>具体的に出力</span>。
            </div>
            <Rise at={200}>
              <div style={{fontSize: 30, fontWeight: 500, color: DIM, marginTop: 40}}>トップパフォーマーの脳が、診断から打開策まで。</div>
            </Rise>
          </div>
          <div style={{position: 'absolute', right: 120, top: 320, width: 800}}>
            <svg width="800" height="400" viewBox="0 0 800 400">
              <line x1="30" y1="360" x2="790" y2="360" stroke="rgba(234,244,255,0.25)" strokeWidth="1.5" />
              <line x1="30" y1="360" x2="30" y2="30" stroke="rgba(234,244,255,0.25)" strokeWidth="1.5" />
              {lossDraw > 0 && <path d={path(lossPts, lossDraw)} fill="none" stroke="rgba(234,244,255,0.35)" strokeWidth="4" strokeDasharray="12 9" />}
              {gainDraw > 0 && <path d={path(gainPts, gainDraw)} fill="none" stroke={CYAN} strokeWidth="6" strokeLinecap="round" style={{filter: 'drop-shadow(0 0 12px rgba(84,216,255,0.8))'}} />}
            </svg>
            <div style={{position: 'absolute', left: 220, top: 328, fontSize: 22, fontWeight: 700, color: DIM}}>機会損失</div>
            <div style={{position: 'absolute', right: 40, top: 30, fontSize: 26, fontWeight: 900, color: CYAN, opacity: gainDraw}}>打開策</div>
          </div>
        </AbsoluteFill>
      )}
    </Space>
  );
};

// ══ M2-M4 ══
const VMQ1: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <VQuestion num="1" tag="SEARCH" active={0} dur={180}
      lines={['検索されたとき、', '選択肢に入っていますか？']}
      sub="比較検討の入口は、検索から始まります。"
      extra={
        <div style={{marginTop: 42, display: 'flex', alignItems: 'center', gap: 28}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, width: 540, padding: '20px 32px', border: '1.5px solid rgba(84,216,255,0.5)', borderRadius: 999, background: 'rgba(84,216,255,0.05)'}}>
            <div style={{width: 24, height: 24, borderRadius: '50%', border: `4px solid ${CYAN}`, position: 'relative'}}>
              <div style={{position: 'absolute', right: -9, bottom: -6, width: 12, height: 4, background: CYAN, transform: 'rotate(45deg)'}} />
            </div>
            <span style={{fontSize: 30, fontWeight: 700, color: WHITE}}>
              おすすめ 会社 <span style={{opacity: 0.35 + 0.65 * Math.abs(Math.sin(local / 10)), color: CYAN}}>▍</span>
            </span>
          </div>
          <div style={{fontSize: 30, fontWeight: 900, color: YELLOW}}>貴社名 ＝ 圏外？</div>
        </div>
      }
    />
  );
};

const VMQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['技術力', '実績', 'サポート'];
  return (
    <VQuestion num="2" tag="WEB VISIBILITY" active={1} dur={195}
      lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']}
      sub="営業資料の強みと、Webの見え方は一致していますか。"
      extra={
        <div style={{display: 'flex', gap: 20, marginTop: 42, alignItems: 'center'}}>
          {WORDS.map((w, i) => (
            <div
              key={w}
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#BFE6FF',
                border: '1.5px solid rgba(84,216,255,0.4)',
                borderRadius: 999,
                padding: '12px 30px',
                opacity: Math.max(0.07, 0.85 - Math.max(0, local - 40 - i * 26) * 0.012),
                textShadow: '0 0 30px rgba(84,216,255,0.6)',
              }}
            >
              {w}
            </div>
          ))}
          <div style={{fontSize: 27, fontWeight: 700, color: YELLOW, marginLeft: 10}}>Web上では ＝ 不可視</div>
        </div>
      }
    />
  );
};

const VMQ3: React.FC = () => {
  const local = useCurrentFrame();
  const FUNNEL = ['流入', '比較', '問い合わせ'];
  return (
    <VQuestion num="3" tag="LEAD PATH" active={2} dur={180}
      lines={['見込み客を、', '問い合わせまで運べていますか？']}
      sub="流入から問い合わせまでの導線、途切れていませんか。"
      extra={
        <div style={{marginTop: 44, display: 'flex', alignItems: 'center', gap: 16}}>
          {FUNNEL.map((s, i) => (
            <React.Fragment key={s}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: WHITE,
                  border: i === 1 ? '2px dashed rgba(255,216,74,0.7)' : '1.5px solid rgba(84,216,255,0.5)',
                  borderRadius: 12,
                  padding: '16px 34px',
                  background: i === 1 ? 'transparent' : 'rgba(84,216,255,0.06)',
                }}
              >
                {s}
                {i === 1 && <span style={{marginLeft: 12, color: YELLOW, opacity: 0.5 + 0.5 * Math.abs(Math.sin(local / 9))}}>✕</span>}
              </div>
              {i < 2 && <div style={{width: 44, height: 3, background: 'rgba(84,216,255,0.5)', borderRadius: 2}} />}
            </React.Fragment>
          ))}
        </div>
      }
    />
  );
};

// ══ M5 診断範囲(520f) ══
const VMScope: React.FC = () => {
  const local = useCurrentFrame();
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const SCOPE_EN = ['COMPETITIVE', 'SEARCH PATH', 'CONTENT', 'AI SEARCH'];
  const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  const beat = local < 160 ? 1 : local < 310 ? 2 : 3;
  return (
    <Space dur={520}>
      <Hud title="DIAGNOSTIC SCOPE ── 診断範囲" state="MAPPING" />
      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 30}}>
            {SCOPE.map((s, i) => (
              <Rise key={s} at={12 + i * 10}>
                <div style={{width: 340, padding: '42px 0', textAlign: 'center', border: '1.5px solid rgba(84,216,255,0.45)', borderRadius: 12, background: 'rgba(84,216,255,0.06)', boxShadow: '0 0 50px rgba(84,216,255,0.12)'}}>
                  <div style={{fontSize: 17, fontWeight: 700, letterSpacing: '0.25em', color: CYAN}}>
                    {String(i + 1).padStart(2, '0')} ── {SCOPE_EN[i]}
                  </div>
                  <div style={{fontSize: 44, fontWeight: 900, color: WHITE, marginTop: 12}}>{s}</div>
                </div>
              </Rise>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontSize: 84, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.5, textShadow: '0 0 70px rgba(84,216,255,0.35)'}}>
            何を、<span style={{color: YELLOW}}>どの順番</span>で、
            <br />
            どう直すべきか。
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontSize: 64, fontWeight: 900, color: WHITE}}>
            診断で、<span style={{color: CYAN}}>終わらせない。</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 62}}>
            {ROADMAP.map((r, i) => (
              <React.Fragment key={r}>
                <Rise at={336 + i * 24}>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 900,
                      color: i === 2 ? '#04121E' : WHITE,
                      background: i === 2 ? CYAN : 'rgba(234,244,255,0.06)',
                      border: i === 2 ? 'none' : '1.5px solid rgba(234,244,255,0.3)',
                      borderRadius: 14,
                      padding: '26px 42px',
                      boxShadow: i === 2 ? '0 0 60px rgba(84,216,255,0.4)' : 'none',
                    }}
                  >
                    {r}
                  </div>
                </Rise>
                {i < 2 && (
                  <Rise at={344 + i * 24}>
                    <div style={{fontSize: 40, fontWeight: 900, color: CYAN}}>→</div>
                  </Rise>
                )}
              </React.Fragment>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </Space>
  );
};

// ══ M6 リビール(200f) ══
const VMReveal: React.FC = () => {
  const local = useCurrentFrame();
  const glow = interpolate(local, [4, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Space dur={200}>
      <Hud title="PRODUCT 02" state="REVEALED" />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(84,216,255,0.22) 0%, transparent 65%)', transform: `scale(${glow})`}} />
        <Rise at={14}>
          <div style={{fontSize: 100, fontWeight: 900, color: WHITE, textShadow: '0 0 90px rgba(84,216,255,0.45)'}}>
            ADTURN <span style={{color: CYAN}}>for Marketing</span>
          </div>
        </Rise>
        <Rise at={60}>
          <div style={{fontSize: 36, fontWeight: 700, color: DIM, marginTop: 32}}>デジタル上の機会損失に、すべての打開策を。</div>
        </Rise>
      </AbsoluteFill>
    </Space>
  );
};

// ══ F フィナーレ(780f) ══
const VFinale: React.FC = () => {
  const local = useCurrentFrame();
  const beat = local < 215 ? 1 : local < 510 ? 2 : local < 645 ? 3 : 4;
  const PRODUCTS = [
    ['ADTURN for HR', '人事・採用'],
    ['ADTURN for Marketing', 'マーケティング'],
  ];
  const glow = interpolate(local, [648, 690], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(local, [758, 778], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Space dur={780}>
      <Hud title="EPILOGUE ── デジブレ" state="COMPLETE" />
      <AbsoluteFill style={{opacity: fadeOut}}>
        {beat === 1 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 40}}>
            <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '0.35em', color: DIM}}>PRODUCTS ── デジブレから生まれたプロダクト</div>
            {PRODUCTS.map(([name, subT], i) => (
              <Rise key={name} at={22 + i * 60}>
                <div style={{display: 'flex', alignItems: 'center', gap: 30, border: '1.5px solid rgba(84,216,255,0.45)', borderRadius: 14, padding: '30px 56px', width: 860, background: 'rgba(84,216,255,0.05)'}}>
                  <div style={{width: 18, height: 18, borderRadius: '50%', background: CYAN, boxShadow: '0 0 24px rgba(84,216,255,0.8)'}} />
                  <div>
                    <div style={{fontSize: 50, fontWeight: 900, color: WHITE}}>{name}</div>
                    <div style={{fontSize: 23, fontWeight: 700, color: DIM, marginTop: 4}}>{subT}</div>
                  </div>
                </div>
              </Rise>
            ))}
          </AbsoluteFill>
        )}
        {beat === 2 && (
          <AbsoluteFill style={{alignItems: 'center', paddingTop: 130}}>
            {/* 輝く星=デジブレ */}
            <Rise at={224}>
              <div style={{position: 'relative', width: 220, height: 220}}>
                <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,244,255,0.95) 0%, rgba(84,216,255,0.55) 30%, transparent 68%)'}} />
                <svg viewBox="0 0 220 220" style={{position: 'absolute', inset: 0}}>
                  <path d="M 110 8 L 122 98 L 212 110 L 122 122 L 110 212 L 98 122 L 8 110 L 98 98 Z" fill="#EAF4FF" opacity={0.9} />
                </svg>
              </div>
            </Rise>
            <Rise at={244}>
              <div style={{fontSize: 54, fontWeight: 900, color: WHITE, marginTop: 8, textShadow: '0 0 60px rgba(84,216,255,0.6)'}}>デジブレ</div>
            </Rise>
            <svg width="900" height="90" viewBox="0 0 900 90" style={{opacity: interpolate(local, [278, 306], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
              <path d="M 450 0 L 450 30 L 195 30 L 195 86" stroke="rgba(84,216,255,0.6)" strokeWidth={3} fill="none" strokeDasharray="2 10" />
              <path d="M 450 30 L 705 30 L 705 86" stroke="rgba(84,216,255,0.6)" strokeWidth={3} fill="none" strokeDasharray="2 10" />
            </svg>
            <div style={{display: 'flex', gap: 100}}>
              {PRODUCTS.map(([name, subT], i) => (
                <Rise key={name} at={300 + i * 12}>
                  <div style={{border: '1.5px solid rgba(84,216,255,0.45)', borderRadius: 12, padding: '20px 38px', textAlign: 'center', background: 'rgba(84,216,255,0.05)'}}>
                    <div style={{fontSize: 34, fontWeight: 900, color: WHITE}}>{name}</div>
                    <div style={{fontSize: 20, fontWeight: 700, color: DIM, marginTop: 4}}>{subT}</div>
                  </div>
                </Rise>
              ))}
            </div>
            <Rise at={334}>
              <div style={{fontSize: 31, fontWeight: 700, color: DIM, marginTop: 50}}>
                それぞれの分野の、トップパフォーマーの脳を<span style={{color: YELLOW}}>転写</span>して実現。
              </div>
            </Rise>
          </AbsoluteFill>
        )}
        {beat === 3 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '0.35em', color: DIM, marginBottom: 38}}>NEXT ── YOUR OWN MODEL</div>
            <div style={{fontSize: 84, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.5, textShadow: '0 0 80px rgba(84,216,255,0.4)'}}>
              さあ、次は<span style={{color: CYAN}}>貴社専用</span>に
              <br />
              カスタマイズを。
            </div>
          </AbsoluteFill>
        )}
        {beat === 4 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div style={{position: 'absolute', width: 940, height: 940, borderRadius: '50%', background: 'radial-gradient(circle, rgba(84,216,255,0.26) 0%, transparent 65%)', transform: `scale(${glow})`}} />
            <Rise at={656}>
              <div style={{fontSize: 150, fontWeight: 900, color: WHITE, textShadow: '0 0 100px rgba(84,216,255,0.6)'}}>
                デジ<span style={{color: CYAN}}>ブレ</span>
              </div>
            </Rise>
            <Rise at={678}>
              <div style={{fontSize: 25, fontWeight: 700, color: DIM, letterSpacing: '0.2em', marginTop: 28}}>
                世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
              </div>
            </Rise>
            <Rise at={696}>
              <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 44}}>
                <div style={{fontSize: 34, fontWeight: 900, color: '#04121E', background: CYAN, padding: '15px 40px', borderRadius: 999, boxShadow: '0 0 50px rgba(84,216,255,0.5)'}}>
                  デモ実施中
                </div>
                <div style={{fontSize: 34, fontWeight: 700, color: WHITE}}>ぜひブースでご体験ください</div>
              </div>
            </Rise>
            <div style={{position: 'absolute', bottom: 58, fontSize: 26, fontWeight: 700, letterSpacing: '0.3em', color: DIM}}>ADTANK GP</div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </Space>
  );
};

// ══ 本体 ══
export const AdturnVaienceVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const LIST: Array<[keyof typeof s, React.FC]> = [
    ['tech', VTech], ['engine', VEngine], ['intro', VIntro], ['q1', VQ1], ['q2', VQ2], ['q3', VQ3],
    ['answer', VAnswer], ['nogen', VNoGen], ['mintro', VMIntro], ['mq1', VMQ1], ['mq2', VMQ2], ['mq3', VMQ3],
    ['mscope', VMScope], ['mreveal', VMReveal], ['finale', VFinale],
  ];
  return (
    <AbsoluteFill style={{background: V_BG}}>
      <Audio src={staticFile('audio/bgm_vaience_full.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {LIST.map(([key, C]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`V ${key}`}>
          <C />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
