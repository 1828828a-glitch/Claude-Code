/* R07 12/9(水) 折り紙トゥンクトゥンク 15秒（撮影なし版・公開は GREEN×EXPO推進本部室の確認後）
 * 折り方は図形で示す。トゥンクトゥンクのキャラクターそのものは描かず、パーツを1つずつ見せる。 */
REEL({
  file: '折り紙トゥンクトゥンク',
  dur: 15,
  build(K) {
    const { C } = K;
    const [c1, c2, c3, c4, c5] = K.cuts([
      { d: 3, bg: C.mint },
      { d: 3, bg: C.cream, dots: true },
      { d: 3, bg: C.pink },
      { d: 3, bg: C.yellow },
      { d: 3, bg: C.mint },
    ]);

    // 0〜3 表紙
    K.words(c1.el, ['折り紙で', '作ろう！'], { top: 470, size: 100, at: .15 });
    K.words(c1.el, [{ t: 'トゥンクトゥンク', c: C.coralD }], { top: 640, size: 96, at: .55, shadow: true });
    K.marker(c1.el, { left: 160, top: 770, width: 760, h: 30, color: C.yellow, at: .9 });
    K.icon(c1.el, ICON.origami(), { cx: 540, cy: 1060, size: 300, at: .8, until: c1.e });
    K.scatter(c1.el, [['star', C.yellow, 230, 980, 56], ['spark', C.coral, 860, 1000, 50]], 1.0, c1.e);

    // パーツを1つずつ
    const part = (cut, title, sub, icon) => {
      K.words(cut.el, title, { top: 440, size: 116, at: cut.s + .1 });
      K.line(cut.el, sub, { top: 610, size: 62, weight: 700, at: cut.s + .5 });
      K.icon(cut.el, icon, { cx: 540, cy: 980, size: 340, at: cut.s + .35, until: cut.e });
    };
    part(c2, [{ t: '①', c: C.coral }, ' 地球'], 'まずは体になるパーツ', ICON.earth());
    part(c3, [{ t: '②', c: C.coral }, ' あし'], '地球の下につけるパーツ', ICON.legs());
    part(c4, [{ t: '③', c: C.coral }, ' ハートの顔'], '最後に顔をつけて完成！', ICON.heart());
    K.scatter(c4.el, [['spark', C.white, 300, 860, 60], ['star', C.coral, 790, 880, 54], ['spark', C.white, 780, 1140, 46]], c4.s + .7, c4.e);

    // 12〜15 検索と呼びかけ
    const s = document.createElement('div');
    s.className = 'search';
    s.style.top = '440px';
    s.innerHTML = `${inlineIcon(ICON.lens(), 54)}<span class="q t">神奈川県 折り紙トゥンクトゥンク</span>`;
    c5.el.appendChild(s);
    gsap.set(s, { y: 40, opacity: 0 });
    K.tl.to(s, { y: 0, opacity: 1, duration: .35 }, c5.s + .1);
    K.words(c5.el, ['で検索！'], { top: 580, size: 92, at: c5.s + .4 });
    K.words(c5.el, ['作ったら', { t: '写真', c: C.coralD }, 'を見せてね'], { top: 740, size: 70, at: c5.s + .7 });
    K.icon(c5.el, ICON.comment(C.white, C.coral), { cx: 540, cy: 1040, size: 200, at: c5.s + 1.0, until: c5.e });
    K.note(c5.el, ['出典：神奈川県 環境農政局 GREEN×EXPO推進本部室'], { top: 1300, size: 28, at: c5.s + .9 });
  },
});
