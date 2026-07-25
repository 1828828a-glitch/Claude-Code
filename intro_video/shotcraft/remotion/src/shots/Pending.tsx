import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../tokens';

/**
 * 未実装ショットの暫定表示。
 *
 * **これはカード忠実な実装ではない。** 割り当て済みのカードを読み込んで実装するまでの
 * 場つなぎで、成片が常に端から端まで再生できる状態を保つためだけに存在する。
 * 動きは淡入と僅かな上昇のみ(匀速直線運動を避けるため easing は入れている)。
 *
 * 置き換え順は DESIGN-SPEC.md の分鏡表の順。実装済みのショットは Main.tsx で
 * このコンポーネントから差し替えていく。
 */
export const Pending: React.FC<{
  /** 割り当て済みのカード名。実装時に読むべき対象を画面にも残しておく */
  card: string;
  /** そのショットが伝える内容(ナレーションに対応する主コピー) */
  lines: string[];
  kicker?: string;
}> = ({ card, lines, kicker }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0, 0, 0.2, 1),
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 140px', opacity: t }}>
      <div style={{ transform: `translateY(${(1 - t) * 24}px)` }}>
        {kicker ? (
          <div style={{ fontFamily: F.jp, fontSize: 30, fontWeight: 500, color: C.accent, letterSpacing: '.12em', marginBottom: 26 }}>
            {kicker}
          </div>
        ) : null}
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: F.jp, fontSize: 82, fontWeight: 700, color: C.fg, lineHeight: 1.42 }}>
            {l}
          </div>
        ))}
        <div style={{ fontFamily: F.mono, fontSize: 22, color: C.muted, marginTop: 44, opacity: 0.55 }}>
          pending card: {card}
        </div>
      </div>
    </AbsoluteFill>
  );
};
