#!/usr/bin/env node
// 図解メーカー：JSON から縦長4:3の図解と、作り方を説明する16:9のスライド2枚を作る
//
//   node zukai/build.js [データ.json] [--out 出力先] [--no-png]
//
// 既定のデータは zukai/examples/ai_hanasu.json、出力先は zukai/out。
// HTML を書き出したあと、Playwright があれば PNG にする。
//   out/zukai.png          図解の完成版（2160×2880）
//   out/slide1.png         ①ざっくり書いて、素材を渡して、大枠を作ってもらう（3840×2160）
//   out/slide2.png         ②粘り強く何度もフィードバックして、たまに褒める（3840×2160）
//   out/stages/stageN.png  1〜5回目の版（スライド2の縮小図に使う）

const fs = require('fs');
const path = require('path');
const { ILLUST } = require('./illust.js');
const { parseArgs, esc, rich, makeIll, page: htmlPage, exportPng } = require('./common.js');

const opts = parseArgs(process.argv, path.join(__dirname, 'examples', 'ai_hanasu.json'));
const dataPath = opts.dataPath;
const outDir = opts.out || path.join(__dirname, 'out');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// ---------------------------------------------------------------- 部品

const ill = makeIll(dataPath);

const ARROW_RIGHT = '<svg viewBox="0 0 48 32"><path d="M4 16h36M28 5l12 11-12 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 32 40"><path d="M16 4v30M7 25l9 9 9-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const FONTS = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800;900&family=Montserrat:wght@700;800;900&display=swap';

