import React, {useEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';

// ── モデル読み込み（Draco圧縮GLB） ──
let headGeoPromise: Promise<THREE.BufferGeometry> | null = null;
const loadHeadGeometry = (): Promise<THREE.BufferGeometry> => {
  if (!headGeoPromise) {
    headGeoPromise = new Promise((resolve, reject) => {
      const draco = new DRACOLoader();
      draco.setDecoderPath(staticFile('draco') + '/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);
      loader.load(
        staticFile('models/head.glb'),
        (gltf) => {
          let geo: THREE.BufferGeometry | null = null;
          gltf.scene.traverse((o) => {
            if (!geo && (o as THREE.Mesh).isMesh) {
              geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry;
            }
          });
          if (geo) {
            const g = geo as THREE.BufferGeometry;
            g.computeVertexNormals();
            // 正規化: 中心を原点に、高さ3ユニットへスケール
            g.center();
            g.computeBoundingBox();
            const bb = g.boundingBox!;
            const h = bb.max.y - bb.min.y;
            const s = 3 / h;
            g.scale(s, s, s);
            resolve(g);
          } else {
            reject(new Error('no mesh in head.glb'));
          }
        },
        undefined,
        reject
      );
    });
  }
  return headGeoPromise;
};

const useHeadGeometry = () => {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);
  const [handle] = useState(() => delayRender('loading head.glb'));
  useEffect(() => {
    let mounted = true;
    loadHeadGeometry()
      .then((g) => {
        if (mounted) {
          setGeo(g);
          continueRender(handle);
        }
      })
      .catch((e) => cancelRender(e));
    return () => {
      mounted = false;
    };
  }, [handle]);
  return geo;
};

// ── 暗黙知パーティクル（頭の中から立ち上り、リングへ吸い込まれる） ──
const KNOWLEDGE_COUNT = 600;
const RING_POS = new THREE.Vector3(2.45, 1.3, 0);

const KnowledgeStream: React.FC<{start: number; strength: number}> = ({start, strength}) => {
  const frame = useCurrentFrame();
  const positions = useMemo(() => new Float32Array(KNOWLEDGE_COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(KNOWLEDGE_COUNT * 3), []);
  const geoRef = React.useRef<THREE.BufferGeometry>(null);

  const cA = new THREE.Color('#8B5CF6');
  const cB = new THREE.Color('#4353FF');
  const cC = new THREE.Color('#F0ABFC');

  for (let i = 0; i < KNOWLEDGE_COUNT; i++) {
    const seedT = random(`k${i}`); // 出発タイミング
    const life = 90 + random(`l${i}`) * 80; // 移動時間
    const t0 = start + seedT * 150;
    const p = Math.min(Math.max((frame - t0) / life, 0), 1);
    // 頭内部の出発点
    const sx = (random(`sx${i}`) - 0.5) * 0.7;
    const sy = 0.5 + random(`sy${i}`) * 0.5;
    const sz = (random(`sz${i}`) - 0.5) * 0.7;
    // 螺旋を描きながらリングへ
    const swirl = 5 * Math.PI * p * (0.5 + random(`sw${i}`) * 0.7);
    const rad = (1 - p) * (0.5 + random(`r${i}`) * 0.6);
    const ease = p * p * (3 - 2 * p);
    const x = sx + (RING_POS.x - sx) * ease + Math.cos(swirl) * rad * 0.45;
    const y = sy + (RING_POS.y - sy) * ease + p * (1 - p) * 1.8 + Math.sin(swirl) * rad * 0.25;
    const z = sz + (RING_POS.z - sz) * ease + Math.sin(swirl) * rad * 0.45;
    const alive = p > 0 && p < 1;
    // 非表示の粒は遠方へ退避（黒点としてDOM合成されるのを防ぐ）
    positions[i * 3] = alive ? x : 0;
    positions[i * 3 + 1] = alive ? y : -9999;
    positions[i * 3 + 2] = alive ? z : 0;
    const c = random(`c${i}`) < 0.15 ? cC : random(`c2${i}`) < 0.5 ? cA : cB;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.attributes.position.needsUpdate = true;
      geoRef.current.attributes.color.needsUpdate = true;
    }
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.95 * strength}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// ── デジブレリング（吸い込み先の輪） ──
const DigibreRing: React.FC<{appear: number}> = ({appear}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - appear, fps, config: {damping: 16, stiffness: 60}});
  const rot = frame / 40;
  const sc = Math.min(s, 1.05);
  return (
    <group position={RING_POS.toArray()} scale={sc}>
      <mesh rotation={[0.35, rot * 0.25, 0.08]}>
        <torusGeometry args={[0.62, 0.06, 32, 100]} />
        <meshBasicMaterial color="#7A5CFF" />
      </mesh>
      <mesh rotation={[0.35, rot * 0.25, 0.08]} scale={1.1}>
        <torusGeometry args={[0.62, 0.035, 32, 100]} />
        <meshBasicMaterial color="#B9AFFF" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color="#8B5CF6" intensity={30} distance={8} />
    </group>
  );
};

