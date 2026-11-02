import { describe, expect, it } from 'vitest';
import { mulberry32 } from './prng';

const take = (r: () => number, n: number) => Array.from({ length: n }, () => r());

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    expect(take(mulberry32(42), 10)).toEqual(take(mulberry32(42), 10));
  });
  it('differs across seeds', () => {
    expect(take(mulberry32(1), 10)).not.toEqual(take(mulberry32(2), 10));
  });
  it('stays in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
