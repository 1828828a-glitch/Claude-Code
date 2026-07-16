// 翻訳の係: 届いた「できごと」を社員の動きに変換する。
// どのできごとがどの動きになるかは TOOL_MAP と handle() を書き換えれば変えられる。
'use strict';
window.Translate = (() => {
  const activeSubs = []; // 出社中のサブエージェント（rosterId、新しい順）
  let rr = 0;

  // AIのこの動き → 社員のこの見た目
  const TOOL_MAP = {
    Read: ['read', '📖', '資料を読んでいます'],
    Grep: ['read', '🔎', 'ファイルを探しています'],
    Glob: ['read', '🔎', 'ファイルを探しています'],
    Write: ['work', '💻', 'コードを書いています'],
    Edit: ['work', '💻', 'コードを修正しています'],
    MultiEdit: ['work', '💻', 'コードを修正しています'],
    NotebookEdit: ['work', '💻', 'ノートを編集しています'],
    Bash: ['exec', '🔧', 'コマンドを実行中'],
    WebSearch: ['search', '🔍', 'ネットで調べもの中'],
    WebFetch: ['search', '🔍', 'ネットで調べもの中'],
  };

  // ツールのできごとを誰の動きにするか（サブエージェントがいれば持ち回りで割り当てる）
  function pickActor(ev) {
    if (ev.role) return ev.role;
    if (!activeSubs.length) return 'secretary';
    rr = (rr + 1) % (activeSubs.length + 1);
    return rr === 0 ? 'secretary' : activeSubs[rr - 1];
  }

  function nameOf(id) {
    const r = Roster.byId(id);
    return r ? r.name : id;
  }

  function handle(ev) {
    const demo = !!ev.demo;
    switch (ev.type) {
      case 'session_start': {
        World.arrive('secretary', demo);
        Panel.log('🏢 秘書 つむぎが出社しました');
        break;
      }
      case 'prompt': {
        World.arrive('secretary', demo);
        World.presidentSays(ev.detail || '新しい指示です！');
        Panel.log(`📣 社長の指示: ${ev.detail || ''}`);
        break;
      }
      case 'tool_start': {
        if (ev.tool === 'Task') {
          const id = Roster.forSubagent(ev.detail || 'general-purpose');
          World.arrive(id, demo);
          if (!activeSubs.includes(id)) activeSubs.unshift(id);
          World.meetingStart(['secretary', id], [
            'キックオフ会議を始めます',
            `担当は${nameOf(id)}さんです`,
            ev.extra ? `内容:「${ev.extra}」` : 'よろしくお願いします！',
            '進めましょう！',
          ]);
          Panel.log(`🤝 ${nameOf(id)}を呼びました（${ev.extra || ev.detail || ''}）`);
        } else {
          const m = TOOL_MAP[ev.tool] || ['exec', '⚙️', '作業中'];
          const actor = pickActor(ev);
          World.work(actor, m[0], m[1], ev.detail || m[2], demo);
          Panel.log(`${m[1]} ${nameOf(actor)}: ${ev.tool}${ev.detail ? ' → ' + ev.detail : ''}`);
        }
        break;
      }
      case 'error': {
        const actor = pickActor(ev);
        World.error(actor, ev.detail, demo);
        Panel.log(`💦 ${nameOf(actor)}: エラーが出ました…`);
        break;
      }
      case 'approval': {
        World.approval('secretary', ev.detail, demo);
        Panel.log(`🙇 秘書 つむぎが社長の承認を待っています`);
        break;
      }
      case 'stop': {
        World.takeBreak('secretary');
        Panel.log('☕ ひと区切り。秘書 つむぎは休憩室へ');
        break;
      }
      case 'subagent_stop': {
        const id = activeSubs.shift();
        if (id) {
          World.reportAndLeave(id);
          Panel.log(`✅ ${nameOf(id)}が仕事を終えて報告しました`);
        }
        break;
      }
      case 'session_end': {
        World.leaveAll(true);
        activeSubs.length = 0;
        Panel.log('🏠 業務終了。みんな帰宅しました');
        break;
      }
      default:
        break;
    }
  }

  return { handle };
})();
