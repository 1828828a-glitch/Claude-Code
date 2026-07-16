// サイドパネル: 「出社中の社員」一覧と「社内の動き」ティッカー（最新10件）
'use strict';
window.Panel = (() => {
  const logs = [];

  function log(text) {
    const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    logs.unshift({ time, text });
    if (logs.length > 10) logs.pop();
    renderTicker();
  }

  function renderTicker() {
    const el = document.getElementById('ticker');
    if (!el) return;
    el.innerHTML = logs
      .map((l) => `<li><span class="time">${l.time}</span>${escapeHtml(l.text)}</li>`)
      .join('');
  }

  function renderAttendance() {
    const el = document.getElementById('attendance');
    if (!el) return;
    const list = World.attendance();
    el.innerHTML = list.length
      ? list.map((a) => `<li><b>${escapeHtml(a.name)}</b><span class="dept">${escapeHtml(a.dept)}</span><span class="state">${a.emoji || ''} ${escapeHtml(a.state)}</span></li>`).join('')
      : '<li class="empty">まだ誰も出社していません</li>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  setInterval(renderAttendance, 1000);
  return { log };
})();
