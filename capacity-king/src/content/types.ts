// ゲーム内コンテンツの型定義。
// 教育問題・会話・提案カードはすべてデータ駆動で、コードから分離して差し替え可能。

export type ContentMode =
  | 'birthday'
  | 'preschool'
  | 'elementary'
  | 'nursery'
  | 'nursery-dx'
  | 'sales-training';

export type LearningChallenge = {
  id: string;
  mode: ContentMode;
  subject: 'english' | 'math' | 'logic' | 'emotion' | 'dx';
  gradeLevel: string;
  situation: string;
  prompt: string;
  choices: {
    label: string;
    effects: {
      peace: number;
      capacity: number;
      trust: number;
      teamCondition: number;
    };
    feedback: string;
  }[];
  recommendedChoiceIndex: number;
  // 算数の正解時に世界を再配置する演出の種類（任意）
  rearrange?: 'meat' | 'banana' | 'groups' | 'time' | 'nursery';
};

export type GaugeKey = 'peace' | 'capacity' | 'trust' | 'team';

export type PlanChoice = {
  label: string;
  detail?: string;
  kind: 'better' | 'ok' | 'bad';
  effects?: Partial<Record<GaugeKey, number>>;
  feedback: string;
};

export type PlanSet = {
  title: string;
  prompt?: string;
  choices: PlanChoice[];
};

export type DialogueLine = {
  speaker: string;
  text: string;
  color?: string;
};

export type ItemKind =
  | 'ramen' | 'meat' | 'chips' | 'banana' | 'water' | 'bento'
  | 'note' | 'phone' | 'photo' | 'shift' | 'lang' | 'parent' | 'child'
  | 'doc' | 'idea' | 'heart' | 'clock' | 'giant';

export type FlyingItemDef = {
  kind: ItemKind;
  label: string;
  // 受け止めた時のゲージ効果（省略時は既定値）
  effects?: Partial<Record<GaugeKey, number>>;
};