// ── 割れる頭部（クリッピング平面で2分割し、ヒンジのように開く） ──
// 注意: geoはThreeCanvasの外でロードして渡すこと。キャンバス内部の子で非同期ロードすると
// ロード完了後にGLキャンバスが再描画されず、静止画レンダリングで頭部が消える。
const SplitHead: React.FC<{split: number; geo: THREE.BufferGeometry}> = ({split, geo}) => {
  const frame = useCurrentFrame();
  const planeL = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0.18, 0), 0.001), []);
  const planeR = useMemo(() => new THREE.Plane(new THREE.Vector3(1, -0.18, 0), 0.001), []);

  const breathe = Math.sin(frame / 30) * 0.02;
  const openAngle = split * 0.42; // パカっと開く角度
  const openShift = split * 0.6;

  const common = {
    color: new THREE.Color('#4A5490'),
    roughness: 0.45,
    metalness: 0.15,
    emissive: new THREE.Color('#3A3F8E'),
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
  };

  return (
    <group position={[0, -0.1 + breathe, 0]} rotation={[0.05, -0.3 + frame / 900, 0]}>
      {/* 右半分（+X側）: 右へ開く */}
      <group position={[openShift, 0, 0]} rotation={[0, 0, -openAngle]}>
        <mesh geometry={geo}>
          <meshStandardMaterial {...common} clippingPlanes={[planeR]} />
        </mesh>
        <mesh geometry={geo} scale={1.002}>
          <meshBasicMaterial color="#8F7CFF" wireframe transparent opacity={0.3} clippingPlanes={[planeR]} />
        </mesh>
      </group>
      {/* 左半分（-X側）: 左へ開く */}
      <group position={[-openShift, 0, 0]} rotation={[0, 0, openAngle]}>
        <mesh geometry={geo}>
          <meshStandardMaterial {...common} clippingPlanes={[planeL]} />
        </mesh>
        <mesh geometry={geo} scale={1.002}>
          <meshBasicMaterial color="#8F7CFF" wireframe transparent opacity={0.3} clippingPlanes={[planeL]} />
        </mesh>
      </group>
      {/* 中の発光コア（暗黙知の源） */}
      <mesh position={[0, 0.35, 0]} scale={0.55 + split * 0.35}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color="#8B5CF6"
          emissive="#9F7CFF"
          emissiveIntensity={2.8 * split}
          transparent
          opacity={0.9 * split}
          wireframe
        />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#9F7CFF" intensity={split * 50} distance={12} />
    </group>
  );
};

// ── 3Dシーン全体 ──
export const HeadSplitScene: React.FC<{
  splitStart?: number;
  splitDur?: number;
  streamStart?: number;
  ringAppear?: number;
}> = ({splitStart = 55, splitDur = 40, streamStart = 80, ringAppear = 70}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  // キャンバスの外でロード → ロード完了でThreeCanvasごと再レンダリング＆再描画される
  const geo = useHeadGeometry();

  const split = interpolate(frame, [splitStart, splitStart + splitDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const streamStrength = interpolate(frame, [streamStart, streamStart + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // カメラ: ゆっくりドリーイン→引き
  const camZ = interpolate(frame, [0, 90, 260], [7.2, 5.9, 6.7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const camX = interpolate(frame, [0, 260], [-0.5, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{antialias: true}}
      onCreated={(state: {gl: THREE.WebGLRenderer}) => {
        state.gl.localClippingEnabled = true;
      }}
      camera={{fov: 40, position: [camX, 0.7, camZ]}}
      style={{position: 'absolute', inset: 0}}
    >
      <CameraRig x={camX} z={camZ} />
      <ambientLight intensity={0.7} color="#8892FF" />
      <directionalLight position={[4, 5, 3]} intensity={2.4} color="#B9C2FF" />
      <directionalLight position={[-5, 2, -2]} intensity={3.2} color="#7A5CFF" />
      {geo && <SplitHead split={split} geo={geo} />}
      <KnowledgeStream start={streamStart} strength={streamStrength} />
      <DigibreRing appear={ringAppear} />
    </ThreeCanvas>
  );
};

const CameraRig: React.FC<{x: number; z: number}> = ({x, z}) => {
  const frame = useCurrentFrame();
  return (
    <PerspectiveCameraController x={x} z={z} sway={Math.sin(frame / 70) * 0.05} />
  );
};

const PerspectiveCameraController: React.FC<{x: number; z: number; sway: number}> = ({x, z, sway}) => {
  const {camera} = useThree();
  useEffect(() => {
    camera.position.set(x + sway, 0.6 + sway * 0.4, z);
    camera.lookAt(0.5, 0.35, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};
