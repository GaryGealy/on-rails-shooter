// tests/rail.test.ts
import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Rail } from '../src/core/rail';

const POINTS = [
  new Vector3(0, 1.6, 0),
  new Vector3(0, 1.6, -20),
  new Vector3(5, 1.6, -40),
  new Vector3(5, 1.6, -60),
];

describe('Rail', () => {
  it('starts at t=0 and advances by speed * dt', () => {
    const rail = new Rail(POINTS, 0.05); // 5% of the rail per second
    expect(rail.t).toBe(0);
    rail.update(1);
    expect(rail.t).toBeCloseTo(0.05);
  });

  it('clamps t at 1 and reports finished', () => {
    const rail = new Rail(POINTS, 0.5);
    rail.update(10);
    expect(rail.t).toBe(1);
    expect(rail.finished).toBe(true);
  });

  it('does not advance while paused', () => {
    const rail = new Rail(POINTS, 0.1);
    rail.paused = true;
    rail.update(1);
    expect(rail.t).toBe(0);
  });

  it('samples position on the curve', () => {
    const rail = new Rail(POINTS, 0.1);
    const start = rail.position(new Vector3());
    expect(start.x).toBeCloseTo(0);
    expect(start.y).toBeCloseTo(1.6);
    expect(start.z).toBeCloseTo(0);
  });

  it('lookTarget is ahead of position along the rail', () => {
    const rail = new Rail(POINTS, 0.1);
    const pos = rail.position(new Vector3());
    const look = rail.lookTarget(new Vector3());
    expect(look.z).toBeLessThan(pos.z); // rail runs down -Z at t=0
  });

  it('lookTarget stays valid at the end of the rail', () => {
    const rail = new Rail(POINTS, 1);
    rail.update(2); // t = 1
    const look = rail.lookTarget(new Vector3());
    expect(Number.isFinite(look.x)).toBe(true);
    const end = rail.position(new Vector3());
    expect(look.distanceTo(end)).toBeGreaterThan(0.5);
  });
});
