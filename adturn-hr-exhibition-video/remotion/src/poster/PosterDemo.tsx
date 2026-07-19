import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';

// ── エディトリアル・キネティック スタイルデモ(600f = 20s) ──
// スイスポスター×モーショングラフィックス: 明るいベタ塗り色面 / 巨大タイポが主役 /
// ビート同期のハードカット / フラットイラストの「頭がパカーン」 / 3D CG不使用

const BLUE = '#2447E0';
const RED = '#E8442E';
const BLACK = '#141412';
const PAPER = '#F7F5F0';
const PINK = '#FF7BAC';
const YELLOW = '#FFC24B';

// ── ビート同期パルス(120bpm = 15f毎にわずかに脈打つ) ──
const useBeatPulse = (amount = 0.012) => {
  const frame = useCurrentFrame();
  const sinceBeat = frame % 15;
  return 1 + amount * Math.exp(-sinceBeat / 3);
};

// ── 色面ワイプ(次の色面が左から一気に走ってくる) ──
const Wipe: React.FC<{at: number; color: string}> = ({at, color}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (p <= 0 || p >= 1) return null;
  return <AbsoluteFill style={{background: color, transform: `translateX(${(p - 1) * 100}%)`}} />;
};

// ── スプリングで叩き込まれる言葉 ──
const Slam: React.FC<{delay: number; children: React.ReactNode; style?: React.CSSProperties}> = ({delay, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 160}});
  if (frame < delay) return null;
  return <div style={{transform: `scale(${0.6 + s * 0.4})`, opacity: Math.min(s * 2, 1), ...style}}>{children}</div>;
};

