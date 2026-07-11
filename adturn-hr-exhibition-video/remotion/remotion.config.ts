import {Config} from '@remotion/cli/config';

Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
// ヘッドレス環境でWebGL(Three.js)を有効化するためSwiftShader(ANGLE)を使用
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
