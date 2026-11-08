#!/usr/bin/env node
// 型の余裕を測る。スライドの文字を少しずつ増やして、どこで崩れ始めるかを調べる
//
//   node zukai/stress.js [データ.json ...]
//
// 既定では examples/workslop.json の8枚と examples/ai_hanasu.json の図解を測る。
// 文字は元の文を繰り返して伸ばす（1.25倍なら元の文の後ろに頭の25%を足す）。
// 崩れたかどうかは check.js と同じ基準で見る。ただし行末の取り残しは崩れに数えず、別の列に出す。

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { checkFiles } = require('./check.js');

const FACTORS = [1, 1.25, 1.5, 2, 2.5, 3];
// 文字ではない値（イラスト名・番号・種類）は伸ばさない
const KEEP = new Set(['type', 'illust', 'giver', 'taker', 'used', 'me', 'ai', 'who', 'focus', '_about']);

function stretch(v, f, key) {
  if (KEEP.has(key)) return v;
  if (typeof v === 'string') {
    const s = v.replace(/\[\[|\]\]/g, '');
    if (f <= 1 || !s) return v;
    const target = Math.round(s.length * f);
    let out = s;
    while (out.length < target) out += s;
    return out.slice(0, target);
  }
  if (Array.isArray(v)) return v.map((x) => stretch(x, f, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stretch(x, f, k)]));
  return v;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zukai-stress-'));
const here = __dirname;

// 1枚ずつ、倍率ごとに HTML を書き出す
function variants(dataPath) {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const list = [];
  if (data.slides && !data.diagram) {
    data.slides.forEach((slide, i) => {
      for (const f of FACTORS) {
        // handoff は真ん中に slop の縮小図を使うので、slop も一緒に入れておく
        const extra = slide.type === 'handoff' ? data.slides.filter((s) => s.type === 'slop') : [];
        const json = { ...data, slides: [stretch(slide, f), ...extra] };
        const dir = path.join(tmp, `${path.basename(dataPath, '.json')}-${i + 1}-${f}`);
        fs.writeFileSync(`${dir}.json`, JSON.stringify(json));
        execFileSync('node', [path.join(here, 'deck.js'), `${dir}.json`, '--out', dir, '--no-png'], { stdio: 'ignore' });
        const html = fs.readdirSync(path.join(dir, 'html')).sort()[0];
        list.push({ name: `${String(i + 1).padStart(2, '0')} ${slide.type}`, f, file: path.join(dir, 'html', html) });
      }
    });
  } else if (data.diagram) {
    for (const f of FACTORS) {
      const json = { ...data, diagram: stretch(data.diagram, f) };
      const dir = path.join(tmp, `${path.basename(dataPath, '.json')}-${f}`);
      fs.writeFileSync(`${dir}.json`, JSON.stringify(json));
      execFileSync('node', [path.join(here, 'build.js'), `${dir}.json`, '--out', dir, '--no-png'], { stdio: 'ignore' });
      list.push({ name: '図解（縦長4:3）', f, file: path.join(dir, 'html', 'zukai.html') });
    }
  }
  return list;
}

(async () => {
  const inputs = process.argv.slice(2).length
    ? process.argv.slice(2).map((p) => path.resolve(p))
    : [path.join(here, 'examples', 'workslop.json'), path.join(here, 'examples', 'ai_hanasu.json')];
  const jobs = inputs.flatMap(variants);
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const results = await checkFiles(jobs.map((j) => j.file), browser);
  await browser.close();

  // 崩れ（はみ出し・枠外・重なり）で上限を決め、行末の取り残しは別に数える
  const BREAK = new Set(['overflow', 'outside', 'overlap']);
  const byName = new Map();
  jobs.forEach((j, k) => {
    if (!byName.has(j.name)) byName.set(j.name, []);
    const issues = results[k].issues;
    byName.get(j.name).push({ f: j.f, broken: issues.filter((i) => BREAK.has(i.kind)), orphans: issues.filter((i) => i.kind === 'orphan') });
  });
  console.log('スライド                倍率ごとの結果                       崩れずに入る上限  取り残しが出た倍率  最初に崩れた箇所');
  for (const [name, runs] of byName) {
    const marks = runs.map((r) => `${r.f}:${r.broken.length ? '✕' : '○'}`).join(' ');
    const firstBad = runs.find((r) => r.broken.length);
    const okUntil = firstBad ? runs.filter((r) => r.f < firstBad.f).pop() : runs[runs.length - 1];
    const limit = okUntil ? `${okUntil.f}倍${firstBad ? '' : '以上'}` : '1倍で崩れる';
    const orphanAt = runs.filter((r) => r.orphans.length && !r.broken.length).map((r) => r.f).join(',') || 'なし';
    const where = firstBad ? `${firstBad.broken[0].kind} ${firstBad.broken[0].text}` : '';
    console.log(`${name.padEnd(22)} ${marks.padEnd(36)} ${limit.padEnd(14)} ${orphanAt.padEnd(16)} ${where}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
