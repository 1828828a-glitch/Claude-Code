// 世界の係: 社員キャラの出社・移動・仕事・会議・休憩・退社を管理する。
'use strict';
window.World = (() => {
  const SPEED = 2.3; // px/frame相当（dt補正あり）
  const agents = new Map(); // rosterId -> agent
  let meeting = null;
  let lastMeetingEnd = -Infinity; // 起動直後でも最初の会議は開けるように
  let nextAmbientAt = 0;
  let nextChorei = 0;
  let newsTitles = [];
  const recentWork = []; // 雑談ネタ（最近の作業）

  function now() { return performance.now(); }

  function mkAgent(r) {
    return {
      id: r.id, name: r.name, dept: r.dept, seat: r.seat,
      body: r.body, hair: r.hair, temp: !!r.temp,
      pos: Layout.center(Layout.data.spots.entrance),
      path: [], after: null,
      state: 'off', emoji: '', bubble: null,
      stateUntil: 0, present: false, demo: false,
      animT: Math.random() * 100,
    };
  }

  function ensure(id, demo) {
    const r = Roster.byId(id);
    if (!r) return null;
    let a = agents.get(id);
    if (!a) { a = mkAgent(r); agents.set(id, a); }
    if (!a.present) {
      a.present = true;
      a.demo = !!demo;
      a.pos = Layout.center(Layout.data.spots.entrance);
      a.emoji = '';
      walkTo(a, a.seat, () => { a.state = 'idle'; });
    }
    return a;
  }

  function walkTo(a, tile, after) {
    a.path = Layout.findPath(Layout.tileOf(a.pos), tile);
    a.after = after || null;
    if (a.path.length) { a.state = 'walk'; a.emoji = ''; }
    else { if (a.after) { const f = a.after; a.after = null; f(); } }
  }

  function say(a, text, dur) {
    a.bubble = { text, until: now() + (dur || 4200) };
  }

  function backToSeat(a) {
    walkTo(a, a.seat, () => { a.state = 'idle'; a.emoji = ''; });
  }

  // ---- 業務アクション ----
  function spawnPresident() {
    const a = ensure('president');
    a.pos = Layout.center(a.seat);
    a.path = []; a.state = 'idle';
  }

  function arrive(id, demo) { return ensure(id, demo); }

  function work(id, kind, emoji, detail, demo) {
    const a = ensure(id, demo);
    if (!a) return;
    recentWork.push(detail ? `${a.name.split(' ')[0]}が「${detail}」を担当` : `${a.name}が作業中`);
    if (recentWork.length > 12) recentWork.shift();
    const start = () => {
      a.state = kind; // work | read | search | exec
      a.emoji = emoji;
      a.stateUntil = now() + 25000;
      if (detail) say(a, detail);
    };
    const seatTile = Layout.tileOf(a.pos);
    if (seatTile[0] === a.seat[0] && seatTile[1] === a.seat[1] && a.state !== 'walk') start();
    else walkTo(a, a.seat, start);
  }

  function error(id, detail, demo) {
    const a = ensure(id, demo);
    if (!a) return;
    a.state = 'sweat'; a.emoji = '💦';
    a.stateUntil = now() + 5000;
    say(a, detail || 'エラー…！');
  }

  function approval(id, detail, demo) {
    const a = ensure(id, demo);
    if (!a) return;
    walkTo(a, Layout.data.spots.bow, () => {
      a.state = 'bow'; a.emoji = '🙇';
      a.stateUntil = now() + 15000;
      say(a, detail || 'ご確認をお願いします');
      const p = agents.get('president');
      if (p) setTimeout(() => say(p, '確認するね'), 1200);
    });
  }

  function presidentSays(text) {
    const p = agents.get('president');
    if (p) { say(p, text, 5000); p.emoji = '📣'; p.stateUntil = now() + 5000; p.state = p.state === 'idle' ? 'idle' : p.state; }
    const s = agents.get('secretary');
    if (s && s.present) { s.emoji = '📥'; s.stateUntil = now() + 4000; }
  }

  function meetingStart(ids, lines, dur) {
    const t = now();
    if (meeting) return;
    if (t < lastMeetingEnd + 90000) { // 開きすぎ防止
      for (const id of ids) { const a = agents.get(id); if (a && a.present) { a.emoji = '🤝'; a.stateUntil = t + 4000; } }
      return;
    }
    const spots = Layout.data.spots.meetingSpots;
    const parts = [];
    ids.forEach((id, i) => {
      const a = ensure(id);
      if (!a) return;
      parts.push(a);
      walkTo(a, spots[i % spots.length], () => { a.state = 'meeting'; a.emoji = '💬'; });
    });
    if (!parts.length) return;
    meeting = { parts, lines: lines || [], idx: 0, nextLineAt: t + 2500, endAt: t + (dur || 16000) };
  }

  function reportAndLeave(id) {
    const a = agents.get(id);
    if (!a || !a.present) return;
    walkTo(a, Layout.data.spots.bow, () => {
      a.state = 'bow'; a.emoji = '✅';
      say(a, '完了しました！');
      setTimeout(() => {
        walkTo(a, Layout.data.spots.entrance, () => { a.present = false; a.state = 'off'; });
      }, 2500);
    });
  }

  function takeBreak(id) {
    const a = agents.get(id);
    if (!a || !a.present || a.state === 'walk') return;
    const spots = Layout.data.spots.breakSpots;
    const spot = spots[Math.floor(Math.random() * spots.length)];
    walkTo(a, spot, () => { a.state = 'break'; a.emoji = '☕'; a.stateUntil = now() + 30000; });
  }

  function leaveAll(includeSecretary) {
    for (const a of agents.values()) {
      if (!a.present || a.id === 'president') continue;
      if (!includeSecretary && a.id === 'secretary') { backToSeat(a); continue; }
      a.emoji = '🏠';
      walkTo(a, Layout.data.spots.entrance, () => { a.present = false; a.state = 'off'; });
    }
    meeting = null;
  }

  // ---- 自動イベント & 雑談 ----
  function topics() {
    const list = [...recentWork];
    for (const n of newsTitles.slice(0, 3)) list.push(`ニュース見た？「${n}」`);
    list.push('コーヒーおいしい…', '休憩は大事だよね', '次の締切いつだっけ？', '社長、今日は機嫌いいね');
    return list;
  }

  function ambient(t) {
    if (t < nextAmbientAt) return;
    nextAmbientAt = t + 20000 + Math.random() * 30000;
    const present = [...agents.values()].filter((a) => a.present && a.id !== 'president' && (a.state === 'idle' || a.state === 'break'));
    if (!present.length) return;
    const a = present[Math.floor(Math.random() * present.length)];
    const roll = Math.random();
    if (roll < 0.35) takeBreak(a.id);
    else if (roll < 0.55) { a.emoji = '🙆'; a.stateUntil = t + 3000; } // 伸び
    else if (a.state === 'break') say(a, topics()[Math.floor(Math.random() * topics().length)]);
    else backToSeat(a);

    // 休憩室に2人以上いたら雑談
    const chatting = [...agents.values()].filter((x) => x.present && x.state === 'break');
    if (chatting.length >= 2 && Math.random() < 0.8) {
      const tp = topics();
      chatting.slice(0, 2).forEach((x, i) => {
        setTimeout(() => say(x, tp[Math.floor(Math.random() * tp.length)]), i * 2500);
      });
    }
  }

  function chorei(t) {
    if (t < nextChorei) return;
    nextChorei = t + 240000 + Math.random() * 120000;
    const present = [...agents.values()].filter((a) => a.present && a.id !== 'president');
    if (present.length >= 3 && !meeting) {
      meetingStart(present.map((a) => a.id), ['朝礼を始めます！', '本日もよろしくお願いします', '目標を共有しましょう', '以上、解散！'], 13000);
    }
  }

  // ---- 更新 & 描画 ----
  function update(dt) {
    const t = now();
    for (const a of agents.values()) {
      if (!a.present && a.state === 'off') continue;
      if (a.state === 'walk') {
        if (!a.path.length) {
          a.state = 'idle';
          if (a.after) { const f = a.after; a.after = null; f(); }
        } else {
          const target = Layout.center(a.path[0]);
          const dx = target.x - a.pos.x, dy = target.y - a.pos.y;
          const dist = Math.hypot(dx, dy);
          const step = SPEED * (dt / 16.7);
          if (dist <= step) { a.pos = target; a.path.shift(); }
          else { a.pos.x += (dx / dist) * step; a.pos.y += (dy / dist) * step; }
        }
      } else if (a.stateUntil && t > a.stateUntil && a.state !== 'idle' && a.state !== 'meeting') {
        a.stateUntil = 0;
        if (a.id === 'president') { a.state = 'idle'; a.emoji = ''; }
        else if (a.state === 'break' || a.state === 'bow' || a.state === 'sweat') backToSeat(a);
        else { a.state = 'idle'; a.emoji = ''; }
      }
    }

    if (meeting) {
      if (t >= meeting.endAt) {
        for (const a of meeting.parts) if (a.present) backToSeat(a);
        lastMeetingEnd = t;
        meeting = null;
      } else if (meeting.lines.length && t >= meeting.nextLineAt) {
        const speaker = meeting.parts[meeting.idx % meeting.parts.length];
        if (speaker && speaker.present && speaker.state === 'meeting') {
          say(speaker, meeting.lines[meeting.idx % meeting.lines.length], 2400);
        }
        meeting.idx++;
        meeting.nextLineAt = t + 2600;
      }
    }

    ambient(t);
    chorei(t);
  }

  function draw(ctx) {
    const t = now();
    Sprites.drawBackground(ctx);
    const visible = [...agents.values()].filter((a) => a.present || a.state === 'walk');
    visible.sort((x, y) => x.pos.y - y.pos.y);
    for (const a of visible) Sprites.drawAgent(ctx, a, t);
    for (const a of visible) Sprites.drawBubble(ctx, a, t);
  }

  function attendance() {
    const stateLabel = {
      idle: '待機中', walk: '移動中', work: 'コーディング中', read: '資料読み中',
      search: '調査中', exec: '作業中', meeting: '会議中', break: '休憩中',
      bow: '承認待ち', sweat: 'トラブル対応中',
    };
    return [...agents.values()]
      .filter((a) => a.present)
      .map((a) => ({ name: a.name, dept: a.dept, state: stateLabel[a.state] || a.state, emoji: a.emoji }));
  }

  function setNews(titles) { newsTitles = titles || []; }

  return {
    spawnPresident, arrive, work, error, approval, presidentSays,
    meetingStart, reportAndLeave, takeBreak, leaveAll,
    update, draw, attendance, setNews, ensure,
    get agents() { return agents; },
  };
})();
