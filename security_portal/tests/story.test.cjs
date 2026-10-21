// 放置シミュレーション・止める？通す？・AIに聞くリンク・データ同士の参照を確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const S = require("../site/assets/scoring.js");
const T = require("../site/assets/story.js");
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "../site/data", f), "utf8"));
const data = load("questions.json");
const scenes = load("scenes.json");
const cases = load("cases.json");
const risks = load("risks.json");
const actions = load("actions.json");
const news = load("news.json");
const config = load("config.json");

const NEUTRAL = { P1: "その他", P2: "10〜49", P3: "会社として導入済み", P4: ["ほぼ扱わない"] };
const all = (point) => Object.fromEntries(data.questions.map((q) => [q.id, point]));
const qById = T.byId(data.questions);

// 決まった並びを返す乱数
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

test("放置シミュレーション：最後の章で今のリスク指数に達し、対策ルートでは対策後の指数に下がる", () => {
  const answers = Object.assign(all(0), { Q1: 2, Q7: 2, Q10: 1, Q13: 2, Q5: 1, Q17: 2, Q18: 2 });
  const plan = T.neglectPlan(data, scenes, NEUTRAL, answers);
  assert.equal(plan.chapters.length, 5);
  const last = plan.chapters[plan.chapters.length - 1];
  assert.equal(last.crisis, plan.before.score);
  assert.equal(last.fixedCrisis, plan.after.score);
  assert.ok(plan.after.score < plan.before.score);
  assert.deepEqual(plan.chapters.map((c) => c.label), scenes.chapter_labels);
  for (let i = 1; i < plan.chapters.length; i++) assert.ok(plan.chapters[i].crisis >= plan.chapters[i - 1].crisis);
  assert.equal(answers.Q1, 2, "元の回答は書き換えない");
});

test("放置シミュレーション：弱点がなければ章はない", () => {
  const plan = T.neglectPlan(data, scenes, NEUTRAL, all(0));
  assert.equal(plan.chapters.length, 0);
});

test("章のラベルは数に合わせて1年に広がる", () => {
  assert.deepEqual(T.chapterLabels(1, scenes.chapter_labels), ["1年後"]);
  assert.deepEqual(T.chapterLabels(2, scenes.chapter_labels), ["半年後", "1年後"]);
  const eight = T.chapterLabels(8, scenes.chapter_labels);
  assert.equal(eight.length, 8);
  assert.equal(eight[7], "1年後");
});

test("止める？通す？：危ない7枚と安全な3枚を重複なく配る", () => {
  const deck = T.deal(scenes.game, seeded(7));
  assert.equal(deck.length, 10);
  assert.equal(new Set(deck.map((c) => c.id)).size, 10);
  assert.equal(deck.filter((c) => c.answer === "stop").length, 7);
  assert.deepEqual(T.deal(scenes.game, seeded(7)).map((c) => c.id), deck.map((c) => c.id));
});

test("止める？通す？：判定の4通り", () => {
  const risky = scenes.game.cards.find((c) => c.answer === "stop");
  const safe = scenes.game.cards.find((c) => c.answer === "pass");
  assert.deepEqual(T.judge(risky, "stop"), { correct: true, kind: "blocked" });
  assert.deepEqual(T.judge(risky, "pass"), { correct: false, kind: "leaked" });
  assert.deepEqual(T.judge(safe, "pass"), { correct: true, kind: "allowed" });
  assert.deepEqual(T.judge(safe, "stop"), { correct: false, kind: "overblocked" });
});

test("止める？通す？：全問正解なら頼れる門番で、平穏な1年になる", () => {
  const deck = T.deal(scenes.game, seeded(3));
  const plays = deck.map((card) => ({ card, result: T.judge(card, card.answer) }));
  const sum = T.summarize(scenes.game, scenes, plays, qById);
  assert.equal(sum.correct, 10);
  assert.equal(sum.rank.name, "頼れる門番");
  assert.equal(sum.chapters.length, 1);
  assert.equal(sum.chapters[0].calm, true);
  assert.equal(sum.meters.crisis, 0);
});

test("止める？通す？：通した危ない場面が章になり、危機が上がる", () => {
  const deck = T.deal(scenes.game, seeded(11));
  const plays = deck.map((card) => ({ card, result: T.judge(card, "pass") }));
  const sum = T.summarize(scenes.game, scenes, plays, qById);
  assert.equal(sum.chapters.length, 7);
  sum.chapters.forEach((c) => assert.ok(c.title && c.text, "章に見出しと本文がある"));
  assert.ok(sum.meters.crisis > 0);
  assert.equal(sum.rank.name, "通しすぎ注意");
});

test("止める？通す？：止めすぎが多ければ止めすぎ注意", () => {
  const deck = T.deal(scenes.game, seeded(5));
  const plays = deck.map((card) => ({ card, result: T.judge(card, "stop") }));
  const sum = T.summarize(scenes.game, scenes, plays, qById);
  assert.equal(sum.rank.name, "止めすぎ注意");
  assert.equal(sum.chapters[sum.chapters.length - 1].title, scenes.game.overblock.title);
});

