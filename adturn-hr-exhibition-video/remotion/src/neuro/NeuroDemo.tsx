import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {Neuron, makeNeurons, pathD, pointAt} from './dendrites';

// ── スタイルA: ニューロン・マイクロスコピー デモ(600f = 20s) ──
// カメラは脳内から出ない。シアン発光のニューロン網+走る電気信号+ラボHUD。
// 「転写」の瞬間だけ金の信号が走る。

const BG = '#041018';
const CYAN = '#5FE8FF';
const GOLD = '#FFD98C';
const WHITE = '#EAF8FF';
const DIM = 'rgba(234,248,255,0.5)';

const IGNITE_BASE = 20; // 連鎖発火の開始
const GOLD_AT = 118; // 「転写」の金信号
const LOCKUP_AT = 470;

// ── ニューロン網1層(SVG) ──
const NeuronLayer: React.FC<{
  neurons: Neuron[];
  color: string;
  igniteBase: number;
  igniteStep: number;
  strokeW: number;
  glow: boolean;
  pulses?: boolean;
  goldAt?: number;
}> = ({neurons, color, igniteBase, igniteStep, strokeW, glow, pulses, goldAt}) => {
  const frame = useCurrentFrame();
  return (
    <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
      {neurons.map((n, i) => {
        const it = interpolate(frame, [igniteBase + i * igniteStep, igniteBase + i * igniteStep + 26], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        if (it <= 0) return null;
        const flicker = 0.72 + 0.28 * Math.sin(frame / 9 + i * 2.1);
        return (
          <g key={i} opacity={it}>
            {n.branches.map((b, bi) => {
              const d = pathD(b.pts);
              return (
                <g key={bi}>
                  {glow && <path d={d} fill="none" stroke={color} strokeWidth={strokeW * 3.4} strokeLinecap="round" opacity={0.1 * flicker} />}
                  <path d={d} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" opacity={0.55 * flicker} />
                </g>
              );
            })}
            {/* ソーマ(細胞体) */}
            {glow && <circle cx={n.x} cy={n.y} r={n.r * 2.6} fill={color} opacity={0.1 * flicker} />}
            <circle cx={n.x} cy={n.y} r={n.r} fill={color} opacity={0.75 * flicker} />
            <circle cx={n.x} cy={n.y} r={n.r * 0.45} fill="#FFFFFF" opacity={0.8 * flicker} />
            {/* 信号パルス */}
            {pulses &&
              n.branches.slice(0, 2).map((b, bi) => {
                const speed = 0.008 + random(`ps${i}_${bi}`) * 0.006;
                const t = ((frame - igniteBase) * speed + random(`pp${i}_${bi}`)) % 1;
                if (frame < igniteBase + i * igniteStep + 20) return null;
                const [px, py] = pointAt(b.pts, t);
                const isGold = goldAt !== undefined && frame >= goldAt && frame < goldAt + 70 && (i + bi) % 3 === 0;
                const c = isGold ? GOLD : color;
                return (
                  <g key={`p${bi}`}>
                    <circle cx={px} cy={py} r={10} fill={c} opacity={0.28} />
                    <circle cx={px} cy={py} r={4} fill="#FFFFFF" opacity={0.9} />
                  </g>
                );
              })}
          </g>
        );
      })}
    </svg>
  );
};

// ── 顕微鏡のボケ玉 ──
const Bokeh: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = useMemo(
    () =>
      Array.from({length: 16}).map((_, i) => ({
        x: random(`bx${i}`) * 1920,
        y: random(`by${i}`) * 1080,
        r: 24 + random(`br${i}`) * 70,
        vx: (random(`bvx${i}`) - 0.5) * 0.5,
        vy: (random(`bvy${i}`) - 0.5) * 0.4,
        o: 0.05 + random(`bo${i}`) * 0.1,
      })),
    []
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: ((d.x + frame * d.vx) % 2000) - 40,
            top: ((d.y + frame * d.vy) % 1160) - 40,
            width: d.r,
            height: d.r,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(95,232,255,${d.o}) 0%, transparent 70%)`,
            filter: 'blur(3px)',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ── ラボHUD ──
const LabHud: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [6, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const depth = (-120 - frame * 0.11).toFixed(1);
  const density = (8.2 + Math.sin(frame / 30) * 0.4).toFixed(2);
  const mono: React.CSSProperties = {fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.32em', fontVariantNumeric: 'tabular-nums'};
  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none', opacity: boot}}>
      <div style={{position: 'absolute', top: 54, left: 76, ...mono}}>
        SPECIMEN 001 ── LIVE TISSUE ／ <span style={{color: CYAN}}>脳転写プロセス</span>
      </div>
      <div style={{position: 'absolute', top: 54, right: 76, textAlign: 'right', ...mono}}>
        DEPTH {depth} µm
      </div>
      <div style={{position: 'absolute', bottom: 56, left: 76, ...mono}}>
        SYNAPSE DENSITY {density}×10³ ／ mm³
      </div>
      <div style={{position: 'absolute', bottom: 56, right: 76, textAlign: 'right', ...mono}}>
        <span style={{color: frame > GOLD_AT ? GOLD : CYAN, opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 10))}}>●</span>
        {'　'}
        {frame < IGNITE_BASE + 40 ? 'OBSERVING' : frame < GOLD_AT ? 'MAPPING' : 'TRANSCRIBING'}
      </div>
    </AbsoluteFill>
  );
};

export const NeuroDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const back = useMemo(() => makeNeurons('nb', 10), []);
  const mid = useMemo(() => makeNeurons('nm', 13), []);
  const front = useMemo(() => makeNeurons('nf', 4), []);
  const fadeIn = interpolate(frame, [0, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [578, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // 漂うカメラ
  const camX = Math.sin(frame / 210) * 26;
  const camY = Math.cos(frame / 260) * 18;
  const camS = 1.04 + frame * 0.00012 + Math.sin(frame / 300) * 0.01;
  const t1 = interpolate(frame, [40, 68], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t2 = interpolate(frame, [80, 112], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(frame, [210, 240], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t3 = interpolate(frame, [LOCKUP_AT, LOCKUP_AT + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bgmVol = (f: number) => interpolate(f, [0, 36, 560, 596], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: BG, fontFamily: FONT}}>
      <Audio src={staticFile('audio/bgm_vaience.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeIn * fadeOut}}>
        {/* 組織液のむら */}
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 30% 30%, rgba(30,90,130,0.14), transparent 60%), radial-gradient(ellipse 70% 60% at 75% 70%, rgba(20,60,110,0.12), transparent 60%)',
          }}
        />
        {/* 奥の層(強ボケ) */}
        <AbsoluteFill style={{filter: 'blur(6px)', opacity: 0.4, transform: `translate(${camX * 0.5}px, ${camY * 0.5}px) scale(${camS * 0.94})`}}>
          <NeuronLayer neurons={back} color="#3AA8C8" igniteBase={IGNITE_BASE + 14} igniteStep={7} strokeW={1.6} glow={false} />
        </AbsoluteFill>
        {/* 主役の層 */}
        <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px) scale(${camS})`}}>
          <NeuronLayer neurons={mid} color={CYAN} igniteBase={IGNITE_BASE} igniteStep={9} strokeW={2.4} glow pulses goldAt={GOLD_AT} />
        </AbsoluteFill>
        {/* 手前の層(大ボケで横切る) */}
        <AbsoluteFill style={{filter: 'blur(14px)', opacity: 0.5, transform: `translate(${camX * 1.7}px, ${camY * 1.7}px) scale(${camS * 1.3})`}}>
          <NeuronLayer neurons={front} color="#2A88AA" igniteBase={IGNITE_BASE + 30} igniteStep={12} strokeW={4} glow={false} />
        </AbsoluteFill>
        <Bokeh />
        {/* ビネット */}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 105% 85% at 50% 48%, transparent 50%, rgba(1,6,12,0.7) 100%)'}} />
        <LabHud />
        {/* 宣言テキスト */}
        {out1 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: out1}}>
            <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(4,16,24,0.75) 0%, rgba(4,16,24,0.25) 24%, transparent 42%)'}} />
            <div style={{fontSize: 44, fontWeight: 700, color: DIM, letterSpacing: '0.12em', opacity: t1, transform: `translateY(${(1 - t1) * 22}px)`, position: 'relative'}}>
              トップパフォーマーの
            </div>
            <div
              style={{
                fontSize: 92,
                fontWeight: 900,
                color: WHITE,
                marginTop: 14,
                opacity: t2,
                transform: `translateY(${(1 - t2) * 28}px)`,
                textShadow: '0 0 50px rgba(95,232,255,0.4)',
                position: 'relative',
              }}
            >
              脳を、AIに<span style={{color: frame >= GOLD_AT ? GOLD : CYAN, transition: 'none'}}>転写</span>する。
            </div>
          </AbsoluteFill>
        )}
        {/* ロックアップ */}
        {t3 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: t3}}>
            <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(4,16,24,0.75) 0%, transparent 40%)'}} />
            <div style={{fontSize: 66, fontWeight: 900, color: WHITE, textShadow: '0 0 60px rgba(95,232,255,0.5)', position: 'relative', transform: `translateY(${(1 - t3) * 24}px)`}}>
              世界初のAIエンジン──<span style={{color: CYAN}}>デジブレ</span>。
            </div>
            <div style={{fontSize: 22, fontWeight: 700, color: DIM, letterSpacing: '0.32em', marginTop: 20, position: 'relative'}}>
              ADTURN ／ 特許出願中
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
