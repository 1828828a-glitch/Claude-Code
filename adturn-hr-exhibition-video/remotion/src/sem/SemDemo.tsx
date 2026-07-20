import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {SANS, SERIF} from '../natgeo/NatGeoDemo';
import {makeNeurons, pathD, pointAt} from '../neuro/dendrites';

// ── スタイルC: 電子顕微鏡×論文図版 デモ(600f = 20s) ──
// モノクロSEM質感のニューロン標本+学術誌の図版レイアウト。
// シアンは「転写」の瞬間とデジブレのみに許された1色。

const BG = '#0B0B0C';
const WHITE = '#E9E9E6';
const GRAY = 'rgba(233,233,230,0.55)';
const FAINT = 'rgba(233,233,230,0.28)';
const CYAN = '#5FE8FF';

const STAIN_AT = 250; // 染色(転写)の瞬間
const LOCKUP_AT = 470;

export const SemDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const neurons = useMemo(() => makeNeurons('sem', 12, 1560, 780), []);
  const boot = interpolate(frame, [6, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [578, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const zoom = 1 + frame * 0.00018;
  const gx = Math.floor(random(`gx${frame}`) * 240);
  const gy = Math.floor(random(`gy${frame}`) * 240);
  const t1 = interpolate(frame, [56, 88], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(frame, [208, 238], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const stain = interpolate(frame, [STAIN_AT, STAIN_AT + 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t3 = interpolate(frame, [LOCKUP_AT, LOCKUP_AT + 32], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bgmVol = (f: number) => interpolate(f, [0, 40, 560, 596], [0, 0.4, 0.4, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 染色されるパス(1本の軸索だけ)
  const stainNeuron = neurons[4];

  return (
    <AbsoluteFill style={{background: BG, fontFamily: SANS}}>
      <Audio src={staticFile('audio/bgm_keynote.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeOut}}>
        {/* 誌面ヘッダー */}
        <div style={{position: 'absolute', top: 46, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', opacity: boot}}>
          <div style={{fontSize: 15, fontWeight: 500, color: GRAY, letterSpacing: '0.4em'}}>
            DIGIBRE ── TRANSCRIPTIONS OF EXPERT COGNITION ／ 認知転写研究
          </div>
          <div style={{fontSize: 15, fontWeight: 500, color: GRAY, letterSpacing: '0.3em'}}>VOL.01 ── 2026</div>
        </div>
        <div style={{position: 'absolute', top: 82, left: 90, right: 90, height: 1, background: FAINT, opacity: boot}} />

        {/* 図版フレーム */}
        <div style={{position: 'absolute', left: 180, top: 140, width: 1560, height: 700, border: `1px solid ${FAINT}`, opacity: boot, overflow: 'hidden'}}>
          {/* SEM標本(モノクロニューロン) */}
          <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom})`}}>
            <svg viewBox="0 0 1560 780" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
              {neurons.map((n, i) => {
                const it = interpolate(frame, [24 + i * 9, 52 + i * 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
                if (it <= 0) return null;
                const bright = 0.5 + 0.18 * Math.sin(frame / 26 + i * 1.7);
                return (
                  <g key={i} opacity={it}>
                    {n.branches.map((b, bi) => (
                      <path key={bi} d={pathD(b.pts)} fill="none" stroke={WHITE} strokeWidth={i % 3 === 0 ? 2.6 : 1.6} strokeLinecap="round" opacity={0.5 * bright} />
                    ))}
                    <circle cx={n.x} cy={n.y} r={n.r * 1.25} fill={WHITE} opacity={0.16 * bright} />
                    <circle cx={n.x} cy={n.y} r={n.r * 0.8} fill={WHITE} opacity={0.85 * bright} />
                  </g>
                );
              })}
              {/* 染色: 1本の軸索にだけシアンが走る */}
              {stain > 0 && stainNeuron && (
                <g>
                  <path d={pathD(stainNeuron.branches[0].pts)} fill="none" stroke={CYAN} strokeWidth={3.4} strokeLinecap="round" opacity={0.9 * stain} style={{filter: 'drop-shadow(0 0 8px rgba(95,232,255,0.9))'}} />
                  {(() => {
                    const [px, py] = pointAt(stainNeuron.branches[0].pts, Math.min(1, (frame - STAIN_AT) / 55));
                    return <circle cx={px} cy={py} r={7} fill={CYAN} opacity={stain} />;
                  })()}
                  <circle cx={stainNeuron.x} cy={stainNeuron.y} r={stainNeuron.r * 1.1} fill={CYAN} opacity={0.5 * stain} />
                </g>
              )}
            </svg>
          </div>
          {/* パネルラベル */}
          <div style={{position: 'absolute', top: 18, left: 22, fontFamily: SERIF, fontSize: 26, fontWeight: 900, color: WHITE, opacity: boot}}>a</div>
          {/* スケールバー */}
          <div style={{position: 'absolute', bottom: 22, right: 26, display: 'flex', alignItems: 'center', gap: 12, opacity: boot}}>
            <div style={{width: 110, height: 3, background: WHITE}} />
            <div style={{fontSize: 15, fontWeight: 500, color: WHITE, letterSpacing: '0.14em'}}>10 µm</div>
          </div>
          {/* 走査線(SEMのゆっくりした走査) */}
          <div style={{position: 'absolute', left: 0, right: 0, top: (frame * 1.7) % 700, height: 1.5, background: 'rgba(233,233,230,0.13)'}} />
        </div>

        {/* キャプション */}
        <div style={{position: 'absolute', left: 180, top: 856, width: 1560, opacity: boot}}>
          <span style={{fontFamily: SERIF, fontSize: 23, fontWeight: 900, color: WHITE}}>Fig. 1{'　'}</span>
          <span style={{fontSize: 19, fontWeight: 500, color: GRAY, letterSpacing: '0.06em'}}>
            トップパフォーマー脳・生体標本の樹状突起網(走査型電子顕微鏡、疑似カラーなし)。
            {frame >= STAIN_AT && <span style={{color: CYAN}}>{'　'}シアン: 転写経路のトレーサ染色。</span>}
          </span>
        </div>

        {/* 誌面フッター */}
        <div style={{position: 'absolute', bottom: 40, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', opacity: boot}}>
          <div style={{fontSize: 13, fontWeight: 500, color: FAINT, letterSpacing: '0.3em'}}>doi:10.XXXX/digibre.2026(仮) ── 特許出願中</div>
          <div style={{fontSize: 13, fontWeight: 500, color: FAINT, letterSpacing: '0.3em'}}>ADTANK GP ── p.01</div>
        </div>

        {/* 宣言テキスト(明朝・余白に静かに) */}
        {out1 > 0 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: out1 * t1}}>
            <div style={{background: 'rgba(11,11,12,0.72)', padding: '44px 74px', border: `1px solid ${FAINT}`, textAlign: 'center', backdropFilter: 'blur(2px)'}}>
              <div style={{fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: GRAY, letterSpacing: '0.3em'}}>トップパフォーマーの</div>
              <div style={{fontFamily: SERIF, fontSize: 66, fontWeight: 900, color: WHITE, letterSpacing: '0.12em', marginTop: 20}}>
                脳を、AIに<span style={{color: frame >= STAIN_AT ? CYAN : WHITE}}>転写</span>する。
              </div>
            </div>
          </AbsoluteFill>
        )}
        {/* 結論ロックアップ */}
        {t3 > 0 && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: t3}}>
            <div style={{background: 'rgba(11,11,12,0.82)', padding: '50px 84px', border: `1px solid ${FAINT}`, textAlign: 'center'}}>
              <div style={{fontFamily: SERIF, fontSize: 54, fontWeight: 900, color: WHITE, letterSpacing: '0.1em'}}>
                世界初のAIエンジン──<span style={{color: CYAN}}>デジブレ</span>。
              </div>
              <div style={{fontSize: 17, fontWeight: 500, color: GRAY, letterSpacing: '0.4em', marginTop: 24}}>
                ORIGINAL AI ENGINE ／ 特許出願中 ／ ADTURN
              </div>
            </div>
          </AbsoluteFill>
        )}

        {/* 強めのフィルムグレイン+ビネット */}
        <AbsoluteFill
          style={{
            backgroundImage: `url(${staticFile('img/grain_tile.png')})`,
            backgroundPosition: `${gx}px ${gy}px`,
            mixBlendMode: 'overlay',
            opacity: 0.55,
            pointerEvents: 'none',
          }}
        />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 108% 90% at 50% 48%, transparent 55%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none'}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
