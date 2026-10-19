// B POV版:カメラ=息子の目。母がこちらを見て「いってらっしゃい」
const sh = (t0, t1, draw, extra = {}) => ({ t0, t1, draw, ...extra });
const you = (t0, t1, text, extra = {}) => ({ t0, t1, text, y: 1470, size: 60, style: 'box', bg: '#161616', color: '#fff', anim: 'up', ...extra });
window.VIDEO = {
  duration: 41,
  shots: [
    sh(0, 3.4, (c, lt) => shotPOVHandover(c, lt, { grabAt: 2.6, talk: [0.4, 1.2] })),
    sh(3.4, 8.8, (c, lt) => shotMomNod(c, lt, { k: [2.5, 2.95, 3.35], forced: true, bento: false, pov: true, zoom: 1.04 })),
    sh(10.2, 15.4, (c, lt, t) => tearBlur(c, tw(lt, 3.4, 5.0) * 0.7, t, x => shotIzakayaBite(x, lt, { biteAt: 1.0 }))),
    sh(15.4, 19.0, (c, lt, t) => tearBlur(c, lerp(0.7, 0.3, tw(lt, 0, 2.5)), t, x => shotPhoneNotif(x, lt, { at: 0.6, time: '22:31' }))),
    sh(20.2, 25.4, (c, lt) => shotMakeOnigiri(c, lt)),
    sh(25.4, 32.4, (c, lt) => shotChat(c, lt, {
      base: [{ text: '元気にやってる？\n無理しないでね', time: '22:31' }],
      photoAt: 0.3,
      ops: [{ at: 1.0, type: '恥ずかしいって言って、ごめん', dur: 1.5 }, { at: 3.1, del: true, dur: 0.7 }, { at: 4.2, type: 'ソーセージのやつ、うまいな', dur: 1.2 }, { at: 5.6, send: true }],
      readAt: 6.3, thumb: true,
    })),
    sh(32.4, 34.2, (c, lt) => shotMemoryMom(c, lt, { talk: [0.25, 0.95] }), { filter: 'sepia(0.5) saturate(0.85) brightness(1.1) blur(1.5px)', fx: memoryFx }),
    sh(34.2, 36.8, (c, lt) => shotDoorOpen(c, lt, { openAt: 0.4, sleeve: '#2c3753' })),
    sh(36.8, 41.0, (c, lt) => endCard(c, lt, { sub: '言いそびれたひと言、\nありますか？', tag: '#うちのおにぎり' })),
  ],
  caps: [
    { t0: 0, t1: 3.3, inD: 0, text: 'POV\n母さんの弁当が恥ずかしかった頃', y: 330, size: 54, style: 'box' },
    { t0: 0.4, t1: 2.5, text: 'いってらっしゃい', y: 560, size: 62, style: 'box', bg: '#fff3e2', anim: 'pop' },
    you(3.6, 5.0, '母さん、おにぎりに\nソーセージ入れるのやめろよ'),
    you(5.0, 6.4, '恥ずかしいから', { size: 76 }),
    { t0: 7.0, t1: 8.7, text: '母は、小さくうなずいた', y: 360, size: 56, font: 'klee', weight: 600, style: 'soft', anim: 'up' },
    { t0: 9.0, t1: 10.1, text: '数年後', y: 940, size: 70, font: 'klee', weight: 600, style: 'soft', anim: 'up' },
    { t0: 11.9, t1: 13.6, text: '居酒屋のおにぎりに、\nソーセージが入っていた', y: 430, size: 64 },
    { t0: 13.8, t1: 15.4, text: 'ちょっと泣きそうになった', y: 430, size: 64, font: 'klee', weight: 600, style: 'soft', anim: 'up' },
    { t0: 19.2, t1: 20.1, text: '次の日の朝', y: 940, size: 70, font: 'klee', weight: 600, style: 'soft', anim: 'up' },
    { t0: 20.3, t1: 23.0, text: 'ソーセージおにぎり、初挑戦', y: 330, size: 56 },
    { t0: 32.5, t1: 34.1, text: 'いってらっしゃい', y: 560, size: 62, style: 'box', bg: '#fff3e2', anim: 'pop' },
    you(34.5, 36.7, 'いってきます', { size: 72 }),
  ],
  post(ctx, t) {
    if (t >= 3.4 && t < 3.55) fade(ctx, 0.0);
    fade(ctx, seg(t, 40.6, 41), '#000');
  },
  audio: [
    { t: 0, type: 'room', dur: 8.8 },
    { t: 0, type: 'clock', dur: 8.8 },
    { t: 0.1, type: 'birds', dur: 3.0, vol: 0.6 },
    { t: 2.65, type: 'whoosh' },
    { t: 5.0, type: 'heart', dur: 3.8, bpm: 68, vol: 0.6 },
    { t: 5.0, type: 'sting', vol: 0.7, rev: 0.4 },
    { t: 10.2, type: 'izakaya', dur: 1.05, hardStop: true },
    { t: 11.15, type: 'crunch' },
    { t: 11.3, type: 'ting' },
    { t: 13.6, type: 'piano', dur: 27.4, resolveAt: 36.8, bar: 2.8 },
    { t: 16.0, type: 'buzz', vol: 0.45 }, { t: 16.05, type: 'notif', vol: 0.7 },
    { t: 20.2, type: 'birds', dur: 5.0, vol: 0.8 },
    { t: 20.6, type: 'drop' },
    { t: 21.8, type: 'squeeze' }, { t: 22.5, type: 'squeeze' }, { t: 23.2, type: 'squeeze' },
    { t: 25.7, type: 'pop' },
    { t: 26.4, type: 'typing', dur: 1.5 }, { t: 28.5, type: 'typing', dur: 0.7, del: true }, { t: 29.6, type: 'typing', dur: 1.2 },
    { t: 31.0, type: 'send' },
    { t: 34.6, type: 'dooropen' }, { t: 34.4, type: 'birds', dur: 2.4, vol: 0.9 },
    { t: 36.8, type: 'sparkle' },
  ],
};
