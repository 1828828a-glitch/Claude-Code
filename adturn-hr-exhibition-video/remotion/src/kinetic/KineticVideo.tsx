import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, V3D_SCENES, V3D_TOTAL_FRAMES} from '../theme';
import {BLACK, BLUE, FlatBrain, HEAD_DOME, HEAD_FACE, PAPER, PINK, RED, Slam, Wipe, YELLOW, useBeatPulse} from '../poster/PosterDemo';

// ── エディトリアル・キネティック フル版(4775f = 159s) ──
// スイスポスター×モーショングラフィックス: ベタ塗り色面のハードカット+巨大タイポ+フラットイラスト。
// 3D CG不使用。タイムライン・台本・ナレーションは本編(V3D)と同一。

const SCENES = V3D_SCENES;
const TOTAL = V3D_TOTAL_FRAMES;

const NARRATION: Array<[string, number]> = [
  ['n1', 15], ['n2a', 327], ['n2b', 580], ['n3', 733], ['n4', 925], ['n5', 1176], ['n6', 1459],
  ['n7a', 1696], ['n7b', 1868], ['n8a', 2159], ['m0', 2298], ['m1', 2395], ['m2', 2732], ['m3', 2912],
  ['m4', 3107], ['m5', 3283], ['m6', 3444], ['m7', 3597], ['p0', 3805], ['p1', 4005], ['p2', 4222],
  ['p3', 4515], ['p4', 4668],
];

const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.1, 0.1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const bgmVolume = (f: number) => {
  const base = 0.82 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return base * endFade;
};

// ── 共通部品 ──
const Header: React.FC<{color: string; left: string; right?: string}> = ({color, left, right}) => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [4, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <div style={{position: 'absolute', top: 60, left: 80, fontSize: 20, fontWeight: 700, color, letterSpacing: '0.42em', opacity: boot * 0.85}}>
        {left}
      </div>
      {right && (
        <div style={{position: 'absolute', top: 60, right: 80, fontSize: 20, fontWeight: 700, color, letterSpacing: '0.3em', opacity: boot * 0.85}}>
          {right}
        </div>
      )}
    </>
  );
};

const Rule: React.FC<{at: number; color: string; width: number}> = ({at, color, width}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{width, height: 8, background: color, transform: `scaleX(${p})`, transformOrigin: 'left'}} />;
};

// 巨大アウトライン数字(問いシーンの背景)
const GhostNum: React.FC<{n: string; color: string}> = ({n, color}) => (
  <div
    style={{
      position: 'absolute',
      right: 60,
      bottom: -140,
      fontSize: 900,
      fontWeight: 900,
      lineHeight: 1,
      color: 'transparent',
      WebkitTextStroke: `3px ${color}`,
      opacity: 0.2,
    }}
  >
    {n}
  </div>
);

