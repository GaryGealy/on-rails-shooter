// tests/shake.test.ts
import { describe, it, expect } from 'vitest';
import { ScreenShake } from '../src/core/shake';

describe('ScreenShake', () => {
  it('starts with zero offset', () => {
    const s = new ScreenShake(0.15);
    s.update(0.016);
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(0);
  });

  it('trauma is clamped to 1 no matter how many events stack', () => {
    const s = new ScreenShake(0.15);
    for (let i = 0; i < 20; i++) s.addTrauma(0.5);
    expect(s.trauma).toBe(1);
  });

  it('offset never exceeds the ceiling amplitude', () => {
    const s = new ScreenShake(0.15);
    s.addTrauma(1);
    for (let i = 0; i < 100; i++) {
      s.update(0.001);
      expect(Math.abs(s.offsetX)).toBeLessThanOrEqual(0.15);
      expect(Math.abs(s.offsetY)).toBeLessThanOrEqual(0.15);
    }
  });

  it('trauma decays to zero', () => {
    const s = new ScreenShake(0.15);
    s.addTrauma(1);
    for (let i = 0; i < 200; i++) s.update(0.016);
    expect(s.trauma).toBe(0);
    expect(s.offsetX).toBe(0);
  });
});
