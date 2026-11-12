"""Gemini TTS で動画のタイムラインに合わせたナレーションを作る。

    GEMINI_API_KEY=... python narration_gemini.py tulip   -> narration_tulip.wav

環境変数:
    GEMINI_API_KEY     必須
    GEMINI_TTS_MODEL   省略時 gemini-2.5-pro-preview-tts
                       (gemini-3.8-flash-tts は声の指示まで読み上げてしまうため使わない)
    GEMINI_TTS_VOICE   省略時 Achernar (やわらかい声)
必要: ffmpeg。faster-whisper / misaki[ja] / scipy があれば、文の切れ目を音声認識で正確に決める (なければ無音で切る)
生成した音声は narration_cache/ にセリフ単位で保存し、同じセリフは再生成しない。
各セリフは置きたい秒から並べ、前のセリフと重なれば後ろへずらす。場面の終わりに収まらなければ、場面ごと少し速める (最大 1.25 倍)。
"""
import base64
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from array import array

SR = 24000
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'narration_cache')

# 「指示: セリフ」の形にすると、指示部分は読まずに声の調子だけに反映される
# GEMINI_TTS_STYLE で上書きできる。空文字にすると本文だけを送る (指示を読み上げてしまうモデル向け)
STYLE = os.environ.get('GEMINI_TTS_STYLE', 'やさしく明るい声で、テンポよく、聞き取りやすく読んでください')

WINTER_NAMES = ['クリスマスローズ', 'ガーデンシクラメン', 'パンジー・ビオラ', 'サイネリア', 'ロウバイ', 'スイセン', 'サザンカ', 'ツバキ', 'ツワブキ', 'ネリネ', 'ノースポール', 'ハボタン', 'シンビジウム', 'ウメ', 'シャコバサボテン', 'プリムラ・ポリアンサ', 'スノードロップ', 'マーガレット', 'フクジュソウ', 'ローズマリー', 'カランコエ', 'ユリオプスデージー', 'カレンデュラ']

# 無料枠はモデルごとに 1 日 10 回ほどなので、場面ごとにまとめて 1 回で生成し、無音の位置で 1 文ずつに切り分ける。
# (場面の開始秒, 場面の終了秒, [(セリフを置きたい秒, セリフ), ...])
SCRIPTS = {
    'tulip': {
        'duration': 60,
        'scenes': [
            (0, 6, [(0.6, '秋に植えて、春に咲く。'), (3.0, 'チューリップの育て方です。')]),
            (6, 15, [(6.4, '植えどきは、紅葉が見頃のころ。'), (9.2, '北海道・東北は10月、九州は11月下旬から。'), (12.9, '遅くとも年内に植えましょう。')]),
            (15, 22, [(15.5, 'きゅうこんは、ずっしり重くて、へこまないもの。'), (19.0, '傷や汚れもチェックしましょう。')]),
            (22, 33, [(22.4, 'じうえは、きゅうこん3個分の深さに、10センチ間隔。'), (26.1, 'はちうえは浅めに、3から5センチ間隔で。'), (29.6, '植えてから2週間は、たっぷり水やりを。')]),
            (33, 40, [(33.5, 'コツは、球根の向き。'), (35.6, '平らな面を外側にすると、大きな葉が外へ広がります。')]),
            (40, 47, [(40.5, '土の配合は、6対3対1。'), (43.4, '冬は5度ほどの寒さに、2か月当てて。')]),
            (47, 54, [(47.5, '春になると、わせから順に咲きはじめます。'), (50.8, '花が散る前に、花首をカットしましょう。')]),
            (54, 60, [(54.4, '秋に植えて、春を待とう。'), (56.7, '植えどきは、もうすぐです。')]),
        ],
    },
    # 23 種の名前は 1 回で生成すると切り分けを誤りやすいので、8・8・7 種の 3 回に分ける
    'winter': {
        'duration': 57,
        # 読みが崩れた語だけを 1 回でまとめて録り直す (台本の文 → 録り直しで読ませる文)
        'retakes': {'ロウバイ。': 'ろうばい。', 'シャコバサボテン。': 'しゃこばさぼてん。',
                    'スノードロップ。': 'スノードロップ。', 'カレンデュラ。': 'カレンデュラ。'},
        'scenes': [
            (0, 6, [(0.6, '可憐に、冬の庭を彩る。'), (2.8, '冬に咲く花、23選です。')]),
            *[(6 if k == 0 else round(6.4 + k * 8 * 1.22 - 0.1, 2), round(6.4 + (k + 1) * 8 * 1.22 + 0.05, 2) if k < 2 else 35,
               [(round(6.4 + i * 1.22, 2), n + '。') for i, n in enumerate(WINTER_NAMES) if k * 8 <= i < (k + 1) * 8])
              for k in range(3)],
            (35, 42, [(35.4, '全23種を、おさらい。'), (38.0, '寒い季節も、こんなに楽しめます。')]),
            (42, 51, [(42.3, '長く楽しむコツは、3つ。'), (44.0, '霜や冷たい風を避けて、'), (45.6, '冬の水やりは控えめに。'), (47.6, '花がらは、こまめに摘みましょう。')]),
            (51, 57, [(51.4, '冬の庭にも、花の色を。'), (53.6, '秋のうちに、準備をはじめましょう。')]),
        ],
    },
}


