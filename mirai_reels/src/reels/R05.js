/* R05 12/2(水) イルミネーション（開催情報） 20秒（写真なし版）
 * R02の4か所に期間・時間・料金を入れる。1か所4秒、最初と最後2秒。背景はネイビーとクリームを交互に。
 * 数字はすべて指示書の表（各イベント公式サイト、2026年11月11日時点）のとおり。 */
REEL({
  file: 'イルミネーション開催情報',
  dur: 20,
  build(K) {
    const { C } = K;
    const [c1, c2, c3, c4, c5, c6] = K.cuts([
      { d: 2, bg: C.cream, burst: ['#E6E3EE', C.cream] },
      { d: 4, bg: C.navy },
      { d: 4, bg: C.cream, dots: true },
      { d: 4, bg: C.navy },
      { d: 4, bg: C.cream, dots: true },
      { d: 2, bg: C.navy },
    ]);

    // 0〜2 表紙
    K.fall(c1.el, 'snow', ['#C9D6EE', '#fff'], 0, c1.e + .3, 12, 54);
    K.pill(c1.el, '保存版', { top: 420, bg: C.coral, size: 48, at: .05 });
    K.words(c1.el, ['イルミネーション'], { top: 530, size: 96, at: .15 });
    K.words(c1.el, [{ t: '開催情報', c: C.coral }], { top: 660, size: 150, at: .4, shadow: true });
    K.line(c1.el, '4か所の期間・時間・料金', { top: 870, size: 56, weight: 700, at: .6 });
    K.icon(c1.el, ICON.garland(), { cx: 540, cy: 1130, size: 420, at: .5, until: c1.e, sway: 2 });

    // スポット：番号＋名前＋期間・時間・料金のカード
    const spot = (cut, n, o) => {
      const dark = cut.el.style.backgroundColor !== '' && o.dark;
      K.num(cut.el, n, { cx: 400, cy: 440, d: 170, bg: dark ? C.yellow : C.navy, color: dark ? C.navy : C.white, at: cut.s + .1 });
      K.icon(cut.el, o.icon, { cx: 690, cy: 440, size: 190, at: cut.s + .25, until: cut.e });
      o.name.forEach((ln, i) => K.words(cut.el, [ln], { top: 570 + i * o.size * 1.15, size: o.size, color: dark ? C.white : C.ink, at: cut.s + .3 + i * .15 }));
      const top = 600 + o.name.length * o.size * 1.15;
      const row = (lab, val) => `<div class="row"><span class="lab">${lab}</span><span class="val t">${val}</span></div>`;
      K.card(cut.el, row('期間', o.period) + row('時間', o.time) + row('料金', o.fee), { top, at: cut.s + .7 });
    };
    spot(c2, '1', { dark: true, icon: ICON.garland(), name: ['ヨコハマミライト'], size: 84, period: '2026/11/13(金)〜<br>2027/3/31(水)', time: '16:00〜23:00', fee: '観覧無料' });
    spot(c3, '2', { icon: ICON.tree(), name: ['Christmas Market in', '横浜赤レンガ倉庫'], size: 66, period: '2026/11/20(金)〜12/25(金)', time: 'ライトアップ<br>16:00〜営業終了', fee: '入場500円〜<br>（無料エリアあり）' });
    spot(c4, '3', { dark: true, icon: ICON.gem(), name: ['湘南の宝石（江の島）'], size: 76, period: '2026/12/1(火)〜<br>2027/2/28(日)', time: '17:00〜20:00<br>（土日祝など21:00まで）', fee: 'サムエル・コッキング苑<br>夜間 大人500円' });
    spot(c5, '4', { icon: ICON.music(), name: ['ヨルノヨ2026'], size: 84, period: '2026/12/4(金)〜12/30(水)', time: '17:00〜21:05', fee: '入場無料' });
    K.twinkle(c2.el, 16, [60, 300, 1020, 560], c2.s - .2, c2.e + .2, ['#F6CD5A', '#fff']);
    K.twinkle(c4.el, 16, [60, 300, 1020, 560], c4.s - .2, c4.e + .2, ['#86C2EC', '#fff']);

    // 18〜20 締め
    K.words(c6.el, [{ t: '誰', c: C.yellow }, 'と行きたい？'], { top: 420, size: 104, color: C.white, at: c6.s + .05, gap: .12 });
    K.words(c6.el, ['コメントで教えてね'], { top: 570, size: 72, color: C.white, at: c6.s + .2 });
    K.pill(c6.el, '保存しておこう', { top: 700, bg: C.coral, size: 48, at: c6.s + .35 });
    K.note(c6.el, ['出典：各イベント公式サイト（2026年11月11日時点）', '※内容は変更の場合あり。最新情報は公式サイトで確認を'], { top: 1270, size: 26, color: '#D7DBEA', at: c6.s + .5 });
    K.scatter(c6.el, [['star', C.yellow, 200, 470, 56], ['spark', C.white, 880, 450, 50], ['spark', C.yellow, 860, 1040, 44]], c6.s + .5, c6.e);
  },
});