const CSS = `
:root{--blue:#0a57bf;--blue-soft:#e8f0fb;--gray:#6f747a;--ink:#404040;--sub:#6b7076;--mute:#8a8f96;--line:#d7d8dc;--fill:#f2f3f5;
  --font:'Montserrat','M PLUS Rounded 1c','Hiragino Maru Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased}
em{font-style:normal;color:var(--blue)}
.ill{display:inline-block;flex:none}
.ill svg,.ill img{width:100%;height:100%;display:block;object-fit:contain}
.arrow{color:var(--sub);display:flex;align-items:center;justify-content:center}

/* ---------- 図解（1080×1440） ---------- */
.dia{width:1080px;height:1440px;padding:52px 64px 0;overflow:hidden;position:relative}
.dia .top{display:flex;justify-content:space-between;align-items:baseline;gap:24px}
.dia .kicker{font-size:27px;font-weight:800;color:var(--sub);letter-spacing:.02em}
.dia .byline{font-size:19px;font-weight:800;color:var(--sub);white-space:nowrap}
.dia .title{font-size:64px;font-weight:900;line-height:1.2;margin-top:18px;white-space:nowrap}
.dia .compare{display:grid;grid-template-columns:1fr 1fr;column-gap:64px;margin-top:44px}
.dia .hdr{border-radius:15px;padding:20px 26px 22px;color:#fff}
.dia .before .hdr{background:var(--gray)}
.dia .after .hdr{background:var(--blue)}
.dia .tag{display:block;font-family:'Montserrat',sans-serif;font-weight:800;font-size:18px;letter-spacing:.14em}
.dia .hdr strong{display:block;font-size:35px;font-weight:900;margin-top:6px;letter-spacing:.02em;white-space:nowrap}
.dia .before .ill{filter:grayscale(1)}

.dia .chat{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.dia .msg{display:flex;align-items:center;gap:14px}
.dia .msg.me{justify-content:flex-end}
.dia .msg .ill{width:74px;height:74px;margin:-12px 0}
.dia .bubble{font-size:22.5px;font-weight:800;line-height:1.45;padding:8px 18px;border-radius:18px;max-width:356px}
.dia .before .me .bubble{background:var(--fill);color:var(--sub)}
.dia .before .ai .bubble{background:#fff;border:2px solid var(--line);color:var(--sub)}
.dia .after .me .bubble{background:var(--fill);color:var(--ink)}
.dia .after .ai .bubble{background:#fff;border:2.5px solid #3d3d3d;color:var(--ink)}
.dia .after .bubble.accent{background:var(--blue);border-color:var(--blue);color:#fff}
.dia .chat-note{font-size:20px;font-weight:500;color:var(--mute);text-align:center;margin-top:10px}

.dia .scene{display:flex;justify-content:space-around;align-items:flex-end;margin-top:22px;min-height:170px}
.dia .actor{display:flex;flex-direction:column;align-items:center;gap:8px}
.dia .actor .ill{width:104px;height:104px}
.dia .scene .bubble{font-size:18px;padding:7px 14px;border-radius:14px;white-space:nowrap}
.dia .scene .chat-note{font-size:16px}

.dia .rows{margin-top:22px}
.dia .rlabel{text-align:center;font-size:21px;font-weight:800;color:var(--sub);margin:16px 0 10px}
.dia .rows .group:first-child .rlabel{margin-top:0}
.dia .row{display:grid;grid-template-columns:1fr 64px 1fr;align-items:center}
.dia .row .arrow svg{width:40px}
.dia .cell{height:72px;border-radius:12px;display:flex;align-items:center;padding:0 26px;font-size:28px;letter-spacing:.02em}
.dia .cell.b{border:2px solid var(--line);color:var(--sub);font-weight:700}
.dia .cell.a{background:var(--fill);color:var(--ink);font-weight:900}
.dia .rline{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin:10px 0}
.dia .rline .rlabel{margin:0 12px}
.dia .rline .arrow svg{width:22px}

.dia .callout{margin-top:44px;background:var(--fill);border-radius:16px;padding:24px 36px 26px 28px;display:flex;gap:28px;align-items:center}
.dia .callout .ill{width:130px;height:130px}
.dia .c-title{font-size:32px;font-weight:900;color:var(--ink)}
.dia .c-title small{font-size:20px;font-weight:500;color:var(--mute);margin-left:14px}
.dia .c-body{font-size:26.5px;font-weight:800;color:var(--ink);line-height:1.62;margin-top:8px}

/* 1〜2回目：タイトルが薄く、見出しは塗りではなく枠 */
.dia.st1 .title,.dia.st2 .title{font-size:56px;font-weight:800;color:var(--sub)}
.dia.st1 .before .hdr,.dia.st2 .before .hdr{background:var(--fill);color:var(--ink)}
.dia.st1 .before .tag,.dia.st2 .before .tag{color:var(--sub)}
.dia.st1 .after .hdr,.dia.st2 .after .hdr{background:#fff;border:3px solid var(--blue);color:var(--blue)}
/* 1〜2回目：左右の箱を色で分けていない */
.dia.st1 .cell.b,.dia.st2 .cell.b{border:none;background:var(--fill);color:var(--ink);font-weight:800}
/* 1回目：イラストが見出しや吹き出しに重なっている */
.dia.st1 .after .scene{margin-top:-46px}
.dia.st1 .actor .bubble{margin-bottom:-30px;position:relative;z-index:1}
.dia.st1 .row .arrow{visibility:hidden}
/* 1〜3回目は会話が短いぶん、下の段に余白を回す */
.dia.draft .rows{margin-top:60px}
.dia.draft .rlabel{margin:30px 0 12px}
.dia.draft .callout{margin-top:64px}
/* 4回目：3つのかたまりが詰まっていて切れ目が見えない */
.dia.st4 .chat-note{margin-top:6px}
.dia.st4 .rows{margin-top:8px}
.dia.st4 .rlabel{margin:6px 0 6px}
.dia.st4 .callout{margin-top:14px}

/* ---------- スライド（1920×1080） ---------- */
.slide{width:1920px;height:1080px;padding:44px 72px 0;position:relative;overflow:hidden}
.slide .s-top{display:flex;justify-content:space-between;align-items:baseline}
.slide .s-kicker{font-size:27px;font-weight:800;color:var(--sub);letter-spacing:.02em}
.slide .s-page{font-size:25px;font-weight:800;color:var(--sub);white-space:nowrap}
.slide .s-page b{font-family:'Montserrat',sans-serif;margin-right:26px}
.slide .s-title{font-size:57px;font-weight:900;margin-top:6px;line-height:1.3}

.s1 .cols{display:grid;grid-template-columns:600px 372px 372px 60px 290px;column-gap:20px;margin-top:26px}
.s1 .bar{height:60px;border-radius:10px;background:var(--gray);color:#fff;font-size:28px;font-weight:900;display:flex;align-items:center;padding:0 22px;gap:22px}
.s1 .bar b{font-family:'Montserrat',sans-serif;font-size:26px}
.s1 .bar.blue{background:var(--blue)}
.s1 .body{margin-top:16px}
.s1 .card{border:2px solid var(--line);border-radius:16px;padding:20px 22px 10px}
.s1 .card p{font-size:22.5px;font-weight:800;line-height:1.6;margin-bottom:9px}
.s1 .card em{background:var(--blue-soft);border-radius:3px;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:1px 1px}
.s1 .asks{display:flex;flex-direction:column;align-items:flex-end;gap:14px}
.s1 .asks p{background:var(--fill);border-radius:20px;padding:16px 22px;font-size:25px;font-weight:800;line-height:1.55}
.s1 .asks .note{background:none;padding:6px 0 0;font-size:22px;font-weight:500;color:var(--mute);text-align:right;border-radius:0}
.s1 .sheets{position:relative;height:300px}
.s1 .sheet{position:absolute;background:#fff;border:1.5px solid #c9ccd1;display:grid;grid-template-columns:repeat(9,1fr);gap:4px 3px;padding:8px}
.s1 .sheet .ill{width:100%;aspect-ratio:1}
.s1 .sheet.back{top:0;left:42px;right:0;height:270px;opacity:.9}
.s1 .sheet.front{top:26px;left:0;right:42px;height:274px;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.s1 .sheet .g{filter:grayscale(1)}
.s1 .a-title{font-size:31px;font-weight:900;margin-top:20px}
.s1 .a-sub{font-size:23px;font-weight:800;color:var(--sub);margin-top:10px}
.s1 .used{display:flex;gap:14px;margin-top:16px}
.s1 .used .ill{width:58px;height:58px}
.s1 .bigarrow{color:var(--sub);padding-top:220px;display:flex;justify-content:center}
.s1 .bigarrow svg{width:44px}
.s1 .thumb{width:290px;border:2px solid var(--line);border-radius:10px;display:block}
.s1 .t-note{font-size:23px;font-weight:600;color:var(--sub);line-height:1.6;margin-top:14px}
.s1 .take{position:absolute;left:72px;right:72px;bottom:36px;background:var(--fill);border-radius:18px;padding:22px 30px;font-size:26px;font-weight:800;line-height:1.7}

.s2 .steps{display:grid;grid-template-columns:repeat(5,317px);column-gap:48px;margin-top:30px}
.s2 .step{position:relative}
.s2 .s-head{font-size:37px;font-weight:900;display:flex;align-items:baseline;gap:14px}
.s2 .s-head b{font-family:'Montserrat',sans-serif;font-size:46px}
.s2 .thumb{width:270px;height:360px;object-fit:cover;object-position:top;border:2px solid var(--line);border-radius:8px;display:block;margin-top:18px}
.s2 .next{position:absolute;left:283px;top:250px;width:70px;color:var(--sub)}
.s2 .next svg{width:44px}
.s2 .react{height:46px;margin-top:16px;font-size:28px;font-weight:900;color:var(--blue);display:flex;align-items:center}
.s2 .react.note{font-size:24px;font-weight:500;color:var(--mute)}
.s2 .lbl{font-size:25px;font-weight:800;color:var(--sub);margin-top:4px}
.s2 .box{border:2px solid var(--line);border-radius:14px;padding:16px 14px;font-size:25px;font-weight:800;line-height:1.55;margin-top:10px}
.s2 .box.last{color:var(--blue)}
`;

