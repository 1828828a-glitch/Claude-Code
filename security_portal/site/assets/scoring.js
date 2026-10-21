/* 診断の採点。questions.json の scoring をそのまま解釈する（画面に依存しない純粋な関数だけを置く） */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PortalScoring = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function maxPoint(data) {
    return Math.max.apply(null, data.answers.map(function (a) { return a.point; }));
  }

  // 満点（最もリスクが高い場合）は、重みの合計×最大の回答点
  function maxRaw(data) {
    return maxPoint(data) * data.questions.reduce(function (s, q) { return s + q.weight; }, 0);
  }

  function asList(v) {
    if (Array.isArray(v)) return v;
    return v == null ? [] : [v];
  }

  function condHolds(c, profile, answers) {
    if (c.profile) {
      var have = asList(profile[c.profile]);
      return have.some(function (x) { return c.in.indexOf(x) !== -1; });
    }
    if (c.answer) return answers[c.answer] === c.eq;
    return false;
  }

  function whenHolds(when, profile, answers) {
    if (when.all) return when.all.every(function (c) { return condHolds(c, profile, answers); });
    if (when.any) return when.any.some(function (c) { return condHolds(c, profile, answers); });
    return false;
  }

  function matchedMultipliers(data, profile, answers) {
    return data.scoring.multipliers.filter(function (m) { return whenHolds(m.when, profile, answers); });
  }

  function levelByNumber(data, n) {
    return data.scoring.levels.filter(function (l) { return l.level === n; })[0];
  }

  function levelForScore(data, score) {
    var levels = data.scoring.levels;
    for (var i = 0; i < levels.length; i++) {
      if (score >= levels[i].min && score <= levels[i].max) return levels[i];
    }
    return levels[levels.length - 1];
  }

  function categoryScores(data, answers) {
    var mp = maxPoint(data);
    return Object.keys(data.categories).map(function (cat) {
      var qs = data.questions.filter(function (q) { return q.cat === cat; });
      var raw = qs.reduce(function (s, q) { return s + (answers[q.id] || 0) * q.weight; }, 0);
      var max = qs.reduce(function (s, q) { return s + mp * q.weight; }, 0);
      var score = max ? Math.round((raw / max) * 100) : 0;
      return { cat: cat, name: data.categories[cat], raw: raw, max: max, score: score, safety: 100 - score };
    });
  }

  // 弱点は「重み×回答点」の大きい順。同点なら重みの大きい順、さらに設問の順
  function weakItems(data, answers) {
    return data.questions
      .map(function (q, i) { return { q: q, point: answers[q.id] || 0, order: i }; })
      .filter(function (x) { return x.point > 0; })
      .sort(function (a, b) {
        return (b.q.weight * b.point - a.q.weight * a.point) || (b.q.weight - a.q.weight) || (a.order - b.order);
      });
  }

  function compute(data, profile, answers) {
    var raw = data.questions.reduce(function (s, q) { return s + (answers[q.id] || 0) * q.weight; }, 0);
    var max = maxRaw(data);
    var mults = matchedMultipliers(data, profile, answers);
    var factor = mults.reduce(function (x, m) { return x * m.x; }, 1);
    var exact = (raw / max) * 100 * factor;
    var score = Math.min(data.scoring.cap, Math.round(exact));
    var level = levelForScore(data, score);

    var ov = data.scoring.override;
    var hits = ov.questions.filter(function (id) { return answers[id] === ov.point; });
    var overridden = hits.length >= ov.count && level.level < ov.min_level;
    if (overridden) level = levelByNumber(data, ov.min_level);

    var cats = categoryScores(data, answers);
    var weak = weakItems(data, answers);
    var done = data.questions.filter(function (q) { return (answers[q.id] || 0) === 0; }).length;
    var keyDone = ov.questions.filter(function (id) { return (answers[id] || 0) === 0; }).length;

    // 相談先の目安は、いちばん弱いカテゴリ（同点なら最上位の弱点のカテゴリ）
    var focus = "level1";
    if (level.level > 1 && weak.length) {
      var top = cats.slice().sort(function (a, b) { return b.score - a.score; })[0].score;
      var tied = cats.filter(function (c) { return c.score === top; }).map(function (c) { return c.cat; });
      var byWeak = weak.filter(function (w) { return tied.indexOf(w.q.cat) !== -1; })[0];
      focus = byWeak ? byWeak.q.cat : tied[0];
    }

    return {
      raw: raw,
      maxRaw: max,
      factor: factor,
      multipliers: mults,
      exact: exact,
      score: score,
      level: level,
      overridden: overridden,
      overrideHits: hits,
      categories: cats,
      weak: weak,
      top3: weak.slice(0, 3),
      done: done,
      total: data.questions.length,
      keyDone: keyDone,
      keyTotal: ov.questions.length,
      focus: focus
    };
  }

  function isComplete(data, profile, answers) {
    var profileDone = data.profile.every(function (p) {
      var v = profile[p.id];
      return p.type === "multi" ? Array.isArray(v) && v.length > 0 : typeof v === "string" && v !== "";
    });
    return profileDone && data.questions.every(function (q) { return typeof answers[q.id] === "number"; });
  }

  return {
    compute: compute,
    maxRaw: maxRaw,
    maxPoint: maxPoint,
    levelForScore: levelForScore,
    categoryScores: categoryScores,
    weakItems: weakItems,
    matchedMultipliers: matchedMultipliers,
    isComplete: isComplete
  };
});
