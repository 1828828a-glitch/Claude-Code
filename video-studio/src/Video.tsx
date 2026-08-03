import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Scene, Screenplay, sceneDurationSec, screenplaySchema } from './screenplay/types';
import { VIDEO } from './theme';
import { TitleScene } from './components/scenes/TitleScene';
import { YearScene } from './components/scenes/YearScene';
import { CharacterScene } from './components/scenes/CharacterScene';
import { LineupScene } from './components/scenes/LineupScene';
import { MapScene } from './components/scenes/MapScene';
import { TimelineScene } from './components/scenes/TimelineScene';
import { StatScene } from './components/scenes/StatScene';
import { TextScene } from './components/scenes/TextScene';
import { ImageScene } from './components/scenes/ImageScene';
import { OutroScene } from './components/scenes/OutroScene';

export const TRANSITION_FRAMES = 12;

export const sceneFrames = (scene: Scene): number =>
  Math.round(sceneDurationSec(scene) * VIDEO.fps);

// 合計尺 = 各シーン尺の和 - トランジションの重なり
export const totalFrames = (screenplay: Screenplay): number => {
  const parsed = screenplaySchema.parse(screenplay);
  const sum = parsed.scenes.reduce((acc, s) => acc + sceneFrames(s), 0);
  return sum - TRANSITION_FRAMES * (parsed.scenes.length - 1);
};

const SceneSwitch: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case 'title':
      return <TitleScene {...scene} />;
    case 'year':
      return <YearScene {...scene} />;
    case 'character':
      return <CharacterScene {...scene} />;
    case 'lineup':
      return <LineupScene {...scene} />;
    case 'map':
      return <MapScene {...scene} />;
    case 'timeline':
      return <TimelineScene {...scene} />;
    case 'stat':
      return <StatScene {...scene} />;
    case 'text':
      return <TextScene {...scene} />;
    case 'image':
      return <ImageScene {...scene} />;
    case 'outro':
      return <OutroScene {...scene} />;
  }
};

export const HistoryVideo: React.FC<{ screenplay: Screenplay }> = ({ screenplay }) => {
  // zodでデフォルト値を補完(mood等)
  const parsed = screenplaySchema.parse(screenplay);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>
        {parsed.scenes.map((scene, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={sceneFrames(scene)}>
              <SceneSwitch scene={scene} />
            </TransitionSeries.Sequence>
            {i < parsed.scenes.length - 1 ? (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            ) : null}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
