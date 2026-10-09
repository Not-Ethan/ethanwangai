import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('replays the same sequence for the same seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it('matches the reference first values for seed 1', () => {
    const r = mulberry32(1);
    expect(r()).toBeCloseTo(0.6270739405881613, 15);
    expect(r()).toBeCloseTo(0.002735721180215478, 15);
  });
  it('stays in [0, 1) and differs across seeds', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 10000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it('treats negative and fractional seeds as their unsigned 32-bit value', () => {
    expect(mulberry32(-1)()).toBe(mulberry32(0xffffffff)());
  });
});
