/** Everything audible is synthesized with Web Audio: no sound files. */
export type Blip = 'key' | 'squeak' | 'buzz' | 'click';

export class Sound {
  private ctx: AudioContext | null = null;
  private rain: GainNode | null = null;
  on = false;

  /** Creates or resumes the audio context. Must be called from a user gesture the first time. */
  private audio(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  unlock(): void {
    this.audio();
  }

  setRain(on: boolean): void {
    this.on = on;
    const a = this.audio();
    if (!a) return;
    if (!this.rain) {
      const len = a.sampleRate * 3;
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.03 * w) / 1.03;
        d[i] = last * 2.2 + w * 0.12;
      }
      const src = a.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const hp = a.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 180;
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;
      const g = a.createGain();
      g.gain.value = 0;
      src.connect(hp).connect(lp).connect(g).connect(a.destination);
      src.start();
      this.rain = g;
    }
    this.rain.gain.setTargetAtTime(on ? 0.22 : 0, a.currentTime, 0.5);
  }

  /** Short effects. Only the duck squeaks when sound is off (you clicked it, after all). */
  blip(kind: Blip): void {
    const a = this.ctx;
    if (!a || (!this.on && kind !== 'squeak')) return;
    const t = a.currentTime;
    const g = a.createGain();
    g.connect(a.destination);
    if (kind === 'key') {
      const b = a.createBuffer(1, Math.floor(a.sampleRate * 0.025), a.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const s = a.createBufferSource();
      s.buffer = b;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2400 + Math.random() * 800;
      g.gain.value = 0.18;
      s.connect(f).connect(g);
      s.start(t);
    } else if (kind === 'squeak') {
      const o = a.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(1700, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(700, t + 0.28);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.35);
    } else if (kind === 'buzz') {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 110;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 300;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      g.gain.setValueAtTime(0.12, t + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(f).connect(g);
      o.start(t);
      o.stop(t + 0.6);
    } else {
      const o = a.createOscillator();
      o.type = 'square';
      o.frequency.value = 1800;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.05);
    }
  }
}
