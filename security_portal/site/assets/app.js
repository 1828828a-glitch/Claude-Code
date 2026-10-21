/* ブランドを守るセキュリティ相談室：画面の組み立てと操作 */
(() => {
  "use strict";

  const S = window.PortalScoring;
  const T = window.PortalStory;
  const STATE_KEY = "pac-portal:diag:v1";
  const TODO_KEY = "pac-portal:todo:v1";
  const VIEWS = ["home", "check", "cases", "risks", "now", "ask", "game", "about"];

  let D = null; // questions, scenes, cases, risks, actions, news, config
  let advanceTimer = 0;
  let qById = {};
  let current = "home";

  const state = { step: "intro", p: 0, q: 0, profile: {}, answers: {}, utm: {}, route: "neglect" };
  const game = { phase: "title", deck: [], i: 0, plays: [], meters: { crisis: 0, use: 40 }, last: null };
  const caseFilter = { cat: "all" };

  // ---------- 小物 ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ext = (url, label, cls = "") => (url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : "");
  const today = () => new Date().toISOString().slice(0, 10);
  const jpDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${y}年${m}月${d}日`;
  };
  const dotDate = (iso) => iso.replace(/-/g, ".");

  function save() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できなくても動かす */ }
  }
  function restore() {
    try {
      const s = JSON.parse(sessionStorage.getItem(STATE_KEY));
      if (s && typeof s === "object") Object.assign(state, s);
    } catch (e) { /* 何もしない */ }
  }
  function loadTodos() {
    try { return JSON.parse(localStorage.getItem(TODO_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveTodos(v) {
    try { localStorage.setItem(TODO_KEY, JSON.stringify(v)); } catch (e) { /* 何もしない */ }
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  async function copyText(text, area) {
    try {
      await navigator.clipboard.writeText(text);
      toast("コピーしました");
    } catch (e) {
      if (area) { area.hidden = false; area.focus(); area.select(); }
      toast("自動でコピーできませんでした。選択した文字をコピーしてください");
    }
  }

  // ---------- 計測：結果を表示するまでは送らずにためておく ----------
  const queue = [];
  let analyticsOn = false;
  function track(name, params = {}) {
    queue.push([name, params]);
    if (analyticsOn) flush();
  }
  function flush() {
    if (typeof window.gtag !== "function") return;
    while (queue.length) {
      const [n, p] = queue.shift();
      window.gtag("event", n, p);
    }
  }
  function enableAnalytics() {
    if (analyticsOn) return;
    analyticsOn = true;
    const id = D.config.ga4_id;
    if (!id) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id);
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(s);
    flush();
  }

  // ---------- データ ----------
  async function loadData() {
    const embedded = document.getElementById("portal-data");
    if (embedded) return JSON.parse(embedded.textContent);
    const names = ["questions", "scenes", "cases", "risks", "actions", "news", "config"];
    const out = {};
    await Promise.all(names.map(async (n) => {
      const r = await fetch(`data/${n}.json`, { cache: "no-cache" });
      if (!r.ok) throw new Error(`${n}.json: ${r.status}`);
      out[n] = await r.json();
    }));
    return out;
  }

  // ---------- 画面の切り替え ----------
  function route() {
    const raw = decodeURIComponent((location.hash || "#home").slice(1));
    let view = raw;
    let anchor = null;
    if (raw.startsWith("risk-")) { view = "risks"; anchor = raw; }
    if (raw.startsWith("case-")) { view = "cases"; anchor = raw; caseFilter.cat = "all"; }
    if (!VIEWS.includes(view)) view = "home";
    show(view, anchor);
  }

  function show(view, anchor) {
    current = view;
    document.querySelectorAll("[data-view]").forEach((s) => { s.hidden = s.dataset.view !== view; });
    document.querySelectorAll("[data-nav]").forEach((a) => {
      if (a.dataset.nav === view) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    ({ home: renderHome, check: renderCheck, cases: renderCases, risks: renderRisks, now: renderNow, ask: renderAsk, game: renderGame, about: renderAbout })[view]();
    const target = anchor && document.getElementById(anchor);
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }

  // ---------- 共通の部品 ----------
  function sceneHtml(sc) {
    if (!sc) return "";
    return `<figure class="scene"><figcaption><b>${esc(sc.who)}</b><span>${esc(sc.where)}</span></figcaption><p class="bubble">${esc(sc.text)}</p></figure>`;
  }

  function catChip(cat) {
    return `<span class="chip chip-cat"><b>${esc(cat)}</b>${esc(D.questions.categories[cat])}</span>`;
  }

  function bar(label, value, cls, suffix = "") {
    const v = Math.max(0, Math.min(100, value));
    return `<div class="bar ${cls}"><span>${esc(label)}</span><span class="bar-track"><i style="width:${v}%"></i></span><span class="bar-val">${esc(value)}${esc(suffix)}</span></div>`;
  }

  function askBox(prompt, links, lead) {
    const cfg = D.config;
    const tooLong = !T.fits(cfg, links);
    return `<div class="ask-box">
      ${lead ? `<p>${esc(lead)}</p>` : ""}
      <div class="ai-buttons">${links.map((l) => `<a class="ai-btn" href="${esc(l.url)}" target="_blank" rel="noopener" data-act="ai" data-ai="${esc(l.id)}"${tooLong ? ' aria-disabled="true"' : ""}>${esc(l.name)}に聞く</a>`).join("")}</div>
      <details><summary>AIに渡す質問文を見る</summary><pre>${esc(prompt)}</pre></details>
      <p class="fine">普段お使いのAIサービスが新しいタブで開きます（各サービスへのログインが必要です）。このサイトにAIは入っていません。回答の正しさを組合が保証するものではありません。社名や個人情報は入れないでください。</p>
      ${cfg.site_url ? "" : '<p class="draft">公開URLが未設定のため、質問文にこのサイトの資料のURLが入っていません。config.json の site_url を設定してください。</p>'}
    </div>`;
  }

  // ---------- 注意喚起 ----------
  function renderNews() {
    const slot = $("#news-slot");
    const items = D.news.items.filter((n) => !n.show_until || today() <= n.show_until);
    slot.innerHTML = items.map((n) => `<aside class="news" aria-label="注意喚起">
      <div class="news-inner"><details>
        <summary><span class="news-label">${esc(n.label)}</span><span class="news-date">${esc(dotDate(n.date))}</span><span>${esc(n.title)}</span><span class="news-open">くわしく</span></summary>
        <div class="news-body">
          <p>${esc(n.body)}</p>
          <ol>${n.todo.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
          <div class="row">${n.links.map((l) => ext(l.url, l.label + " ↗")).join("")}</div>
        </div>
      </details></div>
    </aside>`).join("");
  }

  // ---------- ホーム ----------
  function caseHtml(c, compact) {
    return `<article class="case${compact ? " compact" : ""}" id="case-${esc(c.id)}">
      <time class="case-date" datetime="${esc(c.date)}">${esc(dotDate(c.date))}</time>
      <div class="case-body">
        <h3>${compact ? `<a href="#case-${esc(c.id)}">${esc(c.title)}</a>` : esc(c.title)}</h3>
        <p class="case-org">${esc(c.org)}　${c.cats.map(catChip).join(" ")}</p>
        <p class="case-summary">${esc(c.summary)}</p>
        <p class="case-lesson"><b>ブランド・マーケ担当が学べること</b>${esc(c.lesson)}</p>
        <p class="case-links">出典：${c.sources.map((s) => ext(s.url, s.label, "src")).join("")}　<a href="#risk-${esc(c.cats[0])}">関連するリスクと対策</a></p>
      </div>
    </article>`;
  }

  function activeTodos(group) {
    return group.items.filter((a) => !a.until || today() <= a.until);
  }

  function renderHome() {
    $("#home-cases").innerHTML = D.cases.items.slice(0, 4).map((c) => caseHtml(c, true)).join("");
    const first = D.actions.groups[0];
    $("#home-today").innerHTML = activeTodos(first).map((a) => `<li><span>${esc(a.text)}</span></li>`).join("");
  }

  // ---------- 診断 ----------
  function renderCheck() {
    const root = $("#check-root");
    if (state.step === "result" && S.isComplete(D.questions, state.profile, state.answers)) return renderResult(root);
    if (state.step === "profile") return renderProfile(root);
    if (state.step === "quiz") return renderQuiz(root);
    return renderIntro(root);
  }

  function renderIntro(root) {
    const answered = Object.keys(state.answers).length;
    const q = D.questions;
    root.innerHTML = `<div class="flow">
      <p class="eyebrow">セキュリティ・リスク診断</p>
      <h1 class="flow-q" tabindex="-1">3分で、ブランドを守る7つの領域を点検します</h1>
      <p>はじめに立場などを${q.profile.length}問、続いて${q.questions.length}問に「はい・一部・いいえ」で答えてください。</p>
      <ul class="intro-list">
        ${Object.keys(q.categories).map((k) => `<li>${esc(k)}. ${esc(q.categories[k])}</li>`).join("")}
      </ul>
      <p class="fine">回答はこのブラウザの中だけで採点し、外部へは送りません。「分からない」も、把握できていない弱点として数えます。</p>
      <div class="row" style="margin-top:18px">
        ${answered ? `<button class="btn btn-primary" data-act="resume">続きから再開する（${answered}/${q.questions.length}問回答済み）</button><button class="btn btn-quiet" data-act="restart">最初からやり直す</button>`
          : `<button class="btn btn-primary" data-act="start">診断をはじめる</button>`}
      </div>
    </div>`;
  }

  function stepHead(label, n, total, extra = "") {
    return `<div class="flow-head">
      <div class="flow-step"><span>${esc(label)} <b>${n}</b> / ${total}</span>${extra}</div>
      <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}" aria-label="${esc(label)}の進み具合"><i style="width:${(n / total) * 100}%"></i></div>
    </div>`;
  }

  function renderProfile(root) {
    const p = D.questions.profile[state.p];
    const val = state.profile[p.id];
    const multi = p.type === "multi";
    const picked = (o) => (multi ? (val || []).includes(o) : val === o);
    const canNext = multi ? (val || []).length > 0 : !!val;
    root.innerHTML = `<div class="flow">
      ${stepHead("はじめに", state.p + 1, D.questions.profile.length)}
      <h2 class="flow-q" tabindex="-1">${esc(p.q)}</h2>
      <div class="choices" role="group" aria-label="${esc(p.q)}">
        ${p.options.map((o) => `<button type="button" class="choice${multi ? " multi" : ""}" aria-pressed="${picked(o)}" data-act="${multi ? "toggle" : "pick"}" data-value="${esc(o)}"><span class="mark" aria-hidden="true"></span>${esc(o)}</button>`).join("")}
      </div>
      <div class="flow-nav">
        <button type="button" class="btn btn-quiet btn-small" data-act="back">← 戻る</button>
        ${canNext ? `<button type="button" class="btn btn-primary btn-small" data-act="next">次へ →</button>` : ""}
      </div>
    </div>`;
    focusQ(root);
  }

  function renderQuiz(root) {
    const q = D.questions.questions[state.q];
    const sc = (D.scenes.questions[q.id] || {}).scene;
    const val = state.answers[q.id];
    root.innerHTML = `<div class="flow">
      ${stepHead("設問", state.q + 1, D.questions.questions.length, catChip(q.cat))}
      ${sceneHtml(sc)}
      <h2 class="flow-q" tabindex="-1">${esc(q.q)}</h2>
      <div class="choices" role="group" aria-label="回答">
        ${D.questions.answers.map((a) => `<button type="button" class="choice" aria-pressed="${val === a.point}" data-act="answer" data-point="${a.point}"><span class="mark" aria-hidden="true"></span>${esc(a.label)}</button>`).join("")}
      </div>
      <div class="flow-nav">
        <button type="button" class="btn btn-quiet btn-small" data-act="back">← 戻る</button>
        ${typeof val === "number" ? `<button type="button" class="btn btn-primary btn-small" data-act="next">${state.q === D.questions.questions.length - 1 ? "結果を見る" : "次へ →"}</button>` : ""}
      </div>
    </div>`;
    focusQ(root);
  }

  function focusQ(root) {
    const h = $(".flow-q", root);
    if (h) h.focus({ preventScroll: true });
  }

  function nextStep() {
    const P = D.questions.profile.length;
    const Q = D.questions.questions.length;
    if (state.step === "profile") {
      if (state.p < P - 1) state.p++;
      else { state.step = "quiz"; }
    } else if (state.step === "quiz") {
      if (state.q < Q - 1) state.q++;
      else finish();
    }
    save();
    renderCheck();
    window.scrollTo(0, 0);
  }

  function prevStep() {
    if (state.step === "quiz") {
      if (state.q > 0) state.q--;
      else { state.step = "profile"; state.p = D.questions.profile.length - 1; }
    } else if (state.step === "profile") {
      if (state.p > 0) state.p--;
      else state.step = "intro";
    }
    save();
    renderCheck();
  }

  function finish() {
    if (!S.isComplete(D.questions, state.profile, state.answers)) {
      // 抜けている設問に戻る
      const missing = D.questions.questions.findIndex((q) => typeof state.answers[q.id] !== "number");
      if (missing >= 0) { state.q = missing; return; }
      state.step = "profile"; state.p = 0; return;
    }
    state.step = "result";
    const r = S.compute(D.questions, state.profile, state.answers);
    track("diag_complete", { level: r.level.level, score: r.score });
  }

  // ---------- 結果 ----------
  function renderResult(root) {
    const data = D.questions;
    const r = S.compute(data, state.profile, state.answers);
    const lv = r.level;
    const notes = [];
    const pn = data.profile_notes;
    const addNote = (group, key) => {
      const n = pn[group] && pn[group][key];
      if (n) notes.push(`${esc(n.text)}${n.source ? " " + ext(n.source, "出典", "src") : ""}`);
    };
    addNote("P1", state.profile.P1);
    (state.profile.P4 || []).forEach((v) => addNote("P4", v));
    addNote("P2", state.profile.P2);
    r.multipliers.forEach((m) => notes.push(`係数 ×${m.x}：${esc(m.label)}`));
    if (r.overridden) notes.push(esc(data.scoring.override.note));

    const plan = T.neglectPlan(data, D.scenes, state.profile, state.answers);
    const ask = T.resultPrompt(D.config, r);
    const support = data.support[r.focus];

    root.innerHTML = `<div class="result">
      <section class="status" aria-labelledby="status-title">
        <div class="status-top">
          <span class="status-kicker">診断結果　${esc(jpDate(today()))}</span>
          <span class="level-chip lv-${lv.level}">レベル${lv.level}（${esc(lv.name)}）</span>
        </div>
        <h1 id="status-title" class="flow-q" tabindex="-1" style="margin:0">${esc(lv.title)}</h1>
        <div class="status-score"><b>${r.score}</b><span>リスク指数 / 100</span></div>
        <div class="bars">
          ${bar("リスク指数", r.score, "bar-crisis")}
          ${bar(`対策できている項目`, Math.round((r.done / r.total) * 100), "bar-safe", "%")}
          ${bar(`重要${r.keyTotal}項目の対策`, Math.round((r.keyDone / r.keyTotal) * 100), "bar-use", "%")}
        </div>
        <p class="fine" style="color:var(--panel-muted)">対策できている項目 ${r.done}/${r.total}、重要項目 ${r.keyDone}/${r.keyTotal}</p>
        ${notes.length ? `<div class="status-notes">${notes.map((n) => `<p>${n}</p>`).join("")}</div>` : ""}
      </section>

      <section aria-labelledby="guard-title">
        <h2 id="guard-title" class="block-title">7つの守り　総括</h2>
        <p class="block-lead">グラフは安全度（100−そのカテゴリのリスク）。外側ほど守れています。</p>
        <div class="guard">
          ${radarSvg(r.categories)}
          <div class="guard-grid">${r.categories.map((c) => guardCard(c)).join("")}</div>
        </div>
      </section>

      <section aria-labelledby="weak-title">
        <h2 id="weak-title" class="block-title">あなたの会社の弱点トップ3</h2>
        ${r.top3.length ? `<div class="weak-list">${r.top3.map((w) => weakCard(w)).join("")}</div>` : '<p class="block-lead">弱点として挙がる項目はありませんでした。半年に一度、この診断で確かめてください。</p>'}
      </section>

      ${plan.chapters.length ? simSection(plan) : ""}

      ${r.weak.length ? goalsSection(r) : ""}

      <section aria-labelledby="ask-result-title">
        <h2 id="ask-result-title" class="block-title">この結果をAIに相談する</h2>
        <p class="block-lead">結果の要約（レベル・指数・弱い項目）だけを質問文に入れます。回答の内容や会社名は入りません。</p>
        ${askBox(ask.prompt, ask.links)}
      </section>

      ${supportSection(r, support)}

      <section aria-labelledby="tools-title">
        <h2 id="tools-title" class="block-title">無料で使える公的なツール</h2>
        <div class="tools">${data.tools.map((t) => `<a class="tool" href="${esc(t.url)}" target="_blank" rel="noopener"><b>${esc(t.name)}</b><small>${esc(t.by)}　${esc(t.text)}</small></a>`).join("")}</div>
      </section>

      <div class="row">
        <a class="btn btn-ghost btn-small" href="#game">止める？通す？で体験する</a>
        <button type="button" class="btn btn-quiet btn-small" data-act="review">回答を見直す</button>
        <button type="button" class="btn btn-quiet btn-small" data-act="clear">回答を消去する</button>
      </div>

      <p class="disclaimer">本診断は簡易的な自己評価であり、安全を保証するものではありません。シナリオに登場する人物や出来事は架空です。数字は各出典の公表時点のものです。</p>
    </div>`;
    focusQ(root);
    enableAnalytics();
  }

  function radarSvg(cats) {
    const n = cats.length;
    const R = 78;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [Math.cos(a) * R * v, Math.sin(a) * R * v];
    };
    const fmt = (p) => p.map((x) => x.toFixed(1)).join(",");
    const poly = (v) => cats.map((_, i) => fmt(pt(i, v))).join(" ");
    const area = cats.map((c, i) => fmt(pt(i, c.safety / 100))).join(" ");
    // ラベルは2行（記号と安全度、短い名前）にして、スマホの幅でも切れないようにする
    const labels = cats.map((c, i) => {
      const [x, y] = pt(i, 1.16);
      const anchor = x > 6 ? "start" : x < -6 ? "end" : "middle";
      const top = y < -R * 0.8 ? y - 16 : y > R * 0.5 ? y + 6 : y - 6;
      return `<text x="${x.toFixed(1)}" y="${top.toFixed(1)}" text-anchor="${anchor}"><tspan class="code">${esc(c.cat)}</tspan><tspan class="val" dx="4">${c.safety}</tspan><tspan x="${x.toFixed(1)}" dy="13">${esc(D.questions.category_short[c.cat])}</tspan></text>`;
    }).join("");
    return `<svg class="radar" viewBox="-170 -122 340 236" role="img" aria-label="カテゴリ別の安全度：${cats.map((c) => `${c.name} ${c.safety}`).join("、")}">
      ${[0.25, 0.5, 0.75, 1].map((v) => `<polygon class="grid" points="${poly(v)}"/>`).join("")}
      ${cats.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="axis" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("")}
      <polygon class="area" points="${area}"/>
      ${cats.map((c, i) => { const [x, y] = pt(i, c.safety / 100); return `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`; }).join("")}
      ${labels}
    </svg>`;
  }

  function guardCard(c) {
    const state_ = c.safety >= 75 ? ["守れている", "st-ok"] : c.safety >= 40 ? ["穴あり", "st-mid"] : ["手つかず", "st-bad"];
    const weak = D.questions.questions.filter((q) => q.cat === c.cat && (state.answers[q.id] || 0) > 0);
    return `<article class="guard-card">
      <header><h3><span>${esc(c.cat)}</span>${esc(c.name)}</h3><span class="guard-state ${state_[1]}">${state_[0]}</span></header>
      <span class="bar-track" role="img" aria-label="安全度 ${c.safety}"><i style="width:${c.safety}%"></i></span>
      ${weak.length ? `<ul>${weak.map((q) => `<li>${esc(q.short)}</li>`).join("")}</ul>` : ""}
    </article>`;
  }

  function weakCard(w) {
    const q = w.q;
    return `<article class="weak">
      <h3>${esc(q.short)}</h3>
      <p>${catChip(q.cat)} <span class="chip">${w.point === 2 ? "いいえ・分からない" : "一部・たまに"}</span></p>
      <p class="weak-why"><b>なぜ危ない？</b>${esc(q.why)} ${ext(q.source, "出典", "src")}</p>
      ${q.extra ? `<p class="weak-why">${esc(q.extra.text)} ${ext(q.extra.source, "出典", "src")}</p>` : ""}
      <div class="weak-do"><b>今日できること</b><ul>${q.actions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>
    </article>`;
  }

  function simSection(plan) {
    const fixed = state.route === "fixed";
    const n = plan.chapters.length;
    const lvAfter = plan.after.level;
    return `<section aria-labelledby="sim-title">
      <h2 id="sim-title" class="block-title">このまま1年、放置したら</h2>
      <p class="block-lead">弱点の上位${n}項目から作った架空のシナリオです。根拠の数字は実際の発表から引いています。</p>
      <div class="route" role="group" aria-label="シナリオの切り替え">
        <button type="button" data-act="route" data-route="neglect" aria-pressed="${!fixed}">このまま放置したら</button>
        <button type="button" data-act="route" data-route="fixed" aria-pressed="${fixed}">今日の対策をしたら</button>
      </div>
      <div class="chapters">
        ${plan.chapters.map((c) => `<article class="chapter${fixed ? " is-fixed" : ""}">
          <p class="chapter-label"><span>第${c.n}章</span><b>${esc(c.label)}</b></p>
          <h3>${esc(fixed ? c.q.actions[0] : c.title)}</h3>
          <p>${esc(fixed ? c.fixed : c.story)}</p>
          ${fixed ? "" : `<p class="chapter-basis">根拠：${esc(c.q.why)} ${ext(c.q.source, "出典", "src")}</p>`}
          ${fixed ? bar("リスク指数", c.fixedCrisis, "bar-safe") : bar("危機の高まり", c.crisis, "bar-crisis")}
        </article>`).join("")}
      </div>
      <p class="sim-summary">${fixed
        ? `この${n}項目を「はい」にできれば、リスク指数は <b>${plan.before.score}</b> → <b>${plan.after.score}</b>（レベル${lvAfter.level}・${esc(lvAfter.name)}）になります。`
        : `何もしなければ、ここに挙げた${n}つの芽は残ったままです。いまのリスク指数は <b>${plan.before.score}</b>。`}</p>
    </section>`;
  }

  function goalsSection(r) {
    const buckets = [
      { title: "今週", items: r.weak.slice(0, 2) },
      { title: "今月", items: r.weak.slice(2, 5) },
      { title: "3か月以内", items: r.weak.slice(5) }
    ].filter((b) => b.items.length);
    return `<section aria-labelledby="goals-title">
      <h2 id="goals-title" class="block-title">次の目標</h2>
      <p class="block-lead">弱点を、重みと回答の大きい順に並べています。</p>
      <div class="goals">${buckets.map((b) => `<div class="goal"><h3>${esc(b.title)}</h3><ul>${b.items.map((w) => `<li>${esc(w.q.actions[0])}<small>${esc(w.q.short)}</small></li>`).join("")}</ul></div>`).join("")}</div>
    </section>`;
  }

  function supportSection(r, support) {
    const org = D.config.org;
    const memo = T.resultMemo(D.questions, state.profile, r);
    const unconfirmed = org.experts.some((e) => !e.confirmed);
    const level1 = r.focus === "level1";
    return `<section class="support" aria-labelledby="support-title">
      <h2 id="support-title">${level1 ? "いまは、相談の必要はほとんどありません" : "自社で進められる範囲と、相談したほうがよい範囲"}</h2>
      <p>${esc(support.self)}</p>
      ${support.experts.length ? `<p>この結果に関わりやすい分野：${support.experts.map((e) => `<span class="chip">${esc(e)}</span>`).join(" ")}</p>
      <p>${esc(org.name)}には、さまざまな分野の組合員がいます。必要なときだけ、分野を超えて専門家チームを組み、相談に応じます。こちらから営業の連絡はしません。</p>
      <div class="row">
        <a class="btn btn-primary btn-small" href="${esc(org.contact_url)}" target="_blank" rel="noopener" data-act="consult">組合に相談する ↗</a>
        <button type="button" class="btn btn-ghost btn-small" data-act="memo">相談用に結果をコピー</button>
      </div>
      <textarea class="ask-input" id="memo-area" readonly hidden aria-label="相談用の結果の要約">${esc(memo)}</textarea>
      <p class="fine" style="color:#3c4438">コピーした要約を問い合わせフォームに貼ると、話が早く進みます。要約に会社名や回答の細部は入りません。</p>
      ${unconfirmed ? '<p class="draft">専門家の分野は仮の表示です。組合員の実際の分野に合わせて config.json を直してください。</p>' : ""}` : '<p><a href="#about">組合と専門家チームについて</a></p>'}
    </section>`;
  }

  // ---------- 直近の事例 ----------
  function renderCases() {
    const cats = Object.keys(D.questions.categories);
    const list = D.cases.items.filter((c) => caseFilter.cat === "all" || c.cats.includes(caseFilter.cat));
    $("#cases-root").innerHTML = `<h1 class="page-title">直近の事例</h1>
      <p class="page-lead">${esc(D.cases.note)}　更新日：${esc(jpDate(D.cases.updated))}</p>
      <div class="filters" role="group" aria-label="カテゴリで絞り込む">
        <button type="button" class="filter" data-act="case-filter" data-cat="all" aria-pressed="${caseFilter.cat === "all"}">すべて</button>
        ${cats.map((k) => `<button type="button" class="filter" data-act="case-filter" data-cat="${k}" aria-pressed="${caseFilter.cat === k}">${k}. ${esc(D.questions.category_short[k])}</button>`).join("")}
      </div>
      <div class="case-list">${list.map((c) => caseHtml(c, false)).join("") || '<p class="block-lead">このカテゴリの事例はまだありません。</p>'}</div>`;
  }

  // ---------- リスクと対策 ----------
  function renderRisks() {
    const caseMap = T.byId(D.cases.items);
    const qMap = qById;
    const cfg = D.config;
    $("#risks-root").innerHTML = `<h1 class="page-title">リスクと対策</h1>
      <p class="page-lead">診断の7つの領域ごとに、要注意のサインと、今日・今月・仕組みの3段階の対策をまとめました。</p>
      <nav class="risk-index" aria-label="リスクの一覧">${D.risks.items.map((r) => `<a class="filter" href="#risk-${r.cat}">${r.cat}. ${esc(D.questions.category_short[r.cat])}</a>`).join("")}</nav>
      ${D.risks.items.map((r) => {
        const prompt = T.buildPrompt(cfg, "risk", { topic: r.title });
        const links = T.buildLinks(cfg, prompt);
        return `<article class="risk" id="risk-${r.cat}">
          <div class="risk-head"><span class="risk-letter" aria-hidden="true">${r.cat}</span><div><h2>${esc(r.title)}</h2><p class="risk-lead">${esc(r.lead)}</p></div></div>
          <div><h3 class="sr-only">要注意のサイン</h3><ul class="signs">${r.signs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
          <div class="measures">
            <div class="measure"><h3>今日</h3><ul>${r.measures.today.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>
            <div class="measure"><h3>今月</h3><ul>${r.measures.month.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>
            <div class="measure"><h3>仕組みにする</h3><ul>${r.measures.system.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>
          </div>
          <div class="risk-foot">
            ${r.cases.length ? `<h3>関連する事例</h3><ul>${r.cases.map((id) => caseMap[id]).filter(Boolean).map((c) => `<li><a href="#case-${esc(c.id)}">${esc(c.title)}</a>（${esc(dotDate(c.date))}）</li>`).join("")}</ul>` : ""}
            <p>診断では、この領域を${r.questions.length}問で確かめます（${r.questions.map((id) => esc(qMap[id].id)).join("・")}）。<a href="#check">診断する</a></p>
            <details><summary class="more">このリスクをAIに相談する</summary>${askBox(prompt, links)}</details>
          </div>
        </article>`;
      }).join("")}`;
  }

  // ---------- 今すぐできること ----------
  function renderNow() {
    const done = loadTodos();
    const groups = D.actions.groups.map((g) => ({ ...g, items: activeTodos(g) }));
    const all = groups.flatMap((g) => g.items);
    const count = all.filter((a) => done[a.id]).length;
    $("#now-root").innerHTML = `<h1 class="page-title">今すぐできること</h1>
      <p class="page-lead">お金をかけずに、今日から始められる確認です。チェックした項目は、この端末のブラウザにだけ残ります。</p>
      <div class="progress-line"><b>${count}</b>/ ${all.length} 項目　<span class="meter" style="flex:1"><i style="width:${(count / all.length) * 100}%"></i></span></div>
      ${groups.map((g) => `<section class="todo-group" aria-labelledby="todo-${g.id}">
        <h2 id="todo-${g.id}">${esc(g.title)}</h2>
        ${g.items.map((a) => `<label class="todo${done[a.id] ? " is-done" : ""}">
          <input type="checkbox" data-act="todo" data-id="${esc(a.id)}"${done[a.id] ? " checked" : ""}>
          <span><span class="todo-text">${esc(a.text)}</span>${catChip(a.cat)}<span class="todo-how" style="display:block">${esc(a.how)}</span></span>
        </label>`).join("")}
      </section>`).join("")}
      <div class="row"><a class="btn btn-primary btn-small" href="#check">診断で自社の弱点を確かめる</a>${count ? '<button type="button" class="btn btn-quiet btn-small" data-act="todo-reset">チェックを外す</button>' : ""}</div>`;
  }

  // ---------- AIに聞く ----------
  const EXAMPLES = [
    "自社サイトがWordPressで動いています。PHPの脆弱性の件で、マーケ担当として何を確かめればいいですか？",
    "生成AIで作った広告画像を使うとき、公開前に何を確かめればいいですか？",
    "公式SNSアカウントを代理店に運用してもらっています。権限はどう分ければいいですか？",
    "社長を名乗るLINEで送金を指示されたとき、社員にどう動いてもらえばいいですか？",
    "終わったキャンペーンサイトとドメインは、どう片付ければいいですか？"
  ];
  let askText = "";

  function renderAsk() {
    const cfg = D.config;
    const general = T.buildPrompt(cfg, "general", {});
    $("#ask-root").innerHTML = `<h1 class="page-title">AIに聞く</h1>
      <p class="page-lead">このサイトにはAIを置いていません。質問文を入れた状態で、あなたが普段使っているAIを開きます。AIには、このサイトの資料（llms.txt）を読んでから答えるよう頼みます。</p>
      <section class="ask-box" aria-labelledby="free-title">
        <h2 id="free-title" class="block-title" style="margin:0">自分の言葉で聞く</h2>
        <label class="sr-only" for="ask-input">AIに聞きたいこと</label>
        <textarea id="ask-input" class="ask-input" placeholder="例：キャンペーンの応募者リストをAIで整理したい。どこまでなら大丈夫？">${esc(askText)}</textarea>
        <div class="examples" aria-label="質問の例">${EXAMPLES.map((e, i) => `<button type="button" data-act="example" data-i="${i}">${esc(e)}</button>`).join("")}</div>
        <p class="len-note" id="len-note"></p>
        <div id="free-links"></div>
      </section>
      <section style="margin-top:22px">
        <h2 class="block-title">おまかせで相談する</h2>
        <p class="block-lead">まずAIから状況を質問してもらい、優先順位を一緒に考える質問文です。</p>
        ${askBox(general, T.buildLinks(cfg, general))}
      </section>
      <section style="margin-top:22px" class="fine">
        <p>しくみ：各AIサービスのURLに質問文を付けて開いています（ChatGPT・Claude・Grok・Perplexity・GoogleのAIモード）。URLが長すぎると途中で切れるため、質問文は短くしています。AIがページを読めずに推測で答えることもあるので、出典や公的機関の情報で確かめてください。</p>
      </section>`;
    updateFreeLinks();
  }

  function updateFreeLinks() {
    const cfg = D.config;
    const text = askText.trim();
    const note = $("#len-note");
    const slot = $("#free-links");
    if (!note || !slot) return;
    if (!text) {
      note.textContent = "質問を入れると、AIを開くボタンが出ます。";
      note.classList.remove("over");
      slot.innerHTML = "";
      return;
    }
    const prompt = T.buildPrompt(cfg, "free", { question: text });
    const links = T.buildLinks(cfg, prompt);
    const ok = T.fits(cfg, links);
    note.textContent = ok ? `${text.length}文字` : `${text.length}文字。長すぎてURLに収まりません。短くしてください。`;
    note.classList.toggle("over", !ok);
    slot.innerHTML = askBox(prompt, links);
  }

  // ---------- 止める？通す？ ----------
  function renderGame() {
    const root = $("#game-root");
    const g = D.scenes.game;
    if (game.phase === "title") {
      root.innerHTML = `<div class="game-title">
        <p class="eyebrow">1分の体験シミュレーション</p>
        <h1 tabindex="-1" class="flow-q">止める？ 通す？</h1>
        <p>マーケティングの現場でよくある${g.deal.risky + g.deal.safe}の場面を、危ないなら止め、大丈夫なら通してください。<br>通してしまった危険は、最後に「1年後の総括」として出てきます。</p>
        <div class="howto"><div class="stop"><b>← 止める</b><small>左にスワイプ・←キー</small></div><div class="pass"><b>通す →</b><small>右にスワイプ・→キー</small></div></div>
        <button type="button" class="btn btn-primary" data-act="game-start">はじめる</button>
        <p class="fine">${esc(D.scenes.note)}</p>
      </div>`;
      focusQ(root);
      return;
    }
    if (game.phase === "end") return renderGameEnd(root);

    const card = game.deck[game.i];
    const last = game.last;
    root.innerHTML = `<div class="game-hud" aria-live="polite">
        <div class="hud-top"><span>場面 <b>${game.i + 1}</b> / ${game.deck.length}</span><span>正解 <b>${game.plays.filter((p) => p.result.correct).length}</b></span></div>
        ${bar("危機の高まり", game.meters.crisis, "bar-crisis")}
        ${bar("AI活用の進み具合", game.meters.use, "bar-use")}
      </div>
      ${last ? feedbackHtml(last) : `<div class="deck" id="deck">
        <article class="card" id="card" tabindex="0" aria-label="場面 ${game.i + 1}">
          <span class="card-hint stop" aria-hidden="true">止める</span><span class="card-hint pass" aria-hidden="true">通す</span>
          ${sceneHtml(card)}
          <p class="card-q">この場面、止めますか？ 通しますか？</p>
        </article>
      </div>
      <div class="game-controls">
        <button type="button" class="ctl ctl-stop" data-act="choose" data-choice="stop">← 止める<small>危ないので止める</small></button>
        <button type="button" class="ctl ctl-pass" data-act="choose" data-choice="pass">通す →<small>このまま進める</small></button>
      </div>`}`;
    if (!last) bindSwipe($("#card"));
    else { const b = $("[data-act='game-next']", root); if (b) b.focus({ preventScroll: true }); }
  }

  function feedbackHtml(p) {
    const ok = p.result.correct;
    const verdict = { blocked: "止めて正解", allowed: "通して正解", leaked: "危ない場面を通しました", overblocked: "止めすぎました" }[p.result.kind];
    return `<div class="feedback ${ok ? "ok" : "ng"}">
      <b>${ok ? "○" : "×"} ${esc(verdict)}</b>
      ${sceneHtml(p.card)}
      <p>${esc(p.card.explain)}</p>
      <div class="row"><button type="button" class="btn btn-primary btn-small" data-act="game-next">${game.i >= game.deck.length - 1 ? "1年後の総括を見る" : "次の場面へ →"}</button></div>
    </div>`;
  }

  function choose(choice) {
    if (game.phase !== "play" || game.last) return;
    const card = game.deck[game.i];
    const result = T.judge(card, choice);
    const play = { card, choice, result };
    game.plays.push(play);
    game.meters = T.stepMeters(game.meters, card, result.kind, qById);
    game.last = play;
    renderGame();
  }

  function gameNext() {
    game.last = null;
    if (game.i >= game.deck.length - 1) {
      game.phase = "end";
      const sum = T.summarize(D.scenes.game, D.scenes, game.plays, qById);
      track("game_complete", { rank: sum.rank.name, correct: sum.correct });
    } else {
      game.i++;
    }
    renderGame();
    window.scrollTo(0, 0);
  }

  function renderGameEnd(root) {
    const sum = T.summarize(D.scenes.game, D.scenes, game.plays, qById);
    const shareText = `「止める？通す？」で${sum.total}場面中${sum.correct}場面を正しく判断。ランクは「${sum.rank.name}」でした。`;
    const shareUrl = "https://x.com/intent/post?text=" + encodeURIComponent(shareText) + (D.config.site_url ? "&url=" + encodeURIComponent(D.config.site_url + "#game") : "");
    root.innerHTML = `<div class="game-end">
      <div class="rank">
        <p class="eyebrow">あなたのランク</p>
        <h1 class="rank-name flow-q" tabindex="-1">${esc(sum.rank.name)}</h1>
        <p>${esc(sum.rank.text)}</p>
      </div>
      <dl class="stats">
        <div><dt>正しく判断</dt><dd>${sum.correct}/${sum.total}</dd></div>
        <div><dt>危機の高まり</dt><dd>${sum.meters.crisis}</dd></div>
        <div><dt>AI活用</dt><dd>${sum.meters.use}</dd></div>
      </dl>
      <section aria-labelledby="year-title">
        <h2 id="year-title" class="block-title">1年後の総括</h2>
        <p class="block-lead">通してしまった場面が、1年のあいだにどうなりうるかを並べた架空のシナリオです。</p>
        <div class="chapters">${sum.chapters.map((c) => `<article class="chapter${c.calm ? " is-fixed" : ""}">
          <p class="chapter-label"><span>第${c.n}章</span><b>${esc(c.label)}</b></p>
          <h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
          ${c.card && c.card.q ? `<p class="chapter-basis">根拠：${esc(qById[c.card.q].why)} ${ext(qById[c.card.q].source, "出典", "src")}</p>` : ""}
        </article>`).join("")}</div>
      </section>
      ${sum.missed.length ? `<section aria-labelledby="missed-title">
        <h2 id="missed-title" class="block-title">判断が分かれた場面</h2>
        <ul class="missed">${sum.missed.map((p) => `<li><b>${esc(p.card.who)}（${esc(p.card.where)}）</b><span>${esc(p.card.text)}</span><span>正解：${p.card.answer === "stop" ? "止める" : "通す"}。${esc(p.card.explain)}</span></li>`).join("")}</ul>
      </section>` : ""}
      <div class="row">
        <button type="button" class="btn btn-primary" data-act="game-start">もう一度</button>
        <a class="btn btn-ghost" href="#check">自社を診断する</a>
        <a class="btn btn-quiet btn-small" href="${esc(shareUrl)}" target="_blank" rel="noopener">結果をXでシェア</a>
      </div>
      <p class="fine">${esc(D.scenes.note)}</p>
    </div>`;
    focusQ(root);
  }

  function startGame() {
    game.phase = "play";
    game.deck = T.deal(D.scenes.game);
    game.i = 0;
    game.plays = [];
    game.meters = { crisis: 0, use: 40 };
    game.last = null;
    renderGame();
    window.scrollTo(0, 0);
  }

  // カードを左右にドラッグして選ぶ
  function bindSwipe(card) {
    if (!card) return;
    let startX = 0;
    let dx = 0;
    let dragging = false;
    const hintStop = $(".card-hint.stop", card);
    const hintPass = $(".card-hint.pass", card);
    card.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX;
      dx = 0;
      card.classList.add("dragging");
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 24}deg)`;
      hintStop.style.opacity = Math.min(1, Math.max(0, -dx / 90));
      hintPass.style.opacity = Math.min(1, Math.max(0, dx / 90));
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove("dragging");
      if (Math.abs(dx) > 90) {
        card.style.transform = `translateX(${dx > 0 ? 600 : -600}px) rotate(${dx > 0 ? 20 : -20}deg)`;
        card.style.opacity = "0";
        const choice = dx > 0 ? "pass" : "stop";
        setTimeout(() => choose(choice), 180);
      } else {
        card.style.transform = "";
        hintStop.style.opacity = 0;
        hintPass.style.opacity = 0;
      }
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }

  // ---------- 組合について ----------
  function renderAbout() {
    const org = D.config.org;
    const unconfirmed = org.experts.some((e) => !e.confirmed);
    $("#about-root").innerHTML = `<h1 class="page-title">組合と専門家チームについて</h1>
      <div class="about-org">
        <p class="eyebrow">運営</p>
        <h2>${esc(org.name)}</h2>
        <p>${esc(org.approval)}　<span lang="en">${esc(org.name_en)}</span></p>
        <p>${esc(org.about)}</p>
        <p>${ext(org.url, "組合のサイトを見る ↗")}</p>
      </div>
      <section style="margin-top:28px">
        <h2 class="block-title">中立の立場で運営しています</h2>
        <ul class="signs" style="gap:8px">
          <li>特定の製品やサービスは勧めません。紹介する無料ツールは公的機関のものだけです。</li>
          <li>診断の回答は外部に送りません。連絡先を入力する欄もありません。</li>
          <li>必要のない対策は、必要ないとお伝えします。</li>
        </ul>
      </section>
      <section style="margin-top:28px">
        <h2 class="block-title">専門家チームでの相談</h2>
        <p class="block-lead">自社だけで判断がつかないときは、組合員の専門家が分野を超えてチームを組みます。</p>
        <ol class="steps">
          <li><div><b>問い合わせフォームから相談内容を送る</b><span>診断結果の要約をコピーして貼ると、状況が伝わりやすくなります。</span></div></li>
          <li><div><b>必要な分野の組合員でチームを組む</b><span>サイトの保守、SNS運用、広報、法務など、課題に合わせて組み合わせます。</span></div></li>
          <li><div><b>多角的に対応する</b><span>技術・広報・契約の面から、自社でできることと任せたほうがよいことを整理します。</span></div></li>
        </ol>
        <p style="margin:16px 0 8px">組合員の主な分野</p>
        <div class="experts">${org.experts.map((e) => `<span class="chip">${esc(e.name)}</span>`).join("")}</div>
        ${unconfirmed ? '<p class="draft" style="margin-top:10px">分野は仮の表示です。組合員の実際の分野に合わせて config.json を直してください。</p>' : ""}
        <div class="row" style="margin-top:18px"><a class="btn btn-primary" href="${esc(org.contact_url)}" target="_blank" rel="noopener" data-act="consult">組合に相談する ↗</a><a class="btn btn-ghost" href="#check">先に診断する</a></div>
        <p class="fine" style="margin-top:12px">事故が起きた直後で急ぐ場合は、IPAの相談窓口もあわせて使ってください。${ext("https://www.ipa.go.jp/security/support/soudan.html", "IPA 相談窓口 ↗")}</p>
      </section>`;
  }

  // ---------- 操作 ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !D) return;
    const act = el.dataset.act;
    const data = D.questions;
    switch (act) {
      case "start":
        state.step = "profile"; state.p = 0; state.q = 0;
        track("diag_start");
        save(); renderCheck(); break;
      case "resume": {
        const firstMissing = data.questions.findIndex((q) => typeof state.answers[q.id] !== "number");
        const profileDone = data.profile.every((p) => (p.type === "multi" ? (state.profile[p.id] || []).length : state.profile[p.id]));
        if (!profileDone) { state.step = "profile"; state.p = data.profile.findIndex((p) => !(p.type === "multi" ? (state.profile[p.id] || []).length : state.profile[p.id])); }
        else if (firstMissing >= 0) { state.step = "quiz"; state.q = firstMissing; }
        else state.step = "result";
        save(); renderCheck(); break;
      }
      case "restart":
      case "clear":
        state.step = act === "clear" ? "intro" : "profile";
        state.p = 0; state.q = 0; state.profile = {}; state.answers = {}; state.route = "neglect";
        if (act === "restart") track("diag_start");
        save(); renderCheck(); window.scrollTo(0, 0);
        if (act === "clear") toast("回答を消去しました");
        break;
      case "pick": {
        const p = data.profile[state.p];
        state.profile[p.id] = el.dataset.value;
        save(); renderCheck();
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(nextStep, 160);
        break;
      }
      case "toggle": {
        const p = data.profile[state.p];
        const v = el.dataset.value;
        let list = (state.profile[p.id] || []).slice();
        const exclusive = p.exclusive || [];
        if (list.includes(v)) list = list.filter((x) => x !== v);
        else if (exclusive.includes(v)) list = [v];
        else list = list.filter((x) => !exclusive.includes(x)).concat(v);
        state.profile[p.id] = list;
        save(); renderCheck(); break;
      }
      case "answer": {
        const q = data.questions[state.q];
        const point = Number(el.dataset.point);
        state.answers[q.id] = point;
        track("diag_answer", { qid: q.id, point });
        save(); renderCheck();
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(nextStep, 160);
        break;
      }
      case "next": clearTimeout(advanceTimer); nextStep(); break;
      case "back": clearTimeout(advanceTimer); prevStep(); break;
      case "review": state.step = "quiz"; state.q = 0; save(); renderCheck(); window.scrollTo(0, 0); break;
      case "route": state.route = el.dataset.route; save(); renderCheck(); document.getElementById("sim-title").scrollIntoView({ block: "start" }); break;
      case "memo": {
        const r = S.compute(data, state.profile, state.answers);
        copyText(T.resultMemo(data, state.profile, r), $("#memo-area"));
        track("cta_click", { cta_type: "memo_copy", weak_cat: r.focus });
        break;
      }
      case "consult": {
        const focus = state.step === "result" ? S.compute(data, state.profile, state.answers).focus : "";
        track("cta_click", { cta_type: "consult", weak_cat: focus });
        break;
      }
      case "ai": {
        const focus = state.step === "result" && current === "check" ? S.compute(data, state.profile, state.answers).focus : "";
        track("cta_click", { cta_type: "ai_" + el.dataset.ai, weak_cat: focus, place: current });
        break;
      }
      case "case-filter": caseFilter.cat = el.dataset.cat; renderCases(); break;
      case "todo-reset": saveTodos({}); renderNow(); break;
      case "example": {
        askText = EXAMPLES[Number(el.dataset.i)];
        const input = $("#ask-input");
        input.value = askText;
        updateFreeLinks();
        input.focus();
        break;
      }
      case "game-start": startGame(); break;
      case "choose": choose(el.dataset.choice); break;
      case "game-next": gameNext(); break;
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-act='todo']");
    if (!el) return;
    const done = loadTodos();
    if (el.checked) done[el.dataset.id] = today();
    else delete done[el.dataset.id];
    saveTodos(done);
    renderNow();
  });

  document.addEventListener("input", (e) => {
    if (e.target.id !== "ask-input") return;
    askText = e.target.value;
    updateFreeLinks();
  });

  document.addEventListener("keydown", (e) => {
    if (current !== "game" || game.phase !== "play" || e.target.closest("input, textarea")) return;
    if (game.last && (e.key === "Enter" || e.key === " ")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); choose("stop"); }
    if (e.key === "ArrowRight") { e.preventDefault(); choose("pass"); }
  });

  window.addEventListener("hashchange", route);

  // ---------- 起動 ----------
  function readUtm() {
    const params = new URLSearchParams(location.search);
    const utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => { if (params.get(k)) utm[k] = params.get(k); });
    if (Object.keys(utm).length) state.utm = utm;
  }

  loadData().then((data) => {
    D = data;
    qById = T.byId(D.questions.questions);
    restore();
    readUtm();
    save();
    const up = $("#updated");
    up.textContent = jpDate(D.questions.updated);
    up.setAttribute("datetime", D.questions.updated);
    renderNews();
    route();
  }).catch((err) => {
    console.error(err);
    $("#load-error").hidden = false;
    document.querySelectorAll("[data-view]").forEach((s) => { s.hidden = true; });
  });
})();
