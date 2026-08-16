import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// 並列数は指定しない（Remotion が CPU コア数から決める）。
// 遅いときは `--concurrency=8` のようにコマンドラインで上書きする。

// 日本語フォント (CJK) はサブセットが多く読み込みに時間がかかるため長めに取る
Config.setDelayRenderTimeoutInMilliseconds(120_000);

// ソフトウェア GL。GPU の無いコンテナ/CI でも同じ絵が出るので既定にしている。
// 中身は 2D の DOM 描画なので GPU の恩恵はほぼ無いが、
// GPU のあるマシンで速度を追い込みたいならこの行を消してよい。
Config.setChromiumOpenGlRenderer("swangle");

export {};
