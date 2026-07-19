import React, {useEffect, useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {FONT} from '../theme';
import {useHeadGeometry} from '../scenes/Head3D';
import {BRAIN_PARTS, makeCerebellumGeo, makeHemisphereGeo} from '../scenes/BrainGeo';

// ── バイエンス風スタイルデモ(600f = 20s) ──
// 漆黒の宇宙的背景 / 青白いリムライトで浮かぶ被写体 / シミュレーションHUD /
// 大きな白テキスト+キーワードのみ黄色ハイライト / ゆっくり寄るカメラ / ダークアンビエントBGM

export const CYAN = '#54D8FF';
export const V_YELLOW = '#FFD84A';
export const V_WHITE = '#EAF4FF';
export const V_DIM = 'rgba(234,244,255,0.5)';
export const V_BG = '#010409';
const YELLOW = V_YELLOW;
const WHITE = V_WHITE;
const DIM = V_DIM;
const BG = V_BG;

const OPEN_START = 250;
const OPEN_DUR = 60;

// ── 3D: 頭部(フタ開き) — 暗い物体に青白リム ──
const VHead: React.FC<{geo: THREE.BufferGeometry; openStart?: number; openDur?: number}> = ({geo, openStart = OPEN_START, openDur = OPEN_DUR}) => {
  const frame = useCurrentFrame();
  const CUT = 0.85;
  const split = interpolate(frame, [openStart, openStart + openDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const lid = split * 1.05;
  const lidLift = split * 0.16;
  const lidOpacity = interpolate(frame, [openStart + openDur, openStart + openDur + 32], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yRot = -0.5 + frame / 560;
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
    color: new THREE.Color('#141C2B'),
    roughness: 0.52,
    metalness: 0.35,
    emissive: new THREE.Color('#0A1322'),
    emissiveIntensity: 0.5,
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
      {/* 開口部の発光 */}
      <pointLight position={[0, 1.0, 0.2]} color={CYAN} intensity={split * 34} distance={9} />
    </group>
  );
};

// ── 3D: 標本のように発光する脳 ──
const VBrain: React.FC<{riseStart?: number}> = ({riseStart = OPEN_START + 22}) => {
  const frame = useCurrentFrame();
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
  const specimen = {
    color: new THREE.Color('#B9D4E8'),
    roughness: 0.42,
    metalness: 0.1,
    emissive: new THREE.Color('#1E6C8F'),
    emissiveIntensity: 0.85,
  };
  return (
    <group position={[0, y, 0.2]} scale={s} rotation={[0.14, frame / 95, 0.04]}>
      <mesh geometry={geoL} position={BRAIN_PARTS.left.position} rotation={BRAIN_PARTS.left.rotation}>
        <meshStandardMaterial {...specimen} />
      </mesh>
      <mesh geometry={geoR} position={BRAIN_PARTS.right.position} rotation={BRAIN_PARTS.right.rotation}>
        <meshStandardMaterial {...specimen} />
      </mesh>
      <mesh geometry={geoC} position={BRAIN_PARTS.cerebellum.position}>
        <meshStandardMaterial {...specimen} />
      </mesh>
      <pointLight color={CYAN} intensity={rise * 22} distance={7} />
    </group>
  );
};

// ── 3D: 開口部から立ち上るニューラル粒子 ──
const NEURAL_COUNT = 240;
const NeuralRise: React.FC<{start?: number}> = ({start = OPEN_START + 26}) => {
  const frame = useCurrentFrame();
  const positions = useMemo(() => new Float32Array(NEURAL_COUNT * 3), []);
  const geoRef = React.useRef<THREE.BufferGeometry>(null);
  for (let i = 0; i < NEURAL_COUNT; i++) {
    const life = 70 + random(`vl${i}`) * 60;
    const t0 = start + random(`vt${i}`) * 130;
    const p = Math.min(Math.max((frame - t0) / life, 0), 1);
    const alive = p > 0 && p < 1;
    const ang = random(`va${i}`) * Math.PI * 2;
    const rad = 0.15 + random(`vr${i}`) * 0.45 + p * 0.5;
    positions[i * 3] = alive ? Math.cos(ang + p * 3.2) * rad : 0;
    positions[i * 3 + 1] = alive ? 0.5 + p * 3.4 : -9999;
    positions[i * 3 + 2] = alive ? 0.2 + Math.sin(ang + p * 3.2) * rad * 0.7 : 0;
  }
  useEffect(() => {
    if (geoRef.current) geoRef.current.attributes.position.needsUpdate = true;
  });
  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} color={CYAN} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

const VCamera: React.FC<{dur?: number}> = ({dur = 600}) => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const z = interpolate(frame, [0, dur], [8.6, 6.3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  useEffect(() => {
    camera.position.set(Math.sin(frame / 320) * 0.35, 0.72 + Math.sin(frame / 240) * 0.06, z);
    camera.lookAt(0, 0.55, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

export const VCanvas: React.FC<{openStart?: number; openDur?: number; dur?: number}> = ({
  openStart = OPEN_START,
  openDur = OPEN_DUR,
  dur = 600,
}) => {
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
      camera={{fov: 36, position: [0, 0.72, 8.6]}}
      style={{position: 'absolute', inset: 0}}
    >
      <VCamera dur={dur} />
      {/* 青白リムライト主体: 逆光2灯+ごく暗いキー */}
      <ambientLight intensity={0.16} color="#20406A" />
      <directionalLight position={[-3, 3, -6]} intensity={7.5} color="#4FD8FF" />
      <directionalLight position={[4, 1.5, -5]} intensity={4.0} color="#3D7BFF" />
      <directionalLight position={[2, 3, 5]} intensity={0.55} color="#8FB8E8" />
      {geo && <VHead geo={geo} openStart={openStart} openDur={openDur} />}
      <VBrain riseStart={openStart + 22} />
      <NeuralRise start={openStart + 26} />
    </ThreeCanvas>
  );
};

// ── 背景: 星+ごく薄いネビュラ ──
export const SpaceBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const stars = useMemo(
    () =>
      Array.from({length: 130}).map((_, i) => ({
        x: random(`sx${i}`) * 1920,
        y: random(`sy${i}`) * 1080,
        s: 1 + random(`ss${i}`) * 1.8,
        ph: random(`sp${i}`) * Math.PI * 2,
        sp: 0.02 + random(`sv${i}`) * 0.05,
      })),
    []
  );
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 30% 20%, rgba(30,80,140,0.14), transparent 60%), radial-gradient(ellipse 80% 60% at 75% 80%, rgba(60,40,120,0.1), transparent 60%)',
        }}
      />
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        {stars.map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.s} fill="#CFE4FF" opacity={0.14 + 0.3 * Math.abs(Math.sin(st.ph + frame * st.sp))} />
        ))}
      </svg>
    </>
  );
};

