import React from 'react';
import {AbsoluteFill, Audio, Loop, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

// ── スタイルA(実写級プレート版) 合成デモ(600f = 20s) ──
// Runway生成のフォトリアルなニューロン映像を背景プレートに敷き、
// タイポ・ラボHUD・ナレーション・BGMをRemotionで合成する。参考動画と同じ作り方。

const CYAN = '#5FE8FF';
const GOLD = '#FFD98C';
const WHITE = '#EAF8FF';
const DIM = 'rgba(234,248,255,0.55)';

const GOLD_AT = 118;
const LOCKUP_AT = 470;

// プレート(既定: veo素材)。ループ+ゆっくりしたスケールで継ぎ目を目立たせない
const Plate: React.FC<{src: string; loopFrames: number}> = ({src, loopFrames}) => {
  const frame = useCurrentFrame();
  const s = 1.06 + Math.sin(frame / 340) * 0.03;
  return (
    <AbsoluteFill style={{transform: `scale(${s})`}}>
      <Loop durationInFrames={loopFrames}>
        <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </Loop>
      {/* ループの継ぎ目を沈める微小な明滅 */}
      <AbsoluteFill
        style={{
          background: '#020a12',
          opacity: interpolate(frame % loopFrames, [0, 7, loopFrames - 7, loopFrames], [0.35, 0, 0, 0.35], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      />
    </AbsoluteFill>
  );
};

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
      <div style={{position: 'absolute', top: 54, right: 76, textAlign: 'right', ...mono}}>DEPTH {depth} µm</div>
      <div style={{position: 'absolute', bottom: 56, left: 76, ...mono}}>SYNAPSE DENSITY {density}×10³ ／ mm³</div>
      <div style={{position: 'absolute', bottom: 56, right: 76, textAlign: 'right', ...mono}}>
        <span style={{color: frame > GOLD_AT ? GOLD : CYAN, opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 10))}}>●</span>
        {'　'}
        {frame < 60 ? 'OBSERVING' : frame < GOLD_AT ? 'MAPPING' : 'TRANSCRIBING'}
      </div>
    </AbsoluteFill>
  );
};

export const NeuroPlateDemo: React.FC<{plate?: string; loopFrames?: number}> = ({plate = 'video/neuron_veo1.mp4', loopFrames = 238}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [578, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t1 = interpolate(frame, [40, 68], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t2 = interpolate(frame, [80, 112], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(frame, [210, 240], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t3 = interpolate(frame, [LOCKUP_AT, LOCKUP_AT + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bgmVol = (f: number) => interpolate(f, [0, 36, 560, 596], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#020a12', fontFamily: FONT}}>
      <Audio src={staticFile('audio/bgm_vaience.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeIn * fadeOut}}>
        <Plate src={plate} loopFrames={loopFrames} />
        {/* トーン統一のカラーグレード */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(2,10,18,0.25), rgba(2,10,18,0.05) 40%, rgba(2,10,18,0.3))', mixBlendMode: 'multiply'}} />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 105% 85% at 50% 48%, transparent 52%, rgba(1,6,12,0.75) 100%)'}} />
        <LabHud />
        {out1 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: out1}}>
            <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(2,10,18,0.8) 0%, rgba(2,10,18,0.3) 24%, transparent 42%)'}} />
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
                textShadow: '0 0 50px rgba(95,232,255,0.45)',
                position: 'relative',
              }}
            >
              脳を、AIに<span style={{color: frame >= GOLD_AT ? GOLD : CYAN}}>転写</span>する。
            </div>
          </AbsoluteFill>
        )}
        {t3 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: t3}}>
            <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(2,10,18,0.8) 0%, transparent 40%)'}} />
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
