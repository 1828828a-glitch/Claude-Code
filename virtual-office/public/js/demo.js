// デモモード: 本物のできごとと同じ形のニセのできごとを、
// 時間差で本物と同じ処理(Translate.handle)に流し込む台本。約100秒。
// 「わざと1回エラーを出す」のがミソ。順調すぎる動きは嘘くさい。
'use strict';
window.Demo = (() => {
  let timers = [];
  let running = false;

  const SCRIPT = [
    [0,      { type: 'session_start' }],
    [2500,   { type: 'prompt', detail: '新商品のLPを作ってください！' }],
    [7000,   { type: 'tool_start', tool: 'Task', detail: 'ai-researcher', extra: '競合LPの調査' }],
    [12000,  { type: 'tool_start', tool: 'Task', detail: 'ai-editor', extra: 'コピーの構成づくり' }],
    [16000,  { type: 'tool_start', tool: 'Task', detail: 'ai-engineer', extra: 'LPの実装' }],
    [30000,  { type: 'tool_start', tool: 'WebSearch', detail: '競合LPを調査中', role: 'researcher' }],
    [35000,  { type: 'tool_start', tool: 'Read', detail: '過去記事を読み込み中', role: 'editor' }],
    [40000,  { type: 'tool_start', tool: 'Write', detail: 'lp/index.html', role: 'engineer' }],
    [48000,  { type: 'error', detail: 'ビルドエラー！', role: 'engineer' }],
    [54000,  { type: 'tool_start', tool: 'Edit', detail: '修正しています…', role: 'engineer' }],
    [62000,  { type: 'approval', detail: 'デザイン案のご確認をお願いします' }],
    [70000,  { type: 'prompt', detail: 'OK！これで進めよう' }],
    [76000,  { type: 'subagent_stop' }],
    [81000,  { type: 'subagent_stop' }],
    [86000,  { type: 'subagent_stop' }],
    [98000,  { type: 'session_end' }],
  ];

  function play() {
    if (running) return;
    running = true;
    Panel.log('▶ デモ再生を開始（約100秒）');
    for (const [at, ev] of SCRIPT) {
      timers.push(setTimeout(() => {
        Translate.handle({ ...ev, demo: true });
        if (ev.type === 'session_end') stop(false);
      }, at));
    }
  }

  function stop(interrupt) {
    for (const t of timers) clearTimeout(t);
    timers = [];
    running = false;
    if (interrupt) {
      Translate.handle({ type: 'session_end', demo: true }); // デモのキャラを片付ける
      Panel.log('⏹ デモを停止しました');
    }
  }

  return { play, stop, get running() { return running; } };
})();
