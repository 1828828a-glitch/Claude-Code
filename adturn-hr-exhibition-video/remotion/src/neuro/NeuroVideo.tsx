import React from 'react';
import {AbsoluteFill, Audio, Loop, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FONT, V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {Bracket} from '../vaience/VaienceDemo';

// ── ニューロン・マイクロスコピー フル版(4775f = 159s) ──
// Runway(Veo 3.1)生成のフォトリアル・プレートを全シーンに敷き、
// ラボHUD+タイポ+ナレーション+BGMを合成。台本・構成は本編と同一。

const SCENES = V3D_SCENES;
const TOTAL = V3D_TOTAL_FRAMES;
const CYAN = '#5FE8FF';
const GOLD = '#FFD98C';
const WHITE = '#EAF8FF';
const DIM = 'rgba(234,248,255,0.55)';
const BG = '#020a12';

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

// ── プレート(8秒素材をループ+ドリフト。継ぎ目は微小な沈み込みで隠す) ──
const LOOP_F = 238;
const Plate: React.FC<{src: string; mirror?: boolean; dark?: number}> = ({src, mirror, dark = 0}) => {
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
            opacity: interpolate(frame % LOOP_F, [0, 7, LOOP_F - 7, LOOP_F], [0.35, 0, 0, 0.35], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        />
      </AbsoluteFill>
      {dark > 0 && <AbsoluteFill style={{background: BG, opacity: dark}} />}
      {/* トーン統一グレード+ビネット */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(2,10,18,0.28), rgba(2,10,18,0.05) 40%, rgba(2,10,18,0.32))', mixBlendMode: 'multiply'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 105% 85% at 50% 48%, transparent 52%, rgba(1,6,12,0.72) 100%)'}} />
    </AbsoluteFill>
  );
};

// ── HUD ──
const Hud: React.FC<{title: string; state: string}> = ({title, state}) => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [4, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mono: React.CSSProperties = {fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.32em', fontVariantNumeric: 'tabular-nums'};
  const depth = (-120 - frame * 0.06).toFixed(1);
  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none', opacity: boot}}>
      <Bracket x={54} y={54} o={boot} />
      <Bracket x={1820} y={54} flipX o={boot} />
      <Bracket x={54} y={980} flipY o={boot} />
      <Bracket x={1820} y={980} flipX flipY o={boot} />
      <div style={{position: 'absolute', top: 60, left: 120, ...mono}}>
        <span style={{color: CYAN}}>{title}</span>
      </div>
      <div style={{position: 'absolute', top: 60, right: 120, textAlign: 'right', ...mono}}>DEPTH {depth} µm</div>
      <div style={{position: 'absolute', bottom: 62, right: 120, textAlign: 'right', ...mono}}>
        <span style={{color: CYAN, opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 10))}}>●</span>
        {'　'}
        {state}
      </div>
    </AbsoluteFill>
  );
};

