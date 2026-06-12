// tests/enemy-brain.test.ts
import { describe, it, expect } from 'vitest';
import { ThugBrain } from '../src/core/enemy-brain';

// distance 10m, speed 4 m/s, melee at 2m, windup 1s, recover 1.5s
const make = () => new ThugBrain({ distance: 10, speed: 4, meleeRange: 2, windup: 1, recover: 1.5 });

describe('ThugBrain', () => {
  it('approaches: closes distance at speed', () => {
    const b = make();
    expect(b.state).toBe('approach');
    b.update(1);
    expect(b.distance).toBeCloseTo(6);
  });

  it('stops at melee range and winds up', () => {
    const b = make();
    b.update(10);
    expect(b.distance).toBeCloseTo(2);
    expect(b.state).toBe('windup');
  });

  it('attacks exactly once when windup elapses', () => {
    const b = make();
    b.update(2); // reach melee at t=2s, windup begins
    expect(b.update(1.0)).toBe('attack'); // windup complete
    expect(b.state).toBe('recover');
    expect(b.update(0.1)).toBe(null);
  });

  it('winds up again after recovering', () => {
    const b = make();
    b.update(2);
    b.update(1.0); // attack
    b.update(1.5); // recover done
    expect(b.state).toBe('windup');
    expect(b.update(1.0)).toBe('attack');
  });

  it('kill() is terminal and stops updates', () => {
    const b = make();
    b.update(1);
    b.kill();
    expect(b.state).toBe('dead');
    const d = b.distance;
    expect(b.update(5)).toBe(null);
    expect(b.distance).toBe(d);
  });
});
