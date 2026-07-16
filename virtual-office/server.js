#!/usr/bin/env node
// バーチャルオフィスの「見張り役」サーバー
// Node.js 標準機能のみ（追加ライブラリなし）。
// 役割: ①public/ をブラウザに配信 ②data/events.jsonl を見張って新しい行を読む
//       ③新しい行を SSE でブラウザへリアルタイム送信（接続直後は直近履歴も送る）
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3777;
const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const EVENTS = path.join(DATA, 'events.jsonl');

fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(EVENTS)) fs.writeFileSync(EVENTS, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// ---- SSE（リアルタイム通信） ----
const clients = new Set();
let offset = fs.statSync(EVENTS).size;

function broadcastNewLines() {
  try {
    const st = fs.statSync(EVENTS);
    if (st.size < offset) offset = 0; // ファイルが作り直された
    if (st.size === offset) return;
    const fd = fs.openSync(EVENTS, 'r');
    const buf = Buffer.alloc(st.size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    offset = st.size;
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      for (const res of clients) res.write(`data: ${line}\n\n`);
    }
  } catch (e) { /* 見張りは何があっても死なない */ }
}

try { fs.watch(DATA, (ev, f) => { if (f === 'events.jsonl') broadcastNewLines(); }); } catch (e) {}
setInterval(broadcastNewLines, 1000);
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000);

function recentLines(n) {
  try {
    const text = fs.readFileSync(EVENTS, 'utf8');
    return text.split('\n').filter((l) => l.trim()).slice(-n);
  } catch (e) { return []; }
}

// ---- ニュース見出し（休憩室の雑談用。取れなければ空でよい） ----
let newsCache = { ts: 0, titles: [] };
function fetchNews(cb) {
  if (Date.now() - newsCache.ts < 30 * 60 * 1000) return cb(newsCache.titles);
  const req = https.get('https://www.nhk.or.jp/rss/news/cat0.xml', { timeout: 5000 }, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
      const titles = [...body.matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]+)/g)]
        .map((m) => m[1].trim()).filter((t) => t && !/NHK/.test(t)).slice(0, 8);
      newsCache = { ts: Date.now(), titles };
      cb(titles);
    });
  });
  req.on('timeout', () => { req.destroy(); cb(newsCache.titles); });
  req.on('error', () => cb(newsCache.titles));
}

// ---- HTTPサーバー ----
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    for (const line of recentLines(50)) res.write(`data: ${line}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname === '/api/news') {
    fetchNews((titles) => {
      res.writeHead(200, { 'Content-Type': MIME['.json'] });
      res.end(JSON.stringify({ titles }));
    });
    return;
  }

  // 静的ファイル配信（public/ の外には出さない）
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PUB, file);
  if (!full.startsWith(PUB)) { res.writeHead(403); res.end(); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`バーチャルオフィス起動: http://localhost:${PORT}`);
});
