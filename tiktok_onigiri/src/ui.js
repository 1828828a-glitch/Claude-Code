// 文字なしモードでは、文字の代わりに読めない帯を描く(何か書いてあることだけ伝わる)
function textBars(ctx, lines, x, y0, lh, color, align = 'left') {
  if (!NOTEXT) return;
  ctx.save(); ctx.fillStyle = color;
  lines.forEach((l, i) => {
    const w = ctx.measureText(l).width * 0.94;
    if (w < 2) return;
    const bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    rr(ctx, bx, y0 + i * lh - 11, w, 22, 11); ctx.fill();
  });
  ctx.restore();
}

// スマホの画面UI。幅1080基準で描く(端末内に入れるときは縮小する)

// 入力欄の文字列を時間から求める。ops: [{at,type,dur}|{at,del,dur}|{at,send}]
function typingState(t, ops) {
  let input = '', sent = [], lastKey = -1, sending = -1;
  for (const op of ops) {
    if (t < op.at) break;
    if (op.type !== undefined) {
      const chars = [...op.type];
      const k = Math.floor(seg(t, op.at, op.at + op.dur) * chars.length + 1e-6);
      input = chars.slice(0, k).join('');
      if (t < op.at + op.dur) lastKey = op.at + (k / chars.length) * op.dur;
    } else if (op.del) {
      const start = op.from ?? input;
      const chars = [...start];
      const k = Math.floor((1 - seg(t, op.at, op.at + op.dur)) * chars.length + 1e-6);
      input = chars.slice(0, k).join('');
    } else if (op.send) {
      sent.push({ text: input, at: op.at, photo: op.photo });
      input = ''; sending = op.at;
    } else if (op.photo) {
      sent.push({ photo: true, at: op.at });
    }
  }
  return { input, sent, sending };
}

function statusBar(ctx, w, dark = false, time = '7:12') {
  ctx.fillStyle = dark ? '#fff' : '#111';
  ctx.font = '700 40px "ZenKaku"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(time, 70, 70);
  rr(ctx, w - 150, 54, 70, 32, 8); ctx.lineWidth = 3; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
  rr(ctx, w - 146, 58, 50, 24, 5); ctx.fill();
  [0, 1, 2, 3].forEach(i => { ctx.fillRect(w - 260 + i * 18, 82 - i * 9, 12, 8 + i * 9); });
}

function avatarMom(ctx, x, y, r) {
  fillEll(ctx, x, y, r, r, '#f3c9b8');
  ctx.save(); ell(ctx, x, y, r, r); ctx.clip();
  fillEll(ctx, x, y + r * 0.2, r * 0.42, r * 0.42, '#e8735f');
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; fillEll(ctx, x + Math.cos(a) * r * 0.42, y + r * 0.2 + Math.sin(a) * r * 0.42, r * 0.28, r * 0.28, '#f29a86'); }
  fillEll(ctx, x, y + r * 0.2, r * 0.18, r * 0.18, '#f6d36b');
  ctx.restore();
}
function avatarSon(ctx, x, y, r) {
  fillEll(ctx, x, y, r, r, '#b9cde0');
  ctx.save(); ell(ctx, x, y, r, r); ctx.clip();
  ctx.translate(x, y + r * 0.15); ctx.scale(r / 120, r / 120); drawOnigiri(ctx, 0, 0, 0.55, { seed: 2 });
  ctx.restore();
}

