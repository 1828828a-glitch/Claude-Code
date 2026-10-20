// 動画定義 VIDEO = {duration, shots:[{t0,t1,draw(ctx,lt,t,d), filter, fx}], caps:[...], post(ctx,t), audio:[...]}
// 仕上げ: モーションブラー(サブフレーム合成)→色調→ブルーム→周辺減光→字幕→フィルムグレイン
const POST = { sub: 3, shutter: 0.5, bloom: 0.2, grain: 0.045, vignette: 0.24, grade: 'contrast(1.1) saturate(1.08)' };
function drawShots(ctx, V, t, st) {
  for (const s of V.shots) {
    if (!(t >= s.t0 && t < s.t1)) continue;
    const tt = clamp(st, s.t0, s.t1 - 1e-4);
    const lt = tt - s.t0, d = s.t1 - s.t0;
    resetLight();
    if (s.filter) {
      withFilter(ctx, typeof s.filter === 'function' ? s.filter(lt, tt) : s.filter, x => s.draw(x, lt, tt, d), 'shot');
    } else {
      ctx.save(); s.draw(ctx, lt, tt, d); ctx.restore();
    }
    if (s.fx) { ctx.save(); s.fx(ctx, lt, tt, d); ctx.restore(); }
  }
}
function renderVideo(ctx, V, t) {
  NOTEXT = !!V.noText;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  const n = V.sub ?? POST.sub;
  const [acc, ax] = buf('acc');
  for (let i = 0; i < n; i++) {
    const st = n > 1 ? t + ((i + 0.5) / n - 0.5) * (POST.shutter / FPS) : t;
    const [sc, sx] = buf('sub');
    sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
    drawShots(sx, V, t, st);
    ax.globalAlpha = 1 / (i + 1); ax.drawImage(sc, 0, 0);
  }
  ax.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.filter = V.grade || POST.grade; ctx.drawImage(acc, 0, 0); ctx.filter = 'none';
  bloom(ctx, acc, V.bloom ?? POST.bloom, V.bloomTint);
  vignette(ctx, POST.vignette, '10,6,4', 0.36);
  for (const c of V.caps) drawCaption(ctx, c, t);
  if (V.post) { ctx.save(); V.post(ctx, t); ctx.restore(); }
  grain(ctx, t, POST.grain);
}
// 画面内の文字ゼロの案件用。すべての文字描画を止める(字幕・看板・UI・ラベル)
let NOTEXT = false;
(() => {
  const P = CanvasRenderingContext2D.prototype, f = P.fillText, st = P.strokeText;
  P.fillText = function (...a) { if (!NOTEXT) return f.apply(this, a); };
  P.strokeText = function (...a) { if (!NOTEXT) return st.apply(this, a); };
})();

// ナレーションの尺から全体の尺を組み立てる。
// segs: [{id, min, n:[[行ID, 開始オフセット]...], tail, draw(ctx, lt, d), filter, fx, a:[効果音...], meta:{...}}]
// 各セグメントの長さ = max(min, 開始オフセット + ナレーション尺 + tail)
function buildTimeline(segs, NARR, folder) {
  let t = 0;
  const shots = [], audio = [], marks = {}, shotlist = [];
  for (const s of segs) {
    let d = s.min || 0;
    for (const [id, off] of (s.n || [])) d = Math.max(d, off + (NARR.dur[id] || 0) + (s.tail ?? 0.3));
    d = Math.round(d * 30) / 30;
    marks[s.id] = t;
    const t0 = t;
    shots.push({ t0, t1: t0 + d, draw: (c, lt) => s.draw(c, lt, d), filter: s.filter, fx: s.fx });
    (s.n || []).forEach(([id, off]) => audio.push({ t: +(t0 + off).toFixed(3), type: 'wav', file: `${folder}/${id}.wav`, line: id }));
    (typeof s.a === 'function' ? s.a(d) : (s.a || [])).forEach(a => audio.push({ ...a, t: +(t0 + a.t).toFixed(3) }));
    const narr = (s.n || []).map(([id]) => `${id} ${NARR.text[id] || ''}`).join(' / ');
    if (s.subs) {
      // 1つのセグメントに複数の生成カットが入る場合(モンタージュなど)
      s.subs.forEach(sub => shotlist.push({
        id: sub.id, t0: +(t0 + d * sub.from).toFixed(2), sec: +(d * (sub.to - sub.from)).toFixed(2),
        narration: sub.lines ? sub.lines.map(id => `${id} ${NARR.text[id] || ''}`).join(' / ') : narr,
        treat: sub.treat || (s.filter === SEPIA ? 'memory' : ''), sbAt: 0.5, ...sub.meta,
      }));
    } else {
      shotlist.push({ id: s.id, t0: +t0.toFixed(2), sec: +d.toFixed(2), narration: narr, treat: s.treat || (s.filter === SEPIA ? 'memory' : ''), ...(s.meta || {}) });
    }
    t += d;
  }
  marks.end = t;
  return { shots, audio, marks, shotlist, duration: Math.round(t * 30) / 30 };
}

// 回想シーン用の質感
const SEPIA = 'sepia(0.55) saturate(0.85) contrast(0.92) brightness(1.06)';
function memoryFx(ctx, lt, t) { lightLeak(ctx, t, 0.28); vignette(ctx, 0.5, '60,35,15'); }
