/*
 * SPOON豊前 紹介動画 — 描画エンジン
 * イージング、色、書体、文字組み（1文字ずつのアニメーション）、基本図形。
 * 時刻 t（秒）を渡すと毎回同じ絵が出る「決定的」な描画にしてあるので、
 * ブラウザ再生とMP4書き出しで同じ映像になります。
 */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const W = 1920, H = 1080;
  Object.assign(SV, { W, H, DURATION: 60 });

  /* ---------- 数値 ---------- */
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    lin: x => x,
    inQ: x => x * x,
    outQ: x => 1 - (1 - x) * (1 - x),
    inC: x => x * x * x,
    outC: x => 1 - Math.pow(1 - x, 3),
    inOutC: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: x => 1 - Math.pow(1 - x, 4),
    inOutQuart: x => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    outQuint: x => 1 - Math.pow(1 - x, 5),
    outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    outBack: x => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    outBackSoft: x => {
      const c1 = 1.1, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    outBounce: x => {
      const n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
  };

  /* 乱数（シード固定） */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 色 ---------- */
  // オレンジ・黄・ベージュは SPOON 公式LPで使われている色
  const C = {
    grey: '#E6E9ED',       // 買い出しの場面の地色
    greyTrack: '#D2D8DF',
    greyMid: '#9BA4AE',
    greyInk: '#2C323A',
    greySub: '#66707B',
    greyDone: '#BEC5CD',
    lost: ['#CF5A43', '#DA7560', '#C44E38', '#DC7C68'],
    lostText: '#C24E38',
    orange: '#F59423',
    orangeSoft: '#FFB45C',
    yellow: '#FFCC43',
    beige: '#F8F6E9',
    track: '#E7DFC9',
    tick: '#C8BDA3',
    line: '#E3DAC4',
    ink: '#2B2522',
    sub: '#6E655D',
    green: '#5DAA62',
    white: '#FFFFFF'
  };

  const rgbCache = {};
  function rgb(hex) {
    let v = rgbCache[hex];
    if (v) return v;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache[hex] = v;
    return v;
  }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }
  function alpha(hex, a) {
    const A = rgb(hex);
    return `rgba(${A[0]},${A[1]},${A[2]},${a})`;
  }

  /* ---------- 書体 ---------- */
  const FAM = {
    maru: '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "BIZ UDPGothic", "Meiryo", sans-serif',
    kaku: '"Zen Kaku Gothic New", "Hiragino Sans", "Noto Sans JP", "Meiryo", sans-serif',
    num: '"Fredoka", "Zen Maru Gothic", "Arial Rounded MT Bold", sans-serif'
  };
  const F = {
    head: s => `900 ${s}px ${FAM.maru}`,
    headM: s => `700 ${s}px ${FAM.maru}`,
    text: s => `700 ${s}px ${FAM.kaku}`,
    textR: s => `500 ${s}px ${FAM.kaku}`,
    num: s => `600 ${s}px ${FAM.num}`,
    numB: s => `700 ${s}px ${FAM.num}`
  };

  /* ---------- 文字組み ---------- */
  let mcache = new Map();
  function resetMeasure() { mcache = new Map(); }
  function measure(ctx, font, ch) {
    const key = font + '\u0000' + ch;
    let w = mcache.get(key);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(ch).width;
      mcache.set(key, w);
    }
    return w;
  }

  // 約物の空きを詰める（palt の簡易版）
  const HALF_AFTER = new Set(['、', '。', '，', '．', '」', '』', '）', '】']);
  const HALF_BEFORE = new Set(['「', '『', '（', '【']);

  // '{…}' → 数字用の書体、'[…]' → マーカー付き、にランを分ける
  function rich(str, o = {}) {
    const runs = [];
    const re = /\{([^}]*)\}|\[([^\]]*)\]/g;
    let last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) runs.push({ s: str.slice(last, m.index) });
      if (m[1] !== undefined) runs.push({ s: m[1], f: o.numFont || 'numB', k: o.k || 1.08, c: o.numColor });
      else runs.push({ s: m[2], mark: true });
      last = re.lastIndex;
    }
    if (last < str.length) runs.push({ s: str.slice(last) });
    return runs;
  }

  function layout(ctx, content, size, font, color, ls) {
    const runs = typeof content === 'string' ? rich(content) : content;
    const chars = [];
    let x = 0;
    for (const r of runs) {
      const fs = size * (r.k || 1);
      const fstr = F[r.f || font](fs);
      const col = r.c || color;
      const lsp = (r.ls != null ? r.ls : ls || 0) * fs;
      for (const ch of Array.from(r.s)) {
        const w = measure(ctx, fstr, ch);
        let adv = w, dx = 0;
        if (w > fs * 0.8) {
          if (HALF_AFTER.has(ch)) adv = w * 0.5;
          else if (HALF_BEFORE.has(ch)) { dx = -w * 0.5; adv = w * 0.5; }
          else if (ch === '・') { dx = -w * 0.25; adv = w * 0.5; }
        }
        chars.push({ ch, font: fstr, color: col, x: x + dx, w, adv, mark: !!r.mark, size: fs });
        x += adv + lsp;
      }
    }
    return { chars, width: x, size };
  }

  function textWidth(ctx, content, o = {}) {
    return layout(ctx, content, o.size || 64, o.font || 'head', o.color || C.ink, o.ls).width;
  }

  /*
   * 文字を描く。
   *  o.t   … 登場開始からの経過秒（未指定なら最初から表示）
   *  o.out … 退場開始からの経過秒（負なら退場前）
   *  o.mode … 'rise'（下からせり上がる）| 'pop'（弾んで出る）| 'fade'
   *  o.mark … { p: 0〜1, color } マーカーの伸び具合
   */
  function text(ctx, content, x, y, o = {}) {
    const size = o.size || 64;
    const L = layout(ctx, content, size, o.font || 'head', o.color || C.ink, o.ls);
    let x0 = x;
    if (o.align === 'center') x0 = x - L.width / 2;
    else if (o.align === 'right') x0 = x - L.width;
    const baseA = o.alpha == null ? 1 : o.alpha;
    const st = o.st == null ? 0.03 : o.st;
    const d = o.d == null ? 0.5 : o.d;
    const ost = o.ost == null ? 0.012 : o.ost;
    const od = o.od == null ? 0.35 : o.od;
    const mode = o.mode || 'rise';
    const n = L.chars.length;

    if (o.mark && o.mark.p > 0) {
      const mk = L.chars.filter(c => c.mark);
      if (mk.length) {
        const a = x0 + mk[0].x - size * 0.04;
        const last = mk[mk.length - 1];
        const b = x0 + last.x + last.adv + size * 0.04;
        let outA = 1;
        if (o.out != null && o.out > 0) outA = 1 - E.inC(clamp(o.out / od));
        ctx.globalAlpha = baseA * outA;
        ctx.fillStyle = o.mark.color || C.yellow;
        ctx.fillRect(a, y - size * 0.24, (b - a) * E.inOutC(clamp(o.mark.p)), size * 0.38);
      }
    }

    if (o.clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 - size, y - size * 1.08, L.width + size * 2, size * 1.42);
      ctx.clip();
    }
    for (let i = 0; i < n; i++) {
      const c = L.chars[i];
      let p = 1, q = 0;
      if (o.t != null) p = clamp((o.t - i * st) / d);
      if (o.out != null) q = clamp((o.out - i * ost) / od);
      if (p <= 0 || q >= 1) continue;
      let a = baseA, dy = 0, sc = 1;
      if (mode === 'rise') {
        const e = E.outQuart(p);
        dy = (1 - e) * (o.rise == null ? 0.95 : o.rise) * size;
        a *= clamp(p * 2.2);
      } else if (mode === 'pop') {
        sc = 0.15 + 0.85 * E.outBack(p);
        a *= clamp(p * 3);
      } else {
        a *= E.outC(p);
      }
      if (q > 0) {
        const e = E.inC(q);
        dy -= e * (o.orise == null ? 0.55 : o.orise) * size;
        a *= 1 - e;
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = c.color;
      ctx.font = c.font;
      const cx = x0 + c.x;
      if (sc !== 1) {
        ctx.save();
        ctx.translate(cx + c.w / 2, y + dy - c.size * 0.36);
        ctx.scale(sc, sc);
        ctx.fillText(c.ch, -c.w / 2, c.size * 0.36);
        ctx.restore();
      } else {
        ctx.fillText(c.ch, cx, y + dy);
      }
    }
    if (o.clip) ctx.restore();
    ctx.globalAlpha = 1;
    return { x: x0, width: L.width, size };
  }

  /* 桁幅を固定した数字（時計表示のガタつき防止） */
  function digits(ctx, str, cx, y, o = {}) {
    const size = o.size || 150;
    const font = F[o.font || 'num'](size);
    const cell = ch => (ch === ':' ? size * 0.3 : size * 0.6);
    const total = Array.from(str).reduce((s, ch) => s + cell(ch), 0);
    let x = cx - total / 2;
    ctx.font = font;
    ctx.fillStyle = o.color || C.ink;
    const st = o.st == null ? 0.05 : o.st, d = o.d == null ? 0.5 : o.d;
    Array.from(str).forEach((ch, i) => {
      const w = measure(ctx, font, ch);
      let p = 1;
      if (o.t != null) p = clamp((o.t - i * st) / d);
      if (p > 0) {
        const e = E.outQuart(p);
        ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * clamp(p * 2.2);
        ctx.font = font;
        ctx.fillStyle = o.color || C.ink;
        ctx.fillText(ch, x + (cell(ch) - w) / 2, y + (1 - e) * size * 0.8);
      }
      x += cell(ch);
    });
    ctx.globalAlpha = 1;
    return total;
  }

  /* ---------- 図形 ---------- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, color) {
    if (w <= 0 || h <= 0) return;
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function strokeRR(ctx, x, y, w, h, r, color, lw) {
    rr(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  function circle(ctx, x, y, r, color) {
    if (r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function ring(ctx, x, y, r, lw, color) {
    if (r <= 0 || lw <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  function arc(ctx, cx, cy, r, a0, a1, lw, color, cap) {
    if (a1 <= a0) return;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.lineWidth = lw;
    ctx.strokeStyle = color;
    ctx.lineCap = cap || 'butt';
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function line(ctx, x1, y1, x2, y2, lw, color, cap) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = lw;
    ctx.strokeStyle = color;
    ctx.lineCap = cap || 'round';
    ctx.stroke();
  }
  // 時計の分 → 角度（12時の位置が0分）
  const mAng = m => -Math.PI / 2 + (m / 60) * Math.PI * 2;

  // 3次ベジェ
  function bez(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    ];
  }
  function bezPath(ctx, pts, p, steps) {
    const n = Math.max(2, Math.round(steps * p));
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const q = bez(pts[0], pts[1], pts[2], pts[3], (i / n) * p);
      if (i === 0) ctx.moveTo(q[0], q[1]);
      else ctx.lineTo(q[0], q[1]);
    }
  }

  SV.util = {
    clamp, lerp, seg, E, mulberry32, rgb, mix, alpha,
    rr, fillRR, strokeRR, circle, ring, arc, line, mAng, bez, bezPath
  };
  SV.C = C;
  SV.F = F;
  SV.FAM = FAM;
  SV.text = text;
  SV.textWidth = textWidth;
  SV.digits = digits;
  SV.rich = rich;
  SV.resetMeasure = resetMeasure;
})();
