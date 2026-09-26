#!/usr/bin/env node
/*
 * ナレーション台本の時間チェックと書き出し
 *
 *   npm run narration
 *
 * js/narration.js を読み込み、
 *   1. 各カットの拍数（モーラ）と読む速さ（拍/秒）を計算して表示する
 *   2. 速すぎるカット、前のカットと重なるカットを警告する
 *   3. dist/narration.srt を書き出す（編集ソフトや録音時の目安用）
 *   4. NARRATION.md の <!-- cues:start --> 〜 <!-- cues:end --> の表を作り直す
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DURATION = 60;
const FAST = 7.3;       // これを超えると早口に聞こえやすい（拍/秒）
const COMMA = 0.15;     // 読点での間（秒）
const PERIOD = 0.3;     // 文中の句点での間（秒）

const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/narration.js'), 'utf8'), ctx);
const cues = ctx.SV.NARRATION;

const SMALL = new Set(Array.from('ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ'));
function mora(read) {
  let n = 0;
  for (const ch of read) if (/[ぁ-ゖァ-ヺー]/.test(ch) && !SMALL.has(ch)) n++;
  return n;
}
function pauses(text) {
  const body = text.replace(/[。、…]+$/, '');
  return (body.match(/、/g) || []).length * COMMA + (body.match(/。/g) || []).length * PERIOD;
}
// 4.3 → "0:04.3"、17.65 → "0:17.65"
const fmt = s => {
  const m = Math.floor(s / 60);
  const [a, b] = (s - m * 60).toFixed(2).replace(/0$/, '').split('.');
  return `${m}:${a.padStart(2, '0')}.${b}`;
};
const srtTime = s => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

// 1〜2. 計算とチェック
let warn = 0, voiced = 0;
const rows = cues.map((c, i) => {
  const n = mora(c.read);
  const speak = c.end - c.start - (c.pause != null ? c.pause : pauses(c.text));
  const rate = n / speak;
  voiced += c.end - c.start;
  const issues = [];
  if (rate > FAST) issues.push(`速い（${rate.toFixed(1)}拍/秒）`);
  if (i > 0 && c.start < cues[i - 1].end + 0.1) issues.push('前のカットと近すぎる');
  if (c.end > DURATION) issues.push('60秒を超えている');
  if (c.end <= c.start) issues.push('終わりが始まりより前');
  warn += issues.length;
  return { i: i + 1, c, n, rate, issues };
});
for (const r of rows) {
  const flag = r.issues.length ? '  ! ' + r.issues.join('、') : '';
  console.log(`${String(r.i).padStart(2)}  ${fmt(r.c.start).padStart(7)}–${fmt(r.c.end).padEnd(7)} ${String(r.n).padStart(3)}拍 ${r.rate.toFixed(1)}拍/秒  ${r.c.text}${flag}`);
}
console.log(`\n${cues.length}カット、声が入るのは合計 ${voiced.toFixed(1)} 秒。警告 ${warn} 件`);

// 3. SRT
const srt = cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'narration.srt'), srt);
console.log('saved dist/narration.srt');

// 4. NARRATION.md の表
const mdPath = path.join(ROOT, 'NARRATION.md');
if (fs.existsSync(mdPath)) {
  const md = fs.readFileSync(mdPath, 'utf8');
  const esc = s => String(s || '').replace(/\|/g, '\\|');
  const table = [
    '| # | 時間 | ナレーション | 画面 | 拍 | 速さ | メモ |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(r => `| ${r.i} | ${fmt(r.c.start)}〜${fmt(r.c.end)} | ${esc(r.c.text)} | ${esc(r.c.screen)} | ${r.n} | ${r.rate.toFixed(1)} | ${esc(r.c.note)} |`)
  ].join('\n');
  const next = md.replace(/<!-- cues:start -->[\s\S]*?<!-- cues:end -->/, `<!-- cues:start -->\n${table}\n<!-- cues:end -->`);
  if (next !== md) {
    fs.writeFileSync(mdPath, next);
    console.log('updated NARRATION.md');
  }
}
if (warn) process.exitCode = 1;
