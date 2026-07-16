#!/usr/bin/env node
// 記録係: Claude Code の hooks から標準入力(JSON)で届く合図を受け取り、
// data/events.jsonl に「要約を1行」書き足す。
// 3つの掟:
//   ① パスワード・APIキーらしき文字は記録前に伏せ字(***)にする
//   ② 記録は要約だけ（できごとの種類・ツール名・対象）。作業の全文は残さない
//   ③ 何が起きても必ず正常終了(exit 0)し、Claude Code 本体を絶対に止めない
'use strict';

function redact(s) {
  if (!s) return s;
  return String(s)
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '***')
    .replace(/(gh[pousr]|xox[baprs]|AKIA|ASIA)[A-Za-z0-9_-]{8,}/g, '***')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_.-]{10,}/g, '***')
    .replace(/((?:api[_-]?key|token|password|passwd|secret|authorization|bearer)["'\s]*[=:]\s*)\S+/gi, '$1***');
}

function trunc(s, n) {
  s = redact(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function target(input) {
  if (!input) return '';
  if (input.file_path) return input.file_path.split(/[\\/]/).pop();
  if (input.command) return trunc(input.command, 40);
  if (input.query) return trunc(input.query, 40);
  if (input.url) { try { return new URL(input.url).hostname; } catch (e) { return trunc(input.url, 40); } }
  if (input.pattern) return trunc(input.pattern, 40);
  return '';
}

try {
  let raw = '';
  process.stdin.on('data', (d) => { raw += d; });
  process.stdin.on('end', () => {
    try {
      const p = JSON.parse(raw || '{}');
      const hook = p.hook_event_name || '';
      let ev = null;
      switch (hook) {
        case 'SessionStart':
          ev = { type: 'session_start' };
          break;
        case 'UserPromptSubmit':
          ev = { type: 'prompt', detail: trunc(p.prompt, 60) };
          break;
        case 'PreToolUse': {
          const tool = p.tool_name || '';
          if (tool === 'Task' || tool === 'Agent') {
            const ti = p.tool_input || {};
            ev = { type: 'tool_start', tool: 'Task', detail: ti.subagent_type || 'general-purpose', extra: trunc(ti.description || ti.prompt, 50) };
          } else {
            ev = { type: 'tool_start', tool, detail: target(p.tool_input) };
          }
          break;
        }
        case 'PostToolUse': {
          const resp = p.tool_response;
          const failed = !!(resp && (resp.is_error === true || resp.success === false));
          if (failed) ev = { type: 'error', tool: p.tool_name || '', detail: 'エラー発生' };
          break; // 成功の tool_end は記録しない（メモを軽く保つ）
        }
        case 'Notification':
          ev = { type: 'approval', detail: trunc(p.message, 60) };
          break;
        case 'Stop':
          ev = { type: 'stop' };
          break;
        case 'SubagentStop':
          ev = { type: 'subagent_stop' };
          break;
        case 'SessionEnd':
          ev = { type: 'session_end' };
          break;
        default:
          ev = null;
      }
      if (ev) {
        ev.ts = Date.now();
        ev.actor = 'main';
        ev.session = String(p.session_id || '').slice(0, 8);
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, '..', 'data');
        // 各フィールドは組み立て時に redact 済み。JSON全体に再適用すると行が壊れるのでしない。
        fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(path.join(dir, 'events.jsonl'), JSON.stringify(ev) + '\n');
      }
    } catch (e) { /* 掟③ */ }
    process.exit(0);
  });
  // stdinが来ないケースの保険
  setTimeout(() => process.exit(0), 3000).unref();
} catch (e) {
  process.exit(0);
}
