/* overlay.js — 3Dの上に重ねる文字（見出し・吹き出し・効果文字・給料カウンター）と場面転換 */
const EPISODES = []; // シリーズの登録先。episodes/*.js が push する
const STAGE_W = 1280, STAGE_H = 720;

function popScale(t, t0, d = 0.18) {
  const u = prog(t, t0, t0 + d);
  return u >= 1 ? 1 : 0.4 + 0.6 * ease.back(u);
}
function project(vec, camera) {
  const v = vec.clone().project(camera);
  return { x: ((v.x + 1) / 2) * STAGE_W, y: ((1 - v.y) / 2) * STAGE_H };
}
const yen = (v) => '¥' + Math.floor(v).toLocaleString('ja-JP');

class Overlay {
  constructor(root, items) {
    this.root = root;
    root.textContent = '';
    this.items = items.map((it) => Object.assign({}, it, { el: this.make(it) }));
  }
  make(it) {
    const el = document.createElement('div');
    el.className = 'ov ov-' + it.type;
    el.hidden = true;
    if (it.type === 'caption') {
      it.lines.forEach((ln) => {
        const d = document.createElement('div');
        d.className = 'cap-line ' + (ln.cls || '');
        const s = document.createElement('span');
        d.appendChild(s);
        el.appendChild(d);
      });
    } else if (it.type === 'bubble') {
      el.innerHTML = '<span class="b-text"></span><i class="b-tail"></i>';
      el.firstChild.textContent = it.text;
    } else if (it.type === 'counter') {
      el.innerHTML = '<small></small><b></b>';
      el.firstChild.textContent = it.label;
    } else {
      el.textContent = it.text;
    }
    this.root.appendChild(el);
    return el;
  }
  update(t, view) {
    for (const it of this.items) {
      const on = t >= it.t0 && t < it.t1 && (!it.scene || it.scene === view.sceneId);
      if (it.el.hidden !== !on) it.el.hidden = !on;
      if (on) this[it.type](it, t, view);
    }
  }
  caption(it, t) {
    it.lines.forEach((ln, i) => {
      const chars = Array.from(ln.text);
      const n = ln.at == null ? chars.length : clamp(Math.floor((t - ln.at) * (ln.cps || 14)) + 1, 0, chars.length);
      const line = it.el.children[i], span = line.firstChild;
      if (span.dataset.n !== String(n)) { span.textContent = chars.slice(0, n).join(''); span.dataset.n = n; }
      line.style.visibility = n > 0 ? 'visible' : 'hidden';
      line.classList.toggle('done', n >= chars.length);
    });
  }
  bubble(it, t, view) {
    const p = project(it.anchor(), view.camera);
    if (!it.w) it.w = it.el.offsetWidth;
    const w = it.w || 200;
    const left = clamp(p.x - w / 2, 16, STAGE_W - 16 - w);
    it.el.style.left = left + 'px';
    it.el.style.top = p.y + 'px';
    it.el.style.setProperty('--tail', clamp(p.x - left, 18, w - 18) + 'px');
    it.el.style.transform = `translate(0, -100%) scale(${popScale(t, it.t0)})`;
  }
  fx(it, t, view) {
    const s = popScale(t, it.t0, 0.14);
    const j = it.shake ? Math.sin(t * 47) * 4 : 0, k = it.shake ? Math.cos(t * 39) * 3 : 0;
    const p = it.anchor ? project(it.anchor(), view.camera) : { x: 0, y: 0 };
    it.el.style.left = p.x + (it.x || 0) + j + 'px';
    it.el.style.top = p.y + (it.y || 0) + k + 'px';
    it.el.style.fontSize = (it.size || 58) + 'px';
    it.el.style.transform = `translate(-50%, -50%) rotate(${it.rot || 0}deg) scale(${s})`;
  }
  float(it, t, view) {
    const u = prog(t, it.t0, it.t1);
    const p = project(it.anchor(), view.camera);
    it.el.style.left = p.x + 'px';
    it.el.style.top = p.y - 70 * ease.out(u) + 'px';
    it.el.style.opacity = String(1 - Math.max(0, (u - 0.6) / 0.4));
  }
  tag(it, t, view) {
    if (it.anchor) {
      const p = project(it.anchor(), view.camera);
      it.el.style.left = p.x + 'px'; it.el.style.top = p.y + 'px';
      it.el.style.transform = `translate(-50%, 0) scale(${popScale(t, it.t0)})`;
      it.el.classList.add('anchored');
    } else {
      it.el.style.transform = `scale(${popScale(t, it.t0)})`;
    }
  }
  badge(it, t) { it.el.style.transform = `scale(${popScale(t, it.t0)})`; }
  counter(it, t) {
    const txt = (it.format || yen)(it.value(t));
    const b = it.el.lastChild;
    if (b.textContent !== txt) b.textContent = txt;
    it.el.classList.toggle('done', !!(it.done && it.done(t)));
    it.el.style.transform = `scale(${popScale(t, it.t0)})`;
  }
}

/* ブロック状に画面を埋めて戻す場面転換 */
class Wipe {
  constructor(canvas, cuts, color = '#1d2333') {
    this.g = canvas.getContext('2d');
    this.cuts = cuts; this.color = color;
    this.cols = 32; this.rows = 18;
    const r = mulberry32(7);
    this.th = [];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++)
      this.th.push(0.55 * ((x / this.cols) * 0.7 + (y / this.rows) * 0.3) + 0.4 * r());
  }
  draw(t) {
    const g = this.g, half = 0.24;
    g.clearRect(0, 0, STAGE_W, STAGE_H);
    let cover = 0;
    for (const c of this.cuts) if (Math.abs(t - c) < half) cover = Math.max(cover, 1 - Math.abs(t - c) / half);
    if (cover <= 0) return;
    const cw = STAGE_W / this.cols, chh = STAGE_H / this.rows, lvl = cover * 1.05;
    g.fillStyle = this.color;
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++)
      if (this.th[y * this.cols + x] < lvl) g.fillRect(Math.floor(x * cw), Math.floor(y * chh), Math.ceil(cw), Math.ceil(chh));
  }
}