// ══ S1 技術宣言(315f) ══
const KTech: React.FC = () => {
  const local = useCurrentFrame();
  const pulse = useBeatPulse();
  const {fps} = useVideoConfig();
  // beat C: 頭パカーン(195-315)
  const open = interpolate(local, [228, 256], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  const pop = spring({frame: local - 250, fps, config: {damping: 12, stiffness: 120}});
  const riseY = interpolate(local, [250, 288], [0, -150], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  const badges = interpolate(local, [278, 296], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {/* A: 世界初。(0-90) */}
      {local < 92 && (
        <AbsoluteFill style={{background: BLUE}}>
          <Header color={PAPER} left="ADTANK GP ／ EXHIBITION FILM" right="№01" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={14}>
              <div style={{fontSize: 250, fontWeight: 900, color: PAPER, letterSpacing: '0.02em', transform: `scale(${pulse})`}}>
                世界初<span style={{color: YELLOW}}>。</span>
              </div>
            </Slam>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B: 宣言(90-195) */}
      {local >= 88 && local < 197 && (
        <AbsoluteFill style={{background: PAPER}}>
          <Header color={BLACK} left="STATEMENT ── 技術宣言" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 110}}>
            <Slam delay={96}>
              <div style={{fontSize: 64, fontWeight: 800, color: BLACK, opacity: 0.75, letterSpacing: '0.06em'}}>トップパフォーマーの</div>
            </Slam>
            <div style={{height: 28}} />
            <div style={{display: 'flex', alignItems: 'baseline'}}>
              <Slam delay={106}>
                <span style={{fontSize: 144, fontWeight: 900, color: BLACK}}>脳を、AIに</span>
              </Slam>
              <Slam delay={116}>
                <span style={{fontSize: 144, fontWeight: 900, color: PAPER, background: RED, padding: '0 22px', marginLeft: 10, display: 'inline-block', lineHeight: 1.24}}>
                  転写
                </span>
              </Slam>
              <Slam delay={126}>
                <span style={{fontSize: 144, fontWeight: 900, color: BLACK, marginLeft: 10}}>する。</span>
              </Slam>
            </div>
            <div style={{height: 30}} />
            <Rule at={134} color={BLACK} width={1150} />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* C: 頭がパカーン(195-315) */}
      {local >= 195 && (
        <AbsoluteFill style={{background: RED}}>
          <Header color={PAPER} left="HOW IT WORKS ── 脳の転写" />
          <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
            <g transform="translate(830, 600) scale(1.3)">
              <path d={HEAD_FACE} fill={BLACK} />
              <g transform={`rotate(${open * 74} 158 -120)`}>
                <path d={HEAD_DOME} fill={BLACK} />
              </g>
              <g transform={`translate(0, ${-190 + riseY})`}>
                <FlatBrain pop={Math.min(pop, 1)} />
              </g>
            </g>
          </svg>
          <div style={{position: 'absolute', right: 110, top: 300, opacity: badges}}>
            <div style={{fontSize: 46, fontWeight: 900, color: PAPER, border: `5px solid ${PAPER}`, padding: '20px 40px'}}>
              オリジナルAIエンジン「デジブレ」
            </div>
            <div style={{fontSize: 40, fontWeight: 900, color: RED, background: PAPER, padding: '18px 38px', marginTop: 24, display: 'inline-block'}}>
              世界初 ｜ 特許出願中
            </div>
          </div>
        </AbsoluteFill>
      )}
      <Wipe at={86} color={RED} />
      <Wipe at={193} color={BLACK} />
    </AbsoluteFill>
  );
};

// ══ S2 技術の中身(400f) ══
const HeadGlyph: React.FC<{on: boolean; color: string}> = ({on, color}) => (
  <div style={{width: 52, height: 60, position: 'relative', opacity: on ? 1 : 0.14}}>
    <div style={{position: 'absolute', top: 0, left: 8, width: 36, height: 36, borderRadius: '50% 50% 46% 46%', background: color}} />
    <div style={{position: 'absolute', bottom: 0, left: 0, width: 52, height: 20, borderRadius: '10px 10px 0 0', background: color}} />
  </div>
);

const KEngine: React.FC = () => {
  const local = useCurrentFrame();
  const count = Math.round(interpolate(local, [14, 90], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const note = interpolate(local, [96, 116], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const DOMAINS = ['人事', '採用コンサル', 'マーケティング', 'ブランディング', '経営コンサル', 'アーティスト'];
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {/* B1: 約40名コピー済み(0-240) 黒地 */}
      {local < 242 && (
        <AbsoluteFill style={{background: BLACK}}>
          <Header color={PAPER} left="THE ENGINE ── 転写済みの脳" right="デジブレ" />
          <div style={{position: 'absolute', left: 110, top: 250}}>
            <Slam delay={8}>
              <div style={{fontSize: 52, fontWeight: 800, color: PAPER, opacity: 0.7}}>各領域のトップパフォーマー</div>
            </Slam>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8}}>
              <span style={{fontSize: 90, fontWeight: 900, color: PAPER}}>約</span>
              <span style={{fontSize: 300, fontWeight: 900, color: YELLOW, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05}}>{count}</span>
              <span style={{fontSize: 90, fontWeight: 900, color: PAPER}}>名</span>
            </div>
            <div style={{fontSize: 72, fontWeight: 900, color: PAPER}}>
              の脳を、<span style={{color: RED, background: PAPER, padding: '0 14px'}}>コピー済み。</span>
            </div>
            <div style={{fontSize: 30, fontWeight: 500, color: PAPER, opacity: 0.65 * note, marginTop: 34}}>
              脳科学に基づく独自の暗黙知抽出技術で、思考をそのままAIへ。
            </div>
          </div>
          {/* 40頭グリッド */}
          <div style={{position: 'absolute', right: 100, top: 220, width: 560, display: 'flex', flexWrap: 'wrap', gap: 18}}>
            {Array.from({length: 40}).map((_, i) => (
              <HeadGlyph key={i} on={i < count} color={i % 7 === 3 ? YELLOW : PAPER} />
            ))}
          </div>
          <div style={{position: 'absolute', right: 100, bottom: 110, display: 'flex', gap: 14, flexWrap: 'wrap', width: 620, justifyContent: 'flex-end'}}>
            {DOMAINS.map((d, i) => (
              <div
                key={d}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: BLACK,
                  background: PAPER,
                  padding: '10px 22px',
                  opacity: interpolate(local, [30 + i * 9, 44 + i * 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {/* B2: レシピではなく料理(240-400) 紙地 */}
      {local >= 240 && (
        <AbsoluteFill style={{background: PAPER}}>
          <Header color={BLACK} left="OUTPUT ── 出力の違い" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={248}>
              <div style={{fontSize: 88, fontWeight: 900, color: BLACK, textAlign: 'center'}}>
                レシピではなく、<span style={{color: PAPER, background: RED, padding: '0 18px'}}>料理そのもの</span>を出力。
              </div>
            </Slam>
            <div style={{height: 60}} />
            <div style={{display: 'flex', gap: 56}}>
              <Slam delay={266}>
                <div style={{width: 620, padding: '44px 48px', border: `4px solid ${BLACK}`, opacity: 0.55}}>
                  <div style={{fontSize: 40, fontWeight: 800, color: BLACK}}>既存のAIツール</div>
                  <div style={{fontSize: 31, fontWeight: 500, color: BLACK, marginTop: 20, lineHeight: 1.7}}>
                    一般的な回答を出力し、
                    <br />
                    業務を「補助」する。
                  </div>
                </div>
              </Slam>
              <Slam delay={280}>
                <div style={{width: 660, padding: '44px 48px', background: BLUE}}>
                  <div style={{fontSize: 40, fontWeight: 900, color: PAPER}}>デジブレ</div>
                  <div style={{fontSize: 31, fontWeight: 700, color: PAPER, marginTop: 20, lineHeight: 1.7}}>
                    提案書・分析・戦略「そのもの」を
                    <br />
                    トップパフォーマー品質で出力。
                  </div>
                </div>
              </Slam>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      <Wipe at={238} color={YELLOW} />
    </AbsoluteFill>
  );
};

// ══ S3 例えば、採用。(190f) ══
const KIntro: React.FC = () => {
  const local = useCurrentFrame();
  const sub = interpolate(local, [70, 92], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: BLUE, fontFamily: FONT}}>
      <Header color={PAPER} left="CASE 01 ── 採用" right="№02" />
      <GhostNum n="?" color={PAPER} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Slam delay={10}>
          <div style={{fontSize: 180, fontWeight: 900, color: PAPER}}>
            例えば、<span style={{color: YELLOW}}>採用</span>。
          </div>
        </Slam>
        <div style={{fontSize: 44, fontWeight: 700, color: PAPER, opacity: 0.85 * sub, marginTop: 40, transform: `translateY(${(1 - sub) * 16}px)`}}>
          貴社は、この問いに即答できますか。
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ══ 問いシーン共通 ══
const KQuestion: React.FC<{
  bg: string;
  fg: string;
  accent: string;
  num: string;
  tag: string;
  lines: string[];
  sub: string;
  active: number;
  extra?: React.ReactNode;
}> = ({bg, fg, accent, num, tag, lines, sub, active, extra}) => {
  const local = useCurrentFrame();
  const subIn = interpolate(local, [58, 78], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: bg, fontFamily: FONT}}>
      <Header color={fg} left={`QUESTION ── ${tag}`} />
      <GhostNum n={num} color={fg} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 120, paddingRight: 100}}>
        <Slam delay={8}>
          <div style={{fontSize: 40, fontWeight: 900, color: bg, background: accent, padding: '10px 28px', letterSpacing: '0.16em'}}>{num}</div>
        </Slam>
        <div style={{height: 40}} />
        {lines.map((l, i) => (
          <Slam key={l} delay={20 + i * 12}>
            <div style={{fontSize: 96, fontWeight: 900, color: fg, lineHeight: 1.3}}>{l}</div>
          </Slam>
        ))}
        <div style={{fontSize: 34, fontWeight: 600, color: fg, opacity: 0.62 * subIn, marginTop: 34}}>{sub}</div>
        {extra}
      </AbsoluteFill>
      {/* 進捗ドット */}
      <div style={{position: 'absolute', bottom: 70, left: 120, display: 'flex', gap: 16}}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{width: i === active ? 58 : 18, height: 18, background: i === active ? accent : fg, opacity: i === active ? 1 : 0.3}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const KQ1: React.FC = () => (
  <KQuestion
    bg={PAPER} fg={BLACK} accent={RED} num="①" tag="POSITION" active={0}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    sub="競合ではなく、貴社が選ばれる「構造上の理由」を言えますか。"
  />
);

const KQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['定着率', '技術力', '歴史', '福利厚生', '外部評価'];
  return (
    <KQuestion
      bg={BLACK} fg={PAPER} accent={YELLOW} num="②" tag="HIDDEN ASSETS" active={1}
      lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
      sub="社内では当たり前すぎて、誰も武器だと気づいていない事実。"
      extra={
        <div style={{display: 'flex', gap: 20, marginTop: 44, flexWrap: 'wrap'}}>
          {WORDS.map((w, i) => (
            <div
              key={w}
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: PAPER,
                border: `3px dashed ${PAPER}`,
                padding: '14px 30px',
                opacity: 0.28 + 0.5 * Math.abs(Math.sin(local / 18 + i * 1.4)),
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

const KQ3: React.FC = () => {
  const local = useCurrentFrame();
  const dots = interpolate(local, [66, 86], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <KQuestion
      bg={RED} fg={PAPER} accent={BLACK} num="③" tag="CLOSING" active={2}
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      sub="内定承諾の瀬戸際で使う「一言」を、貴社は持っていますか。"
      extra={
        <div style={{marginTop: 46, display: 'flex', alignItems: 'center', gap: 26, opacity: dots}}>
          <div style={{width: 380, height: 130, border: `5px dashed ${PAPER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{width: 20, height: 20, borderRadius: '50%', background: PAPER, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(local / 7 - i))}} />
            ))}
          </div>
          <div style={{fontSize: 34, fontWeight: 900, color: PAPER}}>貴社の「一言」＝ ？</div>
        </div>
      }
    />
  );
};

// ══ S7 答え(460f) ══
const KAnswer: React.FC = () => {
  const local = useCurrentFrame();
  const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
  const REPORTS = ['ポジショニングマップ', '無自覚資産の発掘', 'ターゲットペルソナ', 'トークスクリプト'];
  const listIn = interpolate(local, [300, 324], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {/* B1: 4つの問いに答え(0-105) 紙地 */}
      {local < 107 && (
        <AbsoluteFill style={{background: PAPER}}>
          <Header color={BLACK} left="THE ANSWER" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={6}>
              <div style={{fontSize: 84, fontWeight: 900, color: BLACK}}>
                4つの問い、<span style={{color: PAPER, background: RED, padding: '0 16px'}}>すべてに答え</span>を。
              </div>
            </Slam>
            <div style={{display: 'flex', gap: 30, marginTop: 64}}>
              {QUESTIONS.map((q, i) => (
                <Slam key={q} delay={22 + i * 10}>
                  <div style={{position: 'relative', fontSize: 33, fontWeight: 800, color: BLACK, border: `4px solid ${BLACK}`, padding: '36px 34px'}}>
                    {q}
                    <div style={{position: 'absolute', top: -24, right: -24, width: 48, height: 48, background: RED, color: PAPER, fontSize: 32, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      ✓
                    </div>
                  </div>
                </Slam>
              ))}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B2: ADTURN for HR(105-460) 黒地 */}
      {local >= 105 && (
        <AbsoluteFill style={{background: BLACK}}>
          <Header color={PAPER} left="PRODUCT 01" right="人事・採用" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 0}}>
            <Slam delay={114}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
                <div style={{fontSize: 120, fontWeight: 900, color: PAPER, letterSpacing: '0.02em'}}>ADTURN</div>
                <div style={{fontSize: 120, fontWeight: 900, color: YELLOW}}>for HR</div>
                <div style={{width: 28, height: 28, background: RED}} />
              </div>
            </Slam>
            <Slam delay={132}>
              <div style={{fontSize: 36, fontWeight: 700, color: PAPER, opacity: 0.8, marginTop: 18}}>
                人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート
              </div>
            </Slam>
            <div style={{display: 'flex', gap: 26, marginTop: 56}}>
              {REPORTS.map((r, i) => (
                <Slam key={r} delay={170 + i * 12}>
                  <div style={{width: 300, background: PAPER}}>
                    <div style={{background: i === 3 ? RED : BLUE, color: PAPER, fontSize: 26, fontWeight: 900, padding: '16px 20px'}}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{padding: '22px 20px 12px', fontSize: 29, fontWeight: 900, color: BLACK, minHeight: 96}}>{r}</div>
                    <div style={{padding: '0 20px 24px'}}>
                      {[0, 1, 2].map((j) => (
                        <div key={j} style={{height: 8, background: BLACK, opacity: 0.14, marginTop: 10, width: `${88 - j * 18}%`}} />
                      ))}
                    </div>
                  </div>
                </Slam>
              ))}
            </div>
            <div style={{display: 'flex', gap: 20, marginTop: 46, fontSize: 27, fontWeight: 700, color: PAPER, opacity: 0.7 * listIn}}>
              <span>市場ポジションの設計</span>
              <span style={{opacity: 0.4}}>／</span>
              <span>眠れる魅力の発掘</span>
              <span style={{opacity: 0.4}}>／</span>
              <span>狙うべき人材の特定</span>
              <span style={{opacity: 0.4}}>／</span>
              <span>面接で使うトークスクリプト</span>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      <Wipe at={103} color={RED} />
    </AbsoluteFill>
  );
};

// ══ S8 一般論は一行もない(130f) ══
const KNoGen: React.FC = () => (
  <AbsoluteFill style={{background: RED, fontFamily: FONT}}>
    <Header color={PAPER} left="NO BOILERPLATE" />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Slam delay={8}>
        <div style={{fontSize: 128, fontWeight: 900, color: PAPER, textAlign: 'center'}}>
          一般論は、
          <br />
          <span style={{color: RED, background: PAPER, padding: '0 24px'}}>一行もない。</span>
        </div>
      </Slam>
      <Slam delay={44}>
        <div style={{fontSize: 34, fontWeight: 700, color: PAPER, opacity: 0.85, marginTop: 44, textAlign: 'center', lineHeight: 1.7}}>
          貴社の公開情報から、トップパフォーマーの「脳」が診断。
        </div>
      </Slam>
    </AbsoluteFill>
  </AbsoluteFill>
);

// ══ M1 例えば、マーケティング。(440f) ══
const KMIntro: React.FC = () => {
  const local = useCurrentFrame();
  const LOSS = [0.82, 0.7, 0.72, 0.55, 0.45, 0.3];
  const GAIN = [0.3, 0.48, 0.58, 0.76, 0.9];
  const lossIn = interpolate(local, [180, 250], [0, LOSS.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const gainIn = interpolate(local, [255, 320], [0, GAIN.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {/* B1: 例えば、マーケティング。(0-100) 紙地 */}
      {local < 102 && (
        <AbsoluteFill style={{background: PAPER}}>
          <Header color={BLACK} left="CASE 02 ── マーケティング" right="№03" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={10}>
              <div style={{fontSize: 132, fontWeight: 900, color: BLACK}}>
                例えば、<span style={{color: PAPER, background: BLUE, padding: '0 20px'}}>マーケティング</span>。
              </div>
            </Slam>
            <div style={{fontSize: 44, fontWeight: 700, color: BLACK, opacity: 0.6 * interpolate(local, [56, 76], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), marginTop: 44}}>
              貴社のデジタル上の機会損失、見えていますか。
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B2: 断言+チャート(100-440) 青地 */}
      {local >= 100 && (
        <AbsoluteFill style={{background: BLUE}}>
          <Header color={PAPER} left="ASSERTION ── 断言" />
          <div style={{position: 'absolute', left: 110, top: 320}}>
            <Slam delay={112}>
              <div style={{fontSize: 88, fontWeight: 900, color: PAPER}}>
                機会損失を、<span style={{color: BLUE, background: YELLOW, padding: '0 16px'}}>可視化</span>。
              </div>
            </Slam>
            <Slam delay={140}>
              <div style={{fontSize: 88, fontWeight: 900, color: PAPER, marginTop: 22}}>
                打開策を、<span style={{color: BLUE, background: PAPER, padding: '0 16px'}}>具体的に出力</span>。
              </div>
            </Slam>
            <div style={{fontSize: 33, fontWeight: 600, color: PAPER, opacity: 0.75 * interpolate(local, [200, 224], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), marginTop: 42}}>
              トップパフォーマーの脳が、診断から打開策まで。
            </div>
          </div>
          {/* 右: フラット棒チャート 損失→打開 */}
          <div style={{position: 'absolute', right: 130, top: 330, width: 620, height: 420, display: 'flex', alignItems: 'flex-end', gap: 20}}>
            {LOSS.map((h, i) => (
              <div key={`l${i}`} style={{flex: 1, height: 380 * h, background: PAPER, opacity: i < lossIn ? 0.34 : 0}} />
            ))}
            {GAIN.map((h, i) => (
              <div key={`g${i}`} style={{flex: 1, height: 380 * h, background: YELLOW, opacity: i < gainIn ? 1 : 0}} />
            ))}
          </div>
          <div style={{position: 'absolute', right: 130, top: 780, fontSize: 26, fontWeight: 800, color: PAPER, opacity: 0.7}}>
            機会損失 <span style={{opacity: 0.5}}>→</span> <span style={{color: YELLOW}}>打開策</span>
          </div>
        </AbsoluteFill>
      )}
      <Wipe at={98} color={BLACK} />
    </AbsoluteFill>
  );
};

// ══ M2-M4 マーケの問い ══
const KMQ1: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <KQuestion
      bg={PAPER} fg={BLACK} accent={BLUE} num="①" tag="SEARCH" active={0}
      lines={['検索されたとき、', '選択肢に入っていますか？']}
      sub="比較検討の入口は、検索から始まります。"
      extra={
        <div style={{marginTop: 44, display: 'flex', alignItems: 'center', gap: 30}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, width: 560, padding: '22px 34px', border: `4px solid ${BLACK}`, borderRadius: 999}}>
            <div style={{width: 26, height: 26, borderRadius: '50%', border: `5px solid ${BLUE}`, position: 'relative'}}>
              <div style={{position: 'absolute', right: -10, bottom: -7, width: 14, height: 5, background: BLUE, transform: 'rotate(45deg)'}} />
            </div>
            <span style={{fontSize: 32, fontWeight: 700, color: BLACK}}>
              おすすめ 会社 <span style={{opacity: 0.35 + 0.65 * Math.abs(Math.sin(local / 10)), color: BLUE}}>▍</span>
            </span>
          </div>
          <div style={{fontSize: 32, fontWeight: 900, color: RED}}>貴社名 ＝ 圏外？</div>
        </div>
      }
    />
  );
};

const KMQ2: React.FC = () => {
  const local = useCurrentFrame();
  const WORDS = ['技術力', '実績', 'サポート'];
  return (
    <KQuestion
      bg={BLACK} fg={PAPER} accent={YELLOW} num="②" tag="WEB VISIBILITY" active={1}
      lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']}
      sub="営業資料の強みと、Webの見え方は一致していますか。"
      extra={
        <div style={{display: 'flex', gap: 22, marginTop: 44, alignItems: 'center'}}>
          {WORDS.map((w, i) => (
            <div
              key={w}
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: PAPER,
                border: `3px solid ${PAPER}`,
                padding: '14px 32px',
                opacity: Math.max(0.08, 0.9 - Math.max(0, (local - 40 - i * 26)) * 0.012),
              }}
            >
              {w}
            </div>
          ))}
          <div style={{fontSize: 30, fontWeight: 800, color: YELLOW, marginLeft: 12}}>Web上では ＝ 不可視</div>
        </div>
      }
    />
  );
};

const KMQ3: React.FC = () => {
  const local = useCurrentFrame();
  const FUNNEL = ['流入', '比較', '問い合わせ'];
  return (
    <KQuestion
      bg={BLUE} fg={PAPER} accent={YELLOW} num="③" tag="LEAD PATH" active={2}
      lines={['見込み客を、', '問い合わせまで運べていますか？']}
      sub="流入から問い合わせまでの導線、途切れていませんか。"
      extra={
        <div style={{marginTop: 46, display: 'flex', alignItems: 'center', gap: 18}}>
          {FUNNEL.map((s, i) => (
            <React.Fragment key={s}>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: i === 1 ? BLUE : BLUE,
                  background: i === 1 ? 'transparent' : PAPER,
                  border: i === 1 ? `4px dashed ${PAPER}` : 'none',
                  padding: '18px 38px',
                }}
              >
                <span style={{color: i === 1 ? PAPER : BLUE}}>{s}</span>
                {i === 1 && <span style={{marginLeft: 12, color: RED, opacity: 0.5 + 0.5 * Math.abs(Math.sin(local / 9))}}>✕</span>}
              </div>
              {i < 2 && <div style={{width: 46, height: 6, background: PAPER, opacity: 0.6}} />}
            </React.Fragment>
          ))}
        </div>
      }
    />
  );
};

// ══ M5 診断範囲→ロードマップ(520f) ══
const KMScope: React.FC = () => {
  const local = useCurrentFrame();
  const SCOPE = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
  const TILE_BG = [RED, BLUE, YELLOW, BLACK];
  const TILE_FG = [PAPER, PAPER, BLACK, PAPER];
  const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {/* B1: 診断範囲(0-160) 紙地 */}
      {local < 162 && (
        <AbsoluteFill style={{background: PAPER}}>
          <Header color={BLACK} left="DIAGNOSTIC SCOPE ── 診断範囲" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div style={{display: 'flex', gap: 30}}>
              {SCOPE.map((s, i) => (
                <Slam key={s} delay={10 + i * 10}>
                  <div style={{width: 340, height: 340, background: TILE_BG[i], display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 30}}>
                    <div style={{fontSize: 60, fontWeight: 900, color: TILE_FG[i], opacity: 0.55}}>{String(i + 1).padStart(2, '0')}</div>
                    <div style={{fontSize: 46, fontWeight: 900, color: TILE_FG[i]}}>{s}</div>
                  </div>
                </Slam>
              ))}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B2: 何をどの順番で(160-310) 黒地 */}
      {local >= 160 && local < 312 && (
        <AbsoluteFill style={{background: BLACK}}>
          <Header color={PAPER} left="PRIORITY" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={172}>
              <div style={{fontSize: 96, fontWeight: 900, color: PAPER, textAlign: 'center', lineHeight: 1.45}}>
                何を、<span style={{color: BLACK, background: YELLOW, padding: '0 14px'}}>どの順番</span>で、
                <br />
                どう直すべきか。
              </div>
            </Slam>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B3: ロードマップ(310-520) 青地 */}
      {local >= 310 && (
        <AbsoluteFill style={{background: BLUE}}>
          <Header color={PAPER} left="FROM DIAGNOSIS TO EXECUTION" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={320}>
              <div style={{fontSize: 78, fontWeight: 900, color: PAPER}}>
                診断で、<span style={{color: BLUE, background: PAPER, padding: '0 16px'}}>終わらせない。</span>
              </div>
            </Slam>
            <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 66}}>
              {ROADMAP.map((r, i) => (
                <React.Fragment key={r}>
                  <Slam delay={344 + i * 22}>
                    <div
                      style={{
                        fontSize: 38,
                        fontWeight: 900,
                        color: i === 2 ? BLACK : PAPER,
                        background: i === 2 ? YELLOW : 'transparent',
                        border: i === 2 ? 'none' : `4px solid ${PAPER}`,
                        padding: '28px 44px',
                      }}
                    >
                      {r}
                    </div>
                  </Slam>
                  {i < 2 && (
                    <Slam delay={352 + i * 22}>
                      <div style={{fontSize: 48, fontWeight: 900, color: PAPER}}>→</div>
                    </Slam>
                  )}
                </React.Fragment>
              ))}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      <Wipe at={158} color={RED} />
      <Wipe at={308} color={PAPER} />
    </AbsoluteFill>
  );
};

// ══ M6 ADTURN for Marketing(200f) ══
const KMReveal: React.FC = () => (
  <AbsoluteFill style={{background: RED, fontFamily: FONT}}>
    <Header color={PAPER} left="PRODUCT 02" right="マーケティング" />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Slam delay={12}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
          <div style={{fontSize: 118, fontWeight: 900, color: PAPER}}>ADTURN</div>
          <div style={{fontSize: 118, fontWeight: 900, color: RED, background: PAPER, padding: '0 22px'}}>for Marketing</div>
        </div>
      </Slam>
      <Slam delay={44}>
        <div style={{fontSize: 38, fontWeight: 700, color: PAPER, opacity: 0.9, marginTop: 36}}>
          デジタル上の機会損失に、すべての打開策を。
        </div>
      </Slam>
    </AbsoluteFill>
  </AbsoluteFill>
);

// ══ F フィナーレ(780f) ══
const KFinale: React.FC = () => {
  const local = useCurrentFrame();
  const {fps} = useVideoConfig();
  const brainPop = spring({frame: local - 250, fps, config: {damping: 13, stiffness: 110}});
  const PRODUCTS = [
    ['ADTURN for HR', '人事・採用'],
    ['ADTURN for Marketing', 'マーケティング'],
  ];
  const fadeOut = interpolate(local, [758, 778], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT, opacity: fadeOut}}>
      {/* B1: 2プロダクト(0-215) 紙地 */}
      {local < 217 && (
        <AbsoluteFill style={{background: PAPER}}>
          <Header color={BLACK} left="PRODUCTS ── デジブレから生まれたプロダクト" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 40}}>
            {PRODUCTS.map(([name, subT], i) => (
              <Slam key={name} delay={20 + i * 60}>
                <div style={{display: 'flex', alignItems: 'center', gap: 34, border: `5px solid ${BLACK}`, padding: '32px 60px', width: 900}}>
                  <div style={{width: 30, height: 30, background: i === 0 ? YELLOW : BLUE}} />
                  <div>
                    <div style={{fontSize: 56, fontWeight: 900, color: BLACK}}>{name}</div>
                    <div style={{fontSize: 26, fontWeight: 700, color: BLACK, opacity: 0.55, marginTop: 4}}>{subT}</div>
                  </div>
                </div>
              </Slam>
            ))}
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B2: デジブレ転写ダイアグラム(215-510) 黒地 */}
      {local >= 215 && local < 512 && (
        <AbsoluteFill style={{background: BLACK}}>
          <Header color={PAPER} left="THE ENGINE BEHIND" />
          <AbsoluteFill style={{alignItems: 'center', paddingTop: 96}}>
            {/* ピンクのフラット脳 */}
            <svg width="460" height="260" viewBox="-160 -110 320 190">
              <FlatBrain pop={Math.min(brainPop, 1)} />
            </svg>
            <Slam delay={262}>
              <div style={{fontSize: 60, fontWeight: 900, color: BLACK, background: PINK, padding: '18px 60px', marginTop: -6}}>デジブレ</div>
            </Slam>
            {/* 分岐線 */}
            <svg width="900" height="100" viewBox="0 0 900 100" style={{opacity: interpolate(local, [282, 310], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
              <path d="M 450 0 L 450 34 L 195 34 L 195 96" stroke={PAPER} strokeWidth={6} fill="none" />
              <path d="M 450 34 L 705 34 L 705 96" stroke={PAPER} strokeWidth={6} fill="none" />
            </svg>
            <div style={{display: 'flex', gap: 110}}>
              {PRODUCTS.map(([name, subT], i) => (
                <Slam key={name} delay={302 + i * 12}>
                  <div style={{border: `4px solid ${PAPER}`, padding: '22px 40px', textAlign: 'center'}}>
                    <div style={{fontSize: 37, fontWeight: 900, color: PAPER}}>{name}</div>
                    <div style={{fontSize: 21, fontWeight: 700, color: PAPER, opacity: 0.55, marginTop: 4}}>{subT}</div>
                  </div>
                </Slam>
              ))}
            </div>
            <Slam delay={336}>
              <div style={{fontSize: 34, fontWeight: 700, color: PAPER, marginTop: 52}}>
                それぞれの分野の、トップパフォーマーの脳を<span style={{color: BLACK, background: PINK, padding: '0 12px'}}>転写</span>して実現。
              </div>
            </Slam>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B3: カスタマイズ(510-645) 青地 */}
      {local >= 510 && local < 647 && (
        <AbsoluteFill style={{background: BLUE}}>
          <Header color={PAPER} left="NEXT ── YOUR OWN MODEL" />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={522}>
              <div style={{fontSize: 96, fontWeight: 900, color: PAPER, textAlign: 'center', lineHeight: 1.5}}>
                さあ、次は<span style={{color: BLUE, background: YELLOW, padding: '0 16px'}}>貴社専用</span>に
                <br />
                カスタマイズを。
              </div>
            </Slam>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* B4: デジブレ ロックアップ(645-780) 黒地 */}
      {local >= 645 && (
        <AbsoluteFill style={{background: BLACK}}>
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <Slam delay={656}>
              <div style={{fontSize: 190, fontWeight: 900, color: PAPER}}>
                デジ<span style={{color: BLACK, background: PINK, padding: '0 16px'}}>ブレ</span>
              </div>
            </Slam>
            <Slam delay={676}>
              <div style={{fontSize: 27, fontWeight: 700, color: PAPER, opacity: 0.7, letterSpacing: '0.18em', marginTop: 30}}>
                世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
              </div>
            </Slam>
            <Slam delay={694}>
              <div style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: 46}}>
                <div style={{fontSize: 36, fontWeight: 900, color: BLACK, background: YELLOW, padding: '16px 42px'}}>デモ実施中</div>
                <div style={{fontSize: 36, fontWeight: 700, color: PAPER}}>ぜひブースでご体験ください</div>
              </div>
            </Slam>
          </AbsoluteFill>
          <div style={{position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '0.3em', color: PAPER, opacity: 0.6}}>
            ADTANK GP
          </div>
        </AbsoluteFill>
      )}
      <Wipe at={213} color={RED} />
      <Wipe at={508} color={PAPER} />
      <Wipe at={643} color={RED} />
    </AbsoluteFill>
  );
};

// ══ 本体 ══
export const AdturnKineticVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }
  const LIST: Array<[keyof typeof s, React.FC]> = [
    ['tech', KTech], ['engine', KEngine], ['intro', KIntro], ['q1', KQ1], ['q2', KQ2], ['q3', KQ3],
    ['answer', KAnswer], ['nogen', KNoGen], ['mintro', KMIntro], ['mq1', KMQ1], ['mq2', KMQ2], ['mq3', KMQ3],
    ['mscope', KMScope], ['mreveal', KMReveal], ['finale', KFinale],
  ];
  return (
    <AbsoluteFill style={{background: BLACK}}>
      <Audio src={staticFile('audio/bgm_kinetic.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {LIST.map(([key, C]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={`K ${key}`}>
          <C />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
