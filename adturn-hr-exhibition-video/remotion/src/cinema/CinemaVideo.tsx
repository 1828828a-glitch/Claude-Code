import React, {useEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useThree} from '@react-three/fiber';
import {V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {LuxBrain, LuxHead} from '../lux/LuxDemo';
import {useHeadGeometry} from '../scenes/Head3D';

// ── ① NatGeoシネマ版: 黒×琥珀、明朝、シネスコ、フィルムグレイン ──
// 「発明のドキュメンタリー」— 一つの被写体（頭部）を照明で語る

const SERIF = "'Noto Serif CJK JP', serif";
const SANS = "'Noto Sans CJK JP', sans-serif";
const AMBER = '#E8A34C';
const CREAM = '#F4E8D8';
const DIM = 'rgba(244,232,216,0.55)';
const FAINT = 'rgba(244,232,216,0.3)';
const BG = '#050403';

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const useFade = (at: number, dur = 30) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return {opacity: p, transform: `translateY(${(1 - p) * 16}px)`};
};
const useRule = (at: number, dur = 34) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
};

const Caps: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontFamily: SANS, fontSize: 16, fontWeight: 700, color: DIM, letterSpacing: '0.5em', ...style}}>{children}</div>
);

// ── 常設3Dステージ（琥珀ライティングの黒曜石ヘッド） ──
const T = 45;
const WAYPOINTS: Array<[number, number, number, number]> = [
  [0, 0, 7.4, 1], [140, 0, 6.5, 1], [315, 0, 6.9, 1],
  [315 + T, 1.55, 6.6, 0.9], [555, 1.55, 6.6, 0.9], [585, 0, 8.8, 0.32], [715, 0, 8.8, 0.32],
  [715 + T, 0, 10.4, 0.26], [905, 0, 10.4, 0.26],
  [905 + T, 2.6, 9.8, 0.18], [1690, 2.6, 9.8, 0.18],
  [1690 + T, 0, 10.6, 0.24], [2150, 0, 10.6, 0.24],
  [2150 + T, 2.3, 10.5, 0.22], [2280, 2.3, 10.5, 0.22],
  [2280 + T, 0, 10.4, 0.24], [2720, 0, 10.4, 0.24],
  [2720 + T, 2.6, 9.8, 0.18], [3275, 2.6, 9.8, 0.18],
  [3275 + T, 0, 10.8, 0.2], [3795, 0, 10.8, 0.2],
  [3795 + T, 0, 9.4, 0.3], [3995, 0, 9.4, 0.3],
  [3995 + T, -2.1, 10.2, 0.22], [4645, -2.1, 10.2, 0.22],
  [4645 + T, 0, 9.8, 0.34], [4775, 0, 10.0, 0.34],
];
const track = (frame: number, idx: 1 | 2 | 3) =>
  interpolate(frame, WAYPOINTS.map((w) => w[0]), WAYPOINTS.map((w) => w[idx]), {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t),
  });

