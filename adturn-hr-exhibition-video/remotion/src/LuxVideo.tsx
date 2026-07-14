import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {LUX_SCENES, LUX_TOTAL_FRAMES} from './theme';
import {LUX_BG, LuxBackdrop} from './lux/LuxDemo';
import {
  L1Tech,
  L2Engine,
  L3Intro,
  L7Answer,
  L8CTA,
  LM1,
  LM2,
  LM3,
  LMIntro,
  LMScope,
  LNoGen,
  LQ1,
  LQ2,
  LQ3,
  LuxFrame,
} from './lux/LuxScenes';
import {LuxStage} from './lux/LuxStage';

// 人事編 → 一般論は一行もない → マーケティング編 → 共通エンディング（各文は一度だけ）
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
  ['n8a', 2159], // L8 一般論は、一行もない。
  ['m0', 2298], // M1 例えば、マーケティング。（0.6sの間を置いて）
  ['m1', 2395], // M1 機会損失を可視化し打開策を出力（断言）
  ['m2', 2732], // M2 検索されたとき
  ['m3', 2912], // M3 営業で伝わる強み
  ['m4', 3107], // M4 見込み客
  ['m5', 3283], // M5 競合比較、検索導線、コンテンツ、AI検索。（速）
  ['m6', 3444], // M5 何を、どの順番で、どう直すべきか。（遅）
  ['m7', 3597], // M5 実行ロードマップまで。（着地）
  ['n8b', 3809], // L9 もう出せます
  ['n8c', 4025], // L9 デモはブースで
];

// 問いのセクション（人事Q・マーケQ）はBGMを絞って「余白」をつくる
const duckWin = (f: number, s: number, e: number) =>
  interpolate(f, [s - 30, s + 30, e - 30, e + 30], [0, 0.12, 0.12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
const bgmVolume = (f: number) => {
  const base = 0.3 - duckWin(f, 715, 1690) - duckWin(f, 2720, 3275);
  const endFade = interpolate(f, [LUX_TOTAL_FRAMES - 70, LUX_TOTAL_FRAMES - 5], [1, 0], {
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

const SCENE_COMPONENTS: Array<[keyof typeof LUX_SCENES, string, React.FC]> = [
  ['tech', 'L1 技術宣言', L1Tech],
  ['engine', 'L2 技術の中身', L2Engine],
  ['intro', 'L3 例えば、採用。', L3Intro],
  ['q1', 'L4 Q1', LQ1],
  ['q2', 'L5 Q2', LQ2],
  ['q3', 'L6 Q3', LQ3],
  ['answer', 'L7 答え', L7Answer],
  ['nogen', 'L8 一般論は一行もない', LNoGen],
  ['mintro', 'M1 例えば、マーケティング。', LMIntro],
  ['mq1', 'M2 検索されたとき', LM1],
  ['mq2', 'M3 営業で伝わる強み', LM2],
  ['mq3', 'M4 見込み客', LM3],
  ['mscope', 'M5 診断範囲→ロードマップ', LMScope],
];

export const AdturnLuxVideo: React.FC = () => {
  const s = LUX_SCENES;
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
      {/* 常設3Dステージ: 頭部＋脳が全編まわり続け、シーンごとにカメラと明度が変わる */}
      <LuxStage />
      {SCENE_COMPONENTS.map(([key, name, Comp]) => (
        <Sequence key={key} from={starts[key]} durationInFrames={s[key]} name={name}>
          <SceneFade duration={s[key]}>
            <Comp />
          </SceneFade>
        </Sequence>
      ))}
      <Sequence from={starts.cta} durationInFrames={s.cta} name="L9 CTA">
        <L8CTA />
      </Sequence>
      {/* 常設HUDフレーム（最前面・グローバル進行） */}
      <LuxFrame />
    </AbsoluteFill>
  );
};
