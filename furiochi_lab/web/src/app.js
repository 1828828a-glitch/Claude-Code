
// ━━━ データ ━━━
const D = JSON.parse(document.getElementById("furiochi-data").textContent);
const MODES = D.modes, RUBRICS = D.rubrics, WEAK = D.weakness, LEVELS = D.levels;
const BANK = Object.fromEntries(D.problems.map(p => [p.id, p]));
const byMode = m => D.problems.filter(p => p.mode === m);
const h = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 型の名前 → 一言の説明（基本型は予測の反転軸、技法は操作。基本型を優先）
const TYPE_HINT = {};
for (const t of D.tax.techniques) TYPE_HINT[t.name] = t.operation;
for (const t of D.tax.types) TYPE_HINT[t.name] = t.flip;
// M04 の条件「大小逆転／解釈転換／自己矛盾」を型の並びにする
const condTypes = p => String(p.condition || "").split("／").map(s => s.trim()).filter(Boolean);
const multi = p => (MODES[p.mode].answer_count || 1) > 1;
const answerSlots = p => { const n = MODES[p.mode].answer_count || 1, t = condTypes(p); return Array.from({ length: n }, (_, i) => t[i] || (i + 1) + "案目"); };
// 複数案の回答は、出題の順に改行でつないで1つの文字列にしている
const splitAnswers = s => String(s ?? "").split("\n").map(x => x.trim());
const patternsOf = p => p.mode === "M04" ? condTypes(p) : [p.pattern].filter(Boolean);
const typeProblems = name => D.problems.filter(p => p.pattern === name || (p.mode === "M04" && condTypes(p).includes(name)));
const fmtSec = s => { const v = Math.max(0, Math.round(Number(s) || 0)), m = Math.floor(v / 60), r = v % 60; return m ? m + "分" + String(r).padStart(2, "0") + "秒" : r + "秒"; };
const SATISFACTION = { 1: "納得いかない", 2: "いまいち", 3: "まあまあ", 4: "わりと好き", 5: "会心" };

// ━━━ 状態 ━━━
const PREF_CH30 = "furiochi.challenge30";
function loadPref() { try { return localStorage.getItem(PREF_CH30) === "1"; } catch { return false; } }
function savePref(on) { try { localStorage.setItem(PREF_CH30, on ? "1" : "0"); } catch { /* 覚えられなくても動く */ } }
const S = {
  view: "home", dictTab: "basic", noteFilter: "all", pickPattern: "all",
  queue: [], queueLabel: "", queuePos: 0,
  mode: "M01", problemId: null, phase: "answer",
  draft: null, attempt: null, saved: false, retryOf: null, prevAnswer: "", round: 0,
  aiError: "", canRetryAI: false, ai: "pending", useAi: true, ctl: null, stream: null,
  generated: {}, genError: "", generating: false,
  attempts: [], storage: "memory", storageNote: "",
  flash: "", confirmDelete: null,
  answerStart: Date.now(), challenge: loadPref(), challengeStart: Date.now(),
};

// ━━━ 保存（自分専用のdb → 使えなければこのブラウザ） ━━━
const LS_KEY = "furiochi.attempts.v1";
const use = name => {
  const c = window.claude;
  return c && typeof c.use === "function" ? c.use(name).catch(() => null) : Promise.resolve(null);
};
const Store = {
  coll: null, queues: {},
  loadLocal() {
    try { const raw = localStorage.getItem(LS_KEY); S.attempts = raw ? JSON.parse(raw) : []; S.storage = "local"; }
    catch { S.attempts = []; S.storage = "memory"; }
  },
  saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S.attempts)); } catch { S.storage = "memory"; }
  },
  async init() {
    const [db, user] = await Promise.all([use("db"), use("user")]);
    if (!db || !user) return;
    let uid = null;
    try { uid = await user.id(); } catch { uid = null; }
    if (!uid) return;
    try { this.coll = db.collection("data/users/" + uid); } catch { return; }
    this.coll.orderBy("ts", "asc").limit(1000).onSnapshot(snap => {
      S.attempts = snap.docs.map(d => d.data());
      S.storage = "db";
      if (S.attempt) S.attempt = S.attempts.find(a => a.id === S.attempt.id) || S.attempt;
      renderIfSafe();
    }, () => { this.fallback(); });
  },
  fallback() {
    this.coll = null;
    S.storageNote = "履歴をアカウントに保存できなかったため、このブラウザに保存しています。";
    this.saveLocal(); if (S.storage !== "memory") S.storage = "local";
    renderIfSafe();
  },
  write(a) {
    if (!this.coll) { this.saveLocal(); return; }
    const ref = this.coll.doc(a.id);
    this.queues[a.id] = (this.queues[a.id] || Promise.resolve())
      .then(() => ref.set(JSON.parse(JSON.stringify(a))))
      .catch(() => this.fallback());
  },
  add(a) { S.attempts = [...S.attempts, a]; this.write(a); },
  update(id, fields) {
    const i = S.attempts.findIndex(a => a.id === id);
    if (i < 0) return;
    const next = { ...S.attempts[i], ...fields };
    S.attempts = S.attempts.map((a, j) => j === i ? next : a);
    if (S.attempt && S.attempt.id === id) S.attempt = next;
    this.write(next);
  },
  remove(id) {
    S.attempts = S.attempts.filter(a => a.id !== id);
    if (this.coll) {
      const ref = this.coll.doc(id);
      this.queues[id] = (this.queues[id] || Promise.resolve()).then(() => ref.delete()).catch(() => this.fallback());
    } else this.saveLocal();
  },
};

