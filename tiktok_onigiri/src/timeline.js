// 動画定義 VIDEO = {duration, shots:[{t0,t1,draw(ctx,lt,t,d), filter, fx}], caps:[...], post(ctx,t), audio:[...]}
function renderVideo(ctx, V, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (const s of V.shots) {
    if (t >= s.t0 && t < s.t1) {
      const lt = t - s.t0, d = s.t1 - s.t0;
      if (s.filter) {
        withFilter(ctx, typeof s.filter === 'function' ? s.filter(lt, t) : s.filter, x => s.draw(x, lt, t, d), 'shot');
      } else {
        ctx.save(); s.draw(ctx, lt, t, d); ctx.restore();
      }
      if (s.fx) { ctx.save(); s.fx(ctx, lt, t, d); ctx.restore(); }
    }
  }
  for (const c of V.caps) drawCaption(ctx, c, t);
  if (V.post) { ctx.save(); V.post(ctx, t); ctx.restore(); }
}
// 回想シーン用の質感
const SEPIA = 'sepia(0.55) saturate(0.85) contrast(0.92) brightness(1.06)';
function memoryFx(ctx, lt, t) { lightLeak(ctx, t, 0.28); vignette(ctx, 0.5, '60,35,15'); grain(ctx, t, 0.07); }
