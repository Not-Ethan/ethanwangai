import { describe, it, expect } from 'vitest';
import { normalizeVelocity, deltaVelocity } from './velocity';

describe('velocity', () => {
  it('clamps px/ms to [-1, 1] at 3 px/ms', () => {
    expect(normalizeVelocity(0)).toBe(0);
    expect(normalizeVelocity(1.5)).toBeCloseTo(0.5);
    expect(normalizeVelocity(9)).toBe(1);
    expect(normalizeVelocity(-9)).toBe(-1);
  });
  it('derives velocity from scroll deltas on touch (spec §8 clock 4)', () => {
    expect(deltaVelocity(1000, 1300, 100)).toBeCloseTo(1);      // 3 px/ms → 1
    expect(deltaVelocity(1000, 1000, 100)).toBe(0);
    expect(deltaVelocity(1000, 900, 0)).toBe(0);                 // dt 0 guards
  });
});