// st = {name, msgs:[{me,text,photo,time,read}], input, keyboard, sendGlow, avatar}
function msgHeight(ctx, m) {
  if (m.photo) return 420 + 40;
  ctx.font = '500 46px "ZenKaku"';
  return m.text.split('\n').length * 62 + 44 + 34;
}
function chatUI(ctx, w, h, st, t) {
  ctx.fillStyle = '#ece5db'; ctx.fillRect(0, 0, w, h);
  const kbH = st.keyboard ? 700 : 0;
  const bottom = h - kbH - 170 - 30;
  const total = st.msgs.reduce((acc, m) => acc + msgHeight(ctx, m), 0);
  const scroll = Math.max(0, 400 + total - bottom);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 250, w, h - 250); ctx.clip();
  // 日付
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; rr(ctx, w / 2 - 110, 290 - scroll, 220, 54, 27); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '500 32px "ZenKaku"'; ctx.fillText(st.date || '今日', w / 2, 318 - scroll);
  // メッセージ
  let y = 400 - scroll;
  ctx.textBaseline = 'middle';
  for (const m of st.msgs) {
    const a = m.alpha ?? 1;
    ctx.save(); ctx.globalAlpha = a;
    const pop = m.pop ?? 1;
    if (m.photo) {
      const pw = 520, ph = 420;
      const x = m.me ? w - 60 - pw : 170;
      const photoFn = m.photoFn || bgPhotoOnigiri;
      ctx.translate(m.me ? x + pw : x, y); ctx.scale(lerp(0.85, 1, pop), lerp(0.85, 1, pop)); ctx.translate(-(m.me ? x + pw : x), -y);
      ctx.save(); rr(ctx, x, y, pw, ph, 30); ctx.clip();
      photoFn(ctx, x, y, pw, ph);
      ctx.restore();
      if (m.me) metaMe(ctx, x - 16, y + ph - 40, m);
      else { (st.avatar || avatarMom)(ctx, 100, y + 40, 46); }
      y += ph + 40;
    } else {
      ctx.font = '500 46px "ZenKaku"';
      const lines = m.text.split('\n');
      const tw2 = Math.max(...lines.map(l => ctx.measureText(l).width));
      const bw = tw2 + 64, bh = lines.length * 62 + 44;
      const x = m.me ? w - 60 - bw : 170;
      ctx.translate(m.me ? x + bw : x, y); ctx.scale(lerp(0.85, 1, pop), lerp(0.85, 1, pop)); ctx.translate(-(m.me ? x + bw : x), -y);
      rr(ctx, x, y, bw, bh, 40); ctx.fillStyle = m.me ? '#ffd39b' : '#ffffff'; ctx.fill();
      ctx.fillStyle = '#1d1d1d'; ctx.textAlign = 'left';
      lines.forEach((l, i) => ctx.fillText(l, x + 32, y + 22 + 31 + i * 62));
      textBars(ctx, lines, x + 32, y + 22 + 31, 62, m.me ? 'rgba(120,70,20,0.3)' : 'rgba(60,55,50,0.22)');
      if (m.me) metaMe(ctx, x - 16, y + bh - 40, m);
      else {
        (st.avatar || avatarMom)(ctx, 100, y + 40, 46);
        ctx.fillStyle = '#8a8580'; ctx.font = '500 28px "ZenKaku"'; ctx.textAlign = 'left'; ctx.fillText(m.time || '', x + bw + 14, y + bh - 20);
      }
      y += bh + 34;
    }
    ctx.restore();
  }
  ctx.restore();
  // ヘッダー
  ctx.fillStyle = '#f8f5f0'; ctx.fillRect(0, 0, w, 250);
  statusBar(ctx, w);
  ctx.fillStyle = '#222'; ctx.font = '700 52px "ZenKaku"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(st.name, w / 2, 182);
  textBars(ctx, [st.name], w / 2, 182, 0, 'rgba(40,35,30,0.3)', 'center');
  ctx.strokeStyle = '#333'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(84, 158); ctx.lineTo(58, 182); ctx.lineTo(84, 206); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 248, w, 3);
  // 入力欄
  const kb = st.keyboard ? 700 : 0;
  const iy = h - kb - 170;
  ctx.fillStyle = '#f8f5f0'; ctx.fillRect(0, iy, w, 170 + kb);
  rr(ctx, 120, iy + 34, w - 290, 100, 50); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = '#ddd5ca'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#9a948d'; ctx.font = '700 60px "ZenKaku"'; ctx.textAlign = 'center'; ctx.fillText('+', 62, iy + 86);
  ctx.save(); rr(ctx, 120, iy + 34, w - 290, 100, 50); ctx.clip();
  ctx.font = '500 44px "ZenKaku"'; ctx.textAlign = 'left';
  const tw3 = ctx.measureText(st.input || '').width;
  const sx = Math.min(0, (w - 340) - 150 - tw3);
  ctx.fillStyle = '#1d1d1d'; ctx.fillText(st.input || '', 150 + sx, iy + 86);
  textBars(ctx, [st.input || ''], 150 + sx, iy + 86, 0, 'rgba(40,35,30,0.35)');
  if (st.caret !== false && Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#e07b2c'; ctx.fillRect(152 + sx + tw3, iy + 58, 4, 54); }
  ctx.restore();
  // 送信ボタン
  const on = (st.input || '').length > 0;
  fillEll(ctx, w - 90, iy + 84, 56, 56, on ? '#f08a2c' : '#d8d2ca');
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(w - 118, iy + 62); ctx.lineTo(w - 58, iy + 84); ctx.lineTo(w - 118, iy + 106); ctx.lineTo(w - 108, iy + 84); ctx.fill();
  if (st.keyboard) keyboard(ctx, w, h - kb, kb, st.keyHit);
}
function metaMe(ctx, xr, y, m) {
  ctx.fillStyle = '#8a8580'; ctx.font = '500 28px "ZenKaku"'; ctx.textAlign = 'right';
  if (m.read) ctx.fillText('既読', xr, y - 6);
  ctx.fillText(m.time || '', xr, y + 26);
}
function keyboard(ctx, w, y0, h, hit) {
  ctx.fillStyle = '#d3d6db'; ctx.fillRect(0, y0, w, h);
  const keys = [['→', 'あ', 'か', 'さ', '⌫'], ['↺', 'た', 'な', 'は', '空白'], ['ABC', 'ま', 'や', 'ら', '改行'], ['🌐', '小', 'わ', '、。', '']];
  const kw = (w - 60) / 5, kh = (h - 80) / 4;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  keys.forEach((row, r) => row.forEach((k, c) => {
    if (!k) return;
    const x = 20 + c * (kw + 5), y = y0 + 24 + r * (kh + 10);
    const isHit = hit && hit[0] === r && hit[1] === c;
    rr(ctx, x, y, kw, kh, 14); ctx.fillStyle = isHit ? '#b9bec6' : (c === 0 || c === 4 ? '#adb3bc' : '#fdfdfd'); ctx.fill();
    ctx.fillStyle = '#222'; ctx.font = (k.length > 1 ? '500 38px' : '500 52px') + ' "ZenKaku"';
    ctx.fillText(k, x + kw / 2, y + kh / 2);
  }));
}
// タイピング中の押下キーを擬似的に決める
function keyHitAt(t, active) {
  if (!active) return null;
  const k = Math.floor(t * 9);
  return [Math.floor(hash(k) * 3), 1 + Math.floor(hash(k + 3) * 3)];
}