// ── HUD: コーナーブラケット+計測テキスト ──
export const Bracket: React.FC<{x: number; y: number; flipX?: boolean; flipY?: boolean; o: number}> = ({x, y, flipX, flipY, o}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 46,
      height: 46,
      borderLeft: `1.5px solid ${CYAN}`,
      borderTop: `1.5px solid ${CYAN}`,
      opacity: 0.55 * o,
      transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
    }}
  />
);

const VaienceHud: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [8, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pct = Math.floor(interpolate(frame, [OPEN_START, 560], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const scanning = frame < OPEN_START;
  const synapses = Math.floor(interpolate(frame, [OPEN_START, 560], [0, 8.4e13], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const reticleIn = interpolate(frame, [OPEN_START - 40, OPEN_START], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none'}}>
      <Bracket x={54} y={54} o={boot} />
      <Bracket x={1820} y={54} flipX o={boot} />
      <Bracket x={54} y={980} flipY o={boot} />
      <Bracket x={1820} y={980} flipX flipY o={boot} />
      {/* 左上: シミュレーション表記 */}
      <div style={{position: 'absolute', top: 66, left: 124, opacity: boot}}>
        <div style={{fontSize: 16, fontWeight: 700, color: CYAN, letterSpacing: '0.4em'}}>SIMULATION ── 脳転写プロセス</div>
        <div style={{fontSize: 13, fontWeight: 500, color: DIM, letterSpacing: '0.3em', marginTop: 8}}>
          BRAIN TRANSCRIPTION ／ DIGIBRE ENGINE ／ 特許出願中
        </div>
      </div>
      {/* 右上: 状態インジケータ */}
      <div style={{position: 'absolute', top: 66, right: 124, textAlign: 'right', opacity: boot}}>
        <div style={{display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end'}}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: scanning ? CYAN : YELLOW,
              opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 10)),
            }}
          />
          <div style={{fontSize: 16, fontWeight: 700, color: WHITE, letterSpacing: '0.34em'}}>
            {scanning ? 'OBSERVING' : 'TRANSCRIBING'}
          </div>
        </div>
      </div>
      {/* 左下: データ読み出し */}
      <div style={{position: 'absolute', bottom: 70, left: 124, opacity: boot, fontVariantNumeric: 'tabular-nums'}}>
        <div style={{fontSize: 13, color: DIM, letterSpacing: '0.24em', lineHeight: 2.0}}>
          NEURONS&nbsp;&nbsp;86,000,000,000
          <br />
          SYNAPSES&nbsp;{synapses.toLocaleString()}
          <br />
          PROGRESS&nbsp;<span style={{color: pct >= 100 ? YELLOW : CYAN}}>{String(pct).padStart(3, '0')}%</span>
        </div>
      </div>
      {/* 頭部を囲む計測レティクル */}
      {reticleIn > 0 && (
        <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 * reticleIn}}>
          <circle cx={960} cy={470} r={265} fill="none" stroke={CYAN} strokeWidth={1} strokeDasharray="4 10" />
          <circle cx={960} cy={470} r={295} fill="none" stroke={CYAN} strokeWidth={0.6} opacity={0.5} />
          <line x1={660} y1={470} x2={710} y2={470} stroke={CYAN} strokeWidth={1} />
          <line x1={1210} y1={470} x2={1260} y2={470} stroke={CYAN} strokeWidth={1} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

// ── テキストビート ──
const VaienceText: React.FC = () => {
  const frame = useCurrentFrame();
  // 冒頭宣言(本編S1と同一コピー)
  const t1 = interpolate(frame, [36, 66], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t2 = interpolate(frame, [66, 100], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out1 = interpolate(frame, [196, 226], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // 終盤ロックアップ
  const t3 = interpolate(frame, [460, 492], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none'}}>
      {/* 可読性スクリム */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(1,4,9,0.8) 0%, rgba(1,4,9,0.3) 26%, transparent 45%)',
          opacity: Math.max(t1 * out1, t3),
        }}
      />
      {out1 > 0 && (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: out1}}>
          <div style={{fontSize: 46, fontWeight: 700, color: DIM, letterSpacing: '0.1em', opacity: t1, transform: `translateY(${(1 - t1) * 24}px)`}}>
            トップパフォーマーの
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: WHITE,
              letterSpacing: '0.04em',
              marginTop: 14,
              opacity: t2,
              transform: `translateY(${(1 - t2) * 30}px)`,
              textShadow: '0 0 40px rgba(84,216,255,0.35)',
            }}
          >
            脳を、AIに<span style={{color: YELLOW}}>転写</span>する。
          </div>
        </AbsoluteFill>
      )}
      {t3 > 0 && (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130, opacity: t3}}>
          <div style={{fontSize: 72, fontWeight: 900, color: WHITE, letterSpacing: '0.06em', transform: `translateY(${(1 - t3) * 26}px)`}}>
            世界初のAIエンジン──<span style={{color: CYAN}}>デジブレ</span>。
          </div>
          <div style={{fontSize: 24, fontWeight: 700, color: DIM, letterSpacing: '0.3em', marginTop: 22}}>
            ADTURN ／ 特許出願中
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const VaienceDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [576, 598], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bgmVol = (f: number) =>
    interpolate(f, [0, 40, 560, 596], [0, 0.9, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: BG}}>
      <Audio src={staticFile('audio/bgm_vaience.m4a')} volume={bgmVol} />
      <Sequence from={15} name="ナレーション n1">
        <Audio src={staticFile('audio/n1.mp3')} />
      </Sequence>
      <AbsoluteFill style={{opacity: fadeIn * fadeOut}}>
        <SpaceBackdrop />
        <VCanvas />
        {/* ビネット */}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 110% 90% at 50% 46%, transparent 52%, rgba(0,0,0,0.62) 100%)'}} />
        <VaienceHud />
        <VaienceText />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
