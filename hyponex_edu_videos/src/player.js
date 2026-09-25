// プレビュー再生と書き出し用のAPI（window.studio）
import { W, H, FPS } from './engine/core.js';
import { renderVideo, collectCues, checkSubs } from './engine/stage.js';
import { loadFonts, loadImages } from './engine/assets.js';
import { VIDEOS } from './videos/index.js';
import { renderSoundtrack } from './audio/synth.js';

const params = new URLSearchParams(location.search);
const isRender = params.has('render');
if (isRender) document.body.classList.add('render');
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { willReadFrequently: isRender });

await loadFonts();
const images = await loadImages();
let video = VIDEOS[params.get('video') || 'v1'];
let playing = false;
let t = Number(params.get('t') || 0);

const sel = document.getElementById('video');
const seek = document.getElementById('seek');
const timeEl = document.getElementById('time');
const playBtn = document.getElementById('play');
for (const [id, v] of Object.entries(VIDEOS)) {
  const o = document.createElement('option');
  o.value = id;
  o.textContent = `#${v.episode} ${v.title}`;
  sel.appendChild(o);
}
sel.value = video.id;

let audioCtx = null, source = null, audioBuf = null, audioFor = null, startWall = 0, startT = 0;
function buildAudio() {
  if (audioFor === video.id) return;
  const tr = renderSoundtrack(video.duration, collectCues(video));
  audioCtx = audioCtx || new AudioContext({ sampleRate: tr.sampleRate });
  audioBuf = audioCtx.createBuffer(2, tr.L.length, tr.sampleRate);
  audioBuf.copyToChannel(tr.L, 0);
  audioBuf.copyToChannel(tr.R, 1);
  audioFor = video.id;
}
function stopAudio() {
  if (source) {
    try { source.stop(); } catch (e) { /* 停止済み */ }
    source = null;
  }
}
function play() {
  buildAudio();
  stopAudio();
  source = audioCtx.createBufferSource();
  source.buffer = audioBuf;
  source.connect(audioCtx.destination);
  source.start(0, t);
  startWall = audioCtx.currentTime;
  startT = t;
  playing = true;
  playBtn.textContent = '停止';
}
function pause() {
  stopAudio();
  playing = false;
  playBtn.textContent = '再生';
}
function draw() {
  renderVideo(ctx, video, t, images);
  seek.value = Math.round((t / video.duration) * 1000);
  timeEl.textContent = `${t.toFixed(1)} / ${video.duration.toFixed(1)}`;
}
function loop() {
  if (playing) {
    t = startT + (audioCtx.currentTime - startWall);
    if (t >= video.duration) {
      t = video.duration - 1 / FPS;
      pause();
    }
    draw();
  }
  requestAnimationFrame(loop);
}
if (!isRender) {
  playBtn.onclick = () => (playing ? pause() : play());
  seek.oninput = () => {
    t = (seek.value / 1000) * video.duration;
    if (playing) play();
    else draw();
  };
  sel.onchange = () => {
    pause();
    video = VIDEOS[sel.value];
    t = 0;
    draw();
  };
  draw();
  requestAnimationFrame(loop);
}

// 書き出し用API
window.studio = {
  ids: Object.keys(VIDEOS),
  info(id) {
    const v = VIDEOS[id];
    return { id, file: v.file, title: v.title, duration: v.duration, fps: FPS, frames: Math.round(v.duration * FPS), warnings: checkSubs(v) };
  },
  select(id) {
    video = VIDEOS[id];
  },
  frameAt(sec) {
    renderVideo(ctx, video, sec, images);
  },
  // from〜to のフレームを描いて url に送る（Blobで送ると速い。最大4枚まで並行）
  async pushFrames(from, to, url) {
    const inflight = new Set();
    for (let i = from; i < to; i++) {
      renderVideo(ctx, video, i / FPS, images);
      const blob = new Blob([ctx.getImageData(0, 0, W, H).data]);
      const p = fetch(`${url}?i=${i}`, { method: 'POST', body: blob }).then((r) => {
        if (!r.ok) throw new Error(`frame ${i}: ${r.status}`);
      });
      inflight.add(p);
      p.finally(() => inflight.delete(p));
      if (inflight.size >= 4) await Promise.race(inflight);
    }
    await Promise.all(inflight);
    return to - from;
  },
  snapshot(sec) {
    renderVideo(ctx, video, sec, images);
    return canvas.toDataURL('image/png');
  },
};
window.__ready = true;
