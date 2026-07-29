import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { SceneSpec } from "../components/Scene";
import { Human } from "../components/Ant";
import { At, Glow, Marchers, Ruler, Walker } from "../components/Diagram";
import { StickerLabel } from "../components/Titles";
import {
  Anglerfish,
  Bubbles,
  CrushedCan,
  HydrothermalVent,
  Jellyfish,
  MarineSnow,
  Submersible,
  SunRays,
  WaterSurface,
} from "../components/Sea";
import { fonts, palette } from "../theme";
import { useCountUp, usePop } from "../anim";
import { Pt } from "../path";

/* ---------------------------------------------------------------- 1. 水面 */

const SurfaceArt: React.FC = () => {
  const frame = useCurrentFrame();
  // ゆっくり沈んでいく。カメラが下りるのではなく、世界が上がってくる
  const drop = interpolate(frame, [0, 240], [0, 130], { easing: Easing.inOut(Easing.quad) });
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-drop}px)` }}>
        <WaterSurface y={220 + drop} />
        <SunRays y={230 + drop} count={8} opacity={0.2} />
      </div>
      <MarineSnow count={40} speed={18} />
      <At x={1450} y={640}>
        <Jellyfish size={190} phase={0.6} />
      </At>
      <At x={430} y={820}>
        <Jellyfish size={140} phase={2.2} />
      </At>
      <Bubbles x={1000} y={1000} count={10} spread={160} rise={520} />
    </>
  );
};

/* ---------------------------------------------------------------- 2. 深さ */

const descent: Pt[] = [
  { x: 980, y: 150 },
  { x: 1120, y: 340 },
  { x: 940, y: 560 },
  { x: 1080, y: 760 },
  { x: 960, y: 940 },
];

const DepthArt: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [18, duration - 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  // 潜るほど光が減る。背景ではなく «光の層» の方を薄くしていく
  const light = interpolate(t, [0, 0.7], [1, 0], { extrapolateRight: "clamp" });
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: light }}>
        <SunRays y={0} count={6} opacity={0.22} />
      </div>
      <MarineSnow count={70} speed={30} />
      <Ruler
        x={190}
        top={160}
        bottom={940}
        labels={["0m", "-50", "-100", "-150", "-200"]}
        delay={10}
      />
      <Walker points={descent} t={t} align={false}>
        <Submersible size={230} facing={-1} />
      </Walker>
    </>
  );
};

/* ---------------------------------------------------------------- 3. 水圧 */

const PressureArt: React.FC = () => {
  const frame = useCurrentFrame();
  const crush = interpolate(frame, [40, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  return (
    <>
      <MarineSnow count={50} speed={22} />
      <At x={560} y={620}>
        <Human size={280} color={palette.paper} />
      </At>
      <At x={560} y={800}>
        <StickerLabel
          text="地上 1気圧"
          delay={10}
          fontSize={34}
          color={palette.paper}
          textColor={palette.ink}
          seed={71}
        />
      </At>
      <At x={1340} y={620}>
        <CrushedCan size={260} crush={crush} />
      </At>
      <At x={1340} y={800}>
        <StickerLabel text="水深1000m 100気圧" delay={100} fontSize={34} seed={73} />
      </At>
      {/* 押しつぶす力を矢印で示す */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[-1, 1].map((dir) => {
          const push = interpolate(frame, [40, 95], [0, 60], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x = 1340 + dir * (250 - push);
          return (
            <path
              key={dir}
              d={`M ${x} 620 l ${dir * 74} -34 l 0 68 Z`}
              fill={palette.glowBlue}
              opacity={0.75}
            />
          );
        })}
      </svg>
    </>
  );
};

/* ---------------------------------------------------------------- 4. 発光 */

const BioluminescenceArt: React.FC = () => (
  <>
    <MarineSnow count={40} speed={16} color={palette.glowCyan} />
    <At x={1360} y={560}>
      <Anglerfish size={430} facing={-1} />
    </At>
    <At x={430} y={420}>
      <Jellyfish size={210} phase={0.3} />
    </At>
    <At x={700} y={760}>
      <Jellyfish size={150} phase={1.8} />
    </At>
    {[
      { x: 240, y: 700, d: 12 },
      { x: 900, y: 340, d: 20 },
      { x: 1180, y: 880, d: 28 },
      { x: 620, y: 250, d: 36 },
      { x: 1660, y: 760, d: 44 },
    ].map((g) => (
      <Glow key={`${g.x}-${g.y}`} x={g.x} y={g.y} r={14} color={palette.glowCyan} delay={g.d} />
    ))}
  </>
);

/* ---------------------------------------------------------------- 5. マリンスノー */

const SnowArt: React.FC = () => (
  <>
    <MarineSnow count={190} speed={34} />
    <At x={1480} y={760}>
      <Jellyfish size={170} phase={1.1} />
    </At>
    {/* 海底。降ってきたものが積もる場所 */}
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <path
        d="M -20 1000 C 300 950, 700 992, 1080 962 C 1420 936, 1700 972, 1940 946 L 1940 1080 L -20 1080 Z"
        fill={palette.abyssDark}
      />
    </svg>
  </>
);

/* ---------------------------------------------------------------- 6. 熱水噴出孔 */

const seafloor: Pt[] = [
  { x: -140, y: 838 },
  { x: 520, y: 820 },
  { x: 1180, y: 846 },
  { x: 2060, y: 824 },
];

const VentArt: React.FC = () => (
  <>
    <MarineSnow count={30} speed={14} />
    <At x={700} y={600}>
      <HydrothermalVent size={300} />
    </At>
    <At x={1300} y={686}>
      <HydrothermalVent size={190} phase={4} />
    </At>
    <Bubbles x={1010} y={870} count={12} spread={120} rise={420} color={palette.glowCyan} />
    {/* 海底は魚より先に描く。あとから描くと魚が埋まる */}
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <path
        d="M -20 900 C 400 872, 900 906, 1300 884 C 1600 868, 1800 894, 1940 876 L 1940 1080 L -20 1080 Z"
        fill={palette.rock}
      />
    </svg>
    {/* 噴出孔のまわりに集まる生きもの */}
    <Marchers
      points={seafloor}
      count={4}
      periodInFrames={300}
      render={(i) => (
        <Anglerfish size={190 + i * 18} facing={1} color={palette.abyssDark} glow={palette.glowCyan} />
      )}
    />
    <At x={1420} y={330}>
      <StickerLabel text="光ではなく 化学反応で生きる" delay={40} fontSize={32} seed={77} />
    </At>
  </>
);

/* ---------------------------------------------------------------- 7. 数字 */

const UnexploredArt: React.FC = () => {
  const value = useCountUp(5, 14, 40);
  const pop = usePop(8, 14);
  return (
    <>
      <MarineSnow count={60} speed={20} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(-70px) scale(${0.9 + pop * 0.1})`,
          opacity: pop,
        }}
      >
        {/* 数字と単位は «一続きの文字» として組む。別々に置くと縦位置がずれる */}
        <span
          style={{
            fontFamily: fonts.sans,
            fontWeight: 900,
            fontSize: 300,
            color: palette.paper,
            lineHeight: 1,
          }}
        >
          {value}
          <span style={{ fontSize: 130, color: palette.glowCyan, marginLeft: 12 }}>％</span>
        </span>
      </div>
      <At x={960} y={720}>
        <StickerLabel text="くわしく調べ終えた深海底" delay={56} fontSize={36} seed={79} />
      </At>
    </>
  );
};

