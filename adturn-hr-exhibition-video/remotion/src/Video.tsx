import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {SCENES} from './theme';
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
      <Sequence from={starts.tech} durationInFrames={s.tech} name="S1 技術宣言">
        <Scene1Tech />
      </Sequence>
      <Sequence from={starts.engine} durationInFrames={s.engine} name="S2 技術の中身">
        <CrossFade duration={s.engine}>
          <Scene2Engine />
        </CrossFade>
      </Sequence>
      <Sequence from={starts.intro} durationInFrames={s.intro} name="S3 問いの宣言">
        <CrossFade duration={s.intro}>
          <Scene3Intro />
        </CrossFade>
      </Sequence>
      <Sequence from={starts.q1} durationInFrames={s.q1} name="S4 Q1">
        <CrossFade duration={s.q1}>
          <Scene4Q1 />
          <QuestionProgress active={0} />
        </CrossFade>
      </Sequence>
      <Sequence from={starts.q2} durationInFrames={s.q2} name="S5 Q2">
        <CrossFade duration={s.q2}>
          <Scene5Q2 />
          <QuestionProgress active={1} />
        </CrossFade>
      </Sequence>
      <Sequence from={starts.q3} durationInFrames={s.q3} name="S6 Q3">
        <CrossFade duration={s.q3}>
          <Scene6Q3 />
          <QuestionProgress active={2} />
        </CrossFade>
      </Sequence>
      <Sequence from={starts.answer} durationInFrames={s.answer} name="S7 答え=ADTURN for HR">
        <CrossFade duration={s.answer}>
          <Scene7Answer />
        </CrossFade>
      </Sequence>
      <Sequence from={starts.cta} durationInFrames={s.cta} name="S8 CTA">
        <Scene8CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
