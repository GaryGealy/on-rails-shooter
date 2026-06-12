// tests/spawner.test.ts
import { describe, it, expect } from 'vitest';
import { SpawnTable, type SpawnEntry } from '../src/core/spawner';

const TABLE: SpawnEntry[] = [
  { t: 0.1, spawns: [{ side: -1, ahead: 18 }] },
  { t: 0.3, spawns: [{ side: 1, ahead: 20 }, { side: -1, ahead: 22 }] },
  { t: 0.3, spawns: [{ side: 0, ahead: 25 }] },
];

describe('SpawnTable', () => {
  it('fires nothing before the first threshold', () => {
    const s = new SpawnTable(TABLE);
    expect(s.collect(0.05)).toEqual([]);
  });

  it('fires an entry once when t crosses its threshold', () => {
    const s = new SpawnTable(TABLE);
    expect(s.collect(0.15)).toHaveLength(1);
    expect(s.collect(0.2)).toEqual([]); // not re-fired
  });

  it('fires multiple entries crossed in one step, in order', () => {
    const s = new SpawnTable(TABLE);
    const spawned = s.collect(0.5);
    expect(spawned).toHaveLength(4);
    expect(spawned[0].side).toBe(-1);
  });

  it('reports done when all entries have fired', () => {
    const s = new SpawnTable(TABLE);
    expect(s.done).toBe(false);
    s.collect(1);
    expect(s.done).toBe(true);
  });
});
