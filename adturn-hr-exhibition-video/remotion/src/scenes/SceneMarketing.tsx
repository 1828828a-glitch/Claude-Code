import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, QuestionScene, useRise} from '../helpers';
import {KineticChars, Particles, ReportDoc, Underline} from '../fx';

// ── マーケティング編（3D版スタイル） ──

// S8 一般論は、一行もない。（130f・単独シーン）
export const SceneNoGen: React.FC = () => {
  const sub = useRise(40, 30);
  return (
    <AbsoluteFill style={{background: COLORS.ink, fontFamily: FONT, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <Particles count={40} seed="nogen" color="rgba(139,92,246,0.5)" />
      <AbsoluteFill style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 110}}>
        <ReportDoc delay={4} width={430} height={580} header="戦略レポート｜p.21" lineCount={11} seed="s8doc" glow fontSize={26} />
        <div>
          <KineticChars text="一般論は、" delay={8} stagger={2.6} style={{fontSize: 110, fontWeight: 900, color: COLORS.white}} />
          <KineticChars
            text="一行もない。"
            delay={22}
            stagger={2.6}
            gradientRange={[0, 4]}
            style={{fontSize: 110, fontWeight: 900, color: COLORS.white}}
          />
          <div style={{height: 40}} />
          <div style={{fontSize: 38, fontWeight: 500, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, ...sub}}>
            貴社の公開情報から、
            <br />
            トップパフォーマーの「脳」が診断。
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// M1 例えば、マーケティング。＋断言（440f）
export const SceneMIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 100;
  const introSub = useRise(56, 30);
  const l1 = useRise(120, 40);
  const chartIn = useRise(168, 40);
  const assertSub = useRise(196, 30);
  const lossDraw = interpolate(frame, [180, 240], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const gainDraw = interpolate(frame, [250, 310], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const lossPts = [
    [40, 120], [130, 150], [220, 145], [310, 200], [400, 230], [470, 295],
  ];
  const gainPts = [
    [470, 295], [545, 235], [620, 205], [695, 135], [760, 80],
  ];
  const path = (pts: number[][], p: number) => {
    const n = Math.max(2, Math.ceil(pts.length * p));
    return 'M ' + pts.slice(0, n).map(([x, y]) => `${x} ${y}`).join(' L ');
  };

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: isBeat2 ? COLORS.ink : COLORS.white}}>
      {!isBeat2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <Particles count={16} seed="mi" color="rgba(67,83,255,0.15)" maxSize={7} />
          <div style={{textAlign: 'center'}}>
            <KineticChars
              text="例えば、マーケティング。"
              delay={8}
              stagger={2.8}
              gradientRange={[4, 11]}
              style={{fontSize: 140, fontWeight: 900, color: COLORS.ink, justifyContent: 'center'}}
            />
          </div>
          <div style={{position: 'absolute', top: '60%', textAlign: 'center', ...introSub}}>
            <div style={{fontSize: 58, fontWeight: 700, color: COLORS.inkSoft}}>
              貴社のデジタル上の機会損失、見えていますか。
            </div>
            <div style={{height: 24, display: 'flex', justifyContent: 'center'}}>
              <Underline delay={76} width={560} />
            </div>
          </div>
        </AbsoluteFill>
      )}
      {isBeat2 && (
        <>
          <AbsoluteFill
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '120px 120px',
            }}
          />
          <Particles count={36} seed="mi2" color="rgba(139,92,246,0.45)" />
          <div style={{position: 'absolute', left: 130, top: 330}}>
            <div style={{...l1}}>
              <KineticChars
                text="機会損失を、可視化。"
                delay={112}
                stagger={2.4}
                gradientRange={[0, 4]}
                style={{fontSize: 96, fontWeight: 900, color: COLORS.white}}
              />
              <div style={{height: 20}} />
              <KineticChars
                text="打開策を、具体的に出力。"
                delay={140}
                stagger={2.4}
                gradientRange={[5, 10]}
                style={{fontSize: 96, fontWeight: 900, color: COLORS.white}}
              />
            </div>
            <div style={{fontSize: 36, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginTop: 40, ...assertSub}}>
              トップパフォーマーの脳が、診断から打開策まで。
            </div>
          </div>
          {/* 右: 損失→打開のチャート */}
          <div style={{position: 'absolute', right: 120, top: 300, width: 800, height: 420, ...chartIn}}>
            <svg width="800" height="400" viewBox="0 0 800 400">
              <defs>
                <linearGradient id="mGain" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.blue} />
                  <stop offset="100%" stopColor={COLORS.purple} />
                </linearGradient>
              </defs>
              <line x1="30" y1="360" x2="790" y2="360" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <line x1="30" y1="360" x2="30" y2="30" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              {lossDraw > 0 && (
                <path d={path(lossPts, lossDraw)} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeDasharray="12 9" />
              )}
              {gainDraw > 0 && <path d={path(gainPts, gainDraw)} fill="none" stroke="url(#mGain)" strokeWidth="6" strokeLinecap="round" />}
              <circle cx="470" cy="295" r="10" fill="none" stroke={COLORS.purple} strokeWidth="3" opacity={gainDraw > 0 ? 1 : 0} />
            </svg>
            <div style={{position: 'absolute', left: 220, top: 328, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.45)'}}>
              機会損失
            </div>
            <div style={{position: 'absolute', right: 40, top: 30, fontSize: 26, fontWeight: 900, opacity: gainDraw}}>
              <GradientText>打開策</GradientText>
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// M2 検索されたとき（180f）
export const SceneMQ1: React.FC = () => {
  const frame = useCurrentFrame();
  const box = useRise(56, 40);
  return (
    <QuestionScene
      num="M1"
      tag="SEARCH"
      lines={['検索されたとき、', '選択肢に入っていますか？']}
      sub="比較検討の入口は、検索から始まります。"
      extra={
        <div style={{marginTop: 60, ...box}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              width: 640,
              padding: '26px 38px',
              borderRadius: 999,
              border: '3px solid rgba(67,83,255,0.35)',
              background: '#FFFFFF',
              boxShadow: '0 18px 44px rgba(11,16,32,0.10)',
            }}
          >
            <div style={{width: 30, height: 30, borderRadius: '50%', border: `4px solid ${COLORS.blue}`, position: 'relative'}}>
              <div style={{position: 'absolute', right: -11, bottom: -8, width: 15, height: 4, background: COLORS.blue, transform: 'rotate(45deg)', borderRadius: 2}} />
            </div>
            <span style={{fontSize: 34, fontWeight: 700, color: COLORS.greyDark}}>
              おすすめ 会社{' '}
              <span style={{opacity: 0.35 + 0.65 * Math.abs(Math.sin(frame / 10)), color: COLORS.blue}}>▍</span>
            </span>
          </div>
          <div style={{fontSize: 30, fontWeight: 700, color: COLORS.grey, marginTop: 18, textAlign: 'right'}}>
            貴社名 ＝ 圏外？
          </div>
        </div>
      }
    />
  );
};

