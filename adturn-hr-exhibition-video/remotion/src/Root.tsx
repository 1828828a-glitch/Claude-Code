import React from 'react';
import {Composition} from 'remotion';
import {AdturnVideo} from './Video';
import {FPS, TOTAL_FRAMES} from './theme';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AdturnForHR"
    component={AdturnVideo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
