#!/usr/bin/env node
// アイコンを Iconify から探して、手元の zukai/icons/ に取ってくる
//
//   node zukai/fetch-icons.js search 電球 [--prefix lucide] [--limit 12]   アイコンを探す
//   node zukai/fetch-icons.js [データ.json ...]                         データに書かれた "icon" を取ってくる
//
// better-icons（https://github.com/better-auth/better-icons）と同じ Iconify の公開 API を、curl で直接呼んでいる。
// better-icons を MCP サーバーとして登録すれば Claude が会話の中で同じ検索をできるが、ここでは外部のコードを動かさずに済む形にした。
// アイコンは "lucide:lightbulb" のように「アイコン集:名前」で指定する。取ってきた SVG は zukai/icons/<アイコン集>/<名前>.svg に置き、
// アイコン集のライセンスを zukai/icons/LICENSES.md に書き足す（Lucide は ISC）。

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const API = 'https://api.iconify.design';
const DIR = path.join(__dirname, 'icons');

const get = (url, params = {}) => {
  const args = ['-sSfL', '-m', '30', '-G', url];
  for (const [k, v] of Object.entries(params)) args.push('--data-urlencode', `${k}=${v}`);
  return execFileSync('curl', args, { encoding: 'utf8' });
};

function search(argv) {
  const opt = (name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
  const query = argv.filter((a, i) => !a.startsWith('--') && !['--prefix', '--limit'].includes(argv[i - 1])).join(' ');
  const params = { query, limit: opt('--limit', '12') };
  if (opt('--prefix')) params.prefix = opt('--prefix');
  const res = JSON.parse(get(`${API}/search`, params));
  console.log((res.icons || []).join('\n') || '見つからない');
}

// データの JSON から "icon": "prefix:name" をすべて拾う
function collect(v, out) {
  if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'icon' && typeof x === 'string') out.add(x); else collect(x, out); }
  return out;
}

function fetchIcons(files) {
  const ids = new Set();
  for (const f of files) collect(JSON.parse(fs.readFileSync(f, 'utf8')), ids);
  const licenses = new Map();
  for (const id of ids) {
    const [prefix, name] = id.split(':');
    if (!prefix || !name || !/^[a-z0-9-]+$/.test(prefix + name)) { console.log(`形式が違う  ${id}（prefix:name で書く）`); continue; }
    const file = path.join(DIR, prefix, `${name}.svg`);
    if (!licenses.has(prefix)) {
      const info = JSON.parse(get(`${API}/collections`, { prefix }))[prefix] || {};
      licenses.set(prefix, info);
    }
    if (fs.existsSync(file)) { console.log(`あり   ${id}`); continue; }
    const svg = get(`${API}/${prefix}/${name}.svg`);
    if (!svg.startsWith('<svg')) { console.log(`取れない ${id}`); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, svg);
    console.log(`取得   ${id}`);
  }
  // ライセンスの一覧を書き足す
  const lic = path.join(DIR, 'LICENSES.md');
  const known = fs.existsSync(lic) ? fs.readFileSync(lic, 'utf8') : '# アイコンのライセンス\n\nこのフォルダの SVG は Iconify（https://iconify.design ）経由で取ってきたもの。アイコン集ごとのライセンスは次のとおり。\n\n';
  let text = known;
  for (const [prefix, info] of licenses) {
    if (text.includes(`| ${prefix} |`)) continue;
    if (!text.includes('| アイコン集 |')) text += '| アイコン集 | 名前 | ライセンス | 作者 |\n| --- | --- | --- | --- |\n';
    text += `| ${prefix} | ${info.name || ''} | ${info.license ? `[${info.license.title}](${info.license.url})` : '不明'} | ${info.author ? info.author.name : ''} |\n`;
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(lic, text);
}

const argv = process.argv.slice(2);
try {
  if (argv[0] === 'search') search(argv.slice(1));
  else fetchIcons(argv.length ? argv : fs.readdirSync(path.join(__dirname, 'examples')).filter((f) => f.endsWith('.json')).map((f) => path.join(__dirname, 'examples', f)));
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
