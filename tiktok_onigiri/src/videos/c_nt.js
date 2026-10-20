// C Vlog版・文字なしプレビズ。尺はナレーション(window.NARR = c_nt.narr.js)から決まる
// PR表記は画面に出さない(TikTok のブランドコンテンツ設定と投稿文の #PR で表示する)
const D = id => NARR.dur[id] || 0;
const polT = [0.4, 0.4 + D('C06') + 0.4, 0.4 + D('C06') + 0.4 + D('C08') + 0.4];
function storyBoardNT(ctx, lt, t) {
  withFilter(ctx, 'blur(18px) brightness(0.72)', x => bgApartment(x, t), 'sb');
  const P = [
    [polT[0], 400, 980, -0.07, x => shotThreeFillings(x, 3), true],
    [polT[1], 680, 1030, 0.06, x => shotMomNod(x, 1.8, { k: [0.1, 0.45, 0.75] }), true],
    [polT[2], 470, 1060, -0.03, x => shotIzakayaBite(x, 3.2, { biteAt: 1.0 }), false],
  ];
  P.forEach(([t0, x, y, rot, fn, sep]) => {
    if (lt < t0) return;
    const p = tw(lt, t0, t0 + 0.5, E.outQuint);
    polaroid(ctx, lerp(x + 900, x, p), y, 1.25, rot + (1 - p) * 0.3, fn, '', 1, sep);
  });
}
const inPolaroid = { post: 'ポラロイド風の白枠に合成し、ぼかした部屋の上に重ねる(仕上げで)' };
const segs = [
  {
    id: 'C-S01', min: 2.8, n: [['C01', 0.7]], tail: 0.25,
    draw: (c, lt) => shotAlarm(c, lt, { hitAt: 0.5 }),
    a: [{ t: 0, type: 'alarm', dur: 0.5, vol: 0.7 }, { t: 0.5, type: 'slap' }, { t: 0.8, type: 'birds', dur: 2.0, vol: 0.6 }],
    meta: { ...SHM.ALARM, shared: 'SH-ALARM(A・C共用。Cは長めに使う)', role: 'Vlogの始まり。朝6時半の目覚まし' },
  },
  {
    id: 'C-S02', min: 2.6, n: [['C02', 0.3]], tail: 0.25,
    draw: (c, lt) => camera(c, { zoom: 1.0 + lt * 0.03 }, () => { bgApartment(c, lt); drawRiceCooker(c, 540, 1360, 1.5, tw(lt, 0.3, 0.9), lt); }),
    a: [{ t: 0.3, type: 'steam', dur: 2.0 }],
    meta: {
      shared: 'C専用', role: '弁当は自分で作ると決めた', subject: '炊飯器', acting: 'ふたが開いて湯気が立つ',
      props: '白い炊飯器(表示部に文字を出さない)、炊きたてのご飯', camera: '斜め上からの寄り、ゆっくり寄る', light: '朝の冷たい窓光',
      sound: '炊飯器のふた/カチッと開いてシューッ/湯気の柔らかい音/近い', refs: 'LOOK',
      veo: { subject: 'A white rice cooker on a small apartment kitchen counter', action: 'The lid pops open and a cloud of steam rises from freshly cooked rice.', props: 'white rice cooker with a blank display panel and no labels', camera: 'high-angle close-up, slow push-in', light: 'cool morning window light', sound: 'lid click and soft steam hiss, no dialogue' },
    },
  },
  {
    id: 'C-S03', min: 2.4, n: [['C03', 0.2]], tail: 0.25,
    draw: (c, lt) => shotPotBoil(c, lt),
    a: [{ t: 0, type: 'boil', dur: 2.4 }],
    meta: { ...SHM.POT, shared: 'SH-POT(A・C共用。Cは長めに使う)' },
  },
  {
    id: 'C-S04', n: [['C04', 0.2], ['C05', 0.2 + D('C04') + 0.9]], tail: 0.6,
    draw: (c, lt) => shotFillingsVlog(c, lt, { t1: 0.2 + D('C04') * 0.35, t2: 0.2 + D('C04') * 0.7, tp: 0.2 + D('C04') + 0.25 }),
    a: [{ t: 0.2 + D('C04') * 0.35, type: 'place' }, { t: 0.2 + D('C04') * 0.7, type: 'place' }, { t: 0.2 + D('C04') + 0.2, type: 'fridge' }],
    meta: {
      shared: 'C専用', role: '具は梅と鮭と……ソーセージ。ここでビートが止まる', subject: '息子の手元、ラップの上のご飯3つ', acting: '梅をのせる→鮭をのせる→少し間があって、冷蔵庫から出した赤ウインナーのパックを手に取って止まる',
      props: 'ご飯3つ、梅干し、鮭フレーク、赤ウインナーのパック(パッケージに文字・ロゴなし)', camera: '真上から', light: '朝の窓光',
      sound: 'のせる音/ポン、ポンと2回/軽い/近い。冷蔵庫/パタンと閉まる/低い/近い', refs: 'LOOK',
      veo: { subject: 'Overhead view of three small mounds of rice on plastic wrap on a kitchen counter, and the young man\'s hands', action: 'He places a pickled plum on the first mound, salmon flakes on the second, then pauses and slowly brings in a pack of red wiener sausages, holding it still above the third mound.', props: 'clear plastic pack of red wiener sausages with a plain red band and no printed text or logo; ' + SAUSAGE, camera: 'top-down overhead, static', light: 'morning window light', sound: 'soft placing sounds, a fridge door closing, no dialogue' },
    },
  },
  {
    id: 'C-S05', n: [['C06', polT[0]], ['C08', polT[1]], ['C09', polT[2]]], tail: 0.5,
    draw: (c, lt, d, t) => storyBoardNT(c, lt, lt),
    a: polT.map(t => ({ t: t - 0.1, type: 'whoosh', vol: 0.5 })),
    subs: [
      { id: 'C-S05a', lines: ['C06'], treat: 'polaroid-memory', from: 0, to: polT[1] / (polT[2] + D('C09') + 0.5), meta: { ...SHM.FILLINGS, ...inPolaroid, role: '回想1枚目:母のおにぎりはいつもこの三つ(Aの素材を流用)' } },
      { id: 'C-S05b', lines: ['C08'], treat: 'polaroid-memory', from: polT[1] / (polT[2] + D('C09') + 0.5), to: polT[2] / (polT[2] + D('C09') + 0.5), meta: { ...SHM.MOMNOD, ...inPolaroid, role: '回想2枚目:恥ずかしいからやめろと言った日(Aの素材を流用)' } },
      { id: 'C-S05c', lines: ['C09'], treat: 'polaroid', from: polT[2] / (polT[2] + D('C09') + 0.5), to: 1, meta: { ...SHM.BITE, ...inPolaroid, role: '3枚目:昨日の居酒屋(Aの素材を流用、ここだけ色はそのまま)' } },
    ],
  },
  {
    id: 'C-S06', min: 3.0, n: [['C10', 0.4]], tail: 0.25,
    draw: (c, lt) => shotMakeOnigiri(c, lt * 1.25, { warm: 0.6 }),
    a: [{ t: 0.25, type: 'drop' }, { t: 1.3, type: 'squeeze' }, { t: 1.85, type: 'squeeze' }, { t: 2.4, type: 'squeeze' }],
    meta: SHM.MAKE,
  },
  {
    id: 'C-S07', min: 2.0, n: [['C11', 0.6]], tail: 0.3,
    draw: (c, lt) => shotFlatLay(c, lt, { shutterAt: 0.3 }),
    a: [{ t: 0.3, type: 'shutter' }],
    meta: {
      shared: 'C専用', role: '完成。ちょっといびつ', subject: '弁当箱に並んだおにぎり3つ', acting: 'スマホで真上から撮る(シャッターの白い光)',
      props: '緑の弁当箱、いびつなおにぎり3つ(1つは断面に赤ウインナー)、青い格子の布', camera: '真上から、固定', light: '朝の柔らかい光',
      sound: 'シャッター/カシャッと一度/軽い電子音/近い', refs: 'LOOK',
      veo: { subject: 'Overhead flat-lay of an open green bento box with three slightly lopsided homemade onigiri on a blue gingham cloth', action: 'Still composition; a brief white camera-flash flicker as if photographed from above.', props: 'one onigiri bitten to show ' + SAUSAGE, camera: 'top-down overhead, static', light: 'soft morning light', sound: 'a single phone camera shutter sound, no dialogue' },
    },
  },
  {
    id: 'C-S08', min: 4.2, n: [['C12', 0.3]], tail: 0.3,
    draw: (c, lt) => shotChat(c, lt, {
      base: [{ text: '元気にやってる？\n無理しないでね', time: '22:14' }], photoAt: 0.2,
      ops: [{ at: 1.4, type: 'ソーセージのやつ、うまいな', dur: 1.0 }, { at: 2.8, send: true }],
      readAt: 3.6,
    }),
    a: [{ t: 0.2, type: 'pop' }, { t: 1.4, type: 'typing', dur: 1.0 }, { t: 2.8, type: 'send' }],
    meta: { ...SHM.PHONE, shared: 'SH-PHONE(A・C共用。Cは後半の「打って送る」部分だけ使う)' },
  },
  {
    id: 'C-S09', min: 1.7, n: [['C13', 0.5]], tail: 0.3,
    draw: (c, lt) => shotDoorOpen(c, lt, { openAt: 0.2, sleeve: '#2c3753' }),
    a: [{ t: 0.3, type: 'dooropen' }, { t: 0.3, type: 'birds', dur: 1.4, vol: 0.8 }],
    meta: {
      shared: 'C専用', role: 'いってきます', subject: '息子(23・スーツ)の手', acting: 'アパートのドアを開けると朝の光が差し込む',
      props: 'グレーの金属ドア、外廊下(表札・掲示物は映さない)', camera: '主観に近い手元、手持ち', light: '外からのまぶしい朝の光',
      sound: 'ドア/ガチャッと開いて外の空気/金属の響き/目の前。鳥の声', refs: 'SON_ADULT(袖口のみ), LOOK',
      veo: { subject: 'First-person view of the hand of ' + CAST.SUIT, action: 'He opens a gray steel apartment door and bright morning light floods in.', props: 'gray steel door, outdoor corridor with railings, no nameplates or notices', camera: 'near point-of-view handheld', light: 'bright morning sunlight from outside', sound: 'door latch and outdoor air, birds, no dialogue' },
    },
  },
  {
    id: 'C-S10', min: 2.9, n: [['C14', 1.2]], tail: 0.3,
    draw: (c, lt) => shotBoardTrain(c, lt),
    a: [{ t: 0, type: 'train', dur: 2.9, vol: 0.8 }, { t: 2.3, type: 'doorclose', vol: 0.6 }],
    meta: {
      shared: 'C専用', role: '今日は間に合った(Aの閉まるドアと対になる)', subject: '息子(23・スーツ)の後ろ姿', acting: '開いたドアから電車に乗り込み、背後でドアが閉まる。小さな達成感',
      props: '銀色の通勤電車(行き先表示・駅名標は映さない)', camera: '後ろ姿、固定', light: '晴れた朝のホーム',
      sound: '電車の走行音/低く続く/金属/中くらい。ドアが閉まる/プシュッ', refs: 'SON_ADULT, LOOK',
      veo: { subject: 'Back view of ' + CAST.SUIT + ' on a sunny train platform', action: 'He walks through the open doors into the commuter train just in time; the doors slide shut behind him.', props: 'silver commuter train, no destination signs or station name boards in frame', camera: 'static shot from behind', light: 'bright clear morning light', sound: 'train hum and door-closing hiss, no announcements, no dialogue' },
    },
  },
  {
    id: 'C-S11', min: 2.2, n: [['C15', 0.35]], tail: 0.6,
    draw: (c, lt) => { endCard(c, lt); steam(c, 540, 640, lt, { n: 8, h: 300, w: 160, r: 40, a: 0.12 }); },
    a: [{ t: 0, type: 'sparkle', vol: 0.6 }],
    meta: SHM.END,
  },
];
const TL = buildTimeline(segs, NARR, 'narration/C');
const M = TL.marks;
window.VIDEO = {
  noText: true,
  duration: TL.duration,
  shots: TL.shots,
  caps: [],
  shotlist: TL.shotlist,
  post(ctx, t) {
    fade(ctx, seg(t, TL.duration - 0.4, TL.duration), '#000');
  },
  audio: [
    ...TL.audio,
    // ローファイは「ソーセージ。」の直前でぴたりと止める
    { t: 0, type: 'lofi', dur: M['C-S04'] + 0.2 + D('C04') + 0.75, bpm: 84, vol: 0.85, gate: true },
    { t: M['C-S05'], type: 'piano', dur: M['C-S06'] - M['C-S05'] + 0.6, resolveAt: M['C-S06'], bar: 2.6 },
    { t: M['C-S06'], type: 'lofi', dur: TL.duration - M['C-S06'], bpm: 82, vol: 0.7 },
  ],
};
