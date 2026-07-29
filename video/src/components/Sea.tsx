import React from "react";
import { useCurrentFrame } from "remotion";
import { layout, palette } from "../theme";
import { rand, randRange, useDrift } from "../anim";

/**
 * 水面。うねりを sin で作るので、何度書き出しても同じ波形になる。
 */
export const WaterSurface: React.FC<{ y: number; color?: string; sky?: string }> = ({
  y,
  color = palette.sea,
  sky = "#cfe4e6",
}) => {
  const frame = useCurrentFrame();
  const wave = (offset: number, amp: number, speed: number) => {
    const points: string[] = [];
    for (let x = -40; x <= layout.width + 40; x += 40) {
      const h = y + Math.sin((x / 260) + frame * speed + offset) * amp;
      points.push(`${x},${h.toFixed(1)}`);
    }
    return `M -40,${y - 400} L ${points.join(" L ")} L ${layout.width + 40},${y - 400} Z`;
  };
  return (
    <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
      <path d={wave(0, 10, 0.03)} fill={sky} />
      <path
        d={wave(1.6, 8, 0.024).replace(`L ${layout.width + 40},${y - 400} Z`, "")}
        stroke={palette.paper}
        strokeWidth={5}
        fill="none"
        opacity={0.5}
      />
      <rect x={0} y={0} width={0} height={0} fill={color} />
    </svg>
  );
};

/**
 * 水面から差し込む光。深さの話をする前に «ここまでは明るい» を見せておくと、
 * 暗くなったときの落差が効く。
 */
export const SunRays: React.FC<{ y: number; count?: number; opacity?: number }> = ({
  y,
  count = 7,
  opacity = 0.16,
}) => {
  const frame = useCurrentFrame();
  return (
    <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
      <defs>
        {/* 下にいくほど消える。均一に塗ると «光の筋» ではなく «柱» に見えてしまう */}
        <linearGradient id="sunray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.paper} stopOpacity={1} />
          <stop offset="55%" stopColor={palette.paper} stopOpacity={0.35} />
          <stop offset="100%" stopColor={palette.paper} stopOpacity={0} />
        </linearGradient>
      </defs>
      {Array.from({ length: count }).map((_, i) => {
        const x = randRange(i * 3 + 1, 120, layout.width - 120);
        const width = randRange(i * 5 + 2, 60, 150);
        const sway = Math.sin(frame * 0.012 + i) * 26;
        const length = randRange(i * 7 + 3, 420, 820);
        return (
          <path
            key={i}
            d={`M ${x} ${y} L ${x + width} ${y} L ${x + width + sway + 90} ${y + length} L ${x + sway - 40} ${y + length} Z`}
            fill="url(#sunray)"
            opacity={opacity * (0.6 + rand(i * 11) * 0.4)}
          />
        );
      })}
    </svg>
  );
};

/**
 * マリンスノー。上から降り続ける有機物の粒。
 * 深海のカットに撒くだけで «沈んでいる» 感じが出る便利な背景。
 */
export const MarineSnow: React.FC<{ count?: number; speed?: number; color?: string }> = ({
  count = 90,
  speed = 26,
  color = palette.paper,
}) => {
  const frame = useCurrentFrame();
  return (
    <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = rand(i * 13 + 5) * layout.width;
        const fall = speed * (0.4 + rand(i * 17 + 7));
        const y = ((rand(i * 19 + 11) * layout.height + (frame / 30) * fall) % (layout.height + 60)) - 30;
        const r = randRange(i * 23 + 3, 2, 6);
        const drift = Math.sin(frame * 0.02 + i) * 8;
        return (
          <circle
            key={i}
            cx={x + drift}
            cy={y}
            r={r}
            fill={color}
            opacity={0.15 + rand(i * 29) * 0.35}
          />
        );
      })}
    </svg>
  );
};

