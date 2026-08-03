import { Screenplay } from './types';

// デモ台本: 「黒船来航」(参照動画のフォーマット確認用)
// 全シーン種別を一通り使い、品質チェックの基準にする。
export const demoScreenplay: Screenplay = {
  title: '黒船来航',
  scenes: [
    {
      type: 'title',
      series: '1分でわかる日本史',
      title: '黒船来航',
      episode: '第二回 黒船来航',
      tagline: '歴史の流れが たった1分でつかめる!',
    },
    {
      type: 'year',
      year: '1853',
      suffix: '年',
      subLabel: '嘉永六年',
      mood: 'light',
      narration: '時は**1853年**。太平の世に、終わりが近づいていました。',
    },
    {
      type: 'character',
      name: 'ペリー提督',
      countryLabel: 'アメリカ',
      flagEmoji: '🇺🇸',
      infoLines: ['アメリカ東インド艦隊 司令長官', '当時 59歳'],
      mood: 'light',
      narration: 'アメリカから**ペリー提督**が日本に向かいます。',
    },
    {
      type: 'lineup',
      label: '黒船',
      icon: 'ship',
      count: 4,
      unit: '隻',
      narration: '巨大な蒸気軍艦、その数**4隻**。',
    },
    {
      type: 'map',
      label: '浦賀',
      subLabel: '現・神奈川県横須賀市',
      target: 'uraga',
      highlights: [
        { place: 'uraga', radius: 60 },
        { place: 'edo', radius: 45 },
      ],
      zoom: 1.7,
      mood: 'light',
      narration: '艦隊が現れたのは、江戸の目と鼻の先・**浦賀沖**でした。',
    },
    {
      type: 'text',
      text: '泰平の眠りを覚ます黒船',
      variant: 'impact',
      cornerTag: '1853.7.8 夕刻',
      embers: true,
      narration: '幕府も江戸の町も、**大混乱**に陥ります。',
    },
    {
      type: 'stat',
      heading: '幕府に迫られた\nおおきな決断',
      label: '鎖国体制',
      value: 215,
      valueSuffix: '年',
      barRatio: 0.9,
      mood: 'dark',
      showJapanSilhouette: true,
      narration: '**215年**続いた鎖国が、いま揺らごうとしていました。',
    },
    {
      type: 'timeline',
      events: [
        { year: '1853', label: '黒船来航' },
        { year: '1854', label: '日米和親条約' },
        { year: '1858', label: '修好通商条約' },
        { year: '1867', label: '大政奉還' },
      ],
      activeIndex: 0,
      mood: 'dark',
      narration: 'ここから日本は、**開国**へと大きく舵を切ります。',
    },
    {
      type: 'outro',
      heading: '次回',
      title: '日米和親条約',
      note: '― 泰平の眠り、その後 ―',
    },
  ],
};
