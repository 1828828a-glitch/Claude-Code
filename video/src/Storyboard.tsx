import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SceneBackground } from "./components/SceneBackground";
import { KenBurnsImage, type KenBurnsDirection } from "./components/KenBurnsImage";
import { Telop } from "./components/Telop";
import { Flash } from "./components/Accents";
import { FontPreloader } from "./components/FontPreloader";
import { buildTimeline, transitionOverlap } from "./lib/duration";
import { buildBgmVolume } from "./lib/audio";
import { isLight } from "./lib/color";
import { SceneDurationContext } from "./lib/sceneContext";
import { EASE } from "./lib/timing";
import { useSized } from "./lib/layout";
import { getPalette } from "./theme/tokens";
import type { Palette } from "./theme/tokens";
import type { Scene, Script, TransitionKind } from "./lib/schema";
import {
  TitleScene,
  StatementScene,
  NarrationScene,
  QuoteScene,
  OutroScene,
} from "./scenes/TextScenes";
import {
  BulletsScene,
  TimelineScene,
  CompareScene,
  StatScene,
} from "./scenes/DataScenes";
import { LogoScene, CreditScene } from "./scenes/BroadcastScenes";
import { MapScene } from "./scenes/MapScene";
import { ProgressScene } from "./scenes/ProgressScene";

/** 台本の1シーンを対応するコンポーネントに振り分ける */
const SceneRouter: React.FC<{ scene: Scene; palette: Palette }> = ({
  scene,
  palette,
}) => {
  switch (scene.type) {
    case "title":
      return <TitleScene scene={scene} palette={palette} />;
    case "statement":
      return <StatementScene scene={scene} palette={palette} />;
    case "narration":
      return <NarrationScene scene={scene} palette={palette} />;
    case "quote":
      return <QuoteScene scene={scene} palette={palette} />;
    case "outro":
      return <OutroScene scene={scene} palette={palette} />;
    case "bullets":
      return <BulletsScene scene={scene} palette={palette} />;
    case "timeline":
      return <TimelineScene scene={scene} palette={palette} />;
    case "compare":
      return <CompareScene scene={scene} palette={palette} />;
    case "stat":
      return <StatScene scene={scene} palette={palette} />;
    case "map":
      return <MapScene scene={scene} palette={palette} />;
    case "progress":
      return <ProgressScene scene={scene} palette={palette} />;
    case "logo":
      return <LogoScene scene={scene} palette={palette} />;
    case "credit":
      return <CreditScene scene={scene} palette={palette} />;
    default: {
      const exhaustive: never = scene;
      void exhaustive;
      return null;
    }
  }
};

/** public/ の相対パスと外部 URL の両方を受け付ける */
const resolveSrc = (src: string) =>
  /^(https?:)?\/\//.test(src) ? src : staticFile(src);

/** 画像に付ける動きを、シーン番号から決定的に選ぶ（毎回同じ結果になる） */
const KEN_BURNS_CYCLE: KenBurnsDirection[] = [
  "zoomIn",
  "panRight",
  "zoomOut",
  "panLeft",
  "zoomIn",
  "panUp",
];

/**
 * 直前のシーンからの「入り」の演出。
 * シーンは Sequence が重なって描画されるので、後ろのシーンが上に乗る。
 */
const useEnterStyle = (
  kind: TransitionKind,
  overlap: number,
): React.CSSProperties => {
  const frame = useCurrentFrame();

  if (overlap <= 0 || kind === "cut" || kind === "flash") return {};

  const p = interpolate(frame, [0, overlap], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.expo,
  });

  if (kind === "fade") return { opacity: p };
  if (kind === "slide")
    return { transform: `translateX(${interpolate(p, [0, 1], [100, 0])}%)` };
  if (kind === "zoom")
    return {
      opacity: p,
      transform: `scale(${interpolate(p, [0, 1], [1.25, 1])})`,
    };

  return {};
};

