/* R03 11/25(水) 紅葉ライトアップ4スポット 18秒（写真なし版） */
REEL({
  file: '紅葉ライトアップ4スポット',
  dur: 18,
  build(K) {
    const { C } = K;
    const [c1, c2, c3, c4, c5, c6] = K.cuts([
      { d: 3, bg: C.cream, burst: ['#F8DCC4', C.cream] },
      { d: 3, bg: C.coral },
      { d: 3, bg: C.pink },
      { d: 3, bg: C.yellow },
      { d: 3, bg: C.coral },
      { d: 3, bg: C.cream, dots: true },
    ]);
    const LEAF = ['#EE7A5C', '#D9603F', '#F29B38', '#F6CD5A'];

    // 0〜3 表紙：もみじがひらひら落ちる
    K.fall(c1.el, 'maple', LEAF, 0, c1.e + .3, 10, 74);
    K.words(c1.el, ['神奈川の', { t: '紅葉', c: C.coral }], { top: 470, size: 130, at: .15 });
    K.pill(c1.el, 'この秋行きたい4スポット', { top: 680, bg: C.ink, size: 54, at: .6 });
    K.icon(c1.el, ICON.maple(C.coral), { cx: 540, cy: 1040, size: 320, at: .8, until: c1.e, sway: 7 });

    // スポットのカット：番号・名前・市町村・ライトアップや見ごろ
    const spot = (cut, n, o) => {
      const onCoral = o.text === C.white;
      K.num(cut.el, n, { cx: 400, cy: 500, d: 220, bg: onCoral ? C.white : C.coral, color: onCoral ? C.coral : C.white, at: cut.s + .1 });
      K.icon(cut.el, o.icon, { cx: 720, cy: 500, size: 250, at: cut.s + .3, until: cut.e });
      o.name.forEach((ln, i) => K.words(cut.el, [ln], { top: 670 + i * o.size * 1.15, size: o.size, color: o.text, at: cut.s + .35 + i * .15 }));
      let y = 690 + o.name.length * o.size * 1.15;
      K.pill(cut.el, o.city, { top: y, bg: onCoral ? C.white : C.ink, color: onCoral ? C.coralD : C.white, size: 44, at: cut.s + .7 });
      y += 100;
      K.line(cut.el, o.what, { top: y, size: 56, color: o.text, weight: 700, at: cut.s + .9 });
      K.words(cut.el, [o.when], { top: y + 80, size: 72, color: o.text, at: cut.s + 1.05 });
      if (o.extra) K.pill(cut.el, o.extra, { top: y + 190, bg: C.yellow, color: C.ink, size: 46, at: cut.s + 1.3 });
    };
    spot(c2, '1', { icon: ICON.mountain(), name: ['大山寺・', '大山阿夫利神社下社'], size: 80, text: C.white, city: '伊勢原市', what: 'ライトアップ', when: '11/20(金)〜11/29(日)' });
    spot(c3, '2', { icon: ICON.mapleTree(), name: ['大磯城山公園'], size: 96, text: C.ink, city: '大磯町', what: 'もみじのライトアップ', when: '11/27(金)〜11/29(日)', extra: '入場無料' });
    spot(c4, '3', { icon: ICON.metasequoia(), name: ['県立相模原公園'], size: 96, text: C.ink, city: '相模原市', what: 'メタセコイア並木', when: '11月下旬〜12月上旬' });
    spot(c5, '4', { icon: ICON.garden(), name: ['三溪園'], size: 120, text: C.white, city: '横浜市', what: '見ごろ', when: '11月中旬〜12月中旬' });
    [c2, c3, c4, c5].forEach((c, i) => K.scatter(c.el, [['maple', LEAF[(i + 1) % 4], 190, 320, 56], ['maple', LEAF[(i + 2) % 4], 890, 1240, 50]], c.s + .6, c.e));

    // 15〜18 締め
    K.fall(c6.el, 'maple', LEAF, c6.s - .3, c6.e, 6, 64);
    K.words(c6.el, ['行ったことある場所、'], { top: 420, size: 76, at: c6.s + .1 });
    K.words(c6.el, [{ t: 'コメント', c: C.coral }, 'で教えてね'], { top: 530, size: 76, at: c6.s + .3 });
    K.pill(c6.el, '保存して紅葉さんぽへ', { top: 680, bg: C.coral, size: 52, at: c6.s + .6 });
    ['1', '2', '3', '4'].forEach((n, i) => K.num(c6.el, n, { cx: 240 + i * 200, cy: 920, d: 140, bg: LEAF[i], color: C.white, at: c6.s + .8 + i * .1 }));
    K.note(c6.el, ['出典：観光かながわNOW『神奈川の紅葉・黄葉の名所2026』ほか', '※見ごろは気象条件で前後します'], { top: 1290, size: 24, at: c6.s + .9 });
  },
});
