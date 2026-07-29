import React from "react";
import { useCurrentFrame } from "remotion";
import { SceneSpec } from "../components/Scene";
import { Ant, Car, Human, Leaf, Mushroom } from "../components/Ant";
import { At, Chamber, DotTrail, Glow, Marchers, Ruler, Tunnel, Walker } from "../components/Diagram";
import { StickerLabel } from "../components/Titles";
import { fonts, palette } from "../theme";
import { useCountUp, usePop, stagger } from "../anim";
import { Pt } from "../path";

/* ---------------------------------------------------------------- 1. 巣の全体像 */

const nestMain: Pt[] = [
  { x: 560, y: 230 },
  { x: 560, y: 330 },
  { x: 400, y: 400 },
  { x: 330, y: 520 },
  { x: 470, y: 660 },
  { x: 760, y: 700 },
  { x: 1060, y: 610 },
  { x: 1280, y: 700 },
  { x: 1520, y: 760 },
];
const nestBranch: Pt[] = [
  { x: 760, y: 700 },
  { x: 900, y: 800 },
  { x: 1150, y: 860 },
];

const NestArt: React.FC = () => (
  <>
    <Tunnel points={nestMain} delay={4} duration={46} width={38} />
    <Tunnel points={nestBranch} delay={38} duration={22} width={28} />
    <Chamber x={330} y={520} rx={104} ry={54} delay={26} />
    <Chamber x={760} y={700} rx={96} ry={50} delay={34} />
    <Chamber x={1280} y={700} rx={92} ry={48} delay={42} />
    <Chamber x={1150} y={860} rx={86} ry={44} delay={54} />

    <At x={330} y={512}>
      <Ant size={110} color={palette.paper} phase={0.4} speed={4} />
    </At>
    <At x={772} y={694}>
      <Ant size={104} color={palette.paper} facing={-1} phase={1.9} speed={4} />
    </At>
    <At x={1288} y={694}>
      <Ant size={100} color={palette.paper} phase={3.1} speed={4} />
    </At>

    {/* 地表を歩くアリ。地下の話をしている間も、上では日常が続いている */}
    <SurfaceAnt />
  </>
);

const SurfaceAnt: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 1780 - frame * 3.2;
  return (
    <At x={x} y={196}>
      <Ant size={104} facing={-1} phase={0.8} />
    </At>
  );
};

/* ---------------------------------------------------------------- 2. 深さ */

const shaft: Pt[] = [
  { x: 620, y: 190 },
  { x: 660, y: 340 },
  { x: 600, y: 500 },
  { x: 655, y: 660 },
  { x: 610, y: 820 },
  { x: 640, y: 900 },
];

const DepthArt: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (frame - 24) / (duration - 60)));
  return (
    <>
      <Tunnel points={shaft} delay={6} duration={40} width={40} />
      <Ruler x={170} top={190} bottom={900} labels={["0m", "-0.5", "-1.0", "-1.5", "-2.0"]} delay={14} />
      <At x={170} y={120}>
        <Human size={130} color={palette.paper} />
      </At>
      <Walker points={shaft} t={t} align={false}>
        <Ant size={96} color={palette.paper} facing={-1} phase={1.2} speed={7} />
      </Walker>
    </>
  );
};

/* ---------------------------------------------------------------- 3. 部屋の役割 */

const rooms = [
  { x: 400, y: 560, label: "卵とこどもの部屋" },
  { x: 960, y: 700, label: "食べもの倉庫" },
  { x: 1520, y: 600, label: "ゴミ捨て場" },
];

const RoomsArt: React.FC = () => (
  <>
    <Tunnel
      points={[
        { x: 400, y: 220 },
        { x: 400, y: 560 },
        { x: 960, y: 700 },
        { x: 1520, y: 600 },
        { x: 1520, y: 260 },
      ]}
      delay={2}
      duration={40}
      width={30}
    />
    {rooms.map((room, i) => (
      <Chamber key={room.label} x={room.x} y={room.y} rx={130} ry={64} delay={stagger(i, 12, 16)}>
        <div style={{ transform: "translate(-50%, 78px)" }}>
          <StickerLabel
            text={room.label}
            delay={stagger(i, 12, 24)}
            fontSize={30}
            color={palette.paper}
            textColor={palette.ink}
            seed={40 + i}
          />
        </div>
      </Chamber>
    ))}
    <At x={400} y={552}>
      <Ant size={96} color={palette.paper} phase={0.2} speed={4} />
    </At>
    <At x={975} y={694}>
      <Ant size={96} color={palette.paper} facing={-1} phase={2.4} speed={4} />
    </At>
    <At x={1533} y={592}>
      <Ant size={92} color={palette.paper} phase={4.1} speed={4} />
    </At>
  </>
);

