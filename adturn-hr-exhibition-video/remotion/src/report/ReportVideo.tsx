import React from 'react';
import {AbsoluteFill, Audio, Img, Loop, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {REPORT_CONFIG as C, Statement} from './reportConfig';

// ── レポート紹介動画テンプレート(2700f = 90s) ──
// 出力レポートそのものを、レポート対象企業に紹介するための個社向け動画。
// 差し替えは reportConfig.ts と public/report/ の紙面PNGのみ。
// 構成・文法は docs/style-prompts/04_レポート紹介動画.md 参照。

const TOTAL = 2700;
const BG = '#050a12';
const WHITE = '#EAF4FF';
const CYAN = '#5FE8FF';
const RED = '#E5484D';
const DIM = 'rgba(234,244,255,0.5)';

const bgmVolume = (f: number) => {
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return 0.5 * endFade;
};

const LOOP_F = 238;
const Plate: React.FC<{src: string; mirror?: boolean; dark?: number}> = ({src, mirror, dark = 0.18}) => {
  const frame = useCurrentFrame();
  const s = 1.06 + Math.sin(frame / 320) * 0.025;
  return (
    <AbsoluteFill style={{filter: 'saturate(0.7) brightness(0.88)'}}>
      <AbsoluteFill style={{transform: `scale(${mirror ? -s : s}, ${s})`}}>
        <Loop durationInFrames={LOOP_F}>
          <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Loop>
        <AbsoluteFill
          style={{
            background: BG,
            opacity: interpolate(frame % LOOP_F, [0, 7, LOOP_F - 7, LOOP_F], [0.35, 0, 0, 0.35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        />
      </AbsoluteFill>
      {dark > 0 && <AbsoluteFill style={{background: BG, opacity: dark}} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 105% 85% at 50% 48%, transparent 52%, rgba(2,6,10,0.72) 100%)'}} />
    </AbsoluteFill>
  );
};

// 星屑背景(暗転ビート用)
const Void: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: BG}}>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        {Array.from({length: 70}).map((_, i) => (
          <circle
            key={i}
            cx={random(`vx${i}`) * 1920}
            cy={random(`vy${i}`) * 1080}
            r={0.8 + random(`vr${i}`) * 1.4}
            fill="#BFD8F0"
            opacity={0.12 + 0.22 * Math.abs(Math.sin(frame / 26 + i * 1.7))}
          />
        ))}
      </svg>
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(95,232,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(95,232,255,0.03) 1px, transparent 1px)',
          backgroundSize: '110px 110px',
        }}
      />
    </AbsoluteFill>
  );
};

