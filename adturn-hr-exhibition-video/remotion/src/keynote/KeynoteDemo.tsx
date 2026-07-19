import React, {useEffect, useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {FONT} from '../theme';
import {useHeadGeometry} from '../scenes/Head3D';
import {BRAIN_PARTS, makeCerebellumGeo, makeHemisphereGeo} from '../scenes/BrainGeo';

// ── キーノート風スタイルデモ(600f = 20s) ──
// 黒スタジオ / 巨大タイポグラフィ(1画面1メッセージ) / キーワードのみグラデーション /
// グロッシーな製品ライティングの頭部+カラフル脳=プロダクトヒーロー / ミニマルBGM

const WHITE = '#F5F5F7';
const GRAY = 'rgba(245,245,247,0.55)';
const GRAD = 'linear-gradient(100deg, #0A84FF 0%, #BF5AF2 50%, #FF375F 100%)';
const BG = '#000000';

const HEAD_IN = 300;
const OPEN_START = 368;
const OPEN_DUR = 55;

// ── 3D: グロッシーな頭部(フタ開き) ──
const KHead: React.FC<{geo: THREE.BufferGeometry}> = ({geo}) => {
  const frame = useCurrentFrame();
  const CUT = 0.85;
  const split = interpolate(frame, [OPEN_START, OPEN_START + OPEN_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const lid = split * 1.05;
  const lidLift = split * 0.16;
  const lidOpacity = interpolate(frame, [OPEN_START + OPEN_DUR, OPEN_START + OPEN_DUR + 30], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ターンテーブル(プロダクト撮影のように滑らかに)
  const yRot = -0.55 + frame / 480;
  const rootPos = new THREE.Vector3(0, -0.3, 0);
  const rootRot = new THREE.Euler(0.03, yRot, 0);
  const mRoot = new THREE.Matrix4().compose(rootPos, new THREE.Quaternion().setFromEuler(rootRot), new THREE.Vector3(1, 1, 1));
  const mHinge = new THREE.Matrix4().compose(
    new THREE.Vector3(0, CUT + lidLift, -0.55),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-lid, 0, 0)),
    new THREE.Vector3(1, 1, 1)
  );
  const mBack = new THREE.Matrix4().makeTranslation(0, -CUT, 0.55);
  const mLid = mRoot.clone().multiply(mHinge).multiply(mBack);
  const planeBottom = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT).applyMatrix4(mRoot);
  const planeTop = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CUT).applyMatrix4(mLid);

  const common = {
    color: new THREE.Color('#1A1A20'),
    roughness: 0.24,
    metalness: 0.9,
    emissive: new THREE.Color('#0A0A0E'),
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  };

  return (
    <group position={rootPos} rotation={rootRot}>
      <mesh geometry={geo}>
        <meshStandardMaterial {...common} clippingPlanes={[planeBottom]} />
      </mesh>
      {lidOpacity > 0 && (
        <group position={[0, CUT + lidLift, -0.55]} rotation={[-lid, 0, 0]}>
          <group position={[0, -CUT, 0.55]}>
            <mesh geometry={geo}>
              <meshStandardMaterial {...common} transparent opacity={lidOpacity} clippingPlanes={[planeTop]} />
            </mesh>
          </group>
        </group>
      )}
      <pointLight position={[0, 1.0, 0.3]} color="#FFFFFF" intensity={split * 22} distance={8} />
    </group>
  );
};