// ━━━ 集計・出題 ━━━
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
function streakDays(list) {
  const days = new Set(list.map(a => dayKey(a.ts)));
  const d = new Date();
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const resolveProblem = a => BANK[a.problemId] || a.problemSnapshot || null;
const getProblem = id => BANK[id] || S.generated[id] || null;
function lastAttempted(list) { const m = {}; for (const a of list) if (!m[a.problemId] || a.ts > m[a.problemId]) m[a.problemId] = a.ts; return m; }
// 未回答を出題順に、その後に回答から時間が経った順に並べる
function freshFirst(ids, list) {
  const last = lastAttempted(list);
  return [...ids.filter(id => !(id in last)), ...ids.filter(id => id in last).sort((a, b) => last[a] - last[b])];
}
const orderedCandidates = (mode, list) => freshFirst(byMode(mode).map(p => p.id), list);
const nextProblemId = (mode, list, exclude = []) => orderedCandidates(mode, list).find(id => !exclude.includes(id)) || null;
const ROTATION = ["M03", "M01", "M01", "M02", "M06"];
function pick(modes, list, n) { const out = []; for (const m of modes) { if (out.length >= n) break; const id = nextProblemId(m, list, out); if (id) out.push(id); } return out; }
function weaknessCounts(list, recent = 20) {
  const c = {};
  for (const a of list.slice(-recent)) for (const t of a.evaluation.tags || []) c[t] = (c[t] || 0) + 1;
  return Object.entries(c).sort((x, y) => y[1] - x[1]);
}
function todaysSet(list, n = 5) {
  const w = weaknessCounts(list);
  if (w.length) {
    const tag = w[0][0], fm = WEAK[tag].modes.filter(m => D.implemented.includes(m));
    return { ids: pick([...fm, ...fm, ...ROTATION], list, n), reason: "直近で多い弱点「" + tag + "」に効くモードを多めにしています" };
  }
  return { ids: pick(ROTATION, list, n), reason: "予測の言語化から入り、フリ→オチ、逆算、修理の順に進みます" };
}
function pilotSet(day, list) {
  const plan = D.pilot.find(d => d.day === day), modes = [];
  for (const [m, c] of plan.menu) for (let i = 0; i < c; i++) modes.push(m);
  return pick(modes, list, modes.length);
}
// 予測とズレを説明できたか（history.py の explained_structure と同じ）
function explained(a) {
  const s = a.evaluation.scores, r = a.evaluation.rubric;
  if (r === "prediction") return s.specificity >= 1 && s.match >= 1;
  if (r === "trio") return s.validity >= 1;
  if (r === "tsukkomi") return s.pinpoint >= 1;
  return s.expectation >= 1 && s.contrast >= 1;
}
function levelProgress(list) {
  const lv = {};
  for (const a of list) { const p = resolveProblem(a); if (p) (lv[p.level] = lv[p.level] || []).push(a); }
  const l1 = (lv[1] || []).slice(-10), ok = l1.filter(explained).length;
  const l2 = (lv[2] || []).filter(a => a.evaluation.rubric === "neta").map(a => total(a.evaluation)).sort((x, y) => x - y);
  const med = l2.length ? (l2.length % 2 ? l2[(l2.length - 1) / 2] : (l2[l2.length / 2 - 1] + l2[l2.length / 2]) / 2) : null;
  return { l1: { done: l1.length, ok, achieved: l1.length >= 10 && ok >= 7 }, l2: { done: l2.length, median: med, achieved: l2.length >= 5 && med >= 7 } };
}
const total = ev => Object.values(ev.scores).reduce((x, y) => x + y, 0);
const maxTotal = ev => 2 * Object.keys(ev.scores).length;
const ratio = ev => maxTotal(ev) ? total(ev) / maxTotal(ev) : 0;

// ━━━ 自動チェックと自己採点（rubric.py と同じ規則） ━━━
const charCount = s => [...String(s).replace(/\s/g, "")].length;
function explanationMarker(text) {
  const sents = text.split(/[。！？!?\n]+/).filter(s => s.trim());
  const tail = sents.length > 1 ? sents.slice(1).join("") : "";
  return D.checks.explanation.find(m => tail.includes(m)) || "";
}
function autoChecks(p, ans) {
  const mode = MODES[p.mode], out = [], lim = mode.char_limit;
  if (multi(p)) {
    // M04：字数の目安と説明語は1案ずつ見る
    const parts = splitAnswers(ans), filled = parts.filter(Boolean);
    if (filled.length < mode.answer_count)
      out.push({ level: "warn", message: mode.answer_count + "案のうち" + filled.length + "案しか書かれていません。思いつかなかった型は、成立例を見てから再挑戦で埋めてみましょう。", tag: "" });
    parts.forEach((part, i) => {
      if (!part) return;
      const n = charCount(part);
      if (lim && n > lim) out.push({ level: "warn", message: (i + 1) + "案目が" + n + "字あり、目安の" + lim + "字を超えています。着地のあとに足した言葉を削れないか見直しましょう。", tag: "オチが長い" });
      const f = explanationMarker(part);
      if (f) out.push({ level: "warn", message: (i + 1) + "案目の後半に「" + f + "」が入っています。オチを自分で説明していないか確認しましょう。", tag: "説明過多" });
    });
  } else {
    const n = charCount(ans);
    if (lim && n > lim)
      out.push({
        level: "warn",
        message: n + "字あり、目安の" + lim + "字を超えています。" + (p.mode === "M07" ? "ツッコミは説明を足すほど弱くなります。ズレの核心だけを残しましょう。" : "着地のあとに足した言葉を削れないか見直しましょう。"),
        tag: ({ M01: "オチが長い", M07: "説明過多" })[p.mode] || "",
      });
    if (p.mode !== "M03") {
      const f = explanationMarker(ans);
      if (f) out.push({ level: "warn", message: "後半に「" + f + "」が入っています。オチを自分で説明していないか確認しましょう。", tag: "説明過多" });
    }
  }
  if (p.mode === "M05") {
    const u = Math.max((ans.match(/「/g) || []).length, ans.split("\n").filter(l => l.trim()).length);
    if (u < 2) out.push({ level: "warn", message: "掛け合いになっていません。A・Bの発話を2つ以上にしましょう。", tag: "会話の不自然さ" });
    else if (u > 8) out.push({ level: "info", message: "発話が" + u + "つあります。条件は2〜4往復なので、削れる往復がないか見てみましょう。", tag: "" });
  }
  const hw = D.checks.harsh.find(w => ans.includes(w));
  if (hw) out.push({ level: "warn", message: "「" + hw + "」は相手を傷つける可能性があります。誰に向けた言葉か、使う場面で問題ないか確認しましょう。", tag: "危険性" });
  return out;
}
function deriveTags(rubric, sc, checks, safety) {
  const tags = [], add = t => { if (t && !tags.includes(t)) tags.push(t); };
  const ct = new Set(checks.map(c => c.tag).filter(Boolean));
  const zero = k => sc[k] === 0;
  if (rubric === "prediction") { if (zero("specificity") || zero("match")) add("反対軸が不明"); }
  else if (rubric === "trio") {
    if (zero("variety")) add("繰り返し依存");
    if (zero("validity") || zero("clarity")) add("反対軸が不明");
    if (zero("brevity")) add(ct.has("説明過多") ? "説明過多" : "オチが長い");
  } else if (rubric === "tsukkomi") {
    if (zero("pinpoint") || zero("standard")) add("反対軸が不明");
    if (zero("brevity")) add("説明過多");
    if (zero("tone")) add("危険性");
  } else {
    if (zero("expectation") || zero("contrast") || zero("clarity")) add("反対軸が不明");
    if (zero("naturalness")) add("会話の不自然さ");
    if (zero("brevity")) add(ct.has("説明過多") ? "説明過多" : "オチが長い");
    if (sc.brevity <= 1) for (const t of ["オチが長い", "説明過多"]) if (ct.has(t)) add(t);
    if (sc.naturalness <= 1 && ct.has("会話の不自然さ")) add("会話の不自然さ");
  }
  if (safety === "needs_revision") add("危険性");
  return tags;
}
// 自己採点のとき、フリとのつながり（relevance）を読み取る軸
const RELEVANCE_AXIS = { neta: "contrast", prediction: "match", trio: "validity", tsukkomi: "pinpoint" };
function selfEvaluation(p, sc, safety, checks) {
  const rubric = MODES[p.mode].rubric, axes = RUBRICS[rubric];
  const scores = {}, reasons = {};
  for (const a of axes) { scores[a.key] = Math.max(0, Math.min(2, Number(sc[a.key] ?? 1))); reasons[a.key] = a.levels[scores[a.key]]; }
  const best = axes.reduce((b, a) => scores[a.key] > scores[b.key] ? a : b, axes[0]);
  const weakest = axes.filter(a => scores[a.key] < 2).sort((x, y) => scores[x.key] - scores[y.key]).slice(0, 2);
  return {
    source: "self", rubric, scores, reasons,
    expectation: p.expectation, deviation: "", axis: p.axis,
    relevance: ["unrelated", "weak", "related"][scores[RELEVANCE_AXIS[rubric]]],
    safety, safetyNote: "",
    goodPoint: scores[best.key] === 2 ? best.name + "は「" + best.levels[2] + "」と自己評価しています。" : "",
    improvements: weakest.map(a => a.name + "：「" + a.levels[2] + "」を目指す。"),
    revision: "", alternatives: p.examples.map(e => ({ ...e })),
    tags: deriveTags(rubric, scores, checks, safety), confidence: "self", question: "",
  };
}

// ━━━ AI講評（閲覧者のClaudeに依頼） ━━━
let sample = null;
const HIDE_CODES = new Set(["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"]);
function aiErrorText(code) {
  return ({
    not_granted: "AI講評が許可されなかったので、自己採点で進めます。",
    sampling_disabled: "このアカウントではAI講評を使えないため、自己採点で進めます。",
    rate_limited: "AIの利用が混み合っているか、上限に達しました。時間をおいて試すか、自己採点で進めてください。",
    refused: "この回答はAIが講評できませんでした。表現を変えるか、自己採点で進めてください。",
    invalid_json: "AIの応答を読み取れませんでした。もう一度頼むか、自己採点で進めてください。",
    session_expired: "サインインが切れています。サインインし直すとAI講評が使えます。",
    cancelled: "AI講評を止めました。自己採点で進めます。",
  })[code] || "AI講評を取得できませんでした。もう一度頼むか、自己採点で進めてください。";
}
// ai_coach.py の build_evaluation_request と同じ並び（Web版は先頭に講評の方針を付ける）
function buildEvalPrompt(p, d) {
  const mode = MODES[p.mode], axes = RUBRICS[mode.rubric];
  const lines = ["モード：" + mode.code + " " + mode.name, "出題：" + p.prompt];
  if (p.condition) lines.push("条件：" + p.condition);
  lines.push("指示：" + mode.instruction, "場面：" + p.scene, "出題側の設計意図（フリが作る期待）：" + p.expectation, "想定している対照軸：" + p.axis, "想定している型：" + p.pattern);
  if (p.weak_reason) lines.push("出題側が想定する弱点：" + p.weak_reason);
  if (p.scoring_hint) lines.push("採点ヒント：" + p.scoring_hint);
  if (mode.char_limit) lines.push("字数の目安：" + (multi(p) ? "1案につき" : "") + mode.char_limit + "字以内");
  const rub = axes.map(a => a.key + "（" + a.name + "）：0点＝" + a.levels[0] + "／1点＝" + a.levels[1] + "／2点＝" + a.levels[2]).join("\n");
  const ex = p.examples.map(e => e.text + "（" + e.pattern + "）").join("\n") || "なし";
  const tags = Object.entries(WEAK).map(([k, v]) => k + "：" + v.description).join("\n");
  let learner;
  if (multi(p)) {
    const parts = splitAnswers(d.answer);
    while (parts.length < mode.answer_count) parts.push("");
    learner = parts.map((x, i) => "回答" + (i + 1) + "：" + (x || "（未記入）"));
  } else learner = ["回答：" + d.answer];
  if (d.diagnosis) learner.push("利用者の診断（弱い理由）：" + d.diagnosis);
  if (d.intent) learner.push("利用者が狙った期待とズレ：" + d.intent);
  const weak = weaknessCounts(S.attempts).slice(0, 3).map(x => x[0]);
  if (weak.length) learner.push("過去によく付いた弱点タグ：" + weak.join("、"));
  const scoreShape = axes.map(a => '"' + a.key + '": {"score": 0〜2の整数, "reason": "根拠"}').join(", ");
  return D.prompts.evalSystem + "\n\n"
    + "<mode_guide>\n" + D.prompts.modeGuides[p.mode] + "\n</mode_guide>\n\n"
    + "<problem>\n" + lines.join("\n") + "\n</problem>\n\n"
    + "<rubric>\n" + rub + "\n</rubric>\n\n"
    + "<weakness_tags>\n" + tags + "\n</weakness_tags>\n\n"
    + "<reference_examples>\n参考の成立例です。採点の基準にはせず、alternatives と重複させないためにだけ使ってください。\n" + ex + "\n</reference_examples>\n\n"
    + "<learner>\n" + learner.join("\n") + "\n</learner>\n\n"
    + "次の形のJSONオブジェクトだけを返してください。\n"
    + '{"detected_expectation": "", "deviation": "", "deviation_axis": "", "relevance": "related か weak か unrelated", '
    + '"scores": {' + scoreShape + '}, "safety_status": "ok か check_context か needs_revision", "safety_note": "", '
    + '"good_point": "", "improvements": ["最大2つ"], "one_revision": "", "alternatives": [{"text": "", "pattern": "", "why": ""}], '
    + '"tags": ["弱点タグの名前"], "confidence": "high か medium か low", "clarifying_question": ""}';
}
function toEvaluation(data, rubric) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw { code: "invalid_json" };
  const scores = {}, reasons = {}, raw = data.scores || {};
  for (const a of RUBRICS[rubric]) {
    const it = raw[a.key] || {}, v = Math.round(Number(it.score));
    scores[a.key] = Number.isFinite(v) ? Math.max(0, Math.min(2, v)) : 0;
    reasons[a.key] = String(it.reason || "");
  }
  const safety = ["ok", "check_context", "needs_revision"].includes(data.safety_status) ? data.safety_status : "ok";
  const tags = (Array.isArray(data.tags) ? data.tags : []).filter(t => t in WEAK);
  if (safety === "needs_revision" && !tags.includes("危険性")) tags.push("危険性");
  const conf = ["high", "medium", "low"].includes(data.confidence) ? data.confidence : "medium";
  return {
    source: "ai", rubric, scores, reasons,
    expectation: String(data.detected_expectation || ""), deviation: String(data.deviation || ""), axis: String(data.deviation_axis || ""),
    relevance: ["related", "weak", "unrelated"].includes(data.relevance) ? data.relevance : "related",
    safety, safetyNote: String(data.safety_note || ""), goodPoint: String(data.good_point || ""),
    improvements: (Array.isArray(data.improvements) ? data.improvements : []).filter(Boolean).map(String).slice(0, 2),
    revision: String(data.one_revision || ""),
    alternatives: (Array.isArray(data.alternatives) ? data.alternatives : []).filter(a => a && a.text)
      .slice(0, 3).map(a => ({ text: String(a.text), pattern: String(a.pattern || ""), note: String(a.why || "") })),
    tags, confidence: conf, question: conf === "low" ? String(data.clarifying_question || "") : "",
  };
}

// 書きかけのJSONから、閉じ終わった最上位の文字列だけを拾う。途中の文字列や壊れた入力では何も投げない
function partialFields(text) {
  const out = {};
  try {
    const s = String(text ?? ""), n = s.length;
    let i = 0, depth = 0, key = null;
    while (i < n) {
      const c = s[i];
      if (c === '"') {
        let j = i + 1, esc = false;
        for (; j < n; j++) { const d = s[j]; if (esc) esc = false; else if (d === "\\") esc = true; else if (d === '"') break; }
        if (j >= n) break; // まだ閉じていない文字列は届いていない扱い
        const raw = s.slice(i + 1, j);
        let str;
        try { str = JSON.parse('"' + raw + '"'); } catch { str = raw.replace(/\\(.)/g, "$1"); }
        i = j + 1;
        if (depth !== 1) continue;
        if (key === null) {
          let k = i;
          while (k < n && /\s/.test(s[k])) k++;
          if (s[k] === ":") { key = str; i = k + 1; }
        } else { out[key] = str; key = null; }
        continue;
      }
      if (c === "{" || c === "[") { depth++; if (depth > 1) key = null; }
      else if (c === "}" || c === "]") depth--;
      else if (c === "," && depth === 1) key = null;
      i++;
    }
  } catch { /* 途中の入力では拾えたぶんだけ返す */ }
  return out;
}
const streamSlots = p => [
  ["detected_expectation", p && p.mode === "M07" ? "ボケの前の期待" : "フリが作る期待"],
  ["deviation", "ズレ"],
  ["good_point", "良い点"],
];
const painted = new Map();
function slotInner(key, f) {
  const v = f[key];
  if (!v) return "";
  return h(v) + (key === "deviation" && f.deviation_axis ? '<span class="meta ai-axis">対照軸：' + h(f.deviation_axis) + "</span>" : "");
}
function streamStatus(st) {
  if (!st || !st.started) return "Claudeが講評を考えています。初回は利用の許可を求められます。";
  return st.fields.good_point ? "点数と改善案をまとめています…" : "講評を書いています…";
}
function onEvalText(text) {
  const st = S.stream;
  if (!st || S.phase !== "evaluating") return;
  st.started = true;
  st.fields = partialFields(text);
  paintStream();
}
// 届いた項目の欄だけを書き換える（画面全体は描き直さない）
function paintStream() {
  const st = S.stream, p = getProblem(S.problemId);
  if (!st) return;
  const s = document.getElementById("aiStatus");
  if (s && s.textContent !== streamStatus(st)) s.textContent = streamStatus(st);
  for (const [key] of streamSlots(p)) {
    const el = document.getElementById("st-" + key), html = slotInner(key, st.fields);
    if (!el || !html || painted.get(key) === html) continue;
    painted.set(key, html);
    el.querySelector("dd").innerHTML = html;
    el.classList.add("is-in");
  }
}
async function requestEval(p, d) {
  S.stream = { started: false, fields: {} };
  painted.clear();
  const data = await sample.json(buildEvalPrompt(p, d), {
    signal: S.ctl.signal, modelTier: "default",
    onText: u => onEvalText(u && u.text),
  });
  return toEvaluation(data, MODES[p.mode].rubric);
}

