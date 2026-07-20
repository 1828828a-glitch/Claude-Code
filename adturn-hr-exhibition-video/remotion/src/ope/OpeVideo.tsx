import React from 'react';
import {AbsoluteFill, Audio, Loop, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FONT, V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {HEAD_DOME, HEAD_FACE} from '../poster/PosterDemo';

// ── 脳移植オペレーション フル版(4775f = 159s) ──
// 全編がひとつの手術ナビモニタ。Veo生成の医療ホログラム・プレートを背景に、
// バイタル/工程/進行ゲージのUIクロームを常設。台本・構成・ナレーションは本編と同一。

const SCENES = V3D_SCENES;
const TOTAL = V3D_TOTAL_FRAMES;
const BG = '#0A0E12';
const TEAL = '#4AE3B5';
const AMBER = '#FFB648';
const WHITE = '#EAF4F0';
const DIM = 'rgba(234,244,240,0.55)';
const PANEL = 'rgba(10,14,18,0.72)';
const LINE = 'rgba(74,227,181,0.35)';

const NARRATION: Array<[string, number]> = [
  ['n1', 15], ['n2a', 327], ['n2b', 580], ['n3', 733], ['n4', 925], ['n5', 1176], ['n6', 1459],
  ['n7a', 1696], ['n7b', 1868], ['n8a', 2159], ['m0', 2298], ['m1', 2395], ['m2', 2732], ['m3', 2912],
  ['m4', 3107], ['m5', 3283], ['m6', 3444], ['m7', 3597], ['p0', 3805], ['p1', 4005], ['p2', 4222],
  ['p3', 4515], ['p4', 4668],
];

const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.1, 0.1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const bgmVolume = (f: number) => {
  const base = 0.88 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return base * endFade;
};

const LOOP_F = 238;
const Plate: React.FC<{src: string; mirror?: boolean; dark?: number}> = ({src, mirror, dark = 0.35}) => {
  const frame = useCurrentFrame();
  const s = 1.07 + Math.sin(frame / 340) * 0.03;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${mirror ? -s : s}, ${s})`}}>
        <Loop durationInFrames={LOOP_F}>
          <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Loop>
        <AbsoluteFill
          style={{
            background: BG,
            opacity: interpolate(frame % LOOP_F, [0, 7, LOOP_F - 7, LOOP_F], [0.35, 0, 0, 0.35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{background: BG, opacity: dark}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 105% 85% at 50% 48%, transparent 50%, rgba(6,9,12,0.75) 100%)'}} />
    </AbsoluteFill>
  );
};

const Rise: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * 24}px)`, ...style}}>{children}</div>;
};

const Fade: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12, dur - 12, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o, fontFamily: FONT}}>{children}</AbsoluteFill>;
};

// ── 常設UIクローム(絶対フレームで進行) ──
const Ecg: React.FC<{x: number; y: number; w: number}> = ({x, y, w}) => {
  const frame = useCurrentFrame();
  const pts: string[] = [];
  for (let i = 0; i < w; i += 4) {
    const t = ((i + frame * 5) % 168) / 168;
    let v = 0;
    if (t > 0.42 && t < 0.46) v = -10;
    else if (t >= 0.46 && t < 0.5) v = 46;
    else if (t >= 0.5 && t < 0.54) v = -18;
    else if (t > 0.62 && t < 0.72) v = 9 * Math.sin(((t - 0.62) / 0.1) * Math.PI);
    else v = Math.sin(t * Math.PI * 2) * 2;
    pts.push(`${x + i} ${y - v}`);
  }
  return (
    <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
      <polyline points={pts.join(' ')} fill="none" stroke={TEAL} strokeWidth={2} opacity={0.9} />
    </svg>
  );
};

const STEPS = ['SCAN ── 走査', 'EXTRACT ── 摘出', 'TRANSCRIBE ── 転写', 'GRAFT ── 移植', 'VERIFY ── 検証', 'DEPLOY ── 展開'];
const STEP_AT = [0, 150, 315, 1690, 2150, 3795];

