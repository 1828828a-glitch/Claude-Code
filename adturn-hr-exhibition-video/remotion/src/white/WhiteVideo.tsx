import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {GradText, WCanvas, W_BG, W_GRAD, W_GRAY, W_INK} from './WhiteDemo';

// ── ホワイトスタジオ フル版(4775f = 159s) ──
// 白ホリゾント+黒タイポ+グラデーションアクセント。台本・構成・ナレーションは本編と同一。

const SCENES = V3D_SCENES;
const TOTAL = V3D_TOTAL_FRAMES;
const INK = W_INK;
const GRAY = W_GRAY;
const GRAD = W_GRAD;

const NARRATION: Array<[string, number]> = [
  ['n1', 15], ['n2a', 327], ['n2b', 580], ['n3', 733], ['n4', 925], ['n5', 1176], ['n6', 1459],
  ['n7a', 1696], ['n7b', 1868], ['n8a', 2159], ['m0', 2298], ['m1', 2395], ['m2', 2732], ['m3', 2912],
  ['m4', 3107], ['m5', 3283], ['m6', 3444], ['m7', 3597], ['p0', 3805], ['p1', 4005], ['p2', 4222],
  ['p3', 4515], ['p4', 4668],
];

const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.12, 0.12, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const bgmVolume = (f: number) => {
  const base = 0.85 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return base * endFade;
};

