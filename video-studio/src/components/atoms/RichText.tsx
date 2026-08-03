import React from 'react';
import { COLORS } from '../../theme';

// 「**強調**」記法をアクセント色に変換する。
// 明色背景では朱、暗色背景では金が読みやすい。
export const RichText: React.FC<{
  text: string;
  mood?: 'light' | 'dark';
  accent?: string;
}> = ({ text, mood = 'light', accent }) => {
  const color = accent ?? (mood === 'dark' ? COLORS.goldBright : COLORS.crimson);
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <span key={i} style={{ color }}>
            {part.slice(2, -2)}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};