const StageCamera: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const z = track(frame, 2);
  useEffect(() => {
    camera.position.set(Math.sin(frame / 300) * 0.25, 0.62, z);
    camera.lookAt(0, 0.45, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

const CinemaStage: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const geo = useHeadGeometry();
  const opacity = track(frame, 3) * interpolate(frame, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity}}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{antialias: true}}
        onCreated={(state: {gl: THREE.WebGLRenderer}) => {
          state.gl.localClippingEnabled = true;
        }}
        camera={{fov: 33, position: [0, 0.62, 7.4]}}
        style={{position: 'absolute', inset: 0}}
      >
        <StageCamera />
        {/* ドキュメンタリー照明: 強い琥珀のキー、かすかな冷たいフィル、リム */}
        <ambientLight intensity={0.22} color="#4A4038" />
        <directionalLight position={[6, 3, 2]} intensity={4.6} color="#FFB35C" />
        <directionalLight position={[-6, 1.5, -1]} intensity={0.7} color="#4A5A80" />
        <directionalLight position={[-1, 4, -6]} intensity={2.4} color="#FFD9A0" />
        {geo && <LuxHead geo={geo} openStart={62} openDur={50} xOff={track(frame, 1)} />}
        <group position={[track(frame, 1), 0, 0]}>
          <LuxBrain riseStart={82} />
        </group>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

// ── フィルムグレイン＋ビネット＋シネスコ帯 ──
const FilmChrome: React.FC = () => {
  const frame = useCurrentFrame();
  const gx = Math.floor(random(`gx${frame}`) * 260);
  const gy = Math.floor(random(`gy${frame}`) * 260);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* ビネット */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 88% 74% at 50% 46%, transparent 52%, rgba(0,0,0,0.62) 100%)'}} />
      {/* グレイン */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('img/grain_tile.png')})`,
          backgroundPosition: `${gx}px ${gy}px`,
          opacity: 0.5,
          mixBlendMode: 'overlay',
        }}
      />
      {/* シネスコ帯 */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 132, background: '#000'}} />
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 132, background: '#000'}} />
      {/* 帯上の小さなクレジット */}
      <div style={{position: 'absolute', top: 96, left: 80, fontFamily: SANS, fontSize: 14, fontWeight: 700, letterSpacing: '0.5em', color: 'rgba(244,232,216,0.4)'}}>
        ADTANK GP
      </div>
      <div style={{position: 'absolute', top: 96, right: 80, fontFamily: SANS, fontSize: 14, fontWeight: 700, letterSpacing: '0.5em', color: 'rgba(244,232,216,0.4)'}}>
        A DOCUMENT OF INVENTION
      </div>
    </AbsoluteFill>
  );
};

// ドキュメンタリーのローワーサード
const LowerThird: React.FC<{at: number; en: string; jp: string}> = ({at, en, jp}) => {
  const f = useFade(at);
  const r = useRule(at + 6);
  return (
    <div style={{position: 'absolute', left: 84, bottom: 176, ...f}}>
      <div style={{width: 46, height: 2, background: AMBER, transform: `scaleX(${r})`, transformOrigin: 'left'}} />
      <div style={{fontFamily: SANS, fontSize: 14, fontWeight: 700, letterSpacing: '0.5em', color: DIM, marginTop: 14}}>{en}</div>
      <div style={{fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: CREAM, letterSpacing: '0.12em', marginTop: 8}}>{jp}</div>
    </div>
  );
};

// ── C1 技術宣言 ──
const C1: React.FC = () => {
  const t1 = useFade(36, 36);
  const t2 = useFade(64);
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      <div style={{position: 'absolute', left: 84, top: 330, ...t1}}>
        <Caps>THE MIND, TRANSCRIBED</Caps>
        <div style={{fontSize: 88, fontWeight: 700, color: CREAM, letterSpacing: '0.1em', lineHeight: 1.5, marginTop: 34}}>
          脳を、
          <br />
          <span style={{color: AMBER}}>AIに転写</span>する。
        </div>
        <div style={{fontSize: 21, fontWeight: 700, color: DIM, letterSpacing: '0.3em', marginTop: 30, ...t2}}>
          世界初のAIエンジン「デジブレ」 ｜ <span style={{color: AMBER}}>特許出願中</span>
        </div>
      </div>
      <LowerThird at={170} en="DIGIBRE ENGINE — FIELD RECORDING 001" jp="トップパフォーマーの脳、転写の記録" />
    </AbsoluteFill>
  );
};

// ── C2 技術の中身 ──
const C2: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 240;
  const count = Math.floor(interpolate(frame, [20, 95], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}));
  const h1 = useFade(8);
  const h3 = useFade(56);
  const rule = useRule(14);
  const TAGS = ['人事', '採用コンサル', 'マーケ', 'ブランディング', '経営コンサル', 'アーティスト'];
  const b2h = useFade(250, 34);
  const b2l = useFade(280);
  const b2r = useFade(296);
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {!isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 84, top: 300}}>
            <div style={{...h1}}>
              <Caps>SOURCE — TOP PERFORMERS</Caps>
              <div style={{fontSize: 32, fontWeight: 700, color: CREAM, letterSpacing: '0.2em', marginTop: 16}}>各領域のトップパフォーマー</div>
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 30}}>
              <span style={{fontSize: 44, fontWeight: 700, color: DIM}}>約</span>
              <span style={{fontSize: 210, fontWeight: 700, color: AMBER, fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: '0 0 80px rgba(232,163,76,0.35)'}}>
                {count}
              </span>
              <span style={{fontSize: 44, fontWeight: 700, color: DIM}}>名</span>
            </div>
            <div style={{width: 540, height: 1, background: 'rgba(244,232,216,0.35)', marginTop: 28, transform: `scaleX(${rule})`, transformOrigin: 'left'}} />
            <div style={{fontSize: 34, fontWeight: 700, color: CREAM, letterSpacing: '0.18em', marginTop: 24, ...h3}}>
              の脳を、<span style={{color: AMBER}}>コピー済み</span>。
            </div>
          </div>
          <div style={{position: 'absolute', left: 1660, top: 292}}>
            {TAGS.map((t, i) => {
              const p = interpolate(frame, [36 + i * 14, 58 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={t} style={{display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24, opacity: p, transform: `translateX(${(1 - p) * 14}px)`}}>
                  <span style={{fontSize: 13, fontWeight: 700, color: AMBER, letterSpacing: '0.2em'}}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{fontSize: 23, fontWeight: 700, color: CREAM, letterSpacing: '0.12em', whiteSpace: 'nowrap'}}>{t}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 264, textAlign: 'center', ...b2h}}>
            <Caps style={{marginBottom: 24}}>OUTPUT QUALITY</Caps>
            <div style={{fontSize: 60, fontWeight: 700, color: CREAM, letterSpacing: '0.08em', whiteSpace: 'nowrap'}}>
              レシピではなく、<span style={{color: AMBER}}>料理そのもの</span>を出力。
            </div>
          </div>
          <div style={{position: 'absolute', left: 270, top: 520, width: 580, textAlign: 'center', ...b2l}}>
            <Caps style={{marginBottom: 18}}>GENERIC AI</Caps>
            <div style={{fontSize: 34, fontWeight: 700, color: FAINT, letterSpacing: '0.12em'}}>既存のAIツール</div>
            <div style={{fontSize: 23, fontWeight: 500, color: FAINT, lineHeight: 1.9, marginTop: 16}}>
              一般的な回答を出力し、
              <br />
              業務を「補助」する。
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 500, width: 1, height: 280, background: 'rgba(244,232,216,0.25)'}} />
          <div style={{position: 'absolute', right: 270, top: 508, width: 620, textAlign: 'center', ...b2r}}>
            <Caps style={{marginBottom: 18, color: AMBER}}>DIGIBRE</Caps>
            <div style={{fontSize: 38, fontWeight: 700, color: AMBER, letterSpacing: '0.14em'}}>デジブレ</div>
            <div style={{fontSize: 24, fontWeight: 700, color: CREAM, lineHeight: 1.9, marginTop: 16}}>
              提案書・分析・戦略「そのもの」を
              <br />
              トップパフォーマー品質で出力。
            </div>
            <div style={{width: 110, height: 2, background: AMBER, margin: '22px auto 0'}} />
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── 事例宣言（共通） ──
const CCase: React.FC<{caps: string; jp: React.ReactNode; sub: string}> = ({caps, jp, sub}) => {
  const t0 = useFade(10);
  const t1 = useFade(24, 34);
  const t2 = useFade(66);
  const rT = useRule(18);
  const rB = useRule(42);
  return (
    <AbsoluteFill style={{fontFamily: SERIF, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center'}}>
        <Caps style={{...t0}}>{caps}</Caps>
        <div style={{width: 560, height: 1, background: 'rgba(244,232,216,0.3)', margin: '40px auto 0', transform: `scaleX(${rT})`}} />
        <div style={{fontSize: 118, fontWeight: 700, color: CREAM, letterSpacing: '0.14em', margin: '44px 0', whiteSpace: 'nowrap', ...t1}}>{jp}</div>
        <div style={{width: 560, height: 1, background: 'rgba(244,232,216,0.3)', margin: '0 auto', transform: `scaleX(${rB})`}} />
        <div style={{fontSize: 26, fontWeight: 700, color: DIM, letterSpacing: '0.3em', marginTop: 42, ...t2}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 問い（共通） ──
const CQ: React.FC<{roman: string; index: string; lines: [string, string]; sub: string}> = ({roman, index, lines, sub}) => {
  const t0 = useFade(8);
  const l1 = useFade(22, 30);
  const l2 = useFade(42, 30);
  const s = useFade(78);
  const rule = useRule(38);
  const gp = useFade(4, 44);
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      <div style={{position: 'absolute', right: 90, top: 130, fontSize: 460, fontWeight: 700, color: 'rgba(232,163,76,0.07)', lineHeight: 1, ...gp}}>
        {roman}
      </div>
      <div style={{position: 'absolute', left: 84, top: 300}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, ...t0}}>
          <div style={{width: 40, height: 2, background: AMBER}} />
          <Caps>{index}</Caps>
        </div>
        <div style={{fontSize: 62, fontWeight: 700, color: CREAM, letterSpacing: '0.08em', marginTop: 44, whiteSpace: 'nowrap', ...l1}}>{lines[0]}</div>
        <div style={{fontSize: 62, fontWeight: 700, color: CREAM, letterSpacing: '0.08em', marginTop: 22, whiteSpace: 'nowrap', ...l2}}>{lines[1]}</div>
        <div style={{width: 700, height: 1, background: 'rgba(244,232,216,0.3)', marginTop: 46, transform: `scaleX(${rule})`, transformOrigin: 'left'}} />
        <div style={{fontSize: 24, fontWeight: 700, color: DIM, letterSpacing: '0.22em', marginTop: 30, ...s}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 答え（HR） ──
const CAnswer: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 105;
  const h = useFade(6);
  const logoIn = useFade(114, 36);
  const subIn = useFade(152);
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {!isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 84, top: 250, ...h}}>
            <Caps>RESOLUTION</Caps>
            <div style={{fontSize: 56, fontWeight: 700, color: CREAM, letterSpacing: '0.1em', marginTop: 26}}>
              4つの問い、<span style={{color: AMBER}}>すべてに答え</span>を。
            </div>
          </div>
          <div style={{position: 'absolute', left: 84, right: 84, top: 470}}>
            {QUESTIONS.map((q, i) => {
              const p = interpolate(frame, [24 + i * 14, 46 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={q} style={{opacity: p}}>
                  <div style={{display: 'flex', alignItems: 'baseline', padding: '24px 8px', gap: 26}}>
                    <span style={{fontSize: 22, color: AMBER}}>◆</span>
                    <span style={{fontSize: 33, fontWeight: 700, color: CREAM, letterSpacing: '0.14em'}}>{q}</span>
                    <span style={{flex: 1}} />
                    <Caps style={{color: AMBER, fontSize: 15}}>ANSWERED</Caps>
                  </div>
                  <div style={{height: 1, background: 'rgba(244,232,216,0.2)'}} />
                </div>
              );
            })}
          </div>
        </>
      )}
      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center', ...logoIn}}>
            <Caps style={{marginBottom: 26}}>INTRODUCING</Caps>
            <div style={{fontSize: 100, fontWeight: 700, color: CREAM, letterSpacing: '0.16em'}}>
              ADTURN <span style={{color: AMBER}}>for HR</span>
            </div>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 434, textAlign: 'center', ...subIn}}>
            <div style={{fontSize: 25, fontWeight: 700, color: DIM, letterSpacing: '0.24em', whiteSpace: 'nowrap'}}>
              人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 540, transform: 'translateX(-50%)', display: 'flex', gap: 30}}>
            {REPORTS.map((r, i) => {
              const p = interpolate(frame, [176 + i * 13, 202 + i * 13], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div
                  key={r}
                  style={{
                    width: 330,
                    padding: '30px 0 26px',
                    textAlign: 'center',
                    borderTop: `2px solid ${AMBER}`,
                    background: 'rgba(244,232,216,0.04)',
                    opacity: p,
                    transform: `translateY(${(1 - p) * 22}px)`,
                  }}
                >
                  <Caps style={{fontSize: 12}}>{String(i + 1).padStart(2, '0')}</Caps>
                  <div style={{fontSize: 27, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', marginTop: 12, whiteSpace: 'nowrap'}}>{r}</div>
                </div>
              );
            })}
          </div>
          <LowerThird at={250} en="DELIVERABLES" jp="市場ポジション ／ 眠れる魅力 ／ 人材特定 ／ トークスクリプト" />
        </>
      )}
    </AbsoluteFill>
  );
};

// ── 一般論は一行もない ──
const CNoGen: React.FC = () => {
  const b1 = useFade(12, 30);
  const b1s = useFade(46);
  return (
    <AbsoluteFill style={{fontFamily: SERIF, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', ...b1}}>
        <Caps>NO BOILERPLATE</Caps>
        <div style={{fontSize: 96, fontWeight: 700, color: CREAM, letterSpacing: '0.12em', marginTop: 40}}>
          一般論は、<span style={{color: AMBER}}>一行もない</span>。
        </div>
        <div style={{fontSize: 24, fontWeight: 700, color: DIM, letterSpacing: '0.2em', marginTop: 38, ...b1s}}>
          貴社の公開情報から、トップパフォーマーの「脳」が診断。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── マーケ導入＋断言 ──
const CMIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 100;
  const l1 = useFade(116, 34);
  const l2 = useFade(146, 34);
  const s = useFade(196);
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {!isBeat2 && (
        <CCase
          caps="CASE 02 — MARKETING"
          jp={
            <>
              例えば、<span style={{color: AMBER}}>マーケティング</span>。
            </>
          }
          sub="貴社のデジタル上の機会損失、見えていますか。"
        />
      )}
      {isBeat2 && (
        <div style={{position: 'absolute', left: 84, top: 350}}>
          <Caps>DIGITAL OPPORTUNITY LOSS</Caps>
          <div style={{fontSize: 70, fontWeight: 700, color: CREAM, letterSpacing: '0.08em', marginTop: 38, whiteSpace: 'nowrap', ...l1}}>
            デジタル上の<span style={{color: AMBER}}>機会損失</span>を、可視化。
          </div>
          <div style={{fontSize: 70, fontWeight: 700, color: CREAM, letterSpacing: '0.08em', marginTop: 24, whiteSpace: 'nowrap', ...l2}}>
            打開策を、<span style={{color: AMBER}}>具体的に出力</span>。
          </div>
          <div style={{fontSize: 24, fontWeight: 700, color: DIM, letterSpacing: '0.2em', marginTop: 40, ...s}}>
            トップパフォーマーの脳が、診断から打開策まで。
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── 診断範囲→ロードマップ ──
const CMScope: React.FC = () => {
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
          <div style={{position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center', ...h1}}>
            <Caps>DIAGNOSTIC SCOPE — 診断範囲</Caps>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 420, transform: 'translateX(-50%)', display: 'flex', gap: 34}}>
            {SCOPE.map((sc, i) => {
              const p = interpolate(frame, [14 + i * 11, 34 + i * 11], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <div key={sc} style={{width: 340, padding: '40px 0', textAlign: 'center', borderTop: `2px solid ${AMBER}`, background: 'rgba(244,232,216,0.04)', opacity: p, transform: `translateY(${(1 - p) * 22}px)`}}>
                  <Caps style={{fontSize: 12}}>{String(i + 1).padStart(2, '0')}</Caps>
                  <div style={{fontSize: 40, fontWeight: 700, color: CREAM, letterSpacing: '0.12em', marginTop: 14}}>{sc}</div>
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
            <div style={{fontSize: 74, fontWeight: 700, color: CREAM, letterSpacing: '0.1em', marginTop: 44, whiteSpace: 'nowrap'}}>
              何を、<span style={{color: AMBER}}>どの順番で</span>、どう直すべきか。
            </div>
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 310, textAlign: 'center', ...h3}}>
            <Caps>FROM DIAGNOSIS TO EXECUTION</Caps>
            <div style={{fontSize: 46, fontWeight: 700, color: CREAM, letterSpacing: '0.14em', marginTop: 28}}>
              診断で、<span style={{color: AMBER}}>終わらせない</span>。
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 540, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center'}}>
            {ROAD.map((r, i) => {
              const p = interpolate(frame, [340 + i * 26, 366 + i * 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
              return (
                <React.Fragment key={r}>
                  <div style={{padding: '34px 52px', borderTop: `2px solid ${AMBER}`, background: 'rgba(244,232,216,0.04)', fontSize: 34, fontWeight: 700, color: CREAM, whiteSpace: 'nowrap', letterSpacing: '0.08em', opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>
                    {r}
                  </div>
                  {i < 2 && <div style={{width: 74, height: 1, background: 'rgba(232,163,76,0.7)', margin: '0 8px', opacity: p}} />}
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
const CMReveal: React.FC = () => {
  const logoIn = useFade(14, 40);
  const sub = useFade(64);
  return (
    <AbsoluteFill style={{fontFamily: SERIF, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', ...logoIn}}>
        <Caps style={{marginBottom: 30}}>INTRODUCING</Caps>
        <div style={{fontSize: 104, fontWeight: 700, color: CREAM, letterSpacing: '0.14em', whiteSpace: 'nowrap'}}>
          ADTURN <span style={{color: AMBER}}>for Marketing</span>
        </div>
        <div style={{fontSize: 27, fontWeight: 700, color: DIM, letterSpacing: '0.26em', marginTop: 40, ...sub}}>
          デジタル上の機会損失に、すべての打開策を。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── フィナーレ ──
const CFinale: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 215 ? 1 : frame < 510 ? 2 : frame < 645 ? 3 : 4;
  const h1 = useFade(6);
  const p1 = useFade(22, 36);
  const p2 = useFade(108, 36);
  const core = useFade(224, 36);
  const prods = useFade(292, 34);
  const tsub = useFade(332);
  const b3 = useFade(520, 40);
  const b4a = useFade(658, 40);
  const b4b = useFade(680);
  const b4c = useFade(700);
  const PRODUCTS = ['ADTURN for HR', 'ADTURN for Marketing'];
  const PSUB = ['人事・採用', 'マーケティング'];
  const lockup = (name: string, subT: string, anim: {opacity: number; transform: string}) => (
    <div style={{display: 'flex', alignItems: 'baseline', gap: 30, padding: '26px 58px', borderTop: `2px solid ${AMBER}`, background: 'rgba(244,232,216,0.04)', ...anim}}>
      <div style={{fontSize: 48, fontWeight: 700, color: CREAM, letterSpacing: '0.06em'}}>{name}</div>
      <div style={{fontSize: 21, fontWeight: 700, color: DIM, letterSpacing: '0.14em'}}>{subT}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{fontFamily: SERIF}}>
      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 40}}>
          <Caps style={{...h1}}>PRODUCTS — デジブレから生まれたプロダクト</Caps>
          {lockup(PRODUCTS[0], PSUB[0], p1)}
          {lockup(PRODUCTS[1], PSUB[1], p2)}
        </AbsoluteFill>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 60}}>
          <div style={{textAlign: 'center', ...core}}>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 24, padding: '22px 60px', border: `2px solid ${AMBER}`, borderRadius: 999}}>
              <div style={{width: 38, height: 38, borderRadius: '50%', border: `10px solid ${AMBER}`}} />
              <span style={{fontSize: 56, fontWeight: 700, color: CREAM, letterSpacing: '0.1em'}}>デジブレ</span>
            </div>
          </div>
          <div style={{width: 2, height: 60, background: 'rgba(232,163,76,0.6)', margin: '18px 0'}} />
          <div style={{display: 'flex', gap: 80, ...prods}}>
            {PRODUCTS.map((p, i) => (
              <div key={p} style={{padding: '22px 44px', borderTop: `2px solid ${AMBER}`, background: 'rgba(244,232,216,0.04)', textAlign: 'center'}}>
                <div style={{fontSize: 36, fontWeight: 700, color: CREAM}}>{p}</div>
                <div style={{fontSize: 19, fontWeight: 700, color: DIM, marginTop: 6, letterSpacing: '0.14em'}}>{PSUB[i]}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize: 30, fontWeight: 700, color: DIM, letterSpacing: '0.18em', marginTop: 50, ...tsub}}>
            それぞれの分野の、トップパフォーマーの脳を<span style={{color: AMBER}}>転写</span>して実現。
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center', ...b3}}>
            <Caps style={{marginBottom: 40}}>NEXT — YOUR OWN MODEL</Caps>
            <div style={{fontSize: 82, fontWeight: 700, color: CREAM, letterSpacing: '0.1em'}}>
              さあ、次は<span style={{color: AMBER}}>貴社専用</span>に
            </div>
            <div style={{fontSize: 82, fontWeight: 700, color: CREAM, letterSpacing: '0.1em', marginTop: 18}}>カスタマイズを。</div>
          </div>
        </AbsoluteFill>
      )}
      {beat === 4 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{display: 'flex', justifyContent: 'center', ...b4a}}>
              <div style={{width: 120, height: 120, borderRadius: '50%', border: `3px solid ${AMBER}`, boxShadow: '0 0 80px rgba(232,163,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{width: 44, height: 44, borderRadius: '50%', border: `12px solid ${AMBER}`}} />
              </div>
            </div>
            <div style={{fontSize: 120, fontWeight: 700, color: CREAM, letterSpacing: '0.2em', marginTop: 46, ...b4a}}>
              デジ<span style={{color: AMBER}}>ブレ</span>
            </div>
            <div style={{fontSize: 22, fontWeight: 700, color: DIM, letterSpacing: '0.2em', marginTop: 26, ...b4b}}>
              世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
            </div>
            <div style={{marginTop: 44, ...b4c}}>
              <span style={{display: 'inline-block', padding: '18px 52px', border: `1.5px solid ${AMBER}`, fontSize: 26, fontWeight: 700, color: CREAM, letterSpacing: '0.24em'}}>
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

export const AdturnCinemaVideo: React.FC = () => {
  const s = V3D_SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const SCENE_LIST: Array<[keyof typeof V3D_SCENES, React.FC]> = [
    ['tech', C1],
    ['engine', C2],
    ['intro', () => (
      <CCase
        caps="CASE 01 — RECRUITMENT"
        jp={
          <>
            例えば、<span style={{color: AMBER}}>採用</span>。
          </>
        }
        sub="貴社は、この問いに、即答できますか。"
      />
    )],
    ['q1', () => <CQ roman="I" index="QUESTION 01 ／ 03" lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']} sub="貴社が選ばれる「構造上の理由」を言えますか。" />],
    ['q2', () => <CQ roman="II" index="QUESTION 02 ／ 03" lines={['「語っていない魅力」が、', '社内に眠っていませんか？']} sub="誰も武器だと気づいていない事実、ありませんか。" />],
    ['q3', () => <CQ roman="III" index="QUESTION 03 ／ 03" lines={['面接で競合と迷う学生に、', '「何」と語りますか？']} sub="内定承諾の瀬戸際で使う「一言」、ありますか。" />],
    ['answer', CAnswer],
    ['nogen', CNoGen],
    ['mintro', CMIntro],
    ['mq1', () => <CQ roman="I" index="MARKETING 01 ／ 03" lines={['検索されたとき、', '選択肢に入っていますか？']} sub="比較検討の入口は、検索から始まります。" />],
    ['mq2', () => <CQ roman="II" index="MARKETING 02 ／ 03" lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']} sub="営業資料の強みと、Webの見え方は一致していますか。" />],
    ['mq3', () => <CQ roman="III" index="MARKETING 03 ／ 03" lines={['見込み客を、', '問い合わせまで運べていますか？']} sub="流入から問い合わせまでの導線、途切れていませんか。" />],
    ['mscope', CMScope],
    ['mreveal', CMReveal],
    ['finale', CFinale],
  ];
  return (
    <AbsoluteFill style={{background: BG}}>
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {/* かすかな琥珀のアトモスフィア */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 52% at 50% 42%, rgba(232,163,76,0.07), transparent 62%)'}} />
      <CinemaStage />
      {SCENE_LIST.map(([key, Comp]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`C ${key}`}>
          <SceneFade duration={s[key]}>
            <Comp />
          </SceneFade>
        </Sequence>
      ))}
      <FilmChrome />
    </AbsoluteFill>
  );
};
