// B・C・D 用の追加ショット

// 一人暮らしの玄関ドアを開ける(主観)
function shotDoorOpen(ctx, lt, o = {}) {
  const op = tw(lt, o.openAt ?? 0.5, (o.openAt ?? 0.5) + 0.9, E.inOut);
  const h = handheld(lt, 5, 0.9, 23);
  camera(ctx, { zoom: 1.0 + op * 0.12, x: h.x, y: h.y, rot: h.r }, () => {
    ctx.fillStyle = '#d4d7db'; ctx.fillRect(0, 0, W, H);
    // 外の景色
    ctx.fillStyle = lg(ctx, 0, 300, 0, 1400, [[0, '#bfe0f7'], [1, '#fff4dc']]); ctx.fillRect(250, 280, 580, 1180);
    fillEll(ctx, 540, 1180, 420, 140, '#9cc78a');
    ctx.fillStyle = '#e9e4da'; ctx.fillRect(250, 1180, 580, 280);
    ctx.fillStyle = '#9aa4ae'; for (let x = 270; x < 830; x += 60) ctx.fillRect(x, 1060, 10, 140);
    ctx.fillRect(250, 1050, 580, 14);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = rg(ctx, 540, 800, 0, 900, [[0, `rgba(255,240,200,${0.6 * op})`], [1, 'rgba(255,230,180,0)']]); ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // 扉(左ヒンジで手前に開く)
    const dw = 580 * (1 - op * 0.82);
    ctx.fillStyle = '#7b8794'; ctx.beginPath();
    ctx.moveTo(250, 280); ctx.lineTo(250 + dw, 280 - op * 90); ctx.lineTo(250 + dw, 1460 + op * 90); ctx.lineTo(250, 1460); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9ced4'; rr(ctx, 250 + dw - 70 * (1 - op * 0.6), 820, 40 * (1 - op * 0.5), 110, 10); ctx.fill();
    // 枠と靴
    ctx.strokeStyle = '#5f6a75'; ctx.lineWidth = 30; ctx.strokeRect(250, 280, 580, 1180);
    ctx.fillStyle = '#8d8a84'; ctx.fillRect(0, 1460, W, H - 1460);
    ctx.fillStyle = '#3a3a3a'; rr(ctx, 360, 1600, 150, 50, 24); ctx.fill(); rr(ctx, 560, 1620, 150, 50, 24); ctx.fill();
  });
  if (o.hand !== false) drawHand(ctx, lerp(820, 980, op), lerp(1300, 1500, op), 1.4, -0.6, { sleeve: o.sleeve || '#2c3753', curl: 0.7 });
  fade(ctx, op * 0.25, '#fff8e8');
}

// 回想の母(カメラ目線でほほえむ)
function shotMemoryMom(ctx, lt, o = {}) {
  camera(ctx, { zoom: 1.08 - lt * 0.02 }, () => {
    bgHomeKitchen(ctx, lt);
    drawPerson(ctx, { x: 540, y: 1060, s: 1.75, who: 'mom', outfit: 'apron', t: lt + 7,
      ex: { ...EX.smile, open: talk(lt, o.talk?.[0] ?? 0.3, o.talk?.[1] ?? 1.0, 0.35), smile: 0.9 },
      afterHead: o.bento === false ? null : x => armsHoldBento(x, { y: 500, s: 1.05 }) });
  });
}

// 母の手渡し(主観):包みを差し出す→ひったくる手
function shotPOVHandover(ctx, lt, o = {}) {
  const g = o.grabAt ?? 99;
  const reach = tw(lt, g - 0.3, g, E.out), away = tw(lt, g + 0.05, g + 0.35, E.in);
  const h = handheld(lt, 5, 0.9, 29);
  const surprised = tw(lt, g + 0.1, g + 0.4);
  const ex = mixEx({ ...EX.smile, open: talk(lt, o.talk?.[0] ?? 0.4, o.talk?.[1] ?? 1.2, 0.35) }, { smile: 0.2, eye: 1, browUp: 0.4 }, surprised);
  camera(ctx, { zoom: 1.02, x: h.x + away * -30, y: h.y, rot: h.r + away * -0.02 }, () => {
    bgHomeKitchen(ctx, lt);
    drawPerson(ctx, { x: 540, y: 920, s: 1.7, who: 'mom', outfit: 'apron', t: lt + 9, ex,
      afterHead: x => {
        if (away < 0.05) armsHoldBento(x, { y: 430, s: 1.45 });
        else {
          [-1, 1].forEach(d => { x.save(); x.translate(d * 210, 700); x.rotate(d * -0.5); rr(x, -60, -280, 120, 420, 50); x.fillStyle = '#c98d86'; x.fill(); x.restore(); });
          [-1, 1].forEach(d => { rr(x, d * 200 - 46, 420, 92, 110, 40); x.fillStyle = SKIN; x.fill(); });
        }
      } });
    if (away > 0) drawBento(ctx, 540 + away * 800, 1650 + away * 300, 2.4, { rot: away * 0.5 });
  });
  if (reach > 0) {
    const hx = lerp(1250, 700, reach) + away * 500, hy = lerp(2300, 1880, reach) + away * 400;
    drawHand(ctx, hx, hy, 2.0, -0.55, { sleeve: '#1f2433', curl: reach > 0.9 ? 0.75 : 0.2 });
  }
}

