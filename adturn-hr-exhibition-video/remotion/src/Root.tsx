import React from 'react';
import {Composition} from 'remotion';
import {AdturnVideo} from './Video';
import {CollageDemo} from './collage/CollageDemo';
import {AdturnCollageVideo} from './CollageVideo';
import {FPS, TOTAL_FRAMES} from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="AdturnForHR"
      component={AdturnVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
    {/* 紙コラージュ表現のスタイルデモ */}
    <Composition id="CollageDemo" component={CollageDemo} durationInFrames={360} fps={FPS} width={1920} height={1080} />
    {/* 本編の紙コラージュ版 */}
    <Composition
      id="AdturnCollage"
      component={AdturnCollageVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
