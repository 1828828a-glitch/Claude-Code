import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {
  CollageSub,
  Confetti,
  Halftone,
  Newspaper,
  PAPER,
  PaperBurst,
  Tape,
  TornPaper,
  usePopSteps,
  useWobble,
} from './paper';

// ── 紙人形（フラットな切り絵ふうの人） ──
const PaperPerson: React.FC<{color?: string; flip?: boolean; seed?: string}> = ({
  color = PAPER.blue,
  flip,
  seed = 'pp',
}) => {
  const w = useWobble(seed, 1.6);
  return (
    <div
      style={{
        position: 'relative',
        width: 150,
        height: 240,
        transform: `scaleX(${flip ? -1 : 1}) rotate(${w.rot}deg)`,
        filter: 'drop-shadow(3px 5px 0 rgba(34,30,24,0.22))',
      }}
    >
      {/* 頭 */}
      <div style={{position: 'absolute', left: 42, top: 0, width: 62, height: 62, borderRadius: '50%', background: PAPER.ink}} />
      {/* 体 */}
      <div
        style={{
          position: 'absolute',
          left: 26,
          top: 66,
          width: 96,
          height: 110,
          background: color,
          clipPath: 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)',
        }}
      />
      {/* 腕（上げてる） */}
      <div
        style={{
          position: 'absolute',
          left: 104,
          top: 40,
          width: 70,
          height: 20,
          background: color,
          transform: 'rotate(-38deg)',
          borderRadius: 10,
        }}
      />
      {/* 脚 */}
      <div style={{position: 'absolute', left: 44, top: 176, width: 22, height: 60, background: PAPER.ink}} />
      <div style={{position: 'absolute', left: 84, top: 176, width: 22, height: 60, background: PAPER.ink}} />
    </div>
  );
};

// ── 紙の脳（切り絵ふう・歯車入り） ──
const PaperBrain: React.FC<{scale?: number}> = ({scale = 1}) => {
  const frame = useCurrentFrame();
  const w = useWobble('brainwob', 0.8);
  const gearRot = Math.floor(frame / 4) * 10;
  const Gear: React.FC<{x: number; y: number; r: number; color: string; dir?: number}> = ({x, y, r, color, dir = 1}) => (
    <g transform={`translate(${x}, ${y}) rotate(${gearRot * dir})`}>
      {Array.from({length: 8}).map((_, i) => (
        <rect key={i} x={-r * 0.14} y={-r - r * 0.22} width={r * 0.28} height={r * 0.3} fill={color} transform={`rotate(${i * 45})`} />
      ))}
      <circle r={r} fill={color} />
      <circle r={r * 0.4} fill={PAPER.white} />
    </g>
  );
  return (
    <div style={{transform: `scale(${scale}) rotate(${w.rot}deg)`, filter: 'drop-shadow(6px 8px 0 rgba(34,30,24,0.25))'}}>
      <svg width={640} height={520} viewBox="0 0 640 520">
        {/* 脳の輪郭（重なり円のこぶ） */}
        <g fill={PAPER.white} stroke={PAPER.ink} strokeWidth={7}>
          <circle cx={200} cy={150} r={95} />
          <circle cx={330} cy={110} r={90} />
          <circle cx={450} cy={160} r={85} />
          <circle cx={500} cy={280} r={80} />
          <circle cx={430} cy={380} r={85} />
          <circle cx={290} cy={410} r={90} />
          <circle cx={160} cy={350} r={85} />
          <circle cx={120} cy={240} r={75} />
          <circle cx={320} cy={260} r={150} />
        </g>
        {/* 輪郭線の再描画（外周だけ残す） */}
        <g fill={PAPER.white}>
          <circle cx={200} cy={150} r={88} />
          <circle cx={330} cy={110} r={83} />
          <circle cx={450} cy={160} r={78} />
          <circle cx={500} cy={280} r={73} />
          <circle cx={430} cy={380} r={78} />
          <circle cx={290} cy={410} r={83} />
          <circle cx={160} cy={350} r={78} />
          <circle cx={120} cy={240} r={68} />
          <circle cx={320} cy={260} r={150} />
        </g>
        {/* 中央の溝 */}
        <path
          d="M320 120 C 300 180, 340 220, 315 280 C 295 330, 330 370, 318 405"
          fill="none"
          stroke={PAPER.ink}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray="2 18"
        />
        {/* 歯車 */}
        <Gear x={230} y={230} r={52} color={PAPER.blue} />
        <Gear x={330} y={320} r={38} color={PAPER.red} dir={-1} />
        <Gear x={420} y={230} r={30} color={PAPER.yellow} />
      </svg>
    </div>
  );
};

