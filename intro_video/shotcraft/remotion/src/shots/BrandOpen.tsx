import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, F } from '../tokens';
import { SHOTS } from '../timeline';

/**
 * SHOT 1 — card: `brand-ink-open`(style-key: brand-ink-open)
 * 参考実装: template/src/aifl/live/SceneOpen.tsx 帧 0–83 段
 *
 * カードの動效核心をそのまま踏襲する:
 *   墨線十字準星の描画(先竖後横→淡出) → 字標の逐字 letterpress(scale+blur→0、
 *   字底に強調色の glint) → 副標の打字機 + 強調色ブロック光標 → 満1秒静止 → 上浮縮小淡出。
 *
 * 目標製品への適配(カードの「已知坑/命門」は降格させていない):
 *   - 字標を Poppins / 明るい前景色に蒙皮(暗場のため INK→fg)。強調色は Anthropic の accent。
 *   - 副標は日本語の主要コピー「って、なに?」なので、装飾小字用の 0.7f/字ではなく
 *     **3f/字**を使う。カードの調節手感欄が「正文交互打字は 3f/字。0.7f は装飾性小字のみ」
 *     と明記しており、こちらが上位の基準。字号も kicker サイズではなく主行として組む。
 *   - hold はカードの硬底線 1秒(30f)に対し 43f 取った(R3: 放慢は一度も否定されていない)。
 *   - 開場に pill 等の第二の主役は置かない(Q5: 開場の主役はひとつ)。
 */

const WORDMARK = 'Opus 5';
const KICKER = 'って、なに?';

// カード参数表の時値。準星と字標はカードの値をそのまま使う。
const V_DRAW = [0, 9] as const;
const H_DRAW = [8, 18] as const;
const CROSS_FADE = [24, 34] as const;
const GLYPH_DELAY = (i: number) => 10 + i * 3;
const GLYPH_DUR = 12;

// 副標: ナレーション「名前は聞くけれど、何者なのか。」が 57f なので、そこから打ち始める。
const KICK_START = 57;
const PER_CHAR = 3; // 正文級。装飾小字の 0.7f/字は使わない
const KICK_DONE = KICK_START + KICKER.length * PER_CHAR; // 75
const CURSOR_STOP = 118; // hold 終わりまで点滅させ、退場直前に止める
const EXIT = [123, 133] as const; // 退場は入場より速く(カード規定)

export const BrandOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SHOTS.brandOpen.dur;

  // --- 十字準星の描画(SVG pathLength = 100) ---
  const vDraw = interpolate(frame, [...V_DRAW], [100, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const hDraw = interpolate(frame, [...H_DRAW], [100, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear,
  });
  // 描画完了後は必ず淡出する。残留すると字標と焦点を争う(カードの已知坑)
  const crossFade = interpolate(frame, [...CROSS_FADE], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // --- 副標の打字機と光標 ---
  const kickChars = Math.floor(Math.max(0, frame - KICK_START) / PER_CHAR);
  const cursorOn = (() => {
    if (frame < KICK_START) return false;
    if (frame < KICK_DONE) return true;
    if (frame > CURSOR_STOP) return false;
    return Math.floor((frame - KICK_DONE) / 2) % 2 === 0;
  })();

  // --- 退場: 上浮 40px + 縮 12% + 淡出 ---
  const out = interpolate(frame, [...EXIT], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.5, 1),
  });
  const opacity = 1 - out;
  if (opacity <= 0 || frame >= dur) return null;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <div
        style={{
          textAlign: 'center',
          transform: `translateY(${-out * 40}px) scale(${1 - out * 0.12})`,
          transformOrigin: 'center center',
        }}
      >
        {/* 見えないペンが描く十字準星 */}
        <svg width={88} height={88} viewBox="0 0 64 64" style={{ display: 'block', margin: '0 auto 44px', opacity: crossFade }}>
          <line
            x1={32} y1={2} x2={32} y2={62} stroke={C.accent} strokeWidth={5} strokeLinecap="round"
            pathLength={100} strokeDasharray={100} strokeDashoffset={vDraw}
          />
          <line
            x1={2} y1={32} x2={62} y2={32} stroke={C.accent} strokeWidth={5} strokeLinecap="round"
            pathLength={100} strokeDasharray={100} strokeDashoffset={hDraw}
          />
        </svg>

        {/* 字標: 逐字 letterpress + 字底の強調色 glint */}
        <div
          style={{
            fontFamily: F.latin, fontSize: 200, fontWeight: 700, color: C.fg,
            letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'pre',
            display: 'inline-flex', alignItems: 'flex-end',
          }}
        >
          {WORDMARK.split('').map((ch, i) => {
            const delay = GLYPH_DELAY(i);
            const t = interpolate(frame, [delay, delay + GLYPH_DUR], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              easing: Easing.bezier(0.2, 0.7, 0.25, 1),
            });
            // glint は字が押し込まれた瞬間だけ。Q4 の群発禁止に触れないよう字底2pxに留める
            const gc = delay + GLYPH_DUR;
            const glint = interpolate(frame, [gc - 4, gc, gc + 4], [0, 1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            return (
              <span
                key={i}
                style={{
                  position: 'relative', display: 'inline-block', opacity: t,
                  transform: `scale(${1.6 - 0.6 * t})`,
                  transformOrigin: 'center bottom',
                  filter: `blur(${(1 - t) * 6}px)`,
                }}
              >
                {ch === ' ' ? ' ' : ch}
                <span
                  style={{
                    position: 'absolute', left: '50%', bottom: -8, transform: 'translateX(-50%)',
                    width: `${glint * 100}%`, height: 3, background: C.accent,
                    opacity: glint, borderRadius: 2,
                  }}
                />
              </span>
            );
          })}
        </div>

        {/* 副標の打字機 + 強調色ブロック光標 */}
        <div
          style={{
            fontFamily: F.jp, fontSize: 88, fontWeight: 700, color: C.accent,
            marginTop: 30, height: 110,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}
        >
          <span style={{ whiteSpace: 'pre' }}>{KICKER.slice(0, kickChars)}</span>
          <span
            style={{
              display: 'inline-block', width: 28, height: 78, marginLeft: 10,
              background: C.accent, opacity: cursorOn ? 0.85 : 0,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