// ── 3D: カラフル脳=プロダクトヒーロー ──
const KBrain: React.FC = () => {
  const frame = useCurrentFrame();
  const riseStart = OPEN_START + 20;
  const geoL = useMemo(() => makeHemisphereGeo(0.0, true), []);
  const geoR = useMemo(() => makeHemisphereGeo(2.7, true), []);
  const geoC = useMemo(() => makeCerebellumGeo(true), []);
  const rise = interpolate(frame, [riseStart, riseStart + 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  if (frame < riseStart) return null;
  const y = 0.35 + rise * 1.3 + Math.sin(frame / 36) * 0.04;
  const s = (0.18 + rise * 0.44) * (1 + Math.sin(frame / 30) * 0.01);
  const mat = {vertexColors: true, roughness: 0.3, metalness: 0.15, emissiveIntensity: 0.3, emissive: new THREE.Color('#2A2040')};
  return (
    <group position={[0, y, 0.2]} scale={s} rotation={[0.14, frame / 88, 0.03]}>
      <mesh geometry={geoL} position={BRAIN_PARTS.left.position} rotation={BRAIN_PARTS.left.rotation}>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh geometry={geoR} position={BRAIN_PARTS.right.position} rotation={BRAIN_PARTS.right.rotation}>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh geometry={geoC} position={BRAIN_PARTS.cerebellum.position}>
        <meshStandardMaterial {...mat} />
      </mesh>
      <pointLight color="#FFFFFF" intensity={rise * 16} distance={7} />
    </group>
  );
};

const KCamera: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const z = interpolate(frame, [HEAD_IN, 600], [7.8, 6.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  useEffect(() => {
    camera.position.set(Math.sin(frame / 280) * 0.55, 0.7, z);
    camera.lookAt(0, 0.5, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

const KCanvas: React.FC = () => {
  const {width, height} = useVideoConfig();
  const geo = useHeadGeometry();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{antialias: true}}
      onCreated={(state: {gl: THREE.WebGLRenderer}) => {
        state.gl.localClippingEnabled = true;
      }}
      camera={{fov: 35, position: [0, 0.7, 7.8]}}
      style={{position: 'absolute', inset: 0}}
    >
      <KCamera />
      {/* スタジオライティング: 白キー+冷たいリム+バック */}
      <ambientLight intensity={0.32} color="#44444E" />
      <directionalLight position={[4, 5, 4]} intensity={4.6} color="#FFFFFF" />
      <directionalLight position={[-5, 3, -3]} intensity={5.0} color="#A0C4FF" />
      <directionalLight position={[0, 4, -6]} intensity={4.2} color="#FFFFFF" />
      {geo && <KHead geo={geo} />}
      <KBrain />
    </ThreeCanvas>
  );
};

// ── タイポビート(1画面1メッセージ) ──
const Beat: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < from || frame > to + 20) return null;
  const s = spring({frame: frame - from, fps, config: {damping: 22, stiffness: 80}});
  const out = interpolate(frame, [to - 14, to + 14], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        opacity: s * out,
        transform: `scale(${0.96 + s * 0.04})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const GradText: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <span style={{background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', ...style}}>
    {children}
  </span>
);

export const KeynoteDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [578, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const headIn = interpolate(frame, [HEAD_IN, HEAD_IN + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const floorGlow = interpolate(frame, [HEAD_IN + 20, HEAD_IN + 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lockup = interpolate(frame, [492, 524], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bgmVol = (f: number) =>
    interpolate(f, [0, 36, 560, 596], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: BG, fontFamily: FONT}}>
      <Audio src={staticFile('audio/bgm_keynote.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeOut}}>
        {/* 上からの薄いスポット */}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 46% at 50% 0%, rgba(255,255,255,0.07), transparent 70%)'}} />

        {/* ビート1: 世界初。 */}
        <Beat from={16} to={140}>
          <div style={{fontSize: 210, fontWeight: 900, color: WHITE, letterSpacing: '0.02em'}}>世界初。</div>
        </Beat>

        {/* ビート2: 宣言(本編S1と同一コピー) */}
        <Beat from={150} to={278}>
          <div>
            <div style={{fontSize: 64, fontWeight: 700, color: GRAY, letterSpacing: '0.06em'}}>トップパフォーマーの</div>
            <div style={{fontSize: 110, fontWeight: 900, color: WHITE, letterSpacing: '0.02em', marginTop: 22}}>
              脳を、AIに<GradText>転写</GradText>する。
            </div>
          </div>
        </Beat>

        {/* 3Dプロダクトステージ */}
        <AbsoluteFill style={{opacity: headIn}}>
          {/* 床の反射グロー */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 790,
              width: 900,
              height: 190,
              transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(160,180,255,0.13), transparent 70%)',
              opacity: floorGlow,
            }}
          />
          <KCanvas />
        </AbsoluteFill>

        {/* 最終ロックアップ */}
        {lockup > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 96, opacity: lockup}}>
            <div style={{fontSize: 58, fontWeight: 900, color: WHITE, letterSpacing: '0.14em', transform: `translateY(${(1 - lockup) * 20}px)`}}>
              デジブレ
            </div>
            <div style={{width: 220, height: 3, background: GRAD, borderRadius: 2, marginTop: 20, opacity: 0.9}} />
            <div style={{fontSize: 21, fontWeight: 500, color: GRAY, letterSpacing: '0.22em', marginTop: 20}}>
              オリジナルAIエンジン ｜ 世界初 ・ 特許出願中
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
