import React from "react";
import { palette } from "../theme";
import { useBob } from "../anim";

export type AntProps = {
  size?: number;
  color?: string;
  /** 1 なら右向き、-1 なら左向き。 */
  facing?: 1 | -1;
  /** 脚を動かすか。止まっているアリは false。 */
  walking?: boolean;
  /** 歩調をずらす。行列のアリが揃って気持ち悪くならないように。 */
  phase?: number;
  speed?: number;
  style?: React.CSSProperties;
  /** 頭の上に荷物（葉など）を持たせる。 */
  carrying?: React.ReactNode;
};

/**
 * アリ。頭・胸・腹の 3 つの塊と細い脚という、
 * シルエットだけで «アリ» と分かる形に割り切っている。
 */
export const Ant: React.FC<AntProps> = ({
  size = 120,
  color = palette.ink,
  facing = 1,
  walking = true,
  phase = 0,
  speed = 5,
  style,
  carrying,
}) => {
  const swing = useBob(walking ? speed : 0, walking ? 1 : 0, phase);
  const bob = useBob(walking ? speed : 0, walking ? 1.5 : 0, phase);
  const legOffset = (i: number) => swing * 9 * (i % 2 === 0 ? 1 : -1);

  const height = size * (70 / 120);

  return (
    // left/top はアリの «中心» を指す。並べるときに位置合わせで悩まなくて済む。
    <div style={{ position: "absolute", width: size, height, transform: "translate(-50%, -50%)", ...style }}>
      {carrying ? (
        // 荷物は頭の上に乗せる。向きに合わせて左右にずらさないと、腹の上に浮いて見える。
        <div
          style={{
            position: "absolute",
            left: `${facing === 1 ? 68 : 32}%`,
            bottom: height * 0.58,
            transform: `translateX(-50%) translateY(${bob}px)`,
          }}
        >
          {carrying}
        </div>
      ) : null}
      <svg
        viewBox="0 0 120 70"
        width={size}
        height={height}
        style={{ overflow: "visible", transform: `scaleX(${facing}) translateY(${bob}px)` }}
      >
        {/* 脚。付け根から地面へ、膝で一度折る */}
        {[
          { hip: 52, foot: 20, knee: 30 },
          { hip: 62, foot: 58, knee: 62 },
          { hip: 70, foot: 96, knee: 92 },
        ].map((leg, i) => (
          <path
            key={`l${i}`}
            d={`M ${leg.hip} 32 L ${leg.knee} 44 L ${leg.foot + legOffset(i)} 64`}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {[
          { hip: 54, foot: 34, knee: 40 },
          { hip: 64, foot: 70, knee: 70 },
          { hip: 72, foot: 104, knee: 98 },
        ].map((leg, i) => (
          <path
            key={`r${i}`}
            d={`M ${leg.hip} 32 L ${leg.knee} 42 L ${leg.foot - legOffset(i)} 62`}
            stroke={color}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.72}
          />
        ))}

        {/* 触角 */}
        <path
          d={`M 92 20 L 102 ${8 + swing * 2} L 115 ${13 + swing * 2}`}
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* 腹・胸・頭 */}
        <ellipse cx={26} cy={30} rx={21} ry={15.5} fill={color} />
        <path d="M 45 30 L 52 30" stroke={color} strokeWidth={5} strokeLinecap="round" />
        <ellipse cx={62} cy={30} rx={12} ry={10} fill={color} />
        <ellipse cx={86} cy={26} rx={12.5} ry={11.5} fill={color} />
        {/* 大あご */}
        <path d="M 97 28 L 108 32" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      </svg>
    </div>
  );
};

/** 葉っぱ。運ばせたり、キノコ畑に敷いたりする。 */
export const Leaf: React.FC<{ size?: number; color?: string; angle?: number; style?: React.CSSProperties }> = ({
  size = 120,
  color = palette.gold,
  angle = 0,
  style,
}) => (
  <svg
    viewBox="0 0 120 80"
    width={size}
    height={size * (80 / 120)}
    style={{ overflow: "visible", transform: `rotate(${angle}deg)`, ...style }}
  >
    <path d="M 6 62 C 22 8, 96 2, 114 20 C 100 70, 34 78, 6 62 Z" fill={color} />
    <path d="M 12 60 C 44 46, 82 30, 110 20" stroke="rgba(0,0,0,0.28)" strokeWidth={3} fill="none" />
    {[0.25, 0.4, 0.55, 0.7, 0.85].map((t, i) => (
      <path
        key={i}
        d={`M ${12 + 98 * t} ${60 - 40 * t} l ${-6 - 8 * (1 - t)} ${-14 - 6 * t}`}
        stroke="rgba(0,0,0,0.24)"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    ))}
  </svg>
);

/** 人のシルエット。大きさの比較に使う。 */
export const Human: React.FC<{ size?: number; color?: string; lifting?: boolean; style?: React.CSSProperties }> = ({
  size = 120,
  color = palette.paper,
  lifting = false,
  style,
}) => (
  <svg
    viewBox="0 0 60 140"
    width={size * (60 / 140)}
    height={size}
    style={{ overflow: "visible", ...style }}
  >
    <circle cx={30} cy={18} r={15} fill={color} />
    <rect x={20} y={36} width={20} height={54} rx={9} fill={color} />
    {lifting ? (
      <>
        <path d="M 22 44 L 12 14" stroke={color} strokeWidth={9} strokeLinecap="round" />
        <path d="M 38 44 L 48 14" stroke={color} strokeWidth={9} strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M 22 44 L 10 78" stroke={color} strokeWidth={9} strokeLinecap="round" />
        <path d="M 38 44 L 50 78" stroke={color} strokeWidth={9} strokeLinecap="round" />
      </>
    )}
    <path d="M 26 88 L 20 134" stroke={color} strokeWidth={10} strokeLinecap="round" />
    <path d="M 34 88 L 42 134" stroke={color} strokeWidth={10} strokeLinecap="round" />
  </svg>
);

/** 車のシルエット。「人間なら車を担ぐ計算」のような例え話に。 */
export const Car: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
  size = 260,
  color = palette.paper,
  style,
}) => (
  <svg viewBox="0 0 260 100" width={size} height={size * (100 / 260)} style={{ overflow: "visible", ...style }}>
    <path
      d="M 8 74 L 14 50 C 18 40, 30 38, 44 38 L 76 38 L 104 16 C 112 10, 128 10, 140 12 L 176 18 C 190 20, 200 28, 208 38 L 236 44 C 250 47, 254 56, 252 70 L 250 76 Z"
      fill={color}
    />
    <circle cx={70} cy={78} r={17} fill={color} />
    <circle cx={202} cy={78} r={17} fill={color} />
    <circle cx={70} cy={78} r={7} fill="rgba(0,0,0,0.35)" />
    <circle cx={202} cy={78} r={7} fill="rgba(0,0,0,0.35)" />
    <path d="M 84 38 L 108 20 L 134 20 L 134 38 Z" fill="rgba(0,0,0,0.22)" />
  </svg>
);

/** キノコ。菌類を育てるアリのカット用。 */
export const Mushroom: React.FC<{ size?: number; cap?: string; stem?: string; style?: React.CSSProperties }> = ({
  size = 90,
  cap = "#e8e0cd",
  stem = "#cfc4ab",
  style,
}) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible", ...style }}>
    <rect x={41} y={48} width={18} height={44} rx={9} fill={stem} />
    <path d="M 10 52 C 12 20, 88 20, 90 52 C 70 62, 30 62, 10 52 Z" fill={cap} />
  </svg>
);