const SceneFrame: React.FC<{
  scene: Scene;
  script: Script;
  palette: Palette;
  index: number;
  /** 直前のシーンが指定したトランジション */
  incoming: TransitionKind;
}> = ({ scene, script, palette, index, incoming }) => {
  const { fps } = useVideoConfig();
  const s = useSized();
  const overlap = transitionOverlap(incoming, fps);
  const enterStyle = useEnterStyle(incoming, overlap);

  // 画像の上に文字を載せるので幕を1枚入れる。
  // 文字色が明るいパレットなら黒幕、暗いパレットなら白幕でコントラストを作る
  const overlayColor = isLight(palette.bg)
    ? "rgba(255,255,255,0.3)"
    : "rgba(0,0,0,0.45)";

  return (
    <AbsoluteFill style={enterStyle}>
      {scene.image ? (
        <KenBurnsImage
          src={resolveSrc(scene.image)}
          direction={KEN_BURNS_CYCLE[index % KEN_BURNS_CYCLE.length]}
          overlay={overlayColor}
          shake
        />
      ) : (
        <SceneBackground
          palette={palette}
          kind={scene.background ?? script.background}
        />
      )}

      <SceneRouter scene={scene} palette={palette} />

      {/* narration 以外のシーンでも、台本に telop があれば下に出す */}
      {scene.telop && scene.type !== "narration" ? (
        <Telop
          text={scene.telop}
          palette={palette}
          position="bottom"
          fontSize={s(46)}
          outlineWidth={s(5)}
          delay={6}
        />
      ) : null}

      {incoming === "flash" ? <Flash at={0} durationInFrames={5} /> : null}

      {/* このカットのナレーション。Sequence の中なのでカット頭から鳴る */}
      {scene.voiceFile ? (
        <Audio src={resolveSrc(scene.voiceFile)} name="ナレーション" />
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * 台本に含まれる文字をすべて集める。
 * フォントのサブセットを先読みさせるために使う。
 */
const collectText = (script: Script): string => {
  const parts: string[] = [script.title];

  for (const scene of script.scenes) {
    for (const value of Object.values(scene)) {
      if (typeof value === "string") parts.push(value);
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") parts.push(item);
          else if (item && typeof item === "object")
            parts.push(Object.values(item).join(""));
        }
      } else if (value && typeof value === "object") {
        parts.push(Object.values(value).join(""));
      }
    }
  }

  // 重複文字を落として document.fonts.load への入力を小さくする
  return Array.from(new Set(Array.from(parts.join("")))).join("");
};

/**
 * 台本 (Script) を1本の動画として組み立てる。
 *
 * すべてのテンプレートはこのコンポーネントを共有していて、
 * 違いは「どの format / palette / transition を既定にするか」だけ。
 */
export const Storyboard: React.FC<{ script: Script }> = ({ script }) => {
  const { fps } = useVideoConfig();
  const palette = getPalette(script.palette);
  const { timings, totalFrames } = buildTimeline(script, fps);

  // ナレーション中は BGM を下げ、前後はフェードさせる
  const bgmVolume = buildBgmVolume({
    timings,
    fps,
    totalFrames,
    base: script.bgmVolume,
    duck: Math.min(script.bgmDuckVolume, script.bgmVolume),
  });

  return (
    <AbsoluteFill style={{ background: palette.bgDeep }}>
      <FontPreloader sampleText={collectText(script)} />

      {script.bgm ? (
        <Audio
          src={resolveSrc(script.bgm)}
          name="BGM"
          // 曲が動画より短くても最後まで鳴らす
          loop
          // ループしても音量カーブは動画全体の時間軸で評価してほしい
          loopVolumeCurveBehavior="extend"
          volume={bgmVolume}
        />
      ) : null}

      {timings.map(({ scene, from, durationInFrames }, i) => {
        const incoming: TransitionKind =
          i === 0
            ? "cut"
            : (timings[i - 1].scene.transition ?? script.transition);

        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={durationInFrames}
            name={`${i + 1}. ${scene.type}`}
            layout="none"
          >
            <SceneDurationContext.Provider value={durationInFrames}>
              <SceneFrame
                scene={scene}
                script={script}
                palette={palette}
                index={i}
                incoming={incoming}
              />
            </SceneDurationContext.Provider>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