test("AIに聞く：公開URLがあれば資料のURLと読めなかったときの指示が入る", () => {
  const cfg = Object.assign({}, config, { site_url: "https://example.jp/" });
  const p = T.buildPrompt(cfg, "general", {});
  assert.ok(p.includes("https://example.jp/llms-full.txt"));
  assert.ok(p.includes(cfg.ai.unread));
  const links = T.buildLinks(cfg, p);
  assert.equal(links.length, cfg.ai.services.length);
  links.forEach((l) => {
    assert.ok(!l.url.includes("{q}"));
    assert.ok(l.length <= cfg.ai.max_url_length, `${l.name} が長すぎる: ${l.length}`);
  });
});

test("AIに聞く：公開URLが未設定なら資料の行を入れない", () => {
  const p = T.buildPrompt(config, "general", {});
  assert.ok(!p.includes("次の資料"));
  assert.ok(!p.includes("{"));
});

test("AIに聞く：結果入りの質問文は、いちばん長い弱点でもURLの上限に収める", () => {
  const cfg = Object.assign({}, config, { site_url: "https://security-portal.example.jp/" });
  const p = Object.assign({}, NEUTRAL, { P4: ["カード・口座"] });
  const result = S.compute(data, p, all(2));
  const longest = data.questions.slice().sort((a, b) => b.short.length - a.short.length).slice(0, 3);
  result.top3 = longest.map((q) => ({ q, point: 2 }));
  const r = T.resultPrompt(cfg, result);
  assert.ok(r.fits);
  assert.ok(r.prompt.includes("リスク指数100/100"));
});

test("AIに聞く：リスクごとの質問文もURLの上限に収まる", () => {
  const cfg = Object.assign({}, config, { site_url: "https://security-portal.example.jp/" });
  risks.items.forEach((r) => {
    const links = T.buildLinks(cfg, T.buildPrompt(cfg, "risk", { topic: r.title }));
    assert.ok(T.fits(cfg, links), r.title);
  });
});

test("AIに聞く：注意喚起の質問文には公式発表のURLが入り、上限に収まる", () => {
  news.items.filter((n) => n.ask_url).forEach((n) => {
    const p = T.buildPrompt(config, n.ask_kind || "news", { url: n.ask_url });
    assert.ok(p.includes(n.ask_url), n.id);
    assert.ok(!p.includes("{"), n.id);
    // 上限ぎりぎりだとサービスによっては途中で切れるので、1割の余裕を持たせる
    T.buildLinks(config, p).forEach((l) => assert.ok(l.length <= config.ai.max_url_length * 0.9, `${n.id} ${l.name}: ${l.length}`));
  });
});

test("相談メモには結果の要約だけが入る", () => {
  const result = S.compute(data, NEUTRAL, Object.assign(all(0), { Q1: 2, Q13: 2 }));
  const memo = T.resultMemo(data, NEUTRAL, result);
  assert.ok(memo.includes("レベル3"));
  assert.ok(memo.includes(data.questions[0].short));
});

test("データの参照先がすべて存在する", () => {
  const qids = new Set(data.questions.map((q) => q.id));
  const caseIds = new Set(cases.items.map((c) => c.id));
  const cats = new Set(Object.keys(data.categories));
  data.questions.forEach((q) => assert.ok(scenes.questions[q.id], `${q.id} の場面がない`));
  scenes.game.cards.forEach((c) => assert.ok(c.q === null || qids.has(c.q), c.id));
  scenes.game.cards.filter((c) => c.answer === "stop").forEach((c) => assert.ok(c.incident, `${c.id} の事故の文がない`));
  risks.items.forEach((r) => {
    assert.ok(cats.has(r.cat));
    r.questions.forEach((id) => assert.ok(qids.has(id), id));
    r.cases.forEach((id) => assert.ok(caseIds.has(id), id));
  });
  cases.items.forEach((c) => c.cats.forEach((cat) => assert.ok(cats.has(cat), c.id)));
  actions.groups.forEach((g) => g.items.forEach((a) => assert.ok(cats.has(a.cat), a.id)));
  news.items.forEach((n) => assert.ok(qids.has(n.question), n.id));
  Object.keys(data.support).forEach((k) => assert.ok(k === "level1" || cats.has(k), k));
  data.scoring.override.questions.forEach((id) => assert.ok(qids.has(id), id));
});

test("数字を書いた根拠には出典がある", () => {
  const hasNumber = (s) => /[0-9０-９]/.test(s);
  data.questions.forEach((q) => {
    if (hasNumber(q.why)) assert.match(q.source, /^https:\/\//, `${q.id} の出典がない`);
    if (q.extra) assert.match(q.extra.source, /^https:\/\//, `${q.id} の補足の出典がない`);
  });
  cases.items.forEach((c) => {
    assert.ok(c.sources.length > 0, c.id);
    c.sources.forEach((s) => assert.match(s.url, /^https:\/\//, c.id));
  });
});
