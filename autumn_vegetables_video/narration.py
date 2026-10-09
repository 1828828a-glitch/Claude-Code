"""動画のタイムラインに合わせたナレーションを Kokoro-82M (Apache-2.0) で合成する。

    python narration.py impact  -> narration_impact.wav  (index.html 用)
    python narration.py soft    -> narration_soft.wav    (soft.html 用)

必要: pip install torch kokoro "misaki[ja]" soundfile unidic-lite
(unidic の辞書ダウンロードが失敗する環境では unidic/dicdir を unidic_lite/dicdir へのリンクにする)
声は Whisper での書き起こし一致率が最も高かった jf_alpha。各セリフは開始時刻と「次のセリフまで」に収まるよう、長すぎる場合だけ話速を上げて合成し直す。
"""
import os
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR = 24000

VEG = ['ダイコン', 'ハクサイ', 'ホウレンソウ', 'シュンギク', 'ルッコラ', 'キャベツ', 'ブロッコリー',
       'スナップエンドウ', 'ニラ', 'ワケギ', 'カブ', 'リーフレタス', 'ミズナ', 'タアサイ',
       'アイスプラント', 'エンドウマメ', 'ソラマメ', 'ニンニク', 'ジャガイモ', 'タマネギ']

# (開始秒, セリフ, 終わらせたい秒)
SCRIPTS = {
    'impact': {
        'voice': 'jf_alpha', 'speed': 1.1, 'duration': 57,
        'lines': [
            (0.4, '秋に植える野菜、二十選！', 2.8),
            (2.9, '育て方まで、一気に紹介！', 4.9),
            (5.4, '秋植えのメリット、その一。寒くなるほど、甘くなる。', 8.8),
            (8.9, 'その二。害虫が、ぐっと減る。', 11.8),
            *[(12.35 + i * 1.22, n + '。', 12.35 + (i + 1) * 1.22 - 0.08) for i, n in enumerate(VEG)],
            (37.4, '全二十種を、おさらい。', 39.5),
            (39.7, '初心者さんは、この六つから。', 42.2),
            (42.4, 'プランターなら、この六つ。', 44.7),
            (45.3, '秋にやっておきたい作業は、四つ。', 47.9),
            (48.0, '土づくり、防虫、台風対策、そして冬越し。', 51.7),
            (52.5, '寒くなるほど、うまくなる。', 54.5),
            (54.6, '秋の菜園、いまが始めどき！', 56.8),
        ],
    },
    'soft': {
        'voice': 'jf_alpha', 'speed': 1.0, 'duration': 58,
        'lines': [
            (0.8, '秋からはじめる、家庭菜園。', 2.9),
            (3.0, '秋に植える野菜、二十選をご紹介します。', 6.2),
            (6.6, '秋植えには、うれしいことがふたつ。', 9.2),
            (9.3, '寒いほど甘くなって、虫も少ないんです。', 12.6),
            *[(13.4 + i * 1.22, n + '。', 13.4 + (i + 1) * 1.22 - 0.08) for i, n in enumerate(VEG)],
            (38.4, '全二十種を、おさらいしましょう。', 40.5),
            (40.7, '初心者さんには、この六つがおすすめ。', 43.3),
            (43.5, 'プランターなら、この六つ。', 45.8),
            (46.4, '秋にやっておきたいことは、四つ。', 48.8),
            (49.0, '土づくり、防虫、台風対策、冬越しの準備です。', 52.6),
            (53.3, '寒くなるほど、おいしくなる。', 55.6),
            (55.8, '秋の菜園、はじめてみませんか。', 57.9),
        ],
    },
}


def synth(pipe, text, voice, speed):
    chunks = [a.numpy() if hasattr(a, 'numpy') else a for _, _, a in pipe(text, voice=voice, speed=speed)]
    audio = np.concatenate(chunks)
    # 前後の無音を詰める
    # 「シュ」のような弱い子音を削らないよう、しきい値は低めにして前に 60ms 残す
    idx = np.where(np.abs(audio) > 0.003)[0]
    return audio[max(0, idx[0] - 1440): idx[-1] + 2400] if len(idx) else audio


def main(variant):
    cfg = SCRIPTS[variant]
    pipe = KPipeline(lang_code='j')
    out = np.zeros(int(cfg['duration'] * SR), dtype=np.float32)
    for start, text, end in cfg['lines']:
        slot = end - start
        speed = cfg['speed']
        audio = synth(pipe, text, cfg['voice'], speed)
        for _ in range(4):
            if len(audio) / SR <= slot or speed >= 1.45:
                break
            speed = min(1.45, speed * (len(audio) / SR) / slot * 1.04)
            audio = synth(pipe, text, cfg['voice'], speed)
        dur = len(audio) / SR
        flag = '  !! はみ出し' if dur > slot + 0.05 else ''
        print(f'{start:6.2f}s  {dur:4.2f}/{slot:4.2f}s  x{speed:.2f}  {text}{flag}')
        s = int(start * SR)
        seg = audio[: max(0, len(out) - s)]
        out[s: s + len(seg)] += seg
    out *= 0.9 / max(1e-6, np.abs(out).max())
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'narration_{variant}.wav')
    sf.write(path, out, SR)
    print('done:', path)


if __name__ == '__main__':
    main(sys.argv[1])
