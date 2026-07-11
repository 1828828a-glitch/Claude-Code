import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {SCENES, TOTAL_FRAMES} from './theme';
import {Scene1Tech} from './scenes/Scene1Tech';
import {Scene2Engine} from './scenes/Scene2Engine';
import {Scene3Intro} from './scenes/Scene3Intro';
import {Scene4Q1, Scene5Q2, Scene6Q3, QuestionProgress} from './scenes/SceneQuestions';
import {Scene7Answer} from './scenes/Scene7Answer';
import {Scene8CTA} from './scenes/Scene8CTA';

// Cross-fade wrapper: fades a scene out over its last `overlap` frames
const CrossFade: React.FC<{duration: number; overlap?: number; children: React.ReactNode}> = ({
  duration,
  overlap = 12,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [duration - overlap, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

// 疑似3Dカメラドリフト: 2Dシーンに微小なパース回転＋スロードリーで奥行きを与える
const CameraDrift: React.FC<{phase?: number; children: React.ReactNode}> = ({phase = 0, children}) => {
  const frame = useCurrentFrame();
  const t = frame / 30 + phase;
  const rx = Math.sin(t / 3.1) * 1.1;
  const ry = Math.cos(t / 3.7) * 1.4;
  const zoom = 1.03 + Math.sin(t / 5.3) * 0.015;
  return (
    <AbsoluteFill style={{perspective: 1400, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Narration placements: [file, absolute start frame]
const NARRATION: Array<[string, number]> = [
  ['n1', 15], // S1 技術宣言
  ['n2a', 327], // S2 約40名コピー済み
  ['n2b', 574], // S2 レシピではなく料理そのもの
  ['n3', 724], // S3 例えば、採用。
  ['n4', 914], // S4 Q1
  ['n5', 1164], // S5 Q2
  ['n6', 1459], // S6 Q3
  ['n7a', 1696], // S7 答え=ADTURN for HR
  ['n7b', 1862], // S7 レポート内容
  ['n8a', 2159], // S8 一般論は一行もない
  ['n8b', 2284], // S8 もう出せます
  ['n8c', 2492], // S8 デモはブースで
];

// BGM: ambient pad, ducked from the voice scene through the question section (静かな「余白」)
const QUESTIONS_START = 715;
const QUESTIONS_END = 1690;
const bgmVolume = (f: number) => {
  const base = interpolate(
    f,
    [QUESTIONS_START - 30, QUESTIONS_START + 30, QUESTIONS_END - 30, QUESTIONS_END + 30],
    [0.3, 0.18, 0.18, 0.3],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  const endFade = interpolate(f, [TOTAL_FRAMES - 70, TOTAL_FRAMES - 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return base * endFade;
};

export const AdturnVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }

  return (
    <AbsoluteFill style={{background: '#FFFFFF'}}>
      {/* Audio track */}
      <Audio src={staticFile('audio/bgm.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      <Sequence from={starts.tech} durationInFrames={s.tech} name="S1 技術宣言">
        <Scene1Tech />
      </Sequence>
      <Sequence from={starts.engine} durationInFrames={s.engine} name="S2 技術の中身">
        <CrossFade duration={s.engine}>
          <CameraDrift phase={7}>
            <Scene2Engine />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.intro} durationInFrames={s.intro} name="S3 問いの宣言">
        <CrossFade duration={s.intro}>
          <CameraDrift phase={14}>
            <Scene3Intro />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.q1} durationInFrames={s.q1} name="S4 Q1">
        <CrossFade duration={s.q1}>
          <CameraDrift phase={21}>
            <Scene4Q1 />
            <QuestionProgress active={0} />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.q2} durationInFrames={s.q2} name="S5 Q2">
        <CrossFade duration={s.q2}>
          <CameraDrift phase={28}>
            <Scene5Q2 />
            <QuestionProgress active={1} dark />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.q3} durationInFrames={s.q3} name="S6 Q3">
        <CrossFade duration={s.q3}>
          <CameraDrift phase={35}>
            <Scene6Q3 />
            <QuestionProgress active={2} />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.answer} durationInFrames={s.answer} name="S7 答え=ADTURN for HR">
        <CrossFade duration={s.answer}>
          <CameraDrift phase={42}>
            <Scene7Answer />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.cta} durationInFrames={s.cta} name="S8 CTA">
        <Scene8CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
