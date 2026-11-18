/* R06 12/5(土) おみやげ、どれ派？ 15秒（写真なし版）
 * 商品の写真・パッケージの絵は使わない。名前＋地名＋シンプルなアイコンだけ。 */
REEL({
  file: 'おみやげどれ派',
  dur: 15,
  build(K) {
    const { C } = K;
    const [c1, c2, c3, c4, c5, c6] = K.cuts([
      { d: 2.5, bg: C.cream, burst: ['#F8DCC4', C.cream] },
      { d: 2.5, bg: C.coral },
      { d: 2.5, bg: C.pink },
      { d: 2.5, bg: C.mint },
      { d: 2.5, bg: C.yellow },
      { d: 2.5, bg: C.cream, dots: true },
    ]);

    // 0〜2.5 表紙
    K.words(c1.el, ['神奈川みやげ'], { top: 450, size: 120, at: .1 });
    K.words(c1.el, [{ t: 'どれ派？', c: C.coral }], { top: 610, size: 160, at: .35, shadow: true });
    K.icon(c1.el, ICON.bag(), { cx: 540, cy: 1040, size: 300, at: .6, until: c1.e });
    K.scatter(c1.el, [['star', C.yellow, 230, 960, 56], ['spark', C.coral, 850, 980, 50], ['heart', C.coral, 820, 1210, 44]], .8, c1.e);

    // A〜D：記号＋名前＋地名＋アイコン
    const item = (cut, mark, o) => {
      const onCoral = o.text === C.white;
      K.num(cut.el, mark, { cx: 400, cy: 520, d: 240, bg: onCoral ? C.white : C.coral, color: onCoral ? C.coral : C.white, at: cut.s + .1 });
      K.icon(cut.el, o.icon, { cx: 720, cy: 520, size: 260, at: cut.s + .3, until: cut.e });
      K.words(cut.el, [o.name], { top: 760, size: o.size, color: o.text, at: cut.s + .4 });
      K.pill(cut.el, o.city, { top: 770 + o.size * 1.25, bg: onCoral ? C.white : C.ink, color: onCoral ? C.coralD : C.white, size: 48, at: cut.s + .75 });
    };
    item(c2, 'A', { name: '横浜のシューマイ', size: 96, city: '横浜市', icon: ICON.seiro(), text: C.white });
    item(c3, 'B', { name: '鳩サブレー', size: 112, city: '鎌倉市', icon: ICON.bird(), text: C.ink });
    item(c4, 'C', { name: '小田原かまぼこ', size: 100, city: '小田原市', icon: ICON.kamaboko(), text: C.ink });
    item(c5, 'D', { name: 'よこすか海軍カレー', size: 86, city: '横須賀市', icon: ICON.curry(), text: C.ink });

    // 12.5〜15 締め
    K.words(c6.el, [{ t: 'A〜D', c: C.coral }, 'で'], { top: 420, size: 110, at: c6.s + .1 });
    K.words(c6.el, ['コメントしてね'], { top: 570, size: 96, at: c6.s + .3 });
    ['A', 'B', 'C', 'D'].forEach((m, i) => K.num(c6.el, m, { cx: 225 + i * 210, cy: 820, d: 160, bg: C.coral, color: C.white, at: c6.s + .5 + i * .1 }));
    K.pill(c6.el, '保存しておこう', { top: 980, bg: C.ink, size: 48, at: c6.s + 1.0 });
    K.note(c6.el, ['出典：神奈川県『かながわの名産100選』'], { top: 1300, size: 28, at: c6.s + .9 });
  },
});