/** 立ちのぼる泡。潜水艇や熱水噴出孔の足元に。 */
export const Bubbles: React.FC<{
  x: number;
  y: number;
  count?: number;
  spread?: number;
  rise?: number;
  color?: string;
}> = ({ x, y, count = 14, spread = 90, rise = 320, color = palette.paper }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }).map((_, i) => {
        const t = ((frame / 30) * (0.3 + rand(i * 7) * 0.4) + rand(i * 3)) % 1;
        const r = randRange(i * 5 + 1, 4, 12) * (1 - t * 0.3);
        return (
          <circle
            key={i}
            cx={x + Math.sin(t * 6 + i) * spread * 0.4 + randRange(i * 11, -spread / 2, spread / 2)}
            cy={y - t * rise}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            opacity={(1 - t) * 0.5}
          />
        );
      })}
    </svg>
  );
};

/** クラゲ。傘が脈打ち、触手が遅れて揺れる。 */
export const Jellyfish: React.FC<{
  size?: number;
  color?: string;
  glow?: string;
  phase?: number;
}> = ({ size = 220, color = palette.paper, glow = palette.glowCyan, phase = 0 }) => {
  const pulse = useDrift(0.5, 1, phase);
  const bellHeight = 1 + pulse * 0.06;
  const sway = useDrift(0.4, 10, phase + 1);
  return (
    <svg
      viewBox="0 0 200 260"
      width={size}
      height={size * (260 / 200)}
      style={{ overflow: "visible" }}
    >
      <ellipse cx={100} cy={95} rx={92} ry={80 * bellHeight} fill={glow} opacity={0.18} />
      <path
        d={`M 14 100 C 14 34, 186 34, 186 100 C 150 ${112 * bellHeight}, 50 ${112 * bellHeight}, 14 100 Z`}
        fill={color}
      />
      {[30, 62, 100, 138, 170].map((x, i) => (
        <path
          key={i}
          d={`M ${x} 104 C ${x + sway * (i % 2 ? 1 : -1)} 150, ${x - sway} 190, ${x + sway * 0.6} 240`}
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
      ))}
    </svg>
  );
};

/** チョウチンアンコウ。提灯の光が明滅する。 */
export const Anglerfish: React.FC<{
  size?: number;
  color?: string;
  glow?: string;
  facing?: 1 | -1;
}> = ({ size = 320, color = palette.rock, glow = palette.glowCyan, facing = 1 }) => {
  const blink = 0.6 + useDrift(0.8, 0.4, 0);
  return (
    <svg
      viewBox="0 0 320 220"
      width={size}
      height={size * (220 / 320)}
      style={{ overflow: "visible", transform: `scaleX(${facing})` }}
    >
      {/* 提灯（誘引突起）と、そこだけが光る */}
      <path
        d="M 104 96 C 100 40, 140 16, 176 28"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={180} cy={30} r={34} fill={glow} opacity={0.22 * blink} />
      <circle cx={180} cy={30} r={14} fill={glow} opacity={blink} />

      <path
        d="M 20 118 C 30 60, 120 58, 172 92 C 210 118, 236 128, 250 118 L 268 92 L 274 150 L 250 140 C 232 160, 190 176, 150 172 C 90 166, 26 158, 20 118 Z"
        fill={color}
      />
      <circle cx={70} cy={104} r={11} fill={palette.paper} />
      <circle cx={73} cy={105} r={5} fill={palette.rock} />
      {/* 牙 */}
      {[36, 52, 68, 84].map((x, i) => (
        <path key={`u${i}`} d={`M ${x} 130 l 7 20 l 7 -20 Z`} fill={palette.paper} />
      ))}
      {[44, 60, 76].map((x, i) => (
        <path key={`d${i}`} d={`M ${x} 158 l 7 -20 l 7 20 Z`} fill={palette.paper} />
      ))}
    </svg>
  );
};

