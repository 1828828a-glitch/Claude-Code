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
import {VaienceDemo} from './vaience/VaienceDemo';
import {PosterDemo} from './poster/PosterDemo';
import {NatGeoDemo} from './natgeo/NatGeoDemo';
import {WhiteDemo} from './white/WhiteDemo';
import {AdturnKineticVideo} from './kinetic/KineticVideo';
import {AdturnVaienceVideo} from './vaience/VaienceVideo';
import {AdturnNatGeoVideo} from './natgeo/NatGeoVideo';
import {AdturnWhiteVideo} from './white/WhiteVideo';
import {NeuroDemo} from './neuro/NeuroDemo';
import {NeuroPlateDemo} from './neuro/NeuroPlateDemo';
import {AdturnNeuroVideo} from './neuro/NeuroVideo';
import {AdturnOpeVideo} from './ope/OpeVideo';
import {AdturnSemVideo} from './sem/SemVideo';
import {AdturnReportVideo} from './report/ReportVideo';
import {OpeDemo} from './ope/OpeDemo';
import {SemDemo} from './sem/SemDemo';
import {KeynoteDemo} from './keynote/KeynoteDemo';
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
    {/* フル版: ニューロン・マイクロスコピー(Runwayプレート合成) */}
    <Composition id="AdturnNeuro" component={AdturnNeuroVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* レポート紹介動画(個社向け・90秒テンプレート) */}
    <Composition id="AdturnReport" component={AdturnReportVideo} durationInFrames={2700} fps={FPS} width={1920} height={1080} />
    {/* フル版: 脳移植オペレーション(Runwayプレート合成) */}
    <Composition id="AdturnOpe" component={AdturnOpeVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* フル版: 電子顕微鏡×論文図版(Runwayプレート合成) */}
    <Composition id="AdturnSem" component={AdturnSemVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* フル版: エディトリアル・キネティック */}
    <Composition id="AdturnKinetic" component={AdturnKineticVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* フル版: バイエンス風 */}
    <Composition id="AdturnVaience" component={AdturnVaienceVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* フル版: ナショジオ風ドキュメンタリー */}
    <Composition id="AdturnNatGeo" component={AdturnNatGeoVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* フル版: ホワイトスタジオ */}
    <Composition id="AdturnWhite" component={AdturnWhiteVideo} durationInFrames={V3D_TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* エディトリアル・キネティック(スイスポスター)スタイルデモ */}
    <Composition id="PosterDemo" component={PosterDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    {/* サイエンス3案デモ: ニューロン/オペ/電子顕微鏡 */}
    <Composition id="NeuroDemo" component={NeuroDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    <Composition id="NeuroPlateDemo" component={NeuroPlateDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    <Composition id="OpeDemo" component={OpeDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    <Composition id="SemDemo" component={SemDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    {/* ホワイトスタジオ スタイルデモ */}
    <Composition id="WhiteDemo" component={WhiteDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    {/* ナショジオ風ドキュメンタリー スタイルデモ */}
    <Composition id="NatGeoDemo" component={NatGeoDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    {/* バイエンス風スタイルデモ */}
    <Composition id="VaienceDemo" component={VaienceDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
    {/* キーノート風スタイルデモ */}
    <Composition id="KeynoteDemo" component={KeynoteDemo} durationInFrames={600} fps={FPS} width={1920} height={1080} />
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
