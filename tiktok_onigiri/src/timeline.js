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
// 回想シーン用の質感
const SEPIA = 'sepia(0.55) saturate(0.85) contrast(0.92) brightness(1.06)';
function memoryFx(ctx, lt, t) { lightLeak(ctx, t, 0.28); vignette(ctx, 0.5, '60,35,15'); }
