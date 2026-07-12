import type { DialogueLine, FlyingItemDef, PlanSet } from './types';

// 各ステージの会話・投げ込まれる要望・BETTER PLANカードのデータ。
// コードから分離しているため、文言や選択肢は自由に差し替えられる。

export const SPEAKER = {
  boss: '社長',
  hero: 'キャパシティ・キング',
  gorilla: 'ゴリラ部下',
  robot: 'AIロボット',
  staff: '保育士',
  sys: '─'
};

// ---------------- TUTORIAL ----------------

export const TUTORIAL_INTRO: DialogueLine[] = [
  { speaker: SPEAKER.boss, text: 'おう、来たな！ 今日も期待してるぞ。まずは景気づけだ、食っとけ！' },
  { speaker: SPEAKER.sys, text: '飛んでくるものは SPACE で受け止められる。まずは受け止めてみよう。' }
];

export const TUTORIAL_FOODS: FlyingItemDef[] = [
  { kind: 'ramen', label: '特盛ラーメン' },
  { kind: 'meat', label: '焼き肉フルコース' },
  { kind: 'chips', label: 'ポテトチップス（箱）' }
];

export const TUTORIAL_AFTER_EAT: DialogueLine[] = [
  { speaker: SPEAKER.hero, text: '（受け止めるとPOWERは上がる…だがCAPACITYが削れていく…）' },
  { speaker: SPEAKER.sys, text: '無条件に受け入れ続けると、余力と健康が削れる。H で一度止めて考えよう（HOLD）。' }
];

export const TUTORIAL_HOLD_HINT: DialogueLine[] = [
  { speaker: SPEAKER.sys, text: 'HOLD中は世界が止まる。ただし止めている間も WORLD PEACE は少しずつ減っていく。' },
  { speaker: SPEAKER.sys, text: '1 / 2 / 3 でカードを選び、ENTER で「BETTER PLAN」を実行しよう。' }
];

export const TUTORIAL_PLAN: PlanSet = {
  title: 'BETTER PLAN — この量、どうする？',
  prompt: '受け止めた気持ちはそのままに、もっといい形に組み替える。',
  choices: [
    {
      label: '小盛りにしてもらう',
      detail: '気持ちは全部いただく。量はちょうどよく。',
      kind: 'better',
      effects: { peace: 12, capacity: 10, trust: 6, team: 3 },
      feedback: '「ありがとうございます！ 小盛りでいただきます！」料理が金色の幸福エネルギーに変わった！'
    },
    {
      label: 'ぜんぶ断る',
      detail: '受け取らない。',
      kind: 'bad',
      effects: { peace: -6, trust: -10 },
      feedback: '社長の気持ちごと突き返してしまった…信頼が下がった。'
    },
    {
      label: 'みんなで分ける',
      detail: 'チーム全員の昼ごはんにする。',
      kind: 'better',
      effects: { peace: 14, capacity: 8, trust: 8, team: 6 },
      feedback: '「みんなでいただきます！」オフィス中に湯気と笑顔が広がった！'
    }
  ]
};

export const TUTORIAL_CLEAR: DialogueLine[] = [
  { speaker: SPEAKER.boss, text: 'がはは、そういう返しができるのはお前だけだ！' },
  { speaker: SPEAKER.hero, text: '受け止めて、理解して、組み替えて、前に進める。それが俺のやり方です。' },
  { speaker: SPEAKER.sys, text: 'BETTER PLAN成立！ 道が開いた。次はゴリラ部下の様子を見に行こう。' }
];

// ---------------- STAGE 1: GORILLA ----------------

export const GORILLA_INTRO: DialogueLine[] = [
  { speaker: SPEAKER.gorilla, text: 'ウホ…班長…案件が20件…アポが8連続…ウホホ…' },
  { speaker: SPEAKER.gorilla, text: '腹が減った…バナナだ…バナナを3本くれ…今すぐ…！' },
  { speaker: SPEAKER.sys, text: 'G でゴリラの状態を確認できる。まず状態を見てから対応を決めよう。' }
];

export const GORILLA_STATUS_HINT: DialogueLine[] = [
  { speaker: SPEAKER.hero, text: '（…直前に菓子パン2個。血糖値が乱高下しているな。バナナ連打は逆効果だ）' }
];

