// ━━━ 舞台の演出（金屏風・センターマイク・めくり） ━━━
// Stage.hero は HTML 文字列を返すだけで DOM には触らない。flip / countUp は渡された要素だけを動かし、
// 終わったあとに変形も透明度も残さない。色はすべて stage.css のトークン（テーマごとに定義）で付ける。
const Stage = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = () => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  };
  const now = () => (window.performance && performance.now ? performance.now() : Date.now());

  // ── めくりの縦書き ──
  // 1列は PER_COL 字（stage.css の --fs × 11 と対）。狭い舞台は4列、広い舞台は6列まで載せ、はみ出す分は「…」で切る。
  // 半角英数字の1〜2字（A、B、AI、11 など）は縦中横、3字以上の英字は横に寝かせる（幅は約0.6字）。
  const PER_COL = 11;
  const ELL = { s: "…", w: 1 };
  function units(para) {
    const out = [];
    for (const m of String(para).matchAll(/[A-Za-z0-9]+|[!?]{1,2}|[\s\S]/gu)) {
      const s = m[0];
      if (/^[A-Za-z0-9!?]+$/.test(s)) {
        if (s.length <= 2) out.push({ s, w: 1, tcy: true });
        else for (const ch of s) out.push({ s: ch, w: 0.6 });
      } else out.push({ s, w: /[\x20-\x7e]/.test(s) ? 0.5 : 1 });
    }
    return out;
  }
  const widthOf = u => u.reduce((a, x) => a + x.w, 0);
  const paint = u => u.map(x => (x.tcy ? '<span class="stg-tcy">' + esc(x.s) + "</span>" : esc(x.s))).join("");
  // 台詞を列に流したときの見積もり。禁則で1字送られることがあるので、2列以上にわたる段落は1字ぶん余裕を見る
  function fit(text, maxCols) {
    const paras = String(text).split("\n").map(p => p.trim()).filter(Boolean);
    const kept = [];
    let cols = 0, cut = false;
    for (const p of paras) {
      const u = units(p), w = widthOf(u);
      const need = Math.max(1, Math.ceil((w + (w > PER_COL ? 1 : 0)) / PER_COL));
      if (cols + need <= maxCols) { kept.push(u); cols += need; continue; }
      cut = true;
      const room = (maxCols - cols) * PER_COL - 2;
      if (room >= 3) {
        const part = [];
        let acc = 0;
        for (const x of u) { if (acc + x.w > room) break; part.push(x); acc += x.w; }
        kept.push(part.concat(ELL));
      } else if (kept.length) {
        kept[kept.length - 1] = kept[kept.length - 1].slice(0, -1).concat(ELL);
      }
      break;
    }
    return { html: kept.map(u => balance(u).map(paint).join("\n")).join("\n"), cut };
  }
  // 2列以上にわたる段落は字数をならして自分で列を切る。成り行きに任せると「す」」のような1〜2字だけの列が残る。
  // 閉じ括弧や句読点の前では切らない（列頭に来ない）
  const CLOSERS = /^[」』）)、。，．！？!?ー…]/;
  function balance(u) {
    const w = widthOf(u);
    if (w <= PER_COL) return [u];
    const n = Math.ceil((w + 1) / PER_COL), target = w / n, cols = [];
    let cur = [], acc = 0;
    u.forEach((x, i) => {
      cur.push(x); acc += x.w;
      const next = u[i + 1];
      if (next && cols.length < n - 1 && acc >= target - 0.01 && !CLOSERS.test(next.s)) {
        cols.push(cur); cur = []; acc = 0;
      }
    });
    if (cur.length) cols.push(cur);
    return cols;
  }
  // 漫才の台本（A「…」B「…」）は話者ごとに列を改める
  const turns = s => String(s ?? "").replace(/\r\n?/g, "\n").replace(/」\s*(?=[AB]「)/g, "」\n");

  // ── 金屏風と板の間（幅 1200 × 高さ 300 の座標。横は中央を残して切り取られる） ──
  // 金箔の継ぎ目（箔足）と、箔ごとのわずかな色むらを決まった並びで置く
  const LEAF = 26, LEAF_COLS = 5, LEAF_ROWS = 4;
  const LEAF_TONE = [3, 0, 5, 1, 0, 0, 2, 0, 4, 6, 1, 4, 0, 0, 2, 0, 5, 3, 0, 1];
  function leafTile() {
    let body = "";
    LEAF_TONE.forEach((t, i) => {
      if (!t) return;
      const x = (i % LEAF_COLS) * LEAF, y = Math.floor(i / LEAF_COLS) * LEAF;
      const cls = t % 2 ? "stg-leaf-lo" : "stg-leaf-hi";
      body += '<rect x="' + x + '" y="' + y + '" width="' + LEAF + '" height="' + LEAF + '" class="' + cls + '" fill-opacity="' + (0.02 + t * 0.012).toFixed(3) + '"/>';
    });
    let joints = "";
    for (let c = 0; c < LEAF_COLS; c++) joints += "M" + (c * LEAF + 0.4) + " 0V" + LEAF_ROWS * LEAF;
    for (let r = 0; r < LEAF_ROWS; r++) joints += "M0 " + (r * LEAF + 0.4) + "H" + LEAF_COLS * LEAF;
    return '<g class="stg-leaf-tones">' + body + '</g><path d="' + joints + '" class="stg-leaf-joint"/>';
  }

  const SCREEN_TOP = 14, GOLD_TOP = 24, GOLD_BOT = 238, FLOOR = 248;
  function backdrop(id) {
    const gold = GOLD_BOT - GOLD_TOP;
    let panels = "", seams = "";
    for (let i = 0; i <= 12; i++) {
      const x = -50 + i * 100;
      panels += '<rect x="' + x + '" y="' + GOLD_TOP + '" width="100" height="' + gold + '" fill="url(#' + id + (i % 2 ? "-shd" : "-lit") + ')"/>';
      if (i) seams += "M" + x + " " + GOLD_TOP + "V" + GOLD_BOT;
    }
    let boards = "";
    for (let k = -10; k <= 10; k++) boards += "M" + (600 + k * 62) + " " + FLOOR + "L" + (600 + k * 84) + " 300";
    return '<svg class="stg-bg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs>'
      + '<linearGradient id="' + id + '-lit" x1="0" x2="1"><stop offset="0" class="stg-s-g1"/><stop offset="1" class="stg-s-g2"/></linearGradient>'
      + '<linearGradient id="' + id + '-shd" x1="0" x2="1"><stop offset="0" class="stg-s-g4"/><stop offset="1" class="stg-s-g3"/></linearGradient>'
      + '<linearGradient id="' + id + '-depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="stg-s-dusk" stop-opacity="0.55"/>'
      + '<stop offset="0.3" class="stg-s-dusk" stop-opacity="0"/><stop offset="0.82" class="stg-s-dusk" stop-opacity="0"/><stop offset="1" class="stg-s-dusk" stop-opacity="0.4"/></linearGradient>'
      + '<linearGradient id="' + id + '-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="stg-s-f1"/><stop offset="1" class="stg-s-f2"/></linearGradient>'
      + '<linearGradient id="' + id + '-cast" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="stg-s-dusk" stop-opacity="0.5"/><stop offset="1" class="stg-s-dusk" stop-opacity="0"/></linearGradient>'
      + '<pattern id="' + id + '-leaf" width="' + LEAF * LEAF_COLS + '" height="' + LEAF * LEAF_ROWS + '" patternUnits="userSpaceOnUse" x="-50" y="' + GOLD_TOP + '">' + leafTile() + "</pattern>"
      + "</defs>"
      + '<rect class="stg-wall" width="1200" height="300"/>'
      + panels
      + '<rect x="0" y="' + GOLD_TOP + '" width="1200" height="' + gold + '" fill="url(#' + id + '-leaf)"/>'
      + '<rect x="0" y="' + GOLD_TOP + '" width="1200" height="' + gold + '" fill="url(#' + id + '-depth)"/>'
      + '<path class="stg-seam" d="' + seams + '"/>'
      + '<rect class="stg-brocade" x="0" y="' + GOLD_TOP + '" width="1200" height="3"/>'
      + '<rect class="stg-brocade" x="0" y="' + (GOLD_BOT - 3) + '" width="1200" height="3"/>'
      + '<rect class="stg-frame" x="0" y="' + SCREEN_TOP + '" width="1200" height="' + (GOLD_TOP - SCREEN_TOP) + '"/>'
      + '<rect class="stg-frame" x="0" y="' + GOLD_BOT + '" width="1200" height="' + (FLOOR - GOLD_BOT) + '"/>'
      + '<path class="stg-frame-hi" d="M0 ' + (SCREEN_TOP + 1) + "H1200M0 " + (GOLD_BOT + 1) + 'H1200"/>'
      + '<rect x="0" y="' + FLOOR + '" width="1200" height="' + (300 - FLOOR) + '" fill="url(#' + id + '-floor)"/>'
      + '<path class="stg-board" d="' + boards + '"/>'
      + '<rect x="0" y="' + FLOOR + '" width="1200" height="12" fill="url(#' + id + '-cast)"/>'
      + '<rect class="stg-lip" x="0" y="294" width="1200" height="6"/>'
      + "</svg>";
  }

  // ── センターマイク（サンパチマイク）。網の頭、銘板、細いスタンド、丸い台座 ──
  function bigMic(id) {
    return '<svg class="stg-mic-svg" viewBox="0 0 64 210" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs>'
      + '<linearGradient id="' + id + '-mh" x1="0" x2="1"><stop offset="0" class="stg-s-m3"/><stop offset="0.3" class="stg-s-m1"/><stop offset="0.62" class="stg-s-m2"/><stop offset="1" class="stg-s-m3"/></linearGradient>'
      + '<linearGradient id="' + id + '-mp" x1="0" x2="1"><stop offset="0" class="stg-s-m3"/><stop offset="0.4" class="stg-s-m1"/><stop offset="1" class="stg-s-m3"/></linearGradient>'
      + '<pattern id="' + id + '-mesh" width="2.6" height="2.6" patternUnits="userSpaceOnUse"><path d="M0 0.5H2.6M0.5 0V2.6" class="stg-mesh"/></pattern>'
      + "</defs>"
      + '<ellipse class="stg-m-shadow" cx="32" cy="203" rx="31" ry="5.5"/>'
      + '<ellipse class="stg-m4" cx="32" cy="199" rx="22" ry="5.5"/>'
      + '<ellipse cx="32" cy="197.4" rx="20.5" ry="4.2" fill="url(#' + id + '-mp)"/>'
      + '<rect class="stg-m4" x="28.6" y="189" width="6.8" height="9" rx="1.5"/>'
      + '<rect x="30.4" y="62" width="3.2" height="129" fill="url(#' + id + '-mp)"/>'
      + '<rect class="stg-m4" x="27.6" y="124" width="8.8" height="8" rx="2"/>'
      + '<rect class="stg-m3" x="36" y="126.5" width="4.2" height="3" rx="1"/>'
      + '<rect x="27" y="52" width="10" height="12" rx="2.5" fill="url(#' + id + '-mp)"/>'
      + '<rect class="stg-m4" x="25" y="50" width="14" height="4" rx="1.5"/>'
      + '<rect class="stg-m-rim" x="15" y="3" width="34" height="48" rx="13" fill="url(#' + id + '-mh)"/>'
      + '<rect x="18.4" y="6.4" width="27.2" height="32" rx="10.4" fill="url(#' + id + '-mesh)"/>'
      + '<path class="stg-m-band" d="M15.6 40.5H48.4"/>'
      + '<rect class="stg-m-plate" x="26.5" y="43.6" width="11" height="3.4" rx="1"/>'
      + '<rect class="stg-m-glint" x="20.6" y="9" width="3.4" height="26" rx="1.7"/>'
      + "</svg>";
  }

  let seq = 0, t0 = null;
  const INTRO_MS = 2400;

  // ホームの舞台。role は縦書きの役名、line は台詞（長ければ切る）、label は小さな見出し
  function hero(opts) {
    const o = opts || {};
    const id = "stg" + (++seq);
    const t = now();
    if (t0 === null) t0 = t;
    // 開幕の演出はページで最初の数秒だけ。途中で描き直されても負の遅延で続きから再生する
    const el = Math.round(t - t0);
    const intro = el < INTRO_MS;
    const text = turns(o.line);
    const narrow = fit(text, 4), wide = fit(text, 6);
    const lines = narrow.html === wide.html
      ? '<span class="stg-line">' + narrow.html + "</span>"
      : '<span class="stg-line stg-n">' + narrow.html + '</span><span class="stg-line stg-w">' + wide.html + "</span>";
    const role = String(o.role ?? "").trim();
    return '<div class="stg' + (intro ? " is-intro" : "") + '" style="--stg-el:' + -el + 'ms">'
      + '<div class="stg-box">'
      + backdrop(id)
      + '<div class="stg-spot" aria-hidden="true"></div>'
      + '<div class="stg-sheen" aria-hidden="true"><i></i></div>'
      + '<div class="stg-mic" aria-hidden="true">' + bigMic(id) + "</div>"
      + '<div class="stg-stand">'
      + '<p class="stg-bar">' + esc(o.label) + "</p>"
      + '<div class="stg-pad"><div class="stg-card">'
      + (role ? '<span class="stg-role">' + esc(role) + "</span>" : "")
      + lines
      + "</div></div>"
      + '<div class="stg-legs" aria-hidden="true"></div>'
      + "</div></div></div>";
  }

  // めくりが上の辺からめくれ落ちてくる。終われば何も残らない（WAAPI, fill なし）
  const flipping = new WeakMap();
  function flip(el) {
    if (!el || typeof el.animate !== "function" || reduced()) return;
    const prev = flipping.get(el);
    if (prev) prev.cancel();
    const k = (deg, b) => ({ transform: "perspective(900px) rotateX(" + deg + "deg)", transformOrigin: "50% 0", filter: "brightness(" + b + ")" });
    const a = el.animate([
      { ...k(-84, 0.78), offset: 0, easing: "cubic-bezier(0.55, 0, 0.8, 0.4)" },
      { ...k(9, 1.03), offset: 0.6, easing: "cubic-bezier(0.3, 0, 0.4, 1)" },
      { ...k(-3, 1), offset: 0.82, easing: "ease-in-out" },
      { ...k(0, 1), offset: 1 },
    ], { duration: 450, fill: "none" });
    flipping.set(el, a);
    const clear = () => { if (flipping.get(el) === a) flipping.delete(el); };
    a.onfinish = clear;
    a.oncancel = clear;
  }

  // 0 から整数 to まで数え上げる。最終値を先に入れておくので、描画が止まっても数字は正しいまま
  const counting = new WeakMap();
  function countUp(el, to, ms = 600) {
    if (!el) return;
    const end = Math.round(Number(to)) || 0;
    const prev = counting.get(el);
    if (prev) prev();
    el.textContent = String(end);
    const dur = Number(ms);
    if (!end || !(dur > 0) || reduced() || typeof requestAnimationFrame !== "function") return;
    let raf = 0, timer = 0, start = null;
    const stop = () => { cancelAnimationFrame(raf); clearTimeout(timer); counting.delete(el); };
    const done = () => { stop(); el.textContent = String(end); };
    const step = ts => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step); else done();
    };
    raf = requestAnimationFrame(step);
    timer = setTimeout(done, dur + 400);
    counting.set(el, stop);
  }

  // 見出しや空の画面に添える小さなセンターマイク。色は文字色に合わせ、頭の網だけ金を薄く敷く
  function mic(size = 28) {
    const s = Math.max(8, Number(size) || 28);
    return '<svg class="stg-ico" viewBox="0 0 20 32" width="' + Math.round(s * 0.625 * 10) / 10 + '" height="' + s
      + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'
      + '<rect class="stg-ico-head" x="4" y="1.2" width="12" height="15.6" rx="5"/>'
      + '<path class="stg-ico-grille" d="M7 5.2h6M6.4 8.2h7.2M7 11.2h6"/>'
      + '<rect class="stg-ico-solid" x="7.6" y="16.6" width="4.8" height="2.6" rx="0.8"/>'
      + '<rect class="stg-ico-solid" x="9.3" y="19" width="1.4" height="10.4"/>'
      + '<ellipse class="stg-ico-solid" cx="10" cy="30" rx="6" ry="1.6"/>'
      + "</svg>";
  }

  return { hero, flip, countUp, mic };
})();
