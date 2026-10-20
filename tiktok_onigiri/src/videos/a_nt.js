// A 反抗フック版・文字なしプレビズ。尺はナレーション(window.NARR = a_nt.narr.js)から決まる
// 人物が画面に向かってしゃべるカットは作らない(後乗せのTTSと口が合わないため)
const D = id => NARR.dur[id] || 0;
const mem = { filter: SEPIA, fx: memoryFx };
const segs = [
  {
    id: 'A-S01', min: 3.0, n: [['A01', 0.1]], tail: 0.15,
    draw: (c, lt) => shotOTSComplain(c, lt, { fadeAt: 0.1 + D('A01') * 0.55 }),
    a: [{ t: 0, type: 'room', dur: 3.0 }, { t: 0, type: 'clock', dur: 3.0 }],
    meta: {
      shared: 'A専用', role: 'フック。息子の言葉が背中越しに聞こえ、母の笑顔が曇る',
      subject: '息子(17)の背中、母', acting: '息子は母を見ずに立ったまま(背中)。母は弁当を持って笑顔→言葉の途中で笑顔が固まる。強さ6/10',
      props: '紺の水玉の弁当包み', camera: '息子の肩越し(手前の背中はボケ)、母にピント、ゆっくり寄る', light: '朝の窓光(画面左)',
      sound: 'セリフはTTSで後乗せ(A01)。生成音は台所の環境音と時計の秒針のみ', refs: 'MOM, SON_TEEN, LOOK',
      veo: { subject: CAST.MOM + '. In the foreground, the back of ' + CAST.TEEN + ', out of focus', action: 'Over the son\'s shoulder: the mother holds out a wrapped bento with a warm smile; partway through the moment her smile freezes and fades as if she has just heard something hurtful. The son stays turned away from camera, his mouth never visible. Intensity 6/10.', props: 'navy bento cloth with white polka dots', camera: 'over-the-shoulder medium close-up, focus on the mother, slow push-in', light: 'soft morning window light from screen left', sound: 'kitchen room tone and a ticking wall clock, no dialogue' },
    },
  },
  {
    id: 'A-S02', min: 2.3, n: [['A02', 0.05]], tail: 1.1,
    draw: (c, lt) => shotMomNod(c, lt, { k: [0.1, 0.55, 0.05 + D('A02') + 0.2] }),
    a: [{ t: 0, type: 'room', dur: 2.3 }, { t: 0, type: 'clock', dur: 2.3 }, { t: 0.05, type: 'sting', vol: 0.75, rev: 0.4 }],
    meta: SHM.MOMNOD,
  },
  {
    id: 'A-S03', n: [['A04', 1.25]], tail: 0.25,
    draw: (c, lt) => shotIzakayaBite(c, lt, { biteAt: 0.85 }),
    a: [{ t: 0, type: 'izakaya', dur: 0.92, hardStop: true }, { t: 0.83, type: 'crunch' }, { t: 0.98, type: 'ting' }],
    meta: SHM.BITE,
  },
  {
    id: 'A-S04', min: 3.3, n: [['A05', 0.05]], tail: 0.15,
    draw: (c, lt, d) => montage3(c, lt, d, [shotPotBoil, (x, l) => shotAlarm(x, l, { hitAt: 0.45 }), shotTrainMiss]),
    a: d => [{ t: 0, type: 'beat', dur: d, bpm: 120, vol: 0.6 }, { t: 0.02, type: 'boil', dur: d / 3 }, { t: d / 3, type: 'alarm', dur: 0.45 }, { t: d / 3 + 0.45, type: 'slap' }, { t: 2 * d / 3, type: 'chime' }, { t: 2 * d / 3 + 0.5, type: 'doorclose' }],
    subs: [
      { id: 'A-S04a', from: 0, to: 1 / 3, meta: SHM.POT },
      { id: 'A-S04b', from: 1 / 3, to: 2 / 3, meta: SHM.ALARM },
      {
        id: 'A-S04c', from: 2 / 3, to: 1, meta: {
          shared: 'A専用', role: 'ひとり暮らしのドタバタ(3)', subject: '息子(23・スーツ)の後ろ姿', acting: '駆け込む寸前で電車のドアが閉まり、肩を落とす。強さ6/10',
          props: '銀色の通勤電車(行き先表示・駅名標は映さない)', camera: '後ろ姿のミディアム、固定', light: '朝のホームの曇った光',
          sound: 'ドアが閉まる/プシュッ→ドン/空気と金属/目の前', refs: 'SON_ADULT, LOOK',
          veo: { subject: 'Back view of ' + CAST.SUIT + ' on a train platform', action: 'He rushes up just as the commuter train doors slide shut in front of him; his shoulders drop. Intensity 6/10.', props: 'silver commuter train, no destination signs or station name boards in frame', camera: 'medium shot from behind, static', light: 'flat overcast morning light', sound: 'door-closing hiss and thud, platform ambience, no announcements, no dialogue' },
        },
      },
    ],
  },
  {
    id: 'A-S05', min: 3.0, n: [['A06', 0.1]], tail: 0.15, ...mem,
    draw: (c, lt, d) => shotBentoDaily(c, lt, { per: d / 3 }),
    a: d => [0, 1, 2].map(i => ({ t: i * d / 3 + 0.12, type: 'place' })),
    meta: {
      shared: 'A専用', role: '回想。毎朝、当たり前に置いてあった弁当', subject: '母の手、食卓', acting: '母の手が弁当を置く。日を変えて3回(包みの色が毎回違う)',
      props: '弁当包み3色(紺の水玉、赤の格子、緑)、木の食卓', camera: '真上から、固定', light: '朝の光(仕上げでセピア寄り)',
      sound: '置く音/コトッと3回/木の食卓/近い', refs: 'MOM(袖口のみ), LOOK',
      veo: { subject: 'A mother\'s hand and a wooden dining table, seen from above', action: 'Her hand sets down a wrapped bento and withdraws. Three short repetitions, each with a different wrapping cloth (navy polka dot, red check, green), suggesting many mornings.', props: 'three bento wrapping cloths in different colors, dusty-rose knit sleeve', camera: 'top-down overhead, static', light: 'soft morning light; nostalgic grading is applied in post', sound: 'soft placing sounds on wood, no dialogue' },
    },
  },
  {
    id: 'A-S06', min: 3.8, n: [['A08', 1.0]], tail: 0.2, ...mem,
    draw: (c, lt, d) => shotHandoverToss(c, lt, d, { grabAt: 0.9, switchAt: 1.7 }),
    a: [{ t: 0.85, type: 'whoosh' }, { t: 1.7 + 0.45, type: 'thud' }],
    subs: [
      {
        id: 'A-S06a', from: 0, to: 0.42, meta: {
          shared: 'A専用', role: '回想。母が用意した弁当を、息子がひったくる', subject: '母の手、息子(17)の手', acting: '母の手が弁当を食卓に置いた瞬間、学ランの袖の手が乱暴に奪う。強さ8/10',
          props: '紺の水玉の弁当包み', camera: '食卓の高さの寄り(顔は映さない)', light: '朝の光(仕上げでセピア寄り)',
          sound: 'ひったくる手/シュッと速く/布がこすれる/近い', refs: 'MOM, SON_TEEN(袖のみ), LOOK',
          veo: { subject: 'Table-level close-up of a wrapped bento, the mother\'s hand and the son\'s hand in a black gakuran sleeve (no faces)', action: 'The moment the mother sets the bento down, the son\'s hand abruptly snatches it away without a pause. Rough and dismissive, intensity 8/10.', props: 'navy bento cloth with white polka dots, dusty-rose knit sleeve, black gakuran sleeve with a gold button', camera: 'table-level close-up, faces out of frame', light: 'morning light; nostalgic grading is applied in post', sound: 'a quick swish of cloth, no dialogue' },
        },
      },
      {
        id: 'A-S06b', from: 0.42, to: 1, meta: {
          shared: 'A専用', role: '回想。感謝もせず鞄に放り込む', subject: '通学鞄の中', acting: '弁当が乱暴に投げ込まれて、傾いたまま止まる',
          props: '紺の通学鞄、教科書、プリント(文字は読めない)', camera: '鞄の中を真上から', light: '自然光(仕上げでセピア寄り)',
          sound: '投げ込まれた弁当/ドサッと一度/鈍い布の音/ごく近い', refs: 'LOOK',
          veo: { subject: 'Inside an open school bag, seen from above', action: 'The wrapped bento is tossed in carelessly, lands tilted on top of textbooks and stays there.', props: 'navy school bag, textbooks and papers with no readable text', camera: 'top-down overhead', light: 'natural light; nostalgic grading is applied in post', sound: 'one dull thud, no dialogue' },
        },
      },
    ],
  },
  {
    id: 'A-S07', n: [['A09', 0.05]], tail: 0.2, ...mem,
    draw: (c, lt) => shotThreeFillings(c, lt, { times: [1.2, 1.7, 2.25] }),
    a: [{ t: 1.2, type: 'place' }, { t: 1.7, type: 'place' }, { t: 2.25, type: 'place' }],
    meta: SHM.FILLINGS,
  },
  {
    id: 'A-S08', n: [['A10', 0.1]], tail: 0.2, ...mem,
    draw: (c, lt) => shotClassroom(c, lt),
    a: [{ t: 0, type: 'chatter', dur: 3.0 }],
    meta: {
      shared: 'A専用', role: '回想。教室で友達に驚かれ、恥ずかしくなる', subject: '息子(17)、友達2人', acting: '息子がおにぎりをかじる→両脇の友達が身を乗り出して驚く→息子が赤くなって目をそらす。強さ6/10。誰も口を大きく動かさない',
      props: '断面に赤ウインナーのおにぎり、学ラン、教室(黒板に文字なし)', camera: 'ミディアム、手持ち', light: '昼の窓光(仕上げでセピア寄り)',
      sound: '昼休みの教室のざわめき/小さく/遠い/広い部屋', refs: 'SON_TEEN, LOOK',
      veo: { subject: CAST.TEEN + ', sitting at a classroom desk between two classmates in the same uniform', action: 'He bites into an onigiri; his two friends lean in with surprised faces looking at the filling; he blushes and looks away, embarrassed. Nobody speaks. Intensity 6/10.', props: SAUSAGE + '. Classroom with a blank chalkboard (no writing).', camera: 'medium shot, gentle handheld', light: 'bright midday window light; nostalgic grading is applied in post', sound: 'distant lunchtime classroom murmur, no clear words' },
    },
  },
  {
    id: 'A-S09', min: 3.0, n: [['A11', 0.7]], tail: 0.35,
    draw: (c, lt) => shotIzakayaTear(c, lt),
    a: [{ t: 0, type: 'izakaya', dur: 3.0, vol: 0.25, muffle: true }],
    meta: {
      shared: 'A専用', role: '感情の山。居酒屋で涙ぐむ', subject: '息子(23・スーツ)', acting: 'かじったおにぎりを見つめたまま、目に涙がたまり、こらえる。涙はこぼれても一筋。強さ5/10',
      props: '断面に赤ウインナーのおにぎり、背景にぼけた同僚', camera: '正面のクローズアップ、ごくゆっくり寄る、背景は大きくボケ', light: '居酒屋の暖色光、逆光の縁取り',
      sound: '居酒屋のざわめき/こもって遠い/低く/水の中のよう', refs: 'SON_ADULT, LOOK',
      veo: { subject: CAST.SUIT + ', seated at an izakaya table with blurred coworkers behind him', action: 'He stares at the bitten onigiri in his hand; his eyes slowly fill with tears and he holds them back; at most a single tear. Restrained, intensity 5/10. He does not speak.', props: SAUSAGE + ' visible in the bitten onigiri he holds at chest height', camera: 'frontal close-up, extremely slow push-in, background heavily defocused', light: 'warm tungsten light with an orange rim light from behind', sound: 'muffled distant izakaya ambience, no dialogue' },
    },
  },
  {
    id: 'A-S10', n: [['A12', 0.7]], tail: 0.3,
    draw: (c, lt) => shotPhoneNotif(c, lt, { at: 0.3 }),
    a: [{ t: 0.3, type: 'buzz', vol: 0.45 }, { t: 0.35, type: 'notif', vol: 0.6 }],
    meta: {
      shared: 'A専用', role: '母からのメッセージ(文面は母の声で読む)', subject: '息子(23)の手のスマホ', acting: '手の中のスマホが震えて画面が光る',
      props: 'スマホ(画面は読めない。光とアイコンの気配だけ)', camera: '手元のクローズアップ、画面はボケ', light: '居酒屋の暗がり、画面の明かり',
      sound: 'スマホの振動/ブブッと2回/テーブル越しの低い音/すぐ近く', refs: 'LOOK',
      veo: { subject: 'Close-up of a young man\'s hand holding a smartphone at a dim izakaya table', action: 'The phone vibrates and the screen lights up with a notification glow; he looks down at it.', props: 'smartphone, screen content blurred and unreadable', camera: 'close-up on the hand, shallow focus, screen out of focus', light: 'dim warm bar light and the cool glow of the screen', sound: 'phone vibration buzz, muffled bar ambience, no dialogue' },
    },
  },
  {
    id: 'A-S11', min: 2.4,
    draw: (c, lt) => shotMakeOnigiri(c, lt * 1.5),
    a: [{ t: 0, type: 'birds', dur: 2.4, vol: 0.8 }, { t: 0.2, type: 'drop' }, { t: 1.05, type: 'squeeze' }, { t: 1.5, type: 'squeeze' }, { t: 1.95, type: 'squeeze' }],
    meta: SHM.MAKE,
  },
  {
    id: 'A-S12', min: 4.6, n: [['A15', 1.0]], tail: 0.25,
    draw: (c, lt) => shotChat(c, lt, {
      base: [{ text: '元気にやってる？\n無理しないでね', time: '22:14' }], photoAt: 0.25,
      ops: [{ at: 0.6, type: '母さん、いつもありがとう', dur: 0.9 }, { at: 1.7, del: true, dur: 0.4 }, { at: 2.4, type: 'ソーセージのやつ、うまいな', dur: 0.9 }, { at: 3.5, send: true }],
      readAt: 4.1,
    }),
    a: [{ t: 0.25, type: 'pop' }, { t: 0.6, type: 'typing', dur: 0.9 }, { t: 1.7, type: 'typing', dur: 0.4, del: true }, { t: 2.4, type: 'typing', dur: 0.9 }, { t: 3.5, type: 'send' }],
    meta: SHM.PHONE,
  },
  {
    id: 'A-S13', min: 2.2, n: [['A16', 0.35]], tail: 0.6,
    draw: (c, lt) => { endCard(c, lt); steam(c, 540, 640, lt, { n: 8, h: 300, w: 160, r: 40, a: 0.12 }); },
    a: [{ t: 0, type: 'sparkle', vol: 0.6 }],
    meta: SHM.END,
  },
];
const TL = buildTimeline(segs, NARR, 'narration/A');
const M = TL.marks;
window.VIDEO = {
  noText: true,
  duration: TL.duration,
  shots: TL.shots,
  caps: [],
  shotlist: TL.shotlist,
  post(ctx, t) {
    if (t >= M['A-S05']) fade(ctx, 1 - seg(t, M['A-S05'], M['A-S05'] + 0.3), '#fff8ec');
    if (t >= M['A-S09']) fade(ctx, 1 - seg(t, M['A-S09'], M['A-S09'] + 0.3), '#000');
    fade(ctx, seg(t, TL.duration - 0.4, TL.duration), '#000');
  },
  audio: [
    ...TL.audio,
    { t: M['A-S05'] - 0.08, type: 'rewind', vol: 0.7 },
    { t: M['A-S05'], type: 'musicbox', dur: M['A-S09'] - M['A-S05'] },
    { t: M['A-S09'], type: 'piano', dur: TL.duration - M['A-S09'], resolveAt: M['A-S13'], bar: 2.6 },
  ],
};
