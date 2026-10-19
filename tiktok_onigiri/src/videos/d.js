// D 母視点の続編:「お母さん側の話も見たい」コメントへの動画返信
const sh = (t0, t1, draw, extra = {}) => ({ t0, t1, draw, ...extra });
const mem = { filter: SEPIA, fx: memoryFx };
const momN = (t0, t1, text, y = 340, extra = {}) => ({ t0, t1, text, y, size: 60, font: 'klee', weight: 600, style: 'soft', anim: 'up', ...extra });
window.VIDEO = {
  duration: 42,
  shots: [
    sh(0, 3.6, (c, lt) => shotNightMom(c, lt)),
    sh(3.6, 5.2, (c, lt) => shotTeenComplain(c, lt, { talk: [0.05, 1.5] }), mem),
    sh(5.2, 7.8, (c, lt) => shotMomNod(c, lt, { k: [0.05, 0.4, 0.7] }), mem),
    sh(7.8, 12.2, (c, lt) => shotSausageHesitate(c, lt), mem),
    sh(12.2, 15.4, (c, lt) => shotGenkanMom(c, lt), mem),
    sh(15.4, 18.6, (c, lt) => shotNightMom(c, lt, { phone: false, ex: { smile: 0.05, eye: 0.7, look: [-0.4, 0.6], brow: -0.4 } })),
    sh(18.6, 25.4, (c, lt) => shotChat(c, lt, {
      name: 'そうた', avatar: avatarSon,
      base: [{ text: '了解', time: '9/2' }],
      ops: [{ at: 0.8, type: 'ちゃんとご飯食べてる？お弁当は？仕事は大丈夫？', dur: 2.0 }, { at: 3.4, del: true, dur: 0.8 }, { at: 4.6, type: '元気にやってる？無理しないでね', dur: 1.2 }, { at: 6.0, send: true }],
      kbFrom: 0.4,
    })),
    sh(25.4, 28.0, (c, lt) => shotChat(c, lt, {
      name: 'そうた', avatar: avatarSon,
      base: [{ text: '了解', time: '9/2' }, { me: true, text: '元気にやってる？無理しないでね', time: '22:14', read: true }],
      ops: [], replies: [{ at: 0.5, photo: true, time: '7:12' }, { at: 1.3, text: 'ソーセージのやつ、うまいな', time: '7:12' }],
      kbFrom: 99,
    })),
    sh(28.0, 31.6, (c, lt) => shotMomReact(c, lt)),
    sh(31.6, 34.4, (c, lt) => shotChat(c, lt, {
      name: 'そうた', avatar: avatarSon,
      base: [{ me: true, text: '元気にやってる？無理しないでね', time: '22:14', read: true }, { photo: true, time: '7:12' }, { text: 'ソーセージのやつ、うまいな', time: '7:12' }],
      ops: [{ at: 0.6, type: 'でしょ', dur: 0.4 }, { at: 1.4, send: true }],
      kbFrom: 0.2, readAt: 2.2,
    })),
    sh(34.4, 38.0, (c, lt) => shotMakeOnigiri(c, lt + 0.4, { sleeve: '#86977c', warm: 1 })),
    sh(38.0, 42.0, (c, lt) => endCard(c, lt, { sub: 'あなたの家のおにぎりの具、\nなんだった？', tag: '#うちのおにぎり' })),
  ],
  caps: [
    momN(1.0, 3.6, 'あの日の、母の話', 1300),
    { t0: 3.6, t1: 4.5, inD: 0, text: '母さん、おにぎりに\nソーセージ入れるのやめろよ', y: 470, size: 62, style: 'box' },
    { t0: 4.45, t1: 5.2, text: '恥ずかしいから', y: 520, size: 80, style: 'box', anim: 'pop' },
    momN(5.6, 7.8, 'そう言われた日のことは\nよく覚えてる'),
    momN(8.0, 10.1, '小さい頃、あの子が\nいちばん喜んだ具だったのにね', 330),
    momN(10.2, 12.2, '次の日から、入れるのをやめた', 330),
    momN(13.6, 15.4, '返事はなかったけど\n毎朝言ってた', 330),
    momN(15.6, 18.6, 'あの子が家を出て、半年', 330),
    momN(24.0, 25.4, 'うるさいと思われたくなくて\n短くした', 880, { size: 56 }),
    momN(28.3, 31.6, '朝、写真が届いた', 330),
    momN(33.15, 34.4, 'でしょ、とだけ返した', 1240, { size: 56 }),
    momN(34.6, 38.0, '今日は、わたしもソーセージ', 330),
  ],
  post(ctx, t) {
    if (t < 3.6) replySticker(ctx, 540, 520, 1.0, '@onigiri_daisuki', 'お母さん側の話も見たいです', Math.min(seg(t, 0, 0.2), 1 - seg(t, 3.3, 3.6)));
    fade(ctx, seg(t, 41.6, 42), '#000');
  },
  audio: [
    { t: 0, type: 'room', dur: 3.6 },
    { t: 0, type: 'fridge', vol: 0.3 },
    { t: 1.0, type: 'tea' },
    { t: 3.5, type: 'rewind', vol: 0.7 },
    { t: 0.3, type: 'musicbox', dur: 15.1 },
    { t: 12.3, type: 'door', vol: 0.8 },
    { t: 15.4, type: 'room', dur: 3.2 },
    { t: 15.4, type: 'piano', dur: 26.6, resolveAt: 38.0, bar: 2.9 },
    { t: 19.4, type: 'typing', dur: 2.0 }, { t: 22.0, type: 'typing', dur: 0.8, del: true }, { t: 23.2, type: 'typing', dur: 1.2 },
    { t: 24.6, type: 'send' },
    { t: 25.4, type: 'birds', dur: 6.0, vol: 0.6 },
    { t: 25.85, type: 'buzz', vol: 0.4 }, { t: 25.9, type: 'notif', vol: 0.7 },
    { t: 26.7, type: 'pop' },
    { t: 32.2, type: 'typing', dur: 0.4 },
    { t: 33.0, type: 'send' },
    { t: 34.4, type: 'birds', dur: 3.6, vol: 0.7 },
    { t: 35.9, type: 'squeeze' }, { t: 36.6, type: 'squeeze' }, { t: 37.3, type: 'squeeze' },
    { t: 38.0, type: 'sparkle' },
  ],
};
