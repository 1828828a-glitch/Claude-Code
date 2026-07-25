import { Composition } from 'remotion';
import { Main } from './Main';
import { FPS, TOTAL } from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Opus5Promo"
      component={Main}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ orientation: 'landscape' as const }}
    />
    <Composition
      id="Opus5PromoVertical"
      component={Main}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ orientation: 'portrait' as const }}
    />
  </>
);