const Rise: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * 26}px)`, ...style}}>{children}</div>;
};

// シーンフェード
const Fade: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14, dur - 14, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o, fontFamily: FONT}}>{children}</AbsoluteFill>;
};

// 下部スクリム(テキスト可読性)
const Scrim: React.FC<{o?: number}> = ({o = 1}) => (
  <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(2,10,18,0.82) 0%, rgba(2,10,18,0.3) 26%, transparent 46%)', opacity: o}} />
);

const glowText = (color = 'rgba(95,232,255,0.4)'): React.CSSProperties => ({textShadow: `0 0 50px ${color}`});

// ══ S1 技術宣言 ══
const NTech: React.FC = () => {
  const local = useCurrentFrame();
  const t1 = interpolate(local, [30, 58], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(local, [180, 210], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const badge = interpolate(local, [235, 262], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={315}>
      <Plate src="video/neuron_veo1.mp4" />
      <Hud title="SPECIMEN 001 ── LIVE TISSUE ／ 脳転写プロセス" state={local < 120 ? 'OBSERVING' : 'TRANSCRIBING'} />
      {out1 > 0 && (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: out1}}>
          <Scrim o={t1} />
          <div style={{fontSize: 44, fontWeight: 700, color: DIM, letterSpacing: '0.12em', opacity: t1, position: 'relative'}}>トップパフォーマーの</div>
          <div style={{fontSize: 92, fontWeight: 900, color: WHITE, marginTop: 14, opacity: t1, position: 'relative', ...glowText()}}>
            脳を、AIに<span style={{color: local >= 118 ? GOLD : CYAN}}>転写</span>する。
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: badge}}>
        <Scrim o={badge} />
        <div style={{fontSize: 58, fontWeight: 900, color: WHITE, position: 'relative', ...glowText()}}>
          世界初のAIエンジン──<span style={{color: CYAN}}>デジブレ</span>。
        </div>
        <div style={{fontSize: 22, fontWeight: 700, color: DIM, letterSpacing: '0.32em', marginTop: 18, position: 'relative'}}>
          オリジナルAIエンジン ／ 特許出願中 ／ ADTURN
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

// ══ S2 技術の中身 ══
const NEngine: React.FC = () => {
  const local = useCurrentFrame();
  const count = Math.round(interpolate(local, [20, 100], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const b2 = interpolate(local, [235, 258], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];
  return (
    <Fade dur={400}>
      <Plate src="video/plate_engine_wide.mp4" dark={0.14} />
      <Hud title="ARCHIVE ── 転写済みの脳" state="COPIED" />
      {b2 < 1 && (
        <AbsoluteFill style={{opacity: 1 - b2}}>
          <div style={{position: 'absolute', left: 130, top: 290}}>
            <div style={{fontSize: 44, fontWeight: 700, color: DIM, ...glowText('rgba(2,10,18,0.9)')}}>各領域のトップパフォーマー</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6}}>
              <span style={{fontSize: 76, fontWeight: 900, color: WHITE}}>約</span>
              <span style={{fontSize: 250, fontWeight: 900, color: CYAN, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, textShadow: '0 0 60px rgba(95,232,255,0.55)'}}>
                {count}
              </span>
              <span style={{fontSize: 76, fontWeight: 900, color: WHITE}}>名</span>
            </div>
            <div style={{fontSize: 60, fontWeight: 900, color: WHITE, ...glowText()}}>
              の脳を、<span style={{color: GOLD}}>コピー済み。</span>
            </div>
            <Rise at={110}>
              <div style={{fontSize: 27, fontWeight: 500, color: DIM, marginTop: 30}}>脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。</div>
            </Rise>
          </div>
          <div style={{position: 'absolute', right: 130, bottom: 150, display: 'flex', gap: 12, flexWrap: 'wrap', width: 640, justifyContent: 'flex-end'}}>
            {DOMAINS.map((d, i) => (
              <div
                key={d}
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: WHITE,
                  border: '1.5px solid rgba(95,232,255,0.5)',
                  background: 'rgba(2,10,18,0.45)',
                  padding: '9px 20px',
                  borderRadius: 999,
                  opacity: interpolate(local, [40 + i * 10, 56 + i * 10], [0, 0.92], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
                  letterSpacing: '0.08em',
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: b2}}>
          <div style={{fontSize: 78, fontWeight: 900, color: WHITE, textAlign: 'center', ...glowText()}}>
            レシピではなく、<span style={{color: GOLD}}>料理そのもの</span>を出力。
          </div>
          <div style={{display: 'flex', gap: 60, marginTop: 70}}>
            <Rise at={268}>
              <div style={{width: 600, padding: '40px 46px', border: '1.5px solid rgba(234,248,255,0.3)', borderRadius: 8, background: 'rgba(2,10,18,0.6)'}}>
                <div style={{fontSize: 34, fontWeight: 700, color: DIM}}>既存のAIツール</div>
                <div style={{fontSize: 28, fontWeight: 500, color: DIM, marginTop: 18, lineHeight: 1.7}}>
                  一般的な回答を出力し、
                  <br />
                  業務を「補助」する。
                </div>
              </div>
            </Rise>
            <Rise at={284}>
              <div style={{width: 640, padding: '40px 46px', border: `2px solid ${CYAN}`, borderRadius: 8, background: 'rgba(2,10,18,0.6)', boxShadow: '0 0 60px rgba(95,232,255,0.3)'}}>
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
    </Fade>
  );
};

// ══ S3 例えば、採用。 ══
const NIntro: React.FC = () => (
  <Fade dur={190}>
    <Plate src="video/plate_calm_sparse.mp4" />
    <Hud title="CASE 01 ── 採用" state="SCANNING" />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Scrim />
      <Rise at={8} style={{position: 'relative'}}>
        <div style={{fontSize: 150, fontWeight: 900, color: WHITE, ...glowText('rgba(95,232,255,0.5)')}}>
          例えば、<span style={{color: CYAN}}>採用</span>。
        </div>
      </Rise>
      <Rise at={64} style={{position: 'relative'}}>
        <div style={{fontSize: 40, fontWeight: 700, color: DIM, marginTop: 40}}>貴社は、この問いに即答できますか。</div>
      </Rise>
    </AbsoluteFill>
  </Fade>
);

// ══ 問いシーン共通 ══
const NQuestion: React.FC<{
  plate: string;
  mirror?: boolean;
  num: string;
  tag: string;
  lines: string[];
  sub: string;
  active: number;
  dur: number;
  extra?: React.ReactNode;
}> = ({plate, mirror, num, tag, lines, sub, active, dur, extra}) => {
  const local = useCurrentFrame();
  return (
    <Fade dur={dur}>
      <Plate src={plate} mirror={mirror} dark={0.1} />
      <Hud title={`QUESTION ── ${tag}`} state="ANALYZING" />
      <div
        style={{
          position: 'absolute',
          right: 60,
          bottom: -140,
          fontSize: 800,
          fontWeight: 100,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: '2px rgba(95,232,255,0.28)',
          fontFamily: FONT,
        }}
      >
        {num}
      </div>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 130, paddingRight: 110}}>
        <div style={{fontSize: 24, fontWeight: 700, color: CYAN, letterSpacing: '0.4em', marginBottom: 32, opacity: interpolate(local, [6, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          QUESTION {num}
        </div>
        {lines.map((l, i) => (
          <Rise key={l} at={18 + i * 14}>
            <div style={{fontSize: 82, fontWeight: 900, color: WHITE, lineHeight: 1.36, textShadow: '0 2px 40px rgba(2,10,18,0.9), 0 0 60px rgba(95,232,255,0.3)'}}>{l}</div>
          </Rise>
        ))}
        <Rise at={62}>
          <div style={{fontSize: 30, fontWeight: 500, color: DIM, marginTop: 30, textShadow: '0 2px 20px rgba(2,10,18,0.9)'}}>{sub}</div>
        </Rise>
        {extra}
      </AbsoluteFill>
      <div style={{position: 'absolute', bottom: 70, left: 130, display: 'flex', gap: 16}}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{width: i === active ? 54 : 16, height: 5, background: i === active ? CYAN : 'rgba(234,248,255,0.3)', borderRadius: 3}} />
        ))}
      </div>
    </Fade>
  );
};

const NQ1: React.FC = () => (
  <NQuestion plate="video/plate_severed_gap.mp4" num="1" tag="POSITION" active={0} dur={250}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

const NQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['定着率', '技術力', '歴史', '福利厚生', '外部評価'];
  return (
    <NQuestion plate="video/plate_dormant_dark.mp4" num="2" tag="HIDDEN ASSETS" active={1} dur={295}
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
                border: '1.5px solid rgba(95,232,255,0.45)',
                background: 'rgba(2,10,18,0.4)',
                borderRadius: 999,
                padding: '12px 28px',
                opacity: 0.22 + 0.5 * Math.abs(Math.sin(local / 20 + i * 1.4)),
                textShadow: '0 0 30px rgba(95,232,255,0.6)',
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

const NQ3: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <NQuestion plate="video/plate_severed_gap.mp4" mirror num="3" tag="CLOSING" active={2} dur={240}
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
      extra={
        <div style={{marginTop: 44, display: 'flex', alignItems: 'center', gap: 26}}>
          <div style={{width: 360, height: 120, border: '2px dashed rgba(95,232,255,0.55)', background: 'rgba(2,10,18,0.4)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{width: 16, height: 16, borderRadius: '50%', background: CYAN, opacity: 0.25 + 0.75 * Math.max(0, Math.sin(local / 7 - i))}} />
            ))}
          </div>
          <div style={{fontSize: 30, fontWeight: 700, color: GOLD}}>貴社の「一言」＝ ？</div>
        </div>
      }
    />
  );
};

// ══ S7 答え ══
const NAnswer: React.FC = () => {
  const local = useCurrentFrame();
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  const b2 = interpolate(local, [100, 122], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={460}>
      <Plate src="video/plate_reconnect_burst.mp4" dark={0.12} />
      <Hud title="SOLUTION ── 再結線" state="CONNECTED" />
      {b2 < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - b2}}>
          <div style={{fontSize: 74, fontWeight: 900, color: WHITE, ...glowText()}}>
            4つの問い、<span style={{color: CYAN}}>すべてに答え</span>を。
          </div>
          <div style={{display: 'flex', gap: 28, marginTop: 60}}>
            {QUESTIONS.map((q, i) => (
              <Rise key={q} at={20 + i * 11}>
                <div style={{position: 'relative', fontSize: 30, fontWeight: 700, color: WHITE, border: '1.5px solid rgba(95,232,255,0.5)', background: 'rgba(2,10,18,0.55)', borderRadius: 10, padding: '34px 30px'}}>
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
          <div style={{fontSize: 100, fontWeight: 900, color: WHITE, textShadow: '0 0 80px rgba(95,232,255,0.5)'}}>
            ADTURN <span style={{color: CYAN}}>for HR</span>
          </div>
          <Rise at={140}>
            <div style={{fontSize: 32, fontWeight: 700, color: DIM, marginTop: 16, textShadow: '0 2px 20px rgba(2,10,18,0.9)'}}>
              人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
            </div>
          </Rise>
          <div style={{display: 'flex', gap: 26, marginTop: 54}}>
            {REPORTS.map((r, i) => (
              <Rise key={r} at={170 + i * 12}>
                <div style={{width: 290, border: '1.5px solid rgba(95,232,255,0.45)', borderRadius: 10, padding: '24px 22px', background: 'rgba(2,10,18,0.62)'}}>
                  <div style={{fontSize: 17, fontWeight: 700, color: CYAN, letterSpacing: '0.3em'}}>REPORT {String(i + 1).padStart(2, '0')}</div>
                  <div style={{fontSize: 28, fontWeight: 900, color: WHITE, marginTop: 12, minHeight: 80}}>{r}</div>
                  {[0, 1, 2].map((j) => (
                    <div key={j} style={{height: 5, background: 'rgba(234,248,255,0.2)', marginTop: 9, width: `${86 - j * 16}%`, borderRadius: 3}} />
                  ))}
                </div>
              </Rise>
            ))}
          </div>
          <Rise at={300}>
            <div style={{display: 'flex', gap: 18, marginTop: 44, fontSize: 24, fontWeight: 700, color: DIM, textShadow: '0 2px 20px rgba(2,10,18,0.9)'}}>
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
    </Fade>
  );
};

// ══ S8 一般論 ══
const NNoGen: React.FC = () => (
  <Fade dur={130}>
    <Plate src="video/plate_dormant_dark.mp4" mirror dark={0.24} />
    <Hud title="VERIFICATION" state="0 BOILERPLATE" />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Rise at={6}>
        <div style={{fontSize: 106, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.4, ...glowText('rgba(95,232,255,0.4)')}}>
          一般論は、<span style={{color: GOLD}}>一行もない。</span>
        </div>
      </Rise>
      <Rise at={44}>
        <div style={{fontSize: 30, fontWeight: 500, color: DIM, marginTop: 38}}>貴社の公開情報から、トップパフォーマーの「脳」が診断。</div>
      </Rise>
    </AbsoluteFill>
  </Fade>
);

// ══ M1 例えば、マーケティング。 ══
const NMIntro: React.FC = () => {
  const local = useCurrentFrame();
  const b2 = interpolate(local, [96, 118], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={440}>
      <Plate src="video/plate_region2.mp4" />
      <Hud title="CASE 02 ── マーケティング" state="SCANNING" />
      {b2 < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - b2}}>
          <Scrim />
          <div style={{fontSize: 118, fontWeight: 900, color: WHITE, position: 'relative', ...glowText('rgba(95,232,255,0.5)')}}>
            例えば、<span style={{color: CYAN}}>マーケティング</span>。
          </div>
          <Rise at={54} style={{position: 'relative'}}>
            <div style={{fontSize: 40, fontWeight: 700, color: DIM, marginTop: 42}}>貴社のデジタル上の機会損失、見えていますか。</div>
          </Rise>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 130, opacity: b2}}>
          <div style={{fontSize: 80, fontWeight: 900, color: WHITE, textShadow: '0 2px 40px rgba(2,10,18,0.9), 0 0 60px rgba(95,232,255,0.3)'}}>
            機会損失を、<span style={{color: GOLD}}>可視化</span>。
          </div>
          <div style={{fontSize: 80, fontWeight: 900, color: WHITE, marginTop: 22, textShadow: '0 2px 40px rgba(2,10,18,0.9), 0 0 60px rgba(95,232,255,0.3)'}}>
            打開策を、<span style={{color: CYAN}}>具体的に出力</span>。
          </div>
          <Rise at={200}>
            <div style={{fontSize: 30, fontWeight: 500, color: DIM, marginTop: 40, textShadow: '0 2px 20px rgba(2,10,18,0.9)'}}>
              トップパフォーマーの脳が、診断から打開策まで。
            </div>
          </Rise>
        </AbsoluteFill>
      )}
    </Fade>
  );
};

// ══ M2-M4 ══
const NMQ1: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <NQuestion plate="video/plate_severed_gap.mp4" num="1" tag="SEARCH" active={0} dur={180}
      lines={['検索されたとき、', '選択肢に入っていますか？']}
      sub="比較検討の入口は、検索から始まります。"
      extra={
        <div style={{marginTop: 42, display: 'flex', alignItems: 'center', gap: 28}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, width: 540, padding: '20px 32px', border: '1.5px solid rgba(95,232,255,0.55)', borderRadius: 999, background: 'rgba(2,10,18,0.55)'}}>
            <div style={{width: 24, height: 24, borderRadius: '50%', border: `4px solid ${CYAN}`, position: 'relative'}}>
              <div style={{position: 'absolute', right: -9, bottom: -6, width: 12, height: 4, background: CYAN, transform: 'rotate(45deg)'}} />
            </div>
            <span style={{fontSize: 30, fontWeight: 700, color: WHITE}}>
              おすすめ 会社 <span style={{opacity: 0.35 + 0.65 * Math.abs(Math.sin(local / 10)), color: CYAN}}>▍</span>
            </span>
          </div>
          <div style={{fontSize: 30, fontWeight: 900, color: GOLD}}>貴社名 ＝ 圏外？</div>
        </div>
      }
    />
  );
};

const NMQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['技術力', '実績', 'サポート'];
  return (
    <NQuestion plate="video/plate_dormant_dark.mp4" num="2" tag="WEB VISIBILITY" active={1} dur={195}
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
                border: '1.5px solid rgba(95,232,255,0.45)',
                background: 'rgba(2,10,18,0.4)',
                borderRadius: 999,
                padding: '12px 30px',
                opacity: Math.max(0.07, 0.85 - Math.max(0, local - 40 - i * 26) * 0.012),
                textShadow: '0 0 30px rgba(95,232,255,0.6)',
              }}
            >
              {w}
            </div>
          ))}
          <div style={{fontSize: 27, fontWeight: 700, color: GOLD, marginLeft: 10}}>Web上では ＝ 不可視</div>
        </div>
      }
    />
  );
};

const NMQ3: React.FC = () => {
  const local = useCurrentFrame();
  const FUNNEL = ['流入', '比較', '問い合わせ'];
  return (
    <NQuestion plate="video/plate_calm_sparse.mp4" mirror num="3" tag="LEAD PATH" active={2} dur={180}
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
                  border: i === 1 ? '2px dashed rgba(255,217,140,0.7)' : '1.5px solid rgba(95,232,255,0.55)',
                  borderRadius: 12,
                  padding: '16px 34px',
                  background: 'rgba(2,10,18,0.5)',
                }}
              >
                {s}
                {i === 1 && <span style={{marginLeft: 12, color: GOLD, opacity: 0.5 + 0.5 * Math.abs(Math.sin(local / 9))}}>✕</span>}
              </div>
              {i < 2 && <div style={{width: 44, height: 3, background: 'rgba(95,232,255,0.5)', borderRadius: 2}} />}
            </React.Fragment>
          ))}
        </div>
      }
    />
  );
};

// ══ M5 診断範囲 ══
const NMScope: React.FC = () => {
  const local = useCurrentFrame();
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const SCOPE_EN = ['COMPETITIVE', 'SEARCH PATH', 'CONTENT', 'AI SEARCH'];
  const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  const beat = local < 160 ? 1 : local < 310 ? 2 : 3;
  return (
    <Fade dur={520}>
      <Plate src="video/plate_scan_sweep.mp4" dark={0.12} />
      <Hud title="DIAGNOSTIC SCOPE ── 診断範囲" state="MAPPING" />
      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 30}}>
            {SCOPE.map((s, i) => (
              <Rise key={s} at={12 + i * 10}>
                <div style={{width: 340, padding: '42px 0', textAlign: 'center', border: '1.5px solid rgba(95,232,255,0.5)', borderRadius: 12, background: 'rgba(2,10,18,0.6)', boxShadow: '0 0 50px rgba(95,232,255,0.15)'}}>
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
          <div style={{fontSize: 84, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.5, textShadow: '0 2px 40px rgba(2,10,18,0.9), 0 0 70px rgba(95,232,255,0.35)'}}>
            何を、<span style={{color: GOLD}}>どの順番</span>で、
            <br />
            どう直すべきか。
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontSize: 64, fontWeight: 900, color: WHITE, ...glowText()}}>
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
                      background: i === 2 ? CYAN : 'rgba(2,10,18,0.6)',
                      border: i === 2 ? 'none' : '1.5px solid rgba(234,248,255,0.35)',
                      borderRadius: 14,
                      padding: '26px 42px',
                      boxShadow: i === 2 ? '0 0 60px rgba(95,232,255,0.45)' : 'none',
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
    </Fade>
  );
};

// ══ M6 リビール ══
const NMReveal: React.FC = () => (
  <Fade dur={200}>
    <Plate src="video/plate_reconnect_burst.mp4" mirror />
    <Hud title="PRODUCT 02" state="CONNECTED" />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Scrim />
      <Rise at={14} style={{position: 'relative'}}>
        <div style={{fontSize: 98, fontWeight: 900, color: WHITE, textShadow: '0 0 90px rgba(95,232,255,0.5)'}}>
          ADTURN <span style={{color: CYAN}}>for Marketing</span>
        </div>
      </Rise>
      <Rise at={60} style={{position: 'relative'}}>
        <div style={{fontSize: 36, fontWeight: 700, color: DIM, marginTop: 32}}>デジタル上の機会損失に、すべての打開策を。</div>
      </Rise>
    </AbsoluteFill>
  </Fade>
);

// ══ F フィナーレ ══
const NFinale: React.FC = () => {
  const local = useCurrentFrame();
  const beat = local < 215 ? 1 : local < 510 ? 2 : local < 645 ? 3 : 4;
  const PRODUCTS = [
    ['ADTURN for HR', '人事・採用'],
    ['ADTURN for Marketing', 'マーケティング'],
  ];
  const fadeOut = interpolate(local, [758, 778], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Fade dur={780}>
      <Plate src="video/plate_nucleus_sphere.mp4" dark={beat === 4 ? 0 : 0.16} />
      <Hud title="EPILOGUE ── デジブレ" state="COMPLETE" />
      <AbsoluteFill style={{opacity: fadeOut}}>
        {beat === 1 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 40}}>
            <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '0.35em', color: DIM, textShadow: '0 2px 20px rgba(2,10,18,0.9)'}}>
              PRODUCTS ── デジブレから生まれたプロダクト
            </div>
            {PRODUCTS.map(([name, subT], i) => (
              <Rise key={name} at={22 + i * 60}>
                <div style={{display: 'flex', alignItems: 'center', gap: 30, border: '1.5px solid rgba(95,232,255,0.5)', borderRadius: 14, padding: '30px 56px', width: 860, background: 'rgba(2,10,18,0.62)'}}>
                  <div style={{width: 18, height: 18, borderRadius: '50%', background: CYAN, boxShadow: '0 0 24px rgba(95,232,255,0.85)'}} />
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
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 110}}>
            <Scrim />
            <Rise at={244} style={{position: 'relative'}}>
              <div style={{fontSize: 56, fontWeight: 900, color: WHITE, textShadow: '0 0 60px rgba(95,232,255,0.6)'}}>デジブレ</div>
            </Rise>
            <div style={{display: 'flex', gap: 80, marginTop: 40, position: 'relative'}}>
              {PRODUCTS.map(([name, subT], i) => (
                <Rise key={name} at={300 + i * 12}>
                  <div style={{border: '1.5px solid rgba(95,232,255,0.5)', borderRadius: 12, padding: '20px 38px', textAlign: 'center', background: 'rgba(2,10,18,0.62)'}}>
                    <div style={{fontSize: 34, fontWeight: 900, color: WHITE}}>{name}</div>
                    <div style={{fontSize: 20, fontWeight: 700, color: DIM, marginTop: 4}}>{subT}</div>
                  </div>
                </Rise>
              ))}
            </div>
            <Rise at={334} style={{position: 'relative'}}>
              <div style={{fontSize: 31, fontWeight: 700, color: DIM, marginTop: 44}}>
                それぞれの分野の、トップパフォーマーの脳を<span style={{color: GOLD}}>転写</span>して実現。
              </div>
            </Rise>
          </AbsoluteFill>
        )}
        {beat === 3 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Scrim />
            <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '0.35em', color: DIM, marginBottom: 38, position: 'relative'}}>NEXT ── YOUR OWN MODEL</div>
            <div style={{fontSize: 82, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.5, position: 'relative', textShadow: '0 0 80px rgba(95,232,255,0.45)'}}>
              さあ、次は<span style={{color: CYAN}}>貴社専用</span>に
              <br />
              カスタマイズを。
            </div>
          </AbsoluteFill>
        )}
        {beat === 4 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Rise at={656}>
              <div style={{fontSize: 148, fontWeight: 900, color: WHITE, textShadow: '0 0 100px rgba(95,232,255,0.65)'}}>
                デジ<span style={{color: CYAN}}>ブレ</span>
              </div>
            </Rise>
            <Rise at={678}>
              <div style={{fontSize: 25, fontWeight: 700, color: DIM, letterSpacing: '0.2em', marginTop: 28, textShadow: '0 2px 20px rgba(2,10,18,0.9)'}}>
                世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
              </div>
            </Rise>
            <Rise at={696}>
              <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 44}}>
                <div style={{fontSize: 34, fontWeight: 900, color: '#04121E', background: CYAN, padding: '15px 40px', borderRadius: 999, boxShadow: '0 0 50px rgba(95,232,255,0.6)'}}>
                  デモ実施中
                </div>
                <div style={{fontSize: 34, fontWeight: 700, color: WHITE, textShadow: '0 2px 20px rgba(2,10,18,0.9)'}}>ぜひブースでご体験ください</div>
              </div>
            </Rise>
            <div style={{position: 'absolute', bottom: 58, fontSize: 26, fontWeight: 700, letterSpacing: '0.3em', color: DIM}}>ADTANK GP</div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </Fade>
  );
};

// ══ 本体 ══
export const AdturnNeuroVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const LIST: Array<[keyof typeof s, React.FC]> = [
    ['tech', NTech], ['engine', NEngine], ['intro', NIntro], ['q1', NQ1], ['q2', NQ2], ['q3', NQ3],
    ['answer', NAnswer], ['nogen', NNoGen], ['mintro', NMIntro], ['mq1', NMQ1], ['mq2', NMQ2], ['mq3', NMQ3],
    ['mscope', NMScope], ['mreveal', NMReveal], ['finale', NFinale],
  ];
  return (
    <AbsoluteFill style={{background: BG}}>
      <Audio src={staticFile('audio/bgm_vaience_full.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {LIST.map(([key, C]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`N ${key}`}>
          <C />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
