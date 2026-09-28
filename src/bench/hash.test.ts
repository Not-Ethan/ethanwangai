import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, hash2 } from './hash';
import { rotY, mulQuat, IDENTITY_Q, expoOut, power2InOut, smoothstep } from './math';

describe('hash', () => {
  it('mulberry32 is deterministic and in [0,1)', () => {
    const a = mulberry32(7), b = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    xs.forEach((x) => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); });
  });
  it('hashString is stable', () => {
    expect(hashString('now is the best time in history to build things.')).toBe(hashString('now is the best time in history to build things.'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
  it('hash2 is in [0,1) and varies', () => {
    expect(hash2(3, 4)).not.toBe(hash2(4, 3));
    expect(hash2(1, 1)).toBeLessThan(1);
  });
});
describe('math', () => {
  it('quaternion helpers', () => {
    expect(mulQuat(IDENTITY_Q, rotY(1))).toEqual(rotY(1));
  });
  it('easings hit endpoints', () => {
    expect(expoOut(0)).toBe(0); expect(expoOut(1)).toBe(1);
    expect(power2InOut(0)).toBe(0); expect(power2InOut(1)).toBe(1); expect(power2InOut(0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });
});
