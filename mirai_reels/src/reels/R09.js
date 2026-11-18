/* R09 12/16(水) みんなの声、集めました 15秒（テンプレート）
 * 12/3ストーリーズの答えを吹き出しで1つずつ（2秒×6個）。文言は spec/reels.json の R09 texts から読む。
 * texts_status が「仮」の間は、画面に注意書きが出て、ファイル名に _仮文言 が付く。 */
REEL({
  file: 'みんなの声集めました',
  dur: 15,
  build(K) {
    const { C } = K;
    const texts = (K.data.texts || []).slice(0, 6);
    // 答えが6つに足りないときは空き枠で埋め、確定にしてあっても仮の扱いに戻す（注意書きと _仮文言 が付く）
    if (texts.length < 6) K.data.texts_status = '仮';
    while (texts.length < 6) texts.push('（答えをここに入れる）');
    const list = texts.map((_, i) => ({ d: 2, bg: i % 2 ? C.mint : C.cream, dots: i % 2 === 0 }));
    list.push({ d: 3, bg: C.cream, burst: ['#F8DCC4', C.cream] });
    const cuts = K.cuts(list);
    const last = cuts[6];

    // 1枚目だけタイトルを出し、毎回同じ問いを上に置く
    K.words(cuts[0].el, ['みんなの声、', '\n', '集めました'], { top: 350, size: 92, at: .1, gap: .2 });
    texts.forEach((t, i) => {
      const c = cuts[i];
      K.pill(c.el, 'Q. 神奈川の好きなところは？', { top: i === 0 ? 600 : 400, bg: C.ink, size: 44, at: c.s + (i === 0 ? .5 : .1) });
      const size = Math.min(84, Math.floor(700 / [...t].length));
      K.bubble(c.el, t, { top: i === 0 ? 780 : 640, size, at: c.s + (i === 0 ? .7 : .3), tail: i % 2 ? 'br' : 'bl', from: i % 2 ? 'right' : 'left' });
      K.scatter(c.el, [['heart', C.coral, i % 2 ? 230 : 850, 1080, 52], ['spark', C.yellow, i % 2 ? 860 : 220, 1120, 46]], c.s + .7, c.e);
    });
    K.faces(cuts[0].el, [[FACES[3], 250, 1770, 260], [FACES[4], 830, 1770, 260]], .6, cuts[0].e);

    // 12〜15 締め
    K.words(last.el, ['あなたの答えも'], { top: 430, size: 96, at: last.s + .1 });
    K.words(last.el, [{ t: 'コメント', c: C.coral }, 'で'], { top: 570, size: 120, at: last.s + .35 });
    K.icon(last.el, ICON.comment(C.white, C.coral), { cx: 540, cy: 960, size: 260, at: last.s + .6, until: last.e });
    K.note(last.el, ['※いただいた答えの一部を、', 'アカウント名なしで紹介しています'], { top: 1260, size: 30, at: last.s + .8 });
  },
});
