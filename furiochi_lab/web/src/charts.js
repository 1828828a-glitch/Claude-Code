// ━━━ グラフ（SVG/HTML の文字列を返す純関数） ━━━
// DOM には触らない。埋め込む文字は esc() で必ずエスケープし、色は charts.css のクラス（テーマのトークン）だけで付ける。
// 返す要素は必ず role="img" と、データを言葉でまとめた aria-label を持つ。
// 自分のデータは --ch-self（金）、Claude や比較は --ch-ai（藍）、目盛りと罫は --line / --muted。
const Charts = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const f1 = n => Math.round(n * 10) / 10;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const score = v => { const n = Number(v); return Number.isFinite(n) ? clamp(n, 0, 2) : 0; };
  const fmt = n => Number.isInteger(n) ? String(n) : String(f1(n));
  const pct = r => Math.round(r * 100) + "%";
  // 文字幅の見積もり（全角1em、半角0.6em）。ラベルを viewBox の内側に収めるために使う
  const textW = (s, fs) => [...String(s)].reduce((w, ch) => w + (ch.charCodeAt(0) < 0x2000 ? 0.6 : 1) * fs, 0);
  const WD = "日月火水木金土";
  const md = d => (d.getMonth() + 1) + "/" + d.getDate();
  const jday = d => (d.getMonth() + 1) + "月" + d.getDate() + "日（" + WD[d.getDay()] + "）";
  const svg = (box, cls, body) => {
    const [x, y, w, h] = box;
    return '<svg class="ch-svg ' + cls + '" viewBox="' + [x, y, w, h].map(f1).join(" ") + '" width="' + Math.ceil(w)
      + '" height="' + Math.ceil(h) + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>";
  };
  const fig = (cls, label, body) => '<figure class="ch ' + cls + '" role="img" aria-label="' + esc(label) + '">' + body + "</figure>";
  const legend = (keys, extra) => '<div class="ch-legend">' + keys.map(([sw, t]) => '<span class="ch-key"><i class="' + sw + '"></i>' + esc(t) + "</span>").join("")
    + (extra ? '<span class="ch-legend-sum">' + esc(extra) + "</span>" : "") + "</div>";

  // 軸名の折り返し。「期待の/明確さ」「フリとの/対応」のように「の」の後で切る
  function wrapLabel(name) {
    const ch = [...String(name)];
    if (ch.length <= 4) return [ch.join("")];
    const i = ch.lastIndexOf("の", ch.length - 2);
    if (i >= 1) return [ch.slice(0, i + 1).join(""), ch.slice(i + 1).join("")];
    if (ch.length <= 6) return [ch.join("")];
    const m = Math.ceil(ch.length / 2);
    return [ch.slice(0, m).join(""), ch.slice(m).join("")];
  }

  function names(labels) {
    const l = labels || {};
    return { s: String(l.scores || "自分の評価"), c: String(l.compare || "Claude") };
  }

  function axisSummary(axes, vals) {
    return axes.map((a, i) => (a.name || a.key) + " " + fmt(vals[i])).join("、");
  }

  // ── レーダー（0〜2点、目盛りの輪は1と2）。3軸未満は bars に任せる
  function radar({ axes = [], scores = {}, compare = null, size = 240, labels = null } = {}) {
    const list = Array.isArray(axes) ? axes : [];
    if (list.length < 3) return bars({ axes: list, scores, compare, labels });
    const nm = names(labels), sc = scores || {};
    const n = list.length, R = Math.max(56, Number(size) * 0.4 || 96), fs = 12, lh = 15, gap = 9;
    const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const at = (i, v) => [Math.cos(ang(i)) * R * v / 2, Math.sin(ang(i)) * R * v / 2];
    const pts = vals => vals.map((v, i) => at(i, v).map(f1).join(",")).join(" ");
    const sv = list.map(a => score(sc[a.key]));
    const cv = compare ? list.map(a => score(compare[a.key])) : null;

    const ring2 = list.map((_, i) => at(i, 2));
    let x0 = Math.min(...ring2.map(p => p[0])), x1 = Math.max(...ring2.map(p => p[0]));
    let y0 = Math.min(...ring2.map(p => p[1])), y1 = Math.max(...ring2.map(p => p[1]));
    const labs = list.map((a, i) => {
      const c = Math.cos(ang(i)), s = Math.sin(ang(i)), side = Math.abs(c) > 0.3;
      const lines = side ? wrapLabel(a.name || a.key) : [String(a.name || a.key)];
      const w = Math.max(...lines.map(t => textW(t, fs))), hh = (lines.length - 1) * lh + fs;
      const g = side ? gap + 3 : gap, px = c * (R + g), py = s * (R + g);
      const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
      // 横の札は、頂点の方向に合わせて上下にずらす（真横なら中央、下寄りの頂点なら札を下へ）
      const top = side ? py - hh * (1 - s) / 2 : s < 0 ? py - hh - 2 : py + 2;
      const left = anchor === "start" ? px : anchor === "end" ? px - w : px - w / 2;
      x0 = Math.min(x0, left); x1 = Math.max(x1, left + w); y0 = Math.min(y0, top); y1 = Math.max(y1, top + hh);
      return '<text class="ch-lab" text-anchor="' + anchor + '">' + lines.map((t, k) =>
        '<tspan x="' + f1(px) + '" y="' + f1(top + fs * 0.88 + k * lh) + '">' + esc(t) + "</tspan>").join("") + "</text>";
    }).join("");
    const pad = 4, box = [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];

    const grid = [1, 2].map(l => '<polygon class="ch-grid" points="' + pts(list.map(() => l)) + '"/>').join("")
      + list.map((_, i) => { const [x, y] = at(i, 2); return '<line class="ch-grid" x1="0" y1="0" x2="' + f1(x) + '" y2="' + f1(y) + '"/>'; }).join("");
    const dot = (cls, v, i, r) => { const [x, y] = at(i, v); return '<circle class="' + cls + '" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + r + '"/>'; };
    const data = '<g class="ch-grow">'
      + '<polygon class="ch-r-area" points="' + pts(sv) + '"/>'
      + (cv ? '<polygon class="ch-r-cmp" points="' + pts(cv) + '"/>' + cv.map((v, i) => dot("ch-r-cmpdot", v, i, 6)).join("") : "")
      + sv.map((v, i) => dot("ch-dot", v, i, 4.5)).join("") + "</g>";
    const hits = list.map((a, i) => {
      const [x, y] = at(i, sv[i]);
      const tip = (a.name || a.key) + "　" + nm.s + " " + fmt(sv[i]) + (cv ? " ／ " + nm.c + " " + fmt(cv[i]) : "") + "（2点満点）";
      return '<circle class="ch-hit" cx="' + f1(x) + '" cy="' + f1(y) + '" r="13"><title>' + esc(tip) + "</title></circle>";
    }).join("");

    let label = "レーダーチャート（各項目0〜2点）。" + nm.s + "：" + axisSummary(list, sv) + "。";
    if (cv) {
      const same = sv.filter((v, i) => v === cv[i]).length;
      label += nm.c + "：" + axisSummary(list, cv) + "。" + n + "項目中" + same + "項目で一致。";
    }
    return fig("ch-radar", label, svg(box, "", grid + data + labs + hits)
      + (cv ? legend([["ch-sw-area", nm.s], ["ch-sw-dash", nm.c]]) : "")
      + '<p class="ch-cap">外側の輪が2点、内側の輪が1点、中心が0点</p>');
  }

  // ── 横棒（0〜2点）。比較があれば藍の縦線で位置を示す
  function bars({ axes = [], scores = {}, compare = null, labels = null } = {}) {
    const list = Array.isArray(axes) ? axes : [];
    if (!list.length) return fig("ch-bars ch-quiet", "評価の項目がありません", '<p class="ch-note">評価の項目がありません。</p>');
    const nm = names(labels), sc = scores || {};
    const sv = list.map(a => score(sc[a.key]));
    const cv = compare ? list.map(a => score(compare[a.key])) : null;
    const rows = list.map((a, i) => {
      const tip = (a.name || a.key) + "　" + nm.s + " " + fmt(sv[i]) + (cv ? " ／ " + nm.c + " " + fmt(cv[i]) : "") + "（2点満点）";
      return '<span class="ch-blabel">' + esc(a.name || a.key) + "</span>"
        + '<span class="ch-btrack" title="' + esc(tip) + '"><i class="ch-bfill" style="width:' + f1(sv[i] / 2 * 100) + '%"></i>'
        + (cv ? '<i class="ch-bmark" style="left:' + f1(cv[i] / 2 * 100) + '%"></i>' : "") + "</span>"
        + '<span class="ch-bval">' + fmt(sv[i]) + "</span>";
    }).join("");
    let label = "棒グラフ（各項目0〜2点）。" + nm.s + "：" + axisSummary(list, sv) + "。";
    if (cv) label += nm.c + "：" + axisSummary(list, cv) + "。";
    return fig("ch-bars", label, '<div class="ch-bgrid">' + rows + "</div>"
      + (cv ? legend([["ch-sw-bar", nm.s], ["ch-sw-mark", nm.c]]) : ""));
  }

  // ── 練習カレンダー（週の列 × 曜日の行）。濃さは1日の回答数で4段階
  const HEAT = [[0, "練習なし"], [1, "1〜2問"], [3, "3〜4問"], [5, "5〜7問"], [8, "8問以上"]];
  const heatStep = n => n <= 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4;

  function calendar(attempts = [], { weeks = 12, today = new Date() } = {}) {
    const t = today instanceof Date ? today : new Date(today);
    const now = Number.isFinite(t.getTime()) ? t : new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const W = clamp(Math.floor(Number(weeks)) || 12, 1, 60);
    const day = k => new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - t0.getDay() - (W - 1) * 7 + k);
    const key = d => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    const counts = new Map();
    for (const a of Array.isArray(attempts) ? attempts : []) {
      const ts = Number(a && a.ts);
      if (!Number.isFinite(ts)) continue;
      const k = key(new Date(ts));
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const cell = 20, pitch = 24, left = 22, top = 20;
    let cells = "", months = "", days = 0, total = 0, best = null, lastLabelCol = -9;
    const firstStart = (() => { for (let w = 0; w < W; w++) for (let d = 0; d < 7; d++) { const x = day(w * 7 + d); if (x <= t0 && x.getDate() === 1) return w; } return W; })();
    for (let w = 0; w < W; w++) {
      let monthHere = null;
      for (let d = 0; d < 7; d++) {
        const date = day(w * 7 + d);
        if (date > t0) continue;
        if (date.getDate() === 1 || (w === 0 && d === 0 && firstStart >= 2)) monthHere = date;
        const n = counts.get(key(date)) || 0;
        if (n) { days++; total += n; if (!best || n > best.n) best = { n, date }; }
        const isToday = date.getTime() === t0.getTime();
        cells += '<rect class="ch-cell ch-h' + heatStep(n) + (isToday ? " ch-today" : "") + '" x="' + (left + w * pitch) + '" y="' + (top + d * pitch)
          + '" width="' + cell + '" height="' + cell + '" rx="4"><title>' + esc(jday(date) + (isToday ? "・今日" : "") + "　" + (n ? n + "問" : "練習なし")) + "</title></rect>";
      }
      if (monthHere && w - lastLabelCol >= 2) {
        months += '<text class="ch-tick" x="' + (left + w * pitch) + '" y="12">' + (monthHere.getMonth() + 1) + "月</text>";
        lastLabelCol = w;
      }
    }
    const wd = [...WD].map((c, d) => '<text class="ch-tick" text-anchor="middle" x="8" y="' + (top + d * pitch + 14) + '">' + c + "</text>").join("");
    const vw = left + W * pitch - pitch + cell + 2, vh = top + 7 * pitch - pitch + cell + 2;
    const sum = days ? W + "週で" + days + "日・" + total + "問" : "この" + W + "週はまだ記録なし";
    let label = "練習カレンダー（直近" + W + "週）。" + (days ? "練習した日は" + days + "日、合計" + total + "問。いちばん多かった日は" + jday(best.date) + "の" + best.n + "問。" : "まだ練習の記録はありません。");
    const scale = '<span class="ch-scale">少' + HEAT.map((h, i) => '<i class="ch-sw ch-h' + i + '" title="' + esc(h[1]) + '"></i>').join("") + "多</span>";
    // 14週を超える長さは縮めずに横スクロール（右端＝今週から見える）
    return fig("ch-cal" + (W > 14 ? " ch-cal-long" : ""), label, '<div class="ch-scroll">' + svg([0, 0, vw, vh], "", months + wd + cells) + "</div>"
      + '<div class="ch-legend">' + scale + '<span class="ch-legend-sum">' + esc(sum) + "</span></div>");
  }

  // ── 得点率の推移（1回ごとの点と、直近5回の移動平均）
  const ratioOf = a => {
    const s = a && a.evaluation && a.evaluation.scores;
    if (!s || typeof s !== "object") return null;
    const v = Object.values(s);
    if (!v.length) return null;
    return clamp(v.reduce((x, y) => x + (Number(y) || 0), 0) / (2 * v.length), 0, 1);
  };

  function trendEmpty(one) {
    const msg = one ? "1回目は" + pct(one.r) + "でした。もう1回解くと、ここに得点率の線が出ます。" : "まだ記録がありません。2回解くと、ここに得点率の線が出ます。";
    const VW = 340, VH = 64, x0 = 36, x1 = VW - 8, yAt = r => 10 + (1 - r) * 44;
    const body = [0, 0.5, 1].map(r => '<line class="ch-grid" x1="' + x0 + '" x2="' + x1 + '" y1="' + yAt(r) + '" y2="' + yAt(r) + '"/>'
      + '<text class="ch-tick" text-anchor="end" x="' + (x0 - 6) + '" y="' + (yAt(r) + 3.5) + '">' + pct(r) + "</text>").join("")
      + (one ? '<circle class="ch-t-last" cx="' + (x0 + 10) + '" cy="' + f1(yAt(one.r)) + '" r="5"/>' : "");
    return fig("ch-trend ch-quiet", msg, svg([0, 0, VW, VH], "", body) + '<p class="ch-note">' + esc(msg) + "</p>");
  }

  function trend(attempts = [], { last = 30 } = {}) {
    const all = (Array.isArray(attempts) ? attempts : []).map((a, i) => ({ a, i, r: ratioOf(a), ts: Number(a && a.ts) }))
      .filter(e => e.r !== null)
      .sort((p, q) => (Number.isFinite(p.ts) && Number.isFinite(q.ts) ? p.ts - q.ts : 0) || p.i - q.i);
    all.forEach((e, i) => { e.avg = i >= 4 ? all.slice(i - 4, i + 1).reduce((x, y) => x + y.r, 0) / 5 : null; });
    const N = Math.max(2, Math.floor(Number(last)) || 30);
    const pts = all.slice(-N), n = pts.length;
    if (n < 2) return trendEmpty(pts[0]);

    const VW = 340, VH = 170, px0 = 36, px1 = VW - 42, py0 = 10, py1 = VH - 26;
    const x = i => px0 + i * (px1 - px0) / (n - 1), y = r => py1 - r * (py1 - py0);
    const line = (cls, list) => '<polyline class="' + cls + '" points="' + list.map(([i, r]) => f1(x(i)) + "," + f1(y(r))).join(" ") + '"/>';
    const grid = [0, 0.5, 1].map(r => '<line class="ch-grid" x1="' + px0 + '" x2="' + px1 + '" y1="' + y(r) + '" y2="' + y(r) + '"/>'
      + '<text class="ch-tick" text-anchor="end" x="' + (px0 - 6) + '" y="' + f1(y(r) + 3.5) + '">' + pct(r) + "</text>").join("");
    const dateOf = e => Number.isFinite(e.ts) ? md(new Date(e.ts)) : "";
    const d0 = dateOf(pts[0]) || "1回目", d1 = dateOf(pts[n - 1]) || n + "回目";
    const xl = '<text class="ch-tick" x="' + px0 + '" y="' + (VH - 8) + '">' + esc(d0) + "</text>"
      + '<text class="ch-tick" text-anchor="end" x="' + px1 + '" y="' + (VH - 8) + '">' + esc(d1 === d0 ? "最新" : d1) + "</text>";
    const avgPts = pts.map((e, i) => [i, e.avg]).filter(p => p[1] !== null);
    const hasAvg = avgPts.length >= 2;
    let marks = "";
    if (hasAvg) {
      marks += line("ch-t-raw", pts.map((e, i) => [i, e.r]))
        + pts.slice(0, -1).map((e, i) => '<circle class="ch-t-rawdot" cx="' + f1(x(i)) + '" cy="' + f1(y(e.r)) + '" r="2.5"/>').join("")
        + line("ch-t-avg", avgPts);
    } else {
      marks += line("ch-t-main", pts.map((e, i) => [i, e.r]))
        + pts.slice(0, -1).map((e, i) => '<circle class="ch-dot" cx="' + f1(x(i)) + '" cy="' + f1(y(e.r)) + '" r="3.5"/>').join("");
    }
    const lastE = pts[n - 1], lx = x(n - 1), ly = y(lastE.r);
    marks += '<circle class="ch-t-last" cx="' + f1(lx) + '" cy="' + f1(ly) + '" r="5"/>'
      + '<text class="ch-t-val ch-halo" x="' + f1(lx + 8) + '" y="' + f1(clamp(ly + 4, py0 + 8, py1 + 4)) + '">' + pct(lastE.r) + "</text>";
    const half = (px1 - px0) / (n - 1) / 2;
    const bands = pts.map((e, i) => {
      const a = Math.max(px0 - 6, x(i) - half), b = Math.min(px1 + 6, x(i) + half);
      const tip = (Number.isFinite(e.ts) ? jday(new Date(e.ts)) + "　" : "") + "得点率 " + pct(e.r) + (e.avg !== null ? "（直近5回の平均 " + pct(e.avg) + "）" : "");
      return '<g class="ch-band"><rect x="' + f1(a) + '" y="' + py0 + '" width="' + f1(b - a) + '" height="' + (py1 - py0) + '"/>'
        + '<line class="ch-cross" x1="' + f1(x(i)) + '" x2="' + f1(x(i)) + '" y1="' + py0 + '" y2="' + py1 + '"/><title>' + esc(tip) + "</title></g>";
    }).join("");

    const rs = pts.map(e => e.r), hi = Math.max(...rs), lo = Math.min(...rs);
    let label = "得点率の推移（直近" + n + "回）。最新は" + pct(lastE.r);
    if (hasAvg) label += "、直近5回の平均は" + pct(lastE.avg);
    label += "。最高" + pct(hi) + "、最低" + pct(lo) + "。";
    const leg = hasAvg
      ? legend([["ch-sw-rawdot", "1回ごと"], ["ch-sw-avg", "直近5回の平均 " + pct(lastE.avg)]], "直近" + n + "回")
      : '<p class="ch-cap">直近' + n + "回の得点率。5回たまると、平均の線も出ます。</p>";
    return fig("ch-trend", label, svg([0, 0, VW, VH], "", grid + xl + marks + bands) + leg);
  }

  // ── 弱点タグの件数（渡された順に並べる）
  function tagBars(entries = []) {
    const list = (Array.isArray(entries) ? entries : []).filter(Array.isArray)
      .map(([t, c]) => [String(t ?? ""), Math.max(0, Number(c) || 0)]);
    if (!list.length) return fig("ch-tags ch-quiet", "弱点タグはまだありません", '<p class="ch-note">まだ弱点タグはついていません。</p>');
    const max = Math.max(1, ...list.map(e => e[1]));
    const rows = list.map(([t, c]) => '<span class="ch-blabel">' + esc(t) + "</span>"
      + '<span class="ch-ttrack" title="' + esc(t + "　" + c + "回") + '">' + (c > 0 ? '<i class="ch-tfill" style="width:calc((100% - 3.4em) * ' + Math.round(c / max * 1000) / 1000 + ')"></i>' : "")
      + '<span class="ch-tval">' + fmt(c) + "回</span></span>").join("");
    return fig("ch-tags", "弱点タグの回数。" + list.map(([t, c]) => t + " " + fmt(c) + "回").join("、") + "。",
      '<div class="ch-tgrid">' + rows + "</div>");
  }

  // ── 小さな進み具合の輪（中央に 値/最大、下に見出しと補足）
  function ring({ value = 0, max = 1, label = "", sub = "" } = {}) {
    const v = Math.max(0, Number(value) || 0), m = Math.max(0, Number(max) || 0);
    const r = m > 0 ? clamp(v / m, 0, 1) : 0;
    const R = 31, sw = 7, C = 2 * Math.PI * R, c = 40;
    const vs = fmt(v), ms = "/" + fmt(m);
    let fsV = 22;
    const fsM = 11;
    while (fsV > 11 && textW(vs, fsV) * 0.95 + textW(ms, fsM) > 2 * (R - sw / 2) - 8) fsV -= 1;
    const arc = r >= 1 ? '<circle class="ch-ring-arc ch-ring-full" cx="' + c + '" cy="' + c + '" r="' + R + '"/>'
      : r > 0 ? '<circle class="ch-ring-arc" cx="' + c + '" cy="' + c + '" r="' + R + '" stroke-dasharray="' + f1(Math.max(0.1, C * r - sw)) + " " + f1(C)
        + '" transform="rotate(-90 ' + c + " " + c + ')"/>' : "";
    const num = '<text class="ch-ring-num" text-anchor="middle" x="' + c + '" y="' + f1(c + fsV * 0.36) + '"><tspan class="ch-ring-v" font-size="' + fsV + '">'
      + esc(vs) + '</tspan><tspan class="ch-ring-max" dx="1">' + esc(ms) + "</tspan></text>";
    const aria = (label ? label + "：" : "") + vs + " / " + fmt(m) + (sub ? "（" + sub + "）" : "");
    return fig("ch-ring" + (r >= 1 ? " is-full" : ""), aria,
      svg([0, 0, 80, 80], "ch-ring-svg", '<circle class="ch-ring-track" cx="' + c + '" cy="' + c + '" r="' + R + '"/>' + arc + num)
      + (label || sub ? "<figcaption>" + (label ? '<span class="ch-ring-label">' + esc(label) + "</span>" : "")
        + (sub ? '<span class="ch-ring-sub">' + esc(sub) + "</span>" : "") + "</figcaption>" : ""));
  }

  return { radar, bars, calendar, trend, tagBars, ring };
})();
