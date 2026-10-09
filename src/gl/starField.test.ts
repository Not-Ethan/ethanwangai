import { describe, it, expect } from 'vitest';
import { STAR_RADIUS, STARS_DESKTOP, STARS_PHONE, starField } from './starField';

describe('starField', () => {
  it('puts the requested count on the upper cap of the star sphere', () => {
    for (const n of [STARS_DESKTOP, STARS_PHONE]) {
      const f = starField(n);
      expect(f.positions.length).toBe(n * 3);
      expect(f.sizes.length).toBe(n);
      expect(f.phases.length).toBe(n);
      for (let i = 0; i < n; i++) {
        const x = f.positions[i * 3], y = f.positions[i * 3 + 1], z = f.positions[i * 3 + 2];
        expect(Math.hypot(x, y, z)).toBeCloseTo(STAR_RADIUS, 2);
        expect(y).toBeGreaterThan(0);
        expect(f.sizes[i]).toBeGreaterThanOrEqual(1);
        expect(f.sizes[i]).toBeLessThanOrEqual(2.4);
        expect(Number.isFinite(f.phases[i])).toBe(true);
      }
    }
  });

  it('is deterministic for a seed', () => {
    expect(Array.from(starField(50, 7).positions)).toEqual(Array.from(starField(50, 7).positions));
    expect(Array.from(starField(50, 7).positions)).not.toEqual(Array.from(starField(50, 8).positions));
  });
});