// ── 字幕(下部ボックス+キーワード色/下線) ──
const Sub: React.FC<{st: Statement; at?: number; big?: boolean; center?: boolean}> = ({st, at = 12, big, center}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: center ? 'center' : 'flex-end', alignItems: center ? 'center' : 'flex-start', padding: center ? 0 : '0 0 120px 130px', pointerEvents: 'none'}}>
      <div style={{opacity: p, transform: `translateY(${(1 - p) * 18}px)`}}>
        {st.map((line, li) => (
          <div key={li} style={{marginTop: li ? 10 : 0, display: 'flex', justifyContent: center ? 'center' : 'flex-start'}}>
            <span style={{background: 'rgba(3,8,14,0.78)', padding: '10px 22px', display: 'inline-block'}}>
              {line.map((seg, si) => (
                <span
                  key={si}
                  style={{
                    fontSize: big ? 58 : 42,
                    fontWeight: 800,
                    lineHeight: 1.35,
                    color: seg.c === 'cyan' ? CYAN : seg.c === 'red' ? RED : WHITE,
                    borderBottom: seg.c ? `3px solid ${seg.c === 'cyan' ? CYAN : RED}` : 'none',
                    paddingBottom: seg.c ? 3 : 0,
                  }}
                >
                  {seg.t}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── 紙面フォーカス(実紙面をチルト+ゆっくりズーム) ──
const PageFocus: React.FC<{src: string; zoomFrom?: number; zoomTo?: number; dur: number}> = ({src, zoomFrom = 1.0, zoomTo = 1.12, dur}) => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, dur], [zoomFrom, zoomTo], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rx = Math.sin(frame / 140) * 1.6;
  const ry = Math.cos(frame / 170) * 2.2;
  return (
    <AbsoluteFill>
      <Void />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', perspective: 1600}}>
        <div style={{transform: `rotateX(${4 + rx}deg) rotateY(${-6 + ry}deg) scale(${z})`, boxShadow: '0 60px 140px rgba(0,0,0,0.75)'}}>
          <Img src={staticFile(src)} style={{width: 920, display: 'block'}} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 100% 85% at 50% 46%, transparent 46%, rgba(2,6,10,0.8) 100%)'}} />
    </AbsoluteFill>
  );
};

// ── 紙面の浮遊群 ──
const Scatter: React.FC<{pages: string[]; gather?: boolean; dur: number}> = ({pages, gather, dur}) => {
  const frame = useCurrentFrame();
  const g = gather ? interpolate(frame, [0, Math.min(60, dur * 0.35)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)}) : 0;
  return (
    <AbsoluteFill>
      <Void />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', perspective: 1600}}>
        {pages.map((p, i) => {
          const seedX = (random(`px${i}`) - 0.5) * 1500;
          const seedY = (random(`py${i}`) - 0.5) * 620;
          const rot = (random(`pr${i}`) - 0.5) * 26;
          const fx = (random(`fx${i}`) - 0.5) * 560;
          const fy = (random(`fy${i}`) - 0.5) * 140;
          const frot = (random(`fr${i}`) - 0.5) * 14;
          const x = seedX + (fx - seedX) * g + Math.sin(frame / 90 + i * 2.1) * 10;
          const y = seedY + (fy - seedY) * g + Math.cos(frame / 110 + i * 1.7) * 8;
          const r = rot + (frot - rot) * g;
          const sc = (0.42 + random(`ps${i}`) * 0.2) * (1 + g * 0.25);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                transform: `translate(${x}px, ${y}px) rotate(${r}deg) rotateY(${Math.sin(frame / 130 + i) * 7}deg) scale(${sc})`,
                boxShadow: '0 40px 90px rgba(0,0,0,0.7)',
                zIndex: Math.round(sc * 100),
              }}
            >
              <Img src={staticFile(p)} style={{width: 760, display: 'block'}} />
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 100% 85% at 50% 46%, transparent 42%, rgba(2,6,10,0.82) 100%)'}} />
    </AbsoluteFill>
  );
};

const Fade: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12, dur - 12, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o, fontFamily: FONT}}>{children}</AbsoluteFill>;
};

