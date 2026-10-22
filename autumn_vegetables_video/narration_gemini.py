"""Gemini TTS で動画のタイムラインに合わせたナレーションを作る。

    GEMINI_API_KEY=... python narration_gemini.py tulip   -> narration_tulip.wav

環境変数:
    GEMINI_API_KEY     必須
    GEMINI_TTS_MODEL   省略時 gemini-2.5-flash-preview-tts
    GEMINI_TTS_VOICE   省略時 Achernar (やわらかい声)
必要: ffmpeg (Python は標準ライブラリのみ)
生成した音声は narration_cache/ にセリフ単位で保存し、同じセリフは再生成しない。
各セリフは開始時刻から「終わらせたい秒」までに収まるよう、長い場合だけ ffmpeg で少し速める (最大 1.25 倍)。
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

STYLE = ('次のセリフを、家庭菜園を案内するやさしく落ち着いた声で、'
         '聞き取りやすくはっきり日本語で読み上げてください。セリフ以外は何も話さないでください。')

# (開始秒, セリフ, 終わらせたい秒)
SCRIPTS = {
    'tulip': {
        'duration': 60,
        'lines': [
            (0.6, '秋に植えて、春に咲く。', 2.7),
            (2.9, 'チューリップの育て方を、ご紹介します。', 5.7),
            (6.4, '植えどきは、紅葉が見頃を迎えるころ。', 8.9),
            (9.0, '北海道・東北は10月、九州は11月下旬からが目安です。', 12.6),
            (12.8, '遅くとも、年内には植えつけましょう。', 14.9),
            (15.5, '球根は、ずっしり重くて、押してもへこまないもの。', 18.9),
            (19.0, '傷や汚れがないかも、確かめてください。', 21.8),
            (22.4, '地植えなら、深さは球根3個分。間隔は10センチほどです。', 25.9),
            (26.1, '鉢植えは浅めに、3から5センチ間隔で並べます。', 29.3),
            (29.5, '植えてから2週間は、たっぷり水やりを。', 32.8),
            (33.5, 'きれいに見せるコツは、球根の向き。', 35.8),
            (36.0, '平らな面を外側に向けると、大きな葉が外へ広がります。', 39.7),
            (40.4, '鉢植えの土は、赤玉土6、腐葉土3、パーライト1。', 43.3),
            (43.5, '冬は5度ほどの寒さに、2か月当てるのがポイントです。', 46.8),
            (47.5, '春になると、わせは3月下旬から、おくては4月下旬に咲きます。', 51.0),
            (51.2, '花びらが散る前に、花首をカットしましょう。', 53.8),
            (54.4, '秋に植えて、春を待とう。', 56.4),
            (56.6, '植えどきは、もうすぐです。', 59.2),
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
        'contents': [{'parts': [{'text': f'{STYLE}\n{text}'}]}],
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
    pcm = base64.b64decode(part['data'])
    open(path, 'wb').write(pcm)
    return array('h', pcm)


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


def main(variant):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        raise SystemExit('GEMINI_API_KEY が設定されていません')
    model = os.environ.get('GEMINI_TTS_MODEL', 'gemini-2.5-flash-preview-tts')
    voice = os.environ.get('GEMINI_TTS_VOICE', 'Achernar')
    cfg = SCRIPTS[variant]
    out = array('i', bytes(4 * int(cfg['duration'] * SR)))
    for start, text, end in cfg['lines']:
        slot = end - start
        audio = trim(tts(text, model, voice, key))
        dur = len(audio) / SR
        factor = 1.0
        if dur > slot:
            factor = min(1.25, dur / slot)
            audio = speed_up(audio, factor)
        dur2 = len(audio) / SR
        flag = '  !! はみ出し' if dur2 > slot + 0.05 else ''
        print(f'{start:6.2f}s  {dur2:4.2f}/{slot:4.2f}s  x{factor:.2f}  {text}{flag}')
        s = int(start * SR)
        for i, v in enumerate(audio[: max(0, len(out) - s)]):
            out[s + i] += v
    peak = max(1, max(abs(v) for v in out))
    pcm = array('h', (int(v * 0.9 * 32767 / peak) for v in out)).tobytes()
    path = os.path.join(HERE, f'narration_{variant}.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    print('done:', path, f'(model={model}, voice={voice})')


if __name__ == '__main__':
    main(sys.argv[1])