// 自動で字を縮める箱（common.js の fitScript）
const FIT = ['.dia .title', '.dia .hdr', '.dia .cell'];
const page = (title, body) => htmlPage(title, FONTS, CSS, body, FIT);

// ---------------------------------------------------------------- 図解

// 5回の版の違い。元のスライド2の「次への指摘」で直した点をそのまま切り替える
function stageFlags(n) {
  return {
    chat: n >= 4 ? 'full' : 'draft', // 4回目「チャットっぽく、もっと雑談しよう」
    arrows: n === 1 ? 'none' : n === 2 ? 'down' : 'right', // 2回目は上下、3回目「左右でつないで」
    order: n === 1 ? [0, 2, 1] : [0, 1, 2], // 初版は段の並びが違った
  };
}

function bubble(m) {
  return `<div class="bubble${m.accent ? ' accent' : ''}">${rich(m.text)}</div>`;
}

function chatFull(col) {
  const msgs = col.chat.map((m) => {
    const who = m.who === 'ai' ? 'ai' : 'me';
    const av = ill(m.illust);
    return `<div class="msg ${who}">${who === 'me' ? bubble(m) + av : av + bubble(m)}</div>`;
  }).join('');
  return `<div class="chat">${msgs}</div>${col.note ? `<p class="chat-note">${rich(col.note)}</p>` : ''}`;
}

