export type ComboEvent = 'hit' | 'step' | 'break';

const HITS_PER_STEP = 5;
const MAX_MULTIPLIER = 8;

export class ComboTracker {
  score = 0;
  streak = 0;
  shots = 0;
  hits = 0;

  constructor(private onEvent: (e: ComboEvent) => void = () => {}) {}

  get multiplier(): number {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.streak / HITS_PER_STEP));
  }

  get accuracy(): number {
    return this.shots === 0 ? 1 : this.hits / this.shots;
  }

  registerHit(basePoints: number): void {
    this.shots++;
    this.hits++;
    const before = this.multiplier;
    this.score += basePoints * before;
    this.streak++;
    this.onEvent('hit');
    if (this.multiplier > before) this.onEvent('step');
  }

  registerMiss(): void {
    this.shots++;
    this.break_();
  }

  registerPlayerHit(): void {
    this.break_();
  }

  private break_(): void {
    if (this.streak > 0) this.onEvent('break');
    this.streak = 0;
  }
}