// ══ S0+S1(f0-150): ブルー地 → 世界初。 ══
const SecOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [4, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rule = interpolate(frame, [8, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulse = useBeatPulse();
  return (
    <AbsoluteFill style={{background: BLUE, fontFamily: FONT}}>
      {/* 極薄グリッド */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(247,245,240,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(247,245,240,0.08) 1px, transparent 1px)',
          backgroundSize: '160px 160px',
        }}
      />
      <div style={{position: 'absolute', top: 64, left: 80, fontSize: 20, fontWeight: 700, color: PAPER, letterSpacing: '0.42em', opacity: boot}}>
        ADTANK GP ／ EXHIBITION FILM ／ 2026
      </div>
      <div style={{position: 'absolute', top: 64, right: 80, fontSize: 20, fontWeight: 700, color: PAPER, letterSpacing: '0.3em', opacity: boot}}>
        №01
      </div>
      <div style={{position: 'absolute', top: 112, left: 80, right: 80, height: 3, background: PAPER, transform: `scaleX(${rule})`, transformOrigin: 'left'}} />
      {/* 背後の巨大アウトライン反復 */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Slam delay={64}>
          <div
            style={{
              fontSize: 300,
              fontWeight: 900,
              color: 'transparent',
              WebkitTextStroke: `2px rgba(247,245,240,0.28)`,
              letterSpacing: '0.02em',
              position: 'absolute',
              transform: 'translate(-50%, -58%)',
              left: '50%',
              top: '50%',
              whiteSpace: 'nowrap',
            }}
          >
            世界初。
          </div>
        </Slam>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Slam delay={68}>
          <div style={{fontSize: 250, fontWeight: 900, color: PAPER, letterSpacing: '0.02em', transform: `scale(${pulse})`, whiteSpace: 'nowrap'}}>
            世界初<span style={{color: YELLOW}}>。</span>
          </div>
        </Slam>
      </AbsoluteFill>
      <div style={{position: 'absolute', bottom: 70, left: 80, fontSize: 22, fontWeight: 700, color: PAPER, letterSpacing: '0.34em', opacity: interpolate(frame, [92, 112], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        WORLD'S FIRST ── 特許出願中
      </div>
    </AbsoluteFill>
  );
};

// ══ S2(f150-270): 白地 → 宣言タイポ ══
const SecDeclare: React.FC = () => {
  const local = useCurrentFrame();
  const underline = interpolate(local, [46, 62], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: PAPER, fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 64, left: 80, fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: '0.42em', opacity: 0.6}}>
        STATEMENT ── 技術宣言
      </div>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 110, paddingRight: 80}}>
        <Slam delay={8}>
          <div style={{fontSize: 66, fontWeight: 800, color: BLACK, letterSpacing: '0.06em', opacity: 0.75}}>トップパフォーマーの</div>
        </Slam>
        <div style={{height: 30}} />
        <div style={{display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap'}}>
          <Slam delay={20}>
            <span style={{fontSize: 148, fontWeight: 900, color: BLACK, letterSpacing: '0.01em'}}>脳を、AIに</span>
          </Slam>
          <Slam delay={32}>
            <span
              style={{
                fontSize: 148,
                fontWeight: 900,
                color: PAPER,
                background: RED,
                padding: '0 22px',
                marginLeft: 10,
                display: 'inline-block',
                lineHeight: 1.24,
              }}
            >
              転写
            </span>
          </Slam>
          <Slam delay={44}>
            <span style={{fontSize: 148, fontWeight: 900, color: BLACK, letterSpacing: '0.01em', marginLeft: 10}}>する。</span>
          </Slam>
        </div>
        <div style={{height: 34}} />
        <div style={{width: 1180, height: 8, background: BLACK, transform: `scaleX(${underline})`, transformOrigin: 'left'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', bottom: 70, right: 80, fontSize: 22, fontWeight: 700, color: BLACK, letterSpacing: '0.3em', opacity: interpolate(local, [64, 84], [0, 0.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        BRAIN → AI TRANSCRIPTION
      </div>
    </AbsoluteFill>
  );
};

// ══ S3(f270-450): 朱赤地 → フラットイラスト「頭がパカーン」 ══
const HEAD_FACE =
  'M -150 -120 C -158 -92 -158 -66 -170 -44 C -184 -20 -186 -12 -168 -8 C -158 -6 -156 -2 -160 10 C -163 20 -158 26 -148 27 C -152 38 -148 47 -136 49 C -126 51 -124 58 -128 70 C -133 88 -120 100 -98 100 L -76 100 C -58 100 -48 110 -48 128 L -48 150 C -100 162 -146 190 -166 240 L 250 240 C 242 174 210 130 162 112 C 148 60 174 -44 158 -120 Z';
const HEAD_DOME = 'M -150 -120 C -152 -178 -92 -212 -6 -212 C 84 -212 158 -176 158 -120 Z';

const FlatBrain: React.FC<{pop: number}> = ({pop}) => (
  <g transform={`scale(${pop})`} opacity={pop > 0.01 ? 1 : 0}>
    <path
      d="M -120 10 C -128 -34 -96 -66 -56 -64 C -46 -92 -6 -100 22 -84 C 58 -100 102 -84 112 -48 C 138 -36 144 4 124 24 C 128 52 100 72 68 66 C 50 84 10 86 -12 70 C -52 84 -96 68 -104 42 C -116 36 -122 24 -120 10 Z"
      fill={PINK}
    />
    {[
      'M -92 -20 C -76 -38 -52 -40 -38 -26',
      'M -30 -58 C -12 -70 12 -68 24 -52',
      'M 44 -60 C 66 -64 88 -52 92 -32',
      'M -70 24 C -52 8 -24 6 -6 22',
      'M 24 40 C 44 24 72 26 86 42',
      'M -18 -20 C 2 -34 26 -30 38 -12',
    ].map((d, i) => (
      <path key={i} d={d} fill="none" stroke="#E0447E" strokeWidth={7} strokeLinecap="round" />
    ))}
  </g>
);

const SecHead: React.FC = () => {
  const local = useCurrentFrame();
  const {fps} = useVideoConfig();
  // フタがパカーン(後頭部ヒンジで後ろへ)
  const open = interpolate(local, [34, 62], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  const lidRot = open * 74;
  // 脳ポップ+浮上
  const pop = spring({frame: local - 56, fps, config: {damping: 12, stiffness: 120}});
  const riseY = interpolate(local, [56, 96], [0, -170], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  // 矢印+デジブレ
  const arrow = interpolate(local, [100, 132], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const badge = spring({frame: local - 126, fps, config: {damping: 13, stiffness: 110}});
  const caption = interpolate(local, [110, 130], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // スパーク
  const sparks = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const d = interpolate(local, [58, 84], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return {x: Math.cos(a) * 190 * d, y: Math.sin(a) * 150 * d - 120, o: d * (1 - d) * 4};
  });

  return (
    <AbsoluteFill style={{background: RED, fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 64, left: 80, fontSize: 20, fontWeight: 700, color: PAPER, letterSpacing: '0.42em', opacity: 0.85}}>
        HOW IT WORKS ── 脳の転写
      </div>
      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        {/* 頭(横顔シルエット) */}
        <g transform="translate(700, 560) scale(1.35)">
          <path d={HEAD_FACE} fill={BLACK} />
          <g transform={`rotate(${lidRot} 158 -120)`}>
            <path d={HEAD_DOME} fill={BLACK} />
          </g>
          {/* 脳 */}
          <g transform={`translate(0, ${-190 + riseY})`}>
            <FlatBrain pop={Math.min(pop, 1)} />
          </g>
          {/* スパーク */}
          {sparks.map((s, i) => (
            <g key={i} transform={`translate(${s.x}, ${s.y - 190})`} opacity={Math.min(s.o, 1)}>
              <path d="M 0 -16 L 4 -4 L 16 0 L 4 4 L 0 16 L -4 4 L -16 0 L -4 -4 Z" fill={YELLOW} />
            </g>
          ))}
        </g>
        {/* 点線矢印: 脳 → デジブレ */}
        <path
          d="M 780 220 C 980 90 1230 110 1360 300"
          fill="none"
          stroke={PAPER}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray="2 30"
          strokeDashoffset={(1 - arrow) * 900}
          opacity={arrow > 0 ? 1 : 0}
          pathLength={870}
        />
        {arrow >= 1 && <path d="M 1360 300 L 1330 244 L 1394 252 Z" fill={PAPER} transform="rotate(24 1360 300)" />}
        {/* デジブレサークル */}
        <g transform={`translate(1440, 440) scale(${Math.min(badge, 1.04)}) rotate(${(1 - Math.min(badge, 1)) * -14})`} opacity={local >= 126 ? 1 : 0}>
          <circle r="170" fill={BLACK} />
          <circle r="196" fill="none" stroke={PAPER} strokeWidth={5} strokeDasharray="4 26" strokeLinecap="round" />
          <text textAnchor="middle" y="-8" fill={PAPER} fontSize="58" fontWeight="900" fontFamily={FONT} letterSpacing="4">
            デジブレ
          </text>
          <text textAnchor="middle" y="52" fill={YELLOW} fontSize="26" fontWeight="700" fontFamily={FONT} letterSpacing="6">
            AI ENGINE
          </text>
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: 70,
          left: 80,
          fontSize: 42,
          fontWeight: 900,
          color: PAPER,
          letterSpacing: '0.08em',
          opacity: caption,
          transform: `translateY(${(1 - caption) * 18}px)`,
        }}
      >
        暗黙知を、まるごと取り出す。
      </div>
    </AbsoluteFill>
  );
};

// ══ S4(f450-540): 黒地 → バッジ2連 ══
const SecBadges: React.FC = () => {
  const local = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: BLACK, fontFamily: FONT}}>
      {/* 背後の巨大「脳」アウトライン */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{fontSize: 760, fontWeight: 900, color: 'transparent', WebkitTextStroke: '2px rgba(247,245,240,0.1)', lineHeight: 1}}>脳</div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 44}}>
        <Slam delay={6}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 900,
              color: PAPER,
              border: `6px solid ${PAPER}`,
              padding: '26px 70px',
              letterSpacing: '0.06em',
            }}
          >
            オリジナルAIエンジン「デジブレ」
          </div>
        </Slam>
        <Slam delay={22}>
          <div style={{fontSize: 54, fontWeight: 900, color: PAPER, background: RED, padding: '24px 66px', letterSpacing: '0.1em'}}>
            世界初 ｜ 特許出願中
          </div>
        </Slam>
      </AbsoluteFill>
      <div style={{position: 'absolute', bottom: 70, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', opacity: interpolate(local, [36, 56], [0, 0.65], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        <div style={{fontSize: 20, fontWeight: 700, color: PAPER, letterSpacing: '0.34em'}}>ORIGINAL AI ENGINE</div>
        <div style={{fontSize: 20, fontWeight: 700, color: PAPER, letterSpacing: '0.34em'}}>PATENT PENDING</div>
      </div>
    </AbsoluteFill>
  );
};

// ══ S5(f540-600): ブルー地 → ロックアップ ══
const SecLockup: React.FC = () => {
  const local = useCurrentFrame();
  const fadeOut = interpolate(local, [48, 60], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: BLUE, fontFamily: FONT, opacity: fadeOut}}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Slam delay={4}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 26}}>
            <div style={{fontSize: 170, fontWeight: 900, color: PAPER, letterSpacing: '0.06em'}}>ADTURN</div>
            <div style={{width: 34, height: 34, background: RED}} />
          </div>
        </Slam>
        <Slam delay={16}>
          <div style={{fontSize: 30, fontWeight: 800, color: PAPER, letterSpacing: '0.2em', marginTop: 26, opacity: 0.9}}>
            トップパフォーマーの脳を、AIに転写する。
          </div>
        </Slam>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const PosterDemo: React.FC = () => {
  const bgmVol = (f: number) =>
    interpolate(f, [0, 10, 570, 598], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: BLUE}}>
      <Audio src={staticFile('audio/bgm_poster.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <Sequence durationInFrames={150} name="P0 世界初。">
        <SecOpen />
      </Sequence>
      <Sequence from={150} durationInFrames={120} name="P1 宣言">
        <SecDeclare />
      </Sequence>
      <Sequence from={270} durationInFrames={180} name="P2 頭がパカーン(フラット)">
        <SecHead />
      </Sequence>
      <Sequence from={450} durationInFrames={90} name="P3 バッジ">
        <SecBadges />
      </Sequence>
      <Sequence from={540} durationInFrames={60} name="P4 ロックアップ">
        <SecLockup />
      </Sequence>
      {/* 色面ワイプ(カットの勢い付け) */}
      <Wipe at={146} color={RED} />
      <Wipe at={266} color={BLACK} />
      <Wipe at={446} color={PAPER} />
      <Wipe at={536} color={RED} />
    </AbsoluteFill>
  );
};
