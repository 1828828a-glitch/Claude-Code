import { continueRender, delayRender } from "remotion";
import weight700 from "./assets/fonts/noto-sans-jp-700.subset.woff2";
import weight900 from "./assets/fonts/noto-sans-jp-900.subset.woff2";

const FAMILY = "Noto Sans JP Local";

/**
 * 日本語フォントは同梱し、data: URI としてバンドルに埋め込んで使う。
 *
 * Google Fonts から取ると、日本語は文字コード範囲ごとに分割配信されるため
 * 1 フレームあたり千回以上のリクエストが飛び、オフラインや社内ネットワークでは
 * そもそも落ちてこない。同梱しておけば、どこでも同じ絵が出る。
 *
 * 置いてあるのは台本で使う文字だけに絞ったもの（scripts/build-fonts.mjs が作る）。
 * 台本に新しい漢字を足したら `npm run fonts` を流し直すこと。
 */
const face = (url: string, weight: number) =>
  `@font-face{font-family:"${FAMILY}";src:url(${url}) format("woff2");` +
  `font-weight:${weight};font-style:normal;font-display:block;}`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = face(weight700, 700) + face(weight900, 900);
  document.head.appendChild(style);

  // 見えない場所に文字を置いて、ブラウザにフォントを «必要なもの» と認識させる。
  // これをやらないと読み込みが始まらず、下の fonts.ready が空振りで解決してしまう。
  const probe = document.createElement("div");
  probe.setAttribute(
    "style",
    "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;" +
      `font-family:"${FAMILY}";`,
  );
  probe.innerHTML = `<span style="font-weight:700">あ亜A1</span><span style="font-weight:900">あ亜A1</span>`;
  document.body.appendChild(probe);

  // retries を付けておくと、万一このタブでフォントが読めなくても
  // Remotion がタブを作り直してそのフレームだけやり直す。
  // 付けないと、1 フレームの失敗がそのまま書き出し全体の失敗になる。
  const handle = delayRender("日本語フォントの読み込み", {
    retries: 3,
    timeoutInMilliseconds: 15000,
  });
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    continueRender(handle);
  };

  // FontFace.load() は使わない。レンダリング中にページが作り直されたとき、
  // 解決しないまま止まることがあり、1 フレーム詰まっただけで書き出し全体が落ちる。
  document.fonts.ready.then(finish, finish);
  // 埋め込みフォントは取得が無いので、待つとしてもこの程度で足りる。
  // 万一 ready が返ってこなくても、ここで必ず先へ進む。
  setTimeout(finish, 5000);
}

/** 実際に指定するフォントスタック。同梱フォントが無い場合は OS の CJK フォントに落ちる。 */
export const fontFamily = `"${FAMILY}", "Noto Sans CJK JP", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif`;
