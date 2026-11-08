#!/usr/bin/env node
// スライド資料メーカー：JSON に並べたスライドを 16:9 の PNG にする
//
//   node zukai/deck.js [データ.json] [--out 出力先] [--no-png]
//
// 既定のデータは zukai/examples/workslop.json、出力先は zukai/out/<データ名>/。
// スライドの "type" ごとにレイアウトが決まっている。
//   cover      記事の見出し画像（黒帯の大見出し＋副題）
//   slop       わざと盛った「AIポン出し」資料の見本（3D風の図＋びっしりの箇条書き）
//   handoff    資料を渡す人と受け取る人の間に、ポン出し資料が流れる図
//   statement  青地に見出しと、真ん中に黒い箱ひとつ
//   expand     青地に3つの箱。中央から左右へ価値が広がる
//   process    工程を矢羽根で並べ、目に見える部分と実際の工程を比べる（工程ごとに owner: human で灰にできる）
//   three      3つの要素を × でつなぎ、説明と構成要素を添える（sub で「を生み出す力」を差し替え）
//   compare    行ごとに「ないと」「あると」を並べるケーススタディ表

const fs = require('fs');
const path = require('path');
const { parseArgs, esc, rich, makeIll, page, exportPng } = require('./common.js');

const opts = parseArgs(process.argv, path.join(__dirname, 'examples', 'workslop.json'));
const data = JSON.parse(fs.readFileSync(opts.dataPath, 'utf8'));
const outDir = opts.out || path.join(__dirname, 'out', path.basename(opts.dataPath, '.json'));
const ill = makeIll(opts.dataPath);

const FONTS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Montserrat:wght@400;500;700&display=swap';