function buildGenPrompt(mode, theme) {
  const m = MODES[mode];
  const taken = byMode(mode).map(p => p.prompt).concat(Object.values(S.generated).filter(p => p.mode === mode).map(p => p.prompt)).join("\n");
  return D.prompts.genSystem + "\n\n" + m.code + " " + m.name + " の問題を1問作ってください。\n"
    + (theme ? "題材の希望：" + theme + "\n" : "")
    + "既存のお題と重複しないでください。\n<existing>\n" + taken + "\n</existing>\n\n"
    + '次の形のJSONオブジェクトだけを返してください。\n{"prompt": "", "condition": "", "expectation": "", "axis": "", "pattern": "", '
    + '"examples": [{"text": "", "pattern": "", "note": ""}], "focus": "", "scoring_hint": "", "weak_reason": ""}';
}
function toProblem(data, mode) {
  if (!data || typeof data !== "object") throw { code: "invalid_json" };
  for (const k of ["prompt", "expectation", "axis"]) if (!String(data[k] || "").trim()) throw { code: "invalid_json" };
  const condition = mode === "M04" || mode === "M05" ? String(data.condition || "").trim() : "";
  let pattern = String(data.pattern || "").trim();
  if (mode === "M04") {
    // 3つの違う型がそろっていない問題は使わない
    const t = condition.split("／").map(s => s.trim()).filter(Boolean);
    if (t.length !== 3 || new Set(t).size !== 3) throw { code: "invalid_json" };
    pattern = pattern || t[0];
  }
  const id = "G-" + Math.random().toString(16).slice(2, 10);
  return {
    id, mode, level: D.prompts.defaultLevel[mode] || 1, prompt: String(data.prompt).trim(),
    expectation: String(data.expectation).trim(), axis: String(data.axis).trim(), pattern,
    examples: (Array.isArray(data.examples) ? data.examples : []).filter(e => e && e.text).slice(0, 3)
      .map(e => ({ text: String(e.text), pattern: String(e.pattern || ""), note: String(e.note || "") })),
    focus: String(data.focus || ""), scoring_hint: String(data.scoring_hint || ""),
    condition, weak_reason: mode === "M06" ? String(data.weak_reason || "") : "",
    scene: "友人との雑談",
  };
}

// ━━━ 遷移 ━━━
function startProblem(id, retryOf = null, prevAnswer = "") {
  const p = getProblem(id); if (!p) return;
  if (p.mode !== S.mode) S.pickPattern = "all";
  const now = Date.now();
  Object.assign(S, {
    problemId: id, mode: p.mode, phase: "answer", draft: null, attempt: null, saved: false, retryOf, prevAnswer,
    aiError: "", canRetryAI: false, view: "practice", confirmDelete: null, stream: null,
    answerStart: now, challengeStart: now,
  });
  S.round++;
  fieldMemo.clear();
  render(); window.scrollTo({ top: 0 });
}
function startQueue(ids, label) { if (!ids.length) return; Sound.play("debayashi"); Object.assign(S, { queue: ids, queueLabel: label, queuePos: 0 }); startProblem(ids[0]); }
function stopQueue() { Object.assign(S, { queue: [], queueLabel: "", queuePos: 0 }); }
function startMode(mode) { stopQueue(); S.mode = mode; const id = nextProblemId(mode, S.attempts); if (id) startProblem(id); }
function goNext() {
  if (S.queue.length) {
    if (S.queuePos + 1 < S.queue.length) { S.queuePos++; startProblem(S.queue[S.queuePos]); return; }
    S.flash = S.queueLabel + "が終わりました。お疲れさまでした。"; stopQueue();
  }
  const cur = getProblem(S.problemId), mode = cur ? cur.mode : S.mode;
  const id = nextProblemId(mode, S.attempts, cur ? [cur.id] : []);
  if (id) startProblem(id);
}
async function finishAttempt(p, ev) {
  const d = S.draft, now = Date.now();
  const a = {
    id: Math.random().toString(16).slice(2, 14), problemId: p.id, mode: p.mode, answer: d.answer, intent: d.intent, diagnosis: d.diagnosis,
    evaluation: ev, selfScores: null, favorite: false, memo: "", retryOf: S.retryOf,
    problemSnapshot: p.id.startsWith("G-") ? p : null,
    elapsedSec: Number.isFinite(d.elapsedSec) ? d.elapsedSec : null, satisfaction: null,
    ts: now, createdAt: new Date(now).toISOString(),
  };
  if (d.save) Store.add(a);
  Object.assign(S, { attempt: a, saved: d.save, phase: "result" });
}
async function askAI(p) {
  S.phase = "evaluating"; S.aiError = ""; S.ctl = new AbortController(); S.stream = { started: false, fields: {} }; render();
  try {
    await finishAttempt(p, await requestEval(p, S.draft));
  } catch (e) {
    const code = e && e.code;
    if (HIDE_CODES.has(code)) S.ai = "off";
    S.aiError = aiErrorText(code);
    S.canRetryAI = S.ai === "ready" && !["refused", "cancelled"].includes(code);
    S.phase = "self";
  }
  S.ctl = null; S.stream = null; render();
}
async function reAsk(p, reply) {
  const a = S.attempt, intent = [a.intent, reply].filter(Boolean).join("\n");
  S.draft = { ...S.draft, answer: a.answer, diagnosis: a.diagnosis, intent };
  S.phase = "evaluating"; S.ctl = new AbortController(); S.stream = { started: false, fields: {} }; render();
  try {
    const ev = await requestEval(p, S.draft);
    if (S.saved) Store.update(a.id, { evaluation: ev, intent }); else S.attempt = { ...a, evaluation: ev, intent };
  } catch (e) {
    if (HIDE_CODES.has(e && e.code)) S.ai = "off";
    S.flash = aiErrorText(e && e.code);
  }
  S.ctl = null; S.stream = null; S.phase = "result"; render();
}
async function generate(mode, theme) {
  S.generating = true; S.genError = ""; S.ctl = new AbortController(); render();
  try {
    const data = await sample.json(buildGenPrompt(mode, theme), { signal: S.ctl.signal, cache: false });
    const p = toProblem(data, mode);
    S.generated[p.id] = p; S.generating = false; S.ctl = null; stopQueue(); startProblem(p.id); return;
  } catch (e) {
    if (HIDE_CODES.has(e && e.code)) S.ai = "off";
    S.genError = e && e.code === "cancelled" ? "" : "問題を作れませんでした。" + (e && e.code === "rate_limited" ? "時間をおいて試してください。" : "もう一度試してください。");
  }
  S.generating = false; S.ctl = null; render();
}

// ━━━ 表示部品 ━━━
const roleOf = p => ({ M01: "フリ", M03: "フリ", M04: "フリ", M02: "オチ", M05: "お題", M06: "ネタ", M07: "ボケ" })[p.mode] || "お題";
const dialogue = s => String(s).replace(/」\s*(?=[AB]「)/g, "」\n");
function lineOf(p) {
  if (p.mode === "M01" || p.mode === "M03" || p.mode === "M04") return "「" + p.prompt + "」";
  if (p.mode === "M02") return p.prompt.replace(/^オチ：/, "");
  if (p.mode === "M05") return p.prompt.replace(/^テーマ：/, "");
  return dialogue(p.prompt);
}
// M07 のボケ（最後のAの発言）と、Bとして返すツッコミの書き方
const lastTurn = s => { const t = String(s).match(/[AB]「[^」]*」/g); return t ? t[t.length - 1] : String(s); };
const tsukkomiLine = ans => { const s = String(ans).trim(); return /^[AB]「/.test(s) ? s : /^「/.test(s) ? "B" + s : "B「" + s + "」"; };
const dots = n => "●".repeat(n) + "○".repeat(2 - n);
function mekuriLines(p, filled) {
  if (p.mode !== "M07") return h(lineOf(p));
  const lines = dialogue(p.prompt).split("\n");
  return lines.map((l, i) => '<span class="ln' + (i === lines.length - 1 ? " boke" : "") + '"><span>' + h(l) + "</span></span>").join("")
    + (filled ? '<span class="ln slot filled"><span>' + h(tsukkomiLine(filled)) + "</span></span>"
      : '<span class="ln slot">B「<span class="slot-gap"><span class="sr">ここにあなたのツッコミが入ります</span></span>」</span>');
}
function mekuri(p, filled = "") {
  const m = MODES[p.mode], lv = LEVELS[p.level];
  const cond = multi(p)
    ? '<div class="cond trio-cond" aria-label="使う型">' + condTypes(p).map((t, i) => '<span class="chip"><b>' + (i + 1) + "</b>" + h(t) + "</span>").join("") + "</div>"
    : p.condition ? '<div class="cond">条件：' + h(p.condition) + "</div>" : "";
  return '<div class="mk"><p class="mk-bar"><span class="mk-code">' + h(m.code) + "</span><span>" + h(m.name) + '</span><span class="mk-lv">Lv' + p.level + " " + h(lv.name) + '</span><span class="mk-id">'
    + (p.id.startsWith("G-") ? "AI生成" : h(p.id)) + "</span></p>"
    + '<div class="mekuri' + (p.mode === "M06" || p.mode === "M07" ? " is-talk" : "") + '"><div class="role" aria-hidden="true">' + h(roleOf(p)) + '</div><div class="line">' + mekuriLines(p, filled) + cond + "</div></div></div>";
}
function intentBlock(p) {
  const k7 = p.mode === "M07";
  return '<div class="stack" style="gap:6px"><p><span class="meta">' + (k7 ? "ボケの前の期待" : "期待") + "</span>　" + h(p.expectation) + "</p>"
    + '<p><span class="meta">' + (k7 ? "ボケが外した尺度" : "対照軸") + "</span>　" + h(p.axis) + "　" + patternsOf(p).map(t => '<span class="chip">' + h(t) + "</span>").join(" ") + "</p>"
    + (p.weak_reason ? '<p><span class="meta">元ネタが弱い理由</span>　' + h(p.weak_reason) + "</p>" : "")
    + (p.focus ? '<p><span class="meta">解説の焦点</span>　' + h(p.focus) + "</p>" : "") + "</div>";
}
function altList(list) {
  return '<ul class="alts">' + list.map(a => '<li><span class="t">' + h(dialogue(a.text)) + '</span><span class="n">' + (a.pattern ? '<span class="chip">' + h(a.pattern) + "</span>" : "") + (a.note ? "　" + h(a.note) : "") + "</span></li>").join("") + "</ul>";
}
function checksBlock(checks) {
  return checks.map(c => '<p class="callout ' + (c.level === "warn" ? "warn" : "info") + '">' + h(c.message) + "</p>").join("");
}
// 回答の本文。M04 は型ごとに番号を振り、字数を添える
function answerBody(p, ans) {
  if (!p || !multi(p)) return '<p class="quote">' + h(ans) + "</p>";
  const parts = splitAnswers(ans);
  return '<ol class="trio">' + answerSlots(p).map((slot, i) => {
    const t = parts[i] || "";
    return '<li><span class="trio-n">' + (i + 1) + '</span><span class="trio-h"><span class="chip">' + h(slot) + "</span>" + (t ? '<span class="meta">' + charCount(t) + "字</span>" : "") + "</span>"
      + '<span class="trio-t' + (t ? "" : " is-empty") + '">' + (t ? h(t) : "（未記入）") + "</span></li>";
  }).join("") + "</ol>";
}
function statusLine() {
  const ai = S.ai === "ready" ? "AI講評：使えます（初回だけ許可を求められます）" : S.ai === "pending" ? "AI講評：確認中" : "AI講評：このページでは使えないため、自己採点で進みます";
  const st = S.storage === "db" ? "履歴：あなた専用に保存（ほかの人には見えません）" : S.storage === "local" ? "履歴：このブラウザに保存" : "履歴：このページを閉じると消えます";
  return '<p class="meta">' + ai + "<br>" + st + (S.storageNote ? "<br>" + h(S.storageNote) : "") + "</p>";
}

