/* R02 11/22(日) 神奈川の冬、どれが好き？ 15秒（写真なし版）
 * 番号でコメントしてもらう。期間・料金は入れない（R05で扱う）。 */
REEL({
  file: '冬のイルミどれが好き',
  dur: 15,
  build(K) {
    const { C } = K;
    const cuts = K.cuts([
      { d: 2.5, bg: C.cream, burst: ['#E6E3EE', C.cream] },
      { d: 2.5, bg: C.navy },
      { d: 2.5, bg: C.coral },
      { d: 2.5, bg: C.mint },
      { d: 2.5, bg: C.navy },
      { d: 2.5, bg: C.cream, dots: true },
    ]);
    const [c1, c2, c3, c4, c5, c6] = cuts;

    // 0〜2.5 表紙
    K.fall(c1.el, 'snow', ['#C9D6EE', '#fff'], 0, c1.e + .3, 14, 54);
    K.words(c1.el, ['神奈川の冬、'], { top: 440, size: 130, at: .1 });
    K.words(c1.el, ['どれが', { t: '好き？', c: C.coral }], { top: 610, size: 130, at: .35 });
    K.marker(c1.el, { left: 240, top: 790, width: 600, h: 30, at: .75 });
    K.icon(c1.el, ICON.tree(), { cx: 540, cy: 1080, size: 330, at: .5, until: c1.e });
    K.scatter(c1.el, [['spark', C.yellow, 300, 960, 64], ['spark', C.coral, 790, 1000, 52], ['star', C.yellow, 820, 1220, 46], ['spark', C.navy, 260, 1230, 40]], .8, c1.e);

    // スポットのカット：大きな番号＋名前＋場所の3つだけ
    const spot = (cut, n, o) => {
      K.num(cut.el, n, { cx: 400, cy: 520, d: 260, bg: o.numBg, color: o.numColor, at: cut.s + .1 });
      K.icon(cut.el, o.icon, { cx: 730, cy: 520, size: 260, at: cut.s + .3, until: cut.e });
      o.name.forEach((ln, i) => K.words(cut.el, [ln], { top: 760 + i * (o.nameSize * 1.15), size: o.nameSize, color: o.text, at: cut.s + .35 + i * .15 }));
      if (o.place) K.line(cut.el, inlineIcon(ICON.pin(o.pin), 52) + o.place, { top: 790 + o.name.length * o.nameSize * 1.15, size: 54, color: o.text, weight: 700, at: cut.s + .7 });
    };
    // ① 光の粒がまたたく
    K.twinkle(c2.el, 26, [60, 300, 1020, 1500], c2.s - .2, c2.e + .2, ['#F6CD5A', '#fff', '#FFE7A3']);
    spot(c2, '1', { numBg: C.yellow, numColor: C.navy, icon: ICON.garland(), name: ['ヨコハマミライト'], nameSize: 96, text: C.white, place: '横浜駅東口〜みなとみらい', pin: C.yellow });
    // ② ツリー
    spot(c3, '2', { numBg: C.white, numColor: C.coral, icon: ICON.tree(), name: ['Christmas Market in', '横浜赤レンガ倉庫'], nameSize: 80, text: C.white });
    K.scatter(c3.el, [['star', C.yellow, 200, 330, 50], ['spark', C.white, 900, 360, 44]], c3.s + .5, c3.e);
    // ③ 宝石
    spot(c4, '3', { numBg: C.coral, numColor: C.white, icon: ICON.gem(), name: ['湘南の宝石'], nameSize: 112, text: C.ink, place: '江の島', pin: C.coral });
    K.scatter(c4.el, [['spark', C.white, 200, 320, 56], ['spark', '#5BA8E0', 900, 760, 44], ['spark', C.white, 860, 1240, 50]], c4.s + .5, c4.e);
    // ④ 音符と光
    K.twinkle(c5.el, 18, [60, 300, 1020, 1500], c5.s - .2, c5.e + .2, ['#F4D6CC', '#BFE6D3', '#F6CD5A']);
    spot(c5, '4', { numBg: C.mint, numColor: C.navy, icon: ICON.music(), name: ['ヨルノヨ2026'], nameSize: 104, text: C.white, place: '横浜都心臨海部', pin: C.mint });

    // 12.5〜15 締め
    K.words(c6.el, ['行きたい番号を'], { top: 420, size: 92, at: c6.s + .1 });
    K.words(c6.el, [{ t: 'コメント', c: C.coral }, 'で教えてね'], { top: 550, size: 84, at: c6.s + .3 });
    ['1', '2', '3', '4'].forEach((n, i) => K.num(c6.el, n, { cx: 225 + i * 210, cy: 820, d: 170, bg: C.navy, color: C.white, at: c6.s + .55 + i * .12 }));
    K.pill(c6.el, '保存しておこう', { top: 990, bg: C.coral, size: 48, at: c6.s + 1.1 });
    K.faces(c6.el, [[{ ...FACES[0], hat: '#EE7A5C' }, 230, 1770, 280], [{ ...FACES[1], hat: '#222C62' }, 540, 1800, 300], [{ ...FACES[2], hat: '#3E9F73' }, 850, 1770, 280]], c6.s + .8, c6.e);
    K.fall(c6.el, 'snow', ['#C9D6EE', '#fff'], c6.s - .3, c6.e, 10, 54);
  },
});
