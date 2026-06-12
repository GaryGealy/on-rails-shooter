export type FireResult = 'fired' | 'empty' | 'reloading';

export class Magazine {
  rounds: number;
  reloading = false;
  private reloadLeft = 0;

  constructor(
    readonly capacity: number,
    private reloadTime: number,
  ) {
    this.rounds = capacity;
  }

  tryFire(): FireResult {
    if (this.reloading) return 'reloading';
    if (this.rounds === 0) return 'empty';
    this.rounds--;
    return 'fired';
  }

  startReload(): boolean {
    if (this.reloading || this.rounds === this.capacity) return false;
    this.reloading = true;
    this.reloadLeft = this.reloadTime;
    return true;
  }

  update(dt: number): void {
    if (!this.reloading) return;
    this.reloadLeft -= dt;
    if (this.reloadLeft <= 0) {
      this.reloading = false;
      this.rounds = this.capacity;
    }
  }
}
