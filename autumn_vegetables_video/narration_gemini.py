"""Gemini TTS で動画のタイムラインに合わせたナレーションを作る。

    GEMINI_API_KEY=... python narration_gemini.py tulip   -> narration_tulip.wav

環境変数:
    GEMINI_API_KEY     必須
    GEMINI_TTS_MODEL   省略時 gemini-2.5-pro-preview-tts
                       (gemini-3.8-flash-tts は声の指示まで読み上げてしまうため使わない)
    GEMINI_TTS_VOICE   省略時 Achernar (やわらかい声)
必要: ffmpeg (Python は標準ライブラリのみ)
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
STYLE = 'やさしく明るい声で、テンポよく、聞き取りやすく読んでください'

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
            (22, 33, [(22.4, '地植えは、きゅうこん3個分の深さに、10センチ間隔。'), (26.1, '鉢植えは浅めに、3から5センチ間隔で。'), (29.6, '植えてから2週間は、たっぷり水やりを。')]),
            (33, 40, [(33.5, 'コツは、球根の向き。'), (35.6, '平らな面を外側にすると、大きな葉が外へ広がります。')]),
            (40, 47, [(40.5, '土の配合は、6対3対1。'), (43.4, '冬は5度ほどの寒さに、2か月当てて。')]),
            (47, 54, [(47.5, '春になると、わせから順に咲きはじめます。'), (50.8, '花が散る前に、花首をカットしましょう。')]),
            (54, 60, [(54.4, '秋に植えて、春を待とう。'), (56.7, '植えどきは、もうすぐです。')]),
        ],
    },
    # 23 種の名前は 1 回で生成すると切り分けを誤りやすいので、8・8・7 種の 3 回に分ける
    'winter': {
        'duration': 57,
        'scenes': [
            (0, 6, [(0.6, '可憐に冬の庭を彩る。'), (2.8, '冬に咲く花、23選です。')]),
            *[(6 if k == 0 else round(6.4 + k * 8 * 1.22 - 0.1, 2), round(6.4 + min(23, (k + 1) * 8) * 1.22 - 0.1, 2) if k < 2 else 35,
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
        'contents': [{'parts': [{'text': f'{STYLE}: {text}'}]}],
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


def split(audio, texts):
    """文字数の比から切れ目の見当をつけ、その近くの無音で切って文ごとに分ける。見つからなければ None。"""
    n = len(texts)
    if n == 1:
        return [audio]
    win = 480  # 20ms
    peak = max(1, max(abs(v) for v in audio))
    quiet = [max(abs(v) for v in audio[i:i + win]) < peak * 0.04 for i in range(0, len(audio), win)]
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if i > 0 and j < len(quiet) and (j - i) * win >= SR * 0.18:
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
    bounds = [0, *cuts, len(audio)]
    return [audio[bounds[k]: bounds[k + 1]] for k in range(n)]


def place(parts, lines, scene_end):
    pos, end = [], 0.0
    for (want, _), a in zip(lines, parts):
        start = max(want, end + 0.12)
        end = start + len(a) / SR
        pos.append(start)
    return pos, end <= scene_end - 0.15


def main(variant):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        raise SystemExit('GEMINI_API_KEY が設定されていません')
    model = os.environ.get('GEMINI_TTS_MODEL', 'gemini-2.5-pro-preview-tts')
    voice = os.environ.get('GEMINI_TTS_VOICE', 'Achernar')
    cfg = SCRIPTS[variant]
    out = array('i', bytes(4 * int(cfg['duration'] * SR)))
    for s0, s1, lines in cfg['scenes']:
        audio = tts('\n'.join(t for _, t in lines), model, voice, key)
        parts = split(audio, [t for _, t in lines])
        if parts is None:
            print(f'  ({s0}s の場面は切り分けられなかったので、まとめて置きます)')
            parts, lines = [audio], [(lines[0][0], ' / '.join(t for _, t in lines))]
        parts = [trim(a) for a in parts]
        factor = 1.0
        pos, ok = place(parts, lines, s1)
        while not ok and factor < 1.25:
            factor = round(factor + 0.05, 2)
            sped = [speed_up(a, factor) for a in parts]
            pos, ok = place(sped, lines, s1)
        if factor > 1.0:
            parts = sped
        for (want, text), a, st in zip(lines, parts, pos):
            flag = '' if ok else '  !! 場面からはみ出し'
            print(f'{st:6.2f}s (予定 {want:5.2f})  {len(a) / SR:4.2f}s  x{factor:.2f}  {text}{flag}')
            s = int(st * SR)
            for i, v in enumerate(a[: max(0, len(out) - s)]):
                out[s + i] += v
    peak = max(1, max(abs(v) for v in out))
    pcm = array('h', (int(v * 0.9 * 32767 / peak) for v in out)).tobytes()
    path = os.path.join(HERE, f'narration_{variant}.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    print('done:', path, f'(model={model}, voice={voice})')


if __name__ == '__main__':
    main(sys.argv[1])
