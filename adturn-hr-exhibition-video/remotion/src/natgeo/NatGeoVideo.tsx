import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {AMBER, BAR, CREAM, FilmChrome, GCanvas, G_BG, G_DIM, LowerThird, SANS, SERIF} from './NatGeoDemo';

// ── ナショジオ風ドキュメンタリー フル版(4775f = 159s) ──
// レターボックス+グレイン+琥珀の光。章立てのドキュメンタリー構成。台本・ナレーションは本編と同一。

const SCENES = V3D_SCENES;
const TOTAL = V3D_TOTAL_FRAMES;
const DIM = G_DIM;

const NARRATION: Array<[string, number]> = [
  ['n1', 15], ['n2a', 327], ['n2b', 580], ['n3', 733], ['n4', 925], ['n5', 1176], ['n6', 1459],
  ['n7a', 1696], ['n7b', 1868], ['n8a', 2159], ['m0', 2298], ['m1', 2395], ['m2', 2732], ['m3', 2912],
  ['m4', 3107], ['m5', 3283], ['m6', 3444], ['m7', 3597], ['p0', 3805], ['p1', 4005], ['p2', 4222],
  ['p3', 4515], ['p4', 4668],
];

const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.12, 0.12, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const bgmVolume = (f: number) => {
  const base = 0.88 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return base * endFade;
};

