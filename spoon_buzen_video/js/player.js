/*
 * SPOON豊前 紹介動画 — プレイヤー
 * 再生・シーク・消音・全画面・WebM書き出し・PNG保存。
 * render.js（MP4書き出し）はここで公開している SV.frameDataURL などを使います。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const D = SV.DURATION;
  const POSTER_T = 58.6;
  const $ = id => document.getElementById(id);

  const canvas = $('stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const btnPlay = $('btnPlay'), bigPlay = $('bigPlay'), seekEl = $('seek'), timeNow = $('timeNow');
  const btnMute = $('btnMute'), btnFull = $('btnFull'), btnRec = $('btnRec'), btnPng = $('btnPng');
  const statusEl = $('status'), chaptersEl = $('chapters'), stageWrap = $('stageWrap');

  let t = 0, playing = false, ready = false, recording = false;
  let clockStart = 0, tStart = 0;
  let actx = null, monitor = null, recDest = null, src = null, buffer = null, audioT0 = 0;
  let endWaiters = [];
  let muted = false;
  try { muted = localStorage.getItem('spoon-video-muted') === '1'; } catch (e) { /* 保存できない環境では毎回音あり */ }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = s => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60);
    const r = s - m * 60;
    return m + ':' + r.toFixed(1).padStart(4, '0');
  };
  const fmtShort = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function draw(tt) { SV.render(ctx, tt); }
  function setStatus(msg) { statusEl.textContent = msg; }

  function currentTime() {
    if (!playing) return t;
    if (src && actx) return tStart + Math.max(0, actx.currentTime - audioT0);
    return tStart + (performance.now() - clockStart) / 1000;
  }

  /* ---------- 音 ---------- */
  function ensureAudio() {
    if (actx || !buffer) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    monitor = actx.createGain();
    monitor.gain.value = muted ? 0 : 1;
    monitor.connect(actx.destination);
  }
  function startSource(at) {
    if (!buffer || !actx) return;
    src = actx.createBufferSource();
    src.buffer = buffer;
    src.connect(monitor);
    if (recDest) src.connect(recDest);
    audioT0 = actx.currentTime + 0.05;
    tStart = at;
    src.start(audioT0, Math.min(at, buffer.duration - 0.01));
  }
  function stopSource() {
    if (!src) return;
    try { src.stop(); } catch (e) { /* 停止済み */ }
    src.disconnect();
    src = null;
  }

  /* ---------- 再生制御 ---------- */
  function play() {
    if (!ready || playing) return Promise.resolve();
    if (t >= D - 0.02) t = 0;
    bigPlay.hidden = true;
    playing = true;
    tStart = t;
    clockStart = performance.now();
    let p = Promise.resolve();
    if (buffer) {
      ensureAudio();
      if (actx) {
        p = actx.resume().catch(() => {}).then(() => { if (playing) startSource(t); });
      }
    }
    updateUI();
    requestAnimationFrame(loop);
    return p;
  }
  function pause() {
    if (!playing) return;
    t = currentTime();
    playing = false;
    stopSource();
    draw(t);
    updateUI();
  }
  function seek(v) {
    const was = playing;
    if (was) pause();
    t = clamp(v, 0, D);
    bigPlay.hidden = true;
    draw(t);
    updateUI();
    if (was) play();
  }
  function loop() {
    if (!playing) return;
    t = currentTime();
    if (t >= D) {
      t = D;
      playing = false;
      stopSource();
      draw(D);
      updateUI();
      const w = endWaiters;
      endWaiters = [];
      w.forEach(fn => fn());
      return;
    }
    draw(t);
    updateUI();
    requestAnimationFrame(loop);
  }

  /* ---------- 表示 ---------- */
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.2v15H6zM13.8 4.5H18v15h-4.2z"/></svg>';
  const ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4.5v15L8 15H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4.5v15L8 15H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  let lastPlaying = null, lastChapter = -1;

  function updateUI() {
    if (lastPlaying !== playing) {
      btnPlay.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      btnPlay.setAttribute('aria-label', playing ? '一時停止' : '再生');
      lastPlaying = playing;
    }
    seekEl.value = t.toFixed(2);
    seekEl.style.setProperty('--p', (t / D) * 100 + '%');
    timeNow.textContent = fmt(t);
    let ci = 0;
    SV.CHAPTERS.forEach((c, i) => { if (t >= c.t - 0.001) ci = i; });
    if (ci !== lastChapter) {
      chaptersEl.querySelectorAll('button').forEach((b, i) => b.classList.toggle('is-current', i === ci));
      lastChapter = ci;
    }
  }
  function updateMute() {
    btnMute.innerHTML = muted ? ICON_MUTED : ICON_SOUND;
    btnMute.setAttribute('aria-pressed', String(muted));
    btnMute.setAttribute('aria-label', muted ? '音を出す' : '音を消す');
    if (monitor) monitor.gain.value = muted ? 0 : 1;
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('spoon-video-muted', muted ? '1' : '0'); } catch (e) { /* 保存できなくても動作は続ける */ }
    updateMute();
  }
  function toggleFull() {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (stageWrap.requestFullscreen) stageWrap.requestFullscreen().catch(() => setStatus('このブラウザでは全画面にできませんでした。'));
  }
  function lockUI(on) {
    [btnPlay, seekEl, btnRec, btnPng, btnMute].forEach(el => { el.disabled = on; });
    chaptersEl.querySelectorAll('button').forEach(b => { b.disabled = on; });
  }
  function buildChapters() {
    chaptersEl.innerHTML = '';
    SV.CHAPTERS.forEach(c => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="tc">${fmtShort(c.t)}</span><span class="ttl"></span>`;
      b.querySelector('.ttl').textContent = c.title;
      b.addEventListener('click', () => seek(c.t + 0.001));
      li.appendChild(b);
      chaptersEl.appendChild(li);
    });
  }

  /* ---------- 書き出し ---------- */
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function savePng() {
    draw(t);
    canvas.toBlob(b => {
      if (!b) { setStatus('PNGを作れませんでした。'); return; }
      download(b, `spoon-buzen-${t.toFixed(1)}s.png`);
      setStatus(`${fmt(t)} の画面をPNGで保存しました。`);
    }, 'image/png');
  }
  async function recordWebM() {
    if (recording || !ready) return;
    if (!window.MediaRecorder || !canvas.captureStream) {
      setStatus('このブラウザは動画の記録に対応していません。MP4は render.js で書き出せます。');
      return;
    }
    pause();
    t = 0;
    draw(0);
    const stream = canvas.captureStream(60);
    if (buffer) {
      ensureAudio();
      if (actx && !recDest) recDest = actx.createMediaStreamDestination();
      if (recDest) recDest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    }
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mime = types.find(m => MediaRecorder.isTypeSupported(m)) || '';
    let rec;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 16000000 } : undefined);
    } catch (e) {
      setStatus('記録を始められませんでした（' + e.message + '）。');
      return;
    }
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    const ended = new Promise(r => { endWaiters.push(r); });
    recording = true;
    document.body.classList.add('is-recording');
    lockUI(true);
    setStatus('記録しています。終わるまでこのタブを前面に出したままにしてください。');
    rec.start(500);
    await play();
    await ended;
    await new Promise(r => setTimeout(r, 300));
    rec.stop();
    await stopped;
    stream.getVideoTracks().forEach(tr => tr.stop());
    recording = false;
    document.body.classList.remove('is-recording');
    lockUI(false);
    const blob = new Blob(chunks, { type: 'video/webm' });
    download(blob, 'spoon-buzen-60s.webm');
    setStatus(`WebMを書き出しました（${(blob.size / 1048576).toFixed(1)}MB）。`);
  }

  /* ---------- 操作 ---------- */
  btnPlay.addEventListener('click', () => (playing ? pause() : play()));
  bigPlay.addEventListener('click', () => { t = 0; play(); });
  canvas.addEventListener('click', () => { if (!recording && ready) (playing ? pause() : play()); });
  seekEl.addEventListener('input', () => seek(parseFloat(seekEl.value)));
  btnMute.addEventListener('click', toggleMute);
  btnFull.addEventListener('click', toggleFull);
  btnRec.addEventListener('click', recordWebM);
  btnPng.addEventListener('click', savePng);
  document.addEventListener('keydown', e => {
    if (recording || !ready || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    if (e.key === ' ' || e.key === 'k') {
      if (tag === 'BUTTON') return;
      e.preventDefault();
      playing ? pause() : play();
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(t - (e.shiftKey ? 5 : 1)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(t + (e.shiftKey ? 5 : 1)); }
    else if (e.key === ',') seek(t - 1 / 30);
    else if (e.key === '.') seek(t + 1 / 30);
    else if (e.key === 'm' || e.key === 'M') toggleMute();
    else if (e.key === 'f' || e.key === 'F') toggleFull();
    else if (e.key === 'Home') seek(0);
  });

  /* ---------- 起動 ---------- */
  function collectText() {
    const parts = [];
    const walk = v => {
      if (typeof v === 'string') parts.push(v);
      else if (typeof v === 'number') parts.push(String(v));
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(SV.COPY);
    parts.push('0123456789:〜SPOON豊前P');
    return Array.from(new Set(parts.join('').replace(/[{}[\]]/g, ''))).join('');
  }
  async function init() {
    buildChapters();
    updateMute();
    updateUI();
    try {
      if (document.fonts && document.fonts.load) {
        const sample = collectText();
        const specs = ['head', 'headM', 'text', 'textR', 'num', 'numB'].map(k => SV.F[k](64));
        await Promise.race([
          Promise.all(specs.map(s => document.fonts.load(s, sample).catch(() => []))),
          new Promise(r => setTimeout(r, 10000))
        ]);
        await document.fonts.ready;
      }
    } catch (e) { /* フォントが読めなくても代替フォントで続ける */ }
    SV.resetMeasure();
    ready = true;
    const q = new URLSearchParams(location.search);
    const start = parseFloat(q.get('t'));
    if (!isNaN(start)) { t = clamp(start, 0, D); bigPlay.hidden = true; draw(t); }
    else draw(POSTER_T);
    bigPlay.disabled = false;
    btnPlay.disabled = false;
    updateUI();
    setStatus('音を準備しています…');
    try {
      buffer = await SV.renderSoundtrack();
      setStatus('');
      if (playing && !src) {
        const now = currentTime();
        ensureAudio();
        if (actx) { actx.resume().catch(() => {}); startSource(now); }
      }
    } catch (e) {
      setStatus('音を作れなかったため、無音で再生します。');
    }
  }

  /* render.js から使う窓口 */
  SV.isReady = () => ready;
  SV.renderAt = tt => draw(tt);
  SV.frameDataURL = (tt, type, quality) => { draw(tt); return canvas.toDataURL(type || 'image/png', quality).split(',')[1]; };
  SV.exportWavBase64 = async () => SV.wavBase64(await SV.renderSoundtrack());
  SV.loadedFamilies = () => (document.fonts ? Array.from(new Set(Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))) : []);

  init();
})();
