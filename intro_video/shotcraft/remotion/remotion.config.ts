import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// 3D 変換を伴うショットが多いので angle を使う(template と同じ設定)
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(4);
