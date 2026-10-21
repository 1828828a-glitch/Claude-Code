// 診断の採点ルール（受け入れ基準）を確かめる。実行: node --test security_portal/tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const S = require("../site/assets/scoring.js");
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../site/data/questions.json"), "utf8"));

const NEUTRAL = { P1: "その他", P2: "10〜49", P3: "会社として導入済み", P4: ["取引先の機密・未公開情報"] };
const all = (point) => Object.fromEntries(data.questions.map((q) => [q.id, point]));
const withAnswers = (base, patch) => Object.assign({}, base, patch);

test("満点の設定値が重みの合計と一致している", () => {
  assert.equal(S.maxRaw(data), data.scoring.max_raw);
});

test("全問「はい」ならリスク指数0・レベル1", () => {
  const r = S.compute(data, NEUTRAL, all(0));
  assert.equal(r.score, 0);
  assert.equal(r.level.level, 1);
  assert.equal(r.done, data.questions.length);
  assert.equal(r.focus, "level1");
});

test("全問「はい」なら係数がかかっても0のまま", () => {
  const p = withAnswers(NEUTRAL, { P3: "分からない", P4: ["カード・口座"] });
  assert.equal(S.compute(data, p, all(0)).score, 0);
});

test("全問「いいえ」ならリスク指数100・レベル4", () => {
  const r = S.compute(data, NEUTRAL, all(2));
  assert.equal(r.score, 100);
  assert.equal(r.level.level, 4);
  r.categories.forEach((c) => assert.equal(c.safety, 0));
});

test("重要項目のうち2つが「いいえ」で他がすべて「はい」ならレベル3（上書き）", () => {
  const [a, b] = data.scoring.override.questions;
  const r = S.compute(data, NEUTRAL, withAnswers(all(0), { [a]: 2, [b]: 2 }));
  assert.ok(r.score < 25, `指数だけならレベル1のはず: ${r.score}`);
  assert.equal(r.level.level, 3);
  assert.equal(r.overridden, true);
  assert.deepEqual(r.overrideHits, [a, b]);
});

test("重要項目の「いいえ」が1つだけなら上書きしない", () => {
  const [a] = data.scoring.override.questions;
  const r = S.compute(data, NEUTRAL, withAnswers(all(0), { [a]: 2 }));
  assert.equal(r.level.level, 1);
  assert.equal(r.overridden, false);
});

test("「一部・たまに」は上書きの対象にならない", () => {
  const patch = Object.fromEntries(data.scoring.override.questions.map((id) => [id, 1]));
  const r = S.compute(data, NEUTRAL, withAnswers(all(0), patch));
  assert.equal(r.overridden, false);
});

test("上書きは、すでにレベル3以上なら何もしない", () => {
  const r = S.compute(data, NEUTRAL, all(2));
  assert.equal(r.overridden, false);
  assert.equal(r.level.level, 4);
});

test("要配慮情報を扱うと×1.2がかかる", () => {
  const answers = withAnswers(all(0), { Q2: 2, Q5: 2, Q8: 2 });
  const base = S.compute(data, NEUTRAL, answers);
  const sens = S.compute(data, withAnswers(NEUTRAL, { P4: ["健康・病歴などの要配慮情報"] }), answers);
  assert.equal(sens.factor, 1.2);
  assert.equal(sens.score, Math.round((base.raw / S.maxRaw(data)) * 100 * 1.2));
  assert.ok(sens.score > base.score);
});

test("要配慮情報で×1.2がかかっても上限100で止まる", () => {
  const p = withAnswers(NEUTRAL, { P4: ["健康・病歴などの要配慮情報"] });
  const r = S.compute(data, p, all(2));
  assert.ok(r.exact > 100);
  assert.equal(r.score, 100);
});

test("係数は重なってかかる（個人の判断×1.1 と カード×1.2）", () => {
  const p = withAnswers(NEUTRAL, { P3: "個人の判断で使っている", P4: ["カード・口座"] });
  const r = S.compute(data, p, withAnswers(all(0), { Q2: 1 }));
  assert.ok(Math.abs(r.factor - 1.32) < 1e-9);
  assert.equal(r.multipliers.length, 2);
});

test("AIを禁止していても、隠れた利用を把握できていなければ×1.15", () => {
  const p = withAnswers(NEUTRAL, { P3: "禁止している" });
  assert.equal(S.compute(data, p, withAnswers(all(0), { Q3: 2 })).factor, 1.15);
  assert.equal(S.compute(data, p, withAnswers(all(0), { Q3: 1 })).factor, 1);
  assert.equal(S.compute(data, p, all(0)).factor, 1);
});

test("回答を直すとスコアが再計算され、元の回答は書き換わらない", () => {
  const answers = withAnswers(all(0), { Q1: 2, Q4: 2, Q10: 2 });
  const before = S.compute(data, NEUTRAL, answers);
  const fixed = withAnswers(answers, { Q4: 0 });
  const after = S.compute(data, NEUTRAL, fixed);
  assert.ok(after.score < before.score);
  assert.equal(answers.Q4, 2);
  assert.equal(S.compute(data, NEUTRAL, answers).score, before.score);
});

test("レベルの境目（24/25、49/50、74/75）", () => {
  const lv = (s) => S.levelForScore(data, s).level;
  assert.deepEqual([0, 24, 25, 49, 50, 74, 75, 100].map(lv), [1, 1, 2, 2, 3, 3, 4, 4]);
});

test("カテゴリ別スコアはカテゴリの満点で割る", () => {
  const cats = S.categoryScores(data, withAnswers(all(0), { Q1: 2 }));
  const a = cats.find((c) => c.cat === "A");
  const aMax = data.questions.filter((q) => q.cat === "A").reduce((s, q) => s + 2 * q.weight, 0);
  assert.equal(a.score, Math.round((2 * 3 / aMax) * 100));
  assert.equal(a.safety, 100 - a.score);
  cats.filter((c) => c.cat !== "A").forEach((c) => assert.equal(c.score, 0));
});

test("弱点は重み×点数の大きい順に並ぶ", () => {
  const w = S.weakItems(data, withAnswers(all(0), { Q18: 2, Q2: 1, Q1: 2, Q13: 1 }));
  assert.deepEqual(w.map((x) => x.q.id), ["Q1", "Q13", "Q2", "Q18"]);
});

test("相談先の目安は、いちばん弱いカテゴリになる", () => {
  const r = S.compute(data, NEUTRAL, withAnswers(all(0), { Q12: 2, Q13: 2, Q1: 1, Q4: 1, Q7: 1, Q10: 1 }));
  assert.equal(r.level.level, 2);
  assert.equal(r.focus, "E");
});

test("属性と全設問に答えたときだけ完了になる", () => {
  assert.equal(S.isComplete(data, NEUTRAL, all(1)), true);
  assert.equal(S.isComplete(data, withAnswers(NEUTRAL, { P4: [] }), all(1)), false);
  const missing = all(1);
  delete missing.Q18;
  assert.equal(S.isComplete(data, NEUTRAL, missing), false);
});
