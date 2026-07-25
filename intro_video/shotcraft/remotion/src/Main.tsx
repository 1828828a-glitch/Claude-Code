import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { Fonts } from './Fonts';
import { BG_LAYERS } from './tokens';
import { SHOT_LIST, ShotId } from './timeline';
import { BrandOpen } from './shots/BrandOpen';
import { Pending } from './shots/Pending';

export type Orientation = 'landscape' | 'portrait';

/**
 * 全ショットの合成。
 *
 * 各ショットは `<Sequence from={shot.from} durationInFrames={shot.dur}>` に入るので、
 * ショット内部のフレームは 0 始まりになる。タイムラインを動かすときは timeline.ts の
 * SHOT_LIST だけを直せばよく、SFX 钉帧表も相対式なので追従する。
 */
const RENDER: Record<ShotId, () => React.ReactNode> = {
  brandOpen: () => <BrandOpen />,
  titleCard1: () => (
    <Pending card="paper-title-card" lines={['エンジニアじゃなくても、', 'わかるように。']} />
  ),
  aiStream: () => (
    <Pending card="ai-stream-response" kicker="はじめまして" lines={['文章を読んで、考えて、', '書けるAIです。']} />
  ),
  heroCard: () => (
    <Pending card="spotlight-hero-card" kicker="プロフィール" lines={['生まれは、', 'アメリカのアンスロピック。']} />
  ),
  pillCycle: () => (
    <Pending card="pill-slot-cycle" kicker="できること" lines={['読んでまとめる。', '考えて調べる。', 'そして、つくる。']} />
  ),
  cardFlip: () => (
    <Pending card="card-flip-reveal" lines={['資料の要点も、メールも、', 'プログラムも書けます。']} />
  ),
  titleCard2: () => (
    <Pending card="paper-title-card" lines={['話しかける場所は、', '選べます。']} />
  ),
  terminal: () => (
    <Pending card="typewriter-moves / terminal-typewriter" kicker="どこで会える?" lines={['パソコンの中で作業する私は、', 'クロード・コードです。']} />
  ),
  wordRelay: () => (
    <Pending card="word-relay-filmstrip" kicker="なかま" lines={['用事の大きさで、', '使い分けます。']} />
  ),
  docType: () => (
    <Pending card="document-typewriter-reveal" kicker="得意" lines={['長い作業を、', '最後までやり切ること。']} />
  ),
  risoHit: () => (
    <Pending card="riso-print-hits / riso-misregistration-hit" kicker="苦手" lines={['自信たっぷりに、', '間違えることがある。']} />
  ),
  outro: () => (
    <Pending card="outro-group-photo-launch" lines={['むずかしいことは、こちらで。']} />
  ),
};

export const Main: React.FC<{ orientation: Orientation }> = () => {
  return (
    <AbsoluteFill style={{ background: BG_LAYERS }}>
      <Fonts />

      {/* ナレーション。BGM と SFX は Stage 6 でこの上に重ねる */}
      <Audio src={staticFile('audio/narration.wav')} />

      {SHOT_LIST.map((shot) => (
        <Sequence key={shot.id} from={shot.from} durationInFrames={shot.dur} name={`${shot.id} · ${shot.card}`}>
          {RENDER[shot.id]()}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
