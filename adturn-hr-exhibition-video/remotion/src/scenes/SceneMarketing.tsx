import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText, QuestionScene, useRise} from '../helpers';
import {KineticChars, Particles, ReportDoc, Underline} from '../fx';
import {BRAIN_PARTS, makeCerebellumGeo, makeHemisphereGeo} from './BrainGeo';

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

// M6 アドターン for マーケティング リビール（200f）
export const SceneMReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const ringIn = useRise(8, 40);
  const sub = useRise(64, 30);
  const glowP = interpolate(frame, [4, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: COLORS.ink, fontFamily: FONT, overflow: 'hidden', justifyContent: 'center', alignItems: 'center'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <Particles count={44} seed="mrev" color="rgba(139,92,246,0.55)" />
      <div
        style={{
          position: 'absolute',
          width: 980,
          height: 980,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,83,255,0.28) 0%, rgba(139,92,246,0.12) 45%, transparent 70%)',
          transform: `scale(${glowP})`,
        }}
      />
      <div style={{display: 'flex', justifyContent: 'center', ...ringIn}}>
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: '50%',
            border: '36px solid transparent',
            background: `linear-gradient(${COLORS.ink}, ${COLORS.ink}) padding-box, ${GRADIENT} border-box`,
            transform: `rotate(${frame}deg)`,
            filter: 'drop-shadow(0 0 50px rgba(99,102,241,0.5))',
          }}
        />
      </div>
      <div style={{height: 50}} />
      <div style={{display: 'flex', alignItems: 'baseline'}}>
        <KineticChars text="ADTURN" delay={22} stagger={2.4} style={{fontSize: 108, fontWeight: 900, color: COLORS.white}} />
        <span style={{width: 30}} />
        <KineticChars
          text="for Marketing"
          delay={40}
          stagger={2}
          gradientRange={[0, 13]}
          style={{fontSize: 108, fontWeight: 900, color: COLORS.white}}
        />
      </div>
      <div style={{height: 36}} />
      <div style={{fontSize: 40, fontWeight: 700, color: 'rgba(255,255,255,0.75)', ...sub}}>
        デジタル上の機会損失に、すべての打開策を。
      </div>
    </AbsoluteFill>
  );
};

// フィナーレ（780f）: 2プロダクト → デジブレ転写 → 貴社専用カスタマイズ → デジブレ
const PRODUCTS = ['ADTURN for HR', 'ADTURN for Marketing'];
const PRODUCTS_SUB = ['人事・採用', 'マーケティング'];


// フィナーレ用: カラフル3D脳がダイアグラムの上で回転（デジブレの中身＝脳）
const BrainFloat: React.FC<{appearAt: number}> = ({appearAt}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const geoL = useMemo(() => makeHemisphereGeo(0.0, true), []);
  const geoR = useMemo(() => makeHemisphereGeo(2.7, true), []);
  const geoC = useMemo(() => makeCerebellumGeo(true), []);
  const grow = interpolate(frame, [appearAt, appearAt + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const s = 0.72 * grow;
  const bob = Math.sin(frame / 32) * 0.04;
  const mat = {vertexColors: true, roughness: 0.38, metalness: 0.12, emissiveIntensity: 0.35, emissive: new THREE.Color('#33265A')};
  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{antialias: true}}
      camera={{fov: 35, position: [0, 0, 6.5]}}
      style={{position: 'absolute', inset: 0}}
    >
      <ambientLight intensity={0.75} color="#8892FF" />
      <directionalLight position={[4, 5, 3]} intensity={2.6} color="#FFFFFF" />
      <directionalLight position={[-5, 2, -2]} intensity={1.6} color="#7A5CFF" />
      <group position={[0, 1.18 + bob, 0]} scale={s} rotation={[0.2, frame / 80, 0.04]}>
        <mesh geometry={geoL} position={BRAIN_PARTS.left.position} rotation={BRAIN_PARTS.left.rotation}>
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh geometry={geoR} position={BRAIN_PARTS.right.position} rotation={BRAIN_PARTS.right.rotation}>
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh geometry={geoC} position={BRAIN_PARTS.cerebellum.position}>
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={BRAIN_PARTS.stem.position} rotation={BRAIN_PARTS.stem.rotation}>
          <cylinderGeometry args={[0.13, 0.19, 0.5, 32]} />
          <meshStandardMaterial color="#B39DDB" roughness={0.4} metalness={0.1} />
        </mesh>
        <pointLight color="#FF9ECF" intensity={grow * 8} distance={5} />
      </group>
    </ThreeCanvas>
  );
};

