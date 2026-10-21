/* 放置シミュレーション・「止める？通す？」・AIに聞くリンク。画面に依存しない純粋な関数だけを置く */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./scoring.js"));
  else root.PortalStory = factory(root.PortalScoring);
})(typeof self !== "undefined" ? self : this, function (Scoring) {
  "use strict";

  function byId(list) {
    var map = {};
    list.forEach(function (x) { map[x.id] = x; });
    return map;
  }

  // n 個の章に「何か月後」を振る。用意したラベルで足りれば均等に拾い、足りなければ月数を計算する
  function chapterLabels(n, labels) {
    var out = [];
    for (var i = 0; i < n; i++) {
      if (n <= labels.length) {
        out.push(labels[Math.round(((i + 1) * labels.length) / n) - 1]);
      } else {
        var m = Math.round((12 * (i + 1)) / n);
        out.push(m === 12 ? "1年後" : m === 6 ? "半年後" : m + "か月後");
      }
    }
    return out;
  }

  // 弱点の上位を章にし、放置した場合と対策した場合のリスク指数の移り変わりを出す
  function neglectPlan(data, scenes, profile, answers, maxChapters) {
    var before = Scoring.compute(data, profile, answers);
    var picked = before.weak.slice(0, maxChapters || scenes.chapter_labels.length);
    var fixedAnswers = {};
    Object.keys(answers).forEach(function (k) { fixedAnswers[k] = answers[k]; });
    picked.forEach(function (w) { fixedAnswers[w.q.id] = 0; });
    var after = Scoring.compute(data, profile, fixedAnswers);

    var total = picked.reduce(function (s, w) { return s + w.q.weight * w.point; }, 0);
    var labels = chapterLabels(picked.length, scenes.chapter_labels);
    var cum = 0;
    var chapters = picked.map(function (w, i) {
      cum += w.q.weight * w.point;
      var share = total ? cum / total : 1;
      var sc = (scenes.questions[w.q.id] || {}).neglect || {};
      return {
        n: i + 1,
        label: labels[i],
        q: w.q,
        point: w.point,
        title: sc.title || w.q.short,
        story: sc.story || "",
        fixed: sc.fixed || w.q.actions[0],
        crisis: Math.round(before.score * share),
        fixedCrisis: Math.round(before.score - (before.score - after.score) * share)
      };
    });
    return { before: before, after: after, chapters: chapters };
  }

  // ---- 止める？通す？ ----

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function deal(game, rng) {
    rng = rng || Math.random;
    var risky = shuffle(game.cards.filter(function (c) { return c.answer === "stop"; }), rng).slice(0, game.deal.risky);
    var safe = shuffle(game.cards.filter(function (c) { return c.answer === "pass"; }), rng).slice(0, game.deal.safe);
    return shuffle(risky.concat(safe), rng);
  }

  function judge(card, choice) {
    var kind;
    if (card.answer === "stop") kind = choice === "stop" ? "blocked" : "leaked";
    else kind = choice === "pass" ? "allowed" : "overblocked";
    return { correct: choice === card.answer, kind: kind };
  }

  function clamp(x) { return Math.max(0, Math.min(100, x)); }

  // 危機の高まり：危ない場面を通すと、その設問の重み×10だけ上がる
  // AI活用の進み具合：安全な場面を通すと上がり、止めすぎると下がる
  function stepMeters(meters, card, kind, questions) {
    var q = card.q ? questions[card.q] : null;
    var hit = q ? q.weight * 10 : 20;
    var m = { crisis: meters.crisis, use: meters.use };
    if (kind === "leaked") m.crisis = clamp(m.crisis + hit);
    if (kind === "blocked") m.use = clamp(m.use + 5);
    if (kind === "allowed") m.use = clamp(m.use + 15);
    if (kind === "overblocked") m.use = clamp(m.use - 10);
    return m;
  }

  function summarize(game, scenes, plays, questions) {
    var correct = plays.filter(function (p) { return p.result.correct; }).length;
    var leaked = plays.filter(function (p) { return p.result.kind === "leaked"; });
    var over = plays.filter(function (p) { return p.result.kind === "overblocked"; });
    var rate = plays.length ? correct / plays.length : 0;

    var rank;
    if (rate < 1 && over.length > leaked.length) rank = game.overblock_rank;
    else rank = game.ranks.filter(function (r) { return rate >= r.min; })[0];

    var items = leaked.map(function (p) {
      var sc = p.card.q && scenes.questions[p.card.q] ? scenes.questions[p.card.q].neglect : null;
      return { title: p.card.incident_title || (sc ? sc.title : ""), text: p.card.incident, card: p.card };
    });
    if (over.length) items.push({ title: game.overblock.title, text: game.overblock.text, card: null });
    if (!items.length) items.push({ title: game.calm.title, text: game.calm.text, card: null, calm: true });
    var labels = chapterLabels(items.length, scenes.chapter_labels);
    var chapters = items.map(function (it, i) { it.n = i + 1; it.label = labels[i]; return it; });

    var meters = plays.reduce(function (m, p) { return stepMeters(m, p.card, p.result.kind, questions); }, { crisis: 0, use: 40 });
    return {
      correct: correct,
      total: plays.length,
      rate: rate,
      rank: rank,
      chapters: chapters,
      missed: plays.filter(function (p) { return !p.result.correct; }),
      meters: meters
    };
  }

  // ---- AIに聞く ----

  function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m; });
  }

  function buildPrompt(config, kind, vars) {
    var ai = config.ai;
    var hasSite = !!config.site_url;
    var base = {
      refs: hasSite ? fill(ai.refs, { site_url: config.site_url }) : "",
      unread: hasSite ? ai.unread : ""
    };
    Object.keys(vars || {}).forEach(function (k) { base[k] = vars[k]; });
    return fill(ai.prompts[kind], base).trim();
  }

  function buildLinks(config, prompt) {
    var q = encodeURIComponent(prompt);
    return config.ai.services.map(function (s) {
      var url = s.url.replace("{q}", q);
      return { id: s.id, name: s.name, url: url, length: url.length };
    });
  }

  function fits(config, links) {
    return links.every(function (l) { return l.length <= config.ai.max_url_length; });
  }

  function resultSummary(result, count) {
    var lv = result.level;
    var s = "レベル" + lv.level + "（" + lv.name + "）、リスク指数" + result.score + "/100。";
    var weak = result.top3.slice(0, count).map(function (w) { return "「" + w.q.short + "」"; });
    if (weak.length) s += "弱い項目は" + weak.join("") + "。";
    return s;
  }

  // 結果を入れた質問文。URLが長すぎるときは弱点の数を減らして収める
  function resultPrompt(config, result) {
    for (var n = Math.min(3, result.top3.length); n >= 0; n--) {
      var prompt = buildPrompt(config, "result", { result: resultSummary(result, n) });
      var links = buildLinks(config, prompt);
      if (fits(config, links) || n === 0) return { prompt: prompt, links: links, fits: fits(config, links) };
    }
  }

  // 相談フォームに貼るための要約。社名などの個人を特定する情報は含めない
  function resultMemo(data, profile, result) {
    var lines = [];
    lines.push("【セキュリティ・リスク診断の結果】");
    lines.push("立場：" + (profile.P1 || "未回答") + "、従業員数：" + (profile.P2 || "未回答"));
    lines.push("総合：レベル" + result.level.level + "（" + result.level.name + "）　リスク指数 " + result.score + "/100");
    lines.push("対策できている項目：" + result.done + "/" + result.total);
    lines.push("カテゴリ別の安全度：" + result.categories.map(function (c) { return c.name + " " + c.safety; }).join("、"));
    if (result.top3.length) {
      lines.push("弱点トップ3：");
      result.top3.forEach(function (w, i) { lines.push((i + 1) + ". " + data.categories[w.q.cat] + "：" + w.q.short); });
    }
    return lines.join("\n");
  }

  return {
    byId: byId,
    chapterLabels: chapterLabels,
    neglectPlan: neglectPlan,
    deal: deal,
    judge: judge,
    stepMeters: stepMeters,
    summarize: summarize,
    buildPrompt: buildPrompt,
    buildLinks: buildLinks,
    fits: fits,
    resultPrompt: resultPrompt,
    resultSummary: resultSummary,
    resultMemo: resultMemo
  };
});
