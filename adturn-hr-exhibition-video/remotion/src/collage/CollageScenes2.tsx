import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {
  CollageSub,
  Confetti,
  Halftone,
  Newspaper,
  PAPER,
  SpeechBubble,
  Tape,
  TornPaper,
  usePopSteps,
  useWobble,
} from './paper';

// ── CS3 問いの宣言（190f） ──
export const CS3Intro: React.FC = () => {
  const slam = usePopSteps(8);
  const line2 = usePopSteps(66);
  const w = useWobble('cs3', 0.8);
  const qPop = usePopSteps(50);
  return (
    <AbsoluteFill style={{background: PAPER.cream, fontFamily: FONT, overflow: 'hidden'}}>
      <Newspaper seed="cs3np" style={{position: 'absolute', left: -60, top: -80, width: 500, height: 430, transform: 'rotate(-7deg)', opacity: 0.8}} cols={2} />
      <Halftone style={{position: 'absolute', right: 110, bottom: 120, width: 320, height: 200, transform: 'rotate(6deg)', opacity: 0.55}} />
      {/* 大きな紙の「?」 */}
      <div style={{position: 'absolute', right: 240, top: 130, fontSize: 380, fontWeight: 900, color: PAPER.blue, opacity: 0.28, transform: `rotate(${8 + qPop.scale * 0}deg) scale(${qPop.scale})`, filter: 'drop-shadow(5px 7px 0 rgba(34,30,24,0.2))'}}>
        ?
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 300,
          transform: `translateX(-50%) rotate(${-1.5 + w.rot}deg) scale(${slam.scale})`,
          opacity: slam.opacity,
          width: 1080,
          height: 260,
        }}
      >
        <TornPaper seed="cs3bn" roughness={13} style={{width: '100%', height: '100%'}}>
          <div style={{fontSize: 128, fontWeight: 900, color: PAPER.ink}}>
            例えば、<span style={{color: PAPER.red}}>採用</span>。
          </div>
        </TornPaper>
        <Tape style={{position: 'absolute', left: -38, top: -16}} rot={-30} />
        <Tape style={{position: 'absolute', right: -40, top: -12}} rot={28} />
      </div>
      <div style={{position: 'absolute', left: '50%', top: 620, transform: `translateX(-50%) scale(${line2.scale})`, opacity: line2.opacity}}>
        <TornPaper seed="cs3sub" color={PAPER.blue} roughness={7} style={{width: 900, height: 96}}>
          <div style={{fontSize: 42, fontWeight: 900, color: PAPER.white}}>貴社は、この問いに、即答できますか。</div>
        </TornPaper>
      </div>
      <Confetti seed="cs3cf" count={10} enterBase={12} area={{x: 140, y: 140, w: 1640, h: 700}} />
      <CollageSub enter={12} text={'例えば採用。この問いに、即答できますか。'} />
    </AbsoluteFill>
  );
};

// ── 問いシーン共通レイアウト ──
const CollageQuestion: React.FC<{
  num: string;
  bg: string;
  bannerColor?: string;
  inkOnBanner?: string;
  lines: [string, string];
  subText: string;
  subtitle: string;
  active: number;
  dark?: boolean;
  extra?: React.ReactNode;
}> = ({num, bg, bannerColor = PAPER.white, inkOnBanner = PAPER.ink, lines, subText, subtitle, active, dark, extra}) => {
  const numPop = usePopSteps(4);
  const l1 = usePopSteps(14);
  const l2 = usePopSteps(26);
  const sub = usePopSteps(48);
  const w = useWobble(`q${num}`, 0.8);
  return (
    <AbsoluteFill style={{background: bg, fontFamily: FONT, overflow: 'hidden'}}>
      <Newspaper seed={`qnp${num}`} style={{position: 'absolute', right: -60, top: -70, width: 460, height: 400, transform: 'rotate(8deg)', opacity: dark ? 0.25 : 0.75}} cols={2} />
      <Halftone color={dark ? 'rgba(255,255,255,0.22)' : 'rgba(34,30,24,0.25)'} style={{position: 'absolute', left: 90, bottom: 130, width: 320, height: 200, transform: 'rotate(-6deg)'}} />

      {/* 大きな紙のQ番号 */}
      <div style={{position: 'absolute', left: 110, top: 90, transform: `rotate(-4deg) scale(${numPop.scale})`, opacity: numPop.opacity}}>
        <TornPaper seed={`qn${num}`} color={PAPER.red} roughness={9} style={{width: 230, height: 200}}>
          <div style={{fontSize: 110, fontWeight: 900, color: PAPER.white}}>{num}</div>
        </TornPaper>
        <Tape style={{position: 'absolute', left: 40, top: -20}} rot={-8} />
      </div>

      {/* 問い2行 */}
      <div style={{position: 'absolute', left: 400, top: 250, transform: `rotate(${-1 + w.rot * 0.5}deg) scale(${l1.scale})`, opacity: l1.opacity, width: 1240, height: 150}}>
        <TornPaper seed={`ql1${num}`} color={bannerColor} roughness={10} style={{width: '100%', height: '100%'}}>
          <div style={{fontSize: 66, fontWeight: 900, color: inkOnBanner}}>{lines[0]}</div>
        </TornPaper>
      </div>
      <div style={{position: 'absolute', left: 460, top: 430, transform: `rotate(${0.8 + w.rot * 0.5}deg) scale(${l2.scale})`, opacity: l2.opacity, width: 1100, height: 150}}>
        <TornPaper seed={`ql2${num}`} color={bannerColor} roughness={10} style={{width: '100%', height: '100%'}}>
          <div style={{fontSize: 66, fontWeight: 900, color: inkOnBanner}}>{lines[1]}</div>
        </TornPaper>
        <Tape style={{position: 'absolute', right: -30, top: -14}} rot={24} />
      </div>

      {/* 補足 */}
      <div style={{position: 'absolute', left: 470, top: 640, transform: `scale(${sub.scale})`, opacity: sub.opacity}}>
        <TornPaper seed={`qs${num}`} color={dark ? 'rgba(250,247,238,0.16)' : PAPER.blue} roughness={6} style={{width: 1000, height: 88}}>
          <div style={{fontSize: 33, fontWeight: 900, color: PAPER.white}}>{subText}</div>
        </TornPaper>
      </div>

      {extra}

      {/* 進捗の紙ドット */}
      <div style={{position: 'absolute', bottom: 150, left: 130, display: 'flex', gap: 18}}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{width: i === active ? 64 : 24, height: 24, borderRadius: 12, background: i === active ? PAPER.red : dark ? 'rgba(255,255,255,0.35)' : 'rgba(34,30,24,0.25)', filter: 'drop-shadow(2px 3px 0 rgba(34,30,24,0.2))'}} />
        ))}
      </div>

      <CollageSub enter={12} text={subtitle} />
    </AbsoluteFill>
  );
};