const Rise: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * 24}px)`, ...style}}>{children}</div>;
};

const Pop: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 18, stiffness: 110}});
  if (frame < at) return null;
  return <div style={{transform: `scale(${0.9 + s * 0.1})`, opacity: Math.min(s * 2, 1)}}>{children}</div>;
};

// 白ホリシーンラッパー
const Studio: React.FC<{children: React.ReactNode; dur: number; header?: string; right?: string}> = ({children, dur, header, right}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14, dur - 14, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <AbsoluteFill style={{background: 'linear-gradient(to bottom, #FBFBFC 0%, #F4F4F6 45%, #E9E9EE 100%)'}} />
      <AbsoluteFill style={{opacity: o}}>
        {header && (
          <div style={{position: 'absolute', top: 60, left: 84, fontSize: 19, fontWeight: 700, color: GRAY, letterSpacing: '0.4em'}}>{header}</div>
        )}
        {right && (
          <div style={{position: 'absolute', top: 60, right: 84, fontSize: 19, fontWeight: 700, color: GRAY, letterSpacing: '0.3em'}}>{right}</div>
        )}
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ══ S1 技術宣言(315f): タイポ→白磁の頭部 ══
const WTech: React.FC = () => {
  const local = useCurrentFrame();
  const headIn = interpolate(local, [128, 162], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shadow = interpolate(local, [140, 180], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lockup = interpolate(local, [262, 288], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Studio dur={315} header="ADTURN ── 新発表" right="特許出願中">
      {/* A: 世界初。(10-70) */}
      {local < 78 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: interpolate(local, [62, 78], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          <Pop at={12}>
            <div style={{fontSize: 200, fontWeight: 900, color: INK, letterSpacing: '0.02em'}}>世界初。</div>
          </Pop>
        </AbsoluteFill>
      )}
      {/* B: 宣言(74-130) */}
      {local >= 74 && local < 140 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: interpolate(local, [124, 140], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          <Pop at={78}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 58, fontWeight: 700, color: GRAY, letterSpacing: '0.06em'}}>トップパフォーマーの</div>
              <div style={{fontSize: 100, fontWeight: 900, color: INK, letterSpacing: '0.02em', marginTop: 20}}>
                脳を、AIに<GradText>転写</GradText>する。
              </div>
            </div>
          </Pop>
        </AbsoluteFill>
      )}
      {/* C: 白磁の頭部が開く(128-315) */}
      <AbsoluteFill style={{opacity: headIn}}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 892,
            width: 850,
            height: 130,
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(29,29,31,0.3), transparent 70%)',
            filter: 'blur(6px)',
            opacity: shadow,
          }}
        />
        <WCanvas openStart={185} openDur={50} camFrom={130} dur={315} />
      </AbsoluteFill>
      {lockup > 0 && (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 90, opacity: lockup}}>
          <div style={{fontSize: 50, fontWeight: 900, color: INK, letterSpacing: '0.1em'}}>デジブレ</div>
          <div style={{width: 200, height: 3, background: GRAD, borderRadius: 2, marginTop: 16}} />
          <div style={{fontSize: 20, fontWeight: 500, color: GRAY, letterSpacing: '0.22em', marginTop: 16}}>
            オリジナルAIエンジン ｜ 世界初 ・ 特許出願中
          </div>
        </AbsoluteFill>
      )}
    </Studio>
  );
};

// ══ S2 技術の中身(400f) ══
const WEngine: React.FC = () => {
  const local = useCurrentFrame();
  const count = Math.round(interpolate(local, [18, 96], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const b2 = interpolate(local, [235, 258], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];
  return (
    <Studio dur={400} header="THE ENGINE ── 転写済みの脳" right="デジブレ">
      {b2 < 1 && (
        <AbsoluteFill style={{opacity: 1 - b2}}>
          <div style={{position: 'absolute', left: 120, top: 280}}>
            <div style={{fontSize: 48, fontWeight: 700, color: GRAY}}>各領域のトップパフォーマー</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4}}>
              <span style={{fontSize: 84, fontWeight: 900, color: INK}}>約</span>
              <span style={{fontSize: 270, fontWeight: 900, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>
                {count}
              </span>
              <span style={{fontSize: 84, fontWeight: 900, color: INK}}>名</span>
            </div>
            <div style={{fontSize: 64, fontWeight: 900, color: INK}}>
              の脳を、<GradText>コピー済み。</GradText>
            </div>
            <Rise at={108}>
              <div style={{fontSize: 28, fontWeight: 500, color: GRAY, marginTop: 30}}>脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。</div>
            </Rise>
          </div>
          {/* 右: ドットグリッド40 */}
          <div style={{position: 'absolute', right: 130, top: 280, width: 500, display: 'flex', flexWrap: 'wrap', gap: 22}}>
            {Array.from({length: 40}).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: i < count ? GRAD : 'rgba(29,29,31,0.08)',
                  boxShadow: i < count ? '0 6px 18px rgba(120,90,240,0.25)' : 'none',
                }}
              />
            ))}
          </div>
          <div style={{position: 'absolute', right: 130, bottom: 120, display: 'flex', gap: 12, flexWrap: 'wrap', width: 640, justifyContent: 'flex-end'}}>
            {DOMAINS.map((d, i) => (
              <div
                key={d}
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: INK,
                  background: '#FFFFFF',
                  border: '1px solid rgba(29,29,31,0.12)',
                  boxShadow: '0 8px 24px rgba(29,29,31,0.07)',
                  padding: '10px 22px',
                  borderRadius: 999,
                  opacity: interpolate(local, [36 + i * 10, 52 + i * 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
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
          <div style={{fontSize: 80, fontWeight: 900, color: INK, textAlign: 'center'}}>
            レシピではなく、<GradText>料理そのもの</GradText>を出力。
          </div>
          <div style={{display: 'flex', gap: 56, marginTop: 64}}>
            <Rise at={268}>
              <div style={{width: 600, padding: '42px 46px', borderRadius: 24, background: '#FFFFFF', border: '1px solid rgba(29,29,31,0.1)', boxShadow: '0 20px 50px rgba(29,29,31,0.06)'}}>
                <div style={{fontSize: 36, fontWeight: 700, color: GRAY}}>既存のAIツール</div>
                <div style={{fontSize: 28, fontWeight: 500, color: GRAY, marginTop: 18, lineHeight: 1.7}}>
                  一般的な回答を出力し、
                  <br />
                  業務を「補助」する。
                </div>
              </div>
            </Rise>
            <Rise at={284}>
              <div style={{width: 640, padding: '42px 46px', borderRadius: 24, background: '#FFFFFF', border: '2px solid transparent', backgroundImage: `linear-gradient(#FFFFFF, #FFFFFF), ${GRAD}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 24px 60px rgba(120,90,240,0.14)'}}>
                <div style={{fontSize: 36, fontWeight: 900}}>
                  <GradText>デジブレ</GradText>
                </div>
                <div style={{fontSize: 28, fontWeight: 700, color: INK, marginTop: 18, lineHeight: 1.7}}>
                  提案書・分析・戦略「そのもの」を
                  <br />
                  トップパフォーマー品質で出力。
                </div>
              </div>
            </Rise>
          </div>
        </AbsoluteFill>
      )}
    </Studio>
  );
};