function chatDraft(col) {
  const d = col.draft || {};
  const said = (who) => (d.bubbles || []).filter((b) => (b.who === 'ai' ? 'ai' : 'me') === who).map(bubble).join('');
  return `<div class="scene">
    <div class="actor">${said('me')}${ill(d.me)}</div>
    <div class="actor">${said('ai')}${ill(d.ai)}</div>
  </div>${d.note ? `<p class="chat-note">${rich(d.note)}</p>` : ''}`;
}

function column(col, side, flags) {
  return `<div class="col ${side}">
    <div class="hdr"><span class="tag">${esc(col.tag)}</span><strong>${rich(col.head)}</strong></div>
    ${flags.chat === 'full' ? chatFull(col) : chatDraft(col)}
  </div>`;
}

function rows(list, flags) {
  const ordered = flags.order.filter((i) => list[i]).map((i) => list[i]);
  const arrow = flags.arrows === 'right' ? `<div class="arrow">${ARROW_RIGHT}</div>` : '<div class="arrow"></div>';
  return ordered.map((r, i) => {
    const label = flags.arrows === 'down' && i > 0
      ? `<div class="rline"><div class="arrow">${ARROW_DOWN}</div><p class="rlabel">${rich(r.label)}</p><div class="arrow">${ARROW_DOWN}</div></div>`
      : `<p class="rlabel">${rich(r.label)}</p>`;
    return `<div class="group">${label}<div class="row"><div class="cell b">${rich(r.before)}</div>${arrow}<div class="cell a">${rich(r.after)}</div></div></div>`;
  }).join('');
}

function diagram(n = 5) {
  const d = data.diagram;
  const flags = stageFlags(n);
  const c = d.callout;
  return `<div class="dia st${n} ${flags.chat === 'draft' ? 'draft' : ''}">
  <header class="top"><p class="kicker">${rich(d.kicker)}</p><p class="byline">${rich(data.byline)}</p></header>
  <h1 class="title">${rich(d.title)}</h1>
  <section class="compare">${column(d.before, 'before', flags)}${column(d.after, 'after', flags)}</section>
  <section class="rows">${rows(d.rows, flags)}</section>
  ${c ? `<aside class="callout">${ill(c.illust)}<div>
    <p class="c-title">${rich(c.title)}${c.aside ? `<small>${rich(c.aside)}</small>` : ''}</p>
    <p class="c-body">${rich(c.body)}</p></div></aside>` : ''}
</div>`;
}

// ---------------------------------------------------------------- スライド

function slideTop(s, i, total) {
  return `<header class="s-top"><p class="s-kicker">${rich(s.kicker)}</p><p class="s-page"><b>${i} / ${total}</b>${rich(data.byline)}</p></header>
  <h1 class="s-title">${rich(s.title)}</h1>`;
}

function contactSheet(seed) {
  // 素材集の pptx を一覧にした様子。手持ちのイラストを並べ替えて敷き詰める
  const names = Object.keys(ILLUST);
  let out = '';
  for (let k = 0; k < 54; k++) {
    const name = names[(k * 7 + seed * 3 + Math.floor(k / 9)) % names.length];
    out += ill(name, (k * 5 + seed) % 3 === 0 ? 'g' : '');
  }
  return out;
}

