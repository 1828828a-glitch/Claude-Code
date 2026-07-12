import type { LearningChallenge } from './types';

// STAGE 3: LEARNING PEACE LAB の問題データ。
// 英語3問・算数4問・論理／感情2問。
// mode / subject / gradeLevel を持つデータ駆動型で、後から追加・差し替え可能。

export const CHALLENGES: LearningChallenge[] = [
  // ---------- ENGLISH ----------
  {
    id: 'en-share',
    mode: 'preschool',
    subject: 'english',
    gradeLevel: '園児〜小1',
    situation: '商店街で焼き肉が1皿だけ届いた。みんなが食べたそうにしている。',
    prompt: '食べ物をみんなで分けたい。この場面に合う英語は？',
    choices: [
      {
        label: 'Give me more!',
        effects: { peace: -4, capacity: 0, trust: -4, teamCondition: -2 },
        feedback: '「もっとちょうだい！」では、周りは前に進めない…。'
      },
      {
        label: "Let's share.",
        effects: { peace: 6, capacity: 0, trust: 5, teamCondition: 4 },
        feedback: '「分け合おう」。ひと言で全員がハッピーに！'
      },
      {
        label: 'I am hungry.',
        effects: { peace: 0, capacity: 0, trust: 0, teamCondition: 0 },
        feedback: '気持ちは伝わるけれど、状況はまだ良くならない。'
      }
    ],
    recommendedChoiceIndex: 1
  },
  {
    id: 'en-thanks',
    mode: 'nursery',
    subject: 'english',
    gradeLevel: '園児〜小2',
    situation: '片づけを手伝ってくれた友だちがいる。',
    prompt: '感謝を伝えるのに一番合う英語は？',
    choices: [
      {
        label: 'Thank you for helping.',
        effects: { peace: 5, capacity: 0, trust: 6, teamCondition: 3 },
        feedback: '「手伝ってくれてありがとう」。信頼がぐっと深まった！'
      },
      {
        label: 'Hurry up.',
        effects: { peace: -3, capacity: 0, trust: -5, teamCondition: -3 },
        feedback: '「急いで」…感謝の場面には合わなかった。'
      },
      {
        label: 'Good bye.',
        effects: { peace: 0, capacity: 0, trust: -1, teamCondition: 0 },
        feedback: 'あいさつだけど、感謝はまだ伝わっていない。'
      }
    ],
    recommendedChoiceIndex: 0
  },
  {
    id: 'en-okay',
    mode: 'nursery',
    subject: 'english',
    gradeLevel: '園児〜小2',
    situation: '園庭のすみで、うつむいている子がいる。',
    prompt: 'まず気持ちをたしかめたい。声のかけ方は？',
    choices: [
      {
        label: 'Are you okay?',
        effects: { peace: 6, capacity: 0, trust: 6, teamCondition: 4 },
        feedback: '「だいじょうぶ？」。気持ちに寄り添う第一声！'
      },
      {
        label: 'Move, please.',
        effects: { peace: -3, capacity: 0, trust: -4, teamCondition: -2 },
        feedback: '「どいてね」…今いちばん必要な言葉ではない。'
      },
      {
        label: 'This is a pen.',
        effects: { peace: 0, capacity: 0, trust: 0, teamCondition: 0 },
        feedback: '文法は正しいが、場面には合っていない…！'
      }
    ],
    recommendedChoiceIndex: 0
  },

  // ---------- MATH ----------
  {
    id: 'math-meat',
    mode: 'elementary',
    subject: 'math',
    gradeLevel: '小2〜小3',
    situation: '焼き肉が12枚届いた。おなかを空かせた4人が待っている。',
    prompt: '12枚を4人で同じ数ずつ分けると、1人何枚？',
    choices: [
      {
        label: '2枚',
        effects: { peace: -2, capacity: 0, trust: -2, teamCondition: 0 },
        feedback: '4枚余ってケンカに…。12 ÷ 4 をもう一度！'
      },
      {
        label: '3枚',
        effects: { peace: 6, capacity: 2, trust: 4, teamCondition: 4 },
        feedback: '12 ÷ 4 = 3。全員に3枚ずつ、公平に行き渡った！'
      },
      {
        label: '4枚',
        effects: { peace: -2, capacity: 0, trust: -2, teamCondition: 0 },
        feedback: '4枚ずつだと16枚必要。足りなくなってしまう。'
      }
    ],
    recommendedChoiceIndex: 1,
    rearrange: 'meat'
  },
  {
    id: 'math-banana',
    mode: 'elementary',
    subject: 'math',
    gradeLevel: '小1〜小2',
    situation: 'バナナが10本ある。ゴリラの体調のため、今日は半分だけにしたい。',
    prompt: '「今食べる分」と「後で食べる分」に同じ数ずつ分けると？',
    choices: [
      {
        label: '今10本・後0本',
        effects: { peace: -4, capacity: 0, trust: -3, teamCondition: -6 },
        feedback: '一気に10本はコンディションに悪い…計画的に！'
      },
      {
        label: '今5本・後5本',
        effects: { peace: 6, capacity: 2, trust: 4, teamCondition: 6 },
        feedback: '10 ÷ 2 = 5。楽しみは後にも残る。ゴリラも安心！'
      },
      {
        label: '今3本・後6本',
        effects: { peace: 0, capacity: 0, trust: 0, teamCondition: 1 },
        feedback: '合計9本で1本行方不明…同じ数ずつなら5本と5本。'
      }
    ],
    recommendedChoiceIndex: 1,
    rearrange: 'banana'
  },
  {
    id: 'math-groups',
    mode: 'nursery',
    subject: 'math',
    gradeLevel: '小2〜小3',
    situation: '園児20人でお散歩に行く。安全のため小さなグループに分けたい。',
    prompt: '20人を5人ずつのグループにすると、いくつできる？',
    choices: [
      {
        label: '3グループ',
        effects: { peace: -2, capacity: 0, trust: -2, teamCondition: -2 },
        feedback: '5×3=15人。5人があぶれてしまう！'
      },
      {
        label: '4グループ',
        effects: { peace: 6, capacity: 2, trust: 4, teamCondition: 5 },
        feedback: '20 ÷ 5 = 4。全員に居場所ができた！'
      },
      {
        label: '5グループ',
        effects: { peace: -2, capacity: 0, trust: -2, teamCondition: 0 },
        feedback: '5グループだと4人ずつ。今回は「5人ずつ」がお題！'
      }
    ],
    recommendedChoiceIndex: 1,
    rearrange: 'groups'
  },
  {
    id: 'math-time',
    mode: 'nursery-dx',
    subject: 'math',
    gradeLevel: '小4〜小5',
    situation: '毎日30分かかる写真整理。AIロボットの手伝いで40％短縮できるらしい。',
    prompt: '30分の作業を40％短縮すると、何分になる？',
    choices: [
      {
        label: '12分',
        effects: { peace: 0, capacity: 0, trust: 0, teamCondition: 0 },
        feedback: '12分は「短縮された時間」。残る時間は 30−12=18分。'
      },
      {
        label: '18分',
        effects: { peace: 6, capacity: 4, trust: 3, teamCondition: 4 },
        feedback: '30 × 0.6 = 18分。浮いた12分は子どもとの時間に！'
      },
      {
        label: '24分',
        effects: { peace: -2, capacity: 0, trust: -1, teamCondition: 0 },
        feedback: 'それは20％短縮のとき。40％ならもっと減らせる！'
      }
    ],
    recommendedChoiceIndex: 1,
    rearrange: 'time'
  },

  // ---------- LOGIC / EMOTION ----------
  {
    id: 'emo-face',
    mode: 'preschool',
    subject: 'emotion',
    gradeLevel: '園児〜小1',
    situation: 'ブロック遊びの輪の外で、目に涙をためて足元を見ている子がいる。',
    prompt: 'この子の気持ちに一番近いのは？　どう動く？',
    choices: [
      {
        label: '楽しそうだから、そっとしておく',
        effects: { peace: -4, capacity: 0, trust: -3, teamCondition: -2 },
        feedback: '涙と下向きの視線…楽しいサインではなかった。'
      },
      {
        label: '寂しそう。「一緒にやろう」と輪に誘う',
        effects: { peace: 7, capacity: 0, trust: 6, teamCondition: 5 },
        feedback: '表情から気持ちを読み取れた。輪が一つ大きくなった！'
      },
      {
        label: '怒っているので先生を呼ぶ',
        effects: { peace: 0, capacity: 0, trust: 0, teamCondition: 1 },
        feedback: '大人を頼るのも大切。でもまずは気持ちの読み取りから。'
      }
    ],
    recommendedChoiceIndex: 1
  },
  {
    id: 'logic-gorilla',
    mode: 'sales-training',
    subject: 'logic',
    gradeLevel: '小4〜大人',
    situation: 'ゴリラのステータス：商談8件連続 / 睡眠4時間 / 昼食抜き / 水分ゼロ。',
    prompt: 'ゴリラが座り込んだ。ステータスから考えられる一番の理由は？',
    choices: [
      {
        label: 'やる気がないから',
        effects: { peace: -4, capacity: 0, trust: -6, teamCondition: -4 },
        feedback: 'データを見て！ 働きすぎのサインを根性の問題にしない。'
      },
      {
        label: 'バナナが足りないから',
        effects: { peace: -2, capacity: 0, trust: -2, teamCondition: -3 },
        feedback: '糖分だけ足しても回復しない。原因は複合的だ。'
      },
      {
        label: '休息・食事・水分が全部不足しているから',
        effects: { peace: 7, capacity: 2, trust: 6, teamCondition: 7 },
        feedback: '状態を見て原因を推測できた。休憩と食事の計画を立てよう。'
      }
    ],
    recommendedChoiceIndex: 2
  }
];
