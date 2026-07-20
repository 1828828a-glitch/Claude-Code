import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {HEAD_DOME, HEAD_FACE} from '../poster/PosterDemo';

// ── スタイルB: 脳移植オペレーション デモ(600f = 20s) ──
// 動画全体が手術ナビゲーションモニタ。開頭(パカーン)→摘出→転写をUIの工程として見せる。

const BG = '#0A0E12';
const TEAL = '#4AE3B5';
const AMBER = '#FFB648';
const WHITE = '#EAF4F0';
const DIM = 'rgba(234,244,240,0.5)';
const PANEL = 'rgba(74,227,181,0.06)';
const LINE = 'rgba(74,227,181,0.35)';

const INCISION_AT = 200; // 開頭
const EXTRACT_AT = 260; // 摘出
const TRANSCRIBE_AT = 330; // 転写(データストリーム)
const VERIFY_AT = 470; // ロックアップ

const BRAIN_BLOB =
  'M -120 10 C -128 -34 -96 -66 -56 -64 C -46 -92 -6 -100 22 -84 C 58 -100 102 -84 112 -48 C 138 -36 144 4 124 24 C 128 52 100 72 68 66 C 50 84 10 86 -12 70 C -52 84 -96 68 -104 42 C -116 36 -122 24 -120 10 Z';
const BRAIN_CURLS = [
  'M -92 -20 C -76 -38 -52 -40 -38 -26',
  'M -30 -58 C -12 -70 12 -68 24 -52',
  'M 44 -60 C 66 -64 88 -52 92 -32',
  'M -70 24 C -52 8 -24 6 -6 22',
  'M 24 40 C 44 24 72 26 86 42',
];

// ── 心電図 ──
const Ecg: React.FC<{x: number; y: number; w: number}> = ({x, y, w}) => {
  const frame = useCurrentFrame();
  // 1拍=24f(75bpm)の波形をスクロール描画
  const pts: string[] = [];
  for (let i = 0; i < w; i += 4) {
    const t = ((i + frame * 5) % 168) / 168;
    let v = 0;
    if (t > 0.42 && t < 0.46) v = -10;
    else if (t >= 0.46 && t < 0.5) v = 46;
    else if (t >= 0.5 && t < 0.54) v = -18;
    else if (t > 0.62 && t < 0.72) v = 9 * Math.sin(((t - 0.62) / 0.1) * Math.PI);
    else v = Math.sin(t * Math.PI * 2) * 2;
    pts.push(`${x + i} ${y - v}`);
  }
  return (
    <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
      <polyline points={pts.join(' ')} fill="none" stroke={TEAL} strokeWidth={2} opacity={0.9} />
    </svg>
  );
};

const STEPS = ['SCAN ── 走査', 'INCISION ── 開頭', 'EXTRACT ── 摘出', 'TRANSCRIBE ── 転写', 'VERIFY ── 検証'];
const stepAt = [0, INCISION_AT, EXTRACT_AT, TRANSCRIBE_AT, VERIFY_AT];