/* ---------------------------------------------------------------- 4. フェロモン */

const trail: Pt[] = [
  { x: 300, y: 720 },
  { x: 560, y: 690 },
  { x: 820, y: 730 },
  { x: 1100, y: 640 },
  { x: 1380, y: 560 },
  { x: 1660, y: 500 },
];

const PheromoneArt: React.FC = () => (
  <>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <ellipse cx={250} cy={720} rx={120} ry={52} fill={palette.chalkDark} />
    </svg>
    <DotTrail points={trail} delay={10} duration={44} color={palette.paper} radius={7} />
    <Glow x={1660} y={500} r={20} color={palette.grass} delay={6} />
    <Marchers
      points={trail}
      count={5}
      periodInFrames={150}
      delay={20}
      render={(i) => <Ant size={100} phase={i * 1.3} speed={6} />}
    />
    <At x={250} y={830}>
      <StickerLabel text="巣" delay={4} fontSize={34} color={palette.paper} textColor={palette.ink} seed={51} />
    </At>
  </>
);

/* ---------------------------------------------------------------- 5. 力持ち */

const StrengthArt: React.FC = () => {
  const carPop = usePop(30, 12);
  return (
    <>
      <At x={470} y={560} scale={2.5}>
        <Ant size={220} color={palette.paper} walking={false} carrying={<Leaf size={150} angle={-12} />} />
      </At>
      <At x={1400} y={620} opacity={carPop}>
        <Human size={200} color={palette.paper} lifting />
      </At>
      <At x={1400} y={430} opacity={carPop} scale={0.7 + carPop * 0.3}>
        <Car size={330} color={palette.paper} />
      </At>
      <At x={1430} y={790}>
        <StickerLabel text="人間なら 車を担ぐ計算" delay={44} fontSize={38} seed={57} />
      </At>
    </>
  );
};

/* ---------------------------------------------------------------- 6. 農業 */

const farmRow: Pt[] = [
  { x: -140, y: 470 },
  { x: 520, y: 440 },
  { x: 1120, y: 480 },
  { x: 2060, y: 440 },
];

const FarmArt: React.FC = () => (
  <>
    {/* 行列が «歩いている» と分かるよう、足元に地面の線を一本だけ引く */}
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <path
        d="M -40 530 C 400 512, 1100 552, 1960 512"
        stroke={palette.chalkDark}
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />
    </svg>
    <Marchers
      points={farmRow}
      count={5}
      periodInFrames={260}
      render={(i) => (
        <Ant
          size={128}
          phase={i * 1.7}
          speed={6}
          carrying={<Leaf size={116} angle={-8} color={i % 2 === 0 ? palette.grass : palette.gold} />}
        />
      )}
    />
    {/* キノコ畑は行列の下、テロップにかからない高さに置く */}
    <At x={420} y={760}>
      <Mushroom size={170} />
    </At>
    <At x={608} y={780}>
      <Mushroom size={122} />
    </At>
    <At x={262} y={786}>
      <Mushroom size={104} />
    </At>
    <At x={430} y={648}>
      <StickerLabel
        text="巣の中のキノコ畑"
        delay={30}
        fontSize={32}
        color={palette.paper}
        textColor={palette.ink}
        seed={63}
      />
    </At>
  </>
);

/* ---------------------------------------------------------------- 7. 数 */

