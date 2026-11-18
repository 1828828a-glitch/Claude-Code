/* R08 12/12(土) 防災 1分チェック 20秒（公開は危機管理防災課の確認後）
 * 数字・文言は指示書のとおり。フィード「防災（冬の備え）」と食い違いがないか、確認の際に見てもらう。 */
REEL({
  file: '防災1分チェック',
  dur: 20,
  build(K) {
    const { C } = K;
    const [c1, c2, c3, c4] = K.cuts([
      { d: 3, bg: C.navy },
      { d: 4, bg: C.cream, dots: true },
      { d: 8, bg: C.mint },
      { d: 5, bg: C.navy },
    ]);

    // 0〜3 おうちの備え、何日分ある？
    K.words(c1.el, ['おうちの備え、'], { top: 450, size: 110, color: C.white, at: .15 });
    K.words(c1.el, [{ t: '何日分', c: C.yellow }, 'ある？'], { top: 610, size: 120, color: C.white, at: .5 });
    K.icon(c1.el, ICON.house(), { cx: 540, cy: 1020, size: 300, at: .8, until: c1.e });

    // 3〜7 最低3日分 → できれば1週間分
    K.words(c2.el, [{ t: '最低', s: 72 }, { t: '3日分', c: C.coral }], { top: 430, size: 150, at: c2.s + .1 });
    K.icon(c2.el, ICON.arrow(), { cx: 540, cy: 720, size: 150, at: c2.s + .6, sway: 0 });
    K.words(c2.el, [{ t: 'できれば', s: 72 }, { t: '1週間分', c: C.coralD }], { top: 820, size: 124, at: c2.s + 1.0 });
    K.marker(c2.el, { left: 200, top: 990, width: 680, h: 30, at: c2.s + 1.5 });

    // 7〜15 チェックリスト：1つずつ出て、チェックが付く
    K.words(c3.el, ['家にあるか、チェック'], { top: 340, size: 64, at: c3.s + .1 });
    const items = [['水', ICON.water()], ['食料', ICON.food()], ['携帯トイレ', ICON.toilet()], ['ライト', ICON.light()], ['電池・充電器', ICON.battery()], ['常備薬', ICON.medicine()]];
    items.forEach(([label, icon], i) => {
      const d = document.createElement('div');
      d.className = 'check';
      d.style.top = (450 + i * 150) + 'px';
      d.innerHTML = `<div class="ic"><svg viewBox="-20 -20 240 240">${icon}</svg></div><div class="lb t">${label}</div><div class="bx"><svg viewBox="0 0 128 128">${ICON.check()}</svg></div>`;
      c3.el.appendChild(d);
      const at = c3.s + .5 + i * 1.05;
      gsap.set(d, { x: 200, opacity: 0 });
      K.tl.to(d, { x: 0, opacity: 1, duration: .35, ease: 'back.out(1.4)' }, at);
      K.cue(at, 'slide');
      const ck = d.querySelector('.bx svg');
      gsap.set(ck, { scale: 0, transformOrigin: '30% 70%' });
      K.tl.to(ck, { scale: 1, duration: .25, ease: 'back.out(3)' }, at + .45);
      K.cue(at + .45, 'pop');
    });

    // 15〜20 家族で話してみよう／災害用伝言ダイヤル 171
    K.words(c4.el, ['家族で'], { top: 410, size: 100, color: C.white, at: c4.s + .1 });
    K.words(c4.el, ['話してみよう'], { top: 540, size: 110, color: C.white, at: c4.s + .3 });
    K.line(c4.el, '災害用伝言ダイヤル', { top: 740, size: 64, color: C.white, at: c4.s + .7 });
    K.icon(c4.el, ICON.phone(), { cx: 300, cy: 920, size: 150, at: c4.s + .9, until: c4.e });
    K.words(c4.el, [{ t: '171', c: C.yellow }], { top: 830, size: 170, at: c4.s + 1.0 });
    K.pill(c4.el, '保存しておこう', { top: 1090, bg: C.coral, size: 48, at: c4.s + 1.4 });
    K.note(c4.el, ['出典：防災庁 発足時の「緊急要請」（2026年11月2日報道）ほか'], { top: 1300, size: 26, color: '#D7DBEA', at: c4.s + 1.2 });
  },
});
