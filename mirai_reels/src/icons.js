/* イラストアイコン（すべて図形で手作り。外部素材・AI生成は使わない）
 * どれも viewBox 0 0 200 200 の中に描く。実在の商品や施設は形をまねず、イメージと分かる単純な形にとどめる。 */
const ICON = {
  // プレゼント箱（リボン付き）
  gift: (c1 = '#EE7A5C', c2 = '#F6CD5A') => `
    <rect x="34" y="90" width="132" height="92" rx="12" fill="${c1}"/>
    <rect x="24" y="66" width="152" height="36" rx="10" fill="${c1}"/>
    <rect x="24" y="66" width="152" height="36" rx="10" fill="#fff" opacity=".18"/>
    <rect x="88" y="66" width="24" height="116" fill="${c2}"/>
    <path d="M100 66 C78 32 48 40 60 60 C66 70 86 68 100 66Z" fill="${c2}"/>
    <path d="M100 66 C122 32 152 40 140 60 C134 70 114 68 100 66Z" fill="${c2}"/>
    <circle cx="100" cy="66" r="10" fill="#E8B530"/>`,
  // クリスマスツリー（飾りは .tw でまたたく）
  tree: () => `
    <path d="M100 26 L148 92 L124 92 L162 148 L38 148 L76 92 L52 92 Z" fill="#3E9F73"/>
    <rect x="88" y="148" width="24" height="32" rx="4" fill="#8A5A3B"/>
    <path d="M100 6 L106 20 L121 21 L109 30 L113 45 L100 37 L87 45 L91 30 L79 21 L94 20Z" fill="#F6CD5A"/>
    <circle class="tw" cx="88" cy="76" r="7" fill="#F6CD5A"/><circle class="tw" cx="116" cy="108" r="8" fill="#EE7A5C"/>
    <circle class="tw" cx="78" cy="128" r="8" fill="#fff"/><circle class="tw" cx="130" cy="134" r="7" fill="#F6CD5A"/>
    <circle class="tw" cx="100" cy="98" r="6" fill="#fff"/><circle class="tw" cx="62" cy="140" r="6" fill="#EE7A5C"/>`,
  // 宝石（ひし形）
  gem: () => `
    <path d="M44 74 L76 40 L124 40 L156 74 L100 168 Z" fill="#86C2EC"/>
    <path d="M44 74 L156 74 L100 168 Z" fill="#5BA8E0"/>
    <path d="M76 40 L90 74 L100 168 L110 74 L124 40 M44 74 L156 74" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity=".85"/>
    <path d="M150 22 C152 32 154 34 164 36 C154 38 152 40 150 50 C148 40 146 38 136 36 C146 34 148 32 150 22Z" fill="#F6CD5A"/>
    <path d="M40 120 C41 127 43 129 50 130 C43 131 41 133 40 140 C39 133 37 131 30 130 C37 129 39 127 40 120Z" fill="#fff"/>`,
  // 音符と光
  music: () => `
    <path d="M30 190 L80 70 L96 70 Z" fill="#F4D6CC" opacity=".55"/>
    <path d="M170 190 L120 70 L104 70 Z" fill="#BFE6D3" opacity=".55"/>
    <path d="M100 190 L94 60 L106 60 Z" fill="#F6CD5A" opacity=".6"/>
    <rect x="112" y="30" width="12" height="96" rx="4" fill="#F6CD5A"/>
    <ellipse cx="102" cy="128" rx="26" ry="20" fill="#F6CD5A" transform="rotate(-18 102 128)"/>
    <path d="M118 30 C148 38 160 52 156 80 C148 64 134 58 118 58Z" fill="#F6CD5A"/>
    <path d="M58 40 C60 50 62 52 72 54 C62 56 60 58 58 68 C56 58 54 56 44 54 C54 52 56 50 58 40Z" fill="#fff"/>`,
  // もみじの葉
  maple: (c = '#EE7A5C') => `<g transform="translate(100 96) scale(2.1)"><path d="${SHAPE.maple}" fill="${c}"/></g><path d="M100 150 L100 188" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`,
  // 山とライトアップ
  mountain: () => `
    <circle cx="100" cy="96" r="80" fill="#F6CD5A" opacity=".35"/>
    <path d="M6 176 L76 60 Q84 48 92 60 L116 96 L136 72 Q142 64 148 72 L194 176 Z" fill="#6E9E72"/>
    <path d="M76 60 Q84 48 92 60 L104 78 L92 74 L84 82 L72 74Z" fill="#fff" opacity=".7"/>
    <circle cx="40" cy="160" r="22" fill="#EE7A5C"/><circle cx="70" cy="168" r="20" fill="#F29B38"/>
    <circle cx="160" cy="162" r="22" fill="#D9603F"/><circle cx="132" cy="170" r="18" fill="#F6CD5A"/>
    <rect x="94" y="140" width="14" height="40" fill="#8A5A3B"/><path d="M84 142 L118 142 L101 126 Z" fill="#8A5A3B"/>
    <rect x="96" y="148" width="10" height="10" fill="#F6CD5A"/>`,
  // もみじの木とスポットライト
  mapleTree: () => `
    <path d="M10 196 L64 90 L84 96 Z" fill="#F6CD5A" opacity=".45"/>
    <path d="M190 196 L136 90 L116 96 Z" fill="#F6CD5A" opacity=".45"/>
    <rect x="92" y="120" width="16" height="66" rx="6" fill="#8A5A3B"/>
    <circle cx="74" cy="88" r="40" fill="#D9603F"/><circle cx="126" cy="84" r="42" fill="#EE7A5C"/>
    <circle cx="100" cy="54" r="40" fill="#F29B38"/><circle cx="100" cy="104" r="34" fill="#EE7A5C"/>`,
  // メタセコイアの並木
  metasequoia: () => `
    <path d="M10 186 L190 186" stroke="#8A5A3B" stroke-width="8" stroke-linecap="round"/>
    <path d="M40 186 L58 34 L76 186Z" fill="#D9741A"/><path d="M76 186 L92 58 L108 186Z" fill="#E8903A"/>
    <path d="M108 186 L122 80 L136 186Z" fill="#D9741A"/><path d="M136 186 L148 100 L160 186Z" fill="#E8903A"/>
    <path d="M160 186 L170 118 L180 186Z" fill="#D9741A"/>`,
  // 池と橋のある庭
  garden: () => `
    <ellipse cx="100" cy="160" rx="92" ry="30" fill="#86C2EC"/>
    <path d="M30 150 Q100 80 170 150" fill="none" stroke="#D9603F" stroke-width="12" stroke-linecap="round"/>
    <path d="M44 138 L44 118 M72 116 L72 96 M100 108 L100 88 M128 116 L128 96 M156 138 L156 118" stroke="#D9603F" stroke-width="6" stroke-linecap="round"/>
    <circle cx="34" cy="70" r="30" fill="#EE7A5C"/><circle cx="62" cy="52" r="26" fill="#F29B38"/>
    <circle cx="168" cy="66" r="30" fill="#D9603F"/><circle cx="140" cy="48" r="22" fill="#F6CD5A"/>`,
  // 目覚まし時計（R04）
  clock: () => `
    <circle cx="58" cy="44" r="22" fill="#4A3328"/><circle cx="142" cy="44" r="22" fill="#4A3328"/>
    <circle cx="100" cy="108" r="74" fill="#4A3328"/><circle cx="100" cy="108" r="62" fill="#fff"/>
    <path d="M100 108 L100 66 M100 108 L130 124" stroke="#EE7A5C" stroke-width="9" stroke-linecap="round"/>
    <circle cx="100" cy="108" r="8" fill="#4A3328"/>
    <path d="M56 176 L44 194 M144 176 L156 194" stroke="#4A3328" stroke-width="10" stroke-linecap="round"/>`,
  // コメントの吹き出し
  comment: (c = '#fff', d = '#EE7A5C') => `
    <path d="M30 40 H170 Q186 40 186 56 V128 Q186 144 170 144 H86 L52 176 L58 144 H30 Q14 144 14 128 V56 Q14 40 30 40Z" fill="${c}"/>
    <circle cx="66" cy="92" r="11" fill="${d}"/><circle cx="100" cy="92" r="11" fill="${d}"/><circle cx="134" cy="92" r="11" fill="${d}"/>`,
  // フォロー（人＋プラス）
  follow: () => `
    <circle cx="84" cy="72" r="34" fill="#EE7A5C"/><path d="M24 176 C24 128 56 112 84 112 C112 112 144 128 144 176Z" fill="#EE7A5C"/>
    <circle cx="152" cy="132" r="34" fill="#3E9F73"/><path d="M152 114 V150 M134 132 H170" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`,
  // 紙袋（R06）
  bag: () => `
    <path d="M70 70 C70 34 130 34 130 70" fill="none" stroke="#8A5A3B" stroke-width="10" stroke-linecap="round"/>
    <path d="M40 66 H160 L172 186 H28 Z" fill="#D9A066"/><path d="M40 66 H160 L164 96 H36Z" fill="#C88B50"/>
    <g transform="translate(100 140) scale(1.2)"><path d="${SHAPE.heart}" fill="#EE7A5C"/></g>`,
  // せいろ（シューマイ）
  seiro: () => `
    <path d="M86 46 Q80 30 90 20 M110 46 Q104 30 114 20 M134 50 Q128 34 138 24" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="100" cy="74" rx="78" ry="20" fill="#C88B50"/>
    <rect x="22" y="74" width="156" height="48" fill="#D9A066"/><ellipse cx="100" cy="122" rx="78" ry="20" fill="#D9A066"/>
    <rect x="22" y="122" width="156" height="44" fill="#C88B50"/><ellipse cx="100" cy="166" rx="78" ry="20" fill="#B7793F"/>
    <path d="M22 98 H178 M22 144 H178" stroke="#8A5A3B" stroke-width="4" opacity=".5"/>`,
  // 鳥のシルエット（単純な形）
  bird: () => `
    <path d="M30 120 C30 82 64 62 100 66 C114 50 140 44 156 56 C168 64 170 76 164 84 L184 92 L162 98 C160 140 120 166 80 162 C52 160 30 146 30 120Z" fill="#8A5A3B"/>
    <path d="M60 116 C80 96 110 98 122 118 C104 112 84 114 60 116Z" fill="#fff" opacity=".35"/>
    <circle cx="150" cy="74" r="6" fill="#fff"/>`,
  // かまぼこ（半月形）
  kamaboko: () => `
    <rect x="20" y="138" width="160" height="26" rx="6" fill="#D9A066"/>
    <path d="M28 138 C28 70 172 70 172 138Z" fill="#F4A6A0"/>
    <path d="M44 138 C44 86 156 86 156 138Z" fill="#fff"/>`,
  // カレー（スプーン＋皿）
  curry: () => `
    <ellipse cx="96" cy="128" rx="84" ry="44" fill="#fff"/><ellipse cx="96" cy="124" rx="70" ry="34" fill="#F2E6D6"/>
    <path d="M30 122 C40 98 80 92 100 104 C120 92 160 100 164 124 C150 140 60 144 30 122Z" fill="#B5651D"/>
    <path d="M40 120 C52 104 80 104 96 114 C80 126 56 128 40 120Z" fill="#fff"/>
    <rect x="150" y="40" width="14" height="86" rx="7" fill="#B8C2CC" transform="rotate(28 157 83)"/>
    <ellipse cx="176" cy="44" rx="16" ry="24" fill="#B8C2CC" transform="rotate(28 176 44)"/>`,
  // 折り紙（R07）
  origami: () => `
    <path d="M100 18 L182 100 L100 182 L18 100Z" fill="#EE7A5C"/>
    <path d="M100 18 L182 100 L18 100Z" fill="#F4A08A"/>
    <path d="M18 100 H182" stroke="#fff" stroke-width="4" stroke-dasharray="10 8"/>`,
  // 地球（体になるパーツ）
  earth: () => `
    <circle cx="100" cy="100" r="80" fill="#5BA8E0"/>
    <path d="M60 50 C80 40 96 54 88 70 C80 84 92 96 78 108 C66 118 46 108 44 92 C42 76 46 58 60 50Z" fill="#7CCBA2"/>
    <path d="M118 112 C136 104 158 112 160 130 C162 150 140 166 124 160 C110 154 104 122 118 112Z" fill="#7CCBA2"/>
    <path d="M128 42 C140 44 150 54 148 62 C140 62 128 56 128 42Z" fill="#7CCBA2"/>`,
  // あし（地球の下につけるパーツ）
  legs: () => `
    <rect x="46" y="40" width="40" height="120" rx="20" fill="#3E9F73"/>
    <rect x="114" y="40" width="40" height="120" rx="20" fill="#3E9F73"/>
    <ellipse cx="60" cy="166" rx="32" ry="16" fill="#2F7F5A"/><ellipse cx="140" cy="166" rx="32" ry="16" fill="#2F7F5A"/>`,
  // ハート
  heart: (c = '#EE7A5C') => `<g transform="translate(100 104) scale(4)"><path d="${SHAPE.heart}" fill="${c}"/></g>`,
  // 家（R08）
  house: () => `
    <path d="M100 20 L186 92 L164 92 L164 180 L36 180 L36 92 L14 92 Z" fill="#F6EDE2"/>
    <path d="M100 20 L186 92 L14 92 Z" fill="#EE7A5C"/>
    <rect x="84" y="118" width="36" height="62" rx="6" fill="#8A5A3B"/>
    <rect x="50" y="110" width="26" height="26" rx="4" fill="#86C2EC"/><rect x="128" y="110" width="26" height="26" rx="4" fill="#86C2EC"/>`,
  // 下向き矢印
  arrow: (c = '#EE7A5C') => `<path d="M76 20 H124 V104 H160 L100 176 L40 104 H76 Z" fill="${c}"/>`,
  // 備えの品（R08）
  water: () => `<rect x="70" y="20" width="60" height="20" rx="6" fill="#3B88C7"/><path d="M66 48 H134 Q146 60 146 80 V170 Q146 182 134 182 H66 Q54 182 54 170 V80 Q54 60 66 48Z" fill="#86C2EC"/><rect x="54" y="96" width="92" height="40" fill="#fff" opacity=".7"/>`,
  food: () => `<rect x="24" y="80" width="70" height="96" rx="10" fill="#B8C2CC"/><rect x="24" y="104" width="70" height="40" fill="#EE7A5C"/><path d="M110 176 L146 80 L182 176Z" fill="#fff" stroke="#4A3328" stroke-width="5" stroke-linejoin="round"/><rect x="128" y="138" width="36" height="38" fill="#2E2420"/>`,
  toilet: () => `<rect x="56" y="24" width="88" height="58" rx="10" fill="#fff" stroke="#4A3328" stroke-width="6"/><path d="M36 92 H164 Q164 150 110 156 L118 184 H82 L90 156 Q36 150 36 92Z" fill="#fff" stroke="#4A3328" stroke-width="6" stroke-linejoin="round"/>`,
  light: () => `<path d="M118 70 L190 30 L190 170 L118 130Z" fill="#F6CD5A" opacity=".55"/><rect x="20" y="78" width="80" height="44" rx="10" fill="#4A3328"/><path d="M96 70 L124 60 V140 L96 130Z" fill="#7A6556"/><rect x="40" y="88" width="20" height="10" rx="4" fill="#EE7A5C"/>`,
  battery: () => `<rect x="30" y="56" width="110" height="88" rx="14" fill="#3E9F73"/><rect x="140" y="80" width="16" height="40" rx="5" fill="#3E9F73"/><path d="M92 68 L64 106 H86 L76 134 L112 92 H90 L100 68Z" fill="#F6CD5A"/><path d="M156 100 C176 100 176 150 150 160" fill="none" stroke="#4A3328" stroke-width="6" stroke-linecap="round"/>`,
  medicine: () => `<g transform="rotate(-35 100 100)"><rect x="40" y="76" width="120" height="48" rx="24" fill="#fff" stroke="#4A3328" stroke-width="6"/><path d="M100 76 H136 A24 24 0 0 1 136 124 H100Z" fill="#EE7A5C"/></g><circle cx="150" cy="150" r="22" fill="#F6CD5A" stroke="#4A3328" stroke-width="5"/>`,
  phone: () => `<path d="M58 26 C70 22 80 30 86 46 L94 70 C96 80 90 88 82 92 C90 114 104 128 126 138 C130 130 138 124 148 126 L172 134 C188 140 194 150 190 162 L184 176 C180 186 168 192 150 188 C90 172 34 116 20 56 C16 40 22 30 34 28Z" fill="#fff"/>`,
  // チェックマーク
  check: (c = '#EE7A5C') => `<path d="M20 64 L50 96 L108 22" fill="none" stroke="${c}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 小さな地図ピン（場所の行に添える）
  pin: (c = '#EE7A5C') => `<path d="M100 186 C60 130 40 104 40 76 A60 60 0 0 1 160 76 C160 104 140 130 100 186Z" fill="${c}"/><circle cx="100" cy="76" r="24" fill="#fff"/>`,
  // 虫めがね
  lens: () => `<circle cx="84" cy="84" r="52" fill="none" stroke="#4A3328" stroke-width="18"/><path d="M122 122 L176 176" stroke="#4A3328" stroke-width="22" stroke-linecap="round"/>`,
  // 電球のガーランド（R05 の表紙）
  garland: () => `
    <path d="M4 40 Q100 110 196 40" fill="none" stroke="#4A3328" stroke-width="4"/>
    ${[[28, 60, '#F6CD5A'], [64, 78, '#EE7A5C'], [100, 84, '#BFE6D3'], [136, 78, '#F6CD5A'], [172, 60, '#EE7A5C']].map(([x, y, c]) => `<circle class="tw" cx="${x}" cy="${y + 12}" r="11" fill="${c}"/><rect x="${x - 5}" y="${y - 2}" width="10" height="8" fill="#4A3328"/>`).join('')}`,
};
// 場所の行など、文字の前に小さく添えるインラインのアイコン
const inlineIcon = (inner, size = 46) => `<svg viewBox="0 0 200 200" style="width:${size}px;height:${size}px;vertical-align:-0.12em;margin-right:6px">${inner}</svg>`;
