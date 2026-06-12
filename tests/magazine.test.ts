// tests/magazine.test.ts
import { describe, it, expect } from 'vitest';
import { Magazine } from '../src/core/magazine';

describe('Magazine', () => {
  it('starts full and decrements on fire', () => {
    const m = new Magazine(8, 1.2);
    expect(m.rounds).toBe(8);
    expect(m.tryFire()).toBe('fired');
    expect(m.rounds).toBe(7);
  });

  it('returns empty when out of rounds', () => {
    const m = new Magazine(1, 1.2);
    m.tryFire();
    expect(m.tryFire()).toBe('empty');
  });

  it('blocks firing while reloading, then refills', () => {
    const m = new Magazine(8, 1.2);
    m.tryFire();
    m.startReload();
    expect(m.reloading).toBe(true);
    expect(m.tryFire()).toBe('reloading');
    m.update(0.6);
    expect(m.reloading).toBe(true);
    m.update(0.6);
    expect(m.reloading).toBe(false);
    expect(m.rounds).toBe(8);
  });

  it('ignores reload when already full or already reloading', () => {
    const m = new Magazine(8, 1.2);
    expect(m.startReload()).toBe(false); // full
    m.tryFire();
    expect(m.startReload()).toBe(true);
    expect(m.startReload()).toBe(false); // already reloading
  });
});
