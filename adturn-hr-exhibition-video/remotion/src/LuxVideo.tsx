import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {SCENES, TOTAL_FRAMES} from './theme';
import {LUX_BG, LuxBackdrop} from './lux/LuxDemo';
import {L1Tech, L2Engine, L3Intro, L7Answer, L8CTA, LQ1, LQ2, LQ3, LuxFrame} from './lux/LuxScenes';
import {LuxStage} from './lux/LuxStage';

// ナレーション配置は本編（Video.tsx）と同一
const NARRATION: Array<[string, number]> = [
  ['n1', 15], // L1 技術宣言
  ['n2a', 327], // L2 約40名コピー済み
  ['n2b', 574], // L2 レシピではなく料理そのもの
  ['n3', 724], // L3 例えば、採用。
  ['n4', 914], // L4 Q1
  ['n5', 1164], // L5 Q2
  ['n6', 1459], // L6 Q3
  ['n7a', 1696], // L7 答え=ADTURN for HR
  ['n7b', 1862], // L7 レポート内容
  ['n8a', 2159], // L8 一般論は一行もない
  ['n8b', 2284], // L8 もう出せます
  ['n8c', 2492], // L8 デモはブースで
];

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

// シーン間クロスフェード（静かに沈んで次へ）
const SceneFade: React.FC<{duration: number; children: React.ReactNode}> = ({duration, children}) => {
  const frame = useCurrentFrame();
  const opacity =
    interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(frame, [duration - 12, duration - 2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const AdturnLuxVideo: React.FC = () => {
  const s = SCENES;
  let at = 0;
  const starts: Record<string, number> = {};
  for (const [key, dur] of Object.entries(s)) {
    starts[key] = at;
    at += dur;
  }

  return (
    <AbsoluteFill style={{background: LUX_BG}}>
      <Audio src={staticFile('audio/bgm.m4a')} volume={bgmVolume} />
      {NARRATION.map(([file, from]) => (
        <Sequence key={file} from={from} name={`ナレーション ${file}`}>
          <Audio src={staticFile(`audio/${file}.mp3`)} />
        </Sequence>
      ))}
      {/* 背景は全編共通（切り替えなしで高級感の連続性を出す） */}
      <LuxBackdrop />
      {/* 常設3Dステージ: 頭部＋脳が86秒まわり続け、シーンごとにカメラと明度が変わる */}
      <LuxStage />
      <Sequence from={starts.tech} durationInFrames={s.tech} name="L1 技術宣言">
        <SceneFade duration={s.tech}>
          <L1Tech />
        </SceneFade>
      </Sequence>
      <Sequence from={starts.engine} durationInFrames={s.engine} name="L2 技術の中身">
        <SceneFade duration={s.engine}>
          <L2Engine />
        </SceneFade>
      </Sequence>
      <Sequence from={starts.intro} durationInFrames={s.intro} name="L3 問いの宣言">
        <SceneFade duration={s.intro}>
          <L3Intro />
        </SceneFade>
      </Sequence>
      <Sequence from={starts.q1} durationInFrames={s.q1} name="L4 Q1">
        <SceneFade duration={s.q1}>
          <LQ1 />
        </SceneFade>
      </Sequence>
      <Sequence from={starts.q2} durationInFrames={s.q2} name="L5 Q2">
        <SceneFade duration={s.q2}>
          <LQ2 />
        </SceneFade>
      </Sequence>
      <Sequence from={starts.q3} durationInFrames={s.q3} name="L6 Q3">
        <SceneFade duration={s.q3}>
          <LQ3 />
        </SceneFade>
      </Sequence>
      <Sequence from={starts.answer} durationInFrames={s.answer} name="L7 答え">
        <SceneFade duration={s.answer}>
          <L7Answer />
        </SceneFade>
      </Sequence>
      <Sequence from={starts.cta} durationInFrames={s.cta} name="L8 CTA">
        <L8CTA />
      </Sequence>
      {/* 常設HUDフレーム（最前面・グローバル進行） */}
      <LuxFrame />
    </AbsoluteFill>
  );
};
