// 図解に置くイラスト（自作の SVG）
//
// 元の図解はいらすとやの素材を使っている。ここでは同じ役どころの人物を自前で描いた。
// JSON の "illust" に名前を書くとこの SVG が入る。画像ファイルのパスを書くとそちらを使う。
// BEFORE 側では CSS でグレーにするので、ここでは色付きで描いておく。

const SKIN = '#f8dac2';
const HAIR = '#1f1f24';

const ILLUST = {
  // 疲れた顔でノートPCに向かう会社員
  worker_tired: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M29 12v8M35 10v9M41 12v8" stroke="#9aa0a6" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M18 82C18 63 27 56 40 56S62 63 62 82Z" fill="#3f4652"/>
  <path d="M35 56l5 8 5-8z" fill="#fff"/>
  <circle cx="40" cy="40" r="13.5" fill="${SKIN}"/>
  <path d="M26.5 39C26 27 33 23.5 41 23.5S54.5 28 53.5 38.5C50 33 45 31.5 39 33.5S30 36.5 26.5 39Z" fill="${HAIR}"/>
  <path d="M33 42.5h5M43 42.5h5" stroke="#2a2a2a" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M33 45.5q2.5 1.4 5 0M43 45.5q2.5 1.4 5 0" stroke="#9d8a7a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <path d="M36.5 50.5q3.5-1.6 7 0" stroke="#7a4b3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M57 50.5l25-2.5 2 28-25 1z" fill="#b9c0c8" stroke="#8a929b" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M28 78c9-4 18-4 30-2v4H28z" fill="#3f4652"/>
  <ellipse cx="57" cy="77" rx="4.5" ry="3" fill="${SKIN}"/>
  <path d="M46 77.5l45-1v3.5l-45 1z" fill="#8a929b"/>
  <rect x="10" y="80" width="84" height="4.5" rx="1" fill="#6d737b"/>
  <rect x="14" y="84.5" width="76" height="9" fill="#c4c9cf"/>
</svg>`,

  // 中身のない人形。頭は脳を映すモニター
  ai_blank: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="35" y="5" width="30" height="23" rx="2.5" fill="#3b3f45"/>
  <rect x="37.5" y="7.5" width="25" height="18" rx="1" fill="#5b6067"/>
  <ellipse cx="50" cy="16.5" rx="9" ry="6.5" fill="#c9ccd0"/>
  <path d="M50 10.5v12M43.5 14.5q3-2.6 6.5 0 3.5-2.6 6.5 0M43 18.5q3.4 2 7 0 3.6 2 7 0" stroke="#878c93" stroke-width="1" fill="none" stroke-linecap="round"/>
  <rect x="46.5" y="28" width="7" height="4.5" fill="#e6e7e9"/>
  <g fill="#f5f6f7" stroke="#b3b7bc" stroke-width="1.2">
    <rect x="33.5" y="34" width="6.5" height="27" rx="3.2"/>
    <rect x="60" y="34" width="6.5" height="27" rx="3.2"/>
    <rect x="41.5" y="57" width="7.5" height="37" rx="3.5"/>
    <rect x="51" y="57" width="7.5" height="37" rx="3.5"/>
    <rect x="39.5" y="32" width="21" height="29" rx="7"/>
  </g>
</svg>`,

  // コーヒーを片手にくつろぐ会社員
  man_coffee: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M26 100C26 79 37 68 57 68s31 11 31 32z" fill="#2d3a55"/>
  <path d="M50 68l7 16 7-16z" fill="#fff"/>
  <path d="M55.5 70h3l1 12-2.5 6-2.5-6z" fill="#2e6fd8"/>
  <path d="M50 68l7 16-10-9zM64 68l-7 16 10-9z" fill="#222c42"/>
  <rect x="52" y="57" width="10" height="12" fill="#efc6a6"/>
  <ellipse cx="41.5" cy="44" rx="2.6" ry="3.6" fill="${SKIN}"/>
  <ellipse cx="72.5" cy="44" rx="2.6" ry="3.6" fill="${SKIN}"/>
  <ellipse cx="57" cy="42" rx="15.5" ry="17.5" fill="${SKIN}"/>
  <path d="M41.5 41C39.5 25 48 20.5 57 20.5S74.5 25 72.5 41C71 33 67 30 61 31S49 33 44 30.5C42.8 33.5 42 37 41.5 41Z" fill="${HAIR}"/>
  <path d="M47 39.5h5M62 39.5h5" stroke="#2a2a2a" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M47 44q2.5-2.4 5 0M62 44q2.5-2.4 5 0" stroke="#2a2a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="47" cy="49.5" r="3" fill="#f3a0a0" opacity=".55"/>
  <circle cx="67" cy="49.5" r="3" fill="#f3a0a0" opacity=".55"/>
  <path d="M53 52.5q4 3.6 8 0" stroke="#b34a4a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M31 100c-2-10 0-18 7-23l7 5c-5 4-6 10-5 18z" fill="#283450"/>
  <path d="M23 56q-3-4 0-7.5t0-7.5M30 56q-3-4 0-7.5t0-7.5" stroke="#b8c0c8" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <rect x="19" y="60" width="15" height="17" rx="2.5" fill="#fff" stroke="#9aa3ad" stroke-width="1.3"/>
  <path d="M34 63.5q5.5 0 5.5 4.5T34 72.5" fill="none" stroke="#9aa3ad" stroke-width="1.6"/>
  <ellipse cx="37" cy="73" rx="5" ry="4.2" fill="${SKIN}"/>
</svg>`,

  // 机で書き物をする AI。まわりに資料が舞っている
  ai_desk: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#9aa3ad" stroke-width="1">
    <g transform="rotate(-12 13 28)"><rect x="6" y="20" width="14" height="17" rx="1" fill="#fff"/>
      <rect x="9" y="30" width="2.2" height="4" fill="#f2a33a" stroke="none"/><rect x="12" y="27" width="2.2" height="7" fill="#3a8ee6" stroke="none"/><rect x="15" y="25" width="2.2" height="9" fill="#46b07a" stroke="none"/></g>
    <g transform="rotate(10 82 16)"><rect x="75" y="8" width="14" height="17" rx="1" fill="#fff"/>
      <path d="M80 20.5v-8l6-1.5v8" stroke="#e0508a" stroke-width="1.4" fill="none"/><circle cx="79" cy="20.5" r="1.6" fill="#e0508a" stroke="none"/><circle cx="85" cy="19" r="1.6" fill="#e0508a" stroke="none"/></g>
    <g transform="rotate(8 88 46)"><rect x="81" y="38" width="14" height="16" rx="1" fill="#fff"/>
      <path d="M83 51l4-5 3 3 2-2 2 4z" fill="#46b07a" stroke="none"/><circle cx="91" cy="42.5" r="1.6" fill="#f2c03a" stroke="none"/></g>
    <g transform="rotate(-6 12 56)"><rect x="5" y="48" width="14" height="16" rx="1" fill="#fff"/>
      <rect x="5" y="48" width="14" height="4" fill="#e85a4f" stroke="none"/><path d="M9 56h6M9 59h6M12 55v6" stroke="#6b7076" stroke-width="1"/></g>
  </g>
  <path d="M33 74c0-15 7-22 17-22s17 7 17 22z" fill="#bfe2ff" stroke="#86b9e3" stroke-width="1.2"/>
  <rect x="46" y="47.5" width="8" height="5" fill="#d6edff"/>
  <rect x="32.5" y="20" width="35" height="28" rx="3" fill="#1d4f9e"/>
  <rect x="35.5" y="23" width="29" height="22" rx="1.5" fill="#2f7de0"/>
  <ellipse cx="50" cy="34" rx="10.5" ry="7.8" fill="#a6dbff"/>
  <path d="M50 26.5v15M42.5 31.5q3.7-3 7.5 0 3.8-3 7.5 0M42 36.5q4 2.6 8 0 4 2.6 8 0" stroke="#4f9de6" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <rect x="39" y="66" width="22" height="6" fill="#fff" stroke="#ccd2d8" stroke-width="1"/>
  <path d="M55 70l8-8" stroke="#3b3f45" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="56" cy="69.5" rx="4" ry="3" fill="#bfe2ff" stroke="#86b9e3" stroke-width="1"/>
  <rect x="17" y="72" width="66" height="7" rx="1.2" fill="#c98a4b"/>
  <rect x="21" y="79" width="58" height="4" fill="#a86d36"/>
  <rect x="24" y="83" width="4.5" height="13" fill="#a86d36"/>
  <rect x="71.5" y="83" width="4.5" height="13" fill="#a86d36"/>
</svg>`,

  // にこにこ顔で資料を差し出す部下
  man_paper: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 100C16 77 30 66 50 66s34 11 34 34z" fill="#2d3a55"/>
  <path d="M43 66l7 15 7-15z" fill="#fff"/>
  <path d="M48.5 68h3l1 11-2.5 5-2.5-5z" fill="#1f9e7a"/>
  <path d="M43 66l7 15-10-8zM57 66l-7 15 10-8z" fill="#222c42"/>
  <rect x="45" y="55" width="10" height="12" fill="#efc6a6"/>
  <ellipse cx="34.5" cy="41" rx="2.6" ry="3.6" fill="${SKIN}"/>
  <ellipse cx="65.5" cy="41" rx="2.6" ry="3.6" fill="${SKIN}"/>
  <ellipse cx="50" cy="39" rx="15.5" ry="17.5" fill="${SKIN}"/>
  <path d="M34.5 38C32.5 22 41 17.5 50 17.5S67.5 22 65.5 38C64 30 60 27 54 28S42 30 37 27.5C35.8 30.5 35 34 34.5 38Z" fill="${HAIR}"/>
  <path d="M40 41.5q3-3 6 0M54 41.5q3-3 6 0" stroke="#2a2a2a" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  <circle cx="40" cy="47" r="3.2" fill="#f3a0a0" opacity=".6"/><circle cx="60" cy="47" r="3.2" fill="#f3a0a0" opacity=".6"/>
  <path d="M45 49.5q5 5.5 10 0z" fill="#c0504d"/>
  <g transform="rotate(-3 50 86)">
    <rect x="22" y="74" width="56" height="24" rx="1" fill="#fff" stroke="#9aa3ad" stroke-width="1.2"/>
    <path d="M28 80h44M28 84.5h44M28 89h44M28 93.5h30" stroke="#a9b1ba" stroke-width="1.3" stroke-dasharray="3 1.5"/>
  </g>
  <ellipse cx="24" cy="85" rx="4.6" ry="4" fill="${SKIN}"/>
  <ellipse cx="76" cy="83" rx="4.6" ry="4" fill="${SKIN}"/>
</svg>`,

  // 腕を組んで資料をにらむ上司
  boss_crossed: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 100C14 76 29 64 50 64s36 12 36 36z" fill="#2b2f36"/>
  <path d="M43 64l7 14 7-14z" fill="#fff"/>
  <path d="M48.6 66h2.8l1 10-2.4 5-2.4-5z" fill="#6b7078"/>
  <rect x="45" y="53" width="10" height="12" fill="#efc6a6"/>
  <ellipse cx="34.5" cy="39" rx="2.6" ry="3.6" fill="${SKIN}"/>
  <ellipse cx="65.5" cy="39" rx="2.6" ry="3.6" fill="${SKIN}"/>
  <ellipse cx="50" cy="37" rx="15.5" ry="17.5" fill="${SKIN}"/>
  <path d="M34.5 36C33 20 41 15.5 50 15.5S67 20 65.5 36C64 29 61 26.5 56 26.5 49 26.5 42 25 38 22.5 36 26 35 30 34.5 36Z" fill="${HAIR}"/>
  <path d="M39 31.5l7 1M61 31.5l-7 1" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
  <g fill="#fff" fill-opacity=".55" stroke="#1d1d1d" stroke-width="1.6">
    <rect x="38.5" y="34" width="10.5" height="8" rx="1.6"/><rect x="51" y="34" width="10.5" height="8" rx="1.6"/>
  </g>
  <path d="M49 37h2" stroke="#1d1d1d" stroke-width="1.6"/>
  <circle cx="43.8" cy="38.2" r="1.3" fill="#222"/><circle cx="56.2" cy="38.2" r="1.3" fill="#222"/>
  <path d="M45.5 49h9" stroke="#7a4b3a" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="22" y="76" width="58" height="13" rx="6.5" fill="#4b515b" stroke="#22262c" stroke-width="1"/>
  <rect x="20" y="82" width="58" height="13" rx="6.5" fill="#5a616c" stroke="#22262c" stroke-width="1" transform="rotate(-4 49 88)"/>
  <ellipse cx="25" cy="80.5" rx="4.4" ry="3.8" fill="${SKIN}"/>
  <ellipse cx="76" cy="86" rx="4.4" ry="3.8" fill="${SKIN}"/>
</svg>`,

  // かばんを持って走る営業
  salesman_run: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M46 62L35 77l-11 7" stroke="#5d626b" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="21" cy="86" rx="5.5" ry="3.2" fill="#6b3e1f" transform="rotate(-20 21 86)"/>
  <path d="M53 62l9 14-3 15" stroke="#6b7078" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="62" cy="94" rx="6" ry="3.2" fill="#6b3e1f"/>
  <path d="M41 37c3-7 17-8 20 0l-2 27H44z" fill="#6b7078"/>
  <path d="M47 33l4.5 11 4.5-11z" fill="#fff"/>
  <path d="M50.3 34.5h2.4l1 10-2.2 3.5-2.2-3.5z" fill="#1f9e7a"/>
  <path d="M58 40l10 6 6-4" stroke="#6b7078" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="75.5" cy="41" r="3.8" fill="${SKIN}"/>
  <path d="M44 40l-7 10-4 7" stroke="#5d626b" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="rotate(-14 27 66)">
    <path d="M23 60v-3h8v3" stroke="#1e1e22" stroke-width="1.8" fill="none"/>
    <rect x="16" y="60" width="22" height="14" rx="2" fill="#1e1e22"/>
  </g>
  <circle cx="33" cy="58" r="3.6" fill="${SKIN}"/>
  <rect x="48" y="27" width="8" height="7" fill="#efc6a6"/>
  <circle cx="52" cy="19" r="11.5" fill="${SKIN}"/>
  <path d="M40.5 19C40 8.5 46.5 6.5 52.5 6.5S64.5 10 63.5 19C61 13.5 57 12.5 52 13.5S43.5 15.5 40.5 19Z" fill="${HAIR}"/>
  <path d="M45 16.5l5 2M59.5 16.5l-5 2" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="47.5" cy="21" r="1.3" fill="#222"/><circle cx="56.5" cy="21" r="1.3" fill="#222"/>
  <circle cx="45.5" cy="25" r="2.4" fill="#f3a0a0" opacity=".55"/><circle cx="58.5" cy="25" r="2.4" fill="#f3a0a0" opacity=".55"/>
  <path d="M50 26.5h4" stroke="#b34a4a" stroke-width="1.4" stroke-linecap="round"/>
</svg>`,
};

module.exports = { ILLUST };