// ── CSQ1（250f） ──
export const CSQ1: React.FC = () => (
  <CollageQuestion
    num="Q1"
    bg={PAPER.cream}
    lines={['貴社は「誰に」「何の会社」として', '選ばれていますか？']}
    subText="貴社が選ばれる「構造上の理由」を言えますか。"
    subtitle={'貴社は誰に、何の会社として選ばれているのか。\nその理由を言えますか。'}
    active={0}
  />
);

// ── CSQ2（295f・ダーク） ──
export const CSQ2: React.FC = () => {
  const frame = useCurrentFrame();
  const WORDS = [
    {t: '定着率', x: 1420, y: 210, d: 20},
    {t: '技術力', x: 1650, y: 400, d: 34},
    {t: '歴史', x: 1400, y: 590, d: 48},
    {t: '福利厚生', x: 1620, y: 760, d: 62},
    {t: '外部評価', x: 1380, y: 900, d: 76},
  ];
  const killer = usePopSteps(175);
  const wordPops = WORDS.map((wd, i) => usePopSteps(wd.d, `w${i}`));
  return (
    <CollageQuestion
      num="Q2"
      bg="#27324E"
      dark
      lines={['「語っていない魅力」が、', '社内に眠っていませんか？']}
      subText="誰も武器だと気づいていない事実、ありませんか。"
      subtitle={'語っていない魅力が、社内に眠っていませんか。\n魅力の不足ではなく、翻訳の不足です。'}
      active={1}
      extra={
        <>
          {WORDS.map((wd, i) => (
            <div key={wd.t} style={{position: 'absolute', left: wd.x - 100, top: wd.y - 40, transform: `rotate(${i % 2 ? 5 : -5}deg) scale(${wordPops[i].scale})`, opacity: wordPops[i].opacity * 0.85}}>
              <TornPaper seed={`bw${i}`} color="rgba(250,247,238,0.2)" roughness={6} style={{width: 210, height: 74}} shadow={false}>
                <div style={{fontSize: 32, fontWeight: 900, color: 'rgba(250,247,238,0.85)'}}>{wd.t}</div>
              </TornPaper>
            </div>
          ))}
          {frame >= 175 && (
            <div style={{position: 'absolute', left: 430, top: 760, transform: `rotate(-1deg) scale(${killer.scale})`, opacity: killer.opacity, width: 1080, height: 120}}>
              <TornPaper seed="killer" color={PAPER.red} roughness={9} style={{width: '100%', height: '100%'}}>
                <div style={{fontSize: 52, fontWeight: 900, color: PAPER.white}}>
                  魅力の不足ではなく、翻訳の不足。
                </div>
              </TornPaper>
              <Tape style={{position: 'absolute', left: 460, top: -20}} rot={-5} color="rgba(255,252,235,0.4)" />
            </div>
          )}
        </>
      }
    />
  );
};

// ── CSQ3（240f・面接の空の吹き出し） ──
export const CSQ3: React.FC = () => {
  const frame = useCurrentFrame();
  const bubblePop = usePopSteps(60);
  return (
    <CollageQuestion
      num="Q3"
      bg="#DCE7F2"
      lines={['面接で競合と迷う学生に、', '「何」と語りますか？']}
      subText="内定承諾の瀬戸際で使う「一言」、ありますか。"
      subtitle={'競合と迷う学生に何と語りますか。\n決め手のひとことを持っていますか。'}
      active={2}
      extra={
        <div style={{position: 'absolute', right: 150, top: 620, transform: `rotate(3deg) scale(${bubblePop.scale})`, opacity: bubblePop.opacity}}>
          <SpeechBubble seed="q3b" width={430} height={210} tail="right">
            <div style={{display: 'flex', gap: 22}}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{width: 24, height: 24, borderRadius: '50%', background: PAPER.ink, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(frame / 7 - i * 1.05))}} />
              ))}
            </div>
          </SpeechBubble>
          <div style={{textAlign: 'center', fontSize: 28, fontWeight: 900, color: '#4E5A70', marginTop: 4}}>貴社の「一言」＝ ？</div>
        </div>
      }
    />
  );
};
