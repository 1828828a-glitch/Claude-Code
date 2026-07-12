// エンディングで表示する実績の集計。
class ScoreSystem {
  accepted = 0;        // 受け止めた相談・要望の数
  betterPlans = 0;     // よりよい案に変えた数
  happyPeople = 0;     // ハッピーにした人の数
  familyHours = 0;     // 守った家庭時間（時間）
  nurseries = 0;       // 改善した園の数
  gorillaCondition = 70; // ゴリラの最終コンディション
  learningCorrect = 0; // 教育問題の正解数

  reset() {
    this.accepted = 0;
    this.betterPlans = 0;
    this.happyPeople = 0;
    this.familyHours = 0;
    this.nurseries = 0;
    this.gorillaCondition = 70;
    this.learningCorrect = 0;
  }
}

export const score = new ScoreSystem();
