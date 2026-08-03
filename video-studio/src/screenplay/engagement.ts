import { Screenplay } from './types';

// サンプル台本: 「若手エンゲージメント向上」(ビジネステーマ+ナレーション音声+BGM)
// durationSec は各ナレーション音声の実尺+約1.1秒。
// 出典メモ: 熱意ある社員5%(Gallup State of the Global Workplace)、
// 3年以内離職 約3人に1人(厚労省 新規学卒就職者の離職状況)、
// 離職率 最大43%低下(Gallup Q12 メタ分析)。
export const engagementScreenplay: Screenplay = {
  title: '若手エンゲージメント向上',
  bgm: { file: 'bgm/corporate_pad.mp3', volume: 0.13 },
  scenes: [
    {
      type: 'title',
      series: '1分でわかる 組織づくり',
      title: '若手の\nエンゲージメント',
      episode: '第一回 若手のエンゲージメント向上',
      tagline: '明日から使える マネジメントの型',
      audio: 'narration/eng_01.mp3',
      durationSec: 8.4,
    },
    {
      type: 'text',
      text: 'なぜ、若手は\n静かに離れていくのか',
      variant: 'question',
      audio: 'narration/eng_02.mp3',
      durationSec: 10.7,
      narration: '入社3年以内の離職は、いまや**3人に1人**。',
    },
    {
      type: 'stat',
      heading: '仕事に熱意を持つ\n日本の社員',
      label: '熱意ある社員',
      value: 5,
      valueSuffix: '%',
      barRatio: 0.05,
      mood: 'dark',
      audio: 'narration/eng_03.mp3',
      durationSec: 10.0,
      narration: '熱意ある社員は、わずか**5%**。世界最低水準です。',
    },
    {
      type: 'text',
      text: '鍵は、心理的安全性',
      variant: 'impact',
      audio: 'narration/eng_04.mp3',
      durationSec: 9.8,
      narration: '安心して発言できる空気が、**挑戦**を生む。',
    },
    {
      type: 'timeline',
      headline: '打ち手は 4つ',
      events: [
        { year: '対話', label: '週1の1on1' },
        { year: '裁量', label: '任せて見守る' },
        { year: '学び', label: '成長の言語化' },
        { year: '承認', label: '成果を照らす' },
      ],
      activeIndex: 3,
      mood: 'dark',
      audio: 'narration/eng_05.mp3',
      durationSec: 10.8,
      narration: '**対話・裁量・学び・承認**。小さく始めて続けます。',
    },
    {
      type: 'stat',
      heading: 'エンゲージメントが\n高いチームでは',
      label: '離職率',
      value: 43,
      valueSuffix: '%',
      barRatio: 0.43,
      mood: 'dark',
      audio: 'narration/eng_06.mp3',
      durationSec: 9.5,
      narration: '離職率は最大**43%低下**すると報告されています。',
    },
    {
      type: 'outro',
      heading: '今日の一歩',
      title: 'まず、聞くことから',
      note: '― 次回 1on1の設計 ―',
      audio: 'narration/eng_07.mp3',
      durationSec: 8.9,
    },
  ],
};
