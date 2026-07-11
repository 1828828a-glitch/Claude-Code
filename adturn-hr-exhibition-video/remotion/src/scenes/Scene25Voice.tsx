import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, GRADIENT} from '../theme';
import {GradientText} from '../helpers';
import {KineticChars, Particles, RadialBurst, Underline} from '../fx';

// S2.5 現場の声（13.2s）: ターゲットの本音つぶやき → 「それ、解決できます。」
// Beat1: f8- 経営者バブル / Beat2: f140- 人事バブル / Beat3: f270 フラッシュ→スラム

const Avatar: React.FC<{label: string}> = ({label}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0}}>
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 人物シルエット */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 18,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.75)',
          transform: 'translateX(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 54,
          width: 62,
          height: 44,
          borderRadius: '50% 50% 0 0',
          background: 'rgba(255,255,255,0.75)',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
    <div style={{fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.7)'}}>{label}</div>
  </div>
);

const Bubble: React.FC<{
  pop: number;
  textAt: number;
  text: string;
  label: string;
  align: 'left' | 'right';
  fadeAt: number;
}> = ({pop, textAt, text, label, align, fadeAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - pop, fps, config: {damping: 15, stiffness: 130, mass: 0.7}});
  const fade = interpolate(frame, [fadeAt, fadeAt + 12], [1, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showText = frame >= textAt;
  const chars = interpolate(frame, [textAt, textAt + text.length * 1.6], [0, text.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dotY = (i: number) => Math.sin((frame - pop) / 4 + i * 1.1) * 7;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: align === 'left' ? 'row' : 'row-reverse',
        alignItems: 'flex-end',
        gap: 30,
        opacity: Math.min(s * 1.2, 1) * fade,
        transform: `scale(${0.85 + 0.15 * s}) translateY(${(1 - s) * 40}px)`,
        transformOrigin: align === 'left' ? 'bottom left' : 'bottom right',
      }}
    >
      <Avatar label={label} />
      <div
        style={{
          position: 'relative',
          maxWidth: 1150,
          padding: '44px 56px',
          borderRadius: 36,
          borderBottomLeftRadius: align === 'left' ? 8 : 36,
          borderBottomRightRadius: align === 'right' ? 8 : 36,
          background: 'rgba(255,255,255,0.10)',
          border: '2px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(6px)',
          fontSize: 54,
          fontWeight: 700,
          color: COLORS.white,
          lineHeight: 1.5,
          minHeight: 140,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {showText ? (
          <span>
            {text.slice(0, Math.ceil(chars))}
            <span style={{opacity: chars < text.length ? 0.8 : 0}}>▍</span>
          </span>
        ) : (
          <span style={{display: 'flex', gap: 18, padding: '0 10px'}}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.6)',
                  display: 'inline-block',
                  transform: `translateY(${dotY(i)}px)`,
                }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
};

export const Scene25Voice: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const FLASH = 270;
  const flash = interpolate(frame, [FLASH, FLASH + 3, FLASH + 14], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const isSlam = frame >= FLASH + 3;

  const markIn = spring({frame: frame - (FLASH + 10), fps, config: {damping: 14, stiffness: 120}});
  const subIn = interpolate(frame, [FLASH + 40, FLASH + 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden'}}>
      {/* 夕暮れのオフィス風ダーク背景 */}
      <AbsoluteFill style={{background: 'linear-gradient(160deg, #171C38 0%, #10142B 55%, #1E1B3F 100%)'}} />
      {/* 斜めの淡い光条 */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 300 + i * 450 + Math.sin(frame / 90 + i) * 20,
            top: -200,
            width: 160,
            height: 1600,
            background:
              'linear-gradient(rgba(139,92,246,0.07), rgba(139,92,246,0.015) 60%, transparent)',
            transform: 'rotate(18deg)',
          }}
        />
      ))}
      <Particles count={22} seed="s25" color="rgba(139,92,246,0.35)" maxSize={7} />

      {/* つぶやきバブル */}
      {!isSlam && (
        <AbsoluteFill style={{padding: '150px 180px', justifyContent: 'center', gap: 90}}>
          <Bubble
            pop={8}
            textAt={16}
            text="トップパフォーマーの社員が、もっといたらなぁ…"
            label="経営者"
            align="left"
            fadeAt={140}
          />
          <div style={{alignSelf: 'flex-end'}}>
            <Bubble
              pop={140}
              textAt={148}
              text="あと3名いたら、うちも変われるのに。"
              label="人事責任者"
              align="right"
              fadeAt={9999}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* スラム: それ、解決できます。 */}
      {isSlam && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <RadialBurst delay={FLASH + 6} color="rgba(139,92,246,0.65)" />
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: '30px solid transparent',
              background: `linear-gradient(#10142B, #10142B) padding-box, ${GRADIENT} border-box`,
              transform: `scale(${markIn}) rotate(${frame}deg)`,
              filter: 'drop-shadow(0 0 40px rgba(99,102,241,0.6))',
              marginBottom: 50,
            }}
          />
          <KineticChars
            text="それ、解決できます。"
            delay={FLASH + 8}
            stagger={2.4}
            gradientRange={[3, 8]}
            style={{fontSize: 148, fontWeight: 900, color: COLORS.white}}
          />
          <div style={{height: 36}} />
          <div style={{opacity: subIn, transform: `translateY(${(1 - subIn) * 30}px)`}}>
            <div style={{fontSize: 44, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>
              トップパフォーマーの<GradientText>脳</GradientText>を、そのまま貴社の武器に。
            </div>
          </div>
          <div style={{height: 30, display: 'flex', justifyContent: 'center'}}>
            <Underline delay={FLASH + 50} width={420} />
          </div>
        </AbsoluteFill>
      )}

      {/* ホワイトフラッシュ */}
      <AbsoluteFill style={{background: '#FFFFFF', opacity: flash, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
