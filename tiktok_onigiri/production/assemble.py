# 生成した素材を、プレビズと同じ秒数で組み上げて最終動画にする(スキル §8)
#
# 使い方: python3 assemble.py A
#   shots/<生成キー>.mp4 を探す(生成キーは generation_list.md / shotlist_A.csv の列)。
#   見つからないカットはプレビズの映像で埋める(途中の仮組みにも使える)。
#   inpoints_A.csv(shot_id,in)があれば、各素材の何秒目から使うかを指定できる。無ければ0.5秒目から。
# 出力: final_A.mp4(と check_video.sh の結果)
import argparse
import csv
import json
import os
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
CHECK = os.path.join(ROOT, '..', '.claude', 'skills', 'ai-video-quality', 'scripts', 'check_video.sh')
BASE = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1'
MEMORY = 'eq=saturation=0.6:brightness=0.02,colorbalance=rs=0.08:gs=0.03:bs=-0.07,vignette=PI/4.5'


def run(cmd):
    subprocess.run(cmd, check=True)


def shot_filter(treat):
    if treat.startswith('polaroid'):
        g = ',' + MEMORY if 'memory' in treat else ''
        # 同じ素材をぼかして背景に、正方形に切った素材を白い枠で重ねる
        return (f'[0:v]{BASE},split[a][b];[a]boxblur=28:2,eq=brightness=-0.12[bg];'
                f"[b]crop='min(iw,ih)':'min(iw,ih)',scale=760:760{g},pad=820:960:30:30:white[pol];"
                f'[bg][pol]overlay=(W-w)/2:(H-h)/2-40,format=yuv420p[v]')
    return f"[0:v]{BASE}{(',' + MEMORY) if treat == 'memory' else ''},format=yuv420p[v]"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('version', choices=['A', 'C'])
    ap.add_argument('--shots', default=os.path.join(HERE, 'shots'))
    ap.add_argument('--bed', help='BGM+効果音(既定: out/{a,c}_nt_bed.wav)')
    ap.add_argument('--out', help='出力(既定: production/final_A.mp4)')
    a = ap.parse_args()
    v, vl = a.version, a.version.lower()
    tl = json.load(open(os.path.join(HERE, f'timeline_{v}.json'), encoding='utf-8'))
    previs = os.path.join(ROOT, 'out', f'{vl}_nt_video.mp4')
    bed = a.bed or os.path.join(ROOT, 'out', f'{vl}_nt_bed.wav')
    out = a.out or os.path.join(HERE, f'final_{v}.mp4')
    inpoints = {}
    ip = os.path.join(HERE, f'inpoints_{v}.csv')
    if os.path.exists(ip):
        inpoints = {r['shot_id']: float(r['in']) for r in csv.DictReader(open(ip, encoding='utf-8-sig'))}

    tmp = tempfile.mkdtemp(prefix=f'assemble_{v}_')
    parts, used, missing = [], [], []
    for i, s in enumerate(tl['shots']):
        # フレーム数は累積で丸め、全体の尺がずれないようにする
        t1 = s['t0'] + s['sec'] if i + 1 == len(tl['shots']) else tl['shots'][i + 1]['t0']
        frames = round(t1 * 30) - round(s['t0'] * 30)
        src = next((os.path.join(a.shots, s['key'] + ext) for ext in ('.mp4', '.mov', '.webm') if os.path.exists(os.path.join(a.shots, s['key'] + ext))), None)
        dst = os.path.join(tmp, f'{i:02d}.mp4')
        if src:
            used.append(s['id'])
            ss = inpoints.get(s['id'], 0.5)
            run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(ss), '-i', src, '-filter_complex', shot_filter(s['treat']),
                 '-map', '[v]', '-frames:v', str(frames), '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', dst])
        else:
            missing.append(s['id'])
            run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f"{round(s['t0'] * 30) / 30:.4f}", '-i', previs, '-vf', BASE,
                 '-frames:v', str(frames), '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', dst])
        parts.append(dst)
    lst = os.path.join(tmp, 'list.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    video = os.path.join(tmp, 'video.mp4')
    run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', video])

    # ナレーションを所定の位置に並べ、その間だけBGMを下げる
    inputs, chains = [], []
    for k, n in enumerate(tl['narration']):
        inputs += ['-i', os.path.join(HERE, n['file'])]
        ms = int(n['t'] * 1000)
        chains.append(f'[{k + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms}[n{k}]')
    nn = len(tl['narration'])
    fc = ';'.join(chains) + ';' + ''.join(f'[n{k}]' for k in range(nn)) + f'amix=inputs={nn}:normalize=0,apad,atrim=0:{tl['duration']:.3f},asplit=2[nar][key];'
    fc += '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.8[b];[b][key]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[bd];'
    fc += f"[bd][nar]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]"
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', video, '-i', bed, *inputs, '-filter_complex', fc,
         '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out])
    print(f'wrote {out}')
    print(f'generated shots used: {len(used)}  / filled from previs: {len(missing)} {" ".join(missing)}')
    if os.path.exists(CHECK):
        subprocess.run(['bash', CHECK, out, f"{tl['duration']:.2f}"])


if __name__ == '__main__':
    main()