// ── シーン1: ついに登場 ──
const CScene1: React.FC = () => {
  const frame = useCurrentFrame();
  const bannerPop = usePopSteps(4);
  const badgePop = usePopSteps(26);
  const sealPop = usePopSteps(40);
  const w1 = useWobble('bn', 0.7);
  const p1 = usePopSteps(34);
  const p2 = usePopSteps(38);
  return (
    <AbsoluteFill style={{background: PAPER.cream, fontFamily: FONT, overflow: 'hidden'}}>
      {/* 背景: 新聞の切れ端＋青い破れ紙＋ハーフトーン */}
      <Newspaper style={{position: 'absolute', left: -40, top: -60, width: 560, height: 500, transform: 'rotate(-7deg)', opacity: 0.85}} />
      <Newspaper seed="np2" style={{position: 'absolute', right: -60, bottom: -80, width: 520, height: 460, transform: 'rotate(6deg)', opacity: 0.85}} cols={2} />
      <TornPaper seed="bluetop" color={PAPER.blue} style={{position: 'absolute', left: -60, top: -180, width: 2100, height: 340, transform: 'rotate(-2deg)'}} />
      <TornPaper seed="bluebot" color={PAPER.blue} style={{position: 'absolute', left: -60, bottom: -220, width: 2100, height: 360, transform: 'rotate(1.5deg)'}} />
      <Halftone style={{position: 'absolute', right: 120, top: 150, width: 300, height: 200, transform: 'rotate(8deg)', opacity: 0.5}} />
      <Halftone color="rgba(255,255,255,0.5)" style={{position: 'absolute', left: 100, bottom: 90, width: 280, height: 170, transform: 'rotate(-6deg)'}} />

      {/* メイン: 破れ紙バナー「ついに登場」 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 150,
          transform: `translateX(-50%) rotate(${-1.5 + w1.rot}deg) scale(${bannerPop.scale})`,
          opacity: bannerPop.opacity,
          width: 1150,
          height: 240,
        }}
      >
        <TornPaper seed="mainbn" roughness={12} style={{width: '100%', height: '100%'}}>
          <div style={{fontSize: 130, fontWeight: 900, color: PAPER.ink, letterSpacing: '0.04em'}}>ついに登場</div>
        </TornPaper>
        <Tape style={{position: 'absolute', left: -40, top: -18}} rot={-32} />
        <Tape style={{position: 'absolute', right: -46, top: -12}} rot={28} />
      </div>

      {/* ADTURN for HR バッジ */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 430,
          transform: `translateX(-50%) rotate(1deg) scale(${badgePop.scale})`,
          opacity: badgePop.opacity,
        }}
      >
        <TornPaper seed="badge" color={PAPER.red} roughness={7} style={{width: 640, height: 130}}>
          <div style={{fontSize: 58, fontWeight: 900, color: PAPER.white, letterSpacing: '0.05em'}}>ADTURN for HR</div>
        </TornPaper>
      </div>

      {/* 赤いギザギザシール（チェック） */}
      <div
        style={{
          position: 'absolute',
          right: 300,
          top: 120,
          transform: `rotate(10deg) scale(${sealPop.scale})`,
          opacity: sealPop.opacity,
          filter: 'drop-shadow(4px 6px 0 rgba(34,30,24,0.25))',
        }}
      >
        <svg width={190} height={190} viewBox="-95 -95 190 190">
          <g fill={PAPER.red}>
            {Array.from({length: 14}).map((_, i) => (
              <polygon key={i} points="0,-92 12,-70 -12,-70" transform={`rotate(${(i / 14) * 360})`} />
            ))}
            <circle r={74} />
          </g>
          <polyline points="-30,2 -8,24 34,-24" fill="none" stroke={PAPER.white} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* 紙人形 */}
      <div style={{position: 'absolute', left: 190, top: 560, transform: `scale(${p1.scale})`, opacity: p1.opacity}}>
        <PaperPerson color={PAPER.ink} seed="pa" />
      </div>
      <div style={{position: 'absolute', right: 210, top: 545, transform: `scale(${p2.scale})`, opacity: p2.opacity}}>
        <PaperPerson color={PAPER.blue} flip seed="pb" />
      </div>

      <Confetti seed="s1cf" count={16} enterBase={14} area={{x: 120, y: 90, w: 1680, h: 760}} />
      <CollageSub enter={20} text={'トップパフォーマーの「脳」で診断する、\n貴社専用の採用戦略レポート。'} />
      {/* 場面転換: 右下から青い紙がめくり上がる */}
      <PageTurnIn from={150} />
    </AbsoluteFill>
  );
};