// ══ S3 例えば、採用。(190f) ══
const WIntro: React.FC = () => (
  <Studio dur={190} header="CASE 01 ── 採用">
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Pop at={10}>
        <div style={{fontSize: 160, fontWeight: 900, color: INK}}>
          例えば、<GradText>採用</GradText>。
        </div>
      </Pop>
      <Rise at={64}>
        <div style={{fontSize: 42, fontWeight: 700, color: GRAY, marginTop: 40}}>貴社は、この問いに即答できますか。</div>
      </Rise>
    </AbsoluteFill>
  </Studio>
);

// ══ 問いシーン共通 ══
const WQuestion: React.FC<{
  num: string;
  tag: string;
  lines: string[];
  sub: string;
  active: number;
  dur: number;
  extra?: React.ReactNode;
}> = ({num, tag, lines, sub, active, dur, extra}) => (
  <Studio dur={dur} header={`QUESTION ── ${tag}`}>
    {/* 巨大グラデ数字 */}
    <div style={{position: 'absolute', right: 70, bottom: -130, fontSize: 820, fontWeight: 900, lineHeight: 1, background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', opacity: 0.1}}>
      {num}
    </div>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 120, paddingRight: 110}}>
      <Rise at={6}>
        <div style={{fontSize: 30, fontWeight: 900, color: '#FFFFFF', background: INK, padding: '10px 26px', borderRadius: 999, letterSpacing: '0.16em'}}>
          Q{num}
        </div>
      </Rise>
      <div style={{height: 38}} />
      {lines.map((l, i) => (
        <Rise key={l} at={18 + i * 13}>
          <div style={{fontSize: 88, fontWeight: 900, color: INK, lineHeight: 1.34}}>{l}</div>
        </Rise>
      ))}
      <Rise at={60}>
        <div style={{fontSize: 31, fontWeight: 500, color: GRAY, marginTop: 30}}>{sub}</div>
      </Rise>
      {extra}
    </AbsoluteFill>
    <div style={{position: 'absolute', bottom: 70, left: 120, display: 'flex', gap: 14}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: i === active ? 52 : 16, height: 8, borderRadius: 99, background: i === active ? INK : 'rgba(29,29,31,0.15)'}} />
      ))}
    </div>
  </Studio>
);

const WQ1: React.FC = () => (
  <WQuestion num="1" tag="POSITION" active={0} dur={250}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

const WQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['定着率', '技術力', '歴史', '福利厚生', '外部評価'];
  return (
    <WQuestion num="2" tag="HIDDEN ASSETS" active={1} dur={295}
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
                color: INK,
                background: '#FFFFFF',
                border: '1px solid rgba(29,29,31,0.12)',
                boxShadow: '0 8px 22px rgba(29,29,31,0.06)',
                borderRadius: 16,
                padding: '13px 28px',
                opacity: 0.25 + 0.6 * Math.abs(Math.sin(local / 20 + i * 1.4)),
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

const WQ3: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <WQuestion num="3" tag="CLOSING" active={2} dur={240}
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
      extra={
        <div style={{marginTop: 44, display: 'flex', alignItems: 'center', gap: 26}}>
          <div style={{width: 350, height: 116, border: '2.5px dashed rgba(29,29,31,0.3)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, background: '#FFFFFF'}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{width: 16, height: 16, borderRadius: '50%', background: GRAD, opacity: 0.25 + 0.75 * Math.max(0, Math.sin(local / 7 - i))}} />
            ))}
          </div>
          <div style={{fontSize: 30, fontWeight: 900, color: INK}}>貴社の「一言」＝ ？</div>
        </div>
      }
    />
  );
};