function slide1(s, total) {
  const t = s.text, a = s.asks, m = s.assets, f = s.first;
  return `<div class="slide s1">${slideTop(s, 1, total)}
  <div class="cols">
    <div><div class="bar blue"><b>1</b>${rich(t.head)}</div>
      <div class="body card">${t.paras.map((p) => `<p>${rich(p)}</p>`).join('')}</div></div>
    <div><div class="bar"><b>2</b>${rich(a.head)}</div>
      <div class="body asks">${a.items.map((q) => `<p>${rich(q)}</p>`).join('')}${a.note ? `<p class="note">${rich(a.note)}</p>` : ''}</div></div>
    <div><div class="bar"><b>3</b>${rich(m.head)}</div>
      <div class="body"><div class="sheets"><div class="sheet back">${contactSheet(1)}</div><div class="sheet front">${contactSheet(2)}</div></div>
        <p class="a-title">${rich(m.title)}</p><p class="a-sub">${rich(m.sub)}</p>
        <div class="used">${(m.used || []).map((u) => ill(u)).join('')}</div></div></div>
    <div class="bigarrow">${ARROW_RIGHT}</div>
    <div><div class="bar">${rich(f.head)}</div>
      <div class="body"><img class="thumb" src="../stages/stage1.png" alt=""><p class="t-note">${rich(f.note)}</p></div></div>
  </div>
  <p class="take">${rich(s.takeaway)}</p>
</div>`;
}

function slide2(s, total) {
  const steps = data.stages.map((st, i) => {
    const n = i + 1;
    const react = st.reaction ? `<p class="react${st.praise ? '' : ' note'}">${rich(st.reaction)}</p>` : '<p class="react"></p>';
    const tail = st.last
      ? `<p class="lbl">完成時のひとこと</p><p class="box last">${rich(st.last)}</p>`
      : `<p class="lbl">次への指摘</p><p class="box">${rich(st.feedback)}</p>`;
    const next = n < data.stages.length ? `<div class="next">${ARROW_RIGHT}</div>` : '';
    return `<div class="step"><p class="s-head"><b>${n}</b>${rich(st.name)}</p>
      <img class="thumb" src="../stages/stage${n}.png" alt="">${next}${react}${tail}</div>`;
  }).join('');
  return `<div class="slide s2">${slideTop(s, 2, total)}<div class="steps">${steps}</div></div>`;
}

// ---------------------------------------------------------------- 書き出し

const htmlDir = path.join(outDir, 'html');
fs.mkdirSync(htmlDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'stages'), { recursive: true });

const title = data.diagram.title.replace(/\[\[|\]\]/g, '');
const jobs = [];
const stageCount = data.stages?.length || 5;
for (let n = 1; n <= stageCount; n++) {
  const file = path.join(htmlDir, `stage${n}.html`);
  fs.writeFileSync(file, page(`${title}（${n}回目）`, diagram(n)));
  jobs.push({ file, png: path.join(outDir, 'stages', `stage${n}.png`), w: 1080, h: 1440, scale: 1 });
}
const finalHtml = path.join(htmlDir, 'zukai.html');
fs.writeFileSync(finalHtml, page(title, diagram(stageCount)));
jobs.push({ file: finalHtml, png: path.join(outDir, 'zukai.png'), w: 1080, h: 1440, scale: 2 });

const slides = data.slides || [];
const makers = [slide1, slide2];
slides.forEach((s, i) => {
  if (!makers[i]) return;
  const file = path.join(htmlDir, `slide${i + 1}.html`);
  fs.writeFileSync(file, page(s.kicker, makers[i](s, slides.length)));
  jobs.push({ file, png: path.join(outDir, `slide${i + 1}.png`), w: 1920, h: 1080, scale: 2 });
});
console.log(`HTML: ${path.relative(process.cwd(), htmlDir)}/ に ${jobs.length} 枚`);
if (ill.report()) console.log(ill.report());

// 版ごとの縮小図をスライドが読み込むので、図解から先に撮る
if (opts.png) exportPng(jobs).catch((e) => { console.error(e); process.exit(1); });