const Rise: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * 24}px)`, ...style}}>{children}</div>;
};

// 章タイトルカード(暗転+セリフ体)
const Chapter: React.FC<{no: string; jp: string; en: string; at?: number}> = ({no, jp, en, at = 6}) => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
    <Rise at={at}>
      <div style={{textAlign: 'center'}}>
        <div style={{fontFamily: SANS, fontSize: 19, fontWeight: 500, color: AMBER, letterSpacing: '0.5em'}}>{no}</div>
        <div style={{fontFamily: SERIF, fontSize: 92, fontWeight: 900, color: CREAM, letterSpacing: '0.14em', marginTop: 28}}>{jp}</div>
        <div style={{width: 56, height: 2, background: AMBER, margin: '30px auto 0'}} />
        <div style={{fontFamily: SANS, fontSize: 16, fontWeight: 500, color: DIM, letterSpacing: '0.44em', marginTop: 26}}>{en}</div>
      </div>
    </Rise>
  </AbsoluteFill>
);

// シーンラッパー(フェード+暖色ビネット)
const Doc: React.FC<{children: React.ReactNode; dur: number}> = ({children, dur}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 16, dur - 16, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: G_BG}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(232,163,76,0.06), transparent 62%)'}} />
      <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ══ S1 技術宣言(315f): 3D黄金の頭部 ══
const GTech: React.FC = () => {
  const local = useCurrentFrame();
  const t1 = interpolate(local, [30, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(local, [120, 148], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const badge = interpolate(local, [258, 284], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Doc dur={315}>
      <GCanvas openStart={150} openDur={55} dur={315} />
      <LowerThird at={40} out={130} jp="トップパフォーマー" en="THE TOP ONE PERCENT ── OBSERVED" />
      {out1 > 0 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingBottom: 30, opacity: out1}}>
          <div style={{fontFamily: SERIF, fontSize: 38, fontWeight: 700, color: DIM, letterSpacing: '0.34em', opacity: t1}}>トップパフォーマーの</div>
          <div style={{fontFamily: SERIF, fontSize: 84, fontWeight: 900, color: CREAM, letterSpacing: '0.14em', marginTop: 24, opacity: t1, textShadow: '0 2px 60px rgba(0,0,0,0.8)'}}>
            脳を、AIに<span style={{color: AMBER}}>転写</span>する。
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: BAR + 56, opacity: badge}}>
        <div style={{fontFamily: SERIF, fontSize: 54, fontWeight: 900, color: CREAM, letterSpacing: '0.12em'}}>
          世界初のAIエンジン──<span style={{color: AMBER}}>デジブレ</span>。
        </div>
        <div style={{fontFamily: SANS, fontSize: 17, fontWeight: 500, color: DIM, letterSpacing: '0.4em', marginTop: 16}}>
          ORIGINAL AI ENGINE ／ 特許出願中 ／ ADTURN
        </div>
      </AbsoluteFill>
    </Doc>
  );
};

// ══ S2 技術の中身(400f) ══
const GEngine: React.FC = () => {
  const local = useCurrentFrame();
  const count = Math.round(interpolate(local, [20, 100], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const b2 = interpolate(local, [235, 260], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];
  return (
    <Doc dur={400}>
      {b2 < 1 && (
        <AbsoluteFill style={{opacity: 1 - b2}}>
          <div style={{position: 'absolute', left: 140, top: 300}}>
            <div style={{fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: DIM, letterSpacing: '0.2em'}}>各領域のトップパフォーマー</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 10}}>
              <span style={{fontFamily: SERIF, fontSize: 70, fontWeight: 900, color: CREAM}}>約</span>
              <span style={{fontFamily: SERIF, fontSize: 240, fontWeight: 900, color: AMBER, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, textShadow: '0 0 80px rgba(232,163,76,0.35)'}}>
                {count}
              </span>
              <span style={{fontFamily: SERIF, fontSize: 70, fontWeight: 900, color: CREAM}}>名</span>
            </div>
            <div style={{fontFamily: SERIF, fontSize: 56, fontWeight: 900, color: CREAM, letterSpacing: '0.1em'}}>
              の脳を、<span style={{color: AMBER}}>コピー済み。</span>
            </div>
            <Rise at={112}>
              <div style={{fontFamily: SANS, fontSize: 25, fontWeight: 500, color: DIM, marginTop: 30, letterSpacing: '0.08em'}}>
                脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。
              </div>
            </Rise>
          </div>
          {/* 右: 標本箱グリッド(採集標本のように) */}
          <div style={{position: 'absolute', right: 150, top: 260, width: 520, display: 'flex', flexWrap: 'wrap', gap: 16}}>
            {Array.from({length: 40}).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 58,
                  border: `1px solid ${i < count ? 'rgba(232,163,76,0.75)' : 'rgba(244,232,216,0.14)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: SERIF,
                  fontSize: 26,
                  color: i < count ? AMBER : 'rgba(244,232,216,0.12)',
                }}
              >
                脳
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', right: 150, bottom: BAR + 60, display: 'flex', gap: 12, flexWrap: 'wrap', width: 620, justifyContent: 'flex-end'}}>
            {DOMAINS.map((d, i) => (
              <div
                key={d}
                style={{
                  fontFamily: SANS,
                  fontSize: 19,
                  fontWeight: 500,
                  color: CREAM,
                  border: '1px solid rgba(232,163,76,0.5)',
                  padding: '8px 18px',
                  letterSpacing: '0.14em',
                  opacity: interpolate(local, [40 + i * 10, 56 + i * 10], [0, 0.85], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
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
          <div style={{fontFamily: SERIF, fontSize: 68, fontWeight: 900, color: CREAM, letterSpacing: '0.1em', textAlign: 'center'}}>
            レシピではなく、<span style={{color: AMBER}}>料理そのもの</span>を出力。
          </div>
          <div style={{display: 'flex', gap: 64, marginTop: 66}}>
            <Rise at={270}>
              <div style={{width: 600, padding: '38px 44px', border: '1px solid rgba(244,232,216,0.25)'}}>
                <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: DIM}}>既存のAIツール</div>
                <div style={{fontFamily: SANS, fontSize: 25, fontWeight: 500, color: DIM, marginTop: 18, lineHeight: 1.8}}>
                  一般的な回答を出力し、
                  <br />
                  業務を「補助」する。
                </div>
              </div>
            </Rise>
            <Rise at={286}>
              <div style={{width: 640, padding: '38px 44px', border: `1.5px solid ${AMBER}`, background: 'rgba(232,163,76,0.06)'}}>
                <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 900, color: AMBER}}>デジブレ</div>
                <div style={{fontFamily: SANS, fontSize: 25, fontWeight: 500, color: CREAM, marginTop: 18, lineHeight: 1.8}}>
                  提案書・分析・戦略「そのもの」を
                  <br />
                  トップパフォーマー品質で出力。
                </div>
              </div>
            </Rise>
          </div>
        </AbsoluteFill>
      )}
    </Doc>
  );
};

