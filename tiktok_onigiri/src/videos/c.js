// C Vlog版:「新卒ひとり暮らしのリアルな朝」から、話が母に寄っていく。PR表記あり
const sh = (t0, t1, draw, extra = {}) => ({ t0, t1, draw, ...extra });
const vlog = (t0, t1, text, extra = {}) => ({ t0, t1, text, y: 1360, size: 56, font: 'yomogi', weight: 400, style: 'box', bg: 'rgba(255,255,255,0.9)', color: '#2e2a27', anim: 'up', ...extra });
const story = (t0, t1, text) => ({ t0, t1, text, y: 330, size: 58, font: 'klee', weight: 600, style: 'soft', anim: 'up' });
function storyBoard(ctx, lt, t) {
  // ぼかした台所の上にポラロイドが重なる
  withFilter(ctx, 'blur(18px) brightness(0.75)', x => bgApartment(x, t), 'sb');
  const P = [
    [0.0, 380, 1000, -0.08, x => shotThreeFillings(x, 3), '梅・鮭・ソーセージ', true],
    [3.0, 700, 1040, 0.07, x => shotMemoryMom(x, 0.1, { talk: [9, 9] }), 'いってらっしゃい', true],
    [6.0, 420, 1080, -0.04, x => shotMomNod(x, 1.8, { k: [0.1, 0.45, 0.75] }), 'あの日', true],
    [9.0, 640, 1020, 0.05, x => shotIzakayaBite(x, 3.2, { biteAt: 1.0 }), 'きのう', false],
  ];
  P.forEach(([t0, x, y, rot, fn, label, sep]) => {
    if (lt < t0) return;
    const p = tw(lt, t0, t0 + 0.5, E.outQuint);
    polaroid(ctx, lerp(x + 900, x, p), y, 1.18, rot + (1 - p) * 0.3, fn, label, 1, sep);
  });
}
window.VIDEO = {
  duration: 44,
  shots: [
    sh(0, 3.0, (c, lt) => shotAlarm(c, lt, { hitAt: 1.2 })),
    sh(3.0, 6.0, (c, lt) => {
      camera(c, { zoom: 1.0 + lt * 0.03 }, () => {
        bgApartment(c, lt);
        drawRiceCooker(c, 540, 1360, 1.5, tw(lt, 0.4, 1.0), lt);
      });
    }),
    sh(6.0, 8.6, (c, lt) => shotPotBoil(c, lt)),
    sh(8.6, 12.8, (c, lt) => shotFillingsVlog(c, lt)),
    sh(12.8, 25.4, (c, lt, t) => storyBoard(c, lt, t)),
    sh(25.4, 30.4, (c, lt) => shotMakeOnigiri(c, lt, { warm: 0.6 })),
    sh(30.4, 32.0, (c, lt) => shotFlatLay(c, lt, { shutterAt: 0.9 })),
    sh(32.0, 36.2, (c, lt) => shotChat(c, lt, {
      base: [{ text: '元気にやってる？\n無理しないでね', time: '22:14' }],
      photoAt: 0.2,
      ops: [{ at: 0.8, type: 'ソーセージのやつ、うまいな', dur: 1.2 }, { at: 2.4, send: true }],
      readAt: 3.2,
    })),
    sh(36.2, 37.8, (c, lt) => shotDoorOpen(c, lt, { openAt: 0.2, sleeve: '#2c3753' })),
    sh(37.8, 40.6, (c, lt) => shotBoardTrain(c, lt)),
    sh(40.6, 44.0, (c, lt) => endCard(c, lt, { sub: 'あなたの家のおにぎりの具、\nなんだった？', tag: '#うちのおにぎり' })),
  ],
  caps: [
    { t0: 0, t1: 3.0, inD: 0, text: '新卒ひとり暮らし\n半年目の、リアルな朝', y: 540, size: 76, font: 'yomogi', weight: 400, style: 'box', bg: 'rgba(255,255,255,0.92)', color: '#2e2a27' },
    { t0: 0, t1: 3.0, inD: 0, text: 'AM 6:30', y: 300, size: 50, font: 'yomogi', weight: 400, style: 'box', bg: 'rgba(255,255,255,0.85)', color: '#333' },
    vlog(3.2, 4.9, 'お弁当は自分で作る、と決めた'),
    vlog(4.9, 6.0, '(半年続いてる。えらい)', { size: 48 }),
    vlog(6.1, 8.6, '味噌汁、今日もふきこぼす'),
    vlog(8.8, 9.8, '具は、梅と'),
    vlog(9.8, 10.9, '鮭と'),
    vlog(11.2, 12.8, '……ソーセージ。', { size: 64 }),
    story(13.0, 15.7, '子供の頃、母のおにぎりは\nいつもこの3つだった'),
    story(16.0, 18.7, 'お礼も言わずに\n鞄に放り込んでた'),
    story(19.0, 21.7, '高校のとき\n恥ずかしいからやめろって言った'),
    story(22.0, 23.8, '昨日、居酒屋で\n同じおにぎりに出会って'),
    story(23.8, 25.3, 'ちょっと泣きそうになった'),
    vlog(25.6, 28.4, 'だから今日は、ソーセージ'),
    vlog(30.6, 32.0, 'ちょっといびつ', { size: 52 }),
    vlog(36.3, 37.8, 'いってきます'),
    { t0: 38.0, t1: 40.5, text: 'AM 7:42', y: 300, size: 50, font: 'yomogi', weight: 400, style: 'box', bg: 'rgba(255,255,255,0.85)', color: '#333' },
    vlog(38.2, 40.5, '今日は、間に合った', { size: 60 }),
  ],
  post(ctx, t) {
    prLabel(ctx);
    fade(ctx, seg(t, 43.6, 44), '#000');
  },
  audio: [
    { t: 0, type: 'lofi', dur: 11.0, bpm: 87.27, vol: 0.9 },
    { t: 0, type: 'alarm', dur: 1.2, vol: 0.7 },
    { t: 1.2, type: 'slap' },
    { t: 1.5, type: 'birds', dur: 2.5, vol: 0.6 },
    { t: 3.4, type: 'steam', dur: 2.2 },
    { t: 6.0, type: 'boil', dur: 2.6 },
    { t: 8.8, type: 'place' }, { t: 9.8, type: 'place' },
    { t: 10.9, type: 'fridge' },
    { t: 11.2, type: 'room', dur: 1.6 },
    { t: 12.8, type: 'whoosh', vol: 0.5 }, { t: 15.8, type: 'whoosh', vol: 0.5 }, { t: 18.8, type: 'whoosh', vol: 0.5 }, { t: 21.8, type: 'whoosh', vol: 0.5 },
    { t: 12.8, type: 'piano', dur: 13.6, resolveAt: 25.4, bar: 2.8 },
    { t: 25.4, type: 'lofi', dur: 15.2, bpm: 82, vol: 0.75 },
    { t: 26.9, type: 'squeeze' }, { t: 27.6, type: 'squeeze' }, { t: 28.3, type: 'squeeze' },
    { t: 31.3, type: 'shutter' },
    { t: 32.2, type: 'pop' },
    { t: 32.8, type: 'typing', dur: 1.2 },
    { t: 34.4, type: 'send' },
    { t: 36.4, type: 'dooropen' },
    { t: 37.8, type: 'train', dur: 2.8, vol: 0.8 },
    { t: 40.0, type: 'doorclose', vol: 0.6 },
    { t: 40.6, type: 'sparkle' },
  ],
};
