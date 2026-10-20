// 生成用のカット情報(カット表とプロンプトの元)。A と C で共用するカットはここで一度だけ定義する
// 日本語の列はカット表用、veo の中身は英語プロンプト用

const CAST = {
  MOM: 'MOM: Japanese woman in her late 40s, shoulder-length dark brown bob, kind slightly tired eyes, dusty-rose knit sweater under a cream cotton apron (match reference image MOM exactly)',
  TEEN: 'SON at 17: Japanese high-school boy, short messy black hair, black gakuran school uniform with stand-up collar and gold buttons (match reference image SON_TEEN exactly)',
  SUIT: 'SON at 23: Japanese man, short neat black hair, navy suit, white shirt, loosened dark-red tie (match reference image SON_ADULT exactly)',
  HOME: 'SON at 23: the same man in a plain gray-blue T-shirt, slightly messy morning hair (match reference image SON_ADULT exactly)',
};
const SAUSAGE = 'a small bright-red Japanese wiener sausage (aka-wiener: smooth glossy red casing, pale pink inside); in a bitten onigiri its cut end shows as a red ring with a pink center — NOT salmon, NOT pink flakes, NOT ham, NOT pickled plum';
const LOOK = 'Photorealistic Japanese live-action TV-commercial drama, natural motivated light, soft film grain, 35mm lens, shallow depth of field, warm muted palette, vertical 9:16.';
const NEG = 'no text, no subtitles, no captions, no signage or menus with letters, plain unlabeled paper lanterns, no logos, no brand names on packages, no watermark, no on-screen UI, phone screen never readable, no dialogue, no lip-synced speech';

