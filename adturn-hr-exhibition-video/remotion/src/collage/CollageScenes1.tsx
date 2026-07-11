import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {
  Confetti,
  Halftone,
  Newspaper,
  PAPER,
  PaperBurst,
  PaperRing,
  PaperSeal,
  SpeechBubble,
  Tape,
  TornPaper,
  usePopSteps,
  useWobble,
} from './paper';

// 紙人形（切り絵ふう）
export const PaperPerson: React.FC<{color?: string; flip?: boolean; seed?: string; scale?: number}> = ({
  color = PAPER.blue,
  flip,
  seed = 'pp',
  scale = 1,
}) => {
  const w = useWobble(seed, 1.6);
  return (
    <div
      style={{
        position: 'relative',
        width: 150,
        height: 240,
        transform: `scale(${scale}) scaleX(${flip ? -1 : 1}) rotate(${w.rot}deg)`,
        filter: 'drop-shadow(3px 5px 0 rgba(34,30,24,0.22))',
      }}
    >
      <div style={{position: 'absolute', left: 42, top: 0, width: 62, height: 62, borderRadius: '50%', background: PAPER.ink}} />
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
      <div style={{position: 'absolute', left: 104, top: 40, width: 70, height: 20, background: color, transform: 'rotate(-38deg)', borderRadius: 10}} />
      <div style={{position: 'absolute', left: 44, top: 176, width: 22, height: 60, background: PAPER.ink}} />
      <div style={{position: 'absolute', left: 84, top: 176, width: 22, height: 60, background: PAPER.ink}} />
    </div>
  );
};

