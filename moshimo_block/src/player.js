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

  const ep = EPISODES[0];
  const built = ep.build();
  const overlay = new Overlay($('overlay'), built.overlay);
  const wipe = new Wipe($('wipe'), built.cuts);
  const events = built.audio.concat(captionBlips(built.overlay));
  const D = ep.duration;

  function frame(t) {
    t = clamp(t, 0, D - 1e-3);
    const list = built.scenes;
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
    overlay.update(t, { camera, sceneId: sc.id });
    wipe.draw(t);
    return sc;
  }
  built.scenes.forEach((s) => frame(s.start + 0.01)); // シェーダーを先に用意しておく

  if (RENDER) {
    window.__duration = D;
    window.__seek = (t) => { frame(t); };
    window.__renderAudio = () => AUDIO.renderAudioWav(events, D);
    window.__ready = true;
    return;
  }

  /* ---------- 画面の操作 ---------- */
  const box = $('stageBox'), stage = $('stage'), seek = $('seek'), timeEl = $('time');
  const playBtn = $('playBtn'), soundBtn = $('soundBtn'), startBtn = $('start');
  const st = { t: ep.poster, playing: false, sound: true, ctx: null, master: null, session: null, from: 0, perf0: 0 };
  seek.max = String(D);

  $('epNo').textContent = '#' + String(ep.no).padStart(2, '0');
  $('epTitle').textContent = ep.title;
  $('epLead').textContent = ep.lead;
  const chapList = $('chapters');
  ep.chapters.forEach((ch, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chapter'; b.id = 'chapter-' + i;
    b.innerHTML = '<span class="ch-time"></span><span class="ch-name"></span>';
    b.firstChild.textContent = fmt(ch.t);
    b.lastChild.textContent = ch.name;
    b.addEventListener('click', () => { goTo(ch.t); if (!st.playing) play(); });
    li.appendChild(b); chapList.appendChild(li);
  });
  const chapBtns = [...chapList.querySelectorAll('.chapter')];

  function fit() {
    const k = box.clientWidth / STAGE_W;
    stage.style.transform = `scale(${k})`;
    renderer.setPixelRatio(clamp(k * (window.devicePixelRatio || 1), 0.5, 2));
    renderer.setSize(STAGE_W, STAGE_H, false);
    frame(st.t);
  }
  function show(t) {
    st.t = t;
    frame(t);
    seek.value = String(t);
    timeEl.textContent = `${fmt(t)} / ${fmt(D)}`;
    let cur = 0;
    ep.chapters.forEach((ch, i) => { if (t >= ch.t) cur = i; });
    chapBtns.forEach((b, i) => b.classList.toggle('is-now', i === cur));
  }
  function audioOn(t) {
    try {
      if (!st.ctx) {
        st.ctx = new (window.AudioContext || window.webkitAudioContext)();
        st.master = AUDIO.masterChain(st.ctx);
      }
      if (st.ctx.state !== 'running') st.ctx.resume();
      const g = st.ctx.createGain();
      g.connect(st.master);
      AUDIO.scheduleEvents(st.ctx, g, events, t, st.ctx.currentTime + 0.06);
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
    const t = clockNow();
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
    if (st.t >= D - 0.05) st.t = 0;
    st.playing = true;
    startBtn.hidden = true;
    st.from = st.t; st.perf0 = performance.now() + 60;
    if (st.sound) audioOn(st.t);
    setPlayIcon();
    requestAnimationFrame(loop);
  }
  function pause() { st.playing = false; audioOff(); setPlayIcon(); }
  function goTo(t) {
    t = clamp(t, 0, D - 0.001);
    if (st.playing) { audioOff(); st.from = t; st.perf0 = performance.now() + 60; if (st.sound) audioOn(t); }
    show(t);
  }

  startBtn.addEventListener('click', () => { if (st.t >= D - 0.05) st.t = 0; play(); });
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
  if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
  else window.addEventListener('resize', fit);
  fit();
  show(st.t);
  setPlayIcon();
}
start();