// ══ S7 答え(460f) ══
const WAnswer: React.FC = () => {
  const local = useCurrentFrame();
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  const b2 = interpolate(local, [100, 122], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Studio dur={460} header="PRODUCT 01" right="人事・採用">
      {b2 < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - b2}}>
          <div style={{fontSize: 76, fontWeight: 900, color: INK}}>
            4つの問い、<GradText>すべてに答え</GradText>を。
          </div>
          <div style={{display: 'flex', gap: 28, marginTop: 58}}>
            {QUESTIONS.map((q, i) => (
              <Rise key={q} at={18 + i * 11}>
                <div style={{position: 'relative', fontSize: 31, fontWeight: 700, color: INK, background: '#FFFFFF', border: '1px solid rgba(29,29,31,0.1)', boxShadow: '0 14px 36px rgba(29,29,31,0.08)', borderRadius: 20, padding: '38px 32px'}}>
                  {q}
                  <div style={{position: 'absolute', top: -18, right: -18, width: 44, height: 44, borderRadius: '50%', background: GRAD, color: '#FFF', fontSize: 26, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
          <div style={{fontSize: 104, fontWeight: 900, color: INK}}>
            ADTURN <GradText>for HR</GradText>
          </div>
          <Rise at={140}>
            <div style={{fontSize: 32, fontWeight: 700, color: GRAY, marginTop: 14}}>人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート</div>
          </Rise>
          <div style={{display: 'flex', gap: 26, marginTop: 52}}>
            {REPORTS.map((r, i) => (
              <Rise key={r} at={170 + i * 12}>
                <div style={{width: 290, background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(29,29,31,0.09)', boxShadow: '0 18px 44px rgba(29,29,31,0.08)', padding: '26px 24px'}}>
                  <div style={{fontSize: 15, fontWeight: 700, letterSpacing: '0.3em', background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>
                    REPORT {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{fontSize: 28, fontWeight: 900, color: INK, marginTop: 12, minHeight: 80}}>{r}</div>
                  {[0, 1, 2].map((j) => (
                    <div key={j} style={{height: 6, background: 'rgba(29,29,31,0.08)', marginTop: 10, width: `${86 - j * 16}%`, borderRadius: 3}} />
                  ))}
                </div>
              </Rise>
            ))}
          </div>
          <Rise at={300}>
            <div style={{display: 'flex', gap: 18, marginTop: 42, fontSize: 24, fontWeight: 700, color: GRAY}}>
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
    </Studio>
  );
};

// ══ S8 一般論(130f) ══
const WNoGen: React.FC = () => (
  <Studio dur={130} header="NO BOILERPLATE">
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Pop at={8}>
        <div style={{fontSize: 110, fontWeight: 900, color: INK, textAlign: 'center', lineHeight: 1.4}}>
          一般論は、<GradText>一行もない。</GradText>
        </div>
      </Pop>
      <Rise at={46}>
        <div style={{fontSize: 30, fontWeight: 500, color: GRAY, marginTop: 36}}>貴社の公開情報から、トップパフォーマーの「脳」が診断。</div>
      </Rise>
    </AbsoluteFill>
  </Studio>
);

// ══ M1 例えば、マーケティング。(440f) ══
const WMIntro: React.FC = () => {
  const local = useCurrentFrame();
  const b2 = interpolate(local, [96, 118], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const LOSS = [0.82, 0.7, 0.72, 0.55, 0.45, 0.3];
  const GAIN = [0.3, 0.48, 0.58, 0.76, 0.9];
  const lossIn = interpolate(local, [180, 250], [0, LOSS.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const gainIn = interpolate(local, [255, 320], [0, GAIN.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Studio dur={440} header="CASE 02 ── マーケティング">
      {b2 < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - b2}}>
          <Pop at={10}>
            <div style={{fontSize: 124, fontWeight: 900, color: INK}}>
              例えば、<GradText>マーケティング</GradText>。
            </div>
          </Pop>
          <Rise at={56}>
            <div style={{fontSize: 42, fontWeight: 700, color: GRAY, marginTop: 42}}>貴社のデジタル上の機会損失、見えていますか。</div>
          </Rise>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{opacity: b2}}>
          <div style={{position: 'absolute', left: 120, top: 340}}>
            <div style={{fontSize: 84, fontWeight: 900, color: INK}}>
              機会損失を、<GradText>可視化</GradText>。
            </div>
            <div style={{fontSize: 84, fontWeight: 900, color: INK, marginTop: 20}}>
              打開策を、<GradText>具体的に出力</GradText>。
            </div>
            <Rise at={200}>
              <div style={{fontSize: 30, fontWeight: 500, color: GRAY, marginTop: 40}}>トップパフォーマーの脳が、診断から打開策まで。</div>
            </Rise>
          </div>
          {/* 右: バーチャート */}
          <div style={{position: 'absolute', right: 130, top: 330, width: 620, height: 420, display: 'flex', alignItems: 'flex-end', gap: 18}}>
            {LOSS.map((h, i) => (
              <div key={`l${i}`} style={{flex: 1, height: 380 * h, background: 'rgba(29,29,31,0.12)', borderRadius: 8, opacity: i < lossIn ? 1 : 0}} />
            ))}
            {GAIN.map((h, i) => (
              <div key={`g${i}`} style={{flex: 1, height: 380 * h, background: GRAD, borderRadius: 8, opacity: i < gainIn ? 1 : 0, boxShadow: '0 12px 30px rgba(120,90,240,0.25)'}} />
            ))}
          </div>
          <div style={{position: 'absolute', right: 130, top: 776, fontSize: 25, fontWeight: 700, color: GRAY}}>
            機会損失 → <GradText>打開策</GradText>
          </div>
        </AbsoluteFill>
      )}
    </Studio>
  );
};

// ══ M2-M4 ══
const WMQ1: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <WQuestion num="1" tag="SEARCH" active={0} dur={180}
      lines={['検索されたとき、', '選択肢に入っていますか？']}
      sub="比較検討の入口は、検索から始まります。"
      extra={
        <div style={{marginTop: 42, display: 'flex', alignItems: 'center', gap: 28}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, width: 540, padding: '20px 32px', borderRadius: 999, background: '#FFFFFF', border: '1px solid rgba(29,29,31,0.12)', boxShadow: '0 14px 36px rgba(29,29,31,0.08)'}}>
            <div style={{width: 24, height: 24, borderRadius: '50%', border: '4px solid #0A84FF', position: 'relative'}}>
              <div style={{position: 'absolute', right: -9, bottom: -6, width: 12, height: 4, background: '#0A84FF', transform: 'rotate(45deg)'}} />
            </div>
            <span style={{fontSize: 30, fontWeight: 700, color: INK}}>
              おすすめ 会社 <span style={{opacity: 0.35 + 0.65 * Math.abs(Math.sin(local / 10)), color: '#0A84FF'}}>▍</span>
            </span>
          </div>
          <div style={{fontSize: 30, fontWeight: 900, color: '#FF375F'}}>貴社名 ＝ 圏外？</div>
        </div>
      }
    />
  );
};

const WMQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['技術力', '実績', 'サポート'];
  return (
    <WQuestion num="2" tag="WEB VISIBILITY" active={1} dur={195}
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
                color: INK,
                background: '#FFFFFF',
                border: '1px solid rgba(29,29,31,0.12)',
                borderRadius: 16,
                padding: '13px 30px',
                opacity: Math.max(0.08, 0.9 - Math.max(0, local - 40 - i * 26) * 0.012),
              }}
            >
              {w}
            </div>
          ))}
          <div style={{fontSize: 27, fontWeight: 800, color: '#FF375F', marginLeft: 10}}>Web上では ＝ 不可視</div>
        </div>
      }
    />
  );
};

