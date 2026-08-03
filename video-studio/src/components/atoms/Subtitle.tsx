import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, SAFE } from '../../theme';
import { FONT_SERIF } from '../../fonts';
import { fadeUp } from '../../lib/timing';
import { RichText } from './RichText';

// 画面下部のナレーション字幕。参照動画と同じく
// 明色背景では墨文字、暗色背景では黒帯+生成り文字。
export const Subtitle: React.FC<{
  text: string;
  mood?: 'light' | 'dark';
  delay?: number;
}> = ({ text, mood = 'light', delay = 10 }) => {
  const frame = useCurrentFrame();
  const anim = fadeUp(frame, delay, 16, 24);
  const dark = mood === 'dark';
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: SAFE - 26,
        display: 'flex',
        justifyContent: 'center',
        ...anim,
      }}
    >
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: '0.06em',
          lineHeight: 1.5,
          color: dark ? COLORS.lightOnDark : COLORS.ink,
          backgroundColor: dark ? 'rgba(8,6,4,0.62)' : 'transparent',
          padding: dark ? '10px 34px' : '10px 0',
          borderRadius: dark ? 6 : 0,
          textShadow: dark ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
          maxWidth: 1500,
          textAlign: 'center',
        }}
      >
        <RichText text={text} mood={mood} />
      </div>
    </div>
  );
};
