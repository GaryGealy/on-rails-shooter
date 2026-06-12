const STOP_SCALE = 0.05;
const STOP_DURATION = 0.07; // seconds of real time

export class HitStop {
  private remaining = 0;

  get scale(): number {
    return this.remaining > 0 ? STOP_SCALE : 1;
  }

  onKill(): void {
    this.remaining = STOP_DURATION;
  }

  update(realDt: number): void {
    this.remaining = Math.max(0, this.remaining - realDt);
  }
}
