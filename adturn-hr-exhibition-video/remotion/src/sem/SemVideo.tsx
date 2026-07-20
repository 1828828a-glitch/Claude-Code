import React from 'react';
import {AbsoluteFill, Audio, Loop, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {SANS, SERIF} from '../natgeo/NatGeoDemo';

// ── 電子顕微鏡×論文図版 フル版(4775f = 159s) ──
// Veo生成のモノクロSEM素材を学術誌のFigureフレームに収める。
// シアンは「転写」・ADTURNリビール・デジブレの瞬間のみ。BGMはほぼ無音の品位。

const SCENES = V3D_SCENES;
const TOTAL = V3D_TOTAL_FRAMES;
const BG = '#0B0B0C';
const WHITE = '#E9E9E6';
const GRAY = 'rgba(233,233,230,0.55)';
const FAINT = 'rgba(233,233,230,0.28)';
const CYAN = '#5FE8FF';

const NARRATION: Array<[string, number]> = [
  ['n1', 15], ['n2a', 327], ['n2b', 580], ['n3', 733], ['n4', 925], ['n5', 1176], ['n6', 1459],
  ['n7a', 1696], ['n7b', 1868], ['n8a', 2159], ['m0', 2298], ['m1', 2395], ['m2', 2732], ['m3', 2912],
  ['m4', 3107], ['m5', 3283], ['m6', 3444], ['m7', 3597], ['p0', 3805], ['p1', 4005], ['p2', 4222],
  ['p3', 4515], ['p4', 4668],
];

const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.14, 0.14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const bgmVolume = (f: number) => {
  const base = 0.38 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return Math.max(0, base) * endFade;
};

const Rise: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * 18}px)`, ...style}}>{children}</div>;
};

const LOOP_F = 238;

// ── 図版フレーム+SEMプレート ──
const SemFig: React.FC<{
  plate: string;
  mirror?: boolean;
  fig: string;
  caption: React.ReactNode;
  panel?: string;
  dur: number;
  children?: React.ReactNode;
  dark?: number;
}> = ({plate, mirror, fig, caption, panel = 'a', dur, children, dark = 0}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 16, dur - 16, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const zoom = 1.02 + frame * 0.00012;
  return (
    <AbsoluteFill style={{fontFamily: SANS, opacity: o}}>
      <div style={{position: 'absolute', left: 180, top: 140, width: 1560, height: 700, border: `1px solid ${FAINT}`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${mirror ? -zoom : zoom}, ${zoom})`, filter: 'grayscale(1) contrast(1.12)'}}>
          <Loop durationInFrames={LOOP_F}>
            <OffthreadVideo src={staticFile(plate)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </Loop>
        </div>
        {dark > 0 && <div style={{position: 'absolute', inset: 0, background: BG, opacity: dark}} />}
        <div style={{position: 'absolute', top: 18, left: 22, fontFamily: SERIF, fontSize: 26, fontWeight: 900, color: WHITE}}>{panel}</div>
        <div style={{position: 'absolute', bottom: 22, right: 26, display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{width: 110, height: 3, background: WHITE}} />
          <div style={{fontSize: 15, fontWeight: 500, color: WHITE, letterSpacing: '0.14em'}}>10 µm</div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: (frame * 1.7) % 700, height: 1.5, background: 'rgba(233,233,230,0.1)'}} />
        {children}
      </div>
      <div style={{position: 'absolute', left: 180, top: 856, width: 1560}}>
        <span style={{fontFamily: SERIF, fontSize: 23, fontWeight: 900, color: WHITE}}>{fig}{'　'}</span>
        <span style={{fontSize: 19, fontWeight: 500, color: GRAY, letterSpacing: '0.06em'}}>{caption}</span>
      </div>
    </AbsoluteFill>
  );
};