// M3 営業で伝わる強み（195f・ダーク）
const FADE_WORDS = [
  {w: '技術力', x: 1310, y: 300, d: 20},
  {w: '実績', x: 1560, y: 500, d: 40},
  {w: 'サポート', x: 1330, y: 700, d: 60},
];
export const SceneMQ2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <QuestionScene
      dark
      num="M2"
      tag="WEB VISIBILITY"
      lines={['営業で伝わる強みが、', 'Web上で消えていませんか？']}
      sub="営業資料の強みと、Webの見え方は一致していますか。"
      background={
        <AbsoluteFill>
          {FADE_WORDS.map(({w, x, y, d}) => {
            const o = interpolate(frame, [d, d + 26, d + 90, d + 150], [0, 0.85, 0.5, 0.08], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={w}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  fontSize: 76,
                  fontWeight: 900,
                  color: '#B9AFFF',
                  opacity: o,
                  textShadow: '0 0 40px rgba(139,92,246,0.8)',
                }}
              >
                {w}
              </div>
            );
          })}
          <div style={{position: 'absolute', right: 190, top: 850, fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.45)'}}>
            Web上では ＝ 不可視
          </div>
        </AbsoluteFill>
      }
    />
  );
};

// M4 見込み客（180f）
const FUNNEL = ['流入', '比較', '問い合わせ'];
export const SceneMQ3: React.FC = () => {
  const frame = useCurrentFrame();
  const fun = useRise(56, 40);
  return (
    <QuestionScene
      num="M3"
      tag="LEAD PATH"
      lines={['見込み客を、', '問い合わせまで運べていますか？']}
      sub="流入から問い合わせまでの導線、途切れていませんか。"
      extra={
        <div style={{marginTop: 64, display: 'flex', alignItems: 'center', ...fun}}>
          {FUNNEL.map((s, i) => (
            <React.Fragment key={s}>
              <div
                style={{
                  padding: '22px 44px',
                  borderRadius: 20,
                  border: i === 1 ? '4px dashed rgba(239,83,80,0.6)' : '3px solid rgba(67,83,255,0.35)',
                  background: i === 1 ? 'rgba(239,83,80,0.05)' : '#FFFFFF',
                  boxShadow: i === 1 ? 'none' : '0 14px 34px rgba(11,16,32,0.08)',
                  fontSize: 36,
                  fontWeight: 900,
                  color: i === 1 ? COLORS.grey : COLORS.ink,
                }}
              >
                {s}
                {i === 1 && (
                  <span style={{marginLeft: 14, color: '#EF5350', opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 9)), fontSize: 30}}>
                    ✕
                  </span>
                )}
              </div>
              {i < 2 && (
                <div style={{width: 64, height: 4, background: i === 0 ? 'rgba(67,83,255,0.3)' : 'rgba(239,83,80,0.35)', borderRadius: 2}} />
              )}
            </React.Fragment>
          ))}
        </div>
      }
    />
  );
};

