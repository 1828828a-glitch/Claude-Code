import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {SCENES, TOTAL_FRAMES} from './theme';
import {CS1Tech, CS2Engine, CS25Voice} from './collage/CollageScenes1';
import {CS3Intro, CSQ1, CSQ2, CSQ3} from './collage/CollageScenes2';
import {CS7Answer, CS8CTA} from './collage/CollageScenes3';

// ナレーション配置は本編（Video.tsx）と同一
const NARRATION: Array<[string, number]> = [
  ['n1', 15],
  ['n2a', 327],
  ['n2b', 561],
  ['v1', 729],
  ['v2', 861],
  ['v3', 995],
  ['n3', 1119],
  ['n4', 1309],
  ['n5', 1559],
  ['n6', 1854],
  ['n7a', 2091],
  ['n7b', 2253],
  ['n8a', 2554],
  ['n8b', 2655],
  ['n8c', 2883],
];

const QUESTIONS_START = 715;
const QUESTIONS_END = 2085;
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

export const AdturnCollageVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }

  return (
    <AbsoluteFill style={{background: '#F2ECDD'}}>
      <Audio src={staticFile('audio/bgm.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      <Sequence from={starts.tech} durationInFrames={s.tech} name="C1 技術宣言">
        <CS1Tech />
      </Sequence>
      <Sequence from={starts.engine} durationInFrames={s.engine} name="C2 技術の中身">
        <CS2Engine />
      </Sequence>
      <Sequence from={starts.voice} durationInFrames={s.voice} name="C2.5 現場の声">
        <CS25Voice />
      </Sequence>
      <Sequence from={starts.intro} durationInFrames={s.intro} name="C3 問いの宣言">
        <CS3Intro />
      </Sequence>
      <Sequence from={starts.q1} durationInFrames={s.q1} name="C4 Q1">
        <CSQ1 />
      </Sequence>
      <Sequence from={starts.q2} durationInFrames={s.q2} name="C5 Q2">
        <CSQ2 />
      </Sequence>
      <Sequence from={starts.q3} durationInFrames={s.q3} name="C6 Q3">
        <CSQ3 />
      </Sequence>
      <Sequence from={starts.answer} durationInFrames={s.answer} name="C7 答え">
        <CS7Answer />
      </Sequence>
      <Sequence from={starts.cta} durationInFrames={s.cta} name="C8 CTA">
        <CS8CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