const WMQ3: React.FC = () => {
  const local = useCurrentFrame();
  const FUNNEL = ['流入', '比較', '問い合わせ'];
  return (
    <WQuestion num="3" tag="LEAD PATH" active={2} dur={180}
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
                  color: INK,
                  background: i === 1 ? 'transparent' : '#FFFFFF',
                  border: i === 1 ? '2.5px dashed rgba(255,55,95,0.5)' : '1px solid rgba(29,29,31,0.12)',
                  boxShadow: i === 1 ? 'none' : '0 12px 30px rgba(29,29,31,0.07)',
                  borderRadius: 16,
                  padding: '17px 36px',
                }}
              >
                {s}
                {i === 1 && <span style={{marginLeft: 12, color: '#FF375F', opacity: 0.5 + 0.5 * Math.abs(Math.sin(local / 9))}}>✕</span>}
              </div>
              {i < 2 && <div style={{width: 44, height: 4, background: 'rgba(29,29,31,0.2)', borderRadius: 2}} />}
            </React.Fragment>
          ))}
        </div>
      }
    />
  );
};

// ══ M5 診断範囲(520f) ══
const WMScope: React.FC = () => {
  const local = useCurrentFrame();
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const SCOPE_EN = ['COMPETITIVE', 'SEARCH PATH', 'CONTENT', 'AI SEARCH'];
  const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  const beat = local < 160 ? 1 : local < 310 ? 2 : 3;
  return (
    <Studio dur={520} header="DIAGNOSTIC SCOPE ── 診断範囲">
      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 30}}>
            {SCOPE.map((s, i) => (
              <Rise key={s} at={12 + i * 10}>
                <div style={{width: 340, padding: '46px 0', textAlign: 'center', background: '#FFFFFF', borderRadius: 24, border: '1px solid rgba(29,29,31,0.09)', boxShadow: '0 20px 50px rgba(29,29,31,0.08)'}}>
                  <div style={{fontSize: 16, fontWeight: 700, letterSpacing: '0.26em', background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>
                    {String(i + 1).padStart(2, '0')} ── {SCOPE_EN[i]}
                  </div>
                  <div style={{fontSize: 44, fontWeight: 900, color: INK, marginTop: 14}}>{s}</div>
                </div>
              </Rise>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontSize: 88, fontWeight: 900, color: INK, textAlign: 'center', lineHeight: 1.5}}>
            何を、<GradText>どの順番</GradText>で、
            <br />
            どう直すべきか。
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontSize: 66, fontWeight: 900, color: INK}}>
            診断で、<GradText>終わらせない。</GradText>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 60}}>
            {ROADMAP.map((r, i) => (
              <React.Fragment key={r}>
                <Rise at={336 + i * 24}>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 900,
                      color: i === 2 ? '#FFFFFF' : INK,
                      background: i === 2 ? GRAD : '#FFFFFF',
                      border: i === 2 ? 'none' : '1px solid rgba(29,29,31,0.12)',
                      boxShadow: i === 2 ? '0 18px 44px rgba(120,90,240,0.3)' : '0 12px 30px rgba(29,29,31,0.06)',
                      borderRadius: 18,
                      padding: '27px 44px',
                    }}
                  >
                    {r}
                  </div>
                </Rise>
                {i < 2 && (
                  <Rise at={344 + i * 24}>
                    <div style={{fontSize: 40, fontWeight: 900, color: GRAY}}>→</div>
                  </Rise>
                )}
              </React.Fragment>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </Studio>
  );
};