// 送った写真(いびつなソーセージおにぎり)
function bgPhotoOnigiri(ctx, x, y, w, h, o = {}) {
  ctx.fillStyle = '#e9e7e2'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.fillRect(x, y, w, h);
  drawPlate(ctx, x + w / 2, y + h * 0.58, w * 0.42, h * 0.32, '#ffffff');
  drawOnigiri(ctx, x + w / 2, y + h * 0.5, (h / 420) * 0.92, { lop: o.lop ?? 0.8, bite: o.bite ?? 0.55, filling: 'sausage', seed: 4, rot: -0.06 });
}

// ロック画面のような壁紙 + 通知バナー
function phoneWallpaper(ctx, w, h) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, h, [[0, '#3a4a6b'], [1, '#c98a6b']]); ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff'; ctx.font = '700 200px "ZenKaku"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(phoneWallpaper.time || '21:48', w / 2, 420);
  ctx.font = '500 48px "ZenKaku"'; ctx.fillText(phoneWallpaper.date || '10月18日 土曜日', w / 2, 270);
}
function notifBanner(ctx, w, y, title, body, a = 1, k = 1) {
  // k: 文字の拡大率。バナーの横幅は画面幅に合わせたまま
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(w / 2, y); ctx.scale(k, k);
  const bw = (w - 80) / k, lines = body.split('\n');
  const bh = 150 + lines.length * 56;
  const x0 = -bw / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  rr(ctx, x0, 0, bw, bh, 46); ctx.fillStyle = 'rgba(250,248,245,0.97)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  rr(ctx, x0 + 36, 40, 100, 100, 26); ctx.fillStyle = '#f08a2c'; ctx.fill();
  ctx.fillStyle = '#fff'; ell(ctx, x0 + 86, 86, 34, 28); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x0 + 68, 104); ctx.lineTo(x0 + 60, 124); ctx.lineTo(x0 + 84, 110); ctx.fill();
  ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '700 46px "ZenKaku"'; ctx.fillText(title, x0 + 166, 70);
  textBars(ctx, [title], x0 + 166, 70, 0, 'rgba(30,30,30,0.4)');
  ctx.fillStyle = '#8a8580'; ctx.font = '500 34px "ZenKaku"'; ctx.textAlign = 'right'; ctx.fillText('今', x0 + bw - 40, 70);
  ctx.fillStyle = '#222'; ctx.textAlign = 'left'; ctx.font = '500 42px "ZenKaku"';
  lines.forEach((l, i) => ctx.fillText(l, x0 + 166, 136 + i * 56));
  textBars(ctx, lines, x0 + 166, 136, 56, 'rgba(30,30,30,0.22)');
  ctx.restore();
}

