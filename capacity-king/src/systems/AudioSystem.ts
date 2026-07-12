// Web Audio API による効果音とBGMの生成。
// 音声素材を使わず、16bitアーケード調のシンプルな音をコードで作る。
// 危機時もコミカルな音に留め、嘲笑するような音は使わない。

type BgmName = 'title' | 'town' | 'gorilla' | 'nursery' | 'lab' | 'final' | 'ending' | 'none';

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private currentBgm: BgmName = 'none';
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.currentBgm !== 'none' && this.bgmTimer === null) this.startSequencer();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, when = 0, slide = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // ---- SFX ----
  click() { this.tone(880, 0.06, 'square', 0.04); }
  catch() { this.tone(330, 0.08, 'square', 0.07); this.tone(494, 0.1, 'square', 0.05, 0.06); }
  munch() { this.tone(180, 0.07, 'triangle', 0.09, 0, -60); }
  hold() { this.tone(520, 0.16, 'sine', 0.06, 0, -180); this.tone(260, 0.25, 'sine', 0.05, 0.08); }
  select() { this.tone(660, 0.05, 'square', 0.05); }
  confirm() { this.tone(523, 0.08, 'square', 0.06); this.tone(784, 0.12, 'square', 0.06, 0.07); }
  warn() { this.tone(220, 0.12, 'sawtooth', 0.05); this.tone(196, 0.16, 'sawtooth', 0.05, 0.12); }
  miss() { this.tone(240, 0.2, 'triangle', 0.06, 0, -120); }
  error() { this.tone(160, 0.25, 'square', 0.05, 0, -40); }
  // BETTER PLAN成功：鐘＋歓声風アルペジオ＋波
  success(big = false) {
    const base = big ? 0 : 0;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.07, base + i * 0.09));
    this.tone(1568, 1.0, 'sine', 0.05, 0.4);
    this.tone(2093, 1.4, 'sine', 0.04, 0.55);
    if (big) {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.7, 'triangle', 0.06, 0.8 + i * 0.08));
    }
  }
  wave() { this.tone(880, 0.6, 'sine', 0.04, 0, 440); }
  gameover() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.07, i * 0.22)); }

  // ---- BGM（簡易ステップシーケンサー） ----
  private patterns: Record<Exclude<BgmName, 'none'>, { bpm: number; melody: (number | 0)[]; bass: (number | 0)[] }> = {
    title: {
      bpm: 112,
      melody: [523, 0, 659, 784, 0, 659, 523, 0, 587, 0, 698, 587, 523, 0, 0, 0],
      bass: [131, 0, 131, 0, 175, 0, 175, 0, 147, 0, 147, 0, 196, 0, 196, 0]
    },
    town: {
      bpm: 120,
      melody: [659, 0, 587, 659, 784, 0, 659, 0, 523, 587, 659, 0, 587, 0, 523, 0],
      bass: [131, 0, 196, 0, 147, 0, 220, 0, 165, 0, 196, 0, 131, 0, 196, 0]
    },
    gorilla: {
      bpm: 132,
      melody: [392, 392, 0, 440, 494, 0, 440, 0, 392, 0, 330, 392, 440, 0, 0, 0],
      bass: [98, 0, 98, 98, 110, 0, 110, 0, 98, 0, 98, 98, 123, 0, 123, 0]
    },
    nursery: {
      bpm: 116,
      melody: [784, 0, 880, 0, 784, 659, 0, 587, 659, 0, 784, 880, 1047, 0, 0, 0],
      bass: [175, 0, 175, 0, 147, 0, 147, 0, 131, 0, 131, 0, 196, 0, 196, 0]
    },
    lab: {
      bpm: 108,
      melody: [523, 587, 659, 0, 698, 659, 587, 0, 659, 698, 784, 0, 659, 0, 523, 0],
      bass: [131, 0, 165, 0, 175, 0, 196, 0, 175, 0, 165, 0, 131, 0, 98, 0]
    },
    final: {
      bpm: 140,
      melody: [440, 0, 440, 523, 0, 587, 659, 0, 587, 523, 0, 440, 494, 0, 0, 0],
      bass: [110, 110, 0, 110, 131, 131, 0, 131, 98, 98, 0, 98, 123, 0, 123, 0]
    },
    ending: {
      bpm: 88,
      melody: [523, 0, 659, 0, 784, 0, 1047, 0, 784, 0, 659, 0, 523, 0, 587, 0],
      bass: [131, 0, 0, 0, 175, 0, 0, 0, 147, 0, 0, 0, 196, 0, 0, 0]
    }
  };

  playBgm(name: BgmName) {
    if (this.currentBgm === name) return;
    this.stopBgm();
    this.currentBgm = name;
    if (name === 'none' || !this.ctx) return;
    this.startSequencer();
  }

  private startSequencer() {
    if (this.currentBgm === 'none' || !this.ctx) return;
    const pat = this.patterns[this.currentBgm];
    const stepMs = (60 / pat.bpm / 2) * 1000;
    this.bgmStep = 0;
    this.bgmTimer = window.setInterval(() => {
      const i = this.bgmStep % pat.melody.length;
      const m = pat.melody[i];
      const b = pat.bass[i];
      if (m) this.tone(m, 0.14, 'square', 0.022);
      if (b) this.tone(b, 0.2, 'triangle', 0.035);
      this.bgmStep++;
    }, stepMs);
  }

  stopBgm() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.currentBgm = 'none';
  }
}

export const audio = new AudioSystem();
