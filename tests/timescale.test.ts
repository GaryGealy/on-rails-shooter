// tests/timescale.test.ts
import { describe, it, expect } from 'vitest';
import { HitStop } from '../src/core/timescale';

describe('HitStop', () => {
  it('scale is 1 normally', () => {
    expect(new HitStop().scale).toBe(1);
  });

  it('drops the scale on kill and recovers after the stop duration', () => {
    const h = new HitStop();
    h.onKill();
    expect(h.scale).toBeLessThan(0.1);
    h.update(0.07);
    expect(h.scale).toBe(1);
  });

  it('re-triggering extends rather than stacking', () => {
    const h = new HitStop();
    h.onKill();
    h.update(0.05);
    h.onKill();
    h.update(0.05);
    expect(h.scale).toBeLessThan(0.1); // still stopped
    h.update(0.05);
    expect(h.scale).toBe(1);
  });
});