def tts(text, model, voice, key):
    os.makedirs(CACHE, exist_ok=True)
    h = hashlib.sha1(f'{model}|{voice}|{STYLE}|{text}'.encode()).hexdigest()[:16]
    path = os.path.join(CACHE, f'{h}.pcm')
    if os.path.exists(path):
        return array('h', open(path, 'rb').read())
    body = json.dumps({
        'contents': [{'parts': [{'text': f'{STYLE}: {text}' if STYLE else text}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }).encode()
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    for attempt in range(5):
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                data = json.load(res)
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 4:
                time.sleep(2 ** (attempt + 1))
                continue
            raise SystemExit(f'Gemini API error {e.code}: {e.read().decode()[:500]}')
    part = data['candidates'][0]['content']['parts'][0]['inlineData']
    pcm = to_pcm24k(base64.b64decode(part['data']), part['mimeType'])
    open(path, 'wb').write(pcm)
    return array('h', pcm)


def to_pcm24k(raw, mime):
    # モデルによって WAV (ヘッダー付き) か生の L16 で返ってくるので、24kHz モノラルの s16le に揃える
    mime = mime.lower()
    if 'wav' in mime:
        fmt = ['-f', 'wav']
    else:
        rate = next((p.split('=')[1] for p in mime.replace(' ', '').split(';') if p.startswith('rate=')), '24000')
        fmt = ['-f', 's16le', '-ar', rate, '-ac', '1']
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', *fmt, '-i', '-', '-ar', str(SR), '-ac', '1', '-f', 's16le', '-'],
                       input=raw, capture_output=True, check=True)
    return p.stdout


def trim(audio):
    # 弱い子音を削らないよう、しきい値は低めにして前に 60ms 残す
    th = int(0.003 * 32768)
    loud = [i for i, v in enumerate(audio) if abs(v) > th]
    return audio[max(0, loud[0] - 1440): loud[-1] + 2400] if loud else audio


def speed_up(audio, factor):
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-af', f'atempo={factor:.4f}', '-f', 's16le', '-'], input=audio.tobytes(),
                       capture_output=True, check=True)
    return array('h', p.stdout)


_ASR = None


def asr_split(audio, texts):
    """音声認識の単語時刻と台本を音素で突き合わせ、文の切れ目を決める。
    faster-whisper と misaki[ja] が入っている環境でだけ使い、なければ None を返す。"""
    try:
        import difflib
        import numpy as np
        import scipy.signal as ss
        from faster_whisper import WhisperModel
        from misaki import ja
    except ImportError:
        return None
    global _ASR
    if _ASR is None:
        _ASR = (WhisperModel('medium', device='cpu', compute_type='int8'), ja.JAG2P())
    model, g2p = _ASR
    ph = lambda s: ''.join(c for c in (g2p(s)[0] if s.strip() else '') if c not in ' ,.!?、。・')
    x = np.array(audio, dtype=np.float32) / 32768
    segs, _ = model.transcribe(ss.resample_poly(x, 2, 3).astype(np.float32), language='ja', word_timestamps=True, beam_size=5)
    rec, rec_t = [], []
    for seg in segs:
        for w in seg.words or []:
            p = ph(w.word)
            for k, c in enumerate(p):
                rec.append(c)
                rec_t.append(w.start + (w.end - w.start) * k / max(1, len(p)))
    if not rec:
        return None
    exp, starts = '', []
    for t in texts:
        starts.append(len(exp))
        exp += ph(t)
    # 台本の各音素 → 認識結果の位置 (一致しない所は前後から補間)
    pos = [None] * (len(exp) + 1)
    for a0, b0, size in difflib.SequenceMatcher(None, exp, ''.join(rec), autojunk=False).get_matching_blocks():
        for k in range(size):
            pos[a0 + k] = b0 + k
    known = [i for i, v in enumerate(pos) if v is not None]
    if len(known) < len(exp) * 0.5:
        return None
    def at(i):
        lo = max([k for k in known if k <= i], default=None)
        hi = min([k for k in known if k >= i], default=None)
        if lo is None: return pos[hi]
        if hi is None: return min(len(rec) - 1, pos[lo] + (i - lo))
        return pos[lo] if hi == lo else round(pos[lo] + (pos[hi] - pos[lo]) * (i - lo) / (hi - lo))
    win = 240
    energy = [max(abs(v) for v in audio[i:i + win]) for i in range(0, len(audio), win)]
    cuts, last = [], 0
    for b in starts[1:]:
        # 単語の時刻は実際より少し遅れて出るので、前の語の終わり〜次の語の始まりより手前側まで探して、一番静かな点で切る
        t_prev = rec_t[min(len(rec_t) - 1, at(b - 1))]
        t_next = rec_t[min(len(rec_t) - 1, at(b))]
        lo_t, hi_t = min(t_prev, t_next) - 0.15, max(t_prev, t_next)
        lo, hi = max(last // win + 1, int(lo_t * SR / win)), min(len(energy) - 1, int(hi_t * SR / win))
        if lo > hi:
            return None
        best = min(range(lo, hi + 1), key=lambda k: energy[k])
        last = best * win
        cuts.append(last)
    bounds = [0, *cuts, len(audio)]
    return [audio[bounds[k]: bounds[k + 1]] for k in range(len(texts))]


def split(audio, texts):
    """文字数の比から切れ目の見当をつけ、その近くの無音で切って文ごとに分ける。見つからなければ None。
    新しいモデルは文の間が短いので、無音とみなす条件を段階的にゆるめて探す。"""
    n = len(texts)
    if n == 1:
        return [audio]
    for level, min_sec in [(0.04, 0.18), (0.06, 0.12), (0.08, 0.08), (0.10, 0.06)]:
        cuts = _cuts(audio, texts, level, min_sec)
        if cuts:
            bounds = [0, *cuts, len(audio)]
            return [audio[bounds[k]: bounds[k + 1]] for k in range(n)]
    return None


def _cuts(audio, texts, level, min_sec):
    n = len(texts)
    win = 240  # 10ms
    peak = max(1, max(abs(v) for v in audio))
    quiet = [max(abs(v) for v in audio[i:i + win]) < peak * level for i in range(0, len(audio), win)]
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if i > 0 and j < len(quiet) and (j - i) * win >= SR * min_sec:
                runs.append((j - i, (i + j) // 2 * win))
            i = j
        else:
            i += 1
    if len(runs) < n - 1:
        return None
    total = sum(len(t) for t in texts)
    cuts, acc, last = [], 0, 0
    for t in texts[:-1]:
        acc += len(t)
        want = len(audio) * acc / total
        cands = [c for _, c in runs if c > last]
        if not cands:
            return None
        last = min(cands, key=lambda c: abs(c - want))
        cuts.append(last)
    return cuts


def place(parts, lines, scene_end, floor=0.0):
    pos, end = [], floor
    for (want, _), a in zip(lines, parts):
        start = max(want, end + 0.12)
        end = start + len(a) / SR
        pos.append(start)
    return pos, end <= scene_end - 0.15


def main(variant, out_name=None):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        raise SystemExit('GEMINI_API_KEY が設定されていません')
    model = os.environ.get('GEMINI_TTS_MODEL', 'gemini-2.5-pro-preview-tts')
    voice = os.environ.get('GEMINI_TTS_VOICE', 'Achernar')
    cfg = SCRIPTS[variant]
    out = array('i', bytes(4 * int(cfg['duration'] * SR)))
    retake, prev_end = {}, 0.0
    if cfg.get('retakes'):
        src, alt = zip(*cfg['retakes'].items())
        audio = tts('\n'.join(alt), model, voice, key)
        parts = asr_split(audio, list(alt)) or split(audio, list(alt))
        if parts is None:
            print('  (録り直しを切り分けられなかったので、元の音声を使います)')
        else:
            retake = dict(zip(src, parts))
    for s0, s1, lines in cfg['scenes']:
        audio = tts('\n'.join(t for _, t in lines), model, voice, key)
        texts = [t for _, t in lines]
        parts = (asr_split(audio, texts) if len(texts) >= 4 else None) or split(audio, texts)
        if parts is None:
            print(f'  ({s0}s の場面は切り分けられなかったので、まとめて置きます)')
            parts, lines = [audio], [(lines[0][0], ' / '.join(t for _, t in lines))]
        parts = [retake.get(t, a) for (_, t), a in zip(lines, parts)] if len(parts) == len(lines) else parts
        parts = [trim(a) for a in parts]
        factor = 1.0
        pos, ok = place(parts, lines, s1, prev_end)
        while not ok and factor < 1.25:
            factor = round(factor + 0.05, 2)
            sped = [speed_up(a, factor) for a in parts]
            pos, ok = place(sped, lines, s1, prev_end)
        if factor > 1.0:
            parts = sped
        for (want, text), a, st in zip(lines, parts, pos):
            flag = '' if ok else '  !! 場面からはみ出し'
            print(f'{st:6.2f}s (予定 {want:5.2f})  {len(a) / SR:4.2f}s  x{factor:.2f}  {text}{flag}')
            s = int(st * SR)
            for i, v in enumerate(a[: max(0, len(out) - s)]):
                out[s + i] += v
            prev_end = max(prev_end, st + len(a) / SR)
    peak = max(1, max(abs(v) for v in out))
    pcm = array('h', (int(v * 0.9 * 32767 / peak) for v in out)).tobytes()
    path = os.path.join(HERE, out_name or f'narration_{variant}.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    print('done:', path, f'(model={model}, voice={voice})')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
