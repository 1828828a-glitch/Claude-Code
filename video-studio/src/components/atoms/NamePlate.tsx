import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS } from '../../theme';
import { FONT_DISPLAY } from '../../fonts';
import { fadeUp } from '../../lib/timing';

// 人物名の札。参照動画の「織田信長」「明智光秀」ラベル風。
export const NamePlate: React.FC<{
  name: string;
  mood?: 'light' | 'dark';
  delay?: number;
  fontSize?: number;
}> = ({ name, mood = 'light', delay = 20, fontSize = 42 }) => {
  const frame = useCurrentFrame();
  const anim = fadeUp(frame, delay, 14, 20);
  const dark = mood === 'dark';
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize,
        letterSpacing: '0.14em',
        color: dark ? COLORS.lightOnDark : COLORS.paper,
        backgroundColor: dark ? 'rgba(12,10,8,0.85)' : COLORS.ink,
        border: dark ? `2px solid ${COLORS.gold}` : 'none',
        padding: '10px 28px 12px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        ...anim,
      }}
    >
      {name}
    </div>
  );
};
