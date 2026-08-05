import {Config} from '@remotion/cli/config';
import {existsSync, readdirSync} from 'node:fs';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// ブラウザのダウンロードができない環境 (Claude Code on the web など) では、
// インストール済みの Chromium headless shell を使う。
// ローカルでは何も見つからなければ Remotion が自動でダウンロードする。
// REMOTION_BROWSER_EXECUTABLE で明示的に上書きも可能。
const findBrowser = (): string | null => {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) {
    return process.env.REMOTION_BROWSER_EXECUTABLE;
  }
  const pwDir = '/opt/pw-browsers';
  if (existsSync(pwDir)) {
    const shellDir = readdirSync(pwDir).find((d) =>
      d.startsWith('chromium_headless_shell-'),
    );
    if (shellDir) {
      const shell = `${pwDir}/${shellDir}/chrome-linux/headless_shell`;
      if (existsSync(shell)) {
        return shell;
      }
    }
  }
  return null;
};

const browser = findBrowser();
if (browser) {
  Config.setBrowserExecutable(browser);
}