// ポラロイド写真が重なっていく(Vlog版)
function polaroid(ctx, x, y, s, rot, fn, label, a = 1, sepia = true) {
  const [c, cx] = buf('pol');
  fn(cx);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fbfaf6'; ctx.fillRect(-300, -380, 600, 720);
  ctx.shadowColor = 'transparent';
  ctx.filter = sepia ? SEPIA : 'none';
  // 中央の正方形を切り出す
  ctx.drawImage(c, 0, (H - W) / 2 - 120, W, W, -270, -350, 540, 540);
  ctx.filter = 'none';
  if (label) drawText(ctx, label, 0, 270, { size: 40, font: 'yomogi', weight: 400, style: 'plain', color: '#3a3330' });
  ctx.restore();
}

// 夜の台所で、母がひとり
function shotNightMom(ctx, lt, o = {}) {
  const h = handheld(lt, 3, 0.5, 31);
  camera(ctx, { zoom: (o.zoom || 1.0) + lt * 0.015, x: h.x, y: h.y }, () => {
    bgNightKitchen(ctx, lt);
    drawPerson(ctx, { x: 540, y: 1000, s: 1.45, who: 'mom', outfit: 'cardigan', t: lt + 11,
      ex: o.ex || { smile: 0.15, eye: 0.75, look: [0.2, 0.85], brow: -0.3 } });
    ctx.fillStyle = lg(ctx, 0, 1300, 0, H, [[0, '#8f6240'], [1, '#5e3e28']]); ctx.fillRect(0, 1360, W, H - 1360);
    ctx.fillStyle = '#7a5134'; ctx.fillRect(0, 1340, W, 26);
    drawTeacup(ctx, 830, 1450, 1.0);
    if (o.phone !== false) {
      drawPhone(ctx, 500, 1520, 0.42, -0.25, (c, w, hh) => { c.fillStyle = '#dfe6f0'; c.fillRect(0, 0, w, hh); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, 0, w, 120); });
      drawHand(ctx, 430, 1720, 1.0, -0.2, { sleeve: '#86977c', curl: 0.7 });
    }
  });
}

// ソーセージを持つ手が止まり、戻す(母の回想)
function shotSausageHesitate(ctx, lt, o = {}) {
  bgTop(ctx, 'counter', { color: '#efe8dc' });
  const fill3 = lt > 2.6 ? 'salmon' : null;
  drawBentoOpen(ctx, 540, 1250, 1.2, ['ume', 'salmon', null]);
  // ご飯の山
  if (lt < 2.6) {
    fillEll(ctx, 540, 640, 170, 130, 'rgba(0,0,0,0.1)');
    fillEll(ctx, 540, 620, 160, 120, RICE);
    ctx.save(); ell(ctx, 540, 620, 160, 120); ctx.clip(); ctx.translate(540, 620); riceTexture(ctx, 41, 100); ctx.restore();
  }
  // 手:近づく→止まる→引っこめる
  const inP = tw(lt, 0, 0.6, E.out), outP = tw(lt, 1.6, 2.3, E.in);
  const hover = Math.sin(lt * 3) * 6 * (lt > 0.6 && lt < 1.6 ? 1 : 0);
  const hx = 640, hy = lerp(-200, 380, inP) - outP * 700 + hover;
  drawSausage(ctx, hx - 60, hy + 160, 1.2, 0.4);
  drawHand(ctx, hx, hy - 60, 1.2, Math.PI + 0.3, { sleeve: '#c98d86', curl: 0.75 });
}

// 玄関で、閉まったドアに「いってらっしゃい」
function shotGenkanMom(ctx, lt, o = {}) {
  const closeP = tw(lt, 0, 0.5);
  camera(ctx, { zoom: 1.0 + lt * 0.02 }, () => {
    bgGenkan(ctx, lt, { open: 1 - closeP });
    drawPersonBack(ctx, { x: 560, y: 1450, s: 1.35, who: 'mom', outfit: 'apron', tilt: 0.04 });
  });
  speech(ctx, 'いってらっしゃい', 640, 820, lt, 0.7, 2.4, { size: 60, tail: -40, tailDir: -1 });
}

