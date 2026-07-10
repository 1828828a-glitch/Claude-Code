import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// CI・コンテナ環境などで既存の Chromium を使う場合は
// CHROME_BIN=/path/to/chrome を指定してレンダリングする
if (process.env.CHROME_BIN) {
  Config.setBrowserExecutable(process.env.CHROME_BIN);
}
