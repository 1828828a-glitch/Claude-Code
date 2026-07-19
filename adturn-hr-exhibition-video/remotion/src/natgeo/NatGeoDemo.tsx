import React, {useEffect, useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {useHeadGeometry} from '../scenes/Head3D';
import {BRAIN_PARTS, makeCerebellumGeo, makeHemisphereGeo} from '../scenes/BrainGeo';

// ── ナショジオ風ドキュメンタリー スタイルデモ(600f = 20s) ──
// レターボックス+フィルムグレイン / 琥珀色の光の黒曜石頭部+金の脳 /
// 生物図鑑的な注釈ラベル(和名+学名風スモールキャップス) / セリフ体見出し / 弦楽ドキュメンタリー劇伴

const SERIF = "'Noto Serif CJK JP', 'Noto Serif JP', serif";
const SANS = "'Noto Sans CJK JP', 'Noto Sans JP', sans-serif";
const AMBER = '#E8A34C';
const CREAM = '#F4E8D8';
const DIM = 'rgba(244,232,216,0.55)';
const BG = '#050403';
const BAR = 132; // レターボックス

const OPEN_START = 250;
const OPEN_DUR = 60;

// ── 3D: 黒曜石の頭部(フタ開き) ──
const GHead: React.FC<{geo: THREE.BufferGeometry}> = ({geo}) => {
  const frame = useCurrentFrame();
  const CUT = 0.85;
  const split = interpolate(frame, [OPEN_START, OPEN_START + OPEN_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const lid = split * 1.05;
  const lidLift = split * 0.16;
  const lidOpacity = interpolate(frame, [OPEN_START + OPEN_DUR, OPEN_START + OPEN_DUR + 32], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yRot = -0.46 + frame / 600;
  const rootPos = new THREE.Vector3(0, -0.32, 0);
  const rootRot = new THREE.Euler(0.04, yRot, 0);
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
    color: new THREE.Color('#211A13'),
    roughness: 0.34,
    metalness: 0.68,
    emissive: new THREE.Color('#140E08'),
    emissiveIntensity: 0.4,
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
      <pointLight position={[0, 1.0, 0.2]} color="#FFD9A0" intensity={split * 30} distance={9} />
    </group>
  );
};

// ── 3D: 金の脳 ──
const GBrain: React.FC = () => {
  const frame = useCurrentFrame();
  const riseStart = OPEN_START + 22;
  const geoL = useMemo(() => makeHemisphereGeo(0.0), []);
  const geoR = useMemo(() => makeHemisphereGeo(2.7), []);
  const geoC = useMemo(() => makeCerebellumGeo(), []);
  const rise = interpolate(frame, [riseStart, riseStart + 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  if (frame < riseStart) return null;
  const y = 0.35 + rise * 1.18 + Math.sin(frame / 34) * 0.05;
  const s = (0.18 + rise * 0.52) * (1 + Math.sin(frame / 28) * 0.012);
  const gold = {
    color: new THREE.Color('#C9A45C'),
    metalness: 0.85,
    roughness: 0.32,
    emissive: new THREE.Color('#4A3B1C'),
    emissiveIntensity: 0.5,
  };
  return (
    <group position={[0, y, 0.2]} scale={s} rotation={[0.15, frame / 92, 0.04]}>
      <mesh geometry={geoL} position={BRAIN_PARTS.left.position} rotation={BRAIN_PARTS.left.rotation}>
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh geometry={geoR} position={BRAIN_PARTS.right.position} rotation={BRAIN_PARTS.right.rotation}>
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh geometry={geoC} position={BRAIN_PARTS.cerebellum.position}>
        <meshStandardMaterial {...gold} />
      </mesh>
      <pointLight color="#FFD9A0" intensity={rise * 18} distance={7} />
    </group>
  );
};

// ── 3D: 漂う塵(逆光に浮かぶドキュメンタリーの空気感) ──
const DUST_COUNT = 160;
const Dust: React.FC = () => {
  const frame = useCurrentFrame();
  const positions = useMemo(() => new Float32Array(DUST_COUNT * 3), []);
  const geoRef = React.useRef<THREE.BufferGeometry>(null);
  for (let i = 0; i < DUST_COUNT; i++) {
    const sx = (random(`dx${i}`) - 0.5) * 9;
    const sy = (random(`dy${i}`) - 0.5) * 5 + 0.5;
    const sz = (random(`dz${i}`) - 0.5) * 4;
    positions[i * 3] = sx + Math.sin(frame / 90 + i * 1.7) * 0.22;
    positions[i * 3 + 1] = sy + Math.sin(frame / 120 + i * 2.3) * 0.16 + frame * 0.0006 * (random(`dv${i}`) - 0.3);
    positions[i * 3 + 2] = sz;
  }
  useEffect(() => {
    if (geoRef.current) geoRef.current.attributes.position.needsUpdate = true;
  });
  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#FFC880" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

const GCamera: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const z = interpolate(frame, [0, 600], [8.8, 6.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  useEffect(() => {
    camera.position.set(Math.sin(frame / 340) * 0.4 - 0.2, 0.66 + Math.sin(frame / 260) * 0.05, z);
    camera.lookAt(0, 0.5, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

const GCanvas: React.FC = () => {
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
      camera={{fov: 35, position: [-0.2, 0.66, 8.8]}}
      style={{position: 'absolute', inset: 0}}
    >
      <GCamera />
      {/* 夕陽のような琥珀の逆光+わずかな冷色のフィル */}
      <ambientLight intensity={0.2} color="#4A3A28" />
      <directionalLight position={[6, 3, 2]} intensity={5.2} color="#FFB35C" />
      <directionalLight position={[-4, 2, -4]} intensity={2.4} color="#FF8E3C" />
      <directionalLight position={[-3, 3, 5]} intensity={0.5} color="#7A8CB8" />
      {geo && <GHead geo={geo} />}
      <GBrain />
      <Dust />
    </ThreeCanvas>
  );
};

// ── フィルムルック: レターボックス+グレイン+ビネット ──
const FilmChrome: React.FC = () => {
  const frame = useCurrentFrame();
  const gx = Math.floor(random(`gx${frame}`) * 240);
  const gy = Math.floor(random(`gy${frame}`) * 240);
  const boot = interpolate(frame, [6, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      {/* 暖色ビネット */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 105% 85% at 50% 44%, transparent 48%, rgba(0,0,0,0.66) 100%)'}} />
      {/* グレイン */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('img/grain_tile.png')})`,
          backgroundPosition: `${gx}px ${gy}px`,
          mixBlendMode: 'overlay',
          opacity: 0.45,
        }}
      />
      {/* レターボックス */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: BAR, background: '#000'}} />
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: BAR, background: '#000'}} />
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          right: 84,
          fontFamily: SANS,
          fontSize: 15,
          fontWeight: 500,
          color: 'rgba(244,232,216,0.4)',
          letterSpacing: '0.4em',
        }}
      >
        ADTANK GP ─── EXHIBITION FILM
      </div>
      <div
        style={{
          position: 'absolute',
          top: 52,
          left: 84,
          fontFamily: SANS,
          fontSize: 15,
          fontWeight: 500,
          color: 'rgba(244,232,216,0.4)',
          letterSpacing: '0.4em',
          opacity: boot,
        }}
      >
        THE MIND, TRANSCRIBED ── 第一章
      </div>
    </>
  );
};

// ── 図鑑的ロウワーサード(和名+学名風) ──
const LowerThird: React.FC<{at: number; out: number; jp: string; en: string}> = ({at, out, jp, en}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const o = interpolate(frame, [out, out + 20], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (p <= 0 || o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 96, bottom: BAR + 56, opacity: p * o}}>
      <div style={{width: 46, height: 3, background: AMBER, marginBottom: 14, transform: `scaleX(${p})`, transformOrigin: 'left'}} />
      <div style={{fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: CREAM, letterSpacing: '0.12em'}}>{jp}</div>
      <div style={{fontFamily: SANS, fontSize: 16, fontWeight: 500, color: DIM, letterSpacing: '0.34em', marginTop: 8}}>{en}</div>
    </div>
  );
};

// ── 脳への注釈ラベル(図鑑の引き出し線) ──
const Annotation: React.FC<{at: number; x1: number; y1: number; x2: number; y2: number; side: 'left' | 'right'; jp: string; en: string}> = ({
  at,
  x1,
  y1,
  x2,
  y2,
  side,
  jp,
  en,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (p <= 0) return null;
  const mx = x1 + (x2 - x1) * Math.min(1, p * 1.5);
  const my = y1 + (y2 - y1) * Math.min(1, p * 1.5);
  return (
    <>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
        <circle cx={x1} cy={y1} r={4.5} fill="none" stroke={AMBER} strokeWidth={1.4} opacity={p} />
        <circle cx={x1} cy={y1} r={1.8} fill={AMBER} opacity={p} />
        <line x1={x1} y1={y1} x2={mx} y2={my} stroke="rgba(244,232,216,0.55)" strokeWidth={1.2} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: side === 'right' ? x2 + 14 : undefined,
          right: side === 'left' ? 1920 - x2 + 14 : undefined,
          top: y2 - 24,
          textAlign: side === 'left' ? 'right' : 'left',
          opacity: interpolate(frame, [at + 12, at + 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        <div style={{fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: CREAM, letterSpacing: '0.1em', whiteSpace: 'nowrap'}}>{jp}</div>
        <div style={{fontFamily: SANS, fontSize: 14, fontWeight: 500, color: DIM, letterSpacing: '0.3em', marginTop: 5, whiteSpace: 'nowrap'}}>{en}</div>
      </div>
    </>
  );
};

// ── 見出し(セリフ体) ──
const GText: React.FC = () => {
  const frame = useCurrentFrame();
  const t1 = interpolate(frame, [46, 76], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t2 = interpolate(frame, [76, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(frame, [200, 232], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t3 = interpolate(frame, [478, 512], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {out1 > 0 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingBottom: 40, opacity: out1}}>
          <div style={{fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: DIM, letterSpacing: '0.34em', opacity: t1, transform: `translateY(${(1 - t1) * 18}px)`}}>
            トップパフォーマーの
          </div>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 92,
              fontWeight: 900,
              color: CREAM,
              letterSpacing: '0.14em',
              marginTop: 26,
              opacity: t2,
              transform: `translateY(${(1 - t2) * 24}px)`,
              textShadow: '0 2px 60px rgba(0,0,0,0.8)',
            }}
          >
            脳を、AIに<span style={{color: AMBER}}>転写</span>する。
          </div>
        </AbsoluteFill>
      )}
      {t3 > 0 && (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: BAR + 62, opacity: t3}}>
          <div style={{fontFamily: SERIF, fontSize: 62, fontWeight: 900, color: CREAM, letterSpacing: '0.12em', transform: `translateY(${(1 - t3) * 20}px)`}}>
            世界初のAIエンジン──<span style={{color: AMBER}}>デジブレ</span>。
          </div>
          <div style={{fontFamily: SANS, fontSize: 19, fontWeight: 500, color: DIM, letterSpacing: '0.4em', marginTop: 20}}>
            ORIGINAL AI ENGINE ／ 特許出願中 ／ ADTURN
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const NatGeoDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [576, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bgmVol = (f: number) =>
    interpolate(f, [0, 30, 560, 596], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: BG}}>
      <Audio src={staticFile('audio/bgm_natgeo.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeIn * fadeOut}}>
        <GCanvas />
        {/* 図鑑ラベル: 被写体紹介 → 脳の注釈 */}
        <LowerThird at={150} out={236} jp="トップパフォーマー" en="THE TOP ONE PERCENT ── OBSERVED" />
        <Annotation at={370} x1={905} y1={300} x2={640} y2={222} side="left" jp="意思決定の基準" en="DECISION LOGIC" />
        <Annotation at={396} x1={1010} y1={330} x2={1290} y2={260} side="right" jp="言語化されない経験則" en="TACIT HEURISTICS" />
        <GText />
        <FilmChrome />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