/* ---------------------------------------------------------------- 8. エンディング */

const OutroArt: React.FC = () => (
  <>
    <MarineSnow count={80} speed={18} />
    {[
      { x: 300, y: 760, s: 150, p: 0.4 },
      { x: 700, y: 880, s: 110, p: 1.5 },
      { x: 1250, y: 800, s: 170, p: 2.6 },
      { x: 1660, y: 900, s: 120, p: 3.7 },
    ].map((j) => (
      <At key={j.x} x={j.x} y={j.y}>
        <Jellyfish size={j.s} phase={j.p} />
      </At>
    ))}
  </>
);

/* ---------------------------------------------------------------- 台本本体 */

/**
 * 深海の解説。アリの動画と同じ部品立てで、色と主役だけを入れ替えている。
 * 地面の断面が «水深» に、行列が «海底の生きもの» に置き換わっただけ。
 */
export const deepSeaStoryboard: SceneSpec[] = [
  {
    id: "01-水面",
    seconds: 8,
    backdrop: { kind: "sea", vignette: 0.28 },
    title: { text: "光の届かない世界", placement: "top-center", fontSize: 84 },
    subtitle: "海の水は、上から順に光を吸い取っていきます。",
    art: () => <SurfaceArt />,
  },
  {
    id: "02-深さ",
    seconds: 8,
    backdrop: { kind: "deep" },
    title: {
      text: "水深 200メートル",
      sub: "ここから下が 深海",
      placement: "top-right",
      fontSize: 72,
      angle: -2.2,
      seed: 19,
    },
    subtitle: "二百メートルより下には、太陽の光がほとんど届きません。",
    art: (duration) => <DepthArt duration={duration} />,
  },
  {
    id: "03-水圧",
    seconds: 8,
    backdrop: { kind: "deep" },
    title: { text: "深さは、重さになる", placement: "top-left", fontSize: 68, angle: 1.2, seed: 27 },
    subtitle: "水深千メートルの水圧は、およそ百気圧。空き缶は一瞬でつぶれます。",
    art: () => <PressureArt />,
  },
  {
    id: "04-発光",
    seconds: 8,
    backdrop: { kind: "abyss", vignette: 0.4 },
    title: { text: "光は、自前で用意する", placement: "top-center", fontSize: 76, seed: 33 },
    subtitle: "深海の生き物の多くは、自分の体で光をつくります。",
    art: () => <BioluminescenceArt />,
  },
  {
    id: "05-マリンスノー",
    seconds: 7,
    backdrop: { kind: "abyss", vignette: 0.36 },
    title: { text: "降りつづける雪", placement: "top-center", fontSize: 80, angle: -1.2, seed: 43 },
    subtitle: "上の海から降ってくる粒が、深海の食べものになります。",
    art: () => <SnowArt />,
  },
  {
    id: "06-熱水噴出孔",
    seconds: 8,
    backdrop: { kind: "abyss", vignette: 0.42 },
    title: { text: "太陽に頼らない生態系", placement: "top-center", fontSize: 70, seed: 49 },
    subtitle: "熱水がふき出す場所には、光と無関係に生きる生態系があります。",
    art: () => <VentArt />,
  },
  {
    id: "07-未踏",
    seconds: 7,
    backdrop: { kind: "abyss", vignette: 0.45 },
    title: { text: "人が見たのは", placement: "top-center", fontSize: 62, seed: 55 },
    subtitle: "深海のほとんどは、まだ誰も見ていません。",
    art: () => <UnexploredArt />,
  },
  {
    id: "08-エンディング",
    seconds: 8,
    backdrop: { kind: "abyss", vignette: 0.5 },
    title: {
      text: "いちばん広い場所は、",
      sub: "いちばん暗い場所でした。",
      placement: "center",
      fontSize: 88,
      seed: 61,
    },
    subtitle: "",
    art: () => <OutroArt />,
  },
];