// ━━━ ホーム ━━━
function renderHome() {
  const list = S.attempts, today = dayKey(Date.now());
  const todayN = list.filter(a => dayKey(a.ts) === today).length;
  const t = todaysSet(list), first = BANK[t.ids[0]];
  let out = first ? Stage.hero({ role: roleOf(first), line: lineOf(first), label: "今日の10分　1問目" }) : "";
  out += '<div class="stats"><span>連続<b>' + streakDays(list) + "</b>日</span><span>今日<b>" + todayN + "</b>問</span><span>累計<b>" + list.length + "</b>問</span></div>"
    + '<article class="panel today"><div class="row"><h2 class="grow">今日の10分</h2><span class="meta">' + t.ids.length + "問・時間制限なし</span></div>"
    + '<p class="meta">' + h(t.reason) + '</p><ol class="qlist">'
    + t.ids.map(id => { const p = BANK[id]; return '<li><span class="chip">' + h(MODES[p.mode].name) + "</span><span>" + h(p.prompt) + "</span></li>"; }).join("")
    + '</ol><button type="button" class="btn primary wide" data-act="today">今日の10分を始める</button></article>'
    + '<p class="lede">相手の予測を読み、同じ尺度でズレを作り、短く着地させる練習です。正解のボケを当てるゲームではありません。</p>';
  const weak = weaknessCounts(list).slice(0, 3);
  if (weak.length) {
    out += '<section class="stack" style="gap:8px"><h2>最近の弱点</h2>' + weak.map(([tag, n]) => {
      const m = WEAK[tag].modes.find(x => D.implemented.includes(x)) || WEAK[tag].modes[0];
      return '<div class="row"><div class="grow"><span class="chip tag">' + h(tag) + "</span> " + n + '回<br><span class="meta">' + h(WEAK[tag].description) + '</span></div><button type="button" class="btn small" data-act="mode" data-mode="' + h(m) + '">' + h(MODES[m].name) + "で練習</button></div>";
    }).join("") + "</section>";
  }
  const done = new Set(list.map(a => a.problemId));
  out += '<section class="stack" style="gap:6px"><h2>モードを選ぶ</h2><div class="modes">' + D.implemented.map(code => {
    const m = MODES[code], bank = byMode(code), solved = bank.filter(p => done.has(p.id)).length;
    return '<div class="mode-row"><div><span class="code">' + code + '</span><span class="name">' + h(m.name) + '</span>　<span class="meta">' + h(m.difficulty) + "</span><br>"
      + '<span class="meta">' + h(m.what) + "　" + solved + "/" + bank.length + "問</span></div>"
      + '<button type="button" class="btn small" data-act="mode" data-mode="' + code + '">練習する</button></div>';
  }).join("") + "</div>"
    + '<p class="meta">今後追加：' + Object.values(MODES).filter(m => !m.implemented).map(m => h(m.code + " " + m.name)).join("、") + "</p></section>";
  out += '<details><summary>まず試す7日間のパイロット</summary><div class="body">' + D.pilot.map(d => {
    const menu = d.menu.map(([m, n]) => MODES[m].name + "×" + n).join("、") || "—";
    return '<div class="row"><div class="grow"><b>Day ' + d.day + "</b>　" + h(menu) + '<br><span class="meta">ゴール：' + h(d.goal) + (d.pending ? "。" + h(d.pending) : "") + "</span></div>"
      + (d.menu.length ? '<button type="button" class="btn small" data-act="pilot" data-day="' + d.day + '">始める</button>' : "") + "</div>";
  }).join("") + "</div></details>";
  const lp = levelProgress(list);
  out += '<details><summary>進行判定（初期仮説）</summary><div class="body">'
    + "<p><b>Lv1 " + h(LEVELS[1].name) + '</b>　<span class="meta">' + h(LEVELS[1].criterion) + "</span></p>"
    + '<div class="progress"><i style="width:' + Math.min(lp.l1.ok, 7) / 7 * 100 + '%"></i></div>'
    + '<p class="meta">直近' + lp.l1.done + "問中 " + lp.l1.ok + "問で説明できた" + (lp.l1.achieved ? "　達成" : "") + "</p>"
    + "<p><b>Lv2 " + h(LEVELS[2].name) + '</b>　<span class="meta">' + h(LEVELS[2].criterion) + "</span></p>"
    + '<p class="meta">' + lp.l2.done + "問　" + (lp.l2.median === null ? "まだ記録なし" : "中央値 " + lp.l2.median) + (lp.l2.achieved ? "　達成" : "") + "</p>"
    + '<p class="meta">解放条件は仮説です。どの問題もいつでも解けます。</p></div></details>';
  return out + statusLine();
}

