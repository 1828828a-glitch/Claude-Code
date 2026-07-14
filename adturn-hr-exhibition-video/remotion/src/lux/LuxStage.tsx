import React, {useEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {useBrainTexture, useHeadGeometry} from '../scenes/Head3D';
import {LuxBrain, LuxHead} from './LuxDemo';

// ── 常設3Dステージ（全編通し） ──
// 参考動画と同じく、単一のオブジェクト（黒曜石の頭部＋浮遊する脳）が
// 全編まわり続け、シーンごとにカメラと明度だけが変わる。
// シーン境界（グローバルフレーム）: L1 0 / L2 315 / L3 715 / Q1 905 / Q2 1155 / Q3 1450 /
// L7 1690 / L8(一般論) 2150 / M1 2280 / MQ 2720-3275 / M5 3275 / L9 3795-4175

const T = 45; // シーン間のカメラ遷移フレーム数

// [フレーム, 頭部Xオフセット, カメラz, 不透明度]
// Xオフセットが正 → 頭部は画面右に寄る（カメラは常に原点注視）
const WAYPOINTS: Array<[number, number, number, number]> = [
  [0, 0, 7.6, 1], // L1 センター
  [140, 0, 6.6, 1],
  [315, 0, 7.0, 1],
  [315 + T, 1.55, 6.6, 0.95], // L2前半 右側=標本
  [555, 1.55, 6.6, 0.95],
  [555 + 30, 0, 8.6, 0.3], // L2後半 奥へ沈む
  [715, 0, 8.6, 0.3],
  [715 + T, 0, 10.2, 0.26], // L3 小さくセンター
  [905, 0, 10.2, 0.26],
  [905 + T, 2.6, 9.8, 0.17], // Q1-Q3 右奥にゴースト
  [1690, 2.6, 9.8, 0.17],
  [1690 + T, 0, 10.6, 0.24], // L7 センター奥
  [2150, 0, 10.6, 0.24],
  [2150 + T, 2.3, 10.5, 0.22], // L8 一般論: 右奥（書面の反対）
  [2280, 2.3, 10.5, 0.22],
  [2280 + T, 0, 10.4, 0.24], // M1 例えば、マーケティング。: センター奥
  [2720, 0, 10.4, 0.24],
  [2720 + T, 2.6, 9.8, 0.17], // MQ1-3 右奥にゴースト
  [3275, 2.6, 9.8, 0.17],
  [3275 + T, 0, 10.8, 0.2], // M5 診断範囲: センター遠景
  [3795, 0, 10.8, 0.2],
  [3795 + T, 2.3, 10.5, 0.22], // L9前半 もう出せます: 右奥
  [4020, 2.3, 10.5, 0.22],
  [4020 + T, 0, 9.8, 0.32], // エンドカード センター奥
  [4175, 0, 10.0, 0.32],
];

const track = (frame: number, idx: 1 | 2 | 3) => {
  const xs = WAYPOINTS.map((w) => w[0]);
  const ys = WAYPOINTS.map((w) => w[idx]);
  return interpolate(frame, xs, ys, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t),
  });
};

const StageCamera: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const z = track(frame, 2);
  useEffect(() => {
    camera.position.set(Math.sin(frame / 260) * 0.3, 0.65, z);
    camera.lookAt(0, 0.45, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

export const LuxStage: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const geo = useHeadGeometry();
  const brainTex = useBrainTexture();
  const opacity = track(frame, 3) * interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{opacity}}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{antialias: true}}
        onCreated={(state: {gl: THREE.WebGLRenderer}) => {
          state.gl.localClippingEnabled = true;
        }}
        camera={{fov: 35, position: [0, 0.65, 7.6]}}
        style={{position: 'absolute', inset: 0}}
      >
        <StageCamera />
        <ambientLight intensity={0.5} color="#5F6C86" />
        <directionalLight position={[5, 4, 3]} intensity={3.4} color="#FFD9A0" />
        <directionalLight position={[-5, 2, -1]} intensity={1.4} color="#6E86C4" />
        <directionalLight position={[0, 3, -5]} intensity={2.2} color="#8FA6D8" />
        {geo && <LuxHead geo={geo} openStart={62} openDur={50} xOff={track(frame, 1)} />}
        <group position={[track(frame, 1), 0, 0]}>
          {brainTex && <LuxBrain tex={brainTex} riseStart={82} />}
        </group>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