const SpeciesArt: React.FC = () => {
  const count = useCountUp(15000, 12, 46);
  const pop = usePop(8, 14);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 6,
          transform: `translateY(-40px) scale(${0.9 + pop * 0.1})`,
          opacity: pop,
        }}
      >
        <span style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 250, color: palette.paper }}>
          {count.toLocaleString("ja-JP")}
        </span>
        <span style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 68, color: palette.accent }}>
          種
        </span>
      </div>
      {Array.from({ length: 9 }).map((_, i) => (
        <At key={i} x={180 + i * 200} y={806 + (i % 3) * 26}>
          <Ant size={92} color={palette.paper} phase={i * 0.9} speed={5} facing={i % 2 === 0 ? 1 : -1} />
        </At>
      ))}
    </>
  );
};

/* ---------------------------------------------------------------- 8. エンディング */

const OutroArt: React.FC = () => (
  <>
    {Array.from({ length: 11 }).map((_, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      return (
        <At key={i} x={200 + col * 300 + row * 140} y={800 + row * 110}>
          <Ant size={96} color={palette.paper} phase={i * 1.1} speed={5} facing={i % 3 === 0 ? -1 : 1} />
        </At>
      );
    })}
  </>
);

/* ---------------------------------------------------------------- 台本本体 */

/**
 * カットを上から順に並べたものが、そのまま 1 本の動画になる。
 * 文章を書き換えれば内容が変わり、seconds を変えれば尺が変わる。
 */
export const antsStoryboard: SceneSpec[] = [
  {
    id: "01-巣の全体像",
    seconds: 8,
    backdrop: { kind: "soil", groundY: 200 },
    title: { text: "足元の、もうひとつの都市", placement: "top-center", fontSize: 82 },
    subtitle: "あなたの足元に、もうひとつの都市があります。住んでいるのは、アリです。",
    art: () => <NestArt />,
  },
  {
    id: "02-深さ",
    seconds: 8,
    backdrop: { kind: "soil", groundY: 190 },
    title: {
      text: "地下 2メートル",
      sub: "ビルなら 地下6階",
      placement: "top-right",
      fontSize: 76,
      angle: -2.4,
      seed: 17,
    },
    subtitle: "巣の深さは、地下二メートルに達することもあります。",
    art: (duration) => <DepthArt duration={duration} />,
  },
  {
    id: "03-部屋の役割",
    seconds: 8,
    backdrop: { kind: "soil", groundY: 180 },
    title: { text: "部屋には、役割がある", placement: "top-left", fontSize: 70, angle: 1.4, seed: 29 },
    subtitle: "子育て部屋、食料庫、ゴミ捨て場。部屋ごとに役割が決まっています。",
    art: () => <RoomsArt />,
  },
  {
    id: "04-フェロモン",
    seconds: 8,
    backdrop: { kind: "chalk", grain: 0.2 },
    title: { text: "道しるべフェロモン", placement: "top-center", fontSize: 80, seed: 35 },
    subtitle: "エサを見つけたアリは、道しるべを出します。仲間がたどり、行列ができます。",
    art: () => <PheromoneArt />,
  },
  {
    id: "05-力持ち",
    seconds: 7,
    backdrop: { kind: "clay" },
    title: { text: "体重の 何十倍", placement: "top-center", fontSize: 84, angle: -2, seed: 41 },
    subtitle: "アリは、自分の体重の何十倍もの荷物を運びます。",
    art: () => <StrengthArt />,
  },
  {
    id: "06-農業",
    seconds: 8,
    backdrop: { kind: "chalk", grain: 0.2 },
    title: { text: "農業を始めたのはアリが先", placement: "top-center", fontSize: 72, seed: 47 },
    subtitle: "巣の中でキノコを育てるアリもいます。農業は人間より五千万年も前でした。",
    art: () => <FarmArt />,
  },
  {
    id: "07-種の数",
    seconds: 7,
    backdrop: { kind: "night" },
    title: { text: "知られているだけで", placement: "top-center", fontSize: 62, seed: 53 },
    subtitle: "名前がついているアリは、およそ一万五千種。まだ増え続けています。",
    art: () => <SpeciesArt />,
  },
  {
    id: "08-エンディング",
    seconds: 8,
    backdrop: { kind: "night", vignette: 0.45 },
    title: {
      text: "足元の、小さな都市。",
      sub: "もっと、覗いてみませんか。",
      placement: "center",
      fontSize: 96,
      seed: 59,
    },
    subtitle: "",
    art: () => <OutroArt />,
  },
];