// 写真が届いて、口元に手をやる母
function shotMomReact(ctx, lt, o = {}) {
  const k = tw(lt, 0.4, 1.2);
  const tear = tw(lt, 1.0, 2.2);
  camera(ctx, { zoom: 1.05 + lt * 0.03 }, () => {
    bgHomeKitchen(ctx, lt);
    const ex = mixEx({ smile: 0.1, eye: 1, browUp: 0.6, look: [0, 0.6] }, { smile: 0.75, eye: 0.6, brow: -0.6, tear, look: [0, 0.5] }, k);
    ex.drop = seg(lt, 2.2, 3.6); ex.dropSide = 1;
    drawPerson(ctx, { x: 540, y: 1080, s: 1.8, who: 'mom', outfit: 'cardigan', t: lt + 13, ex, nod: -6 * k });
    // 口元の手
    const hp = tw(lt, 0.3, 0.8, E.out);
    if (hp > 0) drawHand(ctx, 600, lerp(2100, 1520, hp), 1.15, -0.35, { sleeve: '#86977c', curl: 0.35 });
  });
}

// 弁当を真上から撮ってシャッター(Vlog版)
function shotFlatLay(ctx, lt, o = {}) {
  bgTop(ctx, 'cloth', { color: '#f4ede2', check: 'rgba(110,150,200,0.18)' });
  drawBentoOpen(ctx, 540, 940, 1.3, ['ume', 'salmon', 'sausage'], { box: '#4f7a4e', lop: 0.8 });
  // 見せたい具は断面で
  drawOnigiri(ctx, 800, 1460, 0.75, { bite: 0.5, filling: 'sausage', seed: 44, lop: 0.8 });
  const at = o.shutterAt ?? 1.0;
  if (lt > at) fade(ctx, (1 - seg(lt, at, at + 0.25)) * 0.9, '#fff');
  // カメラ枠
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6;
  [[120, 420, 1, 1], [960, 420, -1, 1], [120, 1600, 1, -1], [960, 1600, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + dy * 80); ctx.lineTo(x, y); ctx.lineTo(x + dx * 80, y); ctx.stroke();
  });
}

// 電車に乗れた(Vlog版のラスト)
function shotBoardTrain(ctx, lt) {
  const walk = tw(lt, 0.2, 1.8, E.inOut);
  camera(ctx, { zoom: 1.0 + lt * 0.03 }, () => {
    bgPlatform(ctx, lt, tw(lt, 2.2, 2.7));
    if (walk < 0.98 || lt < 2.2) {
      const bob = Math.abs(Math.sin(lt * 7)) * 14 * (walk < 1 ? 1 : 0);
      drawPersonBack(ctx, { x: 540, y: lerp(1500, 1000, walk) - bob, s: lerp(1.5, 0.75, walk), who: 'adult', outfit: 'suit' });
    }
  });
}

// 冷蔵庫からウインナーを出す手(Vlog版)
function shotFillingsVlog(ctx, lt, o = {}) {
  bgTop(ctx, 'counter', { color: '#e9e6e0' });
  const r1 = tw(lt, 0.2, 0.6, E.outBack), r2 = tw(lt, 1.2, 1.6, E.outBack);
  // ラップの上のご飯2つ
  [[330, 760, 'ume', r1], [750, 760, 'salmon', r2]].forEach(([x, y, f, p], i) => {
    fillEll(ctx, x, y, 190, 190, 'rgba(255,255,255,0.6)');
    fillEll(ctx, x, y, 150, 120, RICE);
    ctx.save(); ell(ctx, x, y, 150, 120); ctx.clip(); ctx.translate(x, y); riceTexture(ctx, 50 + i, 70); ctx.restore();
    if (p > 0) {
      ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
      if (f === 'ume') { fillEll(ctx, 0, 0, 44, 38, '#9e1b3b'); fillEll(ctx, -12, -10, 12, 8, 'rgba(255,170,190,0.6)'); }
      else { const r = rng(5); for (let k = 0; k < 12; k++) { ctx.fillStyle = k % 3 ? '#f0895c' : '#f7ab84'; ell(ctx, (r() - 0.5) * 80, (r() - 0.5) * 50, 18, 10, r() * 3); ctx.fill(); } }
      ctx.restore();
    }
  });
  // 3つ目のご飯と、ウインナーのパック
  fillEll(ctx, 540, 1250, 190, 190, 'rgba(255,255,255,0.6)');
  fillEll(ctx, 540, 1250, 150, 120, RICE);
  ctx.save(); ell(ctx, 540, 1250, 150, 120); ctx.clip(); ctx.translate(540, 1250); riceTexture(ctx, 60, 70); ctx.restore();
  const pk = tw(lt, 2.3, 2.9, E.out);
  if (pk > 0) {
    drawSausagePack(ctx, lerp(1400, 700, pk), 1560, 1.15, -0.12);
    drawHand(ctx, lerp(1650, 950, pk), 1700, 1.3, -1.25, { sleeve: '#8292a6', curl: 0.6 });
  }
}
