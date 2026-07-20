#!/usr/bin/env python3
"""Runway API クライアント: ジョブ投入→ポーリング→ダウンロード。

使い方:
  RUNWAY_API_KEY=... python3 scripts/runway_gen.py submit <endpoint> '<json payload>'
  RUNWAY_API_KEY=... python3 scripts/runway_gen.py wait <task_id> <出力パス>
  RUNWAY_API_KEY=... python3 scripts/runway_gen.py balance

APIキーは環境変数のみ。ファイル・リポジトリに書かないこと。
"""
import json
import os
import sys
import time
import urllib.request

BASE = 'https://api.dev.runwayml.com/v1'
KEY = os.environ['RUNWAY_API_KEY']
HDRS = {
    'Authorization': f'Bearer {KEY}',
    'X-Runway-Version': '2024-11-06',
    'Content-Type': 'application/json',
}


def req(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(BASE + path, data=data, headers=HDRS, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')


def main():
    cmd = sys.argv[1]
    if cmd == 'balance':
        code, d = req('GET', '/organization')
        print(d.get('creditBalance'))
    elif cmd == 'submit':
        endpoint, payload = sys.argv[2], json.loads(sys.argv[3])
        code, d = req('POST', f'/{endpoint}', payload)
        if code >= 300:
            print(f'ERROR {code}: {json.dumps(d, ensure_ascii=False)}', file=sys.stderr)
            sys.exit(1)
        print(d['id'])
    elif cmd == 'waiturl':
        task_id = sys.argv[2]
        t0 = time.time()
        while True:
            code, d = req('GET', f'/tasks/{task_id}')
            st = d.get('status')
            if st == 'SUCCEEDED':
                print(d['output'][0])
                return
            if st in ('FAILED', 'CANCELLED'):
                print(f'FAILED: {json.dumps(d, ensure_ascii=False)[:500]}', file=sys.stderr)
                sys.exit(1)
            if time.time() - t0 > 900:
                print('TIMEOUT', file=sys.stderr)
                sys.exit(1)
            time.sleep(8)
    elif cmd == 'wait':
        task_id, out = sys.argv[2], sys.argv[3]
        t0 = time.time()
        while True:
            code, d = req('GET', f'/tasks/{task_id}')
            st = d.get('status')
            if st == 'SUCCEEDED':
                url = d['output'][0]
                urllib.request.urlretrieve(url, out)
                print(f'OK {out} ({time.time()-t0:.0f}s)')
                return
            if st in ('FAILED', 'CANCELLED'):
                print(f'FAILED: {json.dumps(d, ensure_ascii=False)[:500]}', file=sys.stderr)
                sys.exit(1)
            if time.time() - t0 > 900:
                print('TIMEOUT', file=sys.stderr)
                sys.exit(1)
            time.sleep(8)
    else:
        sys.exit(f'unknown cmd {cmd}')


if __name__ == '__main__':
    main()