// ━━━ 練習 ━━━
function patternCounts(mode) {
  const c = new Map();
  for (const p of byMode(mode)) for (const t of patternsOf(p)) c.set(t, (c.get(t) || 0) + 1);
  return [...c.entries()].sort((x, y) => y[1] - x[1]);
}
function renderPicker() {
  if (S.queue.length) {
    return '<div class="stack" style="gap:6px"><div class="row"><span class="grow"><b>' + h(S.queueLabel) + "</b>　" + (S.queuePos + 1) + " / " + S.queue.length
      + '</span><button type="button" class="btn small" data-act="stopQueue">中断する</button></div><div class="progress"><i style="width:' + (S.queuePos + 1) / S.queue.length * 100 + '%"></i></div></div>';
  }
  const done = new Set(S.attempts.map(a => a.problemId)), bank = byMode(S.mode), pats = patternCounts(S.mode);
  const pp = pats.some(([n]) => n === S.pickPattern) ? S.pickPattern : "all";
  let out = '<div class="row"><select id="modeSelect" class="grow" aria-label="モード">' + D.implemented.map(c => '<option value="' + c + '"' + (c === S.mode ? " selected" : "") + ">" + c + " " + h(MODES[c].name) + "</option>").join("")
    + '</select><button type="button" class="btn" data-act="nextInMode">次の問題</button></div>'
    + '<details><summary>問題を選ぶ</summary><div class="body">'
    + (pats.length > 1 ? '<div class="pfilter" role="group" aria-label="型で絞り込む">' + [["all", bank.length]].concat(pats).map(([k, n]) =>
      '<button type="button" class="pchip" data-act="pfilter" data-k="' + h(k) + '" aria-pressed="' + (pp === k) + '">' + (k === "all" ? "すべて" : h(k)) + '<span class="n">' + n + "</span></button>").join("") + "</div>" : "")
    + '<div class="plist">' + bank.map(p =>
      '<button type="button" class="btn small" data-act="pick" data-id="' + p.id + '" data-pats="' + h(patternsOf(p).join("|")) + '"' + (pp === "all" || patternsOf(p).includes(pp) ? "" : " hidden") + ">"
      + (done.has(p.id) ? "✓ " : "") + h(p.id) + "　" + h(p.prompt) + "</button>").join("") + "</div></div></details>";
  if (S.ai === "ready") {
    out += '<details' + (S.generating || S.genError ? " open" : "") + '><summary>AIで新しい問題を作る</summary><div class="body"><form id="genForm" class="stack" style="gap:8px">'
      + '<label class="field">題材の希望（任意）<input type="text" id="genTheme" placeholder="例：在宅勤務、引っ越し、新人研修"></label>'
      + (S.generating ? '<div class="row"><span class="thinking grow"><span class="dot"></span>問題を作っています…</span><button type="button" class="btn small" data-act="stopAI">止める</button></div>'
        : '<button type="submit" class="btn">' + h(MODES[S.mode].name) + "の問題を作る</button>")
      + (S.genError ? '<p class="error">' + h(S.genError) + "</p>" : "") + "</form></div></details>";
  }
  return out;
}
const THINK = {
  M04: ["このフリを聞いた人は、次に何を期待する？", "型ごとに、何をずらすかを決める（大きさ・言葉の意味・本人の矛盾など）", "3案とも、フリと同じ尺度の上に乗っている？"],
  M07: ["ボケの前に、聞き手は何を期待していた？", "ボケはその期待のどこを外した？ 一言で言うと？", "本来どうあるべきかを短く示せる？ 相手を下げすぎていない？"],
};
const THINK_DEFAULT = ["このフリを聞いた人は、次に何を期待する？", "その期待と反対の位置にあるものは何？ 同じ尺度で考える。", "どんな場面で、誰に向かって言う？"];
const INTENT = {
  M04: ["狙った期待とズレ（任意）", "例：1案目は変化の大きさ、2案目は変化の向き、3案目は本人の矛盾でずらした"],
  M07: ["突いたズレと、示した基準（任意）", "例：詳しいと言ったのに、一番有名なものを使っていない点を突いた"],
};
const INTENT_DEFAULT = ["狙った期待とズレ（任意）", "例：寝ていない→実は長く寝ている、の睡眠時間の軸で反転させた"];
const CH_SEC = 30;
function prevBlock(p) {
  if (!S.prevAnswer) return "";
  return '<div class="callout info prev"><p>前回の回答</p>' + answerBody(p, S.prevAnswer) + "<p>同じお題のまま、別の型や別の尺度で書き換えてみましょう。</p></div>";
}
function renderAnswer(p) {
  const mode = MODES[p.mode], r = S.round, lim = mode.char_limit;
  const limit = lim ? "（" + (multi(p) ? "1案" : "") + lim + "字以内が目安）" : "";
  const [il, ip] = INTENT[p.mode] || INTENT_DEFAULT;
  let field;
  if (multi(p)) {
    const slots = answerSlots(p);
    field = '<fieldset class="trio-in"><legend>' + h(mode.answer_label) + "を" + slots.length + "案</legend>" + slots.map((slot, i) => {
      const id = "ans-" + r + "-" + (i + 1), hint = TYPE_HINT[slot];
      return '<label class="field trio-field"><span class="trio-head"><b class="trio-n">' + (i + 1) + '</b><span class="chip">' + h(slot) + "</span>" + (hint ? '<span class="meta">' + h(hint) + "</span>" : "") + "</span>"
        + '<input type="text" class="answer-input" id="' + id + '" autocomplete="off" enterkeyhint="' + (i < slots.length - 1 ? "next" : "done") + '">'
        + '<span class="counter" id="cnt-' + id + '">0' + (lim ? " / " + lim : "") + "字</span></label>";
    }).join("") + "</fieldset>";
  } else {
    const id = "ans-" + r, short = ["M01", "M03", "M07"].includes(p.mode);
    const input = short ? '<input type="text" class="answer-input" id="' + id + '" autocomplete="off">'
      : '<textarea class="answer-input" id="' + id + '" rows="4" placeholder="' + (p.mode === "M05" || p.mode === "M06" ? "A「…」&#10;B「…」&#10;A「…」" : "") + '"></textarea>';
    field = '<label class="field">' + h(mode.answer_label) + (p.mode === "M07" ? '<span class="meta">Bとして返す一言</span>' : "")
      + (p.mode === "M07" ? '<span class="affix-wrap"><span class="affix" aria-hidden="true">B「</span>' + input + '<span class="affix" aria-hidden="true">」</span></span>' : input)
      + '<span class="counter" id="cnt-' + id + '">0' + (lim ? " / " + lim : "") + "字</span></label>";
  }
  const ring = '<svg class="cd-ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="cd-track" cx="18" cy="18" r="15"/>'
    + '<circle class="cd-arc" id="cdArc" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="0" transform="rotate(-90 18 18)"/></svg>';
  return prevBlock(p)
    + "<p>" + h(mode.instruction) + h(limit) + "</p>"
    + '<details><summary>思考補助</summary><div class="body">' + (THINK[p.mode] || THINK_DEFAULT).map(x => "<p>" + h(x) + "</p>").join("") + "</div></details>"
    + (p.mode !== "M03" ? "<details><summary>" + (p.mode === "M07" ? "ヒント（ボケが外した尺度）" : "ヒント（対照軸）") + '</summary><div class="body"><p>' + h(p.axis) + "</p></div></details>" : "")
    + '<div class="ma" aria-hidden="true">間</div>'
    + '<form id="answerForm" class="stack" novalidate>'
    + '<div class="ch30"><label class="switch"><input type="checkbox" id="ch30"' + (S.challenge ? " checked" : "") + '><span>30秒チャレンジ</span></label>'
    + '<div class="cd" id="cd" role="timer"' + (S.challenge ? "" : " hidden") + ">" + ring + '<span class="cd-t" id="cdText">残り' + CH_SEC + "秒</span></div></div>"
    + (p.mode === "M06" ? '<label class="field">弱い理由（一言で）<input type="text" id="diag-' + r + '" autocomplete="off"></label>' : "")
    + field
    + (p.mode !== "M03" ? '<label class="field">' + h(il) + '<textarea id="intent-' + r + '" rows="2" placeholder="' + h(ip) + '"></textarea></label>' : "")
    + '<div class="stack" style="gap:4px"><label class="check"><input type="checkbox" id="save-' + r + '" checked>この回答を履歴に保存する</label>'
    + (S.ai === "ready" ? '<label class="check"><input type="checkbox" id="useAi"' + (S.useAi ? " checked" : "") + '>Claudeに講評してもらう</label>' : "") + "</div>"
    + '<p class="error" id="formError" role="alert" hidden></p>'
    + '<div class="stack" style="gap:4px"><button type="submit" class="btn primary wide">講評を見る</button><p class="meta kbd-hint">Ctrl＋Enter（Macは⌘＋Enter）でも送れます</p></div></form>';
}
function yourAnswer(a, p) {
  return '<section class="stack" style="gap:6px"><h3>あなたの回答</h3>' + (a.diagnosis ? '<p><span class="meta">弱い理由</span>　' + h(a.diagnosis) + "</p>" : "")
    + answerBody(p, a.answer) + (a.intent ? '<p class="meta">狙い：' + h(a.intent) + "</p>" : "") + "</section>";
}
function renderEvaluating(p) {
  const st = S.stream || { started: false, fields: {} };
  painted.clear();
  const slots = streamSlots(p).map(([key, label]) => {
    const html = slotInner(key, st.fields);
    if (html) painted.set(key, html);
    return '<div class="ai-slot' + (html ? " is-in" : "") + '" id="st-' + key + '"><dt>' + h(label) + "</dt><dd>" + (html || '<span class="ai-wait" aria-hidden="true"></span>') + "</dd></div>";
  }).join("");
  return yourAnswer(S.draft, p)
    + '<div class="panel ai-live" aria-busy="true"><div class="ai-live-head"><span class="chip ai">Claudeの講評</span>'
    + '<span class="thinking"><span class="dot"></span><span id="aiStatus" role="status">' + h(streamStatus(st)) + "</span></span></div>"
    + '<dl class="ai-slots">' + slots + "</dl>"
    + '<button type="button" class="btn small" data-act="stopAI">止めて自己採点にする</button></div>';
}
function renderSelf(p) {
  const d = S.draft, r = S.round, axes = RUBRICS[MODES[p.mode].rubric];
  const defSafety = d.checks.some(c => c.tag === "危険性") ? "check_context" : "ok";
  return (S.aiError ? '<p class="callout warn">' + h(S.aiError) + "</p>" : "")
    + (S.canRetryAI ? '<button type="button" class="btn" data-act="retryAI">もう一度Claudeに頼む</button>' : "")
    + yourAnswer(d, p) + checksBlock(d.checks)
    + '<div class="panel"><h3>出題側の想定</h3>' + intentBlock(p) + "<h3>成立例（唯一解ではありません）</h3>" + altList(p.examples) + "</div>"
    + '<form id="selfForm" class="stack"><h2>自己採点</h2><p class="meta">出題側の想定と比べて、各軸を0〜2点で付けてください。想定と違う答えでも、構造が成立していれば点を付けてかまいません。</p>'
    + axes.map(a => '<fieldset><legend>' + h(a.name) + '</legend><div class="seg">' + [0, 1, 2].map(v =>
      '<label><input type="radio" name="' + a.key + '" id="sc-' + a.key + "-" + v + "-" + r + '" value="' + v + '"' + (v === 1 ? " checked" : "") + "><b>" + v + "</b>" + h(a.levels[v]) + "</label>").join("") + "</div></fieldset>").join("")
    + '<fieldset><legend>安全性（点数とは別枠）</legend><div class="seg safety">' + Object.entries(D.safety).map(([k, v]) =>
      '<label><input type="radio" name="safety" id="sf-' + k + "-" + r + '" value="' + k + '"' + (k === defSafety ? " checked" : "") + ">" + h(v) + "</label>").join("") + "</div></fieldset>"
    + '<button type="submit" class="btn primary wide">採点を記録</button></form>';
}

