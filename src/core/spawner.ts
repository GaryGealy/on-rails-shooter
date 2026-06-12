export interface SpawnPoint {
  side: -1 | 0 | 1; // left / center / right of the rail
  ahead: number;    // meters ahead of the camera along the rail
}

export interface SpawnEntry {
  t: number;
  spawns: SpawnPoint[];
}

export class SpawnTable {
  private fired: boolean[];

  constructor(private entries: SpawnEntry[]) {
    this.fired = entries.map(() => false);
  }

  get done(): boolean {
    return this.fired.every(Boolean);
  }

  /** Returns all spawn points whose entry threshold t has now been crossed. */
  collect(t: number): SpawnPoint[] {
    const out: SpawnPoint[] = [];
    this.entries.forEach((entry, i) => {
      if (!this.fired[i] && t >= entry.t) {
        this.fired[i] = true;
        out.push(...entry.spawns);
      }
    });
    return out;
  }
}