export const SceneFinale: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 215 ? 1 : frame < 510 ? 2 : frame < 645 ? 3 : 4;

  const h1 = useRise(6, 30);
  const p1r = useRise(22, 40);
  const p2r = useRise(106, 40);

  const coreIn = useRise(224, 40);
  const armIn = interpolate(frame, [258, 300], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const prodIn = useRise(292, 36);
  const transferSub = useRise(330, 30);

  const b3In = useRise(520, 40);

  const glow = interpolate(frame, [648, 690], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const b4Logo = useRise(658, 40);
  const b4Sub = useRise(676, 30);
  const b4Cta = useRise(694, 30);
  const pull = interpolate(frame, [560, 720], [0, 0.72], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const lockup = (name: string, subT: string, anim: {opacity: number; transform: string}, key: string) => (
    <div
      key={key}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 34,
        padding: '30px 60px',
        borderRadius: 26,
        background: 'rgba(255,255,255,0.05)',
        border: '2px solid rgba(139,92,246,0.4)',
        boxShadow: '0 0 50px rgba(99,102,241,0.15)',
        ...anim,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          border: '14px solid transparent',
          background: `linear-gradient(${COLORS.ink}, ${COLORS.ink}) padding-box, ${GRADIENT} border-box`,
        }}
      />
      <div>
        <div style={{fontSize: 54, fontWeight: 900, color: COLORS.white}}>{name}</div>
        <div style={{fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', marginTop: 4}}>{subT}</div>
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{background: COLORS.ink, fontFamily: FONT, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <Particles count={50} seed="finale" color="rgba(139,92,246,0.5)" pull={pull} />

      {beat === 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 44}}>
          <div style={{fontSize: 30, fontWeight: 700, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)', ...h1}}>
            PRODUCTS — デジブレから生まれたプロダクト
          </div>
          {lockup(PRODUCTS[0], PRODUCTS_SUB[0], p1r, 'p0')}
          {lockup(PRODUCTS[1], PRODUCTS_SUB[1], p2r, 'p1')}
        </AbsoluteFill>
      )}

      {beat === 2 && (
        <>
        <BrainFloat appearAt={224} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 150}}>
          {/* デジブレ・コア */}
          <div style={{textAlign: 'center', ...coreIn}}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 26,
                padding: '26px 64px',
                borderRadius: 999,
                background: GRADIENT,
                boxShadow: '0 0 80px rgba(99,102,241,0.5)',
              }}
            >
              <div style={{width: 44, height: 44, borderRadius: '50%', border: `12px solid ${COLORS.white}`}} />
              <span style={{fontSize: 62, fontWeight: 900, color: COLORS.white}}>デジブレ</span>
            </div>
          </div>
          {/* 転写アーム */}
          <svg width="900" height="130" viewBox="0 0 900 130" style={{opacity: armIn}}>
            <path d="M 450 0 L 450 40 L 205 40 L 205 120" fill="none" stroke="rgba(139,92,246,0.7)" strokeWidth="4" />
            <path d="M 450 40 L 695 40 L 695 120" fill="none" stroke="rgba(139,92,246,0.7)" strokeWidth="4" />
            <circle cx="205" cy="120" r="8" fill="#8B5CF6" />
            <circle cx="695" cy="120" r="8" fill="#8B5CF6" />
          </svg>
          {/* 2プロダクト */}
          <div style={{display: 'flex', gap: 90, ...prodIn}}>
            {PRODUCTS.map((p, i) => (
              <div
                key={p}
                style={{
                  padding: '24px 44px',
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(139,92,246,0.4)',
                  fontSize: 40,
                  fontWeight: 900,
                  color: COLORS.white,
                }}
              >
                {p}
                <div style={{fontSize: 21, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center'}}>
                  {PRODUCTS_SUB[i]}
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 56, ...transferSub}}>
            それぞれの分野の、トップパフォーマーの脳を<GradientText>転写</GradientText>して実現。
          </div>
        </AbsoluteFill>
        </>
      )}

      {beat === 3 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{textAlign: 'center', ...b3In}}>
            <div style={{fontSize: 30, fontWeight: 700, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)', marginBottom: 40}}>
              NEXT — YOUR OWN MODEL
            </div>
            <div style={{fontSize: 92, fontWeight: 900, color: COLORS.white}}>
              さあ、次は<GradientText>貴社専用</GradientText>に
            </div>
            <div style={{fontSize: 92, fontWeight: 900, color: COLORS.white, marginTop: 16}}>カスタマイズを。</div>
          </div>
        </AbsoluteFill>
      )}

      {beat === 4 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              position: 'absolute',
              width: 940,
              height: 940,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(67,83,255,0.30) 0%, rgba(139,92,246,0.14) 45%, transparent 70%)',
              transform: `scale(${glow})`,
            }}
          />
          <div style={{display: 'flex', justifyContent: 'center', ...b4Logo}}>
            <div
              style={{
                width: 170,
                height: 170,
                borderRadius: '50%',
                border: '40px solid transparent',
                background: `linear-gradient(${COLORS.ink}, ${COLORS.ink}) padding-box, ${GRADIENT} border-box`,
                transform: `rotate(${frame}deg)`,
                filter: 'drop-shadow(0 0 60px rgba(99,102,241,0.55))',
              }}
            />
          </div>
          <div style={{height: 46}} />
          <div style={{fontSize: 128, fontWeight: 900, color: COLORS.white, ...b4Logo}}>
            デジ<GradientText>ブレ</GradientText>
          </div>
          <div style={{height: 26}} />
          <div style={{fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.18em', ...b4Sub}}>
            世界初のAIエンジン ｜ 特許出願中 ｜ ADTURN for HR ／ ADTURN for Marketing
          </div>
          <div style={{height: 44}} />
          <div style={{display: 'flex', alignItems: 'center', gap: 30, ...b4Cta}}>
            <div
              style={{
                padding: '18px 46px',
                borderRadius: 999,
                background: GRADIENT,
                fontSize: 38,
                fontWeight: 900,
                color: COLORS.white,
                boxShadow: '0 0 50px rgba(99,102,241,0.5)',
              }}
            >
              デモ実施中
            </div>
            <div style={{fontSize: 38, fontWeight: 700, color: 'rgba(255,255,255,0.9)'}}>ぜひブースでご体験ください</div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.6)',
              ...b4Cta,
            }}
          >
            ADTANK GP
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
