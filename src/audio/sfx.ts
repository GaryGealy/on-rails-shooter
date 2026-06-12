export class Sfx {
  private ctx: AudioContext | null = null;

  /** Call once from a user gesture (first pointerdown) to satisfy autoplay policy. */
  unlock(): void {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(
    freq: number,
    type: OscillatorType,
    duration: number,
    gain: number,
    slideTo?: number,
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  private noise(duration: number, gain: number, filterFreq: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t);
  }

  fire(): void {
    this.tone(880, 'square', 0.08, 0.18, 110);
    this.noise(0.05, 0.12, 4000);
  }

  empty(): void {
    this.tone(220, 'square', 0.04, 0.12);
  }

  reload(): void {
    this.tone(330, 'square', 0.06, 0.15);
    setTimeout(() => this.tone(520, 'square', 0.08, 0.18), 140);
  }

  /** Rising combo-tick: pitch climbs with the streak. */
  comboTick(streak: number): void {
    this.tone(440 + Math.min(streak, 40) * 28, 'triangle', 0.07, 0.14);
  }

  /** The locked-essential break: a sharp, slightly unpleasant thunk. */
  comboBreak(): void {
    this.tone(160, 'sawtooth', 0.28, 0.3, 55);
    this.noise(0.12, 0.18, 900);
  }

  kill(): void {
    this.noise(0.2, 0.25, 2500);
    this.tone(660, 'square', 0.16, 0.16, 90);
  }

  damage(): void {
    this.tone(110, 'sawtooth', 0.3, 0.3, 60);
  }
}