/** 潜水艇。前照灯で行き先を照らす。 */
export const Submersible: React.FC<{
  size?: number;
  color?: string;
  light?: string;
  facing?: 1 | -1;
}> = ({ size = 260, color = palette.paper, light = "#ffe9a8", facing = 1 }) => {
  const bob = useDrift(0.6, 4, 0);
  return (
    <svg
      viewBox="0 0 260 170"
      width={size}
      height={size * (170 / 260)}
      style={{ overflow: "visible", transform: `scaleX(${facing}) translateY(${bob}px)` }}
    >
      {/* 前照灯の光。円錐を 1 枚置くだけで «探している» 画になる */}
      <path d="M 214 84 L 380 6 L 380 162 Z" fill={light} opacity={0.16} />
      <ellipse cx={124} cy={86} rx={104} ry={54} fill={color} />
      <circle cx={196} cy={86} r={26} fill={palette.seaDeep} />
      <circle cx={196} cy={86} r={17} fill={palette.glowBlue} opacity={0.6} />
      <rect x={70} y={22} width={54} height={26} rx={10} fill={color} />
      <path d="M 40 120 L 24 152 M 130 128 L 130 158" stroke={color} strokeWidth={10} strokeLinecap="round" />
      <rect x={4} y={148} width={150} height={14} rx={7} fill={color} />
      <circle cx={214} cy={84} r={9} fill={light} />
    </svg>
  );
};

/** 熱水噴出孔。黒い煙を吐き続ける煙突。 */
export const HydrothermalVent: React.FC<{
  size?: number;
  rock?: string;
  smoke?: string;
  phase?: number;
}> = ({ size = 260, rock = palette.rock, smoke = "#0a0a0f", phase = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <svg
      viewBox="0 0 260 420"
      width={size}
      height={size * (420 / 260)}
      style={{ overflow: "visible" }}
    >
      {/* 煙は粒を上に流すだけ。粒の位置は frame から決まるので毎回同じ */}
      {Array.from({ length: 16 }).map((_, i) => {
        const t = ((frame / 30) * (0.22 + rand(i * 9 + phase) * 0.2) + rand(i * 5)) % 1;
        const r = 22 + t * 62;
        return (
          <circle
            key={i}
            cx={130 + Math.sin(t * 4 + i) * (18 + t * 70)}
            cy={150 - t * 330}
            r={r}
            fill={smoke}
            opacity={(1 - t) * 0.5}
          />
        );
      })}
      <path
        d="M 74 420 L 92 200 C 96 168, 116 152, 130 152 C 144 152, 164 168, 168 200 L 186 420 Z"
        fill={rock}
      />
      <path d="M 40 420 C 60 372, 200 372, 220 420 Z" fill={rock} />
      <ellipse cx={130} cy={154} rx={22} ry={9} fill="#000" opacity={0.6} />
    </svg>
  );
};

/** 押しつぶされる缶。水圧の重さを一目で伝えるための小道具。 */
export const CrushedCan: React.FC<{
  size?: number;
  color?: string;
  /** 0 で無傷、1 で完全につぶれる。 */
  crush?: number;
}> = ({ size = 130, color = palette.paper, crush = 0 }) => {
  const height = 190 - crush * 96;
  const top = 210 - height;
  // 胴のくびれ。つぶれても «缶» に見える程度に留める（へこませ過ぎると砂時計になる）
  const waist = 44 - crush * 13;
  const mid = top + height * 0.52;
  return (
    <svg
      viewBox="0 0 140 220"
      width={size}
      height={size * (220 / 140)}
      style={{ overflow: "visible" }}
    >
      <path
        d={`M 26 ${top} C 26 ${top + height * 0.3}, ${70 - waist} ${mid - 6}, ${70 - waist} ${mid}
            C ${70 - waist} ${mid + 6}, 26 ${210 - height * 0.28}, 26 210
            L 114 210 C 114 ${210 - height * 0.28}, ${70 + waist} ${mid + 6}, ${70 + waist} ${mid}
            C ${70 + waist} ${mid - 6}, 114 ${top + height * 0.3}, 114 ${top} Z`}
        fill={color}
      />
      <ellipse cx={70} cy={top} rx={44} ry={9} fill={color} />
      <ellipse cx={70} cy={top} rx={30} ry={5} fill="rgba(0,0,0,0.22)" />
      {/* つぶれるほど、しわが増える */}
      {crush > 0.25
        ? [0.32, 0.5, 0.68].map((t, i) => (
            <path
              key={i}
              d={`M ${30 + i * 3} ${top + height * t} q 20 ${i % 2 ? 9 : -9} 40 0 q 20 ${i % 2 ? -9 : 9} 40 0`}
              stroke="rgba(0,0,0,0.28)"
              strokeWidth={3}
              fill="none"
              opacity={(crush - 0.25) / 0.75}
            />
          ))
        : null}
    </svg>
  );
};
