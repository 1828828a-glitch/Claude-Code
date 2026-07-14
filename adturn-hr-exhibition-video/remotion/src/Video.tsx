import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {LUX_SCENES, LUX_TOTAL_FRAMES} from './theme';
import {Scene1Tech} from './scenes/Scene1Tech';
import {Scene2Engine} from './scenes/Scene2Engine';
import {Scene3Intro} from './scenes/Scene3Intro';
import {Scene4Q1, Scene5Q2, Scene6Q3, QuestionProgress} from './scenes/SceneQuestions';
import {Scene7Answer} from './scenes/Scene7Answer';
import {Scene8CTA} from './scenes/Scene8CTA';
import {SceneMIntro, SceneMQ1, SceneMQ2, SceneMQ3, SceneMScope, SceneNoGen} from './scenes/SceneMarketing';

// 3D版もマーケティング編込みのフルタイムライン（LUX_SCENES: 4175f ≈ 139s）を使用
const SCENES = LUX_SCENES;
const TOTAL = LUX_TOTAL_FRAMES;

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

// 人事編 → 一般論は一行もない → マーケティング編 → 共通エンディング（各文は一度だけ）
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
  ['n8a', 2159], // S8 一般論は、一行もない。
  ['m0', 2298], // M1 例えば、マーケティング。（0.6sの間を置いて）
  ['m1', 2395], // M1 機会損失を可視化し打開策を出力（断言）
  ['m2', 2732], // M2 検索されたとき
  ['m3', 2912], // M3 営業で伝わる強み
  ['m4', 3107], // M4 見込み客
  ['m5', 3283], // M5 競合比較、検索導線、コンテンツ、AI検索。（速）
  ['m6', 3444], // M5 何を、どの順番で、どう直すべきか。（遅）
  ['m7', 3597], // M5 実行ロードマップまで。（着地）
  ['n8b', 3809], // S9 もう出せます
  ['n8c', 4025], // S9 デモはブースで
];

// 問いのセクション（人事Q・マーケQ）はBGMを絞って「余白」をつくる
const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.12, 0.12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
const bgmVolume = (f: number) => {
  const base = 0.3 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [TOTAL - 70, TOTAL - 5], [1, 0], {
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
      <Sequence from={starts.nogen} durationInFrames={s.nogen} name="S8 一般論は一行もない">
        <CrossFade duration={s.nogen}>
          <CameraDrift phase={49}>
            <SceneNoGen />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.mintro} durationInFrames={s.mintro} name="M1 例えば、マーケティング。">
        <CrossFade duration={s.mintro}>
          <CameraDrift phase={56}>
            <SceneMIntro />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.mq1} durationInFrames={s.mq1} name="M2 検索されたとき">
        <CrossFade duration={s.mq1}>
          <CameraDrift phase={63}>
            <SceneMQ1 />
            <QuestionProgress active={0} />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.mq2} durationInFrames={s.mq2} name="M3 営業で伝わる強み">
        <CrossFade duration={s.mq2}>
          <CameraDrift phase={70}>
            <SceneMQ2 />
            <QuestionProgress active={1} dark />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.mq3} durationInFrames={s.mq3} name="M4 見込み客">
        <CrossFade duration={s.mq3}>
          <CameraDrift phase={77}>
            <SceneMQ3 />
            <QuestionProgress active={2} />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.mscope} durationInFrames={s.mscope} name="M5 診断範囲→ロードマップ">
        <CrossFade duration={s.mscope}>
          <CameraDrift phase={84}>
            <SceneMScope />
          </CameraDrift>
        </CrossFade>
      </Sequence>
      <Sequence from={starts.cta} durationInFrames={s.cta} name="S9 CTA">
        <Scene8CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