// ══ S3 例えば、採用。(190f): 章カード ══
const GIntro: React.FC = () => (
  <Doc dur={190}>
    <Chapter no="CHAPTER Ⅱ" jp="例えば、採用。" en="CASE STUDY ── RECRUITING" />
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: BAR + 60}}>
      <Rise at={70}>
        <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: DIM, letterSpacing: '0.2em'}}>貴社は、この問いに即答できますか。</div>
      </Rise>
    </AbsoluteFill>
  </Doc>
);

// ══ 問いシーン共通(ドキュメンタリーの静かな問いかけ) ══
const GQuestion: React.FC<{
  num: string;
  en: string;
  lines: string[];
  sub: string;
  active: number;
  dur: number;
  extra?: React.ReactNode;
}> = ({num, en, lines, sub, active, dur, extra}) => (
  <Doc dur={dur}>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 150, paddingRight: 120}}>
      <Rise at={6}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
          <div style={{fontFamily: SERIF, fontSize: 60, fontWeight: 900, color: AMBER}}>{num}</div>
          <div style={{width: 46, height: 1.5, background: AMBER}} />
          <div style={{fontFamily: SANS, fontSize: 16, fontWeight: 500, color: DIM, letterSpacing: '0.44em'}}>{en}</div>
        </div>
      </Rise>
      <div style={{height: 40}} />
      {lines.map((l, i) => (
        <Rise key={l} at={20 + i * 14}>
          <div style={{fontFamily: SERIF, fontSize: 76, fontWeight: 900, color: CREAM, lineHeight: 1.45, letterSpacing: '0.06em', textShadow: '0 2px 50px rgba(0,0,0,0.7)'}}>
            {l}
          </div>
        </Rise>
      ))}
      <Rise at={64}>
        <div style={{fontFamily: SANS, fontSize: 27, fontWeight: 500, color: DIM, marginTop: 32, letterSpacing: '0.06em'}}>{sub}</div>
      </Rise>
      {extra}
    </AbsoluteFill>
    <div style={{position: 'absolute', bottom: BAR + 46, left: 150, display: 'flex', gap: 14}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: i === active ? 50 : 14, height: 3, background: i === active ? AMBER : 'rgba(244,232,216,0.3)'}} />
      ))}
    </div>
  </Doc>
);

