import React, {useEffect, useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {FONT} from '../theme';
import {useHeadGeometry} from '../scenes/Head3D';
import {BRAIN_PARTS, makeCerebellumGeo, makeHemisphereGeo} from '../scenes/BrainGeo';

// ── ラグジュアリー「プロダクト・ラボ」スタイル共通パーツ＋スタイルデモ ──
// 参考: 暗背景に単一の精密3Dオブジェクト、スローターンテーブル、
// 細い引き出し線＋極小タイポのHUD、下部にステータスバー。

export const INK = '#E8ECF0';
export const DIM = 'rgba(232,236,240,0.55)';
export const GOLD = '#D8B36A';
export const RED = '#E5484D';
export const LINE = 'rgba(232,236,240,0.35)';
export const LUX_BG = '#0A0E13';

// デモのタイムライン（450f = 15s）
const OPEN_START = 110; // 頭がパカーン
const OPEN_DUR = 55;
const CALLOUT_BASE = 200; // 引き出し線の出現開始
const DONE_AT = 360; // TRANSCRIBED

// ── 3D: 頭（フタ開き）＋脳 ──
export const LuxHead: React.FC<{geo: THREE.BufferGeometry; openStart: number; openDur: number; xOff?: number}> = ({
  geo,
  openStart,
  openDur,
  xOff = 0,
}) => {
  const frame = useCurrentFrame();
  const CUT = 0.85;
  const split = interpolate(frame, [openStart, openStart + openDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  // フタは開いたあとフェードアウト（転写のため取り外されるイメージ）。
  // ヒンジ回転だと頭の真上に振り上がって「卵」のように残ってしまうため。
  const lid = split * 1.05;
  const lidLift = split * 0.16;
  const lidOpacity = interpolate(frame, [openStart + openDur, openStart + openDur + 32], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ターンテーブル（ごくゆっくり）
  const yRot = -0.42 + frame / 620;
  const rootPos = new THREE.Vector3(xOff, -0.25, 0);
  const rootRot = new THREE.Euler(0.04, yRot, 0);
  const mRoot = new THREE.Matrix4().compose(
    rootPos,
    new THREE.Quaternion().setFromEuler(rootRot),
    new THREE.Vector3(1, 1, 1)
  );
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
    color: new THREE.Color('#232B3A'),
    roughness: 0.32,
    metalness: 0.88,
    emissive: new THREE.Color('#10141D'),
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
  };

  return (
    <group position={rootPos} rotation={rootRot}>
      <mesh geometry={geo}>
        <meshStandardMaterial {...common} clippingPlanes={[planeBottom]} />
      </mesh>
      <mesh geometry={geo} scale={1.0025}>
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.1} clippingPlanes={[planeBottom]} />
      </mesh>
      {lidOpacity > 0 && (
        <group position={[0, CUT + lidLift, -0.55]} rotation={[-lid, 0, 0]}>
          <group position={[0, -CUT, 0.55]}>
            <mesh geometry={geo}>
              <meshStandardMaterial {...common} transparent opacity={lidOpacity} clippingPlanes={[planeTop]} />
            </mesh>
            <mesh geometry={geo} scale={1.0025}>
              <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.1 * lidOpacity} clippingPlanes={[planeTop]} />
            </mesh>
          </group>
        </group>
      )}
      <pointLight position={[0, 1.1, 0.2]} color="#FFD9A0" intensity={split * 26} distance={9} />
    </group>
  );
};

// ── 3D: ゴールドの脳が浮上 → 左上へ流れて頭とは重ならない位置で回転し続ける ──
export const LuxBrain: React.FC<{riseStart: number}> = ({riseStart}) => {
  const frame = useCurrentFrame();
  const geoL = useMemo(() => makeHemisphereGeo(0.0), []);
  const geoR = useMemo(() => makeHemisphereGeo(2.7), []);
  const geoC = useMemo(() => makeCerebellumGeo(), []);
  const rise = interpolate(frame, [riseStart, riseStart + 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const drift = interpolate(frame, [riseStart + 45, riseStart + 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  if (frame < riseStart) return null;
  const x = -1.45 * drift + Math.sin(frame / 46) * 0.04;
  const y = 0.5 + rise * 0.8 + drift * 0.05 + Math.sin(frame / 34) * 0.05;
  const z = 0.4 * drift;
  const s = (0.2 + rise * 0.62) * (1 + Math.sin(frame / 28) * 0.015);
  const gold = {
    color: new THREE.Color('#C9A45C'),
    metalness: 0.85,
    roughness: 0.32,
    emissive: new THREE.Color('#4A3B1C'),
    emissiveIntensity: 0.5,
  };
  return (
    <group position={[x, y, z]} scale={s} rotation={[0.16, frame / 90, 0.05]}>
      <mesh geometry={geoL} position={[-0.42, 0, 0]} rotation={[0, 0, 0.07]}>
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh geometry={geoR} position={[0.42, 0, 0]} rotation={[0, 0, -0.07]}>
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh geometry={geoC} position={[0, -0.62, -0.55]}>
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh position={[0, -0.72, -0.2]} rotation={[0.55, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.19, 0.5, 32]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      <pointLight color="#FFD9A0" intensity={rise * 12} distance={6} />
    </group>
  );
};

const LuxCamera: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const z = interpolate(frame, [0, 140, 420], [7.6, 6.6, 7.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  useEffect(() => {
    camera.position.set(Math.sin(frame / 260) * 0.3, 0.65, z);
    camera.lookAt(0, 0.45, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

// ── 3Dキャンバス一式（頭＋脳＋照明）。シーン1とデモで共用 ──
export const LuxHeadCanvas: React.FC<{openStart?: number; openDur?: number}> = ({
  openStart = OPEN_START,
  openDur = OPEN_DUR,
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
      camera={{fov: 35, position: [0, 0.65, 7.6]}}
      style={{position: 'absolute', inset: 0}}
    >
      <LuxCamera />
      <ambientLight intensity={0.5} color="#5F6C86" />
      <directionalLight position={[5, 4, 3]} intensity={3.4} color="#FFD9A0" />
      <directionalLight position={[-5, 2, -1]} intensity={1.4} color="#6E86C4" />
      <directionalLight position={[0, 3, -5]} intensity={2.2} color="#8FA6D8" />
      {geo && <LuxHead geo={geo} openStart={openStart} openDur={openDur} />}
      <LuxBrain riseStart={openStart + 20} />
    </ThreeCanvas>
  );
};

// ── 背景（極薄ドットグリッド＋ビネット） ──
export const LuxBackdrop: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        backgroundImage: 'radial-gradient(rgba(232,236,240,0.05) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        opacity: 0.7,
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 50% 44%, rgba(216,179,106,0.05), transparent 60%), radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
      }}
    />
  </>
);

// ── HUD: 引き出し線＋極小ラベル ──
export const Callout: React.FC<{
  at: number;
  side: 'left' | 'right';
  y: number;
  len: number;
  jp: string;
  en: string;
  anchor: {x: number; y: number};
}> = ({at, side, y, len, jp, en, anchor}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tp = interpolate(frame, [at + 16, at + 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (p <= 0) return null;
  const endX = side === 'right' ? anchor.x + len : anchor.x - len;
  const drawX = anchor.x + (endX - anchor.x) * Math.min(1, p * 1.6);
  const elbowY = y;
  return (
    <>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
        <circle cx={anchor.x} cy={anchor.y} r={4} fill="none" stroke={GOLD} strokeWidth={1.4} opacity={p} />
        <circle cx={anchor.x} cy={anchor.y} r={1.6} fill={GOLD} opacity={p} />
        <path
          d={`M ${anchor.x} ${anchor.y} L ${anchor.x + (drawX - anchor.x) * 0.45} ${elbowY} L ${drawX} ${elbowY}`}
          fill="none"
          stroke={LINE}
          strokeWidth={1.2}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: side === 'right' ? endX + 14 : undefined,
          right: side === 'left' ? 1920 - endX + 14 : undefined,
          top: elbowY - 26,
          textAlign: side === 'left' ? 'right' : 'left',
          opacity: tp,
        }}
      >
        <div style={{fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '0.12em', whiteSpace: 'nowrap'}}>{jp}</div>
        <div style={{fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.3em', marginTop: 4, whiteSpace: 'nowrap'}}>{en}</div>
      </div>
    </>
  );
};

// ── デモ用HUD全体 ──
const LuxHud: React.FC = () => {
  const frame = useCurrentFrame();
  const boot = interpolate(frame, [6, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const done = frame >= DONE_AT;
  const pct = Math.floor(
    interpolate(frame, [OPEN_START, DONE_AT], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
  );
  const phase = frame < OPEN_START ? 0 : frame < OPEN_START + OPEN_DUR ? 1 : frame < DONE_AT ? 2 : 3;
  const PHASES = ['SCAN', 'OPEN', 'EXTRACT', 'TRANSCRIBED'];
  const logoIn = interpolate(frame, [DONE_AT + 8, DONE_AT + 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: 'none'}}>
      {/* 上部ヘアライン */}
      <div style={{position: 'absolute', top: 54, left: 70, right: 70, height: 1, background: LINE, opacity: boot}} />
      {/* 左上: プロダクト名 */}
      <div style={{position: 'absolute', top: 72, left: 70, opacity: boot}}>
        <div style={{fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.42em'}}>
          ADTANK GP — PRESENTATION LAB ／ EXHIBIT 01
        </div>
        <div style={{fontSize: 40, fontWeight: 800, color: INK, letterSpacing: '0.24em', marginTop: 14}}>
          ADTURN <span style={{color: GOLD}}>for HR</span>
        </div>
        <div style={{fontSize: 17, fontWeight: 500, color: DIM, letterSpacing: '0.2em', marginTop: 10}}>
          デジブレ ENGINE ｜ トップパフォーマー脳転写 ｜ <span style={{color: GOLD}}>特許出願中</span>
        </div>
      </div>
      {/* 右上: ステータス */}
      <div style={{position: 'absolute', top: 78, right: 70, textAlign: 'right', opacity: boot}}>
        <div style={{fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.42em'}}>STATE</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', marginTop: 10}}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: done ? GOLD : RED,
              opacity: done ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(frame / 9)),
            }}
          />
          <div style={{fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '0.3em'}}>
            {done ? 'TRANSCRIBED' : 'TRANSCRIBING'}
          </div>
        </div>
      </div>

      {/* 引き出し線: 暗黙知の構成要素 */}
      <Callout at={CALLOUT_BASE} side="right" y={300} len={210} jp="意思決定基準" en="DECISION LOGIC" anchor={{x: 1065, y: 330}} />
      <Callout at={CALLOUT_BASE + 26} side="right" y={470} len={260} jp="言語化されない経験則" en="TACIT HEURISTICS" anchor={{x: 1085, y: 500}} />
      <Callout at={CALLOUT_BASE + 52} side="left" y={330} len={220} jp="営業の勘所" en="SALES INSTINCT" anchor={{x: 855, y: 360}} />
      <Callout at={CALLOUT_BASE + 78} side="left" y={520} len={250} jp="一流の質問力" en="QUESTION DESIGN" anchor={{x: 840, y: 545}} />

      {/* 完了ロックアップ */}
      {logoIn > 0 && (
        <div style={{position: 'absolute', right: 70, bottom: 170, textAlign: 'right', opacity: logoIn}}>
          <div style={{fontSize: 15, fontWeight: 500, color: DIM, letterSpacing: '0.42em'}}>OUTPUT</div>
          <div style={{fontSize: 24, fontWeight: 700, color: INK, letterSpacing: '0.3em', marginTop: 8}}>
            貴社専用の<span style={{color: GOLD}}>戦略レポート</span>
          </div>
        </div>
      )}

      {/* 下部コントロールバー */}
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 64, opacity: boot}}>
        <div style={{position: 'relative', height: 2, background: 'rgba(232,236,240,0.16)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: GOLD, opacity: 0.85}} />
          <div
            style={{
              position: 'absolute',
              left: `${pct}%`,
              top: -5,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#0A0E13',
              border: `2px solid ${GOLD}`,
              transform: 'translateX(-6px)',
            }}
          />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 18, alignItems: 'baseline'}}>
          <div style={{display: 'flex', gap: 44}}>
            {PHASES.map((p, i) => (
              <div
                key={p}
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.34em',
                  color: i === phase ? INK : 'rgba(232,236,240,0.3)',
                  borderBottom: i === phase ? `2px solid ${GOLD}` : '2px solid transparent',
                  paddingBottom: 6,
                }}
              >
                {p}
              </div>
            ))}
          </div>
          <div style={{fontSize: 24, fontWeight: 700, color: GOLD, letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums'}}>
            {String(pct).padStart(3, '0')}%
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── デモ本体 ──
export const LuxDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: LUX_BG}}>
      <LuxBackdrop />
      <AbsoluteFill style={{opacity: fade}}>
        <LuxHeadCanvas />
      </AbsoluteFill>
      <LuxHud />
    </AbsoluteFill>
  );
};