const CSS = `
:root{--blue:#0a57bf;--ink:#404040;--bg:#efefef;--cell:#efefef;--soft:#e7eef8;--mute:#7a7a7a}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;-webkit-font-smoothing:antialiased}
em{font-style:normal;color:var(--blue)}
.ill{display:block;width:100%;height:100%}
.ill svg,.ill img{width:100%;height:100%;display:block;object-fit:contain}
.g{filter:grayscale(1)}
.abs{position:absolute}
.sl{width:1280px;height:720px;position:relative;overflow:hidden;font-family:'Noto Sans JP',sans-serif;color:var(--ink);font-feature-settings:'palt' 0}
.sl.light{background:var(--bg)}
.sl.blue{background:var(--blue);color:#fff}
.deco{position:absolute;inset:0;width:100%;height:100%}
.panel{position:absolute;left:24px;right:24px;top:166px;bottom:34px;background:#fff;border-radius:10px}
.foot{position:absolute;left:24px;right:30px;bottom:9px;display:flex;justify-content:space-between;font-size:12px;color:var(--mute)}
.blue .foot{color:#fff}
.kick{position:absolute;left:32px;right:32px;top:30px;font-size:18px;font-weight:700;color:var(--blue);letter-spacing:.04em;white-space:nowrap}
.ctr{text-align:center}

/* cover */
.cover{width:1500px;height:600px;background:#ecebea;position:relative;overflow:hidden;font-family:'Noto Sans JP',sans-serif}
.cover .lines{position:absolute;left:0;right:0;top:66px;display:flex;flex-direction:column;align-items:center;gap:32px}
.cover .lines span{background:#404040;color:#fff;font-size:126px;font-weight:700;line-height:170px;height:170px;padding:0 14px;letter-spacing:.02em;white-space:nowrap;max-width:1320px}
.cover .sub{position:absolute;left:60px;right:60px;top:472px;text-align:center;font-size:50px;font-weight:700;color:#404040;letter-spacing:.02em;white-space:nowrap}

/* slop（わざと盛ったポン出し資料） */
.stack{position:relative}
.stack .sheet{position:absolute;transform-origin:0 0;box-shadow:0 1px 3px rgba(0,0,0,.25);border:1px solid #c3c9d0}
.sheet{width:1280px;height:720px;overflow:hidden;font-family:'Noto Sans JP',sans-serif;
  background:repeating-linear-gradient(0deg,rgba(120,140,160,.07) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(120,140,160,.07) 0 1px,transparent 1px 40px),linear-gradient(135deg,#f6f8fb,#dfe6ee)}
.sheet .s-title{position:absolute;left:30px;right:30px;top:30px;text-align:center;font-size:35px;font-weight:900;color:#1d2733;white-space:nowrap}
.sheet .fig{position:absolute;left:96px;top:96px;width:560px;height:600px}
.sheet .layer{position:absolute;left:22px;font-size:17px;font-weight:700;color:#1d2733;line-height:1.3;font-family:'Montserrat','Noto Sans JP',sans-serif}
.sheet .layer small{display:block;font-size:15px;font-family:'Noto Sans JP',sans-serif}
.sheet .box{position:absolute;left:650px;top:146px;width:590px;height:510px;background:#fff;border:1px solid #c6ced8;box-shadow:0 2px 8px rgba(30,50,80,.12);padding:28px 30px 20px 50px}
.sheet .box li{font-size:24px;font-weight:700;color:#1d2733;line-height:1.5;margin-bottom:16px}
.sheet .box li:last-child{margin-bottom:0}

/* handoff */
.handoff .h-title{top:42px;left:40px;right:40px;font-size:34px;font-weight:700;white-space:nowrap}
.handoff .say{top:205px;width:420px;height:90px;font-size:30px;font-weight:700;line-height:1.45}
.handoff .pill{left:473px;top:207px;width:334px;height:80px;border-radius:40px;background:#404040;color:#fff;font-size:38px;font-weight:700;display:flex;align-items:center;justify-content:center}
.handoff .cap{left:60px;right:60px;top:604px;font-size:26px;font-weight:700;white-space:nowrap}

/* statement / expand（青地） */
.blue .b-title{left:60px;right:60px;top:92px;height:112px;font-size:38px;font-weight:700;line-height:1.45;letter-spacing:.04em}
.blue .bbox{top:360px;width:302px;height:172px;border-radius:24px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:31px;font-weight:700;line-height:1.45;letter-spacing:.04em}
.blue .bbox.black{background:#000;color:#fff}
.blue .bbox.line{border:2px solid #fff;color:#fff}
.blue .bbox.white{background:#fff;color:var(--blue)}
.blue .badge{width:58px;height:58px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 2px var(--blue);color:var(--blue);font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center}

/* process */
.process .p-title{left:32px;right:32px;top:76px;height:75px;font-size:24px;font-weight:700;line-height:1.55}
.process .note{font-size:22px;font-weight:700;text-align:center;white-space:nowrap}
.process .chev{height:60px}
.process .chev svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.process .chev span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-size:17px;font-weight:700;line-height:1.25;padding:0 10px 0 22px}
.process .skills{font-size:12.5px;font-weight:600;line-height:1.55;width:130px}
.process .skills li{list-style:none;padding-left:12px;text-indent:-12px}
.process .skills li::before{content:'・'}
.process .concl{left:66px;right:68px;top:592px;height:62px;border:2px solid #8c8c8c;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:28px}
.process .concl .lead{font-size:17px;font-weight:700}
.process .concl .to{font-size:24px}
.process .concl .main{font-size:27px;font-weight:700}

/* three */
.three .t-title{left:62px;right:62px;top:84px;font-size:35px;font-weight:700;white-space:nowrap}
.three .card{top:223px;width:302px;height:170px;border-radius:26px;background:var(--blue);color:#fff;text-align:center;padding-top:32px}
.three .card b{display:block;font-size:38px;font-weight:900;letter-spacing:.04em;line-height:1.2}
.three .card i{display:block;font-style:normal;font-size:17px;font-weight:700;margin-top:6px}
.three .card u{display:block;text-decoration:none;font-size:18px;font-weight:400;margin-top:14px;font-family:'Montserrat','Noto Sans JP',sans-serif}
.three .desc{top:414px;width:302px;height:68px;text-align:center;font-size:26px;font-weight:700;line-height:1.3}
.three .tag{top:513px;border:1.5px solid #404040;font-size:15px;font-weight:700;padding:2px 10px}
.three .parts{top:551px;width:310px;height:94px;font-size:18px;font-weight:700;line-height:1.28}
.three .parts li{list-style:none;padding-left:34px;position:relative}
.three .parts li::before{content:'•';position:absolute;left:10px}

/* compare */
.compare .c-title{left:40px;right:40px;top:86px;font-size:34px;font-weight:700;white-space:nowrap}
.compare .scene{left:58px;right:92px;top:188px;height:34px;white-space:nowrap;background:#f5f5f5;border-radius:4px;display:flex;align-items:center;gap:20px;padding-left:16px;font-size:15px;font-weight:500}
.compare .scene b{color:var(--blue);font-weight:700}
.compare .head{top:236px;font-size:26px;font-weight:700;text-align:center;white-space:nowrap}
.compare .cell{height:122px;border-radius:2px;display:flex;flex-direction:column;justify-content:center;padding:8px 18px}
.compare .lab{left:74px;width:168px;background:var(--blue);color:#fff;border-radius:10px;text-align:center;padding:0 4px}
.compare .lab b{font-size:22px;font-weight:900;white-space:nowrap}
.compare .lab i{font-style:normal;font-size:14px;font-weight:700;margin-top:4px}
.compare .bad{left:252px;width:470px;background:var(--cell)}
.compare .good{left:732px;width:474px;background:var(--soft)}
.compare .q{font-size:15px;font-weight:500;line-height:1.45}
.compare .bad .q{color:#5a5a5a}
.compare .good .q{color:#262626}
.compare .r{font-size:18.5px;font-weight:700;line-height:1.45;margin-top:2px}
.compare .bad .r{color:#262626}
.compare .good .r{color:var(--blue)}
`;

