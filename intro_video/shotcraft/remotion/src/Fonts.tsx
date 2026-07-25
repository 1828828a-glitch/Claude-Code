import { continueRender, delayRender, staticFile } from 'remotion';
import { useEffect, useState } from 'react';

/**
 * ローカルフォントを @font-face で読み込む。
 * public/fonts/ には scripts/copy-fonts.mjs が intro_video/fonts/ から複製する。
 */
const CSS = `
@font-face { font-family: 'NotoJP'; src: url('${staticFile('fonts/NotoSansJP-Bold.ttf')}'); font-weight: 100 900; font-display: block; }
@font-face { font-family: 'Poppins'; src: url('${staticFile('fonts/Poppins-Bold.ttf')}'); font-weight: 700; font-display: block; }
@font-face { font-family: 'Mono'; src: url('${staticFile('fonts/JetBrainsMono-Regular.ttf')}'); font-weight: 400; font-display: block; }
@font-face { font-family: 'Mono'; src: url('${staticFile('fonts/JetBrainsMono-Bold.ttf')}'); font-weight: 700; font-display: block; }
`;

export const Fonts: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const load = async () => {
      await Promise.all([
        document.fonts.load('900 100px NotoJP'),
        document.fonts.load('700 100px Poppins'),
        document.fonts.load('400 100px Mono'),
        document.fonts.load('700 100px Mono'),
      ]);
      await document.fonts.ready;
      continueRender(handle);
    };
    load();
  }, [handle]);
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
};