export const GORILLA_PLAN_1: PlanSet = {
  title: 'BETTER PLAN — ゴリラの「バナナ3本くれ」',
  prompt: 'ステータス：直前に甘い物 / CONDITION低下中 / 水分不足',
  choices: [
    {
      label: 'バナナを3本渡す',
      detail: '要望どおり即対応。',
      kind: 'bad',
      effects: { peace: -4, team: -10 },
      feedback: '糖分の追い打ちでCONDITIONがさらに低下…「要望どおり」が正解とは限らない。'
    },
    {
      label: '水と休憩を渡す',
      detail: 'まず落ち着かせる。',
      kind: 'ok',
      effects: { team: 5 },
      feedback: '少し回復した。だが空腹と仕事量という根本は残ったまま…もう一歩！'
    },
    {
      label: '本人と相談して食事と仕事量を調整する',
      detail: '水分＋バランスのよい食事＋午後のアポを2件リスケ。',
      kind: 'better',
      effects: { peace: 12, capacity: 5, trust: 10, team: 15 },
      feedback: '「ウホ…班長、ありがとう…」食事と休憩の計画で、ゴリラの目に力が戻った！'
    }
  ]
};

export const GORILLA_MID: DialogueLine[] = [
  { speaker: SPEAKER.boss, text: '新規案件が来たぞー！ 大型だ！ 頼んだ！' },
  { speaker: SPEAKER.sys, text: '案件が飛んでくる。全部自分で受けると倒れる。G メニューの「役割を任せる」でゴリラに分担しよう。' }
];

export const GORILLA_PLAN_2: PlanSet = {
  title: 'BETTER PLAN — 大型案件、誰がどう動く？',
  prompt: '自分が全部やれば早い。だが明日も、来月も、仕事は続く。',
  choices: [
    {
      label: '全部自分で引き受ける',
      detail: 'ゴリラを休ませ、自分が徹夜する。',
      kind: 'bad',
      effects: { capacity: -20, peace: -5 },
      feedback: 'CAPACITYが激減…あなたが倒れたら、全員が止まってしまう。'
    },
    {
      label: '全部ゴリラに任せる',
      detail: '営業力は高いし、任せておけば安心。',
      kind: 'bad',
      effects: { team: -15, peace: -5 },
      feedback: 'ゴリラが汗だくで座り込んだ…丸投げは信頼ではなく負担になる。'
    },
    {
      label: '仕事量を分配し、休憩込みの営業計画を立てる',
      detail: '得意分野で分担。アポの間に休憩と食事を必ず挟む。',
      kind: 'better',
      effects: { peace: 14, capacity: 10, trust: 10, team: 15 },
      feedback: '「ウホホ！」役割と休憩が計画に組み込まれ、二人の足取りが軽くなった！'
    }
  ]
};

export const GORILLA_CLEAR: DialogueLine[] = [
  { speaker: SPEAKER.gorilla, text: 'ウホ…体が軽い…班長は、俺の状態をちゃんと見てくれるウホ…' },
  { speaker: SPEAKER.hero, text: '相棒が元気だから、俺も前に進める。次は保育園がSOSらしい。行くぞ！' }
];

// ---------------- STAGE 2: NURSERY DX ----------------

export const NURSERY_INTRO: DialogueLine[] = [
  { speaker: SPEAKER.staff, text: 'キングさん…！ 連絡帳、電話、写真整理、シフト、多言語のお知らせ…もう手が回りません…！' },
  { speaker: SPEAKER.staff, text: '子どもと向き合う時間が、どんどん削られていくんです…。' },
  { speaker: SPEAKER.sys, text: '飛んでくる業務を SPACE で受け止めよう。受け止めたら A でAIロボットへの委任メニューを開く。' }
];

export const NURSERY_TASKS: FlyingItemDef[] = [
  { kind: 'note', label: '手書き連絡帳' },
  { kind: 'phone', label: '電話連絡' },
  { kind: 'photo', label: '写真整理' },
  { kind: 'shift', label: 'シフト作成' },
  { kind: 'lang', label: '多言語のお知らせ' },
  { kind: 'parent', label: '保護者対応' },
  { kind: 'child', label: '子どもとの対話' }
];

// AIに任せてよい業務か（true = AI向き）
export const NURSERY_TASK_AI: Record<string, boolean> = {
  note: true,   // 下書きはAI、最終確認は職員
  phone: false, // 保護者との対話は人
  photo: true,
  shift: true,
  lang: true,   // 翻訳はAI
  parent: false,
  child: false
};

