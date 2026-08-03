import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { imageScene } from '../../screenplay/types';
import { COLORS, SAFE } from '../../theme';
import { FONT_SERIF } from '../../fonts';
import { fadeUp, EASE_IN_OUT } from '../../lib/timing';
import { Vignette } from '../atoms/Vignette';
import { Subtitle } from '../atoms/Subtitle';

// ユーザー素材のフルスクリーン表示。Ken Burns(ゆっくり寄り/引き+パン)。
export const ImageScene: React.FC<z.infer<typeof imageScene>> = ({
  image,
  caption,
  panFrom,
  panTo,
  zoomFrom,
  zoomTo,
  narration,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { easing: EASE_IN_OUT });
  const zoom = zoomFrom + (zoomTo - zoomFrom) * t;
  const px = panFrom[0] + (panTo[0] - panFrom[0]) * t;
  const py = panFrom[1] + (panTo[1] - panFrom[1]) * t;
  const capAnim = fadeUp(frame, 12, 16, 24);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, overflow: 'hidden' }}>
      <Img
        src={staticFile(`assets/${image}`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoom}) translate(${px}%, ${py}%)`,
        }}
      />
      {/* 下部を落として字幕を読みやすく */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 22%, transparent 62%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {caption ? (
        <div
          style={{
            position: 'absolute',
            left: SAFE,
            top: SAFE - 20,
            fontFamily: FONT_SERIF,
            fontWeight: 600,
            fontSize: 44,
            letterSpacing: '0.14em',
            color: COLORS.lightOnDark,
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            borderLeft: `8px solid ${COLORS.crimson}`,
            paddingLeft: 22,
            ...capAnim,
          }}
        >
          {caption}
        </div>
      ) : null}
      <Vignette strength={0.4} />
      {narration ? <Subtitle text={narration} mood="dark" /> : null}
    </AbsoluteFill>
  );
};
