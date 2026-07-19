import React, {useEffect, useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {FONT} from '../theme';
import {useHeadGeometry} from '../scenes/Head3D';
import {BRAIN_PARTS, makeCerebellumGeo, makeHemisphereGeo} from '../scenes/BrainGeo';

// ── ホワイトスタジオ スタイルデモ(600f = 20s) ──
// 白ホリゾント+磁器の頭部+柔らかい影 / 黒の巨大タイポ / カラフル脳がプロダクトヒーロー /
// ライトモードのプレミアム(Apple白スタジオの製品写真イメージ)

export const W_INK = '#1D1D1F';
export const W_GRAY = 'rgba(29,29,31,0.55)';
export const W_GRAD = 'linear-gradient(100deg, #0A84FF 0%, #BF5AF2 50%, #FF375F 100%)';
export const W_BG = '#F4F4F6';
const INK = W_INK;
const GRAY = W_GRAY;
const GRAD = W_GRAD;
const BG = W_BG;

const HEAD_IN = 300;
const OPEN_START = 368;
const OPEN_DUR = 55;

// ── 3D: 磁器の頭部(フタ開き) ──
const WHead: React.FC<{geo: THREE.BufferGeometry; openStart?: number; openDur?: number}> = ({geo, openStart = OPEN_START, openDur = OPEN_DUR}) => {
  const frame = useCurrentFrame();
  const CUT = 0.85;
  const split = interpolate(frame, [openStart, openStart + openDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const lid = split * 1.05;
  const lidLift = split * 0.16;
  const lidOpacity = interpolate(frame, [openStart + openDur, openStart + openDur + 30], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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

  // 磁器: 白く滑らか、わずかに冷たい影
  const common = {
    color: new THREE.Color('#EDEDF0'),
    roughness: 0.34,
    metalness: 0.05,
    emissive: new THREE.Color('#3A3A40'),
    emissiveIntensity: 0.12,
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
    </group>
  );
};

// ── 3D: カラフル脳(白の上で最も映える) ──
const WBrain: React.FC<{riseStart?: number}> = ({riseStart = OPEN_START + 20}) => {
  const frame = useCurrentFrame();
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
  const mat = {vertexColors: true, roughness: 0.34, metalness: 0.08, emissiveIntensity: 0.12, emissive: new THREE.Color('#332A44')};
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
    </group>
  );
};

const WCamera: React.FC<{from?: number; dur?: number}> = ({from = HEAD_IN, dur = 600}) => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const z = interpolate(frame, [from, dur], [7.8, 6.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  useEffect(() => {
    camera.position.set(Math.sin(frame / 280) * 0.55, 0.7, z);
    camera.lookAt(0, 0.5, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

export const WCanvas: React.FC<{openStart?: number; openDur?: number; camFrom?: number; dur?: number}> = ({
  openStart = OPEN_START,
  openDur = OPEN_DUR,
  camFrom = HEAD_IN,
  dur = 600,
}) => {
  const {width, height} = useVideoConfig();
  const geo = useHeadGeometry();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{antialias: true, alpha: true}}
      onCreated={(state: {gl: THREE.WebGLRenderer}) => {
        state.gl.localClippingEnabled = true;
        state.gl.setClearColor(0x000000, 0);
      }}
      camera={{fov: 35, position: [0, 0.7, 7.8]}}
      style={{position: 'absolute', inset: 0}}
    >
      <WCamera from={camFrom} dur={dur} />
      {/* 白ホリ撮影: 大きく柔らかい光+薄い冷色フィル */}
      <ambientLight intensity={1.15} color="#FFFFFF" />
      <directionalLight position={[4, 6, 4]} intensity={2.6} color="#FFFFFF" />
      <directionalLight position={[-5, 3, 2]} intensity={1.1} color="#DCE4F2" />
      <directionalLight position={[0, 3, -6]} intensity={1.6} color="#FFFFFF" />
      {geo && <WHead geo={geo} openStart={openStart} openDur={openDur} />}
      <WBrain riseStart={openStart + 20} />
    </ThreeCanvas>
  );
};

// ── タイポビート ──
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

export const GradText: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{children}</span>
);

export const WhiteDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [578, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const headIn = interpolate(frame, [HEAD_IN, HEAD_IN + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shadow = interpolate(frame, [HEAD_IN + 15, HEAD_IN + 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
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
        {/* 白ホリの奥行き(上が少し明るい) */}
        <AbsoluteFill style={{background: 'linear-gradient(to bottom, #FBFBFC 0%, #F4F4F6 45%, #E9E9EE 100%)'}} />

        <div style={{position: 'absolute', top: 60, left: 84, fontSize: 19, fontWeight: 700, color: GRAY, letterSpacing: '0.4em'}}>
          ADTURN ── 新発表
        </div>
        <div style={{position: 'absolute', top: 60, right: 84, fontSize: 19, fontWeight: 700, color: GRAY, letterSpacing: '0.3em'}}>
          特許出願中
        </div>

        {/* ビート1: 世界初。 */}
        <Beat from={16} to={140}>
          <div style={{fontSize: 210, fontWeight: 900, color: INK, letterSpacing: '0.02em'}}>世界初。</div>
        </Beat>

        {/* ビート2: 宣言 */}
        <Beat from={150} to={278}>
          <div>
            <div style={{fontSize: 64, fontWeight: 700, color: GRAY, letterSpacing: '0.06em'}}>トップパフォーマーの</div>
            <div style={{fontSize: 110, fontWeight: 900, color: INK, letterSpacing: '0.02em', marginTop: 22}}>
              脳を、AIに<GradText>転写</GradText>する。
            </div>
          </div>
        </Beat>

        {/* 3Dプロダクトステージ */}
        <AbsoluteFill style={{opacity: headIn}}>
          {/* 接地影 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 892,
              width: 850,
              height: 130,
              transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(29,29,31,0.3), transparent 70%)',
              filter: 'blur(6px)',
              opacity: shadow,
            }}
          />
          <WCanvas />
        </AbsoluteFill>

        {/* 最終ロックアップ */}
        {lockup > 0 && (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 96, opacity: lockup}}>
            <div style={{fontSize: 58, fontWeight: 900, color: INK, letterSpacing: '0.14em', transform: `translateY(${(1 - lockup) * 20}px)`}}>
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
