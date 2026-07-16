// 起動係: 間取りを読み込み → SSEで見張り役と接続 → 描画ループ開始
'use strict';
(async () => {
  await Layout.load();

  const canvas = document.getElementById('office');
  canvas.width = Layout.COLS * Layout.TILE;
  canvas.height = Layout.ROWS * Layout.TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // ドット絵をぼやけさせない

  World.spawnPresident();
  Panel.log('🏢 バーチャルオフィス起動。社長が着席しています');

  // 見張り役(SSE)と接続。本物のClaude Codeのできごとがここに流れてくる。
  try {
    const es = new EventSource('/events');
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data);
        if (Demo.running) return; // デモ再生中は本物のイベントを混ぜない
        Translate.handle(ev);
      } catch (e) { /* 壊れた行は無視 */ }
    };
    es.onerror = () => { /* 自動再接続に任せる */ };
  } catch (e) { /* file:// で開かれた場合など */ }

  // ニュース見出し（休憩室の雑談用）
  async function refreshNews() {
    try {
      const res = await fetch('/api/news');
      const j = await res.json();
      World.setNews(j.titles || []);
    } catch (e) { /* 取れなくても困らない */ }
  }
  refreshNews();
  setInterval(refreshNews, 30 * 60 * 1000);

  // ボタン
  document.getElementById('btn-demo').addEventListener('click', () => {
    if (Demo.running) Demo.stop(true);
    else Demo.play();
  });

  let showcase = null;
  document.getElementById('btn-showcase').addEventListener('click', (e) => {
    if (showcase) {
      clearInterval(showcase); showcase = null;
      e.target.classList.remove('on');
      Translate.handle({ type: 'session_end', demo: true });
      Panel.log('👁 観賞モード終了');
    } else {
      e.target.classList.add('on');
      Panel.log('👁 観賞モード開始（無人でも賑やかに動きます）');
      for (const emp of Roster.EMPLOYEES) if (emp.id !== 'president') World.arrive(emp.id, true);
      const tools = ['Read', 'Write', 'Bash', 'WebSearch', 'Edit', 'Grep'];
      const roles = ['secretary', 'editor', 'marketer', 'engineer', 'sales', 'researcher'];
      showcase = setInterval(() => {
        const role = roles[Math.floor(Math.random() * roles.length)];
        const tool = tools[Math.floor(Math.random() * tools.length)];
        Translate.handle({ type: 'tool_start', tool, role, demo: true });
      }, 7000);
    }
  });

  // 描画ループ
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(50, t - last);
    last = t;
    World.update(dt);
    World.draw(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
