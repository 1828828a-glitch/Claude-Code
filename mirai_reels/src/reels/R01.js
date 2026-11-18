/* R01 11/20(金) 第8弾 告知 15秒（写真なし版）
 * 許諾が取れたら、6〜9秒のカットに鳩サブレー缶の写真を入れられるよう、写真枠を別の層にしてある（reels.json の photo）。 */
REEL({
  file: '第8弾告知',
  dur: 15,
  build(K) {
    const { C } = K;
    const [c1, c2, c3, c4, c5] = K.cuts([
      { d: 3, bg: C.cream, burst: ['#F9DCC6', C.cream] },
      { d: 3, bg: C.coral },
      { d: 3, bg: C.pink },
      { d: 3, bg: C.mint },
      { d: 3, bg: C.cream, dots: true },
    ]);

    // 0〜3 プレゼントキャンペーン第8弾
    K.words(c1.el, ['プレゼント'], { top: 450, size: 140, at: .15 });
    K.words(c1.el, ['キャンペーン'], { top: 630, size: 116, at: .4 });
    K.words(c1.el, [{ t: '第8弾', c: C.coral }], { top: 780, size: 190, at: .65, shadow: true });
    K.marker(c1.el, { left: 290, top: 990, width: 500, h: 36, at: 1.0 });
    K.icon(c1.el, ICON.gift(), { cx: 540, cy: 1200, size: 230, at: .9, until: c1.e });
    K.scatter(c1.el, [['star', C.yellow, 210, 520, 60], ['spark', C.coral, 880, 470, 56], ['star', C.coral, 860, 900, 44], ['spark', C.yellow, 190, 900, 48]], 1.1, c1.e);

    // 3〜6 お題の吹き出し
    K.pill(c2.el, '今回のお題', { top: 470, bg: C.white, color: C.coralD, size: 46, at: c2.s + .1 });
    K.bubble(c2.el, '今年、“神奈川で”<br>できたことは？', { top: 620, size: 80, at: c2.s + .3, tail: 'bl' });
    K.scatter(c2.el, [['star', C.yellow, 200, 520, 64], ['star', C.white, 880, 560, 54], ['spark', C.white, 860, 1020, 60], ['star', C.yellow, 220, 1060, 50], ['spark', C.yellow, 540, 1180, 56]], c2.s + .7, c2.e);

    // 6〜9 賞品（写真は使わず、プレゼント箱と文字だけ）
    const photo = K.data.photo;
    if (photo && photo.src) {
      // 許諾後に写真を入れるための枠。写真は加工せず、トリミングと移動だけ
      const f = document.createElement('div');
      f.className = 'photo';
      f.style.cssText = 'position:absolute;left:240px;top:360px;width:600px;height:420px;border-radius:32px;overflow:hidden;background:#fff';
      f.innerHTML = `<img src="../${photo.src}" style="width:100%;height:100%;object-fit:cover">`;
      c3.el.appendChild(f);
      K.note(c3.el, [photo.credit], { top: 1480, size: 24, at: c3.s + .2 });
    } else {
      K.icon(c3.el, ICON.gift(C.coral, C.yellow), { cx: 540, cy: 560, size: 360, at: c3.s + .1, until: c3.e });
    }
    K.words(c3.el, ['抽選で', { t: '10名', c: C.coralD }, 'に'], { top: 820, size: 88, at: c3.s + .35 });
    K.line(c3.el, '豊島屋『鳩サブレー』', { top: 960, size: 72, at: c3.s + .7 });
    K.line(c3.el, '16枚入（缶）', { top: 1060, size: 72, at: c3.s + .85 });
    K.scatter(c3.el, [['spark', C.coral, 230, 460, 54], ['star', C.yellow, 850, 430, 60], ['spark', C.white, 860, 700, 44]], c3.s + .5, c3.e);

    // 9〜12 応募方法 2ステップ
    K.words(c4.el, ['応募方法'], { top: 380, size: 110, at: c4.s + .1 });
    const step = (n, html, top, at) => {
      const d = document.createElement('div');
      d.className = 'step';
      d.style.top = top + 'px';
      d.innerHTML = `<div class="n">${n}</div><div class="s t">${html}</div>`;
      c4.el.appendChild(d);
      gsap.set(d, { x: 260, opacity: 0 });
      K.tl.to(d, { x: 0, opacity: 1, duration: .4, ease: 'back.out(1.4)' }, at);
      K.cue(at, 'slide');
      return d;
    };
    step('1', '<span style="font-size:36px">@kanagawa_mirai_canvas_official</span><br><span style="font-size:58px">をフォロー</span>', 580, c4.s + .45);
    step('2', '<span style="font-size:64px">投稿にコメント</span>', 850, c4.s + .85);
    K.icon(c4.el, ICON.follow(), { cx: 300, cy: 1180, size: 180, at: c4.s + 1.1, until: c4.e });
    K.icon(c4.el, ICON.comment(C.white, C.coral), { cx: 780, cy: 1180, size: 180, at: c4.s + 1.25, until: c4.e });

    // 12〜15 応募期間
    K.pill(c5.el, '応募期間', { top: 430, bg: C.ink, size: 48, at: c5.s + .1 });
    K.words(c5.el, ['11/20(金)12:00〜'], { top: 560, size: 84, at: c5.s + .3 });
    K.words(c5.el, [{ t: '11/30(月)23:59', c: C.coralD }], { top: 680, size: 84, at: c5.s + .5 });
    K.marker(c5.el, { left: 200, top: 790, width: 680, h: 30, at: c5.s + .8 });
    K.line(c5.el, 'くわしくは投稿をチェック', { top: 900, size: 64, at: c5.s + .9 });
    K.faces(c5.el, [[FACES[0], 230, 1760, 280], [FACES[1], 540, 1790, 300], [FACES[2], 850, 1760, 280]], c5.s + .8, c5.e);
    K.scatter(c5.el, [['star', C.yellow, 180, 600, 56], ['spark', C.coral, 900, 620, 50], ['star', C.coral, 520, 1100, 44]], c5.s + 1.0, c5.e);
  },
});