// ══ M6 リビール(200f) ══
const WMReveal: React.FC = () => (
  <Studio dur={200} header="PRODUCT 02" right="マーケティング">
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Pop at={12}>
        <div style={{fontSize: 104, fontWeight: 900, color: INK}}>
          ADTURN <GradText>for Marketing</GradText>
        </div>
      </Pop>
      <Rise at={58}>
        <div style={{fontSize: 36, fontWeight: 700, color: GRAY, marginTop: 32}}>デジタル上の機会損失に、すべての打開策を。</div>
      </Rise>
    </AbsoluteFill>
  </Studio>
);

// ══ F フィナーレ(780f) ══
const WFinale: React.FC = () => {
  const local = useCurrentFrame();
  const beat = local < 215 ? 1 : local < 510 ? 2 : local < 645 ? 3 : 4;
  const PRODUCTS = [
    ['ADTURN for HR', '人事・採用'],
    ['ADTURN for Marketing', 'マーケティング'],
  ];
  const fadeOut = interpolate(local, [758, 778], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Studio dur={780} header={beat === 4 ? undefined : 'FINALE ── デジブレ'}>
      <AbsoluteFill style={{opacity: fadeOut}}>
        {beat === 1 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 38}}>
            <div style={{fontSize: 22, fontWeight: 700, letterSpacing: '0.35em', color: GRAY}}>PRODUCTS ── デジブレから生まれたプロダクト</div>
            {PRODUCTS.map(([name, subT], i) => (
              <Rise key={name} at={22 + i * 60}>
                <div style={{display: 'flex', alignItems: 'center', gap: 30, background: '#FFFFFF', borderRadius: 24, border: '1px solid rgba(29,29,31,0.09)', boxShadow: '0 22px 55px rgba(29,29,31,0.09)', padding: '32px 56px', width: 880}}>
                  <div style={{width: 22, height: 22, borderRadius: '50%', background: GRAD}} />
                  <div>
                    <div style={{fontSize: 52, fontWeight: 900, color: INK}}>{name}</div>
                    <div style={{fontSize: 23, fontWeight: 700, color: GRAY, marginTop: 4}}>{subT}</div>
                  </div>
                </div>
              </Rise>
            ))}
          </AbsoluteFill>
        )}
        {beat === 2 && (
          <AbsoluteFill style={{alignItems: 'center', paddingTop: 140}}>
            <Pop at={224}>
              <div style={{display: 'inline-flex', alignItems: 'center', gap: 22, padding: '24px 58px', borderRadius: 999, background: GRAD, boxShadow: '0 24px 70px rgba(120,90,240,0.35)'}}>
                <div style={{width: 38, height: 38, borderRadius: '50%', border: '10px solid #FFFFFF'}} />
                <span style={{fontSize: 56, fontWeight: 900, color: '#FFFFFF'}}>デジブレ</span>
              </div>
            </Pop>
            <svg width="900" height="100" viewBox="0 0 900 100" style={{opacity: interpolate(local, [268, 296], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
              <path d="M 450 0 L 450 34 L 195 34 L 195 96" stroke="rgba(29,29,31,0.25)" strokeWidth={3} fill="none" />
              <path d="M 450 34 L 705 34 L 705 96" stroke="rgba(29,29,31,0.25)" strokeWidth={3} fill="none" />
            </svg>
            <div style={{display: 'flex', gap: 100}}>
              {PRODUCTS.map(([name, subT], i) => (
                <Rise key={name} at={296 + i * 12}>
                  <div style={{background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(29,29,31,0.1)', boxShadow: '0 16px 40px rgba(29,29,31,0.08)', padding: '22px 40px', textAlign: 'center'}}>
                    <div style={{fontSize: 34, fontWeight: 900, color: INK}}>{name}</div>
                    <div style={{fontSize: 20, fontWeight: 700, color: GRAY, marginTop: 4}}>{subT}</div>
                  </div>
                </Rise>
              ))}
            </div>
            <Rise at={330}>
              <div style={{fontSize: 31, fontWeight: 700, color: GRAY, marginTop: 50}}>
                それぞれの分野の、トップパフォーマーの脳を<GradText>転写</GradText>して実現。
              </div>
            </Rise>
          </AbsoluteFill>
        )}
        {beat === 3 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div style={{fontSize: 22, fontWeight: 700, letterSpacing: '0.35em', color: GRAY, marginBottom: 38}}>NEXT ── YOUR OWN MODEL</div>
            <div style={{fontSize: 88, fontWeight: 900, color: INK, textAlign: 'center', lineHeight: 1.5}}>
              さあ、次は<GradText>貴社専用</GradText>に
              <br />
              カスタマイズを。
            </div>
          </AbsoluteFill>
        )}
        {beat === 4 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Pop at={654}>
              <div style={{fontSize: 160, fontWeight: 900, color: INK}}>
                デジ<GradText>ブレ</GradText>
              </div>
            </Pop>
            <Rise at={678}>
              <div style={{width: 260, height: 4, background: GRAD, borderRadius: 2, margin: '26px auto 0'}} />
            </Rise>
            <Rise at={684}>
              <div style={{fontSize: 24, fontWeight: 500, color: GRAY, letterSpacing: '0.2em', marginTop: 26}}>
                世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
              </div>
            </Rise>
            <Rise at={698}>
              <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 42}}>
                <div style={{fontSize: 34, fontWeight: 900, color: '#FFFFFF', background: GRAD, padding: '16px 42px', borderRadius: 999, boxShadow: '0 18px 50px rgba(120,90,240,0.35)'}}>
                  デモ実施中
                </div>
                <div style={{fontSize: 34, fontWeight: 700, color: INK}}>ぜひブースでご体験ください</div>
              </div>
            </Rise>
            <div style={{position: 'absolute', bottom: 58, fontSize: 25, fontWeight: 700, letterSpacing: '0.3em', color: GRAY}}>ADTANK GP</div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </Studio>
  );
};

// ══ 本体 ══
export const AdturnWhiteVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const LIST: Array<[keyof typeof s, React.FC]> = [
    ['tech', WTech], ['engine', WEngine], ['intro', WIntro], ['q1', WQ1], ['q2', WQ2], ['q3', WQ3],
    ['answer', WAnswer], ['nogen', WNoGen], ['mintro', WMIntro], ['mq1', WMQ1], ['mq2', WMQ2], ['mq3', WMQ3],
    ['mscope', WMScope], ['mreveal', WMReveal], ['finale', WFinale],
  ];
  return (
    <AbsoluteFill style={{background: W_BG}}>
      <Audio src={staticFile('audio/bgm_white_full.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {LIST.map(([key, C]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`W ${key}`}>
          <C />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