const GQ1: React.FC = () => (
  <GQuestion num="Ⅰ" en="POSITION" active={0} dur={250}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

const GQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['定着率', '技術力', '歴史', '福利厚生', '外部評価'];
  return (
    <GQuestion num="Ⅱ" en="HIDDEN ASSETS" active={1} dur={295}
      lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
      sub="社内では当たり前すぎて、誰も武器だと気づいていない事実。"
      extra={
        <div style={{display: 'flex', gap: 20, marginTop: 40, flexWrap: 'wrap'}}>
          {WORDS.map((w, i) => (
            <div
              key={w}
              style={{
                fontFamily: SERIF,
                fontSize: 30,
                fontWeight: 700,
                color: AMBER,
                border: '1px solid rgba(232,163,76,0.45)',
                padding: '11px 26px',
                opacity: 0.22 + 0.5 * Math.abs(Math.sin(local / 20 + i * 1.4)),
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

const GQ3: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <GQuestion num="Ⅲ" en="CLOSING" active={2} dur={240}
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
      extra={
        <div style={{marginTop: 44, display: 'flex', alignItems: 'center', gap: 26}}>
          <div style={{width: 340, height: 110, border: '1.5px dashed rgba(232,163,76,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{width: 13, height: 13, borderRadius: '50%', background: AMBER, opacity: 0.25 + 0.75 * Math.max(0, Math.sin(local / 7 - i))}} />
            ))}
          </div>
          <div style={{fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: CREAM}}>貴社の「一言」＝ ？</div>
        </div>
      }
    />
  );
};

// ══ S7 答え(460f) ══
const GAnswer: React.FC = () => {
  const local = useCurrentFrame();
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  const b2 = interpolate(local, [100, 124], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Doc dur={460}>
      {b2 < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - b2}}>
          <div style={{fontFamily: SERIF, fontSize: 64, fontWeight: 900, color: CREAM, letterSpacing: '0.1em'}}>
            4つの問い、<span style={{color: AMBER}}>すべてに答え</span>を。
          </div>
          <div style={{display: 'flex', gap: 28, marginTop: 58}}>
            {QUESTIONS.map((q, i) => (
              <Rise key={q} at={20 + i * 11}>
                <div style={{position: 'relative', fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: CREAM, border: '1px solid rgba(232,163,76,0.5)', padding: '32px 28px'}}>
                  {q}
                  <div style={{position: 'absolute', top: -16, right: -16, width: 36, height: 36, borderRadius: '50%', background: AMBER, color: '#241708', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
          <div style={{fontFamily: SERIF, fontSize: 92, fontWeight: 900, color: CREAM, letterSpacing: '0.06em', textShadow: '0 0 70px rgba(232,163,76,0.25)'}}>
            ADTURN <span style={{color: AMBER}}>for HR</span>
          </div>
          <Rise at={142}>
            <div style={{fontFamily: SANS, fontSize: 28, fontWeight: 500, color: DIM, marginTop: 14, letterSpacing: '0.1em'}}>
              人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
            </div>
          </Rise>
          <div style={{display: 'flex', gap: 26, marginTop: 52}}>
            {REPORTS.map((r, i) => (
              <Rise key={r} at={172 + i * 12}>
                <div style={{width: 290, border: '1px solid rgba(232,163,76,0.45)', padding: '24px 22px', background: 'rgba(232,163,76,0.04)'}}>
                  <div style={{fontFamily: SANS, fontSize: 14, fontWeight: 500, color: AMBER, letterSpacing: '0.34em'}}>PLATE {String(i + 1).padStart(2, '0')}</div>
                  <div style={{fontFamily: SERIF, fontSize: 27, fontWeight: 900, color: CREAM, marginTop: 12, minHeight: 78}}>{r}</div>
                  {[0, 1, 2].map((j) => (
                    <div key={j} style={{height: 4, background: 'rgba(244,232,216,0.18)', marginTop: 9, width: `${86 - j * 16}%`}} />
                  ))}
                </div>
              </Rise>
            ))}
          </div>
          <Rise at={302}>
            <div style={{display: 'flex', gap: 18, marginTop: 42, fontFamily: SANS, fontSize: 22, fontWeight: 500, color: DIM}}>
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
    </Doc>
  );
};

// ══ S8 一般論(130f) ══
const GNoGen: React.FC = () => (
  <Doc dur={130}>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Rise at={6}>
        <div style={{fontFamily: SERIF, fontSize: 100, fontWeight: 900, color: CREAM, letterSpacing: '0.1em', textAlign: 'center', textShadow: '0 0 70px rgba(232,163,76,0.25)'}}>
          一般論は、<span style={{color: AMBER}}>一行もない。</span>
        </div>
      </Rise>
      <Rise at={46}>
        <div style={{fontFamily: SANS, fontSize: 27, fontWeight: 500, color: DIM, marginTop: 36, letterSpacing: '0.08em'}}>
          貴社の公開情報から、トップパフォーマーの「脳」が診断。
        </div>
      </Rise>
    </AbsoluteFill>
  </Doc>
);

// ══ M1 例えば、マーケティング。(440f) ══
const GMIntro: React.FC = () => {
  const local = useCurrentFrame();
  const b2 = interpolate(local, [96, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lossDraw = interpolate(local, [180, 245], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const gainDraw = interpolate(local, [255, 320], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lossPts = [[40, 120], [130, 150], [220, 145], [310, 200], [400, 230], [470, 295]];
  const gainPts = [[470, 295], [545, 235], [620, 205], [695, 135], [760, 80]];
  const path = (pts: number[][], p: number) => {
    const n = Math.max(2, Math.ceil(pts.length * p));
    return 'M ' + pts.slice(0, n).map(([x, y]) => `${x} ${y}`).join(' L ');
  };
  return (
    <Doc dur={440}>
      {b2 < 1 && (
        <AbsoluteFill style={{opacity: 1 - b2}}>
          <Chapter no="CHAPTER Ⅲ" jp="例えば、マーケティング。" en="CASE STUDY ── MARKETING" />
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: BAR + 60}}>
            <Rise at={56}>
              <div style={{fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: DIM, letterSpacing: '0.16em'}}>
                貴社のデジタル上の機会損失、見えていますか。
              </div>
            </Rise>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{opacity: b2}}>
          <div style={{position: 'absolute', left: 150, top: 350}}>
            <div style={{fontFamily: SERIF, fontSize: 72, fontWeight: 900, color: CREAM, letterSpacing: '0.08em'}}>
              機会損失を、<span style={{color: AMBER}}>可視化</span>。
            </div>
            <div style={{fontFamily: SERIF, fontSize: 72, fontWeight: 900, color: CREAM, letterSpacing: '0.08em', marginTop: 22}}>
              打開策を、<span style={{color: AMBER}}>具体的に出力</span>。
            </div>
            <Rise at={200}>
              <div style={{fontFamily: SANS, fontSize: 27, fontWeight: 500, color: DIM, marginTop: 38}}>トップパフォーマーの脳が、診断から打開策まで。</div>
            </Rise>
          </div>
          <div style={{position: 'absolute', right: 140, top: 330, width: 800}}>
            <svg width="800" height="400" viewBox="0 0 800 400">
              <line x1="30" y1="360" x2="790" y2="360" stroke="rgba(244,232,216,0.25)" strokeWidth="1" />
              <line x1="30" y1="360" x2="30" y2="30" stroke="rgba(244,232,216,0.25)" strokeWidth="1" />
              {lossDraw > 0 && <path d={path(lossPts, lossDraw)} fill="none" stroke="rgba(244,232,216,0.35)" strokeWidth="3.5" strokeDasharray="11 8" />}
              {gainDraw > 0 && <path d={path(gainPts, gainDraw)} fill="none" stroke={AMBER} strokeWidth="5" strokeLinecap="round" style={{filter: 'drop-shadow(0 0 10px rgba(232,163,76,0.7))'}} />}
            </svg>
            <div style={{position: 'absolute', left: 220, top: 328, fontFamily: SANS, fontSize: 20, fontWeight: 500, color: DIM}}>機会損失</div>
            <div style={{position: 'absolute', right: 40, top: 30, fontFamily: SERIF, fontSize: 26, fontWeight: 900, color: AMBER, opacity: gainDraw}}>打開策</div>
          </div>
        </AbsoluteFill>
      )}
    </Doc>
  );
};

// ══ M2-M4 ══
const GMQ1: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <GQuestion num="Ⅰ" en="SEARCH" active={0} dur={180}
      lines={['検索されたとき、', '選択肢に入っていますか？']}
      sub="比較検討の入口は、検索から始まります。"
      extra={
        <div style={{marginTop: 42, display: 'flex', alignItems: 'center', gap: 28}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, width: 520, padding: '19px 30px', border: '1px solid rgba(232,163,76,0.55)', borderRadius: 999}}>
            <div style={{width: 22, height: 22, borderRadius: '50%', border: `3px solid ${AMBER}`, position: 'relative'}}>
              <div style={{position: 'absolute', right: -8, bottom: -5, width: 11, height: 3, background: AMBER, transform: 'rotate(45deg)'}} />
            </div>
            <span style={{fontFamily: SANS, fontSize: 28, fontWeight: 500, color: CREAM}}>
              おすすめ 会社 <span style={{opacity: 0.35 + 0.65 * Math.abs(Math.sin(local / 10)), color: AMBER}}>▍</span>
            </span>
          </div>
          <div style={{fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: AMBER}}>貴社名 ＝ 圏外？</div>
        </div>
      }
    />
  );
};

const GMQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['技術力', '実績', 'サポート'];
  return (
    <GQuestion num="Ⅱ" en="WEB VISIBILITY" active={1} dur={195}
      lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']}
      sub="営業資料の強みと、Webの見え方は一致していますか。"
      extra={
        <div style={{display: 'flex', gap: 20, marginTop: 42, alignItems: 'center'}}>
          {WORDS.map((w, i) => (
            <div
              key={w}
              style={{
                fontFamily: SERIF,
                fontSize: 30,
                fontWeight: 700,
                color: AMBER,
                border: '1px solid rgba(232,163,76,0.45)',
                padding: '11px 28px',
                opacity: Math.max(0.06, 0.85 - Math.max(0, local - 40 - i * 26) * 0.012),
              }}
            >
              {w}
            </div>
          ))}
          <div style={{fontFamily: SANS, fontSize: 24, fontWeight: 500, color: DIM, marginLeft: 10}}>Web上では ＝ 不可視</div>
        </div>
      }
    />
  );
};

const GMQ3: React.FC = () => {
  const local = useCurrentFrame();
  const FUNNEL = ['流入', '比較', '問い合わせ'];
  return (
    <GQuestion num="Ⅲ" en="LEAD PATH" active={2} dur={180}
      lines={['見込み客を、', '問い合わせまで運べていますか？']}
      sub="流入から問い合わせまでの導線、途切れていませんか。"
      extra={
        <div style={{marginTop: 44, display: 'flex', alignItems: 'center', gap: 16}}>
          {FUNNEL.map((s, i) => (
            <React.Fragment key={s}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 28,
                  fontWeight: 700,
                  color: CREAM,
                  border: i === 1 ? '1.5px dashed rgba(232,163,76,0.7)' : '1px solid rgba(244,232,216,0.35)',
                  padding: '15px 32px',
                }}
              >
                {s}
                {i === 1 && <span style={{marginLeft: 12, color: AMBER, opacity: 0.5 + 0.5 * Math.abs(Math.sin(local / 9))}}>✕</span>}
              </div>
              {i < 2 && <div style={{width: 42, height: 1.5, background: 'rgba(232,163,76,0.6)'}} />}
            </React.Fragment>
          ))}
        </div>
      }
    />
  );
};

// ══ M5 診断範囲(520f) ══
const GMScope: React.FC = () => {
  const local = useCurrentFrame();
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const SCOPE_EN = ['COMPETITIVE', 'SEARCH PATH', 'CONTENT', 'AI SEARCH'];
  const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  const beat = local < 160 ? 1 : local < 310 ? 2 : 3;
  return (
    <Doc dur={520}>
      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <Rise at={4}>
            <div style={{fontFamily: SANS, fontSize: 17, fontWeight: 500, letterSpacing: '0.44em', color: DIM, marginBottom: 50}}>
              DIAGNOSTIC SCOPE ── 診断範囲
            </div>
          </Rise>
          <div style={{display: 'flex', gap: 30}}>
            {SCOPE.map((s, i) => (
              <Rise key={s} at={14 + i * 10}>
                <div style={{width: 330, padding: '40px 0', textAlign: 'center', border: '1px solid rgba(232,163,76,0.5)', background: 'rgba(232,163,76,0.04)'}}>
                  <div style={{fontFamily: SANS, fontSize: 14, fontWeight: 500, letterSpacing: '0.3em', color: AMBER}}>
                    {String(i + 1).padStart(2, '0')} ── {SCOPE_EN[i]}
                  </div>
                  <div style={{fontFamily: SERIF, fontSize: 42, fontWeight: 900, color: CREAM, marginTop: 14}}>{s}</div>
                </div>
              </Rise>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontFamily: SERIF, fontSize: 78, fontWeight: 900, color: CREAM, letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.6, textShadow: '0 0 60px rgba(232,163,76,0.2)'}}>
            何を、<span style={{color: AMBER}}>どの順番</span>で、
            <br />
            どう直すべきか。
          </div>
        </AbsoluteFill>
      )}
      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontFamily: SERIF, fontSize: 58, fontWeight: 900, color: CREAM, letterSpacing: '0.1em'}}>
            診断で、<span style={{color: AMBER}}>終わらせない。</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 60}}>
            {ROADMAP.map((r, i) => (
              <React.Fragment key={r}>
                <Rise at={336 + i * 24}>
                  <div
                    style={{
                      fontFamily: SERIF,
                      fontSize: 32,
                      fontWeight: 900,
                      color: i === 2 ? '#241708' : CREAM,
                      background: i === 2 ? AMBER : 'transparent',
                      border: i === 2 ? 'none' : '1px solid rgba(244,232,216,0.35)',
                      padding: '25px 40px',
                    }}
                  >
                    {r}
                  </div>
                </Rise>
                {i < 2 && (
                  <Rise at={344 + i * 24}>
                    <div style={{fontSize: 36, fontWeight: 900, color: AMBER}}>→</div>
                  </Rise>
                )}
              </React.Fragment>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </Doc>
  );
};

// ══ M6 リビール(200f) ══
const GMReveal: React.FC = () => {
  const local = useCurrentFrame();
  const glow = interpolate(local, [4, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Doc dur={200}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'absolute', width: 950, height: 950, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,163,76,0.16) 0%, transparent 62%)', transform: `scale(${glow})`}} />
        <Rise at={14}>
          <div style={{fontFamily: SERIF, fontSize: 88, fontWeight: 900, color: CREAM, letterSpacing: '0.05em', textShadow: '0 0 80px rgba(232,163,76,0.3)'}}>
            ADTURN <span style={{color: AMBER}}>for Marketing</span>
          </div>
        </Rise>
        <Rise at={60}>
          <div style={{fontFamily: SANS, fontSize: 30, fontWeight: 500, color: DIM, marginTop: 30, letterSpacing: '0.1em'}}>
            デジタル上の機会損失に、すべての打開策を。
          </div>
        </Rise>
      </AbsoluteFill>
    </Doc>
  );
};

// ══ F フィナーレ(780f) ══
const GFinale: React.FC = () => {
  const local = useCurrentFrame();
  const beat = local < 215 ? 1 : local < 510 ? 2 : local < 645 ? 3 : 4;
  const PRODUCTS = [
    ['ADTURN for HR', '人事・採用'],
    ['ADTURN for Marketing', 'マーケティング'],
  ];
  const glow = interpolate(local, [648, 692], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(local, [758, 778], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sealIn = interpolate(local, [230, 262], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  return (
    <Doc dur={780}>
      <AbsoluteFill style={{opacity: fadeOut}}>
        {beat === 1 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 40}}>
            <div style={{fontFamily: SANS, fontSize: 17, fontWeight: 500, letterSpacing: '0.44em', color: DIM}}>
              PRODUCTS ── デジブレから生まれたプロダクト
            </div>
            {PRODUCTS.map(([name, subT], i) => (
              <Rise key={name} at={22 + i * 60}>
                <div style={{display: 'flex', alignItems: 'center', gap: 32, border: '1px solid rgba(232,163,76,0.5)', padding: '30px 56px', width: 880, background: 'rgba(232,163,76,0.04)'}}>
                  <div style={{width: 14, height: 14, background: AMBER, transform: 'rotate(45deg)'}} />
                  <div>
                    <div style={{fontFamily: SERIF, fontSize: 48, fontWeight: 900, color: CREAM}}>{name}</div>
                    <div style={{fontFamily: SANS, fontSize: 21, fontWeight: 500, color: DIM, marginTop: 6, letterSpacing: '0.14em'}}>{subT}</div>
                  </div>
                </div>
              </Rise>
            ))}
          </AbsoluteFill>
        )}
        {beat === 2 && (
          <AbsoluteFill style={{alignItems: 'center', paddingTop: 150}}>
            {/* 金の紋章=デジブレ */}
            <div style={{width: 190, height: 190, borderRadius: '50%', background: `radial-gradient(circle at 38% 32%, #E8C078, #9C6F28 68%, #6E4C18)`, boxShadow: '0 0 70px rgba(232,163,76,0.4), inset 0 3px 14px rgba(255,236,190,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${sealIn})`}}>
              <div style={{fontFamily: SERIF, fontSize: 74, fontWeight: 900, color: '#3A2708'}}>脳</div>
            </div>
            <Rise at={252}>
              <div style={{fontFamily: SERIF, fontSize: 50, fontWeight: 900, color: CREAM, marginTop: 20}}>デジブレ</div>
            </Rise>
            <svg width="900" height="80" viewBox="0 0 900 80" style={{opacity: interpolate(local, [280, 308], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
              <path d="M 450 0 L 450 26 L 195 26 L 195 76" stroke="rgba(232,163,76,0.6)" strokeWidth={2} fill="none" />
              <path d="M 450 26 L 705 26 L 705 76" stroke="rgba(232,163,76,0.6)" strokeWidth={2} fill="none" />
            </svg>
            <div style={{display: 'flex', gap: 100}}>
              {PRODUCTS.map(([name, subT], i) => (
                <Rise key={name} at={302 + i * 12}>
                  <div style={{border: '1px solid rgba(232,163,76,0.5)', padding: '20px 38px', textAlign: 'center'}}>
                    <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 900, color: CREAM}}>{name}</div>
                    <div style={{fontFamily: SANS, fontSize: 19, fontWeight: 500, color: DIM, marginTop: 5}}>{subT}</div>
                  </div>
                </Rise>
              ))}
            </div>
            <Rise at={336}>
              <div style={{fontFamily: SANS, fontSize: 28, fontWeight: 500, color: DIM, marginTop: 48}}>
                それぞれの分野の、トップパフォーマーの脳を<span style={{color: AMBER, fontWeight: 700}}>転写</span>して実現。
              </div>
            </Rise>
          </AbsoluteFill>
        )}
        {beat === 3 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div style={{fontFamily: SANS, fontSize: 17, fontWeight: 500, letterSpacing: '0.44em', color: DIM, marginBottom: 40}}>NEXT ── YOUR OWN MODEL</div>
            <div style={{fontFamily: SERIF, fontSize: 76, fontWeight: 900, color: CREAM, letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.6, textShadow: '0 0 70px rgba(232,163,76,0.25)'}}>
              さあ、次は<span style={{color: AMBER}}>貴社専用</span>に
              <br />
              カスタマイズを。
            </div>
          </AbsoluteFill>
        )}
        {beat === 4 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div style={{position: 'absolute', width: 940, height: 940, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,163,76,0.2) 0%, transparent 62%)', transform: `scale(${glow})`}} />
            <Rise at={656}>
              <div style={{fontFamily: SERIF, fontSize: 140, fontWeight: 900, color: CREAM, letterSpacing: '0.08em', textShadow: '0 0 90px rgba(232,163,76,0.4)'}}>
                デジ<span style={{color: AMBER}}>ブレ</span>
              </div>
            </Rise>
            <Rise at={678}>
              <div style={{fontFamily: SANS, fontSize: 22, fontWeight: 500, color: DIM, letterSpacing: '0.24em', marginTop: 26}}>
                世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
              </div>
            </Rise>
            <Rise at={696}>
              <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 44}}>
                <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 900, color: '#241708', background: AMBER, padding: '15px 40px'}}>デモ実施中</div>
                <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: CREAM}}>ぜひブースでご体験ください</div>
              </div>
            </Rise>
            <div style={{position: 'absolute', bottom: BAR + 44, fontFamily: SANS, fontSize: 20, fontWeight: 500, letterSpacing: '0.4em', color: DIM}}>
              ADTANK GP
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </Doc>
  );
};

// ══ 本体 ══
export const AdturnNatGeoVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const LIST: Array<[keyof typeof s, React.FC]> = [
    ['tech', GTech], ['engine', GEngine], ['intro', GIntro], ['q1', GQ1], ['q2', GQ2], ['q3', GQ3],
    ['answer', GAnswer], ['nogen', GNoGen], ['mintro', GMIntro], ['mq1', GMQ1], ['mq2', GMQ2], ['mq3', GMQ3],
    ['mscope', GMScope], ['mreveal', GMReveal], ['finale', GFinale],
  ];
  return (
    <AbsoluteFill style={{background: G_BG}}>
      <Audio src={staticFile('audio/bgm_natgeo_full.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {LIST.map(([key, C]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`G ${key}`}>
          <C />
        </Sequence>
      ))}
      {/* レターボックス+グレインは全編通し */}
      <FilmChrome />
    </AbsoluteFill>
  );
};
