import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {ReportDoc} from '../fx';
import {
  Confetti,
  Halftone,
  Newspaper,
  PAPER,
  PaperBurst,
  PaperRing,
  PaperSeal,
  Tape,
  TornPaper,
  usePopSteps,
  useWobble,
} from './paper';

const QUESTIONS = ['Q1｜ポジション', 'Q2｜無自覚の魅力', 'Q3｜ターゲット', 'Q4｜クロージング'];
const REPORTS = ['ポジショニング\nマップ', '無自覚資産の\n発掘', 'ターゲット\nペルソナ', 'トーク\nスクリプト'];

// ── CS7 答え（460f）: 4つの問いチェック → ADTURN for HR＋扇状レポート ──
export const CS7Answer: React.FC = () => {
  const frame = useCurrentFrame();
  const isBeat2 = frame >= 105;
  const headPop = usePopSteps(4);
  const cardPops = QUESTIONS.map((_, i) => usePopSteps(18 + i * 13, `qc${i}`));
  const sealPops = QUESTIONS.map((_, i) => usePopSteps(30 + i * 13, `qs${i}`));
  const cardWobs = QUESTIONS.map((_, i) => useWobble(`qcw${i}`, 1));

  const logoPop = usePopSteps(112);
  const subPop = usePopSteps(140);
  const repPops = REPORTS.map((_, i) => usePopSteps(166 + i * 11, `rp${i}`));
  const linePop = usePopSteps(226);
  const repWobs = REPORTS.map((_, i) => useWobble(`rw${i}`, 1));

  return (
    <AbsoluteFill style={{background: PAPER.cream, fontFamily: FONT, overflow: 'hidden'}}>
      <Newspaper seed="cs7np" style={{position: 'absolute', left: -60, top: -70, width: 480, height: 420, transform: 'rotate(-7deg)', opacity: 0.8}} cols={2} />
      <Halftone style={{position: 'absolute', right: 100, bottom: 110, width: 320, height: 200, transform: 'rotate(7deg)', opacity: 0.5}} />
      <TornPaper seed="cs7side" color={PAPER.yellow} style={{position: 'absolute', right: -150, top: -80, width: 300, height: 1300, transform: 'rotate(-3deg)'}} />

      {!isBeat2 && (
        <>
          <div style={{position: 'absolute', left: '50%', top: 150, transform: `translateX(-50%) rotate(-1deg) scale(${headPop.scale})`, opacity: headPop.opacity, width: 1240, height: 170}}>
            <TornPaper seed="cs7h" roughness={11} style={{width: '100%', height: '100%'}}>
              <div style={{fontSize: 80, fontWeight: 900, color: PAPER.ink}}>
                4つの問い、<span style={{color: PAPER.red}}>すべてに答え</span>を。
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: 520, top: -22}} rot={-5} />
          </div>
          <div style={{position: 'absolute', left: '50%', top: 430, transform: 'translateX(-50%)', display: 'flex', gap: 36}}>
            {QUESTIONS.map((q, i) => (
              <div key={q} style={{position: 'relative', transform: `rotate(${(i % 2 ? 1.6 : -1.6) + cardWobs[i].rot * 0.6}deg) scale(${cardPops[i].scale})`, opacity: cardPops[i].opacity}}>
                <TornPaper seed={`qcard${i}`} color={PAPER.white} roughness={7} style={{width: 380, height: 220}}>
                  <div style={{fontSize: 36, fontWeight: 900, color: PAPER.ink}}>{q}</div>
                </TornPaper>
                <div style={{position: 'absolute', top: -34, right: -30, transform: `scale(${sealPops[i].scale * 0.62})`, opacity: sealPops[i].opacity}}>
                  <PaperSeal />
                </div>
              </div>
            ))}
          </div>
          <Confetti seed="cs7cf" count={5} enterBase={40} area={{x: 180, y: 730, w: 480, h: 150}} />
          <Confetti seed="cs7cf2" count={5} enterBase={44} area={{x: 1260, y: 730, w: 480, h: 150}} />
        </>
      )}

      {isBeat2 && (
        <>
          {/* ロゴバナー */}
          <div style={{position: 'absolute', left: '50%', top: 90, transform: `translateX(-50%) rotate(-1deg) scale(${logoPop.scale})`, opacity: logoPop.opacity, width: 1150, height: 190}}>
            <TornPaper seed="cs7logo" color={PAPER.red} roughness={11} style={{width: '100%', height: '100%'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
                <div style={{width: 62, height: 62, borderRadius: '50%', border: `16px solid ${PAPER.white}`}} />
                <div style={{fontSize: 92, fontWeight: 900, color: PAPER.white, letterSpacing: '0.02em'}}>ADTURN for HR</div>
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: -36, top: -14}} rot={-28} />
            <Tape style={{position: 'absolute', right: -40, top: -12}} rot={26} />
          </div>
          <div style={{position: 'absolute', left: '50%', top: 306, transform: `translateX(-50%) scale(${subPop.scale})`, opacity: subPop.opacity}}>
            <TornPaper seed="cs7sub" color={PAPER.ink} roughness={6} style={{width: 1260, height: 82}}>
              <div style={{fontSize: 33, fontWeight: 900, color: PAPER.white, whiteSpace: 'nowrap'}}>人事・採用トップパフォーマーの脳による、貴社専用の戦略レポート</div>
            </TornPaper>
          </div>

          {/* 扇状レポートカード（紙化: ReportDocをテープ留め） */}
          <div style={{position: 'absolute', left: '50%', top: 430, transform: 'translateX(-50%)', display: 'flex'}}>
            {REPORTS.map((t, i) => (
              <div
                key={t}
                style={{
                  transform: `rotate(${[-8, -3, 3, 8][i] + repWobs[i].rot * 0.5}deg) translateY(${Math.abs([-8, -3, 3, 8][i]) * 4}px) scale(${repPops[i].scale})`,
                  opacity: repPops[i].opacity,
                  margin: '0 -4px',
                }}
              >
                <div style={{position: 'relative'}}>
                  <ReportDoc delay={0} width={295} height={320} title={t} lineCount={5} seed={`crep${i}`} fontSize={29} />
                  <Tape style={{position: 'absolute', left: 90, top: -20, width: 120, height: 34}} rot={i % 2 ? 5 : -5} />
                </div>
              </div>
            ))}
          </div>

          {/* 納品物ライン */}
          <div style={{position: 'absolute', left: '50%', bottom: 205, transform: `translateX(-50%) scale(${linePop.scale})`, opacity: linePop.opacity}}>
            <TornPaper seed="cs7line" color={PAPER.white} roughness={6} style={{width: 1420, height: 78}}>
              <div style={{fontSize: 30, fontWeight: 900, color: PAPER.ink, display: 'flex', gap: 18}}>
                <span>市場ポジションの設計</span>
                <span style={{color: PAPER.red}}>/</span>
                <span>眠れる魅力の発掘</span>
                <span style={{color: PAPER.red}}>/</span>
                <span>狙うべき人材の特定</span>
                <span style={{color: PAPER.red}}>/</span>
                <span>面接で使うトークスクリプト</span>
              </div>
            </TornPaper>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── CS8 CTA（440f）: 一般論は一行もない → もう出せます → エンドカード ──
export const CS8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = frame < 104 ? 1 : frame < 328 ? 2 : 3;

  const docPop = usePopSteps(6);
  const b1Pop = usePopSteps(14);
  const b1Sub = usePopSteps(48);

  const b2Pop = usePopSteps(112);
  const b2Sub = usePopSteps(150);

  const ringPop = usePopSteps(334);
  const endLogo = usePopSteps(344);
  const ctaPop = usePopSteps(362);

  return (
    <AbsoluteFill style={{background: '#27324E', fontFamily: FONT, overflow: 'hidden'}}>
      {beat === 1 && (
        <>
          <Newspaper seed="cs8np" style={{position: 'absolute', right: -50, bottom: -80, width: 480, height: 420, transform: 'rotate(6deg)', opacity: 0.3}} cols={2} />
          <Halftone color="rgba(255,255,255,0.2)" style={{position: 'absolute', left: 90, top: 100, width: 320, height: 200, transform: 'rotate(-6deg)'}} />
          {/* レポート誌面（紙・テープ留め） */}
          <div style={{position: 'absolute', left: 330, top: 220, transform: `rotate(-2deg) scale(${docPop.scale})`, opacity: docPop.opacity}}>
            <ReportDoc delay={0} width={420} height={560} header="戦略レポート｜p.21" lineCount={11} seed="cs8doc" fontSize={26} />
            <Tape style={{position: 'absolute', left: 150, top: -22}} rot={-5} />
          </div>
          <div style={{position: 'absolute', right: 190, top: 330, transform: `rotate(1deg) scale(${b1Pop.scale})`, opacity: b1Pop.opacity, width: 760, height: 300}}>
            <TornPaper seed="cs8b1" roughness={12} style={{width: '100%', height: '100%'}}>
              <div style={{fontSize: 88, fontWeight: 900, color: PAPER.ink, textAlign: 'center', lineHeight: 1.4}}>
                一般論は、
                <br />
                <span style={{color: PAPER.red}}>一行もない。</span>
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: -34, top: -14}} rot={-28} />
          </div>
          <div style={{position: 'absolute', right: 210, top: 680, transform: `scale(${b1Sub.scale})`, opacity: b1Sub.opacity}}>
            <TornPaper seed="cs8b1s" color="rgba(250,247,238,0.16)" roughness={6} style={{width: 720, height: 110}} shadow={false}>
              <div style={{fontSize: 30, fontWeight: 900, color: 'rgba(250,247,238,0.9)', textAlign: 'center', lineHeight: 1.6}}>
                貴社の公開情報から、人事・採用
                <br />
                トップパフォーマーの「脳」が診断。
              </div>
            </TornPaper>
          </div>
        </>
      )}

      {beat === 2 && (
        <AbsoluteFill style={{background: PAPER.red}}>
          <PaperBurst cx={960} cy={480} color="rgba(250,247,238,0.85)" />
          <Halftone color="rgba(34,30,24,0.2)" style={{position: 'absolute', right: 100, bottom: 100, width: 340, height: 210, transform: 'rotate(6deg)'}} />
          <div style={{position: 'absolute', left: '50%', top: 350, transform: `translateX(-50%) rotate(-1.2deg) scale(${b2Pop.scale})`, opacity: b2Pop.opacity, width: 1320, height: 240}}>
            <TornPaper seed="cs8b2" roughness={13} style={{width: '100%', height: '100%'}}>
              <div style={{fontSize: 104, fontWeight: 900, color: PAPER.ink}}>
                貴社の「答え」は、<span style={{color: PAPER.red}}>もう出せます</span>。
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: -38, top: -16}} rot={-28} />
            <Tape style={{position: 'absolute', right: -40, top: -12}} rot={26} />
          </div>
          <div style={{position: 'absolute', left: '50%', top: 640, transform: `translateX(-50%) scale(${b2Sub.scale})`, opacity: b2Sub.opacity}}>
            <TornPaper seed="cs8b2s" color={PAPER.ink} roughness={6} style={{width: 880, height: 90}}>
              <div style={{fontSize: 38, fontWeight: 900, color: PAPER.white}}>トップパフォーマーの脳を、あなたの武器に。</div>
            </TornPaper>
          </div>
          <Confetti seed="cs8cf" count={6} enterBase={120} colors={[PAPER.white, PAPER.yellow, PAPER.ink]} area={{x: 160, y: 130, w: 1600, h: 160}} />
          <Confetti seed="cs8cf2" count={3} enterBase={128} colors={[PAPER.white, PAPER.yellow, PAPER.ink]} area={{x: 130, y: 350, w: 200, h: 400}} />
          <Confetti seed="cs8cf3" count={3} enterBase={132} colors={[PAPER.white, PAPER.yellow, PAPER.ink]} area={{x: 1590, y: 350, w: 200, h: 400}} />
        </AbsoluteFill>
      )}

      {beat === 3 && (
        <AbsoluteFill style={{background: PAPER.cream}}>
          <Newspaper seed="cs8enp" style={{position: 'absolute', left: -50, top: -70, width: 470, height: 410, transform: 'rotate(-7deg)', opacity: 0.8}} cols={2} />
          <Newspaper seed="cs8enp2" style={{position: 'absolute', right: -60, bottom: -90, width: 480, height: 420, transform: 'rotate(6deg)', opacity: 0.8}} cols={2} />
          <Halftone style={{position: 'absolute', right: 130, top: 130, width: 300, height: 190, transform: 'rotate(7deg)', opacity: 0.5}} />
          <div style={{position: 'absolute', left: '50%', top: 130, transform: `translateX(-50%) scale(${ringPop.scale})`, opacity: ringPop.opacity}}>
            <PaperRing size={210} seed="cs8ring" />
          </div>
          <div style={{position: 'absolute', left: '50%', top: 390, transform: `translateX(-50%) rotate(-1deg) scale(${endLogo.scale})`, opacity: endLogo.opacity, width: 1120, height: 210}}>
            <TornPaper seed="cs8logo" roughness={12} style={{width: '100%', height: '100%'}}>
              <div style={{fontSize: 104, fontWeight: 900, color: PAPER.ink}}>
                ADTURN <span style={{color: PAPER.red}}>for HR</span>
              </div>
            </TornPaper>
            <Tape style={{position: 'absolute', left: -36, top: -14}} rot={-30} />
            <Tape style={{position: 'absolute', right: -40, top: -12}} rot={28} />
          </div>
          <div style={{position: 'absolute', left: '50%', top: 660, transform: `translateX(-50%) scale(${ctaPop.scale})`, opacity: ctaPop.opacity, display: 'flex', alignItems: 'center', gap: 30}}>
            <PaperSeal size={150} color={PAPER.red}>
              <div style={{fontSize: 26, fontWeight: 900, color: PAPER.white, textAlign: 'center', lineHeight: 1.3}}>
                デモ
                <br />
                実施中
              </div>
            </PaperSeal>
            <TornPaper seed="cs8cta" color={PAPER.blue} roughness={6} style={{width: 760, height: 96}}>
              <div style={{fontSize: 40, fontWeight: 900, color: PAPER.white}}>ぜひブースでご体験ください</div>
            </TornPaper>
          </div>
          <div style={{position: 'absolute', bottom: 120, width: '100%', textAlign: 'center', fontSize: 30, fontWeight: 900, letterSpacing: '0.3em', color: '#7A7466'}}>
            ADTANK GP
          </div>
          <Confetti seed="cs8ecf" count={4} enterBase={340} area={{x: 150, y: 110, w: 560, h: 170}} />
          <Confetti seed="cs8ecf2" count={4} enterBase={344} area={{x: 1210, y: 110, w: 560, h: 170}} />
          <Confetti seed="cs8ecf3" count={2} enterBase={350} area={{x: 130, y: 340, w: 200, h: 380}} />
          <Confetti seed="cs8ecf4" count={2} enterBase={354} area={{x: 1590, y: 340, w: 200, h: 380}} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
