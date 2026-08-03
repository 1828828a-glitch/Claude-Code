import React from 'react';
import { Composition } from 'remotion';
import { HistoryVideo, totalFrames } from './Video';
import { VIDEO } from './theme';
import { demoScreenplay } from './screenplay/demo';

export const Root: React.FC = () => {
  return (
    <Composition
      id="HistoryVideo"
      component={HistoryVideo}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={totalFrames(demoScreenplay)}
      defaultProps={{ screenplay: demoScreenplay }}
      calculateMetadata={({ props }) => ({
        durationInFrames: totalFrames(props.screenplay),
      })}
    />
  );
};