export const NURSERY_ASSIGN_HINT: DialogueLine[] = [
  { speaker: SPEAKER.robot, text: 'ピポ。集計・下書き・翻訳・整理はワタシの得意分野デス。' },
  { speaker: SPEAKER.robot, text: 'デモ、子どもノ気持チと大切ナ対話ハ、人間ノ先生ニシカできまセン。' }
];

export const NURSERY_PLAN: PlanSet = {
  title: 'BETTER PLAN — 保育園DX、どう進める？',
  prompt: '道具に何を任せ、人は何に向き合うか。',
  choices: [
    {
      label: 'ぜんぶAIに任せる',
      detail: '業務も、子ども対応も、全自動化。',
      kind: 'bad',
      effects: { peace: -8, team: -10 },
      feedback: 'HUMANITYが低下…子どもたちがロボットの前で困った顔をしている。AIは先生の代わりではない。'
    },
    {
      label: 'ぜんぶ今までどおり人がやる',
      detail: 'AIには頼らない。気合いで乗り切る。',
      kind: 'bad',
      effects: { team: -12, peace: -5 },
      feedback: '書類の山は減らず、先生たちの残業が増えるだけ…現状維持は解決ではない。'
    },
    {
      label: 'AIは事務・人は対話、AIの出力は職員が確認',
      detail: '集計・下書き・翻訳・整理＝AI / ケア・重要な対話・最終判断＝人。',
      kind: 'better',
      effects: { peace: 16, capacity: 8, trust: 10, team: 16 },
      feedback: '書類の山がすっと消え、保育士が子どものそばへ戻った！ 園に笑い声が響く！'
    }
  ]
};

export const NURSERY_CLEAR: DialogueLine[] = [
  { speaker: SPEAKER.staff, text: 'すごい…午後まるごと、子どもたちと遊べます…！' },
  { speaker: SPEAKER.robot, text: 'ピポ！ ワタシの下書キハ、先生ガ確認シテクダサイネ。' },
  { speaker: SPEAKER.hero, text: 'AIは道具、主役は人。…お、今度は街の「学びのラボ」から呼ばれているな。' }
];

// ---------------- STAGE 3: LEARNING ----------------

export const LEARNING_INTRO: DialogueLine[] = [
  { speaker: SPEAKER.staff, text: 'ここは「学びのラボ」。子どもたちの問題が、そのまま街の困りごとになっているんです。' },
  { speaker: SPEAKER.sys, text: '英語・算数・気持ちの問題を解こう。正解すると、ゲーム世界の食事・人員・時間が実際に再配置される！' }
];

export const LEARNING_PLAN: PlanSet = {
  title: 'BETTER PLAN — 今日の学びを、どう活かす？',
  prompt: '学びは解いて終わりではない。街の仕組みに組み込もう。',
  choices: [
    {
      label: 'テストが終わったので忘れる',
      kind: 'bad',
      effects: { peace: -5 },
      feedback: 'せっかくの学びが消えていく…もったいない！'
    },
    {
      label: '学びを園と会社の活動計画に組み込む',
      detail: '分け方・時間の使い方・気持ちの読み取りを、明日からの仕事と保育に反映する。',
      kind: 'better',
      effects: { peace: 14, capacity: 6, trust: 8, team: 10 },
      feedback: '学びが暮らしの知恵に変わった！ 街のあちこちで「分け合う」姿が増えていく。'
    },
    {
      label: '難しい問題だけ大人が全部解く',
      kind: 'bad',
      effects: { team: -6 },
      feedback: 'それでは子どもたちの「できた！」が育たない。'
    }
  ]
};

export const LEARNING_CLEAR: DialogueLine[] = [
  { speaker: SPEAKER.staff, text: '子どもたち、「はんぶんこ！」「Let\'s share!」って言いながら遊んでます！' },
  { speaker: SPEAKER.hero, text: '学びが街を平和にする。…ん、社長から呼び出しだ。嫌な予感がするな…。' }
];

// ---------------- FINAL ----------------

export const FINAL_INTRO: DialogueLine[] = [
  { speaker: SPEAKER.boss, text: '…お前の働き、ずっと見てたぞ。だから最後の指令だ。' },
  { speaker: SPEAKER.boss, text: '保育業界を、全部変えてくれ！！' },
  { speaker: SPEAKER.sys, text: '史上最大の無茶ぶりが飛んできた…！ H で止めて、どう返すか考えよう。' }
];

