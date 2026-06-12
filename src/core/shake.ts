const DECAY_PER_SECOND = 1.4;

export class ScreenShake {
  trauma = 0;
  offsetX = 0;
  offsetY = 0;
  private phase = 0;

  constructor(private ceiling: number) {} // max offset in world units

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - DECAY_PER_SECOND * dt);
    if (this.trauma === 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this.phase += dt * 60;
    const amp = this.ceiling * this.trauma * this.trauma;
    // Deterministic pseudo-noise (no Math.random — keeps tests stable)
    this.offsetX = amp * Math.sin(this.phase * 1.3 + 1.7);
    this.offsetY = amp * Math.sin(this.phase * 1.7 + 4.2);
  }
}
