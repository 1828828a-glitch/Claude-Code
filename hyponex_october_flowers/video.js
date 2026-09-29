// 10月に咲く花10選 モーショングラフィック動画
// 1920x1080 / 30fps。render(t) は時刻 t の1フレームを描画する純関数で、
// ブラウザ再生とヘッドレス書き出しの両方から同じ関数を呼ぶ。
(() => {
  const W = 1920, H = 1080, FPS = 30, TAU = Math.PI * 2;
  const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Noto Sans JP", sans-serif';
  const C = {
    green: '#009a44', deep: '#00692f', leaf: '#a9d13b', cream: '#fbf6ea',
    paper: '#fffdf7', ink: '#243128', sub: '#5d6b61', red: '#e8382f', autumn: '#e98a2c'
  };

  // ---------- 花データ ----------
  const FLOWERS = [
    { name: 'ダリア', en: 'Dahlia', colors: ['#d7263d', '#f06292', '#ffc93c', '#f7882f', '#ffffff'],
      height: '20cm〜2m', bloom: [[6, 11]], tint: '#f06292',
      points: ['咲き方は10種類以上', '元肥マグァンプＫ 中粒、追肥プランティア'],
      draw: { type: 'radial', center: { r: 26, c: '#f6c945', c2: '#c9861a' }, layers: [
        { n: 16, len: 190, wid: 34, shape: 'pointed', c: '#e84a78', c2: '#9c1846' },
        { n: 14, len: 150, wid: 30, shape: 'pointed', c: '#f06292', c2: '#b0214f', off: 0.2 },
        { n: 12, len: 108, wid: 26, shape: 'pointed', c: '#f58bb0', c2: '#c8386a', off: 0.1 },
        { n: 10, len: 66, wid: 20, shape: 'pointed', c: '#f9b3cb', c2: '#dd5b88', off: 0.3 }] } },
    { name: 'コスモス', en: 'Cosmos', colors: ['#f48fb1', '#ffffff', '#d81b60', '#ffd54f', '#ff9800'],
      height: '50〜150cm', bloom: [[7, 11]], tint: '#f48fb1',
      points: ['秋桜と呼ばれる短日植物', '肥料のやりすぎは倒れる原因に'],
      draw: { type: 'radial', center: { r: 34, c: '#ffd23f', c2: '#e39b12', dots: true }, layers: [
        { n: 8, len: 200, wid: 62, shape: 'notched', c: '#f7a8c4', c2: '#e05a8e' }] } },
    { name: 'ガーベラ', en: 'Gerbera', colors: ['#e53935', '#f06292', '#fdd835', '#fb8c00', '#ffffff'],
      height: '15〜50cm', bloom: [[3, 5], [9, 11]], tint: '#fb8c00',
      points: ['見る人を元気づける明るい花色', '株元の芽が埋まらないよう浅植えに'],
      draw: { type: 'radial', center: { r: 44, c: '#5b3a1a', c2: '#2f1d0b', ring: '#f2c14e' }, layers: [
        { n: 26, len: 200, wid: 18, shape: 'round', c: '#ff9a2e', c2: '#e2621b' },
        { n: 22, len: 120, wid: 12, shape: 'round', c: '#ffc14d', c2: '#f08b20', off: 0.07 }] } },
    { name: 'キンモクセイ', en: 'Fragrant Olive', colors: ['#f39c12'],
      height: '5〜6m', bloom: [[9, 10]], tint: '#f39c12',
      points: ['甘い香りを遠くまで漂わせる', '剪定は開花後から春までに'],
      draw: { type: 'cluster', seed: 7, count: 70, radius: 190, size: 15,
        colors: ['#f7a21b', '#f39c12', '#ffb74d', '#e8850c'], leaves: true, petals: 4 } },
    { name: 'スイートアリッサム', en: 'Sweet Alyssum', colors: ['#ffffff', '#f8bbd0', '#9575cd'],
      height: '10〜30cm', bloom: [[2, 6], [9, 12]], tint: '#b39ddb',
      points: ['小さな花がこんもり咲く', '酸性土が苦手、苦土石灰で調整'],
      draw: { type: 'cluster', seed: 3, count: 95, radius: 200, size: 17,
        colors: ['#ffffff', '#fdf7ff', '#f3e5f5', '#ffffff'], stroke: '#cdb8e0', petals: 4, dome: true } },
    { name: 'ブルーサルビア', en: 'Blue Salvia', colors: ['#5c4bc4', '#ffffff'],
      height: '30〜60cm', bloom: [[5, 11]], tint: '#7e6fd8',
      points: ['青紫で秋の花壇を引き締める', '花がら摘みで次の花が咲く'],
      draw: { type: 'spike', spikes: [-0.18, 0, 0.2], len: 330, floret: 'lip',
        c: '#5b4cc8', c2: '#8a7cf0', stem: '#6a7fb0' } },
    { name: 'シュウメイギク', en: 'Japanese Anemone', colors: ['#ffffff', '#f48fb1'],
      height: '30〜150cm', bloom: [[9, 11]], tint: '#f8bbd0',
      points: ['地下茎で広がり数年で群生', '株元が半日陰になる場所が最適'],
      draw: { type: 'radial', center: { r: 40, c: '#c6e05a', c2: '#7fa320', stamens: '#f5c518' }, layers: [
        { n: 6, len: 190, wid: 90, shape: 'round', c: '#fce4ec', c2: '#f5a3c0' }] } },
    { name: 'ケイトウ', en: 'Celosia', colors: ['#e53935', '#fdd835', '#fb8c00', '#ec407a', '#8e24aa'],
      height: '10cm〜2m', bloom: [[7, 11]], tint: '#e53935',
      points: ['トサカや羽毛状など個性的な形', '根は植えかえを嫌うので慎重に'],
      draw: { type: 'plume', spikes: [-0.22, 0.02, 0.24], len: 300, c: '#e53935', c2: '#ffb300' } },
    { name: 'マリーゴールド', en: 'Marigold', colors: ['#fdd835', '#fb8c00', '#fff3c4'],
      height: '20〜100cm', bloom: [[4, 12]], tint: '#fbc02d',
      points: ['春から12月ごろまで長く咲く', '株間は20cm以上あける'],
      draw: { type: 'radial', center: { r: 20, c: '#e07b00', c2: '#b35400' }, layers: [
        { n: 18, len: 190, wid: 40, shape: 'ruffle', c: '#ffb300', c2: '#e67e00' },
        { n: 16, len: 150, wid: 36, shape: 'ruffle', c: '#ffc107', c2: '#f08c00', off: 0.2 },
        { n: 14, len: 110, wid: 30, shape: 'ruffle', c: '#ffcd38', c2: '#f39c12', off: 0.1 },
        { n: 12, len: 70, wid: 24, shape: 'ruffle', c: '#ffd966', c2: '#f5a623', off: 0.3 }] } },
    { name: 'アメジストセージ', en: 'Mexican Bush Sage', colors: ['#8e44ad', '#f48fb1', '#ffffff'],
      height: '1m程度', bloom: [[9, 11]], tint: '#9b59b6',
      points: ['横へ広がりながら大きく育つ', '花穂が伸びる前に支柱を添える'],
      draw: { type: 'spike', spikes: [-0.32, -0.08, 0.14, 0.36], len: 340, floret: 'fuzzy',
        c: '#8e3fb0', c2: '#c68ae0', stem: '#8a6f9a', curve: 0.35 } }
  ];

  // ---------- ナレーション（字幕表示にも使う） ----------
  const NARRATION = {
    intro: '夏の暑さがやわらいで、庭仕事が気持ちいい季節。10月に咲く花を、10種類紹介します。',
    flower: [
      'まずはダリア。咲き方は10種類以上。元肥にマグァンプＫ中粒、追肥にプランティアを使います。',
      '秋桜の名で親しまれるコスモス。肥料をやりすぎると茎が軟弱になり、倒れやすくなります。',
      'ガーベラは明るい色で元気をくれる花。株元の芽が埋まらないよう、浅く植えるのがコツです。',
      '甘い香りが遠くまで届くキンモクセイ。剪定は花が終わってから春までに済ませましょう。',
      'スイートアリッサムは酸性の土が苦手。植える前に苦土石灰で酸度を整えておきます。',
      'ブルーサルビアの青紫は、秋の花壇をきゅっと引き締めます。花がらを摘めば、わき芽がまた咲きます。',
      'シュウメイギクは地下茎で広がり、数年で群生に。株元が半日陰になる場所が向いています。',
      'ケイトウは根をいじられるのが苦手。直まきにするか、根鉢を崩さず丁寧に植えつけます。',
      'マリーゴールドは春から12月ごろまで咲く長距離ランナー。株間は20センチ以上あけましょう。',
      'アメジストセージは横へ大きく広がります。花穂が伸びる前に、支柱を添えておくと安心です。'
    ],
    tips: '土は赤玉土7に腐葉土3が基本。元肥にマグァンプＫ、追肥にプランティア、液肥ならハイポネックス原液が便利です。',
    outro: '日当たりと風通し、花後の手入れまで見越して選べば、秋の庭はもっと楽しくなります。'
  };

  // ---------- タイムライン ----------
  const SCENES = [];
  let acc = 0;
  const add = (type, dur, data = {}) => { SCENES.push({ type, start: acc, dur, data }); acc += dur; };
  add('intro', 8, { text: NARRATION.intro });
  FLOWERS.forEach((f, i) => add('flower', 8.5, { f, i, text: NARRATION.flower[i] }));
  add('tips', 12, { text: NARRATION.tips });
  add('outro', 8, { text: NARRATION.outro });
  const DURATION = acc;

  // ---------- ユーティリティ ----------
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const lerp = (a, b, x) => a + (b - a) * x;
  const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
  const easeInOut = x => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const easeOutBack = x => { x = clamp01(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const reveal = (lt, d, dur = 0.6) => easeOut((lt - d) / dur);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(ctx, str, x, y, size, color, weight = 700, align = 'left', alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y); ctx.restore();
  }

  // ---------- 背景 ----------
  const LEAVES = (() => { const r = rng(42); return Array.from({ length: 22 }, () => ({
    x: r() * W, speed: 40 + r() * 50, phase: r() * 100, size: 14 + r() * 18, spin: (r() - 0.5) * 2,
    color: ['#e98a2c', '#f2b134', '#d9622b', '#c9a227', '#a9d13b'][Math.floor(r() * 5)] })); })();

  function drawBackground(ctx, t, tint) {
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    // ゆっくり漂う大きな円
    const blobs = [[300, 250, 420, tint || C.leaf, 0.10], [1650, 850, 520, C.green, 0.06], [1500, 180, 260, C.autumn, 0.07]];
    blobs.forEach(([x, y, r, c, a], i) => {
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath();
      ctx.arc(x + Math.sin(t * 0.3 + i) * 40, y + Math.cos(t * 0.25 + i * 2) * 30, r, 0, TAU); ctx.fill(); ctx.restore();
    });
    // 落ち葉
    LEAVES.forEach(l => {
      const y = ((t + l.phase) * l.speed) % (H + 120) - 60;
      const x = l.x + Math.sin((t + l.phase) * 0.8) * 60;
      ctx.save(); ctx.translate(x, y); ctx.rotate((t + l.phase) * l.spin); ctx.globalAlpha = 0.55;
      ctx.fillStyle = l.color; ctx.beginPath(); ctx.ellipse(0, 0, l.size, l.size * 0.45, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(-l.size, 0); ctx.lineTo(l.size, 0); ctx.stroke(); ctx.restore();
    });
  }

  // ---------- 花の描画 ----------
  function petalPath(ctx, len, wid, shape) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    if (shape === 'round') {
      ctx.bezierCurveTo(wid, -len * 0.25, wid, -len, 0, -len);
      ctx.bezierCurveTo(-wid, -len, -wid, -len * 0.25, 0, 0);
    } else if (shape === 'pointed') {
      ctx.bezierCurveTo(wid, -len * 0.3, wid * 0.7, -len * 0.8, 0, -len);
      ctx.bezierCurveTo(-wid * 0.7, -len * 0.8, -wid, -len * 0.3, 0, 0);
    } else if (shape === 'notched') {
      ctx.bezierCurveTo(wid, -len * 0.35, wid * 1.05, -len * 0.95, wid * 0.55, -len);
      ctx.lineTo(wid * 0.28, -len * 0.92); ctx.lineTo(0, -len * 1.0);
      ctx.lineTo(-wid * 0.28, -len * 0.92); ctx.lineTo(-wid * 0.55, -len);
      ctx.bezierCurveTo(-wid * 1.05, -len * 0.95, -wid, -len * 0.35, 0, 0);
    } else if (shape === 'ruffle') {
      ctx.bezierCurveTo(wid, -len * 0.3, wid * 1.1, -len * 0.8, wid * 0.6, -len * 0.95);
      for (let k = 0; k <= 4; k++) {
        const x = lerp(wid * 0.6, -wid * 0.6, k / 4);
        ctx.quadraticCurveTo(x + wid * 0.15, -len * (k % 2 ? 1.04 : 0.92), x, -len * 0.95);
      }
      ctx.bezierCurveTo(-wid * 1.1, -len * 0.8, -wid, -len * 0.3, 0, 0);
    }
    ctx.closePath();
  }

  function drawRadial(ctx, spec, p) {
    spec.layers.forEach((L, li) => {
      const lp = clamp01((p - li * 0.1) / 0.75);
      if (lp <= 0) return;
      const s = easeOutBack(lp);
      for (let k = 0; k < L.n; k++) {
        const a = (k / L.n) * TAU + (L.off || 0) + (1 - easeOut(lp)) * 0.8;
        ctx.save(); ctx.rotate(a); ctx.scale(s, s);
        const g = ctx.createLinearGradient(0, 0, 0, -L.len);
        g.addColorStop(0, L.c2); g.addColorStop(0.55, L.c); g.addColorStop(1, L.c);
        ctx.fillStyle = g; petalPath(ctx, L.len, L.wid, L.shape); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      }
    });
    const cp = easeOutBack(clamp01((p - 0.35) / 0.5));
    if (cp <= 0) return;
    const c = spec.center, r = c.r * cp;
    if (c.stamens) {
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * TAU, rr = r * 1.9;
        ctx.strokeStyle = '#d8b21a'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); ctx.stroke();
        ctx.fillStyle = c.stamens; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 5 * cp, 0, TAU); ctx.fill();
      }
    }
    if (c.ring) { ctx.fillStyle = c.ring; ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, TAU); ctx.fill(); }
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    g.addColorStop(0, c.c); g.addColorStop(1, c.c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    if (c.dots) {
      ctx.fillStyle = '#b7730b';
      for (let k = 0; k < 18; k++) { const a = k * 2.4, rr = Math.sqrt(k / 18) * r * 0.85;
        ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 3, 0, TAU); ctx.fill(); }
    }
  }

  function smallFlower(ctx, x, y, size, color, stroke, petals, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = color;
    for (let k = 0; k < petals; k++) {
      ctx.save(); ctx.rotate((k / petals) * TAU + 0.4); ctx.beginPath();
      ctx.ellipse(0, -size * 0.55, size * 0.42, size * 0.55, 0, 0, TAU); ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = stroke ? '#f3c33b' : '#c96a00';
    ctx.beginPath(); ctx.arc(0, 0, size * 0.22, 0, TAU); ctx.fill(); ctx.restore();
  }

  function drawCluster(ctx, spec, p) {
    const r = rng(spec.seed);
    if (spec.leaves) {
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU + 0.3, lp = easeOut((p - k * 0.03) / 0.5);
        ctx.save(); ctx.rotate(a); ctx.scale(lp, lp);
        const g = ctx.createLinearGradient(0, 0, 0, -spec.radius * 1.35);
        g.addColorStop(0, '#2e6b34'); g.addColorStop(1, '#4f9a3f');
        ctx.fillStyle = g; petalPath(ctx, spec.radius * 1.35, 46, 'pointed'); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, -spec.radius * 1.25); ctx.stroke(); ctx.restore();
      }
    }
    const pts = [];
    for (let k = 0; k < spec.count; k++) {
      const a = r() * TAU, rr = Math.sqrt(r()) * spec.radius;
      let x = Math.cos(a) * rr, y = Math.sin(a) * rr * (spec.dome ? 0.62 : 0.9);
      if (spec.dome) y -= (1 - (rr / spec.radius) ** 2) * 40;
      pts.push({ x, y, d: rr / spec.radius, c: spec.colors[Math.floor(r() * spec.colors.length)], rot: r() });
    }
    pts.sort((a, b) => a.y - b.y);
    pts.forEach(pt => {
      const s = easeOutBack((p - pt.d * 0.45) / 0.45);
      if (s <= 0) return;
      smallFlower(ctx, pt.x, pt.y, spec.size, pt.c, spec.stroke, spec.petals, s);
    });
  }

  function drawSpike(ctx, spec, p, t) {
    spec.spikes.forEach((ang, si) => {
      ctx.save(); ctx.rotate(ang + Math.sin(t * 1.3 + si) * 0.03);
      const len = spec.len * (si % 2 ? 0.88 : 1), grow = easeOut(p / 0.6);
      const curve = spec.curve || 0;
      ctx.strokeStyle = spec.stem; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(0, 0); ctx.quadraticCurveTo(curve * 60, -len * 0.5 * grow, curve * 110 * grow, -len * grow); ctx.stroke();
      const n = 16;
      for (let k = 0; k < n; k++) {
        const u = k / n, fp = easeOutBack((p - 0.15 - u * 0.5) / 0.35);
        if (fp <= 0) continue;
        const y = -len * (0.15 + u * 0.85), x = curve * 110 * (u * u);
        const side = k % 2 ? 1 : -1, sz = (1 - u * 0.55) * 1.0;
        ctx.save(); ctx.translate(x, y); ctx.rotate(side * 0.7); ctx.scale(fp * sz, fp * sz);
        if (spec.floret === 'lip') {
          ctx.fillStyle = spec.c; ctx.beginPath(); ctx.ellipse(side * 14, 0, 22, 12, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = spec.c2; ctx.beginPath(); ctx.ellipse(side * 26, 6, 12, 8, 0.3, 0, TAU); ctx.fill();
        } else {
          const g = ctx.createLinearGradient(0, 0, side * 40, 0);
          g.addColorStop(0, spec.c); g.addColorStop(1, spec.c2);
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(side * 18, 0, 26, 14, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(side * 42, 0, 8, 6, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
          for (let h = -2; h <= 2; h++) { ctx.beginPath(); ctx.moveTo(side * 6, h * 4); ctx.lineTo(side * 34, h * 5); ctx.stroke(); }
        }
        ctx.restore();
      }
      ctx.restore();
    });
  }

  function drawPlume(ctx, spec, p, t) {
    spec.spikes.forEach((ang, si) => {
      const s = easeOutBack((p - si * 0.12) / 0.7);
      if (s <= 0) return;
      const len = spec.len * (si === 1 ? 1 : 0.8);
      ctx.save(); ctx.rotate(ang + Math.sin(t * 1.1 + si * 2) * 0.03); ctx.scale(s, s);
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      const cols = [[spec.c, spec.c2], ['#ec407a', '#ffcc80'], ['#fb8c00', '#fff176']][si % 3];
      g.addColorStop(0, cols[0]); g.addColorStop(0.7, cols[0]); g.addColorStop(1, cols[1]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-50, 0);
      ctx.bezierCurveTo(-75, -len * 0.4, -30, -len * 0.7, 0, -len);
      ctx.bezierCurveTo(30, -len * 0.7, 75, -len * 0.4, 50, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2.5;
      for (let k = 0; k < 14; k++) {
        const u = k / 14, y = -len * u * 0.92, w = 48 * Math.sin(Math.PI * (0.15 + u * 0.85)) * (1 - u * 0.4);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(w * 0.6, y - 18, w, y - 34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(-w * 0.6, y - 18, -w, y - 34); ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawPlant(ctx, f, lt, cx, cy) {
    const sway = Math.sin(lt * 1.2) * 0.025;
    const stemP = easeInOut((lt - 0.2) / 1.1);
    const groundY = H + 40, stemH = groundY - cy;
    ctx.save();
    // 茎
    ctx.strokeStyle = '#4c8b2b'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    const topX = cx + sway * 400, topY = groundY - stemH * stemP;
    ctx.beginPath(); ctx.moveTo(cx, groundY); ctx.quadraticCurveTo(cx - 40, groundY - stemH * 0.5 * stemP, topX, topY); ctx.stroke();
    // 葉
    [[0.35, -1], [0.6, 1]].forEach(([u, side], k) => {
      const lp = easeOutBack((lt - 0.6 - k * 0.2) / 0.6);
      if (lp <= 0) return;
      ctx.save(); ctx.translate(cx - 20 * (1 - u), groundY - stemH * u); ctx.rotate(side * 1.0 + sway * 3); ctx.scale(lp, lp);
      const g = ctx.createLinearGradient(0, 0, 0, -170);
      g.addColorStop(0, '#3f7f2a'); g.addColorStop(1, C.leaf);
      ctx.fillStyle = g; petalPath(ctx, 170, 55, 'pointed'); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -150); ctx.stroke();
      ctx.restore();
    });
    // 花
    const p = clamp01((lt - 1.0) / 1.8);
    ctx.translate(topX, topY); ctx.rotate(sway);
    const breathe = 1 + Math.sin(lt * 2) * 0.012 * p;
    ctx.scale(breathe, breathe);
    const d = f.draw;
    if (d.type === 'radial') drawRadial(ctx, d, p);
    else if (d.type === 'cluster') drawCluster(ctx, d, p);
    else if (d.type === 'spike') drawSpike(ctx, d, p, lt);
    else if (d.type === 'plume') drawPlume(ctx, d, p, lt);
    ctx.restore();
  }

  // ---------- シーン ----------
  let LOGO = null;

  function drawLogo(ctx, cx, cy, width, alpha = 1) {
    if (!LOGO || !LOGO.complete || !LOGO.naturalWidth) return;
    const h = width * LOGO.naturalHeight / LOGO.naturalWidth;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(LOGO, cx - width / 2, cy - h / 2, width, h); ctx.restore();
  }

  function sceneIntro(ctx, lt, t) {
    drawBackground(ctx, t, C.leaf);
    // 中央から広がるリング
    for (let k = 0; k < 3; k++) {
      const rp = easeOut((lt - k * 0.25) / 1.6);
      ctx.save(); ctx.globalAlpha = 0.18 * (1 - k * 0.25); ctx.strokeStyle = [C.green, C.leaf, C.autumn][k];
      ctx.lineWidth = 26 - k * 6; ctx.beginPath(); ctx.arc(W / 2, H / 2, 200 + rp * (360 + k * 120), 0, TAU); ctx.stroke(); ctx.restore();
    }
    const lp = easeOutBack((lt - 0.4) / 0.9);
    ctx.save(); ctx.translate(W / 2, 300); ctx.scale(lp, lp); drawLogo(ctx, 0, 0, 520); ctx.restore();

    // タイトル：1文字ずつポップ
    const title = '10月に咲く花10選';
    ctx.save(); ctx.font = `900 150px ${FONT}`;
    const widths = [...title].map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 - total / 2;
    [...title].forEach((ch, i) => {
      const cp = easeOutBack((lt - 1.4 - i * 0.07) / 0.5);
      if (cp > 0) {
        ctx.save(); ctx.translate(x + widths[i] / 2, 600); ctx.scale(cp, cp);
        ctx.fillStyle = /[0-9]/.test(ch) ? C.autumn : C.deep; ctx.textAlign = 'center';
        ctx.fillText(ch, 0, 0); ctx.restore();
      }
      x += widths[i];
    });
    ctx.restore();
    const sp = reveal(lt, 2.6);
    ctx.save(); ctx.globalAlpha = sp; ctx.translate(0, (1 - sp) * 30);
    ctx.fillStyle = C.green; roundRect(ctx, W / 2 - 440, 660, 880, 84, 42); ctx.fill();
    text(ctx, '秋の花壇で楽しめる種類と育て方', W / 2, 718, 46, '#fff', 700, 'center');
    ctx.restore();

    // 小花の飾り
    [[360, 820, '#f06292'], [1560, 820, '#ffb300'], [250, 520, '#7e6fd8'], [1680, 500, '#e53935']].forEach(([x, y, c], i) => {
      const s = easeOutBack((lt - 3 - i * 0.15) / 0.5);
      if (s > 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(lt * 0.4 * (i % 2 ? 1 : -1)); smallFlower(ctx, 0, 0, 60, c, null, 5, s); ctx.restore(); }
    });
  }

  function monthBar(ctx, x, y, bloom, lt, d) {
    const cw = 50, gap = 6;
    for (let m = 1; m <= 12; m++) {
      const on = bloom.some(([a, b]) => m >= a && m <= b);
      const p = easeOut((lt - d - m * 0.04) / 0.4);
      const cx = x + (m - 1) * (cw + gap);
      ctx.save(); ctx.globalAlpha = p;
      ctx.fillStyle = on ? (m === 10 ? C.autumn : C.green) : '#e4e1d6';
      roundRect(ctx, cx, y + (1 - p) * 20, cw, 44, 10); ctx.fill();
      text(ctx, String(m), cx + cw / 2, y + 30 + (1 - p) * 20, 22, on ? '#fff' : '#9a9a8e', 700, 'center');
      ctx.restore();
    }
    // 10月マーカー
    const mp = easeOutBack((lt - d - 0.8) / 0.5);
    if (mp > 0) {
      const mx = x + 9 * (cw + gap) + cw / 2;
      ctx.save(); ctx.translate(mx, y - 16); ctx.scale(mp, mp);
      ctx.fillStyle = C.autumn; ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(12, -14); ctx.lineTo(0, 2); ctx.fill();
      ctx.restore();
    }
  }

  function sceneFlower(ctx, lt, t, data) {
    const { f, i } = data;
    drawBackground(ctx, t, f.tint);
    // 花の背後の円
    const bp = easeOut((lt - 0.1) / 0.8);
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = C.paper;
    ctx.beginPath(); ctx.arc(560, 520, 360 * bp, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.25; ctx.strokeStyle = f.tint; ctx.lineWidth = 10; ctx.setLineDash([2, 22]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(560, 520, 395 * bp, lt * 0.2, lt * 0.2 + TAU); ctx.stroke(); ctx.restore();
    drawPlant(ctx, f, lt, 560, 470);

    const X = 1010;
    // ナンバー
    const np = reveal(lt, 0.3);
    ctx.save(); ctx.globalAlpha = np; ctx.translate((1 - np) * 60, 0);
    ctx.font = `900 190px ${FONT}`; ctx.lineWidth = 5; ctx.strokeStyle = C.green; ctx.textBaseline = 'alphabetic';
    ctx.strokeText(String(i + 1).padStart(2, '0'), X - 6, 290);
    text(ctx, 'OCTOBER FLOWERS', X + 250, 190, 28, C.autumn, 700);
    text(ctx, `No.${i + 1} / 10`, X + 250, 236, 28, C.sub, 500);
    ctx.restore();
    // 名前
    const nameP = reveal(lt, 0.55);
    ctx.save(); ctx.beginPath(); ctx.rect(X - 10, 300, 900, 140); ctx.clip();
    const nameSize = f.name.length > 7 ? 92 : 110;
    text(ctx, f.name, X, 410 + (1 - nameP) * 120, nameSize, C.ink, 900);
    ctx.restore();
    const lineP = easeInOut((lt - 0.8) / 0.7);
    ctx.fillStyle = C.green; ctx.fillRect(X, 440, 120 * lineP, 8);
    ctx.fillStyle = C.leaf; ctx.fillRect(X + 124, 440, 60 * lineP, 8);
    text(ctx, f.en, X + 200, 452, 30, C.sub, 500, 'left', reveal(lt, 1.0));

    // 花色
    const r1 = reveal(lt, 1.3);
    ctx.save(); ctx.globalAlpha = r1; ctx.translate(0, (1 - r1) * 24);
    text(ctx, '花色', X, 532, 30, C.green, 700);
    f.colors.forEach((c, k) => {
      const s = easeOutBack((lt - 1.4 - k * 0.08) / 0.4);
      ctx.save(); ctx.translate(X + 130 + k * 62, 521); ctx.scale(s, s);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    });
    text(ctx, '草丈', X + 480, 532, 30, C.green, 700);
    text(ctx, f.height, X + 570, 534, 38, C.ink, 700);
    ctx.restore();

    // 開花期
    const r2 = reveal(lt, 1.7);
    text(ctx, '開花期', X, 612, 30, C.green, 700, 'left', r2);
    monthBar(ctx, X + 130, 640 - 50, f.bloom, lt, 1.7);

    // ポイント
    const r3 = reveal(lt, 2.4, 0.7);
    ctx.save(); ctx.globalAlpha = r3; ctx.translate((1 - r3) * 80, 0);
    ctx.fillStyle = C.paper; ctx.shadowColor = 'rgba(0,60,20,0.12)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    roundRect(ctx, X, 690, 860, 230, 28); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.green; roundRect(ctx, X + 30, 668, 280, 50, 25); ctx.fill();
    text(ctx, '育て方のポイント', X + 170, 703, 28, '#fff', 700, 'center');
    f.points.forEach((pt, k) => {
      const pp = reveal(lt, 2.9 + k * 0.35);
      ctx.save(); ctx.globalAlpha *= pp;
      ctx.fillStyle = k ? C.autumn : C.leaf; ctx.beginPath(); ctx.arc(X + 60, 780 + k * 80 - 12, 12, 0, TAU); ctx.fill();
      ctx.font = `700 42px ${FONT}`;
      const size = Math.min(42, 42 * 740 / ctx.measureText(pt).width);
      text(ctx, pt, X + 92 + (1 - pp) * 20, 780 + k * 80, size, C.ink, 700);
      ctx.restore();
    });
    ctx.restore();
  }

  function sceneTips(ctx, lt, t) {
    drawBackground(ctx, t, C.leaf);
    const hp = reveal(lt, 0.2);
    ctx.save(); ctx.globalAlpha = hp; ctx.translate(0, (1 - hp) * 30);
    text(ctx, '植える前にチェック', W / 2, 170, 84, C.deep, 900, 'center');
    text(ctx, '日当たり・スペース・花後の手入れ', W / 2, 232, 36, C.sub, 500, 'center');
    ctx.restore();

    // 用土ドーナツ
    const cx = 470, cy = 570, R = 210;
    const dp = easeInOut((lt - 0.8) / 1.4);
    ctx.save(); ctx.lineWidth = 90;
    ctx.strokeStyle = '#e4e1d6'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#b5652b'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * 0.7 * dp); ctx.stroke();
    ctx.strokeStyle = '#5b3d22'; ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2 + TAU * 0.7, -Math.PI / 2 + TAU * 0.7 + TAU * 0.3 * easeInOut((lt - 2.0) / 0.8)); ctx.stroke();
    ctx.restore();
    text(ctx, '用土', cx, cy - 20, 40, C.sub, 700, 'center', reveal(lt, 1));
    text(ctx, '7 : 3', cx, cy + 50, 76, C.ink, 900, 'center', reveal(lt, 1.6));
    const lg = reveal(lt, 2.6);
    ctx.save(); ctx.globalAlpha = lg;
    ctx.fillStyle = '#b5652b'; roundRect(ctx, cx - 250, 840, 28, 28, 6); ctx.fill();
    text(ctx, '赤玉土 7', cx - 210, 866, 32, C.ink, 700);
    ctx.fillStyle = '#5b3d22'; roundRect(ctx, cx + 40, 840, 28, 28, 6); ctx.fill();
    text(ctx, '腐葉土 3', cx + 80, 866, 32, C.ink, 700);
    ctx.restore();

    // 肥料カード
    const cards = [
      ['元肥', 'マグァンプＫ', '中粒・大粒', C.green],
      ['追肥', 'プランティア', '花と野菜と果実の肥料', C.autumn],
      ['液肥', 'ハイポネックス原液', '水で薄めて手軽に', '#3f8fd2']
    ];
    cards.forEach(([tag, name, sub, col], k) => {
      const cp = easeOutBack((lt - 3.5 - k * 0.9) / 0.6);
      if (cp <= 0) return;
      const y = 340 + k * 200;
      ctx.save(); ctx.translate(900 + (1 - cp) * 200, y); ctx.globalAlpha = clamp01(cp);
      ctx.fillStyle = C.paper; ctx.shadowColor = 'rgba(0,60,20,0.12)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      roundRect(ctx, 0, 0, 880, 160, 30); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = col; roundRect(ctx, 30, 40, 150, 80, 40); ctx.fill();
      text(ctx, tag, 105, 96, 40, '#fff', 900, 'center');
      text(ctx, name, 220, 88, 54, C.ink, 900);
      text(ctx, sub, 222, 134, 30, C.sub, 500);
      ctx.restore();
    });
  }

  function sceneOutro(ctx, lt, t) {
    drawBackground(ctx, t, C.leaf);
    // 10種の花が円周上に咲く
    FLOWERS.forEach((f, k) => {
      const a = (k / 10) * TAU - Math.PI / 2 + lt * 0.08;
      const s = easeOutBack((lt - 0.1 - k * 0.08) / 0.5) * 0.32;
      if (s <= 0) return;
      ctx.save(); ctx.translate(W / 2 + Math.cos(a) * 760, H / 2 + Math.sin(a) * 420); ctx.scale(s, s);
      const d = f.draw;
      if (d.type === 'radial') drawRadial(ctx, d, 1);
      else if (d.type === 'cluster') drawCluster(ctx, d, 1);
      else if (d.type === 'spike') { ctx.translate(0, 160); drawSpike(ctx, d, 1, lt); }
      else drawPlume(ctx, d, 1, lt);
      ctx.restore();
    });
    const cp = reveal(lt, 0.6, 0.8);
    ctx.save(); ctx.globalAlpha = cp; ctx.translate(0, (1 - cp) * 30);
    text(ctx, '秋の庭を、花でいっぱいに。', W / 2, 430, 92, C.deep, 900, 'center');
    ctx.restore();
    const lp = easeOutBack((lt - 1.6) / 0.8);
    ctx.save(); ctx.translate(W / 2, 590); ctx.scale(lp, lp); drawLogo(ctx, 0, 0, 480); ctx.restore();
    const up = reveal(lt, 2.6);
    ctx.save(); ctx.globalAlpha = up;
    ctx.fillStyle = C.green; roundRect(ctx, W / 2 - 420, 700, 840, 80, 40); ctx.fill();
    text(ctx, '詳しい育て方は PLANTIA で', W / 2, 754, 40, '#fff', 700, 'center');
    text(ctx, 'hyponex.co.jp/plantia', W / 2, 830, 30, C.sub, 500, 'center');
    ctx.restore();
    // 最後にフェードアウト
    const fo = clamp01((lt - 7) / 1);
    if (fo > 0) { ctx.fillStyle = `rgba(251,246,234,${fo})`; ctx.fillRect(0, 0, W, H); }
  }

  // シーン境界をまたぐ斜めワイプ
  function drawWipe(ctx, t) {
    for (let k = 1; k < SCENES.length; k++) {
      const b = SCENES[k].start, u = (t - b) / 0.9 + 0.5; // 0→1 で左外→右外
      if (u <= 0 || u >= 1) continue;
      const x = lerp(-W * 0.9, W * 1.9, easeInOut(u));
      [[C.leaf, -180], [C.green, 0], [C.autumn, 240]].forEach(([c, off]) => {
        ctx.save(); ctx.fillStyle = c; ctx.beginPath();
        ctx.moveTo(x + off - 900, 0); ctx.lineTo(x + off + 300, 0); ctx.lineTo(x + off - 100, H); ctx.lineTo(x + off - 1300, H);
        ctx.closePath(); ctx.fill(); ctx.restore();
      });
    }
  }

  function drawSubtitle(ctx, s, lt) {
    if (!s.data.text) return;
    const a = reveal(lt, 0.6, 0.3) * (1 - clamp01((lt - s.dur + 0.6) / 0.3));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `700 38px ${FONT}`;
    // 1行に収まらなければ、中央に近い読点・句点で2行に割る
    const maxW = 1560, str = s.data.text;
    let lines = [str];
    if (ctx.measureText(str).width > maxW) {
      let best = Math.floor(str.length / 2), bestD = Infinity;
      [...str].forEach((ch, k) => { if ('、。'.includes(ch) && k < str.length - 1) {
        const d = Math.abs(k + 1 - str.length / 2); if (d < bestD) { bestD = d; best = k + 1; } } });
      lines = [str.slice(0, best), str.slice(best)];
    }
    const h = lines.length * 54 + 30, y0 = H - 40 - h;
    ctx.fillStyle = 'rgba(20,40,28,0.78)'; roundRect(ctx, W / 2 - maxW / 2 - 40, y0, maxW + 80, h, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    lines.forEach((l, k) => ctx.fillText(l, W / 2, y0 + 58 + k * 54));
    ctx.restore();
  }

  function render(ctx, t, opts = {}) {
    t = Math.max(0, Math.min(DURATION - 1e-3, t));
    const s = SCENES.find(sc => t >= sc.start && t < sc.start + sc.dur) || SCENES[SCENES.length - 1];
    const lt = t - s.start;
    ctx.save();
    if (s.type === 'intro') sceneIntro(ctx, lt, t);
    else if (s.type === 'flower') sceneFlower(ctx, lt, t, s.data);
    else if (s.type === 'tips') sceneTips(ctx, lt, t);
    else sceneOutro(ctx, lt, t);
    ctx.restore();
    drawWipe(ctx, t);
    if (opts.subtitles) drawSubtitle(ctx, s, lt);
  }

  // ---------- BGM（Web Audio で合成、外部音源なし） ----------
  // AudioContext / OfflineAudioContext のどちらにも同じ譜面を流し込む
  function buildBGM(ac, dest, dur, t0 = 0) {
    const r = rng(2024);
    const master = ac.createGain();
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(0.85, t0 + 2);
    master.gain.setValueAtTime(0.85, t0 + dur - 4);
    master.gain.linearRampToValueAtTime(0, t0 + dur);
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp); comp.connect(dest);

    // 簡易リバーブ
    const rev = ac.createConvolver();
    const irLen = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, irLen, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / irLen, 3); }
    rev.buffer = ir;
    const revGain = ac.createGain(); revGain.gain.value = 0.28;
    rev.connect(revGain); revGain.connect(master);
    const bus = ac.createGain(); bus.connect(master); bus.connect(rev);

    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }

    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const bpm = 88, beat = 60 / bpm, bar = beat * 4;
    // Fmaj7 → Em7 → Dm7 → C(add9)  やわらかい秋のコード進行
    const prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 62]];
    const roots = [41, 40, 38, 36];
    const melody = [[76, 74, 72, null, 69, 72, null, null], [71, 72, 74, null, 71, null, 67, null],
                    [69, 72, 74, 77, 76, null, 74, null], [72, null, 74, 76, null, 79, 76, null]];

    // 途中から再生したとき、過去の音符が一斉に鳴らないよう間引く
    const now = ac.currentTime - 0.01, past = x => x < now;
    function tone(type, f, start, len, vol, attack = 0.005, out = bus, detune = 0) {
      if (past(start)) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = detune;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, start + len);
      o.connect(g); g.connect(out); o.start(start); o.stop(start + len + 0.05);
    }
    function pad(notes, start, len) {
      if (past(start + len)) return;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(bus);
      notes.forEach(n => [-7, 7].forEach(dt => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = dt;
        g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.012, start + 0.8);
        g.gain.setValueAtTime(0.012, start + len - 0.4); g.gain.linearRampToValueAtTime(0, start + len + 0.3);
        o.connect(g); g.connect(lp); o.start(start); o.stop(start + len + 0.35);
      }));
    }
    function kick(start) {
      if (past(start)) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(120, start); o.frequency.exponentialRampToValueAtTime(45, start + 0.18);
      g.gain.setValueAtTime(0.5, start); g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      o.connect(g); g.connect(master); o.start(start); o.stop(start + 0.32);
    }
    function shaker(start, vol) {
      if (past(start)) return;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise; f.type = 'highpass'; f.frequency.value = 6000;
      g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      s.connect(f); f.connect(g); g.connect(bus); s.start(start, r() * 0.5); s.stop(start + 0.1);
    }

    const bars = Math.ceil(dur / bar);
    for (let b = 0; b < bars; b++) {
      const st = t0 + b * bar, ci = b % 4, ch = prog[ci];
      const isEnd = st > t0 + dur - bar * 2; // 終盤はリズムを抜く
      pad(ch, st, bar);
      // アルペジオ（プラック）
      const pat = [0, 1, 2, 3, 2, 1, 3, 2];
      pat.forEach((pi, k) => {
        const n = ch[pi] + 12, s0 = st + k * beat / 2;
        tone('triangle', hz(n), s0, 0.7, 0.07);
        tone('sine', hz(n + 12), s0, 0.35, 0.025);
      });
      if (b >= 2) { tone('sine', hz(roots[ci]), st, bar * 0.9, 0.22, 0.02); tone('triangle', hz(roots[ci] + 12), st + beat * 2.5, beat * 1.2, 0.05, 0.01); }
      if (b >= 4 && !isEnd) {
        kick(st); kick(st + beat * 2);
        for (let k = 0; k < 8; k++) shaker(st + k * beat / 2, k % 2 ? 0.05 : 0.025);
      }
      // ベル系メロディ
      if (b >= 8 && !isEnd && Math.floor(b / 8) % 2 === 1) {
        melody[ci].forEach((n, k) => { if (n == null) return;
          const s0 = st + k * beat / 2;
          tone('sine', hz(n), s0, 1.2, 0.07, 0.004); tone('sine', hz(n) * 3.01, s0, 0.4, 0.012, 0.002);
        });
      }
    }
    return master;
  }

  window.OctoberVideo = { W, H, FPS, DURATION, SCENES, NARRATION, FLOWERS, render, buildBGM,
    setLogo(img) { LOGO = img; } };
})();
