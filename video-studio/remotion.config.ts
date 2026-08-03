import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// 品質を落とさないためJPEG品質は高めに固定する
Config.setJpegQuality(95);