// 破れ紙による場面転換（画面を覆う）
const PageTurnIn: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [from, from + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (t <= 0) return null;
  return (
    <TornPaper
      seed="turn"
      color={PAPER.blue}
      roughness={16}
      style={{
        position: 'absolute',
        left: -100,
        top: -100,
        width: 2200,
        height: 1350,
        transform: `translateX(${(1 - t) * 2300}px) rotate(${(1 - t) * 6}deg)`,
      }}
    />
  );
};

// ── シーン2: 脳を、まるごと転写。 ──
const CScene2: React.FC = () => {
  const frame = useCurrentFrame();
  const bnPop = usePopSteps(14);
  const brainPop = usePopSteps(6);
  const arrowPop = usePopSteps(34);
  const w = useWobble('s2bn', 0.7);
  return (
    <AbsoluteFill style={{background: PAPER.blue, fontFamily: FONT, overflow: 'hidden'}}>
      {/* 紙のバースト集中線 */}
      <PaperBurst cx={960} cy={560} color="rgba(250,247,238,0.9)" />
      <Halftone color="rgba(255,255,255,0.35)" style={{position: 'absolute', left: 90, top: 90, width: 320, height: 210, transform: 'rotate(-7deg)'}} />
      <Newspaper seed="np3" style={{position: 'absolute', right: -50, top: -60, width: 430, height: 380, transform: 'rotate(9deg)', opacity: 0.8}} cols={2} />

      {/* 紙の脳 */}
      <div style={{position: 'absolute', left: '50%', top: 300, transform: `translateX(-50%) scale(${brainPop.scale})`, opacity: brainPop.opacity}}>
        <PaperBrain />
      </div>

      {/* ジグザグ上昇矢印 */}
      <div style={{position: 'absolute', right: 220, top: 240, transform: `scale(${arrowPop.scale}) rotate(3deg)`, opacity: arrowPop.opacity, filter: 'drop-shadow(4px 6px 0 rgba(34,30,24,0.25))'}}>
        <svg width={300} height={420} viewBox="0 0 300 420">
          <polyline points="30,400 110,300 60,300 190,140 140,140 250,30" fill="none" stroke={PAPER.yellow} strokeWidth={34} strokeLinejoin="miter" />
          <polygon points="250,0 300,80 210,74" fill={PAPER.yellow} />
        </svg>
      </div>

      {/* 見出しバナー */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 90,
          transform: `translateX(-50%) rotate(${-1 + w.rot}deg) scale(${bnPop.scale})`,
          opacity: bnPop.opacity,
          width: 1240,
          height: 200,
        }}
      >
        <TornPaper seed="s2bn" roughness={11} style={{width: '100%', height: '100%'}}>
          <div style={{fontSize: 100, fontWeight: 900, color: PAPER.ink}}>
            脳を、<span style={{color: PAPER.red}}>まるごと転写</span>。
          </div>
        </TornPaper>
        <Tape style={{position: 'absolute', left: 480, top: -24}} rot={-6} />
      </div>

      <Confetti seed="s2cf" count={12} enterBase={20} colors={[PAPER.red, PAPER.yellow, PAPER.white]} area={{x: 100, y: 300, w: 1720, h: 600}} />
      <CollageSub enter={16} text={'デジブレに転写された暗黙知が、\n貴社の「答え」を出力します。'} />
    </AbsoluteFill>
  );
};

export const CollageDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{background: PAPER.cream}}>
      <Sequence from={0} durationInFrames={172} name="C1 ついに登場">
        <CScene1 />
      </Sequence>
      <Sequence from={172} durationInFrames={188} name="C2 脳をまるごと転写">
        <CScene2 />
      </Sequence>
    </AbsoluteFill>
  );
};