// 自動で字を縮める箱。同じ行に並べたセレクターは同じ倍率にそろえる
const FIT = [
  '.kick', '.cover .lines span', '.cover .sub',
  '.sheet .s-title', '.sheet .box',
  '.handoff .h-title', '.handoff .say', '.handoff .pill', '.handoff .cap',
  '.blue .b-title', '.blue .bbox', '.blue .badge',
  '.process .p-title', '.process .note', '.chev span', '.process .skills', '.process .concl',
  '.three .t-title', '.three .card', '.three .desc', '.three .parts',
  '.compare .c-title', '.compare .scene', '.compare .head', '.compare .lab', '.compare .bad, .compare .good',
];

// ---------------------------------------------------------------- 飾り

const DECO_LIGHT = `<svg class="deco" viewBox="0 0 1280 720" preserveAspectRatio="none">
  <path d="M-90 40C150-40 220 250 10 330" stroke="#fff" stroke-width="84" fill="none" stroke-linecap="round" opacity=".75"/>
  <path d="M1060 790C1120 650 1250 640 1330 700" stroke="#fff" stroke-width="64" fill="none" stroke-linecap="round" opacity=".75"/>
</svg>`;

const DECO_BLUE = `<svg class="deco" viewBox="0 0 1280 720" preserveAspectRatio="none" fill="none" stroke-linecap="round">
  <path d="M790-70C980 70 1330-10 1200 230S1000 560 1350 790" stroke="rgba(255,255,255,.17)" stroke-width="62"/>
  <path d="M1060 300C1100 120 1300 150 1245 330S1060 430 1060 300" stroke="rgba(255,255,255,.13)" stroke-width="48"/>
  <path d="M500 780C640 590 900 560 1010 790" stroke="rgba(255,255,255,.14)" stroke-width="56"/>
</svg>`;

const DECO_COVER = `<svg class="deco" viewBox="0 0 1500 600" preserveAspectRatio="none" fill="none" stroke-linecap="round">
  <path d="M120-40C300 60 520 70 660-40" stroke="#fff" stroke-width="54"/>
  <path d="M-50 330C50 200 110 80 140-50" stroke="#44c7cf" stroke-width="72"/>
  <path d="M-70 380C40 470 90 560 120 670" stroke="#f47a4d" stroke-width="92"/>
  <path d="M1270-50C1320 60 1400 150 1550 205" stroke="#f47a4d" stroke-width="80"/>
  <path d="M1555 205C1400 265 1325 405 1360 650" stroke="#0a57bf" stroke-width="86"/>
  <path d="M1300 660C1380 545 1460 505 1570 505" stroke="#f47a4d" stroke-width="70"/>
  <path d="M520 650C700 560 900 570 1010 650" stroke="#fff" stroke-width="40"/>
</svg>`;

