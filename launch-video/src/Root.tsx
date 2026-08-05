import {Composition} from 'remotion';
import {LaunchVideo} from './LaunchVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LaunchVideo"
        component={LaunchVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* SNS 用の正方形バージョン。同じコンポーネントをサイズ違いで書き出せる */}
      <Composition
        id="LaunchVideoSquare"
        component={LaunchVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