const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [4, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pct = Math.floor(interpolate(frame, [30, TOTAL - 120], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const hr = 72 + Math.round(Math.sin(frame / 40) * 2) + (frame > 150 && frame < 400 ? 5 : 0);
  const mono: React.CSSProperties = {fontVariantNumeric: 'tabular-nums', letterSpacing: '0.18em'};
  const extractRate = Math.min(99, Math.max(0, Math.floor((frame - 150) / 40)));
  const curStep = STEP_AT.findIndex((a, i) => frame >= a && frame < (STEP_AT[i + 1] ?? Infinity));
  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none', opacity: boot}}>
      {/* ヘッダー */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 70, borderBottom: `1px solid ${LINE}`, background: 'rgba(10,14,18,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px'}}>
        <div style={{fontSize: 19, fontWeight: 700, color: WHITE, ...mono}}>
          OPERATION ── <span style={{color: TEAL}}>BRAIN TRANSPLANT</span> ／ 脳移植 第47例
        </div>
        <div style={{fontSize: 17, fontWeight: 700, color: DIM, ...mono}}>
          ELAPSED {String(Math.floor(frame / 30 / 60)).padStart(2, '0')}:{String(Math.floor(frame / 30) % 60).padStart(2, '0')}.{String(frame % 30).padStart(2, '0')}
        </div>
      </div>
      {/* 左: バイタル */}
      <div style={{position: 'absolute', left: 50, top: 110, width: 300, bottom: 150, border: `1px solid ${LINE}`, background: PANEL, padding: 24}}>
        <div style={{fontSize: 13, fontWeight: 700, color: DIM, letterSpacing: '0.34em'}}>VITALS ── ドナー</div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 22}}>
          <span style={{fontSize: 56, fontWeight: 900, color: TEAL, ...mono}}>{hr}</span>
          <span style={{fontSize: 16, fontWeight: 700, color: DIM}}>HR bpm</span>
        </div>
        <Ecg x={78} y={300} w={244} />
        <div style={{position: 'absolute', top: 272, left: 24, fontSize: 13, color: DIM, letterSpacing: '0.3em'}}>ECG Ⅱ</div>
        <div style={{position: 'absolute', top: 380, left: 24, right: 24}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 16, color: WHITE, fontWeight: 700, ...mono}}>
            <span style={{color: DIM}}>SpO₂</span>
            <span>99%</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 16, color: WHITE, fontWeight: 700, marginTop: 13, ...mono}}>
            <span style={{color: DIM}}>SYNAPSE LINK</span>
            <span style={{color: frame > 315 ? TEAL : AMBER}}>{frame > 315 ? 'STABLE' : 'STANDBY'}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 16, color: WHITE, fontWeight: 700, marginTop: 13, ...mono}}>
            <span style={{color: DIM}}>暗黙知抽出率</span>
            <span>{extractRate}%</span>
          </div>
        </div>
        <div style={{position: 'absolute', bottom: 24, left: 24, right: 24, fontSize: 13, color: DIM, letterSpacing: '0.2em', lineHeight: 1.9}}>
          DONOR: TOP PERFORMER
          <br />
          RECIPIENT: <span style={{color: TEAL}}>デジブレ ENGINE</span>
        </div>
      </div>
      {/* 右: 工程 */}
      <div style={{position: 'absolute', right: 50, top: 110, width: 300, bottom: 150, border: `1px solid ${LINE}`, background: PANEL, padding: 24}}>
        <div style={{fontSize: 13, fontWeight: 700, color: DIM, letterSpacing: '0.34em'}}>PROCEDURE ── 工程</div>
        {STEPS.map((s, i) => {
          const done = frame >= (STEP_AT[i + 1] ?? Infinity);
          const active = i === curStep;
          return (
            <div key={s} style={{display: 'flex', alignItems: 'center', gap: 13, marginTop: 26, opacity: frame >= STEP_AT[i] - 30 ? 1 : 0.35}}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${done ? TEAL : active ? AMBER : 'rgba(234,244,240,0.3)'}`,
                  background: done ? TEAL : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  color: BG,
                  opacity: active ? 0.5 + 0.5 * Math.abs(Math.sin(frame / 9)) : 1,
                }}
              >
                {done ? '✓' : ''}
              </div>
              <div style={{fontSize: 16.5, fontWeight: 700, color: done ? WHITE : active ? AMBER : DIM, letterSpacing: '0.06em'}}>{s}</div>
            </div>
          );
        })}
        <div style={{position: 'absolute', bottom: 24, left: 24, right: 24, fontSize: 13, color: DIM, letterSpacing: '0.24em'}}>
          CASE 01: 採用 ／ CASE 02: マーケ
        </div>
      </div>
      {/* 下部ゲージ */}
      <div style={{position: 'absolute', left: 50, right: 50, bottom: 66}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: DIM, marginBottom: 11, ...mono}}>
          <span>
            TRANSPLANT ── <span style={{color: WHITE}}>{STEPS[Math.max(0, curStep)]?.split(' ── ')[1]}</span>
          </span>
          <span style={{color: TEAL}}>{String(pct).padStart(3, '0')}%</span>
        </div>
        <div style={{height: 6, background: 'rgba(74,227,181,0.14)'}}>
          <div style={{height: '100%', width: `${pct}%`, background: TEAL, boxShadow: '0 0 18px rgba(74,227,181,0.7)'}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 中央コンテンツ領域(左右パネルの内側)
const Center: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <AbsoluteFill style={{paddingLeft: 400, paddingRight: 400, paddingTop: 90, paddingBottom: 130, justifyContent: 'center', alignItems: 'center', ...style}}>
    {children}
  </AbsoluteFill>
);

const tsh = '0 2px 30px rgba(6,9,12,0.95)';

// ══ S1 開頭 ══
const OTech: React.FC = () => {
  const local = useCurrentFrame();
  const open = interpolate(local, [150, 195], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  const t1 = interpolate(local, [40, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(local, [126, 148], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const badge = interpolate(local, [252, 278], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={315}>
      <Plate src="video/plate_ope_head.mp4" dark={0.4} />
      {/* ナビゲーション・アウトライン(開頭) */}
      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.85}}>
        <g transform="translate(960, 545) scale(0.98)">
          <path d={HEAD_FACE} fill="none" stroke={TEAL} strokeWidth={2.2} opacity={0.85} />
          <g transform={`rotate(${open * 62} 158 -120)`}>
            <path d={HEAD_DOME} fill="none" stroke={open > 0.02 ? AMBER : TEAL} strokeWidth={2.2} opacity={0.85} />
          </g>
          <line x1={-320} y1={0} x2={-255} y2={0} stroke={LINE} strokeWidth={1.4} />
          <line x1={255} y1={0} x2={320} y2={0} stroke={LINE} strokeWidth={1.4} />
        </g>
      </svg>
      {out1 > 0 && (
        <Center style={{justifyContent: 'flex-end', opacity: out1}}>
          <div style={{fontSize: 34, fontWeight: 700, color: DIM, letterSpacing: '0.12em', opacity: t1, textShadow: tsh}}>トップパフォーマーの</div>
          <div style={{fontSize: 68, fontWeight: 900, color: WHITE, marginTop: 10, opacity: t1, textShadow: tsh}}>
            脳を、AIに<span style={{color: TEAL}}>転写</span>する。
          </div>
        </Center>
      )}
      <Center style={{justifyContent: 'flex-end', opacity: badge}}>
        <div style={{fontSize: 52, fontWeight: 900, color: WHITE, textShadow: tsh}}>
          世界初のAIエンジン──<span style={{color: TEAL}}>デジブレ</span>。
        </div>
        <div style={{fontSize: 19, fontWeight: 700, color: DIM, letterSpacing: '0.3em', marginTop: 16}}>オリジナルAIエンジン ／ 特許出願中 ／ ADTURN</div>
      </Center>
    </Fade>
  );
};

// ══ S2 ドナー台帳 ══
const OEngine: React.FC = () => {
  const local = useCurrentFrame();
  const count = Math.round(interpolate(local, [20, 100], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const b2 = interpolate(local, [235, 258], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];
  return (
    <Fade dur={400}>
      <Plate src="video/plate_ope_brain.mp4" dark={0.45} />
      {b2 < 1 && (
        <Center style={{opacity: 1 - b2}}>
          <div style={{fontSize: 17, fontWeight: 700, color: TEAL, letterSpacing: '0.4em'}}>DONOR ARCHIVE ── 転写済みドナー台帳</div>
          <div style={{fontSize: 38, fontWeight: 700, color: DIM, marginTop: 28, textShadow: tsh}}>各領域のトップパフォーマー</div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 10}}>
            <span style={{fontSize: 62, fontWeight: 900, color: WHITE}}>約</span>
            <span style={{fontSize: 190, fontWeight: 900, color: TEAL, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, textShadow: '0 0 60px rgba(74,227,181,0.45)'}}>
              {count}
            </span>
            <span style={{fontSize: 62, fontWeight: 900, color: WHITE}}>名</span>
          </div>
          <div style={{fontSize: 50, fontWeight: 900, color: WHITE, textShadow: tsh}}>
            の脳を、<span style={{color: AMBER}}>コピー済み。</span>
          </div>
          <Rise at={110}>
            <div style={{fontSize: 24, fontWeight: 500, color: DIM, marginTop: 24, textShadow: tsh}}>脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。</div>
          </Rise>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28, maxWidth: 900}}>
            {DOMAINS.map((d, i) => (
              <div
                key={d}
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: WHITE,
                  border: `1px solid ${LINE}`,
                  background: 'rgba(10,14,18,0.6)',
                  padding: '8px 18px',
                  opacity: interpolate(local, [40 + i * 10, 56 + i * 10], [0, 0.92], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
                }}
              >
                STATUS: COPIED ── {d}
              </div>
            ))}
          </div>
        </Center>
      )}
      {b2 > 0 && (
        <Center style={{opacity: b2}}>
          <div style={{fontSize: 58, fontWeight: 900, color: WHITE, textAlign: 'center', textShadow: tsh}}>
            レシピではなく、<span style={{color: TEAL}}>料理そのもの</span>を出力。
          </div>
          <div style={{display: 'flex', gap: 40, marginTop: 52}}>
            <Rise at={268}>
              <div style={{width: 480, padding: '32px 38px', border: '1px solid rgba(234,244,240,0.3)', background: 'rgba(10,14,18,0.72)'}}>
                <div style={{fontSize: 28, fontWeight: 700, color: DIM}}>既存のAIツール</div>
                <div style={{fontSize: 23, fontWeight: 500, color: DIM, marginTop: 14, lineHeight: 1.7}}>
                  一般的な回答を出力し、業務を「補助」する。
                </div>
              </div>
            </Rise>
            <Rise at={284}>
              <div style={{width: 520, padding: '32px 38px', border: `1.5px solid ${TEAL}`, background: 'rgba(10,14,18,0.72)', boxShadow: '0 0 50px rgba(74,227,181,0.25)'}}>
                <div style={{fontSize: 28, fontWeight: 900, color: TEAL}}>デジブレ</div>
                <div style={{fontSize: 23, fontWeight: 700, color: WHITE, marginTop: 14, lineHeight: 1.7}}>
                  提案書・分析・戦略「そのもの」をトップパフォーマー品質で出力。
                </div>
              </div>
            </Rise>
          </div>
        </Center>
      )}
    </Fade>
  );
};

// ══ S3 症例01 ══
const OIntro: React.FC = () => (
  <Fade dur={190}>
    <Plate src="video/plate_ope_fog.mp4" dark={0.3} />
    <Center>
      <Rise at={8}>
        <div style={{fontSize: 17, fontWeight: 700, color: AMBER, letterSpacing: '0.4em'}}>PHASE 1 ── PATIENT SCAN ／ 症例01</div>
      </Rise>
      <Rise at={16}>
        <div style={{fontSize: 108, fontWeight: 900, color: WHITE, marginTop: 30, textShadow: tsh}}>
          例えば、<span style={{color: TEAL}}>採用</span>。
        </div>
      </Rise>
      <Rise at={64}>
        <div style={{fontSize: 32, fontWeight: 700, color: DIM, marginTop: 32, textShadow: tsh}}>貴社は、この問いに即答できますか。</div>
      </Rise>
    </Center>
  </Fade>
);

// ══ 問い(所見スキャン) ══
const OQuestion: React.FC<{plate: string; mirror?: boolean; num: string; lines: string[]; sub: string; active: number; dur: number}> = ({
  plate,
  mirror,
  num,
  lines,
  sub,
  active,
  dur,
}) => {
  const local = useCurrentFrame();
  return (
    <Fade dur={dur}>
      <Plate src={plate} mirror={mirror} dark={0.42} />
      <Center style={{alignItems: 'flex-start', paddingLeft: 430, paddingRight: 430}}>
        <div style={{fontSize: 19, fontWeight: 900, color: BG, background: AMBER, padding: '7px 20px', letterSpacing: '0.2em', opacity: interpolate(local, [6, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          所見 {num} ── FINDING
        </div>
        <div style={{height: 30}} />
        {lines.map((l, i) => (
          <Rise key={l} at={18 + i * 14}>
            <div style={{fontSize: 58, fontWeight: 900, color: WHITE, lineHeight: 1.42, textShadow: tsh}}>{l}</div>
          </Rise>
        ))}
        <Rise at={62}>
          <div style={{fontSize: 25, fontWeight: 500, color: DIM, marginTop: 24, textShadow: tsh}}>{sub}</div>
        </Rise>
        <Rise at={86}>
          <div style={{fontSize: 21, fontWeight: 700, color: AMBER, marginTop: 26, letterSpacing: '0.14em', opacity: 0.55 + 0.45 * Math.abs(Math.sin(local / 11))}}>
            ▲ 診断所見: 未回答 ── 要精査
          </div>
        </Rise>
        <div style={{position: 'absolute', bottom: 24, left: 430, display: 'flex', gap: 14}}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{width: i === active ? 48 : 14, height: 5, background: i === active ? TEAL : 'rgba(234,244,240,0.3)'}} />
          ))}
        </div>
      </Center>
    </Fade>
  );
};

const OQ1: React.FC = () => (
  <OQuestion plate="video/plate_ope_head.mp4" mirror num="Ⅰ" active={0} dur={250}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);
const OQ2: React.FC = () => (
  <OQuestion plate="video/plate_ope_fog.mp4" mirror num="Ⅱ" active={1} dur={295}
    lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
    sub="社内では当たり前すぎて、誰も武器だと気づいていない事実。"
  />
);
const OQ3: React.FC = () => (
  <OQuestion plate="video/plate_ope_head.mp4" num="Ⅲ" active={2} dur={240}
    lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
    sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
  />
);

// ══ S7 移植(GRAFT) ══
const OAnswer: React.FC = () => {
  const local = useCurrentFrame();
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  const b2 = interpolate(local, [100, 122], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={460}>
      <Plate src="video/plate_ope_transfer.mp4" dark={0.42} />
      {b2 < 1 && (
        <Center style={{opacity: 1 - b2}}>
          <div style={{fontSize: 54, fontWeight: 900, color: WHITE, textShadow: tsh}}>
            4つの所見、<span style={{color: TEAL}}>すべてに処置</span>を。
          </div>
          <div style={{display: 'flex', gap: 20, marginTop: 44}}>
            {QUESTIONS.map((q, i) => (
              <Rise key={q} at={20 + i * 11}>
                <div style={{position: 'relative', fontSize: 22, fontWeight: 700, color: WHITE, border: `1px solid ${LINE}`, background: 'rgba(10,14,18,0.72)', padding: '26px 22px'}}>
                  {q}
                  <div style={{position: 'absolute', top: -14, right: -14, width: 32, height: 32, borderRadius: '50%', background: TEAL, color: BG, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    ✓
                  </div>
                </div>
              </Rise>
            ))}
          </div>
        </Center>
      )}
      {b2 > 0 && (
        <Center style={{opacity: b2}}>
          <div style={{fontSize: 74, fontWeight: 900, color: WHITE, textShadow: '0 0 70px rgba(74,227,181,0.45)'}}>
            ADTURN <span style={{color: TEAL}}>for HR</span>
          </div>
          <Rise at={140}>
            <div style={{fontSize: 25, fontWeight: 700, color: DIM, marginTop: 12, textShadow: tsh}}>人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート</div>
          </Rise>
          <div style={{display: 'flex', gap: 18, marginTop: 40}}>
            {REPORTS.map((r, i) => (
              <Rise key={r} at={170 + i * 12}>
                <div style={{width: 246, border: `1px solid ${LINE}`, background: 'rgba(10,14,18,0.75)', padding: '18px 18px'}}>
                  <div style={{fontSize: 13, fontWeight: 700, color: TEAL, letterSpacing: '0.26em'}}>処方 {String(i + 1).padStart(2, '0')}</div>
                  <div style={{fontSize: 23, fontWeight: 900, color: WHITE, marginTop: 10, minHeight: 66}}>{r}</div>
                  {[0, 1].map((j) => (
                    <div key={j} style={{height: 4, background: 'rgba(234,244,240,0.18)', marginTop: 8, width: `${84 - j * 18}%`}} />
                  ))}
                </div>
              </Rise>
            ))}
          </div>
          <Rise at={300}>
            <div style={{fontSize: 19, fontWeight: 700, color: DIM, marginTop: 34, textShadow: tsh}}>
              市場ポジションの設計 ／ 眠れる魅力の発掘 ／ 狙うべき人材の特定 ／ 面接で使うトークスクリプト
            </div>
          </Rise>
        </Center>
      )}
    </Fade>
  );
};

// ══ S8 検証 ══
const ONoGen: React.FC = () => (
  <Fade dur={130}>
    <Plate src="video/plate_ope_fog.mp4" dark={0.4} />
    <Center>
      <Rise at={6}>
        <div style={{fontSize: 17, fontWeight: 700, color: TEAL, letterSpacing: '0.4em'}}>VERIFY ── 品質検査</div>
      </Rise>
      <Rise at={14}>
        <div style={{fontSize: 76, fontWeight: 900, color: WHITE, marginTop: 26, textShadow: tsh}}>
          一般論は、<span style={{color: AMBER}}>一行もない。</span>
        </div>
      </Rise>
      <Rise at={44}>
        <div style={{fontSize: 22, fontWeight: 900, color: BG, background: TEAL, padding: '10px 28px', marginTop: 34, letterSpacing: '0.14em'}}>
          検査結果 ── 一般論検出: 0行
        </div>
      </Rise>
      <Rise at={62}>
        <div style={{fontSize: 24, fontWeight: 500, color: DIM, marginTop: 26, textShadow: tsh}}>貴社の公開情報から、トップパフォーマーの「脳」が診断。</div>
      </Rise>
    </Center>
  </Fade>
);

// ══ M1 症例02 ══
const OMIntro: React.FC = () => {
  const local = useCurrentFrame();
  const b2 = interpolate(local, [96, 118], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={440}>
      <Plate src="video/plate_ope_brain.mp4" mirror dark={0.45} />
      {b2 < 1 && (
        <Center style={{opacity: 1 - b2}}>
          <Rise at={6}>
            <div style={{fontSize: 17, fontWeight: 700, color: AMBER, letterSpacing: '0.4em'}}>PHASE 1' ── PATIENT SCAN ／ 症例02</div>
          </Rise>
          <Rise at={14}>
            <div style={{fontSize: 88, fontWeight: 900, color: WHITE, marginTop: 30, textShadow: tsh}}>
              例えば、<span style={{color: TEAL}}>マーケティング</span>。
            </div>
          </Rise>
          <Rise at={56}>
            <div style={{fontSize: 32, fontWeight: 700, color: DIM, marginTop: 32, textShadow: tsh}}>貴社のデジタル上の機会損失、見えていますか。</div>
          </Rise>
        </Center>
      )}
      {b2 > 0 && (
        <Center style={{alignItems: 'flex-start', opacity: b2}}>
          <div style={{fontSize: 62, fontWeight: 900, color: WHITE, textShadow: tsh}}>
            機会損失を、<span style={{color: AMBER}}>可視化</span>。
          </div>
          <div style={{fontSize: 62, fontWeight: 900, color: WHITE, marginTop: 18, textShadow: tsh}}>
            打開策を、<span style={{color: TEAL}}>具体的に出力</span>。
          </div>
          <Rise at={200}>
            <div style={{fontSize: 25, fontWeight: 500, color: DIM, marginTop: 32, textShadow: tsh}}>トップパフォーマーの脳が、診断から打開策まで。</div>
          </Rise>
        </Center>
      )}
    </Fade>
  );
};

const OMQ1: React.FC = () => (
  <OQuestion plate="video/plate_ope_head.mp4" mirror num="Ⅰ" active={0} dur={180}
    lines={['検索されたとき、', '選択肢に入っていますか？']}
    sub="比較検討の入口は、検索から始まります。貴社名 ＝ 圏外？"
  />
);
const OMQ2: React.FC = () => (
  <OQuestion plate="video/plate_ope_fog.mp4" num="Ⅱ" active={1} dur={195}
    lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']}
    sub="営業資料の強みと、Webの見え方は一致していますか。Web上では ＝ 不可視。"
  />
);
const OMQ3: React.FC = () => (
  <OQuestion plate="video/plate_ope_head.mp4" num="Ⅲ" active={2} dur={180}
    lines={['見込み客を、', '問い合わせまで運べていますか？']}
    sub="流入から問い合わせまでの導線、途切れていませんか。"
  />
);

// ══ M5 治療計画 ══
const OMScope: React.FC = () => {
  const local = useCurrentFrame();
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  const beat = local < 160 ? 1 : local < 310 ? 2 : 3;
  return (
    <Fade dur={520}>
      <Plate src="video/plate_ope_brain.mp4" dark={0.45} />
      {beat === 1 && (
        <Center>
          <div style={{fontSize: 17, fontWeight: 700, color: TEAL, letterSpacing: '0.4em', marginBottom: 40}}>TREATMENT PLAN ── 診断範囲</div>
          <div style={{display: 'flex', gap: 22}}>
            {SCOPE.map((s, i) => (
              <Rise key={s} at={12 + i * 10}>
                <div style={{width: 240, padding: '30px 0', textAlign: 'center', border: `1px solid ${LINE}`, background: 'rgba(10,14,18,0.72)'}}>
                  <div style={{fontSize: 14, fontWeight: 700, letterSpacing: '0.3em', color: TEAL}}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{fontSize: 32, fontWeight: 900, color: WHITE, marginTop: 10}}>{s}</div>
                </div>
              </Rise>
            ))}
          </div>
        </Center>
      )}
      {beat === 2 && (
        <Center>
          <div style={{fontSize: 62, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.5, textShadow: tsh}}>
            何を、<span style={{color: AMBER}}>どの順番</span>で、
            <br />
            どう直すべきか。
          </div>
        </Center>
      )}
      {beat === 3 && (
        <Center>
          <div style={{fontSize: 48, fontWeight: 900, color: WHITE, textShadow: tsh}}>
            診断で、<span style={{color: TEAL}}>終わらせない。</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 48}}>
            {ROADMAP.map((r, i) => (
              <React.Fragment key={r}>
                <Rise at={336 + i * 24}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: i === 2 ? BG : WHITE,
                      background: i === 2 ? TEAL : 'rgba(10,14,18,0.72)',
                      border: i === 2 ? 'none' : '1px solid rgba(234,244,240,0.3)',
                      padding: '20px 30px',
                    }}
                  >
                    {r}
                  </div>
                </Rise>
                {i < 2 && (
                  <Rise at={344 + i * 24}>
                    <div style={{fontSize: 30, fontWeight: 900, color: TEAL}}>→</div>
                  </Rise>
                )}
              </React.Fragment>
            ))}
          </div>
        </Center>
      )}
    </Fade>
  );
};

// ══ M6 DEPLOY ══
const OMReveal: React.FC = () => (
  <Fade dur={200}>
    <Plate src="video/plate_ope_transfer.mp4" mirror dark={0.4} />
    <Center>
      <Rise at={8}>
        <div style={{fontSize: 17, fontWeight: 700, color: TEAL, letterSpacing: '0.4em'}}>DEPLOY ── 移植完了</div>
      </Rise>
      <Rise at={16}>
        <div style={{fontSize: 72, fontWeight: 900, color: WHITE, marginTop: 26, textShadow: '0 0 70px rgba(74,227,181,0.45)'}}>
          ADTURN <span style={{color: TEAL}}>for Marketing</span>
        </div>
      </Rise>
      <Rise at={60}>
        <div style={{fontSize: 28, fontWeight: 700, color: DIM, marginTop: 26, textShadow: tsh}}>デジタル上の機会損失に、すべての打開策を。</div>
      </Rise>
    </Center>
  </Fade>
);

// ══ F 術後(POST-OP) ══
const OFinale: React.FC = () => {
  const local = useCurrentFrame();
  const beat = local < 215 ? 1 : local < 510 ? 2 : local < 645 ? 3 : 4;
  const PRODUCTS = [
    ['ADTURN for HR', '人事・採用 ── 移植成功'],
    ['ADTURN for Marketing', 'マーケティング ── 移植成功'],
  ];
  const fadeOut = interpolate(local, [758, 778], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={780}>
      <Plate src="video/plate_ope_transfer.mp4" dark={0.44} />
      <AbsoluteFill style={{opacity: fadeOut}}>
        {beat === 1 && (
          <Center style={{gap: 28}}>
            <div style={{fontSize: 17, fontWeight: 700, letterSpacing: '0.4em', color: DIM}}>POST-OP ── デジブレから生まれたプロダクト</div>
            {PRODUCTS.map(([name, subT], i) => (
              <Rise key={name} at={22 + i * 60}>
                <div style={{display: 'flex', alignItems: 'center', gap: 22, border: `1px solid ${LINE}`, background: 'rgba(10,14,18,0.75)', padding: '24px 40px', width: 760}}>
                  <div style={{width: 14, height: 14, borderRadius: '50%', background: TEAL, boxShadow: '0 0 20px rgba(74,227,181,0.85)'}} />
                  <div>
                    <div style={{fontSize: 40, fontWeight: 900, color: WHITE}}>{name}</div>
                    <div style={{fontSize: 18, fontWeight: 700, color: DIM, marginTop: 4}}>{subT}</div>
                  </div>
                </div>
              </Rise>
            ))}
          </Center>
        )}
        {beat === 2 && (
          <Center>
            <Rise at={230}>
              <div style={{fontSize: 20, fontWeight: 900, color: BG, background: TEAL, padding: '10px 30px', letterSpacing: '0.2em'}}>DONOR CORE ── デジブレ</div>
            </Rise>
            <svg width="700" height="80" viewBox="0 0 700 80" style={{opacity: interpolate(local, [278, 306], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
              <path d="M 350 0 L 350 26 L 150 26 L 150 76" stroke={LINE} strokeWidth={2} fill="none" />
              <path d="M 350 26 L 550 26 L 550 76" stroke={LINE} strokeWidth={2} fill="none" />
            </svg>
            <div style={{display: 'flex', gap: 70}}>
              {PRODUCTS.map(([name], i) => (
                <Rise key={name} at={300 + i * 12}>
                  <div style={{border: `1px solid ${LINE}`, background: 'rgba(10,14,18,0.75)', padding: '16px 30px', textAlign: 'center'}}>
                    <div style={{fontSize: 27, fontWeight: 900, color: WHITE}}>{name}</div>
                  </div>
                </Rise>
              ))}
            </div>
            <Rise at={334}>
              <div style={{fontSize: 24, fontWeight: 700, color: DIM, marginTop: 38, textShadow: tsh}}>
                それぞれの分野の、トップパフォーマーの脳を<span style={{color: TEAL}}>転写</span>して実現。
              </div>
            </Rise>
          </Center>
        )}
        {beat === 3 && (
          <Center>
            <div style={{fontSize: 17, fontWeight: 700, letterSpacing: '0.4em', color: AMBER, marginBottom: 30}}>NEXT PATIENT ── 貴社</div>
            <div style={{fontSize: 62, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.5, textShadow: tsh}}>
              さあ、次は<span style={{color: TEAL}}>貴社専用</span>に
              <br />
              カスタマイズを。
            </div>
          </Center>
        )}
        {beat === 4 && (
          <Center>
            <Rise at={656}>
              <div style={{fontSize: 116, fontWeight: 900, color: WHITE, textShadow: '0 0 90px rgba(74,227,181,0.55)'}}>
                デジ<span style={{color: TEAL}}>ブレ</span>
              </div>
            </Rise>
            <Rise at={678}>
              <div style={{display: 'flex', gap: 18, marginTop: 26, alignItems: 'center'}}>
                <div style={{fontSize: 18, fontWeight: 900, color: BG, background: TEAL, padding: '7px 20px', letterSpacing: '0.2em'}}>GRAFT COMPLETE</div>
                <div style={{fontSize: 19, fontWeight: 700, color: DIM, letterSpacing: '0.16em'}}>世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ for Marketing</div>
              </div>
            </Rise>
            <Rise at={696}>
              <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 34}}>
                <div style={{fontSize: 27, fontWeight: 900, color: BG, background: AMBER, padding: '12px 32px'}}>デモ実施中</div>
                <div style={{fontSize: 27, fontWeight: 700, color: WHITE, textShadow: tsh}}>ぜひブースでご体験ください</div>
              </div>
            </Rise>
            <div style={{position: 'absolute', bottom: 4, fontSize: 19, fontWeight: 700, letterSpacing: '0.3em', color: DIM}}>ADTANK GP</div>
          </Center>
        )}
      </AbsoluteFill>
    </Fade>
  );
};

// ══ 本体 ══
export const AdturnOpeVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const LIST: Array<[keyof typeof s, React.FC]> = [
    ['tech', OTech], ['engine', OEngine], ['intro', OIntro], ['q1', OQ1], ['q2', OQ2], ['q3', OQ3],
    ['answer', OAnswer], ['nogen', ONoGen], ['mintro', OMIntro], ['mq1', OMQ1], ['mq2', OMQ2], ['mq3', OMQ3],
    ['mscope', OMScope], ['mreveal', OMReveal], ['finale', OFinale],
  ];
  return (
    <AbsoluteFill style={{background: BG}}>
      <Audio src={staticFile('audio/bgm_ope_full.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {LIST.map(([key, C]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`O ${key}`}>
          <C />
        </Sequence>
      ))}
      {/* UIクロームは全編通し(絶対フレーム) */}
      <Chrome />
    </AbsoluteFill>
  );
};