const foot = (n) => `<div class="foot"><span>${rich(data.byline)}</span><span>${n}</span></div>`;

// ---------------------------------------------------------------- わざと盛った資料の3D風の図

function isoFigure() {
  const cx = 290, w = 200, h = 92, t = 18;
  const plate = (cy, top) => `
    <path d="M${cx - w} ${cy}L${cx} ${cy - h}L${cx + w} ${cy}L${cx} ${cy + h}Z" fill="${top}" stroke="#8e9bab" stroke-width="1.3"/>
    <path d="M${cx - w * 0.82} ${cy}L${cx} ${cy - h * 0.82}L${cx + w * 0.82} ${cy}L${cx} ${cy + h * 0.82}Z" fill="none" stroke="#aab6c3" stroke-width="1" stroke-dasharray="6 4"/>
    <path d="M${cx - w} ${cy}L${cx} ${cy + h}V${cy + h + t}L${cx - w} ${cy + t}Z" fill="#b9c4cf"/>
    <path d="M${cx} ${cy + h}L${cx + w} ${cy}V${cy + t}L${cx} ${cy + h + t}Z" fill="#9dabb9"/>`;
  const person = (x, y) => `<circle cx="${x}" cy="${y - 34}" r="7" fill="#2c3440"/><rect x="${x - 8}" y="${y - 26}" width="16" height="30" rx="6" fill="#3a4554"/>`;
  const gear = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#6d7c8d" stroke-width="${r * 0.45}" stroke-dasharray="4 3"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#8796a6"/>`;
  const cube = (x, y, s, hh) => `
    <path d="M${x - s} ${y}L${x} ${y - s / 2}L${x + s} ${y}L${x} ${y + s / 2}Z" fill="#cfd8e2" stroke="#7f8d9c" stroke-width=".8"/>
    <path d="M${x - s} ${y}L${x} ${y + s / 2}V${y + s / 2 + hh}L${x - s} ${y + hh}Z" fill="#8d9bab"/>
    <path d="M${x} ${y + s / 2}L${x + s} ${y}V${y + hh}L${x} ${y + s / 2 + hh}Z" fill="#6f7e8f"/>
    <path d="M${x - s + 6} ${y + 10}L${x - 6} ${y + s / 2 + 4}M${x - s + 6} ${y + 18}L${x - 6} ${y + s / 2 + 12}" stroke="#5fb0ff" stroke-width="2"/>`;
  const callout = (x, y) => `<g><rect x="${x}" y="${y}" width="96" height="30" fill="#fff" stroke="#97a4b2" stroke-width=".8"/>
    <text x="${x + 5}" y="${y + 10}" font-size="6" font-family="Montserrat" font-weight="700" fill="#4c5866">CRITICAL FAILURE LATENCY THRESHOLD</text>
    <text x="${x + 5}" y="${y + 18}" font-size="6" font-family="Montserrat" fill="#4c5866">COORDINATE: 14.42°N  0.031°E</text>
    <text x="${x + 5}" y="${y + 26}" font-size="6" font-family="Montserrat" fill="#4c5866">SYNC VARIANCE &gt; 0.73 σ</text></g>`;
  let wave = '';
  for (let i = 0, x = 50; x <= 530; i++, x += 10) {
    const spike = i % 7 === 3 ? 58 : i % 5 === 1 ? 36 : 14;
    wave += `${i ? 'L' : 'M'}${x} ${400 + (i % 2 ? -1 : 1) * spike * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.3)))} `;
  }
  return `<svg class="fig" viewBox="0 0 560 600" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="glow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7ab8ff" stop-opacity=".1"/><stop offset=".5" stop-color="#7ab8ff" stop-opacity=".55"/><stop offset="1" stop-color="#7ab8ff" stop-opacity=".1"/></linearGradient></defs>
  ${plate(470, '#d5dde6')}
  ${cube(220, 450, 26, 34)}${cube(270, 470, 26, 34)}${cube(330, 455, 26, 34)}${cube(380, 478, 22, 28)}
  <path d="M170 480l20-34 26 8M410 470l-18-30-24 10" stroke="#4c5866" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="${cx - 26}" y="140" width="52" height="340" fill="url(#beam)"/>
  <path d="M${cx - 70} 160V450M${cx + 70} 160V450" stroke="#7ab8ff" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>
  ${plate(300, '#dfe6ee')}
  ${gear(220, 290, 22)}${gear(258, 270, 14)}${gear(350, 300, 20)}
  <path d="M300 268l26-13 26 13-26 13z" fill="#2f7de0" opacity=".85"/><path d="M300 268v16l26 13v-16z" fill="#1d4f9e"/>
  <path d="${wave}" stroke="#5fa8ff" stroke-width="7" fill="none" filter="url(#glow)" opacity=".8"/>
  <path d="${wave}" stroke="#1a5fcf" stroke-width="2.6" fill="none" stroke-linejoin="round"/>
  ${callout(20, 330)}${callout(400, 430)}${callout(30, 470)}
  ${plate(130, '#e6ecf2')}
  ${person(232, 128)}${person(262, 112)}${person(300, 104)}${person(330, 122)}${person(362, 132)}
  <path d="M278 60h34v20h-22l-8 7v-7h-4z" fill="#fff" stroke="#6d7c8d"/><path d="M340 74h28v16h-18l-6 6v-6h-4z" fill="#fff" stroke="#6d7c8d"/>
</svg>`;
}

