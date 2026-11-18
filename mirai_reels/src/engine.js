/* みらキャン リール共通部品
 * 場面（カット）の切り替え、見出しのポン、アイコンのふわっと、ロゴ、飾り、安全領域のチェック、再生と書き出しのつなぎ。
 * 各リールは reels/Rxx.js で REEL({...}) を呼び、build(K) の中でこの部品を使って組み立てる。 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render');
const W = 1080, H = 1920, FPS = 30;
// 配色は「直近1か月_R01-R09_制作指示」の指定どおり。navy は R02・R05・R08 の指定色
const COL = {
  cream: '#F6EDE2', coral: '#EE7A5C', mint: '#BFE6D3', pink: '#F4D6CC', yellow: '#F6CD5A',
  ink: '#4A3328', sub: '#7A6556', navy: '#222C62', white: '#FFFFFF',
  coralD: '#D9603F', mintD: '#3E9F73', sky: '#86C2EC', skyD: '#3B88C7', lilac: '#B9A3E3', orange: '#F29B38', brown: '#8A5A3B',
};
// 安全領域：上220・下400・右140には文字を置かない。大事な文字は y=285〜1635。両方を満たす範囲
const SAFE = { top: 285, bottom: 1520, left: 40, right: 940 };
const SHAPE = {
  star: 'M0 -30 L7 -9 L29 -9 L11 4 L18 25 L0 12 L-18 25 L-11 4 L-29 -9 L-7 -9Z',
  spark: 'M0 -30 C4 -6 6 -4 30 0 C6 4 4 6 0 30 C-4 6 -6 4 -30 0 C-6 -4 -4 -6 0 -30Z',
  heart: 'M0 20 C-34 -4 -32 -30 -14 -32 C-5 -33 0 -25 0 -20 C0 -25 5 -33 14 -32 C32 -30 34 -4 0 20Z',
  maple: 'M0 -40 L6 -18 L24 -28 L18 -8 L40 -6 L22 6 L30 22 L10 16 L4 36 L0 26 L-4 36 L-10 16 L-30 22 L-22 6 L-40 -6 L-18 -8 L-24 -28 L-6 -18Z',
  ginkgo: 'M0 30 C-6 18 -30 -2 -34 -20 Q-18 -34 -3 -26 L0 -16 L3 -26 Q18 -34 34 -20 C30 -2 6 18 0 30Z',
};

let DEF = null;
function REEL(def) { DEF = def; }

function loadReel() {
  const id = Q.get('id') || 'R01';
  if (RENDER) document.body.classList.add('render');
  const pick = $('#pick');
  if (pick) { pick.value = id; pick.onchange = () => { location.search = '?id=' + pick.value; }; }
  const s = document.createElement('script');
  s.src = `reels/${id}.js`;
  s.onload = () => buildReel(id);
  document.head.appendChild(s);
}

function buildReel(id) {
  const data = (window.REELS_DATA || []).find(r => r.id === id) || {};
  const K = makeKit(DEF, data);
  DEF.build(K);
  K.finish();
  window.STAGE = {
    id, date: data.date, title: data.title, file: DEF.file, status: data.status || '',
    suffix: K.fileSuffix(), w: W, h: H, fps: FPS, dur: DEF.dur, cover: K.coverT, checks: K.checkTimes,
  };
  window.__seek = t => { K.tl.seek(t, false); };
  window.__safeCheck = t => K.safeCheck(t);
  ready(K);
}

function makeKit(def, data) {
  const stage = $('#stage');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const K = { tl, stage, C: COL, data, def, checkTimes: [], coverT: 0, _prev: null, _cuts: [] };
  const T = .4; // 横スライドの長さ

  /* ---------- カット ---------- */
  // list: [{d: 秒, bg, burst: [色1, 色2], dots}] を順に並べ、横スライドでつなぐ
  K.cuts = list => {
    let t = 0;
    const out = list.map((c, i) => {
      const s = t, e = t + c.d; t = e;
      const el = document.createElement('section');
      el.className = 'scene' + (c.dots ? ' dots' : '');
      el.style.backgroundColor = c.bg || COL.cream;
      stage.appendChild(el);
      if (c.burst) {
        const b = document.createElement('div');
        b.className = 'burst';
        b.style.background = `repeating-conic-gradient(${c.burst[0]} 0deg 8deg, ${c.burst[1]} 10deg 18deg, ${c.burst[0]} 20deg)`;
        el.appendChild(b);
        tl.fromTo(b, { rotation: 0 }, { rotation: 18, duration: c.d + T, ease: 'none' }, Math.max(0, s - T / 2));
      }
      if (s === 0) gsap.set(el, { visibility: 'visible' });
      else {
        const prev = K._prev;
        gsap.set(el, { xPercent: 100 });
        tl.set(el, { visibility: 'visible' }, s - T / 2);
        tl.to(el, { xPercent: 0, duration: T, ease: 'power3.inOut' }, s - T / 2);
        tl.to(prev, { xPercent: -30, duration: T, ease: 'power3.inOut' }, s - T / 2);
        tl.set(prev, { visibility: 'hidden' }, s + T / 2 + .02);
        K.cue(s - T / 2, 'slide');
      }
      K._prev = el;
      K.checkTimes.push(+(e - .3).toFixed(2));
      return { el, s, e, i };
    });
    K._cuts = out;
    K.coverT = +(out[0].e - .3).toFixed(2);
    return out;
  };

  /* ---------- 文字 ---------- */
  const box = (el, cls, o) => {
    const d = document.createElement('div');
    d.className = cls;
    d.style.top = o.top + 'px';
    if (o.size) d.style.fontSize = o.size + 'px';
    if (o.color) d.style.color = o.color;
    if (o.weight) d.style.fontWeight = o.weight;
    if (o.shadow) d.style.textShadow = o.shadow === true ? '0 6px 0 rgba(74,51,40,.18)' : o.shadow;
    if (o.lh) d.style.lineHeight = o.lh;
    el.appendChild(d);
    return d;
  };
  // 見出し：1語ずつポンと出る（0.2秒の拡大バウンド）。words は文字列か {t, c, s}、'\n' で改行
  K.words = (el, words, o) => {
    const d = box(el, 'txt t', o);
    const spans = [];
    words.forEach(w => {
      if (w === '\n') { d.appendChild(document.createElement('br')); return; }
      const sp = document.createElement('span');
      sp.className = 'w';
      sp.style.display = 'inline-block';
      if (typeof w === 'object') { sp.textContent = w.t; if (w.c) sp.style.color = w.c; if (w.s) sp.style.fontSize = w.s + 'px'; }
      else sp.textContent = w;
      d.appendChild(sp);
      spans.push(sp);
    });
    gsap.set(spans, { scale: .3, opacity: 0, y: 26, transformOrigin: '50% 80%' });
    spans.forEach((sp, i) => {
      const t = o.at + i * (o.gap ?? .18);
      tl.to(sp, { scale: 1, opacity: 1, y: 0, duration: .2, ease: 'back.out(2.8)' }, t);
      K.cue(t, 'pop');
    });
    return d;
  };
  // ふつうの行：下からすっと出る
  K.line = (el, html, o) => {
    const d = box(el, 'txt t', o);
    d.innerHTML = html;
    gsap.set(d, { y: 24, opacity: 0 });
    tl.to(d, { y: 0, opacity: 1, duration: .3 }, o.at);
    return d;
  };
  // 小さな注記（出典など）
  K.note = (el, lines, o) => {
    const d = box(el, 'note t', { size: 26, ...o });
    d.innerHTML = lines.join('<br>');
    gsap.set(d, { opacity: 0 });
    tl.to(d, { opacity: 1, duration: .3 }, o.at);
    return d;
  };
  // 角丸のラベル
  K.pill = (el, text, o) => {
    const row = box(el, 'pillrow', { top: o.top });
    const p = document.createElement('span');
    p.className = 'pill tb';
    p.textContent = text;
    p.style.cssText = `background:${o.bg || COL.ink};color:${o.color || '#fff'};font-size:${o.size || 44}px;padding:${o.pad || '8px 34px 12px'}`;
    row.appendChild(p);
    gsap.set(p, { scale: 0 });
    tl.to(p, { scale: 1, duration: .25, ease: 'back.out(2.6)' }, o.at);
    K.cue(o.at, 'pop');
    return p;
  };
  // 丸の中の番号・記号
  K.num = (el, label, o) => {
    const d = document.createElement('div');
    d.className = 'badge tb';
    const dd = o.d || 220;
    d.style.cssText = `left:${o.cx - dd / 2}px;top:${o.cy - dd / 2}px;width:${dd}px;height:${dd}px;background:${o.bg};color:${o.color};font-size:${o.size || dd * .62}px;padding-bottom:${dd * .06}px;${o.ring ? `box-shadow:0 0 0 ${o.ring}px ${o.ringColor || '#fff'}` : 'box-shadow:0 10px 0 rgba(74,51,40,.14)'}`;
    d.textContent = label;
    el.appendChild(d);
    gsap.set(d, { scale: 0, rotation: -25 });
    tl.to(d, { scale: 1, rotation: 0, duration: .3, ease: 'back.out(2.4)' }, o.at);
    K.cue(o.at, 'pop');
    return d;
  };
  // 吹き出し（白）。from: 'left' | 'right' からスライドイン
  K.bubble = (el, html, o) => {
    const d = document.createElement('div');
    d.className = 'bubble tb';
    d.style.cssText = `top:${o.top}px;font-size:${o.size || 64}px;${o.width ? `width:${o.width}px;left:${540 - o.width / 2}px` : ''}`;
    d.innerHTML = `<span class="t">${html}</span><i class="tail ${o.tail || 'bl'}"></i>`;
    el.appendChild(d);
    gsap.set(d, { x: o.from === 'right' ? 240 : -240, opacity: 0 });
    tl.to(d, { x: 0, opacity: 1, duration: .4, ease: 'back.out(1.4)' }, o.at);
    K.cue(o.at, 'slide');
    return d;
  };
  // 黄色のマーカー線
  K.marker = (el, o) => {
    const m = document.createElement('div');
    m.className = 'marker';
    m.style.cssText = `left:${o.left}px;top:${o.top}px;width:${o.width}px;height:${o.h || 34}px;background:${o.color || COL.yellow}`;
    el.appendChild(m);
    gsap.set(m, { scaleX: 0, transformOrigin: '0% 50%' });
    tl.to(m, { scaleX: 1, duration: .35, ease: 'power2.inOut' }, o.at);
    return m;
  };
  // 文字の入った白いカード（R05 の開催情報など）
  K.card = (el, html, o) => {
    const d = document.createElement('div');
    d.className = 'card';
    d.style.cssText = `top:${o.top}px;${o.bg ? `background:${o.bg}` : ''}`;
    d.innerHTML = html;
    el.appendChild(d);
    gsap.set(d, { y: 40, opacity: 0 });
    tl.to(d, { y: 0, opacity: 1, duration: .35 }, o.at);
    return d;
  };

  /* ---------- 絵 ---------- */
  // アイコン：ふわっと出て、カットの終わりまで軽く揺れる
  K.icon = (el, inner, o) => {
    const d = document.createElement('div');
    d.className = 'ico';
    const sz = o.size || 240;
    d.style.cssText = `left:${o.cx - sz / 2}px;top:${o.cy - sz / 2}px;width:${sz}px;height:${sz}px`;
    d.innerHTML = `<svg viewBox="${o.vb || '0 0 200 200'}">${inner}</svg>`;
    el.appendChild(d);
    gsap.set(d, { opacity: 0, y: 30, scale: .7, transformOrigin: '50% 80%' });
    tl.to(d, { opacity: 1, y: 0, scale: 1, duration: .45, ease: 'power2.out' }, o.at);
    K.cue(o.at, 'soft');
    if (o.until && o.sway !== 0) {
      const amp = o.sway || 4, per = .6;
      const n = Math.max(1, Math.floor((o.until - o.at - .45) / per));
      tl.fromTo(d, { rotation: -amp }, { rotation: amp, duration: per, ease: 'sine.inOut', yoyo: true, repeat: n - 1, immediateRender: false }, o.at + .45);
    }
    return d;
  };
  // 小さな飾り（星・キラキラ・ハート・もみじ）
  K.deco = (el, kind, color, cx, cy, size) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '-42 -42 84 84');
    s.setAttribute('class', 'deco');
    s.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px`;
    s.innerHTML = `<path d="${SHAPE[kind]}" fill="${color}"/>`;
    el.appendChild(s);
    return s;
  };
  // 星やキラキラを散らす：ポンと出て、そのあと小さくまたたく
  K.scatter = (el, list, at, until) => {
    const els = list.map(([kind, color, x, y, s]) => K.deco(el, kind, color, x, y, s));
    gsap.set(els, { scale: 0, rotation: -60 });
    tl.to(els, { scale: 1, rotation: 0, duration: .3, ease: 'back.out(3)', stagger: .06 }, at);
    K.cue(at, 'sparkle');
    if (until) els.forEach((e, i) => tl.to(e, { scale: .6, duration: .35, yoyo: true, repeat: Math.max(1, Math.floor((until - at - .6) / .35)) - 1, ease: 'sine.inOut', immediateRender: false }, at + .4 + (i % 3) * .1));
    return els;
  };
  // 光の粒（小さな円）がまたたく
  K.twinkle = (el, n, area, at, until, colors) => {
    const [x0, y0, x1, y1] = area;
    let seed = n * 97 + x0;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      const r = 6 + rnd() * 12;
      c.className = 'blob';
      c.style.cssText = `left:${x0 + rnd() * (x1 - x0)}px;top:${y0 + rnd() * (y1 - y0)}px;width:${r * 2}px;height:${r * 2}px;background:${colors[i % colors.length]};box-shadow:0 0 ${r}px ${colors[i % colors.length]}`;
      el.appendChild(c);
      gsap.set(c, { opacity: 0, scale: .4 });
      const p = .4 + rnd() * .5;
      const reps = Math.max(1, Math.floor((until - at) / p) - 1);
      tl.fromTo(c, { opacity: .15, scale: .5 }, { opacity: 1, scale: 1.1, duration: p, ease: 'sine.inOut', yoyo: true, repeat: reps, immediateRender: false }, at + rnd() * .6);
    }
  };
  // 上からひらひら落ちる（もみじ・雪）
  K.fall = (el, kind, colors, at, until, n, size = 60) => {
    let seed = n * 31 + 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < n; i++) {
      const x = 60 + rnd() * 960, s = size * (.7 + rnd() * .6), dur = 3.2 + rnd() * 2, delay = rnd() * 2.2;
      let e;
      if (kind === 'snow') {
        e = document.createElement('div');
        e.className = 'blob';
        e.style.cssText = `width:${s / 3}px;height:${s / 3}px;background:${colors[i % colors.length]}`;
        el.appendChild(e);
      } else e = K.deco(el, kind, colors[i % colors.length], 0, 0, s);
      gsap.set(e, { x, y: -120, left: 0, top: 0 });
      const reps = Math.max(0, Math.floor((until - at - delay) / dur));
      tl.fromTo(e, { y: -120 }, { y: 1980, duration: dur, ease: 'none', repeat: reps, immediateRender: false }, at + delay);
      tl.fromTo(e, { x: x - 40, rotation: -40 }, { x: x + 40, rotation: 40, duration: dur / 3, ease: 'sine.inOut', yoyo: true, repeat: (reps + 1) * 3 - 1, immediateRender: false }, at + delay);
    }
  };
  // 画面下からのぞく丸い顔
  K.faces = (el, list, at, until) => {
    const els = list.map(([o, cx, cy, size]) => {
      const d = document.createElement('div');
      d.className = 'face';
      d.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px`;
      d.innerHTML = `<svg viewBox="0 0 200 200">${faceInner(o)}</svg>`;
      el.appendChild(d);
      return d;
    });
    gsap.set(els, { y: 380 });
    tl.to(els, { y: 0, duration: .5, ease: 'back.out(1.6)', stagger: .1 }, at);
    if (until) els.forEach((d, i) => tl.to(d, { rotation: i % 2 ? 7 : -7, duration: .4, yoyo: true, repeat: Math.max(1, Math.floor((until - at - .8) / .4)) - 1, ease: 'sine.inOut', immediateRender: false }, at + .6));
    return els;
  };
  // 大きな円の飾り（背景）
  K.blob = (el, color, cx, cy, d, at, until) => {
    const b = document.createElement('div');
    b.className = 'blob';
    b.style.cssText = `left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px;background:${color}`;
    el.insertBefore(b, el.firstChild?.nextSibling || null);
    if (until) tl.fromTo(b, { x: -20, y: 10 }, { x: 20, y: -10, duration: until - at, ease: 'sine.inOut', immediateRender: false }, at);
    return b;
  };

  /* ---------- ロゴ ---------- */
  // 県章（KIシンボル、白い角丸の台）は全カットの上中央。MIRAI CANVAS は最初と最後のカットだけ
  K.finish = () => {
    const cuts = K._cuts, first = cuts[0], last = cuts[cuts.length - 1];
    const ki = document.createElement('div');
    ki.id = 'ki';
    ki.innerHTML = '<img src="../assets/logos/ki_symbol_b-1-1.png" alt="神奈川県">';
    const mi = document.createElement('div');
    mi.id = 'mirai';
    mi.innerHTML = '<img src="../assets/logos/mirai_canvas_logo.png" alt="MIRAI CANVAS">';
    stage.append(ki, mi);
    if (cuts.length > 1) {
      tl.to(mi, { opacity: 0, duration: .15 }, first.e - .25);
      tl.to(mi, { opacity: 1, duration: .25 }, last.s + .1);
    }
    // 仮の文言のまま公開しないための注意書き（R09 など）
    if (data.texts_status === '仮') {
      const w = document.createElement('div');
      w.id = 'draft';
      w.textContent = '仮の文言。差し替えてから公開';
      stage.appendChild(w);
    }
    const g = document.createElement('div');
    g.id = 'grain';
    stage.appendChild(g);
    grain(g);
    $$('.draw', stage).forEach(p => { const L = Math.ceil(p.getTotalLength()) + 2; p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; });
    const safe = document.createElement('div');
    safe.id = 'safe';
    safe.innerHTML = '<i style="left:0;right:0;top:0;height:220px"></i><i style="left:0;right:0;bottom:0;height:400px"></i><i style="right:0;top:220px;bottom:400px;width:140px"></i>';
    stage.appendChild(safe);
    tl.set({}, {}, def.dur);
  };
  K.fileSuffix = () => {
    let s = '';
    if (/確認後/.test(data.status || '')) s += '_確認待ち';
    if (data.texts_status === '仮') s += '_仮文言';
    return s;
  };

  /* ---------- 効果音の目印（書き出しは無音。音を付けるときの手がかりとして残す） ---------- */
  K.cues = [];
  K.cue = (t, type) => K.cues.push({ t: +t.toFixed(3), type });

  /* ---------- 安全領域のチェック ---------- */
  K.safeCheck = t => {
    tl.seek(t, false);
    const bad = [];
    const shown = el => {
      let op = 1;
      for (let e = el; e && e !== stage; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none') return false;
        op *= +cs.opacity;
      }
      return getComputedStyle(el).visibility === 'visible' && op > .05;
    };
    const check = (el, r) => {
      const text = el.textContent.trim().slice(0, 24);
      if (!text) return;
      const out = [];
      if (r.top < SAFE.top - .5) out.push(`上 ${Math.round(r.top)}`);
      if (r.bottom > SAFE.bottom + .5) out.push(`下 ${Math.round(r.bottom)}`);
      if (r.right > SAFE.right + .5) out.push(`右 ${Math.round(r.right)}`);
      if (r.left < SAFE.left - .5) out.push(`左 ${Math.round(r.left)}`);
      if (out.length) bad.push(`${text}：${out.join('・')}`);
    };
    $$('.t', stage).forEach(el => {
      if (!shown(el)) return;
      const rg = document.createRange();
      rg.selectNodeContents(el);
      check(el, rg.getBoundingClientRect());
    });
    $$('.tb', stage).forEach(el => { if (shown(el)) check(el, el.getBoundingClientRect()); });
    return bad;
  };
  return K;
}

