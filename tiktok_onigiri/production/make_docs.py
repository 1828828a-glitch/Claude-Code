# プレビズの書き出し(out/{a,c}_nt_shotlist.json と _cues.json)から、生成用の書類を作る
#   shotlist_A.csv / shotlist_C.csv   カット表(スキル §2 の列)
#   prompts_A.md / prompts_C.md       カット別プロンプト(スキル §4 のテンプレート)
#   generation_list.md                共用カットを1回に数えた生成リストとクレジット見積もり
#   timeline_A.json / timeline_C.json 組み上げ(assemble.py)用の秒数とナレーション位置
# 使い方: python3 make_docs.py
import csv
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out')
CREDIT_PER_GEN = 20      # Veo 3.1 Fast 1回(8秒)あたり。調査メモの実績値
RETAKE = 1.5             # スキル §5 のリテイク係数
LOOK = 'Photorealistic Japanese live-action TV-commercial drama, natural motivated light, soft film grain, 35mm lens, shallow depth of field, warm muted palette, vertical 9:16.'
NEG = 'no text, no subtitles, no captions, no signage or menus with letters, plain unlabeled paper lanterns, no logos, no brand names on packages, no watermark, no on-screen UI, phone screen never readable, no dialogue, no lip-synced speech'
TREAT = {
    'memory': '回想グレード(セピア寄り・周辺減光)を仕上げで掛ける',
    'polaroid-memory': 'ポラロイド枠に合成+回想グレード',
    'polaroid': 'ポラロイド枠に合成(色はそのまま)',
    '': '',
}


def gen_key(row):
    m = re.match(r'(SH-[A-Z]+)', row.get('shared', ''))
    return m.group(1) if m else row['id']


def load(v):
    rows = json.load(open(os.path.join(OUT, f'{v.lower()}_nt_shotlist.json'), encoding='utf-8'))
    cues = json.load(open(os.path.join(OUT, f'{v.lower()}_nt_cues.json'), encoding='utf-8'))
    return rows, cues


def write_csv(v, rows):
    cols = [('shot_id', 'id'), ('開始(秒)', 't0'), ('秒数', 'sec'), ('構成上の役割', 'role'), ('被写体', 'subject'), ('演技', 'acting'),
            ('小道具', 'props'), ('カメラ', 'camera'), ('光', 'light'), ('音', 'sound'), ('参照画像', 'refs'), ('共用可否', 'shared'),
            ('ナレーション', 'narration'), ('仕上げ処理', 'treat'), ('生成キー', None)]
    with open(os.path.join(HERE, f'shotlist_{v}.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow([c for c, _ in cols])
        for r in rows:
            out = []
            for c, k in cols:
                if k is None:
                    out.append(gen_key(r))
                elif k == 'treat':
                    out.append(TREAT.get(r.get('treat', ''), r.get('treat', '')) + (' ' + r['post'] if r.get('post') else ''))
                else:
                    out.append(r.get(k, ''))
            w.writerow(out)


def prompt_block(r, use_sec):
    v = r.get('veo', {})
    return '\n'.join([
        f"[SHOT {r['id']} / {use_sec:.1f}s in edit (generate 8s) / 9:16]",
        f"Subject: {v.get('subject', '')}",
        f"Action & acting intensity: {v.get('action', '')}",
        f"Props (exact): {v.get('props', '')}",
        f"Camera: {v.get('camera', '')}",
        f"Light & mood: {v.get('light', '')}",
        f"Sound: {v.get('sound', '')}",
        f"Look: {LOOK}",
        f"Negative: {NEG}",
    ])


def write_prompts(v, rows):
    lines = [f'# カット別プロンプト {v}版(Veo 3.1 Fast + Ingredients 想定)', '',
             '各ブロックをそのまま貼り付ける。参照画像(Ingredients)は「参照」の行のものを入れる。',
             '8秒で生成し、編集では表の秒数だけ使う。共用カットは generation_list.md を見て1回だけ生成する。', '']
    for r in rows:
        lines += [f"## {r['id']}  {r.get('role', '')}", '',
                  f"- 編集で使う尺: {r['sec']}秒(開始 {r['t0']}秒)",
                  f"- 参照: {r.get('refs', '')}",
                  f"- 共用: {r.get('shared', '')}(生成キー {gen_key(r)})",
                  f"- ナレーション: {r.get('narration', '') or 'なし'}",
                  f"- 仕上げ: {TREAT.get(r.get('treat', ''), '') or 'なし'}", '',
                  '```', prompt_block(r, r['sec']), '```', '']
    open(os.path.join(HERE, f'prompts_{v}.md'), 'w', encoding='utf-8').write('\n'.join(lines))


def write_timeline(v, rows, cues):
    narr = [{'t': c['t'], 'file': c['file'], 'line': c.get('line')} for c in cues['audio'] if c['type'] == 'wav']
    shots = [{'id': r['id'], 'key': gen_key(r), 't0': r['t0'], 'sec': r['sec'], 'treat': r.get('treat', '')} for r in rows]
    json.dump({'version': v, 'duration': cues['duration'], 'shots': shots, 'narration': narr},
              open(os.path.join(HERE, f'timeline_{v}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def write_generation_list(all_rows):
    gens = {}
    for v, rows in all_rows.items():
        for r in rows:
            k = gen_key(r)
            g = gens.setdefault(k, {'role': r.get('role', ''), 'uses': [], 'refs': r.get('refs', '')})
            g['uses'].append(f"{r['id']}({r['sec']}s)")
    n = len(gens)
    est = n * CREDIT_PER_GEN
    lines = ['# 生成リスト(A・C合計、共用カットは1回)', '',
             f'生成する本数は {n} 本。1本 {CREDIT_PER_GEN} クレジットとして {est} クレジット、リテイク係数 {RETAKE} を掛けた見積もりは {int(est * RETAKE)} クレジット。', '',
             '| 生成キー | 内容 | 使うカット | 参照画像 |', '|---|---|---|---|']
    for k, g in sorted(gens.items(), key=lambda kv: (not kv[0].startswith('SH-'), kv[0])):
        lines.append(f"| {k} | {g['role']} | {' '.join(g['uses'])} | {g['refs']} |")
    lines += ['', '生成した動画は shots/ に「生成キー.mp4」の名前で置くと、assemble.py がそのまま拾う。']
    open(os.path.join(HERE, 'generation_list.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    return n, est


def main():
    all_rows = {}
    for v in ['A', 'C']:
        rows, cues = load(v)
        all_rows[v] = rows
        write_csv(v, rows)
        write_prompts(v, rows)
        write_timeline(v, rows, cues)
        print(f'{v}: {len(rows)} shots, {cues["duration"]:.2f}s')
    n, est = write_generation_list(all_rows)
    print(f'generations: {n}  credits: {est} (x{RETAKE} = {int(est * RETAKE)})')


if __name__ == '__main__':
    main()
