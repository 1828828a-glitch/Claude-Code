/* 百花繚乱絵巻 — 大画面。和紙の庭を横に繰りながら、届いた草花を育てる。 */
(() => {
  'use strict';

  const canvas = document.getElementById('garden');
  const ctx = canvas.getContext('2d');
  const countLabel = document.getElementById('count');
  const offline = document.getElementById('offline');

  // 奥・中・手前の三層。手前ほど大きく、下に、はっきり。
  const LANES = [
    { scale: 0.68, ground: 0.660, alpha: 0.66, sway: 0.85 },
    { scale: 0.92, ground: 0.752, alpha: 0.85, sway: 1.00 },
    { scale: 1.16, ground: 0.874, alpha: 1.00, sway: 1.18 },
  ];

  const GROW_MS = 2400;
  // 新着株を画面中央より右に置き、育ってきた庭を左に見せる。
  const FOCUS_OFFSET = 0.22;
  const WITHER_MS = 2800;
  const FOCUS_MS = 9500;
  const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
  const ROTATED = new Set(['ー', '「', '」', '（', '）', '〜', '（', '）', '—', '-']);

  const plants = new Map();
  const petals = [];
  const motes = [];

  let width = 0;
  let height = 0;
  let paper = null;
  let camera = 0;
  let cameraGoal = 0;
  let drift = 1;
  let focus = null;
  let clock = 0;
  let last = performance.now();

  // ------------------------------------------------------------------
  // 下ごしらえ
  // ------------------------------------------------------------------

  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return ((value >>> 0) % 100000) / 100000;
  }

  function clamp(value, low, high) {
    return value < low ? low : value > high ? high : value;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function makePaper(w, h) {
    const sheet = document.createElement('canvas');
    sheet.width = Math.max(1, Math.ceil(w / 2));
    sheet.height = Math.max(1, Math.ceil(h / 2));
    const paint = sheet.getContext('2d');

    const grain = paint.createImageData(sheet.width, sheet.height);
    const data = grain.data;
    for (let i = 0; i < data.length; i += 4) {
      const tone = 234 + Math.random() * 12;
      data[i] = tone;
      data[i + 1] = tone - 7;
      data[i + 2] = tone - 22;
      data[i + 3] = 255;
    }
    paint.putImageData(grain, 0, 0);

    // 紙の繊維
    paint.strokeStyle = 'rgba(150, 130, 96, 0.10)';
    paint.lineWidth = 1;
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * sheet.width;
      const y = Math.random() * sheet.height;
      const len = 12 + Math.random() * 46;
      paint.beginPath();
      paint.moveTo(x, y);
      paint.lineTo(x + len, y + (Math.random() - 0.5) * 3);
      paint.stroke();
    }
    return sheet;
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paper = makePaper(width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  // ------------------------------------------------------------------
  // 背景
  // ------------------------------------------------------------------

  function windAt(time) {
    return 0.55 + 0.30 * Math.sin(time * 0.33) + 0.15 * Math.sin(time * 0.137 + 1.7);
  }

  function drawHills(parallax, baseY, amplitude, tint, fadeTint) {
    // 稜線から下へ薄れていく帯として描く。画面下まで塗ると庭全体が灰色に沈む。
    const foot = baseY + height * 0.12;
    const shift = camera * parallax * height;

    ctx.beginPath();
    ctx.moveTo(0, foot);
    for (let x = 0; x <= width; x += 12) {
      const u = (x + shift) * 0.0016;
      const ridge =
        Math.sin(u) * 0.55 + Math.sin(u * 2.3 + 1.2) * 0.28 + Math.sin(u * 0.47 + 3.1) * 0.5;
      ctx.lineTo(x, baseY - ridge * amplitude);
    }
    ctx.lineTo(width, foot);
    ctx.closePath();

    const wash = ctx.createLinearGradient(0, baseY - amplitude, 0, foot);
    wash.addColorStop(0, tint);
    wash.addColorStop(1, fadeTint);
    ctx.fillStyle = wash;
    ctx.fill();
  }

  function drawBackdrop() {
    ctx.drawImage(paper, 0, 0, width, height);

    // 上ほど明るい紙。濃くすると横縞に見えるので、ごく薄く。
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, 'rgba(255, 253, 247, 0.72)');
    sky.addColorStop(0.55, 'rgba(250, 245, 233, 0.18)');
    sky.addColorStop(1, 'rgba(233, 223, 200, 0.14)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // 遠山は淡墨。庭より十分上に置き、二重にして奥行きだけ出す。
    drawHills(0.06, height * 0.400, height * 0.075, 'rgba(126, 134, 138, 0.20)', 'rgba(126, 134, 138, 0)');
    drawHills(0.13, height * 0.470, height * 0.052, 'rgba(98, 110, 112, 0.24)', 'rgba(98, 110, 112, 0)');

    // 山と庭のあいだの霞。画面で唯一の帯なので、これだけは効かせてよい。
    const haze = ctx.createLinearGradient(0, height * 0.44, 0, height * 0.60);
    haze.addColorStop(0, 'rgba(250, 246, 236, 0)');
    haze.addColorStop(0.55, 'rgba(250, 246, 236, 0.60)');
    haze.addColorStop(1, 'rgba(250, 246, 236, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, height * 0.44, width, height * 0.16);
  }

  function drawForeground() {
    // 手前の土。下端の余白を締めて絵巻らしく収める。
    const soil = ctx.createLinearGradient(0, height * 0.88, 0, height);
    soil.addColorStop(0, 'rgba(150, 128, 92, 0)');
    soil.addColorStop(1, 'rgba(142, 118, 82, 0.20)');
    ctx.fillStyle = soil;
    ctx.fillRect(0, height * 0.88, width, height * 0.12);
  }

  function drawMist(y, thickness) {
    const band = ctx.createLinearGradient(0, y - thickness, 0, y + thickness);
    band.addColorStop(0, 'rgba(249, 245, 235, 0)');
    band.addColorStop(0.5, 'rgba(249, 245, 235, 0.30)');
    band.addColorStop(1, 'rgba(249, 245, 235, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, y - thickness, width, thickness * 2);
  }

  function drawGround(lane) {
    const y = height * lane.ground;
    const shift = camera * height;

    // 土坡は一本の淡い線。太らせると層が縞に潰れる。
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const u = (x + shift) * 0.0042;
      const bump = Math.sin(u) * 3.5 + Math.sin(u * 2.7 + 0.9) * 2.2;
      if (x === 0) ctx.moveTo(x, y + bump);
      else ctx.lineTo(x, y + bump);
    }
    ctx.strokeStyle = `rgba(74, 66, 54, ${0.32 * lane.alpha})`;
    ctx.lineWidth = 1.4 * lane.scale;
    ctx.stroke();

    const earth = ctx.createLinearGradient(0, y, 0, y + height * 0.042);
    earth.addColorStop(0, `rgba(154, 132, 96, ${0.13 * lane.alpha})`);
    earth.addColorStop(1, 'rgba(154, 132, 96, 0)');
    ctx.fillStyle = earth;
    ctx.fillRect(0, y, width, height * 0.042);
  }

  // ------------------------------------------------------------------
  // 草花
  // ------------------------------------------------------------------

  function adopt(data, { grown }) {
    const existing = plants.get(data.id);
    if (existing) {
      existing.data = data;
      return existing;
    }
    const image = new Image();
    image.src = data.image;
    const seed = hash(data.id);
    const plant = {
      data,
      image,
      grow: grown ? 1 : 0,
      wither: -1,
      phase: seed * Math.PI * 2,
      size: 0.86 + seed * 0.30,
      speed: 0.75 + hash(data.id + 'w') * 0.55,
      petalAt: 1.5 + seed * 6,
    };
    plants.set(data.id, plant);
    return plant;
  }

  function geometry(plant) {
    const lane = LANES[plant.data.lane % LANES.length];
    const drawHeight = lane.scale * plant.size * 0.33 * height;
    const aspect = plant.data.width / Math.max(1, plant.data.height);
    return {
      lane,
      drawHeight,
      drawWidth: drawHeight * aspect,
      groundY: height * lane.ground,
      screenX: (plant.data.x - camera) * height + width * 0.5,
    };
  }

  function drawPlant(plant, wind) {
    const image = plant.image;
    if (!image.complete || !image.naturalWidth) return;

    const { lane, drawHeight, drawWidth, groundY, screenX } = geometry(plant);
    if (screenX < -drawWidth * 2 || screenX > width + drawWidth * 2) return;

    const grown = easeOutCubic(plant.grow);
    const fading = plant.wither >= 0 ? 1 - easeOutCubic(Math.min(1, plant.wither)) : 1;
    if (fading <= 0.01) return;

    const reveal = Math.min(1, plant.grow * 1.12);
    const stand = 0.34 + 0.66 * grown;
    const left = screenX - plant.data.root_x * drawWidth;

    const slices = Math.max(10, Math.round(drawHeight / 7));
    const visible = Math.max(1, Math.ceil(reveal * slices));
    const sourceSlice = plant.data.height / slices;
    const destSlice = (drawHeight * stand) / slices;
    const amplitude = drawHeight * 0.055 * lane.sway * wind;

    ctx.save();
    ctx.globalAlpha = lane.alpha * fading;

    for (let i = 0; i < visible; i++) {
      const fromRoot = (i + 0.5) / slices;
      const offset =
        amplitude *
        Math.pow(fromRoot, 1.7) *
        Math.sin(clock * plant.speed + plant.phase + fromRoot * 1.9);

      ctx.drawImage(
        image,
        0,
        plant.data.height - (i + 1) * sourceSlice,
        plant.data.width,
        sourceSlice,
        left + offset,
        groundY - (i + 1) * destSlice,
        drawWidth,
        destSlice + 0.7
      );
    }

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // 花びらと芽吹きの粒
  // ------------------------------------------------------------------

  function shedPetal(plant) {
    const { drawHeight, drawWidth, groundY, screenX } = geometry(plant);
    petals.push({
      x: plant.data.x + ((Math.random() - 0.5) * drawWidth) / height,
      y: groundY - drawHeight * (0.45 + Math.random() * 0.5),
      vx: (Math.random() - 0.2) * 0.05,
      vy: 12 + Math.random() * 18,
      spin: (Math.random() - 0.5) * 3,
      turn: Math.random() * Math.PI,
      size: 3 + Math.random() * 4,
      life: 0,
      span: 6 + Math.random() * 4,
      color: plant.data.bloom_color,
      lane: plant.data.lane,
    });
    void screenX;
  }

  function burstMotes(plant) {
    const { groundY, screenX } = geometry(plant);
    for (let i = 0; i < 16; i++) {
      motes.push({
        x: plant.data.x + ((Math.random() - 0.5) * 40) / height,
        y: groundY - Math.random() * 12,
        vy: 18 + Math.random() * 34,
        life: 0,
        span: 0.9 + Math.random() * 0.8,
        size: 1.2 + Math.random() * 2.2,
      });
    }
    void screenX;
  }

  function updateParticles(dt, wind) {
    for (let i = petals.length - 1; i >= 0; i--) {
      const petal = petals[i];
      petal.life += dt;
      if (petal.life > petal.span) {
        petals.splice(i, 1);
        continue;
      }
      petal.x += (petal.vx * wind * dt * 60) / height;
      petal.y += petal.vy * dt + Math.sin(petal.life * 2.4) * 6 * dt;
      petal.turn += petal.spin * dt;
    }

    for (let i = motes.length - 1; i >= 0; i--) {
      const mote = motes[i];
      mote.life += dt;
      if (mote.life > mote.span) {
        motes.splice(i, 1);
        continue;
      }
      mote.y -= mote.vy * dt;
    }
  }

  function drawParticles() {
    for (const petal of petals) {
      const x = (petal.x - camera) * height + width * 0.5;
      if (x < -20 || x > width + 20) continue;
      const fade = 1 - petal.life / petal.span;
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade * 1.6) * (0.55 + 0.45 * (petal.lane / 2));
      ctx.translate(x, petal.y);
      ctx.rotate(petal.turn);
      ctx.fillStyle = petal.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const mote of motes) {
      const x = (mote.x - camera) * height + width * 0.5;
      if (x < -20 || x > width + 20) continue;
      ctx.globalAlpha = (1 - mote.life / mote.span) * 0.7;
      ctx.fillStyle = '#8fae5a';
      ctx.beginPath();
      ctx.arc(x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------
  // 立札（縦書き）
  // ------------------------------------------------------------------

  function drawColumn(text, x, top, size, rows) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let row = 0;
    let column = 0;
    for (const character of text) {
      if (row >= rows) {
        column += 1;
        row = 0;
      }
      const cx = x - column * size * 1.55;
      const cy = top + row * size * 1.06 + size * 0.5;
      if (ROTATED.has(character)) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(character, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(character, cx, cy);
      }
      row += 1;
    }
    return column + 1;
  }

  function drawPlaque(plant, opacity) {
    const { drawHeight, groundY, screenX } = geometry(plant);
    const nameSize = Math.max(15, height * 0.026);
    const noteSize = Math.max(11, height * 0.0165);
    const rows = Math.max(6, Math.floor((height * 0.30) / (noteSize * 1.06)));

    const noteColumns = Math.ceil(plant.data.label.length / rows) || 1;
    const columns = 1 + noteColumns;
    const boxWidth = nameSize * 1.7 + noteColumns * noteSize * 1.55 + nameSize * 0.9;
    const usedRows = Math.min(rows, Math.max(plant.data.name.length, plant.data.label.length));
    const boxHeight = usedRows * noteSize * 1.06 + nameSize * 2.6;

    let boxX = clamp(screenX + drawHeight * 0.22, 12, width - boxWidth - 12);
    const boxY = clamp(groundY - drawHeight * 0.55 - boxHeight, 12, height - boxHeight - 12);
    void columns;

    ctx.save();
    ctx.globalAlpha = opacity;

    // 五角形の木札
    const peak = nameSize * 0.8;
    ctx.beginPath();
    ctx.moveTo(boxX + boxWidth / 2, boxY - peak);
    ctx.lineTo(boxX + boxWidth, boxY);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight);
    ctx.lineTo(boxX, boxY + boxHeight);
    ctx.lineTo(boxX, boxY);
    ctx.closePath();

    const grain = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
    grain.addColorStop(0, 'rgba(247, 240, 224, 0.97)');
    grain.addColorStop(1, 'rgba(230, 216, 189, 0.97)');
    ctx.fillStyle = grain;
    ctx.shadowColor = 'rgba(60, 45, 30, 0.28)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(70, 58, 44, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const right = boxX + boxWidth - nameSize * 0.95;
    const top = boxY + nameSize * 1.1;

    ctx.fillStyle = '#2b2826';
    ctx.font = `${nameSize}px ${SERIF}`;
    drawColumn(plant.data.name, right, top, nameSize, rows);

    ctx.fillStyle = 'rgba(43, 40, 38, 0.78)';
    ctx.font = `${noteSize}px ${SERIF}`;
    drawColumn(plant.data.label, right - nameSize * 1.7, top + nameSize * 0.4, noteSize, rows);

    // 落款
    ctx.fillStyle = 'rgba(176, 63, 79, 0.85)';
    ctx.fillRect(boxX + nameSize * 0.5, boxY + boxHeight - nameSize * 1.1, nameSize * 0.6, nameSize * 0.6);

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // 進行
  // ------------------------------------------------------------------

  function updateCamera(dt) {
    const now = performance.now();
    const target = focus && now < focus.until ? plants.get(focus.id) : null;

    if (target) {
      cameraGoal = target.data.x - FOCUS_OFFSET;
    } else {
      let low = 0;
      let high = 0;
      let first = true;
      for (const plant of plants.values()) {
        if (first) {
          low = high = plant.data.x;
          first = false;
        } else {
          low = Math.min(low, plant.data.x);
          high = Math.max(high, plant.data.x);
        }
      }
      cameraGoal += drift * 0.045 * dt;
      if (cameraGoal > high + 0.12) drift = -1;
      if (cameraGoal < low - 0.12) drift = 1;
      cameraGoal = clamp(cameraGoal, low - 0.35, high + 0.35);
    }

    camera += (cameraGoal - camera) * (1 - Math.exp(-dt * 1.7));
  }

  function focusOpacity() {
    if (!focus) return 0;
    const now = performance.now();
    const since = now - (focus.until - FOCUS_MS);
    if (since < 0 || now > focus.until) return 0;
    const fadeIn = clamp(since / 600, 0, 1);
    const fadeOut = clamp((focus.until - now) / 700, 0, 1);
    return fadeIn * fadeOut;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    const wind = windAt(clock);

    updateCamera(dt);

    for (const [id, plant] of plants) {
      if (plant.grow < 1) plant.grow = Math.min(1, plant.grow + dt * (1000 / GROW_MS));
      if (plant.wither >= 0) {
        plant.wither += dt * (1000 / WITHER_MS);
        if (plant.wither >= 1) {
          plants.delete(id);
          continue;
        }
      }
      plant.petalAt -= dt;
      if (plant.petalAt <= 0) {
        plant.petalAt = 4 + Math.random() * 7;
        if (plant.grow > 0.7) shedPetal(plant);
      }
    }

    updateParticles(dt, wind);

    drawBackdrop();
    for (let laneIndex = 0; laneIndex < LANES.length; laneIndex++) {
      const lane = LANES[laneIndex];
      drawGround(lane);
      for (const plant of plants.values()) {
        if (plant.data.lane % LANES.length === laneIndex) drawPlant(plant, wind);
      }
      if (laneIndex === 0) drawMist(height * LANES[1].ground * 0.97, height * 0.022);
    }

    drawForeground();
    drawParticles();

    const opacity = focusOpacity();
    if (opacity > 0 && focus && plants.has(focus.id)) {
      drawPlaque(plants.get(focus.id), opacity);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // ------------------------------------------------------------------
  // 庭との接続
  // ------------------------------------------------------------------

  function refreshCount() {
    let alive = 0;
    for (const plant of plants.values()) if (plant.wither < 0) alive += 1;
    countLabel.textContent = String(alive);
  }

  function applySnapshot(message) {
    const seen = new Set();
    for (const data of message.plants) {
      adopt(data, { grown: true });
      seen.add(data.id);
    }
    for (const id of [...plants.keys()]) {
      if (!seen.has(id)) plants.delete(id);
    }
    if (message.plants.length) {
      const newest = message.plants[message.plants.length - 1];
      camera = cameraGoal = newest.x - FOCUS_OFFSET;
    }
    refreshCount();
  }

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws`);

    socket.addEventListener('open', () => offline.classList.remove('is-shown'));

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'snapshot') {
        applySnapshot(message);
      } else if (message.type === 'sprout') {
        const plant = adopt(message.plant, { grown: false });
        focus = { id: plant.data.id, until: performance.now() + FOCUS_MS };
        burstMotes(plant);
        refreshCount();
      } else if (message.type === 'wither') {
        const plant = plants.get(message.id);
        if (plant) plant.wither = 0;
        refreshCount();
      } else if (message.type === 'relabel') {
        const plant = plants.get(message.id);
        if (plant) plant.data.label = message.label;
      } else if (message.type === 'cleared') {
        plants.clear();
        petals.length = 0;
        focus = null;
        refreshCount();
      }
    });

    socket.addEventListener('close', () => {
      offline.classList.add('is-shown');
      setTimeout(connect, 2000);
    });
    socket.addEventListener('error', () => socket.close());
  }

  connect();
})();
