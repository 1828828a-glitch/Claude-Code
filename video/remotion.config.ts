import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
// レンダリング中にタブが作り直されることがあり、その直後は初期化に時間がかかる。
// 既定の 30 秒だと稀に足りずに書き出し全体が落ちるので、余裕を持たせておく。
Config.setDelayRenderTimeoutInMilliseconds(60000);
// 紙のテクスチャとフラットな色面はノイズが乗りにくいので CRF は低め（高画質）に。
Config.setCrf(18);

/**
 * フォントをファイルとして配信せず、バンドルに base64 で埋め込む。
 *
 * 既定の asset/resource だと 1MB 超の日本語フォントを毎タブ HTTP で取りにいくことになり、
 * レンダリング中にごく稀に応答が返らないままタイムアウトする。埋め込めば取得自体が消える。
 */
Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: (config.module?.rules ?? []).map((rule) => {
      if (
        rule &&
        typeof rule === "object" &&
        rule.test instanceof RegExp &&
        rule.test.test("font.woff2")
      ) {
        return { ...rule, type: "asset/inline" as const };
      }
      return rule;
    }),
  },
}));
