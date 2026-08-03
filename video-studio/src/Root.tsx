import React from 'react';
import { Composition } from 'remotion';
import { HistoryVideo, totalFrames } from './Video';
import { VIDEO } from './theme';
import { demoScreenplay } from './screenplay/demo';
import { engagementScreenplay } from './screenplay/engagement';
import { teireiScreenplay } from './screenplay/teirei';
import { Screenplay } from './screenplay/types';

const compositionFor = (id: string, screenplay: Screenplay) => (
  <Composition
    id={id}
    component={HistoryVideo}
    width={VIDEO.width}
    height={VIDEO.height}
    fps={VIDEO.fps}
    durationInFrames={totalFrames(screenplay)}
    defaultProps={{ screenplay }}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames(props.screenplay),
    })}
  />
);

export const Root: React.FC = () => {
  return (
    <>
      {compositionFor('HistoryVideo', demoScreenplay)}
      {compositionFor('EngagementVideo', engagementScreenplay)}
      {compositionFor('TeireiVideo', teireiScreenplay)}
    </>
  );
};
