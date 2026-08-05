import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const FONT_STACK =
  '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic", sans-serif';

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 300], [0, 40]);
  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, #2b1b4d 0%, #12081f 55%, #06030d 100%)',
      }}
    >
      {/* エニアグラムの円をモチーフにした装飾 */}
      <div
        style={{
          position: 'absolute',
          right: -200,
          top: -200 + drift,
          width: 700,
          height: 700,
          borderRadius: '50%',
          border: '2px solid rgba(167, 139, 250, 0.15)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -150,
          bottom: -250 - drift,
          width: 600,
          height: 600,
          borderRadius: '50%',
          border: '2px solid rgba(167, 139, 250, 0.1)',
        }}
      />
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 12}});
  const titleUp = spring({frame: frame - 12, fps, config: {damping: 14}});
  const fadeOut = interpolate(frame, [70, 88], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_STACK,
        opacity: fadeOut,
      }}
    >
      <div style={{fontSize: 160, transform: `scale(${pop})`}}>🔮</div>
      <div
        style={{
          marginTop: 30,
          fontSize: 84,
          fontWeight: 800,
          color: 'white',
          opacity: titleUp,
          transform: `translateY(${(1 - titleUp) * 40}px)`,
          letterSpacing: 2,
        }}
      >
        Enneagram × Beebe × Nardi
      </div>
      <div
        style={{
          marginTop: 20,
          fontSize: 40,
          color: '#c4b5fd',
          opacity: titleUp,
        }}
      >
        3つの理論を統合したタイプ判定ツール
      </div>
    </AbsoluteFill>
  );
};

const FEATURES = [
  {emoji: '9️⃣', title: 'エニアグラム', text: '9タイプ + ウィング + 本能のサブタイプ'},
  {emoji: '🧠', title: 'Beebe 8機能モデル', text: '認知機能と元型で深層を分析'},
  {emoji: '🔬', title: 'Nardi 神経科学', text: '脳活動パターンから裏づけ'},
];

const FeatureCard: React.FC<{
  emoji: string;
  title: string;
  text: string;
  delay: number;
}> = ({emoji, title, text, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - delay, fps, config: {damping: 13}});
  return (
    <div
      style={{
        width: 480,
        padding: '50px 40px',
        borderRadius: 28,
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(196, 181, 253, 0.25)',
        textAlign: 'center',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 80}px)`,
      }}
    >
      <div style={{fontSize: 90}}>{emoji}</div>
      <div style={{fontSize: 44, fontWeight: 700, color: 'white', marginTop: 24}}>
        {title}
      </div>
      <div style={{fontSize: 30, color: '#d8d4e8', marginTop: 16, lineHeight: 1.5}}>
        {text}
      </div>
    </div>
  );
};

const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [125, 140], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_STACK,
        opacity: fadeOut,
      }}
    >
      <div style={{fontSize: 56, fontWeight: 800, color: 'white', marginBottom: 60}}>
        あなたの性格を、3つの視点から
      </div>
      <div style={{display: 'flex', gap: 40}}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} {...f} delay={10 + i * 12} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 13}});
  const pulse = 1 + Math.sin(frame / 8) * 0.02;
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_STACK,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: 'white',
          opacity: enter,
          transform: `translateY(${(1 - enter) * 40}px)`,
        }}
      >
        質問に答えるだけで、統合レポートを生成
      </div>
      <div
        style={{
          marginTop: 60,
          padding: '30px 80px',
          borderRadius: 999,
          background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
          fontSize: 52,
          fontWeight: 800,
          color: 'white',
          opacity: enter,
          transform: `scale(${enter * pulse})`,
          boxShadow: '0 0 80px rgba(168, 85, 247, 0.5)',
        }}
      >
        🔮 今すぐ無料で診断する
      </div>
      <div style={{marginTop: 40, fontSize: 34, color: '#c4b5fd', opacity: enter}}>
        streamlit run streamlit_app.py
      </div>
    </AbsoluteFill>
  );
};

export const LaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence durationInFrames={90}>
        <Intro />
      </Sequence>
      <Sequence from={90} durationInFrames={140}>
        <Features />
      </Sequence>
      <Sequence from={230}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