export const FINAL_PLAN_ROOT: PlanSet = {
  title: '最終指令「保育業界を全部変えてくれ」',
  prompt: 'この無茶ぶりを、どう受け止める？',
  choices: [
    {
      label: 'そのまま全部引き受ける',
      detail: '「わかりました、全部やります」',
      kind: 'bad',
      effects: { capacity: -25, peace: -8 },
      feedback: '抱え込んだ重みで体が膨れ上がり、動けなくなった…周囲の顔も曇っていく。一人で全部は、無理だ。'
    },
    {
      label: 'きっぱり断る',
      detail: '「無理です。できません」',
      kind: 'bad',
      effects: { trust: -15, peace: -8 },
      feedback: '時間が止まったように、園児も職員も部下も、表情が暗くなった…拒絶だけでは何も進まない。'
    },
    {
      label: 'もっといい案を組み立てる',
      detail: '受け止めた上で、実現できる形に組み替える。',
      kind: 'better',
      effects: {},
      feedback: 'そうだ。全部は無理でも、「もっといい形」ならつくれる。プランを組み立てよう！'
    }
  ]
};

export const FINAL_BUILD: PlanSet[] = [
  {
    title: 'プランの組み立て（1/3）— 進め方',
    prompt: 'どこから始める？',
    choices: [
      {
        label: 'いきなり全国すべての園に導入する',
        kind: 'bad',
        effects: { peace: -5 },
        feedback: '現場が混乱し、クレームの嵐に…大きすぎる一歩は誰も幸せにしない。'
      },
      {
        label: 'まず3園で実証して、成果を確かめる',
        kind: 'better',
        effects: { peace: 6, trust: 5 },
        feedback: '小さく始めて確かめる。現実的な第一歩が決まった！'
      },
      {
        label: '様子を見て何もしない',
        kind: 'bad',
        effects: { peace: -5, trust: -5 },
        feedback: '何も変わらない…困っている先生たちはそのままだ。'
      }
    ]
  },
  {
    title: 'プランの組み立て（2/3）— 役割分担',
    prompt: '誰が、何をする？',
    choices: [
      {
        label: 'AIにすべての判断と対話を任せる',
        kind: 'bad',
        effects: { peace: -5, team: -5 },
        feedback: 'それは保育の心を手放すこと。AIは支援役だ。'
      },
      {
        label: '自分が全園を一人で回って全部やる',
        kind: 'bad',
        effects: { capacity: -10 },
        feedback: 'チュートリアルの教訓を思い出そう。一人で抱えれば、必ず止まる。'
      },
      {
        label: 'AI=事務支援 / ゴリラ=現場の声集め / 職員=子どもと保護者 / 自分=課題整理と全体提案',
        kind: 'better',
        effects: { peace: 6, team: 8, trust: 5 },
        feedback: '全員の得意が組み合わさった。これがチームの布陣だ！'
      }
    ]
  },
  {
    title: 'プランの組み立て（3/3）— 続け方',
    prompt: '成果を、どう未来につなげる？',
    choices: [
      {
        label: '成果を事例化して他の園へ横展開し、家庭と健康の時間も計画に入れる',
        kind: 'better',
        effects: { peace: 6, capacity: 8, trust: 5 },
        feedback: '広げ方まで設計し、自分と仲間の生活も守る。持続する計画になった！'
      },
      {
        label: '結果は報告せず、静かに終わらせる',
        kind: 'bad',
        effects: { trust: -5 },
        feedback: 'せっかくの成果が誰にも届かない…もったいない！'
      },
      {
        label: '休みを全部返上して拡大だけを続ける',
        kind: 'bad',
        effects: { capacity: -10, peace: -5 },
        feedback: '家庭と健康を犠牲にした計画は、いつか必ず崩れる。'
      }
    ]
  }
];

export const FINAL_SPEECH: string[] = [
  '全部を一人で変えることはできません。',
  'でも、みんなの力を組み合わせれば、',
  '今よりもっといい未来にできます。',
  'もっといい案があります！'
];

export const ENDING_MESSAGES: string[] = [
  'たくさん受け止めてきた人は、\nただ耐えてきた人ではない。',
  'みんなの無茶ぶりを、\nいつも少しだけいい未来に変えてきた人だ。',
  'あなたが前へ進めるたび、\n周りの世界は少し平和になる。',
  'これからも、もっといい案を。\nいつもありがとうございます。'
];
