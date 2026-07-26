/* 百花繚乱絵巻 — スマホ。草花を描くか撮るかして、庭へ送る。 */
(() => {
  'use strict';

  const PIGMENTS = [
    '#2b2826', '#42603e', '#91b24a', '#f2b22d',
    '#b03f4f', '#eebec5', '#4d5c98', '#624276',
  ];
  const WIDTHS = [6, 14, 28];
  const UNDO_DEPTH = 8;

  const board = document.getElementById('board');
  const brush = board.getContext('2d');
  const hint = document.getElementById('hint');
  const paletteBox = document.getElementById('palette');
  const widthBox = document.getElementById('widths');
  const eraserButton = document.getElementById('eraser');
  const fileInput = document.getElementById('file');
  const preview = document.getElementById('preview');
  const previewImage = document.getElementById('preview-img');
  const cutoutInput = document.getElementById('cutout');
  const nameInput = document.getElementById('name');
  const descriptionInput = document.getElementById('description');
  const sendButton = document.getElementById('send');
  const note = document.getElementById('note');
  const done = document.getElementById('done');

  let mode = 'paint';
  let color = PIGMENTS[1];
  let stroke = WIDTHS[1];
  let erasing = false;
  let drawing = false;
  let painted = false;
  let lastPoint = null;
  let photo = null;
  const history = [];

  // 連投の間隔判定に使う。端末ごとに一度だけ発行する。
  let visitor = localStorage.getItem('hana-visitor');
  if (!visitor) {
    visitor = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('hana-visitor', visitor);
  }

  // ------------------------------------------------------------------
  // 道具立て
  // ------------------------------------------------------------------

  PIGMENTS.forEach((pigment, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (index === 1 ? ' is-on' : '');
    chip.style.background = pigment;
    chip.addEventListener('click', () => {
      color = pigment;
      erasing = false;
      eraserButton.classList.remove('is-on');
      paletteBox.querySelectorAll('.chip').forEach((other) => other.classList.remove('is-on'));
      chip.classList.add('is-on');
    });
    paletteBox.appendChild(chip);
  });

  WIDTHS.forEach((size, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'width' + (index === 1 ? ' is-on' : '');
    const dot = document.createElement('span');
    const shown = Math.max(4, size / 2.2);
    dot.style.width = `${shown}px`;
    dot.style.height = `${shown}px`;
    button.appendChild(dot);
    button.addEventListener('click', () => {
      stroke = size;
      widthBox.querySelectorAll('.width').forEach((other) => other.classList.remove('is-on'));
      button.classList.add('is-on');
    });
    widthBox.appendChild(button);
  });

  eraserButton.addEventListener('click', () => {
    erasing = !erasing;
    eraserButton.classList.toggle('is-on', erasing);
  });

  document.querySelectorAll('.tabs__item').forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      document.querySelectorAll('.tabs__item').forEach((other) => other.classList.remove('is-on'));
      tab.classList.add('is-on');
      document.getElementById('pane-paint').classList.toggle('is-hidden', mode !== 'paint');
      document.getElementById('pane-photo').classList.toggle('is-hidden', mode !== 'photo');
      note.textContent = '';
    });
  });

  // ------------------------------------------------------------------
  // 描く
  // ------------------------------------------------------------------

  brush.lineCap = 'round';
  brush.lineJoin = 'round';

  function remember() {
    history.push(brush.getImageData(0, 0, board.width, board.height));
    if (history.length > UNDO_DEPTH) history.shift();
  }

  function pointOf(event) {
    const box = board.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * board.width,
      y: ((event.clientY - box.top) / box.height) * board.height,
    };
  }

  function applyBrush() {
    brush.lineWidth = stroke;
    if (erasing) {
      brush.globalCompositeOperation = 'destination-out';
      brush.strokeStyle = 'rgba(0,0,0,1)';
      brush.lineWidth = stroke * 1.8;
    } else {
      brush.globalCompositeOperation = 'source-over';
      brush.strokeStyle = color;
    }
  }

  board.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    board.setPointerCapture(event.pointerId);
    remember();
    drawing = true;
    painted = true;
    hint.classList.add('is-hidden');
    lastPoint = pointOf(event);
    applyBrush();
    brush.beginPath();
    brush.moveTo(lastPoint.x, lastPoint.y);
    brush.lineTo(lastPoint.x + 0.1, lastPoint.y + 0.1);
    brush.stroke();
  });

  board.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    event.preventDefault();
    const point = pointOf(event);
    const mid = { x: (lastPoint.x + point.x) / 2, y: (lastPoint.y + point.y) / 2 };
    applyBrush();
    brush.beginPath();
    brush.moveTo(lastPoint.x, lastPoint.y);
    brush.quadraticCurveTo(lastPoint.x, lastPoint.y, mid.x, mid.y);
    brush.stroke();
    lastPoint = point;
  });

  const stop = () => {
    drawing = false;
    lastPoint = null;
  };
  board.addEventListener('pointerup', stop);
  board.addEventListener('pointercancel', stop);
  board.addEventListener('pointerleave', stop);

  document.getElementById('undo').addEventListener('click', () => {
    const previous = history.pop();
    if (!previous) return;
    brush.globalCompositeOperation = 'source-over';
    brush.putImageData(previous, 0, 0);
  });

  document.getElementById('clear').addEventListener('click', () => {
    remember();
    brush.clearRect(0, 0, board.width, board.height);
    painted = false;
    hint.classList.remove('is-hidden');
  });

  // ------------------------------------------------------------------
  // 写真
  // ------------------------------------------------------------------

  fileInput.addEventListener('change', () => {
    const chosen = fileInput.files && fileInput.files[0];
    if (!chosen) return;
    photo = chosen;
    previewImage.src = URL.createObjectURL(chosen);
    preview.classList.remove('is-empty');
    note.textContent = '';
  });

  // ------------------------------------------------------------------
  // 送る
  // ------------------------------------------------------------------

  function canvasBlob() {
    return new Promise((resolve) => board.toBlob(resolve, 'image/png'));
  }

  async function send() {
    note.textContent = '';

    let blob = null;
    let filename = 'plant.png';
    if (mode === 'paint') {
      if (!painted) {
        note.textContent = 'まず草花を描いてください。';
        return;
      }
      blob = await canvasBlob();
    } else {
      if (!photo) {
        note.textContent = '写真を選んでください。';
        return;
      }
      blob = photo;
      filename = photo.name || 'plant.jpg';
    }
    if (!blob) {
      note.textContent = '画像を用意できませんでした。';
      return;
    }

    const form = new FormData();
    form.append('image', blob, filename);
    form.append('name', nameInput.value.trim());
    form.append('description', descriptionInput.value.trim());
    form.append('source', mode);
    form.append('cutout', mode === 'photo' && !cutoutInput.checked ? 'off' : 'on');
    form.append('token', visitor);

    sendButton.disabled = true;
    sendButton.textContent = '植えています…';

    try {
      const response = await fetch('/api/plant', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        note.textContent = payload.detail || '植えられませんでした。少し待って試してください。';
        return;
      }
      document.getElementById('done-name').textContent = payload.name;
      document.getElementById('done-label').textContent = payload.label || '';
      done.classList.add('is-shown');
    } catch (error) {
      note.textContent = '庭につながりませんでした。電波を確かめてください。';
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = '庭に植える';
    }
  }

  sendButton.addEventListener('click', send);

  document.getElementById('again').addEventListener('click', () => {
    done.classList.remove('is-shown');
    brush.globalCompositeOperation = 'source-over';
    brush.clearRect(0, 0, board.width, board.height);
    history.length = 0;
    painted = false;
    hint.classList.remove('is-hidden');
    photo = null;
    fileInput.value = '';
    preview.classList.add('is-empty');
    nameInput.value = '';
    descriptionInput.value = '';
    note.textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
