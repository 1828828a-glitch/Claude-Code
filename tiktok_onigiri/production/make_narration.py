# ナレーション原稿(narration/A.json など)から1行ずつ音声を作り、尺を測る
#
# 本番(お手元のPC):  python3 make_narration.py A --engine edge
#   Edge TTS の Keita / Nanami で作る。商用で使う前に利用条件を必ず確認すること
#   (正規ライセンスが必要なら Azure Speech の同じ声に置き換える)
# 尺の確認用(この制作環境): python3 make_narration.py A --engine openjtalk
#   Open JTalk の仮の声。母の声も男声を高くしただけの代用品
#
# 出力: narration/A/A01.wav ... と narration/A_durations.json(秒)
import argparse
import asyncio
import json
import os
import subprocess
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))


def duration(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path])
    return round(float(out), 3)


def to_wav48k(src, dst):
    # 前後の無音を削って正味の尺にする
    trim = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,'
            'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', trim, '-ar', '48000', '-ac', '1', dst], check=True)


async def edge_line(text, voice, rate, pitch, mp3):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(mp3)


def openjtalk_line(text, who, rate, dst):
    import numpy as np
    import pyopenjtalk
    # Edge TTS の話速に近づけるため少し速める。teen/mom は声の高さで代用
    speed = 1.12 * (1 + int(rate.strip('%+') or 0) / 100 * (1 if not rate.startswith('-') else -1))
    half_tone = {'teen': 2.0, 'mom': 5.0}.get(who, 0.0)
    x, sr = pyopenjtalk.tts(text, speed=speed, half_tone=half_tone)
    y = (x / max(1.0, abs(x).max()) * 0.9 * 32767).astype(np.int16)
    tmp = dst + '.tmp.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes())
    to_wav48k(tmp, dst)
    os.remove(tmp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('version', help='A または C')
    ap.add_argument('--engine', choices=['edge', 'openjtalk'], default='edge')
    a = ap.parse_args()
    spec = json.load(open(os.path.join(HERE, 'narration', f'{a.version}.json'), encoding='utf-8'))
    outdir = os.path.join(HERE, 'narration', a.version)
    os.makedirs(outdir, exist_ok=True)
    durs = {}
    for ln in spec['lines']:
        v = spec['voices'][ln['who']]
        dst = os.path.join(outdir, f"{ln['id']}.wav")
        if a.engine == 'edge':
            mp3 = dst[:-4] + '.mp3'
            asyncio.run(edge_line(ln['text'], v['edge'], v['rate'], v['pitch'], mp3))
            to_wav48k(mp3, dst)
            os.remove(mp3)
        else:
            openjtalk_line(ln['text'], ln['who'], v['rate'], dst)
        durs[ln['id']] = duration(dst)
        print(f"{ln['id']} {durs[ln['id']]:5.2f}s  {ln['text']}", file=sys.stderr)
    json.dump({'engine': a.engine, 'durations': durs}, open(os.path.join(HERE, 'narration', f'{a.version}_durations.json'), 'w'), indent=1)
    # プレビズ(src/videos/{a,c}_nt.js)が尺を読むためのファイル
    js = os.path.join(HERE, '..', 'src', 'videos', f'{a.version.lower()}_nt.narr.js')
    with open(js, 'w', encoding='utf-8') as f:
        f.write(f"// make_narration.py が書き出す。手で編集しない\nwindow.NARR = {json.dumps({'engine': a.engine, 'dur': durs, 'text': {l['id']: l['text'] for l in spec['lines']}}, ensure_ascii=False)};\n")
    print(f'total {sum(durs.values()):.2f}s', file=sys.stderr)


if __name__ == '__main__':
    main()