// ── CS1 技術宣言（315f）: 紙の頭がパカっと割れてカラフル脳が飛び出し、紙リングへ ──
export const CS1Tech: React.FC = () => {
  const frame = useCurrentFrame();
  const SPLIT = 45;
  const split = interpolate(frame, [SPLIT, SPLIT + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });
  const splitStep = Math.floor(split * 5) / 5; // カクカク開く
  const headW = useWobble('cs1head', 0.8);

  // 脳の浮上→リングへ
  const rise = interpolate(frame, [SPLIT + 8, SPLIT + 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const riseStep = Math.floor(rise * 8) / 8;
  const absorb = interpolate(frame, [215, 262], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const aStep = Math.floor(absorb * 10) / 10;
  const brainX = 960 + (1560 - 960) * aStep;
  const brainY = 430 - riseStep * 260 + (215 - (430 - 260)) * aStep + Math.sin(Math.floor(frame / 4)) * 4;
  const brainS = (0.15 + riseStep * 0.55) * (1 - aStep * 0.82);
  const brainW2 = useWobble('cs1brain', 1.2);

  const ringPop = usePopSteps(60);
  const bannerPop = usePopSteps(158);
  const badgePop = usePopSteps(205);

  // 頭のパーツ（顔・耳・肩）— cutY より上がフタとして開く
  const CUT_Y = 170; // コンテナ内カット高さ
  const HeadShape: React.FC = () => (
    <>
      {/* 頭のシルエット */}
      <div style={{position: 'absolute', left: 110, top: 0, width: 380, height: 420, borderRadius: '48% 48% 42% 42%', background: '#2A3550'}} />
      {/* 耳 */}
      <div style={{position: 'absolute', left: 88, top: 210, width: 52, height: 90, borderRadius: 26, background: '#2A3550'}} />
      <div style={{position: 'absolute', right: 88, top: 210, width: 52, height: 90, borderRadius: 26, background: '#2A3550'}} />
      {/* 肩 */}
      <div style={{position: 'absolute', left: 0, top: 400, width: 600, height: 160, borderRadius: '60px 60px 0 0', background: '#2A3550'}} />
    </>
  );

  return (
    <AbsoluteFill style={{background: PAPER.cream, fontFamily: FONT, overflow: 'hidden'}}>
      <Newspaper style={{position: 'absolute', left: -50, top: -70, width: 540, height: 470, transform: 'rotate(-8deg)', opacity: 0.85}} />
      <Newspaper seed="cs1np" style={{position: 'absolute', right: -70, bottom: -90, width: 520, height: 440, transform: 'rotate(5deg)', opacity: 0.85}} cols={2} />
      <TornPaper seed="cs1top" color={PAPER.blue} style={{position: 'absolute', left: -60, top: -200, width: 2100, height: 320, transform: 'rotate(-1.6deg)'}} />
      <Halftone style={{position: 'absolute', left: 120, top: 220, width: 300, height: 190, transform: 'rotate(-6deg)', opacity: 0.5}} />
      <Halftone color="rgba(45,107,180,0.35)" style={{position: 'absolute', right: 140, bottom: 130, width: 320, height: 200, transform: 'rotate(7deg)'}} />

      {/* 割れる瞬間の紙バースト */}
      {frame >= SPLIT && frame < SPLIT + 60 && <PaperBurst cx={960} cy={470} color="rgba(45,107,180,0.30)" r0={260} r1={470} />}

      {/* カラフル脳（既存素材を切り絵コラージュとして使用） */}
      {frame >= SPLIT + 8 && aStep < 1 && (
        <div
          style={{
            position: 'absolute',
            left: brainX - 300,
            top: brainY - 260,
            width: 600,
            height: 520,
            transform: `scale(${brainS * 1.6}) rotate(${brainW2.rot}deg)`,
            filter: 'drop-shadow(6px 8px 0 rgba(34,30,24,0.28))',
          }}
        >
          <Img src={staticFile('img/brain.png')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
        </div>
      )}

      {/* 紙の頭（中央）: 頭頂部のフタがパカーンと左へ開く */}
      <div
        style={{
          position: 'absolute',
          left: 660,
          top: 200,
          width: 600,
          height: 560,
          transform: `rotate(${headW.rot * 0.6}deg)`,
          filter: 'drop-shadow(6px 8px 0 rgba(34,30,24,0.25))',
        }}
      >
        {/* 下側（顔・固定） */}
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(${CUT_Y}px 0 0 0)`}}>
          <HeadShape />
        </div>
        {/* 頭頂部のフタ: 左端をヒンジに、なべ蓋のように起き上がる */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: `inset(0 0 ${560 - CUT_Y}px 0)`,
            transform: `rotate(${-splitStep * 64}deg) translateY(${-splitStep * 14}px)`,
            transformOrigin: `128px ${CUT_Y}px`,
          }}
        >
          <HeadShape />
        </div>
        {/* カット面（開口部の断面） */}
        {splitStep > 0.2 && (
          <div style={{position: 'absolute', left: 128, top: CUT_Y - 10, width: 348, height: 20, borderRadius: 10, background: '#465B8C'}} />
        )}
      </div>


      {/* 紙リング（転写先） */}
      <div style={{position: 'absolute', right: 240, top: 120, transform: `scale(${ringPop.scale})`, opacity: ringPop.opacity}}>
        <PaperRing size={250} seed="cs1ring" />
      </div>

      {/* カラフルな紙の玉 */}
      <Confetti
        seed="cs1orbs"
        count={16}
        enterBase={SPLIT + 12}
        colors={['#F06292', '#FFA726', '#4DB6AC', '#42A5F5', '#FFD54F', '#66BB6A']}
        area={{x: 560, y: 90, w: 820, h: 420}}
      />

      {/* タイトルバナー */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 268,
          transform: `translateX(-50%) rotate(-1.2deg) scale(${bannerPop.scale})`,
          opacity: bannerPop.opacity,
          width: 1240,
          height: 190,
        }}
      >
        <TornPaper seed="cs1bn" roughness={11} style={{width: '100%', height: '100%'}}>
          <div style={{fontSize: 96, fontWeight: 900, color: PAPER.ink}}>
            脳を、<span style={{color: PAPER.red}}>AIに転写</span>する。
          </div>
        </TornPaper>
        <Tape style={{position: 'absolute', left: -36, top: -16}} rot={-30} />
        <Tape style={{position: 'absolute', right: -40, top: -12}} rot={26} />
      </div>

      {/* バッジ */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 170,
          transform: `translateX(-50%) scale(${badgePop.scale})`,
          opacity: badgePop.opacity,
          display: 'flex',
          gap: 26,
        }}
      >
        <TornPaper seed="cs1bd1" color={PAPER.ink} roughness={6} style={{width: 640, height: 74}}>
          <div style={{fontSize: 31, fontWeight: 900, color: PAPER.white, whiteSpace: 'nowrap'}}>オリジナルAIエンジン「デジブレ」</div>
        </TornPaper>
        <TornPaper seed="cs1bd2" color={PAPER.red} roughness={6} style={{width: 380, height: 74}}>
          <div style={{fontSize: 31, fontWeight: 900, color: PAPER.white, whiteSpace: 'nowrap'}}>世界初｜特許出願中</div>
        </TornPaper>
      </div>
    </AbsoluteFill>
  );
};

// ── CS2 技術の中身（400f）: 約40名カウント → レシピではなく料理そのもの ──
export const CS2Engine: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 240;

  // カクカク進むカウンター
  const countRaw = interpolate(frame, [16, 90], [0, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const count = Math.round(Math.floor(countRaw / 5) * 5 + (countRaw >= 40 ? 0 : 0));
  const countPop = usePopSteps(10);
  const headPop = usePopSteps(4);
  const brainPop = usePopSteps(8);

  const TAGS = ['人事', '採用コンサル', 'マーケ', 'ブランディング', '経営コンサル', 'アーティスト'];
  const tagPos = [
    {x: 1240, y: 170}, {x: 1580, y: 260}, {x: 1680, y: 490},
    {x: 1540, y: 720}, {x: 1220, y: 780}, {x: 1030, y: 420},
  ];
  // フックは条件分岐の外でまとめて呼ぶ
  const copiedPop = usePopSteps(30);
  const tagPops = TAGS.map((_, i) => usePopSteps(24 + i * 9, `tag${i}`));
  const tagWobs = TAGS.map((_, i) => useWobble(`tagw${i}`, 1.4));

  const b2Head = usePopSteps(252);
  const b2L = usePopSteps(272);
  const b2R = usePopSteps(284);

  return (
    <AbsoluteFill style={{background: PAPER.cream, fontFamily: FONT, overflow: 'hidden'}}>
      <Newspaper seed="cs2np" style={{position: 'absolute', right: -40, top: -70, width: 470, height: 420, transform: 'rotate(7deg)', opacity: 0.8}} cols={2} />
      <Halftone style={{position: 'absolute', left: 80, bottom: 110, width: 300, height: 190, transform: 'rotate(-7deg)', opacity: 0.5}} />
      <TornPaper seed="cs2side" color={PAPER.green} style={{position: 'absolute', left: -140, top: -80, width: 320, height: 1300, transform: 'rotate(3deg)'}} />

      {!isBeat2 && (
        <>
          {/* 左: 約40名 */}
          <div style={{position: 'absolute', left: 220, top: 200, transform: `scale(${headPop.scale})`, opacity: headPop.opacity}}>
            <TornPaper seed="cs2h" roughness={9} style={{width: 700, height: 100}}>
              <div style={{fontSize: 42, fontWeight: 900, color: PAPER.ink, whiteSpace: 'nowrap'}}>各領域のトップパフォーマー</div>
            </TornPaper>
          </div>
          <div style={{position: 'absolute', left: 250, top: 340, transform: `scale(${countPop.scale})`, opacity: countPop.opacity}}>
            <TornPaper seed="cs2c" roughness={12} style={{width: 560, height: 330}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 10}}>
                <span style={{fontSize: 70, fontWeight: 900, color: PAPER.ink}}>約</span>
                <span style={{fontSize: 230, fontWeight: 900, color: PAPER.red, fontVariantNumeric: 'tabular-nums'}}>{count}</span>
                <span style={{fontSize: 70, fontWeight: 900, color: PAPER.ink}}>名</span>
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: 200, top: -22}} rot={-4} />
          </div>
          <div style={{position: 'absolute', left: 240, top: 710, transform: `scale(${copiedPop.scale})`, opacity: copiedPop.opacity}}>
            <TornPaper seed="cs2t" color={PAPER.blue} roughness={7} style={{width: 620, height: 96}}>
              <div style={{fontSize: 44, fontWeight: 900, color: PAPER.white}}>の脳を、コピー済み。</div>
            </TornPaper>
          </div>

          {/* 右: カラフル脳＋紙タグ */}
          <div style={{position: 'absolute', left: 1150, top: 260, width: 460, height: 420, transform: `scale(${brainPop.scale})`, opacity: brainPop.opacity, filter: 'drop-shadow(6px 8px 0 rgba(34,30,24,0.25))'}}>
            <Img src={staticFile('img/brain.png')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
          </div>
          {TAGS.map((t, i) => {
            const pop = tagPops[i];
            const w = tagWobs[i];
            return (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: tagPos[i].x - 110,
                  top: tagPos[i].y - 36,
                  transform: `scale(${pop.scale}) rotate(${(i % 2 ? 4 : -4) + w.rot}deg)`,
                  opacity: pop.opacity,
                }}
              >
                <TornPaper seed={`tag${i}`} color={i % 2 ? PAPER.white : PAPER.yellow} roughness={6} style={{width: 220, height: 68}}>
                  <div style={{fontSize: 29, fontWeight: 900, color: PAPER.ink}}>{t}</div>
                </TornPaper>
              </div>
            );
          })}
        </>
      )}

      {isBeat2 && (
        <>
          <div style={{position: 'absolute', left: '50%', top: 120, transform: `translateX(-50%) rotate(-1deg) scale(${b2Head.scale})`, opacity: b2Head.opacity, width: 1560, height: 180}}>
            <TornPaper seed="cs2b2" roughness={11} style={{width: '100%', height: '100%'}}>
              <div style={{fontSize: 74, fontWeight: 900, color: PAPER.ink, whiteSpace: 'nowrap'}}>
                レシピではなく、<span style={{color: PAPER.red}}>料理そのもの</span>を出力。
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: 560, top: -22}} rot={-5} />
          </div>
          {/* 比較カード */}
          <div style={{position: 'absolute', left: 280, top: 400, transform: `rotate(-2deg) scale(${b2L.scale})`, opacity: b2L.opacity}}>
            <TornPaper seed="cs2cardL" color={'#DDD6C6'} roughness={9} style={{width: 600, height: 380}}>
              <div style={{textAlign: 'center'}}>
                <div style={{width: 0, height: 0, margin: '0 auto', borderLeft: '30px solid transparent', borderRight: '30px solid transparent', borderBottom: `52px solid ${PAPER.grey}`}} />
                <div style={{height: 18}} />
                <div style={{fontSize: 44, fontWeight: 900, color: '#6E675A'}}>既存のAIツール</div>
                <div style={{height: 14}} />
                <div style={{fontSize: 30, fontWeight: 700, color: '#6E675A', lineHeight: 1.6}}>
                  一般的な回答を出力し、
                  <br />
                  業務を「補助」する。
                </div>
              </div>
            </TornPaper>
          </div>
          <div style={{position: 'absolute', right: 280, top: 380, transform: `rotate(2deg) scale(${b2R.scale})`, opacity: b2R.opacity}}>
            <TornPaper seed="cs2cardR" color={PAPER.white} roughness={9} style={{width: 640, height: 410}}>
              <div style={{textAlign: 'center'}}>
                <div style={{width: 52, height: 52, margin: '0 auto', borderRadius: '50%', border: `14px solid ${PAPER.red}`}} />
                <div style={{height: 16}} />
                <div style={{fontSize: 46, fontWeight: 900, color: PAPER.red}}>デジブレ</div>
                <div style={{height: 12}} />
                <div style={{fontSize: 31, fontWeight: 900, color: PAPER.ink, lineHeight: 1.6}}>
                  提案書・分析・戦略「そのもの」を
                  <br />
                  トップパフォーマー品質で出力。
                </div>
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: 240, top: -20}} rot={-4} />
          </div>
          <Confetti seed="cs2cf" count={4} enterBase={266} area={{x: 60, y: 340, w: 180, h: 480}} />
          <Confetti seed="cs2cf2" count={4} enterBase={270} area={{x: 240, y: 830, w: 1440, h: 90}} />
        </>
      )}
    </AbsoluteFill>
  );
};

// ── CS2.5 現場の声（395f） ──
export const CS25Voice: React.FC = () => {
  const frame = useCurrentFrame();
  const FLASH = 270;
  const isSlam = frame >= FLASH + 3;
  const flash = interpolate(frame, [FLASH, FLASH + 3, FLASH + 14], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const b1 = usePopSteps(8);
  const b2 = usePopSteps(140);
  const slamPop = usePopSteps(FLASH + 6);
  const sealPop = usePopSteps(FLASH + 30);

  const typed = (textAt: number, text: string) => {
    const n = Math.floor(interpolate(frame, [textAt, textAt + text.length * 1.6], [0, text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
    return text.slice(0, n);
  };

  return (
    <AbsoluteFill style={{background: '#27324E', fontFamily: FONT, overflow: 'hidden'}}>
      <Newspaper seed="cs25np" style={{position: 'absolute', left: -60, bottom: -90, width: 500, height: 430, transform: 'rotate(-6deg)', opacity: 0.35}} cols={2} />
      <Halftone color="rgba(255,255,255,0.22)" style={{position: 'absolute', right: 100, top: 90, width: 340, height: 210, transform: 'rotate(6deg)'}} />

      {!isSlam && (
        <>
          {/* 経営者バブル */}
          <div style={{position: 'absolute', left: 260, top: 210, transform: `scale(${b1.scale})`, opacity: b1.opacity * (frame >= 140 ? 0.55 : 1)}}>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 26}}>
              <div style={{textAlign: 'center'}}>
                <PaperPerson color={PAPER.ink} seed="v1p" scale={0.8} />
                <TornPaper seed="v1l" color={PAPER.white} roughness={5} style={{width: 130, height: 46, marginTop: -30}}>
                  <div style={{fontSize: 24, fontWeight: 900, color: PAPER.ink}}>経営者</div>
                </TornPaper>
              </div>
              <SpeechBubble seed="v1b" width={980} height={170}>
                <div style={{fontSize: 46, fontWeight: 900, color: PAPER.ink, padding: '0 40px'}}>
                  {typed(16, 'トップパフォーマーの社員が、もっといたらなぁ…')}
                </div>
              </SpeechBubble>
            </div>
          </div>
          {/* 人事バブル */}
          <div style={{position: 'absolute', right: 240, top: 560, transform: `scale(${b2.scale})`, opacity: b2.opacity}}>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 26, flexDirection: 'row-reverse'}}>
              <div style={{textAlign: 'center'}}>
                <PaperPerson color={PAPER.red} seed="v2p" flip scale={0.8} />
                <TornPaper seed="v2l" color={PAPER.white} roughness={5} style={{width: 160, height: 46, marginTop: -30}}>
                  <div style={{fontSize: 24, fontWeight: 900, color: PAPER.ink}}>人事責任者</div>
                </TornPaper>
              </div>
              <SpeechBubble seed="v2b" width={880} height={170} tail="right">
                <div style={{fontSize: 46, fontWeight: 900, color: PAPER.ink, padding: '0 40px'}}>
                  {typed(148, 'あと3名いたら、うちも変われるのに。')}
                </div>
              </SpeechBubble>
            </div>
          </div>
        </>
      )}

      {isSlam && (
        <AbsoluteFill style={{background: PAPER.red, justifyContent: 'center', alignItems: 'center'}}>
          <PaperBurst cx={960} cy={480} color="rgba(250,247,238,0.9)" />
          <Halftone color="rgba(34,30,24,0.2)" style={{position: 'absolute', left: 90, bottom: 90, width: 340, height: 220, transform: 'rotate(-7deg)'}} />
          <div style={{transform: `rotate(-1.5deg) scale(${slamPop.scale})`, opacity: slamPop.opacity, width: 1360, height: 250}}>
            <TornPaper seed="slam" roughness={13} style={{width: '100%', height: '100%'}}>
              <div style={{fontSize: 118, fontWeight: 900, color: PAPER.ink}}>
                それ、<span style={{color: PAPER.red}}>解決できます</span>。
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: -40, top: -16}} rot={-28} />
            <Tape style={{position: 'absolute', right: -44, top: -14}} rot={30} />
          </div>
          <div style={{position: 'absolute', right: 300, top: 150, transform: `rotate(10deg) scale(${sealPop.scale})`, opacity: sealPop.opacity}}>
            <PaperSeal color={PAPER.ink} />
          </div>
          <Confetti seed="slamcf" count={14} enterBase={FLASH + 10} colors={[PAPER.white, PAPER.yellow, PAPER.ink]} area={{x: 160, y: 120, w: 1600, h: 700}} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{background: '#FFFFFF', opacity: flash, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