// ── ヘッダー(左: レポート名 ／ 右: ラベル) ──
const Head: React.FC<{right: string}> = ({right}) => (
  <AbsoluteFill style={{pointerEvents: 'none', fontFamily: FONT}}>
    <div style={{position: 'absolute', top: 52, left: 90, fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.3em'}}>
      {C.company} ／ {C.reportTitle}
    </div>
    <div style={{position: 'absolute', top: 52, right: 90, fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.3em'}}>{right}</div>
  </AbsoluteFill>
);

// ── Before → After(キラー読み替え) ──
const BeforeAfter: React.FC = () => {
  const local = useCurrentFrame();
  const p1 = interpolate(local, [20, 46], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const strike = interpolate(local, [130, 156], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const p2 = interpolate(local, [170, 200], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Void />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{opacity: p1, position: 'relative'}}>
          <div style={{fontSize: 64, fontWeight: 800, color: DIM, letterSpacing: '0.1em'}}>「{C.killerBefore}」から、</div>
          <div style={{position: 'absolute', left: 0, top: '52%', height: 4, background: RED, width: `${strike * 100}%`}} />
        </div>
        <div style={{opacity: p2, transform: `translateY(${(1 - p2) * 24}px)`, marginTop: 46}}>
          <div style={{fontSize: 92, fontWeight: 900, color: CYAN, letterSpacing: '0.06em', textShadow: '0 0 60px rgba(95,232,255,0.4)'}}>
            「{C.killerAfter}」へ。
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── クロージング(紙面集合+タイトル) ──
const Closing: React.FC = () => {
  const local = useCurrentFrame();
  const title = interpolate(local, [70, 100], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const close = interpolate(local, [170, 200], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(local, [278, 298], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: fadeOut}}>
      <Scatter pages={C.pages} gather dur={300} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{opacity: title, transform: `translateY(${(1 - title) * 20}px)`, textAlign: 'center'}}>
          <div style={{background: 'rgba(3,8,14,0.82)', padding: '26px 54px', display: 'inline-block'}}>
            <div style={{fontSize: 44, fontWeight: 900, color: WHITE, letterSpacing: '0.06em'}}>{C.company}</div>
            <div style={{fontSize: 50, fontWeight: 900, color: CYAN, marginTop: 10, borderBottom: `3px solid ${CYAN}`, paddingBottom: 6}}>{C.reportTitle}</div>
          </div>
        </div>
        {close > 0 && (
          <div style={{opacity: close, transform: `translateY(${(1 - close) * 18}px)`, marginTop: 44}}>
            <div style={{background: 'rgba(3,8,14,0.82)', padding: '14px 34px'}}>
              {C.closing.map((line, li) => (
                <span key={li} style={{fontSize: 36, fontWeight: 800}}>
                  {line.map((seg, si) => (
                    <span key={si} style={{color: seg.c === 'cyan' ? CYAN : WHITE}}>{seg.t}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ══ 本体 ══
export const AdturnReportVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{background: BG, fontFamily: FONT}}>
      <Audio src={staticFile('audio/bgm_vaience_full.m4a')} volume={bgmVolume} />
      {/* ①ギャップ宣言 */}
      <Sequence from={0} durationInFrames={210} name="R1 ギャップ宣言">
        <Fade dur={210}>
          <Plate src="video/plate_rep_book.mp4" />
          <Sub st={C.s1} at={24} />
        </Fade>
      </Sequence>
      {/* ②実力の列挙 */}
      <Sequence from={210} durationInFrames={210} name="R2 実力">
        <Fade dur={210}>
          <Plate src="video/plate_rep_open.mp4" />
          <Sub st={C.s2} at={14} />
        </Fade>
      </Sequence>
      {/* ③ギャップの正体 */}
      <Sequence from={420} durationInFrames={210} name="R3 別人">
        <Fade dur={210}>
          <Void />
          <Sub st={C.s3} at={16} big center />
        </Fade>
      </Sequence>
      {/* ④錯誤の特定 */}
      <Sequence from={630} durationInFrames={210} name="R4 錯誤">
        <Fade dur={210}>
          <PageFocus src={C.pages[0]} dur={210} />
          <Sub st={C.s4} at={20} big center />
        </Fade>
      </Sequence>
      {/* ⑤反証 */}
      <Sequence from={840} durationInFrames={210} name="R5 反証">
        <Fade dur={210}>
          <Scatter pages={C.pages.slice(1, 6)} dur={210} />
          <Sub st={C.s5} at={16} />
        </Fade>
      </Sequence>
      {/* ⑥価値の翻訳 */}
      <Sequence from={1050} durationInFrames={150} name="R6a 特定">
        <Fade dur={150}>
          <PageFocus src={C.pages[1]} dur={150} />
          <Sub st={C.s6a} at={12} />
        </Fade>
      </Sequence>
      <Sequence from={1200} durationInFrames={150} name="R6b 届く言葉">
        <Fade dur={150}>
          <PageFocus src={C.pages[2]} dur={150} />
          <Sub st={C.s6b} at={12} />
        </Fade>
      </Sequence>
      <Sequence from={1350} durationInFrames={120} name="R6c 読み替え">
        <Fade dur={120}>
          <Plate src="video/plate_rep_book.mp4" mirror dark={0.3} />
          <Sub st={C.s6c} at={12} big center />
        </Fade>
      </Sequence>
      {/* ⑦キラー読み替え */}
      <Sequence from={1470} durationInFrames={420} name="R7 Before/After">
        <Fade dur={420}>
          <BeforeAfter />
        </Fade>
      </Sequence>
      {/* ⑧空白地帯+実装 */}
      <Sequence from={1890} durationInFrames={210} name="R8a 空白地帯">
        <Fade dur={210}>
          <Plate src="video/plate_rep_model.mp4" dark={0.14} />
          <Sub st={C.s8a} at={16} />
        </Fade>
      </Sequence>
      <Sequence from={2100} durationInFrames={150} name="R8b カウンター">
        <Fade dur={150}>
          <PageFocus src={C.pages[3]} dur={150} />
          <Sub st={C.s8b} at={12} />
        </Fade>
      </Sequence>
      <Sequence from={2250} durationInFrames={150} name="R8c 具体表現">
        <Fade dur={150}>
          <PageFocus src={C.pages[4]} dur={150} />
          <Sub st={C.s8c} at={12} />
        </Fade>
      </Sequence>
      {/* ⑨クロージング */}
      <Sequence from={2400} durationInFrames={300} name="R9 クロージング">
        <Fade dur={300}>
          <Closing />
        </Fade>
      </Sequence>
      <Head right="STRATEGIC REPORT FILM" />
    </AbsoluteFill>
  );
};