// この回答の構造：口に出す台詞（実線）と、聞き手の頭の中（点線）を順に並べる
function flowSteps(p, a, ev) {
  const exp = ev.expectation || p.expectation, axis = ev.axis || p.axis, ans = a.answer;
  const said = (k, html) => ({ k, html, said: true });
  const head = (k, text, sub) => ({ k, html: h(text), said: false, sub });
  const ansHtml = multi(p)
    ? '<ol class="fl-list">' + splitAnswers(ans).map(x => "<li>" + (x ? h(x) : '<span class="meta">（未記入）</span>') + "</li>").join("") + "</ol>"
    : h(dialogue(ans));
  if (p.mode === "M03") return [said("フリ", h(lineOf(p))), head("あなたの予想", ans), head("出題側の期待", p.expectation)];
  if (p.mode === "M07") return [said("ボケ", h(lastTurn(p.prompt))), head("ズレ", axis, "期待：" + exp), said("ツッコミ", h(tsukkomiLine(ans)))];
  if (p.mode === "M02") return [said("フリ", ansHtml), head("期待", exp), said("オチ", h(lineOf(p))), head("ズレ", axis)];
  if (p.mode === "M05") return [head("お題", lineOf(p)), head("期待", exp), said("掛け合い", ansHtml), head("ズレ", axis)];
  if (p.mode === "M06") return [said("元ネタ", h(lineOf(p))), head("期待", exp), said("改善版", ansHtml), head("ズレ", axis)];
  return [said("フリ", h(lineOf(p))), head("期待", exp), said(multi(p) ? "オチ×3" : "オチ", ansHtml), head("ズレ", axis)];
}
function flowStrip(p, a, ev) {
  const steps = flowSteps(p, a, ev);
  // 長い台詞（掛け合いや3案）があるときは、広い画面でも縦に流す
  const long = steps.some(s => s.html.replace(/<[^>]*>/g, "").length > 48);
  return '<section class="flow-sec"><h3>この回答の構造</h3><ol class="flow n' + steps.length + (long ? " is-long" : "") + '">' + steps.map((s, i) =>
    (i ? '<li class="fl-arrow" aria-hidden="true"></li>' : "")
    + '<li class="fl ' + (s.said ? "said" : "head") + '"><span class="fl-k">' + h(s.k) + '</span><span class="fl-v">' + s.html + "</span>"
    + (s.sub ? '<span class="fl-sub">' + h(s.sub) + "</span>" : "") + "</li>").join("")
    + '</ol><p class="meta">実線は口に出す台詞、点線は聞き手の頭の中です。</p></section>';
}
function effortLine(a) {
  const bits = [];
  if (Number.isFinite(a.elapsedSec)) bits.push("制作時間 " + fmtSec(a.elapsedSec));
  const ch = S.draft && S.attempt && S.attempt.id === a.id && S.draft.challenge;
  if (ch) {
    const over = Math.floor(ch.sec - CH_SEC);
    bits.push(ch.sec <= CH_SEC ? '<span class="chip good">30秒チャレンジ 成功</span>' : '<span class="chip tag">30秒チャレンジ +' + Math.max(1, over) + "秒</span>");
  }
  return bits.length ? '<p class="effort meta">' + bits.join("　") + "</p>" : "";
}
function scoreBlock(ev, a) {
  const axes = RUBRICS[ev.rubric], tot = total(ev), max = maxTotal(ev);
  const mine = ev.source === "ai" ? a.selfScores : null;
  // 金の面が自分、藍の点線がClaude（charts.js の凡例に合わせる）
  const chart = mine ? Charts.radar({ axes, scores: mine, compare: ev.scores }) : Charts.radar({ axes, scores: ev.scores });
  return '<section class="scorecard"><div class="score-head"><h3>構造スコア</h3><span class="num" data-count="' + tot + '">' + tot + '</span><span class="of">/ ' + max + "</span>"
    + (ev.source === "ai" ? '<span class="chip ai">Claudeの講評</span>' : '<span class="chip">自己採点</span>') + "</div>"
    + effortLine(a)
    + '<div class="score-body"><div class="score-chart">' + chart + '</div><div class="axes">'
    + axes.map(x => { const s = ev.scores[x.key] ?? 0; return '<div class="axis"><span>' + h(x.name) + '</span><span class="dots" aria-label="' + s + '点">' + dots(s) + '</span><span class="why">' + h(ev.reasons[x.key] || x.levels[s]) + "</span></div>"; }).join("")
    + "</div></div></section>";
}
function reviewBody(ev, p) {
  let out = '<div class="review">';
  out += "<section><h3>ズレ</h3>" + (ev.deviation ? "<p>" + h(ev.deviation) + "</p>" : "")
    + '<p class="meta">対照軸：' + h(ev.axis || p.axis) + "　" + h(D.relevance[ev.relevance] || "") + "</p></section>";
  if (ev.safety !== "ok") out += '<p class="callout ' + (ev.safety === "needs_revision" ? "bad" : "warn") + '">安全性：' + h(D.safety[ev.safety]) + "　" + h(ev.safetyNote || "誰かを傷つける形になっていないか、使う場面を確認しましょう。") + "</p>";
  if (ev.goodPoint) out += "<section><h3>良い点</h3><p>" + h(ev.goodPoint) + "</p></section>";
  if (ev.improvements.length || ev.revision) {
    out += "<section><h3>改善するなら</h3>" + ev.improvements.map(i => "<p>" + h(i) + "</p>").join("")
      + (ev.revision ? '<p class="meta">修正案</p><p class="revision">' + h(dialogue(ev.revision)) + "</p>" : "") + "</section>";
  }
  if (ev.alternatives.length) out += "<section><h3>" + (ev.source === "ai" ? "別の型で作るなら" : "成立例") + "</h3>" + altList(ev.alternatives) + "</section>";
  if (ev.tags.length) out += "<section><h3>弱点タグ</h3><p>" + ev.tags.map(t => '<span class="chip tag">' + h(t) + "</span>").join(" ") + "</p></section>";
  return out + '<p class="disclaimer">得点は笑いの保証ではなく、構造を学ぶための参考指標です。高得点でもウケないことはあるし、低得点でも演技や関係性で成立することがあります。</p></div>';
}
// コピーするネタ（お題＋回答）
function netaText(p, a) {
  const ans = a.answer;
  if (p.mode === "M02") return ans + "\n" + lineOf(p);
  if (p.mode === "M03") return lineOf(p) + "\n予想：" + ans;
  if (multi(p)) { const slots = answerSlots(p); return lineOf(p) + "\n" + splitAnswers(ans).map((x, i) => (i + 1) + ". " + (x || "（未記入）") + "（" + slots[i] + "）").join("\n"); }
  if (p.mode === "M07") return dialogue(p.prompt) + "\n" + tsukkomiLine(ans);
  if (p.mode === "M05") return p.prompt + "\n" + ans;
  if (p.mode === "M06") return "元のネタ\n" + dialogue(p.prompt) + "\n\n改善版\n" + ans;
  return lineOf(p) + "\n" + ans;
}
function satButtons(a) {
  const v = a.satisfaction;
  return '<div class="sat-row"><span class="sat-label" id="satLabel">自己満足度</span><div class="sat" role="group" aria-labelledby="satLabel">'
    + [1, 2, 3, 4, 5].map(n => '<button type="button" data-act="sat" data-v="' + n + '" aria-pressed="' + (v === n) + '" aria-label="' + n + "　" + SATISFACTION[n] + '" title="' + SATISFACTION[n] + '">' + n + "</button>").join("")
    + '</div><span class="meta" id="satCap">' + (v ? h(v + "　" + SATISFACTION[v]) : "任意。あとで見返すときの目安に") + "</span></div>";
}
function renderResult(p) {
  const a = S.attempt, ev = a.evaluation, r = S.round;
  let out = yourAnswer(a, p) + flowStrip(p, a, ev);
  if (ev.source === "ai" && S.draft && S.draft.checks.length) out += checksBlock(S.draft.checks);
  if (ev.question && S.ai === "ready") {
    out += '<form id="clarifyForm" class="panel"><h3>確認させてください</h3><p>' + h(ev.question) + "</p>"
      + '<textarea id="clarify-' + r + '" rows="2" aria-label="狙ったズレ"></textarea><button type="submit" class="btn">狙いを伝えて講評し直す</button></form>';
  }
  out += scoreBlock(ev, a) + reviewBody(ev, p);
  if (ev.source === "ai") {
    out += '<details><summary>出題側の想定と成立例</summary><div class="body">' + intentBlock(p) + altList(p.examples) + "</div></details>";
    const axes = RUBRICS[ev.rubric], mine = a.selfScores;
    out += '<details' + (mine ? " open" : "") + '><summary>自分の評価と比べる</summary><div class="body"><form id="compareForm" class="stack">'
      + axes.map(x => '<fieldset><legend>' + h(x.name) + '</legend><div class="seg">' + [0, 1, 2].map(v =>
        '<label><input type="radio" name="' + x.key + '" id="cmp-' + x.key + "-" + v + "-" + r + '" value="' + v + '"' + (v === (mine ? mine[x.key] : 1) ? " checked" : "") + "><b>" + v + "</b>" + h(x.levels[v]) + "</label>").join("") + "</div></fieldset>").join("")
      + '<button type="submit" class="btn">比べる</button></form>'
      + (mine ? '<div class="axes">' + axes.map(x => { const ai = ev.scores[x.key], me = mine[x.key]; return '<div class="axis"><span>' + h(x.name) + "</span><span>" + ai + " / " + me + '</span><span class="why">' + (ai === me ? "一致" : me > ai ? "自分の評価が高め" : "自分の評価が低め") + "</span></div>"; }).join("") + '<p class="meta">左がClaude、右があなたの評価。上のチャートにも重ねています</p></div>' : "")
      + "</div></details>";
  }
  out += '<section class="wrapup">' + satButtons(a)
    + '<div class="row"><button type="button" class="btn small" data-act="copy">ネタをコピー</button><span class="meta grow" id="copyMsg" role="status"></span></div>'
    + '<textarea id="copyBox" class="copybox" rows="3" readonly hidden aria-label="コピーするネタ">' + h(netaText(p, a)) + "</textarea></section>";
  out += '<div class="row"><button type="button" class="btn grow" data-act="retry">同じお題でもう一度作る</button><button type="button" class="btn primary grow" data-act="next">次の問題へ</button></div>';
  if (S.saved) {
    out += '<details><summary>お気に入り・実演メモ</summary><div class="body"><label class="check"><input type="checkbox" id="fav-' + r + '" data-act-change="fav" data-id="' + a.id + '"' + (a.favorite ? " checked" : "") + ">お気に入りに入れる</label>"
      + '<label class="field">実際に使ってみた反応<textarea id="memo-' + r + '" rows="2">' + h(a.memo) + "</textarea></label>"
      + '<button type="button" class="btn small" data-act="memo" data-id="' + a.id + '" data-src="memo-' + r + '">メモを保存</button></div></details>';
  } else out += '<p class="meta">この回答は履歴に保存していません。自己満足度もこの画面だけの記録です。</p>';
  return out;
}
function renderPractice() {
  let out = (S.flash ? '<p class="callout info">' + h(S.flash) + "</p>" : "") + renderPicker();
  S.flash = "";
  const p = getProblem(S.problemId);
  if (!p) return out + '<div class="empty">' + Stage.mic(44) + '<div class="stack" style="gap:6px"><p class="empty-t">まだ問題を出していません</p><p>モードを選んで「次の問題」を押すと始まります。迷ったらホームの「今日の10分」からどうぞ。</p></div></div>';
  const filled = S.phase === "answer" ? "" : (S.attempt ? S.attempt.answer : S.draft ? S.draft.answer : "");
  out += mekuri(p, filled);
  if (S.phase === "answer") out += renderAnswer(p);
  else if (S.phase === "evaluating") out += renderEvaluating(p);
  else if (S.phase === "self") out += renderSelf(p);
  else out += renderResult(p);
  return out;
}

// ━━━ ノート（記録のダッシュボード＋回答の一覧） ━━━
const RUBRIC_FAMILY = { neta: "ネタ", prediction: "期待の言語化", trio: "3オチ", tsukkomi: "ツッコミ" };
function gapStats(all) {
  const acc = new Map();
  let n = 0, sum = 0, cnt = 0;
  for (const a of all) {
    const ev = a.evaluation, mine = a.selfScores;
    if (!mine || ev.source !== "ai") continue;
    n++;
    for (const ax of RUBRICS[ev.rubric] || []) {
      if (!(ax.key in mine) || !(ax.key in ev.scores)) continue;
      const d = Number(mine[ax.key]) - Number(ev.scores[ax.key]);
      if (!Number.isFinite(d)) continue;
      const k = ev.rubric + ":" + ax.key;
      const e = acc.get(k) || { name: ax.name, rubric: ev.rubric, sum: 0, n: 0 };
      e.sum += d; e.n++; acc.set(k, e); sum += d; cnt++;
    }
  }
  return { n, avg: cnt ? sum / cnt : 0, rows: [...acc.values()].map(e => ({ ...e, avg: e.sum / e.n })) };
}
const signed = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1);
function gapBlock(all) {
  const g = gapStats(all);
  if (!g.n) return '<p class="meta">Claudeの講評のあとで「自分の評価と比べる」を付けると、ここに自分の採点のくせが出ます。</p>';
  const lean = g.avg > 0.15 ? "高め（自分に甘め）" : g.avg < -0.15 ? "低め（自分に辛め）" : "ほぼ同じ";
  const families = new Set(g.rows.map(r => r.rubric));
  let rows = "", lastFam = null;
  for (const r of g.rows) {
    if (families.size > 1 && r.rubric !== lastFam) { rows += '<span class="gap-group">' + h(RUBRIC_FAMILY[r.rubric] || r.rubric) + "</span>"; lastFam = r.rubric; }
    const w = Math.min(1, Math.abs(r.avg) / 2) * 50;
    rows += '<span class="gap-name">' + h(r.name) + '</span><span class="gap-track" title="' + h(r.name + "　自分−Claude " + signed(r.avg) + "点（" + r.n + "回）") + '">'
      + (r.avg ? '<i class="gap-bar ' + (r.avg > 0 ? "pos" : "neg") + '" style="width:' + w.toFixed(1) + "%;" + (r.avg > 0 ? "left" : "right") + ':50%"></i>' : "") + "</span>"
      + '<span class="gap-v">' + signed(r.avg) + "</span>";
  }
  const label = "自分の評価とClaudeの差（自分−Claude、" + g.n + "回分）。" + g.rows.map(r => r.name + " " + signed(r.avg)).join("、");
  return '<p class="gap-sum">自分の評価は、Claudeより平均 <b>' + signed(g.avg) + "点</b>。" + lean + '<span class="meta">（' + g.n + "回分）</span></p>"
    + '<div class="gap" role="img" aria-label="' + h(label) + '">' + rows + "</div>"
    + '<p class="gap-legend meta" aria-hidden="true"><span>← Claudeが高い</span><span>自分が高い →</span></p>';
}
function dashboard(all) {
  const timed = all.filter(a => Number.isFinite(a.elapsedSec)), rated = all.filter(a => Number.isFinite(a.satisfaction));
  const avgSec = timed.length ? timed.reduce((x, a) => x + a.elapsedSec, 0) / timed.length : null;
  const avgSat = rated.length ? rated.reduce((x, a) => x + a.satisfaction, 0) / rated.length : null;
  const kpi = (v, unit, label, sub) => '<div class="kpi"><span class="kpi-l">' + h(label) + "</span><b>" + v + (unit ? "<small>" + h(unit) + "</small>" : "") + "</b>" + (sub ? '<span class="kpi-s">' + h(sub) + "</span>" : "") + "</div>";
  const done = new Set(all.map(a => a.problemId));
  const rings = D.implemented.map(code => {
    const bank = byMode(code), mine = all.filter(a => a.mode === code);
    const avg = mine.length ? Math.round(mine.reduce((x, a) => x + ratio(a.evaluation), 0) / mine.length * 100) : null;
    return Charts.ring({ value: bank.filter(p => done.has(p.id)).length, max: bank.length, label: MODES[code].name, sub: avg === null ? "まだ" : "平均" + avg + "%" });
  }).join("");
  const weak = weaknessCounts(all, all.length).slice(0, 7);
  return '<section class="dash" aria-label="記録">'
    + '<div class="kpis">'
    + kpi(streakDays(all), "日", "連続", "")
    + kpi(all.length, "問", "累計", new Set(all.map(a => dayKey(a.ts))).size + "日練習")
    + kpi(avgSec === null ? "—" : h(fmtSec(avgSec)), "", "平均の制作時間", timed.length ? timed.length + "問で計測" : "まだ記録なし")
    + kpi(avgSat === null ? "—" : avgSat.toFixed(1), avgSat === null ? "" : "/5", "自己満足度", rated.length ? rated.length + "問の平均" : "結果画面で付けられます")
    + "</div>"
    + '<div class="dash-pair"><div class="dash-sec"><h3>練習した日</h3>' + Charts.calendar(all, { weeks: 12 }) + "</div>"
    + '<div class="dash-sec"><h3>得点率の推移</h3>' + Charts.trend(all, { last: 30 }) + "</div></div>"
    + '<div class="dash-sec"><h3>モードごとの進み具合<span class="meta">解いた問題 / 問題数</span></h3><div class="rings">' + rings + "</div></div>"
    + '<div class="dash-sec"><h3>弱点タグ<span class="meta">これまでの合計</span></h3>' + Charts.tagBars(weak) + "</div>"
    + '<div class="dash-sec"><h3>自分の採点とClaudeの差</h3>' + gapBlock(all) + "</div>"
    + "</section>";
}
function noteMeta(a) {
  const bits = [a.evaluation.source === "ai" ? "Claudeの講評" : "自己採点"];
  if (a.retryOf) bits.push("再挑戦");
  if (Number.isFinite(a.elapsedSec)) bits.push("制作時間 " + fmtSec(a.elapsedSec));
  if (Number.isFinite(a.satisfaction)) bits.push("自己満足度 " + a.satisfaction + "/5");
  return '<p class="meta">' + bits.map(h).join("・") + "</p>";
}
function renderNotes() {
  const all = S.attempts;
  if (!all.length) {
    return '<h2>ノート</h2><div class="empty">' + Stage.mic(48) + '<div class="stack" style="gap:8px"><p class="empty-t">まだ記録がありません</p>'
      + "<p>1問解くと、練習した日、得点率の推移、弱点タグ、自分の採点のくせがここに並びます。</p>"
      + '<button type="button" class="btn primary" data-act="today">今日の10分を始める</button></div></div>'
      + '<div class="dash-sec ghost"><h3>練習した日</h3>' + Charts.calendar([], { weeks: 12 }) + "</div>" + statusLine();
  }
  let out = "<h2>ノート</h2>" + dashboard(all) + '<h2 class="list-h">回答の一覧</h2>';
  out += '<div class="filters">' + [["all", "すべて"], ["fav", "お気に入り"], ["memo", "実演メモあり"]].map(([k, v]) =>
    '<button type="button" class="btn small" data-act="filter" data-k="' + k + '" aria-pressed="' + (S.noteFilter === k) + '">' + v + "</button>").join("") + "</div>";
  const list = all.filter(a => S.noteFilter === "fav" ? a.favorite : S.noteFilter === "memo" ? a.memo : true).slice().reverse();
  if (!list.length) out += '<p class="meta">該当する回答はありません。</p>';
  out += list.map(a => {
    const p = resolveProblem(a), ev = a.evaluation, d = new Date(a.ts);
    return '<details data-key="note-' + h(a.id) + '"><summary><span class="note-sum"><span class="prompt">' + (a.favorite ? "★ " : "") + (d.getMonth() + 1) + "/" + d.getDate() + "　" + h(MODES[a.mode].name) + "　" + h(p ? p.prompt : a.problemId)
      + "</span><span>" + total(ev) + "/" + maxTotal(ev) + '</span></span></summary><div class="body">'
      + (a.diagnosis ? '<p><span class="meta">弱い理由</span>　' + h(a.diagnosis) + "</p>" : "") + answerBody(p, a.answer)
      + (a.intent ? '<p class="meta">狙い：' + h(a.intent) + "</p>" : "")
      + "<p><span class=\"meta\">期待</span>　" + h(ev.expectation) + "</p>"
      + (ev.revision ? '<p class="meta">修正案</p><p class="revision">' + h(dialogue(ev.revision)) + "</p>" : "")
      + (ev.tags.length ? "<p>" + ev.tags.map(t => '<span class="chip tag">' + h(t) + "</span>").join(" ") + "</p>" : "")
      + noteMeta(a)
      + '<label class="check"><input type="checkbox" id="nfav-' + a.id + '" data-act-change="fav" data-id="' + a.id + '"' + (a.favorite ? " checked" : "") + ">お気に入り</label>"
      + '<label class="field">実演メモ<textarea id="nmemo-' + a.id + '" rows="2">' + h(a.memo) + "</textarea></label>"
      + '<div class="row"><button type="button" class="btn small" data-act="memo" data-id="' + a.id + '" data-src="nmemo-' + a.id + '">メモを保存</button>'
      + (p ? '<button type="button" class="btn small" data-act="retryFrom" data-id="' + a.id + '">このお題で再挑戦</button>' : "")
      + (S.confirmDelete === a.id ? '<button type="button" class="btn small danger" data-act="delete" data-id="' + a.id + '">本当に削除する</button><button type="button" class="link" data-act="cancelDelete">やめる</button>'
        : '<button type="button" class="btn small danger" data-act="askDelete" data-id="' + a.id + '">削除</button>')
      + "</div></div></details>";
  }).join("");
  return out + statusLine();
}

