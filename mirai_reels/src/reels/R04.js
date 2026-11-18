/* R04 11/28(土) 第8弾 しめきりまであと3日 10秒（文字だけ版） */
REEL({
  file: '第8弾しめきりまであと3日',
  dur: 10,
  build(K) {
    const { C } = K;
    const [c1, c2, c3] = K.cuts([
      { d: 3, bg: C.coral },
      { d: 4, bg: C.cream, dots: true },
      { d: 3, bg: C.coral },
    ]);
    const shade = '0 7px 0 rgba(150,50,30,.25)';

    // 0〜3 しめきりまで → あと3日。時計が揺れる
    K.words(c1.el, ['しめきりまで'], { top: 450, size: 96, color: C.white, shadow: shade, at: .15 });
    K.words(c1.el, [{ t: 'あと', s: 120 }, { t: '3', c: C.yellow, s: 320 }, { t: '日', s: 120 }], { top: 560, size: 120, color: C.white, shadow: shade, at: .7, gap: .22 });
    K.marker(c1.el, { left: 250, top: 920, width: 580, h: 34, color: C.yellow, at: 1.3 });
    K.icon(c1.el, ICON.clock(), { cx: 540, cy: 1170, size: 250, at: 1.0, until: c1.e, sway: 10 });
    K.scatter(c1.el, [['star', C.yellow, 220, 640, 60], ['spark', C.white, 880, 620, 56], ['spark', C.yellow, 860, 1000, 44]], 1.4, c1.e);

    // 3〜7 お題と賞品
    K.bubble(c2.el, '今年、“神奈川で”<br>できたことは？', { top: 380, size: 76, at: c2.s + .1, tail: 'bl' });
    K.pill(c2.el, 'コメントで応募', { top: 720, bg: C.coral, size: 60, at: c2.s + .6 });
    K.words(c2.el, ['抽選で', { t: '10名', c: C.coralD }, 'に'], { top: 870, size: 80, at: c2.s + .9 });
    K.words(c2.el, ['鳩サブレー16枚缶'], { top: 990, size: 86, at: c2.s + 1.2 });
    K.marker(c2.el, { left: 160, top: 1090, width: 760, h: 26, at: c2.s + 1.5 });
    K.icon(c2.el, ICON.gift(), { cx: 540, cy: 1300, size: 200, at: c2.s + 1.4, until: c2.e });

    // 7〜10 しめきり日時と応募先
    K.words(c3.el, ['11/30(月)23:59', { t: 'まで', s: 64 }], { top: 470, size: 76, color: C.white, shadow: shade, at: c3.s + .1 });
    K.marker(c3.el, { left: 160, top: 580, width: 760, h: 26, color: C.yellow, at: c3.s + .5 });
    K.line(c3.el, '応募は', { top: 690, size: 58, color: C.white, at: c3.s + .6 });
    K.line(c3.el, '@kanagawa_mirai_canvas_official', { top: 780, size: 44, color: C.white, at: c3.s + .75 });
    K.line(c3.el, 'の投稿から', { top: 850, size: 58, color: C.white, at: c3.s + .9 });
    K.icon(c3.el, ICON.comment(C.white, C.coral), { cx: 540, cy: 1110, size: 200, at: c3.s + 1.0, until: c3.e });
  },
});