// M5 診断範囲 → 優先順位 → ロードマップ（520f・ダーク）
const SCOPE_ITEMS = ['競合比較', '検索導線', 'コンテンツ', 'AI検索'];
const SCOPE_EN = ['COMPETITIVE', 'SEARCH PATH', 'CONTENT', 'AI SEARCH'];
const ROADMAP = ['施策の優先順位', '実装仕様', '実行ロードマップ'];

export const SceneMScope: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 160 ? 1 : frame < 310 ? 2 : 3;
  const h1 = useRise(6, 30);
  const h3 = useRise(316, 30);
  // フックは条件の外でまとめて呼ぶ
  const chipRises = SCOPE_ITEMS.map((_, i) => useRise(14 + i * 11, 50));
  const roadRises = ROADMAP.map((_, i) => useRise(340 + i * 26, 40));
  const b2Underline = 200;

  return (
    <AbsoluteFill style={{background: COLORS.ink, fontFamily: FONT, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <Particles count={40} seed="mscope" color="rgba(139,92,246,0.5)" />

      {beat === 1 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 240, textAlign: 'center', ...h1}}>
            <div style={{fontSize: 30, fontWeight: 700, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)'}}>
              DIAGNOSTIC SCOPE — 診断範囲
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 400, transform: 'translateX(-50%)', display: 'flex', gap: 34}}>
            {SCOPE_ITEMS.map((s, i) => (
              <div
                key={s}
                style={{
                  width: 350,
                  padding: '44px 0',
                  textAlign: 'center',
                  borderRadius: 26,
                  background: 'rgba(139,92,246,0.13)',
                  border: '2.5px solid rgba(139,92,246,0.4)',
                  boxShadow: '0 0 60px rgba(99,102,241,0.18)',
                  ...chipRises[i],
                }}
              >
                <div style={{fontSize: 20, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.45)'}}>
                  {String(i + 1).padStart(2, '0')} — {SCOPE_EN[i]}
                </div>
                <div style={{fontSize: 48, fontWeight: 900, color: COLORS.white, marginTop: 14}}>{s}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {beat === 2 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center'}}>
            <KineticChars
              text="何を、どの順番で、どう直すべきか。"
              delay={170}
              stagger={2.6}
              gradientRange={[3, 8]}
              style={{fontSize: 92, fontWeight: 900, color: COLORS.white, justifyContent: 'center'}}
            />
            <div style={{height: 34, display: 'flex', justifyContent: 'center'}}>
              <Underline delay={b2Underline} width={760} />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {beat === 3 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 280, textAlign: 'center', ...h3}}>
            <div style={{fontSize: 30, fontWeight: 700, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)'}}>
              FROM DIAGNOSIS TO EXECUTION
            </div>
            <div style={{fontSize: 72, fontWeight: 900, color: COLORS.white, marginTop: 26}}>
              診断で、<GradientText>終わらせない。</GradientText>
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: 560, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center'}}>
            {ROADMAP.map((r, i) => (
              <React.Fragment key={r}>
                <div
                  style={{
                    padding: '34px 52px',
                    borderRadius: 24,
                    background: i === 2 ? GRADIENT : 'rgba(255,255,255,0.06)',
                    border: i === 2 ? 'none' : '2px solid rgba(255,255,255,0.2)',
                    fontSize: 40,
                    fontWeight: 900,
                    color: COLORS.white,
                    whiteSpace: 'nowrap',
                    boxShadow: i === 2 ? '0 0 60px rgba(99,102,241,0.4)' : 'none',
                    ...roadRises[i],
                  }}
                >
                  {r}
                </div>
                {i < 2 && (
                  <div style={{display: 'flex', alignItems: 'center', margin: '0 22px', opacity: roadRises[i + 1].opacity}}>
                    <div style={{width: 54, height: 4, background: 'rgba(139,92,246,0.7)', borderRadius: 2}} />
                    <div style={{width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid rgba(139,92,246,0.9)'}} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