// ━━━ 辞典 ━━━
function table(head, rows) {
  return '<div class="tablewrap"><table><thead><tr>' + head.map(x => "<th>" + h(x) + "</th>").join("") + "</tr></thead><tbody>"
    + rows.map(r => "<tr>" + r.map((c, i) => "<td" + (i === 0 ? ' class="k"' : "") + ">" + h(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
}
function srcLink(n) {
  const s = n != null && D.tax.sources[String(n)];
  return s ? '<a href="' + h(s.url) + '" target="_blank" rel="noopener">' + h(s.title) + "</a>" : "概要レベルで紹介";
}
function typeButton(name) {
  const n = typeProblems(name).length;
  return n ? '<button type="button" class="btn small" data-act="typeQueue" data-type="' + h(name) + '">この型で練習（' + n + "問）</button>" : "";
}
function typeCard(t) {
  const [from, to] = String(t.flip).split("→").map(s => s.trim());
  return '<article class="tcard"><header><span class="tno">' + String(t.no).padStart(2, "0") + "</span><h3>" + h(t.name) + "</h3></header>"
    + '<div class="tflip"><div><small>期待</small><span>' + h(from) + '</span></div><span class="tarr" aria-hidden="true">→</span><div class="to"><small>実際</small><span>' + h(to || "") + "</span></div></div>"
    + '<p class="tex">' + h(String(t.example).replace(/\s*→\s*/g, " → ")) + "</p>" + typeButton(t.name) + "</article>";
}
function renderDict() {
  const T = D.tax, tabs = [["basic", "基本構造"], ["types", "12の基本型"], ["tech", "20の技法"], ["works", "作品分析"], ["make", "作り方"]];
  let out = '<h2>型の辞典</h2><p class="defn">' + h(T.definition) + '</p><div class="tabs" role="tablist">' + tabs.map(([k, v]) =>
    '<button type="button" role="tab" class="btn small" data-act="dtab" data-k="' + k + '" aria-selected="' + (S.dictTab === k) + '">' + v + "</button>").join("") + '</div><div class="stack">';
  if (S.dictTab === "basic") {
    out += "<h3>フリから反応まで</h3>" + table(["段階", "聞き手の認知", "例：AI研修"], T.flow.map(r => [r.stage, r.cognition, r.example]))
      + "<h3>フリの3つの機能</h3>" + T.furiFunctions.map(f => "<p>" + h(f) + "</p>").join("")
      + "<h3>理論的な背景</h3>" + table(["視点", "要点", "作問への示唆"], T.theories.map(r => [r.name, r.point, r.for_writing]))
      + '<p class="meta">これらは笑いを説明する有力な理論・分類であり、一定の構造なら必ず笑うことを保証するものではありません。</p>'
      + "<h3>分類の3階層</h3>" + table(["階層", "分類軸", "主な選択肢"], T.layers.map(r => [r.layer, r.axis, r.options]));
  } else if (S.dictTab === "types") {
    out += '<p class="meta">どの型も、フリが作る期待（点線）を、同じ尺度の上で実際（実線）に反転させます。</p>'
      + '<div class="tcards">' + T.types.map(typeCard).join("") + "</div>"
      + "<h3>オリジナル応用例</h3>" + T.originals.map(o => '<div class="work"><p><b>' + h(o.title) + '</b> <span class="chip">' + h(o.pattern) + "</span></p><p>" + h(o.dialogue) + '</p><p class="meta">' + h(o.breakdown) + "</p></div>").join("")
      + '<p class="meta">練習用の創作で、元ネタの引用ではありません。実際に起きていない出来事を事実として話すことは勧めません。</p>';
  } else if (S.dictTab === "tech") {
    out += '<ol class="techs">' + T.techniques.map(t => '<li><span class="tno">' + String(t.no).padStart(2, "0") + '</span><div class="tech-b"><b>' + h(t.name) + "</b><p>" + h(t.operation) + '</p><p class="meta">観察例：' + h(t.seen_in) + "</p>" + typeButton(t.name) + "</div></li>").join("") + "</ol>";
  } else if (S.dictTab === "works") {
    out += '<p class="meta">台詞は転載せず、筋立てを要約しています。技法名は分析用の整理で、制作者本人の用語ではありません。</p>'
      + [["国内", T.domestic], ["海外", T.overseas]].map(([label, works]) => "<h3>" + label + "</h3>" + works.map(w =>
        "<details><summary>" + h(w.id + " " + w.title) + '　<span class="chip">' + h(w.core) + '</span></summary><div class="body"><p><span class="meta">構造</span>　' + h(w.structure)
        + '</p><p><span class="meta">転用技術</span>　' + h(w.transfer) + '</p><p class="meta">確認区分：' + srcLink(w.source) + "</p></div></details>").join("")).join("");
  } else {
    out += "<h3>ネタ制作の6ステップ</h3>" + table(["順", "やること"], T.steps.map((s, i) => [String(i + 1), s]))
      + "<h3>よくある失敗</h3>" + table(["失敗", "直し方"], T.failures.map(f => [f.failure, f.fix]))
      + "<h3>実践の進め方</h3>" + table(["期間", "主な課題", "確認ポイント"], T.plan.map(p => [p.period, p.task, p.check]));
  }
  return out + "</div>";
}

// ━━━ 描画 ━━━
const app = document.getElementById("app");
// 入力途中の文字は、描き直しや画面の行き来があっても同じラウンドの間は残す（id にラウンド番号が入っている）
const fieldMemo = new Map();
const keepable = el => el.id && !el.readOnly && el.id !== "ch30" && el.tagName !== "SELECT" && el.type !== "hidden";
function rememberFields() {
  app.querySelectorAll("input[id], textarea[id]").forEach(el => {
    if (!keepable(el)) return;
    fieldMemo.set(el.id, el.type === "checkbox" || el.type === "radio" ? { checked: el.checked } : { value: el.value });
  });
}
function restoreFields() {
  app.querySelectorAll("input[id], textarea[id]").forEach(el => {
    if (!keepable(el) || !fieldMemo.has(el.id)) return;
    const v = fieldMemo.get(el.id);
    if ("checked" in v) el.checked = v.checked; else el.value = v.value;
    if (el.id.startsWith("ans-")) updateCounter(el);
  });
}
let flippedRound = -1, countedKey = "";
function render() {
  document.querySelectorAll("nav button").forEach(b => b.setAttribute("aria-current", b.dataset.view === S.view ? "page" : "false"));
  // 開いていた折りたたみは、描き直しても開いたままにする
  const keyOf = d => d.dataset.key || (d.querySelector(":scope > summary") || {}).textContent || "";
  const open = new Set([...app.querySelectorAll("details[open]")].map(keyOf));
  rememberFields();
  app.innerHTML = S.view === "home" ? renderHome() : S.view === "practice" ? renderPractice() : S.view === "notes" ? renderNotes() : renderDict();
  app.querySelectorAll("details").forEach(d => { if (open.has(keyOf(d))) d.open = true; });
  restoreFields();
  afterRender();
}
function afterRender() {
  if (S.view === "practice") {
    // 新しい問題（ラウンド）が出たときだけ、めくりをめくる
    const mk = app.querySelector(".mekuri");
    if (mk && flippedRound !== S.round) { flippedRound = S.round; Stage.flip(mk); Sound.play("mekuri"); }
    const num = app.querySelector(".scorecard [data-count]");
    if (num && S.attempt) {
      const key = S.round + "|" + S.attempt.id + "|" + S.attempt.evaluation.source + "|" + num.dataset.count;
      // 締めの音は数え上げ（0.6秒）が終わるころに鳴らす
      if (key !== countedKey) { countedKey = key; Stage.countUp(num, Number(num.dataset.count)); Sound.score(ratio(S.attempt.evaluation), 0.45); }
    }
  }
  syncCountdown();
}
function renderIfSafe() {
  // 入力途中のフォームを消さない
  if (S.view === "practice" && (S.phase === "answer" || S.phase === "self")) return;
  if (document.activeElement && app.contains(document.activeElement) && document.activeElement.matches("textarea, input[type=text]")) return;
  render();
}
const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
function updateCounter(el) {
  const c = document.getElementById("cnt-" + el.id), p = getProblem(S.problemId);
  if (!c || !p) return;
  const lim = MODES[p.mode].char_limit, n = charCount(el.value);
  c.textContent = n + (lim ? " / " + lim : "") + "字";
  c.classList.toggle("over", !!lim && n > lim);
}

// ━━━ 30秒チャレンジ（自分の表示だけを書き換える。送信は自動ではしない） ━━━
let cdTimer = 0;
function stopCountdown() { if (cdTimer) clearInterval(cdTimer); cdTimer = 0; }
const countdownLive = () => S.challenge && S.view === "practice" && S.phase === "answer" && document.getElementById("cd");
// 残り5秒から1秒ごとに木の音、時間切れで鉦。よそへ行っていて時間切れを過ぎていたら、戻ってから鉦は鳴らさない
let cdCue = { start: 0, sec: 0, over: false };
function cueCountdown(left) {
  const sec = Math.ceil(left), over = left < 0;
  if (cdCue.start !== S.challengeStart) { cdCue = { start: S.challengeStart, sec, over }; return; }
  if (over) { if (!cdCue.over && left > -1) Sound.play("kane"); cdCue.over = true; return; }
  if (sec !== cdCue.sec) { cdCue.sec = sec; if (sec <= 5) Sound.play("tick"); }
}
function tickCountdown() {
  const el = countdownLive();
  if (!el) { stopCountdown(); return; }
  const left = CH_SEC - (Date.now() - S.challengeStart) / 1000;
  cueCountdown(left);
  const t = document.getElementById("cdText"), arc = document.getElementById("cdArc");
  const over = left < 0;
  el.classList.toggle("over", over);
  const text = over ? "+" + Math.floor(-left) + "秒" : "残り" + Math.ceil(left) + "秒";
  if (t && t.textContent !== text) t.textContent = text;
  if (arc) arc.setAttribute("stroke-dashoffset", over ? "0" : (100 * (1 - left / CH_SEC)).toFixed(1));
}
function syncCountdown() {
  if (!countdownLive()) { stopCountdown(); return; }
  tickCountdown();
  if (!cdTimer) cdTimer = setInterval(tickCountdown, 250);
}

// ━━━ 操作 ━━━
function copyNeta(btn) {
  const box = document.getElementById("copyBox"), msg = document.getElementById("copyMsg");
  if (!box) return;
  const text = box.value;
  const ok = () => { if (msg) msg.textContent = "コピーしました。"; btn.textContent = "コピーしました"; };
  const fallback = () => {
    box.hidden = false; box.focus(); box.select();
    if (msg) msg.textContent = "コピーできなかったので、下の文字を選択しました。Ctrl＋C（スマホは長押し）でコピーしてください。";
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  } catch { fallback(); }
}
function setSatisfaction(v) {
  const a = S.attempt; if (!a) return;
  const next = a.satisfaction === v ? null : v;
  if (S.saved) Store.update(a.id, { satisfaction: next }); else S.attempt = { ...a, satisfaction: next };
  app.querySelectorAll('[data-act="sat"]').forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === next)));
  const cap = document.getElementById("satCap");
  if (cap) cap.textContent = next ? next + "　" + SATISFACTION[next] : "任意。あとで見返すときの目安に";
}
// 見出しの効果音ボタン。スピーカーに音の波（鳴らす）か×（消す）を添える
function syncSoundButton() {
  const b = document.querySelector('[data-act="sound"]');
  if (!b) return;
  const on = Sound.enabled();
  b.setAttribute("aria-pressed", String(on));
  b.title = on ? "効果音を消す" : "効果音を鳴らす";
  b.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path class="snd-body" d="M3 7.6h2.8L10 4.2v11.6l-4.2-3.4H3z"/>'
    + '<path class="snd-mark" d="' + (on ? "M13.2 7.4a3.6 3.6 0 0 1 0 5.2M15.4 5.2a6.8 6.8 0 0 1 0 9.6" : "M13 7.8l4.4 4.4M17.4 7.8L13 12.2") + '"/></svg>';
}
function filterPicker(k) {
  S.pickPattern = k;
  app.querySelectorAll('[data-act="pfilter"]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
  app.querySelectorAll('.plist [data-act="pick"]').forEach(b => { b.hidden = !(k === "all" || (b.dataset.pats || "").split("|").includes(k)); });
}

document.addEventListener("click", e => {
  const t = e.target.closest("[data-act]");
  if (!t || t.dataset.actChange) return;
  const act = t.dataset.act;
  if (act === "nav") { S.view = t.dataset.view; S.confirmDelete = null; render(); window.scrollTo({ top: 0 }); }
  else if (act === "today") { const { ids } = todaysSet(S.attempts); startQueue(ids, "今日の10分"); }
  else if (act === "mode") startMode(t.dataset.mode);
  else if (act === "pilot") startQueue(pilotSet(Number(t.dataset.day), S.attempts), "Day " + t.dataset.day);
  else if (act === "typeQueue") { const name = t.dataset.type; startQueue(freshFirst(typeProblems(name).map(p => p.id), S.attempts), name + "の練習"); }
  else if (act === "stopQueue") { stopQueue(); render(); }
  else if (act === "nextInMode") startMode(S.mode);
  else if (act === "pick") { stopQueue(); startProblem(t.dataset.id); }
  else if (act === "pfilter") filterPicker(t.dataset.k);
  else if (act === "next") goNext();
  else if (act === "retry") startProblem(S.problemId, S.saved && S.attempt ? S.attempt.id : null, S.attempt ? S.attempt.answer : "");
  else if (act === "retryFrom") { const a = S.attempts.find(x => x.id === t.dataset.id); if (a) { if (a.problemSnapshot) S.generated[a.problemId] = a.problemSnapshot; stopQueue(); startProblem(a.problemId, a.id, a.answer); } }
  else if (act === "stopAI") { if (S.ctl) S.ctl.abort(); }
  else if (act === "retryAI") askAI(getProblem(S.problemId));
  else if (act === "memo") { Store.update(t.dataset.id, { memo: val(t.dataset.src) }); t.textContent = "保存しました"; }
  else if (act === "sat") setSatisfaction(Number(t.dataset.v));
  else if (act === "copy") copyNeta(t);
  else if (act === "filter") { S.noteFilter = t.dataset.k; render(); }
  else if (act === "askDelete") { S.confirmDelete = t.dataset.id; render(); }
  else if (act === "cancelDelete") { S.confirmDelete = null; render(); }
  else if (act === "delete") { Store.remove(t.dataset.id); S.confirmDelete = null; render(); }
  else if (act === "dtab") { S.dictTab = t.dataset.k; render(); }
  else if (act === "sound") { Sound.set(!Sound.enabled()); syncSoundButton(); Sound.play("hyoshigi"); }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "modeSelect") { S.mode = t.value; S.pickPattern = "all"; render(); }
  else if (t.id === "useAi") S.useAi = t.checked;
  else if (t.id === "ch30") {
    S.challenge = t.checked; savePref(t.checked);
    if (t.checked) S.challengeStart = Date.now();
    const cd = document.getElementById("cd"); if (cd) cd.hidden = !t.checked;
    syncCountdown();
  }
  else if (t.dataset.actChange === "fav") Store.update(t.dataset.id, { favorite: t.checked });
});
document.addEventListener("input", e => {
  if (e.target.id && e.target.id.startsWith("ans-")) updateCounter(e.target);
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
  const f = e.target.closest && e.target.closest("form");
  if (!f) return;
  if (e.ctrlKey || e.metaKey) {
    if (f.id === "answerForm" || f.id === "clarifyForm") {
      e.preventDefault();
      if (typeof f.requestSubmit === "function") f.requestSubmit(); else f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
    return;
  }
  // M04 の欄では Enter で次の案へ進む（最後の欄だけは送信）
  const m = /^ans-(\d+)-(\d+)$/.exec(e.target.id || "");
  if (m) { const next = document.getElementById("ans-" + m[1] + "-" + (Number(m[2]) + 1)); if (next) { e.preventDefault(); next.focus(); } }
});
document.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, p = getProblem(S.problemId), r = S.round;
  if (f.id === "answerForm") {
    if (S.phase !== "answer" || !p) return;
    const mode = MODES[p.mode], err = document.getElementById("formError");
    const answer = multi(p) ? answerSlots(p).map((_, i) => val("ans-" + r + "-" + (i + 1)).replace(/\s*\n\s*/g, " ")).join("\n") : val("ans-" + r);
    const diagnosis = val("diag-" + r);
    const miss = !answer.trim() ? mode.answer_label + (multi(p) ? "を1つ以上" : "を") + "入力してください。" : p.mode === "M06" && !diagnosis ? "弱い理由を一言で入力してください。" : "";
    if (miss) { err.textContent = miss; err.hidden = false; return; }
    // 送った合図。ツッコミ設計では、返した一言にハリセンを鳴らす
    Sound.play(p.mode === "M07" ? "harisen" : "hyoshigi");
    const now = Date.now();
    S.draft = {
      answer, diagnosis, intent: val("intent-" + r), save: document.getElementById("save-" + r).checked, checks: autoChecks(p, answer),
      elapsedSec: Math.max(0, Math.floor((now - S.answerStart) / 1000)),
      challenge: S.challenge ? { sec: (now - S.challengeStart) / 1000 } : null,
    };
    stopCountdown();
    if (S.ai === "ready" && S.useAi) askAI(p); else { S.phase = "self"; render(); }
  } else if (f.id === "selfForm") {
    if (S.phase !== "self") return;
    const fd = new FormData(f), sc = {};
    for (const a of RUBRICS[MODES[p.mode].rubric]) sc[a.key] = Number(fd.get(a.key));
    finishAttempt(p, selfEvaluation(p, sc, fd.get("safety") || "ok", S.draft.checks)).then(render);
  } else if (f.id === "clarifyForm") {
    const reply = val("clarify-" + r); if (reply && S.phase === "result") { fieldMemo.delete("clarify-" + r); reAsk(p, reply); }
  } else if (f.id === "compareForm") {
    const fd = new FormData(f), mine = {};
    for (const a of RUBRICS[S.attempt.evaluation.rubric]) mine[a.key] = Number(fd.get(a.key));
    if (S.saved) Store.update(S.attempt.id, { selfScores: mine }); else S.attempt = { ...S.attempt, selfScores: mine };
    render();
  } else if (f.id === "genForm") generate(S.mode, val("genTheme"));
});

// ━━━ 起動 ━━━
Store.loadLocal();
Sound.load(D.sounds);
syncSoundButton();
render();
use("sample").then(s => { sample = s; S.ai = s ? "ready" : "off"; renderIfSafe(); });
Store.init();
