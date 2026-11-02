import { describe, expect, it } from 'vitest';
import { clamp, easeOutCubic, smoothstep } from './easing';

describe('easing', () => {
  for (const [name, fn] of [['easeOutCubic', easeOutCubic], ['smoothstep', smoothstep]] as const) {
    it(`${name} has endpoints 0 and 1`, () => {
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
    });
    it(`${name} is monotone over 100 samples`, () => {
      let prev = fn(0);
      for (let i = 1; i <= 100; i++) {
        const v = fn(i / 100);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    });
    it(`${name} clamps outside [0, 1]`, () => {
      expect(fn(-5)).toBe(0);
      expect(fn(5)).toBe(1);
    });
  }
  it('clamp bounds values', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(4, 0, 10)).toBe(4);
  });
});
