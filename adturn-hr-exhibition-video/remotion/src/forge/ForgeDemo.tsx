import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

// ── 工房(鍛冶)版 スタイルデモ(600f = 20s) ──
// サービス紹介へのパターンB適用: プロダクトの本質(技を写し取り、貴社専用の武器を打つ)を
// 鍛冶工房のメタファー世界で描く。具体は文字とナレーションのみ。
// 色の記号: オレンジ=実力・出力(熱) ／ 青白=一般論・言葉(冷)

const BG = '#070502';
const EMBER = '#FF9A3C';
const COLD = '#7FB8FF';
const WHITE = '#F5EDE2';
const DIM = 'rgba(245,237,226,0.55)';

// ── ショット(ループさせない。1シーン=複数ショットのカット割りで繰り返しを排除) ──
const Shot: React.FC<{src: string; mirror?: boolean; dark?: number; from?: number}> = ({src, mirror, dark = 0.12, from = 0}) => {
  const frame = useCurrentFrame();
  const s = 1.06 + frame * 0.0004;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${mirror ? -s : s}, ${s})`}}>
        <OffthreadVideo src={staticFile(src)} muted startFrom={from} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      {dark > 0 && <AbsoluteFill style={{background: BG, opacity: dark}} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 105% 85% at 50% 48%, transparent 50%, rgba(4,2,0,0.78) 100%)'}} />
    </AbsoluteFill>
  );
};

// カット列: [開始フレーム, ショット]。次のカットまで再生し、ハードカットで切り替わる
const Cuts: React.FC<{list: Array<[number, React.ReactNode]>}> = ({list}) => {
  const frame = useCurrentFrame();
  const idx = list.findIndex(([at], i) => frame >= at && frame < (list[i + 1]?.[0] ?? Infinity));
  if (idx < 0) return null;
  return (
    <Sequence from={list[idx][0]} layout="none">
      <AbsoluteFill>{list[idx][1]}</AbsoluteFill>
    </Sequence>
  );
};

// 火の粉
const Embers: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 26}).map((_, i) => {
        const life = 140 + random(`el${i}`) * 120;
        const t = ((frame + random(`et${i}`) * 400) % life) / life;
        const x = random(`ex${i}`) * 1920 + Math.sin(frame / 40 + i) * 40 * t;
        const y = 1080 - t * (500 + random(`ey${i}`) * 500);
        const o = Math.sin(t * Math.PI) * (0.25 + random(`eo${i}`) * 0.4);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 3 + random(`es${i}`) * 3,
              height: 3 + random(`es${i}`) * 3,
              borderRadius: '50%',
              background: EMBER,
              boxShadow: `0 0 8px ${EMBER}`,
              opacity: o,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Label: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [6, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mono: React.CSSProperties = {fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.34em'};
  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none', opacity: boot}}>
      <div style={{position: 'absolute', top: 56, left: 90, ...mono}}>
        AI ENGINE <span style={{color: EMBER}}>DIGIBRE</span> ／ THE FORGE
      </div>
      <div style={{position: 'absolute', top: 56, right: 90, textAlign: 'right', ...mono}}>GENESIS — 転写の炉</div>
    </AbsoluteFill>
  );
};

export const ForgeDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [578, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t1 = interpolate(frame, [40, 68], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t2 = interpolate(frame, [80, 112], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(frame, [330, 360], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scene2 = interpolate(frame, [380, 408], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t3 = interpolate(frame, [440, 470], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bgmVol = (f: number) => interpolate(f, [0, 30, 560, 596], [0, 0.8, 0.8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: BG, fontFamily: FONT}}>
      <Audio src={staticFile('audio/bgm_natgeo.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeIn * fadeOut}}>
        {/* カット割り: 鋳込み→溶鋼の流れ→ハンマー打撃→炉(各8秒素材を使い切り、ループなし) */}
        {scene2 < 1 && (
          <AbsoluteFill style={{opacity: 1 - scene2}}>
            <Cuts
              list={[
                [0, <Shot key="a" src="video/plate_forge_ignite.mp4" />],
                [170, <Shot key="b" src="video/plate_forge_flow.mp4" />],
                [300, <Shot key="c" src="video/plate_forge_hammer.mp4" />],
              ]}
            />
          </AbsoluteFill>
        )}
        {/* 中央の炉=デジブレ */}
        {scene2 > 0 && (
          <AbsoluteFill style={{opacity: scene2}}>
            <Sequence from={380} layout="none">
              <Shot src="video/plate_forge_furnace.mp4" />
            </Sequence>
          </AbsoluteFill>
        )}
        <Embers />
        <Label />
        {/* 宣言(具体は文字とナレーションが担う) */}
        {out1 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: out1}}>
            <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(4,2,0,0.82) 0%, rgba(4,2,0,0.3) 26%, transparent 46%)'}} />
            <div style={{fontSize: 44, fontWeight: 700, color: DIM, letterSpacing: '0.12em', opacity: t1, position: 'relative'}}>トップパフォーマーの</div>
            <div
              style={{
                fontSize: 92,
                fontWeight: 900,
                color: WHITE,
                marginTop: 14,
                opacity: t2,
                position: 'relative',
                textShadow: '0 0 50px rgba(255,154,60,0.4)',
              }}
            >
              脳を、AIに<span style={{color: EMBER, borderBottom: `4px solid ${EMBER}`, paddingBottom: 2}}>転写</span>する。
            </div>
          </AbsoluteFill>
        )}
        {/* ロックアップ */}
        {t3 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: t3}}>
            <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(4,2,0,0.82) 0%, transparent 42%)'}} />
            <div style={{fontSize: 66, fontWeight: 900, color: WHITE, position: 'relative', textShadow: '0 0 60px rgba(255,154,60,0.45)'}}>
              世界初のAIエンジン──<span style={{color: EMBER}}>デジブレ</span>。
            </div>
            <div style={{fontSize: 22, fontWeight: 700, color: DIM, letterSpacing: '0.32em', marginTop: 20, position: 'relative'}}>
              この炉から、貴社専用の<span style={{color: COLD}}>武器</span>が生まれる ／ 特許出願中
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