export const OpeDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [4, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [578, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pct = Math.floor(interpolate(frame, [30, 560], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const scanY = 180 + ((frame * 3.2) % 620);
  const open = interpolate(frame, [INCISION_AT, INCISION_AT + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  const lift = interpolate(frame, [EXTRACT_AT, EXTRACT_AT + 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  const stream = interpolate(frame, [TRANSCRIBE_AT, TRANSCRIBE_AT + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t1 = interpolate(frame, [46, 76], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(frame, [172, 198], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t3 = interpolate(frame, [VERIFY_AT, VERIFY_AT + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hr = 72 + Math.round(Math.sin(frame / 40) * 2) + (frame > INCISION_AT && frame < EXTRACT_AT + 30 ? 6 : 0);
  const mono: React.CSSProperties = {fontVariantNumeric: 'tabular-nums', letterSpacing: '0.18em'};
  const bgmVol = (f: number) => interpolate(f, [0, 20, 565, 596], [0, 0.9, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: BG, fontFamily: FONT}}>
      <Audio src={staticFile('audio/bgm_ope.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeOut}}>
        {/* 極薄グリッド */}
        <AbsoluteFill
          style={{
            backgroundImage:
              'linear-gradient(rgba(74,227,181,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(74,227,181,0.05) 1px, transparent 1px)',
            backgroundSize: '90px 90px',
            opacity: boot,
          }}
        />
        {/* ヘッダー */}
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 74, borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px', opacity: boot}}>
          <div style={{fontSize: 19, fontWeight: 700, color: WHITE, ...mono}}>
            OPERATION ── <span style={{color: TEAL}}>BRAIN TRANSPLANT</span> ／ 脳移植 第47例
          </div>
          <div style={{fontSize: 17, fontWeight: 700, color: DIM, ...mono}}>
            ELAPSED {String(Math.floor(frame / 30 / 60)).padStart(2, '0')}:{String(Math.floor(frame / 30) % 60).padStart(2, '0')}.{String(frame % 30).padStart(2, '0')}
          </div>
        </div>

        {/* 左パネル: バイタル */}
        <div style={{position: 'absolute', left: 60, top: 120, width: 330, bottom: 170, border: `1px solid ${LINE}`, background: PANEL, opacity: boot, padding: 26}}>
          <div style={{fontSize: 14, fontWeight: 700, color: DIM, letterSpacing: '0.34em'}}>VITALS ── ドナー</div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 26}}>
            <span style={{fontSize: 62, fontWeight: 900, color: TEAL, ...mono}}>{hr}</span>
            <span style={{fontSize: 17, fontWeight: 700, color: DIM}}>HR bpm</span>
          </div>
          <Ecg x={92} y={330} w={270} />
          <div style={{position: 'absolute', top: 300, left: 26, fontSize: 14, color: DIM, letterSpacing: '0.3em'}}>ECG Ⅱ</div>
          <div style={{position: 'absolute', top: 420, left: 26, right: 26}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 17, color: WHITE, fontWeight: 700, ...mono}}>
              <span style={{color: DIM}}>SpO₂</span>
              <span>99%</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 17, color: WHITE, fontWeight: 700, marginTop: 14, ...mono}}>
              <span style={{color: DIM}}>SYNAPSE LINK</span>
              <span style={{color: frame > TRANSCRIBE_AT ? TEAL : AMBER}}>{frame > TRANSCRIBE_AT ? 'STABLE' : 'STANDBY'}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 17, color: WHITE, fontWeight: 700, marginTop: 14, ...mono}}>
              <span style={{color: DIM}}>暗黙知抽出率</span>
              <span>{Math.min(99, Math.max(0, Math.floor((frame - EXTRACT_AT) / 3)))}%</span>
            </div>
          </div>
        </div>

        {/* 右パネル: 工程 */}
        <div style={{position: 'absolute', right: 60, top: 120, width: 330, bottom: 170, border: `1px solid ${LINE}`, background: PANEL, opacity: boot, padding: 26}}>
          <div style={{fontSize: 14, fontWeight: 700, color: DIM, letterSpacing: '0.34em'}}>PROCEDURE ── 工程</div>
          {STEPS.map((s, i) => {
            const done = frame >= (stepAt[i + 1] ?? 9999);
            const active = frame >= stepAt[i] && !done;
            return (
              <div key={s} style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 30, opacity: frame >= stepAt[i] - 20 ? 1 : 0.3}}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: `2px solid ${done ? TEAL : active ? AMBER : 'rgba(234,244,240,0.3)'}`,
                    background: done ? TEAL : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 900,
                    color: BG,
                    opacity: active ? 0.5 + 0.5 * Math.abs(Math.sin(frame / 9)) : 1,
                  }}
                >
                  {done ? '✓' : ''}
                </div>
                <div style={{fontSize: 18, fontWeight: 700, color: done ? WHITE : active ? AMBER : DIM, letterSpacing: '0.08em'}}>{s}</div>
              </div>
            );
          })}
          <div style={{position: 'absolute', bottom: 26, left: 26, right: 26, fontSize: 14, color: DIM, letterSpacing: '0.2em', lineHeight: 1.9}}>
            DONOR: TOP PERFORMER
            <br />
            RECIPIENT: <span style={{color: TEAL}}>デジブレ ENGINE</span>
          </div>
        </div>

        {/* 中央: 頭部断面スキャン */}
        <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: boot}}>
          <g transform="translate(960, 560) scale(1.12)">
            {/* 輪郭+等高線 */}
            {[1, 0.93, 0.86].map((s, i) => (
              <path key={i} d={HEAD_FACE} fill={i === 0 ? 'rgba(74,227,181,0.05)' : 'none'} stroke={TEAL} strokeWidth={i === 0 ? 2.4 : 0.8} opacity={i === 0 ? 0.9 : 0.35} transform={`scale(${s})`} />
            ))}
            {/* フタ(開頭) */}
            <g transform={`rotate(${open * 62} 158 -120)`}>
              {[1, 0.93].map((s, i) => (
                <path key={i} d={HEAD_DOME} fill={i === 0 ? 'rgba(74,227,181,0.05)' : 'none'} stroke={open > 0.02 ? AMBER : TEAL} strokeWidth={i === 0 ? 2.4 : 0.8} opacity={i === 0 ? 0.9 : 0.35} transform={`scale(${s})`} />
              ))}
            </g>
            {/* 脳(摘出リフト) */}
            <g transform={`translate(0, ${-165 - lift * 155})`}>
              <path d={BRAIN_BLOB} fill="rgba(74,227,181,0.1)" stroke={TEAL} strokeWidth={2.6} opacity={0.95} transform="scale(0.86)" />
              {BRAIN_CURLS.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={TEAL} strokeWidth={2} opacity={0.7} transform="scale(0.86)" strokeLinecap="round" />
              ))}
              {/* 転写データストリーム: 脳→右パネルへ */}
              {stream > 0 &&
                Array.from({length: 14}).map((_, i) => {
                  const p = ((frame * 0.02 + i / 14) % 1);
                  const sx = 120 + p * 520;
                  const sy = Math.sin(p * Math.PI * 2 + i) * 26 - p * 40;
                  return <circle key={i} cx={sx} cy={sy} r={3.4} fill={TEAL} opacity={(1 - p) * 0.9 * stream} />;
                })}
            </g>
            {/* 十字レティクル */}
            <line x1={-300} y1={0} x2={-240} y2={0} stroke={LINE} strokeWidth={1.4} />
            <line x1={240} y1={0} x2={300} y2={0} stroke={LINE} strokeWidth={1.4} />
          </g>
          {/* スキャンライン */}
          <line x1={470} y1={scanY} x2={1450} y2={scanY} stroke={TEAL} strokeWidth={1.4} opacity={0.35} />
        </svg>

        {/* 下部: 進行ゲージ */}
        <div style={{position: 'absolute', left: 60, right: 60, bottom: 74, opacity: boot}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: DIM, marginBottom: 12, ...mono}}>
            <span>
              TRANSPLANT ── <span style={{color: WHITE}}>{STEPS[Math.max(0, stepAt.findIndex((a, i) => frame < (stepAt[i + 1] ?? 9999)))]?.split(' ── ')[1] ?? '走査'}</span>
            </span>
            <span style={{color: TEAL}}>{String(pct).padStart(3, '0')}%</span>
          </div>
          <div style={{height: 6, background: 'rgba(74,227,181,0.14)'}}>
            <div style={{height: '100%', width: `${pct}%`, background: TEAL, boxShadow: '0 0 18px rgba(74,227,181,0.7)'}} />
          </div>
        </div>

        {/* 宣言テキスト */}
        {out1 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 150, opacity: out1}}>
            <div style={{fontSize: 38, fontWeight: 700, color: DIM, letterSpacing: '0.12em', opacity: t1}}>トップパフォーマーの</div>
            <div style={{fontSize: 76, fontWeight: 900, color: WHITE, marginTop: 10, opacity: t1, textShadow: '0 0 40px rgba(74,227,181,0.35)'}}>
              脳を、AIに<span style={{color: TEAL}}>転写</span>する。
            </div>
          </AbsoluteFill>
        )}
        {/* VERIFY ロックアップ */}
        {t3 > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 150, opacity: t3}}>
            <div style={{fontSize: 62, fontWeight: 900, color: WHITE, textShadow: '0 0 50px rgba(74,227,181,0.4)'}}>
              世界初のAIエンジン──<span style={{color: TEAL}}>デジブレ</span>。
            </div>
            <div style={{display: 'flex', gap: 20, marginTop: 22, alignItems: 'center'}}>
              <div style={{fontSize: 20, fontWeight: 900, color: BG, background: TEAL, padding: '8px 22px', letterSpacing: '0.2em'}}>GRAFT COMPLETE</div>
              <div style={{fontSize: 20, fontWeight: 700, color: DIM, letterSpacing: '0.3em'}}>特許出願中 ／ ADTURN</div>
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
