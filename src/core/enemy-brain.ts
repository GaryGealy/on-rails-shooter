export type ThugState = 'approach' | 'windup' | 'recover' | 'dead';

export interface ThugConfig {
  distance: number;   // starting distance to the player, meters
  speed: number;      // approach speed, m/s
  meleeRange: number; // distance at which it stops and attacks
  windup: number;     // telegraph duration before the hit lands, seconds
  recover: number;    // pause after an attack, seconds
}

export class ThugBrain {
  state: ThugState = 'approach';
  distance: number;
  private timer = 0;

  constructor(private cfg: ThugConfig) {
    this.distance = cfg.distance;
  }

  /** Advance the FSM. Returns 'attack' on the frame an attack lands, else null. */
  update(dt: number): 'attack' | null {
    switch (this.state) {
      case 'approach': {
        this.distance = Math.max(this.cfg.meleeRange, this.distance - this.cfg.speed * dt);
        if (this.distance <= this.cfg.meleeRange) {
          this.state = 'windup';
          this.timer = this.cfg.windup;
        }
        return null;
      }
      case 'windup': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'recover';
          this.timer = this.cfg.recover;
          return 'attack';
        }
        return null;
      }
      case 'recover': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'windup';
          this.timer = this.cfg.windup;
        }
        return null;
      }
      case 'dead':
        return null;
    }
  }

  kill(): void {
    this.state = 'dead';
  }

  /** 0→1 progress through the windup telegraph (for the visual pulse). */
  get windupProgress(): number {
    if (this.state !== 'windup') return 0;
    return 1 - this.timer / this.cfg.windup;
  }
}