function slopSheet(s) {
  const tops = [150, 316, 486];
  return `<div class="sheet">
    <p class="s-title">${rich(s.title)}</p>
    ${isoFigure()}
    ${(s.layers || []).map(([en, ja], i) => `<p class="layer" style="top:${tops[i]}px">${esc(en)}<small>（${esc(ja)}）</small></p>`).join('')}
    <ul class="box">${(s.bullets || []).map((b) => `<li>${rich(b)}</li>`).join('')}</ul>
  </div>`;
}

// 同じ資料が何枚も重なっている様子。width は一番手前の1枚の幅
function slopStack(s, width, gap, thumb = false) {
  const k = width / 1280;
  const sheets = [2, 1, 0].map((i) => `<div class="sheet-wrap abs${i ? ' behind' : ''}" style="left:${i * gap}px;top:${i * gap}px">
    ${slopSheet(s).replace('<div class="sheet">', `<div class="sheet" style="transform:scale(${k});transform-origin:0 0;box-shadow:0 1px 3px rgba(0,0,0,.25);outline:1px solid #b9c0c8">`)}</div>`).join('');
  return `<div class="stack${thumb ? ' mini' : ''}" style="width:${width + gap * 2}px;height:${720 * k + gap * 2}px">${sheets}</div>`;
}

// ---------------------------------------------------------------- 各レイアウト