// 共用カット
const SHM = {
  MOMNOD: {
    shared: 'SH-MOMNOD(A・C共用)', role: '母が傷つき、小さくうなずく。息子の言葉が刺さる瞬間',
    subject: '母', acting: '笑顔のまま聞き、口元がゆっくり固まる→目を伏せる→一度だけ小さくうなずき、無理に少し笑う。強さ4/10(静かに)',
    props: '胸の前に紺の水玉の弁当包み', camera: '正面のクローズアップ、固定に近い手持ち、ごくゆっくり寄る', light: '朝の窓光(画面左)、柔らかい逆光',
    sound: '時計の秒針/カチ、カチと小さく/乾いた/近い・静かな台所', refs: 'MOM, LOOK',
    veo: { subject: CAST.MOM, action: 'She stands in her kitchen holding a wrapped bento at her chest, smiling at someone just off-camera. As she hears hurtful words, her smile slowly freezes, her eyes drop to the bento, she gives one small nod and forces a faint smile. Subtle restrained acting, intensity 4/10, no tears.', props: 'navy bento cloth with white polka dots, tied on top', camera: 'frontal close-up, almost locked-off handheld, very slow push-in', light: 'soft morning window light from screen left, gentle backlight on her hair', sound: 'quiet kitchen room tone, faint wall-clock ticking, no dialogue' },
  },
  BITE: {
    shared: 'SH-BITE(A・C共用)', role: '発見。かじったおにぎりの断面に赤いウインナー',
    subject: '息子(23・スーツ)の手元', acting: 'おにぎりを口元へ運んでかじり、離して断面を見て手が止まる。動作は1回だけ',
    props: '海苔を巻いた三角おにぎり、断面に赤ウインナー(鮭ではない)、手前にビールジョッキと小皿', camera: '手元のクローズアップ、手持ち、かじった後にゆっくり断面へ寄る', light: '居酒屋の暖色の電球光、背景は提灯のボケ(無地)',
    sound: '居酒屋のざわめき/かじった瞬間に消える/人の声とグラスの音/中くらいの距離→無音。かじる音/サクッと一度/海苔の乾いた音/ごく近い', refs: 'SON_ADULT(袖口のみ), LOOK',
    veo: { subject: 'Close-up of the hand of ' + CAST.SUIT + ' holding a triangular onigiri wrapped in nori', action: 'He lifts the onigiri out of frame to take one bite, brings it back down into frame and freezes, staring at the bitten cross-section. One single action.', props: SAUSAGE + '. A half-full beer mug and a small plate on the wooden table.', camera: 'handheld close-up on the onigiri, after the bite a slow push-in onto the cross-section', light: 'warm tungsten izakaya light, background of out-of-focus plain red paper lanterns with no writing', sound: 'busy izakaya ambience that suddenly drops to near silence after the bite, a single crisp nori crunch, no dialogue' },
  },
  POT: {
    shared: 'SH-POT(A・C共用)', role: 'ひとり暮らしのドタバタ(1)',
    subject: '息子(23・部屋着)', acting: '吹きこぼれる鍋に気づいて慌てて手を伸ばす。強さ7/10、コミカルに大きく',
    props: '小さなステンレス鍋の味噌汁、一口IHコンロ', camera: 'ミディアム、手持ちで小刻みに揺れる', light: '朝の冷たい窓光',
    sound: '味噌汁の鍋が吹きこぼれる/ジュワッと急に強く/泡立つ水音、高音控えめ/近い、狭いキッチン', refs: 'SON_ADULT, LOOK',
    veo: { subject: CAST.HOME, action: 'In a tiny one-room apartment kitchen, the miso soup pot suddenly boils over with white foam spilling down the sides; he startles and frantically reaches to turn off the single induction burner. Comedic, energetic, intensity 7/10.', props: 'small stainless steel pot, white foam overflowing, compact one-burner induction stove', camera: 'medium shot, slightly shaky handheld', light: 'cool bluish morning window light', sound: 'sizzling boil-over hiss and bubbling, no dialogue' },
  },
  ALARM: {
    shared: 'SH-ALARM(A・C共用)', role: 'ひとり暮らしのドタバタ(2)/朝の始まり',
    subject: '息子(23・部屋着)の手と顔', acting: '鳴り続ける目覚ましを布団から伸びた手で叩いて止める。顔は眠そうなまま',
    props: '赤いベル式の目覚まし時計(文字盤に数字なし)', camera: '目覚ましを手前に置いたクローズアップ、奥に布団の顔', light: 'カーテンのすき間から差す青白い朝の光',
    sound: '目覚まし/ジリリと鳴って叩かれた瞬間に止む/金属的/すぐ近く', refs: 'SON_ADULT, LOOK',
    veo: { subject: CAST.HOME + ', lying in bed under a blanket', action: 'A ringing red twin-bell alarm clock shakes on the bedside table; a sleepy hand reaches out from under the blanket and slaps it silent. His half-asleep face is visible behind it.', props: 'red twin-bell alarm clock with a plain dial without numbers', camera: 'close-up with the clock in the foreground, his face soft in the background', light: 'pale blue morning light through a gap in the curtains', sound: 'loud ringing that stops abruptly on the slap, no dialogue' },
  },
  MAKE: {
    shared: 'SH-MAKE(A・C共用)', role: '行動。慣れない手でソーセージおにぎりを握る',
    subject: '息子(23)の両手', acting: 'ご飯の真ん中に赤ウインナーを置き、両手で包んで3回ぎゅっと握る。少しいびつな形になる',
    props: '炊きたてのご飯(湯気)、赤ウインナー1本、白い皿', camera: '真上からの手元', light: '朝の光が冷たい色から暖色へ変わる',
    sound: '握る音/ぎゅっ、ぎゅっと3回/米粒のしっとりした音/ごく近い。遠くで鳥の声', refs: 'LOOK',
    veo: { subject: 'Overhead shot of the young man\'s two hands', action: 'He places one red wiener sausage in the center of a mound of freshly cooked steaming rice, folds the rice over it and squeezes it three times into a slightly lopsided triangular onigiri, then sets it on a white plate.', props: SAUSAGE + '. Fresh white rice with visible steam.', camera: 'top-down overhead, static', light: 'morning light turning from cool to warm', sound: 'soft rice squeezing sounds, birds outside, no dialogue' },
  },
  PHONE: {
    shared: 'SH-PHONE(A・C共用)', role: '本当の気持ちを、短く送る',
    subject: '息子(23)の手とスマホ', acting: '親指で打つ→止まる→消す→短く打ち直して送る。迷いが伝わる間を取る',
    props: 'スマホ(画面は読めない。斜めの角度かピント外)、手前に皿のおにぎり', camera: '肩越しのクローズアップ、画面は斜めでボケている', light: '朝の窓光',
    sound: 'タップ音/軽く連続して→消す時は少しゆっくり/プラスチックの乾いた音/ごく近い。送信の短い音', refs: 'SON_ADULT, LOOK',
    veo: { subject: 'Over-the-shoulder close-up of the young man\'s thumb on a smartphone', action: 'He types a message, hesitates, holds delete to erase it, types a much shorter one and taps send, then exhales. The screen is angled away and out of focus so nothing on it is readable.', props: 'smartphone with an unreadable blurred screen glow, a plate with a lopsided onigiri softly visible in the foreground', camera: 'over-the-shoulder close-up, shallow focus on the thumb, screen kept blurry', light: 'soft morning window light', sound: 'quiet tapping, a soft send sound, no dialogue' },
  },
  FILLINGS: {
    shared: 'SH-FILLINGS(A・C共用)', role: '回想。母のおにぎりの具は、梅・鮭・ソーセージ',
    subject: '割ったおにぎり3つ', acting: '1つずつ順に見えていく(並べる手、または寄りで順に)',
    props: '梅干し、鮭、赤ウインナーの断面。赤いギンガムの布', camera: '真上から', light: '柔らかい昼の光(回想は仕上げでセピア寄りに調整)',
    sound: '置く音/コトッと3回/陶器でなく布の上の柔らかい音/近い', refs: 'LOOK',
    veo: { subject: 'Three homemade onigiri, each broken open to show its filling', action: 'Overhead: a woman\'s hand places them one by one on a red gingham cloth — pickled plum, flaked salmon, and a red wiener sausage.', props: 'one with a dark red pickled plum, one with orange salmon flakes, one with ' + SAUSAGE, camera: 'top-down overhead, static', light: 'soft daylight; nostalgic grading is applied in post', sound: 'three soft placing sounds on cloth, no dialogue' },
  },
  END: {
    shared: 'SH-END(A・C共用)', role: '締め。ナレーション「オープンアップしよ。」',
    subject: '白い皿のいびつなソーセージおにぎり', acting: 'なし(湯気がゆっくり立つ)',
    props: 'かじった断面に赤ウインナー、白い皿、朝の食卓', camera: '斜め上からの寄り、ごくゆっくり寄る', light: '暖かい朝の光',
    sound: '朝の部屋の静けさ/ほとんど無音/柔らかい/近い。最後にBGMが解決', refs: 'LOOK',
    veo: { subject: 'A slightly lopsided homemade onigiri with one bite taken, on a white plate on a small table', action: 'Steam rises gently; nothing else moves.', props: SAUSAGE, camera: 'high-angle close-up, extremely slow push-in', light: 'warm morning sunlight', sound: 'quiet morning room tone, no dialogue' },
  },
};