// 中央の明朝ボックス
const SerifBox: React.FC<{at: number; children: React.ReactNode; wide?: boolean}> = ({at, children, wide}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: p, pointerEvents: 'none'}}>
      <div style={{background: 'rgba(11,11,12,0.78)', padding: wide ? '44px 70px' : '38px 60px', border: `1px solid ${FAINT}`, textAlign: 'center'}}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

// ══ シーン群 ══
const STech: React.FC = () => {
  const local = useCurrentFrame();
  const out1 = interpolate(local, [200, 232], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t3 = interpolate(local, [252, 282], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <SemFig plate="video/plate_sem_closeup.mp4" fig="Fig. 1" panel="a" dur={315}
        caption={
          <>
            トップパフォーマー脳・生体標本の樹状突起(走査型電子顕微鏡)。
            {local >= 118 && <span style={{color: CYAN}}>{'　'}シアン: 転写経路のトレーサ染色。</span>}
          </>
        }
      />
      {out1 > 0 && (
        <AbsoluteFill style={{opacity: out1}}>
          <SerifBox at={46}>
            <div style={{fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: GRAY, letterSpacing: '0.3em'}}>トップパフォーマーの</div>
            <div style={{fontFamily: SERIF, fontSize: 62, fontWeight: 900, color: WHITE, letterSpacing: '0.12em', marginTop: 18}}>
              脳を、AIに<span style={{color: local >= 118 ? CYAN : WHITE}}>転写</span>する。
            </div>
          </SerifBox>
        </AbsoluteFill>
      )}
      {t3 > 0 && (
        <AbsoluteFill style={{opacity: t3}}>
          <SerifBox at={252}>
            <div style={{fontFamily: SERIF, fontSize: 46, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>
              世界初のAIエンジン──<span style={{color: CYAN}}>デジブレ</span>。
            </div>
            <div style={{fontSize: 16, fontWeight: 500, color: GRAY, letterSpacing: '0.4em', marginTop: 18}}>ORIGINAL AI ENGINE ／ 特許出願中 ／ ADTURN</div>
          </SerifBox>
        </AbsoluteFill>
      )}
    </>
  );
};

const SEngine: React.FC = () => {
  const local = useCurrentFrame();
  const count = Math.round(interpolate(local, [20, 100], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const b2 = interpolate(local, [235, 258], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <SemFig plate="video/plate_sem_network.mp4" fig="Fig. 2" panel="a" dur={400} dark={0.2}
        caption={<>転写済み標本アーカイブ(n=40)。人事・採用コンサル・マーケティング・ブランディング・経営コンサル・アーティストの各領域より採取。</>}
      />
      {b2 < 1 && (
        <AbsoluteFill style={{opacity: 1 - b2}}>
          <SerifBox at={14} wide>
            <div style={{fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: GRAY, letterSpacing: '0.2em'}}>各領域のトップパフォーマー</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'center', marginTop: 6}}>
              <span style={{fontFamily: SERIF, fontSize: 50, fontWeight: 900, color: WHITE}}>約</span>
              <span style={{fontFamily: SERIF, fontSize: 150, fontWeight: 900, color: WHITE, fontVariantNumeric: 'tabular-nums', lineHeight: 1.08}}>{count}</span>
              <span style={{fontFamily: SERIF, fontSize: 50, fontWeight: 900, color: WHITE}}>名</span>
            </div>
            <div style={{fontFamily: SERIF, fontSize: 42, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>の脳を、コピー済み。</div>
            <Rise at={112}>
              <div style={{fontSize: 20, fontWeight: 500, color: GRAY, marginTop: 20, letterSpacing: '0.08em'}}>脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。</div>
            </Rise>
          </SerifBox>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{opacity: b2}}>
          <SerifBox at={244} wide>
            <div style={{fontFamily: SERIF, fontSize: 44, fontWeight: 900, color: WHITE, letterSpacing: '0.08em'}}>レシピではなく、料理そのものを出力。</div>
            <div style={{display: 'flex', gap: 0, marginTop: 34, border: `1px solid ${FAINT}`}}>
              <div style={{width: 440, padding: '26px 32px', borderRight: `1px solid ${FAINT}`}}>
                <div style={{fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: GRAY}}>既存のAIツール</div>
                <div style={{fontSize: 20, fontWeight: 500, color: GRAY, marginTop: 12, lineHeight: 1.8, textAlign: 'left'}}>
                  一般的な回答を出力し、
                  <br />
                  業務を「補助」する。
                </div>
              </div>
              <div style={{width: 470, padding: '26px 32px'}}>
                <div style={{fontFamily: SERIF, fontSize: 25, fontWeight: 900, color: WHITE}}>デジブレ</div>
                <div style={{fontSize: 20, fontWeight: 500, color: WHITE, marginTop: 12, lineHeight: 1.8, textAlign: 'left'}}>
                  提案書・分析・戦略「そのもの」を
                  <br />
                  トップパフォーマー品質で出力。
                </div>
              </div>
            </div>
            <div style={{fontSize: 15, fontWeight: 500, color: FAINT, marginTop: 16, letterSpacing: '0.2em'}}>Table 1 ── 出力品質の比較</div>
          </SerifBox>
        </AbsoluteFill>
      )}
    </>
  );
};

const SIntro: React.FC = () => (
  <>
    <SemFig plate="video/plate_sem_fibers.mp4" fig="設問" panel="Ⅱ" dur={190} dark={0.3}
      caption={<>第Ⅱ章 ── 事例研究: 採用。以下の設問に即答できるかを検査する。</>}
    />
    <SerifBox at={12} wide>
      <div style={{fontFamily: SERIF, fontSize: 84, fontWeight: 900, color: WHITE, letterSpacing: '0.12em'}}>例えば、採用。</div>
      <Rise at={64}>
        <div style={{fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: GRAY, letterSpacing: '0.2em', marginTop: 24}}>貴社は、この問いに即答できますか。</div>
      </Rise>
    </SerifBox>
  </>
);

const SQuestion: React.FC<{plate: string; mirror?: boolean; fig: string; panel: string; lines: string[]; sub: string; dur: number}> = ({
  plate,
  mirror,
  fig,
  panel,
  lines,
  sub,
  dur,
}) => (
  <>
    <SemFig plate={plate} mirror={mirror} fig={fig} panel={panel} dur={dur} dark={0.26} caption={<>{sub}</>} />
    <SerifBox at={14} wide>
      {lines.map((l, i) => (
        <div key={l} style={{fontFamily: SERIF, fontSize: 52, fontWeight: 900, color: WHITE, letterSpacing: '0.08em', lineHeight: 1.7}}>
          {l}
        </div>
      ))}
    </SerifBox>
  </>
);

const SQ1: React.FC = () => (
  <SQuestion plate="video/plate_sem_network.mp4" mirror fig="設問 Ⅰ" panel="Ⅰ" dur={250}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="設問Ⅰ(ポジション) ── 競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);
const SQ2: React.FC = () => (
  <SQuestion plate="video/plate_sem_fibers.mp4" mirror fig="設問 Ⅱ" panel="Ⅱ" dur={295}
    lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
    sub="設問Ⅱ(無自覚の魅力) ── 社内では当たり前すぎて、誰も武器だと気づいていない事実。定着率・技術力・歴史・福利厚生・外部評価。"
  />
);
const SQ3: React.FC = () => (
  <SQuestion plate="video/plate_sem_closeup.mp4" mirror fig="設問 Ⅲ" panel="Ⅲ" dur={240}
    lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
    sub="設問Ⅲ(クロージング) ── 内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
  />
);

const SAnswer: React.FC = () => {
  const local = useCurrentFrame();
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  const b2 = interpolate(local, [100, 124], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <SemFig plate="video/plate_sem_network.mp4" fig="Fig. 3" panel="a" dur={460} dark={0.14}
        caption={
          <>
            結線完了標本。<span style={{color: CYAN}}>シアン: ADTURN for HR による処置後の転写経路。</span>4種の戦略レポートを出力(Supplementary 1-4)。
          </>
        }
      />
      {b2 < 1 && (
        <AbsoluteFill style={{opacity: 1 - b2}}>
          <SerifBox at={16} wide>
            <div style={{fontFamily: SERIF, fontSize: 46, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>4つの設問、すべてに答えを。</div>
            <div style={{fontSize: 21, fontWeight: 500, color: GRAY, marginTop: 20, letterSpacing: '0.12em'}}>
              Q1 ポジション ✓　Q2 無自覚の魅力 ✓　Q3 ターゲット ✓　Q4 クロージング ✓
            </div>
          </SerifBox>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{opacity: b2}}>
          <SerifBox at={106} wide>
            <div style={{fontFamily: SERIF, fontSize: 66, fontWeight: 900, color: WHITE, letterSpacing: '0.06em'}}>
              ADTURN <span style={{color: CYAN}}>for HR</span>
            </div>
            <div style={{fontSize: 21, fontWeight: 500, color: GRAY, marginTop: 14, letterSpacing: '0.1em'}}>
              人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
            </div>
            <div style={{display: 'flex', gap: 14, marginTop: 30}}>
              {REPORTS.map((r, i) => (
                <div key={r} style={{width: 218, border: `1px solid ${FAINT}`, padding: '16px 14px'}}>
                  <div style={{fontSize: 12, fontWeight: 500, color: GRAY, letterSpacing: '0.28em'}}>SUPPL. {i + 1}</div>
                  <div style={{fontFamily: SERIF, fontSize: 20, fontWeight: 900, color: WHITE, marginTop: 8}}>{r}</div>
                </div>
              ))}
            </div>
          </SerifBox>
        </AbsoluteFill>
      )}
    </>
  );
};

const SNoGen: React.FC = () => (
  <>
    <SemFig plate="video/plate_sem_fibers.mp4" fig="検証" panel="b" dur={130} dark={0.3}
      caption={<>品質検証 ── 貴社の公開情報から、トップパフォーマーの「脳」が診断。</>}
    />
    <SerifBox at={10} wide>
      <div style={{fontFamily: SERIF, fontSize: 70, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>一般論は、一行もない。</div>
      <div style={{fontSize: 19, fontWeight: 500, color: GRAY, marginTop: 22, letterSpacing: '0.24em', border: `1px solid ${FAINT}`, display: 'inline-block', padding: '10px 26px'}}>
        実験結果 ── 一般論検出数: 0
      </div>
    </SerifBox>
  </>
);

const SMIntro: React.FC = () => {
  const local = useCurrentFrame();
  const b2 = interpolate(local, [96, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <SemFig plate="video/plate_sem_closeup.mp4" mirror fig="第Ⅲ章" panel="a" dur={440} dark={0.24}
        caption={<>第Ⅲ章 ── 事例研究: マーケティング。機会損失の可視化と打開策の出力。</>}
      />
      {b2 < 1 && (
        <AbsoluteFill style={{opacity: 1 - b2}}>
          <SerifBox at={12} wide>
            <div style={{fontFamily: SERIF, fontSize: 74, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>例えば、マーケティング。</div>
            <Rise at={56}>
              <div style={{fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: GRAY, letterSpacing: '0.18em', marginTop: 24}}>
                貴社のデジタル上の機会損失、見えていますか。
              </div>
            </Rise>
          </SerifBox>
        </AbsoluteFill>
      )}
      {b2 > 0 && (
        <AbsoluteFill style={{opacity: b2}}>
          <SerifBox at={102} wide>
            <div style={{fontFamily: SERIF, fontSize: 54, fontWeight: 900, color: WHITE, letterSpacing: '0.08em'}}>機会損失を、可視化。</div>
            <div style={{fontFamily: SERIF, fontSize: 54, fontWeight: 900, color: WHITE, letterSpacing: '0.08em', marginTop: 14}}>打開策を、具体的に出力。</div>
            <Rise at={200}>
              <div style={{fontSize: 21, fontWeight: 500, color: GRAY, marginTop: 24, letterSpacing: '0.1em'}}>トップパフォーマーの脳が、診断から打開策まで。</div>
            </Rise>
          </SerifBox>
        </AbsoluteFill>
      )}
    </>
  );
};

const SMQ1: React.FC = () => (
  <SQuestion plate="video/plate_sem_network.mp4" fig="設問 Ⅰ'" panel="Ⅰ" dur={180}
    lines={['検索されたとき、', '選択肢に入っていますか？']}
    sub="設問Ⅰ'(検索) ── 比較検討の入口は、検索から始まります。貴社名=圏外?"
  />
);
const SMQ2: React.FC = () => (
  <SQuestion plate="video/plate_sem_fibers.mp4" fig="設問 Ⅱ'" panel="Ⅱ" dur={195}
    lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']}
    sub="設問Ⅱ'(Web可視性) ── 営業資料の強みと、Webの見え方は一致していますか。Web上では=不可視。"
  />
);
const SMQ3: React.FC = () => (
  <SQuestion plate="video/plate_sem_closeup.mp4" fig="設問 Ⅲ'" panel="Ⅲ" dur={180}
    lines={['見込み客を、', '問い合わせまで運べていますか？']}
    sub="設問Ⅲ'(導線) ── 流入から問い合わせまでの導線、途切れていませんか。流入→比較✕→問い合わせ。"
  />
);

const SMScope: React.FC = () => {
  const local = useCurrentFrame();
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  const beat = local < 160 ? 1 : local < 310 ? 2 : 3;
  return (
    <>
      <SemFig plate="video/plate_sem_network.mp4" mirror fig="Fig. 5" panel="a-d" dur={520} dark={0.26}
        caption={<>診断範囲の4パネル図(a: 競合比較 b: 検索導線 c: コンテンツ d: AI検索)と治療フローチャート。</>}
      />
      {beat === 1 && (
        <SerifBox at={10} wide>
          <div style={{fontSize: 15, fontWeight: 500, letterSpacing: '0.44em', color: GRAY, marginBottom: 28}}>DIAGNOSTIC SCOPE ── 診断範囲</div>
          <div style={{display: 'flex', gap: 0, border: `1px solid ${FAINT}`}}>
            {SCOPE.map((s, i) => (
              <div key={s} style={{width: 250, padding: '26px 0', textAlign: 'center', borderRight: i < 3 ? `1px solid ${FAINT}` : 'none'}}>
                <div style={{fontFamily: SERIF, fontSize: 22, fontWeight: 900, color: GRAY}}>{String.fromCharCode(97 + i)}</div>
                <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 900, color: WHITE, marginTop: 8}}>{s}</div>
              </div>
            ))}
          </div>
        </SerifBox>
      )}
      {beat === 2 && (
        <SerifBox at={166} wide>
          <div style={{fontFamily: SERIF, fontSize: 58, fontWeight: 900, color: WHITE, letterSpacing: '0.08em', lineHeight: 1.7}}>
            何を、どの順番で、
            <br />
            どう直すべきか。
          </div>
        </SerifBox>
      )}
      {beat === 3 && (
        <SerifBox at={318} wide>
          <div style={{fontFamily: SERIF, fontSize: 44, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>診断で、終わらせない。</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 34, justifyContent: 'center'}}>
            {ROADMAP.map((r, i) => (
              <React.Fragment key={r}>
                <div style={{fontFamily: SERIF, fontSize: 25, fontWeight: 900, color: i === 2 ? BG : WHITE, background: i === 2 ? WHITE : 'transparent', border: `1px solid ${FAINT}`, padding: '18px 28px'}}>
                  {r}
                </div>
                {i < 2 && <div style={{fontSize: 26, color: GRAY}}>→</div>}
              </React.Fragment>
            ))}
          </div>
        </SerifBox>
      )}
    </>
  );
};

const SMReveal: React.FC = () => (
  <>
    <SemFig plate="video/plate_sem_cell.mp4" mirror fig="結論 Ⅰ" panel="a" dur={200} dark={0.16}
      caption={
        <>
          <span style={{color: CYAN}}>ADTURN for Marketing による処置後の標本。</span>デジタル上の機会損失に、すべての打開策を。
        </>
      }
    />
    <SerifBox at={14} wide>
      <div style={{fontFamily: SERIF, fontSize: 64, fontWeight: 900, color: WHITE, letterSpacing: '0.06em'}}>
        ADTURN <span style={{color: CYAN}}>for Marketing</span>
      </div>
      <Rise at={60}>
        <div style={{fontSize: 22, fontWeight: 500, color: GRAY, marginTop: 20, letterSpacing: '0.12em'}}>デジタル上の機会損失に、すべての打開策を。</div>
      </Rise>
    </SerifBox>
  </>
);

const SFinale: React.FC = () => {
  const local = useCurrentFrame();
  const beat = local < 215 ? 1 : local < 510 ? 2 : local < 645 ? 3 : 4;
  const fadeOut = interpolate(local, [758, 778], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <SemFig plate="video/plate_sem_cell.mp4" fig="結論 Ⅱ" panel="a" dur={780} dark={beat === 4 ? 0.2 : 0.28}
        caption={
          <>
            系統図 ── デジブレを根とする2プロダクト。<span style={{color: CYAN}}>シアン: 転写により実現。</span>特許出願中。
          </>
        }
      />
      <AbsoluteFill style={{opacity: fadeOut}}>
        {beat === 1 && (
          <SerifBox at={16} wide>
            <div style={{fontSize: 15, fontWeight: 500, letterSpacing: '0.44em', color: GRAY, marginBottom: 26}}>PRODUCTS ── デジブレから生まれたプロダクト</div>
            <div style={{fontFamily: SERIF, fontSize: 44, fontWeight: 900, color: WHITE, lineHeight: 1.8}}>
              ADTURN for HR ── 人事・採用
              <br />
              ADTURN for Marketing ── マーケティング
            </div>
          </SerifBox>
        )}
        {beat === 2 && (
          <SerifBox at={222} wide>
            <div style={{fontFamily: SERIF, fontSize: 40, fontWeight: 900, color: WHITE}}>デジブレ</div>
            <svg width="560" height="60" viewBox="0 0 560 60">
              <path d="M 280 0 L 280 20 L 110 20 L 110 56" stroke={FAINT} strokeWidth={1.5} fill="none" />
              <path d="M 280 20 L 450 20 L 450 56" stroke={FAINT} strokeWidth={1.5} fill="none" />
            </svg>
            <div style={{display: 'flex', gap: 60, justifyContent: 'center'}}>
              <div style={{fontFamily: SERIF, fontSize: 26, fontWeight: 900, color: WHITE, border: `1px solid ${FAINT}`, padding: '14px 26px'}}>ADTURN for HR</div>
              <div style={{fontFamily: SERIF, fontSize: 26, fontWeight: 900, color: WHITE, border: `1px solid ${FAINT}`, padding: '14px 26px'}}>ADTURN for Marketing</div>
            </div>
            <Rise at={330}>
              <div style={{fontSize: 21, fontWeight: 500, color: GRAY, marginTop: 26, letterSpacing: '0.1em'}}>
                それぞれの分野の、トップパフォーマーの脳を<span style={{color: CYAN}}>転写</span>して実現。
              </div>
            </Rise>
          </SerifBox>
        )}
        {beat === 3 && (
          <SerifBox at={520} wide>
            <div style={{fontSize: 15, fontWeight: 500, letterSpacing: '0.44em', color: GRAY, marginBottom: 26}}>NEXT ── YOUR OWN MODEL</div>
            <div style={{fontFamily: SERIF, fontSize: 56, fontWeight: 900, color: WHITE, letterSpacing: '0.08em', lineHeight: 1.7}}>
              さあ、次は貴社専用に
              <br />
              カスタマイズを。
            </div>
          </SerifBox>
        )}
        {beat === 4 && (
          <SerifBox at={654} wide>
            <div style={{fontFamily: SERIF, fontSize: 100, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>
              デジ<span style={{color: CYAN}}>ブレ</span>
            </div>
            <div style={{fontSize: 17, fontWeight: 500, color: GRAY, letterSpacing: '0.24em', marginTop: 22}}>
              世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
            </div>
            <Rise at={696}>
              <div style={{fontFamily: SERIF, fontSize: 25, fontWeight: 900, color: WHITE, marginTop: 26}}>
                デモ実施中 ── ぜひブースでご体験ください ／ <span style={{letterSpacing: '0.2em'}}>ADTANK GP</span>
              </div>
            </Rise>
          </SerifBox>
        )}
      </AbsoluteFill>
    </>
  );
};

// ══ 本体 ══
export const AdturnSemVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const gx = Math.floor(random(`gx${frame}`) * 240);
  const gy = Math.floor(random(`gy${frame}`) * 240);
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const LIST: Array<[keyof typeof s, React.FC]> = [
    ['tech', STech], ['engine', SEngine], ['intro', SIntro], ['q1', SQ1], ['q2', SQ2], ['q3', SQ3],
    ['answer', SAnswer], ['nogen', SNoGen], ['mintro', SMIntro], ['mq1', SMQ1], ['mq2', SMQ2], ['mq3', SMQ3],
    ['mscope', SMScope], ['mreveal', SMReveal], ['finale', SFinale],
  ];
  const sceneIdx = Object.keys(s).findIndex((k) => frame < starts[k] + s[k as keyof typeof s]);
  return (
    <AbsoluteFill style={{background: BG, fontFamily: SANS}}>
      <Audio src={staticFile('audio/bgm_white_full.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {LIST.map(([key, C]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`S ${key}`}>
          <C />
        </Sequence>
      ))}
      {/* 誌面クローム(全編通し) */}
      <div style={{position: 'absolute', top: 46, left: 90, right: 90, display: 'flex', justifyContent: 'space-between'}}>
        <div style={{fontSize: 15, fontWeight: 500, color: GRAY, letterSpacing: '0.4em'}}>
          DIGIBRE ── TRANSCRIPTIONS OF EXPERT COGNITION ／ 認知転写研究
        </div>
        <div style={{fontSize: 15, fontWeight: 500, color: GRAY, letterSpacing: '0.3em'}}>VOL.01 ── 2026</div>
      </div>
      <div style={{position: 'absolute', top: 82, left: 90, right: 90, height: 1, background: FAINT}} />
      <div style={{position: 'absolute', bottom: 40, left: 90, right: 90, display: 'flex', justifyContent: 'space-between'}}>
        <div style={{fontSize: 13, fontWeight: 500, color: FAINT, letterSpacing: '0.3em'}}>doi:10.XXXX/digibre.2026(仮) ── 特許出願中</div>
        <div style={{fontSize: 13, fontWeight: 500, color: FAINT, letterSpacing: '0.3em'}}>ADTANK GP ── p.{String(Math.max(1, sceneIdx + 1)).padStart(2, '0')}</div>
      </div>
      {/* 強めグレイン+ビネット */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('img/grain_tile.png')})`,
          backgroundPosition: `${gx}px ${gy}px`,
          mixBlendMode: 'overlay',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 108% 90% at 50% 48%, transparent 55%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