// 画面いっぱいのスマホ(端末の縁つき)。fn(ctx,w,h) は幅1080の座標で描く
function fullPhone(ctx, s, rot, x, y, fn) {
  drawPhone(ctx, x, y, s, rot, (c, w, h) => {
    c.save(); c.scale(w / 1080, w / 1080);
    fn(c, 1080, h * (1080 / w));
    c.restore();
  });
}

// エンドカード
function endCard(ctx, t, o = {}) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#fbf3e6'], [1, '#f3e3cc']]); ctx.fillRect(0, 0, W, H);
  const p = tw(t, 0, 0.6, E.outBack);
  ctx.save(); ctx.translate(W / 2, 740); ctx.scale(p, p);
  drawPlate(ctx, 0, 140, 300, 90, '#ffffff');
  drawOnigiri(ctx, 0, 30, 1.25, { bite: 0.6, filling: 'sausage', seed: 8, lop: 0.3 });
  ctx.restore();
  const a = tw(t, 0.35, 0.8);
  ctx.save(); ctx.globalAlpha = a;
  drawText(ctx, 'オープンアップしよ！', W / 2, 1150, { size: 86, weight: 900, style: 'plain', color: '#e0662b' });
  ctx.restore();
  if (o.sub) {
    ctx.save(); ctx.globalAlpha = tw(t, 1.0, 1.4);
    drawText(ctx, o.sub, W / 2, 1300, { size: 50, weight: 700, style: 'plain', color: '#4a3b30', lh: 1.5 });
    ctx.restore();
  }
  if (o.tag) {
    ctx.save(); ctx.globalAlpha = tw(t, 1.3, 1.7);
    drawText(ctx, o.tag, W / 2, 1440, { size: 46, weight: 700, style: 'box', bg: '#e0662b', color: '#fff' });
    ctx.restore();
  }
}

// PR表記(Vlog版)
function prLabel(ctx) {
  ctx.save();
  rr(ctx, 70, 262, 96, 56, 12); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 36px "ZenKaku"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('PR', 118, 292);
  ctx.restore();
}

// コメント返信ステッカー(母視点の続編)
function replySticker(ctx, x, y, s, user, text, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = '700 46px "ZenKaku"';
  const w = Math.max(ctx.measureText(text).width + 80, 560);
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  rr(ctx, -w / 2, -90, w, 180, 30); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowColor = 'transparent';
  fillEll(ctx, -w / 2 + 60, -42, 28, 28, '#9cc3a8');
  ctx.fillStyle = '#8a8580'; ctx.font = '500 32px "ZenKaku"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${user} さんに返信`, -w / 2 + 104, -42);
  ctx.fillStyle = '#111'; ctx.font = '700 46px "ZenKaku"'; ctx.fillText(text, -w / 2 + 40, 34);
  ctx.beginPath(); ctx.moveTo(-w / 2 + 70, 88); ctx.lineTo(-w / 2 + 110, 88); ctx.lineTo(-w / 2 + 76, 124); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
}
