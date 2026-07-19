import React from 'react';
import {Composition} from 'remotion';
import {AdturnVideo} from './Video';
import {CollageDemo} from './collage/CollageDemo';
import {AdturnCollageVideo} from './CollageVideo';
import {LuxDemo} from './lux/LuxDemo';
import {AdturnLuxVideo} from './LuxVideo';
import {AdturnCinemaVideo} from './cinema/CinemaVideo';
import {AdturnAtlasVideo} from './atlas/AtlasVideo';
import {AdturnCosmosVideo} from './cosmos/CosmosVideo';
import {FPS, LUX_TOTAL_FRAMES, TOTAL_FRAMES, V3D_TOTAL_FRAMES} from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    {/* 3D版（人事編＋マーケティング編＋デジブレフィナーレのフル構成） */}
    <Composition
      id="AdturnForHR"
      component={AdturnVideo}
      durationInFrames={V3D_TOTAL_FRAMES}
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
    {/* ① NatGeoシネマ版 */}
    <Composition id="AdturnCinema" component={AdturnCinemaVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* ③ 解剖図鑑版 */}
    <Composition id="AdturnAtlas" component={AdturnAtlasVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* ⑤ Cosmos版 */}
    <Composition id="AdturnCosmos" component={AdturnCosmosVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* ラグジュアリー「プロダクト・ラボ」スタイルデモ（高見え路線） */}
    <Composition id="LuxDemo" component={LuxDemo} durationInFrames={450} fps={FPS} width={1920} height={1080} />
    {/* 本編のラグジュアリー版（人事編＋マーケティング編） */}
    <Composition
      id="AdturnLux"
      component={AdturnLuxVideo}
      durationInFrames={LUX_TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