const R = {
  cover(s) {
    return { w: 1500, h: 600, html: `<div class="cover">${DECO_COVER}
      <div class="lines">${s.lines.map((l) => `<span>${rich(l)}</span>`).join('')}</div>
      <p class="sub">${rich(s.sub)}</p></div>` };
  },

  slop(s, n) {
    return { w: 1280, h: 720, html: `<div class="sl" style="background:#fff">
      <div class="abs" style="left:46px;top:30px">${slopStack(s, 1140, 24)}</div>
      ${foot(n)}</div>` };
  },

  handoff(s, n) {
    const slop = data.slides.find((x) => x.type === 'slop');
    const band = `<svg class="deco" viewBox="0 0 1280 720"><path d="M300 420H905V395L972 462L905 530V505H300Z" fill="#808080"/></svg>`;
    return { w: 1280, h: 720, html: `<div class="sl light handoff">${DECO_LIGHT}
      <p class="abs ctr h-title">${rich(s.title)}</p>
      <div class="panel" style="top:125px"></div>
      <p class="abs ctr say" style="left:30px">${rich(s.left)}</p>
      <div class="abs pill">${rich(s.center)}</div>
      <p class="abs ctr say" style="left:815px">${rich(s.right)}</p>
      ${band}
      <div class="abs" style="left:96px;top:350px;width:280px;height:280px">${ill(s.giver)}</div>
      <div class="abs" style="left:900px;top:346px;width:280px;height:280px">${ill(s.taker, 'g')}</div>
      ${slop ? `<div class="abs" style="left:428px;top:338px">${slopStack(slop, 400, 10, true)}</div>` : ''}
      <p class="abs ctr cap">${rich(s.caption)}</p>
      ${foot(n)}</div>` };
  },

  statement(s, n) {
    return { w: 1280, h: 720, html: `<div class="sl blue">${DECO_BLUE}
      <p class="abs ctr b-title">${rich(s.title)}</p>
      <div class="abs bbox black" style="left:489px">${rich(s.box)}</div>
      ${foot(n)}</div>` };
  },

  expand(s, n) {
    const box = (b, x, kind) => `<div class="abs bbox ${kind}" style="left:${x}px">${rich(b.text)}</div>
      <div class="abs badge" style="left:${x - 14}px;top:346px">${rich(b.badge)}</div>`;
    const arrows = `<svg class="deco" viewBox="0 0 1280 720" fill="#d9d9d9">
      <path d="M488 430H458V412L428 442L458 472V454H488Z"/><path d="M792 430H822V412L852 442L822 472V454H792Z"/></svg>`;
    return { w: 1280, h: 720, html: `<div class="sl blue">${DECO_BLUE}
      <p class="abs ctr b-title">${rich(s.title)}</p>
      ${arrows}
      ${box(s.left, 132, 'line')}${box(s.center, 489, 'white')}${box(s.right, 846, 'line')}
      ${foot(n)}</div>` };
  },

  process(s, n) {
    const x0 = 73, step = 141.5, cw = 147, tip = 22;
    const chev = (i, y, style) => {
      const notch = i === 0 ? `0 60` : `0 60 ${tip} 30`;
      const pts = `0 0 ${cw - tip} 0 ${cw} 30 ${cw - tip} 60 ${notch}`;
      const look = style === 'ghost'
        ? `fill="#f6f6f6" stroke="#b5b5b5" stroke-width="1.6" stroke-dasharray="6 4"`
        : `fill="${style === 'gray' ? '#9a9a9a' : 'var(--blue)'}"`;
      const label = style === 'ghost' ? '' : `<span>${rich(s.steps[i].name)}</span>`;
      return `<div class="abs chev" style="left:${x0 + i * step}px;top:${y}px;width:${cw}px">
        <svg viewBox="0 0 ${cw} 60" preserveAspectRatio="none"><polygon points="${pts}" ${look}/></svg>${label}</div>`;
    };
    const skills = (i, y, hh) => `<ul class="abs skills" style="left:${x0 + i * step + 10}px;top:${y}px;height:${hh}px">${s.steps[i].skills.map((k) => `<li>${rich(k)}</li>`).join('')}</ul>`;
    const f = s.focus;
    const fx = x0 + f * step;
    const top = s.steps.map((_, i) => chev(i, 263, i === f ? 'gray' : 'ghost')).join('');
    // 工程に owner が書いてあれば、human は灰・それ以外は青。なければ focus の工程だけ灰
    const owned = s.steps.some((st) => st.owner);
    const bottom = s.steps.map((st, i) => chev(i, 438, (owned ? st.owner === 'human' : i === f) ? 'gray' : 'blue')).join('');
    const under = s.steps.map((_, i) => skills(i, 505, 84)).join('');
    const xEnd = x0 + (s.steps.length - 1) * step + cw;
    const dbl = (xa, xb, y, color, sw, head) => `<path d="M${xa + head} ${y}H${xb - head}" stroke="${color}" stroke-width="${sw}"/>
      <path d="M${xa} ${y}l${head} -${head * 0.6}v${head * 1.2}z M${xb} ${y}l-${head} -${head * 0.6}v${head * 1.2}z" fill="${color}"/>`;
    return { w: 1280, h: 720, html: `<div class="sl light process">${DECO_LIGHT}
      <p class="kick">${rich(s.kicker)}</p>
      <p class="abs p-title">${rich(s.title)}</p>
      <div class="panel"></div>
      <p class="abs note" style="left:${fx + cw / 2 - 260}px;width:520px;top:200px">${rich(s.visible)}</p>
      <svg class="deco" viewBox="0 0 1280 720">${dbl(fx + 2, fx + cw - 8, 251, '#6f6f6f', 4, 14)}${dbl(x0, xEnd, 422, 'var(--blue)', 3, 14)}</svg>
      ${top}${skills(f, 332, 46)}
      <p class="abs note" style="left:0;right:0;top:380px">${rich(s.actual)}</p>
      ${bottom}${under}
      <div class="abs concl"><span class="lead">${rich(s.lead)}</span><span class="to">→</span><span class="main">${rich(s.conclusion)}</span></div>
      ${foot(n)}</div>` };
  },

  three(s, n) {
    const xs = [132, 489, 846];
    const cards = s.items.map((it, i) => `
      <div class="abs card" style="left:${xs[i]}px"><b>${rich(it.name)}</b><i>${rich(it.sub ?? 'を生み出す力')}</i>${it.en ? `<u>${esc(it.en)}：${esc(it.ja)}</u>` : ''}</div>
      <p class="abs desc" style="left:${xs[i]}px">${rich(it.desc)}</p>
      <p class="abs tag" style="left:${xs[i]}px">構成要素</p>
      <ul class="abs parts" style="left:${xs[i]}px">${it.parts.map((p) => `<li>${rich(p)}</li>`).join('')}</ul>`).join('');
    const cross = (x) => `<path d="M${x - 15} 293l30 30M${x + 15} 293l-30 30" stroke="#c9c9c9" stroke-width="7" stroke-linecap="round"/>`;
    return { w: 1280, h: 720, html: `<div class="sl light three">${DECO_LIGHT}
      <p class="kick">${rich(s.kicker)}</p>
      <p class="abs t-title">${rich(s.title)}</p>
      <div class="panel"></div>
      <svg class="deco" viewBox="0 0 1280 720">${cross(461)}${cross(818)}</svg>
      ${cards}
      ${foot(n)}</div>` };
  },

  compare(s, n) {
    const ys = [281, 411, 541];
    const rows = s.rows.map((r, i) => `
      <div class="abs cell lab" style="top:${ys[i]}px"><b>${rich(r.name)}</b><i>${rich(r.q)}</i></div>
      <div class="abs cell bad" style="top:${ys[i]}px"><p class="q">${rich(r.bad)}</p><p class="r">→ ${rich(r.badResult)}</p></div>
      <div class="abs cell good" style="top:${ys[i]}px"><p class="q">${rich(r.good)}</p><p class="r">→ ${rich(r.goodResult)}</p></div>`).join('');
    return { w: 1280, h: 720, html: `<div class="sl light compare">${DECO_LIGHT}
      <p class="kick">${rich(s.kicker)}</p>
      <p class="abs ctr c-title">${rich(s.title)}</p>
      <div class="panel"></div>
      <div class="abs scene"><b>シーン</b><span>${rich(s.scene)}</span></div>
      <p class="abs head" style="left:252px;width:470px">${rich(s.heads[0])}</p>
      <p class="abs head" style="left:732px;width:474px;color:var(--blue)">${rich(s.heads[1])}</p>
      ${rows}
      ${foot(n)}</div>` };
  },
};

// ---------------------------------------------------------------- 書き出し

const htmlDir = path.join(outDir, 'html');
fs.mkdirSync(htmlDir, { recursive: true });
const jobs = [];
let num = 0;
data.slides.forEach((s, i) => {
  const make = R[s.type];
  if (!make) throw new Error(`知らないスライドの種類: ${s.type}`);
  if (s.type !== 'cover') num++;
  const { w, h, html } = make(s, num);
  const name = `${String(i + 1).padStart(2, '0')}-${s.type}`;
  const file = path.join(htmlDir, `${name}.html`);
  const title = String(s.title || (s.lines || []).join('') || name).replace(/\[\[|\]\]/g, '');
  fs.writeFileSync(file, page(title, FONTS, CSS, html, FIT));
  jobs.push({ file, png: path.join(outDir, `${name}.png`), w, h, scale: 2 });
});
console.log(`HTML: ${path.relative(process.cwd(), htmlDir)}/ に ${jobs.length} 枚`);
if (ill.report()) console.log(ill.report());
if (opts.png) exportPng(jobs).catch((e) => { console.error(e); process.exit(1); });