/* ---------- 顔（こども・おとな。冬は毛糸の帽子） ---------- */
function faceInner(o) {
  const skin = o.skin || '#FFDCC0', hair = o.hair || '#5A3E2B', ink = '#4A3328';
  let back = '', h = '';
  switch (o.style) {
    case 'bob': h = `<path d="M36 124 C28 56 68 30 100 30 C132 30 172 56 164 124 C158 100 150 88 140 82 C122 94 80 94 60 82 C50 88 42 100 36 124Z" fill="${hair}"/>`; break;
    case 'pig': h = `<circle cx="30" cy="96" r="24" fill="${hair}"/><circle cx="170" cy="96" r="24" fill="${hair}"/><path d="M42 106 C40 56 72 38 100 38 C128 38 160 56 158 106 C144 86 124 76 100 78 C76 76 56 86 42 106Z" fill="${hair}"/>`; break;
    case 'tuft': h = `<path d="M46 98 C48 60 72 44 100 44 C128 44 152 60 154 98 C138 82 120 76 100 78 C80 76 62 82 46 98Z" fill="${hair}"/><path d="M94 48 C88 30 102 18 118 22 C108 28 106 38 110 48Z" fill="${hair}"/>`; break;
    case 'long': back = `<path d="M30 178 C20 80 50 30 100 30 C150 30 180 80 170 178Z" fill="${hair}"/>`; h = `<path d="M44 102 C46 56 74 40 100 40 C126 40 154 56 156 102 C140 80 116 72 100 76 C84 72 60 80 44 102Z" fill="${hair}"/>`; break;
    default: h = `<path d="M40 104 C38 56 70 36 100 36 C134 36 164 58 160 104 C150 86 130 72 106 76 C98 64 86 62 76 66 C66 76 52 86 40 104Z" fill="${hair}"/>`;
  }
  const hat = o.hat ? `<path d="M36 100 C36 34 164 34 164 100Z" fill="${o.hat}"/><rect x="30" y="88" width="140" height="24" rx="12" fill="${o.hat2 || '#fff'}"/><circle cx="100" cy="34" r="17" fill="${o.hat2 || '#fff'}"/>` : '';
  const eyes = o.eyes === 'dot'
    ? `<circle cx="78" cy="118" r="7.5" fill="${ink}"/><circle cx="122" cy="118" r="7.5" fill="${ink}"/>`
    : `<path d="M68 121 Q78 107 88 121" fill="none" stroke="${ink}" stroke-width="6.5" stroke-linecap="round"/><path d="M112 121 Q122 107 132 121" fill="none" stroke="${ink}" stroke-width="6.5" stroke-linecap="round"/>`;
  const mouth = o.mouth === 'smile'
    ? `<path d="M84 138 Q100 156 116 138" fill="none" stroke="${ink}" stroke-width="6.5" stroke-linecap="round"/>`
    : `<path d="M82 134 Q100 166 118 134 Z" fill="#E0605A" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
  return `${back}<circle cx="40" cy="120" r="13" fill="${skin}"/><circle cx="160" cy="120" r="13" fill="${skin}"/><circle cx="100" cy="116" r="62" fill="${skin}"/>${o.hat ? '' : h}${hat}${eyes}<ellipse cx="64" cy="138" rx="11" ry="7" fill="#FF9EA0" opacity=".8"/><ellipse cx="136" cy="138" rx="11" ry="7" fill="#FF9EA0" opacity=".8"/>${mouth}`;
}
const FACES = [
  { style: 'bob', skin: '#FFDCC0', hair: '#5A3E2B' },
  { style: 'tuft', skin: '#F3C29B', hair: '#2E2420', mouth: 'smile' },
  { style: 'pig', skin: '#FFE2CC', hair: '#8A5A3B', eyes: 'dot' },
  { style: 'short', skin: '#E9B38A', hair: '#3B2A22', mouth: 'smile' },
  { style: 'long', skin: '#F7CDA8', hair: '#3B2A22', mouth: 'smile' },
];

/* ---------- 紙の質感（シード固定のノイズ） ---------- */
function grain(el) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'), im = g.createImageData(256, 256);
  let s = 7;
  for (let i = 0; i < im.data.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = 128 + ((s >> 16) % 128) - 64;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  el.style.background = `url(${c.toDataURL()}) repeat`;
}

/* ---------- 読み込み待ちと再生 ---------- */
async function ready(K) {
  const stage = $('#stage');
  const fit = () => {
    if (RENDER) { stage.style.transform = 'none'; return; }
    stage.style.transform = `scale(${Math.min(innerWidth / W, (innerHeight - 64) / H)})`;
  };
  addEventListener('resize', fit);
  fit();
  try {
    const text = stage.textContent + '仮の文言。差し替えてから公開';
    await Promise.all(['500', '700', '900'].map(w => document.fonts.load(`${w} 40px "ZenMaru"`, text)));
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  } catch (e) { /* 読み込みに失敗しても再生は続ける */ }
  window.__ready = true;
  if (!RENDER) player(K);
}

function player(K) {
  const tl = K.tl, dur = DEF.dur;
  const btn = $('#btnPlay'), seek = $('#seek'), time = $('#time');
  seek.max = dur;
  const ui = () => {
    seek.value = tl.time();
    time.textContent = `${tl.time().toFixed(1)} / ${dur.toFixed(1)}`;
    btn.textContent = tl.paused() ? '▶' : '❚❚';
  };
  tl.eventCallback('onUpdate', ui);
  tl.eventCallback('onComplete', () => tl.restart());
  btn.onclick = () => { tl.paused(!tl.paused()); ui(); };
  $('#btnRestart').onclick = () => { tl.restart(); ui(); };
  seek.oninput = () => { tl.seek(+seek.value, false); ui(); };
  $('#btnSafe').onclick = () => $('#safe').classList.toggle('on');
  tl.play(0);
  ui();
}
