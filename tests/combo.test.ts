// tests/combo.test.ts
import { describe, it, expect } from 'vitest';
import { ComboTracker } from '../src/core/combo';

describe('ComboTracker', () => {
  it('starts at x1 with zero score', () => {
    const c = new ComboTracker();
    expect(c.multiplier).toBe(1);
    expect(c.score).toBe(0);
    expect(c.streak).toBe(0);
  });

  it('scores base points times multiplier on a hit', () => {
    const c = new ComboTracker();
    c.registerHit(100);
    expect(c.score).toBe(100);
    expect(c.streak).toBe(1);
  });

  it('steps the multiplier every 5 consecutive hits, capped at x8', () => {
    const c = new ComboTracker();
    for (let i = 0; i < 5; i++) c.registerHit(100);
    expect(c.multiplier).toBe(2);
    for (let i = 0; i < 50; i++) c.registerHit(100);
    expect(c.multiplier).toBe(8);
  });

  it('resets to x1 on a miss', () => {
    const c = new ComboTracker();
    for (let i = 0; i < 5; i++) c.registerHit(100);
    c.registerMiss();
    expect(c.multiplier).toBe(1);
    expect(c.streak).toBe(0);
  });

  it('resets to x1 on taking damage without counting a shot', () => {
    const c = new ComboTracker();
    for (let i = 0; i < 5; i++) c.registerHit(100);
    c.registerPlayerHit();
    expect(c.multiplier).toBe(1);
    expect(c.shots).toBe(5);
  });

  it('tracks accuracy as hits/shots', () => {
    const c = new ComboTracker();
    c.registerHit(100);
    c.registerHit(100);
    c.registerMiss();
    c.registerMiss();
    expect(c.accuracy).toBeCloseTo(0.5);
  });

  it('accuracy is 1 before any shot (no division by zero)', () => {
    expect(new ComboTracker().accuracy).toBe(1);
  });

  it('emits events for hits, multiplier steps, and breaks', () => {
    const events: string[] = [];
    const c = new ComboTracker((e) => events.push(e));
    for (let i = 0; i < 5; i++) c.registerHit(100);
    c.registerMiss();
    c.registerMiss(); // break only fires when a streak existed
    expect(events).toEqual([
      'hit', 'hit', 'hit', 'hit', 'hit', 'step', 'break',
    ]);
  });
});
