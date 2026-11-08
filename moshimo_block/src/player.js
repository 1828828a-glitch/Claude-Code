/* player.js — 時刻 t を渡すと1コマ描く。ブラウザ再生と動画書き出しの両方がこれを使う */
const RENDER = !!window.__RENDER_MODE;
const $ = (id) => document.getElementById(id);
const fmt = (t) => { const s = Math.max(0, Math.floor(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

async function fontsReady() {
  const wait = Promise.all([
    document.fonts.load('400 32px "DotGothic16"'),
    document.fonts.load('400 16px "Zen Kaku Gothic New"'),
  ]).then(() => document.fonts.ready);
  await Promise.race([wait.catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
}
function captionBlips(items) {
  const out = [];
  items.filter((i) => i.type === 'caption').forEach((it) => it.lines.forEach((ln) => {
    if (ln.at == null) return;
    const n = Array.from(ln.text).length, cps = ln.cps || 14;
    for (let k = 0; k < n; k += 2) out.push(...AUDIO.SFX.blip(ln.at + k / cps));
  }));
  return out;
}

async function start() {
  if (RENDER) document.documentElement.classList.add('render');
  EPISODES.sort((a, b) => a.no - b.no);
  await fontsReady();
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: $('gl'), antialias: true, preserveDrawingBuffer: RENDER });
  } catch (e) {
    $('nogl').hidden = false;
    $('start').hidden = true;
    return;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.BasicShadowMap;
  renderer.setPixelRatio(1);
  renderer.setSize(STAGE_W, STAGE_H, false);
  const camera = new T.PerspectiveCamera(36, STAGE_W / STAGE_H, 0.1, 220);

  /* 回ごとに組み立てた結果をとっておく */
  const cache = {};
  let cur = null;
  function load(ep) {
    if (!cache[ep.id]) {
      const built = ep.build();
      cache[ep.id] = { ep, built, events: built.audio.concat(captionBlips(built.overlay)), warmed: false };
    }
    cur = cache[ep.id];
    cur.overlay = new Overlay($('overlay'), cur.built.overlay);
    cur.wipe = new Wipe($('wipe'), cur.built.cuts);
    if (!cur.warmed) { cur.built.scenes.forEach((s) => frame(s.start + 0.01)); cur.warmed = true; } // シェーダーを先に用意
    return cur;
  }
  function frame(t) {
    const D = cur.ep.duration;
    t = clamp(t, 0, D - 1e-3);
    const list = cur.built.scenes;
    const sc = list.find((s) => t >= s.start && t < s.end) || list[list.length - 1];
    const lt = t - sc.start;
    sc.update(lt, t);
    const c = sc.cam(lt, t);
    camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
    if (sc.shake) {
      const k = sc.shake(lt);
      camera.position.x += Math.sin(t * 53) * k;
      camera.position.y += Math.cos(t * 61) * k;
    }
    camera.fov = c.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(c.target[0], c.target[1], c.target[2]);
    sc.scene.updateMatrixWorld(true);
    renderer.render(sc.scene, camera);
    cur.overlay.update(t, { camera, sceneId: sc.id });
    cur.wipe.draw(t);
  }
  const byId = (id) => EPISODES.find((e) => e.id === id);

  if (RENDER) {
    load(byId(window.__RENDER_EP) || EPISODES[0]);
    window.__duration = cur.ep.duration;
    window.__seek = (t) => { frame(t); };
    window.__renderAudio = () => AUDIO.renderAudioWav(cur.events, cur.ep.duration);
    window.__ready = true;
    return;
  }

  /* ---------- 画面の操作 ---------- */
  const box = $('stageBox'), stage = $('stage'), seek = $('seek'), timeEl = $('time');
  const playBtn = $('playBtn'), soundBtn = $('soundBtn'), startBtn = $('start');
  const st = { t: 0, playing: false, sound: true, ctx: null, master: null, session: null, from: 0, perf0: 0 };
  let chapBtns = [];

  const tabs = $('episodes');
  EPISODES.forEach((ep) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ep-tab'; b.id = 'tab-' + ep.id;
    b.innerHTML = '<b></b><span></span>';
    b.firstChild.textContent = '#' + String(ep.no).padStart(2, '0');
    b.lastChild.textContent = ep.short || ep.title;
    b.addEventListener('click', () => { if (cur.ep !== ep) { location.hash = ep.id; } });
    tabs.appendChild(b);
  });

  function showEpisode(ep) {
    pause();
    load(ep);
    const D = ep.duration;
    seek.max = String(D);
    [...tabs.children].forEach((b) => b.setAttribute('aria-current', String(b.id === 'tab-' + ep.id)));
    $('epNo').textContent = '#' + String(ep.no).padStart(2, '0');
    $('epTitle').textContent = ep.title;
    $('epLead').textContent = ep.lead;
    const credit = $('epCredit');
    credit.hidden = !ep.credit;
    if (ep.credit) {
      credit.firstChild.textContent = ep.credit.text;
      credit.lastChild.textContent = ep.credit.label;
      credit.lastChild.href = ep.credit.href;
    }
    const chapList = $('chapters');
    chapList.textContent = '';
    ep.chapters.forEach((ch, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chapter'; b.id = `chapter-${ep.id}-${i}`;
      b.innerHTML = '<span class="ch-time"></span><span class="ch-name"></span>';
      b.firstChild.textContent = fmt(ch.t);
      b.lastChild.textContent = ch.name;
      b.addEventListener('click', () => { goTo(ch.t); if (!st.playing) play(); });
      li.appendChild(b); chapList.appendChild(li);
    });
    chapBtns = [...chapList.querySelectorAll('.chapter')];
    startBtn.querySelector('.start-label').textContent = '再生する';
    startBtn.hidden = false;
    show(ep.poster);
  }

  function fit() {
    const k = box.clientWidth / STAGE_W;
    stage.style.transform = `scale(${k})`;
    renderer.setPixelRatio(clamp(k * (window.devicePixelRatio || 1), 0.5, 2));
    renderer.setSize(STAGE_W, STAGE_H, false);
    if (cur) frame(st.t);
  }
  function show(t) {
    st.t = t;
    frame(t);
    seek.value = String(t);
    timeEl.textContent = `${fmt(t)} / ${fmt(cur.ep.duration)}`;
    let now = 0;
    cur.ep.chapters.forEach((ch, i) => { if (t >= ch.t) now = i; });
    chapBtns.forEach((b, i) => b.classList.toggle('is-now', i === now));
  }
  function audioOn(t) {
    try {
      if (!st.ctx) {
        st.ctx = new (window.AudioContext || window.webkitAudioContext)();
        st.master = AUDIO.masterChain(st.ctx);
      }
      if (st.ctx.state !== 'running') st.ctx.resume();
      const g = st.ctx.createGain();
      g.gain.value = 1.6; // 書き出し側は音量をそろえているので、ブラウザ再生も少し持ち上げる
      g.connect(st.master);
      AUDIO.scheduleEvents(st.ctx, g, cur.events, t, st.ctx.currentTime + 0.06);
      st.session = g;
    } catch (e) { st.session = null; }
  }
  function audioOff() {
    if (!st.session) return;
    try { st.session.disconnect(); } catch (e) { /* 切断済み */ }
    st.session = null;
  }
  function clockNow() { return st.from + Math.max(0, performance.now() - st.perf0) / 1000; }
  function loop() {
    if (!st.playing) return;
    const t = clockNow(), D = cur.ep.duration;
    if (t >= D) { show(D - 0.001); pause(); startBtn.querySelector('.start-label').textContent = 'もう一度見る'; startBtn.hidden = false; return; }
    show(t);
    requestAnimationFrame(loop);
  }
  function setPlayIcon() {
    playBtn.querySelector('.i-play').hidden = st.playing;
    playBtn.querySelector('.i-pause').hidden = !st.playing;
    playBtn.setAttribute('aria-label', st.playing ? '一時停止' : '再生');
  }
  function play() {
    if (st.t >= cur.ep.duration - 0.05) st.t = 0;
    st.playing = true;
    startBtn.hidden = true;
    st.from = st.t; st.perf0 = performance.now() + 60;
    if (st.sound) audioOn(st.t);
    setPlayIcon();
    requestAnimationFrame(loop);
  }
  function pause() { st.playing = false; audioOff(); setPlayIcon(); }
  function goTo(t) {
    t = clamp(t, 0, cur.ep.duration - 0.001);
    if (st.playing) { audioOff(); st.from = t; st.perf0 = performance.now() + 60; if (st.sound) audioOn(t); }
    show(t);
  }

  startBtn.addEventListener('click', play);
  playBtn.addEventListener('click', () => (st.playing ? pause() : play()));
  soundBtn.addEventListener('click', () => {
    st.sound = !st.sound;
    soundBtn.setAttribute('aria-pressed', String(st.sound));
    soundBtn.querySelector('.i-on').hidden = !st.sound;
    soundBtn.querySelector('.i-off').hidden = st.sound;
    if (st.playing) { audioOff(); if (st.sound) audioOn(clockNow()); }
  });
  let wasPlaying = false;
  seek.addEventListener('pointerdown', () => { wasPlaying = st.playing; if (st.playing) pause(); });
  seek.addEventListener('input', () => { startBtn.hidden = true; show(+seek.value); });
  seek.addEventListener('change', () => { if (wasPlaying) { wasPlaying = false; play(); } });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || /INPUT|BUTTON/.test(document.activeElement.tagName)) return;
    e.preventDefault();
    st.playing ? pause() : play();
  });
  const fromHash = () => byId(location.hash.slice(1)) || EPISODES[EPISODES.length - 1];
  window.addEventListener('hashchange', () => { const ep = fromHash(); if (ep !== cur.ep) showEpisode(ep); });
  showEpisode(fromHash());
  if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
  else window.addEventListener('resize', fit);
  fit();
  setPlayIcon();
}
start();
